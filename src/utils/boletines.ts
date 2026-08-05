import type { AppState, BCKey, Estudiante, Curso } from '../types';
import { ASIGNATURAS_CATALOGO } from '../constants/asignaturas';

export interface StudentSubjectGrades {
    P1: Record<BCKey, number | null>;
    P2: Record<BCKey, number | null>;
    P3: Record<BCKey, number | null>;
    P4: Record<BCKey, number | null>;
    PC: Record<BCKey, number | null>;
    finalGrade: number | null;
}

export type StudentGrades = Record<number, Record<string, StudentSubjectGrades>>;

// Calcula las calificaciones de cada estudiante por asignatura y período,
// aplicando la misma lógica del sistema (recuperaciones incluidas).
export function computeStudentGrades(
    estudiantes: Estudiante[],
    state: AppState,
    cursoId: number,
    curso?: Curso | null
): StudentGrades {
    const results: StudentGrades = {};

    estudiantes.forEach(est => {
        const studentResults: Record<string, StudentSubjectGrades> = {};

        ASIGNATURAS_CATALOGO.forEach(asig => {
            const periods: ('P1' | 'P2' | 'P3' | 'P4')[] = ['P1', 'P2', 'P3', 'P4'];
            const bcs: BCKey[] = ['BC1', 'BC2', 'BC3', 'BC4'];

            const pGrades: Record<string, Record<BCKey, number | null>> = {
                P1: { BC1: null, BC2: null, BC3: null, BC4: null },
                P2: { BC1: null, BC2: null, BC3: null, BC4: null },
                P3: { BC1: null, BC2: null, BC3: null, BC4: null },
                P4: { BC1: null, BC2: null, BC3: null, BC4: null },
            };

            const pcAverages: Record<BCKey, number | null> = {
                BC1: null, BC2: null, BC3: null, BC4: null
            };

            // Filter activities and qualifications for this subject
            const activities = state.actividades.filter(a =>
                (a.cursoId === cursoId || (curso?.sharedCourseId && state.cursos.find(cx => cx.id === a.cursoId)?.sharedCourseId === curso.sharedCourseId)) &&
                a.asignatura === asig.id
            );

            const qualifications = state.calificaciones.filter(c =>
                c.estudianteId === est.id &&
                c.asignatura === asig.id
            );

            const recoveries = state.recuperaciones.filter(r =>
                r.estudianteId === est.id &&
                r.asignatura === asig.id
            );

            periods.forEach(p => {
                bcs.forEach((bc, bcIdx) => {
                    const bcNum = (bcIdx + 1) as 1 | 2 | 3 | 4;
                    const periodBCActs = activities.filter(a =>
                        a.periodo === p &&
                        a.nombre !== 'Recuperación' &&
                        a.bcAsignados?.includes(bc)
                    );

                    const rawScores = periodBCActs
                        .map(a => qualifications.find(q => q.actividadId === a.id)?.puntaje ?? 0);

                    const avg = periodBCActs.length ? Math.round(rawScores.reduce((sum, val) => sum + val, 0) / periodBCActs.length) : null;
                    const rec = recoveries.find(r => r.periodo === p && Number(r.bc) === bcNum)?.puntaje ?? null;

                    // Apply recovery logic (exact match with system rule)
                    const finalBCScore = (rec !== null && (avg === null || avg < 70)) ? rec : avg;
                    pGrades[p][bc] = finalBCScore;
                });
            });

            // Calculate group competency averages (PC1, PC2, PC3, PC4)
            bcs.forEach(bc => {
                const hasAllPeriods = periods.every(p => pGrades[p][bc] !== null);
                if (hasAllPeriods) {
                    const periodScores = periods.map(p => pGrades[p][bc] as number);
                    pcAverages[bc] = Math.round(periodScores.reduce((sum, val) => sum + val, 0) / periodScores.length);
                } else {
                    pcAverages[bc] = null;
                }
            });

            // Calculate Calificación Final del Área (C.F.)
            const hasAllPcAverages = bcs.every(bc => pcAverages[bc] !== null);
            const finalGrade = hasAllPcAverages
                ? Math.round(bcs.map(bc => pcAverages[bc] as number).reduce((sum, val) => sum + val, 0) / bcs.length)
                : null;

            studentResults[asig.id] = {
                P1: pGrades.P1,
                P2: pGrades.P2,
                P3: pGrades.P3,
                P4: pGrades.P4,
                PC: pcAverages,
                finalGrade
            };
        });

        results[est.id] = studentResults;
    });

    return results;
}
