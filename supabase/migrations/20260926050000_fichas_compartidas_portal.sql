-- Migration para Fichas Compartidas y Comentarios en Portal

-- 1. Tabla puente ficha_cursos
CREATE TABLE IF NOT EXISTS public.ficha_cursos (
    nota_id UUID NOT NULL REFERENCES public.pc_notas(id) ON DELETE CASCADE,
    curso_id INTEGER NOT NULL REFERENCES public.cursos(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (nota_id, curso_id)
);

-- Indices
CREATE INDEX IF NOT EXISTS idx_ficha_cursos_nota_id ON public.ficha_cursos(nota_id);
CREATE INDEX IF NOT EXISTS idx_ficha_cursos_curso_id ON public.ficha_cursos(curso_id);

-- RLS ficha_cursos
ALTER TABLE public.ficha_cursos ENABLE ROW LEVEL SECURITY;

-- Solo el dueño de la nota puede gestionar ficha_cursos
CREATE POLICY "Gestión de ficha_cursos por el docente"
ON public.ficha_cursos
FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM public.pc_notas pn
        WHERE pn.id = ficha_cursos.nota_id
        AND pn.usuario_id = auth.uid()
    )
);

-- 2. Tabla de comentarios
CREATE TABLE IF NOT EXISTS public.ficha_comentarios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nota_id UUID NOT NULL REFERENCES public.pc_notas(id) ON DELETE CASCADE,
    curso_id INTEGER NOT NULL REFERENCES public.cursos(id) ON DELETE CASCADE,
    estudiante_id INTEGER REFERENCES public.estudiantes(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    texto TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    parent_comment_id UUID REFERENCES public.ficha_comentarios(id) ON DELETE CASCADE
);

-- Indices
CREATE INDEX IF NOT EXISTS idx_ficha_comentarios_nota_id_curso_id ON public.ficha_comentarios(nota_id, curso_id);
CREATE INDEX IF NOT EXISTS idx_ficha_comentarios_estudiante_id ON public.ficha_comentarios(estudiante_id);
CREATE INDEX IF NOT EXISTS idx_ficha_comentarios_user_id ON public.ficha_comentarios(user_id);

-- RLS ficha_comentarios
ALTER TABLE public.ficha_comentarios ENABLE ROW LEVEL SECURITY;

-- Docente puede leer/borrar/insertar en los cursos de sus notas
CREATE POLICY "Docente gestiona comentarios"
ON public.ficha_comentarios
FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM public.pc_notas pn
        WHERE pn.id = ficha_comentarios.nota_id
        AND pn.usuario_id = auth.uid()
    )
);

-- 3. RPC: Obtener fichas compartidas para el portal
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

    -- Obtener lista (sin contenido_json)
    SELECT jsonb_agg(
        jsonb_build_object(
            'id', pn.id,
            'titulo', pn.titulo,
            'fecha', pn.actualizado_en,
            'curso_id', fc.curso_id
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

-- 4. RPC: Obtener detalle de ficha
CREATE OR REPLACE FUNCTION public.portal_get_ficha_detalle(p_session_token UUID, p_nota_id UUID)
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

    -- Verificar que la ficha está compartida con este curso o un shared_course_id compatible
    IF NOT EXISTS (
        SELECT 1 FROM public.ficha_cursos fc
        JOIN public.cursos c ON c.id = fc.curso_id
        WHERE fc.nota_id = p_nota_id AND 
        (fc.curso_id = v_estudiante.curso_id OR (v_estudiante.shared_course_id IS NOT NULL AND c.shared_course_id = v_estudiante.shared_course_id))
    ) THEN
        RETURN jsonb_build_object('error', 'Ficha no disponible para este curso');
    END IF;

    -- Devolver la nota
    SELECT jsonb_build_object(
        'id', pn.id,
        'titulo', pn.titulo,
        'contenido_json', pn.contenido_json,
        'actualizado_en', pn.actualizado_en
    ) INTO v_resultado
    FROM public.pc_notas pn
    WHERE pn.id = p_nota_id;

    RETURN COALESCE(v_resultado, jsonb_build_object('error', 'Ficha no encontrada'));
END;
$$;

-- 5. RPC: Insertar comentario portal
CREATE OR REPLACE FUNCTION public.portal_crear_comentario_ficha(
    p_session_token UUID, 
    p_nota_id UUID, 
    p_texto TEXT,
    p_parent_comment_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_sesion RECORD;
    v_acceso RECORD;
    v_estudiante RECORD;
    v_comentario_id UUID;
    v_curso_id_insert INTEGER;
BEGIN
    SELECT * INTO v_sesion FROM public.portal_sesiones WHERE session_token = p_session_token AND expires_at > NOW();
    IF NOT FOUND THEN RETURN jsonb_build_object('error', 'Sesión inválida'); END IF;
    SELECT * INTO v_acceso FROM public.portal_accesos WHERE id = v_sesion.acceso_id AND active = true;

    SELECT e.*, c.shared_course_id INTO v_estudiante
    FROM public.estudiantes e
    JOIN public.cursos c ON c.id = e.curso_id
    WHERE e.id = v_acceso.estudiante_id;

    -- Verificar compartición y obtener el curso_id exacto con el que se compartió
    SELECT fc.curso_id INTO v_curso_id_insert
    FROM public.ficha_cursos fc
    JOIN public.cursos c ON c.id = fc.curso_id
    WHERE fc.nota_id = p_nota_id AND 
    (fc.curso_id = v_estudiante.curso_id OR (v_estudiante.shared_course_id IS NOT NULL AND c.shared_course_id = v_estudiante.shared_course_id))
    LIMIT 1;

    IF v_curso_id_insert IS NULL THEN
        RETURN jsonb_build_object('error', 'Ficha no disponible para este curso');
    END IF;

    -- Insertar
    INSERT INTO public.ficha_comentarios (nota_id, curso_id, estudiante_id, texto, parent_comment_id)
    VALUES (p_nota_id, v_curso_id_insert, v_acceso.estudiante_id, p_texto, p_parent_comment_id)
    RETURNING id INTO v_comentario_id;

    RETURN jsonb_build_object('success', true, 'id', v_comentario_id);
END;
$$;

-- 6. RPC: Obtener comentarios portal
CREATE OR REPLACE FUNCTION public.portal_get_comentarios_ficha(p_session_token UUID, p_nota_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
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
    SELECT fc.curso_id INTO v_curso_id_query
    FROM public.ficha_cursos fc
    JOIN public.cursos c ON c.id = fc.curso_id
    WHERE fc.nota_id = p_nota_id AND 
    (fc.curso_id = v_estudiante.curso_id OR (v_estudiante.shared_course_id IS NOT NULL AND c.shared_course_id = v_estudiante.shared_course_id))
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
            'autor_nombre', CASE WHEN fc.estudiante_id IS NOT NULL THEN e.nombre || ' ' || e.apellido ELSE p.nombre_docente END,
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
