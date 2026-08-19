-- FASE 11: MIGRACIÓN DE BASE DE DATOS
-- Agregar columna 'indicador' a la tabla 'public.actividades'

ALTER TABLE public.actividades
ADD COLUMN IF NOT EXISTS indicador TEXT;
