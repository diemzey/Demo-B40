-- 0011: la auditoría de `asignaciones` deja de registrar los inserts.
-- Cada escenario inserta ~1,000 asignaciones y la bitácora duplicaba ese
-- volumen (fila completa en jsonb) en cada programación. El escenario
-- publicado es inmutable (escenarios_proteger / asignaciones_proteger) y es
-- la traza de la propuesta; las actualizaciones y bajas siguen auditadas.
drop trigger if exists trg_asignaciones_auditar on public.asignaciones;
create trigger trg_asignaciones_auditar
  after update or delete on public.asignaciones
  for each row execute function public.auditar_fila('asignaciones');
