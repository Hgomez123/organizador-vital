"use client";

import { Anillo } from "./Anillo";
import { Contador } from "./Contador";

/**
 * MÉTRICAS
 * Cuatro indicadores. Los dos porcentuales se muestran como anillo;
 * los que no son porcentajes (racha, horas) no admiten forma circular honesta
 * y usan número grande. Forzar un anillo sobre un dato sin techo sería mentir.
 */

type Props = {
  progresoHoy: number;
  hechas: number;
  totalHoy: number;
  cumplimiento: number;
  racha: number;
  horasEstudio: number;
  metaHoras: number;
};

export function Metricas({
  progresoHoy,
  hechas,
  totalHoy,
  cumplimiento,
  racha,
  horasEstudio,
  metaHoras,
}: Props) {
  return (
    <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {/* Progreso de hoy */}
      <div className="panel panel-interactivo flex flex-col items-center gap-2 p-4">
        <Anillo
          tam={92}
          trazas={[{ nombre: "Progreso de hoy", valor: progresoHoy, color: "var(--accent)" }]}
        >
          <span className="text-xl font-bold tabular-nums leading-none">
            <Contador valor={progresoHoy} />
            <span className="text-xs text-accent">%</span>
          </span>
        </Anillo>
        <div className="text-center">
          <p className="label">Progreso hoy</p>
          <p className="text-[length:var(--t-micro)] text-muted">
            {hechas}/{totalHoy} tareas
          </p>
        </div>
      </div>

      {/* Cumplimiento 21 días */}
      <div className="panel panel-interactivo flex flex-col items-center gap-2 p-4">
        <Anillo
          tam={92}
          trazas={[{ nombre: "Cumplimiento 21 días", valor: cumplimiento, color: "var(--accent)" }]}
        >
          <span className="text-xl font-bold tabular-nums leading-none">
            <Contador valor={cumplimiento} />
            <span className="text-xs text-accent">%</span>
          </span>
        </Anillo>
        <div className="text-center">
          <p className="label">Cumplimiento</p>
          <p className="text-[length:var(--t-micro)] text-muted">últimos 21 días</p>
        </div>
      </div>

      {/* Racha — sin techo, no admite anillo */}
      <div className="panel panel-interactivo flex flex-col items-center justify-center gap-2 p-4">
        <p className="text-5xl font-bold tabular-nums leading-none">
          <Contador valor={racha} />
          <span className="text-2xl text-accent">d</span>
        </p>
        <div className="text-center">
          <p className="label">Racha</p>
          <p className="text-[length:var(--t-micro)] text-muted">días sobre 70%</p>
        </div>
      </div>

      {/* Estudio — anillo contra la meta semanal */}
      <div className="panel panel-interactivo flex flex-col items-center gap-2 p-4">
        <Anillo
          tam={92}
          trazas={[
            {
              nombre: "Estudio de la semana",
              valor: (horasEstudio / metaHoras) * 100,
              color: "var(--accent-2)",
            },
          ]}
        >
          <span className="text-xl font-bold tabular-nums leading-none">
            <Contador valor={horasEstudio} decimales={1} />
            <span className="text-xs text-alert">h</span>
          </span>
        </Anillo>
        <div className="text-center">
          <p className="label">Estudio 7d</p>
          <p className="text-[length:var(--t-micro)] text-muted">meta: {metaHoras} h</p>
        </div>
      </div>
    </section>
  );
}
