-- ==============================================================================
-- Migración: Control de visibilidad del Portal del estudiante en Ajustes
-- 1. Agrega columnas de visibilidad de secciones e información de Inicio a portal_configuraciones
-- 2. Crea funciones RPC SECURITY DEFINER para que el docente consulte y guarde su configuración
-- 3. Modifica portal_get_context para incluir portal_config
-- 4. Modifica RPCs de datos de estudiantes para respetar la visibilidad configurada
-- ==============================================================================

-- 1. Modificar tabla portal_configuraciones
ALTER TABLE public.portal_configuraciones
  ADD COLUMN IF NOT EXISTS seccion_inicio BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS seccion_portafolio BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS seccion_recuperacion BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS seccion_incidencias BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS seccion_fichas BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS inicio_mostrar_evidencias BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS inicio_mostrar_incidencias BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS periodos_visibles TEXT[] NOT NULL DEFAULT ARRAY['P1', 'P2', 'P3', 'P4'];

-- 2. RPC Docente: Obtener configuración del portal
CREATE OR REPLACE FUNCTION public.portal_docente_get_config()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_uid UUID;
    v_config RECORD;
BEGIN
    v_uid := auth.uid();
    IF v_uid IS NULL THEN
        RETURN jsonb_build_object('error', 'No autenticado');
    END IF;

    SELECT * INTO v_config
    FROM public.portal_configuraciones
    WHERE user_id = v_uid;

    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'seccion_inicio', true,
            'seccion_portafolio', true,
            'seccion_recuperacion', true,
            'seccion_incidencias', true,
            'seccion_fichas', true,
            'inicio_mostrar_evidencias', true,
            'inicio_mostrar_incidencias', true,
            'periodos_visibles', jsonb_build_array('P1', 'P2', 'P3', 'P4')
        );
    END IF;

    RETURN jsonb_build_object(
        'seccion_inicio', COALESCE(v_config.seccion_inicio, true),
        'seccion_portafolio', COALESCE(v_config.seccion_portafolio, true),
        'seccion_recuperacion', COALESCE(v_config.seccion_recuperacion, true),
        'seccion_incidencias', COALESCE(v_config.seccion_incidencias, true),
        'seccion_fichas', COALESCE(v_config.seccion_fichas, true),
        'inicio_mostrar_evidencias', COALESCE(v_config.inicio_mostrar_evidencias, true),
        'inicio_mostrar_incidencias', COALESCE(v_config.inicio_mostrar_incidencias, true),
        'periodos_visibles', COALESCE(to_jsonb(v_config.periodos_visibles), jsonb_build_array('P1', 'P2', 'P3', 'P4'))
    );
END;
$$;

-- 3. RPC Docente: Guardar configuración del portal
CREATE OR REPLACE FUNCTION public.portal_docente_save_config(p_config JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_uid UUID;
    v_periodos TEXT[];
BEGIN
    v_uid := auth.uid();
    IF v_uid IS NULL THEN
        RETURN jsonb_build_object('error', 'No autenticado');
    END IF;

    IF jsonb_typeof(p_config->'periodos_visibles') = 'array' THEN
        SELECT ARRAY(SELECT jsonb_array_elements_text(p_config->'periodos_visibles')) INTO v_periodos;
    ELSE
        v_periodos := ARRAY['P1', 'P2', 'P3', 'P4'];
    END IF;

    INSERT INTO public.portal_configuraciones (
        user_id,
        portal_activo,
        seccion_inicio,
        seccion_portafolio,
        seccion_recuperacion,
        seccion_incidencias,
        seccion_fichas,
        inicio_mostrar_evidencias,
        inicio_mostrar_incidencias,
        periodos_visibles,
        updated_at
    )
    VALUES (
        v_uid,
        true,
        COALESCE((p_config->>'seccion_inicio')::boolean, true),
        COALESCE((p_config->>'seccion_portafolio')::boolean, true),
        COALESCE((p_config->>'seccion_recuperacion')::boolean, true),
        COALESCE((p_config->>'seccion_incidencias')::boolean, true),
        COALESCE((p_config->>'seccion_fichas')::boolean, true),
        COALESCE((p_config->>'inicio_mostrar_evidencias')::boolean, true),
        COALESCE((p_config->>'inicio_mostrar_incidencias')::boolean, true),
        v_periodos,
        NOW()
    )
    ON CONFLICT (user_id) DO UPDATE SET
        seccion_inicio = EXCLUDED.seccion_inicio,
        seccion_portafolio = EXCLUDED.seccion_portafolio,
        seccion_recuperacion = EXCLUDED.seccion_recuperacion,
        seccion_incidencias = EXCLUDED.seccion_incidencias,
        seccion_fichas = EXCLUDED.seccion_fichas,
        inicio_mostrar_evidencias = EXCLUDED.inicio_mostrar_evidencias,
        inicio_mostrar_incidencias = EXCLUDED.inicio_mostrar_incidencias,
        periodos_visibles = EXCLUDED.periodos_visibles,
        updated_at = NOW();

    RETURN jsonb_build_object('success', true);
END;
$$;

-- 4. Actualizar portal_get_context para incluir portal_config
CREATE OR REPLACE FUNCTION public.portal_get_context(p_session_token UUID)
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
    v_centro RECORD;
    v_portal_config JSONB;
BEGIN
    SELECT * INTO v_sesion FROM public.portal_sesiones WHERE session_token = p_session_token AND expires_at > NOW();
    IF NOT FOUND THEN RETURN jsonb_build_object('valid', false); END IF;
    UPDATE public.portal_sesiones SET last_active_at = NOW() WHERE session_token = p_session_token;
    
    SELECT * INTO v_acceso FROM public.portal_accesos WHERE id = v_sesion.acceso_id AND active = true;
    IF NOT FOUND THEN RETURN jsonb_build_object('valid', false); END IF;
    
    SELECT * INTO v_estudiante FROM public.estudiantes WHERE id = v_acceso.estudiante_id;
    SELECT * INTO v_curso FROM public.cursos WHERE id = v_estudiante.curso_id;
    SELECT * INTO v_centro FROM public.centros WHERE id = v_acceso.centro_id;

    SELECT jsonb_build_object(
        'seccion_inicio', COALESCE(pc.seccion_inicio, true),
        'seccion_portafolio', COALESCE(pc.seccion_portafolio, true),
        'seccion_recuperacion', COALESCE(pc.seccion_recuperacion, true),
        'seccion_incidencias', COALESCE(pc.seccion_incidencias, true),
        'seccion_fichas', COALESCE(pc.seccion_fichas, true),
        'inicio_mostrar_evidencias', COALESCE(pc.inicio_mostrar_evidencias, true),
        'inicio_mostrar_incidencias', COALESCE(pc.inicio_mostrar_incidencias, true),
        'periodos_visibles', COALESCE(to_jsonb(pc.periodos_visibles), jsonb_build_array('P1', 'P2', 'P3', 'P4'))
    ) INTO v_portal_config
    FROM public.portal_configuraciones pc
    WHERE pc.user_id = v_curso.user_id;

    IF v_portal_config IS NULL THEN
        v_portal_config := jsonb_build_object(
            'seccion_inicio', true,
            'seccion_portafolio', true,
            'seccion_recuperacion', true,
            'seccion_incidencias', true,
            'seccion_fichas', true,
            'inicio_mostrar_evidencias', true,
            'inicio_mostrar_incidencias', true,
            'periodos_visibles', jsonb_build_array('P1', 'P2', 'P3', 'P4')
        );
    END IF;

    RETURN jsonb_build_object(
        'valid', true,
        'estudiante_id', v_estudiante.id,
        'curso_id', v_curso.id,
        'centro_id', v_centro.id,
        'estudiante_nombre', v_estudiante.nombre,
        'estudiante_apellido', v_estudiante.apellido,
        'curso_grado', v_curso.grado,
        'curso_seccion', v_curso.seccion,
        'centro_nombre', v_centro.nombre,
        'portal_config', v_portal_config
    );
END;
$$;

-- 5. Actualizar portal_get_evidencias para aplicar filtro de inicio_mostrar_evidencias y periodos_visibles
CREATE OR REPLACE FUNCTION public.portal_get_evidencias(
    p_session_token UUID,
    p_periodo       TEXT,
    p_asignatura    TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_sesion RECORD;
    v_acceso RECORD;
    v_curso RECORD;
    v_config RECORD;
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

    -- Validar configuración del docente
    SELECT * INTO v_config FROM public.portal_configuraciones WHERE user_id = v_curso.user_id;
    IF v_config IS NOT NULL THEN
        IF v_config.seccion_inicio = false OR v_config.inicio_mostrar_evidencias = false THEN
            RETURN '[]'::jsonb;
        END IF;
        IF v_config.periodos_visibles IS NOT NULL AND NOT (p_periodo = ANY(v_config.periodos_visibles)) THEN
            RETURN '[]'::jsonb;
        END IF;
    END IF;

    SELECT pp.published_until, COALESCE(pc.portal_activo, true), COALESCE(pc.mostrar_evidencias, true), COALESCE(pc.mostrar_puntajes, true)
    INTO v_published_until, v_portal_activo, v_mostrar_evidencias, v_mostrar_puntajes
    FROM public.portal_publicaciones pp
    LEFT JOIN public.portal_configuraciones pc ON pc.user_id = pp.published_by
    WHERE public.portal_asignaturas_coinciden(pp.asignatura, p_asignatura) AND pp.periodo = p_periodo 
      AND (pp.curso_id = v_curso.id OR pp.curso_id IN (SELECT id FROM public.cursos WHERE shared_course_id = v_curso.shared_course_id))
    LIMIT 1;

    IF NOT FOUND THEN
        v_published_until := NULL;
        v_portal_activo := true;
        v_mostrar_evidencias := true;
        v_mostrar_puntajes := true;
    END IF;

    IF v_portal_activo = false OR v_mostrar_evidencias = false THEN RETURN '[]'::jsonb; END IF;

    SELECT jsonb_agg(
        jsonb_build_object(
            'id', a.id, 'nombre', a.nombre, 'fecha', a.fecha, 'indicador', a.indicador, 'bcAsignados', a.bc_asignados,
            'puntaje', CASE WHEN v_mostrar_puntajes THEN c.puntaje ELSE NULL END,
            'descriptores', CASE WHEN v_mostrar_puntajes THEN c.descriptores ELSE NULL END
        ) ORDER BY a.fecha ASC NULLS LAST, a.id ASC
    ) INTO v_resultado
    FROM public.actividades a
    JOIN public.cursos c_act ON c_act.id = a.curso_id
    LEFT JOIN public.calificaciones c ON c.actividad_id = a.id AND c.estudiante_id = v_acceso.estudiante_id
    WHERE a.periodo = p_periodo 
      AND public.portal_asignaturas_coinciden(COALESCE(NULLIF(a.asignatura, ''), c_act.asignatura), p_asignatura)
      AND (a.curso_id = v_curso.id OR a.shared_course_id = v_curso.shared_course_id)
      AND (v_published_until IS NULL OR a.created_at <= v_published_until);

    RETURN COALESCE(v_resultado, '[]'::jsonb);
END;
$$;

-- 6. Actualizar portal_get_incidencias (Inicio) para aplicar filtro de inicio_mostrar_incidencias
CREATE OR REPLACE FUNCTION public.portal_get_incidencias(
    p_session_token UUID,
    p_periodo       TEXT,
    p_asignatura    TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_sesion RECORD;
    v_acceso RECORD;
    v_curso RECORD;
    v_config RECORD;
    v_published_until TIMESTAMPTZ;
    v_portal_activo BOOLEAN;
    v_mostrar_incidencias BOOLEAN;
    v_resultado JSONB;
BEGIN
    SELECT * INTO v_sesion FROM public.portal_sesiones WHERE session_token = p_session_token AND expires_at > NOW();
    IF NOT FOUND THEN RETURN jsonb_build_object('error', 'Sesión inválida'); END IF;
    SELECT * INTO v_acceso FROM public.portal_accesos WHERE id = v_sesion.acceso_id AND active = true;
    SELECT c.* INTO v_curso FROM public.estudiantes e JOIN public.cursos c ON c.id = e.curso_id WHERE e.id = v_acceso.estudiante_id;

    -- Validar configuración del docente
    SELECT * INTO v_config FROM public.portal_configuraciones WHERE user_id = v_curso.user_id;
    IF v_config IS NOT NULL THEN
        IF v_config.seccion_inicio = false OR v_config.inicio_mostrar_incidencias = false THEN
            RETURN '[]'::jsonb;
        END IF;
    END IF;
    
    SELECT pp.published_until, COALESCE(pc.portal_activo, true), COALESCE(pc.mostrar_incidencias, true)
    INTO v_published_until, v_portal_activo, v_mostrar_incidencias
    FROM public.portal_publicaciones pp
    LEFT JOIN public.portal_configuraciones pc ON pc.user_id = pp.published_by
    WHERE public.portal_asignaturas_coinciden(pp.asignatura, p_asignatura) AND pp.periodo = p_periodo 
      AND (pp.curso_id = v_curso.id OR pp.curso_id IN (SELECT id FROM public.cursos WHERE shared_course_id = v_curso.shared_course_id))
    LIMIT 1;

    IF NOT FOUND THEN
        v_published_until := NULL;
        v_portal_activo := true;
        v_mostrar_incidencias := true;
    END IF;

    IF v_portal_activo = false OR v_mostrar_incidencias = false THEN RETURN '[]'::jsonb; END IF;

    SELECT jsonb_agg(jsonb_build_object('id', i.id, 'fecha', i.fecha, 'categoria', i.categoria, 'descripcion', i.descripcion))
    INTO v_resultado
    FROM public.incidencias i
    WHERE i.estudiante_id = v_acceso.estudiante_id 
      AND (i.activo IS NULL OR i.activo = true)
      AND (v_published_until IS NULL OR i.created_at <= v_published_until);

    RETURN COALESCE(v_resultado, '[]'::jsonb);
END;
$$;

-- 7. Actualizar portal_get_estudiante_incidencias (Sección Incidencias)
CREATE OR REPLACE FUNCTION public.portal_get_estudiante_incidencias(p_session_token UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_sesion RECORD;
    v_acceso RECORD;
    v_curso RECORD;
    v_config RECORD;
    v_resultado JSONB;
BEGIN
    SELECT * INTO v_sesion 
    FROM public.portal_sesiones 
    WHERE session_token = p_session_token AND expires_at > NOW();
    
    IF NOT FOUND THEN 
        RETURN jsonb_build_object('error', 'Sesión inválida'); 
    END IF;

    SELECT * INTO v_acceso 
    FROM public.portal_accesos 
    WHERE id = v_sesion.acceso_id AND active = true;
    
    IF NOT FOUND THEN 
        RETURN jsonb_build_object('error', 'Acceso inactivo'); 
    END IF;

    UPDATE public.portal_sesiones 
    SET last_active_at = NOW() 
    WHERE session_token = p_session_token;

    -- Validar configuración de la sección de incidencias
    SELECT c.* INTO v_curso FROM public.estudiantes e JOIN public.cursos c ON c.id = e.curso_id WHERE e.id = v_acceso.estudiante_id;
    SELECT * INTO v_config FROM public.portal_configuraciones WHERE user_id = v_curso.user_id;
    IF v_config IS NOT NULL AND v_config.seccion_incidencias = false THEN
        RETURN '[]'::jsonb;
    END IF;

    SELECT jsonb_agg(
        jsonb_build_object(
            'id', i.id,
            'fecha', i.fecha,
            'categoria', i.categoria,
            'descripcion', i.descripcion,
            'acciones_tomadas', i.acciones_tomadas,
            'acuerdos', i.acuerdos,
            'gravedad', i.gravedad,
            'created_at', i.created_at
        ) ORDER BY i.fecha DESC NULLS LAST, i.id DESC
    )
    INTO v_resultado
    FROM public.incidencias i
    WHERE i.estudiante_id = v_acceso.estudiante_id
      AND (i.activo IS NULL OR i.activo = true);

    RETURN COALESCE(v_resultado, '[]'::jsonb);
END;
$$;

-- 8. Actualizar portal_get_recuperaciones (Sección Recuperación)
CREATE OR REPLACE FUNCTION public.portal_get_recuperaciones(
    p_session_token UUID,
    p_periodo       TEXT,
    p_asignatura    TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_sesion RECORD;
    v_acceso RECORD;
    v_curso RECORD;
    v_config RECORD;
    v_published_until TIMESTAMPTZ;
    v_portal_activo BOOLEAN;
    v_mostrar_recuperacion BOOLEAN;
    v_mostrar_puntajes BOOLEAN;
    v_resultado JSONB;
BEGIN
    SELECT * INTO v_sesion FROM public.portal_sesiones WHERE session_token = p_session_token AND expires_at > NOW();
    IF NOT FOUND THEN RETURN jsonb_build_object('error', 'Sesión inválida'); END IF;
    SELECT * INTO v_acceso FROM public.portal_accesos WHERE id = v_sesion.acceso_id AND active = true;
    SELECT c.* INTO v_curso FROM public.estudiantes e JOIN public.cursos c ON c.id = e.curso_id WHERE e.id = v_acceso.estudiante_id;

    -- Validar configuración de la sección de recuperaciones
    SELECT * INTO v_config FROM public.portal_configuraciones WHERE user_id = v_curso.user_id;
    IF v_config IS NOT NULL AND v_config.seccion_recuperacion = false THEN
        RETURN '[]'::jsonb;
    END IF;

    SELECT pp.published_until, COALESCE(pc.portal_activo, true), COALESCE(pc.mostrar_recuperacion, true), COALESCE(pc.mostrar_puntajes, true)
    INTO v_published_until, v_portal_activo, v_mostrar_recuperacion, v_mostrar_puntajes
    FROM public.portal_publicaciones pp
    LEFT JOIN public.portal_configuraciones pc ON pc.user_id = pp.published_by
    WHERE public.portal_asignaturas_coinciden(pp.asignatura, p_asignatura) AND pp.periodo = p_periodo 
      AND (pp.curso_id = v_curso.id OR pp.curso_id IN (SELECT id FROM public.cursos WHERE shared_course_id = v_curso.shared_course_id))
    LIMIT 1;

    IF NOT FOUND THEN
        v_published_until := NULL;
        v_portal_activo := true;
        v_mostrar_recuperacion := true;
        v_mostrar_puntajes := true;
    END IF;

    IF v_portal_activo = false OR v_mostrar_recuperacion = false THEN RETURN '[]'::jsonb; END IF;

    SELECT jsonb_agg(
        jsonb_build_object(
            'id', r.id,
            'bc', r.bc,
            'puntaje', CASE WHEN v_mostrar_puntajes THEN r.puntaje ELSE NULL END,
            'fecha', TO_CHAR(r.created_at, 'DD/MM/YYYY'),
            'cotejo', COALESCE(
                (
                    SELECT jsonb_agg(
                        jsonb_build_object(
                            'id', rc.id,
                            'indicador', rc.indicador,
                            'actividad_id', rc.actividad_id
                        )
                    )
                    FROM public.recuperaciones_cotejo rc
                    WHERE rc.recuperacion_id = r.id
                       OR (rc.estudiante_id = r.estudiante_id AND rc.bc = r.bc AND rc.periodo = r.periodo AND public.portal_asignaturas_coinciden(rc.asignatura, p_asignatura))
                ),
                '[]'::jsonb
            )
        )
    ) INTO v_resultado
    FROM public.recuperaciones r
    JOIN public.cursos c_act ON c_act.id = r.curso_id
    WHERE r.estudiante_id = v_acceso.estudiante_id 
      AND r.periodo = p_periodo 
      AND public.portal_asignaturas_coinciden(COALESCE(NULLIF(r.asignatura, ''), c_act.asignatura), p_asignatura)
      AND (r.curso_id = v_curso.id OR r.shared_course_id = v_curso.shared_course_id)
      AND (v_published_until IS NULL OR r.created_at <= v_published_until);

    RETURN COALESCE(v_resultado, '[]'::jsonb);
END;
$$;

-- 9. Actualizar portal_listar_evidencias (Sección Portafolio)
CREATE OR REPLACE FUNCTION public.portal_listar_evidencias(
    p_session_token UUID,
    p_asignatura    TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_est public.estudiantes;
    v_curso public.cursos;
    v_config RECORD;
BEGIN
    v_est := public.evidencia_estudiante_del_portal(p_session_token);
    IF v_est IS NULL THEN
        RETURN jsonb_build_object('error', 'Sesión inválida');
    END IF;

    SELECT * INTO v_curso FROM public.cursos WHERE id = v_est.curso_id;
    SELECT * INTO v_config FROM public.portal_configuraciones WHERE user_id = v_curso.user_id;
    IF v_config IS NOT NULL AND v_config.seccion_portafolio = false THEN
        RETURN '[]'::jsonb;
    END IF;

    RETURN COALESCE((
        SELECT jsonb_agg(
            jsonb_build_object(
                'id',            e.id,
                'nombre',        e.nombre,
                'descripcion',   e.descripcion,
                'estado',        e.estado,
                'sello',         e.sello,
                'created_at',    e.created_at,
                'updated_at',    e.updated_at,
                'origen',        e.origen,
                'storage_path',  e.storage_path,
                'drive_url',     e.drive_url,
                'thumbnail_url', e.thumbnail_url,
                'mime_type',     e.mime_type,
                'tamano_bytes',  e.tamano_bytes,
                'comentario',    e.comentario,
                'revisado_at',   e.revisado_at,
                'actividad_id',  e.actividad_id,
                'actividad',     COALESCE(a.nombre, 'Actividad'),
                'actividad_fecha', a.fecha,
                'periodo',       a.periodo,
                'asignatura',    COALESCE(NULLIF(e.asignatura, ''), NULLIF(a.asignatura, ''), c.asignatura),
                'ficha_id',      e.ficha_id,
                'ficha',         f.titulo
            )
            ORDER BY e.created_at DESC
        )
        FROM public.evidencias e
        JOIN public.actividades a ON a.id = e.actividad_id
        JOIN public.cursos c ON c.id = a.curso_id
        LEFT JOIN public.pc_notas f ON f.id = e.ficha_id
        WHERE e.estudiante_id = v_est.id
          AND (
            p_asignatura IS NULL
            OR (
                COALESCE(NULLIF(e.asignatura, ''), NULLIF(a.asignatura, ''), c.asignatura) IS NOT NULL
                AND public.portal_asignaturas_coinciden(COALESCE(NULLIF(e.asignatura, ''), NULLIF(a.asignatura, ''), c.asignatura), p_asignatura)
            )
          )
    ), '[]'::JSONB);
END;
$$;

-- 10. Actualizar portal_get_fichas_compartidas (Sección Fichas)
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
            'asignatura', c.asignatura
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

-- 11. Permisos de ejecución
GRANT EXECUTE ON FUNCTION public.portal_docente_get_config() TO authenticated;
GRANT EXECUTE ON FUNCTION public.portal_docente_save_config(JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.portal_get_context(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.portal_get_evidencias(UUID, TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.portal_get_incidencias(UUID, TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.portal_get_estudiante_incidencias(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.portal_get_recuperaciones(UUID, TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.portal_listar_evidencias(UUID, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.portal_get_fichas_compartidas(UUID, TEXT) TO anon, authenticated;

