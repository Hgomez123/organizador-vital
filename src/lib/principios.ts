/**
 * PRINCIPIOS — micro-lecciones originales sobre diseño de hábitos.
 * Cada uno se activa según el estado real del usuario (contextual, no aleatorio).
 * Las fuentes son referencias externas: solo enlaces, sin reproducir su contenido.
 */

export type Principio = {
  id: string;
  numero: string;
  titulo: string;
  cuerpo: string;
  aplicacion: string;
  fuente?: { texto: string; url: string };
  /** Condición para mostrarlo. */
  cuando: (ctx: Contexto) => boolean;
};

export type Contexto = {
  cumplimiento: number;
  racha: number;
  desbalance: number;
  totalRegistros: number;
  horasEstudio: number;
};

export const PRINCIPIOS: Principio[] = [
  {
    id: "friccion",
    numero: "01",
    titulo: "La fuerza de voluntad es un mal plan",
    cuerpo:
      "Cuando una tarea se repite y falla, el problema casi nunca es motivación: es fricción. Cada paso previo a la acción (buscar el material, decidir qué hacer, despejar la mesa) es un peaje que pagas antes de empezar. Reducir el peaje funciona mejor que aumentar el esfuerzo.",
    aplicacion:
      "Elige la tarea que más fallas esta semana y quítale un solo paso previo. Uno, no todos.",
    fuente: {
      texto: "BJ Fogg — Behavior Model (Universidad de Stanford)",
      url: "https://behaviormodel.org/",
    },
    cuando: (c) => c.cumplimiento < 60 && c.totalRegistros >= 5,
  },
  {
    id: "minimo",
    numero: "02",
    titulo: "Define el mínimo que no puedes fallar",
    cuerpo:
      "Un plan que solo funciona en tu mejor día es un plan que fallará la mayoría de los días. La versión mínima de un hábito — dos minutos, una página, un plato — no es una concesión: es lo que mantiene viva la identidad de que eres alguien que lo hace.",
    aplicacion:
      "Para cada meta, escribe su versión de 2 minutos. Ese es tu piso los días malos.",
    cuando: (c) => c.cumplimiento < 75,
  },
  {
    id: "nunca-dos",
    numero: "03",
    titulo: "Nunca falles dos veces seguidas",
    cuerpo:
      "Fallar un día es estadística; fallar dos es el comienzo de un patrón nuevo. La diferencia entre quien sostiene un hábito años y quien lo abandona en tres semanas rara vez está en la disciplina diaria — está en la velocidad con que vuelve después de un tropiezo.",
    aplicacion: "Si ayer fallaste algo, hoy hazlo aunque sea en su versión mínima.",
    cuando: (c) => c.racha === 0 && c.totalRegistros >= 3,
  },
  {
    id: "medir",
    numero: "04",
    titulo: "Lo que no se mide, se distorsiona",
    cuerpo:
      "Tu memoria de la semana es una narrativa, no un registro. Casi siempre recuerdas el esfuerzo que sentiste, no las veces que efectivamente lo hiciste. Un dato objetivo, aunque sea incómodo, corrige esa distorsión y convierte la culpa difusa en un ajuste concreto.",
    aplicacion:
      "Marca las tareas el mismo día, incluso las saltadas. Un registro honesto vale más que uno favorable.",
    cuando: (c) => c.totalRegistros < 10,
  },
  {
    id: "balance",
    numero: "05",
    titulo: "El dominio abandonado siempre cobra",
    cuerpo:
      "Sobresalir en un área mientras otras se derrumban no es enfoque, es deuda diferida. El descanso que no tomas, la casa que no atiendes o la comida que descuidas terminan cobrándose en la única área que estabas protegiendo.",
    aplicacion:
      "Mira tu radar: el dominio más bajo no necesita una meta ambiciosa, necesita un mínimo imposible de fallar.",
    cuando: (c) => c.desbalance > 18,
  },
  {
    id: "descanso",
    numero: "06",
    titulo: "El descanso es parte del plan, no su ausencia",
    cuerpo:
      "El tiempo libre sin planificar tiende a evaporarse en pantallas y a dejarte más cansado que antes. Un bloque de descanso protegido y decidido de antemano rinde más que varias horas de tiempo residual.",
    aplicacion: "Agenda un bloque de descanso como agendas una obligación. Defiéndelo igual.",
    cuando: (c) => c.horasEstudio > 8,
  },
  {
    id: "meseta",
    numero: "07",
    titulo: "Cuando deja de costar, deja de entrenar",
    cuerpo:
      "Un hábito consolidado se vuelve invisible: ya no exige decisión ni esfuerzo. Ese es el momento de subir la exigencia, no de celebrar la meseta. El progreso vive justo por encima de lo que ya dominas.",
    aplicacion: "Si algo lleva semanas al 90%, súbelo un 20%. Si no, cámbialo por otra cosa.",
    cuando: (c) => c.cumplimiento >= 85 && c.racha >= 3,
  },
];

export function principiosPara(ctx: Contexto): Principio[] {
  const activos = PRINCIPIOS.filter((p) => p.cuando(ctx));
  return activos.length ? activos.slice(0, 3) : [PRINCIPIOS[1], PRINCIPIOS[3]];
}
