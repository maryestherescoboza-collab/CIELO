import { useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Printer, School } from 'lucide-react';
import { useAppStore } from '../store/appStore';
import { useEstudianteData } from '../hooks/useEstudianteData';
import EstudianteHeader from '../components/estudiante/EstudianteHeader';
import PerfilTab from '../components/estudiante/PerfilTab';
import AnnualGradesTable from '../components/estudiante/AnnualGradesTable';
import type { BCKey, CursoDocente, Curso, Actividad } from '../types';
import { ASIGNATURAS_CATALOGO } from '../constants/asignaturas';

export default function Estudiante() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { 
        state, 
        session,
        selectedEstudianteId
    } = useAppStore();
    const selectedId = Number(id) || selectedEstudianteId || (state.estudiantes && state.estudiantes.length > 0 ? state.estudiantes[0].id : 0);

    const estBase = state.estudiantes.find(e => e.id === selectedId);
    const cursoBase = estBase ? state.cursos.find(c => c.id === estBase.cursoId) : null;
    const currentCourseRole = state.cursoDocentes.find((cd: CursoDocente) => cd.cursoId === cursoBase?.id && cd.userId === session?.user?.id);
    const isTutor = !currentCourseRole || currentCourseRole.rol === 'tutor' || currentCourseRole.esTutor;

    const {
        periodo,
        setPeriodo,
        activeTab,
        setActiveTab,
        est,
        curso,
        studentHabilidades,
        promedioPeriodo,
        rankingPeriodo,
        actividadesPeriodo,
        incidenciasEstudiante
    } = useEstudianteData({ 
        state, 
        selectedId, 
        currentCourseRole,
        currentUserId: session?.user?.id
    });

    // Enforce role restrictions on tabs
    if (!isTutor && activeTab === 'Evaluación') {
        setActiveTab('Perfil');
    }

    const allSubjects = useMemo(() => {
        if (!curso) return [];
        const subjectsSet = new Set<string>();
        state.actividades.forEach((act: Actividad) => {
            const actCurso = state.cursos.find((c: Curso) => c.id === act.cursoId);
            const isMatch = (curso.sharedCourseId && actCurso?.sharedCourseId === curso.sharedCourseId) || act.cursoId === curso.id;
            if (isMatch) {
                subjectsSet.add(act.asignatura || actCurso?.asignatura || '');
            }
        });
        return Array.from(subjectsSet).sort();
    }, [curso, state.actividades, state.cursos]);

    const renderGradesCellsForSubject = useCallback((subject: string) => {
        if (!curso || !est) return null;
        
        const asig = ASIGNATURAS_CATALOGO.find(a => a.nombre === subject || a.id === subject);
        if (!asig) return null;

        const periods: ('P1' | 'P2' | 'P3' | 'P4')[] = ['P1', 'P2', 'P3', 'P4'];
        const bcs: BCKey[] = ['BC1', 'BC2', 'BC3', 'BC4'];
        const cursoId = curso.id;

        const pGrades: Record<string, Record<BCKey, number | null>> = {
            P1: { BC1: null, BC2: null, BC3: null, BC4: null },
            P2: { BC1: null, BC2: null, BC3: null, BC4: null },
            P3: { BC1: null, BC2: null, BC3: null, BC4: null },
            P4: { BC1: null, BC2: null, BC3: null, BC4: null },
        };

        const pcAverages: Record<BCKey, number | null> = {
            BC1: null, BC2: null, BC3: null, BC4: null
        };

        // Filter activities, qualifications, and recoveries for this subject using the exact same logic as PrintBoletines.tsx
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

                const finalBCScore = (rec !== null && (avg === null || avg < 70)) ? rec : avg;
                pGrades[p][bc] = finalBCScore;
            });
        });

        // Calculate group competency averages
        bcs.forEach(bc => {
            const hasAllPeriods = periods.every(p => pGrades[p][bc] !== null);
            if (hasAllPeriods) {
                const periodScores = periods.map(p => pGrades[p][bc] as number);
                pcAverages[bc] = Math.round(periodScores.reduce((sum, val) => sum + val, 0) / periodScores.length);
            } else {
                pcAverages[bc] = null;
            }
        });

        const hasAllPcAverages = bcs.every(bc => pcAverages[bc] !== null);
        const finalGrade = hasAllPcAverages 
            ? Math.round(bcs.map(bc => pcAverages[bc] as number).reduce((sum, val) => sum + val, 0) / bcs.length) 
            : null;

        // Render the cells!
        const cells = bcs.map(bc => {
            return periods.map(p => {
                const finalVal = pGrades[p][bc];
                // Check if this cell was recovered
                const bcNum = (bcs.indexOf(bc) + 1);
                const rec = recoveries.find(r => r.periodo === p && Number(r.bc) === bcNum)?.puntaje ?? null;
                const avgVal = activities.filter(a => a.periodo === p && a.nombre !== 'Recuperación' && a.bcAsignados?.includes(bc)).length ? Math.round(activities.filter(a => a.periodo === p && a.nombre !== 'Recuperación' && a.bcAsignados?.includes(bc)).map(a => qualifications.find(q => q.actividadId === a.id)?.puntaje ?? 0).reduce((sum, val) => sum + val, 0) / activities.filter(a => a.periodo === p && a.nombre !== 'Recuperación' && a.bcAsignados?.includes(bc)).length) : null;
                const isRecovered = rec !== null && (avgVal === null || avgVal < 70);

                return (
                    <td key={`${p}-${bc}`} className="px-3 py-4 text-center border border-[rgba(46,51,48,0.08)]">
                        {finalVal !== null && finalVal !== undefined ? (
                            <span className={`text-[13px] font-black ${isRecovered ? 'text-danger bg-[#FDFBF7] px-1.5 py-0.5 rounded border border-danger/20' : 'text-[#2E3330]'}`}>
                                {finalVal}
                            </span>
                        ) : (
                            <span className="text-[12px] font-bold text-[#5F665E]/40">-</span>
                        )}
                    </td>
                );
            });
        });

        // sitA/sitR
        const sitA = finalGrade !== null && finalGrade >= 70 ? '✓' : '';
        const sitR = finalGrade !== null && finalGrade < 70 ? '✗' : '';

        return (
            <>
                {cells}
                <td className="px-2 font-black text-[13px] text-[#2E3330] bg-[#FDFBF7] border-x-2 border-[rgba(46,51,48,0.08)]">
                    {finalGrade !== null ? finalGrade : <span className="text-[#5F665E]/40">-</span>}
                </td>
                <td className="px-2 border-r border-[rgba(46,51,48,0.08)]"><span className="text-[#5F665E]/40">-</span></td>
                <td className="px-2 border-r border-[rgba(46,51,48,0.08)]"><span className="text-[#5F665E]/40">-</span></td>
                <td className="px-2 border-r border-[rgba(46,51,48,0.08)]"><span className="text-[#5F665E]/40">-</span></td>
                <td className="px-2 text-primary font-black text-[14px] bg-[#FDFBF7] border-x border-[rgba(46,51,48,0.08)]">{sitA}</td>
                <td className="px-2 text-danger font-black text-[14px] bg-[#FDFBF7] border-r border-[rgba(46,51,48,0.08)]">{sitR}</td>
            </>
        );
    }, [curso, est, state.actividades, state.calificaciones, state.recuperaciones, state.cursos]);

    if (!est) {
        return (
            <div className="flex flex-col items-center justify-center p-12 text-center bg-white rounded-3xl border-2 border-dashed border-slate-200">
                <h2 className="text-xl font-bold text-slate-800">Estudiante no encontrado</h2>
                <button onClick={() => navigate('/cursos')} className="mt-4 text-slate-600 font-bold underline">Volver a Cursos</button>
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center w-full min-h-screen bg-[#FDFBF7] text-[#2E3330] pb-16">
            <EstudianteHeader 
                periodo={periodo} 
                setPeriodo={setPeriodo} 
                activeTab={activeTab} 
                setActiveTab={setActiveTab} 
                onBack={() => navigate('/cursos')} 
                isTutor={isTutor}
            />

            <div className="w-[98%] max-w-310 bg-[#FDFBF7] shadow-sm border border-[rgba(46,51,48,0.08)] rounded-[20px] p-6 relative">
                {activeTab === 'Perfil' && (
                    <PerfilTab 
                        est={est}
                        curso={curso}
                        periodo={periodo}
                        promedioPeriodo={promedioPeriodo}
                        rankingPeriodo={rankingPeriodo}
                        studentHabilidades={studentHabilidades}
                        actividadesPeriodo={actividadesPeriodo}
                        incidenciasEstudiante={incidenciasEstudiante}
                        state={state}
                        currentAsignatura={currentCourseRole?.asignatura || curso?.asignatura}
                    />
                )}

                {activeTab === 'Evaluación' && isTutor && (
                    <div className="space-y-6 animate-in fade-in duration-500">
                        <div className="flex justify-between items-center border-b pb-5 border-[rgba(46,51,48,0.08)]">
                            <div>
                                <h2 className="text-xl font-black text-[#2E3330] tracking-tight">REGISTRO ANUAL</h2>
                                <p className="text-xs font-bold text-[#5F665E] uppercase tracking-widest">{est.nombre} {est.apellido} • {curso?.grado} {curso?.seccion}</p>
                            </div>
                            <button onClick={() => window.print()} className="flex items-center gap-2 px-[18px] py-[8px] min-h-[36px] leading-none bg-primary text-white rounded-full font-semibold text-xs hover:bg-[#6C7E5C] transition-all uppercase tracking-[0.08em] shadow-sm">
                                <Printer size={15} /> Imprimir
                            </button>
                        </div>
                        <AnnualGradesTable 
                            allSubjects={allSubjects}
                            renderGradesCellsForSubject={renderGradesCellsForSubject}
                        />
                    </div>
                )}
            </div>

            <footer className="w-[92%] max-w-7xl mt-16 text-center py-10 opacity-40 select-none">
                <p className="text-[#5F665E] text-[14px] font-bold uppercase tracking-[0.5em] mb-2">Plataforma Educativa Noether</p>
                <div className="flex items-center justify-center gap-2 text-xs font-black uppercase tracking-widest text-[#5F665E]/70">
                    <School size={14} />
                    <span>Registro Oficial Validado</span>
                </div>
            </footer>
        </div>
    );
}
