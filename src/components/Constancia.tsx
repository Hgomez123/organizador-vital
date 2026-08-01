"use client";

/**
 * CALENDARIO DE CONSTANCIA
 * Una casilla por día. La intensidad refleja el cumplimiento real.
 * Los días sin obligaciones se dibujan huecos, no en rojo: no cumpliste
 * nada porque no había nada que cumplir, y eso no es un fallo.
 */

import type { DiaConstancia } from "@/lib/metas";

const DIA_LETRA = ["D", "L", "M", "X", "J", "V", "S"];

function tono(tasa: number | null): string {
  if (tasa === null) return "transparent";
  if (tasa >= 0.9) return "var(--accent)";
  if (tasa >= 0.7) return "color-mix(in srgb, var(--accent) 68%, transparent)";
  if (tasa >= 0.4) return "color-mix(in srgb, var(--accent) 38%, transparent)";
  if (tasa > 0) return "color-mix(in srgb, var(--accent) 18%, transparent)";
  return "var(--s3)";
}

export function Constancia({ dias }: { dias: DiaConstancia[] }) {
  return (
    <div>
      <div className="flex flex-wrap gap-1">
        {dias.map((d) => {
          const etiqueta =
            d.tasa === null
              ? "sin tareas"
              : `${Math.round(d.tasa * 100)}% cumplido`;
          const fechaTxt = d.fecha.toLocaleDateString("es", {
            day: "numeric",
            month: "short",
            timeZone: "UTC",
          });

          return (
            <div
              key={d.fecha.toISOString()}
              title={`${fechaTxt} — ${etiqueta}`}
              className="group/dia relative h-5 w-5 rounded-[3px] border transition-transform duration-[var(--dur-fast)] ease-[var(--ease-spring)] hover:scale-125"
              style={{
                background: tono(d.tasa),
                borderColor: d.tasa === null ? "var(--line)" : "transparent",
              }}
            >
              <span className="sr-only">
                {fechaTxt}: {etiqueta}
              </span>
            </div>
          );
        })}
      </div>

      {/* Leyenda */}
      <div className="mt-3 flex items-center gap-2">
        <span className="label">Menos</span>
        {[0, 0.3, 0.5, 0.75, 1].map((t) => (
          <span
            key={t}
            aria-hidden
            className="h-3 w-3 rounded-[2px] border"
            style={{
              background: tono(t),
              borderColor: "transparent",
            }}
          />
        ))}
        <span className="label">Más</span>
        <span className="label ml-auto flex items-center gap-1.5">
          <span
            aria-hidden
            className="h-3 w-3 rounded-[2px] border border-line"
            style={{ background: "transparent" }}
          />
          Sin tareas
        </span>
      </div>
    </div>
  );
}

export { DIA_LETRA };
