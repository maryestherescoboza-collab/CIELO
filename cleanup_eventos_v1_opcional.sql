-- ============================================================================
-- LIMPIEZA OPCIONAL: reversión de artefactos dejados por la migración v1
-- (fallida en su siembra) SOBRE public.eventos
--
-- EJECUTA ESTE ARCHIVO ÚNICAMENTE SI quieres devolver public.eventos a su
-- estado exacto previo a la primera corrida. La migración principal de
-- calendario_minerd NO lo requiere.
--
-- SEGURIDAD:
--   * Cada DROP usa IF EXISTS con el nombre exacto creado por la v1 ->
--     imposible tocar objetos preexistentes tuyos.
--   * Ninguna sentencia modifica datos (sin INSERT/UPDATE/DELETE).
--   * Si algún objeto ya fue eliminado, el IF EXISTS lo omite sin error.
--
-- PASO PREVIO RECOMENDADO — inspecciona el estado actual:
--   SELECT c.relrowsecurity,
--          COALESCE(array_agg(p.policyname), '{}') AS politicas
--   FROM pg_class c
--   LEFT JOIN pg_policies p ON p.tablename = 'eventos'
--   WHERE c.oid = 'public.eventos'::regclass
--   GROUP BY c.relrowsecurity;
--
--   * Si aparecen políticas con nombres QUE NO SON 'eventos_select_autenticados',
--     son tuyas preexistentes: este archivo NO las afecta.
-- ============================================================================

-- 1. Política SELECT amplia creada por la v1 (riesgo: exponía todas las filas)
DROP POLICY IF EXISTS eventos_select_autenticados ON public.eventos;

-- 2. Trigger + función created_at/updated_at de la v1
DROP TRIGGER IF EXISTS trg_eventos_updated_at ON public.eventos;
DROP FUNCTION IF EXISTS public.eventos_touch_updated_at();

-- 3. Índices creados por la v1
DROP INDEX IF EXISTS idx_eventos_rango;
DROP INDEX IF EXISTS idx_eventos_anio_academico;

-- 4. Columnas añadidas por la v1 (vacías o con default; sin datos de usuarios)
ALTER TABLE public.eventos DROP COLUMN IF EXISTS descripcion;
ALTER TABLE public.eventos DROP COLUMN IF EXISTS fecha_inicio;
ALTER TABLE public.eventos DROP COLUMN IF EXISTS fecha_fin;
ALTER TABLE public.eventos DROP COLUMN IF EXISTS prioridad;
ALTER TABLE public.eventos DROP COLUMN IF EXISTS niveles;
ALTER TABLE public.eventos DROP COLUMN IF EXISTS modalidades;
ALTER TABLE public.eventos DROP COLUMN IF EXISTS destinatarios;
ALTER TABLE public.eventos DROP COLUMN IF EXISTS es_condicional;
ALTER TABLE public.eventos DROP COLUMN IF EXISTS condicion;
ALTER TABLE public.eventos DROP COLUMN IF EXISTS es_automatico;
ALTER TABLE public.eventos DROP COLUMN IF EXISTS requiere_recordatorio;
ALTER TABLE public.eventos DROP COLUMN IF EXISTS bloquea_planificacion;
ALTER TABLE public.eventos DROP COLUMN IF EXISTS modulo_destino;
ALTER TABLE public.eventos DROP COLUMN IF EXISTS anio_academico;
ALTER TABLE public.eventos DROP COLUMN IF EXISTS metadata;
ALTER TABLE public.eventos DROP COLUMN IF EXISTS activo;
ALTER TABLE public.eventos DROP COLUMN IF EXISTS updated_at;

-- 5. Flag global de RLS (la v1 pudo haberlo activado).
--    DESCOMENTA SOLO si la inspección previa muestra relrowsecurity = true
--    y concluyes que estaba desactivada originalmente (lo habitual en tablas
--    creadas ad-hoc sin policies):
-- ALTER TABLE public.eventos DISABLE ROW LEVEL SECURITY;

-- VERIFICACIÓN POST-LIMPIEZA:
--   * Columnas v1 remanentes —— esperado: 0 filas
SELECT column_name FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'eventos'
  AND column_name IN ('niveles','modalidades','destinatarios','anio_academico',
                      'es_condicional','bloquea_planificacion','metadata','activo');
