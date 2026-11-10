-- ==============================================================================
-- MIGRACIÓN CIELO MCP OAUTH 2.1 — TABLA DE PERSISTENCIA Y TOKENS SEGUROS
-- Compatible con Conectores Oficiales de ChatGPT / OpenAI Apps Directory
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.mcp_oauth_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    centro_id UUID REFERENCES public.centros(id) ON DELETE SET NULL,
    client_id TEXT NOT NULL DEFAULT 'chatgpt-mcp',
    code_hash TEXT,
    code_challenge TEXT,
    code_challenge_method TEXT DEFAULT 'S256',
    code_expires_at TIMESTAMPTZ,
    code_used BOOLEAN DEFAULT false,
    access_token TEXT UNIQUE,
    refresh_token TEXT UNIQUE,
    scope TEXT DEFAULT 'mcp:read mcp:write',
    token_expires_at TIMESTAMPTZ,
    revoked BOOLEAN DEFAULT false,
    revoked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Índices de alto rendimiento para búsqueda rápida por tokens y códigos
CREATE INDEX IF NOT EXISTS idx_mcp_oauth_tokens_access_token ON public.mcp_oauth_tokens(access_token) WHERE revoked = false;
CREATE INDEX IF NOT EXISTS idx_mcp_oauth_tokens_refresh_token ON public.mcp_oauth_tokens(refresh_token) WHERE revoked = false;
CREATE INDEX IF NOT EXISTS idx_mcp_oauth_tokens_user_id ON public.mcp_oauth_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_mcp_oauth_tokens_code_hash ON public.mcp_oauth_tokens(code_hash) WHERE code_used = false;

-- Habilitar RLS en la tabla
ALTER TABLE public.mcp_oauth_tokens ENABLE ROW LEVEL SECURITY;

-- Política RLS: Los usuarios autenticados solo pueden consultar y revocar sus propios tokens
CREATE POLICY "mcp_tokens_usuario_select" ON public.mcp_oauth_tokens
    FOR SELECT TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "mcp_tokens_usuario_update" ON public.mcp_oauth_tokens
    FOR UPDATE TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Comentario explicativo
COMMENT ON TABLE public.mcp_oauth_tokens IS 'Almacén persistente de autorizaciones OAuth 2.1 con PKCE para el conector ChatGPT MCP de CIELO.';

