/**
 * Genera el par de claves VAPID que identifica a tu servidor ante los
 * servicios de push (Google, Mozilla, Apple).
 *
 *   npm run push:keys
 *
 * Se generan UNA sola vez. Si las cambias después, todas las suscripciones
 * existentes dejan de funcionar y cada dispositivo tiene que volver a
 * suscribirse.
 */

import webpush from "web-push";

const { publicKey, privateKey } = webpush.generateVAPIDKeys();

console.log(`
╭──────────────────────────────────────────────────────────────╮
│  Claves VAPID generadas                                      │
│  Cópialas a tu archivo .env (no las subas a git)             │
╰──────────────────────────────────────────────────────────────╯

NEXT_PUBLIC_VAPID_PUBLIC_KEY="${publicKey}"
VAPID_PRIVATE_KEY="${privateKey}"
VAPID_SUBJECT="mailto:tu-correo@ejemplo.com"
CRON_SECRET="${crypto.randomUUID()}"
`);
