-- =============================================================================
-- 0003_rls.sql
-- Jornada40 · Row Level Security
--
-- Modelo:
--   * Cada usuario (perfiles) pertenece a una empresa. Todo lo que ve o modifica
--     debe colgar de esa empresa a través de la cadena
--     empresa → hub → sucursal → empleado → horario.
--   * Roles:
--       owner            → todo, incluida gestión de roles y datos de la empresa
--       admin            → estructura (hubs, sucursales) + operación
--       gerente          → operación (empleados, horarios, importaciones)
--       lectura          → sólo lectura
--   * anon no tiene acceso a ninguna tabla.
--
-- Requiere: 0002_esquema_base.sql
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Funciones auxiliares (security definer para no recursar sobre RLS de perfiles)
-- -----------------------------------------------------------------------------
create or replace function public.empresa_actual()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select p.empresa_id
  from public.perfiles p
  where p.id = (select auth.uid());
$$;

comment on function public.empresa_actual() is 'empresa_id del usuario autenticado (null si no tiene empresa).';

create or replace function public.rol_actual()
returns public.rol_usuario
language sql
stable
security definer
set search_path = ''
as $$
  select p.rol
  from public.perfiles p
  where p.id = (select auth.uid());
$$;

comment on function public.rol_actual() is 'Rol del usuario autenticado dentro de su empresa.';

-- owner/admin: pueden modificar estructura (empresa, hubs, sucursales, perfiles).
create or replace function public.es_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(public.rol_actual() in ('owner', 'admin'), false);
$$;

-- owner/admin/gerente: pueden modificar operación (empleados, horarios, importaciones).
create or replace function public.puede_editar()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(public.rol_actual() in ('owner', 'admin', 'gerente'), false);
$$;

revoke all on function public.empresa_actual() from public, anon;
revoke all on function public.rol_actual()    from public, anon;
revoke all on function public.es_admin()      from public, anon;
revoke all on function public.puede_editar()  from public, anon;
grant execute on function public.empresa_actual() to authenticated, service_role;
grant execute on function public.rol_actual()    to authenticated, service_role;
grant execute on function public.es_admin()      to authenticated, service_role;
grant execute on function public.puede_editar()  to authenticated, service_role;

-- -----------------------------------------------------------------------------
-- Protección de campos sensibles en perfiles:
-- sólo un owner puede cambiar rol o empresa_id de un perfil (desde la API).
-- Las conexiones sin auth.uid() (service role / migraciones) no se restringen.
-- -----------------------------------------------------------------------------
create or replace function public.perfiles_proteger_campos()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is not null
     and (new.rol is distinct from old.rol or new.empresa_id is distinct from old.empresa_id)
     and public.rol_actual() is distinct from 'owner'::public.rol_usuario
  then
    raise exception 'Sólo un owner puede cambiar el rol o la empresa de un perfil'
      using errcode = 'insufficient_privilege';
  end if;
  return new;
end;
$$;

-- La función de trigger no se expone vía RPC; el trigger no requiere EXECUTE
-- en tiempo de disparo.
revoke all on function public.perfiles_proteger_campos() from public, anon, authenticated;

drop trigger if exists trg_perfiles_proteger_campos on public.perfiles;
create trigger trg_perfiles_proteger_campos
  before update on public.perfiles
  for each row execute function public.perfiles_proteger_campos();

-- -----------------------------------------------------------------------------
-- Habilitar RLS
-- -----------------------------------------------------------------------------
alter table public.empresas          enable row level security;
alter table public.hubs              enable row level security;
alter table public.sucursales        enable row level security;
alter table public.perfiles          enable row level security;
alter table public.empleados         enable row level security;
alter table public.importaciones_csv enable row level security;
alter table public.horarios          enable row level security;
alter table public.topes_semanales   enable row level security;

-- -----------------------------------------------------------------------------
-- Privilegios de esquema: authenticated sí, anon no.
-- (Supabase otorga por defecto privilegios a anon; aquí se retiran.)
-- -----------------------------------------------------------------------------
grant usage on schema public to authenticated;
revoke all on all tables    in schema public from anon;
revoke all on all functions in schema public from anon;
grant select, insert, update, delete on all tables in schema public to authenticated;
-- El catálogo de topes es de sólo lectura para la app.
revoke insert, update, delete on public.topes_semanales from authenticated;

-- =============================================================================
-- Políticas
-- =============================================================================

-- ---------------------------------------------------------------- empresas --
drop policy if exists empresas_select on public.empresas;
create policy empresas_select on public.empresas
  for select to authenticated
  using (id = (select public.empresa_actual()));

drop policy if exists empresas_update on public.empresas;
create policy empresas_update on public.empresas
  for update to authenticated
  using  (id = (select public.empresa_actual()) and (select public.rol_actual()) = 'owner')
  with check (id = (select public.empresa_actual()));
-- No hay insert/delete desde la API: las empresas se crean en handle_new_user().

-- -------------------------------------------------------------------- hubs --
drop policy if exists hubs_select on public.hubs;
create policy hubs_select on public.hubs
  for select to authenticated
  using (empresa_id = (select public.empresa_actual()));

drop policy if exists hubs_insert on public.hubs;
create policy hubs_insert on public.hubs
  for insert to authenticated
  with check (empresa_id = (select public.empresa_actual()) and (select public.es_admin()));

drop policy if exists hubs_update on public.hubs;
create policy hubs_update on public.hubs
  for update to authenticated
  using      (empresa_id = (select public.empresa_actual()) and (select public.es_admin()))
  with check (empresa_id = (select public.empresa_actual()) and (select public.es_admin()));

drop policy if exists hubs_delete on public.hubs;
create policy hubs_delete on public.hubs
  for delete to authenticated
  using (empresa_id = (select public.empresa_actual()) and (select public.es_admin()));

-- -------------------------------------------------------------- sucursales --
drop policy if exists sucursales_select on public.sucursales;
create policy sucursales_select on public.sucursales
  for select to authenticated
  using (
    exists (
      select 1 from public.hubs h
      where h.id = sucursales.hub_id
        and h.empresa_id = (select public.empresa_actual())
    )
  );

drop policy if exists sucursales_insert on public.sucursales;
create policy sucursales_insert on public.sucursales
  for insert to authenticated
  with check (
    (select public.es_admin())
    and exists (
      select 1 from public.hubs h
      where h.id = sucursales.hub_id
        and h.empresa_id = (select public.empresa_actual())
    )
  );

drop policy if exists sucursales_update on public.sucursales;
create policy sucursales_update on public.sucursales
  for update to authenticated
  using (
    (select public.es_admin())
    and exists (
      select 1 from public.hubs h
      where h.id = sucursales.hub_id
        and h.empresa_id = (select public.empresa_actual())
    )
  )
  with check (
    (select public.es_admin())
    and exists (
      select 1 from public.hubs h
      where h.id = sucursales.hub_id
        and h.empresa_id = (select public.empresa_actual())
    )
  );

drop policy if exists sucursales_delete on public.sucursales;
create policy sucursales_delete on public.sucursales
  for delete to authenticated
  using (
    (select public.es_admin())
    and exists (
      select 1 from public.hubs h
      where h.id = sucursales.hub_id
        and h.empresa_id = (select public.empresa_actual())
    )
  );

-- ---------------------------------------------------------------- perfiles --
drop policy if exists perfiles_select on public.perfiles;
create policy perfiles_select on public.perfiles
  for select to authenticated
  using (
    id = (select auth.uid())
    or (
      (select public.es_admin())
      and empresa_id is not null
      and empresa_id = (select public.empresa_actual())
    )
  );

-- Un usuario edita su propio perfil; un owner edita los perfiles de su empresa.
-- El trigger perfiles_proteger_campos impide que un no-owner cambie rol/empresa.
drop policy if exists perfiles_update on public.perfiles;
create policy perfiles_update on public.perfiles
  for update to authenticated
  using (
    id = (select auth.uid())
    or (
      (select public.rol_actual()) = 'owner'
      and empresa_id is not null
      and empresa_id = (select public.empresa_actual())
    )
  )
  with check (empresa_id is not distinct from (select public.empresa_actual()));

-- Un owner puede dar de baja usuarios de su empresa (no a sí mismo).
drop policy if exists perfiles_delete on public.perfiles;
create policy perfiles_delete on public.perfiles
  for delete to authenticated
  using (
    id <> (select auth.uid())
    and (select public.rol_actual()) = 'owner'
    and empresa_id is not null
    and empresa_id = (select public.empresa_actual())
  );
-- No hay insert desde la API: los perfiles se crean en handle_new_user().

-- --------------------------------------------------------------- empleados --
drop policy if exists empleados_select on public.empleados;
create policy empleados_select on public.empleados
  for select to authenticated
  using (
    exists (
      select 1
      from public.sucursales s
      join public.hubs h on h.id = s.hub_id
      where s.id = empleados.sucursal_id
        and h.empresa_id = (select public.empresa_actual())
    )
  );

drop policy if exists empleados_insert on public.empleados;
create policy empleados_insert on public.empleados
  for insert to authenticated
  with check (
    (select public.puede_editar())
    and exists (
      select 1
      from public.sucursales s
      join public.hubs h on h.id = s.hub_id
      where s.id = empleados.sucursal_id
        and h.empresa_id = (select public.empresa_actual())
    )
  );

drop policy if exists empleados_update on public.empleados;
create policy empleados_update on public.empleados
  for update to authenticated
  using (
    (select public.puede_editar())
    and exists (
      select 1
      from public.sucursales s
      join public.hubs h on h.id = s.hub_id
      where s.id = empleados.sucursal_id
        and h.empresa_id = (select public.empresa_actual())
    )
  )
  with check (
    (select public.puede_editar())
    and exists (
      select 1
      from public.sucursales s
      join public.hubs h on h.id = s.hub_id
      where s.id = empleados.sucursal_id
        and h.empresa_id = (select public.empresa_actual())
    )
  );

drop policy if exists empleados_delete on public.empleados;
create policy empleados_delete on public.empleados
  for delete to authenticated
  using (
    (select public.puede_editar())
    and exists (
      select 1
      from public.sucursales s
      join public.hubs h on h.id = s.hub_id
      where s.id = empleados.sucursal_id
        and h.empresa_id = (select public.empresa_actual())
    )
  );

-- ---------------------------------------------------------------- horarios --
drop policy if exists horarios_select on public.horarios;
create policy horarios_select on public.horarios
  for select to authenticated
  using (
    exists (
      select 1
      from public.empleados e
      join public.sucursales s on s.id = e.sucursal_id
      join public.hubs h on h.id = s.hub_id
      where e.id = horarios.empleado_id
        and h.empresa_id = (select public.empresa_actual())
    )
  );

drop policy if exists horarios_insert on public.horarios;
create policy horarios_insert on public.horarios
  for insert to authenticated
  with check (
    (select public.puede_editar())
    and exists (
      select 1
      from public.empleados e
      join public.sucursales s on s.id = e.sucursal_id
      join public.hubs h on h.id = s.hub_id
      where e.id = horarios.empleado_id
        and h.empresa_id = (select public.empresa_actual())
    )
  );

drop policy if exists horarios_update on public.horarios;
create policy horarios_update on public.horarios
  for update to authenticated
  using (
    (select public.puede_editar())
    and exists (
      select 1
      from public.empleados e
      join public.sucursales s on s.id = e.sucursal_id
      join public.hubs h on h.id = s.hub_id
      where e.id = horarios.empleado_id
        and h.empresa_id = (select public.empresa_actual())
    )
  )
  with check (
    (select public.puede_editar())
    and exists (
      select 1
      from public.empleados e
      join public.sucursales s on s.id = e.sucursal_id
      join public.hubs h on h.id = s.hub_id
      where e.id = horarios.empleado_id
        and h.empresa_id = (select public.empresa_actual())
    )
  );

drop policy if exists horarios_delete on public.horarios;
create policy horarios_delete on public.horarios
  for delete to authenticated
  using (
    (select public.puede_editar())
    and exists (
      select 1
      from public.empleados e
      join public.sucursales s on s.id = e.sucursal_id
      join public.hubs h on h.id = s.hub_id
      where e.id = horarios.empleado_id
        and h.empresa_id = (select public.empresa_actual())
    )
  );

-- ------------------------------------------------------- importaciones_csv --
drop policy if exists importaciones_select on public.importaciones_csv;
create policy importaciones_select on public.importaciones_csv
  for select to authenticated
  using (
    exists (
      select 1
      from public.sucursales s
      join public.hubs h on h.id = s.hub_id
      where s.id = importaciones_csv.sucursal_id
        and h.empresa_id = (select public.empresa_actual())
    )
  );

drop policy if exists importaciones_insert on public.importaciones_csv;
create policy importaciones_insert on public.importaciones_csv
  for insert to authenticated
  with check (
    (select public.puede_editar())
    and (usuario_id is null or usuario_id = (select auth.uid()))
    and exists (
      select 1
      from public.sucursales s
      join public.hubs h on h.id = s.hub_id
      where s.id = importaciones_csv.sucursal_id
        and h.empresa_id = (select public.empresa_actual())
    )
  );

drop policy if exists importaciones_update on public.importaciones_csv;
create policy importaciones_update on public.importaciones_csv
  for update to authenticated
  using (
    (select public.puede_editar())
    and exists (
      select 1
      from public.sucursales s
      join public.hubs h on h.id = s.hub_id
      where s.id = importaciones_csv.sucursal_id
        and h.empresa_id = (select public.empresa_actual())
    )
  )
  with check (
    (select public.puede_editar())
    and exists (
      select 1
      from public.sucursales s
      join public.hubs h on h.id = s.hub_id
      where s.id = importaciones_csv.sucursal_id
        and h.empresa_id = (select public.empresa_actual())
    )
  );

drop policy if exists importaciones_delete on public.importaciones_csv;
create policy importaciones_delete on public.importaciones_csv
  for delete to authenticated
  using (
    (select public.es_admin())
    and exists (
      select 1
      from public.sucursales s
      join public.hubs h on h.id = s.hub_id
      where s.id = importaciones_csv.sucursal_id
        and h.empresa_id = (select public.empresa_actual())
    )
  );

-- --------------------------------------------------------- topes_semanales --
-- Catálogo público para cualquier usuario autenticado; sin escritura desde la API.
drop policy if exists topes_select on public.topes_semanales;
create policy topes_select on public.topes_semanales
  for select to authenticated
  using (true);
