-- ==============================================================================
-- MIGRACIÓN: AGREGAR PREFERENCIA DE TUTORIAL FLOTANTE DESCARTADO
-- Permite persistir la decisión del usuario de no volver a ver el tutorial flotante
-- ==============================================================================

ALTER TABLE public.perfiles 
ADD COLUMN IF NOT EXISTS tutorial_secuencia_descartado boolean DEFAULT false;
