-- ═══════════════════════════════════════════════════════════════════════
-- MIGRATION: VINCULACIÓN DIRECTA Y DEFINITIVA DE CENTROS EN REGISTRO
-- Proyecto: CIELO (Evaluación por competencias)
-- Fecha: 2026-11-22
-- ═══════════════════════════════════════════════════════════════════════

-- 1. Asegurar que vinculo_confirmado tenga DEFAULT true
ALTER TABLE public.perfiles
ALTER COLUMN vinculo_confirmado SET DEFAULT true;

-- 2. Confirmar inmediatamente cualquier perfil existente con vinculo_confirmado = false
UPDATE public.perfiles
SET vinculo_confirmado = true
WHERE vinculo_confirmado = false;

-- 3. Asegurar que todos los perfiles con centro_id tengan su registro en centro_roles
INSERT INTO public.centro_roles (centro_id, user_id, rol)
SELECT centro_id, user_id, COALESCE(rol, 'docente')
FROM public.perfiles
WHERE centro_id IS NOT NULL
ON CONFLICT (centro_id, user_id) DO NOTHING;

-- 4. Actualizar la función trigger handle_new_user para vincular definitivamente en el registro
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

  -- Insertar perfil con el centro_id asociado y confirmado de forma definitiva e inmediata
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
    true
  )
  ON CONFLICT (user_id) DO UPDATE 
  SET 
    nombre = CASE WHEN EXCLUDED.nombre <> '' THEN EXCLUDED.nombre ELSE perfiles.nombre END,
    nombre_docente = CASE WHEN EXCLUDED.nombre_docente <> '' THEN EXCLUDED.nombre_docente ELSE perfiles.nombre_docente END,
    telefono = COALESCE(EXCLUDED.telefono, perfiles.telefono),
    centro_id = COALESCE(perfiles.centro_id, EXCLUDED.centro_id),
    rol = COALESCE(perfiles.rol, EXCLUDED.rol),
    vinculo_confirmado = true;

  -- Si se asoció un centro válido, crear su rol correspondiente de inmediato
  IF v_centro_id IS NOT NULL THEN
    INSERT INTO public.centro_roles (centro_id, user_id, rol)
    VALUES (v_centro_id, NEW.id, v_rol)
    ON CONFLICT (centro_id, user_id) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$;
