import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/user";
import { analizar, DOMINIOS, DOMINIO_LABEL } from "@/lib/motor";
import { principiosPara } from "@/lib/principios";
import { TaskItem } from "@/components/TaskItem";
import { NewTaskForm } from "@/components/NewTaskForm";
import { StudyTimer } from "@/components/StudyTimer";
import { RadarVida } from "@/components/RadarVida";
import { Sugerencias } from "@/components/Sugerencias";
import { Planificador } from "@/components/Planificador";
import { Inspiracion } from "@/components/Inspiracion";
import { Vacio } from "@/components/Vacio";
import { Metricas } from "@/components/Metricas";
import { Revelar } from "@/components/Revelar";
import { MarcaFondo } from "@/components/MarcaFondo";
import { Telemetria } from "@/components/Telemetria";
import { Seccion } from "@/components/Seccion";
import { Recordatorios } from "@/components/Recordatorios";
import { asegurarAvisos } from "@/lib/avisos";
import type { TipoAvisoKey } from "@/lib/avisos-def";

/**
 * Esta página depende de la fecha y de datos que cambian a cada rato.
 * Sin esto, Next la prerenderiza en el build y "hoy" queda congelado
 * al día del despliegue.
 */
export const dynamic = "force-dynamic";

const META_HORAS = 10;

function inicioHoy(): Date {
  const d = new Date();
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
}

export default async function Hoy() {
  const user = await getCurrentUser();
  const diaSemana = new Date().getDay();

  const tasks = await prisma.task.findMany({
    where: {
      userId: user.id,
      activa: true,
      OR: [
        { recurrencia: "DIARIA" },
        { recurrencia: "SEMANAL", diasSemana: { has: diaSemana } },
      ],
    },
    include: { logs: { where: { fecha: inicioHoy() } } },
    orderBy: { createdAt: "asc" },
  });

  const hechas = tasks.filter((t) => t.logs[0]?.estado === "HECHO").length;
  const progreso = tasks.length ? Math.round((hechas / tasks.length) * 100) : 0;

  const hace7dias = new Date(Date.now() - 7 * 86_400_000);
  const sesiones = await prisma.studySession.findMany({
    where: { userId: user.id, inicio: { gte: hace7dias }, fin: { not: null } },
  });
  const horasEstudio =
    sesiones.reduce((acc, s) => acc + (s.fin!.getTime() - s.inicio.getTime()) / 60_000, 0) / 60;

  const diag = await analizar(user.id);

  const dispositivos = await prisma.pushSubscription.count({ where: { userId: user.id } });
  const avisos = await asegurarAvisos(user.id);

  const valores = DOMINIOS.map((d) => diag.scorePorDominio[d] ?? 0);
  const media = valores.reduce((a, b) => a + b, 0) / valores.length;
  const desbalance = Math.sqrt(valores.reduce((a, v) => a + (v - media) ** 2, 0) / valores.length);

  const principios = principiosPara({
    cumplimiento: diag.cumplimientoGlobal,
    racha: diag.rachaActual,
    desbalance,
    totalRegistros: diag.totalRegistros,
    horasEstudio,
  }).map(({ cuando: _c, ...resto }) => resto);

  const porDominio = tasks.reduce<Record<string, typeof tasks>>((acc, t) => {
    (acc[t.dominio] ??= []).push(t);
    return acc;
  }, {});

  const fecha = new Date()
    .toLocaleDateString("es", { weekday: "long", day: "numeric", month: "long" })
    .toUpperCase();

  return (
    <main className="space-y-[var(--sp-section)]">
      {/* Marca gigante: su arco es el progreso real de hoy */}
      <MarcaFondo progreso={progreso} />

      {/* ═══ Portada ═══ */}
      <section className="fade-up flex min-h-[55vh] flex-col justify-center">
        <p className="mono text-[length:var(--t-xs)] tracking-[0.3em] text-muted">{fecha}</p>
        <h1 className="mt-2 text-[length:var(--t-display)] font-bold uppercase leading-[var(--lh-display)] tracking-tight">
          Hoy<span className="text-accent">.</span>
        </h1>
        <p className="mt-5 max-w-md text-[length:var(--t-sm)] leading-relaxed text-muted">
          {hechas} de {tasks.length} tareas hechas. El anillo del fondo se cierra contigo.
        </p>
        <p className="label mt-10" aria-hidden>
          ↓ desliza
        </p>
      </section>

      {/* ═══ Acto 1 — Tu día ═══ */}
      <Revelar>
        <Seccion
          etiqueta="Tu día"
          titulo="Lo que toca hoy"
          lede="Marca lo hecho en un toque. El resto de la app se alimenta de estos registros."
        >
          {tasks.length === 0 ? (
            <Vacio
              titulo="Hoy no tienes nada agendado"
              detalle="Puede ser intencional — un día sin obligaciones también es una decisión. Si no lo es, baja al planificador y descríbeme qué quieres cambiar."
            />
          ) : (
            Object.entries(porDominio).map(([dominio, items]) => (
              <div key={dominio}>
                <div className="mb-2 flex items-baseline justify-between">
                  <h3 className="label">{DOMINIO_LABEL[dominio]}</h3>
                  <span className="label">
                    {items.filter((t) => t.logs[0]?.estado === "HECHO").length}/{items.length}
                  </span>
                </div>
                <ul className="divide-y divide-line overflow-hidden rounded-[var(--r-md)] border border-line">
                  {items.map((t, i) => (
                    <TaskItem
                      key={t.id}
                      id={t.id}
                      index={i}
                      titulo={t.titulo}
                      duracionMin={t.duracionMin}
                      estado={t.logs[0]?.estado ?? null}
                    />
                  ))}
                </ul>
              </div>
            ))
          )}
        </Seccion>
      </Revelar>

      <Revelar retraso={40}>
        <StudyTimer />
      </Revelar>

      {/* ═══ Acto 2 — Diagnóstico ═══ */}
      <Revelar>
        <Seccion
          etiqueta="Diagnóstico"
          titulo="Cómo vas de verdad"
          lede="No cómo se sintió la semana: qué pasó. Números de 21 días y los ajustes que el motor propone."
        >
          <Metricas
            progresoHoy={progreso}
            hechas={hechas}
            totalHoy={tasks.length}
            cumplimiento={diag.cumplimientoGlobal}
            racha={diag.rachaActual}
            horasEstudio={horasEstudio}
            metaHoras={META_HORAS}
          />
          <Sugerencias items={diag.sugerencias} />
          <RadarVida
            scores={diag.scorePorDominio}
            labels={DOMINIO_LABEL}
            dominios={DOMINIOS}
            hayDatos={diag.totalRegistros >= 5}
          />
        </Seccion>
      </Revelar>

      {/* ═══ Acto 3 — Diseña ═══ */}
      <Revelar>
        <Seccion
          etiqueta="Diseña"
          titulo="Ajusta el rumbo"
          lede="Describe qué quieres cambiar o añade una tarea puntual. Un principio para cerrar."
        >
          <Planificador />
          <NewTaskForm />
          <Recordatorios
            clavePublica={process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || null}
            avisos={avisos.map((a) => ({
              tipo: a.tipo as TipoAvisoKey,
              activo: a.activo,
              hora: a.hora,
              diaSemana: a.diaSemana,
            }))}
            dispositivos={dispositivos}
          />
          <Inspiracion items={principios} />
        </Seccion>
      </Revelar>

      {/* ═══ Cierre: telemetría como colofón, no como protagonista ═══ */}
      <Revelar retraso={60}>
        <Telemetria />
      </Revelar>
    </main>
  );
}
