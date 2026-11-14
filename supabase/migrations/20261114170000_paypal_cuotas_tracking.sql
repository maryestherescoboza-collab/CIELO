-- Migración aditiva para seguimiento de cuotas de suscripciones PayPal en CIELO
-- Permite registrar cada una de las 12 cuotas del Plan Anual de forma idempotente y auditable.

-- 1. Tabla de pagos individuales de PayPal
CREATE TABLE IF NOT EXISTS public.paypal_pagos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    suscripcion_id UUID REFERENCES public.suscripciones(id) ON DELETE SET NULL,
    paypal_subscription_id TEXT NOT NULL,
    transaction_id TEXT NOT NULL UNIQUE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    plan_id TEXT NOT NULL,
    amount NUMERIC(10, 2) NOT NULL,
    currency TEXT NOT NULL DEFAULT 'USD',
    cuota_numero INTEGER NOT NULL,
    total_cuotas INTEGER NOT NULL DEFAULT 12,
    estado TEXT NOT NULL DEFAULT 'completado',
    pago_fecha TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    raw_event JSONB
);

-- Índices de consulta rápida
CREATE INDEX IF NOT EXISTS idx_paypal_pagos_sub_id ON public.paypal_pagos(paypal_subscription_id);
CREATE INDEX IF NOT EXISTS idx_paypal_pagos_tx_id ON public.paypal_pagos(transaction_id);
CREATE INDEX IF NOT EXISTS idx_paypal_pagos_user_id ON public.paypal_pagos(user_id);

-- 2. Columnas aditivas en public.suscripciones
ALTER TABLE public.suscripciones
    ADD COLUMN IF NOT EXISTS cuotas_pagadas INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS total_cuotas INTEGER DEFAULT 12,
    ADD COLUMN IF NOT EXISTS ultimo_pago_at TIMESTAMPTZ;

-- 3. Habilitar RLS en paypal_pagos
ALTER TABLE public.paypal_pagos ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
          AND tablename = 'paypal_pagos' 
          AND policyname = 'Lectura propia de pagos'
    ) THEN
        CREATE POLICY "Lectura propia de pagos" 
            ON public.paypal_pagos 
            FOR SELECT 
            USING (auth.uid() = user_id);
    END IF;
END $$;

