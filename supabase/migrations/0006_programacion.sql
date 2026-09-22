-- =============================================================================
-- 0006_programacion.sql
-- Jornada40 · Programación de turnos bajo tope semanal (esquema, reglas, RLS)
--
-- Implementa docs/arquitectura.md §3.1 (diccionario) y §3.2 (reglas que la
-- base hace imposibles de violar):
--   catálogos ....... puestos, tabuladores, habilidades, plantillas_turno,
--                     reglas_laborales
--   plantilla ....... empleados (+puesto, contrato, tope individual),
--                     empleado_habilidades, disponibilidad
--   demanda ......... trafico_observado (particionada), pronosticos,
--                     demanda_intervalo (particionada)
--   programación .... escenarios, asignaciones (particionada, EXCLUDE por
--                     traslape, constraint trigger diferido de reglas)
--   resultados ...... cobertura_intervalo, resumen_escenario
--   trazabilidad .... auditoria (sólo INSERT)
--
-- Zona horaria de cálculo: 'America/Mexico_City' (constante en columnas
-- generadas y en el trigger de validación; sucursales.zona_horaria queda
-- para la UI).
--
-- Idempotente en lo razonable. Requiere: 0005_reacomodo.sql. Postgres 17.
-- =============================================================================

-- btree_gist: operadores '=' de uuid/date dentro de un índice GiST para el
-- EXCLUDE de asignaciones.
create extension if not exists btree_gist with schema extensions;

-- -----------------------------------------------------------------------------
-- Tipos enumerados
-- -----------------------------------------------------------------------------
do $$
begin
  create type public.tipo_contrato as enum ('tiempo_completo', 'medio_tiempo');
exception
  when duplicate_object then null;
end
$$;

do $$
begin
  create type public.tipo_escenario as enum ('baseline', 'propuesta');
exception
  when duplicate_object then null;
end
$$;

do $$
begin
  create type public.estado_escenario as enum ('borrador', 'publicado', 'archivado');
exception
  when duplicate_object then null;
end
$$;

-- =============================================================================
-- Catálogos por empresa
-- =============================================================================

-- ------------------------------------------------------------- habilidades --
create table if not exists public.habilidades (
  id          uuid primary key default gen_random_uuid(),
  empresa_id  uuid not null references public.empresas (id) on delete cascade,
  clave       text not null,
  nombre      text not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint habilidades_clave_no_vacia check (length(trim(clave)) > 0),
  constraint habilidades_empresa_clave_unica unique (empresa_id, clave)
);

comment on table public.habilidades is
  'Habilidad/rol que un colaborador puede cubrir (caja, piso, almacen, supervision). Catálogo por empresa.';

drop trigger if exists trg_habilidades_updated_at on public.habilidades;
create trigger trg_habilidades_updated_at
  before update on public.habilidades
  for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------- puestos --
create table if not exists public.puestos (
  id            uuid primary key default gen_random_uuid(),
  empresa_id    uuid not null references public.empresas (id) on delete cascade,
  clave         text not null,
  nombre        text not null,
  habilidad_id  uuid references public.habilidades (id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint puestos_clave_no_vacia check (length(trim(clave)) > 0),
  constraint puestos_empresa_clave_unica unique (empresa_id, clave)
);

comment on table public.puestos is 'Puesto de nómina; habilidad_id = habilidad que el puesto exige (opcional).';

-- justificación: resolver la habilidad que exige un puesto al materializar baseline.
create index if not exists idx_puestos_habilidad on public.puestos (habilidad_id);

drop trigger if exists trg_puestos_updated_at on public.puestos;
create trigger trg_puestos_updated_at
  before update on public.puestos
  for each row execute function public.set_updated_at();

-- ------------------------------------------------------------- tabuladores --
create table if not exists public.tabuladores (
  id                    uuid primary key default gen_random_uuid(),
  puesto_id             uuid not null references public.puestos (id) on delete cascade,
  vigente_desde         date not null,
  salario_hora          numeric(8,2) not null,
  prima_dominical_pct   numeric(5,2) not null default 25,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  constraint tabuladores_salario_positivo check (salario_hora > 0),
  constraint tabuladores_prima_no_negativa check (prima_dominical_pct >= 0),
  constraint tabuladores_puesto_vigencia_unica unique (puesto_id, vigente_desde)
);

comment on table public.tabuladores is 'Tarifa por hora de un puesto con vigencia; la vigente es la de mayor vigente_desde <= fecha.';

-- justificación: tarifa_vigente() hace "puesto_id = ? and vigente_desde <= ? order by vigente_desde desc limit 1".
create index if not exists idx_tabuladores_puesto_vigencia
  on public.tabuladores (puesto_id, vigente_desde desc);

drop trigger if exists trg_tabuladores_updated_at on public.tabuladores;
create trigger trg_tabuladores_updated_at
  before update on public.tabuladores
  for each row execute function public.set_updated_at();

-- -------------------------------------------------------- plantillas_turno --
create table if not exists public.plantillas_turno (
  id            uuid primary key default gen_random_uuid(),
  empresa_id    uuid not null references public.empresas (id) on delete cascade,
  clave         text not null,
  hora_inicio   time not null,
  duracion_min  integer not null,
  descanso_min  integer not null default 30,
  activa        boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint plantillas_duracion_rango check (duracion_min between 180 and 600),
  constraint plantillas_descanso_valido check (descanso_min >= 0 and descanso_min < duracion_min),
  constraint plantillas_empresa_clave_unica unique (empresa_id, clave)
);

comment on table public.plantillas_turno is 'Turnos tipo (hora de inicio + duración) que el motor puede asignar.';

drop trigger if exists trg_plantillas_turno_updated_at on public.plantillas_turno;
create trigger trg_plantillas_turno_updated_at
  before update on public.plantillas_turno
  for each row execute function public.set_updated_at();

-- -------------------------------------------------------- reglas_laborales --
create table if not exists public.reglas_laborales (
  id                            uuid primary key default gen_random_uuid(),
  empresa_id                    uuid references public.empresas (id) on delete cascade,  -- null = regla global
  vigente_desde                 date not null,
  tope_semanal                  numeric(4,1) not null,
  max_horas_dia                 numeric(3,1) not null default 8,
  horas_dobles_max              numeric(3,1) not null default 9,
  factor_doble                  numeric(3,2) not null default 2,
  factor_triple                 numeric(3,2) not null default 3,
  prima_dominical_pct           numeric(5,2) not null default 25,
  descanso_entre_turnos_horas   numeric(3,1) not null default 12,
  max_dias_semana               smallint not null default 6,
  created_at                    timestamptz not null default now(),
  updated_at                    timestamptz not null default now(),
  constraint reglas_valores_positivos check (
    tope_semanal > 0 and max_horas_dia > 0 and horas_dobles_max >= 0
    and factor_doble >= 1 and factor_triple >= factor_doble
    and prima_dominical_pct >= 0 and descanso_entre_turnos_horas >= 0
    and max_dias_semana between 1 and 7
  )
);

comment on table public.reglas_laborales is
  'Parámetros legales/políticas por vigencia. empresa_id null = regla global (sólo lectura desde la API).';

-- unique (coalesce(empresa_id, uuid nulo), vigente_desde): NULL no es igual a NULL
-- en un unique normal, por eso índice único de expresión.
create unique index if not exists uq_reglas_laborales_empresa_vigencia
  on public.reglas_laborales (coalesce(empresa_id, '00000000-0000-0000-0000-000000000000'::uuid), vigente_desde);

drop trigger if exists trg_reglas_laborales_updated_at on public.reglas_laborales;
create trigger trg_reglas_laborales_updated_at
  before update on public.reglas_laborales
  for each row execute function public.set_updated_at();

-- =============================================================================
-- Plantilla: empleados (ALTER), empleado_habilidades, disponibilidad
-- =============================================================================
alter table public.empleados
  add column if not exists puesto_id         uuid references public.puestos (id) on delete set null,
  add column if not exists tipo_contrato     public.tipo_contrato not null default 'tiempo_completo',
  add column if not exists max_horas_semana  numeric(4,1) not null default 40,
  add column if not exists fecha_alta        date;

alter table public.empleados drop constraint if exists empleados_max_horas_semana_rango;
alter table public.empleados
  add constraint empleados_max_horas_semana_rango check (max_horas_semana between 1 and 48);

comment on column public.empleados.puesto_id is 'Puesto de nómina (tarifa vía tabuladores).';
comment on column public.empleados.max_horas_semana is 'Tope individual de horas por semana (contrato); el escenario aplica el menor entre este y su tope.';

-- justificación: tarifa_vigente() y materializar_baseline() resuelven el puesto de cada empleado.
create index if not exists idx_empleados_puesto on public.empleados (puesto_id);

-- ---------------------------------------------------- empleado_habilidades --
create table if not exists public.empleado_habilidades (
  empleado_id        uuid not null references public.empleados (id) on delete cascade,
  habilidad_id       uuid not null references public.habilidades (id) on delete cascade,
  certificado_hasta  date,
  created_at         timestamptz not null default now(),
  primary key (empleado_id, habilidad_id)
);

comment on table public.empleado_habilidades is 'Habilidades que puede cubrir un colaborador; certificado_hasta null = sin vencimiento.';

-- justificación: "quién puede cubrir caja" (motor) filtra por habilidad_id.
create index if not exists idx_empleado_habilidades_habilidad on public.empleado_habilidades (habilidad_id);

-- ---------------------------------------------------------- disponibilidad --
create table if not exists public.disponibilidad (
  id             uuid primary key default gen_random_uuid(),
  empleado_id    uuid not null references public.empleados (id) on delete cascade,
  dia_semana     smallint not null,
  hora_inicio    time not null,
  hora_fin       time not null,
  vigente_desde  date,
  vigente_hasta  date,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  constraint disponibilidad_dia_valido check (dia_semana between 1 and 7),
  constraint disponibilidad_rango_valido check (hora_fin > hora_inicio),
  constraint disponibilidad_vigencia_valida check (vigente_hasta is null or vigente_desde is null or vigente_hasta >= vigente_desde)
);

comment on table public.disponibilidad is
  'Ventanas semanales en que un colaborador puede trabajar (1=lunes … 7=domingo). Sin filas = disponible todo el horario de tienda.';

-- justificación: el trigger de validación busca ventanas por (empleado, día ISO).
create index if not exists idx_disponibilidad_empleado_dia on public.disponibilidad (empleado_id, dia_semana);

drop trigger if exists trg_disponibilidad_updated_at on public.disponibilidad;
create trigger trg_disponibilidad_updated_at
  before update on public.disponibilidad
  for each row execute function public.set_updated_at();

-- =============================================================================
-- Demanda: trafico_observado, pronosticos, demanda_intervalo
-- =============================================================================

-- ------------------------------------------- trafico_observado (partición) --
create table if not exists public.trafico_observado (
  id           uuid not null default gen_random_uuid(),
  sucursal_id  uuid not null references public.sucursales (id) on delete cascade,
  semana_iso   date not null,
  inicio       timestamptz not null,
  fin          timestamptz not null,
  trafico      integer not null default 0,
  ventas       numeric(12,2) not null default 0,
  created_at   timestamptz not null default now(),
  primary key (id, semana_iso),
  constraint trafico_intervalo_30 check (fin = inicio + interval '30 minutes'),
  constraint trafico_valores_no_negativos check (trafico >= 0 and ventas >= 0),
  constraint trafico_semana_es_lunes check (extract(isodow from semana_iso) = 1),
  constraint trafico_semana_coherente
    check (semana_iso = (date_trunc('week', inicio at time zone 'America/Mexico_City'))::date),
  constraint trafico_sucursal_inicio_unico unique (sucursal_id, semana_iso, inicio)
) partition by range (semana_iso);

comment on table public.trafico_observado is 'Tráfico y ventas observados a 30 min (entrada del pronóstico). Particionada por semana_iso.';

-- -------------------------------------------------------------- pronosticos --
create table if not exists public.pronosticos (
  id           uuid primary key default gen_random_uuid(),
  sucursal_id  uuid not null references public.sucursales (id) on delete cascade,
  semana_iso   date not null,
  metodo       text not null default 'media_movil_estacional',
  parametros   jsonb not null default '{}'::jsonb,
  generado_en  timestamptz not null default now(),
  created_at   timestamptz not null default now(),
  constraint pronosticos_semana_es_lunes check (extract(isodow from semana_iso) = 1),
  constraint pronosticos_parametros_es_objeto check (jsonb_typeof(parametros) = 'object'),
  constraint pronosticos_sucursal_semana_generado_unico unique (sucursal_id, semana_iso, generado_en)
);

comment on table public.pronosticos is 'Versión de pronóstico por sucursal-semana; la vigente es la de generado_en más reciente.';

-- ------------------------------------------- demanda_intervalo (partición) --
create table if not exists public.demanda_intervalo (
  id               uuid not null default gen_random_uuid(),
  pronostico_id    uuid not null references public.pronosticos (id) on delete cascade,
  sucursal_id      uuid not null references public.sucursales (id) on delete cascade,
  semana_iso       date not null,
  inicio           timestamptz not null,
  fin              timestamptz not null,
  trafico          integer not null default 0,
  ventas           numeric(12,2) not null default 0,
  requerido_total  numeric(5,2) not null default 0,
  requerido_caja   numeric(5,2) not null default 0,
  es_pico          boolean not null default false,
  created_at       timestamptz not null default now(),
  primary key (id, semana_iso),
  constraint demanda_intervalo_30 check (fin = inicio + interval '30 minutes'),
  constraint demanda_valores_no_negativos
    check (trafico >= 0 and ventas >= 0 and requerido_total >= 0 and requerido_caja >= 0 and requerido_caja <= requerido_total),
  constraint demanda_semana_es_lunes check (extract(isodow from semana_iso) = 1),
  constraint demanda_semana_coherente
    check (semana_iso = (date_trunc('week', inicio at time zone 'America/Mexico_City'))::date),
  constraint demanda_pronostico_inicio_unico unique (pronostico_id, semana_iso, inicio)
) partition by range (semana_iso);

comment on table public.demanda_intervalo is 'Demanda pronosticada y requerimiento de personal por intervalo de 30 min. Particionada por semana_iso.';

-- justificación: resumir_escenario() une demanda con asignaciones por (sucursal, semana, inicio).
create index if not exists idx_demanda_sucursal_semana_inicio
  on public.demanda_intervalo (sucursal_id, semana_iso, inicio);

-- =============================================================================
-- Programación: escenarios, asignaciones
-- =============================================================================

-- --------------------------------------------------------------- escenarios --
create table if not exists public.escenarios (
  id             uuid primary key default gen_random_uuid(),
  sucursal_id    uuid not null references public.sucursales (id) on delete cascade,
  semana_iso     date not null,
  tipo           public.tipo_escenario not null,
  version        integer not null default 1,
  padre_id       uuid references public.escenarios (id) on delete set null,
  estado         public.estado_escenario not null default 'borrador',
  tope_semanal   numeric(4,1) not null,
  reglas_id      uuid not null references public.reglas_laborales (id) on delete restrict,
  pronostico_id  uuid references public.pronosticos (id) on delete set null,
  parametros     jsonb not null default '{}'::jsonb,
  creado_por     uuid default auth.uid(),
  publicado_en   timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  constraint escenarios_semana_es_lunes check (extract(isodow from semana_iso) = 1),
  constraint escenarios_version_positiva check (version >= 1),
  constraint escenarios_tope_positivo check (tope_semanal > 0),
  constraint escenarios_parametros_es_objeto check (jsonb_typeof(parametros) = 'object'),
  constraint escenarios_sucursal_semana_tipo_version_unico unique (sucursal_id, semana_iso, tipo, version)
);

comment on table public.escenarios is
  'Programación completa de una sucursal-semana (baseline = realidad, propuesta = motor). Inmutable una vez publicado; una corrección es un escenario nuevo con padre_id.';
comment on column public.escenarios.tope_semanal is 'Tope de horas por empleado-semana aplicado a este escenario (regla del año o proyección).';

-- justificación: v_ahorro_escenario busca "último publicado por (sucursal, semana, tipo)"; sólo filas publicadas.
create index if not exists idx_escenarios_publicados
  on public.escenarios (sucursal_id, semana_iso, tipo, version desc)
  where estado = 'publicado';

-- justificación: navegación de versiones (hijos de un escenario).
create index if not exists idx_escenarios_padre on public.escenarios (padre_id);

drop trigger if exists trg_escenarios_updated_at on public.escenarios;
create trigger trg_escenarios_updated_at
  before update on public.escenarios
  for each row execute function public.set_updated_at();

-- ------------------------------------------------ asignaciones (partición) --
create table if not exists public.asignaciones (
  id             uuid not null default gen_random_uuid(),
  escenario_id   uuid not null references public.escenarios (id) on delete cascade,
  semana_iso     date not null,
  empleado_id    uuid not null references public.empleados (id) on delete cascade,
  plantilla_id   uuid references public.plantillas_turno (id) on delete set null,
  habilidad_id   uuid not null references public.habilidades (id) on delete restrict,
  inicio         timestamptz not null,
  fin            timestamptz not null,
  descanso_min   integer not null default 0,
  -- Horas efectivas = duración − descanso. Sólo funciones IMMUTABLE.
  horas          numeric(4,2) generated always as (
    round(((extract(epoch from (fin - inicio)) / 3600.0) - (descanso_min / 60.0))::numeric, 2)
  ) stored,
  -- Domingo en hora local de México (timezone(text, timestamptz) es IMMUTABLE).
  es_domingo     boolean generated always as (
    extract(isodow from (inicio at time zone 'America/Mexico_City')) = 7
  ) stored,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  primary key (id, semana_iso),
  constraint asignaciones_rango_valido check (fin > inicio and fin - inicio <= interval '12 hours'),
  constraint asignaciones_descanso_valido
    check (descanso_min >= 0 and (descanso_min * interval '1 minute') < (fin - inicio)),
  constraint asignaciones_semana_es_lunes check (extract(isodow from semana_iso) = 1),
  constraint asignaciones_semana_coherente
    check (semana_iso = (date_trunc('week', inicio at time zone 'America/Mexico_City'))::date),
  -- Regla 1 (§3.2): traslapes imposibles por construcción (incluye la clave de partición).
  constraint asignaciones_sin_traslape exclude using gist (
    escenario_id with =,
    empleado_id with =,
    semana_iso with =,
    tstzrange(inicio, fin, '[)') with &&
  )
) partition by range (semana_iso);

comment on table public.asignaciones is
  'Turno asignado a un empleado dentro de un escenario. horas y es_domingo son columnas generadas. Particionada por semana_iso.';
comment on column public.asignaciones.habilidad_id is 'Rol/habilidad que cubre en ese turno (caja, piso, …).';

-- justificación: el constraint trigger suma horas por (escenario, empleado); las vistas agrupan igual.
create index if not exists idx_asignaciones_escenario_empleado
  on public.asignaciones (escenario_id, empleado_id, inicio);
-- justificación: resumir_escenario() cruza intervalos con turnos del escenario por rango de inicio.
create index if not exists idx_asignaciones_escenario_inicio
  on public.asignaciones (escenario_id, inicio, fin);
-- justificación: FK y consultas "turnos de un empleado" (motor, UI de colaborador).
create index if not exists idx_asignaciones_empleado
  on public.asignaciones (empleado_id, semana_iso);

drop trigger if exists trg_asignaciones_updated_at on public.asignaciones;
create trigger trg_asignaciones_updated_at
  before update on public.asignaciones
  for each row execute function public.set_updated_at();

-- =============================================================================
-- Resultados: cobertura_intervalo, resumen_escenario
-- =============================================================================
create table if not exists public.cobertura_intervalo (
  escenario_id     uuid not null references public.escenarios (id) on delete cascade,
  inicio           timestamptz not null,
  requerido_total  numeric(5,2) not null default 0,
  asignado_total   numeric(5,2) not null default 0,
  requerido_caja   numeric(5,2) not null default 0,
  asignado_caja    numeric(5,2) not null default 0,
  es_pico          boolean not null default false,
  primary key (escenario_id, inicio)
);

comment on table public.cobertura_intervalo is
  'Cobertura materializada por escenario e intervalo de 30 min. Se regenera en resumir_escenario().';

create table if not exists public.resumen_escenario (
  escenario_id               uuid primary key references public.escenarios (id) on delete cascade,
  horas_totales              numeric(10,2) not null default 0,
  horas_regulares            numeric(10,2) not null default 0,
  horas_dobles               numeric(10,2) not null default 0,
  horas_triples              numeric(10,2) not null default 0,
  horas_domingo              numeric(10,2) not null default 0,
  costo_regular              numeric(14,2) not null default 0,
  costo_dobles               numeric(14,2) not null default 0,
  costo_triples              numeric(14,2) not null default 0,
  costo_prima_dominical      numeric(14,2) not null default 0,
  horas_sobrestaffing        numeric(10,2) not null default 0,
  costo_sobrestaffing        numeric(14,2) not null default 0,
  costo_total                numeric(14,2) not null default 0,
  intervalos_pico            integer not null default 0,
  intervalos_pico_cubiertos  integer not null default 0,
  deficit_pico_horas         numeric(10,2) not null default 0,
  calculado_en               timestamptz not null default now()
);

comment on table public.resumen_escenario is
  'Costo y cobertura por escenario. Escrito sólo por resumir_escenario(); la UI lee de aquí.';

-- =============================================================================
-- Auditoría (append-only)
-- =============================================================================
create table if not exists public.auditoria (
  id            bigserial primary key,
  tabla         text not null,
  operacion     text not null,
  fila_id       uuid,
  escenario_id  uuid,
  antes         jsonb,
  despues       jsonb,
  usuario       uuid default auth.uid(),
  en            timestamptz not null default now(),
  constraint auditoria_operacion_valida check (operacion in ('INSERT', 'UPDATE', 'DELETE'))
);

comment on table public.auditoria is 'Bitácora append-only de escenarios y asignaciones (antes/después en JSONB).';

-- justificación: "historia de un escenario" ordenada en el tiempo.
create index if not exists idx_auditoria_escenario_en on public.auditoria (escenario_id, en);

-- =============================================================================
-- Particiones (trimestres 2026 + DEFAULT) para las tres tablas particionadas
-- =============================================================================
do $$
declare
  t   text;
  q   record;
begin
  foreach t in array array['trafico_observado', 'demanda_intervalo', 'asignaciones'] loop
    for q in
      select * from (values
        ('2026q1', date '2026-01-01', date '2026-04-01'),
        ('2026q2', date '2026-04-01', date '2026-07-01'),
        ('2026q3', date '2026-07-01', date '2026-10-01'),
        ('2026q4', date '2026-10-01', date '2027-01-01')
      ) as v (sufijo, desde, hasta)
    loop
      execute format(
        'create table if not exists public.%I partition of public.%I for values from (%L) to (%L)',
        t || '_' || q.sufijo, t, q.desde, q.hasta
      );
    end loop;
    execute format(
      'create table if not exists public.%I partition of public.%I default',
      t || '_default', t
    );
  end loop;
end
$$;

-- =============================================================================
-- Triggers de negocio
-- =============================================================================

-- -----------------------------------------------------------------------------
-- asignaciones_validar(): reglas 2–6 de §3.2 sobre escenarios tipo 'propuesta'.
-- Constraint trigger DEFERRABLE INITIALLY DEFERRED: se evalúa al COMMIT con la
-- semana completa ya insertada. Los baseline sólo verifican coherencia con el
-- escenario (registran la realidad). security definer: lee las tablas
-- necesarias sin depender de las políticas RLS del que inserta.
-- -----------------------------------------------------------------------------
create or replace function public.asignaciones_validar()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_tz          constant text := 'America/Mexico_City';
  v_esc         public.escenarios%rowtype;
  v_reglas      public.reglas_laborales%rowtype;
  v_emp         public.empleados%rowtype;
  v_nombre      text;
  v_dia         date;
  v_ini_local   timestamp;
  v_fin_local   timestamp;
  v_isodow      integer;
  v_horas_dia   numeric;
  v_horas_sem   numeric;
  v_dias        integer;
  v_tope        numeric;
  v_prev_fin    timestamptz;
  v_next_ini    timestamptz;
  v_descanso    interval;
begin
  select * into v_esc from public.escenarios where id = new.escenario_id;
  if not found then
    raise exception 'La asignación % refiere a un escenario inexistente', new.id
      using errcode = 'foreign_key_violation';
  end if;

  if new.semana_iso <> v_esc.semana_iso then
    raise exception 'La asignación cae en la semana % pero el escenario es de la semana %',
      new.semana_iso, v_esc.semana_iso
      using errcode = 'check_violation';
  end if;

  -- El baseline registra la realidad: sólo se le exige no traslapar (EXCLUDE).
  if v_esc.tipo <> 'propuesta' then
    return null;
  end if;

  select * into v_reglas from public.reglas_laborales where id = v_esc.reglas_id;
  select * into v_emp    from public.empleados        where id = new.empleado_id;
  v_nombre    := coalesce(v_emp.nombre || ' ' || v_emp.apellido, new.empleado_id::text);
  v_ini_local := new.inicio at time zone v_tz;
  v_fin_local := new.fin    at time zone v_tz;
  v_dia       := v_ini_local::date;
  v_isodow    := extract(isodow from v_ini_local)::integer;

  -- (2) Jornada diaria: Σ horas del empleado en ese día local ≤ max_horas_dia.
  select coalesce(sum(a.horas), 0) into v_horas_dia
  from public.asignaciones a
  where a.escenario_id = new.escenario_id
    and a.semana_iso   = new.semana_iso
    and a.empleado_id  = new.empleado_id
    and (a.inicio at time zone v_tz)::date = v_dia;

  if v_horas_dia > v_reglas.max_horas_dia then
    raise exception 'Jornada diaria excedida: % suma % h el % (máximo % h)',
      v_nombre, v_horas_dia, v_dia, v_reglas.max_horas_dia
      using errcode = 'check_violation';
  end if;

  -- (3) Tope semanal duro y (5) días trabajados.
  select coalesce(sum(a.horas), 0),
         count(distinct (a.inicio at time zone v_tz)::date)
    into v_horas_sem, v_dias
  from public.asignaciones a
  where a.escenario_id = new.escenario_id
    and a.semana_iso   = new.semana_iso
    and a.empleado_id  = new.empleado_id;

  v_tope := least(v_esc.tope_semanal, coalesce(v_emp.max_horas_semana, v_esc.tope_semanal));
  if v_horas_sem > v_tope then
    raise exception 'Tope semanal excedido: % suma % h en la semana % (tope % h)',
      v_nombre, v_horas_sem, new.semana_iso, v_tope
      using errcode = 'check_violation';
  end if;

  if v_dias > v_reglas.max_dias_semana then
    raise exception 'Día de descanso semanal: % trabaja % días en la semana % (máximo %)',
      v_nombre, v_dias, new.semana_iso, v_reglas.max_dias_semana
      using errcode = 'check_violation';
  end if;

  -- (4) Descanso mínimo entre turnos consecutivos del mismo empleado en el escenario.
  v_descanso := v_reglas.descanso_entre_turnos_horas * interval '1 hour';

  select max(a.fin) into v_prev_fin
  from public.asignaciones a
  where a.escenario_id = new.escenario_id
    and a.semana_iso   = new.semana_iso
    and a.empleado_id  = new.empleado_id
    and a.id <> new.id
    and a.fin <= new.inicio;

  if v_prev_fin is not null and (new.inicio - v_prev_fin) < v_descanso then
    raise exception 'Descanso entre turnos insuficiente: % tiene sólo % entre el turno que termina % y el que inicia % (mínimo % h)',
      v_nombre, (new.inicio - v_prev_fin), v_prev_fin at time zone v_tz, v_ini_local, v_reglas.descanso_entre_turnos_horas
      using errcode = 'check_violation';
  end if;

  select min(a.inicio) into v_next_ini
  from public.asignaciones a
  where a.escenario_id = new.escenario_id
    and a.semana_iso   = new.semana_iso
    and a.empleado_id  = new.empleado_id
    and a.id <> new.id
    and a.inicio >= new.fin;

  if v_next_ini is not null and (v_next_ini - new.fin) < v_descanso then
    raise exception 'Descanso entre turnos insuficiente: % tiene sólo % entre el turno que termina % y el que inicia % (mínimo % h)',
      v_nombre, (v_next_ini - new.fin), v_fin_local, v_next_ini at time zone v_tz, v_reglas.descanso_entre_turnos_horas
      using errcode = 'check_violation';
  end if;

  -- (6a) Disponibilidad: si hay ventanas para ese día ISO, el turno cabe en una.
  if exists (
    select 1 from public.disponibilidad d
    where d.empleado_id = new.empleado_id
      and d.dia_semana  = v_isodow
      and (d.vigente_desde is null or d.vigente_desde <= v_dia)
      and (d.vigente_hasta is null or d.vigente_hasta >= v_dia)
  ) and not exists (
    select 1 from public.disponibilidad d
    where d.empleado_id = new.empleado_id
      and d.dia_semana  = v_isodow
      and (d.vigente_desde is null or d.vigente_desde <= v_dia)
      and (d.vigente_hasta is null or d.vigente_hasta >= v_dia)
      -- comparación en hora local; el fin se mide desde la medianoche del día de inicio
      and (d.hora_inicio - time '00:00') <= (v_ini_local - v_dia::timestamp)
      and (d.hora_fin    - time '00:00') >= (v_fin_local - v_dia::timestamp)
  ) then
    raise exception 'Fuera de disponibilidad: el turno %–% de % no cabe en ninguna ventana de disponibilidad del día %',
      v_ini_local, v_fin_local, v_nombre, v_isodow
      using errcode = 'check_violation';
  end if;

  -- (6b) Habilidad vigente.
  if not exists (
    select 1 from public.empleado_habilidades eh
    where eh.empleado_id  = new.empleado_id
      and eh.habilidad_id = new.habilidad_id
      and (eh.certificado_hasta is null or eh.certificado_hasta >= v_dia)
  ) then
    raise exception 'Habilidad no vigente: % no puede cubrir la habilidad % el %',
      v_nombre, new.habilidad_id, v_dia
      using errcode = 'check_violation';
  end if;

  return null;
end;
$$;

comment on function public.asignaciones_validar() is
  'Constraint trigger diferido: jornada diaria, tope semanal, descanso entre turnos, días máximos, disponibilidad y habilidad (sólo escenarios propuesta).';

revoke all on function public.asignaciones_validar() from public, anon, authenticated;

drop trigger if exists trg_asignaciones_validar on public.asignaciones;
create constraint trigger trg_asignaciones_validar
  after insert or update on public.asignaciones
  deferrable initially deferred
  for each row execute function public.asignaciones_validar();

-- -----------------------------------------------------------------------------
-- Inmutabilidad (regla 7): escenarios publicados (o archivados) no cambian;
-- sus asignaciones tampoco. Único cambio permitido sobre un escenario
-- publicado: pasar a 'archivado' sin tocar nada más. También fija
-- publicado_en al publicar.
-- -----------------------------------------------------------------------------
create or replace function public.escenarios_proteger()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_antes    jsonb;
  v_despues  jsonb;
begin
  if tg_op = 'INSERT' then
    if new.estado = 'publicado' and new.publicado_en is null then
      new.publicado_en := now();
    end if;
    return new;
  end if;

  if tg_op = 'DELETE' then
    if old.estado in ('publicado', 'archivado') then
      raise exception 'El escenario % está % y es inmutable; crea uno nuevo con padre_id', old.id, old.estado
        using errcode = 'check_violation';
    end if;
    return old;
  end if;

  -- UPDATE
  if old.estado = 'archivado' then
    raise exception 'El escenario % está archivado y es inmutable', old.id
      using errcode = 'check_violation';
  end if;

  if old.estado = 'publicado' then
    v_antes   := to_jsonb(old) - 'estado' - 'updated_at';
    v_despues := to_jsonb(new) - 'estado' - 'updated_at';
    if not (new.estado = 'archivado' and v_antes = v_despues) then
      raise exception 'El escenario % está publicado y es inmutable; sólo puede pasar a archivado', old.id
        using errcode = 'check_violation';
    end if;
  end if;

  if new.estado = 'publicado' and old.estado <> 'publicado' and new.publicado_en is null then
    new.publicado_en := now();
  end if;

  return new;
end;
$$;

revoke all on function public.escenarios_proteger() from public, anon, authenticated;

drop trigger if exists trg_escenarios_proteger on public.escenarios;
create trigger trg_escenarios_proteger
  before insert or update or delete on public.escenarios
  for each row execute function public.escenarios_proteger();

create or replace function public.asignaciones_proteger()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id      uuid := coalesce(old.escenario_id, new.escenario_id);
  v_estado  public.estado_escenario;
begin
  select estado into v_estado from public.escenarios where id = v_id;
  if v_estado in ('publicado', 'archivado') then
    raise exception 'Las asignaciones del escenario % son inmutables (escenario %)', v_id, v_estado
      using errcode = 'check_violation';
  end if;
  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

revoke all on function public.asignaciones_proteger() from public, anon, authenticated;

drop trigger if exists trg_asignaciones_proteger on public.asignaciones;
create trigger trg_asignaciones_proteger
  before update or delete on public.asignaciones
  for each row execute function public.asignaciones_proteger();

-- -----------------------------------------------------------------------------
-- Auditoría: toda escritura en escenarios/asignaciones deja una fila.
-- TG_ARGV[0] = nombre lógico de la tabla (en particiones TG_TABLE_NAME sería
-- el nombre de la partición). security definer: inserta aunque el usuario no
-- tenga privilegios sobre auditoria.
-- -----------------------------------------------------------------------------
create or replace function public.auditar_fila()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_tabla    text  := tg_argv[0];
  v_antes    jsonb := case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) end;
  v_despues  jsonb := case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) end;
  v_fila     jsonb := coalesce(v_despues, v_antes);
begin
  insert into public.auditoria (tabla, operacion, fila_id, escenario_id, antes, despues)
  values (
    v_tabla,
    tg_op,
    (v_fila ->> 'id')::uuid,
    case when v_tabla = 'escenarios' then (v_fila ->> 'id')::uuid
         else (v_fila ->> 'escenario_id')::uuid end,
    v_antes,
    v_despues
  );
  return null;
end;
$$;

revoke all on function public.auditar_fila() from public, anon, authenticated;

drop trigger if exists trg_escenarios_auditar on public.escenarios;
create trigger trg_escenarios_auditar
  after insert or update or delete on public.escenarios
  for each row execute function public.auditar_fila('escenarios');

drop trigger if exists trg_asignaciones_auditar on public.asignaciones;
create trigger trg_asignaciones_auditar
  after insert or update or delete on public.asignaciones
  for each row execute function public.auditar_fila('asignaciones');

-- =============================================================================
-- Privilegios y RLS
-- =============================================================================
alter table public.puestos               enable row level security;
alter table public.tabuladores           enable row level security;
alter table public.habilidades           enable row level security;
alter table public.empleado_habilidades  enable row level security;
alter table public.disponibilidad        enable row level security;
alter table public.plantillas_turno      enable row level security;
alter table public.trafico_observado     enable row level security;
alter table public.pronosticos           enable row level security;
alter table public.demanda_intervalo     enable row level security;
alter table public.reglas_laborales      enable row level security;
alter table public.escenarios            enable row level security;
alter table public.asignaciones          enable row level security;
alter table public.cobertura_intervalo   enable row level security;
alter table public.resumen_escenario     enable row level security;
alter table public.auditoria             enable row level security;

-- anon: nada. authenticated: CRUD filtrado por políticas.
revoke all on public.puestos, public.tabuladores, public.habilidades,
              public.empleado_habilidades, public.disponibilidad, public.plantillas_turno,
              public.trafico_observado, public.pronosticos, public.demanda_intervalo,
              public.reglas_laborales, public.escenarios, public.asignaciones,
              public.cobertura_intervalo, public.resumen_escenario, public.auditoria
  from anon;

grant select, insert, update, delete on
  public.puestos, public.tabuladores, public.habilidades,
  public.empleado_habilidades, public.disponibilidad, public.plantillas_turno,
  public.trafico_observado, public.pronosticos, public.demanda_intervalo,
  public.reglas_laborales, public.escenarios, public.asignaciones,
  public.cobertura_intervalo, public.resumen_escenario
  to authenticated;

-- auditoria: sólo lectura desde la API; las filas las insertan los triggers
-- (security definer). Sin update/delete para nadie vía API.
revoke insert, update, delete on public.auditoria from public, anon, authenticated;
revoke all on sequence public.auditoria_id_seq from anon, authenticated;
grant select on public.auditoria to authenticated;

-- Particiones: sólo se consultan a través de la tabla padre. RLS sin políticas
-- (= deny) y sin privilegios para anon/authenticated evita el acceso directo.
do $$
declare
  p text;
begin
  for p in
    select c.relname
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    join pg_inherits i on i.inhrelid = c.oid
    join pg_class pc on pc.oid = i.inhparent
    where n.nspname = 'public'
      and pc.relname in ('trafico_observado', 'demanda_intervalo', 'asignaciones')
  loop
    execute format('alter table public.%I enable row level security', p);
    execute format('revoke all on public.%I from anon, authenticated', p);
  end loop;
end
$$;

-- ----------------------------------------------------------- habilidades --
drop policy if exists habilidades_select on public.habilidades;
create policy habilidades_select on public.habilidades
  for select to authenticated
  using (empresa_id = (select public.empresa_actual()));

drop policy if exists habilidades_insert on public.habilidades;
create policy habilidades_insert on public.habilidades
  for insert to authenticated
  with check (empresa_id = (select public.empresa_actual()) and (select public.es_admin()));

drop policy if exists habilidades_update on public.habilidades;
create policy habilidades_update on public.habilidades
  for update to authenticated
  using      (empresa_id = (select public.empresa_actual()) and (select public.es_admin()))
  with check (empresa_id = (select public.empresa_actual()) and (select public.es_admin()));

drop policy if exists habilidades_delete on public.habilidades;
create policy habilidades_delete on public.habilidades
  for delete to authenticated
  using (empresa_id = (select public.empresa_actual()) and (select public.es_admin()));

-- --------------------------------------------------------------- puestos --
drop policy if exists puestos_select on public.puestos;
create policy puestos_select on public.puestos
  for select to authenticated
  using (empresa_id = (select public.empresa_actual()));

drop policy if exists puestos_insert on public.puestos;
create policy puestos_insert on public.puestos
  for insert to authenticated
  with check (empresa_id = (select public.empresa_actual()) and (select public.es_admin()));

drop policy if exists puestos_update on public.puestos;
create policy puestos_update on public.puestos
  for update to authenticated
  using      (empresa_id = (select public.empresa_actual()) and (select public.es_admin()))
  with check (empresa_id = (select public.empresa_actual()) and (select public.es_admin()));

drop policy if exists puestos_delete on public.puestos;
create policy puestos_delete on public.puestos
  for delete to authenticated
  using (empresa_id = (select public.empresa_actual()) and (select public.es_admin()));

-- ----------------------------------------------------------- tabuladores --
drop policy if exists tabuladores_select on public.tabuladores;
create policy tabuladores_select on public.tabuladores
  for select to authenticated
  using (
    exists (
      select 1 from public.puestos p
      where p.id = tabuladores.puesto_id
        and p.empresa_id = (select public.empresa_actual())
    )
  );

drop policy if exists tabuladores_insert on public.tabuladores;
create policy tabuladores_insert on public.tabuladores
  for insert to authenticated
  with check (
    (select public.es_admin())
    and exists (
      select 1 from public.puestos p
      where p.id = tabuladores.puesto_id
        and p.empresa_id = (select public.empresa_actual())
    )
  );

drop policy if exists tabuladores_update on public.tabuladores;
create policy tabuladores_update on public.tabuladores
  for update to authenticated
  using (
    (select public.es_admin())
    and exists (
      select 1 from public.puestos p
      where p.id = tabuladores.puesto_id
        and p.empresa_id = (select public.empresa_actual())
    )
  )
  with check (
    (select public.es_admin())
    and exists (
      select 1 from public.puestos p
      where p.id = tabuladores.puesto_id
        and p.empresa_id = (select public.empresa_actual())
    )
  );

drop policy if exists tabuladores_delete on public.tabuladores;
create policy tabuladores_delete on public.tabuladores
  for delete to authenticated
  using (
    (select public.es_admin())
    and exists (
      select 1 from public.puestos p
      where p.id = tabuladores.puesto_id
        and p.empresa_id = (select public.empresa_actual())
    )
  );

-- ------------------------------------------------------ plantillas_turno --
drop policy if exists plantillas_turno_select on public.plantillas_turno;
create policy plantillas_turno_select on public.plantillas_turno
  for select to authenticated
  using (empresa_id = (select public.empresa_actual()));

drop policy if exists plantillas_turno_insert on public.plantillas_turno;
create policy plantillas_turno_insert on public.plantillas_turno
  for insert to authenticated
  with check (empresa_id = (select public.empresa_actual()) and (select public.es_admin()));

drop policy if exists plantillas_turno_update on public.plantillas_turno;
create policy plantillas_turno_update on public.plantillas_turno
  for update to authenticated
  using      (empresa_id = (select public.empresa_actual()) and (select public.es_admin()))
  with check (empresa_id = (select public.empresa_actual()) and (select public.es_admin()));

drop policy if exists plantillas_turno_delete on public.plantillas_turno;
create policy plantillas_turno_delete on public.plantillas_turno
  for delete to authenticated
  using (empresa_id = (select public.empresa_actual()) and (select public.es_admin()));

-- ------------------------------------------------------ reglas_laborales --
-- Globales (empresa_id null): visibles para todos, sólo lectura desde la API.
drop policy if exists reglas_laborales_select on public.reglas_laborales;
create policy reglas_laborales_select on public.reglas_laborales
  for select to authenticated
  using (empresa_id is null or empresa_id = (select public.empresa_actual()));

drop policy if exists reglas_laborales_insert on public.reglas_laborales;
create policy reglas_laborales_insert on public.reglas_laborales
  for insert to authenticated
  with check (
    empresa_id is not null
    and empresa_id = (select public.empresa_actual())
    and (select public.es_admin())
  );

drop policy if exists reglas_laborales_update on public.reglas_laborales;
create policy reglas_laborales_update on public.reglas_laborales
  for update to authenticated
  using (
    empresa_id is not null
    and empresa_id = (select public.empresa_actual())
    and (select public.es_admin())
  )
  with check (
    empresa_id is not null
    and empresa_id = (select public.empresa_actual())
    and (select public.es_admin())
  );

drop policy if exists reglas_laborales_delete on public.reglas_laborales;
create policy reglas_laborales_delete on public.reglas_laborales
  for delete to authenticated
  using (
    empresa_id is not null
    and empresa_id = (select public.empresa_actual())
    and (select public.es_admin())
  );

-- -------------------------------------------------- empleado_habilidades --
drop policy if exists empleado_habilidades_select on public.empleado_habilidades;
create policy empleado_habilidades_select on public.empleado_habilidades
  for select to authenticated
  using (
    exists (
      select 1
      from public.empleados e
      join public.sucursales s on s.id = e.sucursal_id
      join public.hubs h on h.id = s.hub_id
      where e.id = empleado_habilidades.empleado_id
        and h.empresa_id = (select public.empresa_actual())
    )
  );

drop policy if exists empleado_habilidades_insert on public.empleado_habilidades;
create policy empleado_habilidades_insert on public.empleado_habilidades
  for insert to authenticated
  with check (
    (select public.puede_editar())
    and exists (
      select 1
      from public.empleados e
      join public.sucursales s on s.id = e.sucursal_id
      join public.hubs h on h.id = s.hub_id
      where e.id = empleado_habilidades.empleado_id
        and h.empresa_id = (select public.empresa_actual())
    )
  );

drop policy if exists empleado_habilidades_update on public.empleado_habilidades;
create policy empleado_habilidades_update on public.empleado_habilidades
  for update to authenticated
  using (
    (select public.puede_editar())
    and exists (
      select 1
      from public.empleados e
      join public.sucursales s on s.id = e.sucursal_id
      join public.hubs h on h.id = s.hub_id
      where e.id = empleado_habilidades.empleado_id
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
      where e.id = empleado_habilidades.empleado_id
        and h.empresa_id = (select public.empresa_actual())
    )
  );

drop policy if exists empleado_habilidades_delete on public.empleado_habilidades;
create policy empleado_habilidades_delete on public.empleado_habilidades
  for delete to authenticated
  using (
    (select public.puede_editar())
    and exists (
      select 1
      from public.empleados e
      join public.sucursales s on s.id = e.sucursal_id
      join public.hubs h on h.id = s.hub_id
      where e.id = empleado_habilidades.empleado_id
        and h.empresa_id = (select public.empresa_actual())
    )
  );

-- -------------------------------------------------------- disponibilidad --
drop policy if exists disponibilidad_select on public.disponibilidad;
create policy disponibilidad_select on public.disponibilidad
  for select to authenticated
  using (
    exists (
      select 1
      from public.empleados e
      join public.sucursales s on s.id = e.sucursal_id
      join public.hubs h on h.id = s.hub_id
      where e.id = disponibilidad.empleado_id
        and h.empresa_id = (select public.empresa_actual())
    )
  );

drop policy if exists disponibilidad_insert on public.disponibilidad;
create policy disponibilidad_insert on public.disponibilidad
  for insert to authenticated
  with check (
    (select public.puede_editar())
    and exists (
      select 1
      from public.empleados e
      join public.sucursales s on s.id = e.sucursal_id
      join public.hubs h on h.id = s.hub_id
      where e.id = disponibilidad.empleado_id
        and h.empresa_id = (select public.empresa_actual())
    )
  );

drop policy if exists disponibilidad_update on public.disponibilidad;
create policy disponibilidad_update on public.disponibilidad
  for update to authenticated
  using (
    (select public.puede_editar())
    and exists (
      select 1
      from public.empleados e
      join public.sucursales s on s.id = e.sucursal_id
      join public.hubs h on h.id = s.hub_id
      where e.id = disponibilidad.empleado_id
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
      where e.id = disponibilidad.empleado_id
        and h.empresa_id = (select public.empresa_actual())
    )
  );

drop policy if exists disponibilidad_delete on public.disponibilidad;
create policy disponibilidad_delete on public.disponibilidad
  for delete to authenticated
  using (
    (select public.puede_editar())
    and exists (
      select 1
      from public.empleados e
      join public.sucursales s on s.id = e.sucursal_id
      join public.hubs h on h.id = s.hub_id
      where e.id = disponibilidad.empleado_id
        and h.empresa_id = (select public.empresa_actual())
    )
  );

-- ----------------------------------------------------- trafico_observado --
drop policy if exists trafico_observado_select on public.trafico_observado;
create policy trafico_observado_select on public.trafico_observado
  for select to authenticated
  using (
    exists (
      select 1
      from public.sucursales s
      join public.hubs h on h.id = s.hub_id
      where s.id = trafico_observado.sucursal_id
        and h.empresa_id = (select public.empresa_actual())
    )
  );

drop policy if exists trafico_observado_insert on public.trafico_observado;
create policy trafico_observado_insert on public.trafico_observado
  for insert to authenticated
  with check (
    (select public.puede_editar())
    and exists (
      select 1
      from public.sucursales s
      join public.hubs h on h.id = s.hub_id
      where s.id = trafico_observado.sucursal_id
        and h.empresa_id = (select public.empresa_actual())
    )
  );

drop policy if exists trafico_observado_update on public.trafico_observado;
create policy trafico_observado_update on public.trafico_observado
  for update to authenticated
  using (
    (select public.puede_editar())
    and exists (
      select 1
      from public.sucursales s
      join public.hubs h on h.id = s.hub_id
      where s.id = trafico_observado.sucursal_id
        and h.empresa_id = (select public.empresa_actual())
    )
  )
  with check (
    (select public.puede_editar())
    and exists (
      select 1
      from public.sucursales s
      join public.hubs h on h.id = s.hub_id
      where s.id = trafico_observado.sucursal_id
        and h.empresa_id = (select public.empresa_actual())
    )
  );

drop policy if exists trafico_observado_delete on public.trafico_observado;
create policy trafico_observado_delete on public.trafico_observado
  for delete to authenticated
  using (
    (select public.puede_editar())
    and exists (
      select 1
      from public.sucursales s
      join public.hubs h on h.id = s.hub_id
      where s.id = trafico_observado.sucursal_id
        and h.empresa_id = (select public.empresa_actual())
    )
  );

-- ----------------------------------------------------------- pronosticos --
drop policy if exists pronosticos_select on public.pronosticos;
create policy pronosticos_select on public.pronosticos
  for select to authenticated
  using (
    exists (
      select 1
      from public.sucursales s
      join public.hubs h on h.id = s.hub_id
      where s.id = pronosticos.sucursal_id
        and h.empresa_id = (select public.empresa_actual())
    )
  );

drop policy if exists pronosticos_insert on public.pronosticos;
create policy pronosticos_insert on public.pronosticos
  for insert to authenticated
  with check (
    (select public.puede_editar())
    and exists (
      select 1
      from public.sucursales s
      join public.hubs h on h.id = s.hub_id
      where s.id = pronosticos.sucursal_id
        and h.empresa_id = (select public.empresa_actual())
    )
  );

drop policy if exists pronosticos_update on public.pronosticos;
create policy pronosticos_update on public.pronosticos
  for update to authenticated
  using (
    (select public.puede_editar())
    and exists (
      select 1
      from public.sucursales s
      join public.hubs h on h.id = s.hub_id
      where s.id = pronosticos.sucursal_id
        and h.empresa_id = (select public.empresa_actual())
    )
  )
  with check (
    (select public.puede_editar())
    and exists (
      select 1
      from public.sucursales s
      join public.hubs h on h.id = s.hub_id
      where s.id = pronosticos.sucursal_id
        and h.empresa_id = (select public.empresa_actual())
    )
  );

drop policy if exists pronosticos_delete on public.pronosticos;
create policy pronosticos_delete on public.pronosticos
  for delete to authenticated
  using (
    (select public.puede_editar())
    and exists (
      select 1
      from public.sucursales s
      join public.hubs h on h.id = s.hub_id
      where s.id = pronosticos.sucursal_id
        and h.empresa_id = (select public.empresa_actual())
    )
  );

-- ----------------------------------------------------- demanda_intervalo --
drop policy if exists demanda_intervalo_select on public.demanda_intervalo;
create policy demanda_intervalo_select on public.demanda_intervalo
  for select to authenticated
  using (
    exists (
      select 1
      from public.sucursales s
      join public.hubs h on h.id = s.hub_id
      where s.id = demanda_intervalo.sucursal_id
        and h.empresa_id = (select public.empresa_actual())
    )
  );

drop policy if exists demanda_intervalo_insert on public.demanda_intervalo;
create policy demanda_intervalo_insert on public.demanda_intervalo
  for insert to authenticated
  with check (
    (select public.puede_editar())
    and exists (
      select 1
      from public.sucursales s
      join public.hubs h on h.id = s.hub_id
      where s.id = demanda_intervalo.sucursal_id
        and h.empresa_id = (select public.empresa_actual())
    )
  );

drop policy if exists demanda_intervalo_update on public.demanda_intervalo;
create policy demanda_intervalo_update on public.demanda_intervalo
  for update to authenticated
  using (
    (select public.puede_editar())
    and exists (
      select 1
      from public.sucursales s
      join public.hubs h on h.id = s.hub_id
      where s.id = demanda_intervalo.sucursal_id
        and h.empresa_id = (select public.empresa_actual())
    )
  )
  with check (
    (select public.puede_editar())
    and exists (
      select 1
      from public.sucursales s
      join public.hubs h on h.id = s.hub_id
      where s.id = demanda_intervalo.sucursal_id
        and h.empresa_id = (select public.empresa_actual())
    )
  );

drop policy if exists demanda_intervalo_delete on public.demanda_intervalo;
create policy demanda_intervalo_delete on public.demanda_intervalo
  for delete to authenticated
  using (
    (select public.puede_editar())
    and exists (
      select 1
      from public.sucursales s
      join public.hubs h on h.id = s.hub_id
      where s.id = demanda_intervalo.sucursal_id
        and h.empresa_id = (select public.empresa_actual())
    )
  );

-- ------------------------------------------------------------ escenarios --
drop policy if exists escenarios_select on public.escenarios;
create policy escenarios_select on public.escenarios
  for select to authenticated
  using (
    exists (
      select 1
      from public.sucursales s
      join public.hubs h on h.id = s.hub_id
      where s.id = escenarios.sucursal_id
        and h.empresa_id = (select public.empresa_actual())
    )
  );

drop policy if exists escenarios_insert on public.escenarios;
create policy escenarios_insert on public.escenarios
  for insert to authenticated
  with check (
    (select public.puede_editar())
    and (creado_por is null or creado_por = (select auth.uid()))
    and exists (
      select 1
      from public.sucursales s
      join public.hubs h on h.id = s.hub_id
      where s.id = escenarios.sucursal_id
        and h.empresa_id = (select public.empresa_actual())
    )
  );

drop policy if exists escenarios_update on public.escenarios;
create policy escenarios_update on public.escenarios
  for update to authenticated
  using (
    (select public.puede_editar())
    and exists (
      select 1
      from public.sucursales s
      join public.hubs h on h.id = s.hub_id
      where s.id = escenarios.sucursal_id
        and h.empresa_id = (select public.empresa_actual())
    )
  )
  with check (
    (select public.puede_editar())
    and exists (
      select 1
      from public.sucursales s
      join public.hubs h on h.id = s.hub_id
      where s.id = escenarios.sucursal_id
        and h.empresa_id = (select public.empresa_actual())
    )
  );

drop policy if exists escenarios_delete on public.escenarios;
create policy escenarios_delete on public.escenarios
  for delete to authenticated
  using (
    (select public.puede_editar())
    and exists (
      select 1
      from public.sucursales s
      join public.hubs h on h.id = s.hub_id
      where s.id = escenarios.sucursal_id
        and h.empresa_id = (select public.empresa_actual())
    )
  );

-- ---------------------------------------------------------- asignaciones --
drop policy if exists asignaciones_select on public.asignaciones;
create policy asignaciones_select on public.asignaciones
  for select to authenticated
  using (
    exists (
      select 1
      from public.escenarios x
      join public.sucursales s on s.id = x.sucursal_id
      join public.hubs h on h.id = s.hub_id
      where x.id = asignaciones.escenario_id
        and h.empresa_id = (select public.empresa_actual())
    )
  );

drop policy if exists asignaciones_insert on public.asignaciones;
create policy asignaciones_insert on public.asignaciones
  for insert to authenticated
  with check (
    (select public.puede_editar())
    and exists (
      select 1
      from public.escenarios x
      join public.sucursales s on s.id = x.sucursal_id
      join public.hubs h on h.id = s.hub_id
      where x.id = asignaciones.escenario_id
        and h.empresa_id = (select public.empresa_actual())
    )
  );

drop policy if exists asignaciones_update on public.asignaciones;
create policy asignaciones_update on public.asignaciones
  for update to authenticated
  using (
    (select public.puede_editar())
    and exists (
      select 1
      from public.escenarios x
      join public.sucursales s on s.id = x.sucursal_id
      join public.hubs h on h.id = s.hub_id
      where x.id = asignaciones.escenario_id
        and h.empresa_id = (select public.empresa_actual())
    )
  )
  with check (
    (select public.puede_editar())
    and exists (
      select 1
      from public.escenarios x
      join public.sucursales s on s.id = x.sucursal_id
      join public.hubs h on h.id = s.hub_id
      where x.id = asignaciones.escenario_id
        and h.empresa_id = (select public.empresa_actual())
    )
  );

drop policy if exists asignaciones_delete on public.asignaciones;
create policy asignaciones_delete on public.asignaciones
  for delete to authenticated
  using (
    (select public.puede_editar())
    and exists (
      select 1
      from public.escenarios x
      join public.sucursales s on s.id = x.sucursal_id
      join public.hubs h on h.id = s.hub_id
      where x.id = asignaciones.escenario_id
        and h.empresa_id = (select public.empresa_actual())
    )
  );

-- --------------------------------------------------- cobertura_intervalo --
drop policy if exists cobertura_intervalo_select on public.cobertura_intervalo;
create policy cobertura_intervalo_select on public.cobertura_intervalo
  for select to authenticated
  using (
    exists (
      select 1
      from public.escenarios x
      join public.sucursales s on s.id = x.sucursal_id
      join public.hubs h on h.id = s.hub_id
      where x.id = cobertura_intervalo.escenario_id
        and h.empresa_id = (select public.empresa_actual())
    )
  );

drop policy if exists cobertura_intervalo_insert on public.cobertura_intervalo;
create policy cobertura_intervalo_insert on public.cobertura_intervalo
  for insert to authenticated
  with check (
    (select public.puede_editar())
    and exists (
      select 1
      from public.escenarios x
      join public.sucursales s on s.id = x.sucursal_id
      join public.hubs h on h.id = s.hub_id
      where x.id = cobertura_intervalo.escenario_id
        and h.empresa_id = (select public.empresa_actual())
    )
  );

drop policy if exists cobertura_intervalo_update on public.cobertura_intervalo;
create policy cobertura_intervalo_update on public.cobertura_intervalo
  for update to authenticated
  using (
    (select public.puede_editar())
    and exists (
      select 1
      from public.escenarios x
      join public.sucursales s on s.id = x.sucursal_id
      join public.hubs h on h.id = s.hub_id
      where x.id = cobertura_intervalo.escenario_id
        and h.empresa_id = (select public.empresa_actual())
    )
  )
  with check (
    (select public.puede_editar())
    and exists (
      select 1
      from public.escenarios x
      join public.sucursales s on s.id = x.sucursal_id
      join public.hubs h on h.id = s.hub_id
      where x.id = cobertura_intervalo.escenario_id
        and h.empresa_id = (select public.empresa_actual())
    )
  );

drop policy if exists cobertura_intervalo_delete on public.cobertura_intervalo;
create policy cobertura_intervalo_delete on public.cobertura_intervalo
  for delete to authenticated
  using (
    (select public.puede_editar())
    and exists (
      select 1
      from public.escenarios x
      join public.sucursales s on s.id = x.sucursal_id
      join public.hubs h on h.id = s.hub_id
      where x.id = cobertura_intervalo.escenario_id
        and h.empresa_id = (select public.empresa_actual())
    )
  );

-- ----------------------------------------------------- resumen_escenario --
drop policy if exists resumen_escenario_select on public.resumen_escenario;
create policy resumen_escenario_select on public.resumen_escenario
  for select to authenticated
  using (
    exists (
      select 1
      from public.escenarios x
      join public.sucursales s on s.id = x.sucursal_id
      join public.hubs h on h.id = s.hub_id
      where x.id = resumen_escenario.escenario_id
        and h.empresa_id = (select public.empresa_actual())
    )
  );

drop policy if exists resumen_escenario_insert on public.resumen_escenario;
create policy resumen_escenario_insert on public.resumen_escenario
  for insert to authenticated
  with check (
    (select public.puede_editar())
    and exists (
      select 1
      from public.escenarios x
      join public.sucursales s on s.id = x.sucursal_id
      join public.hubs h on h.id = s.hub_id
      where x.id = resumen_escenario.escenario_id
        and h.empresa_id = (select public.empresa_actual())
    )
  );

drop policy if exists resumen_escenario_update on public.resumen_escenario;
create policy resumen_escenario_update on public.resumen_escenario
  for update to authenticated
  using (
    (select public.puede_editar())
    and exists (
      select 1
      from public.escenarios x
      join public.sucursales s on s.id = x.sucursal_id
      join public.hubs h on h.id = s.hub_id
      where x.id = resumen_escenario.escenario_id
        and h.empresa_id = (select public.empresa_actual())
    )
  )
  with check (
    (select public.puede_editar())
    and exists (
      select 1
      from public.escenarios x
      join public.sucursales s on s.id = x.sucursal_id
      join public.hubs h on h.id = s.hub_id
      where x.id = resumen_escenario.escenario_id
        and h.empresa_id = (select public.empresa_actual())
    )
  );

drop policy if exists resumen_escenario_delete on public.resumen_escenario;
create policy resumen_escenario_delete on public.resumen_escenario
  for delete to authenticated
  using (
    (select public.puede_editar())
    and exists (
      select 1
      from public.escenarios x
      join public.sucursales s on s.id = x.sucursal_id
      join public.hubs h on h.id = s.hub_id
      where x.id = resumen_escenario.escenario_id
        and h.empresa_id = (select public.empresa_actual())
    )
  );

-- ------------------------------------------------------------- auditoria --
-- Sólo lectura por empresa (vía el escenario auditado). Sin políticas de
-- escritura: las filas las insertan los triggers (security definer).
drop policy if exists auditoria_select on public.auditoria;
create policy auditoria_select on public.auditoria
  for select to authenticated
  using (
    exists (
      select 1
      from public.escenarios x
      join public.sucursales s on s.id = x.sucursal_id
      join public.hubs h on h.id = s.hub_id
      where x.id = auditoria.escenario_id
        and h.empresa_id = (select public.empresa_actual())
    )
  );

-- =============================================================================
-- Semilla: reglas globales (empresa_id null) por año de la reforma
-- =============================================================================
insert into public.reglas_laborales
  (empresa_id, vigente_desde, tope_semanal, max_horas_dia, horas_dobles_max,
   factor_doble, factor_triple, prima_dominical_pct, descanso_entre_turnos_horas, max_dias_semana)
select null, v.vigente_desde, v.tope, 8, 9, 2, 3, 25, 12, 6
from (values
  (date '2026-01-01', 48.0),
  (date '2027-01-01', 46.0),
  (date '2028-01-01', 44.0),
  (date '2029-01-01', 42.0),
  (date '2030-01-01', 40.0)
) as v (vigente_desde, tope)
where not exists (
  select 1 from public.reglas_laborales r
  where r.empresa_id is null and r.vigente_desde = v.vigente_desde
);
