-- 0012: semanas cargadas que aún no tienen propuesta publicada.
-- La app programa en segundo plano tras importar; si la pestaña se cierra a
-- medias, el panel ofrece terminar lo que falta con esta lista.
create or replace function public.semanas_sin_propuesta()
returns table (sucursal_id uuid, sucursal text, semana_iso date, colaboradores integer)
language sql
stable
security invoker
set search_path = ''
as $$
  with cargadas as (
    select e.sucursal_id, (date_trunc('week', h.fecha::timestamp))::date as semana_iso,
           count(distinct h.empleado_id)::integer as colaboradores
    from public.horarios h
    join public.empleados e on e.id = h.empleado_id
    group by e.sucursal_id, (date_trunc('week', h.fecha::timestamp))::date
  )
  select c.sucursal_id, s.nombre, c.semana_iso, c.colaboradores
  from cargadas c
  join public.sucursales s on s.id = c.sucursal_id
  where not exists (
    select 1 from public.escenarios x
    where x.sucursal_id = c.sucursal_id and x.semana_iso = c.semana_iso
      and x.tipo = 'propuesta' and x.estado = 'publicado'
  )
  order by s.nombre, c.semana_iso;
$$;

comment on function public.semanas_sin_propuesta() is
  'Sucursal-semanas con turnos cargados (RLS del usuario) y sin propuesta publicada.';

revoke all on function public.semanas_sin_propuesta() from public, anon;
grant execute on function public.semanas_sin_propuesta() to authenticated;
