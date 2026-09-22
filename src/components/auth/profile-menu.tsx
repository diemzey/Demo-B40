"use client";

import { Activity, CalendarDays, LogOut, Settings, Shield } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";

import { iniciales, useSession } from "@/components/auth/session";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

const ICON = {
  size: 16,
  strokeWidth: 2,
  className: "opacity-60",
  "aria-hidden": true,
} as const;

export function ProfileMenu({
  align = "end",
  children,
}: {
  align?: "start" | "end";
  children?: ReactNode;
}) {
  const { user, ready, signOut } = useSession();
  const router = useRouter();

  if (!ready || !user) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {children ?? (
          <button
            type="button"
            className="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            aria-label="Abrir menú de cuenta"
          >
            <Avatar className="size-9">
              <AvatarImage src={user.foto || undefined} alt="" />
              <AvatarFallback className="text-xs font-medium">
                {iniciales(user.nombre)}
              </AvatarFallback>
            </Avatar>
          </button>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent className="max-w-64" align={align}>
        <DropdownMenuLabel className="flex items-start gap-3">
          <Avatar className="size-8 shrink-0">
            <AvatarImage src={user.foto || undefined} alt="" />
            <AvatarFallback className="text-[0.625rem] font-medium">
              {iniciales(user.nombre)}
            </AvatarFallback>
          </Avatar>
          <div className="flex min-w-0 flex-col">
            <span className="truncate text-sm font-medium text-foreground">{user.nombre}</span>
            <span className="truncate text-xs font-normal text-muted-foreground">
              {user.correo}
            </span>
            {user.sucursal && (
              <span className="truncate text-xs font-normal text-muted-foreground">
                {user.sucursal}
              </span>
            )}
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem asChild>
            <Link href="/dashboard">
              <Activity {...ICON} />
              <span>Diagnóstico</span>
            </Link>
          </DropdownMenuItem>
          {/* Enlaces planos a propósito (no `next/link`): el shell del panel lee
              el `#hash` al montar y `Link` no dispara `hashchange` en la misma
              ruta, así que con `Link` las pestañas no cambiaban. */}
          <DropdownMenuItem asChild>
            <a href="/dashboard#semanas">
              <CalendarDays {...ICON} />
              <span>Semanas</span>
            </a>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem asChild>
            <a href="/dashboard#configuracion">
              <Settings {...ICON} />
              <span>Configuración</span>
            </a>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/privacidad">
              <Shield {...ICON} />
              <span>Aviso de privacidad</span>
            </Link>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={() => {
            // Con Supabase `signOut` es asíncrono: esperamos a que se limpie
            // la cookie y luego refrescamos para que el servidor lo vea.
            void signOut().finally(() => {
              router.push("/");
              router.refresh();
            });
          }}
        >
          <LogOut {...ICON} />
          <span>Cerrar sesión</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/**
 * Bloque compacto avatar + nombre + empresa. Pensado como disparador del
 * menú en escritorio: `<ProfileMenu><button><UserChip /></button></ProfileMenu>`.
 */
export function UserChip({ className }: { className?: string }) {
  const { user, ready } = useSession();
  if (!ready || !user) return null;

  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <Avatar className="size-8">
        <AvatarImage src={user.foto || undefined} alt="" />
        <AvatarFallback className="text-xs font-medium">{iniciales(user.nombre)}</AvatarFallback>
      </Avatar>
      <span className="flex min-w-0 flex-col items-start text-left leading-tight">
        <span className="truncate text-sm font-medium text-foreground">{user.nombre}</span>
        <span className="truncate text-xs text-muted-foreground">{user.empresa}</span>
      </span>
    </span>
  );
}
