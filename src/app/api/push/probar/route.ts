import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/user";
import {
  enviarAUsuario,
  pushDisponible,
  estadoConfiguracion,
  clavesEmparejadas,
} from "@/lib/push";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Envío inmediato de prueba.
 * Todo va envuelto en try/catch: una excepción aquí devolvía un 500 con
 * cuerpo vacío, que no dice nada sobre la causa.
 */
export async function POST() {
  try {
    if (!pushDisponible()) {
      return NextResponse.json(
        { ok: false, error: "Faltan las claves VAPID en el servidor" },
        { status: 503 }
      );
    }

    const cfg = estadoConfiguracion();
    if (!cfg.ok) {
      return NextResponse.json({ ok: false, error: cfg.motivo }, { status: 503 });
    }

    const user = await getCurrentUser();
    const r = await enviarAUsuario(user.id, {
      titulo: "Prueba de recordatorio",
      cuerpo: "Si ves esto con la app cerrada, el push real está funcionando.",
      url: "/",
    });

    return NextResponse.json({
      ok: r.enviados > 0,
      ...r,
      vapidSubject: process.env.VAPID_SUBJECT ?? "(sin definir)",
      vapidSubjectValido: true,
    });
  } catch (e) {
    return NextResponse.json(
      {
        ok: false,
        error: e instanceof Error ? e.message : "Error desconocido",
        pista: "Revisa VAPID_SUBJECT, las claves VAPID y DATABASE_URL en Vercel.",
      },
      { status: 500 }
    );
  }
}

/** GET: comprueba la configuración sin enviar nada. Útil desde el navegador. */
export async function GET() {
  const cfg = estadoConfiguracion();
  const par = clavesEmparejadas();
  return NextResponse.json({
    clavesPresentes: pushDisponible(),
    configuracionValida: cfg.ok,
    motivo: cfg.motivo,
    vapidSubject: process.env.VAPID_SUBJECT ?? "(sin definir)",
    parDeClavesCoincide: par.ok,
    detalleClaves: par.detalle,
  });
}
