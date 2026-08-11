-- MIGRACIÓN COMPLETA Y ATÓMICA DE TAREAS INSTITUCIONALES

-- 1. Aseguramos el esquema público
SET search_path = public;

-- 2. Limpieza de funciones previas (para evitar errores 42704 o conflictos de caché en el futuro)
DROP FUNCTION IF EXISTS public.crear_tarea_institucional(UUID, TEXT, TEXT, TIMESTAMPTZ, TEXT, UUID[]);
DROP FUNCTION IF EXISTS public.crear_tarea_institucional(UUID, TEXT, UUID[], TIMESTAMPTZ, TEXT, TEXT);

-- 3. Crear las tablas base en orden para evitar error 42704 de tipo faltante
CREATE TABLE IF NOT EXISTS public.tareas_institucionales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    centro_id UUID NOT NULL, 
    titulo TEXT NOT NULL,
    descripcion TEXT DEFAULT '',
    prioridad TEXT DEFAULT 'normal',
    fecha_limite TIMESTAMPTZ,
    created_by UUID, 
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.tarea_docente (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tarea_id UUID NOT NULL REFERENCES public.tareas_institucionales(id) ON DELETE CASCADE,
    docente_id UUID NOT NULL,
    estado TEXT NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'en_progreso', 'completada', 'vencida')),
    fecha_entrega TIMESTAMPTZ,
    observaciones TEXT,
    archivos_entrega TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE (tarea_id, docente_id)
);

-- 4. Alteraciones de columnas (Notificaciones)
ALTER TABLE public.notificaciones ADD COLUMN IF NOT EXISTS tarea_institucional_id UUID REFERENCES public.tareas_institucionales(id) ON DELETE CASCADE;

-- 5. Índices de rendimiento
CREATE INDEX IF NOT EXISTS idx_tareas_inst_centro_id ON public.tareas_institucionales(centro_id);
CREATE INDEX IF NOT EXISTS idx_tarea_docente_tarea_id ON public.tarea_docente(tarea_id);
CREATE INDEX IF NOT EXISTS idx_tarea_docente_docente_id ON public.tarea_docente(docente_id);

-- 6. Habilitar RLS en las nuevas tablas
ALTER TABLE public.tareas_institucionales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tarea_docente ENABLE ROW LEVEL SECURITY;

-- 7. Políticas de RLS
DROP POLICY IF EXISTS "tareas_inst_select" ON public.tareas_institucionales;
DROP POLICY IF EXISTS "tarea_docente_select" ON public.tarea_docente;
DROP POLICY IF EXISTS "tarea_docente_update_docente" ON public.tarea_docente;
DROP POLICY IF EXISTS "tareas_inst_manage" ON public.tareas_institucionales;

CREATE POLICY "tareas_inst_select"
ON public.tareas_institucionales FOR SELECT TO authenticated
USING (
    centro_id::text IN (
        SELECT centro_id::text FROM public.centro_roles cr WHERE cr.user_id = auth.uid()
        UNION
        SELECT centro_id::text FROM public.perfiles p WHERE p.user_id = auth.uid()
    )
);

CREATE POLICY "tarea_docente_select"
ON public.tarea_docente FOR SELECT TO authenticated
USING (
    docente_id = auth.uid()
    OR EXISTS (
        SELECT 1 FROM public.tareas_institucionales t
        JOIN public.centro_roles cr ON cr.centro_id::text = t.centro_id::text
        WHERE t.id = tarea_docente.tarea_id
        AND cr.user_id = auth.uid()
        AND cr.rol IN ('director', 'administrador')
    )
);

CREATE POLICY "tarea_docente_update_docente"
ON public.tarea_docente FOR UPDATE TO authenticated
USING (docente_id = auth.uid()) 
WITH CHECK (docente_id = auth.uid());

CREATE POLICY "tareas_inst_manage"
ON public.tareas_institucionales FOR ALL TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.centro_roles cr
        WHERE cr.centro_id::text = centro_id::text
        AND cr.user_id = auth.uid()
        AND cr.rol IN ('director', 'administrador')
    )
);

-- 8. Crear la RPC requerida con la firma exacta solicitada por el usuario
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
        WHERE centro_id::text = p_centro_id::text
        AND user_id = v_uid
        AND rol IN ('director', 'administrador')
    ) INTO v_is_admin;
    
    IF NOT v_is_admin THEN
        RAISE EXCEPTION 'No tienes permisos de administrador para el centro proporcionado.';
    END IF;

    -- Validar que TODOS los docentes pertenezcan al centro indicado
    FOREACH v_docente IN ARRAY p_docente_ids
    LOOP
        SELECT EXISTS (
            SELECT 1 FROM public.perfiles
            WHERE user_id = v_docente
            AND centro_id::text = p_centro_id::text
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
        -- Insertar asignación
        INSERT INTO public.tarea_docente (
            tarea_id, docente_id, estado
        ) VALUES (
            v_tarea.id, v_docente, 'pendiente'
        );

        -- Crear notificación
        INSERT INTO public.notificaciones (
            user_id, actor_id, titulo, mensaje, tipo, tarea_institucional_id, estado, leida
        ) VALUES (
            v_docente, v_uid, 'Nueva tarea asignada', p_titulo, 'tarea', v_tarea.id, 'pendiente', false
        );
    END LOOP;

    -- Devolver la fila completa de la tarea
    RETURN v_tarea;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 9. Recargar la API (Cache de PostgREST)
NOTIFY pgrst, 'reload schema';
