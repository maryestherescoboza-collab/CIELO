-- Crear la tabla de competencias específicas para CIELO
CREATE TABLE IF NOT EXISTS public.curr_competencias_especificas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nivel TEXT NOT NULL,
    grado TEXT NOT NULL,
    asignatura TEXT NOT NULL,
    bloque TEXT NOT NULL CHECK (bloque IN ('BC1', 'BC2', 'BC3', 'BC4')),
    competencia_fundamental TEXT NOT NULL,
    codigo TEXT NOT NULL,
    descriptor TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_curr_ce_ident UNIQUE (nivel, grado, asignatura, competencia_fundamental)
);

-- Trigger para updated_at en curr_competencias_especificas
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS curr_competencias_especificas_updated_at ON public.curr_competencias_especificas;

CREATE TRIGGER curr_competencias_especificas_updated_at
    BEFORE UPDATE ON public.curr_competencias_especificas
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- Habilitar RLS en curr_competencias_especificas
ALTER TABLE public.curr_competencias_especificas ENABLE ROW LEVEL SECURITY;

-- Política de lectura pública para curr_competencias_especificas
CREATE POLICY "Lectura pública para curr_competencias_especificas"
ON public.curr_competencias_especificas FOR SELECT TO authenticated
USING (true);


-- Crear la tabla puente para relacionar CE con indicadores (relación 1:N / N:M de forma flexible)
CREATE TABLE IF NOT EXISTS public.curr_ce_indicadores (
    ce_id UUID NOT NULL REFERENCES public.curr_competencias_especificas(id) ON DELETE CASCADE,
    indicador_id UUID NOT NULL REFERENCES public.curr_indicadores(id) ON DELETE CASCADE,
    PRIMARY KEY (ce_id, indicador_id)
);

-- Habilitar RLS en la tabla puente
ALTER TABLE public.curr_ce_indicadores ENABLE ROW LEVEL SECURITY;

-- Política de lectura pública para la tabla puente
CREATE POLICY "Lectura pública para curr_ce_indicadores"
ON public.curr_ce_indicadores FOR SELECT TO authenticated
USING (true);
