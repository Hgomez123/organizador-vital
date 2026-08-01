"use client";

/**
 * FONDO AMBIENTAL
 * Solo dos capas: brillos de color en deriva lenta y una viñeta que
 * enfoca el centro. La capa de iconos flotantes se retiró a propósito:
 * competía con la marca gigante y saturaba la lectura. Cuando el fondo
 * tiene dos protagonistas, no tiene ninguno.
 */

export function Fondo() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      {/* Brillos de profundidad — duraciones y retrasos desfasados */}
      <div
        className="glow-drift absolute -top-40 left-1/4 h-[500px] w-[500px] rounded-full"
        style={{
          background: "radial-gradient(circle, rgba(165,232,205,0.06) 0%, transparent 65%)",
        }}
      />
      <div
        className="glow-drift absolute bottom-[-15%] right-[-10%] h-[600px] w-[600px] rounded-full"
        style={{
          background: "radial-gradient(circle, rgba(199,189,244,0.06) 0%, transparent 65%)",
          animationDelay: "-12s",
        }}
      />
      <div
        className="glow-drift absolute left-[-12%] top-[55%] h-[400px] w-[400px] rounded-full"
        style={{
          background: "radial-gradient(circle, rgba(255,184,163,0.04) 0%, transparent 65%)",
          animationDelay: "-20s",
        }}
      />

      {/* Viñeta: oscurece los bordes para que la marca central domine */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 70% 60% at 50% 40%, transparent 45%, rgba(10,10,10,0.7) 100%)",
        }}
      />
    </div>
  );
}
