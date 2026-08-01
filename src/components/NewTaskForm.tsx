"use client";

import { useRef, useState } from "react";
import { crearTarea } from "@/app/actions";

const DIAS = [
  { corto: "D", largo: "domingo" },
  { corto: "L", largo: "lunes" },
  { corto: "M", largo: "martes" },
  { corto: "X", largo: "miércoles" },
  { corto: "J", largo: "jueves" },
  { corto: "V", largo: "viernes" },
  { corto: "S", largo: "sábado" },
];

export function NewTaskForm() {
  const [abierto, setAbierto] = useState(false);
  const [recurrencia, setRecurrencia] = useState("DIARIA");
  const formRef = useRef<HTMLFormElement>(null);

  if (!abierto) {
    return (
      <button
        onClick={() => setAbierto(true)}
        className="group flex w-full items-center justify-between rounded-[var(--r-md)] border border-line bg-s1 px-5 py-4 text-left transition-all duration-[var(--dur-base)] ease-[var(--ease-spring)] hover:border-accent hover:bg-s2 active:scale-[0.99]"
      >
        <span>
          <span className="panel-title block">Nueva tarea</span>
          <span className="label mt-0.5 block">Añade algo puntual sin pasar por el plan</span>
        </span>
        <span
          aria-hidden
          className="text-xl text-accent transition-transform duration-[var(--dur-base)] group-hover:rotate-90"
        >
          +
        </span>
      </button>
    );
  }

  return (
    <form
      ref={formRef}
      action={async (fd) => {
        await crearTarea(fd);
        formRef.current?.reset();
        setAbierto(false);
      }}
      className="panel border-accent"
    >
      <div className="panel-head">
        <h3 className="panel-title">Nueva tarea</h3>
        <button
          type="button"
          onClick={() => setAbierto(false)}
          className="label transition-colors hover:text-fg"
        >
          Cerrar ✕
        </button>
      </div>

      <div className="panel-body space-y-4">
        <label className="sr-only" htmlFor="titulo">
          Título de la tarea
        </label>
        <input
          id="titulo"
          name="titulo"
          placeholder="¿QUÉ NECESITAS HACER?"
          autoFocus
          required
          className="w-full border-0 border-b border-line bg-transparent pb-2 text-[length:var(--t-lg)] font-bold uppercase tracking-tight outline-none transition-colors placeholder:text-muted focus:border-accent"
        />

        <div className="flex flex-col gap-3 sm:flex-row">
          <label className="sr-only" htmlFor="dominio">
            Dominio
          </label>
          <select id="dominio" name="dominio" className="field mono flex-1 text-[length:var(--t-xs)] uppercase tracking-wider">
            <option value="GENERAL">General</option>
            <option value="COMIDAS">Comidas</option>
            <option value="LIMPIEZA">Limpieza</option>
            <option value="ESTUDIO">Estudio</option>
            <option value="TIEMPO_LIBRE">Tiempo libre</option>
          </select>

          <label className="sr-only" htmlFor="recurrencia">
            Recurrencia
          </label>
          <select
            id="recurrencia"
            name="recurrencia"
            value={recurrencia}
            onChange={(e) => setRecurrencia(e.target.value)}
            className="field mono flex-1 text-[length:var(--t-xs)] uppercase tracking-wider"
          >
            <option value="DIARIA">Diaria</option>
            <option value="SEMANAL">Semanal</option>
          </select>
        </div>

        {recurrencia === "SEMANAL" && (
          <fieldset className="flex justify-between gap-1">
            <legend className="sr-only">Días de la semana</legend>
            {DIAS.map((d, i) => (
              <label key={i} className="flex-1 cursor-pointer">
                <input
                  type="checkbox"
                  name="dias"
                  value={i}
                  aria-label={d.largo}
                  className="peer sr-only"
                />
                <span className="mono flex h-9 items-center justify-center rounded-full border border-line text-[length:var(--t-xs)] transition-all duration-[var(--dur-fast)] ease-[var(--ease-spring)] peer-checked:scale-105 peer-checked:border-accent peer-checked:bg-accent peer-checked:font-bold peer-checked:text-bg peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-accent">
                  {d.corto}
                </span>
              </label>
            ))}
          </fieldset>
        )}

        <button type="submit" className="btn btn-primary w-full">
          Crear tarea →
        </button>
      </div>
    </form>
  );
}
