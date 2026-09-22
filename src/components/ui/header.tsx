"use client";

import { useEffect, useId, useState } from "react";
import Link from "next/link";
import { Menu, MoveRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { JornadaLogo } from "@/components/ui/jornada-logo";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ProfileMenu, UserChip } from "@/components/auth/profile-menu";
import { iniciales, useSession } from "@/components/auth/session";

/**
 * Menú de la portada: tres anclas a secciones reales de `src/app/page.tsx`.
 * `#como-funciona` → ReduccionTimelineDemo, `#preguntas` → FAQDemo,
 * `#contacto` → ContactDemo.
 */
const NAV = [
  { title: "Cómo funciona", href: "#como-funciona" },
  { title: "Preguntas", href: "#preguntas" },
  { title: "Contacto", href: "#contacto" },
] as const;

function Header1() {
  const [isOpen, setOpen] = useState(false);
  const menuId = useId();
  const { user, ready, signOut } = useSession();
  // Hasta que el cliente hidrata, `ready` es false y mostramos el estado
  // "sin sesión" para que el markup coincida con el del servidor.
  const loggedIn = ready && user !== null;

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen]);

  return (
    <header className="fixed top-0 left-0 z-40 w-full bg-background">
      <div className="container relative mx-auto flex min-h-20 flex-row items-center gap-4 px-4 lg:grid lg:grid-cols-3">
        <nav aria-label="Secciones" className="hidden flex-row items-center justify-start gap-1 lg:flex">
          {NAV.map((item) => (
            <Button key={item.href} variant="ghost" asChild>
              <a href={item.href}>{item.title}</a>
            </Button>
          ))}
        </nav>
        <div className="flex lg:justify-center">
          <Link href="/" aria-label="Jornada40, inicio">
            <JornadaLogo size={40} className="h-8 w-auto text-foreground md:h-10" />
          </Link>
        </div>
        <div className="flex w-full justify-end gap-4">
          <Button variant="ghost" className="hidden md:inline-flex" asChild>
            <a href="#contacto">Agendar diagnóstico</a>
          </Button>
          <div className="hidden border-r md:inline" aria-hidden="true" />
          {loggedIn && user ? (
            <ProfileMenu>
              <button
                type="button"
                aria-label="Abrir menú de cuenta"
                className="inline-flex items-center rounded-full transition-colors outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background md:rounded-md md:px-2 md:py-1"
              >
                <UserChip className="hidden md:inline-flex" />
                <Avatar className="size-9 md:hidden">
                  <AvatarImage src={user.foto} alt="" />
                  <AvatarFallback className="text-xs font-medium">{iniciales(user.nombre)}</AvatarFallback>
                </Avatar>
              </button>
            </ProfileMenu>
          ) : (
            <>
              {/* En móvil estos accesos viven en el cajón del menú. */}
              <Button variant="outline" className="hidden md:inline-flex" asChild>
                <Link href="/login">Entrar</Link>
              </Button>
              <Button variant="primary" className="hidden md:inline-flex" asChild>
                <Link href="/registro">Crear cuenta</Link>
              </Button>
            </>
          )}
        </div>
        <div className="flex w-12 shrink items-end justify-end lg:hidden">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setOpen(!isOpen)}
            aria-label={isOpen ? "Cerrar menú" : "Abrir menú"}
            aria-expanded={isOpen}
            aria-controls={menuId}
          >
            {isOpen ? <X className="size-5" aria-hidden="true" /> : <Menu className="size-5" aria-hidden="true" />}
          </Button>
          {isOpen && (
            <nav
              id={menuId}
              aria-label="Menú"
              className="container absolute top-20 right-0 flex w-full flex-col gap-6 border-t bg-background py-4 shadow-lg"
            >
              {NAV.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="flex min-h-11 items-center justify-between rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <span className="text-lg">{item.title}</span>
                  <MoveRight className="size-4 stroke-1 text-muted-foreground" aria-hidden="true" />
                </a>
              ))}
              <div className="flex flex-col gap-3 border-t pt-6">
                {loggedIn && user ? (
                  <>
                    <UserChip />
                    <Button variant="outline" asChild>
                      <Link href="/dashboard" onClick={() => setOpen(false)}>
                        Ir a mi panel
                      </Link>
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => {
                        signOut();
                        setOpen(false);
                      }}
                    >
                      Cerrar sesión
                    </Button>
                  </>
                ) : (
                  <>
                    <Button variant="outline" asChild>
                      <Link href="/login" onClick={() => setOpen(false)}>
                        Entrar
                      </Link>
                    </Button>
                    <Button variant="primary" asChild>
                      <Link href="/registro" onClick={() => setOpen(false)}>
                        Crear cuenta
                      </Link>
                    </Button>
                  </>
                )}
              </div>
            </nav>
          )}
        </div>
      </div>
    </header>
  );
}

export { Header1 };
