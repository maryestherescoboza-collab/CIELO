import { useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import type { AppState, BCKey } from '../types';
import { ASIGNATURAS_CATALOGO } from '../constants/asignaturas';

// Import bulletin templates
import Boletin1ero from '../templates/boletines/Boletin1ero';
import Boletin2do from '../templates/boletines/Boletin2do';
import Boletin3ero from '../templates/boletines/Boletin3ero';
import Boletin4to from '../templates/boletines/Boletin4to';
import Boletin5to from '../templates/boletines/Boletin5to';
import Boletin6to from '../templates/boletines/Boletin6to';

interface PrintBoletinesProps {
    state: AppState;
    docenteNombre: string;
}

export default function PrintBoletines({ state, docenteNombre }: PrintBoletinesProps) {
    const { cursoId: rawCursoId } = useParams<{ cursoId: string }>();
    const cursoId = Number(rawCursoId) || 0;

    const curso = useMemo(() => {
        return state.cursos.find(c => c.id === cursoId);
    }, [state.cursos, cursoId]);

    const estudiantes = useMemo(() => {
        return state.estudiantes
            .filter(e => e.cursoId === cursoId || (curso?.sharedCourseId && e.sharedCourseId === curso.sharedCourseId))
            .sort((a, b) => (a.numeroLista || 0) - (b.numeroLista || 0));
    }, [state.estudiantes, cursoId, curso?.sharedCourseId]);

    // Automatically trigger browser print dialog once rendered
    useEffect(() => {
        if (estudiantes.length > 0) {
            // Small delay to ensure all images and styles are fully loaded
            const timer = setTimeout(() => {
                window.print();
            }, 1500);
            return () => clearTimeout(timer);
        }
    }, [estudiantes]);

    // Helper to calculate grades for a student, a specific subject, and all periods + competencies
    const studentGrades = useMemo(() => {
        const results: Record<number, any> = {};

        estudiantes.forEach(est => {
            const studentResults: Record<string, {
                P1: Record<BCKey, number | null>;
                P2: Record<BCKey, number | null>;
                P3: Record<BCKey, number | null>;
                P4: Record<BCKey, number | null>;
                PC: Record<BCKey, number | null>;
                finalGrade: number | null;
            }> = {};

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
                        // Find activities for this period and competency
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
                // Require all four periods to be present
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
                // Require all four competency averages to be present
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
    }, [estudiantes, state.actividades, state.calificaciones, state.recuperaciones, cursoId, curso?.sharedCourseId, state.cursos]);

    // Select the correct template based on course grade/degree (curso.grado)
    const TemplateComponent = useMemo(() => {
        if (!curso) return Boletin2do;
        const grado = curso.grado.toLowerCase();
        if (grado.includes('1')) return Boletin1ero;
        if (grado.includes('2')) return Boletin2do;
        if (grado.includes('3')) return Boletin3ero;
        if (grado.includes('4')) return Boletin4to;
        if (grado.includes('5')) return Boletin5to;
        if (grado.includes('6')) return Boletin6to;
        return Boletin2do; // fallback default
    }, [curso]);

    if (!curso) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-white text-slate-800 font-bold p-8">
                El curso seleccionado no existe o no tiene datos válidos.
            </div>
        );
    }

    if (estudiantes.length === 0) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-white text-slate-800 p-8 text-center">
                <h2 className="text-xl font-bold">No hay estudiantes matriculados en este curso</h2>
                <p className="text-slate-400 mt-2">Agrega estudiantes antes de intentar imprimir boletines.</p>
            </div>
        );
    }

    return (
        <div className="boletines-print-layout">
            <style dangerouslySetInnerHTML={{ __html: `
                .print-floating-bar {
                  position: fixed;
                  bottom: 24px;
                  right: 24px;
                  background: #FDFBF7;
                  color: #2E3330;
                  padding: 10px 20px;
                  border-radius: 100px;
                  border: 1px solid rgba(46, 51, 48, 0.08);
                  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.05);
                  z-index: 100;
                  display: flex;
                  align-items: center;
                  gap: 12px;
                  font-family: system-ui, sans-serif;
                  font-size: 11px;
                  font-weight: bold;
                }
                .print-floating-bar button {
                  background: #7A8D69;
                  border: none;
                  color: white;
                  padding: 6px 14px;
                  border-radius: 100px;
                  font-weight: bold;
                  cursor: pointer;
                  transition: background 0.2s;
                }
                .print-floating-bar button:hover {
                  background: #6C7E5C;
                }
                @media print {
                  .no-print { display: none !important; }
                }
            ` }} />

            {/* FLOATING ACTION BAR FOR PREVIEW/MANUAL TRIGGER */}
            <div className="print-floating-bar no-print">
                <span>Preparado para imprimir ({estudiantes.length} boletines)</span>
                <button onClick={() => window.print()}>Imprimir ahora</button>
            </div>

            <TemplateComponent 
                curso={curso}
                estudiantes={estudiantes}
                docenteNombre={docenteNombre}
                studentGrades={studentGrades}
                state={state}
            />
        </div>
    );
}
