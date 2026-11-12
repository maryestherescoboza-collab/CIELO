-- Auditoría y reintentos controlados para webhooks de PayPal.
-- Cambio aditivo: no altera funciones, RLS ni datos existentes.

ALTER TABLE public.paypal_webhook_events
  ADD COLUMN IF NOT EXISTS attempts INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_error TEXT,
  ADD COLUMN IF NOT EXISTS last_attempt_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS resolution TEXT;

COMMENT ON COLUMN public.paypal_webhook_events.attempts IS
  'Número de intentos de procesamiento fallidos para el evento.';
COMMENT ON COLUMN public.paypal_webhook_events.last_error IS
  'Último motivo de fallo registrado (sin credenciales).';
COMMENT ON COLUMN public.paypal_webhook_events.last_attempt_at IS
  'Fecha del último intento de procesamiento.';
COMMENT ON COLUMN public.paypal_webhook_events.resolution IS
  'Resultado final cuando el evento no pudo conciliarse o se agotaron los reintentos.';
