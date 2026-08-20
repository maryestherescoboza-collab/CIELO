-- migration_centros_no_afiliados.sql

-- 1. Agregar política RLS para permitir a usuarios de un centro no afiliado editar sus datos
-- Nos aseguramos de no duplicarla si ya existe
DROP POLICY IF EXISTS "Edicion colaborativa centros no afiliados" ON public.centros;

CREATE POLICY "Edicion colaborativa centros no afiliados" ON public.centros
FOR UPDATE TO authenticated
USING (
    afiliado = false 
    AND id = (SELECT centro_id FROM public.perfiles WHERE id = auth.uid())
);

-- 2. Trigger para proteger campos administrativos de cambios no autorizados
-- (Solo permitimos modificar id, created_by, afiliado o estado si es a través de un backend con service_role)
CREATE OR REPLACE FUNCTION public.prevent_centro_sensitive_updates()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Si la petición viene de un usuario autenticado desde el cliente (no service_role ni postgres admin),
    -- revertimos cualquier intento de modificar campos críticos.
    IF auth.role() = 'authenticated' THEN
        NEW.id = OLD.id;
        NEW.created_by = OLD.created_by;
        NEW.afiliado = OLD.afiliado;
        NEW.estado = OLD.estado;
    END IF;
    
    -- Siempre actualizamos el updated_at automáticamente
    NEW.updated_at = now();
    
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_centro_sensitive_updates ON public.centros;
CREATE TRIGGER on_centro_sensitive_updates
BEFORE UPDATE ON public.centros
FOR EACH ROW
EXECUTE FUNCTION public.prevent_centro_sensitive_updates();
