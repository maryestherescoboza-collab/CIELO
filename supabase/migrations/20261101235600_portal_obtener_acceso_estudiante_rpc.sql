-- Allow centro_id to be nullable on portal_accesos for individual teachers without center
ALTER TABLE public.portal_accesos ALTER COLUMN centro_id DROP NOT NULL;

-- Secure RPC for authorized teachers/directors to obtain or create a student's individual portal access_token
CREATE OR REPLACE FUNCTION public.portal_obtener_acceso_estudiante(p_estudiante_id BIGINT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_uid UUID := auth.uid();
    v_est RECORD;
    v_authorized BOOLEAN := false;
    v_access_token UUID;
    v_centro_id UUID;
BEGIN
    IF v_uid IS NULL THEN
        RETURN jsonb_build_object('error', 'No autenticado');
    END IF;

    SELECT id, docente_id, curso_id, grupo_id, shared_course_id
    INTO v_est
    FROM public.estudiantes
    WHERE id = p_estudiante_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('error', 'Estudiante no encontrado');
    END IF;

    -- Verify teacher/director authorization using the same scope as public.estudiantes RLS
    SELECT (
        v_est.docente_id = v_uid
        OR EXISTS (
            SELECT 1
            FROM public.cursos c
            WHERE (
                c.id = v_est.curso_id
                OR (v_est.grupo_id IS NOT NULL AND c.grupo_id = v_est.grupo_id)
                OR (v_est.shared_course_id IS NOT NULL AND c.shared_course_id = v_est.shared_course_id)
            )
            AND (c.user_id = v_uid OR public.is_course_teacher(c.id))
        )
        OR EXISTS (
            SELECT 1
            FROM public.cursos cu
            JOIN public.centro_roles cr ON cr.centro_id = cu.centro_id
            WHERE cu.id = v_est.curso_id
              AND cr.user_id = v_uid
              AND cr.rol = ANY (ARRAY['director'::text, 'administrador'::text])
        )
    ) INTO v_authorized;

    IF NOT COALESCE(v_authorized, false) THEN
        RETURN jsonb_build_object('error', 'No autorizado para este estudiante');
    END IF;

    -- 1. Reuse existing access_token if already generated for this student
    SELECT access_token
    INTO v_access_token
    FROM public.portal_accesos
    WHERE estudiante_id = p_estudiante_id
    LIMIT 1;

    IF v_access_token IS NOT NULL THEN
        UPDATE public.portal_accesos
        SET active = true
        WHERE estudiante_id = p_estudiante_id AND active = false;

        RETURN jsonb_build_object(
            'access_token', v_access_token,
            'estudiante_id', p_estudiante_id
        );
    END IF;

    -- 2. Resolve centro_id for new access record
    SELECT c.centro_id
    INTO v_centro_id
    FROM public.cursos c
    WHERE c.id = v_est.curso_id
      AND c.centro_id IS NOT NULL
    LIMIT 1;

    IF v_centro_id IS NULL AND v_est.grupo_id IS NOT NULL THEN
        SELECT c.centro_id
        INTO v_centro_id
        FROM public.cursos c
        WHERE c.grupo_id = v_est.grupo_id
          AND c.centro_id IS NOT NULL
        LIMIT 1;
    END IF;

    IF v_centro_id IS NULL THEN
        SELECT cr.centro_id
        INTO v_centro_id
        FROM public.centro_roles cr
        WHERE cr.user_id = v_uid
        LIMIT 1;
    END IF;

    INSERT INTO public.portal_accesos (estudiante_id, centro_id, active)
    VALUES (p_estudiante_id, v_centro_id, true)
    ON CONFLICT (estudiante_id)
    DO UPDATE SET active = true, updated_at = NOW()
    RETURNING access_token INTO v_access_token;

    RETURN jsonb_build_object(
        'access_token', v_access_token,
        'estudiante_id', p_estudiante_id
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.portal_obtener_acceso_estudiante(BIGINT) TO authenticated;
