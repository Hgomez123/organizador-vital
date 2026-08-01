"use client";

import { useState } from "react";
import { CATEGORIAS, type ItemCompra } from "@/lib/comidas";
import { Vacio } from "./Vacio";

/**
 * LISTA DE COMPRAS
 * Se deriva del menú, no se guarda: si cambias una comida, la lista cambia sola.
 * El marcado de "ya lo tengo" vive solo en la sesión — es un apoyo para el
 * supermercado, no un dato que valga la pena persistir.
 */

export function ListaCompras({ items }: { items: ItemCompra[] }) {
  const [tomados, setTomados] = useState<string[]>([]);

  const alternar = (clave: string) =>
    setTomados((t) => (t.includes(clave) ? t.filter((x) => x !== clave) : [...t, clave]));

  const porCategoria = CATEGORIAS.map((cat) => ({
    cat,
    items: items.filter((i) => i.categoria === cat),
  })).filter((g) => g.items.length);

  const restantes = items.length - tomados.length;

  const copiar = () => {
    const texto = porCategoria
      .map(
        (g) =>
          `${g.cat.toUpperCase()}\n` +
          g.items.map((i) => `- ${i.ingrediente}${i.veces > 1 ? ` (×${i.veces})` : ""}`).join("\n")
      )
      .join("\n\n");
    navigator.clipboard?.writeText(texto);
  };

  return (
    <section className="panel">
      <div className="panel-head">
        <div>
          <h3 className="panel-title">Lista de compras</h3>
          <p className="label mt-0.5">Generada desde el menú de esta semana</p>
        </div>
        {items.length > 0 && (
          <div className="flex shrink-0 items-center gap-3">
            <span className="label">{restantes} por llevar</span>
            <button
              onClick={copiar}
              className="label rounded-full border border-line px-3 py-1.5 transition-colors hover:border-accent hover:text-accent"
            >
              Copiar
            </button>
          </div>
        )}
      </div>

      {items.length === 0 ? (
        <div className="panel-body">
          <Vacio
            titulo="Nada que comprar todavía"
            detalle="Asigna recetas al menú de arriba y aquí aparecerán sus ingredientes, agrupados por sección del supermercado y sin repetidos."
          />
        </div>
      ) : (
        <div className="panel-body space-y-6">
          {porCategoria.map((g) => (
            <div key={g.cat}>
              <p className="label mb-2 border-b border-line pb-1.5">{g.cat}</p>
              <ul className="space-y-1">
                {g.items.map((i) => {
                  const clave = `${i.categoria}::${i.ingrediente}`;
                  const tomado = tomados.includes(clave);
                  return (
                    <li key={clave}>
                      <button
                        onClick={() => alternar(clave)}
                        aria-pressed={tomado}
                        className="flex w-full items-center gap-3 rounded-[var(--r-sm)] px-2 py-2 text-left transition-colors duration-[var(--dur-base)] hover:bg-s2"
                      >
                        <span
                          aria-hidden
                          className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border text-[9px] transition-all duration-[var(--dur-base)] ease-[var(--ease-spring)] ${
                            tomado ? "border-accent bg-accent text-bg" : "border-muted"
                          }`}
                        >
                          {tomado && "✓"}
                        </span>
                        <span
                          className={`flex-1 text-[length:var(--t-sm)] ${
                            tomado ? "text-muted line-through" : "text-fg"
                          }`}
                        >
                          {i.ingrediente}
                        </span>
                        {i.veces > 1 && <span className="label shrink-0">×{i.veces}</span>}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
