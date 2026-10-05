ALTER TABLE curso_docentes ADD COLUMN IF NOT EXISTS horarios JSONB DEFAULT '[]'::jsonb;
