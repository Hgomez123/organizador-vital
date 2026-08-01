"use client";

import { useState } from "react";
import type { CeldaSemana, ResumenDia } from "@/lib/semana";

/**
 * MAPA DE CALOR SEMANAL
 * Filas = dominios, columnas = días. La intensidad es cumplimiento real.
 * Distingue tres estados que no deben confundirse: sin tareas, futuro y fallado.
 */

const DIA_CORTO = ["D", "L", "M", "X", "J", "V", "S"];
const ORDEN = [1, 2, 3, 4, 5, 6, 0];

function tono(tasa: number | null, aplicables: number, futuro: boolean): string {
  if (futuro) return "repeating-linear-gradient(45deg, var(--s2) 0 3px, transparent 3px 6px)";
  if (aplicables === 0) return "transparent";
  if (tasa === null) return "transparent";
  if (tasa >= 0.9) return "var(--accent)";
  if (tasa >= 0.7) return "color-mix(in srgb, var(--accent) 70%, transparent)";
  if (tasa >= 0.4) return "color-mix(in srgb, var(--accent) 40%, transparent)";
  if (tasa > 0) return "color-mix(in srgb, var(--accent) 20%, transparent)";
  return "color-mix(in srgb, var(--alert) 30%, transparent)";
}

type Props = {
  celdas: CeldaSemana[];
  dias: ResumenDia[];
  dominios: readonly string[];
  labels: Record<string, string>;
};

export function MapaCalor({ celdas, dias, dominios, labels }: Props) {
  const [foco, setFoco] = useState<string | null>(null);

  const buscar = (dominio: string, dia: number) =>
    celdas.find((c) => c.dominio === dominio && c.dia === dia);
  const diaInfo = (dia: number) => dias.find((d) => d.dia === dia);

  return (
    <section className="panel">
      <div className="panel-head">
        <div>
          <h3 className="panel-title">Mapa de la semana</h3>
          <p className="label mt-0.5">Cumplimiento por dominio y día</p>
        </div>
        {foco && <span className="label shrink-0 text-accent">{foco}</span>}
      </div>

      <div className="panel-body overflow-x-auto">
        <table className="w-full border-separate border-spacing-1">
          <thead>
            <tr>
              <th className="label w-24 text-left font-normal">Dominio</th>
              {ORDEN.map((d) => {
                const info = diaInfo(d);
                return (
                  <th key={d} className="w-10">
                    <span
                      className={`label block ${info?.esHoy ? "text-accent" : ""}`}
                      aria-label={info?.fecha.toLocaleDateString("es", {
                        weekday: "long",
                        timeZone: "UTC",
                      })}
                    >
                      {DIA_CORTO[d]}
                    </span>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {dominios.map((dom) => (
              <tr key={dom}>
                <th scope="row" className="label max-w-24 truncate text-left font-normal">
                  {labels[dom]}
                </th>
                {ORDEN.map((d) => {
                  const c = buscar(dom, d);
                  const info = diaInfo(d);
                  const futuro = info?.esFuturo ?? false;
                  const desc =
                    !c || c.aplicables === 0
                      ? "sin tareas"
                      : futuro
                        ? "aún no llega"
                        : `${c.hechas}/${c.aplicables}`;
                  return (
                    <td key={d}>
                      <div
                        onMouseEnter={() => setFoco(`${labels[dom]} · ${DIA_CORTO[d]} — ${desc}`)}
                        onMouseLeave={() => setFoco(null)}
                        title={`${labels[dom]} — ${desc}`}
                        className={`h-9 w-full rounded-[var(--r-sm)] border transition-transform duration-[var(--dur-fast)] ease-[var(--ease-spring)] hover:scale-110 ${
                          info?.esHoy ? "border-accent/50" : "border-line"
                        }`}
                        style={{ background: tono(c?.tasa ?? null, c?.aplicables ?? 0, futuro) }}
                      >
                        <span className="sr-only">
                          {labels[dom]}, {DIA_CORTO[d]}: {desc}
                        </span>
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="panel-foot flex flex-wrap items-center gap-4">
        <span className="label flex items-center gap-1.5">
          <span
            aria-hidden
            className="h-3 w-3 rounded-[2px]"
            style={{ background: "var(--accent)" }}
          />
          Cumplido
        </span>
        <span className="label flex items-center gap-1.5">
          <span
            aria-hidden
            className="h-3 w-3 rounded-[2px]"
            style={{ background: "color-mix(in srgb, var(--alert) 30%, transparent)" }}
          />
          Fallado
        </span>
        <span className="label flex items-center gap-1.5">
          <span aria-hidden className="h-3 w-3 rounded-[2px] border border-line" />
          Sin tareas
        </span>
        <span className="label flex items-center gap-1.5">
          <span
            aria-hidden
            className="h-3 w-3 rounded-[2px] border border-line"
            style={{
              background:
                "repeating-linear-gradient(45deg, var(--s2) 0 3px, transparent 3px 6px)",
            }}
          />
          Por venir
        </span>
      </div>
    </section>
  );
}
