-- SCRIPT DE REPARACIÓN DE POLÍTICAS RLS Y ACCESIBILIDAD PARA SUPABASE
-- Objetivo: Garantizar que el usuario autenticado pueda realizar todas las operaciones CRUD.

-- 1. Limpieza de políticas previas para evitar duplicados
DO $$ 
DECLARE 
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname, tablename FROM pg_policies WHERE schemaname = 'public') 
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I', r.policyname, r.tablename);
    END LOOP;
END $$;

-- 2. Función auxiliar para configurar RLS estándar en una tabla
CREATE OR REPLACE FUNCTION setup_user_rls(table_name TEXT) RETURNS VOID AS $$
BEGIN
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_name);
    
    -- SELECT (Lectura propia)
    EXECUTE format('CREATE POLICY %I_select ON public.%I FOR SELECT TO authenticated USING (auth.uid() = user_id)', table_name, table_name);
    
    -- INSERT (Inserción propia con validación)
    EXECUTE format('CREATE POLICY %I_insert ON public.%I FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id)', table_name, table_name);
    
    -- UPDATE (Modificación propia con validación)
    EXECUTE format('CREATE POLICY %I_update ON public.%I FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)', table_name, table_name);
    
    -- DELETE (Eliminación propia)
    EXECUTE format('CREATE POLICY %I_delete ON public.%I FOR DELETE TO authenticated USING (auth.uid() = user_id)', table_name, table_name);
END;
$$ LANGUAGE plpgsql;

-- 3. Aplicar RLS a todas las tablas del sistema
SELECT setup_user_rls('cursos');
SELECT setup_user_rls('estudiantes');
SELECT setup_user_rls('actividades');
SELECT setup_user_rls('calificaciones');
SELECT setup_user_rls('recuperaciones');
SELECT setup_user_rls('secuencias');
SELECT setup_user_rls('incidencias');
SELECT setup_user_rls('eventos');
SELECT setup_user_rls('evaluaciones_rubrica');
SELECT setup_user_rls('evaluaciones_cotejo');
SELECT setup_user_rls('criterios_cotejo');
SELECT setup_user_rls('descriptores_rubrica');
SELECT setup_user_rls('niveles_puntaje');

-- 4. Casos Especiales (Comunidad / Perfiles)
-- Perfiles (identificado por 'id')
ALTER TABLE public.perfiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY perfiles_select ON public.perfiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY perfiles_insert ON public.perfiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY perfiles_update ON public.perfiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Comunidad / Posts (Lectura pública, creación propia)
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY posts_select ON public.posts FOR SELECT USING (true);
CREATE POLICY posts_insert ON public.posts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY posts_update ON public.posts FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY posts_delete ON public.posts FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Docentes (Visible para todos, edición propia)
ALTER TABLE public.docentes ENABLE ROW LEVEL SECURITY;
CREATE POLICY docentes_select ON public.docentes FOR SELECT USING (true);
CREATE POLICY docentes_all ON public.docentes FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 5. Trigger para creación automática de perfil
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.perfiles (id, instituto, updated_at)
  VALUES (new.id, 'Mi Instituto', now())
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 6. Garantizar que user_id sea un UUID NOT NULL en todas las tablas
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name NOT IN ('perfiles', 'schema_migrations'))
    LOOP
        BEGIN
            EXECUTE format('ALTER TABLE public.%I ALTER COLUMN user_id SET NOT NULL', r.table_name);
        EXCEPTION WHEN others THEN
            RAISE NOTICE 'No se pudo aplicar NOT NULL a tabla %', r.table_name;
        END;
    END LOOP;
END $$;
