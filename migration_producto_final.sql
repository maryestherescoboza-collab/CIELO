-- MIGRACIÓN: Agregar columna 'is_producto_final' a la tabla 'public.actividades'
-- Identifica la actividad especial "Producto Final" que se auto-crea por curso+asignatura+periodo.
-- Nullable: las actividades existentes no se modifican (queda FALSE por defecto).

ALTER TABLE public.actividades
ADD COLUMN IF NOT EXISTS is_producto_final BOOLEAN DEFAULT FALSE;
