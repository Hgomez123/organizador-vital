/**
 * DEFINICIONES DE AVISOS — compartidas entre servidor y cliente.
 *
 * Deliberadamente sin `server-only` ni acceso a la base de datos: el panel
 * de configuración es un componente de cliente y necesita estos nombres y
 * descripciones. La lógica que consulta datos vive en `avisos.ts`.
 */

export const TIPOS_AVISO = [
  "PLAN_MANANA",
  "EMPUJON_TARDE",
  "REGISTRO_NOCHE",
  "REVISION_SEMANAL",
] as const;

export type TipoAvisoKey = (typeof TIPOS_AVISO)[number];

export const DEFINICION: Record<
  TipoAvisoKey,
  { nombre: string; proposito: string; horaDefecto: string; diaDefecto?: number }
> = {
  PLAN_MANANA: {
    nombre: "Plan del día",
    proposito:
      "Al levantarte, qué toca hoy y cuánto tiempo suma. Decidir de antemano evita negociar contigo mismo a media tarde.",
    horaDefecto: "07:30",
  },
  EMPUJON_TARDE: {
    nombre: "Empujón de media tarde",
    proposito:
      "Solo llega si aún no has marcado nada. Si ya arrancaste el día, se queda callado.",
    horaDefecto: "15:00",
  },
  REGISTRO_NOCHE: {
    nombre: "Registro de cierre",
    proposito:
      "El momento de marcar lo hecho. Sin este registro el motor adaptativo no tiene con qué detectar patrones.",
    horaDefecto: "21:00",
  },
  REVISION_SEMANAL: {
    nombre: "Revisión semanal",
    proposito:
      "Una vez por semana: cumplimiento, comparación con la semana previa y el hallazgo más importante del motor.",
    horaDefecto: "19:00",
    diaDefecto: 0,
  },
};
