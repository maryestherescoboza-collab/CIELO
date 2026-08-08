-- ══════════════════════════════════════════════════════════════════════
-- MIGRACIÓN AL MODELO BINARIO DE ROLES  (docente | administrador)
-- Proyecto: Evaluación por Competencias
--
-- EJECUTAR EN: Supabase Dashboard → SQL Editor
-- IMPORTANTE: No es DML por REST; requiere acceso directo al Postgres.
--
-- Antes de ejecutar, se verificó (solo lectura) que perfiles.rol solo
-- contiene: 'docente' (3) y 'director' (2). Cero valores atípicos.
-- ══════════════════════════════════════════════════════════════════════

-- 1) Reemplazar el constraint obsoleto (4 roles) por el binario.
--    Se hace ANTES del UPDATE para poder escribir `'administrador'`.
ALTER TABLE public.perfiles DROP CONSTRAINT IF EXISTS perfiles_rol_check;

ALTER TABLE public.perfiles
  ADD CONSTRAINT perfiles_rol_check
  CHECK (rol IN ('docente', 'administrador'));

-- 2) Garantizar el valor por defecto DOCENTE.
ALTER TABLE public.perfiles ALTER COLUMN rol SET DEFAULT 'docente';

-- 3) Migrar datos: 'director' pasa a 'administrador'.
--    (Los docentes existentes se conservan como 'docente'.)
UPDATE public.perfiles SET rol = 'administrador' WHERE rol = 'director';

-- 4) Alinear centro_roles con el modelo binario: 'director' → 'administrador'.
--    (is_centro_director() sigue reconociendo 'administrador'; la fila
--    heredada, si existe, queda coherente con perfiles.rol.)
UPDATE public.centro_roles SET rol = 'administrador' WHERE rol = 'director';

-- 5) Verificación final (debe mostrar {docente,administrador} en perfiles
--    y solo {administrador|docente} en centro_roles).
SELECT rol, count(*) FROM public.perfiles GROUP BY rol ORDER BY rol;
SELECT rol, count(*) FROM public.centro_roles GROUP BY rol ORDER BY rol;