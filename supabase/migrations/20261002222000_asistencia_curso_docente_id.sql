-- 1. Add curso_docente_id to asistencia_sesiones
ALTER TABLE asistencia_sesiones ADD COLUMN IF NOT EXISTS curso_docente_id INTEGER REFERENCES curso_docentes(id) ON DELETE CASCADE;

-- 2. Populate existing rows (if any) with a matching curso_docente_id to avoid nulls
UPDATE asistencia_sesiones s
SET curso_docente_id = cd.id
FROM curso_docentes cd
WHERE s.curso_id = cd.curso_id AND s.user_id = cd.docente_id
AND s.curso_docente_id IS NULL;

-- 3. Make curso_docente_id NOT NULL
-- (If there are still nulls because of mismatched data, this will fail. We delete orphaned sessions if any)
DELETE FROM asistencia_sesiones WHERE curso_docente_id IS NULL;

ALTER TABLE asistencia_sesiones ALTER COLUMN curso_docente_id SET NOT NULL;

-- 4. Drop old constraint and create new constraint
ALTER TABLE asistencia_sesiones DROP CONSTRAINT IF EXISTS asistencia_sesiones_curso_id_user_id_fecha_key;
ALTER TABLE asistencia_sesiones DROP CONSTRAINT IF EXISTS asistencia_sesiones_curso_docente_fecha_unique;
ALTER TABLE asistencia_sesiones ADD CONSTRAINT asistencia_sesiones_curso_docente_fecha_unique UNIQUE (curso_docente_id, fecha);
