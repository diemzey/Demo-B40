"use client";

import { useEffect, useState, type ComponentType } from "react";
import { useRouter } from "next/navigation";
import {
  Activity,
  Building2,
  CalendarDays,
  FileBarChart2,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  Users,
  X,
} from "lucide-react";
import {
  SidebarNav,
  flattenNavItems,
  type NavGroupData,
  type NavItemData,
} from "@/components/ui/dashboard-sidebar";
import { JornadaLogo } from "@/components/ui/jornada-logo";
import { ProfileMenu } from "@/components/auth/profile-menu";
import { iniciales, useSession } from "@/components/auth/session";
import { SucursalesTab } from "@/components/dashboard/tabs/sucursales";
import { ColaboradoresTab } from "@/components/dashboard/tabs/colaboradores";
import { SemanasTab } from "@/components/dashboard/tabs/semanas";
import { ReportesTab } from "@/components/dashboard/tabs/reportes";
import { ConfiguracionTab } from "@/components/dashboard/tabs/configuracion";
import { usePanel } from "@/lib/datos/panel-context";
import { COOKIE_SUCURSAL } from "@/lib/datos/tipos";
import { cn } from "@/lib/utils";

/** Menú principal; el badge de Colaboradores se rellena con la plantilla cargada. */
function navGroups(colaboradores: number): NavGroupData[] {
  return [
    {
      items: [
        { id: "diagnostico", title: "Diagnóstico", icon: Activity },
        { id: "sucursales", title: "Sucursales", icon: Building2 },
        { id: "semanas", title: "Semanas", icon: CalendarDays },
        {
          id: "colaboradores",
          title: "Colaboradores",
          icon: Users,
          badge: colaboradores,
        },
        { id: "reportes", title: "Reportes", icon: FileBarChart2 },
      ],
    },
  ];
}

const BOTTOM_ITEMS: NavItemData[] = [
  { id: "configuracion", title: "Configuración", icon: Settings, shortcut: "⌘," },
];

const ALL_ITEMS = flattenNavItems([
  ...navGroups(0).flatMap((g) => g.items),
  ...BOTTOM_ITEMS,
]);

/**
 * Pestañas del panel por `id` (= hash de la URL). "diagnostico" (o sin hash)
 * muestra `children`, la página de servidor.
 */
const TABS: Record<string, ComponentType> = {
  sucursales: SucursalesTab,
  colaboradores: ColaboradoresTab,
  semanas: SemanasTab,
  reportes: ReportesTab,
  configuracion: ConfiguracionTab,
};

/** Pestaña a partir de un `#hash` (`#semanas` → "semanas"); todo lo demás es Diagnóstico. */
function idDesdeHash(hash: string): string {
  const slug = hash.replace(/^#/, "");
  if (slug in TABS) return slug;
  return "diagnostico";
}

function UserBlock({ org }: { org?: string }) {
  const { user } = useSession();
  const nombre = user?.nombre ?? "Tu cuenta";
  const empresa = org ?? user?.empresa ?? "";
  return (
    <ProfileMenu align="start">
      <button
        type="button"
        className="mt-2 flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors hover:bg-black/5 dark:hover:bg-white/5"
        aria-label={`Cuenta de ${nombre}`}
      >
        {user?.foto ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={user.foto}
            alt=""
            width={32}
            height={32}
            className="size-8 shrink-0 rounded-full object-cover ring-1 ring-border/60"
          />
        ) : (
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-[11px] font-semibold text-muted-foreground ring-1 ring-border/60">
            {iniciales(nombre)}
          </span>
        )}
        <div className="flex min-w-0 flex-col">
          <span className="truncate text-[13px] font-medium leading-none text-foreground">
            {nombre}
          </span>
          <span className="mt-1 truncate text-[11px] leading-none text-muted-foreground">
            {empresa}
          </span>
        </div>
      </button>
    </ProfileMenu>
  );
}

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const datos = usePanel();
  const [isOpen, setIsOpen] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  // Sucursales reales (o de muestra) del panel; la activa es la seleccionada en el servidor.
  const sucursales = datos.sucursales.map((s) => s.nombre);
  const [workspaceLocal, setWorkspaceLocal] = useState<string | null>(null);
  const activeWorkspace = workspaceLocal ?? datos.sucursal?.nombre ?? sucursales[0] ?? "";
  // La pestaña activa es estado propio: no depende del router de Next ni de
  // interceptar pushState. Se lee del #hash al montar (enlaces profundos,
  // menú de perfil) y al cambiar el hash por un enlace plano; al elegir en
  // el menú se escribe con replaceState para que la URL siga siendo
  // compartible sin provocar ninguna navegación.
  const [activeId, setActiveId] = useState("diagnostico");
  useEffect(() => {
    const leer = () => setActiveId(idDesdeHash(window.location.hash));
    leer();
    window.addEventListener("hashchange", leer);
    window.addEventListener("popstate", leer);
    return () => {
      window.removeEventListener("hashchange", leer);
      window.removeEventListener("popstate", leer);
    };
  }, []);
  const ActiveTab = TABS[activeId];

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const activeItem = ALL_ITEMS.find((i) => i.id === activeId);
  const activeTitle = activeItem ? activeItem.title : "Panel";

  /**
   * Cambiar de sucursal: con Supabase se guarda en la cookie `j40_sucursal`
   * y se vuelve a pedir el panel al servidor; en demo sólo cambia el texto.
   */
  const handleWorkspaceSelect = (nombre: string) => {
    setWorkspaceLocal(nombre);
    if (datos.origen !== "supabase") return;
    const sucursal = datos.sucursales.find((s) => s.nombre === nombre);
    if (!sucursal) return;
    document.cookie = `${COOKIE_SUCURSAL}=${encodeURIComponent(sucursal.id)}; path=/; max-age=31536000; samesite=lax`;
    router.refresh();
  };

  const handleSelect = (id: string) => {
    if (id in TABS) {
      setActiveId(id);
      const hash = id === "diagnostico" ? "" : `#${id}`;
      window.history.replaceState(null, "", `${window.location.pathname}${hash}`);
    }
    setMobileOpen(false);
  };

  const sidebar = (
    <SidebarNav
      className="w-[260px] border-none bg-transparent"
      groups={navGroups(datos.personas.length)}
      bottomItems={BOTTOM_ITEMS}
      activeId={activeId}
      onSelect={handleSelect}
      workspaces={sucursales}
      workspacePlan={datos.empresa?.nombre ?? ""}
      activeWorkspace={activeWorkspace}
      onWorkspaceSelect={handleWorkspaceSelect}
      header={
        <div className="mb-2 flex items-center justify-between px-2 pt-1 pb-2">
          <JornadaLogo size={28} animated={false} />
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-black/5 hover:text-foreground md:hidden dark:hover:bg-white/5"
            aria-label="Cerrar menú"
          >
            <X className="size-[18px]" strokeWidth={1.5} />
          </button>
        </div>
      }
      footer={<UserBlock org={datos.empresa?.nombre} />}
    />
  );

  return (
    <div className="relative flex h-dvh w-full overflow-hidden bg-background text-foreground">
      {/* Sidebar escritorio: colapsable con animación de ancho (del componente original) */}
      <div
        className={cn(
          "hidden h-full shrink-0 overflow-hidden border-r border-border/50 bg-card/50 transition-all duration-300 ease-in-out md:block",
          isOpen ? "w-[260px] opacity-100" : "w-0 border-none opacity-0",
        )}
      >
        {sidebar}
      </div>

      {/* Sidebar móvil: cajón sobrepuesto */}
      <div
        className={cn(
          "fixed inset-0 z-40 bg-background/60 backdrop-blur-sm transition-opacity duration-300 md:hidden",
          mobileOpen ? "opacity-100" : "pointer-events-none opacity-0",
        )}
        onClick={() => setMobileOpen(false)}
        aria-hidden="true"
      />
      <div
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-[260px] border-r border-border/50 bg-card shadow-2xl transition-transform duration-300 ease-in-out md:hidden",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
        )}
        role="dialog"
        aria-modal="true"
        aria-label="Menú principal"
      >
        {sidebar}
      </div>

      <div className="flex min-w-0 flex-1 flex-col bg-black/[0.02] transition-all duration-300 dark:bg-white/[0.02]">
        <div className="flex h-14 shrink-0 items-center justify-between border-b border-border/50 bg-card px-4">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => setIsOpen(!isOpen)}
              className="hidden rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-black/5 hover:text-foreground md:inline-flex dark:hover:bg-white/5"
              aria-label={isOpen ? "Ocultar menú" : "Mostrar menú"}
            >
              {isOpen ? (
                <PanelLeftClose className="size-[18px]" strokeWidth={1.5} />
              ) : (
                <PanelLeftOpen className="size-[18px]" strokeWidth={1.5} />
              )}
            </button>
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="inline-flex rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-black/5 hover:text-foreground md:hidden dark:hover:bg-white/5"
              aria-label="Abrir menú"
            >
              <PanelLeftOpen className="size-[18px]" strokeWidth={1.5} />
            </button>
            <div className="flex min-w-0 items-center gap-2 text-sm text-muted-foreground">
              <span className="hidden truncate sm:inline">{activeWorkspace}</span>
              <span className="hidden sm:inline">/</span>
              <span className="truncate font-medium text-foreground">{activeTitle}</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <ProfileMenu align="end" />
          </div>
        </div>

        <main
          key={activeId}
          className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
        >
          {ActiveTab ? <ActiveTab /> : children}
        </main>
      </div>

    </div>
  );
}
