"use client";

import { useEffect, useRef, useState } from "react";

/**
 * REVELAR
 * Muestra su contenido cuando entra en el viewport, no al cargar la página.
 * Cada sección aparece cuando el usuario llega a ella: el scroll se vuelve narrativo.
 */

type Props = {
  children: React.ReactNode;
  /** Retraso en ms — usar valores distintos entre hermanos para evitar sincronía */
  retraso?: number;
  className?: string;
};

export function Revelar({ children, retraso = 0, className = "" }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const nodo = ref.current;
    if (!nodo) return;

    // Sin soporte: mostrar de inmediato antes que dejar la página en blanco
    if (typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }

    const obs = new IntersectionObserver(
      ([entrada]) => {
        if (entrada.isIntersecting) {
          setVisible(true);
          obs.disconnect(); // se revela una sola vez
        }
      },
      // threshold 0: basta con que asome un píxel.
      // Con un umbral porcentual, una sección más alta que la pantalla
      // nunca alcanzaba el mínimo y se quedaba invisible para siempre.
      { threshold: 0, rootMargin: "0px 0px -40px 0px" }
    );
    obs.observe(nodo);

    // Red de seguridad: si algo impide que el observador dispare,
    // el contenido aparece igual. Nunca dejar la app inutilizable.
    const rescate = setTimeout(() => setVisible(true), 2500);

    return () => {
      obs.disconnect();
      clearTimeout(rescate);
    };
  }, []);

  return (
    <div
      ref={ref}
      className={`revelar ${visible ? "visible" : ""} ${className}`}
      style={{ transitionDelay: visible ? `${retraso}ms` : "0ms" }}
    >
      {children}
    </div>
  );
}
