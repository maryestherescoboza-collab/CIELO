-- 1. Eliminar referencias a Tilopay (Seguro porque la tabla está vacía)
ALTER TABLE public.suscripciones
DROP COLUMN IF EXISTS tilopay_customer_id,
DROP COLUMN IF EXISTS tilopay_subscription_id;

-- 2. Agregar campos para PayPal
ALTER TABLE public.suscripciones
ADD COLUMN IF NOT EXISTS provider TEXT DEFAULT 'paypal',
ADD COLUMN IF NOT EXISTS paypal_subscription_id TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS paypal_subscriber_id TEXT,
ADD COLUMN IF NOT EXISTS plan_id TEXT;

-- 3. Crear tabla para IDEMPOTENCIA de Webhooks (obligatorio)
CREATE TABLE IF NOT EXISTS public.paypal_webhook_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id TEXT UNIQUE NOT NULL,
    event_type TEXT NOT NULL,
    subscription_id TEXT,
    received_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    processed_at TIMESTAMP WITH TIME ZONE -- Sin DEFAULT, comienza en NULL
);

-- Índice para búsquedas por suscripción
CREATE INDEX IF NOT EXISTS idx_paypal_webhook_events_subscription_id 
ON public.paypal_webhook_events(subscription_id);



-- 4. Seguridad estricta (RLS) en paypal_webhook_events
ALTER TABLE public.paypal_webhook_events ENABLE ROW LEVEL SECURITY;
-- Al no tener políticas explícitas creadas, PostgreSQL aplica una denegación implícita
-- para cualquier usuario 'authenticated' o 'anon'. El cliente no puede leer, insertar,
-- actualizar ni borrar. Solo accesible por el webhook usando "service_role" key.

-- 5. Corrección estricta de seguridad RLS en suscripciones
DROP POLICY IF EXISTS "Edición de suscripciones" ON public.suscripciones;
DROP POLICY IF EXISTS "Insertar suscripcion" ON public.suscripciones;
DROP POLICY IF EXISTS "Gestión de suscripciones institucional" ON public.suscripciones;

-- Ninguna política UPDATE para authenticated en esta fase.
-- El estado, fechas, y campos de PayPal solo serán actualizados por la Edge Function (service_role).

-- Política hiper-estricta de INSERT
-- Garantiza que el usuario solo pueda iniciar un registro 'pendiente' y no pueda falsificar credenciales de pago.
CREATE POLICY "Insertar suscripcion pendiente"
ON public.suscripciones FOR INSERT TO authenticated
WITH CHECK (
    user_id = auth.uid() 
    AND estado = 'pendiente'
    AND paypal_subscription_id IS NULL
    AND provider = 'paypal'
);
