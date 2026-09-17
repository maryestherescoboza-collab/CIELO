-- ============================================================================
-- MIGRACIÓN: Límite de 40 estudiantes = SOLO estudiantes ACTIVOS reales.
-- Tabla: public.estudiantes
--
-- PROBLEMA
--   Los cursos pueden contener registros legacy con activo=false que aún
--   conservan numero_lista. Un trigger de límite (creado fuera del control de
--   versiones) contaba TODAS las filas del curso (incluidos inactivos) y al
--   intentar INSERTAR un estudiante nuevo lanzaba:
--       LIMITE_ALCANZADO: El curso ya cuenta con el máximo de 40 estudiantes.
--   aunque los estudiantes activos reales fuesen menos de 40.
--
-- SOLUCIÓN
--   1) Localiza y elimina de forma defensiva cualquier trigger/función de la
--      base que contenga el mensaje LIMITE_ALCANZADO / "40 estudiantes"
--      (incluida la versión anterior de esta misma migración: es idempotente).
--   2) Instala un guard equivalente que cuenta SOLO filas con activo = true.
--      Los inactivos nunca bloquean posiciones ni cuentan para el máximo.
--
-- GARANTÍAS
--   - La constraint unique_numero_lista_per_course NO se toca.
--   - La reactivación de un registro legacy se hace con UPDATE (no pasa por
--     este trigger de INSERT), así que nunca se trata como estudiante adicional.
--   - El guard dispara solo en INSERT de estudiantes nuevos.
--   - Idempotente: puede re-ejecutarse sin efecto adverso.
-- ============================================================================

-- 1) Diagnosticar y retirar guardas legacy del límite.
DO $$
DECLARE
    fn record;
    trg record;
BEGIN
    FOR fn IN
        SELECT p.oid, p.oid::regprocedure::text AS fn_name
          FROM pg_proc p
         WHERE p.pronamespace = 'public'::regnamespace
           AND p.prorettype = 'trigger'::regtype
           AND (p.prosrc ILIKE '%LIMITE_ALCANZADO%'
                OR p.prosrc ILIKE '%máximo de 40%'
                OR p.prosrc ILIKE '%40 estudiantes%')
    LOOP
        RAISE NOTICE 'Límite 40 → función legacy: %', fn.fn_name;

        FOR trg IN
            SELECT t.tgname AS nombre, c.relname AS tabla
              FROM pg_trigger t
              JOIN pg_class c ON c.oid = t.tgrelid
             WHERE t.tgfoid = fn.oid
               AND NOT t.tgisinternal
        LOOP
            RAISE NOTICE '  - drop trigger % ON %', trg.nombre, trg.tabla;
            EXECUTE format('DROP TRIGGER IF EXISTS %I ON %I', trg.nombre, trg.tabla);
        END LOOP;

        EXECUTE format('DROP FUNCTION IF EXISTS %s', fn.fn_name);
    END LOOP;
END $$;

-- 2) Guard correcto: cuenta SOLO estudiantes activos del curso.
CREATE OR REPLACE FUNCTION public.limite_estudiantes_activos_curso()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_conteo integer;
BEGIN
    IF NEW.curso_id IS NULL THEN
        RETURN NEW;
    END IF;

    -- Serializa inserts simultáneos del mismo curso hasta el COMMIT.
    PERFORM pg_advisory_xact_lock(NEW.curso_id::bigint);

    SELECT COUNT(*)
      INTO v_conteo
      FROM public.estudiantes e
     WHERE e.curso_id = NEW.curso_id
       AND e.activo = true;

    IF v_conteo >= 40 THEN
        RAISE EXCEPTION 'LIMITE_ALCANZADO: El curso ya cuenta con el máximo de 40 estudiantes.'
            USING ERRCODE = 'P0001';
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_limite_estudiantes_curso ON public.estudiantes;

CREATE TRIGGER trg_limite_estudiantes_curso
    BEFORE INSERT ON public.estudiantes
    FOR EACH ROW
    EXECUTE FUNCTION public.limite_estudiantes_activos_curso();