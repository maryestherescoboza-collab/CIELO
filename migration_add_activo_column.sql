-- Añadir columna 'activo' para soft deletes en las tablas correspondientes
ALTER TABLE public.secuencias ADD COLUMN IF NOT EXISTS activo BOOLEAN DEFAULT true;
ALTER TABLE public.incidencias ADD COLUMN IF NOT EXISTS activo BOOLEAN DEFAULT true;

-- Asegurar que los registros existentes sean marcados como activos
UPDATE public.secuencias SET activo = true WHERE activo IS NULL;
UPDATE public.incidencias SET activo = true WHERE activo IS NULL;
