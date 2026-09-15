-- Tabla para registrar el uso de tokens y costos por usuario.
CREATE TABLE public.ai_usage_logs (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    provider text NOT NULL, -- 'deepseek', 'gemini', 'openai'
    model text NOT NULL,
    operation text NOT NULL, -- 'analyze_activities', 'create_ficha', etc.
    input_tokens integer NOT NULL DEFAULT 0,
    output_tokens integer NOT NULL DEFAULT 0,
    total_tokens integer NOT NULL DEFAULT 0,
    cache_hit_tokens integer NOT NULL DEFAULT 0,
    cache_miss_tokens integer NOT NULL DEFAULT 0,
    cost numeric(10, 6) NOT NULL DEFAULT 0.0,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Habilitar RLS en ai_usage_logs
ALTER TABLE public.ai_usage_logs ENABLE ROW LEVEL SECURITY;

-- Política: un usuario solo puede ver sus propios registros
CREATE POLICY "Users can view own AI usage logs" ON public.ai_usage_logs
    FOR SELECT USING (auth.uid() = user_id);

-- Política: un usuario puede insertar sus propios registros
CREATE POLICY "Users can insert own AI usage logs" ON public.ai_usage_logs
    FOR INSERT WITH CHECK (auth.uid() = user_id);


-- Tabla para la Biblioteca Pedagógica (caché e historial)
CREATE TABLE public.ai_biblioteca (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    centro_id uuid REFERENCES public.centros(id) ON DELETE SET NULL,
    titulo text,
    texto_original text NOT NULL,
    texto_normalizado text NOT NULL,
    hash_texto text NOT NULL, -- Para búsquedas rápidas (idempotencia)
    json_actividades jsonb,
    metadata_recursos jsonb DEFAULT '{}'::jsonb, -- Para el futuro: fichas, planificaciones, etc.
    usos integer DEFAULT 1 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    last_used_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Índice único compuesto para evitar guardar el mismo texto exacto repetidas veces para el mismo usuario
CREATE UNIQUE INDEX idx_ai_biblioteca_user_hash ON public.ai_biblioteca(user_id, hash_texto);

-- Habilitar RLS en ai_biblioteca
ALTER TABLE public.ai_biblioteca ENABLE ROW LEVEL SECURITY;

-- Política: un usuario solo puede ver su propia biblioteca
CREATE POLICY "Users can view own ai_biblioteca" ON public.ai_biblioteca
    FOR SELECT USING (auth.uid() = user_id);

-- Política: un usuario solo puede insertar/actualizar su propia biblioteca
CREATE POLICY "Users can insert/update own ai_biblioteca" ON public.ai_biblioteca
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
