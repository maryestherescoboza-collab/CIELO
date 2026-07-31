-- ============================================================
-- FIX: Reparación de políticas RLS para recuperaciones y calificaciones
-- Ejecutar en: Supabase Dashboard → SQL Editor
-- Problema: Las políticas actuales referencian is_course_teacher()
--           que falla con error 42501 (permission denied)
-- ============================================================

-- 1. Limpiar TODAS las políticas existentes en las tablas afectadas
DO $$ 
DECLARE 
    pol RECORD;
BEGIN
    FOR pol IN (SELECT policyname, tablename FROM pg_policies 
                WHERE tablename IN ('recuperaciones', 'calificaciones') 
                AND schemaname = 'public') 
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, pol.tablename);
        RAISE NOTICE 'Eliminada política: % en tabla %', pol.policyname, pol.tablename;
    END LOOP;
END $$;

-- 2. Asegurar que RLS esté habilitado
ALTER TABLE public.recuperaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calificaciones ENABLE ROW LEVEL SECURITY;

-- 3. Recrear políticas simples basadas en user_id para RECUPERACIONES
CREATE POLICY "select_own_recuperaciones" ON public.recuperaciones 
    FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "insert_own_recuperaciones" ON public.recuperaciones 
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update_own_recuperaciones" ON public.recuperaciones 
    FOR UPDATE TO authenticated USING (auth.uid() = user_id) 
    WITH CHECK (auth.uid() = user_id);
CREATE POLICY "delete_own_recuperaciones" ON public.recuperaciones 
    FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- 4. Recrear políticas simples basadas en user_id para CALIFICACIONES
CREATE POLICY "select_own_calificaciones" ON public.calificaciones 
    FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "insert_own_calificaciones" ON public.calificaciones 
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update_own_calificaciones" ON public.calificaciones 
    FOR UPDATE TO authenticated USING (auth.uid() = user_id) 
    WITH CHECK (auth.uid() = user_id);
CREATE POLICY "delete_own_calificaciones" ON public.calificaciones 
    FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- 5. Asegurar permisos de la función is_course_teacher (para otros usos)
GRANT EXECUTE ON FUNCTION public.is_course_teacher(bigint) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_course_teacher(integer) TO anon, authenticated;

-- 6. Verificación: Listar políticas activas
SELECT tablename, policyname, cmd, qual 
FROM pg_policies 
WHERE tablename IN ('recuperaciones', 'calificaciones') 
AND schemaname = 'public'
ORDER BY tablename, policyname;
