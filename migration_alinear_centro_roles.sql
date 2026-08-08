-- ══════════════════════════════════════════════════════════════════════
-- MIGRACIÓN: ALINEAR CENTRO_ROLES CON PERFILES (usuaria camilakya)
-- Proyecto: Evaluación por Competencias (modelo binario)
--
-- MOTIVO: la usuaria camilakya1996@gmail.com tiene:
--   - perfiles.rol        = 'administrador'
--   - perfiles.centro_id  = c1618a10... (Instituto Central)  ← fuente de verdad
--   - centro_roles        = UNA fila heredada apuntando a 11dbd994
--                           ("Centro prueba 1") con rol 'director'
-- Ese desajuste deja un rol administrativo heredado en un centro que NO
-- es el del perfil (huérfano). Este script alinea centro_roles con el
-- centro del perfil para que la "inferencia del centro" coincida.
--
-- SEGURIDAD: NO borra datos históricos; ATIENDE SOLO al usuario
-- indicado. Determinado por email para robustez (no importa el UUID).
-- ══════════════════════════════════════════════════════════════════════
DO $$
DECLARE
    v_user_id    uuid;
    v_centro_id  uuid;
    v_centro_nom text;
BEGIN
    -- 1. Localizar al usuario por email.
    SELECT id INTO v_user_id
      FROM auth.users
     WHERE lower(email) = lower('camilakya1996@gmail.com');

    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Usuario con ese email no existe en auth.users.';
    END IF;

    -- 2. Centro de procedencia del perfil (fuente de verdad).
    SELECT p.centro_id, c.nombre INTO v_centro_id, v_centro_nom
      FROM public.perfiles p
      LEFT JOIN public.centros c ON c.id = p.centro_id
     WHERE p.user_id = v_user_id
     LIMIT 1;

    IF v_centro_id IS NULL THEN
        RAISE EXCEPTION 'El perfil del usuario no tiene centro asignado.';
    END IF;

    -- 3. Corregir/crear la fila de centro_roles del centro del perfil
    --    con el rol administrativo correcto.
    INSERT INTO public.centro_roles (centro_id, user_id, rol)
    VALUES (v_centro_id, v_user_id, 'administrador')
    ON CONFLICT (centro_id, user_id)
    DO UPDATE SET rol = 'administrador';

    -- 4. Borrar las filas huérfanas/heredadas de otros centros para este
    --    usuario (conserva únicamente el centro del perfil). NO afecta a
    --    otros usuarios.
    DELETE FROM public.centro_roles
     WHERE user_id = v_user_id
       AND centro_id <> v_centro_id;

    RAISE NOTICE 'Perfil centrado en % (%), centro_roles alineado.', v_centro_nom, v_centro_id;
END;
$$;

-- Verificación (debe mostrar 1 fila con el centro del perfil, rol administrador)
SELECT cr.centro_id, c.nombre AS centro_nombre, cr.rol
  FROM public.centro_roles cr
  LEFT JOIN public.centros c ON c.id = cr.centro_id
 WHERE cr.user_id = (SELECT id FROM auth.users WHERE lower(email) = lower('camilakya1996@gmail.com'))
 ORDER BY cr.created_at;