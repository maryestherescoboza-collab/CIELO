-- Especificaciones curriculares por docente (módulo Plan de Clases)
--
-- Estructura:
--   pc_especificaciones          → configuración BASE por usuario + curso + asignatura
--                                  (las 7 Competencias Fundamentales con su CE: código + descriptor)
--   pc_especificacion_periodos   → selecciones POR PERÍODO (CE del período, contenidos, indicadores)
--
-- Aislamiento: usuario + curso + asignatura + período (UNIQUE constraints).
-- Los indicadores guardan el id real de curr_indicadores y los contenidos el id de curr_contenidos.

CREATE TABLE IF NOT EXISTS public.pc_especificaciones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    curso_id INTEGER NOT NULL REFERENCES public.cursos(id) ON DELETE CASCADE,
    curso_docente_id INTEGER,
    grado TEXT NOT NULL,
    seccion TEXT NOT NULL,
    asignatura TEXT NOT NULL,
    competencias JSONB NOT NULL DEFAULT '[]'::jsonb,
    periodo_actual TEXT,
    paso_actual SMALLINT NOT NULL DEFAULT 1,
    creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    actualizado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_pc_especificaciones_usuario_curso_asig UNIQUE (usuario_id, curso_id, asignatura)
);

CREATE INDEX IF NOT EXISTS idx_pc_especificaciones_usuario
    ON public.pc_especificaciones(usuario_id);

CREATE TABLE IF NOT EXISTS public.pc_especificacion_periodos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    especificacion_id UUID NOT NULL REFERENCES public.pc_especificaciones(id) ON DELETE CASCADE,
    periodo TEXT NOT NULL,
    competencias_especificas JSONB NOT NULL DEFAULT '[]'::jsonb,
    contenidos JSONB NOT NULL DEFAULT '[]'::jsonb,
    indicadores JSONB NOT NULL DEFAULT '[]'::jsonb,
    actualizado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_pc_especificacion_periodos UNIQUE (especificacion_id, periodo)
);

CREATE INDEX IF NOT EXISTS idx_pc_especificacion_periodos_especificacion
    ON public.pc_especificacion_periodos(especificacion_id);

-- RLS: cada docente solo ve/edita sus propias especificaciones
ALTER TABLE public.pc_especificaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pc_especificacion_periodos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pc_especificaciones_docente" ON public.pc_especificaciones;
CREATE POLICY "pc_especificaciones_docente"
ON public.pc_especificaciones
FOR ALL
TO authenticated
USING (usuario_id = auth.uid())
WITH CHECK (usuario_id = auth.uid());

DROP POLICY IF EXISTS "pc_especificacion_periodos_docente" ON public.pc_especificacion_periodos;
CREATE POLICY "pc_especificacion_periodos_docente"
ON public.pc_especificacion_periodos
FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.pc_especificaciones e
        WHERE e.id = pc_especificacion_periodos.especificacion_id
          AND e.usuario_id = auth.uid()
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.pc_especificaciones e
        WHERE e.id = pc_especificacion_periodos.especificacion_id
          AND e.usuario_id = auth.uid()
    )
);
