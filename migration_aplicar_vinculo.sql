-- 1. Eliminar la función si existe con otros parámetros, pero usaremos CREATE OR REPLACE.
CREATE OR REPLACE FUNCTION aplicar_vinculo_usuario(
  p_modo text,
  p_centro_id uuid DEFAULT NULL,
  p_codigo text DEFAULT NULL,
  p_nombre_centro text DEFAULT NULL,
  p_distrito_educativo text DEFAULT NULL,
  p_telefono text DEFAULT NULL
) RETURNS json AS $$
DECLARE
  v_user_id uuid;
  v_final_centro_id uuid;
  v_centro_record record;
BEGIN
  -- Obtener el usuario autenticado
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN json_build_object('ok', false, 'message', 'No autenticado');
  END IF;

  v_final_centro_id := p_centro_id;

  -- CASO REFERENCIA: "Mi centro educativo no aparece"
  IF p_modo = 'referencia' THEN
    IF p_nombre_centro IS NULL OR trim(p_nombre_centro) = '' THEN
      RETURN json_build_object('ok', false, 'message', 'El nombre del centro es requerido.');
    END IF;

    -- Verificar si ya existe un centro con ese nombre (ignorando mayúsculas y espacios extra)
    SELECT id INTO v_final_centro_id 
    FROM centros 
    WHERE lower(trim(nombre)) = lower(trim(p_nombre_centro)) 
    LIMIT 1;

    -- Si no existe, crear el nuevo centro (queda como referencia del usuario)
    IF v_final_centro_id IS NULL THEN
      INSERT INTO centros (
        nombre,
        distrito_educativo,
        telefono,
        estado,
        afiliado,
        created_by
      ) VALUES (
        trim(p_nombre_centro),
        NULLIF(trim(p_distrito_educativo), ''),
        NULLIF(trim(p_telefono), ''),
        'activo',
        false,
        v_user_id
      ) RETURNING id INTO v_final_centro_id;
    END IF;

  -- CASOS PROPIA / CODIGO: "El usuario selecciona un centro"
  ELSIF p_modo IN ('propia', 'codigo') THEN
    IF p_centro_id IS NULL THEN
      RETURN json_build_object('ok', false, 'message', 'El ID del centro es requerido.');
    END IF;

    -- Validar que el centro existe (la columna afiliado NO impide la vinculación)
    SELECT * INTO v_centro_record FROM centros WHERE id = p_centro_id;
    IF NOT FOUND THEN
      RETURN json_build_object('ok', false, 'message', 'El centro seleccionado no existe.');
    END IF;
  END IF;

  -- ACTUALIZAR PERFIL (VINCULACIÓN)
  IF v_final_centro_id IS NOT NULL THEN
    UPDATE perfiles
    SET centro_id = v_final_centro_id
    WHERE user_id = v_user_id;

    -- Si el perfil no existe, hacer insert (en caso de que no haya entrado al trigger a tiempo)
    IF NOT FOUND THEN
      INSERT INTO perfiles (user_id, centro_id)
      VALUES (v_user_id, v_final_centro_id);
    END IF;
  END IF;

  RETURN json_build_object('ok', true, 'centro_id', v_final_centro_id);
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('ok', false, 'message', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
