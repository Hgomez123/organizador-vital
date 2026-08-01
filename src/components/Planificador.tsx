"use client";

import { useState, useTransition } from "react";
import { generarPlan, aplicarPlan } from "@/app/actions";
import type { PlanGenerado } from "@/lib/ai";

const DIA_CORTO = ["D", "L", "M", "X", "J", "V", "S"];

const EJEMPLOS = [
  "Quiero estudiar más y dejar de pedir domicilios",
  "Mi casa es un desastre y no descanso nunca",
  "Necesito preparar una certificación en 2 meses",
];

export function Planificador() {
  const [abierto, setAbierto] = useState(false);
  const [intencion, setIntencion] = useState("");
  const [plan, setPlan] = useState<(PlanGenerado & { fuente: "ia" | "local" }) | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aplicando, startAplicar] = useTransition();

  const generar = async () => {
    if (!intencion.trim()) return;
    setCargando(true);
    setPlan(null);
    setError(null);
    try {
      setPlan(await generarPlan(intencion));
    } catch {
      setError("No pude generar el plan. Revisa tu conexión e inténtalo otra vez.");
    } finally {
      setCargando(false);
    }
  };

  const confirmar = () => {
    if (!plan) return;
    startAplicar(async () => {
      await aplicarPlan(plan);
      setPlan(null);
      setIntencion("");
      setAbierto(false);
    });
  };

  if (!abierto) {
    return (
      <button
        onClick={() => setAbierto(true)}
        className="group relative w-full overflow-hidden rounded-[var(--r-md)] border border-accent bg-s1 px-5 py-5 text-left transition-transform duration-[var(--dur-fast)] ease-[var(--ease-spring)] active:scale-[0.99]"
      >
        <span
          aria-hidden
          className="absolute inset-0 -translate-x-full bg-accent transition-transform duration-[var(--dur-slow)] ease-[var(--ease-out)] group-hover:translate-x-0"
        />
        <span className="relative flex items-center justify-between gap-4">
          <span>
            <span className="panel-title block transition-colors duration-[var(--dur-base)] group-hover:text-bg">
              Describe tu vida ideal
            </span>
            <span className="mt-1 block text-[length:var(--t-sm)] text-muted transition-colors duration-[var(--dur-base)] group-hover:text-bg/70">
              Escribe en una frase qué quieres cambiar. Recibes un plan ejecutable.
            </span>
          </span>
          <span
            aria-hidden
            className="text-2xl text-accent transition-all duration-[var(--dur-base)] group-hover:translate-x-1 group-hover:text-bg"
          >
            →
          </span>
        </span>
      </button>
    );
  }

  return (
    <section className="panel border-accent">
      <div className="panel-head">
        <div>
          <h3 className="panel-title">Planificador</h3>
          <p className="label mt-0.5">De una frase a un plan ejecutable</p>
        </div>
        <button
          onClick={() => {
            setAbierto(false);
            setPlan(null);
          }}
          className="label transition-colors hover:text-fg"
        >
          Cerrar ✕
        </button>
      </div>

      <div className="panel-body space-y-4">
        <label className="sr-only" htmlFor="intencion">
          Describe qué quieres cambiar
        </label>
        <textarea
          id="intencion"
          value={intencion}
          onChange={(e) => setIntencion(e.target.value)}
          placeholder="Ej: quiero estudiar más y cocinar en casa entre semana"
          rows={3}
          className="field resize-none text-[length:var(--t-sm)]"
        />

        {!plan && (
          <div className="flex flex-wrap gap-2">
            {EJEMPLOS.map((e) => (
              <button
                key={e}
                onClick={() => setIntencion(e)}
                className="label rounded-full border border-line px-3 py-1.5 transition-all duration-[var(--dur-fast)] ease-[var(--ease-spring)] hover:border-accent hover:text-accent active:scale-95"
              >
                {e}
              </button>
            ))}
          </div>
        )}

        <button
          onClick={generar}
          disabled={cargando || !intencion.trim()}
          className="btn btn-primary w-full"
        >
          {cargando ? "Diseñando el plan…" : "Generar plan →"}
        </button>

        {/* Estado de carga */}
        {cargando && (
          <div className="space-y-2" aria-live="polite" aria-label="Generando plan">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="h-10 animate-pulse border border-line"
                style={{ animationDelay: `${i * 120}ms` }}
              />
            ))}
          </div>
        )}

        {/* Estado de error */}
        {error && (
          <p className="border-l-2 border-alert py-2 pl-3 text-[length:var(--t-sm)] text-alert">
            {error}
          </p>
        )}

        {/* Resultado */}
        {plan && (
          <div className="fade-up space-y-4 border-t border-line pt-4">
            <div>
              <p className="label text-accent">Meta propuesta</p>
              <p className="mt-1 text-[length:var(--t-lg)] font-bold uppercase leading-tight tracking-tight">
                {plan.meta.titulo}
              </p>
              <p className="text-[length:var(--t-xs)] text-muted">
                {plan.meta.valorObjetivo} {plan.meta.metrica} · desafío de 21 días
              </p>
            </div>

            <ul className="divide-y divide-line border-y border-line">
              {plan.tareas.map((t, i) => (
                <li key={i} className="flex items-center gap-3 py-3">
                  <span className="label text-accent">{String(i + 1).padStart(2, "0")}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[length:var(--t-sm)] font-medium uppercase tracking-tight">
                      {t.titulo}
                    </p>
                    <p className="label">
                      {t.recurrencia === "DIARIA"
                        ? "Todos los días"
                        : t.diasSemana.map((d) => DIA_CORTO[d]).join(" · ")}{" "}
                      — {t.duracionMin}′
                    </p>
                  </div>
                </li>
              ))}
            </ul>

            <p className="text-[length:var(--t-sm)] leading-relaxed text-muted">
              {plan.razonamiento}
            </p>

            <div className="flex gap-3">
              <button onClick={confirmar} disabled={aplicando} className="btn btn-primary flex-1">
                {aplicando ? "Aplicando…" : "Añadir a mi plan"}
              </button>
              <button onClick={generar} className="btn btn-ghost">
                Otro
              </button>
            </div>

            <p className="label">
              {plan.fuente === "ia"
                ? "◆ Generado por agente IA"
                : "◆ Motor local · añade ANTHROPIC_API_KEY al .env para planes personalizados"}
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
