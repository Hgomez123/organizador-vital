import { prisma } from "./prisma";

/**
 * Modo personal: un solo usuario definido por DEFAULT_USER_EMAIL.
 * En Fase 2 esto se reemplaza por la sesión de NextAuth.
 */
export async function getCurrentUser() {
  const email = process.env.DEFAULT_USER_EMAIL!;
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw new Error("Ejecuta el seed: npm run db:seed");
  return user;
}
