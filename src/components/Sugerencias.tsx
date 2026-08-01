"use client";

import { useState, useTransition } from "react";
import { aplicarSugerencia } from "@/app/actions";
import { Vacio } from "./Vacio";
import type { Sugerencia } from "@/lib/motor";

/** Solo dos acentos en toda la app: lima y coral. La tercera severidad usa peso, no color. */
const ESTILO = {
  critica: { borde: "border-l-alert", etiqueta: "Crítico", color: "text-alert" },
  ajuste: { borde: "border-l-accent", etiqueta: "Ajuste", color: "text-accent" },
  logro: { borde: "border-l-fg", etiqueta: "Logro", color: "text-fg" },
} as const;

export function Sugerencias({ items }: { items: Sugerencia[] }) {
  const [abierta, setAbierta] = useState<string | null>(items[0]?.id ?? null);
  const [aplicando, startTransition] = useTransition();
  const [aplicadas, setAplicadas] = useState<string[]>([]);

  return (
    <section className="panel">
      <div className="panel-head">
        <div>
          <h3 className="panel-title">Motor adaptativo</h3>
          <p className="label mt-0.5">Patrones detectados en 21 días</p>
        </div>
        <span className="label shrink-0">
          {items.length} {items.length === 1 ? "hallazgo" : "hallazgos"}
        </span>
      </div>

      {items.length === 0 ? (
        <div className="panel-body">
          <Vacio
            titulo="Sin hallazgos"
            detalle="No detecté patrones de fallo en tus últimos 21 días. Cuando algo empiece a caerse de forma consistente, aparecerá aquí con su ajuste."
          />
        </div>
      ) : (
        <ul>
          {items.map((s, i) => {
            const est = ESTILO[s.severidad];
            const open = abierta === s.id;
            const yaAplicada = aplicadas.includes(s.id);

            return (
              <li
                key={s.id}
                className={`border-l-2 ${est.borde} ${i > 0 ? "border-t border-t-line" : ""}`}
              >
                <button
                  onClick={() => setAbierta(open ? null : s.id)}
                  aria-expanded={open}
                  className="flex w-full items-start gap-3 px-5 py-4 text-left transition-colors duration-[var(--dur-base)] hover:bg-s2"
                >
                  <span className={`label mt-0.5 shrink-0 ${est.color}`}>{est.etiqueta}</span>
                  <span className="min-w-0 flex-1 text-[length:var(--t-base)] font-semibold leading-snug text-fg">
                    {s.titulo}
                  </span>
                  <span
                    aria-hidden
                    className={`shrink-0 text-muted transition-transform duration-[var(--dur-base)] ${
                      open ? "rotate-45" : ""
                    }`}
                  >
                    +
                  </span>
                </button>

                <div
                  className="grid transition-all duration-[var(--dur-slow)] ease-[var(--ease-out)]"
                  style={{ gridTemplateRows: open ? "1fr" : "0fr" }}
                >
                  <div className="overflow-hidden">
                    <div className="space-y-3 px-5 pb-4 pl-[4.5rem]">
                      <p className="cuerpo">{s.detalle}</p>

                      {s.etiquetaAccion && s.accion.tipo !== "NINGUNA" && (
                        <button
                          disabled={aplicando || yaAplicada}
                          onClick={() =>
                            startTransition(async () => {
                              await aplicarSugerencia(s.accion);
                              setAplicadas((a) => [...a, s.id]);
                            })
                          }
                          className="btn border-accent text-accent hover:bg-accent hover:text-bg"
                        >
                          {yaAplicada ? "✓ Aplicado" : aplicando ? "Aplicando…" : s.etiquetaAccion}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <p className="panel-foot label">Analiza 21 días · se recalcula en cada visita</p>
    </section>
  );
}
