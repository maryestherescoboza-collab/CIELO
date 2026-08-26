import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Printer, Sparkles, X, Plus } from 'lucide-react';
import type { AppState, Secuencia, Curso } from '../types';
import { useAppStore } from '../store/appStore';
import { getGeminiApiKey, saveGeminiApiKey } from '../lib/aiConfig';
import {
    extraerContextoPlanificacion,
    desarrolloSuficiente,
    generarSugerenciasPedagogicas,
    insertarSugerencia,
    type SugerenciasIA,
    type CategoriaSugerencia
} from '../lib/aiPlanificacion';

interface Props {
    state: AppState;
    onUpdateSecuencia?: (seq: Secuencia) => Promise<void> | void;
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
                        clave={clave}
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
    clave: string;
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
                    title="Insertar en el documento"
                >
                    <Plus size={11} /> Insertar
                </button>
            )}
        </div>
    );
}

export default function PlanificacionDiariaEditor({ state, onUpdateSecuencia }: Props) {
    const { id } = useParams<{ id: string }>();
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
    const [numSesiones, setNumSesiones] = useState(0);
    const [sesionObjetivo, setSesionObjetivo] = useState(0);
    const [insertadas, setInsertadas] = useState<Set<string>>(new Set());
    const [necesitaKey, setNecesitaKey] = useState(false);
    const [apiKeyInput, setApiKeyInput] = useState('');
    const abortRef = useRef<AbortController | null>(null);

    useEffect(() => () => abortRef.current?.abort(), []);

    useEffect(() => {
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
    }, [id, state.secuencias]);

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
            }
        };

        win.removeSession = (btn: HTMLElement) => {
            const block = btn.closest('.session-block');
            if (block) {
                block.remove();
                win.renumberSessions?.();
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

    const handleSave = async () => {
        if (!seq) return;
        const container = document.getElementById('template-editor-container');
        if (!container) return;

        setSaving(true);
        const updatedHtml = container.innerHTML;
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
        setNumSesiones(contexto.sesiones.length);
        setSesionObjetivo(0);

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
        if (insertadas.has(clave)) return;
        const ok = insertarSugerencia(sesionObjetivo, sugerencia);
        if (ok) {
            setInsertadas(prev => new Set(prev).add(clave));
        } else {
            setIaError('No se encontró la celda destino en el documento. Verifica que la sesión exista.');
        }
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
                    />
                </div>

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

                            {!iaCargando && sugerencias && numSesiones > 1 && (
                                <div className="flex items-center gap-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-(--ink-soft) shrink-0">Insertar en:</label>
                                    <select
                                        value={sesionObjetivo}
                                        onChange={e => setSesionObjetivo(Number(e.target.value))}
                                        className="flex-1 px-2 py-1.5 text-xs font-bold border border-(--border-soft) rounded-lg bg-white outline-none focus:border-(--primary) cursor-pointer"
                                    >
                                        {Array.from({ length: numSesiones }, (_, i) => (
                                            <option key={i} value={i}>Sesión {i + 1}</option>
                                        ))}
                                    </select>
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
                                                <ItemSugerencia clave="eva-tec" texto={`Técnica: ${sugerencias.evaluacion.tecnica}`} insertada={insertadas.has('eva-tec')} onInsertar={() => handleInsertar('eva-tec', { tipo: 'tecnica', texto: sugerencias.evaluacion.tecnica })} />
                                            )}
                                            {sugerencias.evaluacion.instrumento && (
                                                <ItemSugerencia clave="eva-ins" texto={`Instrumento: ${sugerencias.evaluacion.instrumento}`} insertada={insertadas.has('eva-ins')} onInsertar={() => handleInsertar('eva-ins', { tipo: 'instrumento', texto: sugerencias.evaluacion.instrumento })} />
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
