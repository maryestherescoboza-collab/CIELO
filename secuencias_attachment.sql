-- SCRIPT DE MIGRACIÓN: ADJUNTOS EN SECUENCIAS
-- Ejecuta este script en el editor SQL de Supabase (Dashboard -> SQL Editor)

-- 1. Agregar columnas para la referencia de archivos a la tabla secuencias
ALTER TABLE public.secuencias ADD COLUMN IF NOT EXISTS archivo_url TEXT;
ALTER TABLE public.secuencias ADD COLUMN IF NOT EXISTS archivo_nombre TEXT;
ALTER TABLE public.secuencias ADD COLUMN IF NOT EXISTS archivo_size INTEGER;
ALTER TABLE public.secuencias ADD COLUMN IF NOT EXISTS archivo_tipo TEXT;
ALTER TABLE public.secuencias ADD COLUMN IF NOT EXISTS archivo_fecha_carga TIMESTAMPTZ;

-- 2. Asegurar que los permisos y RLS estén actualizados
GRANT ALL ON TABLE public.secuencias TO authenticated;
