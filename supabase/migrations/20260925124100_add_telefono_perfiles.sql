ALTER TABLE public.perfiles
ADD COLUMN IF NOT EXISTS telefono VARCHAR(20);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.perfiles (user_id, nombre, nombre_docente, telefono)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'nombre_docente',
    NEW.raw_user_meta_data->>'nombre_docente',
    NEW.raw_user_meta_data->>'telefono'
  )
  ON CONFLICT (user_id) DO UPDATE 
  SET 
    nombre = EXCLUDED.nombre,
    nombre_docente = EXCLUDED.nombre_docente,
    telefono = EXCLUDED.telefono;
  
  RETURN NEW;
END;
$$;
