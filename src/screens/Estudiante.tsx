import { useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Printer, School } from 'lucide-react';
import { useAppStore } from '../store/appStore';
import { useEstudianteData } from '../hooks/useEstudianteData';
import EstudianteHeader from '../components/estudiante/EstudianteHeader';
import PerfilTab from '../components/estudiante/PerfilTab';
import AnnualGradesTable from '../components/estudiante/AnnualGradesTable';
import type { BCKey, CursoDocente, Curso, RecuperacionBC, Actividad } from '../types';
import { normalizeArea } from '../utils/academic';

export default function Estudiante() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { 
        state, 
        session,
        selectedEstudianteId
    } = useAppStore();
    const selectedId = Number(id) || selectedEstudianteId || (state.estudiantes && state.estudiantes.length > 0 ? state.estudiantes[0].id : 0);

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
    } = useEstudianteData({ state, selectedId });

    const currentCourseRole = state.cursoDocentes.find((cd: CursoDocente) => cd.cursoId === curso?.id && cd.userId === session?.user?.id);


    // ── Optimized: Pre-calculate all grades and recuperations for O(1) table cell rendering ──
    const gradesMap = useMemo(() => {
        if (!est || !curso) return new Map<string, number>();
        const resultMap = new Map<string, number>();

        // 1. Get all activities for the course/shared course and current user/role
        const visibleActs = state.actividades.filter(a => {
            const actCurso = state.cursos.find(c => c.id === a.cursoId);
            const isMatch = (curso.sharedCourseId && actCurso?.sharedCourseId === curso.sharedCourseId) || a.cursoId === curso.id;
            const isRecur = a.nombre === 'Recuperación';
            const actAsignatura = a.asignatura || actCurso?.asignatura || '';
            const matchesRole = !currentCourseRole || currentCourseRole.rol === 'tutor' || actAsignatura === currentCourseRole.asignatura;
            return isMatch && !isRecur && matchesRole;
        });

        // Group activities by: `${normAsignatura}-${periodo}-${bc}`
        const actsGroup = new Map<string, typeof visibleActs>();
        visibleActs.forEach(a => {
            const actCurso = state.cursos.find(c => c.id === a.cursoId);
            const actAsignatura = a.asignatura || actCurso?.asignatura || '';
            const normAsignatura = normalizeArea(actAsignatura);
            const assignedBCs = (a.bcAsignados && a.bcAsignados.length > 0) ? a.bcAsignados : ['BC1'];
            
            assignedBCs.forEach(bc => {
                const groupKey = `${normAsignatura}-${a.periodo}-${bc}`;
                const list = actsGroup.get(groupKey) || [];
                list.push(a);
                actsGroup.set(groupKey, list);
            });
        });

        // Calculate average grade per group
        actsGroup.forEach((acts, groupKey) => {
            const scores = acts.map(a => {
                const calif = state.calificaciones.find(c => c.estudianteId === est.id && c.actividadId === a.id);
                return calif?.puntaje;
            }).filter((s): s is number => s !== undefined && s !== null);
            
            if (scores.length > 0) {
                const avg = Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length);
                const sharedId = curso.sharedCourseId || String(curso.id);
                resultMap.set(`${sharedId}-${groupKey}`, avg);
            }
        });

        return resultMap;
    }, [est, curso, state.actividades, state.cursos, state.calificaciones, currentCourseRole]);

    const recuperacionesMap = useMemo(() => {
        if (!est || !curso) return new Map<string, number>();
        const rMap = new Map<string, number>();
        state.recuperaciones.forEach((r: RecuperacionBC) => {
            if (r.estudianteId !== est.id || r.puntaje === null) return;
            const normAsignatura = normalizeArea(r.asignatura || '');
            const bcStr = typeof r.bc === 'string' ? r.bc : `BC${r.bc}`;
            const sharedId = curso.sharedCourseId || String(curso.id);
            // Verify match based on sharedCourseId
            const isMatch = r.sharedCourseId === sharedId || r.cursoId === curso.id;
            if (isMatch) {
                rMap.set(`${sharedId}-${normAsignatura}-${r.periodo}-${bcStr}`, r.puntaje);
            }
        });
        return rMap;
    }, [est, curso, state.recuperaciones]);

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
        if (!curso) return null;
        const normSubject = normalizeArea(subject);
        const periods = ['P1', 'P2', 'P3', 'P4'];
        const competencies: BCKey[] = ['BC1', 'BC2', 'BC3', 'BC4'];
        const sharedId = curso.sharedCourseId || String(curso.id);

        let sumFinals = 0;
        let countFinals = 0;

        const cells = competencies.map(bc => {
            return periods.map(p => {
                const mapKey = `${sharedId}-${normSubject}-${p}-${bc}`;
                const avgVal = gradesMap.get(mapKey);
                const recVal = recuperacionesMap.get(mapKey);

                const finalVal = (recVal !== undefined && (avgVal === undefined || avgVal < 70)) ? recVal : avgVal;
                const isRecovered = recVal !== undefined && (avgVal === undefined || avgVal < 70);

                if (finalVal !== undefined) {
                    sumFinals += finalVal;
                    countFinals++;
                }

                return (
                    <td key={`${p}-${bc}`} className="px-3 py-4 text-center border border-[rgba(46,51,48,0.08)]">
                        {finalVal !== undefined ? (
                            <span className={`text-[13px] font-black ${isRecovered ? 'text-[#B87449] bg-[#FDFBF7] px-1.5 py-0.5 rounded border border-[#B87449]/20' : 'text-[#2E3330]'}`}>
                                {finalVal}
                            </span>
                        ) : (
                            <span className="text-[12px] font-bold text-[#5F665E]/40">-</span>
                        )}
                    </td>
                );
            });
        });

        // Add the extra columns so the table renders correctly without breaking markup
        const promedioGrupo = countFinals > 0 ? Math.round(sumFinals / countFinals) : null;
        const completiva = null; // placeholders for missing logic
        const extraordinaria = null; // placeholders
        const especial = null; // placeholders
        const sitA = promedioGrupo !== null && promedioGrupo >= 70 ? '✓' : '';
        const sitR = promedioGrupo !== null && promedioGrupo < 70 ? '✗' : '';

        return (
            <>
                {cells}
                <td className="px-2 font-black text-[13px] text-[#2E3330] bg-[#FDFBF7] border-x-2 border-[rgba(46,51,48,0.08)]">
                    {promedioGrupo !== null ? promedioGrupo : <span className="text-[#5F665E]/40">-</span>}
                </td>
                <td className="px-2 border-r border-[rgba(46,51,48,0.08)]"><span className="text-[#5F665E]/40">-</span></td>
                <td className="px-2 border-r border-[rgba(46,51,48,0.08)]"><span className="text-[#5F665E]/40">-</span></td>
                <td className="px-2 border-r border-[rgba(46,51,48,0.08)]"><span className="text-[#5F665E]/40">-</span></td>
                <td className="px-2 text-[#7A8D69] font-black text-[14px] bg-[#FDFBF7] border-x border-[rgba(46,51,48,0.08)]">{sitA}</td>
                <td className="px-2 text-[#B87449] font-black text-[14px] bg-[#FDFBF7] border-r border-[rgba(46,51,48,0.08)]">{sitR}</td>
            </>
        );
    }, [curso, gradesMap, recuperacionesMap]);

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
                    />
                )}

                {activeTab === 'Evaluación' && (
                    <div className="space-y-6 animate-in fade-in duration-500">
                        <div className="flex justify-between items-center border-b pb-5 border-[rgba(46,51,48,0.08)]">
                            <div>
                                <h2 className="text-xl font-black text-[#2E3330] tracking-tight">REGISTRO ANUAL</h2>
                                <p className="text-[10px] font-bold text-[#5F665E] uppercase tracking-widest">{est.nombre} {est.apellido} • {curso?.grado} {curso?.seccion}</p>
                            </div>
                            <button onClick={() => window.print()} className="flex items-center gap-2 px-[18px] py-[8px] min-h-[36px] leading-none bg-[#7A8D69] text-white rounded-full font-semibold text-xs hover:bg-[#6C7E5C] transition-all uppercase tracking-[0.08em] shadow-sm">
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
                <div className="flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest text-[#5F665E]/70">
                    <School size={14} />
                    <span>Registro Oficial Validado</span>
                </div>
            </footer>
        </div>
    );
}
