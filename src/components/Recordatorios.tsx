"use client";

import { useEffect, useState, useTransition } from "react";
import { configurarAviso, guardarZonaHoraria } from "@/app/avisos-actions";
import { DEFINICION, type TipoAvisoKey } from "@/lib/avisos-def";

/**
 * PANEL DE AVISOS
 *
 * Suscribe el dispositivo a Web Push y configura los cuatro momentos.
 * Cada aviso se activa por separado con su propia hora: la estrategia
 * de seguimiento la decide el usuario, no la app.
 */

type Estado = "cargando" | "no-soportado" | "sin-claves" | "denegado" | "inactivo" | "activo";

export type AvisoFila = {
  tipo: TipoAvisoKey;
  activo: boolean;
  hora: string;
  diaSemana: number | null;
};

type Props = {
  clavePublica: string | null;
  avisos: AvisoFila[];
  dispositivos: number;
};

const DIAS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const ORDEN: TipoAvisoKey[] = [
  "PLAN_MANANA",
  "EMPUJON_TARDE",
  "REGISTRO_NOCHE",
  "REVISION_SEMANAL",
];

/** La clave VAPID viaja en base64url y pushManager la exige como bytes. */
function base64UrlABytes(base64: string): Uint8Array<ArrayBuffer> {
  const relleno = "=".repeat((4 - (base64.length % 4)) % 4);
  const normal = (base64 + relleno).replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(normal);
  const buffer = new ArrayBuffer(bin.length);
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

export function Recordatorios({ clavePublica, avisos, dispositivos }: Props) {
  const [estado, setEstado] = useState<Estado>("cargando");
  const [equipos, setEquipos] = useState(dispositivos);
  const [local, setLocal] = useState<AvisoFila[]>(avisos);
  const [ocupado, setOcupado] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const [instalable, setInstalable] = useState<Event | null>(null);
  const [instalada, setInstalada] = useState(false);
  const [diag, setDiag] = useState<Record<string, string>>({});
  const [verDiag, setVerDiag] = useState(false);
  const [, startTransition] = useTransition();

  /** Estado real del dispositivo. Sin esto, "no llega nada" es indepurable. */
  const revisar = async () => {
    const d: Record<string, string> = {};
    d["Modo"] = window.matchMedia("(display-mode: standalone)").matches
      ? "instalada ✓"
      : "navegador — en iPhone el push NO funciona así";
    d["Notification API"] = "Notification" in window ? "sí" : "no";
    d["PushManager"] = "PushManager" in window ? "sí" : "no";
    d["Permiso"] = "Notification" in window ? Notification.permission : "n/d";
    d["Clave VAPID"] = clavePublica ? "presente" : "AUSENTE en el servidor";

    if ("serviceWorker" in navigator) {
      const reg = await navigator.serviceWorker.getRegistration();
      d["Service worker"] = reg ? "registrado" : "NO registrado";
      if (reg) {
        const sub = await reg.pushManager.getSubscription();
        d["Suscripción local"] = sub ? "activa" : "ninguna";
        if (sub) d["Servicio"] = new URL(sub.endpoint).host;
      }
    } else {
      d["Service worker"] = "no soportado";
    }

    d["Origen"] = window.location.host;
    d["Registrados en servidor"] = String(equipos);
    setDiag(d);
    setVerDiag(true);
  };

  useEffect(() => {
    if (typeof window === "undefined") return;

    setInstalada(window.matchMedia("(display-mode: standalone)").matches);
    guardarZonaHoraria(new Date().getTimezoneOffset());

    const alInstalar = (e: Event) => {
      e.preventDefault();
      setInstalable(e);
    };
    window.addEventListener("beforeinstallprompt", alInstalar);

    (async () => {
      if (
        !("serviceWorker" in navigator) ||
        !("PushManager" in window) ||
        !("Notification" in window)
      ) {
        setEstado("no-soportado");
        return;
      }
      if (!clavePublica) {
        setEstado("sin-claves");
        return;
      }
      try {
        await navigator.serviceWorker.register("/sw.js");
      } catch {
        setEstado("no-soportado");
        return;
      }
      if (Notification.permission === "denied") {
        setEstado("denegado");
        return;
      }
      // `serviceWorker.ready` puede no resolver nunca en la primera visita
      // a un origen. Sin este límite, el panel se queda cargando en blanco.
      const reg = await Promise.race([
        navigator.serviceWorker.ready,
        new Promise<null>((r) => setTimeout(() => r(null), 4000)),
      ]);

      if (!reg) {
        setEstado("inactivo");
        return;
      }

      const sub = await reg.pushManager.getSubscription();

      // Ambas condiciones: una suscripción sin permiso concedido no entrega
      // nada. Dar por activo solo por la suscripción ocultaba el botón de
      // conectar justo cuando hacía falta.
      setEstado(sub && Notification.permission === "granted" ? "activo" : "inactivo");
    })();

    return () => window.removeEventListener("beforeinstallprompt", alInstalar);
  }, [clavePublica]);

  const conectar = async () => {
    setOcupado(true);
    setAviso(null);
    try {
      const permiso = await Notification.requestPermission();
      if (permiso !== "granted") {
        setEstado(permiso === "denied" ? "denegado" : "inactivo");
        return;
      }
      // Asegura que el service worker esté registrado y activo antes de
      // suscribir: en la primera visita puede no estarlo todavía.
      await navigator.serviceWorker.register("/sw.js").catch(() => {});
      const reg = await navigator.serviceWorker.ready;

      let sub = await reg.pushManager.getSubscription();

      // Una suscripción creada con otra clave VAPID no sirve y hay que
      // reemplazarla, no reutilizarla.
      if (sub) {
        const actual = new Uint8Array(sub.options.applicationServerKey ?? new ArrayBuffer(0));
        const esperada = base64UrlABytes(clavePublica!);
        const coincide =
          actual.length === esperada.length && actual.every((b, i) => b === esperada[i]);
        if (!coincide) {
          await sub.unsubscribe().catch(() => {});
          sub = null;
        }
      }

      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: base64UrlABytes(clavePublica!),
        });
      }

      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          suscripcion: sub.toJSON(),
          tzOffsetMin: new Date().getTimezoneOffset(),
        }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({})))?.error ?? "Error");
      setEquipos((await res.json()).dispositivos ?? 1);
      setEstado("activo");
      setAviso("Dispositivo conectado. Ahora elige qué avisos quieres recibir.");
    } catch (e) {
      setAviso(e instanceof Error ? e.message : "No pude conectar este dispositivo.");
    } finally {
      setOcupado(false);
    }
  };

  const desconectar = async () => {
    setOcupado(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      await fetch("/api/push/unsubscribe", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ endpoint: sub?.endpoint }),
      });
      await sub?.unsubscribe();
      setEstado("inactivo");
      setEquipos((n) => Math.max(n - 1, 0));
      setAviso(null);
    } finally {
      setOcupado(false);
    }
  };

  const probar = async () => {
    setOcupado(true);
    setAviso(null);
    try {
      const res = await fetch("/api/push/probar", { method: "POST" });
      const d = await res.json();

      // El detalle del rechazo importa más que el resumen: sin él,
      // "no llega" puede ser cinco causas distintas.
      const partes: string[] = [];
      partes.push(
        `Enviados: ${d.enviados ?? 0} · Fallidos: ${d.fallidos ?? 0} · Caducados eliminados: ${d.eliminados ?? 0}`
      );
      if (d.vapidSubjectValido === false) {
        partes.push(`VAPID_SUBJECT inválido: "${d.vapidSubject}". Debe ser mailto:tucorreo@x.com`);
      }
      for (const e of d.errores ?? []) {
        partes.push(`${e.servicio} → ${e.codigo}: ${e.motivo}`);
      }
      if (d.ok && !d.fallidos) {
        partes.push("Cierra la app por completo: debería llegarte igual.");
      }
      setAviso(partes.join("\n"));
      await revisar();
    } finally {
      setOcupado(false);
    }
  };

  const actualizar = (tipo: TipoAvisoKey, cambios: Partial<AvisoFila>) => {
    setLocal((prev) => prev.map((a) => (a.tipo === tipo ? { ...a, ...cambios } : a)));
    startTransition(() => {
      configurarAviso(tipo, {
        activo: cambios.activo,
        hora: cambios.hora,
        diaSemana: cambios.diaSemana ?? undefined,
      });
    });
  };

  if (estado === "cargando") return <div className="h-[200px]" aria-hidden />;

  const activos = local.filter((a) => a.activo).length;

  return (
    <section className="panel">
      <div className="panel-head">
        <div>
          <h3 className="panel-title">Avisos y seguimiento</h3>
          <p className="label mt-0.5">
            {estado === "activo"
              ? `${equipos} ${equipos === 1 ? "dispositivo" : "dispositivos"} · ${activos} de 4 avisos activos`
              : "Cuatro momentos, cada uno con su propósito"}
          </p>
        </div>
        {estado === "activo" && (
          <span className="label shrink-0 rounded-full border border-accent px-2.5 py-1 text-accent">
            Conectado
          </span>
        )}
      </div>

      <div className="panel-body space-y-5">
        {estado === "no-soportado" && (
          <p className="cuerpo">
            Este navegador no admite notificaciones push. En iPhone funcionan solo si añades la app
            a la pantalla de inicio desde Safari y la abres desde ahí.
          </p>
        )}

        {estado === "sin-claves" && (
          <>
            <p className="cuerpo">El servidor no tiene claves de push. Genéralas una sola vez:</p>
            <pre className="subpanel mono overflow-x-auto p-3 text-[length:var(--t-xs)]">
              npm run push:keys
            </pre>
            <p className="cuerpo">
              Copia lo que imprime a <code className="mono">.env</code>, reinicia el servidor y
              vuelve aquí.
            </p>
          </>
        )}

        {estado === "denegado" && (
          <p className="cuerpo">
            Bloqueaste las notificaciones para este sitio. Reactívalas en los ajustes del navegador
            (candado junto a la dirección → Notificaciones → Permitir) y recarga.
          </p>
        )}

        {estado === "inactivo" && (
          <>
            <p className="cuerpo">
              Conecta este dispositivo para recibir avisos aunque tengas la app cerrada y el móvil
              bloqueado.
            </p>
            <button onClick={conectar} disabled={ocupado} className="btn btn-primary w-full">
              {ocupado ? "Conectando…" : "Conectar este dispositivo"}
            </button>
          </>
        )}

        {estado === "activo" && (
          <>
            <ul className="space-y-3">
              {ORDEN.map((tipo) => {
                const a = local.find((x) => x.tipo === tipo);
                if (!a) return null;
                const def = DEFINICION[tipo];

                return (
                  <li
                    key={tipo}
                    className={`subpanel p-4 transition-colors duration-[var(--dur-base)] ${
                      a.activo ? "border-l-2 border-l-accent" : ""
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p
                          className={`text-[length:var(--t-sm)] font-semibold ${
                            a.activo ? "text-fg" : "text-muted"
                          }`}
                        >
                          {def.nombre}
                        </p>
                        <p className="cuerpo mt-1">{def.proposito}</p>
                      </div>

                      <button
                        role="switch"
                        aria-checked={a.activo}
                        aria-label={`${a.activo ? "Desactivar" : "Activar"} ${def.nombre}`}
                        onClick={() => actualizar(tipo, { activo: !a.activo })}
                        className={`relative h-6 w-11 shrink-0 rounded-full border transition-colors duration-[var(--dur-base)] ${
                          a.activo ? "border-accent bg-accent" : "border-line bg-s3"
                        }`}
                      >
                        <span
                          aria-hidden
                          className="absolute top-1/2 h-4 w-4 -translate-y-1/2 rounded-full transition-all duration-[var(--dur-base)] ease-[var(--ease-spring)]"
                          style={{
                            left: a.activo ? "calc(100% - 1.25rem)" : "0.2rem",
                            background: a.activo ? "var(--bg)" : "var(--muted)",
                          }}
                        />
                      </button>
                    </div>

                    {a.activo && (
                      <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-line pt-3">
                        <label className="label" htmlFor={`hora-${tipo}`}>
                          Hora
                        </label>
                        <input
                          id={`hora-${tipo}`}
                          type="time"
                          value={a.hora}
                          onChange={(e) => actualizar(tipo, { hora: e.target.value })}
                          className="field mono w-32 text-[length:var(--t-sm)]"
                        />

                        {tipo === "REVISION_SEMANAL" && (
                          <>
                            <label className="label" htmlFor={`dia-${tipo}`}>
                              Día
                            </label>
                            <select
                              id={`dia-${tipo}`}
                              value={a.diaSemana ?? 0}
                              onChange={(e) =>
                                actualizar(tipo, { diaSemana: Number(e.target.value) })
                              }
                              className="field w-28 text-[length:var(--t-sm)]"
                            >
                              {DIAS.map((d, i) => (
                                <option key={i} value={i}>
                                  {d}
                                </option>
                              ))}
                            </select>
                          </>
                        )}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>

            <div className="flex gap-3">
              <button onClick={probar} disabled={ocupado} className="btn btn-ghost flex-1">
                Enviar prueba
              </button>
              <button onClick={desconectar} disabled={ocupado} className="btn btn-ghost">
                Desconectar
              </button>
            </div>

            <p className="cuerpo">
              Ningún aviso se envía si no tiene nada útil que decir. El empujón de tarde se calla si
              ya arrancaste el día; la revisión semanal, si no hubo actividad.
            </p>
          </>
        )}

        {aviso && (
          <p className="subpanel mono whitespace-pre-line border-l-2 border-l-accent p-3 text-[length:var(--t-xs)] leading-relaxed">
            {aviso}
          </p>
        )}

        {/* Diagnóstico: sin esto, "no llega nada" es imposible de depurar */}
        <div className="border-t border-line pt-4">
          <button
            onClick={() => (verDiag ? setVerDiag(false) : revisar())}
            className="label transition-colors hover:text-fg"
          >
            {verDiag ? "Ocultar diagnóstico" : "Ver diagnóstico ↓"}
          </button>

          {verDiag && (
            <dl className="subpanel mt-3 divide-y divide-line p-3">
              {Object.entries(diag).map(([k, v]) => (
                <div key={k} className="flex justify-between gap-3 py-1.5">
                  <dt className="label shrink-0">{k}</dt>
                  <dd
                    className={`mono text-right text-[length:var(--t-micro)] ${
                      /NO |AUSENTE|denied|ninguna|no soportado|navegador/.test(v)
                        ? "text-alert"
                        : "text-fg"
                    }`}
                  >
                    {v}
                  </dd>
                </div>
              ))}
            </dl>
          )}
        </div>

        {instalada ? (
          <p className="label border-t border-line pt-4">◆ Estás usando la app instalada</p>
        ) : instalable ? (
          <div className="border-t border-line pt-4">
            <button
              onClick={() => {
                // @ts-expect-error — prompt() existe en BeforeInstallPromptEvent
                instalable.prompt();
                setInstalable(null);
              }}
              className="btn btn-ghost w-full"
            >
              Instalar en este dispositivo
            </button>
          </div>
        ) : (
          <p className="label border-t border-line pt-4">
            Para instalarla: en Chrome, el icono de instalar en la barra de direcciones; en iPhone,
            Compartir → Añadir a pantalla de inicio.
          </p>
        )}
      </div>
    </section>
  );
}
