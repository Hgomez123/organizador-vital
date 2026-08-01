/**
 * Llama al cron de recordatorios como lo haría el programador real.
 *
 *   npm run push:probar          → solo los que toquen ahora
 *   npm run push:probar -- ahora → fuerza el envío ignorando la hora
 *
 * Útil para comprobar que la cadena completa funciona sin esperar
 * a que den las ocho de la noche.
 */

import { readFileSync } from "node:fs";

function leerEnv() {
  try {
    const texto = readFileSync(new URL("../.env", import.meta.url), "utf8");
    return Object.fromEntries(
      texto
        .split("\n")
        .filter((l) => l.trim() && !l.trim().startsWith("#"))
        .map((l) => {
          const i = l.indexOf("=");
          return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, "")];
        })
    );
  } catch {
    return {};
  }
}

const env = leerEnv();
const secreto = env.CRON_SECRET;
const base = env.APP_URL || "http://localhost:3000";
const forzar = process.argv.includes("ahora");

if (!secreto) {
  console.error("Falta CRON_SECRET en .env — ejecuta antes: npm run push:keys");
  process.exit(1);
}

const url = `${base}/api/cron/recordatorios${forzar ? "?forzar=1" : ""}`;
console.log(`→ ${url}`);

try {
  const res = await fetch(url, { headers: { authorization: `Bearer ${secreto}` } });
  const cuerpo = await res.json();
  console.log(res.status, JSON.stringify(cuerpo, null, 2));
} catch (e) {
  console.error("No pude contactar la app. ¿Está corriendo `npm run dev`?");
  console.error(e.message);
  process.exit(1);
}
