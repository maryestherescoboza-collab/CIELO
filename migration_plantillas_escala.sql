-- ============================================================================
-- MIGRACIÓN: Gestión escalable de plantillas (rúbricas y listas de cotejo)
-- Ejecutar en: Supabase Dashboard → SQL Editor
--
-- Objetivos:
--   1. Índice alineado con los patrones reales de consulta (dueño + tipo).
--   2. Límite de 10 plantillas activas por docente Y tipo, garantizado en la
--      base de datos (a prueba de manipulación del frontend y de solicitudes
--      simultáneas), vía función SECURITY DEFINER + advisory lock.
--   3. No toca políticas RLS: las vigentes (fix_recursos_comunidad_rls.sql)
--      ya garantizan propiedad para INSERT/UPDATE/DELETE y lectura propia
--      o vía posts de comunidad activos.
--
-- Compatible con datos existentes: no modifica columnas ni filas.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1) ÍNDICE PARCIAL para el patrón dominante:
--      WHERE user_id = $1 AND tipo = $2 AND archivado = false
--    Usado por: conteo del límite, listados por pantalla, fetch global acotado.
--    Parcial (solo activas) para mantenerlo pequeño y eficiente.
--    Idempotente.
-- ----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_plantillas_user_tipo_activas
    ON public.plantillas (user_id, tipo)
    WHERE archivado = false;

-- ----------------------------------------------------------------------------
-- 2) FUNCIÓN ATÓMICA DE CREACIÓN con límite 10 por docente y tipo.
--
--    ¿Por qué así?
--    - El patrón COUNT→check→INSERT concurrente permite exceder el límite
--      (dos requests leen count=9 y ambos insertan).
--    - pg_advisory_xact_lock(hashtextextended(user+tipo)) serializa las
--      creaciones del MISMO docente+tipo sin bloquear a otros docentes
--      (escala horizontalmente; locks distintos por clave hash).
--    - SECURITY DEFINER permite contar todas las filas del docente aunque
--      una política futura restringiera SELECT; user_id se toma SIEMPRE de
--      auth.uid() (no aceptado como parámetro → sin suplantación).
--    - Es idempotente en despliegue (CREATE OR REPLACE).
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.crear_plantilla(
    p_tipo   text,
    p_nombre text,
    p_datos  jsonb
)
RETURNS public.plantillas
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user uuid;
    v_total int;
    v_row public.plantillas;
BEGIN
    v_user := auth.uid();
    IF v_user IS NULL THEN
        RAISE EXCEPTION 'NO_AUTENTICADO' USING ERRCODE = '42501';
    END IF;

    IF p_tipo NOT IN ('rubrica', 'cotejo') THEN
        RAISE EXCEPTION 'TIPO_INVALIDO: %', p_tipo USING ERRCODE = '22023';
    END IF;

    IF p_nombre IS NULL OR length(btrim(p_nombre)) = 0 THEN
        RAISE EXCEPTION 'NOMBRE_INVALIDO' USING ERRCODE = '22023';
    END IF;

    -- Serializa creaciones simultáneas del mismo docente+tipo (clave discreta).
    PERFORM pg_advisory_xact_lock(hashtextextended(v_user::text || ':' || p_tipo, 0));

    SELECT count(*) INTO v_total
    FROM public.plantillas
    WHERE user_id = v_user
      AND tipo = p_tipo
      AND archivado = false;

    IF v_total >= 10 THEN
        RAISE EXCEPTION 'LIMITE_PLANTILLAS: alcanzas el máximo de 10 plantillas activas de tipo "%"', p_tipo
            USING ERRCODE = 'P0001',
                  HINT = 'Elimina o archiva una plantilla antes de crear otra.';
    END IF;

    INSERT INTO public.plantillas (user_id, tipo, nombre, datos, archivado)
    VALUES (v_user, p_tipo, btrim(p_nombre), COALESCE(p_datos, '{}'::jsonb), false)
    RETURNING * INTO v_row;

    RETURN v_row;
END;
$$;

-- Nota: si la columna `tipo` fuera un enum con otro nombre, PostgreSQL devolverá
-- un error de tipos al ejecutar esta función; en ese caso sustituir `p_tipo`
-- por el cast apropiado, p. ej. `p_tipo::public.tipo_plantilla`.

-- Permisos de ejecución: solo usuarios autenticados.
REVOKE ALL ON FUNCTION public.crear_plantilla(text, text, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.crear_plantilla(text, text, jsonb) TO authenticated;

-- ----------------------------------------------------------------------------
-- 3) VERIFICACIÓN (auditoría post-despliegue)
-- ----------------------------------------------------------------------------
-- Índices de plantillas:
SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'plantillas';

-- Políticas vigentes (deben seguir siendo: lectura propia/comunidad,
-- escritura solo propietaria — NO se modifican en esta migración):
SELECT policyname, cmd, qual, with_check FROM pg_policies WHERE tablename = 'plantillas';
