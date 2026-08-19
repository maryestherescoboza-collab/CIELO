-- Añadir columna recursos a la tabla secuencias como arreglo JSONB
ALTER TABLE public.secuencias
ADD COLUMN IF NOT EXISTS recursos jsonb NOT NULL DEFAULT '[]'::jsonb;
