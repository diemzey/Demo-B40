-- =============================================================================
-- 0005_reacomodo.sql
-- Jornada40 · Motor de reacomodo semanal
--
-- Principio: las horas de cobertura de la sucursal no desaparecen.
--   1. Quien está arriba del tope cede su exceso (queda en el tope).
--      Bolsa = Σ (horas − tope).
--   2. Fase 1 (deuda de contrato): quien está por debajo de su jornada
--      contratada sube primero hasta min(contrato, tope), mayor déficit antes.
--   3. Fase 2 (nivelación): la bolsa restante se reparte de 0.5 h en 0.5 h
--      dando siempre a quien menos horas tiene, hasta su límite (el tope, o
--      min(tope, max(contrato, hoy) + p_margen_contrato) si se fija margen).
--   4. Lo que sobra son horas sin cubrir → vacantes sugeridas = ⌈sobra / tope⌉
--      (o, si no se contrata, seguirán siendo horas al doble).
--
-- Misma lógica que src/lib/reacomodo/index.ts en la app.
-- Requiere: 0004_vistas_y_semilla_topes.sql
-- =============================================================================

create or replace function public.reacomodar_semana(
  p_sucursal uuid,
  p_semana date,
  p_tope numeric default null,
  p_margen_contrato numeric default null
)
returns table (
  empleado_id        uuid,
  nombre             text,
  apellido           text,
  puesto             text,
  foto_url           text,
  jornada_contratada numeric,
  horas_hoy          numeric,
  horas_reacomodadas numeric,
  delta              numeric,
  rol                text
)
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  v_lunes    date    := (date_trunc('week', p_semana::timestamp))::date;
  v_tope     numeric := coalesce(p_tope, public.tope_semanal(extract(year from v_lunes)::integer));
  v_paso     constant numeric := 0.5;
  v_ids      uuid[];
  v_hoy      numeric[];
  v_contrato numeric[];
  v_horas    numeric[];
  v_lim      numeric[];
  v_def      numeric[];
  v_n        integer;
  v_bolsa    numeric := 0;
  v_mejor    integer;
  v_da       numeric;
  i          integer;
  r          record;
begin
  if v_tope is null or v_tope <= 0 then
    raise exception 'Tope inválido para la semana %', v_lunes using errcode = 'invalid_parameter_value';
  end if;

  -- Colaboradores activos de la sucursal con horas esa semana (RLS aplica).
  select array_agg(t.id       order by t.apellido, t.nombre, t.id),
         array_agg(t.horas    order by t.apellido, t.nombre, t.id),
         array_agg(t.contrato order by t.apellido, t.nombre, t.id)
    into v_ids, v_hoy, v_contrato
  from (
    select e.id, e.apellido, e.nombre,
           v.horas_semana::numeric              as horas,
           e.jornada_contratada_horas::numeric  as contrato
    from public.empleados e
    join public.v_horas_semana v
      on v.empleado_id = e.id and v.semana_iso = v_lunes
    where e.sucursal_id = p_sucursal and e.activo
  ) t;

  v_n := coalesce(array_length(v_ids, 1), 0);
  if v_n = 0 then
    return;
  end if;

  v_horas := v_hoy;
  v_lim   := array_fill(v_tope, array[v_n]);
  v_def   := array_fill(0::numeric, array[v_n]);

  -- Límite al que puede subir cada persona.
  if p_margen_contrato is not null then
    for i in 1..v_n loop
      if v_contrato[i] is not null then
        v_lim[i] := least(v_tope, greatest(v_contrato[i], v_hoy[i]) + p_margen_contrato);
      end if;
    end loop;
  end if;

  -- 1. Ceden.
  for i in 1..v_n loop
    if v_horas[i] > v_tope then
      v_bolsa := v_bolsa + (v_horas[i] - v_tope);
      v_horas[i] := v_tope;
    end if;
  end loop;
  v_bolsa := floor(v_bolsa / v_paso) * v_paso;

  -- 2. Fase 1: deuda de contrato, mayor déficit primero.
  for i in 1..v_n loop
    v_def[i] := floor(greatest(0, least(coalesce(v_contrato[i], 0), v_lim[i]) - v_horas[i]) / v_paso) * v_paso;
  end loop;
  for r in
    select d.idx, d.deficit
    from unnest(v_def) with ordinality as d(deficit, idx)
    where d.deficit > 0
    order by d.deficit desc, d.idx
  loop
    exit when v_bolsa <= 0;
    v_da := least(r.deficit, v_bolsa);
    v_horas[r.idx] := v_horas[r.idx] + v_da;
    v_bolsa := v_bolsa - v_da;
  end loop;

  -- 3. Fase 2: nivelación de 0.5 h en 0.5 h a quien menos tiene.
  while v_bolsa >= v_paso loop
    v_mejor := null;
    for i in 1..v_n loop
      if v_horas[i] + v_paso <= v_lim[i]
         and (v_mejor is null or v_horas[i] < v_horas[v_mejor]) then
        v_mejor := i;
      end if;
    end loop;
    exit when v_mejor is null;
    v_horas[v_mejor] := v_horas[v_mejor] + v_paso;
    v_bolsa := v_bolsa - v_paso;
  end loop;

  return query
    select e.id, e.nombre, e.apellido, e.puesto, e.foto_url,
           e.jornada_contratada_horas::numeric,
           v_hoy[s.i],
           round(v_horas[s.i], 1),
           round(v_horas[s.i] - v_hoy[s.i], 1),
           case
             when v_horas[s.i] < v_hoy[s.i] then 'cede'
             when v_horas[s.i] > v_hoy[s.i] then 'recibe'
             else 'igual'
           end
    from generate_subscripts(v_ids, 1) as s(i)
    join public.empleados e on e.id = v_ids[s.i]
    order by e.apellido, e.nombre, e.id;
end;
$$;

comment on function public.reacomodar_semana(uuid, date, numeric, numeric) is
  'Propuesta de reacomodo semanal por colaborador: quien excede el tope cede, quien tiene capacidad recibe (primero deuda de contrato, luego nivelación de 0.5 h). Respeta RLS.';

-- -----------------------------------------------------------------------------
-- resumen_reacomodo: una fila con el balance de la propuesta.
-- -----------------------------------------------------------------------------
create or replace function public.resumen_reacomodo(
  p_sucursal uuid,
  p_semana date,
  p_tope numeric default null,
  p_margen_contrato numeric default null
)
returns table (
  semana_iso              date,
  tope_horas              numeric,
  colaboradores           integer,
  horas_totales           numeric,
  horas_excedentes        numeric,
  horas_absorbidas        numeric,
  horas_sin_cubrir        numeric,
  vacantes_sugeridas      integer,
  fuera_de_norma_antes    integer,
  fuera_de_norma_despues  integer
)
language sql
stable
security invoker
set search_path = ''
as $$
  with sem as (
    select (date_trunc('week', p_semana::timestamp))::date as lunes
  ),
  tope as (
    select coalesce(p_tope, public.tope_semanal(extract(year from sem.lunes)::integer)) as t from sem
  ),
  prop as (
    select * from public.reacomodar_semana(p_sucursal, p_semana, p_tope, p_margen_contrato)
  ),
  agg as (
    select
      count(*)::integer                                                   as colaboradores,
      coalesce(sum(prop.horas_hoy), 0)                                    as horas_totales,
      coalesce(sum(greatest(prop.horas_hoy - tope.t, 0)), 0)              as excedentes,
      coalesce(sum(greatest(prop.delta, 0)), 0)                           as absorbidas,
      (count(*) filter (where prop.horas_hoy > tope.t))::integer          as fuera_antes,
      (count(*) filter (where prop.horas_reacomodadas > tope.t))::integer as fuera_despues
    from prop cross join tope
  )
  select
    sem.lunes,
    tope.t,
    agg.colaboradores,
    round(agg.horas_totales, 1),
    round(agg.excedentes, 1),
    round(agg.absorbidas, 1),
    round(agg.excedentes - agg.absorbidas, 1),
    case when agg.excedentes - agg.absorbidas > 0
         then ceil((agg.excedentes - agg.absorbidas) / tope.t)::integer
         else 0 end,
    agg.fuera_antes,
    agg.fuera_despues
  from sem cross join tope cross join agg;
$$;

comment on function public.resumen_reacomodo(uuid, date, numeric, numeric) is
  'Balance del reacomodo: horas excedentes, absorbidas por la plantilla, sin cubrir y vacantes sugeridas (⌈sin cubrir / tope⌉).';

revoke all on function public.reacomodar_semana(uuid, date, numeric, numeric) from public, anon;
revoke all on function public.resumen_reacomodo(uuid, date, numeric, numeric)  from public, anon;
grant execute on function public.reacomodar_semana(uuid, date, numeric, numeric) to authenticated, service_role;
grant execute on function public.resumen_reacomodo(uuid, date, numeric, numeric)  to authenticated, service_role;
