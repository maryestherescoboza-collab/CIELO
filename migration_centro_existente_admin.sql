-- ══════════════════════════════════════════════════════════════════════
-- MIGRACIÓN — Registro "Centro educativo" con centro existente en CIELO
--
-- Flujo: el usuario dice "Sí, mis docentes ya usan CIELO" → introduce el
-- ID de un centro ya existente → confirma → se crea SU cuenta y queda como
-- ADMINISTRADOR del centro existente.
--
-- Esta migración crea la función RPC `asignar_centro_administrador` que:
--   1. Valida que el centro existe.
--   2. Crea/actualiza el perfil del usuario con:
--        - perfiles.nombre        = nombre completo del registro (obligatorio)
--        - perfiles.nombre_docente = nombre completo del registro
--        - perfiles.rol           = 'administrador'
--        - perfiles.centro_id     = centro existente
--   3. Inserta/actualiza la fila en centro_roles (rol 'administrador').
--      Esta fila es necesaria para que las políticas RLS actuales
--      (is_centro_director, "Gestión de códigos por director", etc.)
--      reconozcan al nuevo administrador como gestor del centro.
--
-- NO crea un centro nuevo.
-- NO duplica perfiles ni centro_roles (usa ON CONFLICT).
-- NO modifica los datos ni las relaciones del centro existente.
-- NO toca docentes, suscripciones ni la lógica de evaluación.
--
-- SECURITY DEFINER: se ejecuta con privilegios del dueño para poder
-- escribir perfiles/centro_roles recién al confirmar el correo, igual
-- que lo hace la función existente aplicar_vinculo_usuario.
-- ══════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.asignar_centro_administrador(
  p_centro_id uuid,
  p_nombre text,
  p_nombre_docente text DEFAULT NULL
) RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_centro_exists boolean;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN json_build_object('ok', false, 'message', 'No autenticado');
  END IF;

  -- Validar que el centro existe. El usuario debe introducir el ID de un
  -- centro que YA existe en CIELO; nunca se crea uno nuevo aquí.
  SELECT EXISTS (
    SELECT 1 FROM public.centros WHERE id = p_centro_id
  ) INTO v_centro_exists;

  IF NOT v_centro_exists THEN
    RETURN json_build_object('ok', false, 'message', 'No encontramos un centro con ese ID. Verifica el ID e inténtalo nuevamente.');
  END IF;

  -- Perfil del usuario: nombre completo obligatorio + rol administrador.
  -- SI el perfil ya existe (p. ej. creado por el trigger de auth) solo se
  -- actualizan las columnas indicadas; se completa el nombre si aún no existe.
  INSERT INTO public.perfiles (
    user_id,
    nombre,
    nombre_docente,
    rol,
    centro_id,
    avatar_color
  )
  VALUES (
    v_user_id,
    NULLIF(trim(p_nombre), ''),
    NULLIF(trim(COALESCE(p_nombre_docente, p_nombre)), ''),
    'administrador',
    p_centro_id,
    '#3b82f6'
  )
  ON CONFLICT (user_id) DO UPDATE SET
    nombre         = COALESCE(NULLIF(trim(p_nombre), ''), public.perfiles.nombre),
    nombre_docente = COALESCE(NULLIF(trim(COALESCE(p_nombre_docente, p_nombre)), ''), public.perfiles.nombre_docente),
    rol            = 'administrador',
    centro_id      = p_centro_id;

  -- Rol de administrador en centro_roles para que las políticas RLS del
  -- centro (lectura de códigos, gestión, etc.) reconozcan al usuario.
  INSERT INTO public.centro_roles (centro_id, user_id, rol)
  VALUES (p_centro_id, v_user_id, 'administrador')
  ON CONFLICT (centro_id, user_id) DO UPDATE SET
    rol = 'administrador';

  -- Verificación: perfiles.rol es la fuente de verdad que la app usa para
  -- decidir el acceso a Centro Panel. Si algún trigger existente (p. ej.
  -- on_perfil_update_rol / prevent_rol_update de migration_rls_roles)
  -- revirtiera silenciosamente el rol, lo detectamos aquí y avisamos en
  -- lugar de degradar la cuenta a un docente sin centro.
  IF NOT EXISTS (
    SELECT 1 FROM public.perfiles
    WHERE user_id = v_user_id AND rol = 'administrador'
  ) THEN
    RETURN json_build_object(
      'ok', false,
      'message', 'Ocurrió un problema al asignar el rol de administrador. Por favor contacta al soporte de CIELO.'
    );
  END IF;

  RETURN json_build_object('ok', true, 'centro_id', p_centro_id);
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('ok', false, 'message', SQLERRM);
END;
$$;

-- Permitir que el usuario autenticado invoque la función desde el cliente.
GRANT EXECUTE ON FUNCTION public.asignar_centro_administrador(uuid, text, text) TO authenticated;