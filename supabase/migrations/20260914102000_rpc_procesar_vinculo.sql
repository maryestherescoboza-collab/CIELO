-- Nueva RPC para procesar vinculación post-registro de forma segura
CREATE OR REPLACE FUNCTION public.procesar_vinculo_pendiente(p_vinculo jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_tipo text;
  v_centro_id uuid;
  v_perfil_actual record;
  v_rol_existente boolean;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN json_build_object('ok', false, 'message', 'No autenticado');
  END IF;

  -- 1. Validaciones básicas del payload
  IF p_vinculo IS NULL OR p_vinculo->>'tipo' IS NULL THEN
    RETURN json_build_object('ok', false, 'message', 'Payload inválido');
  END IF;
  
  v_tipo := p_vinculo->>'tipo';

  -- 2. Idempotencia y Prevención de Carrera: Verificar si ya tiene centro asignado con bloqueo de fila
  SELECT *
  INTO v_perfil_actual
  FROM public.perfiles
  WHERE user_id = v_user_id
  FOR UPDATE;
  
  -- Si no existe perfil, es una anomalía muy rara (el trigger debió crearlo), fallamos seguro.
  IF NOT FOUND THEN
    RETURN json_build_object('ok', false, 'message', 'Perfil no encontrado');
  END IF;

  -- Si ya tiene centro asignado
  IF v_perfil_actual.centro_id IS NOT NULL THEN
     -- Comprobación de coherencia en Flujo B (si ya procesó la creación)
     IF v_tipo = 'crear_centro' THEN
        SELECT EXISTS(
          SELECT 1 FROM public.centro_roles 
          WHERE centro_id = v_perfil_actual.centro_id 
            AND user_id = v_user_id 
            AND rol = 'director'
        ) INTO v_rol_existente;
        
        IF NOT v_rol_existente OR v_perfil_actual.rol != 'administrador' THEN
           -- Incoherencia: tiene centro pero no los roles correctos. Se requiere soporte manual.
           RETURN json_build_object('ok', false, 'message', 'Estado inconsistente en duplicidad');
        END IF;
     END IF;
     
     RETURN json_build_object('ok', true, 'message', 'Vínculo ya procesado', 'centro_id', v_perfil_actual.centro_id);
  END IF;

  -- 3. Procesar según el tipo
  IF v_tipo = 'unirse' THEN
    -- Flujo A
    v_centro_id := (p_vinculo->>'centro_id')::uuid;
    
    IF v_centro_id IS NULL THEN
      RETURN json_build_object('ok', false, 'message', 'UUID de centro requerido');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM public.centros WHERE id = v_centro_id) THEN
      RETURN json_build_object('ok', false, 'message', 'El centro no existe');
    END IF;
    
    -- Actualizar perfil asignando centro y asegurando el rol de docente
    UPDATE public.perfiles 
    SET centro_id = v_centro_id,
        rol = 'docente'
    WHERE user_id = v_user_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'No se pudo actualizar el perfil del usuario';
    END IF;

  ELSIF v_tipo = 'crear_centro' THEN
    -- Flujo B
    IF p_vinculo->'centro'->>'nombre' IS NULL OR trim(p_vinculo->'centro'->>'nombre') = '' THEN
      RETURN json_build_object('ok', false, 'message', 'Nombre de centro requerido');
    END IF;

    -- Insertar centro (atomicidad natural de postgres: si algo falla debajo, esto hace rollback)
    INSERT INTO public.centros (
      nombre, 
      telefono, 
      distrito_educativo,
      estado,
      afiliado,
      created_by
    )
    VALUES (
      trim(p_vinculo->'centro'->>'nombre'),
      NULLIF(trim(p_vinculo->'centro'->>'telefono'), ''),
      NULLIF(trim(p_vinculo->'centro'->>'distrito_educativo'), ''),
      'activo',
      true,
      v_user_id
    ) RETURNING id INTO v_centro_id;

    -- Insertar rol en centro_roles
    INSERT INTO public.centro_roles (centro_id, user_id, rol) 
    VALUES (v_centro_id, v_user_id, 'director');

    -- Actualizar perfil (asignando centro y rol de administrador)
    UPDATE public.perfiles 
    SET centro_id = v_centro_id, rol = 'administrador' 
    WHERE user_id = v_user_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'No se pudo actualizar el perfil del usuario para asignarle el rol de administrador';
    END IF;

  ELSE
    RETURN json_build_object('ok', false, 'message', 'Tipo de vínculo desconocido');
  END IF;

  RETURN json_build_object('ok', true, 'centro_id', v_centro_id);
END;
$$;
