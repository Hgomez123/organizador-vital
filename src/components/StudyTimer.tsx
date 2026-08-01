"use client";

import { useEffect, useRef, useState } from "react";
import { registrarSesionEstudio } from "@/app/actions";
import { Anillo } from "./Anillo";

const POMODORO_MIN = 25;
const POMODORO_SEG = POMODORO_MIN * 60;
/** Sesión de referencia para el anillo exterior: 4 pomodoros */
const SESION_SEG = POMODORO_SEG * 4;

export function StudyTimer() {
  const [activo, setActivo] = useState(false);
  const [segundos, setSegundos] = useState(0);
  const [materia, setMateria] = useState("");
  const [celebra, setCelebra] = useState(false);
  const inicioRef = useRef<number | null>(null);

  useEffect(() => {
    if (!activo) return;
    const id = setInterval(() => setSegundos((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [activo]);

  // Fin de pomodoro: aviso + celebración visual
  useEffect(() => {
    if (segundos > 0 && segundos % POMODORO_SEG === 0) {
      if (typeof Notification !== "undefined" && Notification.permission === "granted") {
        new Notification("Pomodoro completado", { body: "Toma un descanso de 5 min" });
      }
      setCelebra(true);
      const t = setTimeout(() => setCelebra(false), 450);
      return () => clearTimeout(t);
    }
  }, [segundos]);

  const iniciar = () => {
    if (typeof Notification !== "undefined" && Notification.permission === "default") {
      Notification.requestPermission();
    }
    inicioRef.current = Date.now();
    setActivo(true);
  };

  const terminar = async () => {
    setActivo(false);
    const minutos = Math.round(segundos / 60);
    const pomodoros = Math.floor(segundos / POMODORO_SEG);
    setSegundos(0);
    if (minutos >= 1) await registrarSesionEstudio(materia, minutos, pomodoros);
  };

  const mm = String(Math.floor(segundos / 60)).padStart(2, "0");
  const ss = String(segundos % 60).padStart(2, "0");

  const pomodorosHechos = Math.floor(segundos / POMODORO_SEG);
  const avancePomodoro = ((segundos % POMODORO_SEG) / POMODORO_SEG) * 100;
  const avanceSesion = Math.min((segundos / SESION_SEG) * 100, 100);

  return (
    <section className="panel">
      <div className="panel-head">
        <div>
          <h3 className="panel-title">Temporizador de estudio</h3>
          <p className="label mt-0.5">Pomodoros de {POMODORO_MIN} minutos</p>
        </div>
        {activo && (
          <span className="label flex items-center gap-2 text-accent">
            <span aria-hidden className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent" />
            En sesión
          </span>
        )}
      </div>

      <div className="panel-body flex flex-col items-center gap-6 sm:flex-row sm:items-center">
        {/* Anillos concéntricos: exterior = sesión, interior = pomodoro en curso */}
        <div className={celebra ? "brinco" : ""}>
          <Anillo
            tam={150}
            trazas={[
              { nombre: "Sesión", valor: avanceSesion, color: "var(--accent)", activo },
              {
                nombre: "Pomodoro en curso",
                valor: avancePomodoro,
                color: "var(--accent-2)",
                grosor: 7,
              },
            ]}
          >
            <span
              className="mono text-2xl font-bold tabular-nums leading-none"
              aria-live="polite"
              aria-label={`${mm} minutos ${ss} segundos`}
            >
              {mm}
              <span aria-hidden className={activo ? "blink text-accent" : "text-muted"}>
                :
              </span>
              {ss}
            </span>
            <span className="label mt-1">
              {pomodorosHechos > 0 ? `${pomodorosHechos} pomodoro${pomodorosHechos > 1 ? "s" : ""}` : "listo"}
            </span>
          </Anillo>
        </div>

        <div className="flex w-full flex-1 flex-col gap-3">
          <label className="sr-only" htmlFor="materia">
            Materia
          </label>
          <input
            id="materia"
            value={materia}
            onChange={(e) => setMateria(e.target.value)}
            placeholder="MATERIA"
            disabled={activo}
            className="field mono text-[length:var(--t-sm)] uppercase tracking-wider"
          />
          {activo ? (
            <button
              onClick={terminar}
              className="btn btn-ghost border-fg text-fg hover:bg-fg hover:text-bg"
            >
              Terminar sesión
            </button>
          ) : (
            <button onClick={iniciar} className="btn btn-primary">
              Iniciar
            </button>
          )}
          <p className="label">
            <span className="text-accent">Exterior</span> sesión de 4 ·{" "}
            <span className="text-accent-2">Interior</span> bloque en curso
          </p>
        </div>
      </div>
    </section>
  );
}
