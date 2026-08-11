-- MIGRATION: TAREAS INSTITUCIONALES (RPC y Arquitectura de Extremo a Extremo)

-- 1. TABLAS PRINCIPALES

CREATE TABLE IF NOT EXISTS public.tareas_institucionales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    centro_id UUID NOT NULL REFERENCES public.centros(id) ON DELETE CASCADE,
    titulo TEXT NOT NULL,
    descripcion TEXT DEFAULT '',
    prioridad TEXT DEFAULT 'normal',
    fecha_limite TIMESTAMPTZ,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.tarea_docente (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tarea_id UUID NOT NULL REFERENCES public.tareas_institucionales(id) ON DELETE CASCADE,
    docente_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    estado TEXT NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'en_progreso', 'completada', 'vencida')),
    fecha_entrega TIMESTAMPTZ,
    observaciones TEXT,
    archivos_entrega TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE (tarea_id, docente_id)
);

-- 2. AJUSTE EN NOTIFICACIONES
ALTER TABLE public.notificaciones ADD COLUMN IF NOT EXISTS tarea_institucional_id UUID REFERENCES public.tareas_institucionales(id) ON DELETE CASCADE;

-- 3. HABILITAR RLS
ALTER TABLE public.tareas_institucionales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tarea_docente ENABLE ROW LEVEL SECURITY;

-- 4. POLÍTICAS RLS

-- tareas_institucionales: Select
-- Puede ver las tareas si pertenece al centro (ya sea como admin o como docente, se usa get_user_centro_id() o centro_roles)
CREATE POLICY "tareas_inst_select"
ON public.tareas_institucionales FOR SELECT TO authenticated
USING (
    centro_id = public.get_user_centro_id()
    OR EXISTS (
        SELECT 1 FROM public.centro_roles cr
        WHERE cr.centro_id = tareas_institucionales.centro_id
        AND cr.user_id = auth.uid()
    )
);

-- tareas_institucionales: Insert (Sólo director/admin)
CREATE POLICY "tareas_inst_insert"
ON public.tareas_institucionales FOR INSERT TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.centro_roles cr
        WHERE cr.centro_id = centro_id
        AND cr.user_id = auth.uid()
        AND cr.rol IN ('director', 'administrador')
    )
);

-- tareas_institucionales: Update/Delete (Sólo director/admin)
CREATE POLICY "tareas_inst_manage"
ON public.tareas_institucionales FOR UPDATE TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.centro_roles cr
        WHERE cr.centro_id = centro_id
        AND cr.user_id = auth.uid()
        AND cr.rol IN ('director', 'administrador')
    )
);

CREATE POLICY "tareas_inst_delete"
ON public.tareas_institucionales FOR DELETE TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.centro_roles cr
        WHERE cr.centro_id = centro_id
        AND cr.user_id = auth.uid()
        AND cr.rol IN ('director', 'administrador')
    )
);

-- tarea_docente: Select (Admin del centro ve todas las del centro, Docente ve las suyas)
CREATE POLICY "tarea_docente_select"
ON public.tarea_docente FOR SELECT TO authenticated
USING (
    docente_id = auth.uid()
    OR EXISTS (
        SELECT 1 FROM public.tareas_institucionales t
        JOIN public.centro_roles cr ON cr.centro_id = t.centro_id
        WHERE t.id = tarea_docente.tarea_id
        AND cr.user_id = auth.uid()
        AND cr.rol IN ('director', 'administrador')
    )
);

-- tarea_docente: Update (Docente puede actualizar SOLO su asignación)
CREATE POLICY "tarea_docente_update_docente"
ON public.tarea_docente FOR UPDATE TO authenticated
USING (
    docente_id = auth.uid()
) WITH CHECK (
    docente_id = auth.uid()
);

-- tarea_docente: Insert/Delete/Update (Admin del centro)
CREATE POLICY "tarea_docente_manage_admin"
ON public.tarea_docente FOR ALL TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.tareas_institucionales t
        JOIN public.centro_roles cr ON cr.centro_id = t.centro_id
        WHERE t.id = tarea_docente.tarea_id
        AND cr.user_id = auth.uid()
        AND cr.rol IN ('director', 'administrador')
    )
);

-- 5. FUNCIÓN RPC PARA CREAR TAREA DE FORMA ATÓMICA

CREATE OR REPLACE FUNCTION public.crear_tarea_institucional(
    p_centro_id UUID,
    p_titulo TEXT,
    p_descripcion TEXT,
    p_fecha_limite TIMESTAMPTZ,
    p_prioridad TEXT,
    p_docente_ids UUID[]
) RETURNS UUID AS $$
DECLARE
    v_uid UUID;
    v_is_admin BOOLEAN;
    v_tarea_id UUID;
    v_docente UUID;
    v_docente_valido BOOLEAN;
BEGIN
    v_uid := auth.uid();
    
    -- 1. Validar que el usuario sea admin/director del centro
    SELECT EXISTS (
        SELECT 1 FROM public.centro_roles
        WHERE centro_id = p_centro_id
        AND user_id = v_uid
        AND rol IN ('director', 'administrador')
    ) INTO v_is_admin;
    
    IF NOT v_is_admin THEN
        RAISE EXCEPTION 'No tienes permisos de administrador para el centro proporcionado.';
    END IF;

    -- 2. Crear fila principal
    INSERT INTO public.tareas_institucionales (
        centro_id, titulo, descripcion, fecha_limite, prioridad, created_by
    ) VALUES (
        p_centro_id, p_titulo, p_descripcion, p_fecha_limite, p_prioridad, v_uid
    ) RETURNING id INTO v_tarea_id;

    -- 3. Crear asignaciones y notificaciones
    FOREACH v_docente IN ARRAY p_docente_ids
    LOOP
        -- Verificar que el docente pertenece al centro
        SELECT EXISTS (
            SELECT 1 FROM public.perfiles
            WHERE user_id = v_docente
            AND centro_id = p_centro_id
        ) INTO v_docente_valido;

        IF NOT v_docente_valido THEN
            -- Hacemos rollback automático con RAISE EXCEPTION
            RAISE EXCEPTION 'El docente % no pertenece al centro %.', v_docente, p_centro_id;
        END IF;

        -- Insertar en tarea_docente
        INSERT INTO public.tarea_docente (
            tarea_id, docente_id, estado
        ) VALUES (
            v_tarea_id, v_docente, 'pendiente'
        );

        -- Crear notificación
        INSERT INTO public.notificaciones (
            user_id, actor_id, titulo, mensaje, tipo, tarea_institucional_id, estado, leida
        ) VALUES (
            v_docente, v_uid, 'Nueva tarea asignada', p_titulo, 'tarea', v_tarea_id, 'pendiente', false
        );
    END LOOP;

    RETURN v_tarea_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. ÍNDICES DE RENDIMIENTO
CREATE INDEX IF NOT EXISTS idx_tareas_inst_centro_id ON public.tareas_institucionales(centro_id);
CREATE INDEX IF NOT EXISTS idx_tareas_inst_fecha_limite ON public.tareas_institucionales(fecha_limite);
CREATE INDEX IF NOT EXISTS idx_tarea_docente_tarea_id ON public.tarea_docente(tarea_id);
CREATE INDEX IF NOT EXISTS idx_tarea_docente_docente_id ON public.tarea_docente(docente_id);
CREATE INDEX IF NOT EXISTS idx_tarea_docente_estado ON public.tarea_docente(estado);
