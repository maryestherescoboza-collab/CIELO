import { useNavigate } from 'react-router-dom';
import type { Estudiante, Incidencia, CalificacionActividad, Actividad, Curso } from '../../types';
import { TC_Anomaly, TC_Echo } from '../icons/TerraCognitaIcons';
import { CieloPill } from '../ui/CieloPill';
interface RiskStudentsProps {
    enRiesgo: Estudiante[];
    incidencias: Incidencia[];
    calificaciones: CalificacionActividad[];
    actividades: Actividad[];
    cursos: Curso[];
}

export function RiskStudents({ enRiesgo, incidencias, calificaciones, actividades, cursos }: RiskStudentsProps) {
    const navigate = useNavigate();

    return (
        <div className="card-saas bg-white p-0 overflow-hidden mb-8 shadow-sm border-slate-200">
            <div className="px-8 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/10">
                <div>
                    <h2 className="flex items-center gap-3 text-[14px] font-bold uppercase tracking-[0.2em] text-warning mb-1">
                        <TC_Anomaly size={18} className="text-warning animate-pulse" /> Estudiantes en Riesgo
                    </h2>
                    <p className="text-[13px] text-slate-500 font-medium tracking-wide">Detección automática por patrones de rendimiento e incidencias</p>
                </div>
                <div className="flex flex-col items-end">
                    <CieloPill variant="warning" uppercase className="bg-warning text-[#2E3330] border-transparent font-black">
                        {enRiesgo.length} Alertas
                    </CieloPill>
                </div>
            </div>

            {enRiesgo.length === 0 ? (
                <div className="py-24 flex flex-col items-center">
                    <div className="w-20 h-20 rounded-full bg-cielo-bg-main/5 border border-cielo-sidebar/10 flex items-center justify-center mb-6 group hover:border-primary/40 transition-all duration-700 shadow-inner">
                        <TC_Echo size={40} className="text-slate-600 group-hover:text-primary transition-all duration-700 group-hover:scale-110" />
                    </div>
                    <p className="text-xs font-black text-slate-500 uppercase tracking-[0.3em]">Frecuencia</p>
                    <p className="text-sm text-slate-500 mt-3 text-center max-w-[320px] leading-relaxed font-medium">¡Es un gran logro no tener estudiantes en riesgos!</p>
                </div>
            ) : (
                <div className="divide-y divide-white/5">
                    {enRiesgo.map(est => {
                        const studentIncidencias = incidencias.filter(i => i.estudianteId === est.id);
                        const studentCalificaciones = calificaciones.filter(c => c.estudianteId === est.id && c.puntaje !== null && c.puntaje < 70);
                        
                        return (
                            <div key={est.id} className="p-8 hover:bg-cielo-bg-main/2 transition-all duration-300 group cursor-default">
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                                    <div className="flex items-center gap-5">
                                        <div className="relative">
                                            <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-white text-xl font-bold shadow-xl transition-transform group-hover:scale-105 duration-500" style={{ background: est.avatarColor }}>
                                                {est.nombre[0]}
                                            </div>
                                            <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-white rounded-full flex items-center justify-center border border-slate-100 shadow-md">
                                                <div className="w-2 h-2 rounded-full bg-attention animate-ping"></div>
                                            </div>
                                        </div>
                                        <div>
                                            <p className="text-[17px] font-bold text-[#2E3330] tracking-tight group-hover:text-primary transition-colors">{est.nombre} {est.apellido}</p>
                                            <div className="flex items-center gap-3 mt-1.5">
                                                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest bg-slate-100 px-2 py-0.5 rounded-md">ID: #{est.id}</span>
                                                <div className="h-1 w-1 rounded-full bg-slate-300"></div>
                                                <span className="text-xs font-black text-slate-500 uppercase tracking-widest">
                                                    {cursos.find(c => c.id === est.cursoId)?.grado} {cursos.find(c => c.id === est.cursoId)?.seccion}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-4 self-center md:self-auto">
                                        {/* Promedio General display removed intentionally as requested */}
                                        <div className="flex gap-2">
                                            <CieloPill as="button" variant="neutral" onClick={() => navigate(`/estudiante/${est.id}`)}>Perfil</CieloPill>
                                            <CieloPill as="button" variant="neutral" onClick={() => navigate(`/curso-detalle/${est.cursoId}`)}>Curso</CieloPill>
                                        </div>
                                    </div>
                                </div>

                                {(studentIncidencias.length > 0 || studentCalificaciones.length > 0) && (
                                    <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:pl-19">
                                        {studentIncidencias.map(i => (
                                            <div key={`inc-${i.id}`} className={`p-4 rounded-xl border flex flex-col gap-2 transition-colors ${i.gravedad === 'grave' ? 'bg-danger/10 border-danger/20 text-[#2E3330]' : 'bg-warning/10 border-warning/20 text-[#2E3330]'}`}>
                                                <div className="flex items-center gap-2">
                                                    <span className={`w-2 h-2 rounded-full shrink-0 ${i.gravedad === 'grave' ? 'bg-danger' : 'bg-warning'}`}></span>
                                                    <span className="text-xs font-black tracking-[0.2em] uppercase flex-1 truncate">{i.categoria}</span>
                                                    <span className="text-xs font-black opacity-70 uppercase tracking-widest bg-black/5 px-1.5 py-0.5 rounded-md">{i.gravedad}</span>
                                                </div>
                                                <p className="text-[12px] font-medium line-clamp-2 leading-relaxed italic opacity-90">"{i.descripcion}"</p>
                                                <div className="text-xs font-bold opacity-60 uppercase self-end mt-auto">{i.fecha}</div>
                                            </div>
                                        ))}
                                        {studentCalificaciones.map((c, idx) => {
                                            const act = actividades.find(a => a.id === c.actividadId);
                                            return (
                                                <div key={`calif-${idx}`} className="p-3 rounded-lg border border-danger/25 bg-danger/10 text-[#2E3330] flex flex-col gap-1.5 transition-colors">
                                                    <div className="flex items-center gap-2">
                                                        <span className="w-2 h-2 rounded-full bg-danger shrink-0"></span>
                                                        <span className="text-xs font-black tracking-[0.2em] uppercase flex-1 truncate">Brecha de Logro</span>
                                                        <span className="text-xs font-black text-[#2E3330] bg-danger/45 px-1.5 py-0.5 rounded-md">{c.puntaje}/100</span>
                                                    </div>
                                                    <p className="text-xs font-medium line-clamp-2 leading-snug italic opacity-90">"{act?.nombre || 'Evaluación de Competencia'}"</p>
                                                    <div className="text-xs font-bold opacity-60 uppercase self-end mt-auto">{act?.fecha}</div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
