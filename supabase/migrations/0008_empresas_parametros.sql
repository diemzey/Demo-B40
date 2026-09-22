-- =============================================================================
-- 0008_empresas_parametros.sql
-- Jornada40 · Parámetros de programación por empresa
--   tope_objetivo      tope semanal con el que el motor programa (40 = reforma)
--   costo_hora_default tarifa por hora para puestos sin tabulador propio
-- Los edita el owner en Configuración (política empresas_update); los lee
-- programarSemana (src/lib/motor/programar.ts).
-- Requiere: 0006_programacion.sql
-- =============================================================================
alter table public.empresas
  add column if not exists tope_objetivo      numeric(4,1) not null default 40,
  add column if not exists costo_hora_default numeric(8,2) not null default 60;
alter table public.empresas drop constraint if exists empresas_tope_objetivo_rango;
alter table public.empresas add constraint empresas_tope_objetivo_rango check (tope_objetivo between 30 and 48);
alter table public.empresas drop constraint if exists empresas_costo_hora_positivo;
alter table public.empresas add constraint empresas_costo_hora_positivo check (costo_hora_default > 0);
comment on column public.empresas.tope_objetivo is 'Tope semanal (h) con el que el motor programa las semanas de la empresa; 40 = meta de la reforma.';
comment on column public.empresas.costo_hora_default is 'Tarifa por hora (MXN) usada para puestos sin tabulador propio.';
