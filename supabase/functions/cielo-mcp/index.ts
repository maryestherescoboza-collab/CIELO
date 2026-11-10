/**
 * SUPABASE EDGE FUNCTION: `cielo-mcp`
 * Servidor MCP oficial de CIELO para ChatGPT (Model Context Protocol JSON-RPC 2.0).
 *
 * Endpoints:
 * - POST /mcp                → Endpoint principal JSON-RPC 2.0 (Streamable HTTP MCP)
 * - GET  /tools              → Lista el catálogo de herramientas en formato JSON
 * - GET  /health             → Estado del servicio y versión
 */

import { authenticateAndResolveContext, MCPAuthorizationError } from './lib/auth.ts';
import { CIELO_TOOLS_DEFINITIONS, executeTool, MCP_PROTOCOL_VERSION } from './lib/tools.ts';

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

Deno.serve(async (req: Request) => {
  // Manejo de Preflight CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const pathname = url.pathname.replace(/^\/cielo-mcp/, '') || '/';

  // Endpoint de Salud
  if (pathname === '/health' || pathname === '/') {
    return jsonResponse({
      status: 'ok',
      service: 'CIELO MCP Server',
      version: '1.0.0',
      protocol_version: MCP_PROTOCOL_VERSION,
      plataforma: 'evaluacielo.com',
    });
  }

  // Catálogo público de herramientas para inspección
  if (pathname === '/tools' && req.method === 'GET') {
    return jsonResponse({
      protocolVersion: MCP_PROTOCOL_VERSION,
      tools: CIELO_TOOLS_DEFINITIONS,
    });
  }

  // Endpoint MCP JSON-RPC 2.0
  if (pathname === '/mcp' || pathname === '') {
    if (req.method !== 'POST') {
      return jsonResponse({ error: 'Método no permitido. Utiliza POST.' }, 405);
    }

    try {
      const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
      const anonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';
      const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || anonKey;

      const authHeader = req.headers.get('Authorization') || req.headers.get('authorization');
      const { auth, adminClient } = await authenticateAndResolveContext(
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

      // 1. Inicialización de sesión MCP
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
              version: '1.0.0',
              description: 'Servidor oficial de CIELO para evaluación por competencias en República Dominicana',
            },
          },
        });
      }

      // 2. Notificación de inicialización
      if (method === 'notifications/initialized') {
        return new Response(null, { status: 204, headers: corsHeaders });
      }

      // 3. Listado de herramientas
      if (method === 'tools/list') {
        return jsonResponse({
          jsonrpc: '2.0',
          id,
          result: {
            tools: CIELO_TOOLS_DEFINITIONS,
          },
        });
      }

      // 4. Invocación de herramientas
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
