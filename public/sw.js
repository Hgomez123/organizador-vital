/**
 * SERVICE WORKER — Organizador Vital
 *
 * Tres responsabilidades:
 *  1. Cachear el armazón para que la app abra sin conexión.
 *  2. Mostrar notificaciones programadas aunque la pestaña esté cerrada.
 *  3. Enfocar la ventana existente al tocar una notificación.
 *
 * Estrategia de red: "network first" para navegación (los datos cambian
 * a cada rato y una vista cacheada mentiría), "cache first" solo para
 * estáticos inmutables.
 */

const VERSION = "v4";
const CACHE_APP = `vital-app-${VERSION}`;
const ARMAZON = ["/", "/semana", "/comidas", "/metas", "/manifest.webmanifest", "/icons/icon-192.png"];

self.addEventListener("install", (evento) => {
  evento.waitUntil(
    caches.open(CACHE_APP).then((c) => c.addAll(ARMAZON)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (evento) => {
  evento.waitUntil(
    caches
      .keys()
      .then((claves) =>
        Promise.all(claves.filter((k) => k !== CACHE_APP).map((k) => caches.delete(k)))
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (evento) => {
  const req = evento.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Navegación: primero la red; si falla, lo último cacheado
  if (req.mode === "navigate") {
    evento.respondWith(
      fetch(req)
        .then((res) => {
          const copia = res.clone();
          caches.open(CACHE_APP).then((c) => c.put(req, copia));
          return res;
        })
        .catch(() => caches.match(req).then((r) => r || caches.match("/")))
    );
    return;
  }

  // Estáticos: caché primero
  if (url.pathname.startsWith("/icons/") || url.pathname.startsWith("/_next/static/")) {
    evento.respondWith(
      caches.match(req).then(
        (hit) =>
          hit ||
          fetch(req).then((res) => {
            const copia = res.clone();
            caches.open(CACHE_APP).then((c) => c.put(req, copia));
            return res;
          })
      )
    );
  }
});

/* ── Recordatorios programados desde la página ── */

const temporizadores = new Map();

self.addEventListener("message", (evento) => {
  const datos = evento.data || {};

  if (datos.tipo === "PROGRAMAR") {
    // datos: { id, titulo, cuerpo, enMs }
    if (temporizadores.has(datos.id)) clearTimeout(temporizadores.get(datos.id));
    const t = setTimeout(() => {
      self.registration.showNotification(datos.titulo, {
        body: datos.cuerpo,
        icon: "/icons/icon-192.png",
        badge: "/icons/icon-192.png",
        tag: datos.id,
        renotify: true,
        data: { url: datos.url || "/" },
        vibrate: [90, 50, 90],
      });
      temporizadores.delete(datos.id);
    }, Math.max(datos.enMs, 0));
    temporizadores.set(datos.id, t);
  }

  if (datos.tipo === "CANCELAR" && temporizadores.has(datos.id)) {
    clearTimeout(temporizadores.get(datos.id));
    temporizadores.delete(datos.id);
  }
});

/* ── Push del servidor ──
   Llega aunque el navegador esté cerrado: el sistema operativo despierta
   al service worker cuando el servicio de push entrega el mensaje. */
self.addEventListener("push", (evento) => {
  let carga = { titulo: "Organizador Vital", cuerpo: "Tienes tareas pendientes hoy.", url: "/" };
  try {
    if (evento.data) carga = { ...carga, ...evento.data.json() };
  } catch {
    /* payload no-JSON: se usan los valores por defecto */
  }
  evento.waitUntil(
    self.registration.showNotification(carga.titulo, {
      body: carga.cuerpo,
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      tag: "recordatorio-diario", // reemplaza el anterior en vez de apilarse
      renotify: true,
      data: { url: carga.url },
      // Sin `actions` ni `vibrate`: Safari en iOS no los admite y puede
      // descartar la notificación entera si aparecen.
    })
  );
});

/* Si el navegador rota las claves, hay que volver a suscribirse o el
   dispositivo deja de recibir avisos en silencio. */
self.addEventListener("pushsubscriptionchange", (evento) => {
  evento.waitUntil(
    self.registration.pushManager
      .subscribe(evento.oldSubscription?.options)
      .then((sub) =>
        fetch("/api/push/subscribe", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ suscripcion: sub.toJSON() }),
        })
      )
      .catch(() => {})
  );
});

self.addEventListener("notificationclick", (evento) => {
  evento.notification.close();
  const destino = evento.notification.data?.url || "/";
  evento.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((ventanas) => {
      for (const v of ventanas) {
        if ("focus" in v) {
          v.navigate?.(destino);
          return v.focus();
        }
      }
      return self.clients.openWindow(destino);
    })
  );
});
