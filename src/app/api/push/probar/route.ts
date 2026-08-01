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

  return NextResponse.json({ ok: r.enviados > 0, ...r });
}
