"use client";

import { useState, useTransition } from "react";
import { asignarComida, copiarSemanaAnterior, vaciarSemana } from "@/app/comidas/actions";
import { DIAS_SEMANA, TIPOS, TIPO_LABEL, type CasillaMenu, type TipoComidaKey } from "@/lib/comidas";

type Receta = { id: string; nombre: string; minutos: number | null };

type Props = {
  semanaISO: string;
  casillas: CasillaMenu[];
  recetas: Receta[];
  /** Etiqueta legible del rango de la semana */
  rango: string;
};

export function MenuSemanal({ semanaISO, casillas, recetas, rango }: Props) {
  const [editando, setEditando] = useState<string | null>(null);
  const [pendiente, startTransition] = useTransition();

  const buscar = (dia: number, tipo: TipoComidaKey) =>
    casillas.find((c) => c.dia === dia && c.tipo === tipo);

  const asignar = (dia: number, tipo: TipoComidaKey, recipeId: string | null) => {
    setEditando(null);
    startTransition(() => asignarComida(semanaISO, dia, tipo, recipeId));
  };

  const llenas = casillas.filter((c) => c.nombre).length;

  return (
    <section className={`panel ${pendiente ? "opacity-60" : ""}`}>
      <div className="panel-head">
        <div>
          <h3 className="panel-title">Menú de la semana</h3>
          <p className="label mt-0.5">
            {rango} · {llenas}/21 comidas planeadas
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <button
            onClick={() => startTransition(() => copiarSemanaAnterior(semanaISO))}
            className="label rounded-full border border-line px-3 py-1.5 transition-colors hover:border-accent hover:text-accent"
          >
            Copiar anterior
          </button>
          {llenas > 0 && (
            <button
              onClick={() => startTransition(() => vaciarSemana(semanaISO))}
              className="label rounded-full border border-line px-3 py-1.5 transition-colors hover:border-alert hover:text-alert"
            >
              Vaciar
            </button>
          )}
        </div>
      </div>

      {recetas.length === 0 ? (
        <div className="panel-body">
          <p className="cuerpo text-center">
            Primero crea alguna receta abajo. Después podrás asignarla a cualquier comida de la
            semana con un clic.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr>
                <th className="label sticky left-0 z-10 bg-s1 px-4 py-3">Día</th>
                {TIPOS.map((t) => (
                  <th key={t} className="label min-w-[9rem] px-3 py-3">
                    {TIPO_LABEL[t]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {DIAS_SEMANA.map((d) => (
                <tr key={d.n} className="border-t border-line">
                  <th
                    scope="row"
                    className="sticky left-0 z-10 bg-s1 px-4 py-2 text-[length:var(--t-sm)] font-semibold"
                  >
                    <span className="hidden sm:inline">{d.largo}</span>
                    <span className="sm:hidden">{d.corto}</span>
                  </th>

                  {TIPOS.map((tipo) => {
                    const casilla = buscar(d.n, tipo);
                    const clave = `${d.n}-${tipo}`;
                    const abierto = editando === clave;

                    return (
                      <td key={tipo} className="px-2 py-2 align-top">
                        {abierto ? (
                          <div className="subpanel space-y-1 p-2">
                            {casilla?.recipeId && (
                              <button
                                onClick={() => asignar(d.n, tipo, null)}
                                className="label w-full rounded px-2 py-1.5 text-left text-alert transition-colors hover:bg-s3"
                              >
                                Quitar
                              </button>
                            )}
                            {recetas.map((r) => (
                              <button
                                key={r.id}
                                onClick={() => asignar(d.n, tipo, r.id)}
                                className="w-full rounded px-2 py-1.5 text-left text-[length:var(--t-xs)] transition-colors hover:bg-accent hover:text-bg"
                              >
                                {r.nombre}
                              </button>
                            ))}
                            <button
                              onClick={() => setEditando(null)}
                              className="label w-full rounded px-2 py-1.5 text-left transition-colors hover:bg-s3"
                            >
                              Cancelar
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setEditando(clave)}
                            aria-label={`${TIPO_LABEL[tipo]} del ${d.largo}: ${casilla?.nombre ?? "sin asignar"}`}
                            className={`w-full rounded-[var(--r-sm)] border px-3 py-2.5 text-left text-[length:var(--t-xs)] transition-all duration-[var(--dur-base)] ease-[var(--ease-spring)] active:scale-95 ${
                              casilla?.nombre
                                ? "border-line bg-s2 text-fg hover:border-accent"
                                : "border-dashed border-line text-muted hover:border-accent hover:text-accent"
                            }`}
                          >
                            {casilla?.nombre ?? "+ añadir"}
                          </button>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
