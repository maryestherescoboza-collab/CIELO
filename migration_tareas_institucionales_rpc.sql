-- MIGRACIÓN PARA CORREGIR LA FUNCIÓN RPC crear_tarea_institucional
-- Asegúrate de ejecutar este archivo en el SQL Editor de Supabase

-- Establecemos el search_path para mayor seguridad
SET search_path = public;

-- Eliminamos las funciones previas para evitar conflictos de sobrecarga (schema cache issues)
DROP FUNCTION IF EXISTS public.crear_tarea_institucional(UUID, TEXT, TEXT, TIMESTAMPTZ, TEXT, UUID[]);
DROP FUNCTION IF EXISTS public.crear_tarea_institucional(UUID, TEXT, UUID[], TIMESTAMPTZ, TEXT, TEXT);

-- Creamos la función con la firma exacta y con seguridad requerida
CREATE OR REPLACE FUNCTION public.crear_tarea_institucional(
    p_centro_id UUID,
    p_descripcion TEXT,
    p_docente_ids UUID[],
    p_fecha_limite TIMESTAMPTZ,
    p_prioridad TEXT,
    p_titulo TEXT
) RETURNS public.tareas_institucionales AS $$
DECLARE
    v_uid UUID;
    v_is_admin BOOLEAN;
    v_tarea public.tareas_institucionales;
    v_docente UUID;
    v_docente_valido BOOLEAN;
BEGIN
    v_uid := auth.uid();
    
    -- Validar autenticación
    IF v_uid IS NULL THEN
        RAISE EXCEPTION 'Usuario no autenticado.';
    END IF;

    -- Validar que el usuario sea administrador o director del centro
    SELECT EXISTS (
        SELECT 1 FROM public.centro_roles
        WHERE centro_id = p_centro_id
        AND user_id = v_uid
        AND rol IN ('director', 'administrador')
    ) INTO v_is_admin;
    
    IF NOT v_is_admin THEN
        RAISE EXCEPTION 'No tienes permisos de administrador para el centro proporcionado.';
    END IF;

    -- Validar que TODOS los docentes pertenezcan al centro indicado ANTES de insertar nada
    FOREACH v_docente IN ARRAY p_docente_ids
    LOOP
        -- Se usa get_user_centro_id si está disponible, pero como la tabla perfiles usa user_id y tiene centro_id:
        SELECT EXISTS (
            SELECT 1 FROM public.perfiles
            WHERE user_id = v_docente
            AND centro_id = p_centro_id
        ) INTO v_docente_valido;

        IF NOT v_docente_valido THEN
            RAISE EXCEPTION 'El docente % no pertenece al centro %.', v_docente, p_centro_id;
        END IF;
    END LOOP;

    -- Insertar la tarea (Atómico)
    INSERT INTO public.tareas_institucionales (
        centro_id, titulo, descripcion, fecha_limite, prioridad, created_by
    ) VALUES (
        p_centro_id, p_titulo, p_descripcion, p_fecha_limite, p_prioridad, v_uid
    ) RETURNING * INTO v_tarea;

    -- Insertar asignaciones y notificaciones
    FOREACH v_docente IN ARRAY p_docente_ids
    LOOP
        -- Insertar en tarea_docente
        INSERT INTO public.tarea_docente (
            tarea_id, docente_id, estado
        ) VALUES (
            v_tarea.id, v_docente, 'pendiente'
        );

        -- Crear notificación utilizando el schema real de notificaciones
        -- (Asegúrate de que 'tarea_institucional_id' exista en tu tabla notificaciones, si no, usa 'tarea_id' u otra según tu esquema)
        INSERT INTO public.notificaciones (
            user_id, actor_id, titulo, mensaje, tipo, tarea_institucional_id, estado, leida
        ) VALUES (
            v_docente, v_uid, 'Nueva tarea asignada', p_titulo, 'tarea', v_tarea.id, 'pendiente', false
        );
    END LOOP;

    -- Devolver la fila completa de la tarea insertada
    RETURN v_tarea;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Notificamos a PostgREST para que recargue el schema cache y exponga la nueva RPC inmediatamente
NOTIFY pgrst, 'reload schema';
