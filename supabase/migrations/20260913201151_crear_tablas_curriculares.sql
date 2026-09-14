-- 1. Catálogo de Versiones
CREATE TABLE IF NOT EXISTS public.curr_versiones (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre TEXT NOT NULL,
    descripcion TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Catálogo de Niveles
CREATE TABLE IF NOT EXISTS public.curr_niveles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Catálogo de Grados
CREATE TABLE IF NOT EXISTS public.curr_grados (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nivel_id UUID REFERENCES public.curr_niveles(id) ON DELETE CASCADE,
    nombre TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Catálogo de Asignaturas
CREATE TABLE IF NOT EXISTS public.curr_asignaturas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    grado_id UUID REFERENCES public.curr_grados(id) ON DELETE CASCADE,
    nombre TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Catálogo de Indicadores de Logro
CREATE TABLE IF NOT EXISTS public.curr_indicadores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    asignatura_id UUID REFERENCES public.curr_asignaturas(id) ON DELETE CASCADE,
    competencia TEXT NOT NULL,
    descripcion TEXT NOT NULL,
    version_id UUID REFERENCES public.curr_versiones(id) ON DELETE CASCADE,
    centro_id UUID NULL, -- Para indicadores personalizados por centro
    user_id UUID NULL,   -- Para indicadores personalizados por usuario
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Tabla Puente: Actividades <-> Indicadores
CREATE TABLE IF NOT EXISTS public.actividad_indicadores (
    actividad_id INT REFERENCES public.actividades(id) ON DELETE CASCADE,
    indicador_id UUID REFERENCES public.curr_indicadores(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (actividad_id, indicador_id)
);

-- Índices de Rendimiento
CREATE INDEX IF NOT EXISTS idx_act_ind_indicador ON public.actividad_indicadores(indicador_id);
CREATE INDEX IF NOT EXISTS idx_curr_ind_asignatura ON public.curr_indicadores(asignatura_id, version_id) WHERE is_active = true;

-- Habilitar RLS
ALTER TABLE public.curr_versiones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.curr_niveles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.curr_grados ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.curr_asignaturas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.curr_indicadores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.actividad_indicadores ENABLE ROW LEVEL SECURITY;

-- Políticas de Seguridad (RLS)

-- Versiones (Lectura pública)
CREATE POLICY "Lectura pública para curr_versiones" 
ON public.curr_versiones FOR SELECT TO authenticated USING (true);

-- Niveles (Lectura pública)
CREATE POLICY "Lectura pública para curr_niveles" 
ON public.curr_niveles FOR SELECT TO authenticated USING (true);

-- Grados (Lectura pública)
CREATE POLICY "Lectura pública para curr_grados" 
ON public.curr_grados FOR SELECT TO authenticated USING (true);

-- Asignaturas (Lectura pública)
CREATE POLICY "Lectura pública para curr_asignaturas" 
ON public.curr_asignaturas FOR SELECT TO authenticated USING (true);

-- Indicadores (Lectura pública si son globales, o filtrados si son personalizados)
CREATE POLICY "Lectura de indicadores globales y propios"
ON public.curr_indicadores FOR SELECT TO authenticated
USING (
    centro_id IS NULL AND user_id IS NULL
    OR user_id = auth.uid()
);
-- Nota: Si necesitamos que vean los del centro habría que hacer un subquery para verificar el centro del usuario, pero por ahora lo mantenemos simple.

-- Actividad_Indicadores
CREATE POLICY "Lectura pública de actividad_indicadores"
ON public.actividad_indicadores FOR SELECT TO authenticated USING (true);

CREATE POLICY "Insertar en actividad_indicadores"
ON public.actividad_indicadores FOR INSERT TO authenticated 
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.actividades a 
        WHERE a.id = actividad_id AND a.user_id = auth.uid()
    )
);

CREATE POLICY "Eliminar en actividad_indicadores"
ON public.actividad_indicadores FOR DELETE TO authenticated 
USING (
    EXISTS (
        SELECT 1 FROM public.actividades a 
        WHERE a.id = actividad_id AND a.user_id = auth.uid()
    )
);
