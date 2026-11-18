-- Migración quirúrgica: Corrección del filtrado de fichas en el portal del estudiante
-- 1. Utiliza ficha_publicaciones.asignatura (en lugar de c.asignatura) para categorizar asignaturas correctamente.
-- 2. Filtra estrictamente por estado = 'publicada', excluyendo 'borrador' o 'revision_requerida'.
-- 3. Resuelve el período desde la actividad vinculada a la publicación y admite p_periodo.
-- 4. Mantiene compatibilidad regresiva con publicaciones históricas en ficha_cursos sin duplicar.

CREATE OR REPLACE FUNCTION public.portal_get_fichas_compartidas(
    p_session_token UUID,
    p_asignatura    TEXT DEFAULT NULL,
    p_periodo       TEXT DEFAULT NULL
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
            'fecha', COALESCE(pub.published_at, pn.actualizado_en),
            'curso_id', pub.curso_id,
            'asignatura', pub.asignatura,
            'periodo', pub.periodo,
            'tiene_producto', pub.requiere_producto,
            'tiene_ruta', EXISTS (
                SELECT 1 FROM public.ruta_aprendizaje ra
                WHERE ra.nota_id = pn.id
                  AND ra.estado = 'publicada'
            )
        ) ORDER BY COALESCE(pub.published_at, pn.actualizado_en) DESC
    ) INTO v_resultado
    FROM (
        -- 1. Publicaciones modernas desde public.ficha_publicaciones
        SELECT 
            fp.nota_id,
            fp.curso_id,
            fp.asignatura,
            fp.published_at,
            fp.requiere_producto,
            COALESCE(
                a.periodo,
                (
                    SELECT act.periodo FROM public.actividades act
                    WHERE act.plan_ficha_id = fp.nota_id
                      AND act.curso_id = fp.curso_id
                      AND act.activo IS DISTINCT FROM FALSE
                    LIMIT 1
                )
            ) AS periodo
        FROM public.ficha_publicaciones fp
        LEFT JOIN public.actividades a ON a.id = fp.actividad_id
        WHERE fp.estado = 'publicada'
          AND (
              fp.curso_id = v_estudiante.curso_id
              OR (
                  v_estudiante.shared_course_id IS NOT NULL 
                  AND fp.curso_id IN (
                      SELECT id FROM public.cursos WHERE shared_course_id = v_estudiante.shared_course_id
                  )
              )
          )

        UNION ALL

        -- 2. Compatibilidad con registros legacy en ficha_cursos sin entrada en ficha_publicaciones
        SELECT 
            fc.nota_id,
            fc.curso_id,
            COALESCE(c.asignatura, 'general') AS asignatura,
            pn2.actualizado_en AS published_at,
            EXISTS (
                SELECT 1 FROM public.actividades act
                WHERE act.plan_ficha_id = fc.nota_id
                  AND act.curso_id = fc.curso_id
                  AND act.requiere_producto = true
                  AND act.activo IS DISTINCT FROM FALSE
            ) AS requiere_producto,
            (
                SELECT act.periodo FROM public.actividades act
                WHERE act.plan_ficha_id = fc.nota_id
                  AND act.curso_id = fc.curso_id
                  AND act.activo IS DISTINCT FROM FALSE
                LIMIT 1
            ) AS periodo
        FROM public.ficha_cursos fc
        JOIN public.pc_notas pn2 ON pn2.id = fc.nota_id
        JOIN public.cursos c ON c.id = fc.curso_id
        WHERE (
            fc.curso_id = v_estudiante.curso_id
            OR (
                v_estudiante.shared_course_id IS NOT NULL 
                AND c.shared_course_id = v_estudiante.shared_course_id
            )
        )
        AND NOT EXISTS (
            SELECT 1 FROM public.ficha_publicaciones fp2
            WHERE fp2.nota_id = fc.nota_id AND fp2.curso_id = fc.curso_id
        )
    ) pub
    JOIN public.pc_notas pn ON pn.id = pub.nota_id
    WHERE (
        p_asignatura IS NULL
        OR (
            pub.asignatura IS NOT NULL
            AND public.portal_asignaturas_coinciden(pub.asignatura, p_asignatura)
        )
    )
    AND (
        p_periodo IS NULL
        OR pub.periodo = p_periodo
    );

    RETURN COALESCE(v_resultado, '[]'::jsonb);
END;
$$;

GRANT EXECUTE ON FUNCTION public.portal_get_fichas_compartidas(UUID, TEXT, TEXT) TO anon, authenticated;
