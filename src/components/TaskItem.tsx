"use client";

import { useTransition } from "react";
import { marcarTarea, desmarcarTarea } from "@/app/actions";

type Props = {
  id: string;
  index: number;
  titulo: string;
  duracionMin: number | null;
  estado: "HECHO" | "SALTADO" | "POSPUESTO" | null;
};

export function TaskItem({ id, index, titulo, duracionMin, estado }: Props) {
  const [pending, startTransition] = useTransition();
  const hecho = estado === "HECHO";
  const saltada = estado === "SALTADO";

  return (
    <li
      className={`group flex items-center gap-4 bg-s1 px-4 py-4 transition-all duration-[var(--dur-base)] ease-[var(--ease-out)] hover:bg-accent hover:pl-6 ${
        pending ? "opacity-40" : ""
      }`}
    >
      <span className="label w-6 shrink-0 group-hover:text-bg/60">
        {String(index + 1).padStart(2, "0")}
      </span>

      <button
        aria-label={hecho ? `Desmarcar ${titulo}` : `Marcar ${titulo} como hecha`}
        aria-pressed={hecho}
        onClick={() =>
          startTransition(() => (hecho ? desmarcarTarea(id) : marcarTarea(id, "HECHO")))
        }
        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[length:var(--t-micro)] transition-all duration-[var(--dur-base)] ease-[var(--ease-spring)] active:scale-90 ${
          hecho
            ? "scale-100 border-accent bg-accent text-bg group-hover:border-bg group-hover:bg-bg group-hover:text-accent"
            : "border-muted group-hover:border-bg"
        }`}
      >
        {hecho && <span className="brinco">✓</span>}
      </button>

      <div className="min-w-0 flex-1">
        <p
          className={`truncate text-[length:var(--t-base)] font-medium transition-colors duration-[var(--dur-base)] group-hover:text-bg ${
            hecho ? "text-muted line-through" : "text-fg"
          }`}
        >
          {titulo}
        </p>
      </div>

      {duracionMin && (
        <span className="label shrink-0 group-hover:text-bg/60">{duracionMin}′</span>
      )}

      {!hecho && (
        <button
          onClick={() => startTransition(() => marcarTarea(id, "SALTADO"))}
          aria-label={`Saltar ${titulo}`}
          className={`label shrink-0 transition-colors duration-[var(--dur-base)] ${
            saltada ? "text-alert" : "hover:underline group-hover:text-bg"
          }`}
        >
          {saltada ? "Saltada" : "Saltar"}
        </button>
      )}
    </li>
  );
}
