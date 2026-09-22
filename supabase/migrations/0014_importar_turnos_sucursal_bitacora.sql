-- 0014: `importar_turnos_sucursal` también abre y cierra la bitácora.
-- Una sola llamada por sucursal: crea la fila de `importaciones_csv`
-- (o recibe una abierta, para archivos grandes en trozos), hace el upsert de
-- empleados y horarios y cierra la carga. Sustituye a la versión de 0013.
drop function if exists public.importar_turnos_sucursal(uuid, jsonb);

create or replace function public.importar_turnos_sucursal(
  p_sucursal       uuid,
  p_nombre_archivo text,
  p_huella         text,
  p_filas_totales  integer,
  p_filas          jsonb,
  p_errores        jsonb    default '[]'::jsonb,
  p_importacion    uuid     default null,
  p_cerrar         boolean  default true
)
returns table (importacion_id uuid, empleados integer, horarios integer)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_imp uuid;
  v_emp integer := 0;
  v_hor integer := 0;
begin
  if p_importacion is null then
    insert into public.importaciones_csv (sucursal_id, nombre_archivo, estado, filas_totales, huella)
    values (p_sucursal, p_nombre_archivo, 'procesando', p_filas_totales, p_huella)
    returning id into v_imp;
  else
    select i.id into v_imp
    from public.importaciones_csv i
    where i.id = p_importacion and i.sucursal_id = p_sucursal;
    if v_imp is null then
      raise exception 'Importación % inexistente o fuera de tu empresa', p_importacion
        using errcode = 'invalid_parameter_value';
    end if;
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
  select p_sucursal, f.clave, f.nombre, f.apellido, f.puesto, f.jornada
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
  select e.id, f.fecha, f.inicio, f.fin, f.cruza, f.descanso, 'csv', v_imp
  from filas f
  join public.empleados e on e.sucursal_id = p_sucursal and e.clave_externa = f.clave
  on conflict (empleado_id, fecha, hora_inicio)
  do update set
    hora_fin = excluded.hora_fin,
    cruza_medianoche = excluded.cruza_medianoche,
    minutos_descanso = excluded.minutos_descanso,
    origen = 'csv',
    importacion_id = excluded.importacion_id;
  get diagnostics v_hor = row_count;

  -- 3. Bitácora: filas acumuladas por trozo; estado al cerrar.
  update public.importaciones_csv i
  set filas_ok = i.filas_ok + jsonb_array_length(p_filas),
      filas_error = case when p_cerrar then jsonb_array_length(coalesce(p_errores, '[]'::jsonb)) else i.filas_error end,
      errores = case when p_cerrar then coalesce(p_errores, '[]'::jsonb) else i.errores end,
      estado = case
        when not p_cerrar then 'procesando'::public.estado_importacion
        when jsonb_array_length(coalesce(p_errores, '[]'::jsonb)) > 0 then 'con_errores'::public.estado_importacion
        else 'completada'::public.estado_importacion
      end
  where i.id = v_imp;

  return query select v_imp, v_emp, v_hor;
end;
$$;

comment on function public.importar_turnos_sucursal(uuid, text, text, integer, jsonb, jsonb, uuid, boolean) is
  'Carga de una sucursal en una llamada: abre la bitácora (o continúa p_importacion), upsert de empleados y horarios desde filas JSON y cierre (p_cerrar). Misma RLS del usuario.';

revoke all on function public.importar_turnos_sucursal(uuid, text, text, integer, jsonb, jsonb, uuid, boolean) from public, anon;
grant execute on function public.importar_turnos_sucursal(uuid, text, text, integer, jsonb, jsonb, uuid, boolean) to authenticated;
