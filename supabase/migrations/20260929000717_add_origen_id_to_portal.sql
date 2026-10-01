CREATE OR REPLACE FUNCTION public.portal_ruta_obtener(
    p_session_token UUID,
    p_ruta_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_estudiante_id BIGINT;
    v_nota_id UUID;
    v_regla JSONB;
    v_porcentaje NUMERIC := 100;
    v_puntajes JSONB;
    v_resultado JSONB;
BEGIN
    v_estudiante_id := public.ruta_resolver_sesion(p_session_token);

    SELECT r.nota_id, COALESCE(r.regla_desbloqueo, '{"modo":"secuencial"}'::JSONB)
      INTO v_nota_id, v_regla
    FROM public.ruta_aprendizaje r
    WHERE r.id = p_ruta_id
      AND r.estado = 'publicada';

    IF v_nota_id IS NULL THEN
        RETURN jsonb_build_object('error', 'Ruta no encontrada o no publicada');
    END IF;

    IF NOT public.ruta_ficha_compartida_con_estudiante(v_nota_id, v_estudiante_id) THEN
        RETURN jsonb_build_object('error', 'Esta ruta no está disponible para tu curso');
    END IF;

    IF v_regla->>'modo' = 'porcentaje' THEN
        v_porcentaje := COALESCE((v_regla->>'porcentaje')::NUMERIC, 100);
    END IF;

    v_puntajes := public.ruta_puntajes_ruta(p_ruta_id, v_estudiante_id);

    SELECT jsonb_build_object(
        'id', r.id,
        'titulo', r.titulo,
        'descripcion', r.descripcion,
        'regla_desbloqueo', v_regla,
        'porcentaje_requerido', v_porcentaje,
        'puntaje', v_puntajes->'puntaje',
        'etapas', (
            SELECT COALESCE(jsonb_agg(
                jsonb_build_object(
                    'id', e.id,
                    'titulo', e.titulo,
                    'descripcion', e.descripcion,
                    'orden', e.orden,
                    'peso', e.peso,
                    'puntaje', v_pe.puntaje_etapa,
                    'completada', public.ruta_etapa_completada(e.id, v_estudiante_id),
                    'desbloqueada', public.ruta_etapa_desbloqueada(
                        r.id, e.id, v_estudiante_id, v_regla
                    ),
                    'actividades', (
                        SELECT COALESCE(jsonb_agg(
                            jsonb_build_object(
                                'id', a.id,
                                'tipo', a.tipo,
                                'tipo_etiqueta', public.ruta_tipo_actividad_etiqueta(a.tipo),
                                'titulo', a.titulo,
                                'instrucciones', a.instrucciones,
                                'config', a.config,
                                'obligatorio', a.obligatorio,
                                'peso', a.peso,
                                'actividad_origen_id', a.actividad_origen_id,
                                'puntaje', public.ruta_actividad_puntaje(a.id, v_estudiante_id),
                                'completada', EXISTS (
                                    SELECT 1 FROM public.ruta_progreso p2
                                    WHERE p2.actividad_id = a.id
                                      AND p2.estudiante_id = v_estudiante_id
                                      AND p2.estado = 'completada'
                                ),
                                'preguntas', (
                                    SELECT COALESCE(jsonb_agg(
                                        jsonb_build_object(
                                            'id', pr.id,
                                            'orden', pr.orden,
                                            'enunciado', pr.enunciado,
                                            'tipo_respuesta', pr.tipo_respuesta,
                                            'pista', pr.pista,
                                            'peso', pr.peso,
                                            'pasos', public.ruta_pasos_publicos(pr.config),
                                            'opciones', (
                                                SELECT COALESCE(jsonb_agg(
                                                    jsonb_build_object(
                                                        'id', o.id,
                                                        'texto', o.texto,
                                                        'clave', o.clave
                                                    ) ORDER BY o.orden
                                                ), '[]'::jsonb)
                                                FROM public.ruta_opcion o
                                                WHERE o.pregunta_id = pr.id
                                            )
                                        ) ORDER BY pr.orden
                                    ), '[]'::jsonb)
                                    FROM public.ruta_pregunta pr
                                    WHERE pr.actividad_id = a.id
                                      AND pr.activo = TRUE
                                )
                            ) ORDER BY a.orden
                        ), '[]'::jsonb)
                        FROM public.ruta_actividad a
                        WHERE a.etapa_id = e.id
                    )
                ) ORDER BY e.orden
            ), '[]'::jsonb)
            FROM public.ruta_etapa e
            CROSS JOIN LATERAL (
                SELECT COALESCE(
                    (SELECT pa->>'puntaje'
                     FROM jsonb_array_elements(COALESCE(v_puntajes->'etapas', '[]'::JSONB)) pa
                     WHERE pa->>'id' = e.id::TEXT),
                    '0'
                ) AS puntaje_etapa
            ) v_pe
            WHERE e.ruta_id = r.id
        ),
        'progreso', jsonb_build_object(
            'total', (SELECT COUNT(*) FROM public.ruta_actividad a
                      WHERE a.ruta_id = r.id),
            'completadas', (
                SELECT COUNT(*) FROM public.ruta_progreso p
                WHERE p.ruta_id = r.id
                  AND p.estudiante_id = v_estudiante_id
                  AND p.estado = 'completada'
            )
        )
    ) INTO v_resultado
    FROM public.ruta_aprendizaje r
    WHERE r.id = p_ruta_id;

    RETURN COALESCE(v_resultado, jsonb_build_object('error', 'Ruta no encontrada'));
EXCEPTION
    WHEN OTHERS THEN
        IF SQLERRM = 'Sesión inválida' THEN
            RETURN jsonb_build_object('error', 'Sesión inválida');
        END IF;
        RETURN jsonb_build_object('error', SQLERRM);
END;
$$;
