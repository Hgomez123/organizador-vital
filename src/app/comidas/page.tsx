import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/user";
import { lunesDe, menuSemana, listaCompras } from "@/lib/comidas";
import { MenuSemanal } from "@/components/MenuSemanal";
import { ListaCompras } from "@/components/ListaCompras";
import { Recetario } from "@/components/Recetario";
import { Revelar } from "@/components/Revelar";
import { Seccion } from "@/components/Seccion";

export const metadata = { title: "Comidas · Organizador Vital" };

/** El menú corresponde a la semana en curso: nunca estática. */
export const dynamic = "force-dynamic";

export default async function ComidasPage() {
  const user = await getCurrentUser();
  const semana = lunesDe();
  const semanaISO = semana.toISOString();

  const [casillas, items, recetas] = await Promise.all([
    menuSemana(user.id, semana),
    listaCompras(user.id, semana),
    prisma.recipe.findMany({ where: { userId: user.id }, orderBy: { nombre: "asc" } }),
  ]);

  const fin = new Date(semana);
  fin.setUTCDate(fin.getUTCDate() + 6);
  const fmt = (d: Date) =>
    d.toLocaleDateString("es", { day: "numeric", month: "short", timeZone: "UTC" });
  const rango = `${fmt(semana)} – ${fmt(fin)}`;

  const planeadas = casillas.filter((c) => c.nombre).length;

  return (
    <main className="space-y-[var(--sp-section)]">
      <section className="fade-up">
        <p className="mono text-[length:var(--t-xs)] tracking-[0.3em] text-muted">
          ( Comidas · {rango} )
        </p>
        <h1 className="mt-2 text-[length:var(--t-display)] font-bold uppercase leading-[var(--lh-display)] tracking-tight">
          Comidas<span className="text-accent">.</span>
        </h1>
        <p className="cuerpo mt-5 max-w-md">
          {planeadas > 0
            ? `${planeadas} de 21 comidas planeadas. La lista de compras se arma sola con lo que decidas.`
            : "Decide una vez qué vas a comer y deja de decidirlo cada día a las siete de la tarde con hambre."}
        </p>
      </section>

      <Revelar>
        <Seccion
          etiqueta="Planificación"
          titulo="Qué se come esta semana"
          lede="Tres comidas por día. Toca cualquier casilla para asignarle una receta del recetario."
        >
          <MenuSemanal
            semanaISO={semanaISO}
            casillas={casillas}
            recetas={recetas.map((r) => ({ id: r.id, nombre: r.nombre, minutos: r.minutos }))}
            rango={rango}
          />
        </Seccion>
      </Revelar>

      <Revelar retraso={40}>
        <Seccion
          etiqueta="Compras"
          titulo="Lo que hay que llevar"
          lede="Ingredientes agrupados por sección del supermercado, sin repetidos. Marca lo que vayas tomando."
        >
          <ListaCompras items={items} />
        </Seccion>
      </Revelar>

      <Revelar>
        <Seccion
          etiqueta="Recetario"
          titulo="Tu repertorio"
          lede="No necesitas la receta completa: el nombre y los ingredientes bastan para que todo lo demás funcione."
        >
          <Recetario recetas={recetas} />
        </Seccion>
      </Revelar>
    </main>
  );
}
