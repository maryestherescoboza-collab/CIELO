-- Migration to add institutional trial extension

-- 1. Add column to perfiles
ALTER TABLE public.perfiles 
ADD COLUMN IF NOT EXISTS trial_extension_activated_at TIMESTAMPTZ NULL;

-- 2. Create the secure RPC function
CREATE OR REPLACE FUNCTION public.activar_extension_institucional()
RETURNS TIMESTAMPTZ
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_now TIMESTAMPTZ;
  v_updated TIMESTAMPTZ;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuario no autenticado';
  END IF;

  v_now := NOW();

  -- Intenta actualizar solo si no se ha activado antes
  UPDATE public.perfiles
  SET trial_extension_activated_at = v_now
  WHERE user_id = v_user_id
    AND trial_extension_activated_at IS NULL
  RETURNING trial_extension_activated_at INTO v_updated;

  -- Si v_updated es NULL, significa que ya estaba activado (no se actualizó ninguna fila)
  RETURN v_updated;
END;
$$;
