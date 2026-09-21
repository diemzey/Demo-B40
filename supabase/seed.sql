-- =============================================================================
-- seed.sql
-- Jornada40 · Datos de demostración
--
--   Empresa   : Grupo Solmar
--   Hub       : CDMX Sur
--   Sucursales: Coapa, Polanco, Satélite
--   Empleados : 8 en Coapa, con una semana de horarios
--               (2026-07-27 → 2026-08-02, semana ISO 31, tope 2026 = 48 h)
--
-- Totales semanales esperados por colaborador:
--   Ortega Bruno     49.0   (fuera de norma, 1.0 h al doble)
--   Cárdenas Ismael  49.0   (fuera de norma, 1.0 h al doble)
--   Quintero Diego   49.0   (fuera de norma, 1.0 h al doble)
--   Téllez Rodrigo   49.0   (fuera de norma, 1.0 h al doble)   ← turno nocturno
--   Nájera Paola     48.5   (fuera de norma, 0.5 h al doble)
--   Olvera Héctor    44.0
--   Escobar Tomás    25.0
--   Molina Rocío     24.5
--   ------------------------------------------------------------
--   Sucursal Coapa  338.0 h totales · 4.5 h al doble · 5 fuera de norma
--
-- No se siembran usuarios de auth. Idempotente: si "Grupo Solmar" ya existe,
-- no inserta nada.
-- Requiere: migraciones 0001–0004 aplicadas.
-- =============================================================================

with empresa as (
  insert into public.empresas (nombre, rfc)
  select 'Grupo Solmar', 'GSO150312AB7'
  where not exists (select 1 from public.empresas where nombre = 'Grupo Solmar')
  returning id
),
hub as (
  insert into public.hubs (empresa_id, nombre, ciudad, estado)
  select empresa.id, 'CDMX Sur', 'Ciudad de México', 'Ciudad de México'
  from empresa
  returning id
),
sucursal as (
  insert into public.sucursales (hub_id, nombre, ciudad, direccion)
  select hub.id, v.nombre, v.ciudad, v.direccion
  from hub
  cross join (
    values
      ('Coapa',    'Ciudad de México',    'Calz. del Hueso 530, Coapa'),
      ('Polanco',  'Ciudad de México',    'Av. Presidente Masaryk 360, Polanco'),
      ('Satélite', 'Naucalpan de Juárez', 'Circuito Centro Comercial 2251, Cd. Satélite')
  ) as v (nombre, ciudad, direccion)
  returning id, nombre
),
empleado as (
  insert into public.empleados (sucursal_id, clave_externa, nombre, apellido, puesto, jornada_contratada_horas)
  select s.id, v.clave, v.nombre, v.apellido, v.puesto, v.jornada
  from sucursal s
  cross join (
    values
      ('EMP-001', 'Bruno',   'Ortega',   'Encargado de piso', 48.00),
      ('EMP-002', 'Ismael',  'Cárdenas', 'Cajero',            48.00),
      ('EMP-003', 'Diego',   'Quintero', 'Vendedor',          48.00),
      ('EMP-004', 'Rodrigo', 'Téllez',   'Vigilante',         48.00),
      ('EMP-005', 'Paola',   'Nájera',   'Cajera',            48.00),
      ('EMP-006', 'Héctor',  'Olvera',   'Almacenista',       44.00),
      ('EMP-007', 'Tomás',   'Escobar',  'Vendedor',          25.00),
      ('EMP-008', 'Rocío',   'Molina',   'Vendedora',         24.00)
  ) as v (clave, nombre, apellido, puesto, jornada)
  where s.nombre = 'Coapa'
  returning id, clave_externa
),
-- Patrones de turno: (clave, días ISO [1=lunes … 7=domingo], inicio, fin, cruza, descanso)
patron as (
  select *
  from (
    values
      -- Ortega Bruno · 49.0 h: L–V 09:00–18:00 (60 min) = 8 h ×5; S 08:00–17:30 (30 min) = 9 h
      ('EMP-001', array[1,2,3,4,5], time '09:00', time '18:00', false, 60),
      ('EMP-001', array[6],         time '08:00', time '17:30', false, 30),
      -- Cárdenas Ismael · 49.0 h: L–V 13:00–22:00 (60) = 8 h ×5; S 12:00–21:30 (30) = 9 h
      ('EMP-002', array[1,2,3,4,5], time '13:00', time '22:00', false, 60),
      ('EMP-002', array[6],         time '12:00', time '21:30', false, 30),
      -- Quintero Diego · 49.0 h: turno partido L–V 08:00–13:00 + 15:00–19:00 = 9 h ×5; S 09:00–13:00 = 4 h
      ('EMP-003', array[1,2,3,4,5], time '08:00', time '13:00', false, 0),
      ('EMP-003', array[1,2,3,4,5], time '15:00', time '19:00', false, 0),
      ('EMP-003', array[6],         time '09:00', time '13:00', false, 0),
      -- Téllez Rodrigo · 49.0 h: nocturno L–V 22:00–07:00 (60) = 8 h ×5; S 21:00–06:30 (30) = 9 h
      ('EMP-004', array[1,2,3,4,5], time '22:00', time '07:00', true,  60),
      ('EMP-004', array[6],         time '21:00', time '06:30', true,  30),
      -- Nájera Paola · 48.5 h: L–V 09:00–18:00 (60) = 8 h ×5; S 09:00–18:00 (30) = 8.5 h
      ('EMP-005', array[1,2,3,4,5], time '09:00', time '18:00', false, 60),
      ('EMP-005', array[6],         time '09:00', time '18:00', false, 30),
      -- Olvera Héctor · 44.0 h: L–V 10:00–19:00 (60) = 8 h ×5; S 10:00–14:00 = 4 h
      ('EMP-006', array[1,2,3,4,5], time '10:00', time '19:00', false, 60),
      ('EMP-006', array[6],         time '10:00', time '14:00', false, 0),
      -- Escobar Tomás · 25.0 h: L–V 16:00–21:00 = 5 h ×5
      ('EMP-007', array[1,2,3,4,5], time '16:00', time '21:00', false, 0),
      -- Molina Rocío · 24.5 h: L–J 10:00–15:00 = 5 h ×4; V 10:00–14:30 = 4.5 h
      ('EMP-008', array[1,2,3,4],   time '10:00', time '15:00', false, 0),
      ('EMP-008', array[5],         time '10:00', time '14:30', false, 0)
  ) as v (clave, dias, hora_inicio, hora_fin, cruza_medianoche, minutos_descanso)
),
dia as (
  select d::date as fecha
  from generate_series(date '2026-07-27', date '2026-08-02', interval '1 day') as d
)
insert into public.horarios (empleado_id, fecha, hora_inicio, hora_fin, cruza_medianoche, minutos_descanso, origen)
select
  e.id,
  dia.fecha,
  p.hora_inicio,
  p.hora_fin,
  p.cruza_medianoche,
  p.minutos_descanso,
  'manual'::public.origen_horario
from patron p
join empleado e on e.clave_externa = p.clave
join dia on extract(isodow from dia.fecha)::integer = any (p.dias)
on conflict (empleado_id, fecha, hora_inicio) do nothing;

-- -----------------------------------------------------------------------------
-- Verificación (opcional; ejecutar como service role o como usuario de la empresa):
--
--   select e.apellido, e.nombre, v.horas_semana
--   from public.v_horas_semana v
--   join public.empleados e on e.id = v.empleado_id
--   where v.semana_iso = date '2026-07-27'
--   order by v.horas_semana desc, e.apellido;
--
--   select * from public.v_resumen_sucursal_semana where semana_iso = date '2026-07-27';
-- -----------------------------------------------------------------------------
