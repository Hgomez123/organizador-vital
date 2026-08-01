/**
 * METAS Y DESAFÍOS
 * Calcula el progreso real de cada meta a partir de los registros,
 * y la racha de cada desafío. Nada se guarda precalculado: la verdad
 * vive en los TaskLog y aquí se deriva.
 */

import { prisma } from "./prisma";

export type DiaConstancia = {
  fecha: Date;
  /** null = no aplicaba ninguna tarea ese día */
  tasa: number | null;
};

export type MetaResumen = {
  id: string;
  titulo: string;
  dominio: string;
  metrica: string;
  valorObjetivo: number;
  /** Cumplimiento real de las tareas ligadas a esta meta, 0–100 */
  progreso: number;
  totalTareas: number;
  /** Oportunidades y aciertos en la ventana analizada */
  aplicables: number;
  hechas: number;
  desafio: {
    id: string;
    titulo: string;
    duracionDias: number;
    rachaActual: number;
    rachaMaxima: number;
    diasTranscurridos: number;
  } | null;
  constancia: DiaConstancia[];
};

function fechaUTC(offsetDias: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - offsetDias);
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
}

function aplicaEnFecha(t: { recurrencia: string; diasSemana: number[] }, f: Date): boolean {
  if (t.recurrencia === "DIARIA") return true;
  if (t.recurrencia === "SEMANAL") return t.diasSemana.includes(f.getUTCDay());
  return false;
}

export async function resumenMetas(userId: string, ventana = 28): Promise<MetaResumen[]> {
  const desde = fechaUTC(ventana - 1);

  const metas = await prisma.goal.findMany({
    where: { userId },
    include: {
      tasks: { where: { activa: true }, include: { logs: { where: { fecha: { gte: desde } } } } },
      challenges: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return metas.map((meta) => {
    let aplicables = 0;
    let hechas = 0;
    const constancia: DiaConstancia[] = [];

    // Recorre la ventana del día más antiguo al de hoy
    for (let i = ventana - 1; i >= 0; i--) {
      const f = fechaUTC(i);
      let aplDia = 0;
      let hechDia = 0;

      for (const t of meta.tasks) {
        if (!aplicaEnFecha(t, f)) continue;
        aplDia++;
        if (t.logs.some((l) => l.fecha.getTime() === f.getTime() && l.estado === "HECHO")) {
          hechDia++;
        }
      }

      aplicables += aplDia;
      hechas += hechDia;
      constancia.push({ fecha: f, tasa: aplDia ? hechDia / aplDia : null });
    }

    const progreso = aplicables ? Math.round((hechas / aplicables) * 100) : 0;

    // Rachas: días consecutivos con al menos el 70% cumplido
    let rachaActual = 0;
    let rachaMaxima = 0;
    let corriendo = 0;
    for (const d of constancia) {
      if (d.tasa === null) continue; // día sin obligaciones no rompe la racha
      if (d.tasa >= 0.7) {
        corriendo++;
        rachaMaxima = Math.max(rachaMaxima, corriendo);
      } else {
        corriendo = 0;
      }
    }
    // La actual se cuenta hacia atrás desde hoy
    for (let i = constancia.length - 1; i >= 0; i--) {
      const d = constancia[i];
      if (d.tasa === null) continue;
      if (d.tasa >= 0.7) rachaActual++;
      else break;
    }

    const des = meta.challenges[0] ?? null;
    const diasTranscurridos = des
      ? Math.min(
          Math.floor((Date.now() - des.iniciadoEn.getTime()) / 86_400_000) + 1,
          des.duracionDias
        )
      : 0;

    return {
      id: meta.id,
      titulo: meta.titulo,
      dominio: meta.dominio,
      metrica: meta.metrica,
      valorObjetivo: meta.valorObjetivo,
      progreso,
      totalTareas: meta.tasks.length,
      aplicables,
      hechas,
      desafio: des
        ? {
            id: des.id,
            titulo: des.titulo,
            duracionDias: des.duracionDias,
            rachaActual,
            rachaMaxima,
            diasTranscurridos,
          }
        : null,
      constancia,
    };
  });
}
