/**
 * COMIDAS
 * Menú semanal y lista de compras derivada.
 * La lista no se guarda: se calcula desde el menú, así nunca se desincroniza.
 */

import { prisma } from "./prisma";

export const TIPOS = ["DESAYUNO", "ALMUERZO", "CENA"] as const;
export type TipoComidaKey = (typeof TIPOS)[number];

export const TIPO_LABEL: Record<string, string> = {
  DESAYUNO: "Desayuno",
  ALMUERZO: "Almuerzo",
  CENA: "Cena",
};

export const DIAS_SEMANA = [
  { n: 1, corto: "Lun", largo: "Lunes" },
  { n: 2, corto: "Mar", largo: "Martes" },
  { n: 3, corto: "Mié", largo: "Miércoles" },
  { n: 4, corto: "Jue", largo: "Jueves" },
  { n: 5, corto: "Vie", largo: "Viernes" },
  { n: 6, corto: "Sáb", largo: "Sábado" },
  { n: 0, corto: "Dom", largo: "Domingo" },
];

export const CATEGORIAS = [
  "Verdura y fruta",
  "Proteína",
  "Lácteos",
  "Panadería",
  "Despensa",
  "Otros",
];

/** Lunes de la semana que contiene la fecha dada, a medianoche UTC. */
export function lunesDe(fecha = new Date()): Date {
  const d = new Date(fecha);
  const dow = d.getDay();
  const desplazamiento = dow === 0 ? -6 : 1 - dow; // domingo pertenece a la semana previa
  d.setDate(d.getDate() + desplazamiento);
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
}

export type CasillaMenu = {
  id: string | null;
  dia: number;
  tipo: TipoComidaKey;
  nombre: string | null;
  recipeId: string | null;
};

export type ItemCompra = {
  categoria: string;
  ingrediente: string;
  /** Cuántas comidas de la semana lo necesitan */
  veces: number;
  recetas: string[];
};

export async function menuSemana(userId: string, semana: Date) {
  const filas = await prisma.mealPlan.findMany({
    where: { userId, semana },
    include: { recipe: true },
  });

  const casillas: CasillaMenu[] = [];
  for (const d of DIAS_SEMANA) {
    for (const tipo of TIPOS) {
      const f = filas.find((x) => x.dia === d.n && x.tipo === tipo);
      casillas.push({
        id: f?.id ?? null,
        dia: d.n,
        tipo,
        nombre: f?.recipe?.nombre ?? f?.texto ?? null,
        recipeId: f?.recipeId ?? null,
      });
    }
  }
  return casillas;
}

export async function listaCompras(userId: string, semana: Date): Promise<ItemCompra[]> {
  const filas = await prisma.mealPlan.findMany({
    where: { userId, semana, recipeId: { not: null } },
    include: { recipe: true },
  });

  const mapa = new Map<string, ItemCompra>();

  for (const f of filas) {
    if (!f.recipe) continue;
    for (const ing of f.recipe.ingredientes) {
      const clave = `${f.recipe.categoria}::${ing.toLowerCase().trim()}`;
      const previo = mapa.get(clave);
      if (previo) {
        previo.veces++;
        if (!previo.recetas.includes(f.recipe.nombre)) previo.recetas.push(f.recipe.nombre);
      } else {
        mapa.set(clave, {
          categoria: f.recipe.categoria,
          ingrediente: ing.trim(),
          veces: 1,
          recetas: [f.recipe.nombre],
        });
      }
    }
  }

  return [...mapa.values()].sort(
    (a, b) =>
      CATEGORIAS.indexOf(a.categoria) - CATEGORIAS.indexOf(b.categoria) ||
      a.ingrediente.localeCompare(b.ingrediente, "es")
  );
}
