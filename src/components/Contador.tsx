"use client";

import { useEffect, useRef, useState } from "react";

/**
 * CONTADOR
 * El número asciende hasta su valor al entrar en pantalla.
 * Un dato que aparece de golpe se lee; uno que asciende se mira.
 */

type Props = {
  valor: number;
  decimales?: number;
  duracion?: number;
  className?: string;
};

export function Contador({ valor, decimales = 0, duracion = 1100, className }: Props) {
  const [actual, setActual] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const yaCorrio = useRef(false);

  useEffect(() => {
    const nodo = ref.current;
    if (!nodo) return;

    // Respeta la preferencia de movimiento reducido
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setActual(valor);
      return;
    }

    const animar = () => {
      const inicio = performance.now();
      const paso = (ahora: number) => {
        const p = Math.min((ahora - inicio) / duracion, 1);
        const eased = 1 - Math.pow(1 - p, 3);
        setActual(valor * eased);
        if (p < 1) requestAnimationFrame(paso);
      };
      requestAnimationFrame(paso);
    };

    if (typeof IntersectionObserver === "undefined") {
      setActual(valor);
      return;
    }

    const obs = new IntersectionObserver(
      ([entrada]) => {
        if (entrada.isIntersecting && !yaCorrio.current) {
          yaCorrio.current = true;
          animar();
        }
      },
      { threshold: 0 }
    );
    obs.observe(nodo);

    // Si el observador no dispara, mostrar el número igual:
    // un indicador congelado en cero miente sobre tus datos.
    const rescate = setTimeout(() => {
      if (!yaCorrio.current) {
        yaCorrio.current = true;
        setActual(valor);
      }
    }, 2500);

    return () => {
      obs.disconnect();
      clearTimeout(rescate);
    };
  }, [valor, duracion]);

  return (
    <span ref={ref} className={className}>
      {actual.toFixed(decimales)}
    </span>
  );
}
