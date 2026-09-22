CREATE OR REPLACE FUNCTION rpc_insertar_estudiante_posicion(
    p_curso_id bigint,
    p_posicion int,
    p_nombre text,
    p_apellido text,
    p_avatar_color text,
    p_grupo_id bigint,
    p_docente_id uuid,
    p_shared_course_id text,
    p_nivel int DEFAULT 1,
    p_puntaje int DEFAULT 0,
    p_bc1 jsonb DEFAULT '{"nivel": 1, "puntaje": 0}'::jsonb,
    p_bc2 jsonb DEFAULT '{"nivel": 1, "puntaje": 0}'::jsonb,
    p_bc3 jsonb DEFAULT '{"nivel": 1, "puntaje": 0}'::jsonb,
    p_bc4 jsonb DEFAULT '{"nivel": 1, "puntaje": 0}'::jsonb,
    p_actividades_recientes int DEFAULT 0,
    p_en_riesgo boolean DEFAULT false
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_new_student_id bigint;
    v_result jsonb;
    v_record RECORD;
BEGIN
    IF p_posicion <= 0 THEN
        RAISE EXCEPTION 'La posición debe ser mayor a 0';
    END IF;

    -- Paso 1: Desplazamiento seguro de atrás hacia adelante
    -- Iterar desde el final (mayor numero_lista) hasta p_posicion, en orden descendente.
    -- Esto garantiza que siempre desplazamos a un estudiante hacia una posición que acaba
    -- de quedar libre, respetando la restricción UNIQUE de numero_lista.
    FOR v_record IN 
        SELECT id, numero_lista 
        FROM public.estudiantes 
        WHERE curso_id = p_curso_id 
          AND numero_lista >= p_posicion 
          AND activo = true 
        ORDER BY numero_lista DESC 
    LOOP
        UPDATE public.estudiantes 
        SET numero_lista = v_record.numero_lista + 1 
        WHERE id = v_record.id;
    END LOOP;

    -- Paso 2: Insertar el nuevo estudiante exactamente en la posición solicitada
    INSERT INTO public.estudiantes (
        curso_id,
        numero_lista,
        nombre,
        apellido,
        avatar_color,
        grupo_id,
        docente_id,
        shared_course_id,
        nivel,
        puntaje,
        bc1,
        bc2,
        bc3,
        bc4,
        actividades_recientes,
        en_riesgo,
        activo
    ) VALUES (
        p_curso_id,
        p_posicion,
        p_nombre,
        p_apellido,
        p_avatar_color,
        p_grupo_id,
        p_docente_id,
        p_shared_course_id,
        p_nivel,
        p_puntaje,
        p_bc1,
        p_bc2,
        p_bc3,
        p_bc4,
        p_actividades_recientes,
        p_en_riesgo,
        true
    )
    RETURNING id INTO v_new_student_id;

    -- Paso 3: Retornar el registro insertado para que el frontend lo procese
    SELECT to_jsonb(e) INTO v_result
    FROM public.estudiantes e
    WHERE e.id = v_new_student_id;

    RETURN v_result;

EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Error al reorganizar la lista e insertar el estudiante: %', SQLERRM;
END;
$$;
