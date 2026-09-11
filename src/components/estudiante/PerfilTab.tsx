import React from 'react';
import { getAsignaturaNombre } from '../../constants/asignaturas';
import type { Skill, AppState, Competencia, DescriptorRubrica, CriterioCotejo } from '../../types';
import { getCompetenciaDisplay } from '../../types';
import RecuperacionPerfil from './RecuperacionPerfil';
import { supabase } from '../../lib/supabase';
import { QRCodeSVG } from 'qrcode.react';
import { PORTAL_FAMILIA_ENABLED } from '../../config/features';

interface PerfilTabProps {
    est: any;
    curso: any;
    periodo: string;
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
    const [qrVisible, setQrVisible] = React.useState(false);
    const [qrToken, setQrToken] = React.useState<string | null>(null);
    const [isGeneratingQr, setIsGeneratingQr] = React.useState(false);
    const qrTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

    React.useEffect(() => {
        return () => {
            if (qrTimerRef.current) clearTimeout(qrTimerRef.current);
        };
    }, []);

    const handleGenerateQR = async () => {
        if (!PORTAL_FAMILIA_ENABLED) return;
        
        if (qrTimerRef.current) {
            clearTimeout(qrTimerRef.current);
        }

        if (!qrToken) {
            setIsGeneratingQr(true);
            try {
                const { data: existingData, error: fetchError } = await supabase
                    .from('portal_accesos')
                    .select('access_token')
                    .eq('estudiante_id', est.id)
                    .single();

                if (existingData && existingData.access_token) {
                    setQrToken(existingData.access_token);
                } else if (fetchError && fetchError.code === 'PGRST116') {
                    const cursoReal = curso || state.cursos.find(c => c.id === est.curso_id || c.id === est.cursoId);
                    const centroId = cursoReal?.centro_id || state.centros?.[0]?.id;
                    const { data: newAccess } = await supabase
                        .from('portal_accesos')
                        .insert({
                            estudiante_id: est.id,
                            centro_id: centroId
                        })
                        .select('access_token')
                        .single();
                        
                    if (newAccess) setQrToken(newAccess.access_token);
                }
            } catch (err) {
                console.error("Error generating QR:", err);
            } finally {
                setIsGeneratingQr(false);
            }
        }

        setQrVisible(true);
        qrTimerRef.current = setTimeout(() => {
            setQrVisible(false);
        }, 5000);
    };

    // Helper to get descriptors dynamically based on evaluation type
    const getDescriptorTexts = (studentId: number, actividadId: number): string[] => {
        const evalDetalle = state.cursoDetalle.find(
            cd => cd.estudianteId === studentId && cd.actividadId === actividadId
        );
        
        const califs = state.calificaciones.filter(
            c => c.estudianteId === studentId && c.actividadId === actividadId
        );

        const grade = califs.length > 0 ? califs[0].puntaje : (evalDetalle?.puntajeTotal ?? null);
        const hasRubrica = !!(evalDetalle?.rubricaData && Object.keys(evalDetalle.rubricaData).length > 0);
        const hasCotejo = !!(evalDetalle?.cotejoData && Object.keys(evalDetalle.cotejoData).length > 0);

        if (!hasRubrica && !hasCotejo && grade !== null) {
            const exactGrades = [100, 85, 70, 55];
            if (exactGrades.includes(grade)) {
                let text = '';
                if (grade === 100) text = "Demuestra el indicador completo, correctamente y con autonomía.";
                else if (grade === 85) text = "Demuestra el indicador completo, pero presenta alguna dificultad, imprecisión o necesidad de orientación.";
                else if (grade === 70) text = "Demuestra una parte del indicador, pero aún no alcanza el desempeño completo.";
                else if (grade === 55) text = "Muestra evidencia limitada del indicador y todavía necesita apoyo para alcanzarlo.";

                const act = state.actividades.find(a => a.id === actividadId);
                if (act?.indicador) return [text, act.indicador];
                return [text];
            }
            return [];
        }
        
        const savedDescriptors = califs.flatMap(c => c.descriptores || []).filter(Boolean);
        if (savedDescriptors.length > 0) return savedDescriptors;
        
        if (evalDetalle) {
            const plantilla = state.plantillas.find(p => p.id === evalDetalle.plantillaId);
            
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
                        if (val === 100 || val === 3 || val === 2 || val === 67) cumpleList.push(`• ${desc}`);
                        else if (val === 0 || val === 1) noCumpleList.push(`• ${desc}`);
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
        if (!est || !curso) return { BC1: null, BC2: null, BC3: null, BC4: null };

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
        const size = 64;
        const strokeWidth = 5;
        const radius = (size - strokeWidth) / 2;
        const circumference = radius * 2 * Math.PI;
        
        const colorsMap: Record<string, { fill: string, track: string }> = {
            'BC1': { fill: '#537BAC', track: '#E4E3EC' },
            'BC2': { fill: '#689C63', track: '#E4E3EC' },
            'BC3': { fill: '#EB8847', track: '#E4E3EC' },
            'BC4': { fill: '#DB5B48', track: '#E4E3EC' }
        };
        const colors = colorsMap[bcId] || { fill: '#4E5566', track: '#E4E3EC' };

        if (score === null) {
            return (
                <div className="relative flex items-center justify-center shrink-0" style={{ width: size, height: size }}>
                    <svg width={size} height={size} className="transform -rotate-90">
                        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#E4E3EC" strokeWidth={strokeWidth} />
                    </svg>
                    <div className="absolute text-[11px] font-bold text-[#8A8FA0]">—</div>
                </div>
            );
        }

        const strokeDashoffset = circumference - (score / 100) * circumference;

        return (
            <div className="relative flex items-center justify-center shrink-0" style={{ width: size, height: size }}>
                <svg width={size} height={size} className="transform -rotate-90">
                    <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={colors.track} strokeWidth={strokeWidth} />
                    <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={colors.fill} strokeWidth={strokeWidth}
                        strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} strokeLinecap="round"
                    />
                </svg>
                <div className="absolute text-[11.5px] font-bold text-[#1B1F2A] font-['Space_Grotesk']">{score}%</div>
            </div>
        );
    };

    return (
        <>
            {/* PÁGINA 1 */}
            <div className="a4-page w-[210mm] min-h-[297mm] bg-white shadow-[0_1px_3px_rgba(30,30,25,.08),0_10px_28px_rgba(30,30,25,.10)] p-[20mm] flex flex-col shrink-0 font-sans relative">
                <div className="flex-1">
                    {/* Header Documento */}
                    <div className="mb-6 relative">
                        <div className="font-['Space_Grotesk'] text-[36px] font-bold text-[#1B1F2A] leading-[1.15] tracking-tight">
                            {est.nombre} <span className="bg-[#DB5B48] text-white px-2.5 py-0.5 rounded-[5px] inline-block">{est.apellido}</span>
                        </div>
                        {PORTAL_FAMILIA_ENABLED && (
                            <div className="mt-2 flex items-center gap-4">
                                <button onClick={handleGenerateQR} disabled={isGeneratingQr} className="px-3 py-1 bg-[#1B1F2A] text-white text-[10px] font-bold uppercase rounded hover:opacity-80 transition-opacity">
                                    {isGeneratingQr ? 'Generando...' : 'Generar QR Acceso Familiar'}
                                </button>
                                {qrVisible && qrToken && (
                                    <div className="bg-white p-1.5 shadow border border-slate-200 rounded animate-in fade-in duration-200 absolute top-0 right-0 z-10">
                                        <QRCodeSVG value={`${window.location.origin}/portal/${qrToken}`} size={80} />
                                    </div>
                                )}
                            </div>
                        )}
                        <div className="text-[12px] text-[#4E5566] mt-2.5">
                            {curso?.grado} {curso?.seccion} • {getAsignaturaNombre(currentAsignatura || curso?.asignatura)}
                        </div>
                        <div className="mt-4 text-[17px] font-bold tracking-wide text-[#1B1F2A] font-['Space_Grotesk']">
                            Informe curricular
                        </div>
                        <div className="text-[11px] text-[#8A8FA0] mt-0.5">
                            Período {periodo}
                        </div>

                        <hr className="border-t-2 border-[#1B1F2A] my-4" />

                        <div className="flex gap-12">
                            <div>
                                <div className="text-[10px] text-[#8A8FA0] tracking-wide">Promedio</div>
                                <span className="font-['Space_Grotesk'] text-[21px] font-bold mt-1 text-[#537BAC] inline-block">{promedioPeriodo}%</span>
                                <div className="w-5 h-0.75 rounded bg-[#537BAC] mt-1.5"></div>
                            </div>
                            <div>
                                <div className="text-[10px] text-[#8A8FA0] tracking-wide">Ranking</div>
                                <span className="font-['Space_Grotesk'] text-[21px] font-bold mt-1 text-[#DB5B48] inline-block">#{rankingPeriodo}</span>
                                <div className="w-5 h-0.75 rounded bg-[#DB5B48] mt-1.5"></div>
                            </div>
                            <div>
                                <div className="text-[10px] text-[#8A8FA0] tracking-wide">Competencias</div>
                                <span className="font-['Space_Grotesk'] text-[21px] font-bold mt-1 text-[#689C63] inline-block">
                                    {Object.values(computedBCs).filter(v => v !== null).length} evaluadas
                                </span>
                                <div className="w-5 h-0.75 rounded bg-[#689C63] mt-1.5"></div>
                            </div>
                        </div>
                    </div>

                    {/* Competencias Evaluadas */}
                    <div className="mt-7 break-inside-avoid">
                        <div className="flex items-baseline gap-2">
                            <span className="font-['Space_Grotesk'] font-bold text-[#DB5B48] text-[13px]">//</span>
                            <h2 className="font-['Space_Grotesk'] text-[12px] font-bold tracking-[0.14em] uppercase text-[#1B1F2A]">Competencias evaluadas</h2>
                        </div>
                        <hr className="border-t border-[#E4E3EC] mt-2 mb-4" />

                        <div className="flex flex-col md:flex-row md:items-center gap-y-4">
                            {[
                                { id: 'BC1', label: getCompetenciaDisplay('BC1'), score: computedBCs.BC1, bg: '#537BAC' },
                                { id: 'BC2', label: getCompetenciaDisplay('BC2'), score: computedBCs.BC2, bg: '#689C63' },
                                { id: 'BC3', label: getCompetenciaDisplay('BC3'), score: computedBCs.BC3, bg: '#EB8847' },
                                { id: 'BC4', label: getCompetenciaDisplay('BC4'), score: computedBCs.BC4, bg: '#DB5B48' }
                            ].map((comp, idx, arr) => (
                                <React.Fragment key={comp.id}>
                                    <div className="flex-1 flex items-center gap-3 px-0 md:px-4 first:pl-0 last:pr-0">
                                        {renderCircularProgress(comp.score, comp.id)}
                                        <div>
                                            <div className="inline-block text-[9px] font-bold tracking-wide text-white px-1.5 py-0.5 rounded" style={{ background: comp.bg }}>
                                                {comp.id}
                                            </div>
                                            <div className="text-[10.8px] text-[#4E5566] mt-1 leading-[1.3] font-medium">
                                                {comp.label}
                                            </div>
                                        </div>
                                    </div>
                                    {idx < arr.length - 1 && (
                                        <div className="hidden md:block w-px h-16 bg-[#EFEEF4]"></div>
                                    )}
                                </React.Fragment>
                            ))}
                        </div>
                    </div>

                    {/* Atributos */}
                    <div className="mt-7 break-inside-avoid">
                        <div className="flex items-baseline gap-2">
                            <span className="font-['Space_Grotesk'] font-bold text-[#DB5B48] text-[13px]">//</span>
                            <h2 className="font-['Space_Grotesk'] text-[12px] font-bold tracking-[0.14em] uppercase text-[#1B1F2A]">Atributos</h2>
                        </div>
                        <hr className="border-t border-[#E4E3EC] mt-2 mb-4" />
                        
                        {studentHabilidades.length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                                {studentHabilidades.map((hab, i) => (
                                    <span key={i} className="text-[11.5px] font-bold px-3 py-1 rounded-full border border-[#E4E3EC] bg-white text-[#1B1F2A]">
                                        {hab.text}
                                    </span>
                                ))}
                            </div>
                        ) : (
                            <div className="text-[11.5px] text-[#8A8FA0] italic">Sin atributos registrados para este período.</div>
                        )}
                    </div>

                    {/* Evidencias de aprendizaje */}
                    <div className="mt-7">
                        <div className="flex items-baseline gap-2 break-inside-avoid">
                            <span className="font-['Space_Grotesk'] font-bold text-[#DB5B48] text-[13px]">//</span>
                            <h2 className="font-['Space_Grotesk'] text-[12px] font-bold tracking-[0.14em] uppercase text-[#1B1F2A]">Evidencias de aprendizaje</h2>
                        </div>
                        <hr className="border-t border-[#E4E3EC] mt-2 mb-4 break-inside-avoid" />

                        <div className="relative">
                            {actividadesPeriodo.length > 0 ? (
                                actividadesPeriodo.map((act, index) => {
                                    const calif = state.calificaciones.find(c => c.estudianteId === est.id && c.actividadId === act.id);
                                    const isEvaluated = calif && calif.puntaje !== null && calif.puntaje !== undefined;
                                    const score = isEvaluated ? calif.puntaje : null;
                                    const descriptors = getDescriptorTexts(est.id, act.id);
                                    
                                    const rawDate = act.fecha || '';
                                    const [yyyy, mm, dd] = rawDate.split('-');
                                    const formattedDate = dd ? `${dd} ${['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'][parseInt(mm)-1]}\n${yyyy}` : rawDate;

                                    let bgColor = '#F8F9FA'; // default
                                    if (act.bcAsignados?.includes('BC1')) bgColor = '#F1F5FA'; // comunicativa bg
                                    else if (act.bcAsignados?.includes('BC2')) bgColor = '#F2F8F4'; // pensamiento bg
                                    else if (act.bcAsignados?.includes('BC3')) bgColor = '#FDF5F0'; // cientifica bg
                                    else if (act.bcAsignados?.includes('BC4')) bgColor = '#FCF3F2'; // etica bg

                                    return (
                                        <div key={act.id} className="grid grid-cols-[66px_16px_1fr] gap-0 mb-3 break-inside-avoid">
                                            <div className="text-[9.5px] tracking-wide text-[#8A8FA0] uppercase font-bold text-right pr-2.5 pt-3.5 whitespace-pre-line leading-tight">
                                                {formattedDate}
                                            </div>
                                            <div className="relative">
                                                <div className={`absolute left-1.75 top-0 w-px bg-[#E4E3EC] ${index === actividadesPeriodo.length - 1 ? 'bottom-1/2' : '-bottom-3.5'}`}></div>
                                                <div className="absolute left-0.5 top-4.5 w-2.75 h-0.5 bg-[#DB5B48]"></div>
                                            </div>
                                            <div className="p-3 rounded-[3px]" style={{ background: bgColor }}>
                                                <div className="flex justify-between items-baseline gap-3">
                                                    <div className="font-['Space_Grotesk'] text-[14.5px] font-bold text-[#1B1F2A]">{act.nombre}</div>
                                                    <div className="font-['Space_Grotesk'] text-[13.5px] font-bold text-[#DB5B48]">{isEvaluated ? `${score} %` : 'Pendiente'}</div>
                                                </div>
                                                <div className="flex flex-wrap gap-1.5 mt-2">
                                                    {(act.bcAsignados || []).map((bc: string) => {
                                                        const bcColors: Record<string, string> = {
                                                            'BC1': '#537BAC', 'BC2': '#689C63', 'BC3': '#EB8847', 'BC4': '#DB5B48'
                                                        };
                                                        return (
                                                            <span key={bc} className="text-[9.8px] font-bold px-2 py-0.5 rounded-full bg-white/70" style={{ color: bcColors[bc] || '#4E5566' }}>
                                                                {getCompetenciaDisplay(bc)}
                                                            </span>
                                                        );
                                                    })}
                                                </div>
                                                <div className="text-[11.5px] text-[#4E5566] mt-2 leading-[1.55]">
                                                    {isEvaluated && descriptors.length > 0 ? (
                                                        descriptors.map((desc, idx) => <div key={idx}>{desc}</div>)
                                                    ) : isEvaluated ? (
                                                        <span className="italic">Sin descriptores registrados.</span>
                                                    ) : (
                                                        <span className="text-[#8A8FA0] italic">Evaluación pendiente.</span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })
                            ) : (
                                <div className="text-[11.5px] text-[#8A8FA0] italic pl-2">Sin actividades registradas en este periodo.</div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="mt-8 pt-3 border-t border-[#EFEEF4] flex justify-between items-center text-[#8A8FA0] text-[9.5px]">
                    <span>Informe curricular · {est.nombre} {est.apellido} · {getAsignaturaNombre(currentAsignatura || curso?.asignatura)}</span>
                    <span>1 / 2</span>
                </div>
            </div>

            {/* PÁGINA 2 */}
            <div className="a4-page w-[210mm] min-h-[297mm] bg-white shadow-[0_1px_3px_rgba(30,30,25,.08),0_10px_28px_rgba(30,30,25,.10)] p-[20mm] flex flex-col shrink-0 font-sans relative">
                <div className="flex-1">
                    {/* Bitácora de convivencia */}
                    <div className="mt-0 break-inside-avoid">
                        <div className="flex items-baseline gap-2">
                            <span className="font-['Space_Grotesk'] font-bold text-[#DB5B48] text-[13px]">//</span>
                            <h2 className="font-['Space_Grotesk'] text-[12px] font-bold tracking-[0.14em] uppercase text-[#1B1F2A]">Bitácora de convivencia</h2>
                        </div>
                        <hr className="border-t border-[#E4E3EC] mt-2 mb-4" />

                        <div className="relative">
                            {incidenciasEstudiante.length > 0 ? (
                                incidenciasEstudiante.map((inc, index) => {
                                    const [yyyy, mm, dd] = inc.fecha.split('-');
                                    const formattedDate = dd ? `${dd} ${['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'][parseInt(mm)-1]}\n${yyyy}` : inc.fecha;
                                    return (
                                        <div key={index} className="grid grid-cols-[66px_16px_1fr] gap-0 mb-3 break-inside-avoid">
                                            <div className="text-[9.5px] tracking-wide text-[#8A8FA0] uppercase font-bold text-right pr-2.5 pt-3.5 whitespace-pre-line leading-tight">
                                                {formattedDate}
                                            </div>
                                            <div className="relative">
                                                <div className={`absolute left-1.75 top-0 w-px bg-[#E4E3EC] ${index === incidenciasEstudiante.length - 1 ? 'bottom-1/2' : '-bottom-3.5'}`}></div>
                                                <div className="absolute left-0.5 top-4.5 w-2.75 h-0.5 bg-[#DB5B48]"></div>
                                            </div>
                                            <div className="p-3 rounded-[3px] bg-[#FDF5F0]">
                                                <div className="font-['Space_Grotesk'] text-[14.5px] font-bold text-[#1B1F2A]">{inc.categoria}</div>
                                                <div className="text-[11px] text-[#8A8FA0] italic mt-1.5">"{inc.descripcion}"</div>
                                            </div>
                                        </div>
                                    );
                                })
                            ) : (
                                <div className="text-[11.5px] text-[#8A8FA0] italic pl-2">Sin registros de convivencia.</div>
                            )}
                        </div>
                    </div>

                    {/* Recuperación */}
                    <div className="mt-7 break-inside-avoid">
                        <RecuperacionPerfil
                            est={est}
                            curso={curso}
                            periodo={periodo}
                            state={state}
                            currentAsignatura={currentAsignatura}
                            isTutor={isTutor}
                        />
                    </div>
                </div>

                <div className="mt-8 pt-3 border-t border-[#EFEEF4] flex justify-between items-center text-[#8A8FA0] text-[9.5px]">
                    <span>Informe curricular · {est.nombre} {est.apellido} · {getAsignaturaNombre(currentAsignatura || curso?.asignatura)}</span>
                    <span>2 / 2</span>
                </div>
            </div>
        </>
    );
};

export default React.memo(PerfilTab);
