/**
 * CAPA IA (opcional)
 * Si existe ANTHROPIC_API_KEY, enriquece el motor con lenguaje natural.
 * Si no existe, todo el sistema sigue funcionando con las reglas deterministas.
 */

export type PlanGenerado = {
  meta: { titulo: string; dominio: string; metrica: string; valorObjetivo: number };
  tareas: { titulo: string; dominio: string; recurrencia: "DIARIA" | "SEMANAL"; diasSemana: number[]; duracionMin: number }[];
  razonamiento: string;
};

const DOMINIOS_VALIDOS = ["COMIDAS", "LIMPIEZA", "ESTUDIO", "TIEMPO_LIBRE", "GENERAL"];

export function hayIA(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

const SYSTEM = `Eres un estratega de hábitos. Conviertes una intención vaga en un plan mínimo viable.

Reglas innegociables:
- Máximo 4 tareas. Menos es más: un plan que no se cumple no es un plan.
- Cada tarea debe caber en menos de 30 minutos.
- Prefiere frecuencia baja y sostenible (3 días/semana) sobre diaria ambiciosa.
- Los títulos son acciones concretas y observables ("Preparar almuerzo", no "Comer mejor").
- dominio ∈ [COMIDAS, LIMPIEZA, ESTUDIO, TIEMPO_LIBRE, GENERAL]
- diasSemana: 0=domingo … 6=sábado. Vacío si recurrencia es DIARIA.

Responde SOLO con JSON válido, sin markdown ni explicación fuera del JSON:
{"meta":{"titulo":"","dominio":"","metrica":"","valorObjetivo":0},"tareas":[{"titulo":"","dominio":"","recurrencia":"SEMANAL","diasSemana":[1,3,5],"duracionMin":20}],"razonamiento":"2 frases explicando por qué este plan es realista"}`;

/** Genera un plan desde texto libre. Devuelve null si no hay IA disponible o falla. */
export async function planificarConIA(intencion: string): Promise<PlanGenerado | null> {
  if (!hayIA()) return null;
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY!,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-5",
        max_tokens: 1200,
        system: SYSTEM,
        messages: [{ role: "user", content: intencion }],
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const texto: string = data?.content?.[0]?.text ?? "";
    const json = texto.slice(texto.indexOf("{"), texto.lastIndexOf("}") + 1);
    const plan = JSON.parse(json) as PlanGenerado;
    if (!plan?.tareas?.length) return null;
    // Saneamiento
    plan.tareas = plan.tareas.slice(0, 4).map((t) => ({
      ...t,
      dominio: DOMINIOS_VALIDOS.includes(t.dominio) ? t.dominio : "GENERAL",
      diasSemana: t.recurrencia === "SEMANAL" ? (t.diasSemana ?? []).filter((d) => d >= 0 && d <= 6) : [],
      duracionMin: Math.min(Math.max(t.duracionMin || 15, 5), 60),
    }));
    return plan;
  } catch {
    return null;
  }
}

/**
 * FALLBACK DETERMINISTA — sin IA.
 * Detecta dominios por palabras clave y arma un plan mínimo con plantillas.
 */
const PLANTILLAS: Record<string, { claves: string[]; meta: PlanGenerado["meta"]; tareas: PlanGenerado["tareas"] }> = {
  ESTUDIO: {
    claves: ["estudi", "aprend", "curso", "leer", "libro", "carrera", "certific", "examen", "ingl"],
    meta: { titulo: "Estudiar con constancia", dominio: "ESTUDIO", metrica: "horas/semana", valorObjetivo: 5 },
    tareas: [
      { titulo: "Sesión de estudio (1 pomodoro)", dominio: "ESTUDIO", recurrencia: "SEMANAL", diasSemana: [1, 3, 5], duracionMin: 25 },
      { titulo: "Repasar apuntes de la semana", dominio: "ESTUDIO", recurrencia: "SEMANAL", diasSemana: [0], duracionMin: 20 },
    ],
  },
  COMIDAS: {
    claves: ["comer", "comida", "cocin", "dieta", "aliment", "almuerzo", "cena", "mercado", "compra"],
    meta: { titulo: "Comer en casa la mayoría de días", dominio: "COMIDAS", metrica: "comidas/semana", valorObjetivo: 10 },
    tareas: [
      { titulo: "Planear menú de la semana", dominio: "COMIDAS", recurrencia: "SEMANAL", diasSemana: [0], duracionMin: 20 },
      { titulo: "Preparar almuerzo del día siguiente", dominio: "COMIDAS", recurrencia: "SEMANAL", diasSemana: [1, 2, 3, 4], duracionMin: 25 },
    ],
  },
  LIMPIEZA: {
    claves: ["limpi", "orden", "casa", "hogar", "ropa", "lavar", "desorden"],
    meta: { titulo: "Mantener la casa sin acumular", dominio: "LIMPIEZA", metrica: "tareas/semana", valorObjetivo: 7 },
    tareas: [
      { titulo: "Reset de 10 minutos", dominio: "LIMPIEZA", recurrencia: "DIARIA", diasSemana: [], duracionMin: 10 },
      { titulo: "Limpieza a fondo de una zona", dominio: "LIMPIEZA", recurrencia: "SEMANAL", diasSemana: [6], duracionMin: 30 },
    ],
  },
  TIEMPO_LIBRE: {
    claves: ["descans", "libre", "ocio", "hobby", "relaj", "pantalla", "salir", "amig", "ejercicio", "deporte", "caminar"],
    meta: { titulo: "Proteger mi tiempo de descanso", dominio: "TIEMPO_LIBRE", metrica: "bloques/semana", valorObjetivo: 5 },
    tareas: [
      { titulo: "30 min sin pantallas", dominio: "TIEMPO_LIBRE", recurrencia: "DIARIA", diasSemana: [], duracionMin: 30 },
      { titulo: "Salir a caminar", dominio: "TIEMPO_LIBRE", recurrencia: "SEMANAL", diasSemana: [2, 5], duracionMin: 25 },
    ],
  },
};

export function planificarLocal(intencion: string): PlanGenerado {
  const texto = intencion.toLowerCase();
  const detectados = Object.entries(PLANTILLAS).filter(([, p]) =>
    p.claves.some((c) => texto.includes(c))
  );

  const elegidos = detectados.length ? detectados.slice(0, 2) : [["GENERAL", PLANTILLAS.TIEMPO_LIBRE] as const];

  const tareas = elegidos.flatMap(([, p]) => p.tareas).slice(0, 4);
  const meta = elegidos[0][1].meta;

  return {
    meta,
    tareas,
    razonamiento: detectados.length
      ? `Detecté ${elegidos.map(([k]) => k.toLowerCase().replace("_", " ")).join(" y ")} en lo que escribiste. Armé ${tareas.length} tareas cortas en vez de una grande: el plan tiene que caber en tu día real, no en tu día ideal.`
      : "No identifiqué un dominio claro, así que empecé por proteger tu descanso — es la base sobre la que se sostiene todo lo demás. Puedes editar o borrar estas tareas.",
  };
}
