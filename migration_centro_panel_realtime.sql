-- MIGRATION: Realtime + índices para el Panel de Dirección
-- Habilita la actualización automática de la sección "Códigos de acceso"
-- cuando se insertan/modifican/eliminan registros en codigos_acceso_centro.
-- NO modifica las políticas RLS existentes.

-- 1. Incluir las tablas en la publicación de Realtime (idempotente)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime'
          AND schemaname = 'public'
          AND tablename = 'codigos_acceso_centro'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.codigos_acceso_centro;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime'
          AND schemaname = 'public'
          AND tablename = 'centros'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.centros;
    END IF;
END $$;

-- 2. Índice de rendimiento para consultas por centro
CREATE INDEX IF NOT EXISTS idx_codigos_acceso_centro_centro_id
    ON public.codigos_acceso_centro(centro_id);

-- 3. Asegurar que la columna updated_at exista en centros
ALTER TABLE public.centros ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now());
