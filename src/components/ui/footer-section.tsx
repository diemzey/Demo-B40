import Link from "next/link";
import { Mail } from "lucide-react";
import { JornadaLogo } from "@/components/ui/jornada-logo";

/** Anclas reales de `src/app/page.tsx`; ver `header.tsx`. */
const sectionLinks = [
  { label: "Cómo funciona", href: "#como-funciona" },
  { label: "Preguntas", href: "#preguntas" },
  { label: "Contacto", href: "#contacto" },
];

const productLinks = [
  { label: "Entrar", href: "/login" },
  { label: "Crear cuenta", href: "/registro" },
  { label: "Mi panel", href: "/dashboard" },
  { label: "Aviso de privacidad", href: "/privacidad" },
];

/**
 * Pie de la portada. Sin selector de tema: el sitio es oscuro (la clase
 * `dark` la pone el layout raíz) y el interruptor prometía un tema claro que
 * la app no soporta.
 */
function Footerdemo() {
  return (
    <footer className="relative border-t bg-background text-foreground">
      <div className="container mx-auto px-4 py-12 md:px-6 lg:px-8">
        <div className="grid gap-12 md:grid-cols-3">
          <div className="relative">
            <div className="mb-4 flex flex-col gap-1">
              <JornadaLogo size={28} animated={false} className="text-foreground" />
              <span className="text-xs text-muted-foreground">by AIvena</span>
            </div>
            <p className="mb-6 text-sm text-muted-foreground">
              Tus turnos, con la misma gente, dentro del tope de 40 h.
            </p>
            <address className="space-y-2 text-sm not-italic">
              <p>AIvena Inc. · Ciudad de México</p>
              <a
                href="mailto:contacto@aivena.ai"
                className="inline-flex min-h-10 items-center gap-2 rounded-md transition-colors outline-none hover:text-primary focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Mail className="size-4" aria-hidden="true" />
                contacto@aivena.ai
              </a>
            </address>
            <div className="absolute top-0 -right-4 size-24 rounded-full bg-primary/10 blur-2xl" aria-hidden="true" />
          </div>
          <div>
            <h3 className="mb-4 text-lg font-semibold">Secciones</h3>
            <nav aria-label="Secciones de la portada" className="space-y-1 text-sm">
              {sectionLinks.map(({ label, href }) => (
                <a
                  key={label}
                  href={href}
                  className="flex min-h-9 items-center rounded-md transition-colors outline-none hover:text-primary focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {label}
                </a>
              ))}
            </nav>
          </div>
          <div>
            <h3 className="mb-4 text-lg font-semibold">Producto</h3>
            <nav aria-label="Producto" className="space-y-1 text-sm">
              {productLinks.map(({ label, href }) => (
                <Link
                  key={label}
                  href={href}
                  className="flex min-h-9 items-center rounded-md transition-colors outline-none hover:text-primary focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {label}
                </Link>
              ))}
            </nav>
          </div>
        </div>
        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t pt-8 text-center md:flex-row md:text-left">
          <p className="text-sm text-muted-foreground">© 2026 · Todos los derechos reservados</p>
          <p className="max-w-xl text-xs text-muted-foreground md:text-right">
            Cifras de una sucursal de ejemplo de 30 colaboradores, calculadas por el motor de Jornada40. No es un
            cliente real.
          </p>
        </div>
      </div>
    </footer>
  );
}

export { Footerdemo };
