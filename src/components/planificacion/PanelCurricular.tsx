import { useMemo, useState } from 'react';
import { BookOpen, Check, Copy, CopyPlus, Loader2, TriangleAlert, X } from 'lucide-react';
import { COLORES_BLOQUE_CF } from '../../lib/curriculo';
import type { ItemCurricular } from '../../hooks/useCurriculumPeriodo';

type Tabla = 'competencias' | 'indicadores' | 'contenidos';

interface Props {
    periodo: string;
    grado: string;
    seccion: string;
    asignatura: string;
    cargando: boolean;
    error: string | null;
    tieneEspecificacion: boolean;
    tienePeriodo: boolean;
    competencias: ItemCurricular[];
    indicadores: ItemCurricular[];
    contenidos: ItemCurricular[];
    insertados: Set<string>;
    onInsertar: (item: ItemCurricular) => void;
    onCerrar: () => void;
}

const TABS: Array<{ id: Tabla; label: string }> = [
    { id: 'competencias', label: 'Competencias' },
    { id: 'indicadores', label: 'Indicadores' },
    { id: 'contenidos', label: 'Contenidos' },
];

export default function PanelCurricular({
    periodo,
    grado,
    seccion,
    asignatura,
    cargando,
    error,
    tieneEspecificacion,
    tienePeriodo,
    competencias,
    indicadores,
    contenidos,
    insertados,
    onInsertar,
    onCerrar,
}: Props) {
    const [tab, setTab] = useState<Tabla>('competencias');
    const [copiado, setCopiado] = useState<string | null>(null);

    const items = useMemo(() => {
        if (tab === 'competencias') return competencias;
        if (tab === 'indicadores') return indicadores;
        return contenidos;
    }, [tab, competencias, indicadores, contenidos]);

    const indicadoresPorCE = useMemo(() => {
        const mapa = new Map<string, ItemCurricular[]>();
        for (const ind of indicadores) {
            const clave = ind.ceCodigo || '';
            const lista = mapa.get(clave) ?? [];
            lista.push(ind);
            mapa.set(clave, lista);
        }
        return mapa;
    }, [indicadores]);

    const copiar = async (item: ItemCurricular) => {
        const texto = item.codigo ? `${item.codigo} — ${item.texto}` : item.texto;
        try {
            await navigator.clipboard.writeText(texto);
        } catch {
            // El portapapeles puede estar bloqueado por el navegador: no es crítico.
        }
        setCopiado(item.id);
        window.setTimeout(() => setCopiado((prev) => (prev === item.id ? null : prev)), 1600);
    };

    return (
        <aside className="print:hidden flex flex-col flex-1 min-h-0 bg-white">
            <div className="px-5 py-4 border-b border-(--border-soft) flex items-start justify-between gap-3 shrink-0">
                <div className="flex items-start gap-2.5 min-w-0">
                    <BookOpen size={16} className="text-(--primary) mt-0.5 shrink-0" />
                    <div className="min-w-0">
                        <h3 className="text-xs font-black uppercase tracking-widest text-(--ink)">Currículo aplicado</h3>
                        <p className="text-[11px] text-(--ink-soft) mt-0.5 truncate">
                            {[grado, seccion, asignatura].filter(Boolean).join(' · ')} — Período {periodo}
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

            <div className="px-5 pt-3 shrink-0">
                <div className="flex gap-1 p-1 rounded-xl bg-(--linen)/40">
                    {TABS.map(t => {
                        const activo = tab === t.id;
                        const total = t.id === 'competencias' ? competencias.length : t.id === 'indicadores' ? indicadores.length : contenidos.length;
                        return (
                            <button
                                key={t.id}
                                type="button"
                                onClick={() => setTab(t.id)}
                                className={`flex-1 px-2 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-colors ${activo ? 'bg-white text-(--primary) shadow-sm' : 'text-(--ink-soft) hover:text-(--ink)'}`}
                            >
                                {t.label}
                                <span className="ml-1 opacity-60">{total}</span>
                            </button>
                        );
                    })}
                </div>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
                {cargando && (
                    <div className="flex items-center justify-center gap-2 py-10 text-(--ink-soft)">
                        <Loader2 size={16} className="animate-spin" />
                        <span className="text-[10px] font-bold uppercase tracking-widest">Cargando currículo</span>
                    </div>
                )}

                {error && !cargando && (
                    <div className="flex items-start gap-2 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700">
                        <TriangleAlert size={14} className="mt-0.5 shrink-0" />
                        <p className="text-[11px] font-bold leading-relaxed">{error}</p>
                    </div>
                )}

                {!cargando && !error && !tieneEspecificacion && (
                    <div className="p-5 rounded-xl border border-dashed border-(--border-soft) text-center">
                        <p className="text-[12px] font-black text-(--ink)">Sin especificación curricular</p>
                        <p className="text-[11px] text-(--ink-soft) mt-1 leading-relaxed">
                            Todavía no hay una especificación guardada para este curso y asignatura.
                        </p>
                    </div>
                )}

                {!cargando && !error && tieneEspecificacion && !tienePeriodo && (
                    <div className="p-5 rounded-xl border border-dashed border-(--border-soft) text-center">
                        <p className="text-[12px] font-black text-(--ink)">Sin selecciones en {periodo}</p>
                        <p className="text-[11px] text-(--ink-soft) mt-1 leading-relaxed">
                            Elige las competencias, indicadores y contenidos en Plan de Clases para activarlos aquí.
                        </p>
                    </div>
                )}

                {!cargando && !error && items.length === 0 && tienePeriodo && (
                    <div className="p-5 rounded-xl border border-dashed border-(--border-soft) text-center">
                        <p className="text-[12px] font-black text-(--ink)">Nada en esta sección</p>
                        <p className="text-[11px] text-(--ink-soft) mt-1 leading-relaxed">
                            No hay elementos guardados para el período {periodo}.
                        </p>
                    </div>
                )}

                {tab === 'competencias' && competencias.map(ce => {
                    const color = ce.bloque ? COLORES_BLOQUE_CF[ce.bloque] : null;
                    const hijos = indicadoresPorCE.get(ce.codigo) ?? [];
                    return (
                        <div key={ce.id} className="p-3 rounded-xl border border-(--border-soft) bg-(--linen)/10">
                            <div className="flex items-start gap-2">
                                <span
                                    className="shrink-0 mt-0.5 rounded-full px-2 py-0.5 text-[10px] font-black text-(--ink)"
                                    style={{ backgroundColor: color ? `${color}1F` : 'rgba(46,51,48,0.06)' }}
                                >
                                    {ce.codigo}
                                </span>
                                <p className="flex-1 text-[11px] font-medium leading-relaxed text-(--ink)">{ce.texto}</p>
                                <Acciones
                                    item={ce}
                                    insertado={insertados.has(ce.id)}
                                    copiado={copiado === ce.id}
                                    onCopiar={copiar}
                                    onInsertar={onInsertar}
                                />
                            </div>
                            {hijos.length > 0 && (
                                <ul className="mt-2 pl-1 space-y-1">
                                    {hijos.map(ind => (
                                        <li key={ind.id} className="flex items-start gap-2 text-[11px] text-(--ink-soft)">
                                            <span className="shrink-0 rounded-full bg-white border border-(--border-soft) px-1.5 py-0.5 text-[9px] font-black text-(--ink-soft)">
                                                {ind.codigo || 'IL'}
                                            </span>
                                            <span className="flex-1 leading-relaxed">{ind.texto}</span>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    );
                })}

                {tab === 'indicadores' && indicadores.map(ind => (
                    <div key={ind.id} className="p-3 rounded-xl border border-(--border-soft) bg-white">
                        <div className="flex items-start gap-2">
                            <span className="shrink-0 mt-0.5 rounded-full bg-(--primary)/10 px-2 py-0.5 text-[10px] font-black text-(--primary)">
                                {ind.codigo || 'IL'}
                            </span>
                            <p className="flex-1 text-[11px] font-medium leading-relaxed text-(--ink)">{ind.texto}</p>
                            <Acciones
                                item={ind}
                                insertado={insertados.has(ind.id)}
                                copiado={copiado === ind.id}
                                onCopiar={copiar}
                                onInsertar={onInsertar}
                            />
                        </div>
                    </div>
                ))}

                {tab === 'contenidos' && contenidos.map(cont => (
                    <div key={cont.id} className="p-3 rounded-xl border border-(--border-soft) bg-white">
                        <div className="flex items-start gap-2">
                            <p className="flex-1 text-[11px] font-medium leading-relaxed text-(--ink)">{cont.texto}</p>
                            <Acciones
                                item={cont}
                                insertado={insertados.has(cont.id)}
                                copiado={copiado === cont.id}
                                onCopiar={copiar}
                                onInsertar={onInsertar}
                            />
                        </div>
                    </div>
                ))}
            </div>

            <div className="px-5 py-3 border-t border-(--border-soft) shrink-0">
                <p className="text-[10px] text-(--ink-soft)/70 leading-relaxed">
                    «Insertar» activa el pincel: haz clic en la celda del documento donde quieres el texto.
                </p>
            </div>
        </aside>
    );
}

function Acciones({
    item,
    insertado,
    copiado,
    onCopiar,
    onInsertar,
}: {
    item: ItemCurricular;
    insertado: boolean;
    copiado: boolean;
    onCopiar: (item: ItemCurricular) => void;
    onInsertar: (item: ItemCurricular) => void;
}) {
    return (
        <div className="flex items-center gap-1 shrink-0">
            <button
                type="button"
                onClick={() => onCopiar(item)}
                title="Copiar"
                className="p-1.5 rounded-lg border border-(--border-soft) text-(--ink-soft) hover:text-(--primary) hover:border-(--primary)/40 transition-colors"
            >
                {copiado ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
            </button>
            <button
                type="button"
                onClick={() => onInsertar(item)}
                title="Insertar en el documento"
                className={`p-1.5 rounded-lg border transition-colors ${insertado ? 'border-emerald-500 text-emerald-600' : 'border-(--border-soft) text-(--ink-soft) hover:text-(--primary) hover:border-(--primary)/40'}`}
            >
                <CopyPlus size={12} />
            </button>
        </div>
    );
}
