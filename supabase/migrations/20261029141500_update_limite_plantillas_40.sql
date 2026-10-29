-- ============================================================================
-- Migración: Aumentar límite de plantillas activas de 10 a 40 por docente y tipo
-- ============================================================================

CREATE OR REPLACE FUNCTION public.crear_plantilla(
    p_tipo   text,
    p_nombre text,
    p_datos  jsonb
)
RETURNS public.plantillas
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user uuid;
    v_total int;
    v_row public.plantillas;
BEGIN
    v_user := auth.uid();
    IF v_user IS NULL THEN
        RAISE EXCEPTION 'NO_AUTENTICADO' USING ERRCODE = '42501';
    END IF;

    IF p_tipo NOT IN ('rubrica', 'cotejo') THEN
        RAISE EXCEPTION 'TIPO_INVALIDO: %', p_tipo USING ERRCODE = '22023';
    END IF;

    IF p_nombre IS NULL OR length(btrim(p_nombre)) = 0 THEN
        RAISE EXCEPTION 'NOMBRE_INVALIDO' USING ERRCODE = '22023';
    END IF;

    -- Serializa creaciones simultáneas del mismo docente+tipo (clave discreta).
    PERFORM pg_advisory_xact_lock(hashtextextended(v_user::text || ':' || p_tipo, 0));

    SELECT count(*) INTO v_total
    FROM public.plantillas
    WHERE user_id = v_user
      AND tipo = p_tipo
      AND archivado = false;

    IF v_total >= 40 THEN
        RAISE EXCEPTION 'LIMITE_PLANTILLAS: alcanzas el máximo de 40 plantillas activas de tipo "%"', p_tipo
            USING ERRCODE = 'P0001',
                  HINT = 'Elimina o archiva una plantilla antes de crear otra.';
    END IF;

    INSERT INTO public.plantillas (user_id, tipo, nombre, datos, archivado)
    VALUES (v_user, p_tipo, btrim(p_nombre), COALESCE(p_datos, '{}'::jsonb), false)
    RETURNING * INTO v_row;

    RETURN v_row;
END;
$$;

REVOKE ALL ON FUNCTION public.crear_plantilla(text, text, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.crear_plantilla(text, text, jsonb) TO authenticated;
