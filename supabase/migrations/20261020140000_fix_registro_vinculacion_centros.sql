-- ═══════════════════════════════════════════════════════════════════════
-- MIGRATION: CORRECCIÓN DEFINITIVA DE REGISTRO Y VINCULACIÓN DE CENTROS
-- Proyecto: CIELO (Evaluación por competencias)
-- Fecha: 2026-10-20
-- ═══════════════════════════════════════════════════════════════════════

-- 1. Actualizar procesar_vinculo_pendiente para soportar todos los flujos de forma atómica e idempotente:
--    - 'unirse': Docente se une a un centro existente con UUID válido
--    - 'crear_centro': Director crea nuevo centro institucional (afiliado = true, rol = 'administrador')
--    - 'referencia' o 'crear_centro_referencia': Docente agrega centro no listado (afiliado = false, rol = 'docente')
--    - 'asignar_admin_centro_existente': Director se vincula a centro existente
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
  v_nombre_centro text;
  v_distrito text;
  v_telefono text;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN json_build_object('ok', false, 'code', 'NO_AUTH', 'message', 'No autenticado');
  END IF;

  -- 1. Validaciones básicas del payload
  IF p_vinculo IS NULL OR p_vinculo->>'tipo' IS NULL THEN
    RETURN json_build_object('ok', false, 'code', 'PAYLOAD_INVALIDO', 'message', 'Payload inválido');
  END IF;
  
  v_tipo := p_vinculo->>'tipo';

  -- 2. Idempotencia y Prevención de Carrera: Verificar si ya tiene centro asignado con bloqueo de fila
  SELECT *
  INTO v_perfil_actual
  FROM public.perfiles
  WHERE user_id = v_user_id
  FOR UPDATE;
  
  -- Si no existe perfil todavía, crearlo de forma segura
  IF NOT FOUND THEN
    INSERT INTO public.perfiles (user_id, rol)
    VALUES (v_user_id, 'docente')
    RETURNING * INTO v_perfil_actual;
  END IF;

  -- Si ya tiene centro asignado, retornar éxito (idempotencia)
  IF v_perfil_actual.centro_id IS NOT NULL THEN
     RETURN json_build_object(
       'ok', true, 
       'message', 'Vínculo ya procesado', 
       'centro_id', v_perfil_actual.centro_id
     );
  END IF;

  -- 3. Procesar según el tipo
  IF v_tipo = 'unirse' THEN
    -- Flujo Docente: unirse a centro existente
    IF p_vinculo->>'centro_id' IS NULL OR trim(p_vinculo->>'centro_id') = '' THEN
      RETURN json_build_object('ok', false, 'code', 'CENTRO_ID_REQUERIDO', 'message', 'UUID de centro requerido');
    END IF;

    BEGIN
      v_centro_id := (p_vinculo->>'centro_id')::uuid;
    EXCEPTION WHEN OTHERS THEN
      RETURN json_build_object('ok', false, 'code', 'UUID_INVALIDO', 'message', 'El ID del centro no es un UUID válido');
    END;

    IF NOT EXISTS (SELECT 1 FROM public.centros WHERE id = v_centro_id) THEN
      RETURN json_build_object('ok', false, 'code', 'CENTRO_NO_EXISTE', 'message', 'El centro seleccionado no existe');
    END IF;

    -- Validar que el centro no esté suspendido o cancelado
    IF EXISTS (SELECT 1 FROM public.centros WHERE id = v_centro_id AND estado IN ('suspendido', 'cancelado')) THEN
      RETURN json_build_object('ok', false, 'code', 'CENTRO_NO_DISPONIBLE', 'message', 'El centro educativo no está disponible');
    END IF;
    
    -- Actualizar perfil asignando centro y asegurando rol de docente
    UPDATE public.perfiles 
    SET centro_id = v_centro_id,
        rol = COALESCE(rol, 'docente')
    WHERE user_id = v_user_id;

    -- Registrar rol de docente en centro_roles
    INSERT INTO public.centro_roles (centro_id, user_id, rol)
    VALUES (v_centro_id, v_user_id, 'docente')
    ON CONFLICT (centro_id, user_id) DO NOTHING;

  ELSIF v_tipo = 'crear_centro' THEN
    -- Flujo Director: crea nuevo centro institucional
    v_nombre_centro := trim(COALESCE(p_vinculo->'centro'->>'nombre', ''));
    IF v_nombre_centro = '' THEN
      RETURN json_build_object('ok', false, 'code', 'NOMBRE_REQUERIDO', 'message', 'Nombre de centro requerido');
    END IF;

    v_distrito := NULLIF(trim(COALESCE(p_vinculo->'centro'->>'distrito_educativo', '')), '');
    v_telefono := NULLIF(trim(COALESCE(p_vinculo->'centro'->>'telefono', '')), '');

    INSERT INTO public.centros (
      nombre, 
      telefono, 
      distrito_educativo,
      estado,
      afiliado,
      created_by
    )
    VALUES (
      v_nombre_centro,
      v_telefono,
      v_distrito,
      'activo',
      true,
      v_user_id
    ) RETURNING id INTO v_centro_id;

    -- Insertar rol director en centro_roles
    INSERT INTO public.centro_roles (centro_id, user_id, rol) 
    VALUES (v_centro_id, v_user_id, 'director')
    ON CONFLICT (centro_id, user_id) DO UPDATE SET rol = 'director';

    -- Actualizar perfil (asignando centro y rol de administrador)
    UPDATE public.perfiles 
    SET centro_id = v_centro_id, rol = 'administrador' 
    WHERE user_id = v_user_id;

  ELSIF v_tipo IN ('referencia', 'crear_centro_referencia') THEN
    -- Flujo Docente: agrega un centro educativo que no estaba en el catálogo
    v_nombre_centro := trim(COALESCE(p_vinculo->'centro'->>'nombre', ''));
    IF v_nombre_centro = '' OR length(v_nombre_centro) < 3 THEN
      RETURN json_build_object('ok', false, 'code', 'NOMBRE_INVALIDO', 'message', 'El nombre del centro debe tener al menos 3 caracteres');
    END IF;

    v_distrito := NULLIF(trim(COALESCE(p_vinculo->'centro'->>'distrito_educativo', '')), '');
    v_telefono := NULLIF(trim(COALESCE(p_vinculo->'centro'->>'telefono', '')), '');

    -- Comprobar si ya existe un centro con ese nombre (evitar duplicados por mayúsculas/espacios)
    SELECT id INTO v_centro_id
    FROM public.centros
    WHERE lower(trim(nombre)) = lower(v_nombre_centro)
    LIMIT 1;

    -- Si no existe, crear el centro como no afiliado (referencia docente)
    IF v_centro_id IS NULL THEN
      INSERT INTO public.centros (
        nombre,
        distrito_educativo,
        telefono,
        estado,
        afiliado,
        created_by
      ) VALUES (
        v_nombre_centro,
        v_distrito,
        v_telefono,
        'activo',
        false,
        v_user_id
      ) RETURNING id INTO v_centro_id;
    END IF;

    -- Actualizar perfil del docente con el centro asignado (rol docente)
    UPDATE public.perfiles
    SET centro_id = v_centro_id,
        rol = COALESCE(rol, 'docente')
    WHERE user_id = v_user_id;

    -- Registrar rol en centro_roles
    INSERT INTO public.centro_roles (centro_id, user_id, rol)
    VALUES (v_centro_id, v_user_id, 'docente')
    ON CONFLICT (centro_id, user_id) DO NOTHING;

  ELSIF v_tipo = 'asignar_admin_centro_existente' THEN
    -- Flujo Director: se une a centro institucional existente
    IF p_vinculo->>'centro_id' IS NULL OR trim(p_vinculo->>'centro_id') = '' THEN
      RETURN json_build_object('ok', false, 'code', 'CENTRO_ID_REQUERIDO', 'message', 'UUID de centro requerido');
    END IF;

    BEGIN
      v_centro_id := (p_vinculo->>'centro_id')::uuid;
    EXCEPTION WHEN OTHERS THEN
      RETURN json_build_object('ok', false, 'code', 'UUID_INVALIDO', 'message', 'El ID del centro no es un UUID válido');
    END;

    IF NOT EXISTS (SELECT 1 FROM public.centros WHERE id = v_centro_id) THEN
      RETURN json_build_object('ok', false, 'code', 'CENTRO_NO_EXISTE', 'message', 'El centro seleccionado no existe');
    END IF;

    UPDATE public.perfiles
    SET centro_id = v_centro_id, rol = 'administrador'
    WHERE user_id = v_user_id;

    INSERT INTO public.centro_roles (centro_id, user_id, rol)
    VALUES (v_centro_id, v_user_id, 'director')
    ON CONFLICT (centro_id, user_id) DO UPDATE SET rol = 'director';

  ELSE
    RETURN json_build_object('ok', false, 'code', 'TIPO_DESCONOCIDO', 'message', 'Tipo de vínculo desconocido: ' || v_tipo);
  END IF;

  RETURN json_build_object('ok', true, 'centro_id', v_centro_id);
END;
$$;


-- 2. Nueva función RPC para guardar datos profesionales y centro educativo desde la sección de Ajustes / Perfil
CREATE OR REPLACE FUNCTION public.guardar_datos_profesionales_docente(
  p_tipo_institucion text,
  p_asignaturas text[],
  p_instituto text,
  p_codigo_centro text DEFAULT NULL,
  p_tanda text DEFAULT NULL,
  p_telefono text DEFAULT NULL,
  p_distrito text DEFAULT NULL,
  p_regional text DEFAULT NULL,
  p_provincia text DEFAULT NULL,
  p_municipio text DEFAULT NULL,
  p_centro_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_centro_id uuid;
  v_perfil record;
  v_centro record;
  v_nombre_norm text;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN json_build_object('ok', false, 'message', 'No autenticado');
  END IF;

  SELECT * INTO v_perfil FROM public.perfiles WHERE user_id = v_user_id FOR UPDATE;
  IF NOT FOUND THEN
    INSERT INTO public.perfiles (user_id, rol) VALUES (v_user_id, 'docente') RETURNING * INTO v_perfil;
  END IF;

  v_centro_id := COALESCE(p_centro_id, v_perfil.centro_id);
  v_nombre_norm := trim(COALESCE(p_instituto, ''));

  -- Caso A: El usuario ya tiene un centro o seleccionó uno por UUID
  IF v_centro_id IS NOT NULL THEN
    SELECT * INTO v_centro FROM public.centros WHERE id = v_centro_id;
    IF v_centro.id IS NOT NULL THEN
      -- Si el centro no es afiliado o fue creado por el docente, permitir actualizar sus datos
      IF v_centro.afiliado IS NOT TRUE OR v_centro.created_by = v_user_id THEN
        UPDATE public.centros
        SET nombre = COALESCE(NULLIF(v_nombre_norm, ''), nombre),
            codigo_centro = COALESCE(NULLIF(trim(p_codigo_centro), ''), codigo_centro),
            tanda = COALESCE(NULLIF(trim(p_tanda), ''), tanda),
            telefono = COALESCE(NULLIF(trim(p_telefono), ''), telefono),
            distrito_educativo = COALESCE(NULLIF(trim(p_distrito), ''), distrito_educativo),
            regional_educacion = COALESCE(NULLIF(trim(p_regional), ''), regional_educacion),
            provincia = COALESCE(NULLIF(trim(p_provincia), ''), provincia),
            municipio = COALESCE(NULLIF(trim(p_municipio), ''), municipio),
            updated_at = NOW()
        WHERE id = v_centro_id;
      END IF;

      INSERT INTO public.centro_roles (centro_id, user_id, rol)
      VALUES (v_centro_id, v_user_id, 'docente')
      ON CONFLICT (centro_id, user_id) DO NOTHING;
    END IF;
  ELSE
    -- Caso B: El usuario no tiene centro y proporcionó un nombre de instituto
    IF v_nombre_norm <> '' THEN
      -- Verificar si ya existe un centro con ese nombre
      SELECT id INTO v_centro_id FROM public.centros WHERE lower(trim(nombre)) = lower(v_nombre_norm) LIMIT 1;
      
      IF v_centro_id IS NULL THEN
        INSERT INTO public.centros (
          nombre,
          codigo_centro,
          tanda,
          telefono,
          distrito_educativo,
          regional_educacion,
          provincia,
          municipio,
          estado,
          afiliado,
          created_by
        ) VALUES (
          v_nombre_norm,
          NULLIF(trim(p_codigo_centro), ''),
          NULLIF(trim(p_tanda), ''),
          NULLIF(trim(p_telefono), ''),
          NULLIF(trim(p_distrito), ''),
          NULLIF(trim(p_regional), ''),
          NULLIF(trim(p_provincia), ''),
          NULLIF(trim(p_municipio), ''),
          'activo',
          false,
          v_user_id
        ) RETURNING id INTO v_centro_id;
      END IF;

      INSERT INTO public.centro_roles (centro_id, user_id, rol)
      VALUES (v_centro_id, v_user_id, 'docente')
      ON CONFLICT (centro_id, user_id) DO NOTHING;
    END IF;
  END IF;

  -- Actualizar el perfil del docente
  UPDATE public.perfiles
  SET tipo_institucion = NULLIF(trim(p_tipo_institucion), ''),
      asignaturas = COALESCE(p_asignaturas, asignaturas),
      centro_id = COALESCE(v_centro_id, centro_id),
      rol = COALESCE(rol, 'docente')
  WHERE user_id = v_user_id;

  RETURN json_build_object(
    'ok', true, 
    'message', 'Datos profesionales guardados correctamente',
    'centro_id', v_centro_id
  );
END;
$$;
