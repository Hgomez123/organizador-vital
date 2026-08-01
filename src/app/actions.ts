"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/user";
import { planificarConIA, planificarLocal, hayIA, type PlanGenerado } from "@/lib/ai";
import type { AccionSugerencia } from "@/lib/motor";

type Dominio = "COMIDAS" | "LIMPIEZA" | "ESTUDIO" | "TIEMPO_LIBRE" | "GENERAL";
type Recurrencia = "DIARIA" | "SEMANAL" | "UNICA";
type EstadoLog = "HECHO" | "SALTADO" | "POSPUESTO";

function hoy(): Date {
  const d = new Date();
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
}

// ───────────────────────── Tareas ─────────────────────────

export async function marcarTarea(taskId: string, estado: EstadoLog) {
  await prisma.taskLog.upsert({
    where: { taskId_fecha: { taskId, fecha: hoy() } },
    update: { estado },
    create: { taskId, fecha: hoy(), estado },
  });
  revalidatePath("/");
}

export async function desmarcarTarea(taskId: string) {
  await prisma.taskLog.deleteMany({ where: { taskId, fecha: hoy() } });
  revalidatePath("/");
}

export async function crearTarea(formData: FormData) {
  const user = await getCurrentUser();
  const titulo = String(formData.get("titulo") ?? "").trim();
  if (!titulo) return;

  const dominio = formData.get("dominio") as Dominio;
  const recurrencia = formData.get("recurrencia") as Recurrencia;
  const diasSemana = recurrencia === "SEMANAL" ? formData.getAll("dias").map(Number) : [];

  await prisma.task.create({
    data: { userId: user.id, titulo, dominio, recurrencia, diasSemana },
  });
  revalidatePath("/");
}

export async function registrarSesionEstudio(materia: string, minutos: number, pomodoros: number) {
  const user = await getCurrentUser();
  const fin = new Date();
  const inicio = new Date(fin.getTime() - minutos * 60_000);
  await prisma.studySession.create({
    data: { userId: user.id, materia: materia || "General", inicio, fin, pomodoros },
  });
  revalidatePath("/");
}

// ──────────────── Motor adaptativo: aplicar sugerencia ────────────────

export async function aplicarSugerencia(accion: AccionSugerencia) {
  switch (accion.tipo) {
    case "MOVER_DIA":
      await prisma.task.update({
        where: { id: accion.taskId },
        data: { diasSemana: accion.dias },
      });
      break;

    case "PARTIR": {
      const t = await prisma.task.findUnique({ where: { id: accion.taskId } });
      if (!t) break;
      const mitad = Math.max(5, Math.round((t.duracionMin ?? 30) / 2));
      const dias = t.diasSemana;
      // Reparte los días entre las dos mitades; si es diaria, ambas quedan diarias
      await prisma.task.update({
        where: { id: t.id },
        data: { titulo: `${t.titulo} — parte 1`, duracionMin: mitad },
      });
      await prisma.task.create({
        data: {
          userId: t.userId,
          goalId: t.goalId,
          dominio: t.dominio,
          titulo: `${t.titulo} — parte 2`,
          recurrencia: t.recurrencia,
          diasSemana: dias,
          duracionMin: mitad,
        },
      });
      break;
    }

    case "PAUSAR":
      await prisma.task.update({ where: { id: accion.taskId }, data: { activa: false } });
      break;

    case "SUBIR_META":
      await prisma.goal.update({
        where: { id: accion.goalId },
        data: { valorObjetivo: accion.nuevoValor },
      });
      break;
  }
  revalidatePath("/");
}

// ──────────────── Planificación conversacional ────────────────

export async function generarPlan(intencion: string): Promise<PlanGenerado & { fuente: "ia" | "local" }> {
  const conIA = await planificarConIA(intencion);
  if (conIA) return { ...conIA, fuente: "ia" };
  return { ...planificarLocal(intencion), fuente: "local" };
}

export async function aplicarPlan(plan: PlanGenerado) {
  const user = await getCurrentUser();

  const goal = await prisma.goal.create({
    data: {
      userId: user.id,
      dominio: plan.meta.dominio as Dominio,
      titulo: plan.meta.titulo,
      metrica: plan.meta.metrica,
      valorObjetivo: plan.meta.valorObjetivo,
    },
  });

  await prisma.challenge.create({
    data: { goalId: goal.id, titulo: `21 días: ${plan.meta.titulo}`, duracionDias: 21 },
  });

  for (const t of plan.tareas) {
    await prisma.task.create({
      data: {
        userId: user.id,
        goalId: goal.id,
        dominio: t.dominio as Dominio,
        titulo: t.titulo,
        recurrencia: t.recurrencia as Recurrencia,
        diasSemana: t.diasSemana,
        duracionMin: t.duracionMin,
      },
    });
  }
  revalidatePath("/");
}

export async function iaDisponible() {
  return hayIA();
}
