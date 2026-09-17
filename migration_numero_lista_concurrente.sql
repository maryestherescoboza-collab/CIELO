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
--   - Se consulta MAX SOLO sobre estudiantes ACTIVOS; los inactivos quedan con
--     numero_lista NULL (ver UPDATE arriba) y nunca inflan ni bloquean ninguna
--     posición: el próximo número asignado continúa la numeración real vigente.
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
-- Ajustes 2026 (reparación estructural de posiciones):
--   a) REPARACIÓN DE DATOS LEGACY: los estudiantes desactivados (borrado lógico)
--      que aún conservan un numero_lista lo liberan poniéndolo en NULL. NULL es
--      inmune a la restricción unique (curso_id, numero_lista), de modo que la
--      posición puede volver a usarla un estudiante activo nuevo sin errores 23505
--      y sin eliminar el registro histórico (activo=false permanece).
--   b) El trigger ahora calcula el MAX SOLO sobre estudiantes ACTIVOS: un
--      inactivo nunca infla la numeración, por lo que "Agregar estudiante"
--      asigna siempre el siguiente número tras el último estudiante real vigente.
--   c) Defensa: garantiza que la columna acepte NULL (idempotente; si ya es
--      nullable no hace nada). Sin esto, liberar posiciones con NULL fallaría
--      si en la base la columna llegara a estar marcada NOT NULL.
-- ============================================================================

ALTER TABLE public.estudiantes ALTER COLUMN numero_lista DROP NOT NULL;

UPDATE public.estudiantes
   SET numero_lista = NULL
 WHERE activo = false
   AND numero_lista IS NOT NULL;

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
         WHERE e.curso_id = NEW.curso_id
           AND e.activo = true;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_asignar_numero_lista ON public.estudiantes;

CREATE TRIGGER trg_asignar_numero_lista
    BEFORE INSERT ON public.estudiantes
    FOR EACH ROW
    EXECUTE FUNCTION public.asignar_numero_lista_estudiante();
