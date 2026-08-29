import { useState, useEffect } from 'react';
import { Plus, Trash2, Save, CheckCircle, X, ClipboardCheck, BookMarked, Loader2, ChevronRight, ChevronLeft, Sparkles } from 'lucide-react';
import type { AppState, CriterioCotejo, EvaluacionCotejo, CursoDocente } from '../types';
import { getAsignaturaNombre } from '../constants/asignaturas';
import { CieloPill } from '../components/ui/CieloPill';
import GenerarInstrumentoModal from '../components/evaluacion/GenerarInstrumentoModal';
import { useAppStore } from '../store/appStore';

interface Props {
    state?: AppState;
    currentCourseRole?: CursoDocente;
    onSaveCotejo?: (eval_: Omit<EvaluacionCotejo, 'id'>) => void;
    onUpdateCriterios?: (criterios: CriterioCotejo[], plantillaId?: number | null) => Promise<CriterioCotejo[] | null>;
    onSavePlantilla?: (tipo: 'rubrica' | 'cotejo', nombre: string, datos: Record<string, unknown>) => Promise<boolean>;
    onUpdatePlantilla?: (id: number, patch: { nombre?: string; datos?: Record<string, unknown> }) => Promise<boolean>;
    onDeletePlantilla?: (id: number) => void;
    readOnly?: boolean;
    initialDatos?: { criterios?: CriterioCotejo[]; niveles?: any[] };
}

const NIVELES = [
    { val: 0, label: 'No cumple', pts: 0, color: 'bg-(--danger)' },
    { val: 100, label: 'Logrado', pts: 100, color: 'bg-(--success)' },
];

const COTEJO_COLORES: Record<number, { headerBg: string; cellBg: string }> = {
    100: { headerBg: 'var(--success)', cellBg: 'rgba(122, 141, 105, 0.08)' }, // Logrado
    0: { headerBg: 'var(--danger)', cellBg: 'rgba(231, 54, 60, 0.08)' }, // No cumple
};

import { useSupabaseData } from '../hooks/useSupabaseData';

export default function Cotejo({
    state,
    onSaveCotejo,
    onUpdateCriterios,
    onSavePlantilla,
    onUpdatePlantilla,
    onDeletePlantilla,
    readOnly = false,
    initialDatos,
}: Props) {
    const [selectedCursoId, setSelectedCursoId] = useState(state?.cursos[0]?.id ?? 0);
    const [selectedActId, setSelectedActId] = useState<number | null>(null);
    const [selectedEstId, setSelectedEstId] = useState<number | null>(null);
    const [respuestas, setRespuestas] = useState<Record<number, number | null>>({});
    const [comentarios, setComentarios] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [savedFlash, setSavedFlash] = useState(false);
    const [localNiveles, setLocalNiveles] = useState(NIVELES);
    const [localCriterios, setLocalCriterios] = useState<CriterioCotejo[]>(() =>
        readOnly && initialDatos?.criterios
            ? initialDatos.criterios
            : (state?.criteriosCotejo || [])
    );
    const [newCrit, setNewCrit] = useState({ descripcion: '' });
    const [showAddCrit, setShowAddCrit] = useState(false);
    const [selectedPlantillaId, setSelectedPlantillaId] = useState<number | null>(null);
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const [multiEvaluations, setMultiEvaluations] = useState<Record<number, Record<number, number | null>>>({});
    const [activeCell, setActiveCell] = useState<{ critId: number; val: number } | null>(null);
    const [showGenerarModal, setShowGenerarModal] = useState(false);

    const session = useAppStore(s => s.session);
    const { loadRubricaCotejoData, loadCursoData } = useSupabaseData(true);

    useEffect(() => {
        if (!readOnly) {
            loadRubricaCotejoData();
        }
    }, [readOnly, loadRubricaCotejoData]);

    useEffect(() => {
        if (!readOnly && selectedCursoId) {
            loadCursoData(selectedCursoId);
        }
    }, [selectedCursoId, readOnly, loadCursoData]);

    useEffect(() => {
        if (readOnly && initialDatos?.criterios) {
            setLocalCriterios(initialDatos.criterios);
        }
        if (readOnly && initialDatos?.niveles) {
            setLocalNiveles(initialDatos.niveles);
        }
    }, [readOnly, initialDatos]);

    // Effect to load existing data from cursoDetalle
    useEffect(() => {
        if (selectedEstId && selectedActId && state) {
            const inProgress = multiEvaluations[selectedEstId];
            if (inProgress) {
                setRespuestas(inProgress);
                return;
            }

            const existing = state.cursoDetalle.find(cd =>
                cd.estudianteId === selectedEstId &&
                cd.actividadId === selectedActId
            );
            if (existing) {
                const mappedRespuestas: Record<number, number | null> = {};
                if (existing.cotejoData) {
                    Object.entries(existing.cotejoData).forEach(([k, v]) => {
                        mappedRespuestas[Number(k)] = v as number;
                    });
                }
                setRespuestas(mappedRespuestas);
                setComentarios(Array.isArray(existing.observaciones) ? existing.observaciones.join('\n') : (existing.observaciones || ''));
            } else {
                setRespuestas({});
                setComentarios('');
            }
        }
    }, [selectedEstId, selectedActId, selectedPlantillaId, state?.cursoDetalle, multiEvaluations]);

    const selectedCurso = state?.cursos.find(c => c.id === selectedCursoId);
    const actividades = state?.actividades.filter(a => 
        (a.cursoId === selectedCursoId || 
         (selectedCurso?.sharedCourseId && a.sharedCourseId === selectedCurso.sharedCourseId)) &&
        (a.userId === session?.user?.id || !a.userId)
    ) || [];
    const estudiantes = state?.estudiantes.filter(e => 
        e.cursoId === selectedCursoId || 
        (selectedCurso?.sharedCourseId && e.sharedCourseId === selectedCurso.sharedCourseId)
    ) || [];
    const sortedEsts = [...estudiantes].sort((a, b) => {
        const numA = a.numeroLista || 0;
        const numB = b.numeroLista || 0;
        if (numA !== numB) return numA - numB;
        return (a.apellido + a.nombre).localeCompare(b.apellido + b.nombre);
    });
    const cotejoPlantillas = state?.plantillas.filter(p =>
        p.tipo === 'cotejo' && p.userId === session?.user?.id
    ) || [];
    const LIMITE_PLANTILLAS = 10;
    const selectedEst = estudiantes.find(e => e.id === selectedEstId) ?? null;
    const selectedAct = actividades.find(a => a.id === selectedActId) ?? null;

    function aplicarCotejoIA(criterios: CriterioCotejo[]) {
        setLocalCriterios(criterios);
        setLocalNiveles(NIVELES);
        setSelectedPlantillaId(null);
        setSavedFlash(true);
        setTimeout(() => setSavedFlash(false), 2000);
    }

    function calcPuntajeWithRespuestas(res: Record<number, number | null>): number {
        const answered = Object.values(res).filter(v => v !== null && v !== undefined) as number[];
        if (!answered.length || !localCriterios.length) return 0;
        const total = answered.reduce((a, b) => a + (localNiveles.find(n => n.val === b)?.pts ?? 0), 0);
        return Math.round(total / localCriterios.length);
    }

    async function handleSave() {
        if (!selectedEst || !selectedAct || isSaving) return;
        setIsSaving(true);
        setSavedFlash(false);

        try {
            const puntaje = calcPuntajeWithRespuestas(respuestas);
            if (onSaveCotejo) {
                await onSaveCotejo({
                    estudianteId: selectedEst.id,
                    actividadId: selectedAct.id,
                    cursoId: selectedCursoId,
                    fecha: new Date().toISOString().split('T')[0],
                    respuestas, comentarios, puntaje,
                    plantillaId: selectedPlantillaId
                });
            }
            if (onUpdateCriterios) {
                const saved = await onUpdateCriterios(localCriterios, selectedPlantillaId);
                if (saved) {
                    setLocalCriterios(saved);
                }
            }

            setSavedFlash(true);
            setTimeout(() => setSavedFlash(false), 2200);
            setRespuestas({});
            setComentarios('');
        } catch (error) {
            console.error('Error saving cotejo:', error);
            alert('No se pudo guardar la evaluación. Intente de nuevo.');
        } finally {
            setIsSaving(false);
        }
    }

    async function handleFinalizeGroupEvaluation() {
        const studentIds = Object.keys(multiEvaluations).map(Number);
        if (studentIds.length === 0 || !selectedAct || isSaving) return;

        setIsSaving(true);
        try {
            for (const estId of studentIds) {
                const res = multiEvaluations[estId] || (estId === selectedEstId ? respuestas : {});
                const puntaje = calcPuntajeWithRespuestas(res);
                if (onSaveCotejo) {
                    await onSaveCotejo({
                        estudianteId: estId,
                        actividadId: selectedAct.id,
                        cursoId: selectedCursoId,
                        fecha: new Date().toISOString().split('T')[0],
                        respuestas: res,
                        comentarios: undefined,
                        puntaje,
                        plantillaId: selectedPlantillaId
                    });
                }
            }
            if (onUpdateCriterios) {
                const saved = await onUpdateCriterios(localCriterios, selectedPlantillaId);
                if (saved) {
                    setLocalCriterios(saved);
                }
            }

            setSavedFlash(true);
            setTimeout(() => setSavedFlash(false), 2200);
            setMultiEvaluations({});
            setRespuestas({});
            setActiveCell(null);
        } catch (error) {
            console.error('Error in multi-student cotejo save:', error);
        } finally {
            setIsSaving(false);
        }
    }


    const puntajeActual = calcPuntajeWithRespuestas(respuestas);

    function handleSelectCell(critId: number, val: number) {
        if (!selectedAct) return;

        if (activeCell?.critId === critId && activeCell.val === val) {
            setActiveCell(null);
        } else {
            setActiveCell({ critId, val });
        }
    }

    function handleAvatarClick(estId: number) {
        if (!selectedAct) return;

        setSelectedEstId(estId);

        if (activeCell) {
            let cleanedForStudent: Record<number, number | null> = {};

            setMultiEvaluations(prev => {
                const current = prev[estId] || {};
                const isAlreadyInThisLevel = current[activeCell.critId] === activeCell.val;
                const nextForStudent = {
                    ...current,
                    [activeCell.critId]: isAlreadyInThisLevel ? null : activeCell.val
                };

                cleanedForStudent = {};
                Object.entries(nextForStudent).forEach(([key, value]) => {
                    if (value !== null && value !== undefined) {
                        cleanedForStudent[Number(key)] = value;
                    }
                });

                return { ...prev, [estId]: cleanedForStudent };
            });

            setRespuestas(cleanedForStudent);
            return;
        }

        const existingEval = multiEvaluations[estId];
        if (existingEval) {
            setRespuestas(existingEval);
        }
    }

    const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);

    useEffect(() => {
        const handleCloseMenu = () => setContextMenu(null);
        window.addEventListener('click', handleCloseMenu);
        return () => window.removeEventListener('click', handleCloseMenu);
    }, []);

    useEffect(() => {
        if (readOnly) return;
        const handleGlobalPaste = (e: ClipboardEvent) => {
            const activeEl = document.activeElement;
            const isInput = activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA');
            const text = e.clipboardData?.getData('text') || '';
            if (!text) return;
            const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
            if (isInput && lines.length <= 1 && !text.includes('\t') && !text.includes('|')) {
                return;
            }
            e.preventDefault();
            const rows = lines.map(line => {
                if (line.includes('|')) {
                    const cells = line.split('|').map(c => c.trim());
                    if (cells[0] === '') cells.shift();
                    if (cells[cells.length - 1] === '') cells.pop();
                    return cells;
                } else {
                    return line.split('\t').map(c => c.trim());
                }
            });
            const cleanRows = rows.filter(row => {
                if (row.length === 0) return false;
                const isDivider = row.every(cell => /^[:-]+$/.test(cell));
                return !isDivider;
            });
            if (cleanRows.length === 0) return;
            let startIndex = 0;
            const isTable = cleanRows.some(r => r.length > 1);
            if (isTable) {
                startIndex = 1;
            }
            const newIndicators: string[] = [];
            for (let i = startIndex; i < cleanRows.length; i++) {
                const row = cleanRows[i];
                const textContent = row[0];
                if (textContent) {
                    newIndicators.push(textContent);
                }
            }
            if (newIndicators.length > 0) {                setLocalCriterios(prev => {
                    let nextId = Math.min(0, ...prev.map(c => c.id)) - 1;
                    const added = newIndicators.map(text => {
                        const id = nextId--;
                        return { id, titulo: text, descripcion: text };
                    });
                    return [...prev, ...added];
                });
            }
        };
        window.addEventListener('paste', handleGlobalPaste);
        return () => window.removeEventListener('paste', handleGlobalPaste);
    }, [readOnly]);
 
    function handleInsertRowAfter(critId: number) {
        setLocalCriterios(prev => {
            const index = prev.findIndex(c => c.id === critId);
            if (index === -1) return prev;
            const newId = Math.min(0, ...prev.map(c => c.id)) - 1;
            const newCrit = { id: newId, titulo: '', descripcion: '' };
            const next = [...prev];
            next.splice(index + 1, 0, newCrit);
            return next;
        });
    }

    async function handlePaste() {
        try {
            const text = await navigator.clipboard.readText();
            if (!text) return;
            const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
            const rows = lines.map(line => {
                if (line.includes('|')) {
                    const cells = line.split('|').map(c => c.trim());
                    if (cells[0] === '') cells.shift();
                    if (cells[cells.length - 1] === '') cells.pop();
                    return cells;
                } else {
                    return line.split('\t').map(c => c.trim());
                }
            });

            const cleanRows = rows.filter(row => {
                if (row.length === 0) return false;
                const isDivider = row.every(cell => /^[:-]+$/.test(cell));
                return !isDivider;
            });

            if (cleanRows.length === 0) return;

            let startIndex = 0;
            const isTable = cleanRows.some(r => r.length > 1);
            if (isTable) {
                startIndex = 1;
            }

            const newIndicators: string[] = [];
            for (let i = startIndex; i < cleanRows.length; i++) {
                const row = cleanRows[i];
                const textContent = row[0];
                if (textContent) {
                    newIndicators.push(textContent);
                }
            }

            if (newIndicators.length > 0) {
                setLocalCriterios(prev => {
                    let maxId = Math.max(0, ...prev.map(c => c.id));
                    const added = newIndicators.map(text => {
                        maxId++;
                        return { id: maxId, titulo: text, descripcion: text };
                    });
                    return [...prev, ...added];
                });
            }
        } catch (err) {
            console.error('Failed to paste indicators:', err);
        } finally {
            setContextMenu(null);
        }
    }

    return (
        <div className="flex flex-col md:flex-row h-full overflow-hidden bg-base-creme">
            {!readOnly && (
                <aside className={`shrink-0 transition-all duration-300 ${isSidebarCollapsed ? 'w-16' : 'w-72'} min-h-screen border-r border-slate-200 sidebar-artisan-white overflow-hidden relative flex flex-col`}>
                    <button
                        onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                        className="absolute top-4 -right-1 z-50 p-1.5 bg-primary text-white rounded-l-lg hover:opacity-90 transition-all shadow-md"
                    >
                        {isSidebarCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
                    </button>

                    {!isSidebarCollapsed ? (
                        <div className="flex flex-col h-full overflow-y-auto relative z-10">
                            <div className="p-5 border-b border-slate-250 flex items-center gap-2.5">
                                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-white">
                                    <ClipboardCheck size={18} />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-xs font-black uppercase tracking-widest text-[#2E3330]">Instrumento</p>
                                    <h1 className="text-lg font-black text-[#2E3330] truncate font-notion-title">Lista de Cotejo</h1>
                                </div>
                            </div>

                            <div className="p-4 space-y-4 flex-1">
                                <div className="space-y-4">
                                    <div className="space-y-3">
                                        <div className="px-1">
                                            <p className="text-xs font-black uppercase tracking-widest text-[#2E3330] mb-0.5">Contexto</p>
                                            <p className="text-xs font-medium text-[#2E3330]/80">Configura el entorno de evaluación.</p>
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold text-[#2E3330] uppercase block mb-1">Curso / Grado</label>
                                            <select
                                                data-guide="selector-curso"
                                                className="w-full bg-base-creme border border-slate-350 rounded-full px-4 py-2 text-xs font-bold text-[#2E3330] outline-none transition-all cursor-pointer focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20 shadow-sm artisan-pill artisan-btn-white"
                                                value={selectedCursoId}
                                                onChange={e => { setSelectedCursoId(Number(e.target.value)); setSelectedActId(null); setSelectedEstId(null); }}
                                            >
                                                {state?.cursos.map(c => <option key={c.id} value={c.id}>{c.grado} {c.seccion} - {getAsignaturaNombre(c.asignatura)}</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold text-[#2E3330] uppercase block mb-1">Actividad</label>
                                            <select
                                                data-guide="selector-actividad"
                                                className="w-full bg-base-creme border border-slate-350 rounded-full px-4 py-2 text-xs font-bold text-[#2E3330] outline-none transition-all cursor-pointer focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20 shadow-sm artisan-pill artisan-btn-white"
                                                value={selectedAct?.id ?? ''}
                                                onChange={e => setSelectedActId(Number(e.target.value) || null)}
                                            >
                                                <option value="">Seleccionar actividad...</option>
                                                {actividades.map(a => <option key={a.id} value={a.id}>{a.nombre} ({a.periodo})</option>)}
                                            </select>
                                        </div>
                                    </div>

                                    <div className="h-px bg-slate-200" />

                                    <div className="space-y-3">
                                        <div className="px-1 flex items-center justify-between">
                                            <p className="text-xs font-black uppercase tracking-widest text-[#2E3330]">Plantillas</p>
                                            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">{cotejoPlantillas.length} de {LIMITE_PLANTILLAS}</span>
                                        </div>
                                        <div className="space-y-2">
                                            <div className="flex items-center gap-2 border border-slate-350 rounded-full px-4 py-2 bg-base-creme focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 transition-all shadow-sm artisan-pill artisan-btn-white">
                                                <BookMarked size={14} className="text-[#2E3330]" />
                                                <select
                                                    data-guide="selector-plantilla"
                                                    className="flex-1 bg-transparent text-xs font-bold outline-none text-[#2E3330] cursor-pointer"
                                                    value={selectedPlantillaId ?? ''}
                                                    onChange={e => {
                                                        const val = e.target.value;
                                                        if (!val) {
                                                            setSelectedPlantillaId(null);
                                                            setLocalCriterios(state?.criteriosCotejo || []);
                                                            setLocalNiveles(NIVELES);
                                                            return;
                                                        }
                                                        const found = cotejoPlantillas.find(p => p.id === Number(val));
                                                        if (!found) return;
                                                        const data = found.datos as Record<string, unknown>;
                                                        if (data.criterios) setLocalCriterios(data.criterios as CriterioCotejo[]);
                                                        if (data.niveles) setLocalNiveles(data.niveles as typeof NIVELES);
                                                        setSelectedPlantillaId(found.id);
                                                    }}
                                                >
                                                    <option value="">Evaluación Base</option>
                                                    {cotejoPlantillas.map(p => (
                                                        <option key={p.id} value={p.id}>{p.nombre}</option>
                                                    ))}
                                                </select>
                                                {selectedPlantillaId && (
                                                    <button
                                                        onClick={() => {
                                                            const actual = cotejoPlantillas.find(p => p.id === selectedPlantillaId);
                                                            if (window.confirm(`¿Eliminar la plantilla "${actual?.nombre ?? ''}"? Tus evaluaciones y calificaciones históricas NO se afectan.`) && onDeletePlantilla) {
                                                                onDeletePlantilla(selectedPlantillaId);
                                                                setSelectedPlantillaId(null);
                                                                setLocalCriterios(state?.criteriosCotejo || []);
                                                                setLocalNiveles(NIVELES);
                                                            }
                                                        }}
                                                        className="p-1.5 hover:bg-red-50 rounded-lg text-red-500 transition-all ml-1 outline-none focus-visible:ring-2 focus-visible:ring-red-400"
                                                        title="Eliminar plantilla"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                )}
                                            </div>
                                            <button
                                                data-guide="btn-guardar-plantilla"
                                                onClick={async () => {
                                                    const nombre = prompt('Nombre de la plantilla de cotejo:');
                                                    if (nombre?.trim() && onSavePlantilla) {
                                                        const ok = await onSavePlantilla('cotejo', nombre.trim(), { criterios: localCriterios, niveles: localNiveles });
                                                        if (ok) {
                                                            setSavedFlash(true);
                                                            setTimeout(() => setSavedFlash(false), 2000);
                                                        }
                                                    }
                                                }}
                                                className="w-full bg-base-creme border border-slate-300 text-[#2E3330] font-black uppercase tracking-widest text-xs py-2 rounded-full hover:bg-slate-50 transition-all outline-none focus-visible:ring-2 focus-visible:ring-slate-400 shadow-sm artisan-pill artisan-btn-white"
                                            >
                                                Guardar como Plantilla
                                            </button>
                                            {selectedPlantillaId !== null && (
                                                <button
                                                    onClick={async () => {
                                                        const actual = cotejoPlantillas.find(p => p.id === selectedPlantillaId);
                                                        if (!actual || !onUpdatePlantilla) return;
                                                        const nombre = prompt('Nuevo nombre de la plantilla:', actual.nombre);
                                                        if (nombre === null) return;
                                                        if (!confirm(`¿Actualizar "${actual.nombre}" con el contenido actual del editor? Las evaluaciones ya realizadas no se modifican.`)) return;
                                                        let finalCriterios = localCriterios;
                                                        if (onUpdateCriterios) {
                                                            const saved = await onUpdateCriterios(localCriterios, selectedPlantillaId);
                                                            if (saved) {
                                                                finalCriterios = saved;
                                                                setLocalCriterios(saved);
                                                            }
                                                        }
                                                        const ok = await onUpdatePlantilla(selectedPlantillaId, {
                                                            nombre: nombre.trim() || actual.nombre,
                                                            datos: { criterios: finalCriterios, niveles: localNiveles },
                                                        });
                                                        if (ok) {
                                                            setSavedFlash(true);
                                                            setTimeout(() => setSavedFlash(false), 2000);
                                                        } else {
                                                            alert('No se pudo actualizar la plantilla.');
                                                        }
                                                    }}
                                                    className="w-full bg-base-creme border border-primary/30 text-primary font-black uppercase tracking-wider text-[11px] py-2 rounded-full hover:bg-[#E8F0F8] transition-all outline-none focus-visible:ring-2 focus-visible:ring-primary/30 shadow-sm"
                                                >
                                                    Actualizar seleccionada
                                                </button>
                                            )}
                                            <button
                                                data-guide="btn-generar-ia"
                                                onClick={() => setShowGenerarModal(true)}
                                                className="w-full bg-primary border border-primary/40 text-[#2E3330] font-black uppercase tracking-widest text-xs py-2 rounded-full hover:opacity-90 transition-all outline-none focus-visible:ring-2 focus-visible:ring-primary/40 shadow-sm artisan-pill flex items-center justify-center gap-1.5"
                                                title="Generar criterios con IA a partir del contexto del curso y la actividad"
                                            >
                                                <Sparkles size={13} />
                                                Generar con IA
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="p-5 border-t border-slate-200">
                                <button
                                    onClick={() => setShowAddCrit(true)}
                                    className="w-full bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 py-2.5 flex items-center justify-center gap-2 font-black text-xs uppercase tracking-widest transition-all rounded-xl"
                                >
                                    <Plus size={14} />
                                    Nuevo Criterio
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center py-6 gap-4 relative z-10">
                            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#1E293B] text-white shadow-sm">
                                <ClipboardCheck size={20} />
                            </div>
                            <div className="h-px w-8 bg-slate-200" />
                            <div className="flex flex-col gap-3">
                                <button onClick={() => setIsSidebarCollapsed(false)} className="p-2.5 hover:bg-slate-100 rounded-xl transition-all text-slate-500" title="Plantillas">
                                    <BookMarked size={18} />
                                </button>
                                <button onClick={() => setShowAddCrit(true)} className="p-2.5 hover:bg-slate-100 rounded-xl transition-all text-slate-500" title="Nuevo Criterio">
                                    <Plus size={18} />
                                </button>
                            </div>
                        </div>
                    )}
                </aside>
            )}

            <main className="flex-1 overflow-y-auto px-3 py-3 md:px-5 scroll-smooth scrollbar-hide">
                <div className="max-w-350 mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 fill-mode-both space-y-1.5">
                    <div className="flex flex-wrap items-center justify-between gap-8 pb-3">
                        <div>
                            <h1 className="text-4xl font-black text-[#1E293B] tracking-tight mb-3 font-notion-title">
                                {readOnly ? 'Vista Previa de Lista de Cotejo' : 'Lista de Cotejo'}
                            </h1>
                            <div className="flex items-center gap-4">
                                <CieloPill variant="neutral" uppercase className="px-4 text-black" style={{ backgroundColor: '#DDD5C8', borderColor: '#DDD5C8', color: '#000000' }}>
                                    Registro de Logros
                                </CieloPill>
                                <div className="h-1.5 w-1.5 rounded-full bg-slate-400"></div>
                                <span className="text-xs font-black text-slate-500 uppercase tracking-[0.2em]">Verificación de Competencias</span>
                            </div>
                        </div>

                        {!readOnly && (
                            <div className="flex items-center gap-3">
                                {selectedEst && (
                                    <div className="flex bg-white border border-slate-200 rounded-[16px] px-4 py-2.5 items-center gap-4 shadow-sm">
                                        <div className="flex flex-col items-center">
                                            <p className="text-xs font-black uppercase tracking-widest text-slate-400">
                                                Puntaje Actual
                                            </p>
                                            <p className="mt-0.5 text-xl font-black tracking-tighter text-[#1E293B]">
                                                {puntajeActual}
                                                <span className="ml-1 text-xs font-bold text-slate-400">/100</span>
                                            </p>
                                        </div>
                                        <div className="h-8 w-px bg-slate-200" />
                                        <div className="flex items-center gap-3">
                                            <div
                                                className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-black text-white shadow-sm"
                                                style={{ background: selectedEst.avatarColor }}
                                            >
                                                {selectedEst.nombre[0]}
                                            </div>
                                            <div className="flex flex-col">
                                                <p className="text-xs font-black uppercase tracking-widest text-slate-400">Estudiante</p>
                                                <span className="text-xs font-black uppercase tracking-widest text-[#1E293B]">
                                                    {selectedEst.nombre} {selectedEst.apellido}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {activeCell && (
                                    <div className="flex bg-slate-50 border border-slate-200 rounded-[16px] px-4 py-2.5 items-center gap-3 shadow-sm animate-pulse">
                                        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary text-white shadow-sm">
                                            <Plus size={16} />
                                        </div>
                                        <div className="flex flex-col">
                                            <p className="text-xs font-black uppercase tracking-widest text-slate-400">Asignando Nivel</p>
                                            <span className="text-xs font-black uppercase tracking-widest text-[#1E293B]">
                                                {localCriterios.find(c => c.id === activeCell.critId)?.descripcion?.substring(0, 20)}...
                                            </span>
                                        </div>
                                        <button
                                            onClick={() => setActiveCell(null)}
                                            className="ml-1 text-xs font-black text-(--danger) uppercase tracking-widest hover:underline transition-all"
                                        >
                                            Cancelar
                                        </button>
                                    </div>
                                )}

                                <CieloPill
                                    as="button"
                                    id="btn-evaluar-alumnos"
                                    onClick={Object.keys(multiEvaluations).length > 0 ? handleFinalizeGroupEvaluation : handleSave}
                                    variant={((!selectedEst && Object.keys(multiEvaluations).length === 0) || !selectedAct || isSaving) ? 'disabled' : 'primary'}
                                    disabled={(!selectedEst && Object.keys(multiEvaluations).length === 0) || !selectedAct || isSaving}
                                    className="px-5 gap-2.5 h-12 shadow-sm"
                                >
                                    {isSaving ? <Loader2 size={16} className="animate-spin" /> : (savedFlash ? <CheckCircle size={18} /> : <Save size={18} />)}
                                    <span className="uppercase tracking-widest text-[12px]">
                                        {savedFlash ? '¡Registrada!' : Object.keys(multiEvaluations).length > 1 ? `Evaluar ${Object.keys(multiEvaluations).length} Alumnos` : 'Finalizar Evaluación'}
                                    </span>
                                </CieloPill>
                            </div>
                        )}
                    </div>

                    {!readOnly && (
                        <div className="sticky top-0 z-30 bg-(--background)/95 backdrop-blur-md pb-1.5 pt-1 space-y-2">
                            <div className="w-full space-y-3">
                                <div className="px-1 flex items-center justify-between">
                                    <div className="flex items-center gap-3">


                                    </div>
                                    {selectedAct && (
                                        <CieloPill variant="primary" uppercase className="px-3 bg-white text-(--primary) shadow-sm tracking-[0.16em]">
                                            Actividad: {selectedAct.nombre} ({selectedAct.periodo})
                                        </CieloPill>
                                    )}
                                </div>

                                <div className="w-full bg-white rounded-(--radius-md) p-2 border border-(--border-soft) shadow-sm">
                                    <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide py-1 px-2.5">
                                        {sortedEsts.map((est, idx) => {
                                            const isSel = selectedEstId === est.id;
                                            const numInvolved = multiEvaluations[est.id] ? Object.keys(multiEvaluations[est.id]).length : 0;
                                            const isInActiveCell = activeCell ? multiEvaluations[est.id]?.[activeCell.critId] === activeCell.val : false;

                                            return (
                                                <button
                                                    key={est.id}
                                                    data-guide="seleccionar-estudiantes"
                                                    onClick={() => handleAvatarClick(est.id)}
                                                    className="flex min-w-12 flex-col items-center gap-1.5 outline-none group relative"
                                                >
                                                    <div
                                                        className={`flex h-10 w-10 items-center justify-center rounded-full text-[12px] font-black text-white transition-all ring-offset-2 ${isSel
                                                            ? 'scale-105 ring-2 ring-(--primary) shadow-lg'
                                                            : 'opacity-50 grayscale hover:scale-105 hover:opacity-100 hover:grayscale-0'
                                                            } ${isInActiveCell ? 'ring-2 ring-(--primary) opacity-100 grayscale-0 ring-offset-2 scale-105' : ''}`}
                                                        style={{ background: est.avatarColor }}
                                                    >
                                                        {est.nombre[0]}
                                                        {numInvolved > 0 && (
                                                            <div className="absolute -top-1 -right-1 bg-green-500 text-white text-[7px] h-3.5 w-3.5 rounded-full flex items-center justify-center font-black border border-white">
                                                                {numInvolved}
                                                            </div>
                                                        )}
                                                        {isInActiveCell && (
                                                            <div className="absolute -bottom-1 -right-1 bg-(--primary) text-white h-4.5 w-4.5 rounded-full flex items-center justify-center border border-white shadow-sm">
                                                                <CheckCircle size={9} />
                                                            </div>
                                                        )}
                                                    </div>
                                                    <span
                                                        className={`text-center text-xs font-black uppercase tracking-[0.14em] transition-colors ${isSel || isInActiveCell ? 'text-(--ink)' : 'text-(--ink-soft)'
                                                            }`}
                                                    >
                                                        {idx + 1}. {est.nombre.split(' ')[0]}
                                                    </span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="w-full rounded-(--radius-lg) border border-(--border-soft) bg-white shadow-sm overflow-hidden">
                        <table
                            onContextMenu={(e) => {
                                if (readOnly) return;
                                e.preventDefault();
                                setContextMenu({
                                    x: e.clientX,
                                    y: e.clientY
                                });
                            }}
                            className="table-compact w-full border-collapse font-['Inter',sans-serif] text-[16px]"
                        >
                            <thead>
                                <tr className="border-b border-(--border-soft) bg-(--linen)/45 text-(--ink)">
                                    <th className="w-[76%] border-r border-(--border-soft) px-4 py-1.5 text-left align-middle text-[16px] font-bold">
                                        Indicadores de Logro
                                    </th>
                                    {localNiveles.map(n => {
                                        const colors = COTEJO_COLORES[n.val] || { headerBg: '', cellBg: '' };
                                        return (
                                            <th
                                                key={n.val}
                                                className="w-[10%] border-r border-(--border-soft) px-2 py-1.5 text-center align-middle last:border-r-0"
                                                style={{ backgroundColor: colors.headerBg }}
                                            >
                                                <div className="flex flex-col items-center justify-center gap-1">
                                                    <span className="w-full text-center text-[16px] font-bold text-white block">
                                                        {n.label} ({n.pts} pts)
                                                    </span>
                                                </div>
                                            </th>
                                        );
                                    })}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-(--border-soft)/50">
                                {localCriterios.length === 0 ? (
                                    <tr>
                                        <td colSpan={localNiveles.length + 1} className="py-20 text-center">
                                            <button
                                                onClick={() => {
                                                    if (readOnly) return;
                                                    const id = Math.min(0, ...localCriterios.map(c => c.id)) - 1;
                                                    setLocalCriterios([{ id, titulo: '', descripcion: '' }]);
                                                }}
                                                className="flex flex-col items-center gap-2 mx-auto focus:outline-none hover:opacity-85 transition-all select-none cursor-pointer group"
                                            >
                                                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-(--linen)/20 text-(--ink-soft) group-hover:bg-(--linen)/45 transition-all shadow-sm">
                                                    <Plus size={24} />
                                                </div>
                                                <p className="text-[16px] font-bold text-(--ink) mt-2">No hay criterios definidos</p>
                                                <p className="text-xs text-(--ink-soft)">Haga clic para crear una fila.</p>
                                            </button>
                                        </td>
                                    </tr>
                                ) : localCriterios.map(crit => (
                                    <tr key={crit.id} className="group hover:bg-(--linen)/10 transition-colors">
                                        <td className="px-4 py-1.5 align-middle border-r border-(--border-soft)">
                                            <div className="space-y-2 table-stack-tight">
                                                {readOnly ? (
                                                    <div className="text-left space-y-1">
                                                        <p className="text-[16px] font-medium text-(--ink)">{crit.descripcion}</p>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center gap-2 relative w-full">
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleInsertRowAfter(crit.id);
                                                            }}
                                                            className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-(--primary) hover:text-(--primary)/80 text-xl font-bold select-none px-1"
                                                            title="Insertar indicador"
                                                        >
                                                            +
                                                        </button>
                                                        <textarea
                                                            data-guide="criterio-cotejo"
                                                            className="flex-1 bg-transparent outline-none text-[16px] font-medium text-(--ink) resize-none h-12 scrollbar-hide text-left"
                                                            placeholder="Descripción del indicador..."
                                                            value={crit.descripcion}
                                                            onChange={e => {
                                                                const descVal = e.target.value;
                                                                setLocalCriterios(prev => prev.map(c => c.id === crit.id ? { ...c, titulo: descVal, descripcion: descVal } : c));
                                                            }}
                                                        />
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setLocalCriterios(p => p.filter(c => c.id !== crit.id));
                                                            }}
                                                            className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-(--danger) hover:text-(--danger)/80 text-xl font-bold select-none px-1"
                                                            title="Eliminar indicador"
                                                        >
                                                            ×
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        {localNiveles.map(n => {
                                            const isSelected = respuestas[crit.id] === n.val;
                                            const isActive = activeCell?.critId === crit.id && activeCell.val === n.val;
                                            const studentsInCell = sortedEsts.map((s, i) => ({ s, i: i + 1 }))
                                                .filter(({ s }) => multiEvaluations[s.id]?.[crit.id] === n.val);
                                            const colors = COTEJO_COLORES[n.val] || { headerBg: '', cellBg: '' };

                                            return (
                                                <td
                                                    key={n.val}
                                                    data-guide="celda-cotejo"
                                                    className={`px-2 py-1 align-middle text-center border-r border-(--border-soft) last:border-r-0 ${readOnly ? 'cursor-default' : 'cursor-pointer'} transition-colors relative
                                                        ${isSelected ? 'after:absolute after:inset-0 after:border-2 after:border-(--ink)' : readOnly ? '' : 'hover:bg-(--linen)/10'}
                                                        ${isActive ? 'ring-2 ring-inset ring-(--primary) shadow-inner' : ''}`}
                                                    style={{ backgroundColor: colors.cellBg }}
                                                    onClick={() => {
                                                        if (readOnly) return;
                                                        handleSelectCell(crit.id, n.val);
                                                    }}
                                                >
                                                    <div className="flex flex-col items-center justify-center gap-1 min-h-16">
                                                        {!readOnly && studentsInCell.length > 0 && (
                                                            <div className="flex flex-wrap items-center justify-center gap-0.5 max-w-18">
                                                                {studentsInCell.map(({ s, i }) => (
                                                                    <div
                                                                        key={s.id}
                                                                        title={`${s.nombre} ${s.apellido}`}
                                                                        className="w-4 h-4 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-sm"
                                                                        style={{ background: s.avatarColor }}
                                                                    >
                                                                        {i}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}

                                                        <button
                                                            onClick={(e) => {
                                                                if (readOnly) return;
                                                                e.stopPropagation();
                                                                handleSelectCell(crit.id, n.val);
                                                            }}
                                                            className={`w-8 h-8 rounded-full transition-all border-2 flex items-center justify-center group-option ${isSelected ? `${n.color} border-white shadow-xl scale-105` : 'border-transparent bg-(--linen)/20 hover:bg-(--linen)/50'}`}
                                                        >
                                                            {isSelected && <CheckCircle size={14} className="text-white" />}
                                                        </button>
                                                    </div>
                                                </td>
                                            );
                                        })}

                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </main>

            {!readOnly && showAddCrit && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-(--ink)/20 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setShowAddCrit(false)}>
                    <div className="w-full max-w-md bg-white rounded-(--radius-lg) shadow-md overflow-hidden animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                        <div className="p-6 border-b border-(--border-soft) flex items-center justify-between">
                            <h2 className="text-lg font-black text-(--ink) font-notion-title">Añadir Indicador</h2>
                            <button onClick={() => setShowAddCrit(false)} className="p-2 hover:bg-(--linen)/20 rounded-xl transition-all text-(--ink-soft) cursor-pointer"><X size={20} /></button>
                        </div>
                        <div className="p-6 space-y-5">
                            <div className="space-y-2">
                                <label className="text-xs font-black uppercase tracking-widest text-(--ink-soft)">Descripción del Criterio</label>
                                <textarea
                                    className="w-full bg-white border border-(--border-soft) rounded-(--radius-sm) px-4 py-3 text-xs font-medium text-(--ink) min-h-25 outline-none transition-all focus-visible:border-(--primary) focus-visible:ring-2 focus-visible:ring-(--primary)/50"
                                    placeholder="Detalle el criterio de observación..."
                                    value={newCrit.descripcion}
                                    onChange={e => setNewCrit({ ...newCrit, descripcion: e.target.value })}
                                />
                            </div>
                        </div>
                        <div className="p-6 bg-(--linen)/10 flex gap-4 border-t border-(--border-soft)">
                            <button className="flex-1 bg-white border border-(--border-soft) text-(--ink-soft) hover:bg-(--linen)/20 rounded-xl py-3 text-xs font-black uppercase tracking-widest transition-all outline-none focus-visible:ring-2 focus-visible:ring-slate-400 cursor-pointer" onClick={() => setShowAddCrit(false)}>Cancelar</button>
                            <button className="flex-1 bg-(--primary) text-white hover:opacity-90 rounded-full py-3 text-xs font-black uppercase tracking-widest transition-all shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-(--primary)/50 hover:-translate-y-0.5 active:scale-95 cursor-pointer" onClick={() => {
                                if (newCrit.descripcion.trim()) {
                                    const id = Math.min(0, ...localCriterios.map(c => c.id)) - 1;
                                    setLocalCriterios([...localCriterios, { id, titulo: newCrit.descripcion.trim(), descripcion: newCrit.descripcion.trim() }]);
                                    setShowAddCrit(false);
                                    setNewCrit({ descripcion: '' });
                                }
                            }}>Confirmar</button>
                        </div>
                    </div>
                </div>
            )}
            {contextMenu && (
                <div
                    className="fixed z-200 bg-white border border-slate-200 rounded-xl shadow-xl py-1.5 min-w-48 font-sans text-xs"
                    style={{ top: contextMenu.y, left: contextMenu.x }}
                    onClick={(e) => e.stopPropagation()}
                >
                    <button
                        onClick={handlePaste}
                        className="w-full text-left px-4 py-2 hover:bg-slate-50 font-bold text-slate-700 flex items-center gap-2"
                    >
                        <span className="material-symbols-outlined text-[16px] text-slate-400">content_paste</span>
                        <span>Pegar indicadores</span>
                    </button>
                </div>
            )}

            <GenerarInstrumentoModal
                isOpen={showGenerarModal}
                onClose={() => setShowGenerarModal(false)}
                tipo="cotejo"
                actividades={actividades}
                cursoNombre={selectedCurso ? `${selectedCurso.grado} ${selectedCurso.seccion} - ${getAsignaturaNombre(selectedCurso.asignatura)}` : ''}
                asignatura={state?.cursoDocentes.find(cd => cd.cursoId === selectedCursoId && cd.userId === session?.user?.id)?.asignatura ?? null}
                onAplicarCotejo={aplicarCotejoIA}
            />
        </div>
    );
}
