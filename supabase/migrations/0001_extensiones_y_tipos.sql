-- =============================================================================
-- 0001_extensiones_y_tipos.sql
-- Jornada40 · Extensiones y tipos enumerados
--
-- Idempotente: puede ejecutarse varias veces sin error.
-- =============================================================================

-- gen_random_uuid() vive en pgcrypto (en Postgres 13+ también existe en core,
-- pero la extensión garantiza compatibilidad con el resto de utilidades).
create extension if not exists "pgcrypto";

-- -----------------------------------------------------------------------------
-- rol_usuario: rol de un usuario de la aplicación dentro de su empresa.
--   owner   → dueño de la cuenta; puede todo, incluida la gestión de roles.
--   admin   → gestiona estructura (hubs, sucursales) y operación.
--   gerente → gestiona empleados, horarios e importaciones de sus sucursales.
--   lectura → sólo consulta.
-- -----------------------------------------------------------------------------
do $$
begin
  create type public.rol_usuario as enum ('owner', 'admin', 'gerente', 'lectura');
exception
  when duplicate_object then null;
end
$$;

-- -----------------------------------------------------------------------------
-- estado_importacion: ciclo de vida de una importación de CSV.
-- -----------------------------------------------------------------------------
do $$
begin
  create type public.estado_importacion as enum ('pendiente', 'procesando', 'completada', 'con_errores');
exception
  when duplicate_object then null;
end
$$;

-- -----------------------------------------------------------------------------
-- origen_horario: de dónde proviene un segmento de horario.
--   csv    → importado desde archivo del cliente.
--   manual → capturado a mano en la aplicación.
--   motor  → generado por el motor de reacomodo de turnos.
-- -----------------------------------------------------------------------------
do $$
begin
  create type public.origen_horario as enum ('csv', 'manual', 'motor');
exception
  when duplicate_object then null;
end
$$;
