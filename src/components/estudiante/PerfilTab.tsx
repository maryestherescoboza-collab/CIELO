import React from 'react';
import { getAsignaturaNombre } from '../../constants/asignaturas';
import type { Skill, AppState, Competencia, DescriptorRubrica, CriterioCotejo } from '../../types';
import { getCompetenciaDisplay } from '../../types';
import RecuperacionPerfil from './RecuperacionPerfil';

interface PerfilTabProps {
    est: any;
    curso: any;
    periodo: string;
    setPeriodo: (p: string) => void;
    promedioPeriodo: string;
    rankingPeriodo: string;
    studentHabilidades: Skill[];
    actividadesPeriodo: any[];
    incidenciasEstudiante: any[];
    state: AppState;
    currentAsignatura?: string;
    isTutor?: boolean;
    currentUserId?: string;
}

const PerfilTab: React.FC<PerfilTabProps> = ({
    est,
    curso,
    periodo,
    setPeriodo,
    promedioPeriodo,
    rankingPeriodo,
    studentHabilidades,
    actividadesPeriodo,
    incidenciasEstudiante,
    state,
    currentAsignatura,
    isTutor = false,
    currentUserId
}) => {
    // Helper to get descriptors dynamically based on evaluation type
    const getDescriptorTexts = (studentId: number, actividadId: number): string[] => {
        const evalDetalle = state.cursoDetalle.find(
            cd => cd.estudianteId === studentId && cd.actividadId === actividadId
        );
        
        // Try getting directly from calificaciones
        const califs = state.calificaciones.filter(
            c => c.estudianteId === studentId && c.actividadId === actividadId
        );

        const grade = califs.length > 0 ? califs[0].puntaje : (evalDetalle?.puntajeTotal ?? null);

        const hasRubrica = !!(evalDetalle?.rubricaData && Object.keys(evalDetalle.rubricaData).length > 0);
        const hasCotejo = !!(evalDetalle?.cotejoData && Object.keys(evalDetalle.cotejoData).length > 0);

        // 1. Manual Evaluation from CursoDetalle (not Rubric, not Cotejo)
        if (!hasRubrica && !hasCotejo && grade !== null) {
            const exactGrades = [100, 85, 70, 55];
            if (exactGrades.includes(grade)) {
                let text = '';
                if (grade === 100) {
                    text = "Demuestra el indicador completo, correctamente y con autonomía.";
                } else if (grade === 85) {
                    text = "Demuestra el indicador completo, pero presenta alguna dificultad, imprecisión o necesidad de orientación.";
                } else if (grade === 70) {
                    text = "Demuestra una parte del indicador, pero aún no alcanza el desempeño completo.";
                } else if (grade === 55) {
                    text = "Muestra evidencia limitada del indicador y todavía necesita apoyo para alcanzarlo.";
                }

                const act = state.actividades.find(a => a.id === actividadId);
                if (act?.indicador) {
                    return [text, act.indicador];
                }
                return [text];
            }
            return [];
        }
        
        // 2. Saved Descriptors fallback (only for Rubric / Cotejo which populate saved descriptors)
        const savedDescriptors = califs.flatMap(c => c.descriptores || []).filter(Boolean);
        if (savedDescriptors.length > 0) {
            return savedDescriptors;
        }
        
        if (evalDetalle) {
            const plantilla = state.plantillas.find(p => p.id === evalDetalle.plantillaId);
            
            // 3. Rubric Evaluation
            if (hasRubrica) {
                const descriptors: string[] = [];
                Object.entries(evalDetalle.rubricaData).forEach(([descriptorId, nivel]) => {
                    if (!nivel) return;
                    
                    const activeDesc = state.descriptoresRubrica.find(d => String(d.id) === String(descriptorId));
                    let comp: Competencia = 'BC1';
                    if (activeDesc?.bc) {
                        comp = activeDesc.bc;
                    } else if (String(descriptorId).includes('BC')) {
                        comp = String(descriptorId).split('-').pop() as Competencia;
                    }

                    // Resolve the descriptor object (from plantilla or global)
                    const descriptorObj = (plantilla?.datos as any)?.descriptores?.find(
                        (d: any) => String(d.id) === String(descriptorId) || d.bc === comp
                    ) || activeDesc;

                    if (descriptorObj) {
                        const levelKeys: Record<number, keyof DescriptorRubrica> = {
                            1: 'receptivo',
                            2: 'resolutivo',
                            3: 'autonomo',
                            4: 'estrategico'
                        };
                        const key = levelKeys[nivel as number];
                        if (key && descriptorObj[key]) {
                            descriptors.push(descriptorObj[key] as string);
                        }
                    }
                });
                if (descriptors.length > 0) return descriptors;
            }
            
            // 4. Checklist (Cotejo) Evaluation
            if (hasCotejo) {
                const templateCriterios = plantilla?.tipo === 'cotejo' 
                    ? (plantilla.datos.criterios as CriterioCotejo[]) 
                    : state.criteriosCotejo;

                const cumpleList: string[] = [];
                const noCumpleList: string[] = [];

                Object.entries(evalDetalle.cotejoData).forEach(([critIdStr, val]) => {
                    const critId = parseInt(critIdStr);
                    const criterio = templateCriterios.find(c => c.id === critId);
                    if (criterio) {
                        const desc = criterio.descripcion || criterio.titulo;
                        if (val === 100 || val === 3 || val === 2 || val === 67) {
                            cumpleList.push(`• ${desc}`);
                        } else if (val === 0 || val === 1) {
                            noCumpleList.push(`• ${desc}`);
                        }
                    }
                });

                const formattedDescriptors: string[] = [];
                if (cumpleList.length > 0) {
                    formattedDescriptors.push('Cumple:');
                    formattedDescriptors.push(...cumpleList);
                }
                if (noCumpleList.length > 0) {
                    formattedDescriptors.push('No cumple:');
                    formattedDescriptors.push(...noCumpleList);
                }

                if (formattedDescriptors.length > 0) return formattedDescriptors;
            }
        }
        
        return [];
    };

    const computedBCs = React.useMemo(() => {
        if (!est || !curso) {
            return { BC1: null, BC2: null, BC3: null, BC4: null };
        }

        const courseActs = state.actividades.filter(a => {
            const actCurso = state.cursos.find(c => c.id === a.cursoId);
            const isMatch = (actCurso?.sharedCourseId === est.sharedCourseId || a.cursoId === curso.id) && a.periodo === periodo;
            const actAsignatura = a.asignatura || actCurso?.asignatura || '';
            const matchesRole = isTutor || !currentAsignatura || actAsignatura === currentAsignatura;
            const matchesUser = isTutor || !currentUserId || a.userId === currentUserId || !a.userId;
            return isMatch && matchesRole && matchesUser;
        });

        const bcs: ('BC1' | 'BC2' | 'BC3' | 'BC4')[] = ['BC1', 'BC2', 'BC3', 'BC4'];
        const results: Record<'BC1' | 'BC2' | 'BC3' | 'BC4', number | null> = {
            BC1: null, BC2: null, BC3: null, BC4: null
        };

        bcs.forEach(bc => {
            const actsForBc = courseActs.filter(a => a.bcAsignados?.includes(bc));
            const scores: number[] = [];
            
            actsForBc.forEach(a => {
                const calif = state.calificaciones.find(
                    c => c.estudianteId === est.id && c.actividadId === a.id
                );
                if (calif && calif.puntaje !== null && calif.puntaje !== undefined) {
                    scores.push(calif.puntaje);
                }
            });

            if (scores.length > 0) {
                results[bc] = Math.round(scores.reduce((sum, val) => sum + val, 0) / scores.length);
            }
        });

        return results;
    }, [est, curso, periodo, state.actividades, state.calificaciones, isTutor, currentAsignatura, currentUserId]);

    const renderCircularProgress = (score: number | null, bcId: string) => {
        const size = 76;
        const strokeWidth = 6;
        const radius = (size - strokeWidth) / 2;
        const circumference = radius * 2 * Math.PI;
        
        const colorsMap: Record<string, { fill: string, track: string, text: string }> = {
            'BC1': { fill: '#2D5A85', track: '#EAF2FA', text: '#2D5A85' },
            'BC2': { fill: '#2C6E49', track: '#EAF5ED', text: '#2C6E49' },
            'BC3': { fill: '#93541A', track: '#FDF3E7', text: '#93541A' },
            'BC4': { fill: '#5D4291', track: '#F4EFFF', text: '#5D4291' }
        };
        const colors = colorsMap[bcId] || { fill: '#475569', track: '#f1f5f9', text: '#475569' };

        if (score === null) {
            return (
                <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
                    <svg width={size} height={size} className="transform -rotate-90">
                        <circle
                            cx={size / 2}
                            cy={size / 2}
                            r={radius}
                            fill="transparent"
                            stroke="#cbd5e1"
                            strokeWidth={strokeWidth}
                            strokeDasharray="4 4"
                        />
                    </svg>
                    <div className="absolute text-sm font-extrabold text-slate-400">
                        —
                    </div>
                </div>
            );
        }

        const strokeDashoffset = circumference - (score / 100) * circumference;

        return (
            <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
                <svg width={size} height={size} className="transform -rotate-90">
                    <circle
                        cx={size / 2}
                        cy={size / 2}
                        r={radius}
                        fill="transparent"
                        stroke={colors.track}
                        strokeWidth={strokeWidth}
                    />
                    <circle
                        cx={size / 2}
                        cy={size / 2}
                        r={radius}
                        fill="transparent"
                        stroke={colors.fill}
                        strokeWidth={strokeWidth}
                        strokeDasharray={circumference}
                        strokeDashoffset={strokeDashoffset}
                        strokeLinecap="round"
                        className="transition-all duration-500 ease-out"
                    />
                </svg>
                <div 
                    className="absolute text-[13px] font-black text-center"
                    style={{ color: colors.fill }}
                >
                    {score}%
                </div>
            </div>
        );
    };

    return (
        <div className="w-full relative custom-perfil-page animate-in fade-in duration-300 pb-12">
            <style dangerouslySetInnerHTML={{ __html: `
              .custom-perfil-page {
                --navy: #1c4e8a;
                --navy-dark: #123761;
                --grey-bar: #cbd5e1;
                --grey-bar-fill: #1c4e8a;
                --text: #2b2f36;
                --muted: #5b6270;
              }
              .custom-perfil-page .deco {
                stroke: var(--navy);
                fill: none;
                opacity: 0.15;
              }
              .custom-perfil-page .avatar-circle {
                background: linear-gradient(135deg, #dce6f2, #b9cbe4);
              }
            ` }} />
            
            {/* SVG Deco Top Right */}
            <svg className="absolute -top-7.5 -right-7.5 deco pointer-events-none" width="180" height="130" viewBox="0 0 180 130">
                <path d="M10,120 C40,60 70,110 90,70 C110,30 140,80 170,20" strokeWidth="2.5" />
            </svg>
            {/* SVG Deco Bottom Left */}
            <svg className="absolute -bottom-10 -left-10 deco pointer-events-none" width="200" height="150" viewBox="0 0 200 150">
                <path d="M10,20 C50,10 20,60 60,60 C100,60 60,110 100,100 C130,92 150,120 190,130" strokeWidth="2.5" />
            </svg>
            <div className="absolute top-2.5 right-55 text-[20px] text-(--navy) opacity-25 pointer-events-none">✦</div>
            <div className="absolute bottom-15 left-42.5 text-[20px] text-(--navy) opacity-25 pointer-events-none">✦</div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 w-full relative z-10">
                {/* COLUMN 1: PROFILE */}
                <div className="lg:col-span-3 space-y-6">
                    <div>
                        <h2 className="text-[17px] font-extrabold tracking-widest text-(--navy) uppercase border-b-2 border-(--navy) pb-1.5 mb-4 inline-block">
                            Perfil
                        </h2>
                        
                        <div className="relative inline-block">
                            <div className="avatar-circle w-40 h-40 rounded-full border-3 border-(--navy) flex items-center justify-center text-[60px] font-black text-(--navy) shadow-sm">
                                {est.nombre ? est.nombre[0].toUpperCase() : '?'}
                            </div>
                            {parseFloat(promedioPeriodo) < 70 && (
                                <div className="absolute top-1 -right-4 border-[3px] border-double border-(--navy) px-2 py-0.5 rounded text-(--navy) font-black text-[10px] uppercase rotate-15">
                                    Riesgo
                                </div>
                            )}
                        </div>

                        <div className="mt-4">
                            <h3 className="text-xl font-extrabold tracking-wide text-(--navy-dark) uppercase leading-tight">
                                {est.nombre} {est.apellido}
                            </h3>
                            <p className="text-[13px] font-bold text-(--muted) mt-1">
                                Estudiante • {getAsignaturaNombre(currentAsignatura || curso?.asignatura)}
                            </p>
                        </div>
                    </div>

                    <div className="space-y-3 pt-4 border-t border-slate-200">
                        <div className="flex items-center gap-3 text-[13.5px]">
                            <span className="text-base">📘</span>
                            <span className="font-medium">{curso?.nombre || getAsignaturaNombre(currentAsignatura || curso?.asignatura)}</span>
                        </div>
                        <div className="flex items-center gap-3 text-[13.5px]">
                            <span className="text-base">🗓️</span>
                            <span className="font-medium">Período {periodo}</span>
                        </div>
                    </div>

                    <div className="bg-white border border-slate-200 p-4 shadow-sm inline-flex flex-col items-center min-w-44 text-center">
                        <div className="font-extrabold text-[12px] text-(--navy-dark) tracking-wider">PROMEDIO</div>
                        <div className="text-3xl font-black text-(--navy) mt-1">{promedioPeriodo}%</div>
                        <div className="text-[10px] font-bold text-(--muted) tracking-widest mt-1.5 uppercase">RANKING {rankingPeriodo}</div>
                    </div>
                    
                    <div className="pt-4 no-print">
                        <button 
                            onClick={() => window.print()} 
                            className="text-[13px] font-bold text-(--navy) hover:underline uppercase tracking-wider flex items-center gap-1.5"
                        >
                            🖨️ Imprimir Registro
                        </button>
                    </div>
                </div>

                {/* COLUMN 2: SUMMARY & COMPETENCIES & ATTRIBUTES */}
                <div className="lg:col-span-4 space-y-8">
                    {/* Block: Resumen académico */}
                    <div className="space-y-4">
                        <h2 className="text-[17px] font-extrabold tracking-widest text-(--navy) uppercase border-b-2 border-(--navy) pb-1.5 inline-block">
                            Resumen académico
                        </h2>
                        
                        <div className="space-y-4 pt-2">
                            <div className="flex items-baseline gap-4">
                                <span className="w-16 font-extrabold text-(--navy) text-[15px]">{promedioPeriodo}%</span>
                                <div>
                                    <div className="font-bold text-[14px]">Promedio general</div>
                                    <div className="text-xs text-(--muted)">Periodo {periodo}</div>
                                </div>
                            </div>
                            <div className="flex items-baseline gap-4">
                                <span className="w-16 font-extrabold text-(--navy) text-[15px]">{rankingPeriodo}</span>
                                <div>
                                    <div className="font-bold text-[14px]">Ranking del curso</div>
                                    <div className="text-xs text-(--muted)">Sobre el total de estudiantes</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Block: Competencias */}
                    <div className="space-y-4">
                        <h2 className="text-[17px] font-extrabold tracking-widest text-(--navy) uppercase border-b-2 border-(--navy) pb-1.5 inline-block">
                            Competencias evaluadas
                        </h2>

                        <div className="grid grid-cols-2 gap-y-6 gap-x-4 pt-4 justify-items-center">
                            {[
                                { id: 'BC1', label: `BC1 — ${getCompetenciaDisplay('BC1')}`, score: computedBCs.BC1 },
                                { id: 'BC2', label: `BC2 — ${getCompetenciaDisplay('BC2')}`, score: computedBCs.BC2 },
                                { id: 'BC3', label: `BC3 — ${getCompetenciaDisplay('BC3')}`, score: computedBCs.BC3 },
                                { id: 'BC4', label: `BC4 — ${getCompetenciaDisplay('BC4')}`, score: computedBCs.BC4 }
                            ].map((comp) => (
                                <div key={comp.id} className="flex flex-col items-center text-center space-y-3.5 max-w-32.5">
                                    {renderCircularProgress(comp.score, comp.id)}
                                    <span className="text-[10px] font-extrabold text-(--text) leading-tight uppercase tracking-wider">
                                        {comp.label}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Block: Atributos */}
                    <div className="space-y-4">
                        <h2 className="text-[17px] font-extrabold tracking-widest text-(--navy) uppercase border-b-2 border-(--navy) pb-1.5 inline-block">
                            Atributos
                        </h2>

                        <div className="flex flex-wrap gap-2 pt-2">
                            {studentHabilidades.length > 0 ? (
                                studentHabilidades.slice(0, 10).map((hab, i) => (
                                    <span 
                                        key={i} 
                                        className="text-[12px] font-semibold text-(--navy) border border-(--navy) rounded-full px-3 py-1 bg-white shadow-sm"
                                    >
                                        {hab.text}
                                    </span>
                                ))
                            ) : (
                                <span className="text-[12px] font-semibold text-(--navy) border border-(--navy) rounded-full px-3 py-1 bg-white shadow-sm">
                                    Sin atributos registrados
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {/* COLUMN 3: EVIDENCIAS & BITACORA */}
                <div className="lg:col-span-5 space-y-8">
                    {/* Block: Evidencias */}
                    <div className="space-y-4">
                        <h2 className="text-[17px] font-extrabold tracking-widest text-(--navy) uppercase border-b-2 border-(--navy) pb-1.5 inline-block">
                            Evidencias de aprendizaje
                        </h2>

                        <div className="space-y-6 pt-2 max-h-140 overflow-y-auto pr-1 no-scrollbar">
                            {actividadesPeriodo.length > 0 ? (
                                actividadesPeriodo.map((act) => {
                                    const calif = state.calificaciones.find(
                                        c => c.estudianteId === est.id && c.actividadId === act.id
                                    );
                                    const isEvaluated = calif && calif.puntaje !== null && calif.puntaje !== undefined;
                                    const score = isEvaluated ? calif.puntaje : null;
                                    const descriptors = getDescriptorTexts(est.id, act.id);
                                    
                                    // Parse date format
                                    const rawDate = act.fecha || '';
                                    const formattedDate = rawDate.replace(/-/g, '/');

                                    return (
                                        <div key={act.id} className="flex gap-4 items-start border-b border-slate-100 pb-4 last:border-0 last:pb-0">
                                            <div className="w-16 font-extrabold text-(--navy) text-[12px] leading-tight shrink-0 pt-0.5">
                                                {formattedDate}
                                            </div>
                                            <div className="flex-1 space-y-1.5">
                                                <div className="font-bold text-[14.5px] text-(--text) leading-snug">
                                                    {act.nombre}{' '}
                                                    <span className="text-(--navy) font-extrabold">
                                                        — {isEvaluated ? `${score}%` : 'Pendiente'}
                                                    </span>
                                                </div>
                                                <div className="text-[12px] text-(--muted) font-medium leading-relaxed italic">
                                                    {(act.bcAsignados || ['BC1']).map((bc: string) => getCompetenciaDisplay(bc)).join(' | ')}
                                                </div>
                                                <div className="text-[12px] text-(--text) leading-relaxed space-y-1">
                                                    {isEvaluated && descriptors.length > 0 ? (
                                                        descriptors.map((desc, idx) => (
                                                            <div key={idx}>{desc}</div>
                                                        ))
                                                    ) : isEvaluated ? (
                                                        <span className="text-(--muted) italic">Sin descriptores registrados</span>
                                                    ) : (
                                                        <span className="text-amber-600 font-semibold italic">Pendiente de evaluación</span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })
                            ) : (
                                <p className="text-[12.5px] text-(--muted) italic">
                                    Sin actividades registradas en este periodo
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Block: Bitácora de Convivencia */}
                    <div className="space-y-4">
                        <h2 className="text-[17px] font-extrabold tracking-widest text-(--navy) uppercase border-b-2 border-(--navy) pb-1.5 inline-block">
                            Bitácora de Convivencia
                        </h2>

                        <div className="space-y-3 pt-2 max-h-60 overflow-y-auto pr-1 no-scrollbar">
                            {incidenciasEstudiante.length > 0 ? (
                                incidenciasEstudiante.map((inc, i) => (
                                    <div key={i} className="flex gap-4 items-start pb-3 border-b border-slate-50 last:border-0 last:pb-0">
                                        <div className="w-16 font-extrabold text-(--navy) text-[12px] leading-tight shrink-0">
                                            {inc.fecha}
                                        </div>
                                        <div className="flex-1">
                                            <div className="text-xs font-black text-amber-600 uppercase tracking-widest mb-0.5">
                                                {inc.categoria}
                                            </div>
                                            <p className="text-[13px] text-(--text) italic leading-snug">
                                                "{inc.descripcion}"
                                            </p>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <p className="text-[13px] text-(--muted) italic">
                                    No existen registros de convivencia para este periodo.
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Block: Recuperación — informe textual por competencia (solo lectura, por período) */}
            <div className="mt-10 w-full relative z-10">
                <RecuperacionPerfil
                    est={est}
                    curso={curso}
                    periodo={periodo}
                    setPeriodo={setPeriodo}
                    state={state}
                    currentAsignatura={currentAsignatura}
                    isTutor={isTutor}
                />
            </div>
        </div>
    );
};

export default React.memo(PerfilTab);
