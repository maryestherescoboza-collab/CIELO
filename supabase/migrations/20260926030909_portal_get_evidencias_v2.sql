-- Obtener evidencias seguras (Actualizado para mostrar detalles pedagógicos completos)
CREATE OR REPLACE FUNCTION public.portal_get_evidencias(p_session_token UUID, p_periodo TEXT, p_asignatura TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_sesion RECORD;
    v_acceso RECORD;
    v_curso RECORD;
    v_published_until TIMESTAMPTZ;
    v_portal_activo BOOLEAN;
    v_mostrar_evidencias BOOLEAN;
    v_mostrar_puntajes BOOLEAN;
    v_resultado JSONB;
BEGIN
    SELECT * INTO v_sesion FROM public.portal_sesiones WHERE session_token = p_session_token AND expires_at > NOW();
    IF NOT FOUND THEN RETURN jsonb_build_object('error', 'Sesión inválida'); END IF;
    SELECT * INTO v_acceso FROM public.portal_accesos WHERE id = v_sesion.acceso_id AND active = true;
    SELECT c.* INTO v_curso FROM public.estudiantes e JOIN public.cursos c ON c.id = e.curso_id WHERE e.id = v_acceso.estudiante_id;

    -- Obtener configuracion
    SELECT pp.published_until, COALESCE(pc.portal_activo, true), COALESCE(pc.mostrar_evidencias, true), COALESCE(pc.mostrar_puntajes, true)
    INTO v_published_until, v_portal_activo, v_mostrar_evidencias, v_mostrar_puntajes
    FROM public.portal_publicaciones pp
    LEFT JOIN public.portal_configuraciones pc ON pc.user_id = pp.published_by
    WHERE pp.asignatura = p_asignatura AND pp.periodo = p_periodo 
      AND (pp.curso_id = v_curso.id OR pp.curso_id IN (SELECT id FROM public.cursos WHERE shared_course_id = v_curso.shared_course_id))
    LIMIT 1;

    -- Si no existe configuracion, asumimos defaults activos
    IF NOT FOUND THEN
        v_published_until := NULL;
        v_portal_activo := true;
        v_mostrar_evidencias := true;
        v_mostrar_puntajes := true;
    END IF;

    IF v_portal_activo = false OR v_mostrar_evidencias = false THEN RETURN '[]'::jsonb; END IF;

    SELECT jsonb_agg(
        jsonb_build_object(
            'id', a.id, 
            'nombre', a.nombre, 
            'fecha', a.fecha, 
            'indicador', a.indicador, 
            'bcAsignados', a.bc_asignados,
            'puntaje', CASE WHEN v_mostrar_puntajes THEN c.puntaje ELSE NULL END,
            'descriptores', CASE WHEN v_mostrar_puntajes THEN c.descriptores ELSE NULL END,
            'eval_detalle', CASE WHEN v_mostrar_puntajes THEN 
                (SELECT jsonb_build_object(
                    'rubricaData', cd.rubrica_data, 
                    'cotejoData', cd.cotejo_data, 
                    'plantillaId', cd.plantilla_id
                )
                 FROM public.curso_detalle cd 
                 WHERE cd.actividad_id = a.id AND cd.estudiante_id = v_acceso.estudiante_id
                 LIMIT 1)
            ELSE NULL END
        )
    ) INTO v_resultado
    FROM public.actividades a
    JOIN public.cursos c_act ON c_act.id = a.curso_id
    LEFT JOIN public.calificaciones c ON c.actividad_id = a.id AND c.estudiante_id = v_acceso.estudiante_id
    WHERE a.periodo = p_periodo 
      AND COALESCE(NULLIF(a.asignatura, ''), c_act.asignatura) = p_asignatura
      AND (a.curso_id = v_curso.id OR (a.shared_course_id = v_curso.shared_course_id AND v_curso.shared_course_id IS NOT NULL))
      AND (v_published_until IS NULL OR a.created_at <= v_published_until);

    RETURN COALESCE(v_resultado, '[]'::jsonb);
END;
$$;
