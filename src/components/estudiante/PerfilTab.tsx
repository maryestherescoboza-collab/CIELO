import React from 'react';
import { getAsignaturaNombre } from '../../constants/asignaturas';
import type { Skill, AppState, Competencia, DescriptorRubrica, CriterioCotejo } from '../../types';
import { getCompetenciaDisplay } from '../../types';

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
    state
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
        
        const savedDescriptors = califs.flatMap(c => c.descriptores || []).filter(Boolean);
        if (savedDescriptors.length > 0) {
            return savedDescriptors;
        }
        
        if (evalDetalle) {
            const plantilla = state.plantillas.find(p => p.id === evalDetalle.plantillaId);
            
            // 1. Rubric Evaluation
            if (evalDetalle.rubricaData && Object.keys(evalDetalle.rubricaData).length > 0) {
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
            
            // 2. Checklist (Cotejo) Evaluation
            if (evalDetalle.cotejoData && Object.keys(evalDetalle.cotejoData).length > 0) {
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

        // 3. Direct numeric grade fallback
        const grade = califs.length > 0 ? califs[0].puntaje : (evalDetalle?.puntajeTotal ?? null);
        if (grade !== null && grade !== undefined) {
            if (grade === 100) {
                return ["Superó lo esperado y evidenció un dominio estratégico de la competencia, realizando la actividad con autonomía, iniciativa y precisión. Mantuvo una buena comunicación, contribuyó al trabajo en equipo y entregó la actividad a tiempo."];
            } else if (grade >= 85 && grade <= 99) {
                return ["Cumplió con lo esperado y evidenció un dominio adecuado de la competencia, realizando correctamente la actividad. Aunque hizo un buen trabajo, le faltó un poco más de iniciativa, profundidad o precisión para alcanzar el nivel estratégico."];
            } else if (grade >= 70 && grade <= 84) {
                return ["Cumplió parcialmente con lo esperado y evidenció un dominio básico de la competencia, realizando la actividad con algunas dificultades y requiriendo orientación en distintos momentos."];
            } else if (grade < 70) {
                return ["Aún no alcanzó lo esperado en el desarrollo de la competencia, presentando dificultades para realizar la actividad incluso con apoyo y sin lograr completarla de forma satisfactoria."];
            }
        }
        
        return [];
    };

    return (
        <div className="w-full space-y-10 animate-in fade-in duration-300 pb-6">
            <div className="flex items-center justify-between border-b pb-4 border-[rgba(46,51,48,0.08)]">
                <div className="flex items-center gap-6">
                    <div
                        className="w-14 h-14 rounded-full flex items-center justify-center text-white text-[24px] font-black shadow-inner border-2 border-white"
                        style={{ backgroundColor: est.avatarColor }}
                    >
                        {est.nombre ? est.nombre[0] : '?'}
                    </div>
                    <div className="relative">
                        {parseFloat(promedioPeriodo) < 70 && (
                            <div className="absolute -top-6 -right-20">
                                <div className="border-[3px] border-double border-[#B87449] px-2 py-1 rounded text-[#B87449] font-black text-[10px] uppercase rotate-[-10deg] opacity-60">Riesgo Académico</div>
                            </div>
                        )}
                        <h1 className="text-[26px] font-black text-[#2E3330] tracking-tight">{est.nombre} {est.apellido}</h1>
                        <div className="flex gap-4 text-[14px] font-bold text-[#5F665E] uppercase tracking-widest">
                            <span>{getAsignaturaNombre(curso?.asignatura)}</span>
                            <span>•</span>
                            <span>Periodo {periodo}</span>
                            <span>•</span>
                            <span>ID: {est.id}</span>
                        </div>
                    </div>
                </div>
                <div className="text-right no-print">
                    <p className="text-[13px] font-black text-[#5F665E]/40 uppercase tracking-[0.2em]">Expediente Digital</p>
                    <button onClick={() => window.print()} className="text-[14px] font-bold text-[#7A8D69] hover:underline mt-1 uppercase">Imprimir Registro</button>
                </div>
            </div>

            <div className="grid grid-cols-12 gap-4 items-center bg-[#F8F3ED] p-4 rounded-[16px] border border-[rgba(46,51,48,0.04)] min-h-22.5">
                <div className="col-span-3 border-r border-[rgba(46,51,48,0.08)] pr-4 flex items-center gap-6">
                    <div>
                        <p className="text-[12px] font-black text-[#5F665E] uppercase mb-1">Promedio</p>
                        <p className="text-2xl font-black text-[#7A8D69]">{promedioPeriodo}%</p>
                    </div>
                    <div>
                        <p className="text-[12px] font-black text-[#5F665E] uppercase mb-1">Ranking</p>
                        <p className="text-[24px] font-black text-[#2E3330]">{rankingPeriodo}</p>
                    </div>
                </div>
                <div className="col-span-9 flex flex-wrap items-center gap-2">
                    <p className="text-[12px] font-black text-[#5F665E] uppercase mr-4">Atributos:</p>
                    {studentHabilidades.length > 0 ? studentHabilidades.slice(0, 8).map((hab, i) => (
                        <span key={i} className="text-[13px] font-bold text-[#2E3330] px-2 py-1 bg-white border border-[rgba(46,51,48,0.08)] rounded-md shadow-sm">
                            {hab.text}
                        </span>
                    )) : <span className="text-[13px] italic text-[#5F665E]/60">Sin atributos registrados</span>}
                </div>
            </div>

            <section className="space-y-6 bg-transparent p-0 mt-6">
                <h3 className="text-[13px] font-black uppercase tracking-[0.3em] text-[#5F665E] text-center">Itinerario Académico</h3>
                <div className="overflow-x-auto rounded-[16px] border border-[rgba(46,51,48,0.08)] bg-white shadow-sm">
                    <table className="w-full border-collapse text-left text-sm text-[#2E3330]">
                        <thead className="bg-[#F8F3ED] text-[11px] font-black uppercase tracking-wider text-[#2E3330] border-b border-[rgba(46,51,48,0.08)]">
                            <tr>
                                <th scope="col" className="px-6 py-4">Actividad</th>
                                <th scope="col" className="px-6 py-4">Competencia Evaluada</th>
                                <th scope="col" className="px-6 py-4 text-center">Calificación</th>
                                <th scope="col" className="px-6 py-4 w-1/2">Indicador de Logro</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[rgba(46,51,48,0.04)]">
                            {actividadesPeriodo.length > 0 ? (
                                actividadesPeriodo.map((act) => {
                                    const calif = state.calificaciones.find(
                                        c => c.estudianteId === est.id && c.actividadId === act.id
                                    );
                                    const isEvaluated = calif && calif.puntaje !== null && calif.puntaje !== undefined;
                                    const score = isEvaluated ? calif.puntaje : null;
                                    const descriptors = getDescriptorTexts(est.id, act.id);

                                    return (
                                        <tr key={act.id} className="hover:bg-[#F8F3ED] transition-colors duration-150 border-b border-[rgba(46,51,48,0.04)]">
                                            <td className="px-6 py-4">
                                                <div className="font-bold text-[#2E3330] text-[14px]">{act.nombre}</div>
                                                <div className="text-[11px] font-black text-[#5F665E] uppercase mt-0.5">{act.fecha}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-wrap gap-1.5">
                                                    {(act.bcAsignados || ['BC1']).map((bc: string) => (
                                                        <span 
                                                            key={bc} 
                                                            className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-black tracking-wider bg-[#FDFBF7] text-[#7A8D69] border border-[rgba(46,51,48,0.08)]"
                                                            title={bc}
                                                        >
                                                            {getCompetenciaDisplay(bc)}
                                                        </span>
                                                    ))}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                {isEvaluated ? (
                                                    <span className={`inline-flex items-center justify-center font-black text-[14px] px-2.5 py-1 rounded-lg ${
                                                        score! >= 90 
                                                            ? 'bg-[#FDFBF7] text-[#7A8D69] border border-[#7A8D69]/20' 
                                                            : score! >= 70 
                                                            ? 'bg-[#FDFBF7] text-[#EB8847] border border-[#EB8847]/20' 
                                                            : 'bg-[#FDFBF7] text-[#B87449] border border-[#B87449]/20'
                                                    }`}>
                                                        {score}%
                                                    </span>
                                                ) : (
                                                    <span className="text-[#5F665E]/40 font-bold text-[13px]">-</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-[#5F665E] whitespace-normal wrap-break-word leading-relaxed text-[13px] font-medium">
                                                {isEvaluated && descriptors.length > 0 ? (
                                                    <div className="space-y-1">
                                                        {descriptors.map((desc, idx) => {
                                                            const isHeader = desc === 'Cumple:' || desc === 'No cumple:';
                                                            return isHeader ? (
                                                                <div key={idx} className="font-bold text-[#2E3330] pt-1.5 first:pt-0">{desc}</div>
                                                            ) : (
                                                                <div key={idx} className="pl-3">{desc}</div>
                                                            );
                                                        })}
                                                    </div>
                                                ) : isEvaluated ? (
                                                    <span className="text-[#5F665E]/60 italic">Sin descriptores registrados</span>
                                                ) : (
                                                    <span className="text-[#EB8847] font-semibold italic bg-[#FDFBF7] px-2 py-0.5 rounded border border-[#EB8847]/20 text-[12px]">
                                                        Pendiente de evaluación
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })
                            ) : (
                                <tr>
                                    <td colSpan={4} className="px-6 py-12 text-center text-[#5F665E] text-[13px] font-bold uppercase tracking-wider bg-[#F8F3ED]">
                                        Sin actividades registradas en este periodo
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </section>

            <div className="grid grid-cols-12 gap-8 pt-6 border-t border-[rgba(46,51,48,0.08)]">
                <div className="col-span-6 space-y-4 min-h-65">
                    <h3 className="text-[13px] font-black uppercase tracking-widest text-[#5F665E]">Bitácora de Convivencia</h3>
                    <div className="space-y-2.5 pr-1 max-h-55 overflow-y-auto no-scrollbar">
                        {incidenciasEstudiante.length > 0 ? incidenciasEstudiante.map((inc, i) => (
                            <div key={i} className="bg-[#F8F3ED] p-3.5 rounded-[12px] border border-[rgba(46,51,48,0.04)] flex gap-4 items-start">
                                <div className="text-center min-w-15">
                                    <p className="text-[9px] font-black text-[#5F665E] uppercase">{inc.fecha}</p>
                                    <span className="text-[12px] font-black text-[#EB8847] uppercase">{inc.categoria}</span>
                                </div>
                                <div className="flex-1 border-l border-[rgba(46,51,48,0.08)] pl-4">
                                    <p className="text-[13px] text-[#2E3330] leading-tight font-medium italic">"{inc.descripcion}"</p>
                                </div>
                            </div>
                        )) : (
                            <p className="text-[14px] text-[#5F665E]/60 italic py-4">No existen registros de convivencia para este periodo.</p>
                        )}
                    </div>
                </div>
            </div>

            <div className="pt-4 border-t border-[rgba(46,51,48,0.04)] flex justify-between items-center opacity-40 select-none">
                <p className="text-[12px] font-black uppercase text-[#5F665E] tracking-[0.3em]">Registro Oficial Noether Academia v3.2</p>
                <div className="w-20 h-0.5 bg-[rgba(46,51,48,0.08)]"></div>
                <p className="text-[12px] font-black uppercase text-[#5F665E] tracking-[0.3em]">Validación: {new Date().toLocaleDateString()}</p>
            </div>
        </div>
    );
};

export default React.memo(PerfilTab);
