# Organizador Vital

App web (PWA-ready) para organizar tu vida: comidas, limpieza, estudio, tiempo libre y metas, con seguimiento diario.

**Stack:** Next.js 15 (App Router + Server Actions) · TypeScript · Prisma · PostgreSQL (Docker) · Tailwind CSS 4

## Requisitos

- Node.js 20+
- Docker Desktop

## Puesta en marcha

```bash
npm install
cp .env.example .env
npm run db:up        # levanta Postgres en Docker
npm run db:migrate   # crea las tablas (nombra la migración "init")
npm run db:seed      # usuario + tareas de ejemplo
npm run dev          # http://localhost:3000
```

## Qué incluye (Fase 1)

- **Pantalla "Hoy"**: tareas del día agrupadas por dominio, barra de progreso, marcar hecho/saltado en un toque.
- **Tareas recurrentes**: diarias o por días de la semana.
- **Temporizador de estudio**: pomodoros de 25 min con notificación del navegador; cada sesión queda registrada y suma a tus horas semanales.
- **Modo personal**: sin login (usuario definido en `.env`). La capa `src/lib/user.ts` está lista para reemplazarse por NextAuth.

## Estructura

```
prisma/schema.prisma   # modelo completo (incluye Goal, Challenge para Fase 2)
src/app/page.tsx       # pantalla "Hoy" (server component)
src/app/actions.ts     # server actions (marcar, crear, registrar estudio)
src/components/        # TaskItem, NewTaskForm, StudyTimer (client)
src/lib/               # prisma singleton, usuario actual
```

## Siguientes pasos (roadmap)

1. **Metas y desafíos**: UI sobre los modelos `Goal`/`Challenge` ya existentes (rachas).
2. **PWA**: `manifest.json` + service worker → instalable y push notifications.
3. **Revisión semanal**: cron (Vercel Cron o node-cron) que resume la semana y sugiere ajustes (API de Claude).
4. **Correo**: Resend para el resumen semanal. SMS con Twilio solo para avisos críticos.
5. **Auth**: NextAuth cuando pases a multi-usuario.
6. **Móvil**: envolver con Capacitor.
