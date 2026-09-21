"use client";

/**
 * Dashboard Sidebar — portado de 21st.dev
 * https://21st.dev/@arunjdass/components/dashboard-sidebar (autor: arunjdass)
 *
 * Fuente original: https://cdn.21st.dev/arunjdass/dashboard-sidebar/code.1781812419318.tsx
 *
 * Adaptaciones para este proyecto:
 * - Los datos de navegación (`groups`, `bottomItems`, workspaces) llegan por
 *   props en lugar de estar fijos en el archivo.
 * - Cada item acepta `href`; cuando lo tiene se renderiza con `next/link`.
 * - Slots `header` / `footer` para el logo y el bloque de usuario.
 * - `cn` de "@/lib/utils" en lugar de template strings; textos en español.
 * La estructura, clases y animaciones del componente original se conservan.
 */

import * as React from "react";
import { useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export type NavItemData = {
  id: string;
  title: string;
  icon: React.ElementType;
  href?: string;
  badge?: number | string;
  shortcut?: string;
  children?: NavItemData[];
};

export type NavGroupData = {
  heading?: string;
  items: NavItemData[];
};

export function WorkspaceSwitcher({
  workspaces,
  selected,
  onSelect,
  plan = "Grupo Solmar",
  createLabel = "Crear sucursal",
}: {
  workspaces: string[];
  selected?: string;
  onSelect?: (ws: string) => void;
  plan?: string;
  createLabel?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [internalSelected, setInternalSelected] = useState(workspaces[0] ?? "");

  const current = selected || internalSelected;
  const handleSelect = onSelect || setInternalSelected;

  return (
    <div className="relative">
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between px-2 py-2 mb-4 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer transition-colors select-none group"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-[6px] bg-primary text-primary-foreground flex items-center justify-center font-semibold text-[13px] shadow-sm">
            {current.charAt(0)}
          </div>
          <div className="flex flex-col overflow-hidden">
            <span className="text-[13px] font-medium leading-none mb-1 text-foreground truncate max-w-[120px]">
              {current}
            </span>
            <span className="text-[11px] text-muted-foreground leading-none">
              {plan}
            </span>
          </div>
        </div>
        <ChevronDown
          className="w-4 h-4 text-muted-foreground/50 group-hover:text-foreground/70 transition-colors shrink-0"
          strokeWidth={1.5}
        />
      </div>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute top-[52px] left-0 w-full bg-card border border-border/50 rounded-lg shadow-xl z-50 py-1 flex flex-col gap-0.5 animate-in fade-in zoom-in-95 duration-100">
            {workspaces.map((ws) => (
              <div
                key={ws}
                onClick={() => {
                  handleSelect(ws);
                  setIsOpen(false);
                }}
                className={cn(
                  "px-3 py-2 mx-1 text-[13px] rounded-md cursor-pointer transition-colors",
                  current === ws
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-foreground/80 hover:bg-black/5 dark:hover:bg-white/5",
                )}
              >
                {ws}
              </div>
            ))}
            <div className="h-px bg-border/50 my-1 mx-2" />
            <div className="px-3 py-2 mx-1 text-[13px] text-muted-foreground hover:bg-black/5 dark:hover:bg-white/5 rounded-md cursor-pointer flex items-center gap-2 transition-colors">
              <span className="text-[16px] leading-none mb-0.5">+</span>{" "}
              {createLabel}
            </div>
          </div>
        </>
      )}
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
  const hasChildren = !!item.children;
  const [isOpen, setIsOpen] = useState(false);

  const handleClick = () => {
    if (hasChildren) {
      setIsOpen(!isOpen);
    } else {
      onSelect(item.id);
    }
  };

  const rowClassName = cn(
    "group flex items-center justify-between px-2.5 py-[7px] rounded-[6px] cursor-pointer transition-all duration-200 select-none",
    isActive
      ? "bg-black/5 dark:bg-white/10 text-foreground font-medium"
      : "text-muted-foreground hover:bg-black/5 dark:hover:bg-white/5 hover:text-foreground/90",
  );
  const rowStyle = { paddingLeft: `${level * 12 + 10}px` };

  const content = (
    <>
      <div className="flex items-center gap-2.5 min-w-0">
        <item.icon
          className={cn(
            "w-[16px] h-[16px] transition-colors shrink-0",
            isActive
              ? "text-amber-400"
              : "text-muted-foreground/70 group-hover:text-foreground/70",
          )}
          strokeWidth={1.5}
        />
        <span className="text-[13px] tracking-wide truncate">{item.title}</span>
      </div>

      <div className="flex items-center gap-2">
        {item.shortcut && (
          <kbd className="hidden group-hover:inline-flex items-center justify-center h-5 px-1.5 text-[10px] font-medium font-mono text-muted-foreground/60 bg-background/50 border border-border/50 rounded-[4px] shadow-xs">
            {item.shortcut}
          </kbd>
        )}
        {item.badge && (
          <span className="flex items-center justify-center min-w-[20px] h-5 px-1.5 text-[10px] font-medium rounded-full bg-primary/10 text-primary">
            {item.badge}
          </span>
        )}
        {hasChildren && (
          <ChevronRight
            className={cn(
              "w-3.5 h-3.5 text-muted-foreground/50 transition-transform duration-200",
              isOpen && "rotate-90",
            )}
            strokeWidth={2}
          />
        )}
      </div>
    </>
  );

  return (
    <div className="flex flex-col w-full">
      {item.href && !hasChildren ? (
        <Link
          href={item.href}
          className={rowClassName}
          style={rowStyle}
          onClick={handleClick}
          aria-current={isActive ? "page" : undefined}
        >
          {content}
        </Link>
      ) : (
        <div
          className={rowClassName}
          style={rowStyle}
          onClick={handleClick}
          role="button"
          tabIndex={0}
          aria-expanded={hasChildren ? isOpen : undefined}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              handleClick();
            }
          }}
        >
          {content}
        </div>
      )}

      {hasChildren && (
        <div
          className={cn(
            "grid transition-[grid-template-rows,opacity] duration-300 ease-in-out",
            isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
          )}
        >
          <div className="overflow-hidden min-h-0 relative flex flex-col gap-0.5 mt-0.5">
            <div
              className="absolute top-0 bottom-0 border-l border-black/5 dark:border-white/5"
              style={{ left: `${level * 12 + 17.5}px` }}
            />
            {item.children!.map((child) => (
              <NavItem
                key={child.id}
                item={child}
                activeId={activeId}
                onSelect={onSelect}
                level={level + 1}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export type SidebarNavProps = {
  className?: string;
  groups: NavGroupData[];
  bottomItems?: NavItemData[];
  /** Rendered above the workspace switcher (e.g. the logo). */
  header?: React.ReactNode;
  /** Rendered below the bottom items (e.g. current user). */
  footer?: React.ReactNode;
  activeId?: string;
  defaultActiveId?: string;
  onSelect?: (id: string) => void;
  workspaces?: string[];
  activeWorkspace?: string;
  onWorkspaceSelect?: (ws: string) => void;
  workspacePlan?: string;
  workspaceCreateLabel?: string;
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
  workspaceCreateLabel,
}: SidebarNavProps) {
  const [internalId, setInternalId] = useState(
    defaultActiveId ?? groups[0]?.items[0]?.id ?? "",
  );
  const currentId = activeId !== undefined ? activeId : internalId;
  const handleSelect = onSelect || setInternalId;

  return (
    <div
      className={cn(
        "flex flex-col w-[260px] h-full bg-card/50 border-r border-border/50 p-3 font-sans",
        className,
      )}
    >
      {header}
      {workspaces.length > 0 && (
        <WorkspaceSwitcher
          workspaces={workspaces}
          selected={activeWorkspace}
          onSelect={onWorkspaceSelect}
          plan={workspacePlan}
          createLabel={workspaceCreateLabel}
        />
      )}

      <div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] flex flex-col gap-4 mt-2">
        {groups.map((group, idx) => (
          <div key={group.heading ?? idx} className="flex flex-col gap-0.5">
            {group.heading && (
              <span className="px-2.5 mb-1 text-[11px] font-semibold tracking-wider text-muted-foreground/50 uppercase">
                {group.heading}
              </span>
            )}
            {group.items.map((item) => (
              <NavItem
                key={item.id}
                item={item}
                activeId={currentId}
                onSelect={handleSelect}
              />
            ))}
          </div>
        ))}
      </div>

      {(bottomItems.length > 0 || footer) && (
        <div className="mt-auto pt-4 border-t border-border/50 flex flex-col gap-0.5">
          {bottomItems.map((item) => (
            <NavItem
              key={item.id}
              item={item}
              activeId={currentId}
              onSelect={handleSelect}
            />
          ))}
          {footer}
        </div>
      )}
    </div>
  );
}

export function flattenNavItems(items: NavItemData[]): NavItemData[] {
  return items.reduce((acc, item) => {
    acc.push(item);
    if (item.children) acc.push(...flattenNavItems(item.children));
    return acc;
  }, [] as NavItemData[]);
}
