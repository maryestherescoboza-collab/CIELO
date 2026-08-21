-- migration_add_distrito_educativo.sql
-- Agrega la columna distrito_educativo a la tabla centros de manera segura

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema='public' AND table_name='centros' AND column_name='distrito_educativo') THEN
        ALTER TABLE public.centros ADD COLUMN distrito_educativo text;
    END IF;
END $$;
