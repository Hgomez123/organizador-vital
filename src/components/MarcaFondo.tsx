"use client";

import { useEffect, useRef } from "react";

/**
 * MARCA DE FONDO
 * Anillo enorme que ocupa la pantalla como textura de fondo.
 *
 * Es interactivo y semántico a la vez:
 *  - Sigue el cursor con parallax suavizado (interpolación por frame).
 *  - Su arco exterior refleja tu progreso REAL del día, no un valor decorativo.
 *  - Gira lentamente de forma autónoma; el cursor solo lo desvía.
 *
 * Sin puntero (móvil) hace una deriva propia. Con movimiento reducido, queda quieto.
 */

type Props = {
  /** 0–100. El arco de la marca es tu progreso de hoy. */
  progreso: number;
};

export function MarcaFondo({ progreso }: Props) {
  const capaRef = useRef<HTMLDivElement>(null);
  const giroRef = useRef<SVGGElement>(null);

  useEffect(() => {
    const capa = capaRef.current;
    const giro = giroRef.current;
    if (!capa || !giro) return;

    const reducido = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reducido) return;

    const finoPuntero = window.matchMedia("(pointer: fine)").matches;

    // Objetivo y posición actual: la diferencia es lo que produce la suavidad
    let objX = 0;
    let objY = 0;
    let actX = 0;
    let actY = 0;
    let rot = 0;
    let raf = 0;

    const onMove = (e: PointerEvent) => {
      // -1 … 1 respecto al centro de la ventana
      objX = (e.clientX / window.innerWidth - 0.5) * 2;
      objY = (e.clientY / window.innerHeight - 0.5) * 2;
    };

    const inicio = performance.now();

    const bucle = (ahora: number) => {
      if (!finoPuntero) {
        // Sin ratón: deriva autónoma en curvas lentas y desfasadas
        const t = (ahora - inicio) / 1000;
        objX = Math.sin(t / 7) * 0.6;
        objY = Math.cos(t / 11) * 0.6;
      }

      // Interpolación: se acerca un 6% al objetivo cada frame
      actX += (objX - actX) * 0.06;
      actY += (objY - actY) * 0.06;

      // Giro autónomo constante, muy lento
      rot += 0.02;

      const desplazamiento = 46; // píxeles máximos de parallax
      capa.style.transform = `translate3d(${(-actX * desplazamiento).toFixed(2)}px, ${(
        -actY * desplazamiento
      ).toFixed(2)}px, 0)`;

      // El cursor inclina la marca; el giro base sigue corriendo
      giro.style.transform = `rotate(${(rot + actX * 12).toFixed(2)}deg)`;

      raf = requestAnimationFrame(bucle);
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    raf = requestAnimationFrame(bucle);

    return () => {
      window.removeEventListener("pointermove", onMove);
      cancelAnimationFrame(raf);
    };
  }, []);

  // Geometría de los anillos
  const R_EXT = 300;
  const R_MED = 232;
  const R_INT = 168;
  const circ = 2 * Math.PI * R_EXT;
  const avance = Math.min(Math.max(progreso, 0), 100) / 100;

  // Marcas de tick cada 15° en el anillo intermedio
  const ticks = Array.from({ length: 24 }, (_, i) => i * 15);

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10 flex items-center justify-center overflow-hidden"
    >
      <div ref={capaRef} className="will-change-transform">
        <svg
          viewBox="-320 -320 640 640"
          className="h-[min(150vh,150vw)] w-[min(150vh,150vw)]"
          fill="none"
        >
          <g ref={giroRef} style={{ transformOrigin: "center", transformBox: "view-box" }}>
            {/* Anillo exterior: canal + arco de progreso real */}
            <circle r={R_EXT} stroke="var(--fg)" strokeWidth="1" opacity="0.05" />
            <circle
              r={R_EXT}
              stroke="var(--accent)"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeDasharray={circ}
              strokeDashoffset={circ * (1 - avance)}
              opacity="0.16"
              transform="rotate(-90)"
              className="anillo-traza"
            />

            {/* Anillo intermedio con ticks: da la sensación de instrumento */}
            <circle r={R_MED} stroke="var(--fg)" strokeWidth="1" opacity="0.045" />
            {ticks.map((a) => (
              <line
                key={a}
                x1="0"
                y1={-R_MED}
                x2="0"
                y2={-(R_MED - (a % 90 === 0 ? 16 : 8))}
                stroke="var(--fg)"
                strokeWidth={a % 90 === 0 ? 1.6 : 1}
                opacity={a % 90 === 0 ? 0.1 : 0.055}
                transform={`rotate(${a})`}
              />
            ))}

            {/* Anillo interior, en sentido contrario visualmente por su trazo discontinuo */}
            <circle
              r={R_INT}
              stroke="var(--fg)"
              strokeWidth="1"
              opacity="0.05"
              strokeDasharray="3 14"
            />

            {/* Cruz de centro */}
            <line x1="-14" y1="0" x2="14" y2="0" stroke="var(--accent)" strokeWidth="1" opacity="0.16" />
            <line x1="0" y1="-14" x2="0" y2="14" stroke="var(--accent)" strokeWidth="1" opacity="0.16" />
          </g>
        </svg>
      </div>
    </div>
  );
}
