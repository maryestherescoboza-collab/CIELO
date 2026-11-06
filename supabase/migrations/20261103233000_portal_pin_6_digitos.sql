-- Migración: Actualizar autenticación de familias en Portal Estudiante a 6 dígitos con retrocompatibilidad
-- 1. portal_setup_pin: Exige exactamente 6 dígitos numéricos (^\d{6}$)
-- 2. portal_login: Acepta 6 dígitos (nuevas cuentas) y 4 dígitos (cuentas existentes)
-- 3. portal_docente_reset_pin: Permite al docente o directivo restablecer el PIN de un estudiante para que la familia configure una nueva clave de 6 dígitos

CREATE OR REPLACE FUNCTION public.portal_setup_pin(p_token UUID, p_pin TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
    v_acceso RECORD;
BEGIN
    SELECT * INTO v_acceso FROM public.portal_accesos WHERE access_token = p_token AND active = true;
    IF NOT FOUND THEN 
        RETURN jsonb_build_object('success', false, 'error', 'Token inválido'); 
    END IF;

    IF v_acceso.pin_hash IS NOT NULL THEN 
        RETURN jsonb_build_object('success', false, 'error', 'El PIN ya está configurado'); 
    END IF;

    -- Validación estricta: Las nuevas claves deben tener exactamente 6 dígitos numéricos
    IF p_pin IS NULL OR p_pin !~ '^\d{6}$' THEN
        RETURN jsonb_build_object('success', false, 'error', 'La clave debe contener exactamente 6 dígitos numéricos');
    END IF;

    UPDATE public.portal_accesos 
    SET pin_hash = crypt(p_pin, gen_salt('bf')), 
        failed_attempts = 0,
        locked_until = NULL,
        updated_at = NOW() 
    WHERE id = v_acceso.id;

    RETURN jsonb_build_object('success', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.portal_login(p_token UUID, p_pin TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
    v_acceso RECORD;
    v_session_token UUID;
BEGIN
    SELECT * INTO v_acceso FROM public.portal_accesos WHERE access_token = p_token AND active = true;
    IF NOT FOUND THEN 
        RETURN jsonb_build_object('success', false, 'error', 'Acceso denegado'); 
    END IF;

    IF v_acceso.locked_until > NOW() THEN 
        RETURN jsonb_build_object('success', false, 'error', 'Cuenta bloqueada temporalmente'); 
    END IF;
    
    -- Validación de formato: permite 6 dígitos (nuevos) y 4 dígitos (existentes), estrictamente numéricos
    IF p_pin IS NULL OR p_pin !~ '^\d{4}$|^\d{6}$' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Formato de clave inválido');
    END IF;

    IF v_acceso.pin_hash IS NULL OR v_acceso.pin_hash != crypt(p_pin, v_acceso.pin_hash) THEN
        UPDATE public.portal_accesos 
        SET failed_attempts = failed_attempts + 1, 
            locked_until = CASE WHEN failed_attempts + 1 >= 5 THEN NOW() + INTERVAL '15 minutes' ELSE locked_until END 
        WHERE id = v_acceso.id;
        
        RETURN jsonb_build_object('success', false, 'error', 'PIN incorrecto');
    END IF;

    UPDATE public.portal_accesos 
    SET failed_attempts = 0, 
        locked_until = NULL, 
        updated_at = NOW() 
    WHERE id = v_acceso.id;

    INSERT INTO public.portal_sesiones (acceso_id, expires_at) 
    VALUES (v_acceso.id, NOW() + INTERVAL '24 hours') 
    RETURNING session_token INTO v_session_token;

    RETURN jsonb_build_object('success', true, 'session_token', v_session_token);
END;
$$;

-- RPC para permitir a docentes/directores autorizados restablecer el PIN de un estudiante
CREATE OR REPLACE FUNCTION public.portal_docente_reset_pin(p_estudiante_id BIGINT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_uid UUID := auth.uid();
    v_est RECORD;
    v_authorized BOOLEAN := false;
BEGIN
    IF v_uid IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'No autenticado');
    END IF;

    SELECT id, docente_id, curso_id, grupo_id, shared_course_id
    INTO v_est
    FROM public.estudiantes
    WHERE id = p_estudiante_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Estudiante no encontrado');
    END IF;

    -- Verificar que el usuario sea docente o directivo con acceso al estudiante
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
        RETURN jsonb_build_object('success', false, 'error', 'No autorizado para gestionar este estudiante');
    END IF;

    UPDATE public.portal_accesos
    SET pin_hash = NULL,
        failed_attempts = 0,
        locked_until = NULL,
        updated_at = NOW()
    WHERE estudiante_id = p_estudiante_id;

    RETURN jsonb_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.portal_setup_pin(UUID, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.portal_login(UUID, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.portal_docente_reset_pin(BIGINT) TO authenticated;

