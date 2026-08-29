-- ══════════════════════════════════════════════════════════════════════
--  DIAGNÓSTICO DE PRODUCCIÓN — SOLO LECTURA
--  Proyecto: Evaluación por Competencias (CIELO)
--
--  PROPÓSITO: verificar el estado real de la BD ANTES de aplicar
--  migration_centro_existente_admin.sql (RPC asignar_centro_administrador).
--
--  IMPORTANTE: este script NO crea, NO modifica y NO elimina nada.
--  Contiene únicamente SELECT y bloques DO con RAISE NOTICE (encabezados).
--
--  CÓMO USARLO:
--    1. Supabase → SQL Editor → New query.
--    2. Pegar TODO el contenido de este archivo y pulsar RUN.
--    3. Copiar la salida COMPLETA (pestañas Result + Notices) y compartirla.
--
--  ÍNDICE:
--    0.  Contexto del servidor y estado RLS global.
--    1.  Triggers sobre perfiles (¿existe prevent_rol_update?).
--    2.  Defincion de las funciones usadas por esos triggers.
--    3.  Columnas, tipos y valores por defecto (perfiles/centro_roles/centros).
--    4.  Constraints de las tres tablas (PK / UNIQUE / CHECK / FK).
--    5.  Índices (incl. UNIQUE necesarios para el ON CONFLICT).
--    6.  Restricciones específicas sobre perfiles.rol.
--    7.  Políticas RLS de perfiles / centro_roles / centros.
--    8.  Privilegios de la rol "authenticated" (tablas y funciones).
--    9.  Funciones/RPC existentes relacionadas con admins de centros.
--   10.  (Referencia) Triggers sobre auth.users (creación del perfil).
-- ══════════════════════════════════════════════════════════════════════

-- ──────────────────────────────────────────────
-- 0) SERVIDOR Y ESTADO RLS GLOBAL
-- ──────────────────────────────────────────────
DO $$ BEGIN RAISE NOTICE '═ 0) SERVIDOR Y ESTADO RLS ═'; END $$;

SELECT version();

SELECT c.relname AS tabla,
       c.relrowsecurity    AS rls_habilitada,
       c.relforcerowsecurity AS forzar_rls
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
 WHERE n.nspname = 'public'
   AND c.relname IN ('perfiles', 'centro_roles', 'centros')
 ORDER BY c.relname;

-- ──────────────────────────────────────────────
-- 1) TRIGGERS SOBRE public.perfiles
-- ──────────────────────────────────────────────
DO $$ BEGIN RAISE NOTICE '═ 1) TRIGGERS SOBRE public.perfiles ═'; END $$;

SELECT t.tgname AS trigger,
       p.proname AS funcion,
       CASE t.tgenabled
         WHEN 'O' THEN 'habilitado'
         WHEN 'D' THEN 'DESHABILITADO'
         WHEN 'R' THEN 'deshabilitado (REPLICA)'
         WHEN 'A' THEN 'deshabilitado (ALWAYS)'
         ELSE t.tgenabled END AS estado,
       pg_get_triggerdef(t.oid) AS definicion
  FROM pg_trigger t
  JOIN pg_proc p ON p.oid = t.tgfoid
 WHERE t.tgrelid = 'public.perfiles'::regclass
   AND NOT t.tgisinternal
 ORDER BY t.tgname;

-- 1b) DETECCIÓN: ¿existe el trigger/función de control de rol?
DO $$ BEGIN RAISE NOTICE '═ 1b) DETECCIÓN trigger/función de control de rol ═'; END $$;

SELECT
  EXISTS(
    SELECT 1 FROM pg_trigger t
     WHERE t.tgrelid = 'public.perfiles'::regclass
       AND NOT t.tgisinternal
       AND t.tgname IN ('on_perfil_update_rol', 'prevent_rol_update')
  ) AS existe_trigger_de_rol_en_perfiles,

  EXISTS(
    SELECT 1 FROM pg_proc p
     JOIN pg_namespace n ON n.oid = p.pronamespace
     WHERE n.nspname = 'public'
       AND p.proname = 'prevent_rol_update'
  ) AS existe_funcion_prevent_rol_update,

  (SELECT count(*) FROM pg_trigger t
    WHERE t.tgrelid = 'public.perfiles'::regclass
      AND NOT t.tgisinternal) AS total_triggers_sobre_perfiles;

-- ──────────────────────────────────────────────
-- 2) DEFINICIÓN DE LAS FUNCIONES EJECUTADAS POR ESOS TRIGGERS
-- ──────────────────────────────────────────────
DO $$ BEGIN RAISE NOTICE '═ 2) FUNCIONES USADAS POR LOS TRIGGERS DE perfiles ═'; END $$;

SELECT p.oid::regprocedure AS funcion,
       p.prosecdef AS es_security_definer,
       pg_get_functiondef(p.oid) AS definicion
  FROM pg_proc p
  JOIN pg_trigger t ON t.tgfoid = p.oid
 WHERE t.tgrelid = 'public.perfiles'::regclass
   AND NOT t.tgisinternal
 ORDER BY p.proname;

-- ──────────────────────────────────────────────
-- 3) COLUMNAS: TIPO, NULL, DEFAULT
-- ──────────────────────────────────────────────
DO $$ BEGIN RAISE NOTICE '═ 3) ESTRUCTURA DE COLUMNAS ═'; END $$;

SELECT c.relname AS tabla,
       a.attname AS columna,
       format_type(a.atttypid, a.atttypmod) AS tipo,
       NOT a.attnotnull AS permite_null,
       pg_get_expr(d.adbin, d.adrelid) AS default_,
       col_description(a.attrelid, a.attnum) AS comentario
  FROM pg_attribute a
  JOIN pg_class c ON c.oid = a.attrelid
  JOIN pg_namespace n ON n.oid = c.relnamespace
  LEFT JOIN pg_attrdef d ON d.adrelid = a.attrelid AND d.adnum = a.attnum
 WHERE n.nspname = 'public'
   AND c.relname IN ('perfiles', 'centro_roles', 'centros')
   AND a.attnum > 0
   AND NOT a.attisdropped
 ORDER BY c.relname, a.attnum;

-- ──────────────────────────────────────────────
-- 4) CONSTRAINTS (PK / UNIQUE / CHECK / FK)
-- ──────────────────────────────────────────────
DO $$ BEGIN RAISE NOTICE '═ 4) CONSTRAINTS DE perfiles / centro_roles / centros ═'; END $$;

SELECT conrelid::regclass::text AS tabla,
       conname AS nombre,
       CASE contype
         WHEN 'p' THEN 'PRIMARY KEY'
         WHEN 'u' THEN 'UNIQUE'
         WHEN 'c' THEN 'CHECK'
         WHEN 'f' THEN 'FOREIGN KEY'
         ELSE contype END AS tipo,
       convalidated AS validada,
       pg_get_constraintdef(oid) AS definicion
  FROM pg_constraint
 WHERE connamespace = 'public'::regnamespace
   AND conrelid IN ('public.perfiles'::regclass,
                    'public.centro_roles'::regclass,
                    'public.centros'::regclass)
 ORDER BY tabla, contype, conname;

-- ──────────────────────────────────────────────
-- 5) ÍNDICES (incl. UNIQUE necesarios para ON CONFLICT)
-- ──────────────────────────────────────────────
DO $$ BEGIN RAISE NOTICE '═ 5) ÍNDICES ═'; END $$;

SELECT tablename AS tabla,
       indexname AS indice,
       indexdef AS definicion
  FROM pg_indexes
 WHERE schemaname = 'public'
   AND tablename IN ('perfiles', 'centro_roles', 'centros')
 ORDER BY tablename, indexname;

-- ──────────────────────────────────────────────
-- 6) RESTRICCIONES ESCRITAS SOBRE perfiles.rol
-- ──────────────────────────────────────────────
DO $$ BEGIN RAISE NOTICE '═ 6) ¿ALGO RESTRINGE O REESCRIBE perfiles.rol? ═'; END $$;

-- a) CHECK constraints que mencionan la columna rol
SELECT conname, pg_get_constraintdef(oid) AS definicion
  FROM pg_constraint
 WHERE conrelid = 'public.perfiles'::regclass
   AND contype = 'c'
   AND pg_get_constraintdef(oid) ILIKE '%rol%'
 ORDER BY conname;

-- b) Funciones del esquema public cuyo código toca perfiles y el campo rol
SELECT p.oid::regprocedure AS funcion,
       p.prosecdef AS es_security_definer
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
 WHERE n.nspname = 'public'
   AND p.prosrc ILIKE '%perfiles%'
   AND (p.prosrc ILIKE '%NEW.rol%'
        OR p.prosrc ILIKE '%OLD.rol%'
        OR p.prosrc ILIKE '%SET rol%'
        OR p.prosrc ILIKE '%perfiles.rol%')
 ORDER BY p.proname;

-- ──────────────────────────────────────────────
-- 7) POLÍTICAS RLS
-- ──────────────────────────────────────────────
DO $$ BEGIN RAISE NOTICE '═ 7) POLÍTICAS RLS ═'; END $$;

SELECT schemaname,
       tablename,
       policyname,
       permissive::text AS permiso,
       roles::text AS roles,
       cmd AS operacion,
       qual AS uso,
       with_check AS con_check
  FROM pg_policies
 WHERE schemaname = 'public'
   AND tablename IN ('perfiles', 'centro_roles', 'centros')
 ORDER BY tablename, policyname;

-- ──────────────────────────────────────────────
-- 8) PRIVILEGIOS DE LA ROL "authenticated"
-- ──────────────────────────────────────────────
DO $$ BEGIN RAISE NOTICE '═ 8) PRIVILEGIOS authenticated (tablas) ═'; END $$;

SELECT tabla, operacion, para_authenticated
  FROM (
    SELECT 'perfiles' AS tabla, 'SELECT' AS operacion, has_table_privilege('authenticated','public.perfiles','SELECT')::text AS para_authenticated
    UNION ALL SELECT 'perfiles','INSERT', has_table_privilege('authenticated','public.perfiles','INSERT')::text
    UNION ALL SELECT 'perfiles','UPDATE', has_table_privilege('authenticated','public.perfiles','UPDATE')::text
    UNION ALL SELECT 'centro_roles','SELECT', has_table_privilege('authenticated','public.centro_roles','SELECT')::text
    UNION ALL SELECT 'centro_roles','INSERT', has_table_privilege('authenticated','public.centro_roles','INSERT')::text
    UNION ALL SELECT 'centro_roles','UPDATE', has_table_privilege('authenticated','public.centro_roles','UPDATE')::text
    UNION ALL SELECT 'centros','SELECT', has_table_privilege('authenticated','public.centros','SELECT')::text
    UNION ALL SELECT 'centros','INSERT', has_table_privilege('authenticated','public.centros','INSERT')::text
    UNION ALL SELECT 'centros','UPDATE', has_table_privilege('authenticated','public.centros','UPDATE')::text
  ) p
 ORDER BY tabla, operacion;

-- ──────────────────────────────────────────────
-- 9) FUNCIONES / RPC RELACIONADAS CON ADMINS DE CENTROS
-- ──────────────────────────────────────────────
DO $$ BEGIN RAISE NOTICE '═ 9) FUNCIONES/RPC RELACIONADAS ═'; END $$;

-- a) ¿Existe ya la función que vamos a crear (o su análoga)?
SELECT p.oid::regprocedure AS funcion,
       p.prosecdef AS es_security_definer,
       has_function_privilege('authenticated', p.oid, 'EXECUTE') AS authenticated_puede_ejecutar
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
 WHERE n.nspname = 'public'
   AND p.proname IN ('asignar_centro_administrador', 'aplicar_vinculo_usuario')
 ORDER BY p.proname;

-- b) Todas las funciones públicas con nombres relacionados
SELECT p.oid::regprocedure AS funcion,
       p.prosecdef AS es_security_definer,
       p.provolatile AS volatilidad,
       has_function_privilege('authenticated', p.oid, 'EXECUTE') AS authenticated_puede_ejecutar
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
 WHERE n.nspname = 'public'
   AND (p.proname ILIKE '%administrador%' OR p.proname ILIKE '%admin%'
        OR p.proname ILIKE '%rol%' OR p.proname ILIKE '%asignar%'
        OR p.proname ILIKE '%vincul%' OR p.proname ILIKE '%director%')
 ORDER BY p.proname;

-- c) Definición completa de las funciones críticas (si existen)
SELECT p.oid::regprocedure AS funcion,
       pg_get_functiondef(p.oid) AS definicion
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
 WHERE n.nspname = 'public'
   AND p.proname IN ('asignar_centro_administrador', 'aplicar_vinculo_usuario')
 ORDER BY p.proname;

-- ──────────────────────────────────────────────
-- 10) (REFERENCIA) TRIGGERS SOBRE auth.users
--     Aclara quién crea la fila de perfil al registrarse.
-- ──────────────────────────────────────────────
DO $$ BEGIN RAISE NOTICE '═ 10) TRIGGERS SOBRE auth.users ═'; END $$;

SELECT tgname AS trigger,
       CASE tgenabled WHEN 'O' THEN 'habilitado' ELSE tgenabled END AS estado,
       pg_get_triggerdef(t.oid) AS definicion
  FROM pg_trigger t
 WHERE t.tgrelid = 'auth.users'::regclass
   AND NOT t.tgisinternal
 ORDER BY tgname;