-- ═══════════════════════════════════════════════════════════════════════
-- MIGRATION: OPTIMIZACIÓN INTEGRAL DE REGISTRO Y VINCULACIÓN A CENTROS
-- Proyecto: CIELO (Evaluación por competencias)
-- Fecha: 2026-11-22
-- ═══════════════════════════════════════════════════════════════════════

-- 1. Agregar columna vinculo_confirmado a perfiles con default true para perfiles existentes
ALTER TABLE public.perfiles
ADD COLUMN IF NOT EXISTS vinculo_confirmado boolean NOT NULL DEFAULT true;

-- 2. Actualizar función trigger handle_new_user para asociar centro_id inmediatamente
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_centro_id uuid := NULL;
  v_centro_id_text text;
  v_rol text;
  v_nombre text;
BEGIN
  v_nombre := COALESCE(NEW.raw_user_meta_data->>'nombre_docente', NEW.raw_user_meta_data->>'nombre', '');
  v_rol := COALESCE(NEW.raw_user_meta_data->>'rol', 'docente');
  v_centro_id_text := NEW.raw_user_meta_data->>'centro_id';

  -- Validar si viene un centro_id con formato UUID válido
  IF v_centro_id_text IS NOT NULL AND v_centro_id_text ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
    -- Validar que el centro realmente exista en la tabla centros
    SELECT id INTO v_centro_id
    FROM public.centros
    WHERE id = v_centro_id_text::uuid;
  END IF;

  -- Insertar perfil con el centro_id asociado inmediatamente
  INSERT INTO public.perfiles (
    user_id,
    nombre,
    nombre_docente,
    telefono,
    centro_id,
    rol,
    vinculo_confirmado
  )
  VALUES (
    NEW.id,
    v_nombre,
    v_nombre,
    NEW.raw_user_meta_data->>'telefono',
    v_centro_id,
    v_rol,
    CASE 
      WHEN v_centro_id IS NOT NULL THEN false 
      ELSE true 
    END
  )
  ON CONFLICT (user_id) DO UPDATE 
  SET 
    nombre = CASE WHEN EXCLUDED.nombre <> '' THEN EXCLUDED.nombre ELSE perfiles.nombre END,
    nombre_docente = CASE WHEN EXCLUDED.nombre_docente <> '' THEN EXCLUDED.nombre_docente ELSE perfiles.nombre_docente END,
    telefono = COALESCE(EXCLUDED.telefono, perfiles.telefono),
    centro_id = COALESCE(perfiles.centro_id, EXCLUDED.centro_id),
    rol = COALESCE(perfiles.rol, EXCLUDED.rol);
  
  RETURN NEW;
END;
$$;

-- 3. Crear función RPC segura para confirmar la vinculación
CREATE OR REPLACE FUNCTION public.confirmar_vinculacion_centro(p_centro_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_perfil record;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN json_build_object('ok', false, 'code', 'NO_AUTH', 'message', 'Usuario no autenticado');
  END IF;

  SELECT * INTO v_perfil
  FROM public.perfiles
  WHERE user_id = v_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN json_build_object('ok', false, 'code', 'PERFIL_NO_EXISTE', 'message', 'El perfil del usuario no existe');
  END IF;

  -- Idempotencia: Si ya está confirmado, retornar éxito
  IF v_perfil.vinculo_confirmado = true THEN
    RETURN json_build_object('ok', true, 'centro_id', v_perfil.centro_id, 'already_confirmed', true);
  END IF;

  -- Seguridad: Debe tener centro_id y debe coincidir con el centro_id seleccionado en el registro
  IF v_perfil.centro_id IS NULL THEN
    RETURN json_build_object('ok', false, 'code', 'SIN_CENTRO_ASOCIADO', 'message', 'El perfil no tiene un centro asociado');
  END IF;

  IF v_perfil.centro_id <> p_centro_id THEN
    RETURN json_build_object('ok', false, 'code', 'CENTRO_NO_COINCIDE', 'message', 'El centro no corresponde al centro seleccionado durante el registro');
  END IF;

  -- Validar que el centro existe
  IF NOT EXISTS (SELECT 1 FROM public.centros WHERE id = v_perfil.centro_id) THEN
    RETURN json_build_object('ok', false, 'code', 'CENTRO_INEXISTENTE', 'message', 'El centro educativo no existe');
  END IF;

  -- Actualizar a confirmado
  UPDATE public.perfiles
  SET vinculo_confirmado = true
  WHERE user_id = v_user_id;

  -- Asegurar rol en centro_roles evitando duplicados
  INSERT INTO public.centro_roles (centro_id, user_id, rol)
  VALUES (v_perfil.centro_id, v_user_id, COALESCE(v_perfil.rol, 'docente'))
  ON CONFLICT (centro_id, user_id) DO NOTHING;

  RETURN json_build_object('ok', true, 'centro_id', v_perfil.centro_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.confirmar_vinculacion_centro(uuid) TO authenticated;
