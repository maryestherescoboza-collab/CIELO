-- ============================================================================
-- MIGRACIÓN: Notificación y Gestión de Comentarios / Dudas de Fichas al Docente
-- ============================================================================

-- 1. Actualizar RLS en public.ficha_comentarios para autor y publicador
DROP POLICY IF EXISTS "Docente gestiona comentarios" ON public.ficha_comentarios;

CREATE POLICY "Docente gestiona comentarios"
ON public.ficha_comentarios
FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.pc_notas pn
        WHERE pn.id = ficha_comentarios.nota_id
          AND pn.usuario_id = auth.uid()
    )
    OR EXISTS (
        SELECT 1 FROM public.ficha_publicaciones fp
        WHERE fp.nota_id = ficha_comentarios.nota_id
          AND fp.published_by = auth.uid()
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.pc_notas pn
        WHERE pn.id = ficha_comentarios.nota_id
          AND pn.usuario_id = auth.uid()
    )
    OR EXISTS (
        SELECT 1 FROM public.ficha_publicaciones fp
        WHERE fp.nota_id = ficha_comentarios.nota_id
          AND fp.published_by = auth.uid()
    )
);

-- 2. RPC: Insertar comentario desde portal y notificar al docente responsable
CREATE OR REPLACE FUNCTION public.portal_crear_comentario_ficha(
    p_session_token UUID, 
    p_nota_id UUID, 
    p_texto TEXT,
    p_parent_comment_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_sesion RECORD;
    v_acceso RECORD;
    v_estudiante RECORD;
    v_comentario_id UUID;
    v_curso_id_insert INTEGER;
    v_docente_id UUID;
    v_nota_titulo TEXT;
    v_curso_nombre TEXT;
    v_curso_grado TEXT;
    v_curso_seccion TEXT;
BEGIN
    -- Validar sesión activa
    SELECT * INTO v_sesion 
    FROM public.portal_sesiones 
    WHERE session_token = p_session_token AND expires_at > NOW();
    
    IF NOT FOUND THEN 
        RETURN jsonb_build_object('error', 'Sesión inválida'); 
    END IF;

    -- Validar acceso activo
    SELECT * INTO v_acceso 
    FROM public.portal_accesos 
    WHERE id = v_sesion.acceso_id AND active = true;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('error', 'Acceso no activo');
    END IF;

    -- Obtener datos del estudiante y su curso
    SELECT e.*, c.shared_course_id INTO v_estudiante
    FROM public.estudiantes e
    JOIN public.cursos c ON c.id = e.curso_id
    WHERE e.id = v_acceso.estudiante_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('error', 'Estudiante no encontrado');
    END IF;

    -- Verificar compartición y obtener el curso_id exacto y docente responsable
    SELECT 
        COALESCE(fp.curso_id, fc.curso_id),
        COALESCE(fp.published_by, pn.usuario_id),
        pn.titulo,
        c.nombre,
        c.grado,
        c.seccion
    INTO 
        v_curso_id_insert,
        v_docente_id,
        v_nota_titulo,
        v_curso_nombre,
        v_curso_grado,
        v_curso_seccion
    FROM public.pc_notas pn
    LEFT JOIN public.ficha_publicaciones fp 
        ON fp.nota_id = pn.id 
        AND fp.estado = 'publicada'
        AND (fp.curso_id = v_estudiante.curso_id OR (v_estudiante.shared_course_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.cursos c2 WHERE c2.id = fp.curso_id AND c2.shared_course_id = v_estudiante.shared_course_id)))
    LEFT JOIN public.ficha_cursos fc 
        ON fc.nota_id = pn.id 
        AND (fc.curso_id = v_estudiante.curso_id OR (v_estudiante.shared_course_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.cursos c3 WHERE c3.id = fc.curso_id AND c3.shared_course_id = v_estudiante.shared_course_id)))
    LEFT JOIN public.cursos c 
        ON c.id = COALESCE(fp.curso_id, fc.curso_id)
    WHERE pn.id = p_nota_id
    LIMIT 1;

    IF v_curso_id_insert IS NULL THEN
        RETURN jsonb_build_object('error', 'Ficha no disponible para este curso');
    END IF;

    -- Insertar en ficha_comentarios
    INSERT INTO public.ficha_comentarios (nota_id, curso_id, estudiante_id, texto, parent_comment_id)
    VALUES (p_nota_id, v_curso_id_insert, v_acceso.estudiante_id, p_texto, p_parent_comment_id)
    RETURNING id INTO v_comentario_id;

    -- Registrar notificación al docente responsable en public.notificaciones
    IF v_docente_id IS NOT NULL THEN
        INSERT INTO public.notificaciones (
            user_id,
            actor_id,
            titulo,
            mensaje,
            leida,
            tipo,
            grado,
            seccion,
            created_at
        ) VALUES (
            v_docente_id,
            NULL,
            'Nueva duda en ficha: ' || COALESCE(v_nota_titulo, 'Ficha'),
            COALESCE(NULLIF(TRIM(v_estudiante.nombre || ' ' || COALESCE(v_estudiante.apellido, '')), ''), 'Estudiante') || 
            CASE 
                WHEN v_curso_grado IS NOT NULL THEN ' (' || v_curso_grado || ' ' || COALESCE(v_curso_seccion, '') || ')' 
                ELSE '' 
            END || ': "' || LEFT(p_texto, 120) || '"',
            false,
            'ficha_duda',
            v_curso_grado,
            v_curso_seccion,
            NOW()
        );
    END IF;

    RETURN jsonb_build_object('success', true, 'id', v_comentario_id);
END;
$$;

-- 3. RPC: Obtener comentarios de ficha desde portal (compatibilidad publicaciones modernas + legacy)
CREATE OR REPLACE FUNCTION public.portal_get_comentarios_ficha(p_session_token UUID, p_nota_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_sesion RECORD;
    v_acceso RECORD;
    v_estudiante RECORD;
    v_resultado JSONB;
    v_curso_id_query INTEGER;
BEGIN
    SELECT * INTO v_sesion FROM public.portal_sesiones WHERE session_token = p_session_token AND expires_at > NOW();
    IF NOT FOUND THEN RETURN jsonb_build_object('error', 'Sesión inválida'); END IF;
    SELECT * INTO v_acceso FROM public.portal_accesos WHERE id = v_sesion.acceso_id AND active = true;

    SELECT e.*, c.shared_course_id INTO v_estudiante
    FROM public.estudiantes e
    JOIN public.cursos c ON c.id = e.curso_id
    WHERE e.id = v_acceso.estudiante_id;

    -- Verificar compartición y obtener curso_id
    SELECT COALESCE(fp.curso_id, fc.curso_id) INTO v_curso_id_query
    FROM public.pc_notas pn
    LEFT JOIN public.ficha_publicaciones fp 
        ON fp.nota_id = pn.id 
        AND fp.estado = 'publicada'
        AND (fp.curso_id = v_estudiante.curso_id OR (v_estudiante.shared_course_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.cursos c2 WHERE c2.id = fp.curso_id AND c2.shared_course_id = v_estudiante.shared_course_id)))
    LEFT JOIN public.ficha_cursos fc 
        ON fc.nota_id = pn.id 
        AND (fc.curso_id = v_estudiante.curso_id OR (v_estudiante.shared_course_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.cursos c3 WHERE c3.id = fc.curso_id AND c3.shared_course_id = v_estudiante.shared_course_id)))
    WHERE pn.id = p_nota_id
    LIMIT 1;

    IF v_curso_id_query IS NULL THEN
        RETURN jsonb_build_object('error', 'No tienes acceso a esta ficha');
    END IF;

    -- Obtener comentarios
    SELECT jsonb_agg(
        jsonb_build_object(
            'id', fc.id,
            'nota_id', fc.nota_id,
            'curso_id', fc.curso_id,
            'texto', fc.texto,
            'created_at', fc.created_at,
            'parent_comment_id', fc.parent_comment_id,
            'autor_nombre', CASE 
                WHEN fc.estudiante_id IS NOT NULL THEN TRIM(COALESCE(e.nombre, '') || ' ' || COALESCE(e.apellido, ''))
                ELSE COALESCE(p.nombre_docente, 'Docente')
            END,
            'es_docente', (fc.user_id IS NOT NULL),
            'es_propio', (fc.estudiante_id = v_acceso.estudiante_id)
        ) ORDER BY fc.created_at ASC
    ) INTO v_resultado
    FROM public.ficha_comentarios fc
    LEFT JOIN public.estudiantes e ON e.id = fc.estudiante_id
    LEFT JOIN public.perfiles p ON p.user_id = fc.user_id
    WHERE fc.nota_id = p_nota_id AND fc.curso_id = v_curso_id_query;

    RETURN COALESCE(v_resultado, '[]'::jsonb);
END;
$$;

