-- =============================================================================
-- 0007_vistas_programacion.sql
-- Jornada40 · Capa de cómputo de la programación de turnos
--
-- Implementa docs/arquitectura.md §5 (cobertura pico) y §7 (ahorro trazable):
--   v_asignacion_horas_semana   horas por escenario-empleado-semana
--   tarifa_vigente()            tarifa/hora del puesto a una fecha
--   v_costo_empleado_semana     regulares / dobles / triples / prima dominical
--   materializar_baseline()     escenario baseline desde horarios vigentes
--   resumir_escenario()         cobertura_intervalo + resumen_escenario
--   v_subdotacion_pico          intervalos pico con déficit
--   v_ahorro_escenario          baseline vs propuesta por sucursal-semana
--   reporte_ejecutivo()         agregado por empresa (RLS) y semana
--
-- Todo es security invoker (respeta RLS) con search_path vacío.
-- Zona horaria de cálculo: 'America/Mexico_City'.
--
-- Requiere: 0006_programacion.sql.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- v_asignacion_horas_semana: Σ horas, Σ horas en domingo y días distintos
-- trabajados por (escenario, empleado, semana).
-- -----------------------------------------------------------------------------
create or replace view public.v_asignacion_horas_semana
with (security_invoker = true)
as
select
  a.escenario_id,
  a.empleado_id,
  a.semana_iso,
  sum(a.horas)::numeric(6,2)                                                   as horas,
  coalesce(sum(a.horas) filter (where a.es_domingo), 0)::numeric(6,2)          as horas_domingo,
  count(distinct (a.inicio at time zone 'America/Mexico_City')::date)::integer as dias_trabajados
from public.asignaciones a
group by a.escenario_id, a.empleado_id, a.semana_iso;

comment on view public.v_asignacion_horas_semana is
  'Horas totales, horas en domingo y días trabajados por escenario, empleado y semana ISO.';

-- -----------------------------------------------------------------------------
-- tarifa_vigente(puesto, fecha): salario_hora del tabulador más reciente con
-- vigente_desde <= fecha; 0 si el puesto es null o no tiene tabulador.
-- -----------------------------------------------------------------------------
create or replace function public.tarifa_vigente(p_puesto uuid, p_fecha date)
returns numeric
language sql
stable
security invoker
set search_path = ''
as $$
  select coalesce(
    (
      select t.salario_hora
      from public.tabuladores t
      where t.puesto_id = p_puesto
        and t.vigente_desde <= p_fecha
      order by t.vigente_desde desc
      limit 1
    ),
    0
  )::numeric;
$$;

comment on function public.tarifa_vigente(uuid, date) is
  'Tarifa por hora vigente de un puesto a una fecha (último tabulador con vigente_desde <= fecha; 0 si no hay).';

-- -----------------------------------------------------------------------------
-- v_costo_empleado_semana: desglose de horas y costo por escenario-empleado.
--   tope     = escenarios.tope_semanal
--   factores = fila de reglas_laborales del escenario
--   tarifa   = tarifa_vigente(puesto del empleado, lunes de la semana)
-- -----------------------------------------------------------------------------
create or replace view public.v_costo_empleado_semana
with (security_invoker = true)
as
with base as (
  select
    h.escenario_id,
    h.empleado_id,
    x.sucursal_id,
    h.semana_iso,
    x.tope_semanal                                            as tope,
    r.horas_dobles_max,
    r.factor_doble,
    r.factor_triple,
    r.prima_dominical_pct,
    public.tarifa_vigente(e.puesto_id, h.semana_iso)          as tarifa,
    h.horas,
    h.horas_domingo,
    h.dias_trabajados
  from public.v_asignacion_horas_semana h
  join public.escenarios       x on x.id = h.escenario_id
  join public.reglas_laborales r on r.id = x.reglas_id
  join public.empleados        e on e.id = h.empleado_id
),
horas as (
  select
    b.*,
    least(b.horas, b.tope)                                               as horas_regulares,
    least(greatest(b.horas - b.tope, 0), b.horas_dobles_max)             as horas_dobles,
    greatest(b.horas - b.tope - b.horas_dobles_max, 0)                   as horas_triples
  from base b
)
select
  h.escenario_id,
  h.empleado_id,
  h.sucursal_id,
  h.semana_iso,
  h.tarifa::numeric(8,2)                                                          as tarifa,
  h.tope,
  h.horas,
  h.horas_regulares::numeric(6,2)                                                 as horas_regulares,
  h.horas_dobles::numeric(6,2)                                                    as horas_dobles,
  h.horas_triples::numeric(6,2)                                                   as horas_triples,
  h.horas_domingo,
  h.dias_trabajados,
  round(h.tarifa * h.horas_regulares, 2)                                          as costo_regular,
  round(h.tarifa * h.factor_doble * h.horas_dobles, 2)                            as costo_dobles,
  round(h.tarifa * h.factor_triple * h.horas_triples, 2)                          as costo_triples,
  round(h.tarifa * (h.prima_dominical_pct / 100.0) * h.horas_domingo, 2)          as costo_prima_dominical,
  (
    round(h.tarifa * h.horas_regulares, 2)
    + round(h.tarifa * h.factor_doble * h.horas_dobles, 2)
    + round(h.tarifa * h.factor_triple * h.horas_triples, 2)
    + round(h.tarifa * (h.prima_dominical_pct / 100.0) * h.horas_domingo, 2)
  )                                                                               as costo_total
from horas h;

comment on view public.v_costo_empleado_semana is
  'Costo por escenario y empleado: regulares = min(horas, tope); dobles = min(max(horas − tope, 0), horas_dobles_max); triples = resto; prima dominical sobre horas en domingo.';

-- -----------------------------------------------------------------------------
-- materializar_baseline(sucursal, semana, reglas): crea un escenario baseline
-- (publicado, versión siguiente) con una asignación por fila de horarios de
-- la sucursal en esa semana ISO. Devuelve el id del escenario.
--   habilidad de la asignación = la del puesto del empleado, o la habilidad
--   'piso' de la empresa como respaldo.
--   tope_semanal = reglas.tope_semanal (p_reglas, o la vigente para la
--   empresa/global a la fecha del lunes).
-- No llama a resumir_escenario(); el motor lo hace al terminar (§2.5).
-- -----------------------------------------------------------------------------
create or replace function public.materializar_baseline(
  p_sucursal uuid,
  p_semana date,
  p_reglas uuid default null
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_tz        constant text := 'America/Mexico_City';
  v_lunes     date := (date_trunc('week', p_semana::timestamp))::date;
  v_empresa   uuid;
  v_reglas    public.reglas_laborales%rowtype;
  v_piso      uuid;
  v_version   integer;
  v_escenario uuid;
  v_filas     integer;
begin
  select h.empresa_id into v_empresa
  from public.sucursales s
  join public.hubs h on h.id = s.hub_id
  where s.id = p_sucursal;

  if v_empresa is null then
    raise exception 'Sucursal % inexistente o fuera de tu empresa', p_sucursal
      using errcode = 'invalid_parameter_value';
  end if;

  -- Reglas: explícitas, o la vigencia más reciente <= lunes (empresa antes que global).
  if p_reglas is not null then
    select * into v_reglas from public.reglas_laborales r where r.id = p_reglas;
  else
    select * into v_reglas
    from public.reglas_laborales r
    where (r.empresa_id = v_empresa or r.empresa_id is null)
      and r.vigente_desde <= v_lunes
    order by (r.empresa_id is not null) desc, r.vigente_desde desc
    limit 1;
  end if;

  if v_reglas.id is null then
    raise exception 'No hay reglas laborales vigentes para la semana %', v_lunes
      using errcode = 'no_data_found';
  end if;

  select hb.id into v_piso
  from public.habilidades hb
  where hb.empresa_id = v_empresa and hb.clave = 'piso';

  if v_piso is null and exists (
    select 1
    from public.horarios h
    join public.empleados e on e.id = h.empleado_id
    left join public.puestos p on p.id = e.puesto_id
    where e.sucursal_id = p_sucursal
      and h.fecha between v_lunes and v_lunes + 6
      and p.habilidad_id is null
  ) then
    raise exception 'La empresa no tiene la habilidad ''piso'' y hay empleados sin habilidad de puesto; crea la habilidad antes de materializar el baseline'
      using errcode = 'no_data_found';
  end if;

  select coalesce(max(x.version), 0) + 1 into v_version
  from public.escenarios x
  where x.sucursal_id = p_sucursal and x.semana_iso = v_lunes and x.tipo = 'baseline';

  insert into public.escenarios
    (sucursal_id, semana_iso, tipo, version, estado, tope_semanal, reglas_id, parametros)
  values
    (p_sucursal, v_lunes, 'baseline', v_version, 'borrador', v_reglas.tope_semanal, v_reglas.id,
     jsonb_build_object('origen', 'horarios', 'materializado_en', now()))
  returning id into v_escenario;

  insert into public.asignaciones
    (escenario_id, semana_iso, empleado_id, plantilla_id, habilidad_id, inicio, fin, descanso_min)
  select
    v_escenario,
    v_lunes,
    h.empleado_id,
    null,
    coalesce(p.habilidad_id, v_piso),
    (h.fecha + h.hora_inicio) at time zone v_tz,
    ((h.fecha + case when h.cruza_medianoche then 1 else 0 end) + h.hora_fin) at time zone v_tz,
    h.minutos_descanso
  from public.horarios h
  join public.empleados e on e.id = h.empleado_id
  left join public.puestos p on p.id = e.puesto_id
  where e.sucursal_id = p_sucursal
    and h.fecha between v_lunes and v_lunes + 6;

  get diagnostics v_filas = row_count;

  update public.escenarios
  set estado = 'publicado',
      parametros = parametros || jsonb_build_object('asignaciones', v_filas)
  where id = v_escenario;

  return v_escenario;
end;
$$;

comment on function public.materializar_baseline(uuid, date, uuid) is
  'Crea y publica un escenario baseline (versión siguiente) a partir de horarios de la sucursal en la semana ISO de p_semana. Devuelve su id.';

-- -----------------------------------------------------------------------------
-- resumir_escenario(escenario): regenera cobertura_intervalo y hace upsert de
-- resumen_escenario para un escenario. Demanda = pronóstico del escenario o,
-- si es null, el más reciente de la sucursal-semana. Sin pronóstico, la
-- cobertura queda vacía y sólo se calcula el costo.
-- -----------------------------------------------------------------------------
create or replace function public.resumir_escenario(p_escenario uuid)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_esc         public.escenarios%rowtype;
  v_pronostico  uuid;
  v_caja        uuid;
  v_tarifa_pond numeric := 0;
  v_cob         record;
  v_cos         record;
begin
  select * into v_esc from public.escenarios where id = p_escenario;
  if v_esc.id is null then
    raise exception 'Escenario % inexistente o fuera de tu empresa', p_escenario
      using errcode = 'invalid_parameter_value';
  end if;

  v_pronostico := v_esc.pronostico_id;
  if v_pronostico is null then
    select pr.id into v_pronostico
    from public.pronosticos pr
    where pr.sucursal_id = v_esc.sucursal_id and pr.semana_iso = v_esc.semana_iso
    order by pr.generado_en desc
    limit 1;
  end if;

  select hb.id into v_caja
  from public.habilidades hb
  join public.sucursales s on s.id = v_esc.sucursal_id
  join public.hubs h on h.id = s.hub_id and h.empresa_id = hb.empresa_id
  where hb.clave = 'caja';

  -- 1. Cobertura por intervalo: turnos cuyo [inicio, fin) contiene el inicio
  --    del intervalo (el descanso no reduce cobertura).
  delete from public.cobertura_intervalo c where c.escenario_id = p_escenario;

  if v_pronostico is not null then
    insert into public.cobertura_intervalo
      (escenario_id, inicio, requerido_total, asignado_total, requerido_caja, asignado_caja, es_pico)
    select
      p_escenario,
      d.inicio,
      d.requerido_total,
      count(a.id),
      d.requerido_caja,
      count(a.id) filter (where a.habilidad_id = v_caja),
      d.es_pico
    from public.demanda_intervalo d
    left join public.asignaciones a
      on a.escenario_id = p_escenario
     and a.semana_iso   = d.semana_iso
     and a.inicio      <= d.inicio
     and a.fin         >  d.inicio
    where d.pronostico_id = v_pronostico
      and d.semana_iso    = v_esc.semana_iso
    group by d.inicio, d.requerido_total, d.requerido_caja, d.es_pico;
  end if;

  -- 2. Costo por empleado (v_costo_empleado_semana) y tarifa media ponderada.
  select
    coalesce(sum(v.horas), 0)                  as horas_totales,
    coalesce(sum(v.horas_regulares), 0)        as horas_regulares,
    coalesce(sum(v.horas_dobles), 0)           as horas_dobles,
    coalesce(sum(v.horas_triples), 0)          as horas_triples,
    coalesce(sum(v.horas_domingo), 0)          as horas_domingo,
    coalesce(sum(v.costo_regular), 0)          as costo_regular,
    coalesce(sum(v.costo_dobles), 0)           as costo_dobles,
    coalesce(sum(v.costo_triples), 0)          as costo_triples,
    coalesce(sum(v.costo_prima_dominical), 0)  as costo_prima_dominical,
    coalesce(sum(v.costo_total), 0)            as costo_empleados,
    coalesce(sum(v.tarifa * v.horas) / nullif(sum(v.horas), 0), 0) as tarifa_ponderada
  into v_cos
  from public.v_costo_empleado_semana v
  where v.escenario_id = p_escenario;

  v_tarifa_pond := v_cos.tarifa_ponderada;

  -- 3. Sobrestaffing y cobertura pico sobre la cobertura materializada.
  select
    coalesce(sum(greatest(c.asignado_total - c.requerido_total, 0)) * 0.5, 0)                    as horas_sobre,
    count(*) filter (where c.es_pico)                                                             as intervalos_pico,
    count(*) filter (where c.es_pico and c.asignado_total >= c.requerido_total)                   as intervalos_pico_cubiertos,
    coalesce(sum(greatest(c.requerido_total - c.asignado_total, 0)) filter (where c.es_pico) * 0.5, 0) as deficit_pico_horas
  into v_cob
  from public.cobertura_intervalo c
  where c.escenario_id = p_escenario;

  -- 4. Upsert del resumen.
  insert into public.resumen_escenario as r
    (escenario_id, horas_totales, horas_regulares, horas_dobles, horas_triples, horas_domingo,
     costo_regular, costo_dobles, costo_triples, costo_prima_dominical,
     horas_sobrestaffing, costo_sobrestaffing, costo_total,
     intervalos_pico, intervalos_pico_cubiertos, deficit_pico_horas, calculado_en)
  values
    (p_escenario,
     v_cos.horas_totales, v_cos.horas_regulares, v_cos.horas_dobles, v_cos.horas_triples, v_cos.horas_domingo,
     v_cos.costo_regular, v_cos.costo_dobles, v_cos.costo_triples, v_cos.costo_prima_dominical,
     v_cob.horas_sobre, round(v_cob.horas_sobre * v_tarifa_pond, 2),
     v_cos.costo_empleados + round(v_cob.horas_sobre * v_tarifa_pond, 2),
     v_cob.intervalos_pico, v_cob.intervalos_pico_cubiertos, v_cob.deficit_pico_horas, now())
  on conflict (escenario_id) do update set
    horas_totales             = excluded.horas_totales,
    horas_regulares           = excluded.horas_regulares,
    horas_dobles              = excluded.horas_dobles,
    horas_triples             = excluded.horas_triples,
    horas_domingo             = excluded.horas_domingo,
    costo_regular             = excluded.costo_regular,
    costo_dobles              = excluded.costo_dobles,
    costo_triples             = excluded.costo_triples,
    costo_prima_dominical     = excluded.costo_prima_dominical,
    horas_sobrestaffing       = excluded.horas_sobrestaffing,
    costo_sobrestaffing       = excluded.costo_sobrestaffing,
    costo_total               = excluded.costo_total,
    intervalos_pico           = excluded.intervalos_pico,
    intervalos_pico_cubiertos = excluded.intervalos_pico_cubiertos,
    deficit_pico_horas        = excluded.deficit_pico_horas,
    calculado_en              = excluded.calculado_en;
end;
$$;

comment on function public.resumir_escenario(uuid) is
  'Regenera cobertura_intervalo y resumen_escenario de un escenario (costo por empleado + sobrestaffing + cobertura pico). Respeta RLS.';

-- -----------------------------------------------------------------------------
-- v_subdotacion_pico: intervalos pico con déficit (requerido > asignado).
-- -----------------------------------------------------------------------------
create or replace view public.v_subdotacion_pico
with (security_invoker = true)
as
select
  c.escenario_id,
  x.sucursal_id,
  x.semana_iso,
  x.tipo,
  c.inicio,
  c.requerido_total,
  c.asignado_total,
  (c.requerido_total - c.asignado_total)::numeric(5,2) as deficit
from public.cobertura_intervalo c
join public.escenarios x on x.id = c.escenario_id
where c.es_pico
  and c.requerido_total > c.asignado_total;

comment on view public.v_subdotacion_pico is 'Intervalos pico con subdotación por escenario.';

-- -----------------------------------------------------------------------------
-- v_ahorro_escenario: último baseline publicado vs última propuesta publicada
-- por (sucursal, semana), con sus resúmenes.
-- Cobertura pico (%) = intervalos pico cubiertos / intervalos pico.
-- -----------------------------------------------------------------------------
create or replace view public.v_ahorro_escenario
with (security_invoker = true)
as
with publicados as (
  select
    x.*,
    row_number() over (
      partition by x.sucursal_id, x.semana_iso, x.tipo
      order by x.version desc, x.publicado_en desc nulls last
    ) as rn
  from public.escenarios x
  where x.estado = 'publicado'
),
b as (select * from publicados where tipo = 'baseline'  and rn = 1),
p as (select * from publicados where tipo = 'propuesta' and rn = 1)
select
  b.sucursal_id,
  b.semana_iso,
  b.id                                                                    as escenario_baseline_id,
  p.id                                                                    as escenario_propuesta_id,
  p.tope_semanal                                                          as tope_semanal,
  rb.costo_total                                                          as costo_total_baseline,
  rp.costo_total                                                          as costo_total_propuesta,
  (rb.costo_total - rp.costo_total)::numeric(14,2)                        as ahorro_mxn,
  case when rb.costo_total > 0
       then round(100.0 * (rb.costo_total - rp.costo_total) / rb.costo_total, 2)
       else 0 end                                                         as ahorro_pct,
  (rb.costo_dobles - rp.costo_dobles)::numeric(14,2)                      as ahorro_dobles,
  (rb.costo_triples - rp.costo_triples)::numeric(14,2)                    as ahorro_triples,
  (rb.costo_prima_dominical - rp.costo_prima_dominical)::numeric(14,2)    as ahorro_prima,
  (rb.costo_sobrestaffing - rp.costo_sobrestaffing)::numeric(14,2)        as ahorro_sobrestaffing,
  case when rb.intervalos_pico > 0
       then round(100.0 * rb.intervalos_pico_cubiertos / rb.intervalos_pico, 2)
       else null end                                                      as cobertura_pico_baseline_pct,
  case when rp.intervalos_pico > 0
       then round(100.0 * rp.intervalos_pico_cubiertos / rp.intervalos_pico, 2)
       else null end                                                      as cobertura_pico_propuesta_pct,
  rp.deficit_pico_horas                                                   as deficit_pico_horas_propuesta,
  rb.horas_totales                                                        as horas_baseline,
  rp.horas_totales                                                        as horas_propuesta
from b
join p  on p.sucursal_id = b.sucursal_id and p.semana_iso = b.semana_iso
join public.resumen_escenario rb on rb.escenario_id = b.id
join public.resumen_escenario rp on rp.escenario_id = p.id;

comment on view public.v_ahorro_escenario is
  'Ahorro por sucursal-semana: último baseline publicado vs última propuesta publicada (costo, desglose, cobertura pico).';

-- -----------------------------------------------------------------------------
-- reporte_ejecutivo(semana): agregado por semana de v_ahorro_escenario para
-- la empresa del usuario (RLS). p_semana null → todas las semanas, una fila
-- por semana ISO.
-- -----------------------------------------------------------------------------
create or replace function public.reporte_ejecutivo(p_semana date default null)
returns table (
  semana_iso                    date,
  tiendas                       integer,
  costo_baseline                numeric,
  costo_propuesta               numeric,
  ahorro_mxn                    numeric,
  ahorro_pct                    numeric,
  ahorro_dobles                 numeric,
  ahorro_triples                numeric,
  ahorro_prima                  numeric,
  ahorro_sobrestaffing          numeric,
  horas_baseline                numeric,
  horas_propuesta               numeric,
  cobertura_pico_baseline_pct   numeric,
  cobertura_pico_propuesta_pct  numeric,
  tiendas_con_subdotacion_pico  integer,
  deficit_pico_horas            numeric
)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    v.semana_iso,
    count(*)::integer                                                   as tiendas,
    sum(v.costo_total_baseline)::numeric(14,2)                          as costo_baseline,
    sum(v.costo_total_propuesta)::numeric(14,2)                         as costo_propuesta,
    sum(v.ahorro_mxn)::numeric(14,2)                                    as ahorro_mxn,
    case when sum(v.costo_total_baseline) > 0
         then round(100.0 * sum(v.ahorro_mxn) / sum(v.costo_total_baseline), 2)
         else 0 end                                                     as ahorro_pct,
    sum(v.ahorro_dobles)::numeric(14,2)                                 as ahorro_dobles,
    sum(v.ahorro_triples)::numeric(14,2)                                as ahorro_triples,
    sum(v.ahorro_prima)::numeric(14,2)                                  as ahorro_prima,
    sum(v.ahorro_sobrestaffing)::numeric(14,2)                          as ahorro_sobrestaffing,
    sum(v.horas_baseline)::numeric(12,2)                                as horas_baseline,
    sum(v.horas_propuesta)::numeric(12,2)                               as horas_propuesta,
    round(avg(v.cobertura_pico_baseline_pct), 2)                        as cobertura_pico_baseline_pct,
    round(avg(v.cobertura_pico_propuesta_pct), 2)                       as cobertura_pico_propuesta_pct,
    (count(*) filter (where v.deficit_pico_horas_propuesta > 0))::integer
                                                                        as tiendas_con_subdotacion_pico,
    sum(v.deficit_pico_horas_propuesta)::numeric(12,2)                  as deficit_pico_horas
  from public.v_ahorro_escenario v
  where p_semana is null
     or v.semana_iso = (date_trunc('week', p_semana::timestamp))::date
  group by v.semana_iso
  order by v.semana_iso;
$$;

comment on function public.reporte_ejecutivo(date) is
  'Reporte ejecutivo por semana ISO para la empresa del usuario: costo baseline vs propuesta, ahorro y desglose, cobertura pico. p_semana null = todas las semanas.';

-- -----------------------------------------------------------------------------
-- Privilegios
-- -----------------------------------------------------------------------------
revoke all on public.v_asignacion_horas_semana from anon;
revoke all on public.v_costo_empleado_semana   from anon;
revoke all on public.v_subdotacion_pico        from anon;
revoke all on public.v_ahorro_escenario        from anon;
grant select on public.v_asignacion_horas_semana to authenticated, service_role;
grant select on public.v_costo_empleado_semana   to authenticated, service_role;
grant select on public.v_subdotacion_pico        to authenticated, service_role;
grant select on public.v_ahorro_escenario        to authenticated, service_role;

revoke all on function public.tarifa_vigente(uuid, date)                    from public, anon;
revoke all on function public.materializar_baseline(uuid, date, uuid)       from public, anon;
revoke all on function public.resumir_escenario(uuid)                       from public, anon;
revoke all on function public.reporte_ejecutivo(date)                       from public, anon;
grant execute on function public.tarifa_vigente(uuid, date)                 to authenticated, service_role;
grant execute on function public.materializar_baseline(uuid, date, uuid)    to authenticated, service_role;
grant execute on function public.resumir_escenario(uuid)                    to authenticated, service_role;
grant execute on function public.reporte_ejecutivo(date)                    to authenticated, service_role;
