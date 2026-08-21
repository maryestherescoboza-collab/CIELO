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
        const matchesPeriod = a.periodo === periodo;
        const isNotRec = a.nombre !== 'Recuperación';
        const matchesAsignatura = !targetAsignatura || a.asignatura === targetAsignatura;
        const isMine = !currentUserId || a.userId === currentUserId || !a.userId;

        if (!(isMyAct || isSharedAct) || !matchesPeriod || !isNotRec || !matchesAsignatura || !isMine) {
            return false;
        }

        const assignedBcs = bcSel?.[a.id] ?? (a.bcAsignados && a.bcAsignados.length > 0 ? new Set(a.bcAsignados) : new Set<BCKey>(['BC1']));
        return assignedBcs.has(bc);
    });

    const rawScores = filteredActs.map(a => {
        const cal = calificaciones.find(c => c.estudianteId === estudianteId && c.actividadId === a.id);
        return cal?.puntaje ?? 0;
    });

    const avg = filteredActs.length 
        ? Math.round(rawScores.reduce((acc, val) => acc + val, 0) / filteredActs.length)
        : null;

    const rec = recuperaciones.find(r =>
        r.estudianteId === estudianteId &&
        (r.cursoId === cursoId ||
            (sharedCourseId && r.sharedCourseId === sharedCourseId && mismaInstitucion(r.cursoId))) &&
        (!targetAsignatura || r.asignatura === targetAsignatura) &&
        Number(r.bc) === bcNum &&
        r.periodo === periodo &&
        (!currentUserId || r.userId === currentUserId || !r.userId)
    )?.puntaje ?? null;

    const final = (rec !== null && (avg === null || avg < 70)) ? rec : avg;

    return { avg, rec, final };
}

