/**
 * Capa de Seguridad, Aislamiento Multi-Centro y Autorización por Curso/Asignatura para el servidor MCP de CIELO.
 *
 * REGLAS DE ORO (CIELO Guardian & AGUA):
 * 1. NUNCA confiar en un `user_id` o `centro_id` enviado como parámetro de herramienta por ChatGPT.
 * 2. Derivar la identidad exclusivamente de la sesión/token OAuth autenticado.
 * 3. Verificar pertenencia al centro educativo (`centro_id`), vínculo activo al curso (`curso_docentes` o tutor creador)
 *    y permiso explícito sobre la asignatura (`normalizeArea`).
 */

import { normalizeArea } from '../utils/academic';
import { esRolAdministrador } from '../utils/autorizacion';
import type {
  AuthenticatedContext,
  CieloDataRepository,
  CursoAutorizado,
} from './types';

export class MCPAuthorizationError extends Error {
  public readonly code: 'UNAUTHENTICATED' | 'FORBIDDEN_CENTER' | 'FORBIDDEN_COURSE' | 'FORBIDDEN_SUBJECT' | 'INVALID_INPUT';
  public readonly httpStatus: number;

  constructor(
    message: string,
    code: 'UNAUTHENTICATED' | 'FORBIDDEN_CENTER' | 'FORBIDDEN_COURSE' | 'FORBIDDEN_SUBJECT' | 'INVALID_INPUT' = 'FORBIDDEN_COURSE',
    httpStatus = 403
  ) {
    super(message);
    this.name = 'MCPAuthorizationError';
    this.code = code;
    this.httpStatus = httpStatus;
  }
}

/**
 * Compara dos asignaturas usando la normalización oficial de áreas curriculares de CIELO (`normalizeArea`).
 */
export function mismaAsignaturaMCP(a?: string | null, b?: string | null): boolean {
  if (!a || !b) return false;
  const normA = normalizeArea(a.trim());
  const normB = normalizeArea(b.trim());
  return normA.toLowerCase() === normB.toLowerCase();
}

/**
 * Rechaza cualquier intento de inyección o manipulación de parámetros sensibles
 * si el cliente intenta forzar un `user_id` o `centro_id` distinto al de la sesión.
 */
export function assertNoManipulatedIdentityParams(
  rawArgs: Record<string, unknown>,
  auth: AuthenticatedContext
): void {
  const suspiciousUserKeys = ['user_id', 'userId', 'usuario_id', 'docente_id', 'docenteId'];
  for (const key of suspiciousUserKeys) {
    const val = rawArgs[key];
    if (typeof val === 'string' && val.trim() !== '' && val.trim() !== auth.userId) {
      throw new MCPAuthorizationError(
        `Violación de aislamiento: no se permite especificar un '${key}' distinto al usuario autenticado.`,
        'FORBIDDEN_COURSE',
        403
      );
    }
  }

  const suspiciousCenterKeys = ['centro_id', 'centroId'];
  for (const key of suspiciousCenterKeys) {
    const val = rawArgs[key];
    if (typeof val === 'string' && val.trim() !== '' && val.trim() !== (auth.centroId ?? '')) {
      throw new MCPAuthorizationError(
        `Violación de aislamiento multi-centro: no se permite acceder a datos de otro centro educativo.`,
        'FORBIDDEN_CENTER',
        403
      );
    }
  }
}

/**
 * Resuelve todos los cursos y asignaturas autorizados para el usuario autenticado
 * aplicando las mismas reglas que `useSupabaseData.ts` y `src/utils/aislamiento.ts`.
 */
export async function resolveAuthorizedCourses(
  auth: AuthenticatedContext,
  repo: CieloDataRepository
): Promise<CursoAutorizado[]> {
  if (!auth.userId) {
    throw new MCPAuthorizationError('Sesión no autenticada.', 'UNAUTHENTICATED', 401);
  }

  const { cursos, cursoDocentes } = await repo.getCursosByIdsOrUser(
    auth.userId,
    auth.centroId,
    auth.isCentroAdmin
  );

  const misVinculos = cursoDocentes.filter(
    cd => cd.activo !== false && String(cd.docente_id) === auth.userId
  );

  const todosVinculosPorCurso = new Map<number, typeof cursoDocentes>();
  for (const cd of cursoDocentes) {
    if (cd.activo === false) continue;
    const list = todosVinculosPorCurso.get(cd.curso_id) || [];
    list.push(cd);
    todosVinculosPorCurso.set(cd.curso_id, list);
  }

  const result: CursoAutorizado[] = [];

  for (const c of cursos) {
    if (c.activo === false) continue;

    // 1. Aislamiento estricto por centro educativo (`centro_id`)
    if (auth.centroId && c.centro_id && c.centro_id !== auth.centroId) {
      continue;
    }

    const esCreador = String(c.user_id) === auth.userId;
    const vinculosDocenteEnCurso = misVinculos.filter(cd => cd.curso_id === c.id);
    const tieneVinculoDocente = vinculosDocenteEnCurso.length > 0;

    // Debe ser creador/tutor del curso, tener vínculo activo en `curso_docentes`, o ser administrador del mismo centro
    const esAdminMismoCentro =
      auth.isCentroAdmin && !!auth.centroId && c.centro_id === auth.centroId;

    if (!esCreador && !tieneVinculoDocente && !esAdminMismoCentro) {
      continue;
    }

    // 2. Determinar asignaturas autorizadas y roles en este curso
    const asignaturasSet = new Set<string>();
    const rolesSet = new Set<'tutor' | 'co-docente' | 'administrador'>();

    for (const v of vinculosDocenteEnCurso) {
      if (v.asignatura?.trim()) {
        asignaturasSet.add(v.asignatura.trim());
      }
      rolesSet.add(v.es_tutor || v.rol === 'tutor' ? 'tutor' : 'co-docente');
    }

    // Fallback cuando el creador no tiene fila explícita en `curso_docentes`
    if (esCreador && vinculosDocenteEnCurso.length === 0 && c.asignatura?.trim()) {
      asignaturasSet.add(c.asignatura.trim());
      rolesSet.add(c.is_tutor_oficial ? 'tutor' : 'co-docente');
    }

    // Si es administrador del centro o tutor oficial del curso, puede consultar las asignaturas vinculadas al curso
    const esTutorCurso =
      (esCreador && c.is_tutor_oficial) ||
      vinculosDocenteEnCurso.some(v => v.es_tutor || v.rol === 'tutor');

    if (esAdminMismoCentro) {
      rolesSet.add('administrador');
      if (c.asignatura?.trim()) asignaturasSet.add(c.asignatura.trim());
      for (const v of todosVinculosPorCurso.get(c.id) || []) {
        if (v.asignatura?.trim()) asignaturasSet.add(v.asignatura.trim());
      }
    }

    const sharedCourseId =
      c.shared_course_id ||
      (c.grupo_id !== null && c.grupo_id !== undefined ? `group_${c.grupo_id}` : String(c.id));

    result.push({
      id: c.id,
      nombre: c.nombre,
      grado: c.grado,
      seccion: c.seccion,
      periodo: c.periodo,
      centroId: c.centro_id,
      grupoId: c.grupo_id,
      sharedCourseId,
      userIdCreator: c.user_id,
      isTutorOficial: esTutorCurso,
      asignaturasAutorizadas: Array.from(asignaturasSet),
      rolesEnCurso: Array.from(rolesSet),
    });
  }

  return result;
}

/**
 * Verifica que el docente tenga acceso al curso indicado y (opcionalmente) a una asignatura específica.
 * Si `requireWriteSubject` es true (p. ej. al crear una actividad), exige que la asignatura
 * sea una de las asignaturas que el docente imparte directamente en ese curso.
 */
export async function verifyCourseAndSubjectAccess(params: {
  auth: AuthenticatedContext;
  repo: CieloDataRepository;
  cursoId: number;
  asignatura?: string | null;
  requireWriteSubject?: boolean;
}): Promise<{
  curso: CursoAutorizado;
  resolvedAsignatura: string;
  allAuthorizedCourses: CursoAutorizado[];
}> {
  const { auth, repo, cursoId, asignatura, requireWriteSubject = false } = params;

  if (!Number.isInteger(cursoId) || cursoId <= 0) {
    throw new MCPAuthorizationError('Identificador de curso inválido.', 'INVALID_INPUT', 400);
  }

  // Primero verificamos si el curso pertenece a otro centro o no está autorizado
  const allAuthorizedCourses = await resolveAuthorizedCourses(auth, repo);
  const curso = allAuthorizedCourses.find(c => c.id === cursoId);

  if (!curso) {
    throw new MCPAuthorizationError(
      `Acceso denegado: no tienes permisos sobre el curso ID ${cursoId} o pertenece a otro centro educativo.`,
      'FORBIDDEN_COURSE',
      403
    );
  }

  // Si no se especificó asignatura, si el docente tiene exactamente 1 asignatura autorizada, la usamos
  if (!asignatura || !asignatura.trim()) {
    if (curso.asignaturasAutorizadas.length === 1) {
      return {
        curso,
        resolvedAsignatura: curso.asignaturasAutorizadas[0],
        allAuthorizedCourses,
      };
    }
    if (!requireWriteSubject && curso.asignaturasAutorizadas.length > 0) {
      return {
        curso,
        resolvedAsignatura: curso.asignaturasAutorizadas[0],
        allAuthorizedCourses,
      };
    }
    throw new MCPAuthorizationError(
      `Debes especificar la asignatura. Asignaturas autorizadas en este curso: ${curso.asignaturasAutorizadas.join(', ') || 'ninguna'}.`,
      'INVALID_INPUT',
      400
    );
  }

  const matchedSubject = curso.asignaturasAutorizadas.find(a =>
    mismaAsignaturaMCP(a, asignatura)
  );

  // Para escritura (crear_actividad) o para co-docentes, la asignatura debe estar en `asignaturasAutorizadas`
  if (!matchedSubject) {
    // Un tutor oficial del curso puede consultar reportes de otras asignaturas de su sección titular solo en lectura,
    // pero NUNCA crear actividades en asignaturas que no imparte, y un co-docente NUNCA puede leer ni escribir otra asignatura.
    if (requireWriteSubject || !curso.isTutorOficial) {
      throw new MCPAuthorizationError(
        `Acceso denegado a la asignatura '${asignatura}' en el curso ${curso.grado} ${curso.seccion}. Asignaturas autorizadas para tu perfil en este curso: ${curso.asignaturasAutorizadas.join(', ') || 'ninguna'}.`,
        'FORBIDDEN_SUBJECT',
        403
      );
    }
    return {
      curso,
      resolvedAsignatura: asignatura.trim(),
      allAuthorizedCourses,
    };
  }

  return {
    curso,
    resolvedAsignatura: matchedSubject,
    allAuthorizedCourses,
  };
}

/**
 * Construye el contexto autenticado a partir del userId verificado en el token OAuth / Supabase Auth.
 */
export async function buildAuthenticatedContext(
  userId: string,
  accessToken: string,
  repo: CieloDataRepository,
  email?: string,
  oauthTokenId?: string
): Promise<AuthenticatedContext> {
  if (!userId) {
    throw new MCPAuthorizationError('Token de acceso inválido o sin identidad de usuario.', 'UNAUTHENTICATED', 401);
  }

  const perfil = await repo.getPerfil(userId);
  if (!perfil) {
    throw new MCPAuthorizationError('Perfil de usuario no encontrado en CIELO.', 'UNAUTHENTICATED', 401);
  }

  const rolGlobal = perfil.rol || 'docente';
  return {
    userId: perfil.user_id,
    email,
    nombreDocente: perfil.nombre_docente || perfil.nombre || 'Docente',
    centroId: perfil.centro_id ?? null,
    rolGlobal,
    isCentroAdmin: esRolAdministrador(rolGlobal),
    accessToken,
    oauthTokenId,
  };
}

