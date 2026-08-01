import { getCurrentUser } from "@/lib/user";
import { analizarSemana } from "@/lib/semana";
import { DOMINIOS, DOMINIO_LABEL } from "@/lib/motor";
import { MapaCalor } from "@/components/MapaCalor";
import { Anillo } from "@/components/Anillo";
import { Contador } from "@/components/Contador";
import { Vacio } from "@/components/Vacio";
import { Revelar } from "@/components/Revelar";
import { Seccion } from "@/components/Seccion";

export const metadata = { title: "Semana · Organizador Vital" };

/** La semana en curso se calcula desde la fecha actual: nunca estática. */
export const dynamic = "force-dynamic";

const NOMBRE_DIA = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];

export default async function SemanaPage() {
  const user = await getCurrentUser();
  const s = await analizarSemana(user.id);

  const fmt = (d: Date) =>
    d.toLocaleDateString("es", { day: "numeric", month: "short", timeZone: "UTC" });
  const rango = `${fmt(s.inicio)} – ${fmt(s.fin)}`;
  const horas = (s.minutosEstudio / 60).toFixed(1);
  const diasVividos = s.dias.filter((d) => !d.esFuturo).length;

  // Cierre de semana: lectura honesta de lo ocurrido
  const cierre: string[] = [];
  if (s.totalAplicables === 0) {
    cierre.push(
      "Esta semana no tenías tareas activas, así que no hay nada que evaluar. Un registro vacío no es un mal resultado: es ausencia de datos."
    );
  } else {
    cierre.push(
      `Cumpliste ${s.totalHechas} de ${s.totalAplicables} oportunidades en ${diasVividos} ${diasVividos === 1 ? "día" : "días"} transcurridos.`
    );
    if (s.deltaSemanaPrevia !== null) {
      cierre.push(
        s.deltaSemanaPrevia > 3
          ? `Vas ${s.deltaSemanaPrevia} puntos por encima de la semana pasada. La mejora sostenida importa más que cualquier semana perfecta aislada.`
          : s.deltaSemanaPrevia < -3
            ? `Vas ${Math.abs(s.deltaSemanaPrevia)} puntos por debajo de la semana pasada. Antes de exigirte más, revisa si el plan cabe en la semana que realmente tienes.`
            : "Estás prácticamente igual que la semana pasada. La constancia sin picos es la base sobre la que después se puede subir."
      );
    }
    if (s.peorDia && s.peorDia.tasa !== null && s.peorDia.tasa < 0.5) {
      cierre.push(
        `El ${NOMBRE_DIA[s.peorDia.dia]} fue tu día más flojo (${Math.round(s.peorDia.tasa * 100)}%). Si se repite, no es casualidad: es que ese día tu plan no coincide con tu vida.`
      );
    }
    if (s.mejorDia && s.mejorDia.tasa !== null && s.mejorDia.tasa >= 0.9) {
      cierre.push(
        `El ${NOMBRE_DIA[s.mejorDia.dia]} lo resolviste al ${Math.round(s.mejorDia.tasa * 100)}%. Ese día tiene algo que funciona — vale la pena mover ahí lo que se te cae.`
      );
    }
  }

  return (
    <main className="space-y-[var(--sp-section)]">
      <section className="fade-up">
        <p className="mono text-[length:var(--t-xs)] tracking-[0.3em] text-muted">
          ( Semana · {rango} )
        </p>
        <h1 className="mt-2 text-[length:var(--t-display)] font-bold uppercase leading-[var(--lh-display)] tracking-tight">
          Semana<span className="text-accent">.</span>
        </h1>
        <p className="cuerpo mt-5 max-w-md">
          Los siete días completos, dominio por dominio. Aquí se ve el patrón que un solo día
          nunca muestra.
        </p>
      </section>

      <Revelar>
        <Seccion
          etiqueta="Resumen"
          titulo="Cómo va la semana"
          lede="Solo cuentan los días transcurridos. Lo que aún no llega no se promedia."
        >
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <div className="panel panel-interactivo flex flex-col items-center gap-2 p-4">
              <Anillo
                tam={92}
                trazas={[
                  { nombre: "Cumplimiento semanal", valor: s.cumplimiento, color: "var(--accent)" },
                ]}
              >
                <span className="text-xl font-bold tabular-nums leading-none">
                  <Contador valor={s.cumplimiento} />
                  <span className="text-xs text-accent">%</span>
                </span>
              </Anillo>
              <div className="text-center">
                <p className="label">Cumplimiento</p>
                <p className="text-[length:var(--t-micro)] text-muted">
                  {s.totalHechas}/{s.totalAplicables}
                </p>
              </div>
            </div>

            <div className="panel panel-interactivo flex flex-col items-center justify-center gap-2 p-4">
              <p className="text-4xl font-bold tabular-nums leading-none">
                <Contador valor={s.minutosEstudio / 60} decimales={1} />
                <span className="text-xl text-accent-2">h</span>
              </p>
              <div className="text-center">
                <p className="label">Estudio</p>
                <p className="text-[length:var(--t-micro)] text-muted">en esta semana</p>
              </div>
            </div>

            <div className="panel panel-interactivo col-span-2 flex flex-col items-center justify-center gap-2 p-4 sm:col-span-1">
              <p className="text-4xl font-bold tabular-nums leading-none">
                {s.deltaSemanaPrevia === null ? (
                  <span className="text-muted">—</span>
                ) : (
                  <>
                    <span className={s.deltaSemanaPrevia >= 0 ? "text-accent" : "text-alert"}>
                      {s.deltaSemanaPrevia >= 0 ? "+" : ""}
                      {s.deltaSemanaPrevia}
                    </span>
                    <span className="text-xl text-muted">pts</span>
                  </>
                )}
              </p>
              <div className="text-center">
                <p className="label">Vs. semana previa</p>
                <p className="text-[length:var(--t-micro)] text-muted">
                  {s.deltaSemanaPrevia === null ? "sin datos previos" : "puntos porcentuales"}
                </p>
              </div>
            </div>
          </div>
        </Seccion>
      </Revelar>

      <Revelar retraso={40}>
        <Seccion
          etiqueta="Patrón"
          titulo="Dónde se sostiene y dónde se cae"
          lede="Una fila que se apaga hacia la derecha es un dominio que abandonas a mitad de semana."
        >
          {s.totalAplicables === 0 ? (
            <Vacio
              titulo="Sin tareas esta semana"
              detalle="No hay actividad registrada en estos siete días. Crea tareas recurrentes y el mapa empezará a dibujarse solo."
            />
          ) : (
            <MapaCalor
              celdas={s.celdas}
              dias={s.dias}
              dominios={DOMINIOS}
              labels={DOMINIO_LABEL}
            />
          )}
        </Seccion>
      </Revelar>

      <Revelar>
        <Seccion
          etiqueta="Cierre"
          titulo="Lectura de la semana"
          lede="Lo que dicen los números, sin adornos ni consuelo."
        >
          <div className="panel panel-body space-y-3">
            {cierre.map((p, i) => (
              <p key={i} className="cuerpo">
                {p}
              </p>
            ))}
          </div>
        </Seccion>
      </Revelar>
    </main>
  );
}
