-- 1. Eliminar la política RLS que agregamos basada en perfiles.rol
DROP POLICY IF EXISTS "Permitir actualizacion a directores" ON public.centros;

-- Restaurar la política original para centros
CREATE POLICY "Permitir actualizacion a directores" ON public.centros
FOR UPDATE TO authenticated
USING (
    ((created_by = auth.uid()) OR (EXISTS ( SELECT 1 FROM centro_roles cr WHERE ((cr.centro_id = centros.id) AND (cr.user_id = auth.uid()) AND (cr.rol = ANY (ARRAY['director'::text, 'administrador'::text]))))))
);

-- 2. Eliminar el trigger que impedía modificar perfiles.rol
DROP TRIGGER IF EXISTS on_perfil_update_rol ON public.perfiles;
DROP FUNCTION IF EXISTS public.prevent_rol_update();

-- 3. Eliminar la columna rol de la tabla perfiles
ALTER TABLE public.perfiles DROP COLUMN IF EXISTS rol;

-- 4. Limpiar los registros falsos en centro_roles de maryestherescoboza@gmail.com
-- Ojo: No borraremos todos, solo aquel creado por el trigger falso de hoy
DELETE FROM public.centro_roles
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'maryestherescoboza@gmail.com')
AND rol = 'director' 
AND created_at > '2026-08-07 00:00:00';
