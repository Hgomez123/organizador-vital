import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { Space_Grotesk, Space_Mono } from "next/font/google";
import { Fondo } from "@/components/Fondo";
import { Navegacion } from "@/components/Navegacion";
import "./globals.css";

const grotesk = Space_Grotesk({ subsets: ["latin"], variable: "--font-grotesk" });
const mono = Space_Mono({ subsets: ["latin"], weight: ["400", "700"], variable: "--font-mono" });

export const metadata: Metadata = {
  title: "Organizador Vital",
  description: "Organiza tu vida: metas, comidas, limpieza, estudio y tiempo libre",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Vital",
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: "/icons/icon-192.png",
    apple: "/icons/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#0d1117",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${grotesk.variable} ${mono.variable}`}>
      <body
        className="min-h-screen antialiased"
        style={{ fontFamily: "var(--font-grotesk), sans-serif" }}
      >
        <Fondo />

        <a
          href="#contenido"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-accent focus:px-4 focus:py-2 focus:text-bg"
        >
          Saltar al contenido
        </a>

        <header className="sticky top-0 z-40 border-b border-line bg-bg/70 backdrop-blur-md">
          <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-5 py-3">
            <Link
              href="/"
              className="shrink-0 text-[length:var(--t-sm)] font-bold uppercase tracking-widest"
            >
              Vital<span className="text-accent">/</span>
            </Link>
            <Navegacion />
          </div>
        </header>

        <div id="contenido" className="relative z-10 mx-auto max-w-3xl px-5 pb-24 pt-8">
          {children}
        </div>

        <footer className="label relative z-10 border-t border-line py-6 text-center">
          Diseña tu vida — un día a la vez
        </footer>
      </body>
    </html>
  );
}
