/**
 * FASE 4 — HERRAMIENTA 1: Consulta y búsqueda de estudiantes (`consultar_estudiantes` y `buscar_estudiante`)
 *
 * Reglas:
 * - Solo devuelve estudiantes de los cursos asignados al usuario autenticado y de su mismo centro educativo.
 * - Paginación obligatoria (`page`, `page_size` máx 50) y límite máximo en búsquedas (`limit` máx 25).
 * - Prohibido realizar consultas globales sin filtro de curso/usuario.
 * - Reutiliza `esEstudianteDelCurso` de `src/utils/aislamiento.ts`.
 */

import { esEstudianteDelCurso } from '../../utils/aislamiento';
import {
  assertNoManipulatedIdentityParams,
  MCPAuthorizationError,
  resolveAuthorizedCourses,
  verifyCourseAndSubjectAccess,
} from '../authGuard';
import { buildTenantCacheKey, withTenantCache } from '../cache';
import { recordMCPAudit } from '../auditLogger';
import type {
  AuthenticatedContext,
  CieloDataRepository,
  CursoAutorizado,
  EstudianteMCP,
} from '../types';
import type { Curso, Estudiante, Nivel } from '../../types';

const MAX_PAGE_SIZE = 50;
const DEFAULT_PAGE_SIZE = 25;
const MAX_SEARCH_LIMIT = 25;
const DEFAULT_SEARCH_LIMIT = 10;

function toDomainCurso(c: CursoAutorizado): Curso {
  return {
    id: c.id,
    nombre: c.nombre,
    asignatura: c.asignaturasAutorizadas[0] || '',
    grado: c.grado,
    seccion: c.seccion,
    periodo: c.periodo,
    diasSemana: [],
    color: 'blue',
    isTutorOficial: c.isTutorOficial,
    userId: c.userIdCreator,
    grupoId: c.grupoId ?? 0,
    sharedCourseId: c.sharedCourseId,
    centroId: c.centroId ?? undefined,
  };
}

function toDomainEstudiante(raw: {
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
}): Estudiante {
  const numNivel = Number(raw.nivel);
  const nivelVal: Nivel = (numNivel >= 1 && numNivel <= 4 ? numNivel : 3) as Nivel;
  const zeroScore = { nivel: 1 as Nivel, puntaje: 0 };
  return {
    id: raw.id,
    nombre: raw.nombre,
    apellido: raw.apellido,
    avatarColor: 'blue',
    cursoId: raw.curso_id,
    grupoId: raw.grupo_id ?? 0,
    sharedCourseId: raw.shared_course_id ?? '',
    numeroLista: raw.numero_lista ?? 0,
    enRiesgo: !!raw.en_riesgo,
    nivel: nivelVal,
    puntaje: raw.puntaje ?? 0,
    bc1: zeroScore,
    bc2: zeroScore,
    bc3: zeroScore,
    bc4: zeroScore,
    actividadesRecientes: 0,
    observacion: '',
  };
}

function formatEstudianteMCP(est: Estudiante, curso: CursoAutorizado, asignaturaFiltro?: string): EstudianteMCP {
  const nombre = (est.nombre || '').trim();
  const apellido = (est.apellido || '').trim();
  return {
    id: est.id,
    numero_lista: est.numeroLista || null,
    nombre_completo: `${nombre} ${apellido}`.trim(),
    nombre,
    apellido,
    curso_id: curso.id,
    grado: curso.grado,
    seccion: curso.seccion,
    asignaturas_vinculadas: asignaturaFiltro
      ? [asignaturaFiltro]
      : curso.asignaturasAutorizadas,
    estado_academico: est.enRiesgo ? 'Requiere apoyo / Recuperación' : 'Activo',
    en_riesgo: !!est.enRiesgo,
  };
}

/**
 * Ejecuta `consultar_estudiantes`.
 */
export async function handleConsultarEstudiantes(
  rawInput: Record<string, unknown>,
  auth: AuthenticatedContext,
  repo: CieloDataRepository
) {
  assertNoManipulatedIdentityParams(rawInput, auth);

  const cursoId = Number(rawInput.curso_id);
  const asignaturaId = typeof rawInput.asignatura_id === 'string' ? rawInput.asignatura_id.trim() : undefined;
  const periodoId = typeof rawInput.periodo_id === 'string' ? rawInput.periodo_id.trim() : undefined;
  const busqueda = typeof rawInput.busqueda === 'string' ? rawInput.busqueda.trim().toLowerCase() : '';
  const page = Math.max(1, Number(rawInput.page) || 1);
  const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, Number(rawInput.page_size) || DEFAULT_PAGE_SIZE));

  try {
    const { curso, resolvedAsignatura, allAuthorizedCourses } = await verifyCourseAndSubjectAccess({
      auth,
      repo,
      cursoId,
      asignatura: asignaturaId,
      requireWriteSubject: false,
    });

    const cacheKey = buildTenantCacheKey({
      userId: auth.userId,
      centroId: auth.centroId,
      cursoId: curso.id,
      asignatura: resolvedAsignatura,
      periodo: periodoId || '*',
      resource: 'estudiantes_curso',
    });

    const rawEstudiantes = await withTenantCache(cacheKey, () =>
      repo.getEstudiantesByCursoContext({
        cursoIds: [curso.id],
        sharedCourseIds: curso.sharedCourseId ? [curso.sharedCourseId] : [],
        grupoIds: curso.grupoId !== null ? [curso.grupoId] : [],
      })
    );

    const domainCursos = allAuthorizedCourses.map(toDomainCurso);
    const targetDomainCurso = toDomainCurso(curso);

    // Filtrar estrictamente con `esEstudianteDelCurso` (respeta `centro_id`)
    const filteredDomain = rawEstudiantes
      .map(toDomainEstudiante)
      .filter(est => esEstudianteDelCurso(domainCursos, targetDomainCurso, est, auth.centroId))
      .filter(est => {
        if (!busqueda) return true;
        const full = `${est.nombre} ${est.apellido}`.toLowerCase();
        return full.includes(busqueda) || String(est.id) === busqueda || String(est.numeroLista ?? '') === busqueda;
      });

    const totalEstudiantes = filteredDomain.length;
    const totalPages = Math.max(1, Math.ceil(totalEstudiantes / pageSize));
    const offset = (page - 1) * pageSize;
    const pageItems = filteredDomain
      .slice(offset, offset + pageSize)
      .map(est => formatEstudianteMCP(est, curso, resolvedAsignatura));

    recordMCPAudit({
      userId: auth.userId,
      centroId: auth.centroId,
      toolName: 'consultar_estudiantes',
      cursoId: curso.id,
      asignatura: resolvedAsignatura,
      status: 'SUCCESS',
      details: `Consulta de estudiantes paginada (página ${page}/${totalPages}, devueltos ${pageItems.length}/${totalEstudiantes}).`,
    });

    return {
      ok: true,
      curso: {
        id: curso.id,
        nombre: curso.nombre,
        grado: curso.grado,
        seccion: curso.seccion,
        periodo_escolar: curso.periodo,
        asignatura_consultada: resolvedAsignatura,
        periodo_evaluacion: periodoId || 'Todos',
      },
      paginacion: {
        page,
        page_size: pageSize,
        total_estudiantes: totalEstudiantes,
        total_pages: totalPages,
        has_next_page: page < totalPages,
      },
      estudiantes: pageItems,
    };
  } catch (err: any) {
    recordMCPAudit({
      userId: auth.userId,
      centroId: auth.centroId,
      toolName: 'consultar_estudiantes',
      cursoId: Number.isFinite(cursoId) ? cursoId : null,
      asignatura: asignaturaId || null,
      status: err instanceof MCPAuthorizationError ? 'DENIED' : 'ERROR',
      details: err?.message,
    });
    throw err;
  }
}

/**
 * Ejecuta `buscar_estudiante` (búsqueda rápida por nombre, apellido o matrícula/ID dentro de los cursos autorizados del docente).
 */
export async function handleBuscarEstudiante(
  rawInput: Record<string, unknown>,
  auth: AuthenticatedContext,
  repo: CieloDataRepository
) {
  assertNoManipulatedIdentityParams(rawInput, auth);

  const query = typeof rawInput.query === 'string' ? rawInput.query.trim() : '';
  const cursoIdFiltro = rawInput.curso_id !== undefined && rawInput.curso_id !== null ? Number(rawInput.curso_id) : undefined;
  const limit = Math.min(MAX_SEARCH_LIMIT, Math.max(1, Number(rawInput.limit) || DEFAULT_SEARCH_LIMIT));

  if (query.length < 2) {
    throw new MCPAuthorizationError(
      'El término de búsqueda (`query`) debe tener al menos 2 caracteres.',
      'INVALID_INPUT',
      400
    );
  }

  try {
    const allAuthorizedCourses = await resolveAuthorizedCourses(auth, repo);

    let targetCourses: CursoAutorizado[] = allAuthorizedCourses;
    if (cursoIdFiltro !== undefined) {
      const found = allAuthorizedCourses.find(c => c.id === cursoIdFiltro);
      if (!found) {
        throw new MCPAuthorizationError(
          `Acceso denegado: no tienes permisos sobre el curso ID ${cursoIdFiltro}.`,
          'FORBIDDEN_COURSE',
          403
        );
      }
      targetCourses = [found];
    }

    if (targetCourses.length === 0) {
      return {
        ok: true,
        query,
        total_encontrados: 0,
        estudiantes: [],
      };
    }

    const cursoIds = targetCourses.map(c => c.id);
    const sharedCourseIds = Array.from(new Set(targetCourses.map(c => c.sharedCourseId).filter(Boolean)));
    const grupoIds = Array.from(new Set(targetCourses.map(c => c.grupoId).filter((g): g is number => g !== null)));

    const rawEstudiantes = await repo.getEstudiantesByCursoContext({
      cursoIds,
      sharedCourseIds,
      grupoIds,
    });

    const domainCursos = allAuthorizedCourses.map(toDomainCurso);
    const qLower = query.toLowerCase();

    const matches: EstudianteMCP[] = [];
    const seenIds = new Set<string>();

    for (const raw of rawEstudiantes) {
      const est = toDomainEstudiante(raw);
      const fullName = `${est.nombre} ${est.apellido}`.toLowerCase();
      const reverseName = `${est.apellido} ${est.nombre}`.toLowerCase();
      const idMatch = String(est.id) === qLower || String(est.numeroLista ?? '') === qLower;

      if (!fullName.includes(qLower) && !reverseName.includes(qLower) && !idMatch) {
        continue;
      }

      for (const curso of targetCourses) {
        const domainCurso = toDomainCurso(curso);
        if (esEstudianteDelCurso(domainCursos, domainCurso, est, auth.centroId)) {
          const dedupKey = `${est.id}:${curso.id}`;
          if (!seenIds.has(dedupKey)) {
            seenIds.add(dedupKey);
            matches.push(formatEstudianteMCP(est, curso));
          }
        }
      }

      if (matches.length >= limit) break;
    }

    recordMCPAudit({
      userId: auth.userId,
      centroId: auth.centroId,
      toolName: 'buscar_estudiante',
      cursoId: cursoIdFiltro ?? null,
      asignatura: null,
      status: 'SUCCESS',
      details: `Búsqueda '${query}' devolvió ${matches.length} coincidencias.`,
    });

    return {
      ok: true,
      query,
      total_encontrados: matches.length,
      limit,
      estudiantes: matches,
    };
  } catch (err: any) {
    recordMCPAudit({
      userId: auth.userId,
      centroId: auth.centroId,
      toolName: 'buscar_estudiante',
      cursoId: cursoIdFiltro ?? null,
      asignatura: null,
      status: err instanceof MCPAuthorizationError ? 'DENIED' : 'ERROR',
      details: err?.message,
    });
    throw err;
  }
}
