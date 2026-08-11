import type { BCKey, CalificacionActividad, RecuperacionBC, Actividad } from '../types';

export const normalizeArea = (a?: string | null) => 
    (a || '').replace(/_/g, ' ')
    .toLowerCase()
    .replace('matemáticas', 'matematica')
    .replace('matemática', 'matematica')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, "");

export const getGradeClass = (score: number | null) => {
    if (score === null) return 'bg-slate-50 text-slate-400';
    if (score >= 100) return 'bg-success/10 text-success'; // Estratégico
    if (score >= 85) return 'bg-primary/10 text-primary'; // Autónomo
    if (score >= 70) return 'bg-attention/10 text-attention'; // Resolutivo
    return 'bg-danger/10 text-danger'; // Receptivo
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
    currentUserId
}: ComputeBCOptions) {
    const bcNum = Number(bc.replace('BC', '')) as 1 | 2 | 3 | 4;

    const filteredActs = actividades.filter(a => {
        const isMyAct = a.cursoId === cursoId;
        const isSharedAct = sharedCourseId && a.sharedCourseId === sharedCourseId;
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
        (r.cursoId === cursoId || (sharedCourseId && r.sharedCourseId === sharedCourseId)) &&
        (!targetAsignatura || r.asignatura === targetAsignatura) &&
        Number(r.bc) === bcNum &&
        r.periodo === periodo &&
        (!currentUserId || r.userId === currentUserId || !r.userId)
    )?.puntaje ?? null;

    const final = (rec !== null && (avg === null || avg < 70)) ? rec : avg;

    return { avg, rec, final };
}

