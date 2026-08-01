/**
 * MOTOR ADAPTATIVO
 * Analiza el historial de cumplimiento y genera sugerencias CONCRETAS y APLICABLES.
 * Todo es determinista: funciona sin ninguna API externa.
 */

import { prisma } from "./prisma";

export const DOMINIOS = ["COMIDAS", "LIMPIEZA", "ESTUDIO", "TIEMPO_LIBRE", "GENERAL"] as const;
export type DominioKey = (typeof DOMINIOS)[number];

export const DOMINIO_LABEL: Record<string, string> = {
  COMIDAS: "Comidas",
  LIMPIEZA: "Limpieza",
  ESTUDIO: "Estudio",
  TIEMPO_LIBRE: "Tiempo libre",
  GENERAL: "General",
};

const NOMBRE_DIA = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];

/** Tipos de acción que una sugerencia puede ejecutar con un clic. */
export type AccionSugerencia =
  | { tipo: "MOVER_DIA"; taskId: string; dias: number[] }
  | { tipo: "PARTIR"; taskId: string }
  | { tipo: "PAUSAR"; taskId: string }
  | { tipo: "SUBIR_META"; goalId: string; nuevoValor: number }
  | { tipo: "NINGUNA" };

export type Sugerencia = {
  id: string;
  severidad: "critica" | "ajuste" | "logro";
  titulo: string;
  detalle: string;
  etiquetaAccion?: string;
  accion: AccionSugerencia;
};

export type Diagnostico = {
  scorePorDominio: Record<string, number>;
  cumplimientoGlobal: number;
  rachaActual: number;
  peorDia: { dia: number; tasa: number } | null;
  mejorDia: { dia: number; tasa: number } | null;
  sugerencias: Sugerencia[];
  totalRegistros: number;
};

function diasAtras(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
}

/**
 * ¿La tarea aplicaba en esa fecha? (para no penalizar días donde no tocaba)
 */
function aplicaEnFecha(
  task: { recurrencia: string; diasSemana: number[] },
  fecha: Date
): boolean {
  if (task.recurrencia === "DIARIA") return true;
  if (task.recurrencia === "SEMANAL") return task.diasSemana.includes(fecha.getUTCDay());
  return false;
}

export async function analizar(userId: string, ventanaDias = 21): Promise<Diagnostico> {
  const desde = diasAtras(ventanaDias);

  const tasks = await prisma.task.findMany({
    where: { userId, activa: true },
    include: { logs: { where: { fecha: { gte: desde } } }, goal: true },
  });

  // ── Matriz de oportunidades: por cada día, qué tareas aplicaban y cuáles se hicieron ──
  const porDia = new Map<number, { aplicables: number; hechas: number }>(); // día de semana 0-6
  const porDominio = new Map<string, { aplicables: number; hechas: number }>();
  const porTarea = new Map<string, { aplicables: number; hechas: number; fallosPorDia: number[] }>();

  let totalAplicables = 0;
  let totalHechas = 0;
  let totalRegistros = 0;

  for (let i = 0; i < ventanaDias; i++) {
    const fecha = diasAtras(i);
    const dow = fecha.getUTCDay();

    for (const t of tasks) {
      if (!aplicaEnFecha(t, fecha)) continue;

      const log = t.logs.find((l) => l.fecha.getTime() === fecha.getTime());
      const hecha = log?.estado === "HECHO";
      if (log) totalRegistros++;

      totalAplicables++;
      if (hecha) totalHechas++;

      const d = porDia.get(dow) ?? { aplicables: 0, hechas: 0 };
      d.aplicables++;
      if (hecha) d.hechas++;
      porDia.set(dow, d);

      const dom = porDominio.get(t.dominio) ?? { aplicables: 0, hechas: 0 };
      dom.aplicables++;
      if (hecha) dom.hechas++;
      porDominio.set(t.dominio, dom);

      const tar =
        porTarea.get(t.id) ?? { aplicables: 0, hechas: 0, fallosPorDia: Array(7).fill(0) };
      tar.aplicables++;
      if (hecha) tar.hechas++;
      else tar.fallosPorDia[dow]++;
      porTarea.set(t.id, tar);
    }
  }

  // ── Scores por dominio (0-100) ──
  const scorePorDominio: Record<string, number> = {};
  for (const dom of DOMINIOS) {
    const d = porDominio.get(dom);
    scorePorDominio[dom] = d && d.aplicables > 0 ? Math.round((d.hechas / d.aplicables) * 100) : 0;
  }

  const cumplimientoGlobal = totalAplicables
    ? Math.round((totalHechas / totalAplicables) * 100)
    : 0;

  // ── Racha: días consecutivos (hacia atrás) con ≥70% de cumplimiento ──
  let rachaActual = 0;
  for (let i = 0; i < ventanaDias; i++) {
    const fecha = diasAtras(i);
    let apl = 0;
    let hec = 0;
    for (const t of tasks) {
      if (!aplicaEnFecha(t, fecha)) continue;
      apl++;
      if (t.logs.find((l) => l.fecha.getTime() === fecha.getTime())?.estado === "HECHO") hec++;
    }
    if (apl === 0) continue;
    if (hec / apl >= 0.7) rachaActual++;
    else break;
  }

  // ── Mejor y peor día ──
  const dias = [...porDia.entries()]
    .filter(([, v]) => v.aplicables >= 2)
    .map(([dia, v]) => ({ dia, tasa: v.hechas / v.aplicables }));
  const peorDia = dias.length ? dias.reduce((a, b) => (b.tasa < a.tasa ? b : a)) : null;
  const mejorDia = dias.length ? dias.reduce((a, b) => (b.tasa > a.tasa ? b : a)) : null;

  // ── Generación de sugerencias ──
  const sugerencias: Sugerencia[] = [];

  // 1. Datos insuficientes
  if (totalRegistros < 5) {
    sugerencias.push({
      id: "calibrando",
      severidad: "ajuste",
      titulo: "El motor está calibrando",
      detalle:
        "Necesito ver unos días de tu comportamiento real para detectar patrones. Marca tus tareas durante 3–4 días y aquí aparecerán ajustes concretos a tu plan.",
      accion: { tipo: "NINGUNA" },
    });
  }

  // 2. Tarea con patrón de fallo concentrado en un día → mover
  for (const t of tasks) {
    const stat = porTarea.get(t.id);
    if (!stat || stat.aplicables < 4) continue;
    const tasa = stat.hechas / stat.aplicables;
    if (tasa >= 0.6) continue;

    const maxFallos = Math.max(...stat.fallosPorDia);
    const diaProblema = stat.fallosPorDia.indexOf(maxFallos);
    const fallosTotales = stat.fallosPorDia.reduce((a, b) => a + b, 0);

    // ¿Más de la mitad de los fallos caen en un solo día?
    if (maxFallos >= 2 && maxFallos / fallosTotales > 0.5 && mejorDia) {
      const nuevosDias =
        t.recurrencia === "SEMANAL"
          ? [...new Set([...t.diasSemana.filter((d) => d !== diaProblema), mejorDia.dia])]
          : [];
      if (nuevosDias.length) {
        sugerencias.push({
          id: `mover-${t.id}`,
          severidad: "ajuste",
          titulo: `"${t.titulo}" se te cae los ${NOMBRE_DIA[diaProblema]}`,
          detalle: `${maxFallos} de ${fallosTotales} fallos ocurren ese día. Tu mejor día es ${NOMBRE_DIA[mejorDia.dia]} (${Math.round(mejorDia.tasa * 100)}% de cumplimiento). Mover la tarea ahí sube la probabilidad de que se haga.`,
          etiquetaAccion: `Mover a ${NOMBRE_DIA[mejorDia.dia]}`,
          accion: { tipo: "MOVER_DIA", taskId: t.id, dias: nuevosDias },
        });
        continue;
      }
    }

    // 3. Tarea larga que se falla mucho → partir en dos
    if (t.duracionMin && t.duracionMin >= 30 && tasa < 0.4) {
      sugerencias.push({
        id: `partir-${t.id}`,
        severidad: "ajuste",
        titulo: `"${t.titulo}" es demasiado grande`,
        detalle: `Solo la completas el ${Math.round(tasa * 100)}% de las veces y dura ${t.duracionMin} min. Una tarea que no cabe en tu día no es un problema de voluntad: es de diseño. Pártela en dos bloques de ${Math.round(t.duracionMin / 2)} min.`,
        etiquetaAccion: "Partir en dos",
        accion: { tipo: "PARTIR", taskId: t.id },
      });
      continue;
    }

    // 4. Tarea abandonada → pausar
    if (tasa < 0.2 && stat.aplicables >= 6) {
      sugerencias.push({
        id: `pausar-${t.id}`,
        severidad: "critica",
        titulo: `"${t.titulo}" lleva ${stat.aplicables - stat.hechas} fallos`,
        detalle:
          "Una tarea que nunca se hace resta más de lo que suma: contamina tu porcentaje y te acostumbra a ignorar la lista. Pausarla es una decisión, no una derrota. Puedes reactivarla cuando tenga sentido.",
        etiquetaAccion: "Pausar",
        accion: { tipo: "PAUSAR", taskId: t.id },
      });
    }
  }

  // 5. Dominio abandonado (desbalance)
  const dominiosConDatos = DOMINIOS.filter((d) => (porDominio.get(d)?.aplicables ?? 0) >= 3);
  if (dominiosConDatos.length >= 2) {
    const peorDom = dominiosConDatos.reduce((a, b) =>
      scorePorDominio[b] < scorePorDominio[a] ? b : a
    );
    const mejorDom = dominiosConDatos.reduce((a, b) =>
      scorePorDominio[b] > scorePorDominio[a] ? b : a
    );
    if (scorePorDominio[mejorDom] - scorePorDominio[peorDom] >= 35) {
      sugerencias.push({
        id: `desbalance-${peorDom}`,
        severidad: "critica",
        titulo: `Tu vida está inclinada hacia ${DOMINIO_LABEL[mejorDom]}`,
        detalle: `${DOMINIO_LABEL[mejorDom]} va al ${scorePorDominio[mejorDom]}% mientras ${DOMINIO_LABEL[peorDom]} está al ${scorePorDominio[peorDom]}%. El desbalance no se corrige con más disciplina, se corrige bajando la exigencia del dominio fuerte o reduciendo el mínimo del débil hasta que sea imposible fallar.`,
        accion: { tipo: "NINGUNA" },
      });
    }
  }

  // 6. Refuerzo: cumplimiento alto → subir la meta
  for (const t of tasks) {
    const stat = porTarea.get(t.id);
    if (!stat || stat.aplicables < 7 || !t.goal) continue;
    if (stat.hechas / stat.aplicables >= 0.9) {
      const nuevoValor = Math.round(t.goal.valorObjetivo * 1.2 * 10) / 10;
      sugerencias.push({
        id: `subir-${t.goalId}`,
        severidad: "logro",
        titulo: `Dominaste "${t.titulo}"`,
        detalle: `${Math.round((stat.hechas / stat.aplicables) * 100)}% de cumplimiento en ${stat.aplicables} oportunidades. Cuando algo deja de costar, deja de entrenar. Sube la meta de ${t.goal.valorObjetivo} a ${nuevoValor} ${t.goal.metrica}.`,
        etiquetaAccion: `Subir a ${nuevoValor}`,
        accion: { tipo: "SUBIR_META", goalId: t.goal.id, nuevoValor },
      });
    }
  }

  // 7. Racha destacable
  if (rachaActual >= 3) {
    sugerencias.push({
      id: "racha",
      severidad: "logro",
      titulo: `${rachaActual} días seguidos por encima del 70%`,
      detalle:
        "La constancia acumulada es el activo más difícil de reconstruir. Si un día vas a fallar, falla en una sola tarea, no en el día completo: la racha se rompe por abandono, no por imperfección.",
      accion: { tipo: "NINGUNA" },
    });
  }

  const orden = { critica: 0, ajuste: 1, logro: 2 };
  sugerencias.sort((a, b) => orden[a.severidad] - orden[b.severidad]);

  return {
    scorePorDominio,
    cumplimientoGlobal,
    rachaActual,
    peorDia,
    mejorDia,
    sugerencias: sugerencias.slice(0, 6),
    totalRegistros,
  };
}

export { NOMBRE_DIA };
