-- ============================================================================
-- MIGRACIÓN: Asignación segura ante concurrencia de `numero_lista`
-- Tabla: public.estudiantes
--
-- PROBLEMA
--   El cliente calculaba "MAX(numero_lista) + 1" desde su estado local y luego
--   insertaba. Con registros rápidos o simultáneos sobre un mismo curso, dos
--   operaciones leían el mismo máximo y generaban el mismo número, violando
--   la restricción "unique_numero_lista_per_course" (duplicate key 23505).
--
-- SOLUCIÓN (servidor / base de datos)
--   Trigger BEFORE INSERT que asigna el número SOLO cuando el cliente no envía
--   uno explícito (NULL). La asignación se protege con un lock de asesoría por
--   transacción (pg_advisory_xact_lock) claveado por curso, de modo que dos
--   inserts concurrentes del mismo curso se serializan: el segundo calcula el
--   MAX después de que el primero confirmó su fila. No hay polling ni esperas:
--   el costo es una única consulta indexada dentro del trigger.
--
-- GARANTÍAS
--   - Números únicos por curso sin errores 23505, aunque múltiples clientes
--     inserten a la vez.
--   - Se consulta MAX sobre TODAS las filas del curso (incluye inactivas),
--     por lo que nunca se reutilizan números: es compatible tanto si la
--     restricción unique es total como parcial (WHERE activo).
--   - La restricción "unique_numero_lista_per_course" NO se toca: queda como
--     última línea de defensa de integridad.
--   - Los UPDATE conservan el numero_lista existente (el trigger es solo
--     INSERT); los inserts que envíen un numero_lista explícito no se alteran.
--
-- NOTAS DE SEGURIDAD
--   - SECURITY DEFINER es necesario para calcular el MAX viendo TODAS las
--     filas del curso aunque RLS limite lo que el docente puede seleccionar
--     (co-docentes / cursos compartidos). Las funciones trigger no pueden
--     invocarse directamente desde SQL, así que no expone superficie nueva.
--   - SET search_path = public evita secuestro del search_path.
--   - Idempotente: puede re-ejecutarse sin efecto adverso.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.asignar_numero_lista_estudiante()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NEW.numero_lista IS NULL AND NEW.curso_id IS NOT NULL THEN
        -- Serializa los inserts simultáneos del mismo curso hasta el COMMIT.
        PERFORM pg_advisory_xact_lock(NEW.curso_id::bigint);

        SELECT COALESCE(MAX(e.numero_lista), 0) + 1
          INTO NEW.numero_lista
          FROM public.estudiantes e
         WHERE e.curso_id = NEW.curso_id;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_asignar_numero_lista ON public.estudiantes;

CREATE TRIGGER trg_asignar_numero_lista
    BEFORE INSERT ON public.estudiantes
    FOR EACH ROW
    EXECUTE FUNCTION public.asignar_numero_lista_estudiante();
