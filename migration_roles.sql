-- 1. Añadir la columna 'rol' a 'perfiles' con valores válidos
ALTER TABLE public.perfiles 
ADD COLUMN IF NOT EXISTS rol text DEFAULT 'docente';

ALTER TABLE public.perfiles 
ADD CONSTRAINT perfiles_rol_check 
CHECK (rol IN ('docente', 'director', 'administrador_centro', 'administrador_global'));

-- 2. Migrar los roles existentes de centro_roles a perfiles
UPDATE public.perfiles
SET rol = cr.rol
FROM public.centro_roles cr
WHERE perfiles.user_id = cr.user_id
  AND cr.rol IN ('director', 'administrador_centro');

-- 3. Eliminar el trigger que asigna el rol de director a cualquiera que cree un centro
DROP TRIGGER IF EXISTS on_centro_created ON public.centros;
DROP FUNCTION IF EXISTS public.handle_new_centro();

-- Nota: No se elimina la tabla centro_roles por ahora para no romper 
-- integraciones externas, pero el frontend dejará de usarla como fuente de verdad.
