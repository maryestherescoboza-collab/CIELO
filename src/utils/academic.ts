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
    if (score >= 90) return 'bg-[#7C9672]/10 text-[#7C9672]'; // Estratégico
    if (score >= 80) return 'bg-[#D8B55A]/15 text-[#8C6D1F]'; // Autónomo (darker gold text for readability)
    if (score >= 70) return 'bg-[#CB4834]/10 text-[#CB4834]'; // Resolutivo
    return 'bg-[#3F3C36]/10 text-[#3F3C36]'; // Receptivo
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

