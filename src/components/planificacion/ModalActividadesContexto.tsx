import { useMemo, useState } from 'react';
import { CalendarDays, ClipboardList, Loader2, Search, TriangleAlert, X } from 'lucide-react';
import type { Actividad } from '../../types';

interface Props {
    periodo: string;
    cursoLabel: string;
    actividades: Actividad[];
    cargando: boolean;
    error: string | null;
    seleccionados: Set<number>;
    resumenCurriculo: { competencias: number; indicadores: number; contenidos: number };
    contexto: string;
    onContexto: (valor: string) => void;
    onAlternar: (id: number) => void;
    onTodas: () => void;
    onNinguna: () => void;
    onConfirmar: () => void;
    onCerrar: () => void;
}

export default function ModalActividadesContexto({
    periodo,
    cursoLabel,
    actividades,
    cargando,
    error,
    seleccionados,
    resumenCurriculo,
    contexto,
    onContexto,
    onAlternar,
    onTodas,
    onNinguna,
    onConfirmar,
    onCerrar,
}: Props) {
    const [busqueda, setBusqueda] = useState('');

    const filtradas = useMemo(() => {
        const q = busqueda.trim().toLowerCase();
        if (!q) return actividades;
        return actividades.filter((a) =>
            `${a.nombre || ''} ${a.indicador || ''} ${a.descripcion || ''}`.toLowerCase().includes(q)
        );
    }, [actividades, busqueda]);

    return (
        <div className="fixed inset-0 z-110 bg-black/40 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[86vh] flex flex-col overflow-hidden">
                <div className="px-6 py-4 border-b border-(--border-soft) flex items-start justify-between gap-3 shrink-0">
                    <div className="flex items-start gap-2.5 min-w-0">
                        <ClipboardList size={16} className="text-(--primary) mt-0.5 shrink-0" />
                        <div className="min-w-0">
                            <h3 className="text-[13px] font-black uppercase tracking-widest text-(--ink)">
                                Actividades reales del curso
                            </h3>
                            <p className="text-[11px] text-(--ink-soft) mt-0.5 truncate">
                                {cursoLabel} · Período {periodo}
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onCerrar}
                        className="p-1.5 rounded-full text-(--ink-soft) hover:bg-(--linen)/40 transition-colors shrink-0"
                        title="Cerrar"
                    >
                        <X size={16} />
                    </button>
                </div>

                <div className="px-6 py-3 border-b border-(--border-soft) flex flex-wrap items-center gap-3 shrink-0">
                    <div className="flex-1 min-w-[180px] relative">
                        <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-(--ink-soft)" />
                        <input
                            value={busqueda}
                            onChange={e => setBusqueda(e.target.value)}
                            placeholder="Buscar actividad..."
                            className="w-full pl-8 pr-3 py-2 text-[12px] border border-(--border-soft) rounded-lg outline-none focus:border-(--primary) bg-(--linen)/10 text-(--ink)"
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={onTodas}
                            disabled={actividades.length === 0}
                            className="px-2.5 py-1.5 rounded-lg border border-(--border-soft) text-[10px] font-black uppercase tracking-widest text-(--ink-soft) hover:bg-(--linen)/30 disabled:opacity-40"
                        >
                            Todas
                        </button>
                        <button
                            type="button"
                            onClick={onNinguna}
                            disabled={seleccionados.size === 0}
                            className="px-2.5 py-1.5 rounded-lg border border-(--border-soft) text-[10px] font-black uppercase tracking-widest text-(--ink-soft) hover:bg-(--linen)/30 disabled:opacity-40"
                        >
                            Ninguna
                        </button>
                        <span className="text-[10px] font-black uppercase tracking-widest text-(--primary)">
                            {seleccionados.size} sel.
                        </span>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto px-6 py-4 space-y-2">
                    {cargando && (
                        <div className="flex items-center justify-center gap-2 py-10 text-(--ink-soft)">
                            <Loader2 size={16} className="animate-spin" />
                            <span className="text-[10px] font-bold uppercase tracking-widest">Cargando actividades</span>
                        </div>
                    )}

                    {error && !cargando && (
                        <div className="flex items-start gap-2 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700">
                            <TriangleAlert size={14} className="mt-0.5 shrink-0" />
                            <p className="text-[11px] font-bold leading-relaxed">{error}</p>
                        </div>
                    )}

                    {!cargando && !error && actividades.length === 0 && (
                        <div className="p-6 rounded-xl border border-dashed border-(--border-soft) text-center">
                            <CalendarDays size={20} className="mx-auto text-(--ink-soft)/50" />
                            <p className="text-[12px] font-black text-(--ink) mt-2">No hay actividades en {periodo}</p>
                            <p className="text-[11px] text-(--ink-soft) mt-1 leading-relaxed">
                                Puedes continuar con el currículo y el contexto escrito.
                            </p>
                        </div>
                    )}

                    {!cargando && !error && filtradas.map(act => {
                        const marcado = seleccionados.has(act.id);
                        return (
                            <label
                                key={act.id}
                                className={`flex items-start gap-3 p-3 rounded-xl border transition-colors cursor-pointer ${marcado ? 'border-(--primary)/40 bg-(--primary)/5' : 'border-(--border-soft) bg-white hover:bg-(--linen)/20'}`}
                            >
                                <input
                                    type="checkbox"
                                    checked={marcado}
                                    onChange={() => onAlternar(act.id)}
                                    className="mt-0.5 w-4 h-4 accent-[var(--primary)] shrink-0"
                                />
                                <div className="min-w-0 flex-1">
                                    <p className="text-[12px] font-bold text-(--ink) leading-snug">{act.nombre}</p>
                                    {act.descripcion && (
                                        <p className="text-[11px] text-(--ink-soft) mt-0.5 leading-relaxed line-clamp-2">{act.descripcion}</p>
                                    )}
                                    <div className="flex flex-wrap items-center gap-2 mt-1.5">
                                        {act.fecha && (
                                            <span className="text-[10px] font-bold text-(--ink-soft)/80">{act.fecha}</span>
                                        )}
                                        {act.indicador && (
                                            <span className="rounded-full bg-(--primary)/10 px-2 py-0.5 text-[9px] font-black text-(--primary)">
                                                {act.indicador}
                                            </span>
                                        )}
                                        {act.producto && (
                                            <span className="rounded-full bg-(--linen) px-2 py-0.5 text-[9px] font-bold text-(--ink-soft)">
                                                {act.producto}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </label>
                        );
                    })}
                </div>

                <div className="px-6 py-3 border-t border-(--border-soft) shrink-0">
                    <label className="text-[10px] font-black uppercase tracking-widest text-(--ink-soft)">
                        Contexto adicional (opcional)
                    </label>
                    <textarea
                        value={contexto}
                        onChange={e => onContexto(e.target.value)}
                        placeholder="Ej: Los estudiantes resolverán un problema de proporcionalidad utilizando situaciones de la vida cotidiana..."
                        className="mt-1.5 w-full h-20 px-3 py-2 text-[12px] border border-(--border-soft) rounded-lg outline-none focus:border-(--primary) resize-none text-(--ink) bg-(--linen)/10"
                    />
                </div>

                <div className="px-6 py-4 border-t border-(--border-soft) shrink-0 flex flex-wrap items-center justify-between gap-3">
                    <p className="text-[10px] text-(--ink-soft)/80 leading-relaxed">
                        Se enviará además el currículo del período: {resumenCurriculo.competencias} competencias,
                        {' '}{resumenCurriculo.indicadores} indicadores y {resumenCurriculo.contenidos} contenidos.
                    </p>
                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={onCerrar}
                            className="px-4 py-2 rounded-xl border border-(--border-soft) text-[11px] font-black uppercase tracking-widest text-(--ink-soft) hover:bg-(--linen)/30 transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            type="button"
                            onClick={onConfirmar}
                            className="px-4 py-2 rounded-xl bg-(--primary) text-white text-[11px] font-black uppercase tracking-widest hover:opacity-90 shadow-sm"
                        >
                            Generar sugerencias
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
