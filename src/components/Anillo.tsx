"use client";

/**
 * ANILLO DE PROGRESO
 * Progreso circular en vez de barra. Admite anillos concéntricos:
 * el exterior lleva el total, el interior el tramo en curso.
 *
 * Implementado con stroke-dasharray sobre un círculo SVG.
 * La circunferencia se calcula, no se aproxima.
 */

export type Traza = {
  /** 0–100 */
  valor: number;
  color: string;
  /** Grosor del trazo en unidades del viewBox */
  grosor?: number;
  /** Etiqueta accesible de esta traza */
  nombre: string;
  /** Pulsa suavemente mientras está en curso */
  activo?: boolean;
};

type Props = {
  trazas: Traza[];
  /** Lado del SVG en píxeles */
  tam?: number;
  children?: React.ReactNode;
};

const VB = 120; // viewBox
const CENTRO = VB / 2;

export function Anillo({ trazas, tam = 140, children }: Props) {
  return (
    <div className="relative shrink-0" style={{ width: tam, height: tam }}>
      <svg
        viewBox={`0 0 ${VB} ${VB}`}
        width={tam}
        height={tam}
        role="img"
        aria-label={trazas.map((t) => `${t.nombre}: ${Math.round(t.valor)}%`).join(". ")}
      >
        {/* Se dibuja de fuera hacia dentro */}
        {trazas.map((t, i) => {
          const grosor = t.grosor ?? 9;
          const radio = CENTRO - grosor / 2 - i * (grosor + 4) - 2;
          const circunferencia = 2 * Math.PI * radio;
          const avance = Math.min(Math.max(t.valor, 0), 100) / 100;

          return (
            <g key={t.nombre} transform={`rotate(-90 ${CENTRO} ${CENTRO})`}>
              {/* Canal de fondo */}
              <circle
                cx={CENTRO}
                cy={CENTRO}
                r={radio}
                fill="none"
                stroke="var(--line)"
                strokeWidth={grosor}
              />
              {/* Progreso */}
              <circle
                className={`anillo-traza ${t.activo ? "anillo-activo" : ""}`}
                cx={CENTRO}
                cy={CENTRO}
                r={radio}
                fill="none"
                stroke={t.color}
                strokeWidth={grosor}
                strokeLinecap="round"
                strokeDasharray={circunferencia}
                strokeDashoffset={circunferencia * (1 - avance)}
              />
            </g>
          );
        })}
      </svg>

      {children && (
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
          {children}
        </div>
      )}
    </div>
  );
}
