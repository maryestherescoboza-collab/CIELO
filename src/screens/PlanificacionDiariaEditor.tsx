import { useState, useEffect, useRef, useCallback } from 'react';
import type { MouseEvent as ReactMouseEvent } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Printer, Sparkles, X, Plus, Paintbrush } from 'lucide-react';
import type { AppState, Secuencia, Curso } from '../types';
import { useAppStore } from '../store/appStore';
import { getGeminiApiKey, saveGeminiApiKey } from '../lib/aiConfig';
import { getPlanificacionDiariaTemplate } from '../templates/planificacion-diaria';
import {
    extraerContextoPlanificacion,
    desarrolloSuficiente,
    generarSugerenciasPedagogicas,
    asignarIdsDeCeldas,
    celdaRequiereConfirmacion,
    escribirEnCelda,
    type SugerenciasIA,
    type CategoriaSugerencia
} from '../lib/aiPlanificacion';

interface Props {
    state: AppState;
    onUpdateSecuencia?: (seq: Secuencia) => Promise<void> | void;
    onAddSecuencia?: (seq: Omit<Secuencia, 'id'>) => Promise<Secuencia | null>;
}

function getCursoLabel(curso?: Curso) {
    if (!curso) return 'Curso sin asignar';
    return `${curso.grado} ${curso.seccion} • ${curso.nombre}`;
}

interface SeccionSugerenciasProps {
    titulo: string;
    items: string[];
    prefijoClave: string;
    insertadas: Set<string>;
    onInsertar: (clave: string, sugerencia: CategoriaSugerencia) => void;
    construir: (texto: string) => CategoriaSugerencia;
}

function SeccionSugerencias({ titulo, items, prefijoClave, insertadas, onInsertar, construir }: SeccionSugerenciasProps) {
    return (
        <div className="space-y-2">
            <h4 className="text-[10px] font-black uppercase tracking-widest text-(--ink-soft)">{titulo}</h4>
            {items.map((item, i) => {
                const clave = `${prefijoClave}-${i}`;
                return (
                    <ItemSugerencia
                        key={clave}
                        texto={item}
                        insertada={insertadas.has(clave)}
                        onInsertar={() => onInsertar(clave, construir(item))}
                    />
                );
            })}
        </div>
    );
}

interface ItemSugerenciaProps {
    texto: string;
    insertada: boolean;
    onInsertar: () => void;
}

function ItemSugerencia({ texto, insertada, onInsertar }: ItemSugerenciaProps) {
    return (
        <div className={`group flex items-start gap-2 p-3 rounded-xl border transition-colors ${insertada ? 'bg-emerald-50/60 border-emerald-200' : 'bg-white border-(--border-soft) hover:border-(--primary)/40'}`}>
            <p className="flex-1 text-[11px] font-medium text-(--ink) leading-relaxed">{texto}</p>
            {insertada ? (
                <span className="text-[9px] font-black uppercase tracking-widest text-emerald-600 shrink-0 pt-0.5">Insertada</span>
            ) : (
                <button
                    type="button"
                    onClick={onInsertar}
                    className="shrink-0 flex items-center gap-1 px-2 py-1 rounded-lg bg-(--linen)/50 border border-(--border-soft) text-[9px] font-black uppercase tracking-widest text-(--ink-soft) hover:border-(--primary) hover:text-(--primary) transition-colors"
                    title="Activa la brocha para aplicar esta sugerencia en la celda que elijas"
                >
                    <Plus size={11} /> Insertar
                </button>
            )}
        </div>
    );
}

function obtenerCeldaDestino(target: HTMLElement | null): HTMLElement | null {
    if (!target?.closest) return null;
    const conId = target.closest<HTMLElement>('[data-field-id]');
    if (conId instanceof HTMLElement) return conId;
    const editable = target.closest<HTMLElement>('td.editable, span.editable, [contenteditable="true"]');
    if (editable instanceof HTMLElement) {
        const txt = (editable.textContent || '').replace(/\s+/g, ' ').trim().toLowerCase();
        if (['inicio', 'desarrollo', 'cierre'].includes(txt)) return null;
        return editable;
    }
    return null;
}

const CURSOR_BROCHA = 'url("/icons/brocha.svg") 8 25, copy';

export default function PlanificacionDiariaEditor({ state, onUpdateSecuencia, onAddSecuencia }: Props) {
    const { id } = useParams<{ id: string }>();
    const esPlantilla = id === 'plantilla';
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [seq, setSeq] = useState<Secuencia | null>(null);
    const [localTitulo, setLocalTitulo] = useState('');
    const [localCursoId, setLocalCursoId] = useState<number>(0);
    const [saving, setSaving] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);
    const session = useAppStore(s => s.session);

    const [panelIA, setPanelIA] = useState(false);
    const [iaCargando, setIaCargando] = useState(false);
    const [iaError, setIaError] = useState<string | null>(null);
    const [sugerencias, setSugerencias] = useState<SugerenciasIA | null>(null);
    const [insertadas, setInsertadas] = useState<Set<string>>(new Set());
    const [necesitaKey, setNecesitaKey] = useState(false);
    const [apiKeyInput, setApiKeyInput] = useState('');
    const abortRef = useRef<AbortController | null>(null);
    const badgeTimersRef = useRef<Record<string, number>>({});
    const [brocha, setBrocha] = useState<{ clave: string; sugerencia: CategoriaSugerencia } | null>(null);
    const [celdaPendiente, setCeldaPendiente] = useState<{ celda: HTMLElement; clave: string; texto: string } | null>(null);
    const celdasBrochaRef = useRef<HTMLElement[]>([]);
    const hoverCellRef = useRef<HTMLElement | null>(null);

    const marcarInsertada = (clave: string) => {
        setInsertadas(prev => new Set(prev).add(clave));
        window.clearTimeout(badgeTimersRef.current[clave]);
        badgeTimersRef.current[clave] = window.setTimeout(() => {
            setInsertadas(prev => {
                if (!prev.has(clave)) return prev;
                const next = new Set(prev);
                next.delete(clave);
                return next;
            });
        }, 1800);
    };

    const limpiarEstiloCelda = (el: HTMLElement) => {
        el.style.outline = '';
        el.style.background = '';
        el.style.cursor = '';
        el.title = '';
    };

    const finalizarBrocha = useCallback(() => {
        celdasBrochaRef.current.forEach(limpiarEstiloCelda);
        celdasBrochaRef.current = [];
        if (hoverCellRef.current) {
            limpiarEstiloCelda(hoverCellRef.current);
            hoverCellRef.current = null;
        }
        setCeldaPendiente(null);
        setBrocha(null);
    }, []);

    const activarBrocha = (clave: string, sugerencia: CategoriaSugerencia) => {
        setCeldaPendiente(null);
        setBrocha({ clave, sugerencia });
        requestAnimationFrame(() => {
            const contenedor = document.getElementById('template-editor-container');
            if (!contenedor) return;
            celdasBrochaRef.current = Array.from(contenedor.querySelectorAll<HTMLElement>('[data-field-id]'))
                .filter(el => !((el.dataset.fieldId || '').endsWith('-momento')));
            celdasBrochaRef.current.forEach(el => {
                el.style.cursor = CURSOR_BROCHA;
                el.style.background = 'rgba(59,130,246,0.06)';
            });
        });
    };

    const aplicarBrocha = (celda: HTMLElement, clave: string, texto: string) => {
        const contenedor = document.getElementById('template-editor-container');
        escribirEnCelda(celda, texto);
        if (contenedor) {
            const htmlActualizado = contenedor.innerHTML;
            setSeq(prev => (prev ? { ...prev, contenidoHtml: htmlActualizado } : prev));
        }
        marcarInsertada(clave);
        finalizarBrocha();
    };

    const handleClicPlantilla = (e: ReactMouseEvent<HTMLDivElement>) => {
        if (!brocha) return;
        const target = e.target as HTMLElement | null;
        const celda = obtenerCeldaDestino(target);
        if (!celda) return;
        const id = celda.dataset.fieldId || '';
        if (id.endsWith('-momento')) return;
        if (celdaRequiereConfirmacion(celda)) {
            setCeldaPendiente({ celda, clave: brocha.clave, texto: brocha.sugerencia.texto });
            return;
        }
        aplicarBrocha(celda, brocha.clave, brocha.sugerencia.texto);
    };

    const handleOverPlantilla = (e: ReactMouseEvent<HTMLDivElement>) => {
        if (!brocha) return;
        const target = e.target as HTMLElement | null;
        const celda = target?.closest?.('[data-field-id]') ?? null;
        if (!(celda instanceof HTMLElement) || (celda.dataset.fieldId || '').endsWith('-momento')) return;
        if (hoverCellRef.current && hoverCellRef.current !== celda) {
            limpiarEstiloCelda(hoverCellRef.current);
        }
        if (hoverCellRef.current !== celda) {
            hoverCellRef.current = celda;
            celda.style.outline = '2px dashed var(--primary)';
            celda.style.background = 'rgba(59,130,246,0.12)';
            celda.style.cursor = CURSOR_BROCHA;
            celda.title = 'Aplicar sugerencia de IA aquí';
        }
    };

    const handleLeavePlantilla = () => {
        if (hoverCellRef.current) {
            limpiarEstiloCelda(hoverCellRef.current);
            hoverCellRef.current = null;
        }
    };

    useEffect(() => () => abortRef.current?.abort(), []);

    useEffect(() => {
        if (esPlantilla) return;
        // If data is loading or empty, wait a bit or check if it exists
        const found = state.secuencias.find(s => s.id === Number(id));
        if (found) {
            setSeq(found);
            setLocalTitulo(found.titulo);
            setLocalCursoId(found.cursoId);
            setLoading(false);
        } else {
            // If state.secuencias is empty, maybe wait for loading.
            // But if it's populated and still not found, we stop loading
            if (state.secuencias.length > 0) {
                setLoading(false);
            }
        }
    }, [id, state.secuencias, esPlantilla]);

    useEffect(() => {
        if (!esPlantilla) return;
        if (seq) return;

        const qs = new URLSearchParams(window.location.search);
        const cursoIdParam = Number(qs.get('cursoId')) || 0;
        const curso = cursoIdParam > 0 ? state.cursos.find(c => c.id === cursoIdParam) : undefined;
        const miPerfil = state.perfiles.find(p => p.userId === session?.user?.id);
        const centroNombre = qs.get('centro')
            || state.centros?.find(c => c.id === miPerfil?.centro_id)?.nombre
            || session?.user?.user_metadata?.centro_nombre || 'Mi Centro';
        const codigoCentro = qs.get('codigo')
            || state.centros?.find(c => c.id === miPerfil?.centro_id)?.codigoCentro
            || session?.user?.user_metadata?.codigo_centro || '';
        const docenteNombre = qs.get('docente')
            || miPerfil?.nombreDocente || session?.user?.user_metadata?.full_name || session?.user?.user_metadata?.nombre_docente || 'Docente';
        const fecha = qs.get('fecha') || new Date().toISOString().slice(0, 10);
        const asignatura = qs.get('asignatura') || curso?.asignatura || '';
        const grado = qs.get('grado') || curso?.grado || '';
        const seccion = qs.get('seccion') || curso?.seccion || '';
        const cursoId = cursoIdParam;
        const titulo = 'Planificación - ' + (asignatura || 'Clase');

        setLocalTitulo(titulo);
        setLocalCursoId(cursoId);
        setSeq({
            id: 0,
            titulo,
            cursoId,
            fechaInicio: fecha,
            contenidoHtml: getPlanificacionDiariaTemplate({
                centro: centroNombre,
                codigoCentro,
                docente: docenteNombre,
                asignatura,
                grado,
                seccion,
                fecha
            }),
            estado: 'Pendiente',
            recursos: []
        });
        setLoading(false);
    }, [esPlantilla, seq, state.cursos, state.perfiles, state.centros, session]);

    useEffect(() => {
        const win = window as unknown as {
            addSession?: () => void;
            removeSession?: (btn: HTMLElement) => void;
            renumberSessions?: () => void;
        };

        win.addSession = () => {
            const tpl = document.getElementById('session-template') as HTMLTemplateElement | null;
            const container = document.getElementById('sessions-container');
            if (tpl && container) {
                const clone = document.importNode(tpl.content, true);
                container.appendChild(clone);
                win.renumberSessions?.();
                asignarIdsDeCeldas();
            }
        };

        win.removeSession = (btn: HTMLElement) => {
            const block = btn.closest('.session-block');
            if (block) {
                block.remove();
                win.renumberSessions?.();
                asignarIdsDeCeldas();
            }
        };

        win.renumberSessions = () => {
            const container = document.getElementById('sessions-container');
            if (!container) return;
            const blocks = container.querySelectorAll('.session-block');
            blocks.forEach((block, i) => {
                const title = block.querySelector('.session-title');
                if (title) {
                    title.textContent = 'Desarrollo de la clase' + (blocks.length > 1 ? ' — Sesión ' + (i + 1) : '');
                }
            });
        };

        return () => {
            delete win.addSession;
            delete win.removeSession;
            delete win.renumberSessions;
        };
    }, []);

    // Initial session auto-creation if container is empty
    useEffect(() => {
        if (!loading && seq) {
            const timer = setTimeout(() => {
                const container = document.getElementById('sessions-container');
                if (container && container.children.length === 0) {
                    const win = window as unknown as { addSession?: () => void };
                    win.addSession?.();
                }
            }, 150);
            return () => clearTimeout(timer);
        }
    }, [loading, seq]);

    // Identifica cada celda editable (general-*, curricular-*, contenido-*, seccion-N-*)
    useEffect(() => {
        if (!loading && seq) {
            asignarIdsDeCeldas();
        }
    }, [loading, seq]);

    // Esc cancela el modo brocha
    useEffect(() => {
        if (!brocha) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') finalizarBrocha();
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [brocha, finalizarBrocha]);

    const handleSave = async () => {
        if (!seq) return;
        const container = document.getElementById('template-editor-container');
        if (!container) return;

        setSaving(true);
        const updatedHtml = container.innerHTML;

        if (esPlantilla) {
            const nueva: Omit<Secuencia, 'id'> = {
                titulo: localTitulo,
                cursoId: localCursoId,
                fechaInicio: seq.fechaInicio,
                contenidoHtml: updatedHtml,
                estado: 'Pendiente',
                recursos: []
            };
            let creada: Secuencia | null = null;
            if (onAddSecuencia) {
                creada = (await onAddSecuencia(nueva)) || null;
            }
            if (creada?.id) {
                navigate(`/planificacion-diaria/${creada.id}`, { replace: true });
            }
            setSaving(false);
            setSaveSuccess(true);
            setTimeout(() => setSaveSuccess(false), 2500);
            return;
        }

        const updatedSeq: Secuencia = {
            ...seq,
            titulo: localTitulo,
            cursoId: localCursoId,
            contenidoHtml: updatedHtml
        };

        if (onUpdateSecuencia) {
            await onUpdateSecuencia(updatedSeq);
        }
        setSeq(updatedSeq);
        setSaving(false);
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 2500);
    };

    const handleGenerarSugerencias = async () => {
        if (!seq || iaCargando) return;
        const contenedor = document.getElementById('template-editor-container');
        if (!contenedor) return;

        const userId = session?.user?.id;
        if (!userId) { setIaError('Sesión de usuario no válida.'); return; }

        const apiKey = getGeminiApiKey(userId);
        if (!apiKey) { setNecesitaKey(true); setPanelIA(true); return; }

        const contexto = extraerContextoPlanificacion(contenedor);
        if (!desarrolloSuficiente(contexto)) {
            setPanelIA(true);
            setIaError('Escribe primero el desarrollo de tu clase (inicio, desarrollo o cierre) para que la IA pueda analizarlo.');
            return;
        }

        abortRef.current?.abort();
        const controller = new AbortController();
        abortRef.current = controller;

        setPanelIA(true);
        setIaError(null);
        setIaCargando(true);
        setInsertadas(new Set());
        finalizarBrocha();

        try {
            const resultado = await generarSugerenciasPedagogicas(apiKey, contexto, controller.signal);
            setSugerencias(resultado);
        } catch (err: unknown) {
            if ((err as Error)?.name !== 'AbortError') {
                setIaError((err as Error)?.message || 'Error inesperado al generar sugerencias.');
                setSugerencias(null);
            }
        } finally {
            if (abortRef.current === controller) {
                abortRef.current = null;
                setIaCargando(false);
            }
        }
    };

    const handleGuardarApiKeyIA = async () => {
        const userId = session?.user?.id;
        if (!userId || !apiKeyInput.trim()) return;
        saveGeminiApiKey(userId, apiKeyInput);
        setApiKeyInput('');
        setNecesitaKey(false);
        await handleGenerarSugerencias();
    };

    const handleInsertar = (clave: string, sugerencia: CategoriaSugerencia) => {
        activarBrocha(clave, sugerencia);
    };

    if (loading) {
        return (
            <div className="flex h-screen w-screen items-center justify-center bg-slate-50">
                <div className="text-center space-y-3">
                    <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Cargando Planificación...</p>
                </div>
            </div>
        );
    }

    if (!seq) {
        return (
            <div className="flex h-screen w-screen flex-col items-center justify-center bg-slate-50 text-center p-6">
                <h3 className="text-xl font-bold text-slate-900 mb-2">No se encontró la planificación</h3>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-6">El documento solicitado no existe o no tiene permisos para acceder.</p>
                <button
                    onClick={() => navigate('/planificacion')}
                    className="px-6 py-2.5 rounded-xl bg-primary text-white text-xs font-black uppercase tracking-widest shadow-sm hover:opacity-90"
                >
                    Volver a Secuencias
                </button>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-100 bg-(--background) flex flex-col w-full h-full">
            <div className="bg-white border-b border-(--border-soft) px-6 py-4 flex items-center justify-between shrink-0 shadow-sm">
                <div className="flex items-center gap-4">
                    <button
                        type="button"
                        onClick={() => navigate('/planificacion')}
                        className="p-2 rounded-full border border-(--border-soft) text-(--ink-soft) hover:bg-(--linen)/30 transition-all outline-none"
                        title="Volver"
                    >
                        <ArrowLeft size={16} />
                    </button>
                    <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-black uppercase tracking-widest text-(--ink-soft)">Título de la Planificación</label>
                        <input 
                            className="px-3 py-1.5 text-xs font-bold border border-(--border-soft) bg-(--linen)/15 text-(--ink) rounded-lg outline-none focus:border-(--primary) w-72 transition-colors"
                            value={localTitulo}
                            onChange={e => setLocalTitulo(e.target.value)}
                            placeholder="Ej. Unidad 1 - Comprensión lectora"
                        />
                    </div>
                </div>

                <div className="flex items-center gap-6">
                    <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-black uppercase tracking-widest text-(--ink-soft)">Curso Vinculado</label>
                        <select 
                            className="px-3 py-1.5 text-xs font-bold border border-(--border-soft) bg-(--linen)/15 text-(--ink) rounded-lg outline-none focus:border-(--primary) w-64 transition-colors cursor-pointer"
                            value={localCursoId}
                            onChange={e => setLocalCursoId(Number(e.target.value))}
                        >
                            <option value={0}>Selecciona un curso</option>
                            {state.cursos.map(c => <option key={c.id} value={c.id}>{getCursoLabel(c)}</option>)}
                        </select>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={handleGenerarSugerencias}
                            disabled={iaCargando}
                            className={`h-9 px-4 rounded-xl text-xs font-bold uppercase tracking-widest shadow-sm transition-all outline-none flex items-center gap-1.5 disabled:opacity-50 ${iaCargando ? 'bg-(--linen)/40 border border-(--border-soft) text-(--ink-soft)' : 'bg-white border border-(--primary)/40 text-(--primary) hover:bg-(--linen)/30 active:scale-95'}`}
                        >
                            {iaCargando ? <span className="w-3.5 h-3.5 border-2 border-(--primary) border-t-transparent rounded-full animate-spin" /> : <Sparkles size={14} />}
                            {iaCargando ? 'Analizando...' : 'Sugerir mejoras con IA'}
                        </button>
                        <button
                            type="button"
                            onClick={() => window.print()}
                            className="h-9 px-4 rounded-xl bg-white border border-(--border-soft) text-(--ink-soft) text-xs font-bold uppercase tracking-widest shadow-sm hover:bg-(--linen)/30 transition-all outline-none flex items-center gap-1.5"
                        >
                            <Printer size={14} /> Imprimir / PDF
                        </button>
                        <button
                            type="button"
                            onClick={handleSave}
                            disabled={saving}
                            className="h-9 px-5 rounded-xl bg-(--primary) text-white text-xs font-black uppercase tracking-widest shadow-sm hover:opacity-90 active:scale-95 transition-all outline-none flex items-center gap-1.5 disabled:opacity-50"
                        >
                            <Save size={14} /> {saving ? 'Guardando...' : 'Guardar'}
                        </button>
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-(--linen)/20 flex justify-center relative">
                <div className="w-full max-w-6xl bg-white shadow-sm border border-(--border-soft) p-8 rounded-(--radius-md) shrink-0">
                    <div 
                        id="template-editor-container"
                        className="prose prose-slate max-w-none prose-sm w-full"
                        dangerouslySetInnerHTML={{ __html: seq.contenidoHtml }}
                        onClick={handleClicPlantilla}
                        onMouseOver={handleOverPlantilla}
                        onMouseLeave={handleLeavePlantilla}
                    />
                </div>

                {brocha && !celdaPendiente && (
                    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-60 flex items-center gap-3 px-4 py-2.5 rounded-xl bg-(--primary) text-white shadow-2xl">
                        <Paintbrush size={15} />
                        <span className="text-[11px] font-bold uppercase tracking-widest">Brocha activa — haz clic en una celda para insertar</span>
                        <button
                            type="button"
                            onClick={finalizarBrocha}
                            className="ml-1 text-[10px] font-black uppercase tracking-widest underline hover:opacity-80"
                        >
                            Cancelar
                        </button>
                    </div>
                )}

                {celdaPendiente && (
                    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-60 w-[min(92vw,420px)] px-4 py-3 rounded-xl bg-white border border-(--border-soft) shadow-2xl">
                        <p className="text-[11px] font-bold text-(--ink) leading-relaxed mb-2">
                            Este campo ya contiene información. ¿Deseas reemplazarla con la sugerencia de IA?
                        </p>
                        <div className="flex gap-2 justify-end">
                            <button
                                type="button"
                                onClick={() => setCeldaPendiente(null)}
                                className="px-3 py-1.5 rounded-lg border border-(--border-soft) text-[10px] font-black uppercase tracking-widest text-(--ink-soft) hover:bg-(--linen)/30"
                            >
                                Cancelar
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    if (celdaPendiente) aplicarBrocha(celdaPendiente.celda, celdaPendiente.clave, celdaPendiente.texto);
                                }}
                                className="px-3 py-1.5 rounded-lg bg-(--primary) text-white text-[10px] font-black uppercase tracking-widest hover:opacity-90"
                            >
                                Reemplazar
                            </button>
                        </div>
                    </div>
                )}

                {saveSuccess && (
                    <div className="fixed bottom-6 right-6 px-4 py-2 bg-emerald-600 text-white rounded-lg shadow-lg text-xs font-bold uppercase tracking-widest animate-in fade-in slide-in-from-bottom-2 duration-300">
                        Cambios guardados correctamente
                    </div>
                )}

                {panelIA && (
                    <aside className="print:hidden fixed right-0 top-0 bottom-0 w-full sm:w-100 z-50 bg-white border-l border-(--border-soft) shadow-2xl flex flex-col">
                        <div className="px-5 py-4 border-b border-(--border-soft) flex items-center justify-between shrink-0">
                            <div className="flex items-center gap-2">
                                <Sparkles size={16} className="text-(--primary)" />
                                <h3 className="text-xs font-black uppercase tracking-widest text-(--ink)">Asistente pedagógico</h3>
                            </div>
                            <button
                                type="button"
                                onClick={() => setPanelIA(false)}
                                className="p-1.5 rounded-full text-(--ink-soft) hover:bg-(--linen)/40 transition-colors"
                                title="Cerrar"
                            >
                                <X size={16} />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
                            {necesitaKey && (
                                <div className="space-y-2.5 p-4 rounded-xl border border-(--border-soft) bg-(--linen)/20">
                                    <p className="text-[11px] font-bold text-(--ink)">Configura tu API Key de Google Gemini para recibir sugerencias.</p>
                                    <input
                                        type="password"
                                        value={apiKeyInput}
                                        onChange={e => setApiKeyInput(e.target.value)}
                                        placeholder="Ingresa tu clave de Gemini..."
                                        className="w-full px-3 py-2 text-xs font-medium border border-(--border-soft) rounded-lg outline-none focus:border-(--primary)"
                                    />
                                    <button
                                        type="button"
                                        onClick={handleGuardarApiKeyIA}
                                        disabled={!apiKeyInput.trim()}
                                        className="w-full h-8 rounded-lg bg-(--primary) text-white text-[10px] font-black uppercase tracking-widest disabled:opacity-50"
                                    >
                                        Guardar y generar
                                    </button>
                                </div>
                            )}

                            {iaError && (
                                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-[11px] font-bold leading-relaxed">
                                    {iaError}
                                </div>
                            )}

                            {iaCargando && (
                                <div className="flex flex-col items-center justify-center py-12 space-y-3">
                                    <span className="w-8 h-8 border-4 border-(--primary) border-t-transparent rounded-full animate-spin" />
                                    <p className="text-[10px] font-bold text-(--ink-soft) uppercase tracking-widest">Analizando tu planificación...</p>
                                </div>
                            )}

                            {!iaCargando && sugerencias && (
                                <>
                                    {sugerencias.recursos.length > 0 && (
                                        <SeccionSugerencias titulo="Recursos sugeridos" items={sugerencias.recursos} prefijoClave="rec" insertadas={insertadas} onInsertar={handleInsertar} construir={(t): CategoriaSugerencia => ({ tipo: 'recursos', texto: t })} />
                                    )}
                                    {sugerencias.estrategiaInclusiva.length > 0 && (
                                        <SeccionSugerencias titulo="Estrategia inclusiva" items={sugerencias.estrategiaInclusiva} prefijoClave="inc" insertadas={insertadas} onInsertar={handleInsertar} construir={(t): CategoriaSugerencia => ({ tipo: 'estrategia', texto: t })} />
                                    )}
                                    {sugerencias.evidencias.length > 0 && (
                                        <SeccionSugerencias titulo="Evidencias del aprendizaje" items={sugerencias.evidencias} prefijoClave="evi" insertadas={insertadas} onInsertar={handleInsertar} construir={(t): CategoriaSugerencia => ({ tipo: 'evidencia', texto: t })} />
                                    )}
                                    {(sugerencias.evaluacion.tecnica || sugerencias.evaluacion.instrumento || sugerencias.evaluacion.sugerencia) && (
                                        <div className="space-y-2">
                                            <h4 className="text-[10px] font-black uppercase tracking-widest text-(--ink-soft)">Evaluación</h4>
                                            {sugerencias.evaluacion.tecnica && (
                                                <ItemSugerencia texto={`Técnica: ${sugerencias.evaluacion.tecnica}`} insertada={insertadas.has('eva-tec')} onInsertar={() => handleInsertar('eva-tec', { tipo: 'tecnica', texto: sugerencias.evaluacion.tecnica })} />
                                            )}
                                            {sugerencias.evaluacion.instrumento && (
                                                <ItemSugerencia texto={`Instrumento: ${sugerencias.evaluacion.instrumento}`} insertada={insertadas.has('eva-ins')} onInsertar={() => handleInsertar('eva-ins', { tipo: 'instrumento', texto: sugerencias.evaluacion.instrumento })} />
                                            )}
                                            {sugerencias.evaluacion.sugerencia && (
                                                <p className="text-[11px] text-(--ink-soft) italic leading-relaxed pl-3 border-l-2 border-(--border-soft)">
                                                    Sugerencia: {sugerencias.evaluacion.sugerencia}
                                                </p>
                                            )}
                                        </div>
                                    )}
                                    {sugerencias.metacognicion.length > 0 && (
                                        <SeccionSugerencias titulo="Metacognición" items={sugerencias.metacognicion} prefijoClave="met" insertadas={insertadas} onInsertar={handleInsertar} construir={(t): CategoriaSugerencia => ({ tipo: 'metacognicion', texto: t })} />
                                    )}
                                    <p className="text-[10px] text-(--ink-soft)/70 leading-relaxed pt-2 border-t border-(--border-soft)">
                                        Recomendaciones independientes de tu texto original. Inserta solo lo que consideres útil; tu desarrollo no se modifica automáticamente.
                                    </p>
                                </>
                            )}
                        </div>
                    </aside>
                )}
            </div>
        </div>
    );
}
