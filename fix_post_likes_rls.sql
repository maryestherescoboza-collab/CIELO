ALTER TABLE public.post_likes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "likes_insert" ON public.post_likes;
DROP POLICY IF EXISTS "Users can insert their own likes" ON public.post_likes;

CREATE POLICY "likes_insert"
  ON public.post_likes
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);