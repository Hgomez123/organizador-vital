/**
 * VISTA SEMANAL
 * Reconstruye la semana día a día y dominio a dominio a partir de los
 * registros. Todo se deriva: no hay agregados guardados que puedan mentir.
 */

import { prisma } from "./prisma";
import { DOMINIOS } from "./motor";
import { lunesDe } from "./comidas";

export type CeldaSemana = {
  dia: number; // 0=domingo … 6=sábado
  dominio: string;
  aplicables: number;
  hechas: number;
  /** null = ese día no tocaba nada de ese dominio */
  tasa: number | null;
};

export type ResumenDia = {
  dia: number;
  fecha: Date;
  aplicables: number;
  hechas: number;
  tasa: number | null;
  esHoy: boolean;
  esFuturo: boolean;
};

export type SemanaCompleta = {
  inicio: Date;
  fin: Date;
  celdas: CeldaSemana[];
  dias: ResumenDia[];
  totalAplicables: number;
  totalHechas: number;
  cumplimiento: number;
  minutosEstudio: number;
  mejorDia: ResumenDia | null;
  peorDia: ResumenDia | null;
  /** Comparación con la semana anterior, en puntos porcentuales */
  deltaSemanaPrevia: number | null;
};

function aplicaEnFecha(t: { recurrencia: string; diasSemana: number[] }, f: Date): boolean {
  if (t.recurrencia === "DIARIA") return true;
  if (t.recurrencia === "SEMANAL") return t.diasSemana.includes(f.getUTCDay());
  return false;
}

async function cumplimientoDeSemana(userId: string, inicio: Date): Promise<number | null> {
  const fin = new Date(inicio);
  fin.setUTCDate(fin.getUTCDate() + 7);

  const tasks = await prisma.task.findMany({
    where: { userId, activa: true },
    include: { logs: { where: { fecha: { gte: inicio, lt: fin } } } },
  });

  let apl = 0;
  let hech = 0;
  for (let i = 0; i < 7; i++) {
    const f = new Date(inicio);
    f.setUTCDate(f.getUTCDate() + i);
    if (f.getTime() > Date.now()) continue;
    for (const t of tasks) {
      if (!aplicaEnFecha(t, f)) continue;
      apl++;
      if (t.logs.some((l) => l.fecha.getTime() === f.getTime() && l.estado === "HECHO")) hech++;
    }
  }
  return apl ? Math.round((hech / apl) * 100) : null;
}

export async function analizarSemana(
  userId: string,
  referencia = new Date()
): Promise<SemanaCompleta> {
  const inicio = lunesDe(referencia);
  const fin = new Date(inicio);
  fin.setUTCDate(fin.getUTCDate() + 6);

  const finExcl = new Date(inicio);
  finExcl.setUTCDate(finExcl.getUTCDate() + 7);

  const tasks = await prisma.task.findMany({
    where: { userId, activa: true },
    include: { logs: { where: { fecha: { gte: inicio, lt: finExcl } } } },
  });

  const hoyUTC = new Date();
  const hoyClave = new Date(
    Date.UTC(hoyUTC.getFullYear(), hoyUTC.getMonth(), hoyUTC.getDate())
  ).getTime();

  const celdas: CeldaSemana[] = [];
  const dias: ResumenDia[] = [];

  for (let i = 0; i < 7; i++) {
    const f = new Date(inicio);
    f.setUTCDate(f.getUTCDate() + i);
    const esFuturo = f.getTime() > hoyClave;
    const esHoy = f.getTime() === hoyClave;

    let aplDia = 0;
    let hechDia = 0;

    for (const dom of DOMINIOS) {
      let apl = 0;
      let hech = 0;
      for (const t of tasks) {
        if (t.dominio !== dom) continue;
        if (!aplicaEnFecha(t, f)) continue;
        apl++;
        if (t.logs.some((l) => l.fecha.getTime() === f.getTime() && l.estado === "HECHO")) hech++;
      }
      aplDia += apl;
      hechDia += hech;
      celdas.push({
        dia: f.getUTCDay(),
        dominio: dom,
        aplicables: apl,
        hechas: hech,
        tasa: apl && !esFuturo ? hech / apl : null,
      });
    }

    dias.push({
      dia: f.getUTCDay(),
      fecha: f,
      aplicables: aplDia,
      hechas: hechDia,
      tasa: aplDia && !esFuturo ? hechDia / aplDia : null,
      esHoy,
      esFuturo,
    });
  }

  const conDatos = dias.filter((d) => d.tasa !== null);
  const totalAplicables = conDatos.reduce((a, d) => a + d.aplicables, 0);
  const totalHechas = conDatos.reduce((a, d) => a + d.hechas, 0);

  const sesiones = await prisma.studySession.findMany({
    where: { userId, inicio: { gte: inicio, lt: finExcl }, fin: { not: null } },
  });
  const minutosEstudio = sesiones.reduce(
    (a, s) => a + (s.fin!.getTime() - s.inicio.getTime()) / 60_000,
    0
  );

  const previa = new Date(inicio);
  previa.setUTCDate(previa.getUTCDate() - 7);
  const cumplePrevia = await cumplimientoDeSemana(userId, previa);
  const cumplimiento = totalAplicables
    ? Math.round((totalHechas / totalAplicables) * 100)
    : 0;

  return {
    inicio,
    fin,
    celdas,
    dias,
    totalAplicables,
    totalHechas,
    cumplimiento,
    minutosEstudio,
    mejorDia: conDatos.length ? conDatos.reduce((a, b) => (b.tasa! > a.tasa! ? b : a)) : null,
    peorDia: conDatos.length ? conDatos.reduce((a, b) => (b.tasa! < a.tasa! ? b : a)) : null,
    deltaSemanaPrevia: cumplePrevia === null ? null : cumplimiento - cumplePrevia,
  };
}
