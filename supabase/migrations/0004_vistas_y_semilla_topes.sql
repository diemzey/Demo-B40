-- =============================================================================
-- 0004_vistas_y_semilla_topes.sql
-- Jornada40 · Semilla de topes legales, vistas de horas semanales y RPC
--
-- Requiere: 0003_rls.sql
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Topes semanales de la reforma (horas por semana; el exceso se paga al doble).
-- -----------------------------------------------------------------------------
insert into public.topes_semanales (anio, tope_horas) values
  (2026, 48.0),
  (2027, 46.0),
  (2028, 44.0),
  (2029, 42.0),
  (2030, 40.0)
on conflict (anio) do nothing;

-- -----------------------------------------------------------------------------
-- tope_semanal(anio): tope aplicable a un año.
--   * Año en catálogo → su tope.
--   * Año posterior al último (2031+) → el último tope conocido (40 h).
--   * Año anterior al primero (≤2025) → el primer tope conocido (48 h).
-- -----------------------------------------------------------------------------
create or replace function public.tope_semanal(p_anio integer)
returns numeric
language sql
stable
set search_path = ''
as $$
  select coalesce(
    (select t.tope_horas from public.topes_semanales t where t.anio = p_anio),
    (select t.tope_horas from public.topes_semanales t where t.anio < p_anio order by t.anio desc limit 1),
    (select t.tope_horas from public.topes_semanales t where t.anio > p_anio order by t.anio asc  limit 1)
  );
$$;

comment on function public.tope_semanal(integer) is
  'Tope semanal legal (horas) para un año; extrapola al primer/último valor conocido.';

revoke all on function public.tope_semanal(integer) from public, anon;
grant execute on function public.tope_semanal(integer) to authenticated, service_role;

-- -----------------------------------------------------------------------------
-- v_horas_semana: horas por empleado y semana ISO (lunes como inicio).
-- security_invoker → se aplican las políticas RLS del usuario que consulta.
-- -----------------------------------------------------------------------------
create or replace view public.v_horas_semana
with (security_invoker = true)
as
select
  e.id                                              as empleado_id,
  e.sucursal_id,
  (date_trunc('week', h.fecha::timestamp))::date    as semana_iso,
  sum(h.horas)::numeric(6,2)                        as horas_semana
from public.horarios h
join public.empleados e on e.id = h.empleado_id
group by e.id, e.sucursal_id, (date_trunc('week', h.fecha::timestamp))::date;

comment on view public.v_horas_semana is
  'Suma de horas efectivas por empleado y semana ISO (semana_iso = lunes de esa semana).';

-- -----------------------------------------------------------------------------
-- v_resumen_sucursal_semana: resumen por sucursal y semana frente al tope legal.
-- -----------------------------------------------------------------------------
create or replace view public.v_resumen_sucursal_semana
with (security_invoker = true)
as
with base as (
  select
    v.sucursal_id,
    v.semana_iso,
    v.empleado_id,
    v.horas_semana,
    public.tope_semanal(extract(year from v.semana_iso)::integer) as tope_horas
  from public.v_horas_semana v
)
select
  b.sucursal_id,
  b.semana_iso,
  b.tope_horas,
  count(*)::integer                                                       as colaboradores,
  sum(b.horas_semana)::numeric(8,2)                                       as horas_totales,
  sum(greatest(b.horas_semana - b.tope_horas, 0))::numeric(8,2)           as horas_al_doble,
  (count(*) filter (where b.horas_semana > b.tope_horas))::integer        as fuera_de_norma
from base b
group by b.sucursal_id, b.semana_iso, b.tope_horas;

comment on view public.v_resumen_sucursal_semana is
  'Por sucursal y semana: colaboradores con horas, horas totales, horas al doble y colaboradores fuera de norma.';

grant select on public.v_horas_semana            to authenticated;
grant select on public.v_resumen_sucursal_semana to authenticated;
revoke all on public.v_horas_semana            from anon;
revoke all on public.v_resumen_sucursal_semana from anon;

-- -----------------------------------------------------------------------------
-- RPC resumen_sucursal(p_sucursal, p_semana): una fila de resumen para la
-- sucursal y la semana que contiene p_semana (siempre devuelve una fila,
-- con ceros si no hay horarios). security invoker → respeta RLS.
-- -----------------------------------------------------------------------------
create or replace function public.resumen_sucursal(p_sucursal uuid, p_semana date)
returns table (
  sucursal_id     uuid,
  semana_iso      date,
  tope_horas      numeric,
  colaboradores   integer,
  horas_totales   numeric,
  horas_al_doble  numeric,
  fuera_de_norma  integer
)
language sql
stable
security invoker
set search_path = ''
as $$
  with sem as (
    select (date_trunc('week', p_semana::timestamp))::date as semana_iso
  ),
  tope as (
    select public.tope_semanal(extract(year from sem.semana_iso)::integer) as tope_horas
    from sem
  )
  select
    p_sucursal                                                              as sucursal_id,
    sem.semana_iso,
    tope.tope_horas,
    count(v.empleado_id)::integer                                           as colaboradores,
    coalesce(sum(v.horas_semana), 0)::numeric(8,2)                          as horas_totales,
    coalesce(sum(greatest(v.horas_semana - tope.tope_horas, 0)), 0)::numeric(8,2)
                                                                            as horas_al_doble,
    (count(v.empleado_id) filter (where v.horas_semana > tope.tope_horas))::integer
                                                                            as fuera_de_norma
  from sem
  cross join tope
  left join public.v_horas_semana v
    on v.sucursal_id = p_sucursal
   and v.semana_iso  = sem.semana_iso
  group by sem.semana_iso, tope.tope_horas;
$$;

comment on function public.resumen_sucursal(uuid, date) is
  'Resumen semanal de una sucursal (semana ISO que contiene p_semana). Respeta RLS.';

revoke all on function public.resumen_sucursal(uuid, date) from public, anon;
grant execute on function public.resumen_sucursal(uuid, date) to authenticated, service_role;
