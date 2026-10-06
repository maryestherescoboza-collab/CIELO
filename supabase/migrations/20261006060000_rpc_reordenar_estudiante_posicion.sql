CREATE OR REPLACE FUNCTION rpc_reordenar_estudiante_posicion(
    p_estudiante_id bigint,
    p_posicion_destino int
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_curso_id bigint;
    v_old_pos int;
    v_max_pos int;
    v_record RECORD;
BEGIN
    -- 1. Obtener datos del estudiante activo
    SELECT curso_id, numero_lista INTO v_curso_id, v_old_pos
    FROM public.estudiantes
    WHERE id = p_estudiante_id AND activo = true;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Estudiante no encontrado o inactivo';
    END IF;

    -- 2. Obtener el número máximo de posición activa del curso
    SELECT COUNT(*) INTO v_max_pos
    FROM public.estudiantes
    WHERE curso_id = v_curso_id AND activo = true;

    -- Validar rangos de posición destino
    IF p_posicion_destino < 1 OR p_posicion_destino > v_max_pos THEN
        RAISE EXCEPTION 'La posición destino (%) debe estar entre 1 y %', p_posicion_destino, v_max_pos;
    END IF;

    -- Si la posición es idéntica, no realizar cambios
    IF v_old_pos = p_posicion_destino THEN
        RETURN;
    END IF;

    -- 3. Mover temporalmente al estudiante objetivo a una posición negativa segura
    UPDATE public.estudiantes 
    SET numero_lista = -1 * id 
    WHERE id = p_estudiante_id;

    -- 4. Reordenar (Shift):
    IF v_old_pos < p_posicion_destino THEN
        -- Caso A: Mover hacia abajo (ej. 3 -> 20)
        -- Los estudiantes entre old_pos + 1 y posicion_destino deben subir (decrementarse en 1).
        -- Iterar de menor a mayor (ASC) para desplazar hacia la vacante previa.
        FOR v_record IN 
            SELECT id, numero_lista 
            FROM public.estudiantes 
            WHERE curso_id = v_curso_id 
              AND numero_lista > v_old_pos 
              AND numero_lista <= p_posicion_destino 
              AND activo = true 
            ORDER BY numero_lista ASC 
        LOOP
            UPDATE public.estudiantes 
            SET numero_lista = v_record.numero_lista - 1 
            WHERE id = v_record.id;
        END LOOP;

    ELSE
        -- Caso B: Mover hacia arriba (ej. 20 -> 3)
        -- Los estudiantes entre posicion_destino y old_pos - 1 deben bajar (incrementarse en 1).
        -- Iterar de mayor a menor (DESC) para desplazar hacia la vacante posterior.
        FOR v_record IN 
            SELECT id, numero_lista 
            FROM public.estudiantes 
            WHERE curso_id = v_curso_id 
              AND numero_lista >= p_posicion_destino 
              AND numero_lista < v_old_pos 
              AND activo = true 
            ORDER BY numero_lista DESC 
        LOOP
            UPDATE public.estudiantes 
            SET numero_lista = v_record.numero_lista + 1 
            WHERE id = v_record.id;
        END LOOP;

    END IF;

    -- 5. Asignar la posición final deseada al estudiante movido
    UPDATE public.estudiantes 
    SET numero_lista = p_posicion_destino 
    WHERE id = p_estudiante_id;

EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Error al reordenar la posición del estudiante: %', SQLERRM;
END;
$$;
