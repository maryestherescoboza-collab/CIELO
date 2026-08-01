import { Trash2, GraduationCap, Users, Clock, Plus, Layers, ChevronRight, Search, FileText } from 'lucide-react';
import type { Curso, AppState } from '../../types';
import { getAsignaturaNombre } from '../../constants/asignaturas';

interface Props {
    curso: any; // Extended with count and docentesVinculadosRel
    isSelected: boolean;
    state: AppState;
    editingDiasId: number | null;
    onDelete: (id: number) => void;
    onSelect: (id: number, path?: string) => void;
    onEditDias: (id: number | null) => void;
    onSaveDias: (c: Curso, d: string) => void;
    onOpenLinkModal: (id: number) => void;
}

export function CourseCard({
    curso,
    isSelected,
    state,
    editingDiasId,
    onDelete,
    onSelect,
    onEditDias,
    onSaveDias,
    onOpenLinkModal
}: Props) {
    return (
        <div className={`group flex flex-col h-full bg-white border rounded-[10px] shadow-xl shadow-slate-200/50 overflow-hidden hover:shadow-2xl hover:shadow-slate-200/50 hover:-translate-y-1 transition-all duration-300 ${isSelected ? 'border-turf-green-base ring-4 ring-turf-green-base/10' : 'border-slate-200 hover:border-slate-300'}`}>
            <div className="p-7 flex-1">
                <div className="flex items-start justify-between mb-6">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm relative overflow-hidden" style={{ backgroundColor: curso.color }}>
                            <div className="absolute inset-0 bg-white/10" />
                            <GraduationCap size={24} className="text-white relative z-10" />
                        </div>
                        <div className="flex flex-col">
                            <div className="flex gap-1.5 mb-1.5">
                                <span className="notion-label bg-slate-100 text-slate-600 border-slate-200">{curso.grado}</span>
                                <span className="notion-label bg-slate-100 text-slate-600 border-slate-200">Sección {curso.seccion}</span>
                            </div>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Nivel {curso.grado[0]}° Secundaria</span>
                        </div>
                    </div>
                    <button
                        className="opacity-0 group-hover:opacity-100 p-2 rounded-xl text-slate-300 hover:text-red-ochre-base hover:bg-red-ochre-base/5 transition-all duration-200 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-ochre-base/50"
                        onClick={(e) => { e.stopPropagation(); onDelete(curso.id); }}>
                        <Trash2 size={16} />
                    </button>
                </div>

                <h3 className="text-xl font-black text-[#1E293B] tracking-tight leading-snug group-hover:text-turf-green-base transition-colors mb-3 font-notion-title">{curso.nombre}</h3>

                <div className="inline-flex items-center gap-2 mb-6">
                    <span className="notion-label text-turf-green-base bg-turf-green-base/10 border-turf-green-base/20 font-bold px-3 py-1">
                        {getAsignaturaNombre(curso.asignatura)}
                    </span>
                </div>

                <div className="space-y-4">
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
                                                className={`px-3 py-1.5 text-[10px] rounded-lg font-bold uppercase transition-all border outline-none focus-visible:ring-2 focus-visible:ring-turf-green-base/50 ${curso.diasSemana.includes(d) ? 'bg-slate-900 border-slate-900 text-white shadow-sm' : 'bg-slate-50 border-slate-100 text-slate-400 hover:border-slate-300'}`}
                                            >
                                                {d}
                                            </button>
                                        ))}
                                    </div>
                                    <button onClick={(e) => { e.stopPropagation(); onEditDias(null); }} className="w-full text-center text-[10px] font-bold uppercase tracking-widest py-2.5 bg-turf-green-base text-white rounded-xl shadow-lg shadow-turf-green-base/20 outline-none focus-visible:ring-2 focus-visible:ring-turf-green-base/50 focus-visible:ring-offset-2 hover:bg-turf-green-base/90 active:scale-95 transition-all">Listo</button>
                                </div>
                            ) : (
                                <button onClick={(e) => { e.stopPropagation(); onEditDias(curso.id); }} className="text-slate-900 border-b border-dotted border-slate-300 hover:border-turf-green-base hover:text-turf-green-base transition-all font-semibold outline-none focus-visible:ring-2 focus-visible:ring-turf-green-base/50 rounded-sm">
                                    {curso.diasSemana.length ? curso.diasSemana.join(', ') : 'Click para asignar días'}
                                </button>
                            )}
                        </div>
                    </div>

                    {curso.docentesVinculadosRel && curso.docentesVinculadosRel.length > 0 ? (
                        <div className="flex items-center gap-3 mt-5 pt-5 border-t border-slate-100 justify-between">
                            <div className="flex items-center gap-3">
                                <span className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">Co-docentes:</span>
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
                            <button onClick={(e) => { e.stopPropagation(); onOpenLinkModal(curso.id); }} className="text-turf-green-base hover:text-emerald-700 bg-turf-green-base/10 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase outline-none focus-visible:ring-2 focus-visible:ring-turf-green-base/50 transition-colors">
                                Modificar
                            </button>
                        </div>
                    ) : (
                        <div className="mt-5 pt-5 border-t border-slate-100">
                            <button onClick={(e) => { e.stopPropagation(); onOpenLinkModal(curso.id); }} className="w-full flex items-center justify-center gap-2 py-2 border-2 border-dashed border-slate-200 rounded-xl text-slate-400 hover:text-turf-green-base hover:border-turf-green-base/30 hover:bg-turf-green-base/5 transition-all outline-none focus-visible:ring-2 focus-visible:ring-turf-green-base/50 focus-visible:ring-offset-2">
                                <Plus size={14} /> <span className="text-[10px] font-bold uppercase tracking-widest">Añadir Co-docentes</span>
                            </button>
                        </div>
                    )}
                </div>
            </div>

            <div className="flex flex-col border-t border-slate-100 bg-slate-50/50">
                <button
                    className="w-full flex items-center justify-between px-7 py-4 hover:bg-white text-[11px] font-bold text-slate-600 hover:text-slate-900 uppercase tracking-widest transition-all duration-200 border-b border-slate-200/50 outline-none focus-visible:bg-slate-100"
                    onClick={(e) => { e.stopPropagation(); onSelect(curso.id, `/calificaciones-anuales/${curso.id}`); }}
                >
                    <span className="flex items-center gap-2"><Layers size={14} className="text-slate-400" /> Histórico Anual</span>
                    <ChevronRight size={14} className="text-slate-300" />
                </button>

                <button
                    className="w-full flex items-center justify-between px-7 py-4 hover:bg-white text-[11px] font-bold text-slate-600 hover:text-slate-900 uppercase tracking-widest transition-all duration-200 border-b border-slate-200/50 outline-none focus-visible:bg-slate-100"
                    onClick={(e) => { e.stopPropagation(); window.open(`/print-boletines/${curso.id}`, '_blank'); }}
                >
                    <span className="flex items-center gap-2"><FileText size={14} className="text-slate-400" /> Descargar Boletines</span>
                    <ChevronRight size={14} className="text-slate-300" />
                </button>

                <button
                    className="w-full flex items-center justify-between px-7 py-5 bg-white text-[11px] font-bold text-slate-800 uppercase tracking-[0.2em] transition-all duration-300 hover:bg-slate-900 hover:text-white group/action outline-none focus-visible:bg-slate-900 focus-visible:text-white"
                    onClick={() => onSelect(curso.id, `/curso-detalle/${curso.id}`)}>
                    <span className="flex items-center gap-2.5">
                        <Search size={14} className="text-slate-400 group-hover/action:text-slate-500 transition-colors" />
                        Abrir Registro Académico
                    </span>
                    <ChevronRight size={16} />
                </button>
            </div>
        </div>
    );
}
