/**
 * FASE 4 — HERRAMIENTA 3: Generación de reportes académicos (`generar_reporte_academico`)
 *
 * Tipos de reporte soportados:
 * 1. `rendimiento_general_curso`: Rendimiento general del curso.
 * 2. `rendimiento_competencia_fundamental`: Rendimiento por competencia fundamental (BC1..BC4).
 * 3. `rendimiento_competencia_especifica`: Rendimiento por bloque/competencia específica.
 * 4. `rendimiento_indicador_logro`: Rendimiento desglosado por indicador de logro.
 * 5. `estudiantes_recuperacion_pedagogica`: Estudiantes que requieren recuperación pedagógica (< 70 pts).
 * 6. `estudiantes_actividades_pendientes`: Estudiantes con actividades pendientes de entrega o calificación.
 * 7. `resumen_calificaciones_periodo`: Resumen consolidado de calificaciones por período (P1..P4).
 *
 * REGLAS DE ORO:
 * - Reutiliza exactamente `calculateStudentPeriodBC` y `normalizeArea` de `src/utils/academic.ts`
 *   y `esEstudianteDelCurso` de `src/utils/aislamiento.ts`.
 * - Separa explícitamente las calificaciones reales registradas (`puntaje !== null`) de las
 *   actividades pendientes o no calificadas (`puntaje === null` o sin registro en `calificaciones`).
 * - NUNCA modifica ni recalcula en base de datos las calificaciones existentes.
 */

import {
  calculateStudentPeriodBC,
  normalizeArea,
} from '../../utils/academic';
import { esEstudianteDelCurso } from '../../utils/aislamiento';
import {
  assertNoManipulatedIdentityParams,
  MCPAuthorizationError,
  mismaAsignaturaMCP,
  verifyCourseAndSubjectAccess,
} from '../authGuard';
import { buildTenantCacheKey, withTenantCache } from '../cache';
import { recordMCPAudit } from '../auditLogger';
import type {
  AuthenticatedContext,
  BCKey,
  CieloDataRepository,
  CursoAutorizado,
  PeriodoAcademico,
  TipoReporteAcademico,
} from '../types';
import type {
  Actividad,
  CalificacionActividad,
  Competencia,
  Curso,
  Estudiante,
  Nivel,
  RecuperacionBC,
} from '../../types';

const BC_KEYS: BCKey[] = ['BC1', 'BC2', 'BC3', 'BC4'];
const COMPETENCIAS_MAP: Record<BCKey, string> = {
  BC1: 'Comunicativa',
  BC2: 'Pensamiento Lógico, Creativo y Crítico; y Resolución de Problemas',
  BC3: 'Científica y Tecnológica; y Ambiental y de la Salud',
  BC4: 'Ética y Ciudadana; y Desarrollo Personal y Espiritual',
};

const VALID_PERIODS: PeriodoAcademico[] = ['P1', 'P2', 'P3', 'P4'];
const VALID_REPORT_TYPES: TipoReporteAcademico[] = [
  'rendimiento_general_curso',
  'rendimiento_competencia_fundamental',
  'rendimiento_competencia_especifica',
  'rendimiento_indicador_logro',
  'estudiantes_recuperacion_pedagogica',
  'estudiantes_actividades_pendientes',
  'resumen_calificaciones_periodo',
];

function classifyScoreLevel(score: number | null): string {
  if (score === null) return 'Sin evaluar';
  if (score >= 90) return 'Dominio Completo / Estratégico (90-100)';
  if (score >= 80) return 'Logro Esperado / Autónomo (80-89)';
  if (score >= 70) return 'Logro Parcial / Resolutivo (70-79)';
  return 'En proceso / Requiere Recuperación (< 70)';
}

function toDomainCurso(c: CursoAutorizado, asignatura: string): Curso {
  return {
    id: c.id,
    nombre: c.nombre,
    asignatura,
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

export async function handleGenerarReporteAcademico(
  rawInput: Record<string, unknown>,
  auth: AuthenticatedContext,
  repo: CieloDataRepository
) {
  assertNoManipulatedIdentityParams(rawInput, auth);

  const tipoReporte = String(rawInput.tipo_reporte || '').trim() as TipoReporteAcademico;
  if (!VALID_REPORT_TYPES.includes(tipoReporte)) {
    throw new MCPAuthorizationError(
      `Tipo de reporte inválido '${tipoReporte}'. Tipos permitidos: ${VALID_REPORT_TYPES.join(', ')}.`,
      'INVALID_INPUT',
      400
    );
  }

  const cursoId = Number(rawInput.curso_id);
  const asignaturaInput = typeof rawInput.asignatura === 'string' ? rawInput.asignatura.trim() : '';
  const periodo = String(rawInput.periodo || '').trim().toUpperCase() as PeriodoAcademico;

  if (!VALID_PERIODS.includes(periodo)) {
    throw new MCPAuthorizationError(
      `Período inválido '${rawInput.periodo}'. Valores permitidos: P1, P2, P3, P4.`,
      'INVALID_INPUT',
      400
    );
  }

  const competenciaFiltro =
    typeof rawInput.competencia === 'string' && rawInput.competencia.trim()
      ? (rawInput.competencia.trim().toUpperCase() as BCKey)
      : undefined;

  if (competenciaFiltro && !BC_KEYS.includes(competenciaFiltro)) {
    throw new MCPAuthorizationError(
      `Competencia inválida '${competenciaFiltro}'. Valores permitidos: BC1, BC2, BC3, BC4.`,
      'INVALID_INPUT',
      400
    );
  }

  const indicadorFiltro =
    typeof rawInput.indicador === 'string' && rawInput.indicador.trim()
      ? rawInput.indicador.trim().toLowerCase()
      : undefined;

  try {
    const { curso, resolvedAsignatura, allAuthorizedCourses } = await verifyCourseAndSubjectAccess({
      auth,
      repo,
      cursoId,
      asignatura: asignaturaInput,
      requireWriteSubject: false,
    });

    const sliceCacheKey = buildTenantCacheKey({
      userId: auth.userId,
      centroId: auth.centroId,
      cursoId: curso.id,
      asignatura: resolvedAsignatura,
      periodo,
      resource: 'reporte_academico_slice',
    });

    // Descargar en paralelo (sin N+1) estudiantes, actividades, calificaciones y recuperaciones del curso y período
    const { rawEstudiantes, rawActividades, rawCalificaciones, rawRecuperaciones } =
      await withTenantCache(sliceCacheKey, async () => {
        const [estRes, actRes, calRes, recRes] = await Promise.all([
          repo.getEstudiantesByCursoContext({
            cursoIds: [curso.id],
            sharedCourseIds: curso.sharedCourseId ? [curso.sharedCourseId] : [],
            grupoIds: curso.grupoId !== null ? [curso.grupoId] : [],
          }),
          repo.getActividadesCursoPeriodo({
            cursoId: curso.id,
            sharedCourseId: curso.sharedCourseId,
            periodo,
          }),
          repo.getCalificacionesCursoPeriodo({
            cursoId: curso.id,
            sharedCourseId: curso.sharedCourseId,
            periodo,
          }),
          repo.getRecuperacionesCursoPeriodo({
            cursoId: curso.id,
            sharedCourseId: curso.sharedCourseId,
            periodo,
          }),
        ]);
        return {
          rawEstudiantes: estRes,
          rawActividades: actRes,
          rawCalificaciones: calRes,
          rawRecuperaciones: recRes,
        };
      });

    const domainCursos = allAuthorizedCourses.map(c =>
      toDomainCurso(c, c.asignaturasAutorizadas[0] || resolvedAsignatura)
    );
    const targetDomainCurso = toDomainCurso(curso, resolvedAsignatura);

    // 1. Estudiantes aislados por centro y curso
    const zeroScore = { nivel: 1 as Nivel, puntaje: 0 };
    const estudiantesCurso: Estudiante[] = rawEstudiantes
      .map((r): Estudiante => ({
        id: r.id,
        nombre: r.nombre,
        apellido: r.apellido,
        avatarColor: 'blue',
        cursoId: r.curso_id,
        grupoId: r.grupo_id ?? 0,
        sharedCourseId: r.shared_course_id ?? '',
        numeroLista: r.numero_lista ?? 0,
        enRiesgo: !!r.en_riesgo,
        nivel: 3 as Nivel,
        puntaje: r.puntaje ?? 0,
        bc1: zeroScore,
        bc2: zeroScore,
        bc3: zeroScore,
        bc4: zeroScore,
        actividadesRecientes: 0,
        observacion: '',
      }))
      .filter(est => esEstudianteDelCurso(domainCursos, targetDomainCurso, est, auth.centroId));

    // 2. Actividades de la asignatura y período
    const actividadesAsignatura: Actividad[] = rawActividades
      .filter(a => a.activo !== false && mismaAsignaturaMCP(a.asignatura, resolvedAsignatura))
      .map(a => ({
        id: a.id,
        nombre: a.nombre,
        cursoId: a.curso_id,
        fecha: a.fecha,
        periodo: a.periodo,
        bcAsignados: (a.bc_asignados || ['BC1']) as BCKey[],
        isRec: !!a.is_rec,
        isProductoFinal: !!a.is_producto_final,
        userId: a.user_id,
        asignatura: a.asignatura,
        sharedCourseId: a.shared_course_id,
        indicador: a.indicador ?? undefined,
        indicadores_json: a.indicadores_json,
        indicadoresJson: Array.isArray(a.indicadores_json) ? a.indicadores_json : undefined,
        producto: a.producto ?? undefined,
        descripcion: a.descripcion ?? null,
      }));

    const actividadesEvaluables = actividadesAsignatura.filter(
      a => a.nombre !== 'Recuperación' && !a.isRec
    );

    const actividadIdsSet = new Set(actividadesAsignatura.map(a => a.id));

    // 3. Calificaciones registradas para esas actividades
    const calificacionesAsignatura: CalificacionActividad[] = rawCalificaciones
      .filter(
        c =>
          c.activo !== false &&
          (actividadIdsSet.has(c.actividad_id) || mismaAsignaturaMCP(c.asignatura, resolvedAsignatura))
      )
      .map((c): CalificacionActividad => ({
        cursoId: c.curso_id,
        estudianteId: c.estudiante_id,
        actividadId: c.actividad_id,
        userId: c.user_id,
        asignatura: c.asignatura,
        periodo: c.periodo,
        competencias: (c.competencias || []) as Competencia[],
        descriptores: [],
        puntaje: c.puntaje !== null && c.puntaje !== undefined ? Number(c.puntaje) : null,
        recuperacion: null,
        sharedCourseId: c.shared_course_id,
      }));

    // 4. Recuperaciones registradas para la asignatura y período
    const recuperacionesAsignatura: RecuperacionBC[] = rawRecuperaciones
      .filter(r => mismaAsignaturaMCP(r.asignatura, resolvedAsignatura))
      .map(r => ({
        id: r.id,
        estudianteId: r.estudiante_id,
        cursoId: r.curso_id,
        bc: Number(r.bc) as 1 | 2 | 3 | 4,
        puntaje: Number(r.puntaje),
        periodo: r.periodo,
        sharedCourseId: r.shared_course_id,
        userId: r.user_id,
        asignatura: r.asignatura,
      }));

    // Mapa rápido de calificaciones por `${estudianteId}:${actividadId}`
    const califMap = new Map<string, CalificacionActividad>();
    for (const cal of calificacionesAsignatura) {
      califMap.set(`${cal.estudianteId}:${cal.actividadId}`, cal);
    }

    // Cálculo por estudiante usando la fórmula oficial `calculateStudentPeriodBC` de CIELO
    const detallePorEstudiante = estudiantesCurso.map(est => {
      const bcCalc = {} as Record<BCKey, { avg: number | null; rec: number | null; final: number | null }>;
      for (const bc of BC_KEYS) {
        bcCalc[bc] = calculateStudentPeriodBC({
          estudianteId: est.id,
          bc,
          periodo,
          actividades: actividadesEvaluables,
          calificaciones: calificacionesAsignatura,
          recuperaciones: recuperacionesAsignatura,
          cursoId: curso.id,
          sharedCourseId: curso.sharedCourseId,
          targetAsignatura: resolvedAsignatura,
          centroId: auth.centroId,
          cursos: domainCursos,
          curso: targetDomainCurso,
        });
      }

      const actividadesCalificadas: Array<{
        actividad_id: number;
        titulo: string;
        competencias: BCKey[];
        puntaje: number;
      }> = [];

      const actividadesPendientes: Array<{
        actividad_id: number;
        titulo: string;
        fecha: string;
        competencias: BCKey[];
        estado: 'NO_CALIFICADA_O_PENDIENTE';
      }> = [];

      for (const act of actividadesEvaluables) {
        const cal = califMap.get(`${est.id}:${act.id}`);
        if (cal && cal.puntaje !== null && cal.puntaje !== undefined && Number.isFinite(cal.puntaje)) {
          actividadesCalificadas.push({
            actividad_id: act.id,
            titulo: act.nombre,
            competencias: act.bcAsignados,
            puntaje: cal.puntaje,
          });
        } else {
          actividadesPendientes.push({
            actividad_id: act.id,
            titulo: act.nombre,
            fecha: act.fecha,
            competencias: act.bcAsignados,
            estado: 'NO_CALIFICADA_O_PENDIENTE',
          });
        }
      }

      // Promedio solo de las competencias que tienen actividades asignadas en el período
      const activeBcs = BC_KEYS.filter(bc => bcCalc[bc].final !== null);
      const promedioPeriodo =
        activeBcs.length > 0
          ? Math.round(
              activeBcs.reduce((acc, bc) => acc + (bcCalc[bc].final ?? 0), 0) / activeBcs.length
            )
          : null;

      // Competencias que requieren recuperación (< 70 en promedio original y final < 70)
      const competenciasEnRecuperacion = BC_KEYS.filter(bc => {
        const item = bcCalc[bc];
        return item.final !== null && item.final < 70;
      }).map(bc => ({
        competencia: bc,
        nombre_competencia: COMPETENCIAS_MAP[bc],
        puntaje_periodo: bcCalc[bc].avg,
        puntaje_recuperacion: bcCalc[bc].rec,
        puntaje_final: bcCalc[bc].final,
      }));

      return {
        estudiante_id: est.id,
        numero_lista: est.numeroLista ?? null,
        nombre_completo: `${est.nombre} ${est.apellido}`.trim(),
        competencias: {
          BC1: bcCalc.BC1,
          BC2: bcCalc.BC2,
          BC3: bcCalc.BC3,
          BC4: bcCalc.BC4,
        },
        promedio_periodo: promedioPeriodo,
        nivel_logro: classifyScoreLevel(promedioPeriodo),
        requiere_recuperacion: competenciasEnRecuperacion.length > 0,
        competencias_en_recuperacion: competenciasEnRecuperacion,
        total_actividades_periodo: actividadesEvaluables.length,
        total_actividades_calificadas: actividadesCalificadas.length,
        total_actividades_pendientes: actividadesPendientes.length,
        actividades_calificadas: actividadesCalificadas,
        actividades_pendientes: actividadesPendientes,
      };
    });

    // Estadísticas agregadas del curso
    const evaluados = detallePorEstudiante.filter(d => d.promedio_periodo !== null);
    const promedioGeneralCurso =
      evaluados.length > 0
        ? Math.round(
            evaluados.reduce((acc, d) => acc + (d.promedio_periodo ?? 0), 0) / evaluados.length
          )
        : null;

    const promediosPorBC = BC_KEYS.map(bc => {
      const conNota = detallePorEstudiante.filter(d => d.competencias[bc].final !== null);
      const promedioBC =
        conNota.length > 0
          ? Math.round(
              conNota.reduce((acc, d) => acc + (d.competencias[bc].final ?? 0), 0) / conNota.length
            )
          : null;
      const aprobados = conNota.filter(d => (d.competencias[bc].final ?? 0) >= 70).length;
      const enRecuperacion = conNota.filter(d => (d.competencias[bc].final ?? 0) < 70).length;
      return {
        competencia: bc,
        nombre: COMPETENCIAS_MAP[bc],
        actividades_asignadas: actividadesEvaluables.filter(a => a.bcAsignados.includes(bc)).length,
        promedio_curso: promedioBC,
        estudiantes_aprobados: aprobados,
        estudiantes_en_recuperacion: enRecuperacion,
      };
    });

    // Desglose por indicador de logro
    const indicadoresBreakdown = actividadesEvaluables.map(act => {
      const califsAct = calificacionesAsignatura.filter(
        c => c.actividadId === act.id && c.puntaje !== null && c.puntaje !== undefined
      );
      const promedioAct =
        califsAct.length > 0
          ? Math.round(califsAct.reduce((s, c) => s + (c.puntaje ?? 0), 0) / califsAct.length)
          : null;
      return {
        actividad_id: act.id,
        actividad_titulo: act.nombre,
        indicador: act.indicador || 'Sin indicador explícito',
        competencias: act.bcAsignados,
        fecha: act.fecha,
        estudiantes_calificados: califsAct.length,
        estudiantes_pendientes: Math.max(0, estudiantesCurso.length - califsAct.length),
        promedio_logro: promedioAct,
      };
    });

    let datosEspecificos: Record<string, unknown> = {};

    switch (tipoReporte) {
      case 'rendimiento_general_curso': {
        datosEspecificos = {
          resumen_ejecutivo: {
            promedio_general_curso: promedioGeneralCurso,
            nivel_general: classifyScoreLevel(promedioGeneralCurso),
            total_estudiantes: estudiantesCurso.length,
            total_actividades_evaluables: actividadesEvaluables.length,
            estudiantes_aprobados: detallePorEstudiante.filter(
              d => d.promedio_periodo !== null && d.promedio_periodo >= 70
            ).length,
            estudiantes_en_recuperacion: detallePorEstudiante.filter(d => d.requiere_recuperacion)
              .length,
            estudiantes_con_pendientes: detallePorEstudiante.filter(
              d => d.total_actividades_pendientes > 0
            ).length,
          },
          rendimiento_por_competencia: promediosPorBC,
        };
        break;
      }

      case 'rendimiento_competencia_fundamental':
      case 'rendimiento_competencia_especifica': {
        const bcsSeleccionadas = competenciaFiltro
          ? promediosPorBC.filter(p => p.competencia === competenciaFiltro)
          : promediosPorBC;
        datosEspecificos = {
          competencia_filtrada: competenciaFiltro || 'Todas (BC1..BC4)',
          resumen_competencias: bcsSeleccionadas,
          detalle_estudiantes: detallePorEstudiante.map(d => ({
            estudiante_id: d.estudiante_id,
            numero_lista: d.numero_lista,
            nombre_completo: d.nombre_completo,
            competencias: competenciaFiltro
              ? { [competenciaFiltro]: d.competencias[competenciaFiltro] }
              : d.competencias,
            requiere_recuperacion: d.requiere_recuperacion,
          })),
        };
        break;
      }

      case 'rendimiento_indicador_logro': {
        const filtrados = indicadorFiltro
          ? indicadoresBreakdown.filter(
              i =>
                i.indicador.toLowerCase().includes(indicadorFiltro) ||
                i.actividad_titulo.toLowerCase().includes(indicadorFiltro)
            )
          : indicadoresBreakdown;
        datosEspecificos = {
          indicador_filtrado: indicadorFiltro || 'Todos los indicadores del período',
          total_indicadores_evaluados: filtrados.length,
          desglose_indicadores: filtrados,
        };
        break;
      }

      case 'estudiantes_recuperacion_pedagogica': {
        const enRecuperacion = detallePorEstudiante.filter(d => d.requiere_recuperacion);
        datosEspecificos = {
          umbral_aprobacion_minerd: 70,
          total_estudiantes_curso: estudiantesCurso.length,
          total_requieren_recuperacion: enRecuperacion.length,
          estudiantes_en_recuperacion: enRecuperacion.map(d => ({
            estudiante_id: d.estudiante_id,
            numero_lista: d.numero_lista,
            nombre_completo: d.nombre_completo,
            promedio_periodo: d.promedio_periodo,
            competencias_en_recuperacion: d.competencias_en_recuperacion,
            actividades_pendientes_count: d.total_actividades_pendientes,
          })),
        };
        break;
      }

      case 'estudiantes_actividades_pendientes': {
        const conPendientes = detallePorEstudiante.filter(d => d.total_actividades_pendientes > 0);
        datosEspecificos = {
          nota_aclaratoria:
            'Diferenciación estricta CIELO: se listan únicamente actividades creadas en el período que aún no registran calificación numérica para el estudiante.',
          total_actividades_periodo: actividadesEvaluables.length,
          total_estudiantes_con_pendientes: conPendientes.length,
          estudiantes: conPendientes.map(d => ({
            estudiante_id: d.estudiante_id,
            numero_lista: d.numero_lista,
            nombre_completo: d.nombre_completo,
            actividades_calificadas_count: d.total_actividades_calificadas,
            actividades_pendientes_count: d.total_actividades_pendientes,
            actividades_pendientes: d.actividades_pendientes,
          })),
        };
        break;
      }

      case 'resumen_calificaciones_periodo': {
        datosEspecificos = {
          promedio_general_curso: promedioGeneralCurso,
          resumen_competencias: promediosPorBC,
          calificaciones_estudiantes: detallePorEstudiante.map(d => ({
            estudiante_id: d.estudiante_id,
            numero_lista: d.numero_lista,
            nombre_completo: d.nombre_completo,
            BC1: d.competencias.BC1.final,
            BC2: d.competencias.BC2.final,
            BC3: d.competencias.BC3.final,
            BC4: d.competencias.BC4.final,
            promedio_periodo: d.promedio_periodo,
            nivel_logro: d.nivel_logro,
            actividades_calificadas: d.total_actividades_calificadas,
            actividades_pendientes: d.total_actividades_pendientes,
          })),
        };
        break;
      }
    }

    recordMCPAudit({
      userId: auth.userId,
      centroId: auth.centroId,
      toolName: 'generar_reporte_academico',
      cursoId: curso.id,
      asignatura: resolvedAsignatura,
      status: 'SUCCESS',
      details: `Reporte '${tipoReporte}' generado para ${curso.grado} ${curso.seccion} (${resolvedAsignatura} - ${periodo}).`,
    });

    return {
      ok: true,
      tipo_reporte: tipoReporte,
      contexto_academico: {
        curso_id: curso.id,
        curso_nombre: curso.nombre,
        grado: curso.grado,
        seccion: curso.seccion,
        asignatura: normalizeArea(resolvedAsignatura),
        periodo,
        docente: auth.nombreDocente,
        fecha_generacion: new Date().toISOString(),
      },
      ...datosEspecificos,
    };
  } catch (err: any) {
    recordMCPAudit({
      userId: auth.userId,
      centroId: auth.centroId,
      toolName: 'generar_reporte_academico',
      cursoId: Number.isFinite(cursoId) ? cursoId : null,
      asignatura: asignaturaInput || null,
      status: err instanceof MCPAuthorizationError ? 'DENIED' : 'ERROR',
      details: err?.message,
    });
    throw err;
  }
}
