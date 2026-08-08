-- ============================================================
-- remove_post_likes.sql
-- ELIMINA por completo el sistema de "me gusta" (likes) de la app.
-- La funcionalidad fue retirada del frontend. Este script limpia
-- el backend/Supabase para que no quede ningún objeto de likes.
--
-- ⚠ IMPORTANTE (antes de ejecutar):
--   * Es destructivo y NO reversible. Ejecutar en la consola SQL
--     de Supabase (SQL Editor) con rol postgres/service_role.
--   * Se pierde el histórico de likes almacenado en post_likes.
--
-- Orden correcto:
--   1) DROP TRIGGER      (enlazado a la tabla post_likes)
--   2) DROP FUNCTION     (función del trigger)
--   3) DROP POLICY       (todas las políticas RLS de post_likes)
--   4) DROP TABLE        (post_likes; junto con PK, índice y constraints)
--   5) DROP COLUMN likes (columna de conteo en public.posts)
-- ============================================================

-- 1) Trigger y función de sincronización del contador
DROP TRIGGER IF EXISTS tr_sync_post_likes ON public.post_likes;
DROP FUNCTION IF EXISTS public.sync_post_likes_count();

-- 2) Políticas RLS creadas a lo largo del historial de fixes
DROP POLICY IF EXISTS "likes_select"            ON public.post_likes;
DROP POLICY IF EXISTS "likes_insert"            ON public.post_likes;
DROP POLICY IF EXISTS "likes_delete"            ON public.post_likes;
DROP POLICY IF EXISTS "likes_update"            ON public.post_likes;
DROP POLICY IF EXISTS "likes_insert_any_post"   ON public.post_likes;
DROP POLICY IF EXISTS "likes_select_auth"       ON public.post_likes;
DROP POLICY IF EXISTS "likes_delete_own"        ON public.post_likes;
DROP POLICY IF EXISTS "Users can insert their own likes" ON public.post_likes;
DROP POLICY IF EXISTS "Users can select their own likes" ON public.post_likes;
DROP POLICY IF EXISTS "Users can delete their own likes" ON public.post_likes;
DROP POLICY IF EXISTS "Gestión propia de likes" ON public.post_likes;
DROP POLICY IF EXISTS "Lectura likes"           ON public.post_likes;
DROP POLICY IF EXISTS "Likes autenticados"      ON public.post_likes;

-- 3) Tabla relacional (borra también su UNIQUE, índice y el id de identidad)
DROP TABLE IF EXISTS public.post_likes;

-- 4) Columna de conteo denormalizada en posts (ya no se usa)
ALTER TABLE public.posts DROP COLUMN IF EXISTS likes;

-- 5) VERIFICACIÓN (debe devolver 0 filas)
SELECT tablename
FROM pg_tables
WHERE schemaname = 'public' AND tablename = 'post_likes';

SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'posts' AND column_name = 'likes';

SELECT proname
FROM pg_proc
WHERE proname = 'sync_post_likes_count';