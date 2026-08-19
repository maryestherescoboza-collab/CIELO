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
        <div className={`group flex flex-col h-full bg-white border border-(--border-soft) rounded-(--radius-md) shadow-sm overflow-hidden hover:shadow-md hover:-translate-y-1 transition-all duration-300 ${isSelected ? 'ring-2 ring-(--primary)' : 'hover:border-(--primary)/30'}`}>
            <div className="p-6 flex-1">
                <div className="flex items-start justify-between mb-5">
                    <div className="flex items-center gap-4">
                        <div className="w-11 h-11 rounded-2xl flex items-center justify-center shadow-sm relative overflow-hidden" style={{ backgroundColor: curso.color }}>
                            <div className="absolute inset-0 bg-white/10" />
                            <GraduationCap size={22} className="text-white relative z-10" />
                        </div>
                        <div className="flex flex-col">
                            <div className="flex gap-1.5 mb-1">
                                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold tracking-[0.08em] bg-(--linen)/80 text-(--ink) border border-(--border-soft)">{curso.grado}</span>
                                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold tracking-[0.08em] bg-(--linen)/80 text-(--ink) border border-(--border-soft)">Sección {curso.seccion}</span>
                            </div>
                            <span className="text-xs font-bold text-(--ink-soft) uppercase tracking-widest">Nivel {curso.grado[0]}° Secundaria</span>
                        </div>
                    </div>
                    <button
                        className="opacity-0 group-hover:opacity-100 p-2 rounded-xl text-slate-300 hover:text-(--danger) hover:bg-(--tag-rose-bg) transition-all duration-200 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--danger)/50"
                        onClick={(e) => { e.stopPropagation(); onHide(curso.id); }}
                        title="Ocultar curso"
                    >
                        <EyeOff size={15} />
                    </button>
                </div>

                <h3 className="text-lg font-black text-(--ink) tracking-tight leading-snug group-hover:text-(--primary) transition-colors mb-3 font-notion-title">{curso.nombre}</h3>

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
                            className="px-3 py-1.5 text-xs rounded-lg font-bold bg-white border border-(--primary) text-(--ink) outline-none focus:ring-2 focus:ring-(--primary)/50 transition-all"
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
                            className="px-3 py-1 rounded-full text-xs font-bold tracking-[0.08em] text-(--primary) bg-(--primary)/10 border border-(--primary)/20 hover:bg-(--primary) hover:text-white transition-all cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-(--primary)/50"
                            title="Modificar asignatura"
                        >
                            {getAsignaturaNombre(displayAsignatura)}
                        </button>
                    )}
                </div>

                <div className="space-y-3.5">
                    <div className="flex items-center gap-3 text-xs font-medium text-(--ink-soft)">
                        <div className="w-6 h-6 rounded-lg bg-(--linen)/20 border border-(--border-soft) flex items-center justify-center">
                            <Users size={12} className="text-(--ink-soft)" />
                        </div>
                        <span>{curso.count} Estudiantes Inscritos</span>
                    </div>

                    <div className="flex items-center gap-3 text-xs font-medium text-(--ink-soft) relative">
                        <div className="w-6 h-6 rounded-lg bg-(--linen)/20 border border-(--border-soft) flex items-center justify-center">
                            <Clock size={12} className="text-(--ink-soft)" />
                        </div>
                        <div className="flex-1">
                            <span className="mr-1">Días:</span>
                            {editingDiasId === curso.id ? (
                                <div className="absolute left-0 bottom-full mb-3 bg-white border border-(--border-soft) shadow-sm rounded-xl p-4 z-50 w-56 animate-in slide-in-from-bottom-2 duration-200">
                                    <div className="flex gap-1.5 flex-wrap mb-4">
                                        {['Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sáb'].map(d => (
                                            <button
                                                key={d}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onSaveDias(curso, d);
                                                }}
                                                className={`px-3 py-1.5 text-xs rounded-lg font-bold uppercase transition-all border outline-none focus-visible:ring-2 focus-visible:ring-(--primary)/50 ${displayDiasSemana.includes(d) ? 'bg-(--ink) border-(--ink) text-white shadow-sm' : 'bg-(--linen)/20 border-(--border-soft) text-(--ink-soft) hover:border-(--primary)/30'}`}
                                            >
                                                {d}
                                            </button>
                                        ))}
                                    </div>
                                    <button onClick={(e) => { e.stopPropagation(); onEditDias(null); }} className="w-full text-center text-xs font-bold uppercase tracking-widest py-2.5 bg-(--primary) text-white rounded-xl shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-(--primary)/50 focus-visible:ring-offset-2 hover:opacity-90 active:scale-95 transition-all">Listo</button>
                                </div>
                            ) : (
                                <button onClick={(e) => { e.stopPropagation(); onEditDias(curso.id); }} className="text-(--ink) border-b border-dotted border-(--border-soft) hover:border-(--primary) hover:text-(--primary) transition-all font-semibold outline-none focus-visible:ring-2 focus-visible:ring-(--primary)/50 rounded-sm">
                                    {displayDiasSemana.length ? displayDiasSemana.join(', ') : 'Click para asignar días'}
                                </button>
                            )}
                        </div>
                    </div>

                    {curso.docentesVinculadosRel && curso.docentesVinculadosRel.length > 0 ? (
                        <div className="flex items-center gap-3 mt-4 pt-4 border-t border-(--border-soft) justify-between">
                            <div className="flex items-center gap-3">
                                <span className="text-xs font-bold uppercase text-(--ink-soft) tracking-widest">Co-docentes:</span>
                                <div className="flex -space-x-2">
                                    {curso.docentesVinculadosRel.slice(0, 4).map((cd: any, idx: number) => {
                                        const profile = state.perfiles.find(p => p.userId === cd.userId);
                                        if (!profile) return null;
                                        return (
                                            <div
                                                key={idx}
                                                className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white border-2 border-white shadow-sm ring-1 ring-(--border-soft) hover:z-10 transition-all hover:scale-110 cursor-help"
                                                style={{ background: profile.avatarColor || '#64748b' }}
                                                title={`${profile.nombreDocente} - ${cd.asignatura}`}
                                            >
                                                {(profile.nombreDocente || 'D').substring(0, 2).toUpperCase()}
                                            </div>
                                        );
                                    })}
                                    {curso.docentesVinculadosRel.length > 4 && (
                                        <div className="w-8 h-8 rounded-full bg-(--linen)/30 border-2 border-white flex items-center justify-center text-xs font-bold text-(--ink-soft) ring-1 ring-(--border-soft) italic">
                                            +{curso.docentesVinculadosRel.length - 4}
                                        </div>
                                    )}
                                </div>
                            </div>
                            {isTutor && (
                                <button onClick={(e) => { e.stopPropagation(); onOpenLinkModal(curso.id); }} className="text-(--ink) hover:bg-(--linen) bg-(--linen)/50 px-3 py-1.5 rounded-full text-xs font-bold uppercase outline-none focus-visible:ring-2 focus-visible:ring-(--primary)/50 transition-colors border border-(--border-soft)">
                                    Modificar
                                </button>
                            )}
                        </div>
                    ) : (
                        isTutor && (
                            <div className="mt-4 pt-4 border-t border-(--border-soft)">
                                <button onClick={(e) => { e.stopPropagation(); onOpenLinkModal(curso.id); }} className="w-full flex items-center justify-center gap-2 py-2 border border-dashed border-(--border-soft) rounded-xl text-(--ink-soft) hover:text-(--primary) hover:border-(--primary)/30 hover:bg-(--primary)/5 transition-all outline-none focus-visible:ring-2 focus-visible:ring-(--primary)/50 focus-visible:ring-offset-2">
                                    <Plus size={14} /> <span className="text-xs font-bold uppercase tracking-widest">Añadir Co-docentes</span>
                                </button>
                            </div>
                        )
                    )}
                </div>
            </div>

            <div className="flex flex-col border-t border-(--border-soft) bg-(--linen)/10">
                <button
                    className="w-full flex items-center justify-between px-6 py-3.5 hover:bg-(--linen)/30 text-xs font-bold text-(--ink) uppercase tracking-widest transition-all duration-200 border-b border-(--border-soft)/50 outline-none focus-visible:bg-(--linen)/20"
                    onClick={(e) => { e.stopPropagation(); onSelect(curso.id, `/calificaciones-anuales/${curso.id}`); }}
                >
                    <span className="flex items-center gap-2"><Layers size={13} className="text-(--ink-soft)" /> Histórico Anual</span>
                    <ChevronRight size={13} className="text-slate-350" />
                </button>

                <button
                    className="w-full flex items-center justify-between px-6 py-3.5 hover:bg-(--linen)/30 text-xs font-bold text-(--ink) uppercase tracking-widest transition-all duration-200 border-b border-(--border-soft)/50 outline-none focus-visible:bg-(--linen)/20"
                    onClick={(e) => { e.stopPropagation(); window.open(`/print-boletines/${curso.id}`, '_blank'); }}
                >
                    <span className="flex items-center gap-2"><FileText size={13} className="text-(--ink-soft)" /> Descargar Boletines</span>
                    <ChevronRight size={13} className="text-slate-350" />
                </button>

                <button
                    data-guide="btn-abrir-registro-academico"
                    className="w-full flex items-center justify-between px-6 py-4.5 bg-white text-xs font-bold text-(--ink) uppercase tracking-[0.15em] transition-all duration-200 hover:bg-(--linen)/50 outline-none focus-visible:bg-(--linen)"
                    onClick={() => onSelect(curso.id, `/curso-detalle/${curso.id}`)}>
                    <span className="flex items-center gap-2">
                        <Search size={13} className="text-(--ink-soft)" />
                        Abrir Registro Académico
                    </span>
                    <ChevronRight size={15} />
                </button>
            </div>
        </div>
    );
}
