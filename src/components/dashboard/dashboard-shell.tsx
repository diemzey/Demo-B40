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
import { SidebarNav, type NavGroupData, type NavItemData } from "@/components/ui/dashboard-sidebar";
import { JornadaLogo } from "@/components/ui/jornada-logo";
import { LogoCargando } from "@/components/ui/logo-cargando";
import { EstadoCola } from "@/components/dashboard/estado-cola";
import { ProfileMenu } from "@/components/auth/profile-menu";
import { iniciales, useSession } from "@/components/auth/session";
import { SemanasTab } from "@/components/dashboard/tabs/semanas";
import { ReportesTab } from "@/components/dashboard/tabs/reportes";
import { ConfiguracionTab } from "@/components/dashboard/tabs/configuracion";
import { guardarSucursal } from "@/lib/datos/cookies-panel";
import { usePanel, useReporte } from "@/lib/datos/panel-context";
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

/** Ítems del menú y sus sub-ítems en una sola lista (para buscar el activo por `id`). */
function aplanarItems(items: NavItemData[]): NavItemData[] {
  return items.reduce((acc, item) => {
    acc.push(item);
    if (item.children) acc.push(...aplanarItems(item.children));
    return acc;
  }, [] as NavItemData[]);
}

const ALL_ITEMS = aplanarItems([...navGroups(true).flatMap((g) => g.items), ...BOTTOM_ITEMS]);

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

/** Punto de corte `md` de Tailwind: a partir de aquí el cajón móvil no existe. */
const MEDIA_ESCRITORIO = "(min-width: 48rem)";

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

/**
 * La pestaña activa es estado propio: no depende del router de Next ni de
 * interceptar pushState. Se lee del #hash al montar (enlaces profundos,
 * menú de perfil) y al cambiar el hash por un enlace plano; al elegir en
 * el menú se escribe con replaceState para que la URL siga siendo
 * compartible sin provocar ninguna navegación.
 */
function usePestanaActiva() {
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

  const elegir = (id: string) => {
    if (!(id in TABS) && id !== "diagnostico") return;
    setActiveId(id);
    const hash = id === "diagnostico" ? "" : `#${id}`;
    window.history.replaceState(null, "", `${window.location.pathname}${hash}`);
  };

  return { activeId, elegir };
}

/**
 * Cajón móvil como `<dialog>` modal: el navegador atrapa el foco, cierra con
 * Escape y pinta el fondo. Al abrir, el foco pasa al botón de cerrar y al
 * cerrar vuelve al botón que lo abrió. Si la ventana crece a escritorio con
 * el cajón abierto, se cierra (ahí el menú fijo lo sustituye).
 */
function useCajonMovil() {
  const [abierto, setAbierto] = useState(false);
  const cajonRef = useRef<HTMLDialogElement>(null);
  const botonMenuRef = useRef<HTMLButtonElement>(null);
  const cerrarMenuRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const cajon = cajonRef.current;
    if (!abierto || !cajon) return;
    if (!cajon.open) cajon.showModal();
    const abridor = botonMenuRef.current;
    const t = window.setTimeout(() => cerrarMenuRef.current?.focus(), 50);
    // Un clic sobre el fondo (::backdrop) llega al propio dialog, no a su contenido.
    const alFondo = (e: MouseEvent) => {
      if (e.target === cajon) setAbierto(false);
    };
    cajon.addEventListener("click", alFondo);
    const escritorio = window.matchMedia(MEDIA_ESCRITORIO);
    const alCrecer = (e: MediaQueryListEvent) => {
      if (e.matches) setAbierto(false);
    };
    escritorio.addEventListener("change", alCrecer);
    return () => {
      window.clearTimeout(t);
      cajon.removeEventListener("click", alFondo);
      escritorio.removeEventListener("change", alCrecer);
      if (cajon.open) cajon.close();
      abridor?.focus();
    };
  }, [abierto]);

  return { abierto, setAbierto, cajonRef, botonMenuRef, cerrarMenuRef };
}

/**
 * Sucursal activa del panel: la seleccionada en el servidor (o la primera).
 * Cambiar de sucursal: con Supabase se guarda en la cookie `j40_sucursal`
 * y se vuelve a pedir el panel al servidor; en demo sólo cambia el texto.
 */
function useSucursalActiva() {
  const router = useRouter();
  const datos = usePanel();
  const [cambiando, startTransition] = useTransition();
  // Sucursales reales (o de muestra) del panel.
  const sucursales = datos.sucursales.map((s) => s.nombre);
  const [local, setLocal] = useState<string | null>(null);
  const activa = local ?? datos.sucursal?.nombre ?? sucursales[0] ?? "";

  const elegir = (nombre: string) => {
    setLocal(nombre);
    if (datos.origen !== "supabase") return;
    const sucursal = datos.sucursales.find((s) => s.nombre === nombre);
    if (!sucursal) return;
    guardarSucursal(sucursal.id);
    startTransition(() => router.refresh());
  };

  return { sucursales, activa, elegir, cambiando };
}

/**
 * Reportes solo aparece cuando hay algo que comparar (más de una sucursal o
 * más de una semana programada). El reporte se carga al abrir su pestaña; si
 * ya está, también cuenta.
 */
function hayQueComparar(datos: ReturnType<typeof usePanel>, reporte: ReturnType<typeof useReporte>): boolean {
  const semanasProgramadas = datos.semanas.filter((s) => s.programada).length;
  return (
    datos.sucursales.length > 1 ||
    semanasProgramadas > 1 ||
    (reporte?.total.tiendas ?? 0) > 1 ||
    (reporte?.total.semanas ?? 0) > 1
  );
}

/** Barra superior: botones de menú y migas (sucursal · pestaña). */
function Cabecera({
  menuAbierto,
  onAlternarMenu,
  cajonAbierto,
  onAbrirCajon,
  botonMenuRef,
  sucursal,
  titulo,
}: {
  menuAbierto: boolean;
  onAlternarMenu: () => void;
  cajonAbierto: boolean;
  onAbrirCajon: () => void;
  botonMenuRef: React.RefObject<HTMLButtonElement | null>;
  sucursal: string;
  titulo: string;
}) {
  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-border/50 bg-card px-3 md:px-4">
      <div className="flex min-w-0 items-center gap-2 md:gap-3">
        <button
          type="button"
          onClick={onAlternarMenu}
          className={cn(ICONO_BOTON, "hidden md:inline-flex")}
          aria-label={menuAbierto ? "Ocultar menú" : "Mostrar menú"}
          aria-expanded={menuAbierto}
        >
          {menuAbierto ? (
            <PanelLeftClose className="size-[18px]" strokeWidth={1.5} aria-hidden="true" />
          ) : (
            <PanelLeftOpen className="size-[18px]" strokeWidth={1.5} aria-hidden="true" />
          )}
        </button>
        <button
          ref={botonMenuRef}
          type="button"
          onClick={onAbrirCajon}
          className={cn(ICONO_BOTON, "md:hidden")}
          aria-label="Abrir menú"
          aria-expanded={cajonAbierto}
          aria-controls="menu-panel"
        >
          <PanelLeftOpen className="size-[18px]" strokeWidth={1.5} aria-hidden="true" />
        </button>
        {/* Migas: la sucursal se ve siempre, también en móvil. */}
        <p className="j40-body flex min-w-0 items-center gap-1.5 text-muted-foreground">
          {sucursal && (
            <>
              <span className="truncate">{sucursal}</span>
              <span aria-hidden="true">·</span>
            </>
          )}
          <span className="truncate font-medium text-foreground">{titulo}</span>
        </p>
      </div>

      <div className="flex items-center gap-3">
        <ProfileMenu align="end" />
      </div>
    </header>
  );
}

/** Aviso flotante mientras el panel vuelve a pedirse al servidor. */
function AvisoCambiando() {
  return (
    <div role="status" aria-live="polite" className="pointer-events-none absolute inset-x-0 top-6 z-10 flex justify-center">
      <span className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-card/95 px-3 py-1.5 text-[13px] shadow-lg">
        <LogoCargando size={18} label="" className="text-foreground" />
        Cambiando de sucursal…
      </span>
    </div>
  );
}

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const datos = usePanel();
  const reporte = useReporte();
  const [isOpen, setIsOpen] = useState(true);
  const { abierto: cajonAbierto, setAbierto: setCajonAbierto, cajonRef, botonMenuRef, cerrarMenuRef } = useCajonMovil();
  const sucursal = useSucursalActiva();
  const cambiando = sucursal.cambiando;
  const conReportes = hayQueComparar(datos, reporte);

  const pestana = usePestanaActiva();
  // Reportes oculto (una sola sucursal-semana) → Diagnóstico.
  const tabId = pestana.activeId === "reportes" && !conReportes ? "diagnostico" : pestana.activeId;
  const ActiveTab = TABS[tabId];
  const activeTitle = ALL_ITEMS.find((i) => i.id === tabId)?.title ?? "Panel";

  const handleSelect = (id: string) => {
    pestana.elegir(id);
    setCajonAbierto(false);
  };

  const sidebar = (
    <SidebarNav
      className="w-[260px] border-none bg-transparent"
      groups={navGroups(conReportes)}
      bottomItems={BOTTOM_ITEMS}
      activeId={tabId}
      onSelect={handleSelect}
      workspaces={sucursal.sucursales}
      workspacePlan={datos.empresa?.nombre ?? ""}
      workspaceHint={datos.origen === "supabase" ? "¿Otra sucursal? Súbela en el CSV con la columna sucursal." : null}
      activeWorkspace={sucursal.activa}
      onWorkspaceSelect={sucursal.elegir}
      header={
        <div className="mb-2 flex items-center justify-between px-2 pt-1 pb-2">
          <JornadaLogo size={28} animated={false} />
          <button
            ref={cerrarMenuRef}
            type="button"
            onClick={() => setCajonAbierto(false)}
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
          "hidden h-full shrink-0 overflow-hidden border-r border-border/50 bg-card/50 transition-[width,opacity] duration-300 ease-in-out md:block",
          isOpen ? "w-[260px] opacity-100" : "w-0 border-none opacity-0",
        )}
        {...(!isOpen && { inert: true })}
      >
        {sidebar}
      </div>

      {/* Sidebar móvil: cajón sobrepuesto. `<dialog>` modal: el fondo es su ::backdrop
          (un clic ahí lo cierra; ver useCajonMovil). */}
      <dialog
        id="menu-panel"
        ref={cajonRef}
        aria-label="Menú principal"
        onClose={() => setCajonAbierto(false)}
        className={cn(
          "fixed inset-y-0 left-0 right-auto m-0 h-full max-h-none w-[260px] max-w-none overflow-visible border-0 border-r border-border/50 bg-card p-0 text-foreground shadow-2xl md:hidden",
          "backdrop:bg-background/60 backdrop:backdrop-blur-sm",
          // Entra y sale deslizándose; el fondo se funde. `transition-discrete`
          // mantiene el dialog visible mientras termina la animación de salida.
          "-translate-x-full transition-[transform,translate,display,overlay] transition-discrete duration-300 ease-in-out open:translate-x-0 starting:open:-translate-x-full",
          "backdrop:opacity-0 backdrop:transition-opacity backdrop:duration-300 open:backdrop:opacity-100 starting:open:backdrop:opacity-0",
        )}
      >
        {sidebar}
      </dialog>

      <div className="flex min-w-0 flex-1 flex-col bg-black/[0.02] dark:bg-white/[0.02]">
        <Cabecera
          menuAbierto={isOpen}
          onAlternarMenu={() => setIsOpen(!isOpen)}
          cajonAbierto={cajonAbierto}
          onAbrirCajon={() => setCajonAbierto(true)}
          botonMenuRef={botonMenuRef}
          sucursal={sucursal.activa}
          titulo={activeTitle}
        />

        <main
          key={tabId}
          aria-busy={cambiando || undefined}
          className={cn(
            "relative flex-1 overflow-y-auto transition-opacity [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
            cambiando && "opacity-60",
          )}
        >
          {cambiando && <AvisoCambiando />}
          {ActiveTab ? <ActiveTab /> : children}
        </main>
      </div>
      <EstadoCola />
    </div>
  );
}
