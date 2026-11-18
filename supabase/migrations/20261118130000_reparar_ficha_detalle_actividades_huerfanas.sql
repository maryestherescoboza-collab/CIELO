-- Migración quirúrgica: Corrección de actividades huérfanas en el detalle de fichas
-- 1. Desvincula la actividad residual 957 de la ficha prueba 2 (plan_ficha_id = NULL)
-- 2. Actualiza portal_get_ficha_detalle_v2 para enlazar actividades exclusivamente
--    a través de ficha_publicaciones.actividad_id y estado = 'publicada',
--    respetando curso, asignatura y período de la publicación autorizada.

UPDATE public.actividades
SET plan_ficha_id = NULL
WHERE id = 957 AND plan_ficha_id = '247b9541-72f6-4f5d-8b53-f16532afb2f7';

CREATE OR REPLACE FUNCTION public.portal_get_ficha_detalle_v2(
    p_session_token UUID, 
    p_nota_id       UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_est         public.estudiantes;
    v_curso       public.cursos;
    v_compartida  BOOLEAN;
    v_pn          public.pc_notas;
    v_resultado   JSONB;
BEGIN
    v_est := public.evidencia_estudiante_del_portal(p_session_token);
    IF v_est IS NULL THEN
        RETURN jsonb_build_object('error', 'Sesión inválida');
    END IF;

    SELECT * INTO v_curso FROM public.cursos WHERE id = v_est.curso_id;

    -- Verificar que la ficha esté disponible para el curso del estudiante o curso compartido
    SELECT EXISTS (
        SELECT 1
        FROM public.ficha_publicaciones fp
        JOIN public.cursos c ON c.id = fp.curso_id
        WHERE fp.nota_id = p_nota_id
          AND fp.estado = 'publicada'
          AND (
              fp.curso_id = v_est.curso_id
              OR (
                  v_curso.shared_course_id IS NOT NULL 
                  AND c.shared_course_id = v_curso.shared_course_id
              )
          )
    ) OR EXISTS (
        SELECT 1
        FROM public.ficha_cursos fc
        JOIN public.cursos c ON c.id = fc.curso_id
        WHERE fc.nota_id = p_nota_id
          AND (
              fc.curso_id = v_est.curso_id
              OR (
                  v_curso.shared_course_id IS NOT NULL 
                  AND c.shared_course_id = v_curso.shared_course_id
              )
          )
    ) INTO v_compartida;

    IF NOT v_compartida THEN
        RETURN jsonb_build_object('error', 'Ficha no disponible para este curso');
    END IF;

    SELECT * INTO v_pn FROM public.pc_notas WHERE id = p_nota_id;

    SELECT jsonb_build_object(
        'id',             v_pn.id,
        'titulo',         v_pn.titulo,
        'contenido_json', v_pn.contenido_json,
        'actualizado_en', v_pn.actualizado_en,
        'actividades', COALESCE((
            SELECT jsonb_agg(
                jsonb_build_object(
                    'actividad_id',      act.id,
                    'actividad',         COALESCE(act.nombre, 'Actividad'),
                    'asignatura',        COALESCE(act.pub_asignatura, act.asignatura, act.curso_asignatura),
                    'fecha',             act.fecha,
                    'periodo',           act.periodo,
                    'indicador',         act.indicador,
                    'producto',          act.producto,
                    'requiere_producto', TRUE,
                    'entregado',         EXISTS (
                                            SELECT 1
                                            FROM public.evidencias e
                                            WHERE e.estudiante_id = v_est.id
                                              AND e.actividad_id = act.id
                                         ),
                    'entregas',          (
                                            SELECT COALESCE(jsonb_agg(
                                                jsonb_build_object(
                                                    'id',           e.id,
                                                    'nombre',       e.nombre,
                                                    'origen',       e.origen,
                                                    'created_at',   e.created_at,
                                                    'drive_url',    e.drive_url,
                                                    'storage_path', e.storage_path,
                                                    'estado',       e.estado,
                                                    'sello',        e.sello
                                                )
                                                ORDER BY e.created_at DESC
                                            ), '[]'::JSONB)
                                            FROM public.evidencias e
                                            WHERE e.estudiante_id = v_est.id
                                              AND e.actividad_id = act.id
                                         )
                )
                ORDER BY act.fecha DESC NULLS LAST, act.id DESC
            )
            FROM (
                -- 1. Publicaciones modernas: vínculo oficial mediante ficha_publicaciones.actividad_id
                SELECT 
                    a.id,
                    a.nombre,
                    a.fecha,
                    a.periodo,
                    a.indicador,
                    a.producto,
                    fp.asignatura as pub_asignatura,
                    a.asignatura,
                    c.asignatura as curso_asignatura
                FROM public.ficha_publicaciones fp
                JOIN public.actividades a ON a.id = fp.actividad_id
                JOIN public.cursos c ON c.id = fp.curso_id
                WHERE fp.nota_id = p_nota_id
                  AND fp.estado = 'publicada'
                  AND fp.requiere_producto IS TRUE
                  AND a.activo IS NOT FALSE
                  AND (
                      fp.curso_id = v_est.curso_id
                      OR (
                          v_curso.shared_course_id IS NOT NULL 
                          AND c.shared_course_id = v_curso.shared_course_id
                      )
                  )

                UNION

                -- 2. Compatibilidad legacy: ficha_cursos donde no existe entrada en ficha_publicaciones
                SELECT 
                    a.id,
                    a.nombre,
                    a.fecha,
                    a.periodo,
                    a.indicador,
                    a.producto,
                    c.asignatura as pub_asignatura,
                    a.asignatura,
                    c.asignatura as curso_asignatura
                FROM public.ficha_cursos fc
                JOIN public.actividades a ON a.plan_ficha_id = fc.nota_id AND a.curso_id = fc.curso_id
                JOIN public.cursos c ON c.id = fc.curso_id
                WHERE fc.nota_id = p_nota_id
                  AND a.activo IS NOT FALSE
                  AND a.requiere_producto IS TRUE
                  AND (
                      fc.curso_id = v_est.curso_id
                      OR (
                          v_curso.shared_course_id IS NOT NULL 
                          AND c.shared_course_id = v_curso.shared_course_id
                      )
                  )
                  AND NOT EXISTS (
                      SELECT 1 FROM public.ficha_publicaciones fp2
                      WHERE fp2.nota_id = fc.nota_id AND fp2.curso_id = fc.curso_id
                  )
            ) act
        ), '[]'::JSONB)
    ) INTO v_resultado;

    RETURN v_resultado;
END;
$$;

GRANT EXECUTE ON FUNCTION public.portal_get_ficha_detalle_v2(UUID, UUID) TO anon, authenticated;

