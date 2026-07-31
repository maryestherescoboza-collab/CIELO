-- Esta migración utiliza PostgreSQL y debe ejecutarse en Supabase SQL Editor.
-- Los diagnósticos de la extensión mssql de VS Code pueden ser falsos positivos.

-- 1. Agregar la columna plantilla_id de manera segura si no existe (tipo BIGINT correspondiente al tipo ID de plantillas)
ALTER TABLE public.descriptores_rubrica 
ADD COLUMN IF NOT EXISTS plantilla_id BIGINT;

-- 2. Agregar la restricción de clave foránea de forma segura usando un bloque DO condicional compatible con PostgreSQL
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'fk_descriptores_rubrica_plantilla'
    ) THEN
        ALTER TABLE public.descriptores_rubrica
        ADD CONSTRAINT fk_descriptores_rubrica_plantilla
        FOREIGN KEY (plantilla_id)
        REFERENCES public.plantillas(id)
        ON DELETE CASCADE;
    END IF;
END $$;

-- 3. Migrar los descriptores existentes asociándolos con sus respectivas plantillas
-- analizando el JSONB de datos de cada plantilla de rúbrica
UPDATE public.descriptores_rubrica d
SET plantilla_id = p.id
FROM public.plantillas p
WHERE p.tipo = 'rubrica'
  AND p.datos->'descriptores' IS NOT NULL
  AND EXISTS (
    SELECT 1 
    FROM jsonb_array_elements(p.datos->'descriptores') elem
    WHERE (elem->>'id')::text = d.id::text
  );

-- 4. Crear un índice único parcial condicionalmente asegurándonos de que no existan duplicados
DO $$
DECLARE
    has_duplicates BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1 
        FROM public.descriptores_rubrica 
        WHERE plantilla_id IS NOT NULL 
        GROUP BY plantilla_id, bc 
        HAVING COUNT(*) > 1
    ) INTO has_duplicates;

    IF NOT has_duplicates THEN
        IF NOT EXISTS (
            SELECT 1 FROM pg_class WHERE relname = 'idx_unique_plantilla_bc'
        ) THEN
            CREATE UNIQUE INDEX idx_unique_plantilla_bc 
            ON public.descriptores_rubrica (plantilla_id, bc) 
            WHERE plantilla_id IS NOT NULL;
        END IF;
    ELSE
        RAISE NOTICE 'Existen registros duplicados para la combinación (plantilla_id, bc). Resuelva los duplicados antes de aplicar la restricción única.';
    END IF;
END $$;
