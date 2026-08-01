"use client";

import { useRef, useState, useTransition } from "react";
import { crearReceta, borrarReceta } from "@/app/comidas/actions";
import { CATEGORIAS } from "@/lib/comidas";
import { Vacio } from "./Vacio";

type Receta = {
  id: string;
  nombre: string;
  ingredientes: string[];
  categoria: string;
  minutos: number | null;
};

export function Recetario({ recetas }: { recetas: Receta[] }) {
  const [abierto, setAbierto] = useState(false);
  const [pendiente, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <section className="panel">
      <div className="panel-head">
        <div>
          <h3 className="panel-title">Recetario</h3>
          <p className="label mt-0.5">
            {recetas.length} {recetas.length === 1 ? "receta" : "recetas"} · sus ingredientes
            alimentan la lista
          </p>
        </div>
        <button
          onClick={() => setAbierto((a) => !a)}
          className="label shrink-0 rounded-full border border-line px-3 py-1.5 transition-colors hover:border-accent hover:text-accent"
        >
          {abierto ? "Cerrar" : "+ Nueva"}
        </button>
      </div>

      {abierto && (
        <form
          ref={formRef}
          action={async (fd) => {
            await crearReceta(fd);
            formRef.current?.reset();
            setAbierto(false);
          }}
          className="space-y-4 border-b border-line bg-s2 p-5"
        >
          <div>
            <label className="label" htmlFor="rec-nombre">
              Nombre
            </label>
            <input
              id="rec-nombre"
              name="nombre"
              required
              autoFocus
              placeholder="Ej: Pollo al horno con verduras"
              className="field mt-1.5"
            />
          </div>

          <div>
            <label className="label" htmlFor="rec-ing">
              Ingredientes — uno por línea o separados por comas
            </label>
            <textarea
              id="rec-ing"
              name="ingredientes"
              rows={4}
              placeholder={"Pechuga de pollo\nZanahoria\nCebolla\nAceite de oliva"}
              className="field mt-1.5 resize-none text-[length:var(--t-sm)]"
            />
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="flex-1">
              <label className="label" htmlFor="rec-cat">
                Sección del supermercado
              </label>
              <select id="rec-cat" name="categoria" className="field mt-1.5 text-[length:var(--t-sm)]">
                {CATEGORIAS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div className="sm:w-40">
              <label className="label" htmlFor="rec-min">
                Minutos
              </label>
              <input
                id="rec-min"
                name="minutos"
                type="number"
                min={1}
                max={480}
                placeholder="30"
                className="field mt-1.5 text-[length:var(--t-sm)]"
              />
            </div>
          </div>

          <button type="submit" className="btn btn-primary w-full">
            Guardar receta →
          </button>
        </form>
      )}

      {recetas.length === 0 && !abierto ? (
        <div className="panel-body">
          <Vacio
            titulo="Sin recetas guardadas"
            detalle="Una receta es un nombre y sus ingredientes. Con eso basta para armar el menú de la semana y que la lista de compras se genere sola."
          />
        </div>
      ) : (
        <ul className={`divide-y divide-line ${pendiente ? "opacity-60" : ""}`}>
          {recetas.map((r) => (
            <li key={r.id} className="group flex items-start gap-4 px-5 py-4">
              <div className="min-w-0 flex-1">
                <p className="text-[length:var(--t-base)] font-medium">{r.nombre}</p>
                <p className="label mt-0.5">
                  {r.categoria}
                  {r.minutos ? ` · ${r.minutos} min` : ""} · {r.ingredientes.length}{" "}
                  {r.ingredientes.length === 1 ? "ingrediente" : "ingredientes"}
                </p>
                {r.ingredientes.length > 0 && (
                  <p className="cuerpo mt-1.5 line-clamp-2">{r.ingredientes.join(" · ")}</p>
                )}
              </div>
              <button
                onClick={() => startTransition(() => borrarReceta(r.id))}
                aria-label={`Borrar ${r.nombre}`}
                className="label shrink-0 opacity-0 transition-opacity group-hover:opacity-100 hover:text-alert focus-visible:opacity-100"
              >
                Borrar
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
