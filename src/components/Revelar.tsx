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

    const obs = new IntersectionObserver(
      ([entrada]) => {
        if (entrada.isIntersecting) {
          setVisible(true);
          obs.disconnect(); // se revela una sola vez
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -60px 0px" }
    );
    obs.observe(nodo);
    return () => obs.disconnect();
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
