-- 1. Actualizar tabla CENTROS
ALTER TABLE public.centros ADD COLUMN IF NOT EXISTS estado TEXT DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'activo', 'suspendido', 'cancelado'));
ALTER TABLE public.centros ADD COLUMN IF NOT EXISTS afiliado BOOLEAN DEFAULT false;

-- 2. Crear tabla CENTRO_ROLES (Para jerarquía de administración)
CREATE TABLE IF NOT EXISTS public.centro_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    centro_id UUID NOT NULL REFERENCES public.centros(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    rol TEXT NOT NULL CHECK (rol IN ('director', 'administrador', 'docente')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    UNIQUE(centro_id, user_id)
);

ALTER TABLE public.centro_roles ENABLE ROW LEVEL SECURITY;

-- Políticas de lectura: Todos los docentes pueden ver los roles de su propio centro
CREATE POLICY "Lectura pública de roles de mi centro" 
ON public.centro_roles FOR SELECT TO authenticated
USING (true); -- Alternativamente, restringir a usuarios del mismo centro_id

-- Políticas de escritura: Solo directores o creadores del centro pueden asignar roles
CREATE POLICY "Gestión de roles por director" 
ON public.centro_roles FOR ALL TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.centro_roles cr 
        WHERE cr.centro_id = centro_roles.centro_id 
        AND cr.user_id = auth.uid() 
        AND cr.rol IN ('director', 'administrador')
    )
    OR
    EXISTS (
        SELECT 1 FROM public.centros c
        WHERE c.id = centro_roles.centro_id
        AND c.created_by = auth.uid() -- Permitir al creador original gestionar los primeros roles
    )
);

-- 3. Crear tabla CODIGOS_ACCESO_CENTRO
CREATE TABLE IF NOT EXISTS public.codigos_acceso_centro (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    centro_id UUID NOT NULL REFERENCES public.centros(id) ON DELETE CASCADE,
    codigo TEXT NOT NULL UNIQUE,
    usos_restantes INTEGER, -- NULL significa ilimitado
    valido_hasta TIMESTAMP WITH TIME ZONE, -- NULL significa sin expiración
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    estado TEXT DEFAULT 'activo' CHECK (estado IN ('activo', 'inactivo', 'expirado'))
);

ALTER TABLE public.codigos_acceso_centro ENABLE ROW LEVEL SECURITY;

-- Solo los directores/administradores pueden gestionar o ver los códigos de acceso de su centro
CREATE POLICY "Gestión de códigos por director" 
ON public.codigos_acceso_centro FOR ALL TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.centro_roles cr 
        WHERE cr.centro_id = codigos_acceso_centro.centro_id 
        AND cr.user_id = auth.uid() 
        AND cr.rol IN ('director', 'administrador')
    )
);

-- 4. Crear tabla SUSCRIPCIONES
CREATE TABLE IF NOT EXISTS public.suscripciones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tipo TEXT NOT NULL CHECK (tipo IN ('individual', 'institucional', 'promocional')),
    estado TEXT NOT NULL CHECK (estado IN ('activa', 'pendiente', 'vencida', 'cancelada')),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE, -- NULL si es institucional
    centro_id UUID REFERENCES public.centros(id) ON DELETE CASCADE, -- NULL si es individual
    fecha_inicio TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    fecha_fin TIMESTAMP WITH TIME ZONE,
    tilopay_customer_id TEXT,
    tilopay_subscription_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.suscripciones ENABLE ROW LEVEL SECURITY;

-- Políticas de lectura de suscripciones:
-- Un usuario puede ver su propia suscripción individual, o la suscripción de su centro.
CREATE POLICY "Lectura propia y de mi centro" 
ON public.suscripciones FOR SELECT TO authenticated
USING (
    user_id = auth.uid() 
    OR 
    centro_id IN (
        SELECT centro_id FROM public.perfiles WHERE perfiles.id = auth.uid()
    )
);

-- Las suscripciones institucionales serán gestionadas por el backend (webhooks) y directores
CREATE POLICY "Edición de suscripciones" 
ON public.suscripciones FOR ALL TO authenticated
USING (
    user_id = auth.uid() -- Puede cancelar su propia sub
    OR
    EXISTS (
        SELECT 1 FROM public.centro_roles cr 
        WHERE cr.centro_id = suscripciones.centro_id 
        AND cr.user_id = auth.uid() 
        AND cr.rol IN ('director', 'administrador')
    )
);

-- 5. Actualizar políticas de RLS de CENTROS
-- Los centros ya son públicos para leer. Solo restringiremos la edición.
DROP POLICY IF EXISTS "Permitir actualizacion a creador o vinculados" ON public.centros;

CREATE POLICY "Permitir actualizacion a directores" 
ON public.centros FOR UPDATE TO authenticated
USING (
    created_by = auth.uid()
    OR
    EXISTS (
        SELECT 1 FROM public.centro_roles cr 
        WHERE cr.centro_id = centros.id 
        AND cr.user_id = auth.uid() 
        AND cr.rol IN ('director', 'administrador')
    )
);

-- 6. Trigger para asignar rol de director al creador de un nuevo centro
CREATE OR REPLACE FUNCTION public.handle_new_centro()
RETURNS trigger AS $$
BEGIN
    -- Si el creador (auth.uid) no es nulo, insertarlo como director del centro
    -- Nota: Al crearse desde un cliente REST asume session auth.uid()
    IF auth.uid() IS NOT NULL THEN
        INSERT INTO public.centro_roles (centro_id, user_id, rol)
        VALUES (NEW.id, auth.uid(), 'director');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_centro_created ON public.centros;
CREATE TRIGGER on_centro_created
    AFTER INSERT ON public.centros
    FOR EACH ROW EXECUTE PROCEDURE public.handle_new_centro();
