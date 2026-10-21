-- Migración: Portal Familia - 7 Asignaturas Curriculares y Estado de Docente
-- Asegura que portal_get_asignaturas retorne las 7 asignaturas oficiales del currículo
-- con el estado de si tienen o no un docente asignado en el curso del estudiante.

CREATE OR REPLACE FUNCTION public.portal_get_asignaturas(p_session_token UUID, p_periodo TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_sesion RECORD;
    v_acceso RECORD;
    v_curso RECORD;
    v_estudiante RECORD;
    v_resultado JSONB;
BEGIN
    SELECT * INTO v_sesion FROM public.portal_sesiones WHERE session_token = p_session_token AND expires_at > NOW();
    IF NOT FOUND THEN RETURN jsonb_build_object('error', 'Sesión inválida'); END IF;

    SELECT * INTO v_acceso FROM public.portal_accesos WHERE id = v_sesion.acceso_id AND active = true;
    IF NOT FOUND THEN RETURN jsonb_build_object('error', 'Acceso inactivo'); END IF;

    SELECT e.* INTO v_estudiante FROM public.estudiantes e WHERE e.id = v_acceso.estudiante_id;
    SELECT c.* INTO v_curso FROM public.cursos c WHERE c.id = v_estudiante.curso_id;

    -- Catálogo oficial de las 7 asignaturas curriculares de CIELO
    WITH catalogo_7 AS (
        SELECT unnest(ARRAY[
            'Lengua Española',
            'Matemática',
            'Ciencias Sociales',
            'Ciencias de la Naturaleza',
            'Lenguas Extranjeras (Inglés)',
            'Educación Física',
            'Educación Artística'
        ]) AS asignatura
    ),
    -- Docentes asignados a este curso (tutor del curso, cursos compartidos del mismo grupo físico, o curso_docentes)
    docentes_asignados AS (
        -- 1. Asignatura del curso principal si tiene docente creador
        SELECT 
            COALESCE(NULLIF(c.asignatura, ''), 'Lengua Española') AS asignatura,
            c.user_id AS docente_id
        FROM public.cursos c
        WHERE c.id = v_curso.id AND c.user_id IS NOT NULL

        UNION

        -- 2. Asignaturas de cursos que comparten el mismo shared_course_id
        SELECT 
            c.asignatura,
            c.user_id AS docente_id
        FROM public.cursos c
        WHERE v_curso.shared_course_id IS NOT NULL 
          AND c.shared_course_id = v_curso.shared_course_id 
          AND c.user_id IS NOT NULL

        UNION

        -- 3. Asignaturas vinculadas en curso_docentes
        SELECT 
            cd.asignatura,
            cd.docente_id
        FROM public.curso_docentes cd
        WHERE (cd.curso_id = v_curso.id OR (v_curso.shared_course_id IS NOT NULL AND cd.curso_id IN (
            SELECT id FROM public.cursos WHERE shared_course_id = v_curso.shared_course_id
        )))
        AND cd.activo IS NOT FALSE
    ),
    -- Actividades registradas por asignatura en el período
    actividades_periodo AS (
        SELECT 
            COALESCE(NULLIF(a.asignatura, ''), c_act.asignatura) AS asignatura,
            COUNT(*) AS total_actividades
        FROM public.actividades a
        JOIN public.cursos c_act ON c_act.id = a.curso_id
        WHERE a.periodo = p_periodo
          AND (a.curso_id = v_curso.id OR a.shared_course_id = v_curso.shared_course_id)
        GROUP BY COALESCE(NULLIF(a.asignatura, ''), c_act.asignatura)
    ),
    -- Publicaciones y configuraciones del portal
    publicaciones_portal AS (
        SELECT 
            pp.asignatura,
            pp.published_until,
            COALESCE(pc.portal_activo, true) AS portal_activo,
            COALESCE(pc.mostrar_puntajes, true) AS mostrar_puntajes,
            COALESCE(pc.mostrar_evidencias, true) AS mostrar_evidencias,
            COALESCE(pc.mostrar_recursos, true) AS mostrar_recursos,
            COALESCE(pc.mostrar_incidencias, false) AS mostrar_incidencias,
            COALESCE(pc.mostrar_recuperacion, true) AS mostrar_recuperacion
        FROM public.portal_publicaciones pp
        LEFT JOIN public.portal_configuraciones pc ON pc.user_id = pp.published_by
        WHERE pp.periodo = p_periodo
          AND (pp.curso_id = v_curso.id OR pp.curso_id IN (
              SELECT id FROM public.cursos WHERE shared_course_id = v_curso.shared_course_id
          ))
    )
    SELECT jsonb_agg(
        jsonb_build_object(
            'asignatura', c7.asignatura,
            'tiene_docente', (
                EXISTS (
                    SELECT 1 FROM docentes_asignados da 
                    WHERE da.asignatura ILIKE c7.asignatura 
                       OR (c7.asignatura = 'Lenguas Extranjeras (Inglés)' AND (da.asignatura ILIKE '%ingl%' OR da.asignatura ILIKE '%english%'))
                       OR (c7.asignatura = 'Ciencias Sociales' AND (da.asignatura ILIKE '%social%' OR da.asignatura ILIKE '%historia%'))
                       OR (c7.asignatura = 'Ciencias de la Naturaleza' AND (da.asignatura ILIKE '%naturalez%' OR da.asignatura ILIKE '%biolog%' OR da.asignatura ILIKE '%quimic%'))
                       OR (c7.asignatura = 'Educación Física' AND (da.asignatura ILIKE '%físic%' OR da.asignatura ILIKE '%fisica%'))
                       OR (c7.asignatura = 'Educación Artística' AND (da.asignatura ILIKE '%artístic%' OR da.asignatura ILIKE '%artistica%'))
                       OR (c7.asignatura = 'Matemática' AND (da.asignatura ILIKE '%matemátic%' OR da.asignatura ILIKE '%matematica%'))
                       OR (c7.asignatura = 'Lengua Española' AND (da.asignatura ILIKE '%lengua%' OR da.asignatura ILIKE '%espanol%'))
                )
            ),
            'total_actividades', COALESCE((
                SELECT ap.total_actividades FROM actividades_periodo ap
                WHERE ap.asignatura ILIKE c7.asignatura
                   OR (c7.asignatura = 'Lenguas Extranjeras (Inglés)' AND (ap.asignatura ILIKE '%ingl%' OR ap.asignatura ILIKE '%english%'))
                   OR (c7.asignatura = 'Ciencias Sociales' AND (ap.asignatura ILIKE '%social%' OR ap.asignatura ILIKE '%historia%'))
                   OR (c7.asignatura = 'Ciencias de la Naturaleza' AND (ap.asignatura ILIKE '%naturalez%' OR ap.asignatura ILIKE '%biolog%'))
                   OR (c7.asignatura = 'Educación Física' AND (ap.asignatura ILIKE '%físic%' OR ap.asignatura ILIKE '%fisica%'))
                   OR (c7.asignatura = 'Educación Artística' AND (ap.asignatura ILIKE '%artístic%' OR ap.asignatura ILIKE '%artistica%'))
                   OR (c7.asignatura = 'Matemática' AND (ap.asignatura ILIKE '%matemátic%' OR ap.asignatura ILIKE '%matematica%'))
                   OR (c7.asignatura = 'Lengua Española' AND (ap.asignatura ILIKE '%lengua%' OR ap.asignatura ILIKE '%espanol%'))
                LIMIT 1
            ), 0),
            'portal_activo', COALESCE(pub.portal_activo, true),
            'mostrar_puntajes', COALESCE(pub.mostrar_puntajes, true),
            'mostrar_evidencias', COALESCE(pub.mostrar_evidencias, true),
            'mostrar_recursos', COALESCE(pub.mostrar_recursos, true),
            'mostrar_incidencias', COALESCE(pub.mostrar_incidencias, false),
            'mostrar_recuperacion', COALESCE(pub.mostrar_recuperacion, true),
            'published_until', pub.published_until
        )
    ) INTO v_resultado
    FROM catalogo_7 c7
    LEFT JOIN publicaciones_portal pub ON pub.asignatura ILIKE c7.asignatura 
       OR (c7.asignatura = 'Lenguas Extranjeras (Inglés)' AND (pub.asignatura ILIKE '%ingl%' OR pub.asignatura ILIKE '%english%'))
       OR (c7.asignatura = 'Ciencias Sociales' AND (pub.asignatura ILIKE '%social%' OR pub.asignatura ILIKE '%historia%'))
       OR (c7.asignatura = 'Ciencias de la Naturaleza' AND (pub.asignatura ILIKE '%naturalez%' OR pub.asignatura ILIKE '%biolog%'))
       OR (c7.asignatura = 'Educación Física' AND (pub.asignatura ILIKE '%físic%' OR pub.asignatura ILIKE '%fisica%'))
       OR (c7.asignatura = 'Educación Artística' AND (pub.asignatura ILIKE '%artístic%' OR pub.asignatura ILIKE '%artistica%'))
       OR (c7.asignatura = 'Matemática' AND (pub.asignatura ILIKE '%matemátic%' OR pub.asignatura ILIKE '%matematica%'))
       OR (c7.asignatura = 'Lengua Española' AND (pub.asignatura ILIKE '%lengua%' OR pub.asignatura ILIKE '%espanol%'));

    RETURN COALESCE(v_resultado, '[]'::jsonb);
END;
$$;

-- Obtener fichas compartidas con su asignatura correspondiente
CREATE OR REPLACE FUNCTION public.portal_get_fichas_compartidas(p_session_token UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_sesion RECORD;
    v_acceso RECORD;
    v_estudiante RECORD;
    v_resultado JSONB;
BEGIN
    SELECT * INTO v_sesion FROM public.portal_sesiones WHERE session_token = p_session_token AND expires_at > NOW();
    IF NOT FOUND THEN RETURN jsonb_build_object('error', 'Sesión inválida'); END IF;
    SELECT * INTO v_acceso FROM public.portal_accesos WHERE id = v_sesion.acceso_id AND active = true;

    SELECT e.*, c.shared_course_id INTO v_estudiante
    FROM public.estudiantes e
    JOIN public.cursos c ON c.id = e.curso_id
    WHERE e.id = v_acceso.estudiante_id;

    -- Obtener lista (con asignatura)
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
    WHERE fc.curso_id = v_estudiante.curso_id 
       OR (v_estudiante.shared_course_id IS NOT NULL AND c.shared_course_id = v_estudiante.shared_course_id);

    RETURN COALESCE(v_resultado, '[]'::jsonb);
END;
$$;

