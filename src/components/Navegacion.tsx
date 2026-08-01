"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const RUTAS = [
  { href: "/", n: "01", nombre: "Hoy" },
  { href: "/metas", n: "02", nombre: "Metas" },
  { href: "/semana", n: "03", nombre: "Semana" },
  { href: "/comidas", n: "04", nombre: "Comidas" },
];

export function Navegacion() {
  const ruta = usePathname();

  return (
    <nav aria-label="Secciones" className="flex gap-4 sm:gap-5">
      {RUTAS.map((r) => {
        const activa = ruta === r.href;
        return (
          <Link
            key={r.href}
            href={r.href}
            aria-current={activa ? "page" : undefined}
            className={`label relative transition-colors duration-[var(--dur-base)] hover:text-fg ${
              activa ? "text-fg" : ""
            }`}
          >
            {r.nombre}
            <sup className={activa ? "text-accent" : ""}>{r.n}</sup>
            {activa && (
              <span
                aria-hidden
                className="absolute -bottom-[13px] left-0 right-0 h-[2px] bg-accent"
              />
            )}
          </Link>
        );
      })}
    </nav>
  );
}
