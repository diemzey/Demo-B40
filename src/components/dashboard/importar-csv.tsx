"use client";

import { ImportarYProgramar } from "@/components/dashboard/importar-y-programar";

/**
 * @deprecated Sustituido por `ImportarYProgramar` (importar-y-programar.tsx),
 * que además corre el motor y refresca la ruta por sí mismo. Se conserva sólo
 * para que los usos existentes compilen mientras migran a
 * `<ImportarYProgramar compacto />`; borrar cuando no queden importaciones.
 */
export function ImportarCsv({ className, onImportado }: { className?: string; onImportado?: () => void }) {
  return <ImportarYProgramar compacto className={className} onListo={onImportado} />;
}
