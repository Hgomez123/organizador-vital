"use client";

import { useEffect, useState } from "react";
import { Vacio } from "./Vacio";

type Props = {
  scores: Record<string, number>;
  labels: Record<string, string>;
  dominios: readonly string[];
  /** Si no hay registros suficientes, el radar miente. Mejor decirlo. */
  hayDatos: boolean;
};

const R = 100;
const CX = 130;
const CY = 125;

export function RadarVida({ scores, labels, dominios, hayDatos }: Props) {
  const [t, setT] = useState(0);
  const [hover, setHover] = useState<string | null>(null);

  useEffect(() => {
    if (!hayDatos) return;
    let raf = 0;
    const inicio = performance.now();
    const dur = 900;
    const tick = (now: number) => {
      const p = Math.min((now - inicio) / dur, 1);
      setT(1 - Math.pow(1 - p, 3));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [scores, hayDatos]);

  const n = dominios.length;
  const punto = (i: number, radio: number) => {
    const ang = (Math.PI * 2 * i) / n - Math.PI / 2;
    return [CX + Math.cos(ang) * radio, CY + Math.sin(ang) * radio] as const;
  };

  const vertices = dominios.map((d, i) => punto(i, ((scores[d] ?? 0) / 100) * R * t));
  const poly = vertices.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");

  const promedio = Math.round(dominios.reduce((a, d) => a + (scores[d] ?? 0), 0) / n);
  const valores = dominios.map((d) => scores[d] ?? 0);
  const desv = Math.round(Math.sqrt(valores.reduce((a, v) => a + (v - promedio) ** 2, 0) / n));
  const veredicto = desv > 30 ? "Muy desbalanceada" : desv > 18 ? "Desbalanceada" : "Equilibrada";

  return (
    <section className="panel">
      <div className="panel-head">
        <div>
          <h3 className="panel-title">Radar de vida</h3>
          <p className="label mt-0.5">Equilibrio entre dominios · 21 días</p>
        </div>
        {hayDatos && (
          <span
            className={`label shrink-0 rounded-full border px-2.5 py-1 ${
              desv > 18 ? "border-alert text-alert" : "border-accent text-accent"
            }`}
          >
            {veredicto}
          </span>
        )}
      </div>

      {!hayDatos ? (
        <div className="panel-body">
          <Vacio
            titulo="Aún no hay figura que dibujar"
            detalle="El radar compara tus cinco dominios entre sí. Necesita al menos unos días de registros para que la forma signifique algo — un polígono construido con dos datos solo dibuja ruido."
          />
        </div>
      ) : (
        <>
          <div className="panel-body flex flex-col items-center gap-6 sm:flex-row">
            <svg
              viewBox="0 0 260 250"
              className="w-full max-w-[260px] shrink-0 overflow-visible"
              role="img"
              aria-label={`Radar de vida. Promedio ${promedio} por ciento. ${dominios
                .map((d) => `${labels[d]}: ${scores[d] ?? 0}%`)
                .join(", ")}.`}
            >
              {[0.25, 0.5, 0.75, 1].map((f) => (
                <polygon
                  key={f}
                  points={dominios
                    .map((_, i) => {
                      const [x, y] = punto(i, R * f);
                      return `${x},${y}`;
                    })
                    .join(" ")}
                  fill="none"
                  stroke="var(--line)"
                  strokeWidth="1"
                />
              ))}

              {dominios.map((_, i) => {
                const [x, y] = punto(i, R);
                return (
                  <line key={i} x1={CX} y1={CY} x2={x} y2={y} stroke="var(--line)" strokeWidth="1" />
                );
              })}

              <polygon
                points={poly}
                fill="var(--accent)"
                fillOpacity="0.18"
                stroke="var(--accent)"
                strokeWidth="2"
                strokeLinejoin="round"
              />

              {vertices.map(([x, y], i) => (
                <circle
                  key={dominios[i]}
                  cx={x}
                  cy={y}
                  r={hover === dominios[i] ? 6 : 3.5}
                  fill="var(--accent)"
                  className="transition-all duration-[var(--dur-fast)]"
                  onMouseEnter={() => setHover(dominios[i])}
                  onMouseLeave={() => setHover(null)}
                />
              ))}

              {dominios.map((d, i) => {
                const [x, y] = punto(i, R + 26);
                return (
                  <text
                    key={d}
                    x={x}
                    y={y}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    className="mono cursor-default transition-all duration-[var(--dur-fast)]"
                    fill={hover === d ? "var(--accent)" : "var(--muted)"}
                    fontSize="9"
                    letterSpacing="1.5"
                    style={{ textTransform: "uppercase" }}
                    onMouseEnter={() => setHover(d)}
                    onMouseLeave={() => setHover(null)}
                  >
                    {labels[d]}
                  </text>
                );
              })}

              <text x={CX} y={CY - 4} textAnchor="middle" fill="var(--fg)" fontSize="26" fontWeight="700">
                {hover ? scores[hover] ?? 0 : promedio}
              </text>
              <text
                x={CX}
                y={CY + 12}
                textAnchor="middle"
                fill="var(--muted)"
                fontSize="7"
                letterSpacing="1.5"
                className="mono"
              >
                {hover ? labels[hover].toUpperCase() : "PROMEDIO"}
              </text>
            </svg>

            <ul className="w-full space-y-2">
              {[...dominios]
                .sort((a, b) => (scores[b] ?? 0) - (scores[a] ?? 0))
                .map((d) => {
                  const v = scores[d] ?? 0;
                  return (
                    <li
                      key={d}
                      onMouseEnter={() => setHover(d)}
                      onMouseLeave={() => setHover(null)}
                      className="cursor-default"
                    >
                      <div className="mb-1 flex justify-between">
                        <span className={`label ${hover === d ? "text-accent" : ""}`}>
                          {labels[d]}
                        </span>
                        <span className="mono text-[length:var(--t-micro)] tabular-nums">{v}%</span>
                      </div>
                      <div className="h-[2px] w-full bg-line">
                        <div
                          className="h-full bg-accent transition-all duration-[var(--dur-slow)]"
                          style={{ width: `${v * t}%`, opacity: hover && hover !== d ? 0.3 : 1 }}
                        />
                      </div>
                    </li>
                  );
                })}
            </ul>
          </div>

          <p className="panel-foot cuerpo">
            {desv > 18
              ? "Un pico alto rodeado de valles no es productividad, es deuda: el dominio abandonado termina cobrando. Baja el más alto antes de subir el más bajo."
              : "Tu figura es pareja. Ese equilibrio es más difícil de sostener que la excelencia en un solo dominio — y más duradero."}
          </p>
        </>
      )}
    </section>
  );
}
