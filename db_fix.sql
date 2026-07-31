-- 1. Agregar user_id a tablas faltantes
ALTER TABLE IF EXISTS public.docentes ADD COLUMN IF NOT EXISTS user_id uuid DEFAULT auth.uid() REFERENCES auth.users(id);

-- 2. Asegurar que user_id tenga el valor por defecto auth.uid() y sea NOT NULL donde sea crítico
-- Hacemos esto para todas las tablas que deben ser privadas del usuario
DO $$ 
DECLARE 
    t text;
BEGIN
    FOR t IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename IN (
        'cursos', 'estudiantes', 'actividades', 'calificaciones', 'secuencias', 
        'incidencias', 'recuperaciones', 'eventos', 'descriptores_rubrica', 
        'niveles_puntaje', 'criterios_cotejo', 'docentes', 
        'evaluaciones_rubrica', 'evaluaciones_cotejo'
    ) 
    LOOP
        EXECUTE format('ALTER TABLE public.%I ALTER COLUMN user_id SET DEFAULT auth.uid()', t);
        -- Opcional: EXECUTE format('ALTER TABLE public.%I ALTER COLUMN user_id SET NOT NULL', t);
    END LOOP;
END $$;

-- 3. Corregir Políticas RLS para incluir WITH CHECK y asegurar que cubran todas las operaciones
-- Eliminamos primero para recrear de forma limpia y consistente

-- CURSOS
DROP POLICY IF EXISTS "Gestión propia de cursos" ON public.cursos;
CREATE POLICY "Gestión propia de cursos" ON public.cursos
FOR ALL TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- ESTUDIANTES
DROP POLICY IF EXISTS "Gestión propia de estudiantes" ON public.estudiantes;
CREATE POLICY "Gestión propia de estudiantes" ON public.estudiantes
FOR ALL TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- ACTIVIDADES
DROP POLICY IF EXISTS "Gestión propia de actividades" ON public.actividades;
CREATE POLICY "Gestión propia de actividades" ON public.actividades
FOR ALL TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- CALIFICACIONES
DROP POLICY IF EXISTS "Gestión propia de calificaciones" ON public.calificaciones;
CREATE POLICY "Gestión propia de calificaciones" ON public.calificaciones
FOR ALL TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- SECUENCIAS
DROP POLICY IF EXISTS "Users can manage their own secuencias" ON public.secuencias;
CREATE POLICY "Gestión propia de secuencias" ON public.secuencias
FOR ALL TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- INCIDENCIAS
DROP POLICY IF EXISTS "Users can manage their own incidencias" ON public.incidencias;
CREATE POLICY "Gestión propia de incidencias" ON public.incidencias
FOR ALL TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- RECUPERACIONES
DROP POLICY IF EXISTS "Users can manage their own recuperaciones" ON public.recuperaciones;
CREATE POLICY "Gestión propia de recuperaciones" ON public.recuperaciones
FOR ALL TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- EVENTOS
DROP POLICY IF EXISTS "Users can manage their own eventos" ON public.eventos;
CREATE POLICY "Gestión propia de eventos" ON public.eventos
FOR ALL TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- DOCENTES
DROP POLICY IF EXISTS "Lectura pública docentes" ON public.docentes;
DROP POLICY IF EXISTS "Public read for authenticated users" ON public.docentes;
CREATE POLICY "Gestión propia de docentes" ON public.docentes
FOR ALL TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- CRITERIOS COTEJO
DROP POLICY IF EXISTS "Gestión propia criterios_cotejo" ON public.criterios_cotejo;
DROP POLICY IF EXISTS "Public read for authenticated users" ON public.criterios_cotejo;
CREATE POLICY "Gestión propia criterios_cotejo" ON public.criterios_cotejo
FOR ALL TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- NIVELES PUNTAJE
DROP POLICY IF EXISTS "Gestión propia niveles_puntaje" ON public.niveles_puntaje;
DROP POLICY IF EXISTS "Public read for authenticated users" ON public.niveles_puntaje;
CREATE POLICY "Gestión propia niveles_puntaje" ON public.niveles_puntaje
FOR ALL TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- DESCRIPTORES RUBRICA
DROP POLICY IF EXISTS "Gestión propia descriptores_rubrica" ON public.descriptores_rubrica;
DROP POLICY IF EXISTS "Public read for authenticated users" ON public.descriptores_rubrica;
CREATE POLICY "Gestión propia descriptores_rubrica" ON public.descriptores_rubrica
FOR ALL TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- EVALUACIONES RUBRICA
DROP POLICY IF EXISTS "Gestión propia evaluaciones_rubrica" ON public.evaluaciones_rubrica;
CREATE POLICY "Gestión propia evaluaciones_rubrica" ON public.evaluaciones_rubrica
FOR ALL TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- EVALUACIONES COTEJO
DROP POLICY IF EXISTS "Gestión propia evaluaciones_cotejo" ON public.evaluaciones_cotejo;
CREATE POLICY "Gestión propia evaluaciones_cotejo" ON public.evaluaciones_cotejo
FOR ALL TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- PERFILES
DROP POLICY IF EXISTS "Gestión propia perfiles" ON public.perfiles;
DROP POLICY IF EXISTS "Users can manage their own profile" ON public.perfiles;
CREATE POLICY "Gestión propia perfiles" ON public.perfiles
FOR ALL TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- POSTS (Comunidad) - Permite lectura pública pero edición propia
DROP POLICY IF EXISTS "Comunidad lectura pública" ON public.posts;
DROP POLICY IF EXISTS "Gestión propia posts" ON public.posts;
CREATE POLICY "Lectura pública posts" ON public.posts
FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Gestión propia posts" ON public.posts
FOR ALL TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 4. Asegurar compatibilidad de Identity
ALTER TABLE public.cursos ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY;
ALTER TABLE public.estudiantes ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY;
ALTER TABLE public.actividades ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY;
ALTER TABLE public.posts ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY;
ALTER TABLE public.secuencias ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY;
ALTER TABLE public.incidencias ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY;
ALTER TABLE public.eventos ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY;
ALTER TABLE public.descriptores_rubrica ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY;
ALTER TABLE public.criterios_cotejo ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY;
ALTER TABLE public.docentes ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY;
ALTER TABLE public.evaluaciones_rubrica ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY;
ALTER TABLE public.evaluaciones_cotejo ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY;

-- 5. Índices para mejorar rendimiento de filtros por user_id
CREATE INDEX IF NOT EXISTS idx_cursos_user_id ON public.cursos(user_id);
CREATE INDEX IF NOT EXISTS idx_estudiantes_user_id ON public.estudiantes(user_id);
CREATE INDEX IF NOT EXISTS idx_actividades_user_id ON public.actividades(user_id);
CREATE INDEX IF NOT EXISTS idx_calificaciones_user_id ON public.calificaciones(user_id);
CREATE INDEX IF NOT EXISTS idx_secuencias_user_id ON public.secuencias(user_id);
CREATE INDEX IF NOT EXISTS idx_incidencias_user_id ON public.incidencias(user_id);
CREATE INDEX IF NOT EXISTS idx_recuperaciones_user_id ON public.recuperaciones(user_id);
CREATE INDEX IF NOT EXISTS idx_eventos_user_id ON public.eventos(user_id);
CREATE INDEX IF NOT EXISTS idx_docentes_user_id ON public.docentes(user_id);

-- 6. Grant usage on sequences if they are used manually (sometimes needed)
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
