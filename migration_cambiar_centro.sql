-- ═══════════════════════════════════════════════════════════════════════
-- MIGRATION: CAMBIO SEGURO DE CENTRO EDUCATIVO (Docente)
-- Proyecto: CIELO (Evaluación por competencias)
--
-- ALCANCE: crea UNA función RPC segura (`cambiar_centro_vinculado`) que
-- centraliza la validación y la persistencia del cambio de centro.
-- NO desactiva RLS, NO añade políticas nuevas sobre otras tablas y NO
-- elimina ni modifica datos históricos (cursos, rúbricas, cotejos,
-- planificaciones, calificaciones, etc.).
--
-- Ejecutar una sola vez en Supabase (Dashboard → SQL Editor).
-- Luego, el frontend llama:
--   supabase.rpc('cambiar_centro_vinculado', { p_centro_id: '<uuid>' })
-- ═══════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.cambiar_centro_vinculado(p_centro_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_usuario_id uuid := auth.uid();
    v_centro public.centros%ROWTYPE;
    v_perfil public.perfiles%ROWTYPE;
    v_centro_anterior_id uuid;
    v_curso_reg record;
BEGIN
    -- 1. Sesión válida
    IF v_usuario_id IS NULL THEN
        RETURN jsonb_build_object(
            'ok', false,
            'error', 'sin_sesion',
            'message', 'No hay una sesión activa.'
        );
    END IF;

    -- 2. El centro debe existir
    SELECT * INTO v_centro FROM public.centros WHERE id = p_centro_id;
    IF v_centro.id IS NULL THEN
        RETURN jsonb_build_object(
            'ok', false,
            'error', 'centro_inexistente',
            'message', 'El ID del centro no corresponde a ningún centro registrado.'
        );
    END IF;

    -- 3. El centro debe permitir la vinculación de docentes.
    --    Se bloquean solo los estados que lo prohíben explícitamente.
    IF v_centro.estado IS NOT NULL AND v_centro.estado IN ('suspendido', 'cancelado') THEN
        RETURN jsonb_build_object(
            'ok', false,
            'error', 'centro_no_disponible',
            'message', 'Este centro no está disponible para vincular docentes en este momento.'
        );
    END IF;

    -- 4. Perfil del docente
    SELECT * INTO v_perfil FROM public.perfiles WHERE user_id = v_usuario_id LIMIT 1;
    IF v_perfil.user_id IS NULL THEN
        RETURN jsonb_build_object(
            'ok', false,
            'error', 'perfil_no_encontrado',
            'message', 'No se encontró la información del docente.'
        );
    END IF;

    v_centro_anterior_id := v_perfil.centro_id;

    -- 5. Si ya está vinculado, no repetir el cambio
    IF v_centro_anterior_id = p_centro_id THEN
        RETURN jsonb_build_object(
            'ok', false,
            'error', 'ya_vinculado',
            'message', 'Ya estás vinculado a este centro.'
        );
    END IF;

    -- ─────────────────────────────────────────────────────────────────
    -- 6. PERSISTIR la nueva vinculación (cambio REAL en la base).
    --    - perfiles.centro_id pasa a señalar el nuevo centro (fuente
    --      de verdad de la pertenencia del docente).
    --    - se registra el rol 'docente' en el NUEVO centro a través de
    --      centro_roles (NUNCA 'director'/'administrador': no se
    --      otorga permisos administrativos). Si el usuario ya tenía un
    --      rol en ese centro (p.ej. es director legítimo), se conserva.
    --    - los registros históricos de centro_roles de otros centros se
    --      conservan intactos.
    -- ─────────────────────────────────────────────────────────────────
    UPDATE public.perfiles
       SET centro_id = p_centro_id
     WHERE user_id = v_usuario_id;

    INSERT INTO public.centro_roles (centro_id, user_id, rol)
    VALUES (p_centro_id, v_usuario_id, 'docente')
    ON CONFLICT (centro_id, user_id) DO NOTHING;

    -- ─────────────────────────────────────────────────────────────────
    -- 7. AISLAMIENTO: el docente deja de tener disponibles los cursos
    --    del centro anterior a los que estaba vinculado. Solo se marca
    --    activo=false en su vínculo (curso_docentes); NO se borran
    --    cursos, estudiantes ni calificaciones (información histórica).
    --    Otros docentes o el centro conservan intactos esos cursos.
    -- ─────────────────────────────────────────────────────────────────
    IF v_centro_anterior_id IS NOT NULL THEN
        UPDATE public.curso_docentes cd
           SET activo = false
          FROM public.cursos c
         WHERE cd.curso_id = c.id
           AND c.centro_id = v_centro_anterior_id
           AND cd.docente_id = v_usuario_id
           AND cd.activo = true;
    END IF;

    RETURN jsonb_build_object(
        'ok', true,
        'centro_id', p_centro_id,
        'centro_nombre', v_centro.nombre,
        'centro_anterior_id', v_centro_anterior_id,
        'message', 'Centro educativo actualizado correctamente.'
    );
END;
$$;

-- Solo los usuarios autenticados pueden invocarla.
REVOKE EXECUTE ON FUNCTION public.cambiar_centro_vinculado(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cambiar_centro_vinculado(uuid) TO authenticated;

-- ═══════════════════════════════════════════════════════════════════════
-- NOTAS DE SEGURIDAD
--   - SECURITY DEFINER permite perseguir el UPDATE sobre perfiles y
--     curso_docentes SIEMPRE validando auth.uid() (la sesión del
--     usuario que la llama), por lo que un docente solo puede cambiar
--     su propio centro. Ninguna política permite que cambie el centro
--     de otros usuarios.
--   - No se crean políticas RLS nuevas que expongan centros ni datos
--     de otros centros.
--   - El rol en el nuevo centro se limita a 'docente'; el acceso a
--     Centro Panel sigue dependiendo de centro_roles ('director' /
--     'administrador'), nunca de pertenecer a un centro.
--   - Verificación rápida (opcional):
--       SELECT public.cambiar_centro_vinculado('0000-0000-0000-0000');
-- ═══════════════════════════════════════════════════════════════════════