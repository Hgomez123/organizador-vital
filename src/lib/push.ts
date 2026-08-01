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

/** Último motivo por el que la configuración falló, para poder reportarlo. */
export let fallaConfiguracion: string | null = null;

export function pushDisponible(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);
}

/** Quita comillas y espacios: al pegar en paneles web se cuelan con facilidad. */
function limpiar(v: string | undefined): string {
  return (v ?? "").trim().replace(/^["']|["']$/g, "");
}

function configurar(): boolean {
  if (configurado) return true;
  if (!pushDisponible()) {
    fallaConfiguracion = "Faltan NEXT_PUBLIC_VAPID_PUBLIC_KEY o VAPID_PRIVATE_KEY";
    return false;
  }

  let asunto = limpiar(process.env.VAPID_SUBJECT);
  // Tolerar que se haya guardado solo el correo: es el error más común
  // y no justifica tumbar la función entera.
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(asunto)) asunto = `mailto:${asunto}`;
  if (!/^(mailto:\S+@\S+|https:\/\/\S+)$/.test(asunto)) {
    fallaConfiguracion = `VAPID_SUBJECT inválido: "${asunto || "(vacío)"}". Debe ser mailto:tucorreo@dominio.com`;
    return false;
  }

  try {
    webpush.setVapidDetails(
      asunto,
      limpiar(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY),
      limpiar(process.env.VAPID_PRIVATE_KEY)
    );
  } catch (e) {
    // setVapidDetails lanza si alguna clave está mal formada. Sin este
    // try/catch, la función devolvía 500 con cuerpo vacío: indepurable.
    fallaConfiguracion = e instanceof Error ? e.message : "Claves VAPID mal formadas";
    return false;
  }

  fallaConfiguracion = null;
  configurado = true;
  return true;
}

/** Comprueba la configuración sin enviar nada. */
export function estadoConfiguracion(): { ok: boolean; motivo: string | null } {
  const ok = configurar();
  return { ok, motivo: fallaConfiguracion };
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
