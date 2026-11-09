/**
 * SUPABASE EDGE FUNCTION: `cielo-mcp`
 * Servidor MCP oficial de CIELO para ChatGPT (Model Context Protocol + OAuth 2.0 + PKCE).
 *
 * Endpoints expuestos sobre HTTPS:
 * - GET  /.well-known/oauth-authorization-server  → Metadatos OAuth 2.0 (RFC 8414)
 * - GET  /oauth/authorize                         → Pantalla de consentimiento e inicio de sesión CIELO
 * - POST /oauth/authorize                         → Autentica contra Supabase Auth y emite `code` OAuth
 * - POST /oauth/token                             → Canjea `code` por `access_token` / `refresh_token`
 * - POST /oauth/revoke                            → Revoca inmediatamente el acceso de la cuenta
 * - POST /mcp                                     → Transporte Streamable HTTP JSON-RPC 2.0 (MCP)
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import {
  buildAuthenticatedContext,
  CIELO_MCP_TOOLS_CATALOG,
  createSupabaseCieloRepository,
  exchangeCodeForToken,
  handleMCPJsonRpc,
  issueAuthorizationCode,
  MCP_PROTOCOL_VERSION,
  MCPAuthorizationError,
  revokeOAuthToken,
  validateOAuthAccessToken,
} from '../../src/mcp/index.ts';

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, mcp-session-id',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}

function renderOAuthAuthorizePage(params: {
  clientId: string;
  redirectUri: string;
  state: string;
  scope: string;
  codeChallenge: string;
  codeChallengeMethod: string;
  errorMsg?: string;
}): Response {
  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Conectar CIELO con ChatGPT</title>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; background: #f8fafc; color: #0f172a; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 16px; }
    .card { background: #ffffff; max-width: 420px; width: 100%; border-radius: 16px; padding: 28px; box-shadow: 0 10px 25px -5px rgba(15, 23, 42, 0.08); border: 1px solid #e2e8f0; }
    h1 { font-size: 1.25rem; margin: 0 0 8px; color: #0f172a; }
    p { font-size: 0.875rem; color: #475569; margin: 0 0 20px; line-height: 1.5; }
    .scopes { background: #f1f5f9; border-radius: 10px; padding: 12px 16px; margin-bottom: 20px; font-size: 0.8125rem; color: #334155; }
    .scopes li { margin: 4px 0; }
    label { display: block; font-size: 0.8125rem; font-weight: 600; margin-bottom: 6px; color: #334155; }
    input[type="email"], input[type="password"] { width: 100%; box-sizing: border-box; padding: 10px 12px; border: 1px solid #cbd5e1; border-radius: 8px; margin-bottom: 14px; font-size: 0.9375rem; }
    button { width: 100%; background: #2563eb; color: #fff; font-weight: 600; border: none; padding: 12px; border-radius: 8px; cursor: pointer; font-size: 0.9375rem; }
    button:hover { background: #1d4ed8; }
    .err { background: #fef2f2; color: #b91c1c; padding: 10px 12px; border-radius: 8px; font-size: 0.8125rem; margin-bottom: 14px; border: 1px solid #fecaca; }
  </style>
</head>
<body>
  <div class="card">
    <h1>Autorizar conexión CIELO + ChatGPT</h1>
    <p>Inicia sesión con tu cuenta docente de <strong>evaluacielo.com</strong> para autorizar el conector MCP.</p>
    ${params.errorMsg ? `<div class="err">${params.errorMsg}</div>` : ''}
    <div class="scopes">
      <strong>Permisos solicitados (solo en tus cursos asignados):</strong>
      <ul>
        <li>Consultar y buscar estudiantes de tus secciones.</li>
        <li>Preparar y crear actividades con tu confirmación explícita.</li>
        <li>Generar reportes académicos por competencias y período.</li>
      </ul>
    </div>
    <form method="POST" action="">
      <input type="hidden" name="client_id" value="${params.clientId}" />
      <input type="hidden" name="redirect_uri" value="${params.redirectUri}" />
      <input type="hidden" name="state" value="${params.state}" />
      <input type="hidden" name="scope" value="${params.scope}" />
      <input type="hidden" name="code_challenge" value="${params.codeChallenge}" />
      <input type="hidden" name="code_challenge_method" value="${params.codeChallengeMethod}" />
      <label for="email">Correo electrónico de CIELO</label>
      <input id="email" name="email" type="email" required autocomplete="email" placeholder="docente@centro.edu.do" />
      <label for="password">Contraseña</label>
      <input id="password" name="password" type="password" required autocomplete="current-password" />
      <button type="submit">Autorizar y conectar con ChatGPT</button>
    </form>
  </div>
</body>
</html>`;

  return new Response(html, {
    status: 200,
    headers: {
      ...corsHeaders,
      'Content-Type': 'text/html; charset=utf-8',
    },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const path = url.pathname.replace(/\/+$/, '');
  const baseUrl = `${url.protocol}//${url.host}${path.replace(/\/(\.well-known\/oauth-authorization-server|oauth\/authorize|oauth\/token|oauth\/revoke|mcp)$/, '')}`;

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';

  // 1. OAuth 2.0 Discovery Endpoint
  if (req.method === 'GET' && path.endsWith('/.well-known/oauth-authorization-server')) {
    return jsonResponse({
      issuer: baseUrl,
      authorization_endpoint: `${baseUrl}/oauth/authorize`,
      token_endpoint: `${baseUrl}/oauth/token`,
      revocation_endpoint: `${baseUrl}/oauth/revoke`,
      response_types_supported: ['code'],
      grant_types_supported: ['authorization_code'],
      code_challenge_methods_supported: ['S256', 'plain'],
      scopes_supported: ['mcp:students:read', 'mcp:activities:write', 'mcp:reports:read'],
      token_endpoint_auth_methods_supported: ['none', 'client_secret_post'],
    });
  }

  // 2. OAuth 2.0 Authorize (GET -> Consent Screen)
  if (req.method === 'GET' && path.endsWith('/oauth/authorize')) {
    return renderOAuthAuthorizePage({
      clientId: url.searchParams.get('client_id') || 'chatgpt-mcp-connector',
      redirectUri: url.searchParams.get('redirect_uri') || '',
      state: url.searchParams.get('state') || '',
      scope: url.searchParams.get('scope') || 'mcp:students:read mcp:activities:write mcp:reports:read',
      codeChallenge: url.searchParams.get('code_challenge') || '',
      codeChallengeMethod: url.searchParams.get('code_challenge_method') || 'S256',
    });
  }

  // 3. OAuth 2.0 Authorize (POST -> Authenticate teacher & redirect with code)
  if (req.method === 'POST' && path.endsWith('/oauth/authorize')) {
    const formData = await req.formData();
    const email = String(formData.get('email') || '').trim();
    const password = String(formData.get('password') || '');
    const clientId = String(formData.get('client_id') || 'chatgpt-mcp-connector');
    const redirectUri = String(formData.get('redirect_uri') || '');
    const state = String(formData.get('state') || '');
    const scope = String(formData.get('scope') || 'mcp:students:read mcp:activities:write mcp:reports:read');
    const codeChallenge = String(formData.get('code_challenge') || '');
    const codeChallengeMethod = (String(formData.get('code_challenge_method') || 'S256') as 'S256' | 'plain');

    const authClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data, error } = await authClient.auth.signInWithPassword({ email, password });
    if (error || !data.session || !data.user) {
      return renderOAuthAuthorizePage({
        clientId,
        redirectUri,
        state,
        scope,
        codeChallenge,
        codeChallengeMethod,
        errorMsg: 'Credenciales inválidas. Verifica tu correo y contraseña de CIELO.',
      });
    }

    const authCode = issueAuthorizationCode({
      userId: data.user.id,
      email: data.user.email || email,
      supabaseAccessToken: data.session.access_token,
      clientId,
      redirectUri,
      codeChallenge: codeChallenge || undefined,
      codeChallengeMethod,
      scope,
    });

    const targetRedirect = new URL(redirectUri);
    targetRedirect.searchParams.set('code', authCode.code);
    if (state) targetRedirect.searchParams.set('state', state);

    return Response.redirect(targetRedirect.toString(), 302);
  }

  // 4. OAuth 2.0 Token Exchange
  if (req.method === 'POST' && path.endsWith('/oauth/token')) {
    try {
      const contentType = req.headers.get('content-type') || '';
      let bodyParams: Record<string, string> = {};
      if (contentType.includes('application/json')) {
        bodyParams = await req.json();
      } else {
        const text = await req.text();
        const sp = new URLSearchParams(text);
        sp.forEach((v, k) => {
          bodyParams[k] = v;
        });
      }

      const tokenResponse = await exchangeCodeForToken({
        code: bodyParams.code || '',
        clientId: bodyParams.client_id || 'chatgpt-mcp-connector',
        redirectUri: bodyParams.redirect_uri || '',
        codeVerifier: bodyParams.code_verifier || undefined,
      });

      return jsonResponse(tokenResponse, 200);
    } catch (err: any) {
      return jsonResponse(
        {
          error: 'invalid_grant',
          error_description: err?.message || 'Error al canjear el código de autorización.',
        },
        400
      );
    }
  }

  // 5. OAuth 2.0 Token Revocation
  if (req.method === 'POST' && path.endsWith('/oauth/revoke')) {
    try {
      const contentType = req.headers.get('content-type') || '';
      let token = '';
      if (contentType.includes('application/json')) {
        const body = await req.json();
        token = body.token || '';
      } else {
        const sp = new URLSearchParams(await req.text());
        token = sp.get('token') || '';
      }
      if (token) {
        revokeOAuthToken(token);
      }
      return jsonResponse({ revoked: true }, 200);
    } catch {
      return jsonResponse({ revoked: false }, 400);
    }
  }

  // 6. Endpoint Principal MCP (`/mcp` o raíz de la Edge Function)
  if (req.method === 'GET' && path.endsWith('/mcp')) {
    return jsonResponse({
      name: 'cielo-mcp-server',
      version: '1.0.0',
      protocolVersion: MCP_PROTOCOL_VERSION,
      toolsCount: CIELO_MCP_TOOLS_CATALOG.length,
      status: 'healthy',
    });
  }

  if (req.method === 'POST') {
    const authHeader = req.headers.get('Authorization') || '';
    if (!authHeader.startsWith('Bearer ')) {
      return jsonResponse(
        {
          jsonrpc: '2.0',
          id: null,
          error: {
            code: -32001,
            message: 'No autenticado: Se requiere cabecera Authorization: Bearer <token>.',
          },
        },
        401
      );
    }

    const rawBearer = authHeader.replace(/^Bearer\s+/i, '').trim();

    try {
      let userId = '';
      let userEmail = '';
      let supabaseJwt = rawBearer;
      let oauthTokenId: string | undefined;

      // Soporta tanto tokens OAuth emitidos por `/oauth/token` (`cielo_at_...`) como JWT directos de Supabase Auth
      if (rawBearer.startsWith('cielo_at_')) {
        const tokenRecord = validateOAuthAccessToken(rawBearer);
        userId = tokenRecord.userId;
        userEmail = tokenRecord.email;
        supabaseJwt = tokenRecord.supabaseAccessToken;
        oauthTokenId = tokenRecord.tokenId;
      } else {
        const verifyClient = createClient(supabaseUrl, supabaseAnonKey, {
          global: { headers: { Authorization: `Bearer ${rawBearer}` } },
          auth: { persistSession: false, autoRefreshToken: false },
        });
        const { data: userData, error: userErr } = await verifyClient.auth.getUser(rawBearer);
        if (userErr || !userData?.user) {
          return jsonResponse(
            {
              jsonrpc: '2.0',
              id: null,
              error: {
                code: -32001,
                message: 'Token de sesión inválido o expirado.',
              },
            },
            401
          );
        }
        userId = userData.user.id;
        userEmail = userData.user.email || '';
      }

      // Instanciar cliente Supabase con el JWT real del docente para que RLS se aplique en cada consulta
      const rlsClient = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: `Bearer ${supabaseJwt}` } },
        auth: { persistSession: false, autoRefreshToken: false },
      });

      const repo = createSupabaseCieloRepository(rlsClient);
      const authContext = await buildAuthenticatedContext(
        userId,
        supabaseJwt,
        repo,
        userEmail,
        oauthTokenId
      );

      const rpcRequest = await req.json();
      const rpcResponse = await handleMCPJsonRpc(rpcRequest, authContext, repo);

      return jsonResponse(rpcResponse, 200);
    } catch (err: any) {
      const status = err instanceof MCPAuthorizationError ? err.httpStatus : 401;
      return jsonResponse(
        {
          jsonrpc: '2.0',
          id: null,
          error: {
            code: -32001,
            message: err?.message || 'Error de autenticación o autorización en CIELO MCP.',
          },
        },
        status
      );
    }
  }

  return jsonResponse({ error: 'Ruta o método no encontrado.' }, 404);
});

