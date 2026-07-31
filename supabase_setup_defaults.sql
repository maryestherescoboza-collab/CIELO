-- Configuración de Privilegios y RLS por defecto para Supabase
-- Ejecutar esto en el SQL Editor de Supabase (o a través de migraciones)
-- 1. Actualizar configuración de privilegios por defecto (Default Privileges) para el esquema 'public'
-- Esto asegura que todas las NUEVAS tablas creadas por 'postgres' tendrán los GRANTs necesarios para la Data API.
-- No afecta a las tablas que ya existen (no rompe funcionalidades actuales).
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
GRANT SELECT,
    INSERT,
    UPDATE,
    DELETE ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
GRANT SELECT,
    INSERT,
    UPDATE,
    DELETE ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
GRANT ALL ON TABLES TO service_role;
-- Dar uso de secuencias (necesario para campos SERIAL/BIGSERIAL autoincrementales)
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
GRANT USAGE ON SEQUENCES TO anon,
    authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
GRANT ALL ON SEQUENCES TO service_role;
-- Dar uso de funciones rutinarias
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
GRANT EXECUTE ON ROUTINES TO anon,
    authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
GRANT ALL ON ROUTINES TO service_role;
-- 2. Trigger de Eventos (Event Trigger) para habilitar RLS por defecto en nuevas tablas
-- y generar políticas básicas si la tabla cuenta con la columna 'user_id'.
CREATE OR REPLACE FUNCTION public.auto_setup_rls_on_new_table() RETURNS event_trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE obj record;
v_table_name text;
v_schema_name text;
has_user_id boolean;
BEGIN FOR obj IN
SELECT *
FROM pg_event_trigger_ddl_commands()
WHERE command_tag = 'CREATE TABLE' LOOP IF obj.schema_name = 'public'
    AND obj.object_type = 'table' THEN -- Obtener nombre real de la tabla
SELECT relname INTO v_table_name
FROM pg_class
WHERE oid = obj.objid;
v_schema_name := obj.schema_name;
-- 2.1. Habilitar RLS automáticamente
EXECUTE format(
    'ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY;',
    v_schema_name,
    v_table_name
);
-- 2.2. Revisar si la tabla recién creada tiene una columna llamada 'user_id'
SELECT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = v_schema_name
            AND table_name = v_table_name
            AND column_name = 'user_id'
    ) INTO has_user_id;
-- 2.3. Generar políticas básicas compatibles con auth.uid() si existe user_id
IF has_user_id THEN EXECUTE format(
    'CREATE POLICY "%I_select_own" ON %I.%I FOR SELECT TO authenticated USING (auth.uid() = user_id);',
    v_table_name,
    v_schema_name,
    v_table_name
);
EXECUTE format(
    'CREATE POLICY "%I_insert_own" ON %I.%I FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);',
    v_table_name,
    v_schema_name,
    v_table_name
);
EXECUTE format(
    'CREATE POLICY "%I_update_own" ON %I.%I FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);',
    v_table_name,
    v_schema_name,
    v_table_name
);
EXECUTE format(
    'CREATE POLICY "%I_delete_own" ON %I.%I FOR DELETE TO authenticated USING (auth.uid() = user_id);',
    v_table_name,
    v_schema_name,
    v_table_name
);
END IF;
END IF;
END LOOP;
END;
$$;
-- Limpiar el trigger existente si lo hubiera
DROP EVENT TRIGGER IF EXISTS on_create_table_setup_rls;
-- Crear el trigger de eventos sobre el comando CREATE TABLE
CREATE EVENT TRIGGER on_create_table_setup_rls ON ddl_command_end
WHEN TAG IN ('CREATE TABLE') EXECUTE FUNCTION public.auto_setup_rls_on_new_table();