CREATE OR REPLACE FUNCTION rpc_eliminar_estudiante_posicion(
    p_estudiante_id bigint
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_curso_id bigint;
    v_posicion int;
    v_record RECORD;
BEGIN
    -- Obtener datos del estudiante antes de desactivarlo
    SELECT curso_id, numero_lista INTO v_curso_id, v_posicion
    FROM public.estudiantes
    WHERE id = p_estudiante_id AND activo = true;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Estudiante no encontrado o ya inactivo';
    END IF;

    -- Paso 1: Desactivar lógicamente al estudiante y mover su número a uno seguro (negativo) 
    -- para no interferir con la unicidad de los que quedan.
    UPDATE public.estudiantes 
    SET activo = false, numero_lista = -1 * id 
    WHERE id = p_estudiante_id;

    -- Paso 2: Desplazamiento seguro de adelante hacia atrás
    -- Iterar desde la posición eliminada + 1 hasta el final, en orden ascendente.
    -- Así cubrimos el hueco desplazando todos los posteriores una posición hacia arriba.
    FOR v_record IN 
        SELECT id, numero_lista 
        FROM public.estudiantes 
        WHERE curso_id = v_curso_id 
          AND numero_lista > v_posicion 
          AND activo = true 
        ORDER BY numero_lista ASC 
    LOOP
        UPDATE public.estudiantes 
        SET numero_lista = v_record.numero_lista - 1 
        WHERE id = v_record.id;
    END LOOP;

EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Error al eliminar el estudiante y renumerar: %', SQLERRM;
END;
$$;
