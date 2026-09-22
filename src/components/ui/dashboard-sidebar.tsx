"use client";

/**
 * Dashboard Sidebar — portado de 21st.dev
 * https://21st.dev/@arunjdass/components/dashboard-sidebar (autor: arunjdass)
 *
 * Adaptaciones para Jornada40:
 * - Los datos de navegación (`groups`, `bottomItems`, sucursales) llegan por
 *   props.
 * - Cada ítem es un `<a href="#id">` plano: la pestaña activa la lleva el
 *   shell en estado de React (no `next/link`, no navegación).
 * - `WorkspaceSwitcher` (selector de sucursal) es un `<button>` con
 *   `aria-expanded` y una lista `role="listbox"` navegable con flechas,
 *   Enter/Espacio y Escape.
 * - Anillo `focus-visible` y objetivos táctiles de 40 px en todos los ítems.
 */

import * as React from "react";
import { useEffect, useId, useRef, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export type NavItemData = {
  id: string;
  title: string;
  icon: React.ElementType;
  /** Destino real (navegación completa). Sin `href`, el ítem es una pestaña `#id`. */
  href?: string;
  badge?: number | string;
  shortcut?: string;
  children?: NavItemData[];
};

export type NavGroupData = {
  heading?: string;
  items: NavItemData[];
};

const FOCUS_RING =
  "outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card";

/**
 * Selector de sucursal. Botón + listbox: Enter/Espacio/↓ abren, ↑↓ mueven,
 * Enter elige, Escape cierra y devuelve el foco al botón.
 */
export function WorkspaceSwitcher({
  workspaces,
  selected,
  onSelect,
  plan = "",
  hint = "¿Otra sucursal? Súbela en el CSV.",
}: {
  workspaces: string[];
  selected?: string;
  onSelect?: (ws: string) => void;
  /** Texto bajo el nombre (la empresa). */
  plan?: string;
  /** Nota no interactiva al pie de la lista; `null` la oculta. */
  hint?: string | null;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [internalSelected, setInternalSelected] = useState(workspaces[0] ?? "");
  const current = selected || internalSelected;
  const handleSelect = onSelect || setInternalSelected;

  const listId = useId();
  const botonRef = useRef<HTMLButtonElement>(null);
  const listaRef = useRef<HTMLUListElement>(null);
  const indiceActual = Math.max(0, workspaces.indexOf(current));
  const [activo, setActivo] = useState(indiceActual);

  const abrir = () => {
    setActivo(indiceActual);
    setIsOpen(true);
  };
  const cerrar = (devolverFoco = true) => {
    setIsOpen(false);
    if (devolverFoco) botonRef.current?.focus();
  };
  const elegir = (ws: string) => {
    handleSelect(ws);
    cerrar();
  };

  useEffect(() => {
    if (isOpen) listaRef.current?.focus();
  }, [isOpen]);
  useEffect(() => {
    if (!isOpen) return;
    listaRef.current?.querySelector<HTMLElement>(`#${CSS.escape(`${listId}-${activo}`)}`)?.scrollIntoView({ block: "nearest" });
  }, [isOpen, activo, listId]);

  const unaSola = workspaces.length <= 1;

  const onKeyBoton = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      abrir();
    }
  };

  const onKeyLista = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setActivo((i) => Math.min(workspaces.length - 1, i + 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setActivo((i) => Math.max(0, i - 1));
        break;
      case "Home":
        e.preventDefault();
        setActivo(0);
        break;
      case "End":
        e.preventDefault();
        setActivo(workspaces.length - 1);
        break;
      case "Enter":
      case " ":
        e.preventDefault();
        if (workspaces[activo]) elegir(workspaces[activo]);
        break;
      case "Escape":
        e.preventDefault();
        cerrar();
        break;
      case "Tab":
        cerrar(false);
        break;
    }
  };

  return (
    <div className="relative mb-4">
      <button
        ref={botonRef}
        type="button"
        onClick={() => (isOpen ? cerrar() : abrir())}
        onKeyDown={onKeyBoton}
        disabled={unaSola}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={isOpen ? listId : undefined}
        aria-label={unaSola ? `Sucursal ${current}` : `Sucursal ${current}. Cambiar de sucursal`}
        className={cn(
          "group flex min-h-10 w-full items-center justify-between rounded-lg px-2 py-2 text-left transition-colors select-none",
          !unaSola && "cursor-pointer hover:bg-black/5 dark:hover:bg-white/5",
          FOCUS_RING,
        )}
      >
        <span className="flex min-w-0 items-center gap-3">
          <span
            aria-hidden="true"
            className="flex size-8 shrink-0 items-center justify-center rounded-[6px] bg-yellow-400 text-[13px] font-semibold text-neutral-950 shadow-sm"
          >
            {current.charAt(0).toUpperCase()}
          </span>
          <span className="flex min-w-0 flex-col">
            <span className="j40-body mb-1 truncate font-medium leading-none text-foreground">{current}</span>
            {plan && <span className="j40-muted truncate leading-none">{plan}</span>}
          </span>
        </span>
        {!unaSola && (
          <ChevronDown
            aria-hidden="true"
            className={cn(
              "size-4 shrink-0 text-muted-foreground transition-transform group-hover:text-foreground",
              isOpen && "rotate-180",
            )}
            strokeWidth={1.5}
          />
        )}
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" aria-hidden="true" onClick={() => cerrar(false)} />
          <div className="absolute top-[48px] left-0 z-50 flex w-full flex-col gap-0.5 rounded-lg border border-border/50 bg-card py-1 shadow-xl animate-in fade-in zoom-in-95 duration-100">
            <ul
              id={listId}
              ref={listaRef}
              role="listbox"
              tabIndex={-1}
              aria-label="Sucursales"
              aria-activedescendant={`${listId}-${activo}`}
              onKeyDown={onKeyLista}
              // Con decenas de sucursales la lista se desplaza dentro del menú.
              className={cn("flex max-h-[min(60vh,26rem)] flex-col gap-0.5 overflow-y-auto overscroll-contain rounded-md", FOCUS_RING)}
            >
              {workspaces.map((ws, i) => {
                const seleccionada = current === ws;
                return (
                  <li
                    key={ws}
                    id={`${listId}-${i}`}
                    role="option"
                    aria-selected={seleccionada}
                    onClick={() => elegir(ws)}
                    onMouseEnter={() => setActivo(i)}
                    className={cn(
                      "j40-body mx-1 flex min-h-10 cursor-pointer items-center rounded-md px-3 py-2 transition-colors",
                      seleccionada ? "bg-yellow-400/10 font-medium text-yellow-300" : "text-foreground",
                      activo === i && "bg-black/5 dark:bg-white/10",
                    )}
                  >
                    {ws}
                  </li>
                );
              })}
            </ul>
            {hint && (
              <>
                <div className="mx-2 my-1 h-px bg-border/50" />
                <p className="j40-muted mx-1 px-3 py-2">{hint}</p>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}

/** Icono, título, atajo, contador y flecha de una fila del menú. */
function NavItemContenido({ item, isActive, isOpen }: { item: NavItemData; isActive: boolean; isOpen: boolean }) {
  return (
    <>
      <span className="flex min-w-0 items-center gap-2.5">
        <item.icon
          aria-hidden="true"
          className={cn(
            "size-4 shrink-0 transition-colors",
            isActive ? "text-yellow-400" : "text-muted-foreground group-hover:text-foreground",
          )}
          strokeWidth={1.5}
        />
        <span className="j40-body truncate tracking-wide">{item.title}</span>
      </span>

      <span className="flex items-center gap-2">
        {item.shortcut && (
          <kbd className="hidden h-5 items-center justify-center rounded-[4px] border border-border/50 bg-background/50 px-1.5 font-mono text-[10px] font-medium text-muted-foreground shadow-xs group-hover:inline-flex group-focus-visible:inline-flex">
            {item.shortcut}
          </kbd>
        )}
        {item.badge && (
          <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-yellow-400/15 px-1.5 text-[10px] font-medium text-yellow-300">
            {item.badge}
          </span>
        )}
        {item.children && (
          <ChevronRight
            aria-hidden="true"
            className={cn(
              "size-3.5 text-muted-foreground transition-transform duration-200",
              isOpen && "rotate-90",
            )}
            strokeWidth={2}
          />
        )}
      </span>
    </>
  );
}

/** Sub-ítems desplegables (animación de altura con grid-rows). */
function NavItemHijos({
  hijos,
  isOpen,
  activeId,
  onSelect,
  level,
}: {
  hijos: NavItemData[];
  isOpen: boolean;
  activeId: string;
  onSelect: (id: string) => void;
  level: number;
}) {
  return (
    <div
      className={cn(
        "grid transition-[grid-template-rows,opacity] duration-300 ease-in-out",
        isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
      )}
    >
      <div className="relative mt-0.5 flex min-h-0 flex-col gap-0.5 overflow-hidden">
        <div
          className="absolute top-0 bottom-0 border-l border-black/5 dark:border-white/5"
          style={{ left: `${level * 12 + 17.5}px` }}
        />
        {hijos.map((child) => (
          <NavItem key={child.id} item={child} activeId={activeId} onSelect={onSelect} level={level + 1} />
        ))}
      </div>
    </div>
  );
}

export function NavItem({
  item,
  activeId,
  onSelect,
  level = 0,
}: {
  item: NavItemData;
  activeId: string;
  onSelect: (id: string) => void;
  level?: number;
}) {
  const isActive = activeId === item.id;
  const [isOpen, setIsOpen] = useState(false);

  const rowClassName = cn(
    "group flex min-h-10 md:min-h-9 items-center justify-between px-2.5 py-1.5 rounded-[6px] cursor-pointer transition-colors duration-200 select-none",
    isActive
      ? "bg-black/5 dark:bg-white/10 text-foreground font-medium"
      : "text-muted-foreground hover:bg-black/5 dark:hover:bg-white/5 hover:text-foreground",
    FOCUS_RING,
  );
  const rowStyle = { paddingLeft: `${level * 12 + 10}px` };
  const content = <NavItemContenido item={item} isActive={isActive} isOpen={isOpen} />;

  let fila: React.ReactNode;
  if (item.children) {
    fila = (
      <button
        type="button"
        className={cn(rowClassName, "w-full text-left")}
        style={rowStyle}
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
      >
        {content}
      </button>
    );
  } else if (item.href) {
    fila = (
      <a href={item.href} className={rowClassName} style={rowStyle} aria-current={isActive ? "page" : undefined}>
        {content}
      </a>
    );
  } else {
    // Pestaña del panel: enlace plano `#id`; el shell decide qué mostrar
    // y escribe el hash con replaceState (sin navegación).
    fila = (
      <a
        href={item.id === "diagnostico" ? "#" : `#${item.id}`}
        className={rowClassName}
        style={rowStyle}
        aria-current={isActive ? "page" : undefined}
        aria-keyshortcuts={item.shortcut}
        onClick={(e) => {
          e.preventDefault();
          onSelect(item.id);
        }}
      >
        {content}
      </a>
    );
  }

  return (
    <div className="flex w-full flex-col">
      {fila}
      {item.children && <NavItemHijos hijos={item.children} isOpen={isOpen} activeId={activeId} onSelect={onSelect} level={level} />}
    </div>
  );
}

export type SidebarNavProps = {
  className?: string;
  groups: NavGroupData[];
  bottomItems?: NavItemData[];
  /** Encima del selector de sucursal (p. ej. el logo). */
  header?: React.ReactNode;
  /** Debajo de los ítems inferiores (p. ej. la cuenta). */
  footer?: React.ReactNode;
  activeId?: string;
  defaultActiveId?: string;
  onSelect?: (id: string) => void;
  workspaces?: string[];
  activeWorkspace?: string;
  onWorkspaceSelect?: (ws: string) => void;
  workspacePlan?: string;
  workspaceHint?: string | null;
  "aria-label"?: string;
};

export function SidebarNav({
  className = "",
  groups,
  bottomItems = [],
  header,
  footer,
  activeId,
  defaultActiveId,
  onSelect,
  workspaces = [],
  activeWorkspace,
  onWorkspaceSelect,
  workspacePlan,
  workspaceHint,
  "aria-label": ariaLabel = "Secciones del panel",
}: SidebarNavProps) {
  const [internalId, setInternalId] = useState(defaultActiveId ?? groups[0]?.items[0]?.id ?? "");
  const currentId = activeId !== undefined ? activeId : internalId;
  const handleSelect = onSelect || setInternalId;

  return (
    <div className={cn("flex h-full w-[260px] flex-col border-r border-border/50 bg-card/50 p-3 font-sans", className)}>
      {header}
      {workspaces.length > 0 && (
        <WorkspaceSwitcher
          workspaces={workspaces}
          selected={activeWorkspace}
          onSelect={onWorkspaceSelect}
          plan={workspacePlan}
          hint={workspaceHint}
        />
      )}

      <nav
        aria-label={ariaLabel}
        className="mt-2 flex flex-1 flex-col gap-4 overflow-y-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {groups.map((group) => (
          <div key={group.heading ?? group.items.map((i) => i.id).join("|")} className="flex flex-col gap-0.5">
            {group.heading && <span className="j40-eyebrow mb-1 px-2.5">{group.heading}</span>}
            {group.items.map((item) => (
              <NavItem key={item.id} item={item} activeId={currentId} onSelect={handleSelect} />
            ))}
          </div>
        ))}
      </nav>

      {(bottomItems.length > 0 || footer) && (
        <div className="mt-auto flex flex-col gap-0.5 border-t border-border/50 pt-4">
          {bottomItems.map((item) => (
            <NavItem key={item.id} item={item} activeId={currentId} onSelect={handleSelect} />
          ))}
          {footer}
        </div>
      )}
    </div>
  );
}
