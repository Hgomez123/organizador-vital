"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/user";
import type { TipoAvisoKey } from "@/lib/avisos-def";

type Tipo = "PLAN_MANANA" | "EMPUJON_TARDE" | "REGISTRO_NOCHE" | "REVISION_SEMANAL";

export async function configurarAviso(
  tipo: TipoAvisoKey,
  datos: { activo?: boolean; hora?: string; diaSemana?: number }
) {
  const user = await getCurrentUser();

  const cambios: Record<string, unknown> = {};
  if (typeof datos.activo === "boolean") cambios.activo = datos.activo;
  if (datos.hora && /^\d{2}:\d{2}$/.test(datos.hora)) cambios.hora = datos.hora;
  if (typeof datos.diaSemana === "number" && datos.diaSemana >= 0 && datos.diaSemana <= 6) {
    cambios.diaSemana = datos.diaSemana;
  }
  if (Object.keys(cambios).length === 0) return;

  await prisma.aviso.update({
    where: { userId_tipo: { userId: user.id, tipo: tipo as Tipo } },
    data: cambios,
  });
  revalidatePath("/");
}

/** Guarda el desfase horario del navegador para que el cron calcule bien. */
export async function guardarZonaHoraria(tzOffsetMin: number) {
  const user = await getCurrentUser();
  if (!Number.isFinite(tzOffsetMin)) return;
  if (user.tzOffsetMin === Math.trunc(tzOffsetMin)) return;
  await prisma.user.update({
    where: { id: user.id },
    data: { tzOffsetMin: Math.trunc(tzOffsetMin) },
  });
}
