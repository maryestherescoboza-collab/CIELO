/**
 * FASE 2 & FASE 4: Despachador de Protocolo MCP (Model Context Protocol — JSON-RPC 2.0)
 *
 * Expone exclusivamente las 4 herramientas autorizadas en las 3 áreas funcionales de CIELO:
 * 1. `consultar_estudiantes` (Área 1: Consulta de estudiantes)
 * 2. `buscar_estudiante` (Área 1: Consulta de estudiantes)
 * 3. `crear_actividad` (Área 2: Creación de actividades con confirmación explícita e idempotencia)
 * 4. `generar_reporte_academico` (Área 3: Generación de reportes académicos)
 */

import { MCPAuthorizationError } from './authGuard';
import { handleBuscarEstudiante, handleConsultarEstudiantes } from './tools/estudiantesTools';
import { handleCrearActividad } from './tools/actividadesTools';
import { handleGenerarReporteAcademico } from './tools/reportesTools';
import type { AuthenticatedContext, CieloDataRepository } from './types';

export const MCP_PROTOCOL_VERSION = '2024-11-05';

export const CIELO_MCP_TOOLS_CATALOG = [
  {
    name: 'consultar_estudiantes',
    description:
      'Consulta la lista paginada de estudiantes de un curso asignado al docente autenticado en CIELO. Respeta el aislamiento por centro educativo, curso y asignatura.',
    inputSchema: {
      type: 'object',
      properties: {
        curso_id: {
          type: 'integer',
          description: 'ID numérico del curso en CIELO.',
        },
        asignatura_id: {
          type: 'string',
          description: 'Nombre de la asignatura (opcional si el docente imparte una sola asignatura en el curso).',
        },
        periodo_id: {
          type: 'string',
          enum: ['P1', 'P2', 'P3', 'P4'],
          description: 'Período académico opcional (P1, P2, P3, P4).',
        },
        busqueda: {
          type: 'string',
          description: 'Filtro opcional por nombre, apellido o número de lista.',
        },
        page: {
          type: 'integer',
          default: 1,
          description: 'Número de página (comienza en 1).',
        },
        page_size: {
          type: 'integer',
          default: 25,
          maximum: 50,
          description: 'Cantidad de estudiantes por página (máximo 50).',
        },
      },
      required: ['curso_id'],
    },
  },
  {
    name: 'buscar_estudiante',
    description:
      'Busca rápidamente un estudiante por nombre, apellido, número de lista o ID únicamente dentro de los cursos autorizados del docente autenticado.',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          minLength: 2,
          description: 'Nombre, apellido o matrícula/ID a buscar (mínimo 2 caracteres).',
        },
        curso_id: {
          type: 'integer',
          description: 'ID del curso opcional para acotar la búsqueda.',
        },
        limit: {
          type: 'integer',
          default: 10,
          maximum: 25,
          description: 'Límite máximo de resultados (máximo 25).',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'crear_actividad',
    description:
      'Prepara o confirma la creación de una actividad de evaluación en CIELO. REGLA OBLIGATORIA: Primero invocar SIEMPRE con accion="preparar" para obtener el resumen y presentar la vista previa al docente. Solo tras confirmación explícita del usuario, invocar con accion="confirmar", confirmado=true, confirmation_token e idempotency_key.',
    inputSchema: {
      type: 'object',
      properties: {
        accion: {
          type: 'string',
          enum: ['preparar', 'confirmar'],
          description: '"preparar" genera la vista previa sin guardar en base de datos; "confirmar" persiste la actividad tras confirmación explícita del docente.',
        },
        curso_id: {
          type: 'integer',
          description: 'ID numérico del curso en CIELO.',
        },
        asignatura: {
          type: 'string',
          description: 'Asignatura autorizada del docente en el curso (ej. "Lengua Española", "Matemática").',
        },
        titulo: {
          type: 'string',
          description: 'Título de la actividad.',
        },
        descripcion: {
          type: 'string',
          description: 'Descripción o instrucciones pedagógicas de la actividad.',
        },
        periodo: {
          type: 'string',
          enum: ['P1', 'P2', 'P3', 'P4'],
          description: 'Período académico oficial (P1, P2, P3, P4).',
        },
        competencias: {
          type: 'array',
          items: {
            type: 'string',
            enum: ['BC1', 'BC2', 'BC3', 'BC4'],
          },
          description: 'Bloques de competencias fundamentales de CIELO (BC1, BC2, BC3, BC4).',
        },
        indicadores: {
          type: 'array',
          items: {
            type: 'string',
          },
          description: 'Lista de indicadores de logro asociados a la actividad.',
        },
        producto_evidencia: {
          type: 'string',
          description: 'Producto o evidencia de aprendizaje esperada (ej. "Ensayo argumentativo", "Maqueta", "Informe de laboratorio").',
        },
        criterios_evaluacion: {
          type: 'array',
          items: {
            type: 'string',
          },
          description: 'Criterios de evaluación opcionales.',
        },
        puntaje_maximo: {
          type: 'number',
          default: 100,
          description: 'Puntaje máximo en la escala oficial de CIELO (1 a 100).',
        },
        fecha_entrega: {
          type: 'string',
          description: 'Fecha de entrega en formato YYYY-MM-DD.',
        },
        es_producto_final: {
          type: 'boolean',
          default: false,
          description: 'Indica si la actividad es el Producto Final del período.',
        },
        es_recuperacion: {
          type: 'boolean',
          default: false,
          description: 'Indica si es una actividad de recuperación pedagógica.',
        },
        confirmation_token: {
          type: 'string',
          description: 'Token devuelto en el paso "preparar". Obligatorio cuando accion="confirmar".',
        },
        idempotency_key: {
          type: 'string',
          description: 'Clave de idempotencia devuelta en el paso "preparar" para evitar duplicados ante reintentos.',
        },
        confirmado: {
          type: 'boolean',
          description: 'Debe ser true únicamente cuando el docente ha confirmado explícitamente la creación.',
        },
      },
      required: ['accion', 'curso_id', 'asignatura', 'titulo', 'periodo', 'competencias', 'indicadores'],
    },
  },
  {
    name: 'generar_reporte_academico',
    description:
      'Genera reportes académicos oficiales de CIELO calculados con las reglas exactas de evaluación por competencias (BC1..BC4, ponderación de Producto Final, recuperaciones y separación estricta entre calificaciones registradas y actividades pendientes).',
    inputSchema: {
      type: 'object',
      properties: {
        tipo_reporte: {
          type: 'string',
          enum: [
            'rendimiento_general_curso',
            'rendimiento_competencia_fundamental',
            'rendimiento_competencia_especifica',
            'rendimiento_indicador_logro',
            'estudiantes_recuperacion_pedagogica',
            'estudiantes_actividades_pendientes',
            'resumen_calificaciones_periodo',
          ],
          description: 'Tipo de reporte académico solicitado.',
        },
        curso_id: {
          type: 'integer',
          description: 'ID numérico del curso en CIELO.',
        },
        grado: {
          type: 'string',
          description: 'Grado opcional de referencia.',
        },
        seccion: {
          type: 'string',
          description: 'Sección opcional de referencia.',
        },
        asignatura: {
          type: 'string',
          description: 'Asignatura del curso.',
        },
        periodo: {
          type: 'string',
          enum: ['P1', 'P2', 'P3', 'P4'],
          description: 'Período académico a consultar (P1, P2, P3, P4).',
        },
        competencia: {
          type: 'string',
          enum: ['BC1', 'BC2', 'BC3', 'BC4'],
          description: 'Filtro opcional de bloque de competencia fundamental (BC1..BC4).',
        },
        indicador: {
          type: 'string',
          description: 'Filtro opcional de texto para buscar un indicador de logro específico.',
        },
      },
      required: ['tipo_reporte', 'curso_id', 'asignatura', 'periodo'],
    },
  },
] as const;

export interface JsonRpcRequest {
  jsonrpc: '2.0';
  id?: string | number | null;
  method: string;
  params?: Record<string, unknown>;
}

export interface JsonRpcResponse {
  jsonrpc: '2.0';
  id: string | number | null;
  result?: unknown;
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
}

/**
 * Ejecuta una llamada a una herramienta MCP autenticada.
 */
export async function executeMCPToolCall(
  toolName: string,
  args: Record<string, unknown> = {},
  auth: AuthenticatedContext,
  repo: CieloDataRepository
): Promise<unknown> {
  switch (toolName) {
    case 'consultar_estudiantes':
      return await handleConsultarEstudiantes(args, auth, repo);
    case 'buscar_estudiante':
      return await handleBuscarEstudiante(args, auth, repo);
    case 'crear_actividad':
      return await handleCrearActividad(args, auth, repo);
    case 'generar_reporte_academico':
      return await handleGenerarReporteAcademico(args, auth, repo);
    default:
      throw new MCPAuthorizationError(
        `Herramienta MCP desconocida o no autorizada: '${toolName}'.`,
        'INVALID_INPUT',
        400
      );
  }
}

/**
 * Procesa un mensaje JSON-RPC 2.0 estándar del protocolo MCP.
 */
export async function handleMCPJsonRpc(
  request: JsonRpcRequest,
  auth: AuthenticatedContext,
  repo: CieloDataRepository
): Promise<JsonRpcResponse> {
  const id = request.id ?? null;

  try {
    switch (request.method) {
      case 'initialize': {
        return {
          jsonrpc: '2.0',
          id,
          result: {
            protocolVersion: MCP_PROTOCOL_VERSION,
            serverInfo: {
              name: 'cielo-mcp-server',
              version: '1.0.0',
            },
            capabilities: {
              tools: {
                listChanged: false,
              },
            },
          },
        };
      }

      case 'notifications/initialized':
      case 'ping': {
        return {
          jsonrpc: '2.0',
          id,
          result: {},
        };
      }

      case 'tools/list': {
        return {
          jsonrpc: '2.0',
          id,
          result: {
            tools: CIELO_MCP_TOOLS_CATALOG,
          },
        };
      }

      case 'tools/call': {
        const params = request.params || {};
        const toolName = String(params.name || '');
        const toolArgs = (params.arguments as Record<string, unknown>) || {};

        const toolOutput = await executeMCPToolCall(toolName, toolArgs, auth, repo);
        return {
          jsonrpc: '2.0',
          id,
          result: {
            content: [
              {
                type: 'text',
                text: JSON.stringify(toolOutput, null, 2),
              },
            ],
            structuredContent: toolOutput,
            isError: false,
          },
        };
      }

      default:
        return {
          jsonrpc: '2.0',
          id,
          error: {
            code: -32601,
            message: `Método MCP no soportado: ${request.method}`,
          },
        };
    }
  } catch (err: any) {
    const isAuthError = err instanceof MCPAuthorizationError;
    return {
      jsonrpc: '2.0',
      id,
      error: {
        code: isAuthError ? (err.httpStatus === 401 ? -32001 : -32003) : -32603,
        message: err?.message || 'Error interno en el servidor MCP de CIELO.',
        data: isAuthError ? { code: err.code, httpStatus: err.httpStatus } : undefined,
      },
    };
  }
}

