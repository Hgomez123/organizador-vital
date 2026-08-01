"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/user";
import type { TipoComidaKey } from "@/lib/comidas";

type Tipo = "DESAYUNO" | "ALMUERZO" | "CENA";

export async function crearReceta(formData: FormData) {
  const user = await getCurrentUser();
  const nombre = String(formData.get("nombre") ?? "").trim();
  if (!nombre) return;

  const ingredientes = String(formData.get("ingredientes") ?? "")
    .split(/[\n,]/)
    .map((s) => s.trim())
    .filter(Boolean);

  const minutosRaw = String(formData.get("minutos") ?? "").trim();

  await prisma.recipe.create({
    data: {
      userId: user.id,
      nombre,
      ingredientes,
      categoria: String(formData.get("categoria") ?? "Despensa"),
      minutos: minutosRaw ? Number(minutosRaw) : null,
    },
  });
  revalidatePath("/comidas");
}

export async function borrarReceta(id: string) {
  await prisma.mealPlan.deleteMany({ where: { recipeId: id } });
  await prisma.recipe.delete({ where: { id } });
  revalidatePath("/comidas");
}

/** Asigna una receta (o la quita si recipeId es null) a una casilla del menú. */
export async function asignarComida(
  semanaISO: string,
  dia: number,
  tipo: TipoComidaKey,
  recipeId: string | null
) {
  const user = await getCurrentUser();
  const semana = new Date(semanaISO);

  if (!recipeId) {
    await prisma.mealPlan.deleteMany({
      where: { userId: user.id, semana, dia, tipo: tipo as Tipo },
    });
  } else {
    await prisma.mealPlan.upsert({
      where: {
        userId_semana_dia_tipo: { userId: user.id, semana, dia, tipo: tipo as Tipo },
      },
      update: { recipeId, texto: null },
      create: { userId: user.id, semana, dia, tipo: tipo as Tipo, recipeId },
    });
  }
  revalidatePath("/comidas");
}

/** Copia el menú de la semana anterior sobre la actual. */
export async function copiarSemanaAnterior(semanaISO: string) {
  const user = await getCurrentUser();
  const semana = new Date(semanaISO);
  const previa = new Date(semana);
  previa.setUTCDate(previa.getUTCDate() - 7);

  const origen = await prisma.mealPlan.findMany({ where: { userId: user.id, semana: previa } });
  if (!origen.length) return;

  await prisma.mealPlan.deleteMany({ where: { userId: user.id, semana } });
  for (const f of origen) {
    await prisma.mealPlan.create({
      data: {
        userId: user.id,
        semana,
        dia: f.dia,
        tipo: f.tipo,
        recipeId: f.recipeId,
        texto: f.texto,
      },
    });
  }
  revalidatePath("/comidas");
}

export async function vaciarSemana(semanaISO: string) {
  const user = await getCurrentUser();
  await prisma.mealPlan.deleteMany({ where: { userId: user.id, semana: new Date(semanaISO) } });
  revalidatePath("/comidas");
}
