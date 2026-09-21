"use client";

import { Button } from "@/components/ui/button";
import { JornadaLogo } from "@/components/ui/jornada-logo";
import { Menu, MoveRight, X } from "lucide-react";
import { useState } from "react";
import Link from "next/link";

type NavItem = { title: string; href: string };

const navigationItems: NavItem[] = [
    { title: "Qué cambia", href: "#que-cambia" },
    { title: "Cómo funciona", href: "#como-funciona" },
    { title: "La semana de Coapa", href: "#coapa" },
    { title: "Tu sucursal", href: "#tu-sucursal" },
    { title: "Preguntas", href: "#preguntas" },
];

function Header1() {
    const [isOpen, setOpen] = useState(false);
    return (
        <header className="fixed top-0 left-0 z-40 w-full border-b bg-background/90 backdrop-blur">
            <div className="container relative mx-auto flex min-h-16 items-center gap-4 px-4 lg:min-h-20">
                <Link
                    href="/"
                    aria-label="Jornada40, inicio"
                    className="flex items-center gap-3"
                >
                    <JornadaLogo size={28} className="text-foreground" />
                    <span
                        className="hidden border-l pl-3 font-mono text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground sm:inline"
                        aria-hidden="true"
                    >
                        AIvena
                    </span>
                </Link>

                <nav
                    className="ml-6 hidden items-center gap-5 text-sm lg:flex"
                    aria-label="Secciones"
                >
                    {navigationItems.map((item) => (
                        <a
                            key={item.href}
                            href={item.href}
                            className="whitespace-nowrap text-muted-foreground transition-colors hover:text-foreground"
                        >
                            {item.title}
                        </a>
                    ))}
                </nav>

                <div className="ml-auto flex items-center gap-3">
                    <Button
                        asChild
                        className="h-10 bg-ambar px-4 text-neutral-950 hover:bg-ambar/90"
                    >
                        <a href="#contacto">
                            <span className="hidden md:inline">
                                Agendar diagnóstico de una sucursal
                            </span>
                            <span className="md:hidden">Agendar diagnóstico</span>
                        </a>
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="lg:hidden"
                        onClick={() => setOpen(!isOpen)}
                        aria-expanded={isOpen}
                        aria-label={isOpen ? "Cerrar menú" : "Abrir menú"}
                    >
                        {isOpen ? <X className="size-5" /> : <Menu className="size-5" />}
                    </Button>
                </div>

                {isOpen && (
                    <nav
                        className="absolute top-full right-0 left-0 flex flex-col gap-1 border-t bg-background px-4 py-4 shadow-lg lg:hidden"
                        aria-label="Secciones"
                    >
                        {navigationItems.map((item) => (
                            <a
                                key={item.href}
                                href={item.href}
                                onClick={() => setOpen(false)}
                                className="flex items-center justify-between rounded-md px-2 py-3 text-base hover:bg-muted"
                            >
                                <span>{item.title}</span>
                                <MoveRight className="size-4 stroke-1 text-muted-foreground" />
                            </a>
                        ))}
                    </nav>
                )}
            </div>
        </header>
    );
}

export { Header1 };
