import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/user";
import { pushDisponible } from "@/lib/push";

export const runtime = "nodejs";

/** Registra el dispositivo actual y guarda la preferencia de hora. */
export async function POST(req: Request) {
  if (!pushDisponible()) {
    return NextResponse.json(
      { error: "Push no configurado en el servidor. Ejecuta: npm run push:keys" },
      { status: 503 }
    );
  }

  const user = await getCurrentUser();
  const body = await req.json().catch(() => null);

  const sub = body?.suscripcion;
  if (!sub?.endpoint || !sub?.keys?.p256dh || !sub?.keys?.auth) {
    return NextResponse.json({ error: "Suscripción inválida" }, { status: 400 });
  }

  const tzOffsetMin = Number.isFinite(body.tzOffsetMin) ? Math.trunc(body.tzOffsetMin) : 0;

  await prisma.pushSubscription.upsert({
    where: { endpoint: sub.endpoint },
    update: { userId: user.id, p256dh: sub.keys.p256dh, auth: sub.keys.auth },
    create: {
      userId: user.id,
      endpoint: sub.endpoint,
      p256dh: sub.keys.p256dh,
      auth: sub.keys.auth,
      agente: req.headers.get("user-agent")?.slice(0, 180) ?? null,
    },
  });

  await prisma.user.update({ where: { id: user.id }, data: { tzOffsetMin } });

  const total = await prisma.pushSubscription.count({ where: { userId: user.id } });
  return NextResponse.json({ ok: true, dispositivos: total });
}
