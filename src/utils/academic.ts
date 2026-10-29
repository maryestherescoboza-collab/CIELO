import type { BCKey, CalificacionActividad, RecuperacionBC, Actividad, Curso } from '../types';
import { perteneceAlContextoDelCurso } from './aislamiento';

export const normalizeArea = (a?: string | null) => 
    (a || '').replace(/_/g, ' ')
    .toLowerCase()
    .replace('matemáticas', 'matematica')
    .replace('matemática', 'matematica')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, "");

export const getGradeClass = (score: number | null) => {
    if (score === null) return 'bg-slate-50 text-slate-400';
    if (score >= 100) return 'bg-(--success)/15 text-(--success) font-bold'; // Estratégico (#7A8D69)
    if (score >= 85) return 'bg-(--success-soft)/30 text-[#657655] font-bold'; // Logrado (#BFC9A6)
    if (score >= 70) return 'bg-(--primary)/15 text-(--primary) font-bold'; // Resolutivo (#6D8FB9)
    return 'bg-(--danger)/10 text-(--danger) font-bold'; // Riesgo (#DB5B48)
};

export interface ComputeBCOptions {
    estudianteId: number;
    bc: BCKey;
    periodo: string;
    actividades: Actividad[];
    calificaciones: CalificacionActividad[];
    recuperaciones: RecuperacionBC[];
    cursoId: number;
    sharedCourseId?: string;
    targetAsignatura?: string;
    bcSel?: Record<number, Set<BCKey>>;
    currentUserId?: string;
    // Contexto institucional opcional. Cuando se proporciona, ninguna
    // actividad/recuperación compartida por sharedCourseId puede cruzar
    // fronteras de centro.
    centroId?: string | null;
    cursosCentro?: Map<number, string>;
    // Frontera estricta: con el catálogo de cursos y el curso autorizado se
    // aplica la MISMA interpretación de pertenencia que en los boletines
    // (perteneceAlContextoDelCurso). Tiene prioridad sobre cursosCentro.
    cursos?: Curso[];
    curso?: Curso | null;
}

export function calculateStudentPeriodBC({
    estudianteId,
    bc,
    periodo,
    actividades,
    calificaciones,
    recuperaciones,
    cursoId,
    sharedCourseId,
    targetAsignatura,
    bcSel,
    currentUserId,
    centroId,
    cursosCentro,
    cursos,
    curso
}: ComputeBCOptions) {
    const bcNum = Number(bc.replace('BC', '')) as 1 | 2 | 3 | 4;

    // Centro del curso objetivo (prioridad: mapa → contexto activo).
    const centroCurso = cursosCentro?.get(cursoId) ?? centroId ?? null;
    // ¿El curso `otherCourseId` pertenece a la misma institución que el curso
    // objetivo? Con catálogo + curso autorizado se delega en la frontera única
    // (mismo centro exigido; sharedCourseId subordinado). Sin ellos se conserva
    // el comportamiento heredado basado en el mapa de centros.
    const mismaInstitucion = (otherCourseId: number): boolean => {
        if (otherCourseId === cursoId) return true;
        if (cursos && curso) return perteneceAlContextoDelCurso(cursos, curso, otherCourseId, centroCurso);
        const centroOtro = cursosCentro?.get(otherCourseId) ?? null;
        if (!centroCurso || !centroOtro) return true;
        return centroCurso === centroOtro;
    };

    const filteredActs = actividades.filter(a => {
        const isMyAct = a.cursoId === cursoId;
        const isSharedAct = sharedCourseId && a.sharedCourseId === sharedCourseId && mismaInstitucion(a.cursoId);
        const matchesPeriod = a.periodo === periodo || (!a.periodo && periodo === 'P1');
        const isNotRec = a.nombre !== 'Recuperación';
        // Regla obligatoria: Exigir asignatura válida y coincidencia estricta con targetAsignatura
        const matchesAsignatura = Boolean(a.asignatura) && (!targetAsignatura || normalizeArea(a.asignatura) === normalizeArea(targetAsignatura));
        const isMine = !currentUserId || a.userId === currentUserId || !a.userId || a.cursoId === cursoId;

        if (!(isMyAct || isSharedAct) || !matchesPeriod || !isNotRec || !matchesAsignatura || !isMine) {
            return false;
        }

        const assignedBcs = bcSel?.[a.id] ?? (a.bcAsignados && a.bcAsignados.length > 0 ? new Set(a.bcAsignados) : new Set<BCKey>(['BC1']));
        return assignedBcs.has(bc);
    });

    const avg = computePeriodBCAvg(filteredActs, bc, (actId) => {
        const cal = calificaciones.find(c => c.estudianteId === estudianteId && c.actividadId === actId);
        return cal?.puntaje ?? 0;
    });

    const rec = recuperaciones.find(r =>
        r.estudianteId === estudianteId &&
        (r.cursoId === cursoId ||
            (sharedCourseId && r.sharedCourseId === sharedCourseId && mismaInstitucion(r.cursoId))) &&
        Boolean(r.asignatura) &&
        (!targetAsignatura || normalizeArea(r.asignatura) === normalizeArea(targetAsignatura)) &&
        Number(r.bc) === bcNum &&
        r.periodo === periodo &&
        (!currentUserId || r.userId === currentUserId || !r.userId || r.cursoId === cursoId)
    )?.puntaje ?? null;

    const final = (rec !== null && (avg === null || avg < 70)) ? rec : avg;

    return { avg, rec, final };
}

/**
 * Parsea los puntos por competencia guardados en la descripción de una actividad.
 */
export function parsePuntosCompetencias(descripcion?: string | null): Record<string, number> {
    if (!descripcion) return {};
    try {
        const parsed = JSON.parse(descripcion);
        if (parsed && typeof parsed === 'object') {
            if (parsed.puntos && typeof parsed.puntos === 'object') {
                const res: Record<string, number> = {};
                for (const [k, v] of Object.entries(parsed.puntos)) {
                    if (typeof v === 'number' && !isNaN(v)) {
                        res[k] = v;
                    }
                }
                return res;
            }
            const res: Record<string, number> = {};
            for (const [k, v] of Object.entries(parsed)) {
                if (typeof v === 'number' && !isNaN(v)) {
                    res[k] = v;
                }
            }
            return res;
        }
    } catch {
        // No es JSON estructurado
    }
    return {};
}

/**
 * Calcula los puntos (sobre 100) que corresponden a una actividad para una competencia dada.
 * Si existe un Producto Final con puntos asignados a esa competencia:
 * - El Producto Final recibe los puntos asignados.
 * - Las demás actividades se reparten equitativamente los puntos restantes (100 - pfPuntos).
 * Si no hay puntos personalizados en el Producto Final, se reparte equitativamente 100 / n.
 */
export function getActivityBcPoints({
    actividad,
    bc,
    actividades,
    bcSel,
}: {
    actividad: Actividad;
    bc: BCKey;
    actividades: Actividad[];
    bcSel?: Record<number, Set<BCKey>>;
}): number {
    const isSel = (act: Actividad) => {
        const assigned = bcSel?.[act.id] ?? (act.bcAsignados && act.bcAsignados.length > 0 ? new Set(act.bcAsignados) : new Set<BCKey>(['BC1']));
        return assigned.has(bc);
    };

    if (!isSel(actividad)) return 0;

    const participatingActs = actividades.filter(isSel);
    if (participatingActs.length === 0) return 0;

    const pfAct = participatingActs.find(a => !!a.isProductoFinal);
    const pfPuntos = parsePuntosCompetencias(pfAct?.descripcion);
    const pfAssigned = (pfAct && typeof pfPuntos[bc] === 'number')
        ? Math.min(100, Math.max(0, pfPuntos[bc]))
        : null;

    if (pfAssigned !== null) {
        if (actividad.isProductoFinal) {
            return pfAssigned;
        }
        const otherActs = participatingActs.filter(a => !a.isProductoFinal);
        const puntosRestantes = Math.max(0, 100 - pfAssigned);
        return otherActs.length > 0 ? puntosRestantes / otherActs.length : 0;
    }

    return 100 / participatingActs.length;
}

/**
 * Calcula el promedio de calificaciones de un período para una competencia,
 * ponderando cada actividad según los puntos asignados respetando el total de 100.
 */
export function computePeriodBCAvg(
    filteredActs: Actividad[],
    bc: BCKey,
    getScore: (actId: number) => number
): number | null {
    if (filteredActs.length === 0) return null;

    const pfAct = filteredActs.find(a => !!a.isProductoFinal);
    const pfPuntos = parsePuntosCompetencias(pfAct?.descripcion);
    const pfAssigned = (pfAct && typeof pfPuntos[bc] === 'number')
        ? Math.min(100, Math.max(0, pfPuntos[bc]))
        : null;

    if (pfAssigned !== null) {
        const otherActs = filteredActs.filter(a => !a.isProductoFinal);
        const puntosRestantes = Math.max(0, 100 - pfAssigned);
        const otherWeight = otherActs.length > 0 ? puntosRestantes / otherActs.length : 0;

        const totalScore = filteredActs.reduce((acc, a) => {
            const score = getScore(a.id);
            const weight = a.isProductoFinal ? pfAssigned : otherWeight;
            return acc + (score * (weight / 100));
        }, 0);

        return Math.round(totalScore);
    }

    const total = filteredActs.reduce((acc, a) => acc + getScore(a.id), 0);
    return Math.round(total / filteredActs.length);
}

/**
 * Obtiene el puntaje máximo asignado al producto final.
 * 1. Revisa si hay puntos asignados en la descripción de la actividad.
 * 2. Si no hay puntos explícitos, busca el aporte asignado en el sistema (getActivityBcPoints).
 * 3. Si no existe ninguno, retorna 100 como escala por defecto.
 */
export function getProductoFinalMaxPoints(
    actividad: Actividad,
    actividades?: Actividad[],
    bcSel?: Record<number, Set<BCKey>>
): number {
    const puntos = parsePuntosCompetencias(actividad.descripcion);
    const assignedBcs = bcSel?.[actividad.id] ?? (actividad.bcAsignados && actividad.bcAsignados.length > 0 ? new Set(actividad.bcAsignados) : new Set<BCKey>(['BC1']));
    
    // 1. Revisar si hay puntos asignados en la descripción para alguna de las competencias activas
    for (const bc of assignedBcs) {
        if (typeof puntos[bc] === 'number' && puntos[bc] > 0) {
            return puntos[bc];
        }
    }

    // 2. Si hay algún valor numérico en puntos
    for (const v of Object.values(puntos)) {
        if (typeof v === 'number' && v > 0) {
            return v;
        }
    }

    // 3. Si no hay puntos guardados explícitamente, calcular el aporte asignado
    if (actividades && actividades.length > 0) {
        for (const bc of assignedBcs) {
            const pts = getActivityBcPoints({ actividad, bc, actividades, bcSel });
            if (pts > 0) return Math.round(pts);
        }
    }

    return 100;
}

/**
 * Formatea una calificación numérica mostrando hasta dos decimales solo cuando sea necesario.
 * Ejemplos: 96.66667 -> "96.67", 50 -> "50", 100 -> "100", 0 -> "0", 96.5 -> "96.5"
 */
export function formatGradeScore(score: number | null | undefined): string {
    if (score === null || score === undefined || isNaN(score)) return '';
    const rounded = Number(score.toFixed(2));
    return String(rounded);
}


