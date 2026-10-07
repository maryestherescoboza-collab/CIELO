-- Migration to add asistencia integration for activities

-- 1. Add the column
ALTER TABLE asistencia_excepciones ADD COLUMN IF NOT EXISTS actividad_origen_id bigint REFERENCES actividades(id) ON DELETE CASCADE;

-- 2. Trigger function for calificaciones
CREATE OR REPLACE FUNCTION trg_sync_inasistencia_actividad()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_actividad RECORD;
  v_curso_docente_id bigint;
  v_sesion_id uuid;
  v_existing_id uuid;
  v_is_inasistencia boolean;
  v_was_inasistencia boolean;
  v_other_act_id bigint;
BEGIN
  -- We only care if this is about calificaciones
  -- Inasistencia occurs when puntaje = 0 AND activo = true
  
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    v_is_inasistencia := (NEW.puntaje = 0 AND NEW.activo = true);
  ELSE
    v_is_inasistencia := false;
  END IF;

  IF TG_OP = 'UPDATE' OR TG_OP = 'DELETE' THEN
    v_was_inasistencia := (OLD.puntaje = 0 AND OLD.activo = true);
  ELSE
    v_was_inasistencia := false;
  END IF;

  -- If state hasn't changed regarding inasistencia, do nothing
  IF TG_OP = 'UPDATE' AND v_is_inasistencia = v_was_inasistencia THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- Find the activity details
  SELECT * INTO v_actividad FROM actividades WHERE id = COALESCE(NEW.actividad_id, OLD.actividad_id);
  
  IF NOT FOUND OR v_actividad.activo = false THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- 1. Si ahora es inasistencia (Insert o Update)
  IF v_is_inasistencia THEN
    -- Find curso_docente_id
    SELECT id INTO v_curso_docente_id 
    FROM curso_docentes 
    WHERE curso_id = v_actividad.curso_id 
      AND docente_id = v_actividad.user_id 
      AND asignatura = v_actividad.asignatura
      AND activo = true
    LIMIT 1;

    IF v_curso_docente_id IS NULL THEN
      RETURN NEW;
    END IF;

    -- Look for existing session
    SELECT id INTO v_sesion_id 
    FROM asistencia_sesiones 
    WHERE curso_docente_id = v_curso_docente_id 
      AND fecha = v_actividad.fecha;

    IF v_sesion_id IS NULL THEN
      INSERT INTO asistencia_sesiones (curso_id, user_id, fecha, curso_docente_id)
      VALUES (v_actividad.curso_id, v_actividad.user_id, v_actividad.fecha, v_curso_docente_id)
      RETURNING id INTO v_sesion_id;
    END IF;

    -- Check if there's already an exception for this student in this session
    SELECT id INTO v_existing_id 
    FROM asistencia_excepciones 
    WHERE sesion_id = v_sesion_id AND estudiante_id = NEW.estudiante_id;

    IF v_existing_id IS NULL THEN
      -- Create it (F = Falta/Ausente en la BD, la UI lo traduce a 'A')
      INSERT INTO asistencia_excepciones (sesion_id, estudiante_id, estado, actividad_origen_id)
      VALUES (v_sesion_id, NEW.estudiante_id, 'F', NEW.actividad_id);
    END IF;
  END IF;

  -- 2. Si dejó de ser inasistencia (Update o Delete)
  IF v_was_inasistencia AND NOT v_is_inasistencia THEN
    -- Check if another activity on the SAME date has 0 for this student
    SELECT a.id INTO v_other_act_id
    FROM calificaciones c
    JOIN actividades a ON c.actividad_id = a.id
    WHERE c.estudiante_id = OLD.estudiante_id
      AND c.puntaje = 0
      AND c.activo = true
      AND a.fecha = v_actividad.fecha
      AND a.id != OLD.actividad_id
      AND a.curso_id = v_actividad.curso_id
      AND a.asignatura = v_actividad.asignatura
    LIMIT 1;

    IF v_other_act_id IS NOT NULL THEN
      -- Transfer ownership instead of deleting
      UPDATE asistencia_excepciones 
      SET actividad_origen_id = v_other_act_id
      WHERE actividad_origen_id = OLD.actividad_id 
        AND estudiante_id = OLD.estudiante_id;
    ELSE
      -- No other activity has inasistencia, delete it safely
      DELETE FROM asistencia_excepciones 
      WHERE actividad_origen_id = OLD.actividad_id 
        AND estudiante_id = OLD.estudiante_id;
    END IF;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_calificacion_inasistencia ON calificaciones;
CREATE TRIGGER trg_calificacion_inasistencia
AFTER INSERT OR UPDATE OR DELETE ON calificaciones
FOR EACH ROW EXECUTE FUNCTION trg_sync_inasistencia_actividad();


-- 3. Trigger for activity date changes
CREATE OR REPLACE FUNCTION trg_actividad_fecha_changed()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_curso_docente_id bigint;
  v_sesion_id uuid;
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.fecha IS DISTINCT FROM OLD.fecha THEN
    -- Only do work if there are actually exceptions tied to this activity
    IF EXISTS (SELECT 1 FROM asistencia_excepciones WHERE actividad_origen_id = NEW.id) THEN
      
      SELECT id INTO v_curso_docente_id 
      FROM curso_docentes 
      WHERE curso_id = NEW.curso_id 
        AND docente_id = NEW.user_id 
        AND asignatura = NEW.asignatura
        AND activo = true
      LIMIT 1;

      IF v_curso_docente_id IS NOT NULL THEN
        SELECT id INTO v_sesion_id 
        FROM asistencia_sesiones 
        WHERE curso_docente_id = v_curso_docente_id 
          AND fecha = NEW.fecha;

        IF v_sesion_id IS NULL THEN
          INSERT INTO asistencia_sesiones (curso_id, user_id, fecha, curso_docente_id)
          VALUES (NEW.curso_id, NEW.user_id, NEW.fecha, v_curso_docente_id)
          RETURNING id INTO v_sesion_id;
        END IF;

        IF v_sesion_id IS NOT NULL THEN
           UPDATE asistencia_excepciones 
           SET sesion_id = v_sesion_id 
           WHERE actividad_origen_id = NEW.id;
        END IF;
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_actividad_fecha ON actividades;
CREATE TRIGGER trg_actividad_fecha
AFTER UPDATE ON actividades
FOR EACH ROW EXECUTE FUNCTION trg_actividad_fecha_changed();
