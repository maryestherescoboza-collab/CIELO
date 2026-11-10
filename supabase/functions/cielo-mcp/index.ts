/**
 * SUPABASE EDGE FUNCTION: `cielo-mcp`
 * Servidor MCP oficial de CIELO para ChatGPT (Model Context Protocol JSON-RPC 2.0 + OAuth 2.1 con PKCE).
 *
 * Endpoints:
 * - GET  /.well-known/oauth-authorization-server → Metadatos OAuth 2.0 (RFC 8414)
 * - GET  /oauth/authorize                       → Pantalla oficial de autorización de CIELO
 * - POST /oauth/authorize                       → Valida credenciales y genera código OAuth con PKCE
 * - POST /oauth/token                           → Canjea código por token o refresca tokens
 * - POST /oauth/revoke                          → Revoca acceso de ChatGPT (RFC 7009)
 * - POST /mcp                                   → Endpoint principal JSON-RPC 2.0 (MCP)
 * - GET  /tools                                 → Catálogo de herramientas para ChatGPT
 * - GET  /health                                → Estado y versión
 */

import { createClient } from '@supabase/supabase-js';
import { authenticateAndResolveContext, MCPAuthorizationError } from './lib/auth.ts';
import { CIELO_TOOLS_DEFINITIONS, executeTool, MCP_PROTOCOL_VERSION } from './lib/tools.ts';
import { generateRandomToken, sha256Hex, verifyPkce } from './lib/oauth.ts';

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

function renderConsentHtml(params: {
  clientId: string;
  redirectUri: string;
  state: string;
  scope: string;
  codeChallenge: string;
  codeChallengeMethod: string;
  error?: string;
}): Response {
  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Conectar CIELO con ChatGPT</title>
  <style>
    :root { --primary: #689C63; --ink: #1C2220; --bg: #FCFCFA; --card: #FFFFFF; --border: #E5E7EB; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: var(--bg); color: var(--ink); display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 16px; }
    .card { background: var(--card); border: 1px solid var(--border); border-radius: 20px; max-width: 440px; width: 100%; padding: 32px; box-shadow: 0 10px 30px rgba(0,0,0,0.04); }
    .logo-badge { display: inline-flex; align-items: center; gap: 8px; background: rgba(104,156,99,0.1); color: var(--primary); font-weight: 800; font-size: 11px; padding: 6px 12px; border-radius: 999px; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 16px; }
    h1 { font-size: 20px; font-weight: 900; margin: 0 0 8px; letter-spacing: -0.02em; }
    p { font-size: 13px; color: #4B5563; line-height: 1.5; margin: 0 0 20px; }
    .scopes-box { background: #F9FAFB; border: 1px solid var(--border); border-radius: 12px; padding: 14px; margin-bottom: 20px; font-size: 12px; }
    .scopes-box ul { margin: 8px 0 0; padding-left: 18px; color: #374151; }
    .scopes-box li { margin: 4px 0; }
    .form-group { margin-bottom: 14px; text-align: left; }
    label { display: block; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #6B7280; margin-bottom: 6px; }
    input { width: 100%; box-sizing: border-box; padding: 11px 14px; border: 1px solid var(--border); border-radius: 10px; font-size: 14px; outline: none; transition: border-color 0.2s; }
    input:focus { border-color: var(--primary); }
    button { width: 100%; background: var(--primary); color: white; border: none; padding: 12px; border-radius: 10px; font-weight: 700; font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em; cursor: pointer; transition: opacity 0.2s; margin-top: 6px; }
    button:hover { opacity: 0.92; }
    .error-box { background: #FEF2F2; border: 1px solid #FCA5A5; color: #991B1B; padding: 10px 14px; border-radius: 10px; font-size: 12px; font-weight: 600; margin-bottom: 16px; }
    .footer-note { text-align: center; font-size: 11px; color: #9CA3AF; margin-top: 20px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="logo-badge">CIELO · Integración ChatGPT</div>
    <h1>Autorizar conexión con ChatGPT</h1>
    <p>Inicia sesión con tu cuenta de <strong>evaluacielo.com</strong> para autorizar que ChatGPT consulte tus cursos y genere evaluaciones en tu nombre.</p>

    ${params.error ? `<div class="error-box">${params.error}</div>` : ''}

    <div class="scopes-box">
      <strong>Permisos solicitados (solo para tus cursos asignados):</strong>
      <ul>
        <li>Consultar tus asignaturas y estudiantes matriculados.</li>
        <li>Generar reportes oficiales por competencias (BC1–BC4).</li>
        <li>Crear actividades pedagógicas (requiere confirmación expresa).</li>
      </ul>
    </div>

    <form method="POST" action="">
      <input type="hidden" name="client_id" value="${params.clientId}" />
      <input type="hidden" name="redirect_uri" value="${params.redirectUri}" />
      <input type="hidden" name="state" value="${params.state}" />
      <input type="hidden" name="scope" value="${params.scope}" />
      <input type="hidden" name="code_challenge" value="${params.codeChallenge}" />
      <input type="hidden" name="code_challenge_method" value="${params.codeChallengeMethod}" />

      <div class="form-group">
        <label for="email">Correo electrónico de CIELO</label>
        <input id="email" name="email" type="email" placeholder="docente@centro.edu.do" required autocomplete="username" />
      </div>

      <div class="form-group">
        <label for="password">Contraseña</label>
        <input id="password" name="password" type="password" placeholder="••••••••" required autocomplete="current-password" />
      </div>

      <button type="submit">Autorizar y Conectar con ChatGPT</button>
    </form>

    <div class="footer-note">
      Conexión protegida por TLS y aislamiento multi-centro CIELO.
    </div>
  </div>
</body>
</html>`;

  return new Response(html, {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}

Deno.serve(async (req: Request) => {
  // Manejo de Preflight CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const pathname = url.pathname.replace(/^\/cielo-mcp/, '') || '/';

  const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || anonKey;

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  // 1. Metadatos de Autorización OAuth 2.0 (RFC 8414 / OpenID Discovery)
  if (pathname === '/.well-known/oauth-authorization-server') {
    const baseUrl = `${url.origin}/functions/v1/cielo-mcp`;
    return jsonResponse({
      issuer: baseUrl,
      authorization_endpoint: `${baseUrl}/oauth/authorize`,
      token_endpoint: `${baseUrl}/oauth/token`,
      revocation_endpoint: `${baseUrl}/oauth/revoke`,
      response_types_supported: ['code'],
      grant_types_supported: ['authorization_code', 'refresh_token'],
      code_challenge_methods_supported: ['S256'],
      scopes_supported: ['mcp:read', 'mcp:write'],
    });
  }

  // 2. Pantalla de Autorización y Consentimiento (RFC 6749)
  if (pathname === '/oauth/authorize') {
    if (req.method === 'GET') {
      const clientId = url.searchParams.get('client_id') || 'chatgpt-mcp';
      const redirectUri = url.searchParams.get('redirect_uri') || '';
      const state = url.searchParams.get('state') || '';
      const scope = url.searchParams.get('scope') || 'mcp:read mcp:write';
      const codeChallenge = url.searchParams.get('code_challenge') || '';
      const codeChallengeMethod = url.searchParams.get('code_challenge_method') || 'S256';

      return renderConsentHtml({
        clientId,
        redirectUri,
        state,
        scope,
        codeChallenge,
        codeChallengeMethod,
      });
    }

    if (req.method === 'POST') {
      const formData = await req.formData().catch(() => null);
      const email = String(formData?.get('email') || '').trim();
      const password = String(formData?.get('password') || '');
      const clientId = String(formData?.get('client_id') || 'chatgpt-mcp');
      const redirectUri = String(formData?.get('redirect_uri') || '');
      const state = String(formData?.get('state') || '');
      const scope = String(formData?.get('scope') || 'mcp:read mcp:write');
      const codeChallenge = String(formData?.get('code_challenge') || '');
      const codeChallengeMethod = String(formData?.get('code_challenge_method') || 'S256');

      // Validar credenciales contra Supabase Auth
      const { data: authData, error: authError } = await adminClient.auth.signInWithPassword({
        email,
        password,
      });

      if (authError || !authData.user) {
        return renderConsentHtml({
          clientId,
          redirectUri,
          state,
          scope,
          codeChallenge,
          codeChallengeMethod,
          error: 'Correo o contraseña incorrectos en CIELO. Verifica tus credenciales.',
        });
      }

      const user = authData.user;

      // Obtener centro_id del docente
      const { data: perfil } = await adminClient
        .from('perfiles')
        .select('centro_id')
        .eq('user_id', user.id)
        .single();

      // Generar Authorization Code seguro (5 minutos de TTL)
      const rawCode = generateRandomToken(24);
      const codeHash = await sha256Hex(rawCode);
      const codeExpiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

      await adminClient.from('mcp_oauth_tokens').insert({
        user_id: user.id,
        centro_id: perfil?.centro_id || null,
        client_id: clientId,
        code_hash: codeHash,
        code_challenge: codeChallenge,
        code_challenge_method: codeChallengeMethod,
        code_expires_at: codeExpiresAt,
        code_used: false,
        scope,
      });

      // Redirigir de vuelta a ChatGPT con code y state
      const targetUrl = new URL(redirectUri);
      targetUrl.searchParams.set('code', rawCode);
      if (state) targetUrl.searchParams.set('state', state);

      return Response.redirect(targetUrl.toString(), 302);
    }
  }

  // 3. Canje y Refresco de Tokens (POST /oauth/token)
  if (pathname === '/oauth/token' && req.method === 'POST') {
    const body = await req.json().catch(async () => {
      const form = await req.formData().catch(() => null);
      if (!form) return {};
      const res: Record<string, string> = {};
      form.forEach((v, k) => { res[k] = String(v); });
      return res;
    });

    const grantType = body.grant_type || 'authorization_code';

    if (grantType === 'authorization_code') {
      const code = body.code;
      const codeVerifier = body.code_verifier;

      if (!code) return jsonResponse({ error: 'invalid_request', error_description: 'Falta parámetro code' }, 400);

      const codeHash = await sha256Hex(code);

      const { data: tokenRecord, error } = await adminClient
        .from('mcp_oauth_tokens')
        .select('*')
        .eq('code_hash', codeHash)
        .eq('code_used', false)
        .single();

      if (error || !tokenRecord) {
        return jsonResponse({ error: 'invalid_grant', error_description: 'Código de autorización inválido o expirado' }, 400);
      }

      // Validar expiración del código
      if (tokenRecord.code_expires_at && new Date(tokenRecord.code_expires_at).getTime() < Date.now()) {
        return jsonResponse({ error: 'invalid_grant', error_description: 'Código expirado' }, 400);
      }

      // Validar PKCE si venía con challenge
      if (tokenRecord.code_challenge) {
        if (!codeVerifier) {
          return jsonResponse({ error: 'invalid_request', error_description: 'Requiere code_verifier' }, 400);
        }
        const isValid = await verifyPkce(codeVerifier, tokenRecord.code_challenge, tokenRecord.code_challenge_method || 'S256');
        if (!isValid) {
          return jsonResponse({ error: 'invalid_grant', error_description: 'Fallo en la verificación PKCE' }, 400);
        }
      }

      // Emitir access_token (1 hora) y refresh_token (30 días)
      const accessToken = `cielo_mcp_at_${generateRandomToken(32)}`;
      const refreshToken = `cielo_mcp_rt_${generateRandomToken(32)}`;
      const tokenExpiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();

      await adminClient
        .from('mcp_oauth_tokens')
        .update({
          code_used: true,
          access_token: accessToken,
          refresh_token: refreshToken,
          token_expires_at: tokenExpiresAt,
          updated_at: new Date().toISOString(),
        })
        .eq('id', tokenRecord.id);

      return jsonResponse({
        access_token: accessToken,
        token_type: 'Bearer',
        expires_in: 3600,
        refresh_token: refreshToken,
        scope: tokenRecord.scope || 'mcp:read mcp:write',
      });
    }

    if (grantType === 'refresh_token') {
      const refreshToken = body.refresh_token;
      if (!refreshToken) {
        return jsonResponse({ error: 'invalid_request', error_description: 'Falta refresh_token' }, 400);
      }

      const { data: tokenRecord, error } = await adminClient
        .from('mcp_oauth_tokens')
        .select('*')
        .eq('refresh_token', refreshToken)
        .eq('revoked', false)
        .single();

      if (error || !tokenRecord) {
        return jsonResponse({ error: 'invalid_grant', error_description: 'Refresh token inválido o revocado' }, 400);
      }

      // Re-rotar access_token y renovar expiración
      const newAccessToken = `cielo_mcp_at_${generateRandomToken(32)}`;
      const tokenExpiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();

      await adminClient
        .from('mcp_oauth_tokens')
        .update({
          access_token: newAccessToken,
          token_expires_at: tokenExpiresAt,
          updated_at: new Date().toISOString(),
        })
        .eq('id', tokenRecord.id);

      return jsonResponse({
        access_token: newAccessToken,
        token_type: 'Bearer',
        expires_in: 3600,
        refresh_token: refreshToken,
        scope: tokenRecord.scope,
      });
    }

    return jsonResponse({ error: 'unsupported_grant_type' }, 400);
  }

  // 4. Revocación de Tokens (RFC 7009)
  if (pathname === '/oauth/revoke' && req.method === 'POST') {
    const body = await req.json().catch(async () => {
      const form = await req.formData().catch(() => null);
      if (!form) return {};
      const res: Record<string, string> = {};
      form.forEach((v, k) => { res[k] = String(v); });
      return res;
    });

    const tokenToRevoke = body.token || body.access_token || body.refresh_token;

    if (tokenToRevoke) {
      await adminClient
        .from('mcp_oauth_tokens')
        .update({
          revoked: true,
          revoked_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .or(`access_token.eq.${tokenToRevoke},refresh_token.eq.${tokenToRevoke}`);
    }

    return jsonResponse({ status: 'revoked' }, 200);
  }

  // 5. Endpoint de Salud
  if (pathname === '/health' || pathname === '/') {
    return jsonResponse({
      status: 'ok',
      service: 'CIELO MCP Server',
      version: '1.1.0',
      protocol_version: MCP_PROTOCOL_VERSION,
      oauth_support: 'RFC 8414 + PKCE',
      plataforma: 'evaluacielo.com',
    });
  }

  // 6. Catálogo público de herramientas
  if (pathname === '/tools' && req.method === 'GET') {
    return jsonResponse({
      protocolVersion: MCP_PROTOCOL_VERSION,
      tools: CIELO_TOOLS_DEFINITIONS,
    });
  }

  // 7. Endpoint MCP JSON-RPC 2.0 (Streamable HTTP MCP)
  if (pathname === '/mcp' || pathname === '') {
    if (req.method !== 'POST') {
      return jsonResponse({ error: 'Método no permitido. Utiliza POST.' }, 405);
    }

    try {
      const authHeader = req.headers.get('Authorization') || req.headers.get('authorization');
      const { auth } = await authenticateAndResolveContext(
        authHeader,
        supabaseUrl,
        anonKey,
        serviceRoleKey
      );

      const jsonRpc = await req.json().catch(() => null);
      if (!jsonRpc || typeof jsonRpc !== 'object') {
        return jsonResponse(
          {
            jsonrpc: '2.0',
            id: null,
            error: { code: -32700, message: 'Parse error: JSON inválido' },
          },
          400
        );
      }

      const { id, method, params } = jsonRpc;

      // 7.1. Inicialización de sesión MCP
      if (method === 'initialize') {
        return jsonResponse({
          jsonrpc: '2.0',
          id,
          result: {
            protocolVersion: MCP_PROTOCOL_VERSION,
            capabilities: {
              tools: { listChanged: false },
            },
            serverInfo: {
              name: 'cielo-mcp-server',
              version: '1.1.0',
              description: 'Servidor oficial de CIELO para evaluación por competencias en República Dominicana',
            },
          },
        });
      }

      // 7.2. Notificación de inicialización
      if (method === 'notifications/initialized') {
        return new Response(null, { status: 204, headers: corsHeaders });
      }

      // 7.3. Listado de herramientas
      if (method === 'tools/list') {
        return jsonResponse({
          jsonrpc: '2.0',
          id,
          result: {
            tools: CIELO_TOOLS_DEFINITIONS,
          },
        });
      }

      // 7.4. Invocación de herramientas
      if (method === 'tools/call') {
        const toolName = params?.name;
        const toolArgs = params?.arguments || {};

        try {
          const output = await executeTool(toolName, toolArgs, auth, adminClient);
          return jsonResponse({
            jsonrpc: '2.0',
            id,
            result: {
              content: [
                {
                  type: 'text',
                  text: typeof output === 'string' ? output : JSON.stringify(output, null, 2),
                },
              ],
            },
          });
        } catch (toolError: any) {
          const isAuthError = toolError instanceof MCPAuthorizationError;
          return jsonResponse({
            jsonrpc: '2.0',
            id,
            result: {
              isError: true,
              content: [
                {
                  type: 'text',
                  text: JSON.stringify({
                    error: true,
                    codigo: isAuthError ? toolError.code : 'EXECUTION_ERROR',
                    mensaje: toolError?.message || 'Error ejecutando herramienta',
                  }),
                },
              ],
            },
          });
        }
      }

      // Método no soportado
      return jsonResponse({
        jsonrpc: '2.0',
        id,
        error: { code: -32601, message: `Método desconocido o no soportado: ${method}` },
      });
    } catch (err: any) {
      const isAuthErr = err instanceof MCPAuthorizationError;
      return jsonResponse(
        {
          jsonrpc: '2.0',
          id: null,
          error: {
            code: isAuthErr ? -32000 : -32603,
            message: err?.message || 'Error interno del servidor CIELO MCP',
            data: { code: isAuthErr ? err.code : 'INTERNAL_ERROR' },
          },
        },
        isAuthErr ? err.statusCode : 500
      );
    }
  }

  return jsonResponse({ error: 'Ruta no encontrada' }, 404);
});
