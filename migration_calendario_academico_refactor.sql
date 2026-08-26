-- ============================================================================
-- MIGRACIÓN DE REFACTORIZACIÓN: Simplificación radical de public.calendario_minerd
--
-- Conserva exactamente 35 registros.
-- Modifica la estructura de la tabla y políticas RLS.
-- ============================================================================

BEGIN;

-- 1. Eliminar índices obsoletos
DROP INDEX IF EXISTS public.idx_calendario_minerd_anio;
DROP INDEX IF EXISTS public.idx_calendario_minerd_activo;
DROP INDEX IF EXISTS public.idx_calendario_minerd_rango;

-- 2. Recrear el índice de rango sin condición 'activo'
CREATE INDEX idx_calendario_minerd_rango
  ON public.calendario_minerd (fecha_inicio, fecha_fin);

-- 3. Recrear políticas RLS (para usar USING (true) ya que 'activo' será eliminada)
DROP POLICY IF EXISTS calendario_minerd_select_autenticados ON public.calendario_minerd;
CREATE POLICY calendario_minerd_select_autenticados ON public.calendario_minerd
  FOR SELECT TO authenticated
  USING (true);

-- 4. Eliminar columnas obsoletas
ALTER TABLE public.calendario_minerd 
  DROP COLUMN IF EXISTS prioridad,
  DROP COLUMN IF EXISTS niveles,
  DROP COLUMN IF EXISTS modalidades,
  DROP COLUMN IF EXISTS destinatarios,
  DROP COLUMN IF EXISTS es_condicional,
  DROP COLUMN IF EXISTS condicion,
  DROP COLUMN IF EXISTS es_automatico,
  DROP COLUMN IF EXISTS requiere_recordatorio,
  DROP COLUMN IF EXISTS bloquea_planificacion,
  DROP COLUMN IF EXISTS modulo_destino,
  DROP COLUMN IF EXISTS anio_academico,
  DROP COLUMN IF EXISTS metadata,
  DROP COLUMN IF EXISTS activo,
  DROP COLUMN IF EXISTS created_at;

COMMIT;
