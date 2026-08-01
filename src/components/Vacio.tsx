/**
 * ESTADO VACÍO
 * Primitiva única para toda la app: ninguna sección debe quedar en blanco.
 * Un vacío bien diseñado explica por qué no hay nada y qué hacer al respecto.
 */

type Props = {
  titulo: string;
  detalle: string;
  /** Acción opcional: se pasa como nodo para no acoplar este componente a la lógica. */
  accion?: React.ReactNode;
};

export function Vacio({ titulo, detalle, accion }: Props) {
  return (
    <div className="empty">
      <p className="text-[length:var(--t-base)] font-bold uppercase tracking-tight">{titulo}</p>
      <p className="mx-auto mt-2 max-w-sm text-[length:var(--t-sm)] leading-relaxed text-muted">
        {detalle}
      </p>
      {accion && <div className="mt-4 flex justify-center">{accion}</div>}
    </div>
  );
}
