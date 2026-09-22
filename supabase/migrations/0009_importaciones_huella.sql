-- 0009: huella del contenido por sucursal en importaciones_csv.
-- Permite retomar una carga interrumpida: si una sucursal ya tiene una carga
-- `completada` con la misma huella (mismas filas), la app la omite en vez de
-- volver a escribir sus turnos.
alter table public.importaciones_csv
  add column if not exists huella text;

comment on column public.importaciones_csv.huella is
  'SHA-256 (hex) de las filas normalizadas de la sucursal en el archivo; misma huella = mismos turnos.';

create index if not exists idx_importaciones_sucursal_huella
  on public.importaciones_csv (sucursal_id, huella)
  where estado = 'completada';
