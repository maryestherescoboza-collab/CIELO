-- Migración para compatibilidad de estados de suscripción con PayPal
-- Añade 'suspendida' a la lista de valores permitidos en suscripciones_estado_check

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM pg_constraint 
        WHERE conname = 'suscripciones_estado_check' 
          AND conrelid = 'public.suscripciones'::regclass
    ) THEN
        ALTER TABLE public.suscripciones DROP CONSTRAINT suscripciones_estado_check;
    END IF;

    ALTER TABLE public.suscripciones 
      ADD CONSTRAINT suscripciones_estado_check 
      CHECK (estado = ANY (ARRAY['activa'::text, 'pendiente'::text, 'vencida'::text, 'cancelada'::text, 'suspendida'::text]));
END $$;

