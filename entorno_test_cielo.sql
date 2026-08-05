-- ═══════════════════════════════════════════════════════════════════
-- ENTORNO DE PRUEBAS MÍNIMO — CIELO
-- Proyecto: Evaluación por competencias
--
-- Crea únicamente lo necesario para probar el flujo real:
--   1. CENTRO EDUCATIVO CIELO  (código CIELO-001, estado activo, afiliado)
--   2. Código de acceso CIELO-001 (para que los docentes se registren
--      con el código y se vinculen automáticamente al centro)
--   3. Vinculación del usuario ADMINISTRADOR (email administrador@cielo.test)
--      como rol "director" del centro.
--
-- NO crea cursos, docentes, estudiantes, actividades ni calificaciones.
-- NO modifica lógica principal del sistema.
--
-- PRERREQUISITOS:
--   A) Ejecutar primero fix_rls_recursion.sql (permite que perfiles cargue
--      y que el panel del centro funcione).
--   B) Crear la cuenta administrador@cielo.test con contraseña Cielo2026*
--      desde el dashboard (Authentication > Users > Add user) o registrándote
--      en la app. Es un correo de prueba: NO requiere confirmación de email;
--      el propio script la marca como confirmada automáticamente.
--      El script vincula al usuario por email; si no existe, avisa y puedes
--      volver a ejecutarlo después de crearla.
--
-- IDEMPOTENTE: puede ejecutarse varias veces sin errores.
-- ═══════════════════════════════════════════════════════════════════

DO $$
DECLARE
    v_user_id   uuid;
    v_centro_id uuid;
BEGIN
    -- ───────────────────────────────────────────────────────────────
    -- 1) LOCALIZAR al administrador por email (puede no existir aún)
    -- ───────────────────────────────────────────────────────────────
    SELECT id INTO v_user_id
    FROM auth.users
    WHERE lower(email) = 'administrador@cielo.test'
    LIMIT 1;

    -- ───────────────────────────────────────────────────────────────
    -- 2) ASEGURAR el CENTRO EDUCATIVO CIELO
    -- ───────────────────────────────────────────────────────────────
    SELECT id INTO v_centro_id
    FROM public.centros
    WHERE codigo_centro = 'CIELO-001'
    LIMIT 1;

    IF v_centro_id IS NULL THEN
        INSERT INTO public.centros (nombre, codigo_centro, estado, afiliado)
        VALUES ('Centro Educativo CIELO', 'CIELO-001', 'activo', true)
        RETURNING id INTO v_centro_id;
    ELSE
        UPDATE public.centros
        SET nombre    = 'Centro Educativo CIELO',
            estado    = 'activo',
            afiliado  = true,
            updated_at = timezone('utc'::text, now())
        WHERE id = v_centro_id;
    END IF;

    -- ───────────────────────────────────────────────────────────────
    -- 3) CÓDIGO DE ACCESO para que los docentes se vinculen al centro
    --    (usos_restantes NULL = ilimitado, valido_hasta NULL = sin expiración)
    -- ───────────────────────────────────────────────────────────────
    INSERT INTO public.codigos_acceso_centro (centro_id, codigo, usos_restantes, estado, created_by)
    VALUES (v_centro_id, 'CIELO-001', NULL, 'activo', v_user_id)
    ON CONFLICT (codigo) DO UPDATE
        SET centro_id = EXCLUDED.centro_id,
            estado    = 'activo';

    -- ───────────────────────────────────────────────────────────────
    -- 4) VINCULAR al ADMINISTRADOR como DIRECTOR del centro
    -- ───────────────────────────────────────────────────────────────
    IF v_user_id IS NULL THEN
        RAISE NOTICE 'El usuario administrador@cielo.test aún no existe. Créalo desde Authentication > Users > Add user (contraseña Cielo2026*) y vuelve a ejecutar este script para vincularlo al centro.';
    ELSE
        -- Correo de prueba: marcar como confirmado para que pueda iniciar sesión
        -- sin necesidad de verificar el email.
        UPDATE auth.users
        SET email_confirmed_at = COALESCE(email_confirmed_at, now())
        WHERE id = v_user_id;

        INSERT INTO public.centro_roles (centro_id, user_id, rol)
        VALUES (v_centro_id, v_user_id, 'director')
        ON CONFLICT (centro_id, user_id) DO UPDATE SET rol = 'director';

        INSERT INTO public.perfiles (user_id, nombre, nombre_docente, avatar_color, centro_id)
        VALUES (v_user_id, 'Administrador CIELO', 'Administrador CIELO', '#3b82f6', v_centro_id)
        ON CONFLICT (user_id) DO UPDATE
            SET nombre         = EXCLUDED.nombre,
                nombre_docente = EXCLUDED.nombre_docente,
                centro_id      = EXCLUDED.centro_id;
    END IF;
END $$;


-- ═══════════════════════════════════════════════════════════════════
-- VERIFICACIÓN (solo lectura)
-- ═══════════════════════════════════════════════════════════════════

-- Centro
SELECT id, nombre, codigo_centro, estado, afiliado
FROM public.centros
WHERE codigo_centro = 'CIELO-001';

-- Código de acceso
SELECT c.nombre, cac.codigo, cac.estado, cac.usos_restantes
FROM public.codigos_acceso_centro cac
JOIN public.centros c ON c.id = cac.centro_id
WHERE cac.codigo = 'CIELO-001';

-- Administrador (rol + perfil + email confirmado)
SELECT u.email, u.email_confirmed_at, cr.rol, p.nombre_docente, p.centro_id
FROM auth.users u
LEFT JOIN public.centro_roles cr ON cr.user_id = u.id
LEFT JOIN public.perfiles p      ON p.user_id = u.id
WHERE lower(u.email) = 'administrador@cielo.test';


-- ═══════════════════════════════════════════════════════════════════
-- NOTAS / PENDIENTES
--  A) La política "Gestión de códigos por director" (migration_suscripciones
--     tilopay.sql) solo permite leer codigos_acceso_centro a directores.
--     El flujo de vinculación de docentes a un centro (unirse con código) consulta
--     esa tabla, por lo que un docente normal no vería el código. Para habilitarlo,
--     descomenta la política siguiente (cambia una política RLS, no la
--     lógica del sistema):
--
--     CREATE POLICY "Lectura de códigos de acceso para unirse al centro"
--     ON public.codigos_acceso_centro FOR SELECT TO authenticated
--     USING (true);
--
--  B) No se creó suscripción (institucional/individual) porque el entorno
--     mínimo no lo requiere; se añadirá con el flujo normal de pago.
-- ═══════════════════════════════════════════════════════════════════
