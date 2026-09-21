"use client";

import { Button } from "@/components/ui/button";
import {
    NavigationMenu,
    NavigationMenuContent,
    NavigationMenuItem,
    NavigationMenuLink,
    NavigationMenuList,
    NavigationMenuTrigger,
} from "@/components/ui/navigation-menu";
import { Menu, MoveRight, X } from "lucide-react";
import { useState } from "react";
import Link from "next/link";
import { JornadaLogo } from "@/components/ui/jornada-logo";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ProfileMenu, UserChip } from "@/components/auth/profile-menu";
import { iniciales, useSession } from "@/components/auth/session";

type NavItem = {
    title: string;
    href?: string;
    description?: string;
    items?: { title: string; href: string }[];
};

function Header1() {
    const navigationItems: NavItem[] = [
        { title: "Home", href: "/", description: "" },
        {
            title: "Product",
            description: "Managing a small business today is already tough.",
            items: [
                { title: "Reports", href: "/reports" },
                { title: "Statistics", href: "/statistics" },
                { title: "Dashboards", href: "/dashboards" },
                { title: "Recordings", href: "/recordings" },
            ],
        },
        {
            title: "Company",
            description: "Managing a small business today is already tough.",
            items: [
                { title: "About us", href: "/about" },
                { title: "Fundraising", href: "/fundraising" },
                { title: "Investors", href: "/investors" },
                { title: "Contact us", href: "/contact" },
            ],
        },
    ];

    const [isOpen, setOpen] = useState(false);
    const { user, ready, signOut } = useSession();
    // Hasta que el cliente hidrata, `ready` es false y mostramos el estado
    // "sin sesión" para que el markup coincida con el del servidor.
    const loggedIn = ready && user !== null;
    return (
        <header className="w-full z-40 fixed top-0 left-0 bg-background">
            <div className="container relative mx-auto min-h-20 px-4 flex gap-4 flex-row lg:grid lg:grid-cols-3 items-center">
                <div className="justify-start items-center gap-4 lg:flex hidden flex-row">
                    <NavigationMenu className="flex justify-start items-start">
                        <NavigationMenuList className="flex justify-start gap-4 flex-row">
                            {navigationItems.map((item) => (
                                <NavigationMenuItem key={item.title}>
                                    {item.href ? (
                                        <>
                                            <NavigationMenuLink asChild>
                                                <Button variant="ghost" asChild>
                                                    <Link href={item.href}>{item.title}</Link>
                                                </Button>
                                            </NavigationMenuLink>
                                        </>
                                    ) : (
                                        <>
                                            <NavigationMenuTrigger className="font-medium text-sm">
                                                {item.title}
                                            </NavigationMenuTrigger>
                                            <NavigationMenuContent className="!w-[450px] p-4">
                                                <div className="flex flex-col lg:grid grid-cols-2 gap-4">
                                                    <div className="flex flex-col h-full justify-between">
                                                        <div className="flex flex-col">
                                                            <p className="text-base">{item.title}</p>
                                                            <p className="text-muted-foreground text-sm">
                                                                {item.description}
                                                            </p>
                                                        </div>
                                                        <Button size="sm" className="mt-10">
                                                            Book a call today
                                                        </Button>
                                                    </div>
                                                    <div className="flex flex-col text-sm h-full justify-end">
                                                        {item.items?.map((subItem) => (
                                                            <NavigationMenuLink
                                                                href={subItem.href}
                                                                key={subItem.title}
                                                                className="flex flex-row justify-between items-center hover:bg-muted py-2 px-4 rounded"
                                                            >
                                                                <span>{subItem.title}</span>
                                                                <MoveRight className="w-4 h-4 text-muted-foreground" />
                                                            </NavigationMenuLink>
                                                        ))}
                                                    </div>
                                                </div>
                                            </NavigationMenuContent>
                                        </>
                                    )}
                                </NavigationMenuItem>
                            ))}
                        </NavigationMenuList>
                    </NavigationMenu>
                </div>
                <div className="flex lg:justify-center">
                    <Link href="/" aria-label="Jornada40, inicio">
                        <JornadaLogo size={30} className="text-foreground" />
                    </Link>
                </div>
                <div className="flex justify-end w-full gap-4">
                    <Button variant="ghost" className="hidden md:inline-flex" asChild>
                        <a href="#contacto">Agendar diagnóstico</a>
                    </Button>
                    <div className="border-r hidden md:inline"></div>
                    {loggedIn && user ? (
                        <ProfileMenu>
                            <button
                                type="button"
                                aria-label="Abrir menú de cuenta"
                                className="inline-flex items-center rounded-full md:rounded-md md:px-2 md:py-1 hover:bg-muted transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                            >
                                <UserChip className="hidden md:inline-flex" />
                                <Avatar className="size-9 md:hidden">
                                    <AvatarImage src={user.foto} alt="" />
                                    <AvatarFallback className="text-xs font-medium">
                                        {iniciales(user.nombre)}
                                    </AvatarFallback>
                                </Avatar>
                            </button>
                        </ProfileMenu>
                    ) : (
                        <>
                            <Button variant="outline" asChild>
                                <Link href="/login">Entrar</Link>
                            </Button>
                            <Button className="bg-yellow-400 font-semibold text-neutral-950 hover:bg-yellow-300" asChild>
                                <Link href="/registro">Crear cuenta</Link>
                            </Button>
                        </>
                    )}
                </div>
                <div className="flex w-12 shrink lg:hidden items-end justify-end">
                    <Button variant="ghost" onClick={() => setOpen(!isOpen)}>
                        {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                    </Button>
                    {isOpen && (
                        <div className="absolute top-20 border-t flex flex-col w-full right-0 bg-background shadow-lg py-4 container gap-8">
                            {navigationItems.map((item) => (
                                <div key={item.title}>
                                    <div className="flex flex-col gap-2">
                                        {item.href ? (
                                            <Link
                                                href={item.href}
                                                className="flex justify-between items-center"
                                            >
                                                <span className="text-lg">{item.title}</span>
                                                <MoveRight className="w-4 h-4 stroke-1 text-muted-foreground" />
                                            </Link>
                                        ) : (
                                            <p className="text-lg">{item.title}</p>
                                        )}
                                        {item.items &&
                                            item.items.map((subItem) => (
                                                <Link
                                                    key={subItem.title}
                                                    href={subItem.href}
                                                    className="flex justify-between items-center"
                                                >
                                                    <span className="text-muted-foreground">
                                                        {subItem.title}
                                                    </span>
                                                    <MoveRight className="w-4 h-4 stroke-1" />
                                                </Link>
                                            ))}
                                    </div>
                                </div>
                            ))}
                            <div className="flex flex-col gap-3 border-t pt-6">
                                {loggedIn && user ? (
                                    <>
                                        <UserChip />
                                        <Button
                                            variant="outline"
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
                                        <Button
                                            className="bg-yellow-400 font-semibold text-neutral-950 hover:bg-yellow-300"
                                            asChild
                                        >
                                            <Link href="/registro" onClick={() => setOpen(false)}>
                                                Crear cuenta
                                            </Link>
                                        </Button>
                                    </>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
}

export { Header1 };
