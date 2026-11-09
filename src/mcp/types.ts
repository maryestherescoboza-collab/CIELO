/**
 * Tipos compartidos y contratos estrictos para el servidor MCP de CIELO.
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
  oauthTokenId?: string;
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
  asignaturas_vinculadas: string[];
  estado_academico: string;
  en_riesgo: boolean;
}

export interface ConsultarEstudiantesInput {
  curso_id: number;
  asignatura_id?: string;
  periodo_id?: PeriodoAcademico;
  busqueda?: string;
  page?: number;
  page_size?: number;
}

export interface BuscarEstudianteInput {
  query: string;
  curso_id?: number;
  limit?: number;
}

export interface IndicadorInput {
  id?: string | number;
  codigo?: string;
  descripcion: string;
  competencia?: BCKey;
}

export interface CrearActividadInput {
  accion: 'preparar' | 'confirmar';
  curso_id: number;
  asignatura: string;
  titulo: string;
  descripcion?: string;
  periodo: PeriodoAcademico;
  competencias: BCKey[];
  indicadores: (string | IndicadorInput)[];
  producto_evidencia?: string;
  criterios_evaluacion?: string[];
  puntaje_maximo?: number;
  fecha_entrega?: string;
  es_producto_final?: boolean;
  es_recuperacion?: boolean;
  // Requeridos para accion === 'confirmar'
  confirmation_token?: string;
  idempotency_key?: string;
  confirmado?: boolean;
}

export type TipoReporteAcademico =
  | 'rendimiento_general_curso'
  | 'rendimiento_competencia_fundamental'
  | 'rendimiento_competencia_especifica'
  | 'rendimiento_indicador_logro'
  | 'estudiantes_recuperacion_pedagogica'
  | 'estudiantes_actividades_pendientes'
  | 'resumen_calificaciones_periodo';

export interface GenerarReporteInput {
  tipo_reporte: TipoReporteAcademico;
  curso_id: number;
  grado?: string;
  seccion?: string;
  asignatura: string;
  periodo: PeriodoAcademico;
  competencia?: BCKey;
  indicador?: string;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  userId: string;
  centroId: string | null;
  toolName: string;
  cursoId: number | null;
  asignatura: string | null;
  status: 'SUCCESS' | 'DENIED' | 'PREVIEW' | 'ERROR';
  createdRecordId?: number | string | null;
  details?: string;
}

/**
 * Interfaz de acceso a datos inyectable (Supabase PostgREST con RLS o Mock para pruebas aisladas)
 */
export interface CieloDataRepository {
  getPerfil(userId: string): Promise<{
    user_id: string;
    nombre?: string;
    nombre_docente?: string;
    centro_id: string | null;
    rol?: string;
    asignaturas?: string[];
  } | null>;

  getCursosByIdsOrUser(userId: string, centroId: string | null, isCentroAdmin: boolean): Promise<{
    cursos: Array<{
      id: number;
      nombre: string;
      asignatura: string;
      grado: string;
      seccion: string;
      periodo: string;
      is_tutor_oficial: boolean;
      user_id: string;
      grupo_id: number | null;
      shared_course_id: string | null;
      centro_id: string | null;
      activo: boolean;
    }>;
    cursoDocentes: Array<{
      id: number;
      curso_id: number;
      docente_id: string;
      rol: 'tutor' | 'co-docente';
      es_tutor: boolean;
      asignatura: string;
      activo: boolean;
    }>;
  }>;

  getEstudiantesByCursoContext(params: {
    cursoIds: number[];
    sharedCourseIds: string[];
    grupoIds: number[];
  }): Promise<Array<{
    id: number;
    nombre: string;
    apellido: string;
    curso_id: number;
    grupo_id: number | null;
    shared_course_id: string | null;
    numero_lista: number | null;
    activo: boolean;
    en_riesgo: boolean;
    nivel: string | null;
    puntaje: number | null;
  }>>;

  getActividadesCursoPeriodo(params: {
    cursoId: number;
    sharedCourseId: string;
    periodo: PeriodoAcademico;
  }): Promise<Array<{
    id: number;
    nombre: string;
    curso_id: number;
    fecha: string;
    periodo: PeriodoAcademico;
    bc_asignados: BCKey[];
    is_rec: boolean;
    is_producto_final: boolean;
    user_id: string;
    asignatura: string;
    shared_course_id: string;
    indicador: string | null;
    indicadores_json: any;
    producto: string | null;
    descripcion: string | null;
    activo: boolean;
  }>>;

  getCalificacionesCursoPeriodo(params: {
    cursoId: number;
    sharedCourseId: string;
    periodo: PeriodoAcademico;
  }): Promise<Array<{
    id: number;
    curso_id: number;
    estudiante_id: number;
    actividad_id: number;
    user_id: string;
    asignatura: string;
    periodo: string;
    competencias: string[];
    puntaje: number | null;
    shared_course_id: string;
    activo: boolean;
  }>>;

  getRecuperacionesCursoPeriodo(params: {
    cursoId: number;
    sharedCourseId: string;
    periodo: PeriodoAcademico;
  }): Promise<Array<{
    id: number;
    estudiante_id: number;
    curso_id: number;
    bc: 1 | 2 | 3 | 4;
    puntaje: number;
    periodo: string;
    shared_course_id: string;
    user_id: string;
    asignatura: string;
  }>>;

  findExistingActividad(params: {
    cursoId: number;
    asignatura: string;
    periodo: PeriodoAcademico;
    nombre: string;
    fecha: string;
  }): Promise<{ id: number; nombre: string; fecha: string } | null>;

  insertActividad(payload: {
    nombre: string;
    fecha: string;
    periodo: PeriodoAcademico;
    curso_id: number;
    bc_asignados: BCKey[];
    is_rec: boolean;
    is_producto_final: boolean;
    user_id: string;
    asignatura: string;
    shared_course_id: string;
    indicador: string;
    indicadores_json: any[];
    producto: string;
    descripcion: string | null;
  }): Promise<{
    id: number;
    nombre: string;
    fecha: string;
    periodo: PeriodoAcademico;
    curso_id: number;
    bc_asignados: BCKey[];
    asignatura: string;
    indicador: string;
    producto: string;
  }>;
}

