-- ==============================================================================
-- SCRIPT DE MIGRACIÓN: LIMPIEZA CONTROLADA DE OBJETOS OBSOLETOS (Fase 1)
-- Proyecto: CIELO (Evaluación por competencias)
--
-- ⚠️ IMPORTANTE:
-- * Este script NO debe ejecutarse automáticamente. Es para revisión y
--   ejecución manual controlada en el Editor SQL de Supabase.
-- * NO utiliza 'DROP TABLE ... CASCADE' para asegurar que no existan
--   dependencias imprevistas.
-- * Limpia de manera explícita tablas, columnas, políticas, triggers y
--   funciones asociadas a características deshabilitadas.
-- ==============================================================================

-- ──────────────────────────────────────────────────────────────────────────────
-- 1. LIMPIEZA DE TRIGGERS Y FUNCIONES ASOCIADOS A "POST_LIKES"
-- ──────────────────────────────────────────────────────────────────────────────

-- Eliminar trigger de sincronización de likes sobre la tabla post_likes
DROP TRIGGER IF EXISTS tr_sync_post_likes ON public.post_likes;

-- Eliminar la función asociada al trigger de post_likes
DROP FUNCTION IF EXISTS public.sync_post_likes_count();


-- ──────────────────────────────────────────────────────────────────────────────
-- 2. LIMPIEZA DE POLÍTICAS RLS ASOCIADAS EXCLUSIVAMENTE A TABLAS CANDIDATAS
-- ──────────────────────────────────────────────────────────────────────────────

-- Políticas de la tabla post_likes (remoción preventiva antes de borrar la tabla)
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


-- ──────────────────────────────────────────────────────────────────────────────
-- 3. ELIMINACIÓN DE TABLAS OBSOLETAS (EN ORDEN DE DEPENDENCIA, SIN CASCADE)
-- ──────────────────────────────────────────────────────────────────────────────

-- 3.1. user_badges (Tabla de unión que depende de badges y perfiles/users)
DROP TABLE IF EXISTS public.user_badges;

-- 3.2. badges (Tabla principal de logros/insignias)
DROP TABLE IF EXISTS public.badges;

-- 3.3. post_likes (Tabla de me gusta)
DROP TABLE IF EXISTS public.post_likes;

-- 3.4. instituciones (Tabla abandonada, reemplazada por 'centros')
DROP TABLE IF EXISTS public.instituciones;


-- ──────────────────────────────────────────────────────────────────────────────
-- 4. ELIMINACIÓN DE COLUMNAS OBSOLETAS EN TABLAS ACTIVAS
-- ──────────────────────────────────────────────────────────────────────────────

-- Columna 'likes' en la tabla posts (ya no se utiliza en comunidad)
ALTER TABLE public.posts DROP COLUMN IF EXISTS likes;

-- Columna 'total_corazones' en la tabla perfiles (gamificación obsoleta)
ALTER TABLE public.perfiles DROP COLUMN IF EXISTS total_corazones;
