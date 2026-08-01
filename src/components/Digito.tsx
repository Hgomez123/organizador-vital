"use client";

/**
 * DÍGITO ODÓMETRO
 * Una columna con los diez dígitos que se desplaza para mostrar el correcto.
 * El cambio de un número se ve como un giro mecánico, no como un salto.
 */

const ALTURA_EM = 1.15;

export function Digito({ valor }: { valor: number }) {
  const d = Math.min(Math.max(Math.floor(valor), 0), 9);

  return (
    <span
      className="inline-block overflow-hidden align-bottom tabular-nums"
      style={{ height: `${ALTURA_EM}em` }}
      aria-hidden
    >
      <span
        className="flex flex-col transition-transform duration-[var(--dur-slow)] ease-[var(--ease-spring)]"
        style={{ transform: `translateY(-${d * ALTURA_EM}em)` }}
      >
        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
          <span key={n} style={{ height: `${ALTURA_EM}em`, lineHeight: `${ALTURA_EM}em` }}>
            {n}
          </span>
        ))}
      </span>
    </span>
  );
}

/** Renderiza un número completo como columnas de odómetro, con relleno de ceros. */
export function NumeroRodante({
  valor,
  ancho,
  etiqueta,
}: {
  valor: number;
  ancho: number;
  etiqueta: string;
}) {
  const texto = String(Math.floor(valor)).padStart(ancho, "0").slice(-ancho);
  return (
    <span role="text" aria-label={`${etiqueta}: ${valor}`}>
      {texto.split("").map((c, i) => (
        <Digito key={i} valor={Number(c)} />
      ))}
    </span>
  );
}
