"use client"

import * as React from "react"
import Link from "next/link"
import { JornadaLogo } from "@/components/ui/jornada-logo"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Mail, Moon, Sun } from "lucide-react"

const sectionLinks = [
  { label: "Diagnóstico", href: "#" },
  { label: "Calendario", href: "#" },
  { label: "Alcance", href: "#" },
  { label: "Preguntas", href: "#preguntas" },
  { label: "Contacto", href: "#contacto" },
]

const productLinks = [
  { label: "Entrar", href: "/login" },
  { label: "Crear cuenta", href: "/registro" },
  { label: "Panel", href: "/dashboard" },
]

function Footerdemo() {
  const [isDarkMode, setIsDarkMode] = React.useState(true)

  React.useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add("dark")
    } else {
      document.documentElement.classList.remove("dark")
    }
  }, [isDarkMode])

  return (
    <footer className="relative border-t bg-background text-foreground transition-colors duration-300">
      <div className="container mx-auto px-4 py-12 md:px-6 lg:px-8">
        <div className="grid gap-12 md:grid-cols-2 lg:grid-cols-4">
          <div className="relative">
            <div className="mb-4 flex flex-col gap-1">
              <JornadaLogo size={28} animated={false} className="text-foreground" />
              <span className="text-xs text-muted-foreground">by AIvena</span>
            </div>
            <p className="mb-6 text-sm text-muted-foreground">
              Reacomoda los turnos de tu sucursal con los mismos contratos y
              cumple la jornada de 40 horas.
            </p>
            <address className="space-y-2 text-sm not-italic">
              <p>AIvena Inc. · Ciudad de México</p>
              <a
                href="mailto:contacto@aivena.ai"
                className="inline-flex items-center gap-2 transition-colors hover:text-primary"
              >
                <Mail className="h-4 w-4" aria-hidden="true" />
                contacto@aivena.ai
              </a>
            </address>
            <div className="absolute -right-4 top-0 h-24 w-24 rounded-full bg-primary/10 blur-2xl" />
          </div>
          <div>
            <h3 className="mb-4 text-lg font-semibold">Secciones</h3>
            <nav className="space-y-2 text-sm">
              {sectionLinks.map(({ label, href }) => (
                <a
                  key={label}
                  href={href}
                  className="block transition-colors hover:text-primary"
                >
                  {label}
                </a>
              ))}
            </nav>
          </div>
          <div>
            <h3 className="mb-4 text-lg font-semibold">Producto</h3>
            <nav className="space-y-2 text-sm">
              {productLinks.map(({ label, href }) => (
                <Link
                  key={label}
                  href={href}
                  className="block transition-colors hover:text-primary"
                >
                  {label}
                </Link>
              ))}
            </nav>
          </div>
          <div className="relative">
            <h3 className="mb-4 text-lg font-semibold">Tema</h3>
            <div className="flex items-center space-x-2">
              <Sun className="h-4 w-4" />
              <Switch
                id="dark-mode"
                checked={isDarkMode}
                onCheckedChange={setIsDarkMode}
              />
              <Moon className="h-4 w-4" />
              <Label htmlFor="dark-mode" className="sr-only">
                Cambiar tema
              </Label>
            </div>
          </div>
        </div>
        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t pt-8 text-center md:flex-row md:text-left">
          <p className="text-sm text-muted-foreground">
            © 2026 · Todos los derechos reservados
          </p>
          <p className="max-w-xl text-xs text-muted-foreground md:text-right">
            Cifras: sucursal sintética Coapa, 30 colaboradores, calculadas por
            el motor de Jornada40. Ningún cliente real.
          </p>
        </div>
      </div>
    </footer>
  )
}

export { Footerdemo }
