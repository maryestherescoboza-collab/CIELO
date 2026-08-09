import { useMemo, useState } from 'react';
import {
    ClipboardList, Calendar, Users, Plus, CheckCircle2, XCircle, Clock
} from 'lucide-react';
import { useAppStore } from '../../store/appStore';
import { useTareaActions } from '../../hooks/useTareaActions';
import type { Tarea } from '../../types';

interface Props {
    centroId: string;
}

export default function CentroTareas({ centroId }: Props) {
    const state = useAppStore(s => s.state);
    const { addTarea, cancelTarea } = useTareaActions();

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

    const [titulo, setTitulo] = useState('');
    const [descripcion, setDescripcion] = useState('');
    const [fechaLimite, setFechaLimite] = useState('');
    const [asignacionTodos, setAsignacionTodos] = useState(true);
    const [seleccionados, setSeleccionados] = useState<Set<string>>(new Set());
    const [creando, setCreando] = useState(false);
    const [mensajeTarea, setMensajeTarea] = useState<string | null>(null);

    const toggleDocente = (uid: string) => {
        setSeleccionados(prev => {
            const next = new Set(prev);
            if (next.has(uid)) next.delete(uid);
            else next.add(uid);
            return next;
        });
    };

    const handleCrearTarea = async () => {
        if (!titulo.trim() || !centroId) return;
        const docenteIds = asignacionTodos
            ? docentesCentro.map(d => d.userId)
            : Array.from(seleccionados);
        if (docenteIds.length === 0) {
            setMensajeTarea('No hay docentes asignables en este centro');
            setTimeout(() => setMensajeTarea(null), 3000);
            return;
        }
        setCreando(true);
        const resultado = await addTarea({
            centroId,
            titulo: titulo.trim(),
            descripcion: descripcion.trim(),
            fechaLimite,
            docenteIds,
        });
        setCreando(false);
        if (resultado?.tarea) {
            setTitulo('');
            setDescripcion('');
            setFechaLimite('');
            setSeleccionados(new Set());
            setMensajeTarea(resultado.notificacionesFallidas > 0
                ? 'Tarea creada y asignada (hubo docentes sin notificar)'
                : 'Tarea creada y notificada a los docentes');
            setTimeout(() => setMensajeTarea(null), 3000);
        }
    };

    const getTareaEstado = (tarea: Tarea): { label: string; color: string; bg: string } => {
        if (tarea.estado === 'cancelada') {
            return { label: 'Cancelada', color: 'text-[#5F665E]', bg: 'bg-[#EAE4DA]/60' };
        }
        const asignaciones = tarea.asignaciones || [];
        if (asignaciones.length > 0 && asignaciones.every(a => a.estado === 'completada')) {
            return { label: 'Completada', color: 'text-[#ADC762]', bg: 'bg-[#BFC9A6]/40' };
        }
        return { label: 'Pendiente', color: 'text-[#A3792E]', bg: 'bg-[#F5BC5D]/25' };
    };

    const nombreDocente = (uid: string) =>
        state.perfiles.find(p => p.userId === uid)?.nombreDocente || 'Docente';

    return (
        <section className="bg-[#F9F8F6] border border-[#E6E1D8] rounded-2xl shadow-[0_1px_2px_rgba(0,0,0,0.04),0_12px_32px_rgba(0,0,0,0.05)] overflow-hidden">
            <header className="px-5 py-3.5 border-b border-[#E6E1D8] flex items-center gap-3">
                <span className="w-9 h-9 rounded-xl bg-white border border-[#E6E1D8] flex items-center justify-center text-[#6F94AF] shrink-0">
                    <ClipboardList size={16} />
                </span>
                <div>
                    <h2 className="text-[15px] font-semibold text-[#3F3C36]">Tareas</h2>
                    <p className="text-[12px] text-[#6B7280] mt-0.5">Comunicados y asignaciones para los docentes</p>
                </div>
            </header>

            <div className="px-5 py-3.5">
                {/* Área 1 · Formulario de nueva tarea */}
                <div>
                    <h3 className="text-[13px] font-semibold text-[#3F3C36]">Nueva tarea</h3>

                    <div className="mt-2.5 rounded-xl bg-white border border-[#E6E1D8] p-4 shadow-sm space-y-3">
                        <div className="grid grid-cols-1 gap-3">
                            <input
                                type="text"
                                placeholder="Título de la tarea"
                                value={titulo}
                                onChange={(e) => setTitulo(e.target.value)}
                                className="w-full bg-white border border-[#E6E1D8] rounded-xl px-4 py-2.5 text-[13px] text-[#3F3C36] placeholder:text-[#6B7280]/60 outline-none focus:border-[#6F94AF] focus:ring-2 focus:ring-[#6F94AF]/20 transition-all shadow-sm"
                            />
                            <div className="flex items-center gap-2 bg-white border border-[#E6E1D8] rounded-xl px-3.5 focus-within:border-[#6F94AF] focus-within:ring-2 focus-within:ring-[#6F94AF]/20 transition-all shadow-sm">
                                <Calendar size={14} className="text-[#6B7280] shrink-0" />
                                <input
                                    type="date"
                                    value={fechaLimite}
                                    onChange={(e) => setFechaLimite(e.target.value)}
                                    className="bg-transparent border-none outline-none text-[13px] text-[#3F3C36] w-full py-2.5"
                                />
                            </div>
                        </div>

                        <textarea
                            rows={2}
                            placeholder="Descripción de la tarea…"
                            value={descripcion}
                            onChange={(e) => setDescripcion(e.target.value)}
                            className="w-full bg-white border border-[#E6E1D8] rounded-xl px-4 py-2.5 text-[13px] text-[#3F3C36] placeholder:text-[#6B7280]/60 outline-none focus:border-[#6F94AF] focus:ring-2 focus:ring-[#6F94AF]/20 transition-all shadow-sm resize-none"
                        />

                        <div className="flex items-center gap-1 rounded-xl bg-[#F9F8F6] border border-[#E6E1D8] p-1 w-fit">
                            <button
                                onClick={() => setAsignacionTodos(true)}
                                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors ${
                                    asignacionTodos
                                        ? 'bg-white text-[#3F3C36] shadow-sm'
                                        : 'text-[#6B7280] hover:text-[#3F3C36]'
                                }`}
                            >
                                <Users size={13} /> Todos
                            </button>
                            <button
                                onClick={() => setAsignacionTodos(false)}
                                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors ${
                                    !asignacionTodos
                                        ? 'bg-white text-[#3F3C36] shadow-sm'
                                        : 'text-[#6B7280] hover:text-[#3F3C36]'
                                }`}
                            >
                                <ClipboardList size={13} /> Seleccionar
                            </button>
                        </div>

                        {!asignacionTodos && (
                            <div className="flex flex-wrap gap-1.5">
                                {docentesCentro.map(d => {
                                    const sel = seleccionados.has(d.userId);
                                    return (
                                        <button
                                            key={d.userId}
                                            onClick={() => toggleDocente(d.userId)}
                                            className={`px-3 py-1.5 rounded-lg text-[12px] font-medium border transition-colors ${
                                                sel
                                                    ? 'bg-[#6F94AF]/10 border-[#6F94AF]/40 text-[#6F94AF]'
                                                    : 'bg-white border-[#E6E1D8] text-[#6B7280] hover:border-[#6F94AF]/50 hover:text-[#3F3C36]'
                                            }`}
                                        >
                                            {d.nombreDocente}
                                        </button>
                                    );
                                })}
                            </div>
                        )}

                        <div className="flex items-center gap-3">
                            <button
                                onClick={handleCrearTarea}
                                disabled={creando || !titulo.trim()}
                                className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#6F94AF] text-white text-[13px] font-semibold px-4 py-2.5 hover:bg-[#5F839E] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                                <Plus size={15} />
                                {creando ? 'Creando…' : 'Crear tarea'}
                            </button>
                            {mensajeTarea && (
                                <span className="inline-flex items-center gap-1.5 text-[12px] font-medium text-[#6B7280]">
                                    <CheckCircle2 size={14} className="text-[#188038]" /> {mensajeTarea}
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Área 2 · Listado de tareas */}
                <div className="mt-4">
                    <h3 className="text-[13px] font-semibold text-[#3F3C36]">Tareas asignadas</h3>
                    <div className="mt-2.5 space-y-2.5">
                        {tareasCentro.length === 0 ? (
                            <div className="rounded-xl border border-dashed border-[#E6E1D8] bg-white/60 px-4 py-6 text-center">
                                <p className="text-[13px] text-[#6B7280]">Aún no hay tareas asignadas</p>
                            </div>
                        ) : (
                            tareasCentro.map(tarea => {
                                const estado = getTareaEstado(tarea);
                                const asignaciones = tarea.asignaciones || [];
                                return (
                                    <article key={tarea.id} className="bg-white border border-[#E6E1D8] rounded-xl p-4 shadow-sm">
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <h4 className="text-[13px] font-semibold text-[#3F3C36]">{tarea.titulo}</h4>
                                                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium ${estado.bg} ${estado.color}`}>
                                                        {estado.label}
                                                    </span>
                                                </div>
                                                {tarea.descripcion && (
                                                    <p className="mt-1 text-[12px] text-[#6B7280] line-clamp-2">{tarea.descripcion}</p>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2 shrink-0">
                                                {tarea.fechaLimite && (
                                                    <span className="inline-flex items-center gap-1 text-[12px] text-[#6B7280]">
                                                        <Clock size={13} /> {new Date(`${tarea.fechaLimite}T00:00:00`).toLocaleDateString('es-ES')}
                                                    </span>
                                                )}
                                                {tarea.estado !== 'cancelada' && (
                                                    <button
                                                        onClick={() => cancelTarea(tarea.id)}
                                                        className="text-[#6B7280] hover:text-[#D93025] transition-colors p-1"
                                                        title="Cancelar tarea"
                                                    >
                                                        <XCircle size={15} />
                                                    </button>
                                                )}
                                            </div>
                                        </div>

                                        {asignaciones.length > 0 && (
                                            <div className="mt-3 flex flex-wrap gap-1.5">
                                                {asignaciones.map(a => {
                                                    const done = a.estado === 'completada';
                                                    return (
                                                        <span
                                                            key={a.id}
                                                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium border ${
                                                                done
                                                                    ? 'bg-[#BFC9A6]/25 border-[#ADC762]/30 text-[#4F5F44]'
                                                                    : 'bg-white border-[#E6E1D8] text-[#6B7280]'
                                                            }`}
                                                        >
                                                            {done
                                                                ? <CheckCircle2 size={11} className="text-[#188038]" />
                                                                : <XCircle size={11} className="text-[#6B7280]" />}
                                                            {nombreDocente(a.userId)}
                                                        </span>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </article>
                                );
                            })
                        )}
                    </div>
                </div>
            </div>
        </section>
    );
}
