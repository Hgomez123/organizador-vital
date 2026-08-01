"use client";

import { Anillo } from "./Anillo";
import { Constancia } from "./Constancia";
import type { MetaResumen } from "@/lib/metas";

const DOMINIO_LABEL: Record<string, string> = {
  COMIDAS: "Comidas",
  LIMPIEZA: "Limpieza",
  ESTUDIO: "Estudio",
  TIEMPO_LIBRE: "Tiempo libre",
  GENERAL: "General",
};

export function MetaCard({ meta }: { meta: MetaResumen }) {
  const d = meta.desafio;
  const avanceDesafio = d ? (d.diasTranscurridos / d.duracionDias) * 100 : 0;

  return (
    <article className="panel">
      <div className="panel-head">
        <div className="min-w-0">
          <h3 className="panel-title truncate">{meta.titulo}</h3>
          <p className="label mt-0.5">
            {DOMINIO_LABEL[meta.dominio] ?? meta.dominio} · {meta.valorObjetivo} {meta.metrica}
          </p>
        </div>
        <span className="label shrink-0">
          {meta.totalTareas} {meta.totalTareas === 1 ? "tarea" : "tareas"}
        </span>
      </div>

      <div className="panel-body space-y-6">
        {/* Progreso y racha */}
        <div className="flex flex-wrap items-center gap-6">
          <Anillo
            tam={104}
            trazas={[
              { nombre: "Cumplimiento", valor: meta.progreso, color: "var(--accent)" },
              ...(d
                ? [
                    {
                      nombre: "Avance del desafío",
                      valor: avanceDesafio,
                      color: "var(--accent-2)",
                      grosor: 6,
                    },
                  ]
                : []),
            ]}
          >
            <span className="text-xl font-bold tabular-nums leading-none">
              {meta.progreso}
              <span className="text-xs text-accent">%</span>
            </span>
            <span className="label mt-0.5">cumplido</span>
          </Anillo>

          <div className="min-w-0 flex-1 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="subpanel p-3">
                <p className="label">Racha actual</p>
                <p className="mt-1 text-2xl font-bold tabular-nums leading-none">
                  {d?.rachaActual ?? 0}
                  <span className="text-sm text-accent">d</span>
                </p>
              </div>
              <div className="subpanel p-3">
                <p className="label">Mejor racha</p>
                <p className="mt-1 text-2xl font-bold tabular-nums leading-none text-muted">
                  {d?.rachaMaxima ?? 0}
                  <span className="text-sm">d</span>
                </p>
              </div>
            </div>
            <p className="label">
              {meta.hechas} de {meta.aplicables} oportunidades en 28 días
            </p>
          </div>
        </div>

        {/* Desafío */}
        {d && (
          <div className="subpanel p-4">
            <div className="flex items-baseline justify-between gap-3">
              <p className="text-[length:var(--t-sm)] font-semibold text-fg">{d.titulo}</p>
              <span className="label shrink-0 text-accent-2">
                día {d.diasTranscurridos}/{d.duracionDias}
              </span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-line">
              <div
                className="h-full rounded-full bg-accent-2 transition-all duration-[var(--dur-slow)] ease-[var(--ease-spring)]"
                style={{ width: `${Math.min(avanceDesafio, 100)}%` }}
              />
            </div>
            <p className="cuerpo mt-3">
              {d.rachaActual === 0
                ? "La racha está en cero. Hoy no busques el día perfecto: cumple la versión mínima y vuelve a arrancar el contador."
                : d.rachaActual >= d.duracionDias
                  ? "Desafío completado. Cuando algo deja de costar, deja de entrenar: es momento de subir la exigencia."
                  : `Llevas ${d.rachaActual} ${d.rachaActual === 1 ? "día" : "días"} seguidos. Te faltan ${Math.max(d.duracionDias - d.rachaActual, 0)} para cerrarlo.`}
            </p>
          </div>
        )}

        {/* Constancia */}
        <div>
          <p className="label mb-2">Constancia · últimos 28 días</p>
          <Constancia dias={meta.constancia} />
        </div>
      </div>
    </article>
  );
}
