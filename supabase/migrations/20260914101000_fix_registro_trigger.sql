CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.perfiles (user_id, nombre, nombre_docente)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'nombre_docente',
    NEW.raw_user_meta_data->>'nombre_docente'
  )
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN NEW;
END;
$$;

-- Asegurarnos de que el trigger esté asignado a auth.users (usualmente ya lo está, pero es buena práctica)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
