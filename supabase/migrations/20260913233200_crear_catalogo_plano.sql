-- Migración: Catálogo Curricular Plano + Actividades (JSONB)

-- 1. Crear la tabla plana para el catálogo curricular global de CIELO
CREATE TABLE IF NOT EXISTS public.curr_indicadores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    grado TEXT NOT NULL,
    asignatura TEXT NOT NULL,
    competencia TEXT NOT NULL,
    codigo TEXT NULL,
    descripcion TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Índice para maximizar la velocidad de lectura por curso
CREATE INDEX IF NOT EXISTS idx_curr_ind_grado_asig_comp 
ON public.curr_indicadores (grado, asignatura, competencia) 
WHERE is_active = true;

-- 3. Habilitar RLS en la tabla del catálogo
ALTER TABLE public.curr_indicadores ENABLE ROW LEVEL SECURITY;

-- 4. Política RLS: Lectura pública (Cualquier usuario autenticado puede leer el catálogo global)
CREATE POLICY "Lectura pública para curr_indicadores"
ON public.curr_indicadores FOR SELECT TO authenticated
USING (true);
-- Nota: CIELO no proveerá permisos de INSERT, UPDATE o DELETE a los usuarios mediante RLS, 
-- por lo que por defecto estarán denegados. Solo admins/Service Role podrán modificar el catálogo.

-- 5. Alterar la tabla de actividades para soportar múltiples indicadores
ALTER TABLE public.actividades 
ADD COLUMN IF NOT EXISTS indicadores_json JSONB DEFAULT '[]'::jsonb;

-- Nota sobre actividades históricas:
-- El campo original `indicador` de tipo texto permanece intacto. 
-- El sistema priorizará `indicadores_json` si contiene elementos.
