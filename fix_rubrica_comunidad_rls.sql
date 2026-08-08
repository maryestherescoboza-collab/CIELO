-- ==========================================
-- fix_rubrica_comunidad_rls.sql
-- Permite lectura pública CONDICIONAL de recursos publicados en posts
-- ==========================================

-- 1. Políticas RLS para la tabla public.plantillas
-- Eliminar políticas previas para evitar colisiones
DROP POLICY IF EXISTS "Lectura pública plantillas compartidas" ON public.plantillas;
DROP POLICY IF EXISTS "Lectura plantillas select" ON public.plantillas;
DROP POLICY IF EXISTS "Gestión propia de plantillas" ON public.plantillas;

-- Crear política condicional para SELECT (dueño o si está publicada en posts)
CREATE POLICY "Lectura pública plantillas compartidas" ON public.plantillas
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM public.posts p 
      WHERE p.recurso_id = public.plantillas.id 
        AND p.tipo = 'rubrica'
    )
  );

-- Crear política para modificaciones (solo el dueño puede insertar/actualizar/borrar)
CREATE POLICY "Gestión propia de plantillas" ON public.plantillas
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);


-- 2. Políticas RLS para la tabla public.descriptores_rubrica
-- Eliminar políticas previas
DROP POLICY IF EXISTS "Lectura pública descriptores compartidos" ON public.descriptores_rubrica;
DROP POLICY IF EXISTS "Gestión propia descriptores_rubrica" ON public.descriptores_rubrica;

-- Crear política condicional para SELECT (dueño o si su plantilla correspondiente está en posts)
CREATE POLICY "Lectura pública descriptores compartidos" ON public.descriptores_rubrica
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM public.posts p 
      WHERE p.recurso_id = public.descriptores_rubrica.plantilla_id 
        AND p.tipo = 'rubrica'
    )
  );

-- Crear política para modificaciones (solo el dueño puede insertar/actualizar/borrar)
CREATE POLICY "Gestión propia descriptores_rubrica" ON public.descriptores_rubrica
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
