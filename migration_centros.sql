-- Migration: Refactor educational centers to a shared "centros" table

-- 1. Create the new "centros" table
CREATE TABLE IF NOT EXISTS centros (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre TEXT NOT NULL,
    codigo_centro TEXT,
    tanda TEXT,
    telefono TEXT,
    distrito_educativo TEXT,
    regional_educacion TEXT,
    provincia TEXT,
    municipio TEXT,
    created_by UUID REFERENCES perfiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Enable Row Level Security (RLS) on centros
ALTER TABLE centros ENABLE ROW LEVEL SECURITY;

-- Create appropriate RLS policies for security and shared usage
-- Anyone authenticated can read centros to support autocomplete/sharing
CREATE POLICY "Permitir lectura publica de centros" 
ON centros FOR SELECT 
USING (true);

-- Authenticated users can insert a new center
CREATE POLICY "Permitir insercion a usuarios autenticados" 
ON centros FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

-- Creador or users linked to the center can update it
CREATE POLICY "Permitir actualizacion a creador o vinculados" 
ON centros FOR UPDATE 
USING (
    auth.uid() = created_by 
    OR EXISTS (
        SELECT 1 FROM perfiles 
        WHERE perfiles.id = auth.uid() 
        AND perfiles.centro_id = centros.id
    )
);

-- 2. Modify the "perfiles" table to add "centro_id" relation
ALTER TABLE perfiles ADD COLUMN IF NOT EXISTS centro_id UUID REFERENCES centros(id);

-- Create index on centro_id to optimize joins and queries
CREATE INDEX IF NOT EXISTS idx_perfiles_centro_id ON perfiles(centro_id);

-- 3. Data Migration: Extract existing school names and nested attributes from profile bio JSON
DO $$
DECLARE
    profile_rec RECORD;
    existing_centro_id UUID;
    bio_data JSONB;
    school_name TEXT;
BEGIN
    FOR profile_rec IN SELECT * FROM perfiles LOOP
        -- Retrieve school name or fallback
        school_name := COALESCE(profile_rec.instituto, profile_rec.institucion, 'Mi Instituto');
        
        -- Parse bio JSON to extract extra fields
        BEGIN
            bio_data := profile_rec.bio::jsonb;
        EXCEPTION WHEN OTHERS THEN
            bio_data := '{}'::jsonb;
        END;

        -- Check if a center with the same name exists (trimmed, case-insensitive)
        SELECT id INTO existing_centro_id FROM centros 
        WHERE LOWER(TRIM(REGEXP_REPLACE(nombre, '\s+', ' ', 'g'))) = LOWER(TRIM(REGEXP_REPLACE(school_name, '\s+', ' ', 'g')))
        LIMIT 1;

        -- If it doesn't exist, create it
        IF existing_centro_id IS NULL THEN
            INSERT INTO centros (
                nombre,
                codigo_centro,
                tanda,
                telefono,
                distrito_educativo,
                regional_educacion,
                provincia,
                municipio,
                created_by
            ) VALUES (
                school_name,
                COALESCE(bio_data->>'codigoCentro', ''),
                COALESCE(bio_data->>'tanda', 'Jornada Extendida'),
                COALESCE(bio_data->>'telefonoCentro', ''),
                COALESCE(bio_data->>'distrito', ''),
                COALESCE(bio_data->>'regional', ''),
                COALESCE(bio_data->>'provincia', ''),
                COALESCE(bio_data->>'municipio', ''),
                profile_rec.id
            ) RETURNING id INTO existing_centro_id;
        END IF;

        -- Update the profile reference
        UPDATE perfiles SET centro_id = existing_centro_id WHERE id = profile_rec.id;
    END LOOP;
END $$;

-- 4. Clean up columns after successful migration
ALTER TABLE perfiles DROP COLUMN IF EXISTS instituto;
ALTER TABLE perfiles DROP COLUMN IF EXISTS institucion;
