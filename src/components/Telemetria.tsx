"use client";

import { useEffect, useState } from "react";
import { NumeroRodante } from "./Digito";

/**
 * TELEMETRÍA
 * Datos vivos del entorno como ornamento funcional: hora local, tamaño
 * de la ventana y fotogramas por segundo.
 *
 * En una app sobre organizar el tiempo, mostrar la hora corriendo no es
 * decoración gratuita: recuerda que el recurso se está gastando ahora mismo.
 */

export function Telemetria() {
  const [hora, setHora] = useState<{ h: number; m: number; s: number } | null>(null);
  const [dim, setDim] = useState<{ w: number; h: number } | null>(null);
  const [fps, setFps] = useState(0);
  const [zona, setZona] = useState("");

  // Reloj
  useEffect(() => {
    const tick = () => {
      const d = new Date();
      setHora({ h: d.getHours(), m: d.getMinutes(), s: d.getSeconds() });
    };
    tick();
    const id = setInterval(tick, 1000);
    setZona(Intl.DateTimeFormat().resolvedOptions().timeZone.split("/").pop() ?? "");
    return () => clearInterval(id);
  }, []);

  // Dimensiones de la ventana
  useEffect(() => {
    const medir = () => setDim({ w: window.innerWidth, h: window.innerHeight });
    medir();
    window.addEventListener("resize", medir);
    return () => window.removeEventListener("resize", medir);
  }, []);

  // Fotogramas por segundo, promediados cada segundo
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let cuadros = 0;
    let ultimo = performance.now();
    let raf = 0;
    const contar = (ahora: number) => {
      cuadros++;
      if (ahora - ultimo >= 1000) {
        setFps(Math.round((cuadros * 1000) / (ahora - ultimo)));
        cuadros = 0;
        ultimo = ahora;
      }
      raf = requestAnimationFrame(contar);
    };
    raf = requestAnimationFrame(contar);
    return () => cancelAnimationFrame(raf);
  }, []);

  // Hasta que el cliente monte, no hay datos: evita desajuste con el servidor
  if (!hora || !dim) {
    return <div className="h-[74px]" aria-hidden />;
  }

  return (
    <section className="grid grid-cols-2 gap-px overflow-hidden rounded-[var(--r-md)] border border-line bg-line sm:grid-cols-3">
      {/* Hora local */}
      <div className="bg-s1 px-4 py-3">
        <p className="label">Hora local {zona && `· ${zona}`}</p>
        <p className="mono mt-1 text-[length:var(--t-lg)] font-bold leading-none">
          <NumeroRodante valor={hora.h} ancho={2} etiqueta="Horas" />
          <span className="text-accent">:</span>
          <NumeroRodante valor={hora.m} ancho={2} etiqueta="Minutos" />
          <span className="text-muted">:</span>
          <span className="text-muted">
            <NumeroRodante valor={hora.s} ancho={2} etiqueta="Segundos" />
          </span>
        </p>
      </div>

      {/* Viewport */}
      <div className="bg-s1 px-4 py-3">
        <p className="label">Viewport</p>
        <p className="mono mt-1 text-[length:var(--t-lg)] font-bold leading-none">
          <NumeroRodante valor={dim.w} ancho={4} etiqueta="Ancho" />
          <span className="text-accent">×</span>
          <NumeroRodante valor={dim.h} ancho={4} etiqueta="Alto" />
        </p>
      </div>

      {/* FPS */}
      <div className="col-span-2 bg-s1 px-4 py-3 sm:col-span-1">
        <p className="label">Render ↳ fps</p>
        <p className="mono mt-1 text-[length:var(--t-lg)] font-bold leading-none">
          <NumeroRodante valor={fps} ancho={3} etiqueta="Fotogramas por segundo" />
          <span className={`ml-1 text-[length:var(--t-xs)] ${fps >= 50 ? "text-accent" : "text-alert"}`}>
            °
          </span>
        </p>
      </div>
    </section>
  );
}
