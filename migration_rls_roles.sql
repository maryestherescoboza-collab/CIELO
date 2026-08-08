-- 1. Actualizar política de UPDATE para Centros
DROP POLICY IF EXISTS "Permitir actualizacion a directores" ON public.centros;

CREATE POLICY "Permitir actualizacion a directores" ON public.centros
FOR UPDATE TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.perfiles p
        WHERE p.user_id = auth.uid()
        AND (
            (p.rol = 'director' AND p.centro_id = centros.id) OR
            p.rol = 'administrador_global' OR
            p.rol = 'administrador_centro'
        )
    )
);

-- 2. Asegurar que los usuarios no puedan inyectar roles a si mismos en la tabla perfiles
-- Vamos a crear un trigger que prevenga la actualización de 'rol' por el propio usuario,
-- a menos que sea a través de un admin o en el momento de creación (INSERT).

CREATE OR REPLACE FUNCTION public.prevent_rol_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Si el rol intentó cambiarse y el usuario que lo ejecuta no es un admin global, 
    -- lo revertimos silenciosamente a su valor anterior (o lanzamos error).
    -- Aquí lo revertiremos para no romper la app si el frontend manda el rol sin querer.
    IF NEW.rol IS DISTINCT FROM OLD.rol THEN
        IF NOT EXISTS (
            SELECT 1 FROM public.perfiles 
            WHERE user_id = auth.uid() AND rol = 'administrador_global'
        ) THEN
            NEW.rol = OLD.rol;
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_perfil_update_rol ON public.perfiles;
CREATE TRIGGER on_perfil_update_rol
BEFORE UPDATE ON public.perfiles
FOR EACH ROW
EXECUTE FUNCTION public.prevent_rol_update();
