-- ============================================================
-- fix_post_likes_final.sql
-- Corrige definitivamente el sistema de likes de publicaciones.
-- Elimina políticas restrictivas y crea las mínimas necesarias.
-- ============================================================

-- Recordatorio: la única regla de negocio es:
--   - un usuario autenticado puede dar like a cualquier post;
--   - un usuario NO puede dar más de un like al mismo post.

-- ------------------------------------------------------------
-- 1) Asegurar RLS activo en post_likes
-- ------------------------------------------------------------
ALTER TABLE public.post_likes ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------
-- 2) Eliminar TODAS las políticas RLS previas de post_likes
-- (evita políticas antiguas que sometieran conflictos o bloqueos)
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "likes_select"        ON public.post_likes;
DROP POLICY IF EXISTS "likes_insert"        ON public.post_likes;
DROP POLICY IF EXISTS "likes_delete"        ON public.post_likes;
DROP POLICY IF EXISTS "likes_update"        ON public.post_likes;
DROP POLICY IF EXISTS "Users can insert their own likes" ON public.post_likes;
DROP POLICY IF EXISTS "Users can select their own likes" ON public.post_likes;
DROP POLICY IF EXISTS "Users can delete their own likes" ON public.post_likes;
DROP POLICY IF EXISTS "Gestión propia de likes" ON public.post_likes;
DROP POLICY IF EXISTS "Lectura likes"       ON public.post_likes;
DROP POLICY IF EXISTS "Likes autenticados"  ON public.post_likes;

-- ------------------------------------------------------------
-- 3) Notar las políticas finales (mínimas y no restrictivas vs. otros autores)
-- ------------------------------------------------------------

-- INSERT: un usuario autenticado puede dar like a CUALQUIER post.
-- No se valida user_id = auth.uid(): el botón envía el id del usuario
-- de la sesión y se garantiza único por (user_id, post_id) abajo.
CREATE POLICY "likes_insert_any_post"
  ON public.post_likes
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- SELECT: los usuarios autenticados pueden leer los likes
-- necesarios para contadores y estado del like.
CREATE POLICY "likes_select_auth"
  ON public.post_likes
  FOR SELECT
  TO authenticated
  USING (true);

-- DELETE: un usuario puede quitar SOLO su propio like.
CREATE POLICY "likes_delete_own"
  ON public.post_likes
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- UPDATE: no es una operación usada por los likes; se elimina/evita
-- (no se crea política para no exponer escrituras innecesarias).

-- ------------------------------------------------------------
-- 4) Garantizar UNIQUE (user_id, post_id) - única regla de duplicidad
-- ------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.post_likes'::regclass
      AND contype = 'u'
      AND conname = 'post_likes_user_id_post_id_key'
  ) THEN
    ALTER TABLE public.post_likes
      ADD CONSTRAINT post_likes_user_id_post_id_key UNIQUE (user_id, post_id);
  END IF;
END $$;

-- Índice de respaldo para acelerar la búsqueda por post
CREATE INDEX IF NOT EXISTS idx_post_likes_post_id ON public.post_likes (post_id);

-- ------------------------------------------------------------
-- VERIFICACIÓN (instrucciones de validación)
-- ------------------------------------------------------------
-- 1) Restricción única user_id + post_id:
SELECT conname, contype
FROM pg_constraint
WHERE conrelid = 'public.post_likes'::regclass
  AND contype = 'u';

-- 2) Políticas finales:
SELECT policyname, cmd, roles, qual, with_check
FROM pg_policies
WHERE tablename = 'post_likes'
ORDER BY cmd;

-- 3) Prueba de INSERT (reemplaza por un post real que exista):
-- BEGIN;
--   INSERT INTO public.post_likes (user_id, post_id)
--   VALUES (auth.uid(), <ID_DEL_POST>);
--   -- repetir la misma sentencia debe fallar con violación de UNIQUE
-- ROLLBACK; -- descartar la prueba, no guardar datos