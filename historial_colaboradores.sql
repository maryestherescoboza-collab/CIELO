-- Crear la tabla si no existe
CREATE TABLE IF NOT EXISTS public.historial_colaboradores (
    usuario_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    publicaciones_realizadas INT DEFAULT 0 NOT NULL,
    periodo TEXT DEFAULT 'histórico' NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Habilitar seguridad a nivel de fila (RLS)
ALTER TABLE public.historial_colaboradores ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Lectura pública historial" ON public.historial_colaboradores;
CREATE POLICY "Lectura pública historial" ON public.historial_colaboradores FOR SELECT USING (true);

-- Insertar datos iniciales basados en posts existentes
INSERT INTO public.historial_colaboradores (usuario_id, publicaciones_realizadas, periodo, updated_at)
SELECT user_id, COUNT(*), 'histórico', now()
FROM public.posts
GROUP BY user_id
ON CONFLICT (usuario_id) DO UPDATE SET
    publicaciones_realizadas = EXCLUDED.publicaciones_realizadas;

-- Crear la función del trigger para incrementar el contador de publicaciones
CREATE OR REPLACE FUNCTION public.handle_post_created()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.historial_colaboradores (usuario_id, publicaciones_realizadas, periodo, updated_at)
  VALUES (new.user_id, 1, 'histórico', now())
  ON CONFLICT (usuario_id) 
  DO UPDATE SET 
    publicaciones_realizadas = public.historial_colaboradores.publicaciones_realizadas + 1,
    updated_at = now();
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Crear el trigger
DROP TRIGGER IF EXISTS on_post_created ON public.posts;
CREATE TRIGGER on_post_created
  AFTER INSERT ON public.posts
  FOR EACH ROW EXECUTE PROCEDURE public.handle_post_created();
