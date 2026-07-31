-- SCRIPT DE MIGRACIÓN: ELIMINAR FUNCIONALIDAD ESTADO DE ÁNIMO
-- Ejecuta este script en el editor SQL de Supabase (Dashboard -> SQL Editor)

-- 1. Eliminar la tabla estados_animo (esto eliminará automáticamente políticas RLS, índices y restricciones asociadas)
DROP TABLE IF EXISTS public.estados_animo CASCADE;
