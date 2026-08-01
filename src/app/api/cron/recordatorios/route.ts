import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { enviarAUsuario, pushDisponible } from "@/lib/push";
import { construirMensaje, type TipoAvisoKey } from "@/lib/avisos";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * PROGRAMADOR DE AVISOS
 *
 * Se llama cada 15 minutos desde fuera (GitHub Actions o similar).
 * Por cada aviso activo calcula qué hora es EN LA ZONA DEL USUARIO y
 * decide si le toca. Si el mensaje resulta vacío, no envía nada: el
 * silencio es parte de la estrategia.
 *
 * Protegido con CRON_SECRET porque dispara envíos reales.
 */

const VENTANA_MIN = 20; // tolerancia: el programador no cae exacto en la hora

export async function GET(req: Request) {
  const secreto = process.env.CRON_SECRET;
  const cabecera = req.headers.get("authorization");
  if (!secreto || cabecera !== `Bearer ${secreto}`) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  if (!pushDisponible()) {
    return NextResponse.json({ error: "Push no configurado" }, { status: 503 });
  }

  const params = new URL(req.url).searchParams;
  const forzar = params.get("forzar") === "1";
  const soloTipo = params.get("tipo") as TipoAvisoKey | null;

  const ahora = new Date();

  const avisos = await prisma.aviso.findMany({
    where: { activo: true, ...(soloTipo ? { tipo: soloTipo } : {}) },
    include: { user: { include: { pushSubs: true } } },
  });

  const informe: Array<Record<string, unknown>> = [];

  for (const av of avisos) {
    const u = av.user;
    if (u.pushSubs.length === 0) continue;

    // Hora local del usuario. getTimezoneOffset() devuelve los minutos a
    // RESTAR de la hora local para llegar a UTC, de ahí el signo.
    const local = new Date(ahora.getTime() - u.tzOffsetMin * 60_000);
    const diaClave = new Date(
      Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate())
    );

    const [hObj, mObj] = av.hora.split(":").map(Number);
    const minutosAhora = local.getUTCHours() * 60 + local.getUTCMinutes();
    const distancia = minutosAhora - (hObj * 60 + mObj);
    const enVentana = distancia >= 0 && distancia < VENTANA_MIN;

    // La revisión semanal solo corre su día
    const diaCorrecto =
      av.tipo !== "REVISION_SEMANAL" || av.diaSemana === null
        ? true
        : local.getUTCDay() === av.diaSemana;

    // Un envío por día natural (o por semana, en la revisión)
    const limite =
      av.tipo === "REVISION_SEMANAL"
        ? new Date(diaClave.getTime() - 6 * 86_400_000)
        : diaClave;
    const yaEnviado = av.ultimoEnvio !== null && av.ultimoEnvio.getTime() >= limite.getTime();

    if (!forzar && (!enVentana || !diaCorrecto || yaEnviado)) {
      informe.push({
        tipo: av.tipo,
        omitido: yaEnviado ? "ya enviado" : !diaCorrecto ? "otro día" : "fuera de ventana",
      });
      continue;
    }

    const mensaje = await construirMensaje(av.tipo as TipoAvisoKey, u.id, diaClave);

    if (!mensaje) {
      informe.push({ tipo: av.tipo, omitido: "sin nada útil que decir" });
      continue;
    }

    const r = await enviarAUsuario(u.id, {
      titulo: mensaje.titulo,
      cuerpo: mensaje.cuerpo,
      url: mensaje.url,
    });

    if (r.enviados > 0) {
      await prisma.aviso.update({ where: { id: av.id }, data: { ultimoEnvio: ahora } });
    }

    informe.push({ tipo: av.tipo, titulo: mensaje.titulo, ...r });
  }

  return NextResponse.json({
    ok: true,
    momento: ahora.toISOString(),
    forzado: forzar,
    avisosActivos: avisos.length,
    detalle: informe,
  });
}
