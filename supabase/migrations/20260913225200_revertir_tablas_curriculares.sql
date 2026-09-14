-- Rollback Seguro de la Migración Anterior
-- Elimina en orden inverso para respetar las dependencias

DROP TABLE IF EXISTS public.actividad_indicadores CASCADE;
DROP TABLE IF EXISTS public.curr_indicadores CASCADE;
DROP TABLE IF EXISTS public.curr_asignaturas CASCADE;
DROP TABLE IF EXISTS public.curr_grados CASCADE;
DROP TABLE IF EXISTS public.curr_niveles CASCADE;
DROP TABLE IF EXISTS public.curr_versiones CASCADE;
