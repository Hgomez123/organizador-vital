/**
 * SECCIÓN
 * Cabecera narrativa: etiqueta entre paréntesis, título grande y una
 * frase que explica qué hace este bloque. Una idea por sección —
 * el lector siempre sabe dónde está y para qué sirve lo que ve.
 */

type Props = {
  etiqueta: string;
  titulo: string;
  lede?: string;
  children: React.ReactNode;
};

export function Seccion({ etiqueta, titulo, lede, children }: Props) {
  return (
    <section className="space-y-6">
      <header className="max-w-lg">
        <p className="mono text-[length:var(--t-xs)] tracking-[0.25em] text-accent">
          ( {etiqueta} )
        </p>
        <h2 className="mt-2 text-[length:var(--t-xl)] font-bold uppercase leading-[var(--lh-tight)] tracking-tight">
          {titulo}
        </h2>
        {lede && (
          <p className="mt-3 text-[length:var(--t-sm)] leading-relaxed text-muted">{lede}</p>
        )}
      </header>
      <div className="space-y-6">{children}</div>
    </section>
  );
}
