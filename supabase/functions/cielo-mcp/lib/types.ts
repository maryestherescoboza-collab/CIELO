/**
 * Tipos y contratos canónicos para el servidor CIELO MCP (Deno Compatible)
 */

export type PeriodoAcademico = 'P1' | 'P2' | 'P3' | 'P4';
export type BCKey = 'BC1' | 'BC2' | 'BC3' | 'BC4';

export interface AuthenticatedContext {
  userId: string;
  email?: string;
  nombreDocente: string;
  centroId: string | null;
  rolGlobal: string;
  isCentroAdmin: boolean;
  accessToken: string;
}

export interface CursoAutorizado {
  id: number;
  nombre: string;
  grado: string;
  seccion: string;
  periodo: string;
  centroId: string | null;
  grupoId: number | null;
  sharedCourseId: string;
  userIdCreator: string;
  isTutorOficial: boolean;
  asignaturasAutorizadas: string[];
  rolesEnCurso: ('tutor' | 'co-docente' | 'administrador')[];
}

export interface EstudianteMCP {
  id: number;
  numero_lista?: number | null;
  nombre_completo: string;
  nombre: string;
  apellido: string;
  curso_id: number;
  grado: string;
  seccion: string;
  en_riesgo: boolean;
  observacion?: string | null;
}

export interface ActividadMCP {
  id: number;
  curso_id: number;
  nombre: string;
  fecha: string;
  periodo: string;
  asignatura: string;
  bc_asignados: string[];
  indicador?: string | null;
  producto?: string | null;
  is_producto_final?: boolean;
  requiere_producto?: boolean;
  descripcion?: string | null;
}

export interface CalificacionMCP {
  id: number;
  estudiante_id: number;
  actividad_id: number;
  curso_id: number;
  periodo: string;
  asignatura?: string | null;
  puntaje: number | null;
  competencias: string[];
  recuperacion?: number | null;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  userId: string;
  centroId?: string | null;
  operation: string;
  toolName?: string;
  parameters: Record<string, unknown>;
  status: 'ALLOWED' | 'DENIED' | 'SUCCESS' | 'ERROR';
  details?: string;
}

