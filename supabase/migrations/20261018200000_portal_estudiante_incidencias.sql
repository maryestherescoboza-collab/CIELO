-- Migración: Portal Estudiante - Sección Incidencias
-- Permite al estudiante autenticado mediante sesión de portal consultar exclusivamente sus incidencias registradas.

CREATE OR REPLACE FUNCTION public.portal_get_estudiante_incidencias(p_session_token UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_sesion RECORD;
    v_acceso RECORD;
    v_resultado JSONB;
BEGIN
    -- 1. Validar la sesión activa del portal
    SELECT * INTO v_sesion 
    FROM public.portal_sesiones 
    WHERE session_token = p_session_token AND expires_at > NOW();
    
    IF NOT FOUND THEN 
        RETURN jsonb_build_object('error', 'Sesión inválida'); 
    END IF;

    -- 2. Validar que el acceso asociado a la sesión esté activo
    SELECT * INTO v_acceso 
    FROM public.portal_accesos 
    WHERE id = v_sesion.acceso_id AND active = true;
    
    IF NOT FOUND THEN 
        RETURN jsonb_build_object('error', 'Acceso inactivo'); 
    END IF;

    -- 3. Actualizar last_active_at de la sesión
    UPDATE public.portal_sesiones 
    SET last_active_at = NOW() 
    WHERE session_token = p_session_token;

    -- 4. Obtener ÚNICAMENTE las incidencias del estudiante autenticado
    -- Se obtienen ordenadas de la más reciente a la más antigua
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

GRANT EXECUTE ON FUNCTION public.portal_get_estudiante_incidencias(UUID) TO anon, authenticated, service_role;
