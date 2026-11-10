/**
 * Tipos e interfaces para el cliente y panel de CIELO MCP.
 */

export interface CieloMCPIntegrationState {
  conectado: boolean;
  endpoint: string;
  ultimaConexion?: string | null;
  permisos: string[];
}

export const CIELO_MCP_DEFAULT_ENDPOINT = 'https://sgjnactnhmpmbbgexcox.supabase.co/functions/v1/cielo-mcp/mcp';

export const CIELO_MCP_PERMISOS = [
  'Consultar perfil, rol y centro del docente autenticado.',
  'Consultar cursos y asignaturas asignadas.',
  'Consultar y buscar estudiantes de tus secciones con protección de aislamiento.',
  'Consultar actividades y calificaciones del curso.',
  'Crear actividades pedagógicas (requiere tu confirmación explícita previa).',
  'Registrar calificaciones (requiere tu confirmación explícita previa).',
  'Generar reportes oficiales por competencias (BC1-BC4) y períodos.',
];
