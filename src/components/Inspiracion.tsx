"use client";

import { useState } from "react";
import type { Principio } from "@/lib/principios";

type PrincipioPlano = Omit<Principio, "cuando">;

export function Inspiracion({ items }: { items: PrincipioPlano[] }) {
  const [activo, setActivo] = useState(0);
  const p = items[activo];
  if (!p) return null;

  return (
    <section className="panel overflow-hidden">
      <div className="panel-head">
        <div>
          <h3 className="panel-title">Principio</h3>
          <p className="label mt-0.5">Elegido según tus datos de hoy</p>
        </div>
        <div className="flex gap-1.5" role="tablist" aria-label="Principios">
          {items.map((item, i) => (
            <button
              key={item.id}
              role="tab"
              aria-selected={i === activo}
              aria-label={`Principio ${i + 1}: ${item.titulo}`}
              onClick={() => setActivo(i)}
              className={`h-1.5 transition-all duration-[var(--dur-base)] ${
                i === activo ? "w-6 bg-accent" : "w-1.5 bg-line hover:bg-muted"
              }`}
            />
          ))}
        </div>
      </div>

      <div key={p.id} className="fade-up panel-body">
        <span className="mono text-[length:var(--t-micro)] tracking-[0.3em] text-accent">
          {p.numero}
        </span>

        <h3 className="mt-2 text-[clamp(1.5rem,5vw,2.25rem)] font-bold uppercase leading-[1.05] tracking-tight">
          {p.titulo}
        </h3>

        <p className="cuerpo mt-4">{p.cuerpo}</p>

        <div className="subpanel mt-5 border-l-2 border-l-accent p-4">
          <p className="label text-accent">Hazlo hoy</p>
          <p className="mt-1 text-[length:var(--t-sm)] leading-relaxed">{p.aplicacion}</p>
        </div>

        {p.fuente && (
          <a
            href={p.fuente.url}
            target="_blank"
            rel="noopener noreferrer"
            className="label group mt-5 inline-flex items-center gap-2 transition-colors hover:text-accent"
          >
            Profundizar: {p.fuente.texto}
            <span aria-hidden className="transition-transform duration-[var(--dur-base)] group-hover:translate-x-1">
              ↗
            </span>
          </a>
        )}
      </div>

      <div className="flex border-t border-line">
        <button
          onClick={() => setActivo((a) => (a - 1 + items.length) % items.length)}
          className="label flex-1 border-r border-line py-3 transition-colors hover:bg-accent hover:text-bg"
        >
          ← Anterior
        </button>
        <button
          onClick={() => setActivo((a) => (a + 1) % items.length)}
          className="label flex-1 py-3 transition-colors hover:bg-accent hover:text-bg"
        >
          Siguiente →
        </button>
      </div>
    </section>
  );
}
