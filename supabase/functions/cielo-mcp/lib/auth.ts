import { createClient } from '@supabase/supabase-js';
import type {
  AuthenticatedContext,
  CursoAutorizado,
} from './types.ts';

export class MCPAuthorizationError extends Error {
  code: string;
  statusCode: number;

  constructor(message: string, code = 'FORBIDDEN', statusCode = 403) {
    super(message);
    this.name = 'MCPAuthorizationError';
    this.code = code;
    this.statusCode = statusCode;
  }
}

export function normalizarTexto(txt?: string | null): string {
  if (!txt) return '';
  return txt
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

export function mismaAsignatura(a?: string | null, b?: string | null): boolean {
  if (!a || !b) return false;
  return normalizarTexto(a) === normalizarTexto(b);
}

/**
 * Valida el token Bearer contra Supabase Auth y construye el contexto del docente.
 * La identidad NUNCA se toma de los parámetros del usuario o de ChatGPT.
 */
export async function authenticateAndResolveContext(
  authHeader: string | null,
  supabaseUrl: string,
  anonKey: string,
  serviceRoleKey: string
): Promise<{ auth: AuthenticatedContext; userClient: any; adminClient: any }> {
  if (!authHeader || !authHeader.toLowerCase().startsWith('bearer ')) {
    throw new MCPAuthorizationError(
      'Encabezado de autorización ausente o con formato inválido. Requiere: Bearer <token>',
      'UNAUTHORIZED',
      401
    );
  }

  const token = authHeader.substring(7).trim();
  if (!token) {
    throw new MCPAuthorizationError('Token de acceso vacío.', 'UNAUTHORIZED', 401);
  }

  // Cliente con clave de servicio para consultar perfiles y roles de forma segura
  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  // Validar el token contra Supabase Auth
  const { data: userData, error: userError } = await adminClient.auth.getUser(token);
  if (userError || !userData?.user) {
    throw new MCPAuthorizationError(
      `Token de CIELO inválido o expirado: ${userError?.message || 'Usuario no autenticado'}`,
      'UNAUTHORIZED',
      401
    );
  }

  const user = userData.user;

  // Consultar perfil del docente
  const { data: perfil, error: perfilError } = await adminClient
    .from('perfiles')
    .select('user_id, nombre, nombre_docente, centro_id, rol')
    .eq('user_id', user.id)
    .single();

  if (perfilError || !perfil) {
    throw new MCPAuthorizationError(
      'Perfil docente no encontrado en CIELO para el usuario autenticado.',
      'UNAUTHORIZED',
      401
    );
  }

  const rolGlobal = (perfil.rol || 'docente').toLowerCase();
  const centroId = perfil.centro_id || null;

  // Verificar si es administrador del centro
  let isCentroAdmin = rolGlobal === 'admin' || rolGlobal === 'director' || rolGlobal === 'coordinador';
  if (!isCentroAdmin && centroId) {
    const { data: cRol } = await adminClient
      .from('centro_roles')
      .select('rol')
      .eq('user_id', user.id)
      .eq('centro_id', centroId)
      .single();

    if (cRol && ['director', 'coordinador', 'admin'].includes((cRol.rol || '').toLowerCase())) {
      isCentroAdmin = true;
    }
  }

  const authContext: AuthenticatedContext = {
    userId: user.id,
    email: user.email,
    nombreDocente: perfil.nombre_docente || perfil.nombre || user.email || 'Docente CIELO',
    centroId,
    rolGlobal,
    isCentroAdmin,
    accessToken: token,
  };

  // Cliente actuando con el token del usuario (para respetar RLS nativo cuando se requiera)
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false },
  });

  return { auth: authContext, userClient, adminClient };
}

/**
 * Consulta todos los cursos a los que el docente tiene acceso autorizado.
 */
export async function getCursosAutorizados(
  auth: AuthenticatedContext,
  adminClient: any
): Promise<CursoAutorizado[]> {
  // 1. Cursos creados por el docente
  const { data: cursosCreados, error: errCreados } = await adminClient
    .from('cursos')
    .select('id, nombre, grado, seccion, periodo, centro_id, grupo_id, shared_course_id, user_id, is_tutor_oficial, asignatura')
    .eq('user_id', auth.userId);

  if (errCreados) throw new Error(`Error consultando cursos creados: ${errCreados.message}`);

  // 2. Cursos donde es co-docente o asignado
  const { data: cursoDocentes, error: errDocentes } = await adminClient
    .from('curso_docentes')
    .select('curso_id, rol, asignatura, es_tutor, cursos(id, nombre, grado, seccion, periodo, centro_id, grupo_id, shared_course_id, user_id, is_tutor_oficial)')
    .eq('docente_id', auth.userId)
    .eq('activo', true);

  if (errDocentes) throw new Error(`Error consultando curso_docentes: ${errDocentes.message}`);

  const mapaCursos = new Map<number, CursoAutorizado>();

  // Procesar cursos creados
  for (const c of cursosCreados || []) {
    mapaCursos.set(c.id, {
      id: c.id,
      nombre: c.nombre,
      grado: c.grado || '',
      seccion: c.seccion || '',
      periodo: c.periodo || 'P1',
      centroId: c.centro_id || null,
      grupoId: c.grupo_id || null,
      sharedCourseId: c.shared_course_id || String(c.id),
      userIdCreator: c.user_id,
      isTutorOficial: Boolean(c.is_tutor_oficial),
      asignaturasAutorizadas: c.asignatura ? [c.asignatura] : [],
      rolesEnCurso: ['tutor'],
    });
  }

  // Procesar co-docencias
  for (const cd of cursoDocentes || []) {
    const c = cd.cursos;
    if (!c) continue;

    const cursoExistente = mapaCursos.get(c.id);
    const rolActual: 'tutor' | 'co-docente' = cd.es_tutor ? 'tutor' : 'co-docente';

    if (cursoExistente) {
      if (!cursoExistente.rolesEnCurso.includes(rolActual)) {
        cursoExistente.rolesEnCurso.push(rolActual);
      }
      if (cd.asignatura && !cursoExistente.asignaturasAutorizadas.some(a => mismaAsignatura(a, cd.asignatura))) {
        cursoExistente.asignaturasAutorizadas.push(cd.asignatura);
      }
    } else {
      mapaCursos.set(c.id, {
        id: c.id,
        nombre: c.nombre,
        grado: c.grado || '',
        seccion: c.seccion || '',
        periodo: c.periodo || 'P1',
        centroId: c.centro_id || null,
        grupoId: c.grupo_id || null,
        sharedCourseId: c.shared_course_id || String(c.id),
        userIdCreator: c.user_id,
        isTutorOficial: Boolean(cd.es_tutor),
        asignaturasAutorizadas: cd.asignatura ? [cd.asignatura] : [],
        rolesEnCurso: [rolActual],
      });
    }
  }

  // Si es admin de centro, incluir todos los cursos del centro
  if (auth.isCentroAdmin && auth.centroId) {
    const { data: cursosCentro } = await adminClient
      .from('cursos')
      .select('id, nombre, grado, seccion, periodo, centro_id, grupo_id, shared_course_id, user_id, is_tutor_oficial, asignatura')
      .eq('centro_id', auth.centroId);

    for (const c of cursosCentro || []) {
      if (!mapaCursos.has(c.id)) {
        mapaCursos.set(c.id, {
          id: c.id,
          nombre: c.nombre,
          grado: c.grado || '',
          seccion: c.seccion || '',
          periodo: c.periodo || 'P1',
          centroId: c.centro_id,
          grupoId: c.grupo_id || null,
          sharedCourseId: c.shared_course_id || String(c.id),
          userIdCreator: c.user_id,
          isTutorOficial: Boolean(c.is_tutor_oficial),
          asignaturasAutorizadas: c.asignatura ? [c.asignatura] : [],
          rolesEnCurso: ['administrador'],
        });
      }
    }
  }

  // Filtrar estrictamente: solo cursos que pertenezcan al centro del docente (si tiene centro asignado)
  const lista = Array.from(mapaCursos.values());
  if (auth.centroId) {
    return lista.filter(c => !c.centroId || c.centroId === auth.centroId);
  }
  return lista;
}

/**
 * Valida acceso a un curso específico y retorna los datos autorizados.
 */
export async function assertCursoAutorizado(
  cursoId: number,
  auth: AuthenticatedContext,
  adminClient: any
): Promise<CursoAutorizado> {
  const cursos = await getCursosAutorizados(auth, adminClient);
  const curso = cursos.find(c => c.id === Number(cursoId));

  if (!curso) {
    throw new MCPAuthorizationError(
      `Acceso denegado: El curso con ID ${cursoId} no existe o no tienes asignación docente en él.`,
      'FORBIDDEN',
      403
    );
  }

  if (auth.centroId && curso.centroId && curso.centroId !== auth.centroId) {
    throw new MCPAuthorizationError(
      'Acceso denegado: Violación de aislamiento entre centros educativos.',
      'TENANT_ISOLATION_VIOLATION',
      403
    );
  }

  return curso;
}

