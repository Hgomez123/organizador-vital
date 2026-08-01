import "server-only";
import webpush from "web-push";
import { prisma } from "./prisma";

/**
 * ENVÍO DE WEB PUSH
 *
 * A diferencia del service worker con setTimeout, esto llega aunque el
 * navegador esté cerrado: el mensaje viaja al servicio de push del
 * fabricante (Google/Mozilla/Apple) y el sistema operativo lo despierta.
 *
 * Las claves VAPID identifican a este servidor. Sin ellas, todo el módulo
 * se apaga en silencio en vez de reventar la app.
 */

export type Carga = {
  titulo: string;
  cuerpo: string;
  url?: string;
};

let configurado = false;

export function pushDisponible(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);
}

function configurar(): boolean {
  if (configurado) return true;
  if (!pushDisponible()) return false;
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || "mailto:sin-configurar@ejemplo.com",
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!
  );
  configurado = true;
  return true;
}

export type ResultadoEnvio = {
  enviados: number;
  eliminados: number;
  fallidos: number;
  /** Detalle de los rechazos: sin esto, un fallo es indepurable. */
  errores: Array<{ servicio: string; codigo: number | string; motivo: string }>;
};

/**
 * Envía a todos los dispositivos de un usuario.
 * Las suscripciones que el servicio rechaza con 404/410 están muertas
 * (el usuario desinstaló o limpió datos) y se borran: conservarlas solo
 * genera errores en cada envío futuro.
 */
export async function enviarAUsuario(userId: string, carga: Carga): Promise<ResultadoEnvio> {
  const vacio: ResultadoEnvio = { enviados: 0, eliminados: 0, fallidos: 0, errores: [] };
  if (!configurar()) return vacio;

  const subs = await prisma.pushSubscription.findMany({ where: { userId } });
  const payload = JSON.stringify(carga);

  let enviados = 0;
  let eliminados = 0;
  let fallidos = 0;
  const errores: ResultadoEnvio["errores"] = [];

  await Promise.all(
    subs.map(async (s) => {
      let servicio = "desconocido";
      try {
        servicio = new URL(s.endpoint).host;
      } catch {
        /* endpoint corrupto: se reporta como desconocido */
      }

      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          payload,
          { TTL: 3600, urgency: "normal" }
        );
        enviados++;
      } catch (e: unknown) {
        const err = e as { statusCode?: number; body?: string; message?: string };
        const codigo = err?.statusCode;

        // 404/410: el dispositivo ya no existe. Conservarla solo genera
        // ruido en cada envío futuro.
        if (codigo === 404 || codigo === 410) {
          await prisma.pushSubscription.delete({ where: { id: s.id } }).catch(() => {});
          eliminados++;
          return;
        }

        fallidos++;
        errores.push({
          servicio,
          codigo: codigo ?? "sin código",
          motivo: (err?.body || err?.message || "sin detalle").slice(0, 220),
        });
      }
    })
  );

  return { enviados, eliminados, fallidos, errores };
}
