-- =============================================================================
-- MIGRACIÓN: Sistema de Recuperación de Claves del Portal mediante QR Docente
-- =============================================================================
-- 1. Mantiene intactos los access_token y pin_hash existentes en portal_accesos.
-- 2. Crea public.portal_recuperaciones_clave con RLS estricto de denegación directa.
-- 3. Asegura la validación de 6 dígitos en portal_setup_pin.
-- 4. Crea los 4 RPCs SECURITY DEFINER para administrar y consumir QRs de recuperación.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.portal_recuperaciones_clave (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    acceso_id UUID NOT NULL REFERENCES public.portal_accesos(id) ON DELETE CASCADE,
    estudiante_id BIGINT NOT NULL REFERENCES public.estudiantes(id) ON DELETE CASCADE,
    recovery_token UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '24 hours'),
    used_at TIMESTAMPTZ NULL,
    invalidated_at TIMESTAMPTZ NULL
);

CREATE INDEX IF NOT EXISTS idx_portal_recuperaciones_estudiante_created
    ON public.portal_recuperaciones_clave (estudiante_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_portal_recuperaciones_token
    ON public.portal_recuperaciones_clave (recovery_token);

ALTER TABLE public.portal_recuperaciones_clave ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'portal_recuperaciones_clave'
          AND policyname = 'Deny direct access to portal_recuperaciones_clave'
    ) THEN
        CREATE POLICY "Deny direct access to portal_recuperaciones_clave"
            ON public.portal_recuperaciones_clave
            FOR ALL
            TO anon, authenticated
            USING (false)
            WITH CHECK (false);
    END IF;
END $$;

REVOKE ALL ON TABLE public.portal_recuperaciones_clave FROM anon, authenticated;

-- Asegurar validación estricta de 6 dígitos numéricos en portal_setup_pin
CREATE OR REPLACE FUNCTION public.portal_setup_pin(p_token uuid, p_pin text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions', 'pg_temp'
AS $function$
DECLARE
    v_acceso RECORD;
BEGIN
    SELECT * INTO v_acceso FROM public.portal_accesos WHERE access_token = p_token AND active = true;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Token inválido');
    END IF;
    IF v_acceso.pin_hash IS NOT NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'La clave de acceso ya está configurada');
    END IF;
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
$function$;

-- 1. Obtener estado de los QRs del estudiante para la vista del docente
CREATE OR REPLACE FUNCTION public.portal_obtener_estado_qr_estudiante(p_estudiante_id bigint)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
    v_uid UUID := auth.uid();
    v_est RECORD;
    v_authorized BOOLEAN := false;
    v_acceso RECORD;
    v_centro_id UUID;
    v_rec RECORD;
    v_rec_status TEXT := NULL;
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

    SELECT *
    INTO v_acceso
    FROM public.portal_accesos
    WHERE estudiante_id = p_estudiante_id
    LIMIT 1;

    IF NOT FOUND THEN
        SELECT c.centro_id INTO v_centro_id
        FROM public.cursos c
        WHERE c.id = v_est.curso_id AND c.centro_id IS NOT NULL
        LIMIT 1;

        IF v_centro_id IS NULL AND v_est.grupo_id IS NOT NULL THEN
            SELECT c.centro_id INTO v_centro_id
            FROM public.cursos c
            WHERE c.grupo_id = v_est.grupo_id AND c.centro_id IS NOT NULL
            LIMIT 1;
        END IF;

        IF v_centro_id IS NULL THEN
            SELECT cr.centro_id INTO v_centro_id
            FROM public.centro_roles cr
            WHERE cr.user_id = v_uid
            LIMIT 1;
        END IF;

        INSERT INTO public.portal_accesos (estudiante_id, centro_id, active)
        VALUES (p_estudiante_id, v_centro_id, true)
        ON CONFLICT (estudiante_id)
        DO UPDATE SET active = true, updated_at = NOW()
        RETURNING * INTO v_acceso;
    ELSIF v_acceso.active = false THEN
        UPDATE public.portal_accesos
        SET active = true
        WHERE id = v_acceso.id
        RETURNING * INTO v_acceso;
    END IF;

    -- Obtener el último QR de recuperación (que no haya sido invalidado por otro más reciente)
    SELECT *
    INTO v_rec
    FROM public.portal_recuperaciones_clave
    WHERE estudiante_id = p_estudiante_id
      AND invalidated_at IS NULL
    ORDER BY created_at DESC
    LIMIT 1;

    IF FOUND THEN
        IF v_rec.used_at IS NOT NULL THEN
            v_rec_status := 'utilizado';
        ELSIF v_rec.expires_at <= NOW() THEN
            v_rec_status := 'vencido';
        ELSE
            v_rec_status := 'pendiente';
        END IF;
    END IF;

    RETURN jsonb_build_object(
        'access_token', v_acceso.access_token,
        'estudiante_id', p_estudiante_id,
        'has_pin', (v_acceso.pin_hash IS NOT NULL),
        'recuperacion', CASE
            WHEN v_rec_status IS NOT NULL THEN jsonb_build_object(
                'recovery_token', CASE WHEN v_rec_status = 'pendiente' THEN v_rec.recovery_token ELSE NULL END,
                'estado', v_rec_status,
                'created_at', v_rec.created_at,
                'expires_at', v_rec.expires_at,
                'used_at', v_rec.used_at
            )
            ELSE NULL
        END
    );
END;
$function$;

-- 2. Generar un nuevo QR de recuperación (invalida los pendientes previos, NO borra pin_hash)
CREATE OR REPLACE FUNCTION public.portal_generar_qr_recuperacion(p_estudiante_id bigint)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
    v_uid UUID := auth.uid();
    v_est RECORD;
    v_authorized BOOLEAN := false;
    v_acceso RECORD;
    v_centro_id UUID;
    v_new_rec RECORD;
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
        RETURN jsonb_build_object('success', false, 'error', 'No tienes permisos para generar un QR de recuperación para este estudiante');
    END IF;

    SELECT *
    INTO v_acceso
    FROM public.portal_accesos
    WHERE estudiante_id = p_estudiante_id
    LIMIT 1;

    IF NOT FOUND THEN
        SELECT c.centro_id INTO v_centro_id
        FROM public.cursos c
        WHERE c.id = v_est.curso_id AND c.centro_id IS NOT NULL
        LIMIT 1;

        IF v_centro_id IS NULL AND v_est.grupo_id IS NOT NULL THEN
            SELECT c.centro_id INTO v_centro_id
            FROM public.cursos c
            WHERE c.grupo_id = v_est.grupo_id AND c.centro_id IS NOT NULL
            LIMIT 1;
        END IF;

        IF v_centro_id IS NULL THEN
            SELECT cr.centro_id INTO v_centro_id
            FROM public.centro_roles cr
            WHERE cr.user_id = v_uid
            LIMIT 1;
        END IF;

        INSERT INTO public.portal_accesos (estudiante_id, centro_id, active)
        VALUES (p_estudiante_id, v_centro_id, true)
        ON CONFLICT (estudiante_id)
        DO UPDATE SET active = true, updated_at = NOW()
        RETURNING * INTO v_acceso;
    ELSIF v_acceso.active = false THEN
        UPDATE public.portal_accesos
        SET active = true
        WHERE id = v_acceso.id
        RETURNING * INTO v_acceso;
    END IF;

    -- Invalidar cualquier QR de recuperación anterior que siga pendiente para este estudiante
    UPDATE public.portal_recuperaciones_clave
    SET invalidated_at = NOW()
    WHERE estudiante_id = p_estudiante_id
      AND used_at IS NULL
      AND invalidated_at IS NULL;

    -- Crear el nuevo QR de recuperación con vigencia de 24 horas
    INSERT INTO public.portal_recuperaciones_clave (
        acceso_id,
        estudiante_id,
        created_by,
        created_at,
        expires_at
    )
    VALUES (
        v_acceso.id,
        p_estudiante_id,
        v_uid,
        NOW(),
        NOW() + INTERVAL '24 hours'
    )
    RETURNING * INTO v_new_rec;

    RETURN jsonb_build_object(
        'success', true,
        'access_token', v_acceso.access_token,
        'has_pin', (v_acceso.pin_hash IS NOT NULL),
        'recuperacion', jsonb_build_object(
            'recovery_token', v_new_rec.recovery_token,
            'estado', 'pendiente',
            'created_at', v_new_rec.created_at,
            'expires_at', v_new_rec.expires_at,
            'used_at', NULL
        )
    );
END;
$function$;

-- 3. Verificar estado de un QR de recuperación (NO expone datos académicos ni IDs internos)
CREATE OR REPLACE FUNCTION public.portal_verificar_qr_recuperacion(p_recovery_token uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
    v_rec RECORD;
    v_acceso RECORD;
    v_est RECORD;
BEGIN
    SELECT *
    INTO v_rec
    FROM public.portal_recuperaciones_clave
    WHERE recovery_token = p_recovery_token
    LIMIT 1;

    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'valid', false,
            'status', 'invalido',
            'error', 'El código QR de recuperación no es válido.'
        );
    END IF;

    IF v_rec.used_at IS NOT NULL THEN
        RETURN jsonb_build_object(
            'valid', false,
            'status', 'utilizado',
            'error', 'Este código QR de recuperación ya fue utilizado. Si necesitas cambiar tu clave nuevamente, solicita un nuevo QR a tu docente.'
        );
    END IF;

    IF v_rec.invalidated_at IS NOT NULL THEN
        RETURN jsonb_build_object(
            'valid', false,
            'status', 'reemplazado',
            'error', 'Este código QR fue reemplazado por uno más reciente. Utiliza el último código QR entregado por tu docente.'
        );
    END IF;

    IF v_rec.expires_at <= NOW() THEN
        RETURN jsonb_build_object(
            'valid', false,
            'status', 'vencido',
            'error', 'Este código QR de recuperación ha vencido. Solicita a tu docente que genere uno nuevo.'
        );
    END IF;

    SELECT * INTO v_acceso FROM public.portal_accesos WHERE id = v_rec.acceso_id AND active = true;
    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'valid', false,
            'status', 'inactivo',
            'error', 'El acceso asociado a este estudiante no está activo.'
        );
    END IF;

    SELECT nombre INTO v_est FROM public.estudiantes WHERE id = v_rec.estudiante_id;

    RETURN jsonb_build_object(
        'valid', true,
        'status', 'pendiente',
        'estudiante_nombre', COALESCE(v_est.nombre, 'Estudiante'),
        'expires_at', v_rec.expires_at
    );
END;
$function$;

-- 4. Completar el restablecimiento de clave con el QR de recuperación (un solo uso)
CREATE OR REPLACE FUNCTION public.portal_completar_recuperacion_clave(p_recovery_token uuid, p_new_pin text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions', 'pg_temp'
AS $function$
DECLARE
    v_rec RECORD;
    v_acceso RECORD;
BEGIN
    IF p_new_pin IS NULL OR p_new_pin !~ '^\d{6}$' THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'La nueva clave debe contener exactamente 6 dígitos numéricos.'
        );
    END IF;

    -- Bloquear fila para garantizar un único uso atómico
    SELECT *
    INTO v_rec
    FROM public.portal_recuperaciones_clave
    WHERE recovery_token = p_recovery_token
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'El código QR de recuperación no es válido.'
        );
    END IF;

    IF v_rec.used_at IS NOT NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Este código QR de recuperación ya fue utilizado.'
        );
    END IF;

    IF v_rec.invalidated_at IS NOT NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Este código QR fue invalidado porque se generó uno más reciente.'
        );
    END IF;

    IF v_rec.expires_at <= NOW() THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Este código QR de recuperación ha vencido. Solicita uno nuevo a tu docente.'
        );
    END IF;

    SELECT *
    INTO v_acceso
    FROM public.portal_accesos
    WHERE id = v_rec.acceso_id AND active = true
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'El acceso del estudiante no se encuentra activo.'
        );
    END IF;

    -- Guardar la nueva clave y limpiar intentos fallidos / bloqueo
    UPDATE public.portal_accesos
    SET pin_hash = crypt(p_new_pin, gen_salt('bf')),
        failed_attempts = 0,
        locked_until = NULL,
        updated_at = NOW()
    WHERE id = v_acceso.id;

    -- Marcar el QR de recuperación como utilizado inmediatamente
    UPDATE public.portal_recuperaciones_clave
    SET used_at = NOW()
    WHERE id = v_rec.id;

    -- Invalidar sesiones previas del portal para este estudiante
    UPDATE public.portal_sesiones
    SET expires_at = NOW()
    WHERE acceso_id = v_acceso.id AND expires_at > NOW();

    RETURN jsonb_build_object(
        'success', true,
        'access_token', v_acceso.access_token
    );
END;
$function$;

GRANT EXECUTE ON FUNCTION public.portal_obtener_estado_qr_estudiante(bigint) TO authenticated;
GRANT EXECUTE ON FUNCTION public.portal_generar_qr_recuperacion(bigint) TO authenticated;
GRANT EXECUTE ON FUNCTION public.portal_verificar_qr_recuperacion(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.portal_completar_recuperacion_clave(uuid, text) TO anon, authenticated;

