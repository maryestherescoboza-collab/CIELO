import { useMemo, useState } from 'react';
import {
    ClipboardList, Calendar, Users, Plus, X
} from 'lucide-react';
import { useAppStore } from '../../store/appStore';
import { useTareaActions } from '../../hooks/useTareaActions';
import type { TareaInstitucional } from '../../types';

interface Props {
    centroId: string;
}

export default function CentroTareas({ centroId }: Props) {
    const state = useAppStore(s => s.state);
    const { addTarea } = useTareaActions();

    const docentesCentro = useMemo(
        () => (state.perfiles || []).filter(p => p.centro_id === centroId),
        [state.perfiles, centroId]
    );

    const tareasCentro = useMemo(
        () => (state.tareas || [])
            .filter(t => t.centroId === centroId)
            .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || '')),
        [state.tareas, centroId]
    );

    const [showForm, setShowForm] = useState(false);
    const [titulo, setTitulo] = useState('');
    const [descripcion, setDescripcion] = useState('');
    const [fechaLimite, setFechaLimite] = useState('');
    const [asignacionTodos, setAsignacionTodos] = useState(true);
    const [seleccionados, setSeleccionados] = useState<Set<string>>(new Set());
    const [creando, setCreando] = useState(false);


    const toggleDocente = (uid: string) => {
        setSeleccionados(prev => {
            const next = new Set(prev);
            if (next.has(uid)) next.delete(uid);
            else next.add(uid);
            return next;
        });
    };

    const resetForm = () => {
        setTitulo('');
        setDescripcion('');
        setFechaLimite('');
        setSeleccionados(new Set());
        setAsignacionTodos(true);
        setShowForm(false);
    };

    const handleCrearTarea = async () => {
        if (!titulo.trim() || !centroId) return;
        const docenteIds = asignacionTodos
            ? docentesCentro.map(d => d.userId)
            : Array.from(seleccionados);
        if (docenteIds.length === 0) {
            alert('No hay docentes asignables en este centro');
            return;
        }
        setCreando(true);
        const { data, error } = await addTarea({
            centroId,
            titulo: titulo.trim(),
            descripcion: descripcion.trim(),
            fechaLimite,
            docenteIds,
        });
        setCreando(false);
        
        if (error) {
            console.error('[crear_tarea_institucional]', {
                message: error.message,
                details: error.details,
                hint: error.hint,
                code: error.code
            });
            alert(`No se pudo crear la tarea.\nError: ${error.message}`);
        } else if (data) {
            resetForm();
        }
    };

    const getTareaEstado = (tarea: TareaInstitucional) => {
        const hoy = new Date();
        // TareaInstitucional no tiene "estado", se deduce de las asignaciones y fecha límite.
        const asignaciones = tarea.asignaciones || [];
        if (asignaciones.length > 0 && asignaciones.every(a => a.estado === 'completada')) {
            return { label: 'COMPLETADA', color: 'text-primary', bg: 'bg-primary/20', raw: 'completada' };
        }
        
        // Verificar si está vencida
        if (tarea.fechaLimite) {
            const limite = new Date(`${tarea.fechaLimite}T23:59:59`);
            if (hoy > limite) {
                return { label: 'VENCIDA', color: 'text-[#D93025]', bg: 'bg-[#D93025]/10', raw: 'vencida' };
            }
        }

        return { label: 'PENDIENTE', color: 'text-[#A3792E]', bg: 'bg-warning/25', raw: 'pendiente' };
    };

    const nombreDocente = (uid: string) =>
        state.perfiles.find(p => p.userId === uid)?.nombreDocente || 'Docente';



    return (
        <section className="bg-transparent space-y-6">


            {/* ── Lista de Tareas ─────────────────────────────── */}
            <div className="bg-white border border-[#EAE4DA] rounded-2xl p-5 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#EAE4DA] pb-4 mb-4">
                    <h2 className="text-[13px] font-black tracking-widest text-[#3F3C36] uppercase">Tareas</h2>
                    <button
                        onClick={() => setShowForm(true)}
                        className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-primary text-white rounded-xl text-[11px] font-black uppercase tracking-widest hover:bg-[#6C7E5C] transition-colors"
                    >
                        <Plus size={14} /> Agregar tarea
                    </button>
                </div>

                <div className="space-y-4">
                    {tareasCentro.length === 0 ? (
                        <div className="text-center py-12">
                            <ClipboardList size={32} className="mx-auto text-[#EAE4DA] mb-3" />
                            <p className="text-[11px] font-black tracking-widest text-[#7A8D69] uppercase">No hay tareas pendientes</p>
                        </div>
                    ) : (
                        tareasCentro.map(tarea => {
                            const estado = getTareaEstado(tarea);
                            const asignaciones = tarea.asignaciones || [];
                            return (
                                <article key={tarea.id} className="relative border-b border-slate-100 last:border-0 py-4 group">
                                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                        <div className="flex-1 min-w-0">
                                            <h3 className="text-[13px] font-bold text-slate-800 truncate">
                                                {tarea.titulo}
                                            </h3>
                                            {tarea.descripcion && (
                                                <p className="mt-0.5 text-[11px] text-slate-500 truncate">
                                                    {tarea.descripcion}
                                                </p>
                                            )}
                                        </div>
                                        <div className="flex items-center justify-between md:justify-end gap-6 shrink-0 w-full md:w-auto">
                                            <div className="flex items-center gap-4">
                                                {asignaciones.filter(a => a.estado === 'completada').length > 0 && (
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Completadas</span>
                                                        <div className="flex -space-x-1.5">
                                                            {asignaciones.filter(a => a.estado === 'completada').map(a => {
                                                                const n = nombreDocente(a.docenteId);
                                                                return (
                                                                    <div key={a.id} title={`${n} - Completada`} className="w-6 h-6 rounded-full bg-slate-800 border-2 border-white flex items-center justify-center text-[9px] text-white font-bold shadow-sm z-10">
                                                                        {n.charAt(0).toUpperCase()}
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                )}
                                                {asignaciones.filter(a => a.estado !== 'completada').length > 0 && (
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Pendientes</span>
                                                        <div className="flex -space-x-1.5">
                                                            {asignaciones.filter(a => a.estado !== 'completada').map(a => {
                                                                const n = nombreDocente(a.docenteId);
                                                                return (
                                                                    <div key={a.id} title={`${n} - Pendiente`} className="w-6 h-6 rounded-full bg-white border-2 border-slate-200 flex items-center justify-center text-[9px] text-slate-500 font-bold z-0">
                                                                        {n.charAt(0).toUpperCase()}
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                            {tarea.fechaLimite && (
                                                <div className="text-right">
                                                    <p className={`text-[11px] font-bold whitespace-nowrap ${estado.raw === 'vencida' ? 'text-red-500' : 'text-slate-500'}`}>
                                                        {new Date(`${tarea.fechaLimite}T00:00:00`).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }).replace('.', '')}
                                                        {estado.raw === 'vencida' && ' · Vencida'}
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </article>
                            );
                        })
                    )}
                </div>
            </div>

            {/* ── Modal Nueva Tarea ─────────────────────────────── */}
            {showForm && (
                <div className="fixed inset-0 z-100 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white border border-[#EAE4DA] rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="px-6 py-4 border-b border-[#EAE4DA] flex items-center justify-between bg-[#F8F3ED]">
                            <h3 className="text-[13px] font-black tracking-widest text-[#3F3C36] uppercase">Nueva Tarea</h3>
                            <button onClick={resetForm} className="text-[#3F3C36]/50 hover:text-[#3F3C36] transition-colors p-1">
                                <X size={18} />
                            </button>
                        </div>
                        <div className="p-6 overflow-y-auto">
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-[10px] font-black tracking-widest text-[#7A8D69] uppercase mb-1.5">Título de la tarea</label>
                                    <input
                                        type="text"
                                        placeholder="Ej. Entregar planificación"
                                        value={titulo}
                                        onChange={(e) => setTitulo(e.target.value)}
                                        className="w-full bg-white border border-[#EAE4DA] rounded-xl px-4 py-3 text-[13px] text-[#3F3C36] placeholder:text-[#3F3C36]/30 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all shadow-sm"
                                    />
                                </div>
                                
                                <div>
                                    <label className="block text-[10px] font-black tracking-widest text-[#7A8D69] uppercase mb-1.5">Descripción</label>
                                    <textarea
                                        rows={3}
                                        placeholder="Detalles adicionales..."
                                        value={descripcion}
                                        onChange={(e) => setDescripcion(e.target.value)}
                                        className="w-full bg-white border border-[#EAE4DA] rounded-xl px-4 py-3 text-[13px] text-[#3F3C36] placeholder:text-[#3F3C36]/30 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all shadow-sm resize-none"
                                    />
                                </div>

                                <div>
                                    <label className="block text-[10px] font-black tracking-widest text-[#7A8D69] uppercase mb-1.5">Fecha de culminación *</label>
                                    <div className="flex items-center gap-2 bg-white border border-[#EAE4DA] rounded-xl px-4 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 transition-all shadow-sm">
                                        <Calendar size={14} className="text-[#7A8D69] shrink-0" />
                                        <input
                                            type="date"
                                            value={fechaLimite}
                                            onChange={(e) => setFechaLimite(e.target.value)}
                                            className="bg-transparent border-none outline-none text-[13px] text-[#3F3C36] w-full py-3"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-[10px] font-black tracking-widest text-[#7A8D69] uppercase mb-1.5">Docentes asignados</label>
                                    <div className="flex items-center gap-2 mb-3">
                                        <button
                                            onClick={() => setAsignacionTodos(true)}
                                            className={`flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-black uppercase tracking-widest transition-colors border ${
                                                asignacionTodos
                                                    ? 'bg-[#3F3C36] text-[#F8F3ED] border-[#3F3C36] shadow-sm'
                                                    : 'bg-white text-[#7A8D69] border-[#EAE4DA] hover:bg-[#F8F3ED]'
                                            }`}
                                        >
                                            <Users size={14} /> Todos
                                        </button>
                                        <button
                                            onClick={() => setAsignacionTodos(false)}
                                            className={`flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-black uppercase tracking-widest transition-colors border ${
                                                !asignacionTodos
                                                    ? 'bg-[#3F3C36] text-[#F8F3ED] border-[#3F3C36] shadow-sm'
                                                    : 'bg-white text-[#7A8D69] border-[#EAE4DA] hover:bg-[#F8F3ED]'
                                            }`}
                                        >
                                            <ClipboardList size={14} /> Seleccionar
                                        </button>
                                    </div>
                                    
                                    {!asignacionTodos && (
                                        <div className="p-3 bg-[#F8F3ED]/40 border border-[#EAE4DA] rounded-xl flex flex-wrap gap-2 max-h-40 overflow-y-auto">
                                            {docentesCentro.map(d => {
                                                const sel = seleccionados.has(d.userId);
                                                return (
                                                    <button
                                                        key={d.userId}
                                                        onClick={() => toggleDocente(d.userId)}
                                                        className={`px-3 py-1.5 rounded-lg text-[11px] font-bold border transition-colors ${
                                                            sel
                                                                ? 'bg-primary border-primary text-white shadow-sm'
                                                                : 'bg-white border-[#EAE4DA] text-[#3F3C36] hover:border-primary/40'
                                                        }`}
                                                    >
                                                        {d.nombreDocente}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className="p-6 border-t border-[#EAE4DA] bg-[#F8F3ED]/50 flex justify-end gap-3">
                            <button
                                onClick={resetForm}
                                className="px-5 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest text-[#3F3C36] bg-white border border-[#EAE4DA] hover:bg-slate-50 transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleCrearTarea}
                                disabled={creando || !titulo.trim() || !fechaLimite}
                                className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary text-white text-[11px] font-black uppercase tracking-widest px-6 py-2.5 hover:bg-[#6C7E5C] transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
                            >
                                {creando ? 'Creando...' : 'Crear Tarea'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </section>
    );
}
