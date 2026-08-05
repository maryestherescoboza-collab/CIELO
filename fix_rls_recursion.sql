-- ═══════════════════════════════════════════════════════════════════
-- FIX RLS: RECURSIÓN Y REFERENCIAS A COLUMNAS INEXISTENTES
-- Proyecto: CIELO (Evaluación por competencias)
--
-- ALCANCE: SOLO políticas RLS. NO se modifican tablas, columnas,
-- triggers, funciones existentes ni lógica de negocio.
--
-- Problemas que corrige:
--   1. Política "perfiles_select_centro" (perfiles): su bloque USING
--      consulta la MISMA tabla perfiles → recursión infinita
--      (infinite recursion detected in policy for relation "perfiles").
--   2. Política "Lectura propia y de mi centro" (suscripciones):
--      subconsulta con perfiles.id → columna inexistente (42703).
--   3. Política "Gestión de roles por director" (centro_roles):
--      consulta centro_roles dentro de una política de centro_roles
--      → recursión infinita latente.
--
-- Estrategia: se crean funciones SECURITY DEFINER que rompen la
-- autorreferencia (se ejecutan con privilegios del dueño y NO
-- re-entran en RLS), y se reemplazan las políticas afectadas.
--
-- El script es idempotente: usa DROP POLICY IF EXISTS y
-- CREATE OR REPLACE FUNCTION, por lo que se puede ejecutar
-- varias veces sin errores.
--
-- REVISA el script antes de ejecutarlo en Supabase (SQL Editor).
-- ═══════════════════════════════════════════════════════════════════


-- ═══════════════════════════════════════════════════════════════════
-- 0) DIAGNÓSTICO (opcional — solo lectura, no modifica nada)
--    Muestra las políticas actuales de las tres tablas afectadas
--    para que puedas comparar antes/después.
-- ═══════════════════════════════════════════════════════════════════
SELECT schemaname, tablename, policyname, cmd, qual
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('perfiles', 'suscripciones', 'centro_roles')
ORDER BY tablename, policyname;


-- ═══════════════════════════════════════════════════════════════════
-- 1) FUNCIÓN AUXILIAR: public.get_user_centro_id()
--    Devuelve el centro_id del usuario autenticado (o NULL si no
--    pertenece a ninguno).
--    Se marca SECURITY DEFINER para que consulte perfiles sin
--    volver a aplicar RLS sobre perfiles (evita la recursión).
--    No cambia datos: es solo una lectura.
-- ═══════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.get_user_centro_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT centro_id FROM public.perfiles WHERE user_id = auth.uid() LIMIT 1;
$$;

-- Permite que los usuarios autenticados invoquen la función desde las
-- políticas RLS (las políticas se evalúan con el rol del usuario).
GRANT EXECUTE ON FUNCTION public.get_user_centro_id() TO authenticated;


-- ═══════════════════════════════════════════════════════════════════
-- 2) FUNCIÓN AUXILIAR: public.is_centro_director(p_centro_id)
--    Devuelve TRUE si el usuario autenticado es director o
--    administrador del centro indicado.
--    SECURITY DEFINER: consulta centro_roles sin re-entrar en RLS
--    (necesario para la política de centro_roles de la sección 5).
--    No cambia datos: es solo una lectura.
-- ═══════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.is_centro_director(p_centro_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.centro_roles
        WHERE centro_id = p_centro_id
          AND user_id = auth.uid()
          AND rol IN ('director', 'administrador')
    );
$$;

GRANT EXECUTE ON FUNCTION public.is_centro_director(uuid) TO authenticated;


-- ═══════════════════════════════════════════════════════════════════
-- 3) PERFILES — CORRECCIÓN DE RECURSIÓN EN "perfiles_select_centro"
--
-- POLÍTICA ACTUAL (la que genera la recursión):
--   CREATE POLICY "perfiles_select_centro"
--   ON public.perfiles FOR SELECT TO authenticated
--   USING (
--       centro_id IN (
--           SELECT centro_id FROM public.perfiles
--           WHERE user_id = auth.uid()
--       )
--   );
--
-- MOTIVO: el subquery `SELECT centro_id FROM public.perfiles ...`
-- vuelve a evaluar RLS sobre perfiles, y la política se llama a sí
-- misma → "infinite recursion detected in policy for relation
-- 'perfiles'". Este error rompe TODA consulta a perfiles (carga de
-- datos, presencia, panel de centro, etc.).
--
-- ACCIÓN: se elimina la política recursiva y se crea una versión que
-- consulta el centro del usuario a través de la función SECURITY
-- DEFINER (sin RLS). Además, el usuario siempre puede ver su propio
-- perfil (necesario para el estado de presencia y el onboarding).
-- ═══════════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "perfiles_select_centro" ON public.perfiles;

CREATE POLICY "perfiles_select_centro"
ON public.perfiles FOR SELECT TO authenticated
USING (
    centro_id = public.get_user_centro_id()
    OR user_id = auth.uid()
);


-- ═══════════════════════════════════════════════════════════════════
-- 4) PERFILES — LIMPIEZA PREVENTIVA DE POLÍTICAS CON COLUMNA "id"
--
-- Otras migraciones del proyecto definen políticas sobre perfiles con
-- `auth.uid() = id` ("Gestión propia perfiles", "perfiles_select",
-- "perfiles_insert", "perfiles_update", "select_own_profile",
-- "insert_own_profile", "update_own_profile", "Users can manage their
-- own profile"). La tabla perfiles NO tiene columna "id" (su clave es
-- user_id), por lo que si alguna de estas políticas existiera en la
-- base, cada consulta a perfiles fallaría con 42703 (column "id" does
-- not exist).
--
-- ACCIÓN: se eliminan por si acaso estuvieran presentes. DROP POLICY
-- IF EXISTS es inocuo si no existen. NO se recrean equivalentes aquí
-- para no añadir permisos nuevos más allá del alcance solicitado.
-- ═══════════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "Gestión propia perfiles" ON public.perfiles;
DROP POLICY IF EXISTS "Users can manage their own profile" ON public.perfiles;
DROP POLICY IF EXISTS "perfiles_select" ON public.perfiles;
DROP POLICY IF EXISTS "perfiles_insert" ON public.perfiles;
DROP POLICY IF EXISTS "perfiles_update" ON public.perfiles;
DROP POLICY IF EXISTS "select_own_profile" ON public.perfiles;
DROP POLICY IF EXISTS "insert_own_profile" ON public.perfiles;
DROP POLICY IF EXISTS "update_own_profile" ON public.perfiles;


-- ═══════════════════════════════════════════════════════════════════
-- 5) SUSCRIPCIONES — CORRECCIÓN DE "Lectura propia y de mi centro"
--
-- POLÍTICA ACTUAL (con columna inexistente):
--   CREATE POLICY "Lectura propia y de mi centro"
--   ON public.suscripciones FOR SELECT TO authenticated
--   USING (
--       user_id = auth.uid()
--       OR centro_id IN (
--           SELECT centro_id FROM public.perfiles
--           WHERE perfiles.id = auth.uid()   -- ← "id" NO existe
--       )
--   );
--
-- MOTIVO: la subconsulta usa `perfiles.id`, pero la tabla perfiles
-- no tiene columna "id" (su clave es user_id) → la política falla
-- con 42703 (column "id" does not exist) y bloquea la lectura de
-- suscripciones (se usa para calcular hasPremium y la pantalla de
-- Suscripción).
--
-- ACCIÓN: se reemplaza por una versión equivalente que obtiene el
-- centro del usuario mediante la función auxiliar get_user_centro_id()
-- (lee perfiles.user_id internamente). El resultado es idéntico.
-- ═══════════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "Lectura propia y de mi centro" ON public.suscripciones;

CREATE POLICY "Lectura propia y de mi centro"
ON public.suscripciones FOR SELECT TO authenticated
USING (
    user_id = auth.uid()
    OR centro_id = public.get_user_centro_id()
);


-- NOTA: La otra política de suscripciones ("Edición de suscripciones")
-- se revisó: consulta centro_roles desde una política de suscripciones
-- (tabla distinta) y usa `user_id = auth.uid()`, por lo que NO genera
-- recursión ni columnas inexistentes. Se deja intacta.


-- ═══════════════════════════════════════════════════════════════════
-- 6) CENTRO_ROLES — CORRECCIÓN DE RECURSIÓN EN "Gestión de roles por director"
--
-- POLÍTICA ACTUAL (recursiva):
--   CREATE POLICY "Gestión de roles por director"
--   ON public.centro_roles FOR ALL TO authenticated
--   USING (
--       EXISTS (
--           SELECT 1 FROM public.centro_roles cr
--           WHERE cr.centro_id = centro_roles.centro_id ...
--       )
--       OR EXISTS (
--           SELECT 1 FROM public.centros c
--           WHERE c.id = centro_roles.centro_id ...
--       )
--   );
--
-- MOTIVO: el primer EXISTS consulta centro_roles dentro de una
-- política SOBRE centro_roles → recursión infinita cada vez que se
-- lee o escribe centro_roles (la app lo consulta al cargar).
--
-- ACCIÓN: se sustituye el subquery interno por la función SECURITY
-- DEFINER is_centro_director() (consulta centro_roles sin re-entrar
-- en RLS). Se conserva la regla del creador del centro
-- (centros.created_by) tal y como estaba.
-- ═══════════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "Gestión de roles por director" ON public.centro_roles;

CREATE POLICY "Gestión de roles por director"
ON public.centro_roles FOR ALL TO authenticated
USING (
    public.is_centro_director(centro_roles.centro_id)
    OR EXISTS (
        SELECT 1 FROM public.centros c
        WHERE c.id = centro_roles.centro_id
          AND c.created_by = auth.uid()
    )
)
WITH CHECK (
    public.is_centro_director(centro_roles.centro_id)
    OR EXISTS (
        SELECT 1 FROM public.centros c
        WHERE c.id = centro_roles.centro_id
          AND c.created_by = auth.uid()
    )
);

-- NOTA: La política "Lectura pública de roles de mi centro"
-- (SELECT USING true) no genera recursión; se deja intacta.


-- ═══════════════════════════════════════════════════════════════════
-- 7) VERIFICACIÓN (opcional — solo lectura)
--    Vuelve a listar las políticas para confirmar que no queda
--    ninguna autorreferencia en perfiles ni centro_roles.
-- ═══════════════════════════════════════════════════════════════════
SELECT schemaname, tablename, policyname, cmd, qual
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('perfiles', 'suscripciones', 'centro_roles')
ORDER BY tablename, policyname;


-- ═══════════════════════════════════════════════════════════════════
-- OBSERVACIONES (NO modificadas por este script — fuera de alcance)
--   A) El trigger `handle_new_user` de supabase_fix.sql inserta en
--      `perfiles (id, instituto, updated_at)`; la columna "id" no
--      existe → si el trigger está activo podría fallar el registro.
--      Requiere revisión aparte.
--   B) La tabla centro_roles está vacía (no hay directores asignados).
--      El rol de director se asigna con el trigger `on_centro_created`
--      (migration_suscripciones_tilopay.sql), que también debería
--      verificarse.
--   C) El error "Streaming response failed: [503] The request queue
--      is full" es un síntoma de saturación; debería resolverse al
--      corregir la recursión (cada carga disparaba múltiples consultas
--      recursivas). Si persistiera, revisar capacidad del proyecto.
-- ═══════════════════════════════════════════════════════════════════
