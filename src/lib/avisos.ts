import "server-only";
import { prisma } from "./prisma";
import { analizar } from "./motor";
import { analizarSemana } from "./semana";
import { TIPOS_AVISO, DEFINICION, type TipoAvisoKey } from "./avisos-def";

/**
 * ESTRATEGIA DE AVISOS — lado servidor
 *
 * Cuatro momentos con propósitos distintos. La regla que los gobierna:
 * un aviso que no aporta información se aprende a ignorar en una semana.
 * Por eso cada tipo tiene una condición de silencio — si no hay nada útil
 * que decir, no se envía.
 *
 * Los nombres y descripciones viven en `avisos-def.ts` porque el panel de
 * configuración es un componente de cliente y no puede importar este archivo.
 */

export { TIPOS_AVISO, DEFINICION };
export type { TipoAvisoKey };

export type Mensaje = { titulo: string; cuerpo: string; url: string };

function aplicaEnFecha(t: { recurrencia: string; diasSemana: number[] }, f: Date): boolean {
  if (t.recurrencia === "DIARIA") return true;
  if (t.recurrencia === "SEMANAL") return t.diasSemana.includes(f.getUTCDay());
  return false;
}

/** Tareas de hoy con su estado, según el día natural del usuario. */
async function tareasDeHoy(userId: string, diaClave: Date) {
  const tareas = await prisma.task.findMany({
    where: { userId, activa: true },
    include: { logs: { where: { fecha: diaClave } } },
  });
  const deHoy = tareas.filter((t) => aplicaEnFecha(t, diaClave));
  const hechas = deHoy.filter((t) => t.logs[0]?.estado === "HECHO");
  const pendientes = deHoy.filter((t) => t.logs[0]?.estado !== "HECHO");
  const sinTocar = deHoy.every((t) => !t.logs[0]);
  return { deHoy, hechas, pendientes, sinTocar };
}

/**
 * Construye el mensaje de un aviso, o devuelve null si toca callarse.
 * El null es tan importante como el texto: es la diferencia entre una
 * herramienta y una molestia.
 */
export async function construirMensaje(
  tipo: TipoAvisoKey,
  userId: string,
  diaClave: Date
): Promise<Mensaje | null> {
  if (tipo === "PLAN_MANANA") {
    const { deHoy } = await tareasDeHoy(userId, diaClave);
    if (deHoy.length === 0) return null; // nada que anunciar

    const minutos = deHoy.reduce((a, t) => a + (t.duracionMin ?? 0), 0);
    const dominios = [...new Set(deHoy.map((t) => t.dominio))].length;

    return {
      titulo: `Hoy: ${deHoy.length} ${deHoy.length === 1 ? "tarea" : "tareas"}`,
      cuerpo:
        minutos > 0
          ? `${minutos} minutos en total, ${dominios} ${dominios === 1 ? "área" : "áreas"}. Empiezas por: ${deHoy[0].titulo}.`
          : `Empiezas por: ${deHoy[0].titulo}.`,
      url: "/",
    };
  }

  if (tipo === "EMPUJON_TARDE") {
    const { deHoy, pendientes, sinTocar } = await tareasDeHoy(userId, diaClave);
    if (deHoy.length === 0 || pendientes.length === 0) return null;
    // Si ya arrancó el día, no interrumpir
    if (!sinTocar) return null;

    const corta = [...pendientes].sort(
      (a, b) => (a.duracionMin ?? 999) - (b.duracionMin ?? 999)
    )[0];

    return {
      titulo: "El día sigue en cero",
      cuerpo: `Quedan ${pendientes.length}. La más corta es "${corta.titulo}"${corta.duracionMin ? ` — ${corta.duracionMin} min` : ""}. Empezar por ahí rompe la inercia.`,
      url: "/",
    };
  }

  if (tipo === "REGISTRO_NOCHE") {
    const { deHoy, hechas, pendientes } = await tareasDeHoy(userId, diaClave);
    if (deHoy.length === 0) return null;

    if (pendientes.length === 0) {
      return {
        titulo: "Día cerrado",
        cuerpo: `Completaste las ${deHoy.length}. Así se construye la racha: no con días perfectos, con días terminados.`,
        url: "/metas",
      };
    }

    return {
      titulo: `Te faltan ${pendientes.length} por marcar`,
      cuerpo: `Llevas ${hechas.length} de ${deHoy.length}. Marca también lo que saltaste: el motor necesita los fallos para encontrar el patrón.`,
      url: "/",
    };
  }

  if (tipo === "REVISION_SEMANAL") {
    const [s, diag] = await Promise.all([analizarSemana(userId), analizar(userId)]);
    if (s.totalAplicables === 0) return null;

    const delta = s.deltaSemanaPrevia;
    const comparativa =
      delta === null
        ? ""
        : delta > 3
          ? ` (+${delta} pts vs. la semana pasada)`
          : delta < -3
            ? ` (${delta} pts vs. la semana pasada)`
            : " (igual que la semana pasada)";

    const hallazgo = diag.sugerencias.find((x) => x.severidad !== "logro");

    return {
      titulo: `Semana al ${s.cumplimiento}%${comparativa}`,
      cuerpo: hallazgo
        ? hallazgo.titulo
        : `${s.totalHechas} de ${s.totalAplicables} cumplidas. Entra a ver el mapa completo.`,
      url: "/semana",
    };
  }

  return null;
}

/** Crea las cuatro filas de avisos para un usuario que aún no las tenga. */
export async function asegurarAvisos(userId: string) {
  const existentes = await prisma.aviso.findMany({ where: { userId } });
  const faltantes = TIPOS_AVISO.filter((t) => !existentes.some((e) => e.tipo === t));

  for (const tipo of faltantes) {
    const def = DEFINICION[tipo];
    await prisma.aviso.create({
      data: {
        userId,
        tipo,
        hora: def.horaDefecto,
        diaSemana: def.diaDefecto ?? null,
        activo: false,
      },
    });
  }

  return prisma.aviso.findMany({ where: { userId }, orderBy: { hora: "asc" } });
}
