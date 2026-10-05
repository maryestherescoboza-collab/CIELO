-- Migration: Add fields to actividades and create asistencia_diaria table

ALTER TABLE actividades 
ADD COLUMN IF NOT EXISTS hora_inicio TIME,
ADD COLUMN IF NOT EXISTS duracion_minutos INTEGER DEFAULT 60,
ADD COLUMN IF NOT EXISTS tipo_calendario TEXT DEFAULT 'actividad',
ADD COLUMN IF NOT EXISTS color_calendario TEXT DEFAULT 'green';

CREATE TABLE IF NOT EXISTS asistencia_diaria (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    curso_id INTEGER NOT NULL REFERENCES cursos(id) ON DELETE CASCADE,
    fecha DATE NOT NULL,
    estado_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    user_id UUID REFERENCES perfiles(user_id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(curso_id, fecha)
);

ALTER TABLE asistencia_diaria ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios pueden ver asistencia de sus cursos"
    ON asistencia_diaria FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM curso_docentes cd 
            WHERE cd.curso_id = asistencia_diaria.curso_id AND cd.docente_id = auth.uid()
        )
    );

CREATE POLICY "Usuarios pueden insertar asistencia de sus cursos"
    ON asistencia_diaria FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM curso_docentes cd 
            WHERE cd.curso_id = asistencia_diaria.curso_id AND cd.docente_id = auth.uid()
        )
    );

CREATE POLICY "Usuarios pueden actualizar asistencia de sus cursos"
    ON asistencia_diaria FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM curso_docentes cd 
            WHERE cd.curso_id = asistencia_diaria.curso_id AND cd.docente_id = auth.uid()
        )
    );
