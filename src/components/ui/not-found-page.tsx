import Link from "next/link";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { JornadaLogo } from "@/components/ui/jornada-logo";

const team = [
  { src: "/avatars/najera-paola.jpg", name: "Paola Nájera", initials: "PN" },
  { src: "/avatars/olvera-hector.jpg", name: "Héctor Olvera", initials: "HO" },
  { src: "/avatars/molina-rocio.jpg", name: "Rocío Molina", initials: "RM" },
];

/**
 * Custom 404 for Jornada40. Server component: the Avatar primitives are
 * client components, but importing them from here is fine.
 */
export function NotFoundPage() {
  return (
    <div className="dark flex min-h-svh flex-col bg-background text-foreground">
      <header className="flex h-16 shrink-0 items-center px-6 md:px-10">
        <Link href="/" aria-label="Jornada40, inicio" className="inline-flex">
          <JornadaLogo size={28} animated={false} className="text-foreground" />
        </Link>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center px-4 pb-16">
        <Empty className="w-full max-w-lg">
          <EmptyHeader>
            <EmptyMedia>
              <div className="flex -space-x-3">
                {team.map((person) => (
                  <Avatar
                    key={person.src}
                    className="size-12 ring-2 ring-background"
                  >
                    <AvatarImage src={person.src} alt={person.name} />
                    <AvatarFallback className="text-xs font-medium">
                      {person.initials}
                    </AvatarFallback>
                  </Avatar>
                ))}
              </div>
            </EmptyMedia>
            <p
              aria-hidden="true"
              className="font-mono text-6xl font-semibold tracking-tight text-amber-400 md:text-7xl"
            >
              404
            </p>
            <EmptyTitle className="text-xl">
              Esta página no está en el cuadrante.
            </EmptyTitle>
            <EmptyDescription>
              La ruta que buscas no existe o cambió de turno. Vuelve al inicio o
              revisa tu sucursal.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <div className="flex w-full flex-col gap-3 sm:flex-row sm:justify-center">
              <Button
                asChild
                className="bg-yellow-400 font-semibold text-neutral-950 hover:bg-yellow-300"
              >
                <Link href="/">Volver al inicio</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/dashboard">Ir al panel</Link>
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              ¿Crees que es un error? Escríbenos a{" "}
              <a
                href="mailto:contacto@aivena.ai"
                className="underline underline-offset-4 hover:text-foreground"
              >
                contacto@aivena.ai
              </a>
            </p>
          </EmptyContent>
        </Empty>
      </main>
    </div>
  );
}

export default NotFoundPage;
