"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import {
  Activity,
  Building2,
  CalendarDays,
  FileBarChart2,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
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
import { CommandSearch } from "@/components/dashboard/command-search";
import { cn } from "@/lib/utils";

const SUCURSALES = ["Coapa", "Polanco", "Satélite"];

const NAV_GROUPS: NavGroupData[] = [
  {
    items: [
      { id: "search", title: "Buscar", icon: Search, shortcut: "⌘K" },
      { id: "diagnostico", title: "Diagnóstico", icon: Activity, href: "/dashboard" },
      { id: "sucursales", title: "Sucursales", icon: Building2, href: "/dashboard#sucursales" },
      { id: "semanas", title: "Semanas", icon: CalendarDays, href: "/dashboard#semanas" },
      { id: "colaboradores", title: "Colaboradores", icon: Users, href: "/dashboard#colaboradores", badge: 30 },
      { id: "reportes", title: "Reportes", icon: FileBarChart2, href: "/dashboard#reportes" },
    ],
  },
];

const BOTTOM_ITEMS: NavItemData[] = [
  { id: "configuracion", title: "Configuración", icon: Settings, href: "/dashboard#configuracion", shortcut: "⌘," },
];

const ALL_ITEMS = flattenNavItems([
  ...NAV_GROUPS.flatMap((g) => g.items),
  ...BOTTOM_ITEMS,
]);

const USER = {
  name: "Cesar González",
  org: "Grupo Solmar",
  avatar: "/avatars/ortega-bruno.jpg",
};

function subscribeHash(onChange: () => void) {
  window.addEventListener("hashchange", onChange);
  window.addEventListener("popstate", onChange);
  return () => {
    window.removeEventListener("hashchange", onChange);
    window.removeEventListener("popstate", onChange);
  };
}
const getHash = () => window.location.hash;
const getServerHash = () => "";

function idFromLocation(pathname: string, hash: string): string {
  const exact = ALL_ITEMS.find((i) => i.href === `${pathname}${hash}`);
  if (exact) return exact.id;
  const byPath = ALL_ITEMS.find((i) => i.href === pathname);
  return byPath?.id ?? "diagnostico";
}

function UserBlock() {
  return (
    <div className="mt-2 flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-black/5 dark:hover:bg-white/5">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={USER.avatar}
        alt=""
        width={32}
        height={32}
        className="size-8 shrink-0 rounded-full object-cover ring-1 ring-border/60"
      />
      <div className="flex min-w-0 flex-col">
        <span className="truncate text-[13px] font-medium leading-none text-foreground">
          {USER.name}
        </span>
        <span className="mt-1 truncate text-[11px] leading-none text-muted-foreground">
          {USER.org}
        </span>
      </div>
    </div>
  );
}

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [activeWorkspace, setActiveWorkspace] = useState(SUCURSALES[0]);
  const hash = useSyncExternalStore(subscribeHash, getHash, getServerHash);
  // Selección hecha por clic; se descarta al cambiar de ruta y entonces el
  // item activo se deriva de la URL (pathname + hash).
  const [selection, setSelection] = useState<{ pathname: string; id: string } | null>(null);
  const activeId =
    selection && selection.pathname === pathname
      ? selection.id
      : idFromLocation(pathname, hash);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMobileOpen(false);
        setIsSearchOpen(false);
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsSearchOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const activeItem = ALL_ITEMS.find((i) => i.id === activeId);
  const activeTitle = activeItem ? activeItem.title : "Panel";

  const handleSelect = (id: string) => {
    if (id === "search") {
      setIsSearchOpen(true);
      return;
    }
    setSelection({ pathname, id });
    setMobileOpen(false);
  };

  const sidebar = (
    <SidebarNav
      className="w-[260px] border-none bg-transparent"
      groups={NAV_GROUPS}
      bottomItems={BOTTOM_ITEMS}
      activeId={activeId}
      onSelect={handleSelect}
      workspaces={SUCURSALES}
      activeWorkspace={activeWorkspace}
      onWorkspaceSelect={setActiveWorkspace}
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
      footer={<UserBlock />}
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
            <button
              type="button"
              onClick={() => setIsSearchOpen(true)}
              className="hidden h-8 w-64 items-center gap-2 rounded-md bg-black/5 px-2.5 text-left text-[13px] text-muted-foreground/70 transition-colors hover:text-foreground md:flex dark:bg-white/5"
            >
              <Search className="size-4 shrink-0" strokeWidth={1.5} />
              <span className="flex-1 truncate">Buscar sucursal, semana o persona...</span>
              <kbd className="inline-flex h-5 items-center rounded-[4px] border border-border/50 px-1.5 font-mono text-[10px] text-muted-foreground/60">
                ⌘K
              </kbd>
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={USER.avatar}
              alt={USER.name}
              width={32}
              height={32}
              className="size-8 rounded-full border border-primary/20 object-cover"
            />
          </div>
        </div>

        <main className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          {children}
        </main>
      </div>

      <CommandSearch open={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
    </div>
  );
}
