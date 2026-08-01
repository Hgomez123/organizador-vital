import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/user";
import { enviarAUsuario, pushDisponible } from "@/lib/push";

export const runtime = "nodejs";

/** Envío inmediato de prueba: comprueba la cadena completa sin esperar la hora. */
export async function POST() {
  if (!pushDisponible()) {
    return NextResponse.json({ error: "Push no configurado" }, { status: 503 });
  }

  const user = await getCurrentUser();
  const r = await enviarAUsuario(user.id, {
    titulo: "Prueba de recordatorio",
    cuerpo: "Si ves esto con la app cerrada, el push real está funcionando.",
    url: "/",
  });

  // El asunto VAPID es la causa más común de rechazo: Apple exige un
  // mailto: o https: válido en el token, y falla en silencio si no lo es.
  const asunto = process.env.VAPID_SUBJECT ?? "(sin definir)";
  const asuntoValido = /^(mailto:\S+@\S+|https:\/\/\S+)$/.test(asunto);

  return NextResponse.json({
    ok: r.enviados > 0,
    ...r,
    vapidSubject: asunto,
    vapidSubjectValido: asuntoValido,
  });
}
