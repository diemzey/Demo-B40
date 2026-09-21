-- =============================================================================
-- 0002_esquema_base.sql
-- Jornada40 · Esquema base
--
-- Jerarquía:  empresas 1—n hubs 1—n sucursales 1—n empleados 1—n horarios
--             perfiles n—1 empresas   (usuarios de la app; los empleados NO
--                                       inician sesión)
--             importaciones_csv n—1 sucursales, n—1 perfiles
--             topes_semanales           (catálogo: tope legal por año)
--
-- Requiere: 0001_extensiones_y_tipos.sql
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Función genérica para mantener updated_at
-- -----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

comment on function public.set_updated_at() is
  'Trigger genérico: fija updated_at = now() en cada UPDATE.';

-- -----------------------------------------------------------------------------
-- empresas
-- -----------------------------------------------------------------------------
create table if not exists public.empresas (
  id          uuid primary key default gen_random_uuid(),
  nombre      text not null,
  rfc         text unique,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint empresas_nombre_no_vacio check (length(trim(nombre)) > 0)
);

comment on table public.empresas is 'Cliente (razón social) que usa Jornada40. Raíz del aislamiento multi-tenant.';
comment on column public.empresas.rfc is 'RFC de la empresa; opcional pero único cuando existe.';

drop trigger if exists trg_empresas_updated_at on public.empresas;
create trigger trg_empresas_updated_at
  before update on public.empresas
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- hubs (agrupación regional de sucursales)
-- -----------------------------------------------------------------------------
create table if not exists public.hubs (
  id          uuid primary key default gen_random_uuid(),
  empresa_id  uuid not null references public.empresas (id) on delete cascade,
  nombre      text not null,
  ciudad      text,
  estado      text,                                   -- entidad federativa
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint hubs_nombre_no_vacio check (length(trim(nombre)) > 0),
  constraint hubs_empresa_nombre_unico unique (empresa_id, nombre)
);

comment on table public.hubs is 'Agrupación regional/operativa de sucursales dentro de una empresa.';
comment on column public.hubs.estado is 'Entidad federativa (p. ej. "Ciudad de México", "Jalisco").';

create index if not exists idx_hubs_empresa on public.hubs (empresa_id);

drop trigger if exists trg_hubs_updated_at on public.hubs;
create trigger trg_hubs_updated_at
  before update on public.hubs
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- sucursales
-- -----------------------------------------------------------------------------
create table if not exists public.sucursales (
  id            uuid primary key default gen_random_uuid(),
  hub_id        uuid not null references public.hubs (id) on delete cascade,
  nombre        text not null,
  ciudad        text,
  direccion     text,
  zona_horaria  text not null default 'America/Mexico_City',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint sucursales_nombre_no_vacio check (length(trim(nombre)) > 0),
  constraint sucursales_hub_nombre_unico unique (hub_id, nombre)
);

comment on table public.sucursales is 'Tienda / punto de venta. Unidad sobre la que se calcula el resumen semanal.';
comment on column public.sucursales.zona_horaria is 'Nombre IANA de la zona horaria de la sucursal.';

create index if not exists idx_sucursales_hub on public.sucursales (hub_id);

drop trigger if exists trg_sucursales_updated_at on public.sucursales;
create trigger trg_sucursales_updated_at
  before update on public.sucursales
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- perfiles (usuarios de la aplicación, 1:1 con auth.users)
-- -----------------------------------------------------------------------------
create table if not exists public.perfiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  empresa_id  uuid references public.empresas (id) on delete set null,
  nombre      text not null,
  apellido    text,
  email       text,
  rol         public.rol_usuario not null default 'admin',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

comment on table public.perfiles is
  'Usuarios que inician sesión. Se crea automáticamente al insertar en auth.users. '
  'empresa_id puede ser null si el usuario aún no ha sido asignado a una empresa.';
comment on column public.perfiles.email is 'Copia del correo de auth.users para listados dentro de la app.';

create index if not exists idx_perfiles_empresa on public.perfiles (empresa_id);

drop trigger if exists trg_perfiles_updated_at on public.perfiles;
create trigger trg_perfiles_updated_at
  before update on public.perfiles
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- handle_new_user(): alta automática de perfil al registrarse.
--
-- Lee raw_user_meta_data:
--   nombre, apellido → datos del perfil
--   empresa          → si viene, crea la empresa, un hub "Principal" y hace al
--                      usuario 'owner'
--   sucursal         → si viene junto con empresa, crea esa sucursal en el hub
--   ciudad           → opcional; se usa como ciudad del hub y de la sucursal
--
-- Nota de seguridad: NO se acepta empresa_id desde metadata; unirse a una
-- empresa existente debe hacerse por un owner/service role, no por auto-registro.
-- -----------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_meta        jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  v_empresa     text  := nullif(trim(coalesce(v_meta->>'empresa', '')), '');
  v_sucursal    text  := nullif(trim(coalesce(v_meta->>'sucursal', '')), '');
  v_ciudad      text  := nullif(trim(coalesce(v_meta->>'ciudad', '')), '');
  v_nombre      text  := nullif(trim(coalesce(v_meta->>'nombre', '')), '');
  v_apellido    text  := nullif(trim(coalesce(v_meta->>'apellido', '')), '');
  v_empresa_id  uuid;
  v_hub_id      uuid;
  v_rol         public.rol_usuario := 'admin';
begin
  if v_empresa is not null then
    insert into public.empresas (nombre)
    values (v_empresa)
    returning id into v_empresa_id;

    insert into public.hubs (empresa_id, nombre, ciudad)
    values (v_empresa_id, 'Principal', v_ciudad)
    returning id into v_hub_id;

    if v_sucursal is not null then
      insert into public.sucursales (hub_id, nombre, ciudad)
      values (v_hub_id, v_sucursal, v_ciudad);
    end if;

    v_rol := 'owner';
  end if;

  insert into public.perfiles (id, empresa_id, nombre, apellido, email, rol)
  values (
    new.id,
    v_empresa_id,
    coalesce(v_nombre, split_part(coalesce(new.email, ''), '@', 1), 'Usuario'),
    v_apellido,
    new.email,
    v_rol
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

comment on function public.handle_new_user() is
  'Crea el perfil (y opcionalmente empresa + hub Principal + sucursal) al insertar en auth.users.';

-- Nadie debe poder invocarla directamente desde la API; el trigger sobre
-- auth.users se dispara bajo supabase_auth_admin, que sí conserva execute.
revoke all on function public.handle_new_user() from public, anon, authenticated;
grant execute on function public.handle_new_user() to supabase_auth_admin;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- -----------------------------------------------------------------------------
-- empleados (colaboradores de una sucursal; no inician sesión)
-- -----------------------------------------------------------------------------
create table if not exists public.empleados (
  id                        uuid primary key default gen_random_uuid(),
  sucursal_id               uuid not null references public.sucursales (id) on delete cascade,
  nombre                    text not null,
  apellido                  text not null,
  puesto                    text,
  jornada_contratada_horas  numeric(5,2),
  activo                    boolean not null default true,
  clave_externa             text,          -- id en la nómina / CSV del cliente
  foto_url                  text,
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now(),
  constraint empleados_jornada_positiva
    check (jornada_contratada_horas is null or jornada_contratada_horas > 0)
);

comment on table public.empleados is 'Colaborador de una sucursal. Se crea desde importaciones CSV o captura manual.';
comment on column public.empleados.clave_externa is 'Identificador del colaborador en el sistema de nómina/CSV del cliente.';
comment on column public.empleados.jornada_contratada_horas is 'Horas semanales pactadas en el contrato (opcional).';

create index if not exists idx_empleados_sucursal on public.empleados (sucursal_id);

-- Única por sucursal sólo cuando existe clave (índice único parcial).
create unique index if not exists uq_empleados_sucursal_clave
  on public.empleados (sucursal_id, clave_externa)
  where clave_externa is not null;

drop trigger if exists trg_empleados_updated_at on public.empleados;
create trigger trg_empleados_updated_at
  before update on public.empleados
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- importaciones_csv (bitácora de cargas de archivo)
-- -----------------------------------------------------------------------------
create table if not exists public.importaciones_csv (
  id              uuid primary key default gen_random_uuid(),
  sucursal_id     uuid not null references public.sucursales (id) on delete cascade,
  usuario_id      uuid default auth.uid() references public.perfiles (id) on delete set null,
  nombre_archivo  text not null,
  filas_totales   integer not null default 0,
  filas_ok        integer not null default 0,
  filas_error     integer not null default 0,
  errores         jsonb not null default '[]'::jsonb,
  estado          public.estado_importacion not null default 'pendiente',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint importaciones_filas_no_negativas
    check (filas_totales >= 0 and filas_ok >= 0 and filas_error >= 0),
  constraint importaciones_errores_es_arreglo
    check (jsonb_typeof(errores) = 'array')
);

comment on table public.importaciones_csv is 'Registro de cada archivo CSV importado y su resultado.';
comment on column public.importaciones_csv.errores is
  'Arreglo JSON de errores por fila: [{"fila": 12, "columna": "hora_fin", "mensaje": "..."}].';

create index if not exists idx_importaciones_sucursal on public.importaciones_csv (sucursal_id);
create index if not exists idx_importaciones_usuario on public.importaciones_csv (usuario_id);

drop trigger if exists trg_importaciones_updated_at on public.importaciones_csv;
create trigger trg_importaciones_updated_at
  before update on public.importaciones_csv
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- horarios: "arreglo de horas de trabajo por día" normalizado.
-- Una fila = un segmento de turno de un empleado en una fecha.
-- Un día con turno partido tiene varias filas (hora_inicio distinta).
-- -----------------------------------------------------------------------------
create table if not exists public.horarios (
  id                uuid primary key default gen_random_uuid(),
  empleado_id       uuid not null references public.empleados (id) on delete cascade,
  fecha             date not null,
  hora_inicio       time not null,
  hora_fin          time not null,
  cruza_medianoche  boolean not null default false,
  minutos_descanso  integer not null default 0,
  origen            public.origen_horario not null default 'csv',
  importacion_id    uuid references public.importaciones_csv (id) on delete set null,
  -- Horas efectivas del segmento: duración (considerando cruce de medianoche)
  -- menos el descanso. Todas las funciones usadas son IMMUTABLE.
  horas             numeric(5,2) generated always as (
    round(
      (
        (
          extract(epoch from (hora_fin - hora_inicio))
          + (case when cruza_medianoche then 86400 else 0 end)
        ) / 3600.0
        - (minutos_descanso / 60.0)
      )::numeric,
      2
    )
  ) stored,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  -- Sin cruce: fin > inicio. Con cruce: fin <= inicio (termina al día siguiente).
  constraint horarios_rango_valido check (
    (not cruza_medianoche and hora_fin > hora_inicio)
    or (cruza_medianoche and hora_fin <= hora_inicio)
  ),
  constraint horarios_descanso_no_negativo check (minutos_descanso >= 0),
  constraint horarios_empleado_fecha_inicio_unico unique (empleado_id, fecha, hora_inicio)
);

comment on table public.horarios is
  'Segmento de turno por empleado y fecha. horas = duración − descanso (columna generada).';
comment on column public.horarios.cruza_medianoche is
  'true cuando el turno termina al día siguiente (p. ej. 22:00–06:00). fecha es el día en que inicia.';
comment on column public.horarios.horas is 'Horas efectivas del segmento (generada).';

create index if not exists idx_horarios_empleado_fecha on public.horarios (empleado_id, fecha);
create index if not exists idx_horarios_importacion on public.horarios (importacion_id);

drop trigger if exists trg_horarios_updated_at on public.horarios;
create trigger trg_horarios_updated_at
  before update on public.horarios
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- topes_semanales: tope legal de horas por semana según el año (reforma 40 h).
-- Se siembra en 0004_vistas_y_semilla_topes.sql.
-- -----------------------------------------------------------------------------
create table if not exists public.topes_semanales (
  anio        integer primary key,
  tope_horas  numeric(4,1) not null,
  constraint topes_tope_positivo check (tope_horas > 0)
);

comment on table public.topes_semanales is
  'Catálogo del tope semanal legal por año. Las horas por encima del tope se pagan al doble.';
