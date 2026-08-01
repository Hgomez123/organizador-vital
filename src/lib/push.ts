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

export type ResultadoEnvio = { enviados: number; eliminados: number; fallidos: number };

/**
 * Envía a todos los dispositivos de un usuario.
 * Las suscripciones que el servicio rechaza con 404/410 están muertas
 * (el usuario desinstaló o limpió datos) y se borran: conservarlas solo
 * genera errores en cada envío futuro.
 */
export async function enviarAUsuario(userId: string, carga: Carga): Promise<ResultadoEnvio> {
  if (!configurar()) return { enviados: 0, eliminados: 0, fallidos: 0 };

  const subs = await prisma.pushSubscription.findMany({ where: { userId } });
  const payload = JSON.stringify(carga);

  let enviados = 0;
  let eliminados = 0;
  let fallidos = 0;

  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          payload,
          { TTL: 3600, urgency: "normal" }
        );
        enviados++;
      } catch (e: unknown) {
        const codigo = (e as { statusCode?: number })?.statusCode;
        if (codigo === 404 || codigo === 410) {
          await prisma.pushSubscription.delete({ where: { id: s.id } }).catch(() => {});
          eliminados++;
        } else {
          fallidos++;
        }
      }
    })
  );

  return { enviados, eliminados, fallidos };
}
