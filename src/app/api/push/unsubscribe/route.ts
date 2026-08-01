import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/user";

export const runtime = "nodejs";

/** Da de baja este dispositivo. Si era el último, apaga los recordatorios. */
export async function POST(req: Request) {
  const user = await getCurrentUser();
  const { endpoint } = (await req.json().catch(() => ({}))) as { endpoint?: string };

  if (endpoint) {
    await prisma.pushSubscription.deleteMany({ where: { endpoint, userId: user.id } });
  } else {
    await prisma.pushSubscription.deleteMany({ where: { userId: user.id } });
  }

  const restantes = await prisma.pushSubscription.count({ where: { userId: user.id } });

  // Sin dispositivos no hay a dónde enviar: se apagan todos los avisos
  // para que el cron no los evalúe en vano.
  if (restantes === 0) {
    await prisma.aviso.updateMany({ where: { userId: user.id }, data: { activo: false } });
  }

  return NextResponse.json({ ok: true, dispositivos: restantes });
}
