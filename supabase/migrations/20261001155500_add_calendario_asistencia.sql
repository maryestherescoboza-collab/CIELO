-- Migration: Refactor asistencia to implicit presence + explicit exceptions

-- 1. Create asistencia_sesiones
CREATE TABLE IF NOT EXISTS asistencia_sesiones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    curso_id INTEGER NOT NULL REFERENCES cursos(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES perfiles(user_id) ON DELETE CASCADE,
    fecha DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(curso_id, user_id, fecha)
);

-- 2. Create asistencia_excepciones
CREATE TABLE IF NOT EXISTS asistencia_excepciones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sesion_id UUID NOT NULL REFERENCES asistencia_sesiones(id) ON DELETE CASCADE,
    estudiante_id INTEGER NOT NULL REFERENCES estudiantes(id) ON DELETE CASCADE,
    estado TEXT NOT NULL CHECK (estado IN ('F', 'A', 'J')), -- F=Ausente, A=Tardanza, J=Excusa
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(sesion_id, estudiante_id)
);

-- 3. Migrate any existing data from asistencia_diaria (if any exists)
DO $$
DECLARE
    diaria_record RECORD;
    new_sesion_id UUID;
    est_id TEXT;
    est_estado TEXT;
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'asistencia_diaria') THEN
        FOR diaria_record IN SELECT * FROM asistencia_diaria LOOP
            -- Create session
            INSERT INTO asistencia_sesiones (curso_id, user_id, fecha, created_at)
            VALUES (diaria_record.curso_id, diaria_record.user_id, diaria_record.fecha, diaria_record.created_at)
            ON CONFLICT (curso_id, user_id, fecha) DO UPDATE SET updated_at = now()
            RETURNING id INTO new_sesion_id;

            -- Insert exceptions
            FOR est_id, est_estado IN SELECT key, value FROM jsonb_each_text(diaria_record.estado_json) LOOP
                IF est_estado IN ('F', 'A', 'J') THEN
                    INSERT INTO asistencia_excepciones (sesion_id, estudiante_id, estado, created_at)
                    VALUES (new_sesion_id, est_id::integer, est_estado, diaria_record.created_at)
                    ON CONFLICT (sesion_id, estudiante_id) DO NOTHING;
                END IF;
            END LOOP;
        END LOOP;
    END IF;
END $$;

-- 4. Drop old table
DROP TABLE IF EXISTS asistencia_diaria;

-- 5. Enable RLS
ALTER TABLE asistencia_sesiones ENABLE ROW LEVEL SECURITY;
ALTER TABLE asistencia_excepciones ENABLE ROW LEVEL SECURITY;

-- 6. Policies for asistencia_sesiones
DROP POLICY IF EXISTS "Usuarios pueden ver sus sesiones" ON asistencia_sesiones;
CREATE POLICY "Usuarios pueden ver sus sesiones"
    ON asistencia_sesiones FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM curso_docentes cd 
            WHERE cd.curso_id = asistencia_sesiones.curso_id AND cd.docente_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Usuarios pueden crear sesiones" ON asistencia_sesiones;
CREATE POLICY "Usuarios pueden crear sesiones"
    ON asistencia_sesiones FOR INSERT
    WITH CHECK (
        auth.uid() = user_id AND
        EXISTS (
            SELECT 1 FROM curso_docentes cd 
            WHERE cd.curso_id = asistencia_sesiones.curso_id AND cd.docente_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Usuarios pueden actualizar sesiones" ON asistencia_sesiones;
CREATE POLICY "Usuarios pueden actualizar sesiones"
    ON asistencia_sesiones FOR UPDATE
    USING (
        auth.uid() = user_id AND
        EXISTS (
            SELECT 1 FROM curso_docentes cd 
            WHERE cd.curso_id = asistencia_sesiones.curso_id AND cd.docente_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Usuarios pueden eliminar sesiones" ON asistencia_sesiones;
CREATE POLICY "Usuarios pueden eliminar sesiones"
    ON asistencia_sesiones FOR DELETE
    USING (
        auth.uid() = user_id AND
        EXISTS (
            SELECT 1 FROM curso_docentes cd 
            WHERE cd.curso_id = asistencia_sesiones.curso_id AND cd.docente_id = auth.uid()
        )
    );

-- 7. Policies for asistencia_excepciones
DROP POLICY IF EXISTS "Usuarios pueden ver excepciones de sus sesiones" ON asistencia_excepciones;
CREATE POLICY "Usuarios pueden ver excepciones de sus sesiones"
    ON asistencia_excepciones FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM asistencia_sesiones s
            WHERE s.id = asistencia_excepciones.sesion_id AND s.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Usuarios pueden crear excepciones" ON asistencia_excepciones;
CREATE POLICY "Usuarios pueden crear excepciones"
    ON asistencia_excepciones FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM asistencia_sesiones s
            WHERE s.id = asistencia_excepciones.sesion_id AND s.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Usuarios pueden actualizar excepciones" ON asistencia_excepciones;
CREATE POLICY "Usuarios pueden actualizar excepciones"
    ON asistencia_excepciones FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM asistencia_sesiones s
            WHERE s.id = asistencia_excepciones.sesion_id AND s.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Usuarios pueden eliminar excepciones" ON asistencia_excepciones;
CREATE POLICY "Usuarios pueden eliminar excepciones"
    ON asistencia_excepciones FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM asistencia_sesiones s
            WHERE s.id = asistencia_excepciones.sesion_id AND s.user_id = auth.uid()
        )
    );
