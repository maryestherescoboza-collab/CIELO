-- MIGRACIÓN: Agregar columna 'producto' a la tabla 'public.actividades'
-- Almacena el producto o evidencia de aprendizaje detectado por la IA
-- durante la importación de actividades desde PDF.
-- Nullable: las actividades existentes no se modifican (queda NULL).

ALTER TABLE public.actividades
ADD COLUMN IF NOT EXISTS producto TEXT;
