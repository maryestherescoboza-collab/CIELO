-- ============================================================================
-- Migración: Soporte de misiones dinámicas e integridad en Fichas y Rutas
-- Fecha: 2026-11-10
--
-- 1. Actualiza portal_get_fichas_compartidas para incluir:
--    - tiene_producto: boolean indicando si la ficha tiene actividades que requieren producto
--    - tiene_ruta: boolean indicando si la ficha tiene rutas publicadas con items activos
-- 2. Elimina el trigger obsoleto trg_ruta_opcion_verdadero_falso para permitir que
--    el docente configure libremente la opción correcta en Verdadero / Falso.
-- ============================================================================

-- 1. Eliminar trigger restrictivo de verdadero/falso si existe
DROP TRIGGER IF EXISTS trg_ruta_opcion_verdadero_falso ON public.ruta_opcion;
DROP FUNCTION IF EXISTS public.ruta_fijar_correcta_verdadero_falso();

-- 2. Actualizar portal_get_fichas_compartidas con banderas de misiones reales
CREATE OR REPLACE FUNCTION public.portal_get_fichas_compartidas(
    p_session_token UUID,
    p_asignatura    TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_sesion RECORD;
    v_acceso RECORD;
    v_estudiante RECORD;
    v_curso RECORD;
    v_config RECORD;
    v_resultado JSONB;
BEGIN
    SELECT * INTO v_sesion FROM public.portal_sesiones WHERE session_token = p_session_token AND expires_at > NOW();
    IF NOT FOUND THEN RETURN jsonb_build_object('error', 'Sesión inválida'); END IF;
    SELECT * INTO v_acceso FROM public.portal_accesos WHERE id = v_sesion.acceso_id AND active = true;

    SELECT e.*, c.shared_course_id INTO v_estudiante
    FROM public.estudiantes e
    JOIN public.cursos c ON c.id = e.curso_id
    WHERE e.id = v_acceso.estudiante_id;

    SELECT * INTO v_curso FROM public.cursos WHERE id = v_estudiante.curso_id;
    SELECT * INTO v_config FROM public.portal_configuraciones WHERE user_id = v_curso.user_id;
    IF v_config IS NOT NULL AND v_config.seccion_fichas = false THEN
        RETURN '[]'::jsonb;
    END IF;

    SELECT jsonb_agg(
        jsonb_build_object(
            'id', pn.id,
            'titulo', pn.titulo,
            'fecha', pn.actualizado_en,
            'curso_id', fc.curso_id,
            'asignatura', c.asignatura,
            'tiene_producto', EXISTS (
                SELECT 1 FROM public.actividades act
                WHERE act.plan_ficha_id = pn.id
                  AND act.requiere_producto = true
                  AND act.activo IS DISTINCT FROM FALSE
            ),
            'tiene_ruta', EXISTS (
                SELECT 1 FROM public.ruta_aprendizaje ra
                WHERE ra.nota_id = pn.id
                  AND ra.estado = 'publicada'
            )
        ) ORDER BY pn.actualizado_en DESC
    ) INTO v_resultado
    FROM public.ficha_cursos fc
    JOIN public.pc_notas pn ON pn.id = fc.nota_id
    JOIN public.cursos c ON c.id = fc.curso_id
    WHERE (
        fc.curso_id = v_estudiante.curso_id 
        OR (v_estudiante.shared_course_id IS NOT NULL AND c.shared_course_id = v_estudiante.shared_course_id)
    )
    AND (
        p_asignatura IS NULL
        OR (
            c.asignatura IS NOT NULL
            AND public.portal_asignaturas_coinciden(c.asignatura, p_asignatura)
        )
    );

    RETURN COALESCE(v_resultado, '[]'::jsonb);
END;
$$;

GRANT EXECUTE ON FUNCTION public.portal_get_fichas_compartidas(UUID, TEXT) TO anon, authenticated;

