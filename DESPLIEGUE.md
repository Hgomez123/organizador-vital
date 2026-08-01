# Despliegue — avisos que funcionan solos

Para que los avisos salgan sin tu Mac encendido hacen falta tres piezas:

| Pieza | Servicio | Coste |
|---|---|---|
| Base de datos en la nube | Neon | Gratis |
| La app | Vercel | Gratis (Hobby) |
| Programador cada 15 min | GitHub Actions | Gratis |

**Por qué GitHub Actions y no el cron de Vercel:** el plan Hobby de Vercel solo admite crons **diarios**; una expresión como `*/15 * * * *` hace fallar el despliegue. GitHub Actions no tiene ese límite.

---

## 1. Base de datos en la nube

Tu Postgres vive en Docker, en tu Mac. Vercel no puede alcanzarlo.

1. Entra a [neon.com](https://neon.com) y crea una cuenta.
2. Crea un proyecto — región la más cercana a ti.
3. Copia la **connection string** (empieza con `postgresql://`).

Aplica el esquema a esa base desde tu Mac:

```bash
cd ~/Desktop/DISCP/organizador
DATABASE_URL="pega-aqui-la-cadena-de-neon" npx prisma migrate deploy
DATABASE_URL="pega-aqui-la-cadena-de-neon" npm run db:seed
```

## 2. Subir el código a GitHub

```bash
cd ~/Desktop/DISCP/organizador
git init
git add .
git commit -m "Organizador Vital"
```

Crea un repositorio **privado** en [github.com/new](https://github.com/new) (sin README ni .gitignore) y sigue las instrucciones de "push an existing repository".

Verifica antes que `.env` **no** viaje:

```bash
git status --short | grep "\.env$"
```

No debe devolver nada. Si aparece, está mal el `.gitignore`.

## 3. Desplegar en Vercel

1. Entra a [vercel.com](https://vercel.com) con tu cuenta de GitHub.
2. **Add New → Project** → importa el repositorio.
3. Antes de desplegar, abre **Environment Variables** y añade:

| Variable | Valor |
|---|---|
| `DATABASE_URL` | la cadena de Neon |
| `DEFAULT_USER_EMAIL` | tu correo, el mismo del seed |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | de tu `.env` |
| `VAPID_PRIVATE_KEY` | de tu `.env` |
| `VAPID_SUBJECT` | `mailto:tu-correo` |
| `CRON_SECRET` | de tu `.env` |
| `ANTHROPIC_API_KEY` | opcional, para el planificador con IA |

4. **Deploy**. Al terminar tendrás una URL tipo `https://organizador-vital.vercel.app`.

## 4. Activar el programador

En tu repositorio de GitHub → **Settings → Secrets and variables → Actions → New repository secret**:

| Secreto | Valor |
|---|---|
| `APP_URL` | tu URL de Vercel, sin barra final |
| `CRON_SECRET` | el mismo que pusiste en Vercel |

Luego ve a la pestaña **Actions**, elige *Programador de avisos* y pulsa **Run workflow** para probarlo a mano. Deberías ver la respuesta JSON en el log.

A partir de ahí corre solo cada 15 minutos.

## 5. Conectar tu móvil

1. Abre la URL de Vercel en el móvil.
2. **Android/Chrome:** menú → Instalar aplicación.
   **iPhone/Safari:** Compartir → Añadir a pantalla de inicio. *(En iPhone el push solo funciona abriendo la app desde ese icono, no desde Safari — es una restricción de Apple.)*
3. Abre la app instalada, baja a **Avisos y seguimiento**, pulsa **Conectar este dispositivo** y activa los momentos que quieras.

---

## Comprobar que funciona

```bash
curl -H "authorization: Bearer TU_CRON_SECRET" \
  "https://tu-app.vercel.app/api/cron/recordatorios?forzar=1"
```

La respuesta te dice, aviso por aviso, si envió u omitió y por qué.

## Notas

- **Neon suspende la base** tras unos minutos sin uso en el plan gratuito. La primera petición tras el reposo tarda uno o dos segundos; las siguientes van normales.
- **Las claves VAPID no se cambian.** Si las regeneras, todos los dispositivos suscritos dejan de recibir avisos y hay que volver a conectarlos.
- **GitHub Actions puede retrasarse** unos minutos cuando la plataforma tiene carga. Por eso el endpoint acepta una ventana de 20 minutos en vez de exigir la hora exacta.
- **Repositorio privado:** los minutos de Actions son limitados pero holgados para esto (unas 2 800 ejecuciones al mes de pocos segundos cada una). En repos públicos es ilimitado.
