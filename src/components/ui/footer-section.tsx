"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Moon, Send, Sun } from "lucide-react"

type IconProps = React.SVGProps<SVGSVGElement>

// Brand icons are no longer shipped by lucide-react, so they are inlined here.
const Facebook = (props: IconProps) => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
    <path d="M24 12.07C24 5.41 18.63 0 12 0S0 5.4 0 12.07C0 18.1 4.39 23.1 10.13 24v-8.44H7.08v-3.49h3.04V9.41c0-3.02 1.8-4.7 4.54-4.7 1.31 0 2.68.24 2.68.24v2.97h-1.5c-1.5 0-1.96.93-1.96 1.89v2.26h3.32l-.53 3.5h-2.8V24C19.62 23.1 24 18.1 24 12.07" />
  </svg>
)

const Twitter = (props: IconProps) => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
    <path d="M18.9 1.15h3.68l-8.04 9.19L24 22.85h-7.41l-5.8-7.58-6.64 7.58H.47l8.6-9.83L0 1.15h7.6l5.24 6.93 6.06-6.93Zm-1.29 19.5h2.04L6.48 3.24H4.3l13.31 17.41Z" />
  </svg>
)

const Instagram = (props: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
    <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
  </svg>
)

const Linkedin = (props: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
    <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
    <rect width="4" height="12" x="2" y="9" />
    <circle cx="4" cy="4" r="2" />
  </svg>
)

const socialLinks = [
  { name: "Facebook", tooltip: "Síguenos en Facebook", Icon: Facebook },
  { name: "X", tooltip: "Síguenos en X", Icon: Twitter },
  { name: "Instagram", tooltip: "Síguenos en Instagram", Icon: Instagram },
  { name: "LinkedIn", tooltip: "Conecta en LinkedIn", Icon: Linkedin },
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
            <div className="mb-4 flex items-baseline gap-3">
              <h2 className="text-3xl font-bold tracking-tight">Jornada40</h2>
              <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                AIvena
              </span>
            </div>
            <p className="mb-6 text-muted-foreground">
              Novedades de la reforma y del producto, sin ruido.
            </p>
            <form className="relative" onSubmit={(e) => e.preventDefault()}>
              <Input
                type="email"
                placeholder="Tu correo de trabajo"
                className="pr-12 backdrop-blur-sm"
              />
              <Button
                type="submit"
                size="icon"
                className="absolute right-1 top-1 h-8 w-8 rounded-full bg-primary text-primary-foreground transition-transform hover:scale-105"
              >
                <Send className="h-4 w-4" />
                <span className="sr-only">Suscribirme</span>
              </Button>
            </form>
            <div className="absolute -right-4 top-0 h-24 w-24 rounded-full bg-primary/10 blur-2xl" />
          </div>
          <div>
            <h3 className="mb-4 text-lg font-semibold">Secciones</h3>
            <nav className="space-y-2 text-sm">
              <a href="#que-cambia" className="block transition-colors hover:text-primary">
                Qué cambia
              </a>
              <a href="#como-funciona" className="block transition-colors hover:text-primary">
                Cómo funciona
              </a>
              <a href="#coapa" className="block transition-colors hover:text-primary">
                La semana de Coapa
              </a>
              <a href="#tu-sucursal" className="block transition-colors hover:text-primary">
                Tu sucursal
              </a>
              <a href="#preguntas" className="block transition-colors hover:text-primary">
                Preguntas
              </a>
            </nav>
          </div>
          <div>
            <h3 className="mb-4 text-lg font-semibold">Contacto</h3>
            <address className="space-y-2 text-sm not-italic">
              <p>AIvena Inc.</p>
              <p>Ciudad de México</p>
              <p>
                <a
                  href="mailto:contacto@aivena.ai"
                  className="transition-colors hover:text-primary"
                >
                  contacto@aivena.ai
                </a>
              </p>
            </address>
          </div>
          <div className="relative">
            <h3 className="mb-4 text-lg font-semibold">Síguenos</h3>
            <div className="mb-6 flex space-x-4">
              <TooltipProvider>
                {socialLinks.map(({ name, tooltip, Icon }) => (
                  <Tooltip key={name}>
                    <TooltipTrigger asChild>
                      <Button variant="outline" size="icon" className="rounded-full">
                        <Icon className="h-4 w-4" />
                        <span className="sr-only">{name}</span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{tooltip}</p>
                    </TooltipContent>
                  </Tooltip>
                ))}
              </TooltipProvider>
            </div>
            <div className="flex items-center space-x-2">
              <Sun className="h-4 w-4" />
              <Switch
                id="dark-mode"
                checked={isDarkMode}
                onCheckedChange={setIsDarkMode}
              />
              <Moon className="h-4 w-4" />
              <Label htmlFor="dark-mode" className="sr-only">
                Cambiar modo oscuro
              </Label>
            </div>
          </div>
        </div>
        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t pt-8 text-center md:flex-row md:items-end md:text-left">
          <div className="space-y-2">
            <p className="max-w-[64ch] text-xs text-muted-foreground">
              Cifras: sucursal sintética Coapa, 30 colaboradores, calculadas por
              el motor de Jornada40. Ningún cliente real.
            </p>
            <p className="text-sm text-muted-foreground">
              © 2026 · Todos los derechos reservados
            </p>
          </div>
          <nav className="flex gap-4 text-sm">
            <a href="#" className="transition-colors hover:text-primary">
              Aviso de privacidad
            </a>
            <a href="#" className="transition-colors hover:text-primary">
              Términos
            </a>
            <a href="#" className="transition-colors hover:text-primary">
              Cookies
            </a>
          </nav>
        </div>
      </div>
    </footer>
  )
}

export { Footerdemo }
