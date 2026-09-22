-- 0013: importación de turnos por sucursal en una sola llamada.
-- La app enviaba los turnos en lotes de 500 por PostgREST (170 viajes para
-- 85 mil turnos). Con esta función manda las filas de una sucursal en JSON y
-- Postgres hace el upsert de empleados y horarios en conjunto, con las mismas
-- políticas RLS (security invoker). Devuelve los conteos.
create or replace function public.importar_turnos_sucursal(p_importacion uuid, p_filas jsonb)
returns table (empleados integer, horarios integer)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_sucursal uuid;
  v_emp      integer := 0;
  v_hor      integer := 0;
begin
  select i.sucursal_id into v_sucursal
  from public.importaciones_csv i
  where i.id = p_importacion;
  if v_sucursal is null then
    raise exception 'Importación % inexistente o fuera de tu empresa', p_importacion
      using errcode = 'invalid_parameter_value';
  end if;

  -- 1. Empleados: la última fila (n mayor) de cada clave manda en nombre/puesto/jornada.
  with filas as (
    select distinct on (x.clave) x.clave, x.nombre, x.apellido, x.puesto, x.jornada
    from jsonb_to_recordset(p_filas)
      as x(clave text, nombre text, apellido text, puesto text, jornada numeric, n integer)
    where x.clave is not null
    order by x.clave, x.n desc
  )
  insert into public.empleados (sucursal_id, clave_externa, nombre, apellido, puesto, jornada_contratada_horas)
  select v_sucursal, f.clave, f.nombre, f.apellido, f.puesto, f.jornada
  from filas f
  on conflict (sucursal_id, clave_externa) where clave_externa is not null
  do update set
    nombre = excluded.nombre,
    apellido = excluded.apellido,
    puesto = excluded.puesto,
    jornada_contratada_horas = excluded.jornada_contratada_horas;
  get diagnostics v_emp = row_count;

  -- 2. Horarios: upsert por (empleado, fecha, hora_inicio); re-importar actualiza.
  with filas as (
    select distinct on (x.clave, x.fecha, x.inicio)
      x.clave, x.fecha, x.inicio, x.fin, coalesce(x.cruza, false) as cruza, coalesce(x.descanso, 0) as descanso
    from jsonb_to_recordset(p_filas)
      as x(clave text, fecha date, inicio time, fin time, cruza boolean, descanso integer, n integer)
    where x.clave is not null
    order by x.clave, x.fecha, x.inicio, x.n desc
  )
  insert into public.horarios (empleado_id, fecha, hora_inicio, hora_fin, cruza_medianoche, minutos_descanso, origen, importacion_id)
  select e.id, f.fecha, f.inicio, f.fin, f.cruza, f.descanso, 'csv', p_importacion
  from filas f
  join public.empleados e on e.sucursal_id = v_sucursal and e.clave_externa = f.clave
  on conflict (empleado_id, fecha, hora_inicio)
  do update set
    hora_fin = excluded.hora_fin,
    cruza_medianoche = excluded.cruza_medianoche,
    minutos_descanso = excluded.minutos_descanso,
    origen = 'csv',
    importacion_id = excluded.importacion_id;
  get diagnostics v_hor = row_count;

  return query select v_emp, v_hor;
end;
$$;

comment on function public.importar_turnos_sucursal(uuid, jsonb) is
  'Upsert en conjunto de empleados y horarios de una sucursal a partir de las filas JSON de un CSV (misma RLS del usuario).';

revoke all on function public.importar_turnos_sucursal(uuid, jsonb) from public, anon;
grant execute on function public.importar_turnos_sucursal(uuid, jsonb) to authenticated;
