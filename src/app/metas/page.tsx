import Link from "next/link";
import { getCurrentUser } from "@/lib/user";
import { resumenMetas } from "@/lib/metas";
import { MetaCard } from "@/components/MetaCard";
import { Vacio } from "@/components/Vacio";
import { Revelar } from "@/components/Revelar";
import { Seccion } from "@/components/Seccion";

export const metadata = { title: "Metas · Organizador Vital" };

/** Depende de la fecha actual y de registros que cambian: nunca estática. */
export const dynamic = "force-dynamic";

export default async function MetasPage() {
  const user = await getCurrentUser();
  const metas = await resumenMetas(user.id);

  const activas = metas.filter((m) => m.totalTareas > 0);
  const rachaMejor = metas.reduce((a, m) => Math.max(a, m.desafio?.rachaMaxima ?? 0), 0);
  const promedio = activas.length
    ? Math.round(activas.reduce((a, m) => a + m.progreso, 0) / activas.length)
    : 0;

  return (
    <main className="space-y-[var(--sp-section)]">
      <section className="fade-up">
        <p className="mono text-[length:var(--t-xs)] tracking-[0.3em] text-muted">
          ( Metas · 02 )
        </p>
        <h1 className="mt-2 text-[length:var(--t-display)] font-bold uppercase leading-[var(--lh-display)] tracking-tight">
          Metas<span className="text-accent">.</span>
        </h1>
        <p className="cuerpo mt-5 max-w-md">
          {activas.length
            ? `${activas.length} ${activas.length === 1 ? "meta activa" : "metas activas"} · ${promedio}% de cumplimiento promedio · mejor racha de ${rachaMejor} días.`
            : "Aquí viven tus objetivos y sus desafíos. El progreso se calcula desde tus registros reales, no desde lo que declaras."}
        </p>
      </section>

      <Revelar>
        <Seccion
          etiqueta="En curso"
          titulo="Tus objetivos"
          lede="Cada meta muestra su cumplimiento real, la racha del desafío y el calendario de constancia de las últimas 4 semanas."
        >
          {activas.length === 0 ? (
            <Vacio
              titulo="Todavía no tienes metas con tareas"
              detalle="Las metas nacen del planificador: describes qué quieres cambiar y se crean junto con sus tareas y un desafío de 21 días."
              accion={
                <Link href="/" className="btn btn-primary">
                  Ir al planificador →
                </Link>
              }
            />
          ) : (
            activas.map((m) => <MetaCard key={m.id} meta={m} />)
          )}
        </Seccion>
      </Revelar>

      {/* Metas sin tareas: existen pero no se pueden cumplir */}
      {metas.length > activas.length && (
        <Revelar retraso={40}>
          <Seccion
            etiqueta="Sin actividad"
            titulo="Metas sin tareas"
            lede="Una meta sin tareas es una intención, no un plan. No hay nada que marcar, así que no puede progresar."
          >
            <ul className="divide-y divide-line overflow-hidden rounded-[var(--r-md)] border border-line">
              {metas
                .filter((m) => m.totalTareas === 0)
                .map((m) => (
                  <li key={m.id} className="bg-s1 px-4 py-4">
                    <p className="text-[length:var(--t-base)] font-medium">{m.titulo}</p>
                    <p className="label mt-0.5">
                      {m.valorObjetivo} {m.metrica} · sin tareas asociadas
                    </p>
                  </li>
                ))}
            </ul>
          </Seccion>
        </Revelar>
      )}
    </main>
  );
}
