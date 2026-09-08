-- ═══════════════════════════════════════════════════════════════════
-- CIELO (Evaluación por competencias)
-- VALIDACIÓN Y VINCULACIÓN A CENTRO CON SUSCRIPCIÓN INSTITUCIONAL
-- ═══════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.validar_ingreso_centro_institucional(
    p_centro_id_seleccionado uuid,
    p_id_introducida text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id uuid;
    v_centro_record record;
    v_sub_institucional record;
BEGIN
    -- 1. Identidad del usuario (obligatorio usar auth.uid())
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RETURN json_build_object('ok', false, 'message', 'Usuario no autenticado.');
    END IF;

    -- 2. Validación estricta de la ID introducida vs la seleccionada
    IF p_centro_id_seleccionado::text != trim(p_id_introducida) THEN
        RETURN json_build_object('ok', false, 'message', 'La ID no corresponde al centro seleccionado. Verifica la ID e inténtalo nuevamente.');
    END IF;

    -- 3. Verificar que el centro existe
    SELECT * INTO v_centro_record FROM public.centros WHERE id = p_centro_id_seleccionado;
    IF NOT FOUND THEN
        RETURN json_build_object('ok', false, 'message', 'El centro seleccionado no existe.');
    END IF;

    -- 4. Verificar que el centro tiene una suscripción institucional activa y obtener su fecha_fin
    SELECT fecha_inicio, fecha_fin INTO v_sub_institucional
    FROM public.suscripciones
    WHERE centro_id = p_centro_id_seleccionado
      AND tipo = 'institucional'
      AND estado = 'activa'
    LIMIT 1;

    IF NOT FOUND THEN
        RETURN json_build_object('ok', false, 'message', 'El centro seleccionado no posee una suscripción institucional activa.');
    END IF;

    -- =========================================================================
    -- BLOQUE TRANSACCIONAL (Cualquier fallo revierte todo)
    -- =========================================================================

    -- A. Actualizar PERFILES
    UPDATE public.perfiles
    SET centro_id = p_centro_id_seleccionado
    WHERE user_id = v_user_id;

    IF NOT FOUND THEN
        INSERT INTO public.perfiles (user_id, centro_id)
        VALUES (v_user_id, p_centro_id_seleccionado);
    END IF;

    -- B. Crear/Asignar CENTRO_ROLES (Idempotencia mediante ON CONFLICT)
    INSERT INTO public.centro_roles (centro_id, user_id, rol)
    VALUES (p_centro_id_seleccionado, v_user_id, 'docente')
    ON CONFLICT (centro_id, user_id) DO NOTHING;

    -- C. Crear SUSCRIPCIÓN INDIVIDUAL MANUAL (Idempotencia mediante EXISTS)
    IF NOT EXISTS (
        SELECT 1 FROM public.suscripciones
        WHERE user_id = v_user_id
          AND centro_id = p_centro_id_seleccionado
          AND tipo = 'individual'
    ) THEN
        INSERT INTO public.suscripciones (
            tipo,
            estado,
            provider,
            user_id,
            centro_id,
            fecha_inicio,
            fecha_fin,
            paypal_subscription_id,
            paypal_subscriber_id,
            plan_id
        ) VALUES (
            'individual',
            'activa',
            'manual',
            v_user_id,
            p_centro_id_seleccionado,
            now(),
            v_sub_institucional.fecha_fin, -- Hereda la fecha de fin de la suscripción institucional
            NULL,
            NULL,
            NULL
        );
    END IF;

    RETURN json_build_object('ok', true, 'centro_id', p_centro_id_seleccionado);

EXCEPTION WHEN OTHERS THEN
    -- El bloque transaccional revierte los cambios automáticamente si ocurre una excepción
    RETURN json_build_object('ok', false, 'message', 'Ocurrió un error inesperado al procesar la vinculación.');
END;
$$;

-- Permisos estrictos: solo usuarios autenticados pueden llamar a esta función
REVOKE EXECUTE ON FUNCTION public.validar_ingreso_centro_institucional(uuid, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.validar_ingreso_centro_institucional(uuid, text) TO authenticated;
