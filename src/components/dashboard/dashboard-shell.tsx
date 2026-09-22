"use client";

import { useEffect, useRef, useState, useTransition, type ComponentType } from "react";
import { useRouter } from "next/navigation";
import {
  Activity,
  CalendarDays,
  FileBarChart2,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  X,
} from "lucide-react";
import {
  SidebarNav,
  flattenNavItems,
  type NavGroupData,
  type NavItemData,
} from "@/components/ui/dashboard-sidebar";
import { JornadaLogo } from "@/components/ui/jornada-logo";
import { LogoCargando } from "@/components/ui/logo-cargando";
import { EstadoCola } from "@/components/dashboard/estado-cola";
import { ProfileMenu } from "@/components/auth/profile-menu";
import { iniciales, useSession } from "@/components/auth/session";
import { SemanasTab } from "@/components/dashboard/tabs/semanas";
import { ReportesTab } from "@/components/dashboard/tabs/reportes";
import { ConfiguracionTab } from "@/components/dashboard/tabs/configuracion";
import { usePanel, useReporte } from "@/lib/datos/panel-context";
import { COOKIE_SUCURSAL } from "@/lib/datos/tipos";
import { cn } from "@/lib/utils";

/**
 * Menú principal: tres pestañas. Reportes solo aparece cuando hay algo que
 * comparar (más de una sucursal o más de una semana programada); con una
 * sola sucursal-semana sería el Diagnóstico repetido.
 */
function navGroups(conReportes: boolean): NavGroupData[] {
  const items: NavItemData[] = [
    { id: "diagnostico", title: "Diagnóstico", icon: Activity },
    { id: "semanas", title: "Semanas", icon: CalendarDays },
  ];
  if (conReportes) items.push({ id: "reportes", title: "Reportes", icon: FileBarChart2 });
  return [{ items }];
}

const BOTTOM_ITEMS: NavItemData[] = [{ id: "configuracion", title: "Configuración", icon: Settings }];

const ALL_ITEMS = flattenNavItems([...navGroups(true).flatMap((g) => g.items), ...BOTTOM_ITEMS]);

/**
 * Pestañas del panel por `id` (= hash de la URL). "diagnostico" (o sin hash)
 * muestra `children`, la página de servidor.
 */
const TABS: Record<string, ComponentType> = {
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

const ICONO_BOTON =
  "inline-flex size-10 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-black/5 hover:text-foreground dark:hover:bg-white/5 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card md:size-9";

function UserBlock({ org }: { org?: string }) {
  const { user } = useSession();
  const nombre = user?.nombre ?? "Tu cuenta";
  const empresa = org ?? user?.empresa ?? "";
  return (
    <ProfileMenu align="start">
      <button
        type="button"
        className="mt-2 flex min-h-10 w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors outline-none hover:bg-black/5 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card dark:hover:bg-white/5"
        aria-label={`Cuenta de ${nombre}. Abrir menú`}
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
        <span className="flex min-w-0 flex-col">
          <span className="j40-body truncate font-medium leading-none text-foreground">{nombre}</span>
          {empresa && <span className="j40-muted mt-1 truncate leading-none">{empresa}</span>}
        </span>
      </button>
    </ProfileMenu>
  );
}

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const datos = usePanel();
  const reporte = useReporte();
  const [isOpen, setIsOpen] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [cambiando, startTransition] = useTransition();
  const botonMenuRef = useRef<HTMLButtonElement>(null);
  const cerrarMenuRef = useRef<HTMLButtonElement>(null);

  // Sucursales reales (o de muestra) del panel; la activa es la seleccionada en el servidor.
  const sucursales = datos.sucursales.map((s) => s.nombre);
  const [workspaceLocal, setWorkspaceLocal] = useState<string | null>(null);
  const activeWorkspace = workspaceLocal ?? datos.sucursal?.nombre ?? sucursales[0] ?? "";

  const semanasProgramadas = datos.semanas.filter((s) => s.programada).length;
  const conReportes =
    datos.sucursales.length > 1 ||
    semanasProgramadas > 1 ||
    reporte.total.tiendas > 1 ||
    reporte.total.semanas > 1;

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
  // Reportes oculto (una sola sucursal-semana) → Diagnóstico.
  const tabId = activeId === "reportes" && !conReportes ? "diagnostico" : activeId;
  const ActiveTab = TABS[tabId];

  // Cajón móvil: Escape lo cierra; al abrir, el foco pasa al botón de cerrar
  // y al cerrar vuelve al botón que lo abrió.
  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileOpen(false);
    };
    window.addEventListener("keydown", onKey);
    const abridor = botonMenuRef.current;
    const t = window.setTimeout(() => cerrarMenuRef.current?.focus(), 50);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.clearTimeout(t);
      abridor?.focus();
    };
  }, [mobileOpen]);

  const activeItem = ALL_ITEMS.find((i) => i.id === tabId);
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
    startTransition(() => router.refresh());
  };

  const handleSelect = (id: string) => {
    if (id in TABS || id === "diagnostico") {
      setActiveId(id);
      const hash = id === "diagnostico" ? "" : `#${id}`;
      window.history.replaceState(null, "", `${window.location.pathname}${hash}`);
    }
    setMobileOpen(false);
  };

  const sidebar = (
    <SidebarNav
      className="w-[260px] border-none bg-transparent"
      groups={navGroups(conReportes)}
      bottomItems={BOTTOM_ITEMS}
      activeId={tabId}
      onSelect={handleSelect}
      workspaces={sucursales}
      workspacePlan={datos.empresa?.nombre ?? ""}
      workspaceHint={datos.origen === "supabase" ? "¿Otra sucursal? Súbela en el CSV con la columna sucursal." : null}
      activeWorkspace={activeWorkspace}
      onWorkspaceSelect={handleWorkspaceSelect}
      header={
        <div className="mb-2 flex items-center justify-between px-2 pt-1 pb-2">
          <JornadaLogo size={28} animated={false} />
          <button
            ref={cerrarMenuRef}
            type="button"
            onClick={() => setMobileOpen(false)}
            className={cn(ICONO_BOTON, "md:hidden")}
            aria-label="Cerrar menú"
          >
            <X className="size-[18px]" strokeWidth={1.5} aria-hidden="true" />
          </button>
        </div>
      }
      footer={<UserBlock org={datos.empresa?.nombre} />}
    />
  );

  return (
    <div className="relative flex h-dvh w-full overflow-hidden bg-background text-foreground">
      {/* Sidebar escritorio: colapsable con animación de ancho */}
      <div
        className={cn(
          "hidden h-full shrink-0 overflow-hidden border-r border-border/50 bg-card/50 transition-all duration-300 ease-in-out md:block",
          isOpen ? "w-[260px] opacity-100" : "w-0 border-none opacity-0",
        )}
        {...(!isOpen && { inert: true })}
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
        id="menu-panel"
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-[260px] border-r border-border/50 bg-card shadow-2xl transition-transform duration-300 ease-in-out md:hidden",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
        )}
        role="dialog"
        aria-modal="true"
        aria-label="Menú principal"
        {...(!mobileOpen && { inert: true })}
      >
        {sidebar}
      </div>

      <div className="flex min-w-0 flex-1 flex-col bg-black/[0.02] transition-all duration-300 dark:bg-white/[0.02]">
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-border/50 bg-card px-3 md:px-4">
          <div className="flex min-w-0 items-center gap-2 md:gap-3">
            <button
              type="button"
              onClick={() => setIsOpen(!isOpen)}
              className={cn(ICONO_BOTON, "hidden md:inline-flex")}
              aria-label={isOpen ? "Ocultar menú" : "Mostrar menú"}
              aria-expanded={isOpen}
            >
              {isOpen ? (
                <PanelLeftClose className="size-[18px]" strokeWidth={1.5} aria-hidden="true" />
              ) : (
                <PanelLeftOpen className="size-[18px]" strokeWidth={1.5} aria-hidden="true" />
              )}
            </button>
            <button
              ref={botonMenuRef}
              type="button"
              onClick={() => setMobileOpen(true)}
              className={cn(ICONO_BOTON, "md:hidden")}
              aria-label="Abrir menú"
              aria-expanded={mobileOpen}
              aria-controls="menu-panel"
            >
              <PanelLeftOpen className="size-[18px]" strokeWidth={1.5} aria-hidden="true" />
            </button>
            {/* Migas: la sucursal se ve siempre, también en móvil. */}
            <p className="j40-body flex min-w-0 items-center gap-1.5 text-muted-foreground">
              {activeWorkspace && (
                <>
                  <span className="truncate">{activeWorkspace}</span>
                  <span aria-hidden="true">·</span>
                </>
              )}
              <span className="truncate font-medium text-foreground">{activeTitle}</span>
            </p>
          </div>

          <div className="flex items-center gap-3">
            <ProfileMenu align="end" />
          </div>
        </header>

        <main
          key={tabId}
          aria-busy={cambiando || undefined}
          className={cn(
            "relative flex-1 overflow-y-auto transition-opacity [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
            cambiando && "opacity-60",
          )}
        >
          {cambiando && (
            <div
              role="status"
              aria-live="polite"
              className="pointer-events-none absolute inset-x-0 top-6 z-10 flex justify-center"
            >
              <span className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-card/95 px-3 py-1.5 text-[13px] shadow-lg">
                <LogoCargando size={18} label="" className="text-foreground" />
                Cambiando de sucursal…
              </span>
            </div>
          )}
          {ActiveTab ? <ActiveTab /> : children}
        </main>
      </div>
      <EstadoCola />
    </div>
  );
}
