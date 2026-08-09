import { EyeOff, GraduationCap, Users, Clock, Plus, Layers, ChevronRight, Search, FileText } from 'lucide-react';
import type { Curso, AppState } from '../../types';
import { getAsignaturaNombre, ASIGNATURAS_CATALOGO } from '../../constants/asignaturas';

interface Props {
    curso: any; // Extended with count and docentesVinculadosRel
    isSelected: boolean;
    state: AppState;
    editingDiasId: number | null;
    editingAsignaturaId: number | null;
    currentUserId?: string;
    onHide: (id: number) => void;
    onSelect: (id: number, path?: string) => void;
    onEditDias: (id: number | null) => void;
    onEditAsignatura: (id: number | null) => void;
    onSaveDias: (c: Curso, d: string) => void;
    onSaveAsignatura: (c: Curso, newAsignatura: string) => void;
    onOpenLinkModal: (id: number) => void;
}

export function CourseCard({
    curso,
    isSelected,
    state,
    editingDiasId,
    editingAsignaturaId,
    currentUserId,
    onHide,
    onSelect,
    onEditDias,
    onEditAsignatura,
    onSaveDias,
    onSaveAsignatura,
    onOpenLinkModal
}: Props) {
    const isTutor = currentUserId === curso.userId;
    const myLink = state.cursoDocentes?.find(cd => cd.cursoId === curso.id && cd.userId === currentUserId);
    const displayAsignatura = myLink ? myLink.asignatura : curso.asignatura;
    const displayDiasSemana = myLink ? myLink.diasSemana : (curso.diasSemana || []);

    return (
        <div className={`group flex flex-col h-full bg-[#FDFBF7] border border-[rgba(46,51,48,0.08)] rounded-[20px] shadow-sm overflow-hidden hover:shadow-md hover:-translate-y-1 transition-all duration-300 ${isSelected ? 'ring-2 ring-[#ADC762]' : 'hover:border-slate-350'}`}>
            <div className="p-6 flex-1">
                <div className="flex items-start justify-between mb-5">
                    <div className="flex items-center gap-4">
                        <div className="w-11 h-11 rounded-2xl flex items-center justify-center shadow-sm relative overflow-hidden" style={{ backgroundColor: curso.color }}>
                            <div className="absolute inset-0 bg-white/10" />
                            <GraduationCap size={22} className="text-white relative z-10" />
                        </div>
                        <div className="flex flex-col">
                            <div className="flex gap-1.5 mb-1">
                                <span className="px-2.5 py-0.5 rounded-full text-[9px] font-semibold tracking-[0.08em] bg-[#EAE4DA] text-[#2E3330] border border-[rgba(46,51,48,0.08)]">{curso.grado}</span>
                                <span className="px-2.5 py-0.5 rounded-full text-[9px] font-semibold tracking-[0.08em] bg-[#EAE4DA] text-[#2E3330] border border-[rgba(46,51,48,0.08)]">Sección {curso.seccion}</span>
                            </div>
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Nivel {curso.grado[0]}° Secundaria</span>
                        </div>
                    </div>
                    <button
                        className="opacity-0 group-hover:opacity-100 p-2 rounded-xl text-slate-300 hover:text-[#EB8847] hover:bg-[#EB8847]/5 transition-all duration-200 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#EB8847]/50"
                        onClick={(e) => { e.stopPropagation(); onHide(curso.id); }}
                        title="Ocultar curso"
                    >
                        <EyeOff size={15} />
                    </button>
                </div>

                <h3 className="text-lg font-black text-[#2E3330] tracking-tight leading-snug group-hover:text-[#ADC762] transition-colors mb-3 font-notion-title">{curso.nombre}</h3>

                <div className="inline-flex items-center gap-2 mb-5">
                    {editingAsignaturaId === curso.id ? (
                        <select
                            value={displayAsignatura || ''}
                            onChange={(e) => {
                                e.stopPropagation();
                                onSaveAsignatura(curso, e.target.value);
                                onEditAsignatura(null);
                            }}
                            onBlur={() => onEditAsignatura(null)}
                            onClick={(e) => e.stopPropagation()}
                            className="px-3 py-1.5 text-[9px] rounded-lg font-bold bg-white border border-[#ADC762] text-[#2E3330] outline-none focus:ring-2 focus:ring-[#ADC762]/50 transition-all"
                            autoFocus
                        >
                            {ASIGNATURAS_CATALOGO.map(asig => (
                                <option key={asig.id} value={asig.id}>
                                    {asig.nombre}
                                </option>
                            ))}
                        </select>
                    ) : (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onEditAsignatura(curso.id);
                            }}
                            className="px-3 py-1 rounded-full text-[9px] font-bold tracking-[0.08em] text-[#2E3330] bg-[#BFC9A6] border border-[rgba(46,51,48,0.08)] hover:bg-[#ADC762] hover:text-white transition-all cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[#ADC762]/50"
                            title="Modificar asignatura"
                        >
                            {getAsignaturaNombre(displayAsignatura)}
                        </button>
                    )}
                </div>

                <div className="space-y-3.5">
                    <div className="flex items-center gap-3 text-xs font-medium text-slate-500">
                        <div className="w-6 h-6 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center">
                            <Users size={12} className="text-slate-400" />
                        </div>
                        <span>{curso.count} Estudiantes Inscritos</span>
                    </div>

                    <div className="flex items-center gap-3 text-xs font-medium text-slate-500 relative">
                        <div className="w-6 h-6 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center">
                            <Clock size={12} className="text-slate-400" />
                        </div>
                        <div className="flex-1">
                            <span className="mr-1">Días:</span>
                            {editingDiasId === curso.id ? (
                                <div className="absolute left-0 bottom-full mb-3 bg-white border border-slate-200 shadow-2xl rounded-2xl p-4 z-50 w-56 animate-in slide-in-from-bottom-2 duration-200">
                                    <div className="flex gap-1.5 flex-wrap mb-4">
                                        {['Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sáb'].map(d => (
                                            <button
                                                key={d}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onSaveDias(curso, d);
                                                }}
                                                className={`px-3 py-1.5 text-[10px] rounded-lg font-bold uppercase transition-all border outline-none focus-visible:ring-2 focus-visible:ring-[#ADC762]/50 ${displayDiasSemana.includes(d) ? 'bg-[#2E3330] border-[#2E3330] text-white shadow-sm' : 'bg-slate-50 border-slate-100 text-slate-400 hover:border-slate-350'}`}
                                            >
                                                {d}
                                            </button>
                                        ))}
                                    </div>
                                    <button onClick={(e) => { e.stopPropagation(); onEditDias(null); }} className="w-full text-center text-[10px] font-bold uppercase tracking-widest py-2.5 bg-[#ADC762] text-white rounded-xl shadow-lg shadow-[#ADC762]/20 outline-none focus-visible:ring-2 focus-visible:ring-[#ADC762]/50 focus-visible:ring-offset-2 hover:bg-[#6C7E5C] active:scale-95 transition-all">Listo</button>
                                </div>
                            ) : (
                                <button onClick={(e) => { e.stopPropagation(); onEditDias(curso.id); }} className="text-[#2E3330] border-b border-dotted border-slate-350 hover:border-[#ADC762] hover:text-[#ADC762] transition-all font-semibold outline-none focus-visible:ring-2 focus-visible:ring-[#ADC762]/50 rounded-sm">
                                    {displayDiasSemana.length ? displayDiasSemana.join(', ') : 'Click para asignar días'}
                                </button>
                            )}
                        </div>
                    </div>

                    {curso.docentesVinculadosRel && curso.docentesVinculadosRel.length > 0 ? (
                        <div className="flex items-center gap-3 mt-4 pt-4 border-t border-slate-100 justify-between">
                            <div className="flex items-center gap-3">
                                <span className="text-[9px] font-bold uppercase text-slate-400 tracking-widest">Co-docentes:</span>
                                <div className="flex -space-x-2">
                                    {curso.docentesVinculadosRel.slice(0, 4).map((cd: any, idx: number) => {
                                        const profile = state.perfiles.find(p => p.userId === cd.userId);
                                        if (!profile) return null;
                                        return (
                                            <div
                                                key={idx}
                                                className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold text-white border-2 border-white shadow-sm ring-1 ring-slate-100 hover:z-10 transition-all hover:scale-110 cursor-help"
                                                style={{ background: profile.avatarColor || '#64748b' }}
                                                title={`${profile.nombreDocente} - ${cd.asignatura}`}
                                            >
                                                {(profile.nombreDocente || 'D').substring(0, 2).toUpperCase()}
                                            </div>
                                        );
                                    })}
                                    {curso.docentesVinculadosRel.length > 4 && (
                                        <div className="w-8 h-8 rounded-full bg-slate-50 border-2 border-white flex items-center justify-center text-[9px] font-bold text-slate-400 ring-1 ring-slate-100 italic">
                                            +{curso.docentesVinculadosRel.length - 4}
                                        </div>
                                    )}
                                </div>
                            </div>
                            {isTutor && (
                                <button onClick={(e) => { e.stopPropagation(); onOpenLinkModal(curso.id); }} className="text-[#2E3330] hover:bg-[#D4CCBE] bg-[#EAE4DA] px-3 py-1.5 rounded-full text-[9px] font-bold uppercase outline-none focus-visible:ring-2 focus-visible:ring-[#ADC762]/50 transition-colors border border-[rgba(46,51,48,0.08)]">
                                    Modificar
                                </button>
                            )}
                        </div>
                    ) : (
                        isTutor && (
                            <div className="mt-4 pt-4 border-t border-slate-100">
                                <button onClick={(e) => { e.stopPropagation(); onOpenLinkModal(curso.id); }} className="w-full flex items-center justify-center gap-2 py-2 border border-dashed border-slate-250 rounded-xl text-slate-400 hover:text-[#ADC762] hover:border-[#ADC762]/30 hover:bg-[#ADC762]/5 transition-all outline-none focus-visible:ring-2 focus-visible:ring-[#ADC762]/50 focus-visible:ring-offset-2">
                                    <Plus size={14} /> <span className="text-[9px] font-bold uppercase tracking-widest">Añadir Co-docentes</span>
                                </button>
                            </div>
                        )
                    )}
                </div>
            </div>

            <div className="flex flex-col border-t border-slate-100 bg-[#F8F3ED]/30">
                <button
                    className="w-full flex items-center justify-between px-6 py-3.5 hover:bg-[#F8F3ED]/60 text-[10px] font-bold text-[#2E3330] uppercase tracking-widest transition-all duration-200 border-b border-slate-200/50 outline-none focus-visible:bg-slate-100"
                    onClick={(e) => { e.stopPropagation(); onSelect(curso.id, `/calificaciones-anuales/${curso.id}`); }}
                >
                    <span className="flex items-center gap-2"><Layers size={13} className="text-slate-400" /> Histórico Anual</span>
                    <ChevronRight size={13} className="text-slate-350" />
                </button>

                <button
                    className="w-full flex items-center justify-between px-6 py-3.5 hover:bg-[#F8F3ED]/60 text-[10px] font-bold text-[#2E3330] uppercase tracking-widest transition-all duration-200 border-b border-slate-200/50 outline-none focus-visible:bg-slate-100"
                    onClick={(e) => { e.stopPropagation(); window.open(`/print-boletines/${curso.id}`, '_blank'); }}
                >
                    <span className="flex items-center gap-2"><FileText size={13} className="text-slate-400" /> Descargar Boletines</span>
                    <ChevronRight size={13} className="text-slate-350" />
                </button>

                <button
                    data-guide="btn-abrir-registro-academico"
                    className="w-full flex items-center justify-between px-6 py-4.5 bg-[#FDFBF7] text-[10px] font-bold text-[#2E3330] uppercase tracking-[0.15em] transition-all duration-200 hover:bg-[#EAE4DA] outline-none focus-visible:bg-[#EAE4DA]"
                    onClick={() => onSelect(curso.id, `/curso-detalle/${curso.id}`)}>
                    <span className="flex items-center gap-2">
                        <Search size={13} className="text-slate-400" />
                        Abrir Registro Académico
                    </span>
                    <ChevronRight size={15} />
                </button>
            </div>
        </div>
    );
}
