import { type ClipboardEvent, useEffect, useRef, useState } from 'react';
import {
    Loader2,
    CheckCircle,
    Target,
    Plus,
    ClipboardList,
    BookMarked,
    ChevronLeft,
    ChevronRight,
} from 'lucide-react';
import type {
    DescriptorRubrica,
    EvaluacionRubrica,
    Nivel,
    NivelPuntaje,
    CursoDocente
} from '../types';

import { getAsignaturaNombre } from '../constants/asignaturas';
import { RubricaRow, COMPETENCIAS, NIVEL_FIELDS, toRichHtml } from '../components/RubricaRow';
import { CieloPill } from '../components/ui/CieloPill';

interface Props {
    currentCourseRole?: CursoDocente;
    onSaveRubrica?: (eval_: Omit<EvaluacionRubrica, 'id'>) => void;
    onUpdateDescriptor?: (descriptors: DescriptorRubrica[], plantillaId?: number | null) => void;
    onUpdateNivelesPuntaje?: (nps: NivelPuntaje[]) => void;
    onSavePlantilla?: (tipo: 'rubrica' | 'cotejo', nombre: string, datos: Record<string, unknown>) => Promise<boolean>;
    readOnly?: boolean;
    initialDatos?: { descriptores?: DescriptorRubrica[]; niveles?: NivelPuntaje[] };
}

type Selection = Record<string, Nivel>;

type RichFieldKey = (typeof NIVEL_FIELDS)[number]['key'];

function normalizeDescriptors(descriptors: DescriptorRubrica[], plantillaId: number | null = null): DescriptorRubrica[] {
    return COMPETENCIAS.map((competencia) => {
        const current = descriptors.find(
            d => (plantillaId ? d.plantillaId === plantillaId : !d.plantillaId) && d.bc === competencia.bc
        );
        return {
            id: current?.id || `competencia-${competencia.bc}`,
            bc: competencia.bc,
            indicador: competencia.nombre,
            estrategico: current?.estrategico ?? '',
            autonomo: current?.autonomo ?? '',
            resolutivo: current?.resolutivo ?? '',
            receptivo: current?.receptivo ?? '',
            plantillaId: current?.plantillaId || plantillaId
        };
    });
}

import { useAppStore } from '../store/appStore';
import { useMemo } from 'react';

export default function Rubrica({
    currentCourseRole,
    onSaveRubrica,
    onUpdateDescriptor,
    onUpdateNivelesPuntaje,
    onSavePlantilla,
    readOnly = false,
    initialDatos,
}: Props) {
    const storeState = useAppStore((s) => s.state);
    const addFloatingRubric = useAppStore((s) => s.addFloatingRubric);
    
    const state = useMemo(() => {
        let act = storeState.actividades;
        let cal = storeState.calificaciones;

        if (currentCourseRole && currentCourseRole.rol === 'co-docente') {
            act = act.filter(a => a.asignatura === currentCourseRole.asignatura);
            cal = cal.filter(c => c.asignatura === currentCourseRole.asignatura);
        }
        
        return {
            ...storeState,
            actividades: act,
            calificaciones: cal
        };
    }, [storeState, currentCourseRole]);

    const [selectedCursoId, setSelectedCursoId] = useState(state.cursos[0]?.id ?? 0);
    const [selectedEstId, setSelectedEstId] = useState<number | null>(null);
    const selectedActId = useAppStore(s => s.selectedActividadId);
    const setSelectedActId = useAppStore(s => s.setSelectedActividadId);
    
    // Store-bound states
    const selection = useAppStore(s => s.activeRubricSelection as Selection);
    const setSelection = (updater: Selection | ((prev: Selection) => Selection)) => useAppStore.setState(s => ({
        activeRubricSelection: typeof updater === 'function' ? updater(s.activeRubricSelection as Selection) : updater
    }));

    const multiEvaluations = useAppStore(s => s.activeRubricMultiEvaluations as Record<number, Selection>);
    const setMultiEvaluations = (updater: Record<number, Selection> | ((prev: Record<number, Selection>) => Record<number, Selection>)) => useAppStore.setState(s => ({
        activeRubricMultiEvaluations: typeof updater === 'function' ? updater(s.activeRubricMultiEvaluations as Record<number, Selection>) : updater
    }));

    const activeCell = useAppStore(s => s.activeRubricActiveCell);
    const setActiveCell = (updater: { id: string; nivel: Nivel } | null | ((prev: { id: string; nivel: Nivel } | null) => { id: string; nivel: Nivel } | null)) => useAppStore.setState(s => ({
        activeRubricActiveCell: typeof updater === 'function' ? updater(s.activeRubricActiveCell) : updater
    }));

    const localDescriptors = useAppStore(s => s.activeRubricDescriptors as DescriptorRubrica[]);
    const setLocalDescriptors = (updater: DescriptorRubrica[] | ((prev: DescriptorRubrica[]) => DescriptorRubrica[])) => useAppStore.setState(s => ({
        activeRubricDescriptors: typeof updater === 'function' ? updater(s.activeRubricDescriptors as DescriptorRubrica[]) : updater
    }));

    const localNiveles = useAppStore(s => s.activeRubricNiveles as NivelPuntaje[]);
    const setLocalNiveles = (updater: NivelPuntaje[] | ((prev: NivelPuntaje[]) => NivelPuntaje[])) => useAppStore.setState(s => ({
        activeRubricNiveles: typeof updater === 'function' ? updater(s.activeRubricNiveles as NivelPuntaje[]) : updater
    }));

    const [isSaving, setIsSaving] = useState(false);
    const [savedFlash, setSavedFlash] = useState(false);
    const [selectedPlantillaId, setSelectedPlantillaId] = useState<number | null>(null);
    const [comentarios, setComentarios] = useState('');
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

    async function handlePaste() {
        if (!contextMenu) return;
        try {
            const text = await navigator.clipboard.readText();
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
            const firstRowStr = cleanRows[0].join(' ').toLowerCase();
            const hasHeaderKeywords = ['competencia', 'estrateg', 'auton', 'resol', 'recept'].some(keyword => firstRowStr.includes(keyword));

            if (hasHeaderKeywords || cleanRows.length > 1) {
                startIndex = 1;
            }

            const targetIndex = localDescriptors.findIndex(d => d.id === contextMenu.descId);
            if (targetIndex === -1) return;

            setLocalDescriptors((prev) => {
                const next = [...prev];
                for (let i = startIndex; i < cleanRows.length; i++) {
                    const row = cleanRows[i];
                    const targetOffset = i - startIndex;
                    const destIndex = targetIndex + targetOffset;
                    if (destIndex < next.length) {
                        const desc = next[destIndex];
                        next[destIndex] = {
                            ...desc,
                            estrategico: row[1] !== undefined ? row[1] : desc.estrategico,
                            autonomo: row[2] !== undefined ? row[2] : desc.autonomo,
                            resolutivo: row[3] !== undefined ? row[3] : desc.resolutivo,
                            receptivo: row[4] !== undefined ? row[4] : desc.receptivo,
                        };
                    }
                }
                return next;
            });
        } catch (err) {
            console.error('Failed to read clipboard: ', err);
        } finally {
            setContextMenu(null);
        }
    }

    // Initialize descriptors/levels in store
    useEffect(() => {
        if (localDescriptors.length === 0 || readOnly) {
            const initialDesc = readOnly && initialDatos?.descriptores
                ? normalizeDescriptors(initialDatos.descriptores, selectedPlantillaId)
                : normalizeDescriptors(storeState.descriptoresRubrica, selectedPlantillaId);
            setLocalDescriptors(initialDesc);
        }

        if (localNiveles.length === 0 || readOnly) {
            const initialNiv = readOnly && initialDatos?.niveles
                ? initialDatos.niveles
                : storeState.nivelesPuntaje;
            setLocalNiveles(initialNiv);
        }
    }, [readOnly, initialDatos]);

    const [contextMenu, setContextMenu] = useState<{ x: number; y: number; descId: string } | null>(null);
    useEffect(() => {
        const handleCloseMenu = () => setContextMenu(null);
        window.addEventListener('click', handleCloseMenu);
        return () => window.removeEventListener('click', handleCloseMenu);
    }, []);
    const [activeFormatCell, setActiveFormatCell] = useState<{ id: string; key: RichFieldKey } | null>(null);

    const richCellRefs = useRef<Record<string, HTMLDivElement | null>>({});

    const selectedCurso = state.cursos.find(c => c.id === selectedCursoId);
    const estudiantes = state.estudiantes.filter((estudiante) => estudiante.sharedCourseId === selectedCurso?.sharedCourseId);
    const sortedEsts = [...estudiantes].sort((a, b) =>
        (a.apellido + a.nombre).localeCompare(b.apellido + b.nombre)
    );
    const actividades = state.actividades.filter((actividad) => 
        actividad.cursoId === selectedCursoId || 
        (selectedCurso?.sharedCourseId && actividad.sharedCourseId === selectedCurso.sharedCourseId)
    );
    const rubricaPlantillas = state.plantillas.filter((plantilla) => plantilla.tipo === 'rubrica');
    const selectedEst = estudiantes.find((estudiante) => estudiante.id === selectedEstId) ?? null;
    const selectedAct = actividades.find((actividad) => actividad.id === selectedActId) ?? null;
    const hasTemplates = rubricaPlantillas.length > 0;

    function getCellRefKey(descriptorId: string, key: RichFieldKey): string {
        return `${descriptorId}:${String(key)}`;
    }

    function setDescriptorField(descriptorId: string, key: RichFieldKey, value: string) {
        setLocalDescriptors((prev) =>
            prev.map((descriptor) =>
                descriptor.id === descriptorId
                    ? ({ ...descriptor, [key]: value } as DescriptorRubrica)
                    : descriptor
            )
        );
    }

    function syncInlineToolbar(descriptorId: string, key: RichFieldKey) {
        const editor = richCellRefs.current[getCellRefKey(descriptorId, key)];
        const selection = window.getSelection();
        if (!editor || !selection || selection.rangeCount === 0 || selection.isCollapsed) {
            setActiveFormatCell(null);
            return;
        }

        const range = selection.getRangeAt(0);
        if (!editor.contains(range.commonAncestorContainer)) {
            setActiveFormatCell(null);
            return;
        }

        setActiveFormatCell({ id: descriptorId, key });
    }

    function applyInlineFormat(command: 'bold' | 'italic' | 'foreColor', value?: string) {
        if (!activeFormatCell) return;
        document.execCommand(command, false, value);

        const editor = richCellRefs.current[getCellRefKey(activeFormatCell.id, activeFormatCell.key)];
        if (!editor) return;

        setDescriptorField(activeFormatCell.id, activeFormatCell.key, editor.innerHTML);
    }

    useEffect(() => {
        if (selectedEstId && selectedActId) {
            const existing = state.cursoDetalle.find(
                (cursoDetalle) =>
                    cursoDetalle.estudianteId === selectedEstId &&
                    cursoDetalle.actividadId === selectedActId
            );

            if (existing) {
                setSelection((existing.rubricaData as Selection) || {});
                setComentarios(existing.observaciones ? existing.observaciones.join('\n') : '');
                setSelectedPlantillaId(existing.plantillaId || null);
            } else {
                setSelection({});
                setComentarios('');
            }
        }
    }, [selectedEstId, selectedActId, state.cursoDetalle]);

    useEffect(() => {
        if (readOnly) return;
        const initialDesc = normalizeDescriptors(storeState.descriptoresRubrica, selectedPlantillaId);
        setLocalDescriptors(initialDesc);
    }, [selectedPlantillaId, storeState.descriptoresRubrica, readOnly]);

    function calcPuntajeTotalWithSelection(sel: Selection): number {
        const ids = Object.keys(sel);
        if (!ids.length || !localDescriptors.length) return 0;

        const total = ids.reduce((acc, id) => {
            const nivel = sel[id];
            if (!nivel) return acc;
            const nivelInfo = localNiveles.find((item) => item.nivel === nivel);
            return acc + (nivelInfo?.puntaje ?? 0);
        }, 0);

        // Standardized rule: note = sum of points / number of cells evaluated
        return Math.round(total / ids.length);
    }

    function calcPuntajeTotal(): number {
        return calcPuntajeTotalWithSelection(selection);
    }

    function handleSelect(id: string, nivel: Nivel) {
        if (!selectedAct) return;

        // Flow: First select the descriptor (activeCell).
        // Then the teacher clicks on students in the horizontal list to assign them.
        if (activeCell?.id === id && activeCell?.nivel === nivel) {
            setActiveCell(null);
        } else {
            setActiveCell({ id, nivel });
        }
    }

    function handleAvatarClick(estId: number) {
        if (!selectedAct) return;

        setSelectedEstId(estId);

        if (activeCell) {
            setMultiEvaluations(prev => {
                const currentSelection = prev[estId] || {};
                const isAlreadyInThisLevel = currentSelection[activeCell.id] === activeCell.nivel;

                // Toggle logic: if already there, remove. If not, set (this replaces any other level in this row).
                const nextSelection = {
                    ...currentSelection,
                    [activeCell.id]: isAlreadyInThisLevel ? undefined : activeCell.nivel
                };

                const cleaned: Selection = {};
                Object.entries(nextSelection).forEach(([k, v]) => {
                    if (v !== undefined) cleaned[k] = v;
                });

                return { ...prev, [estId]: cleaned };
            });

            // Update individual 'selection' state for the currently viewed student
            if (estId === selectedEstId) {
                setSelection(prev => {
                    const isAlreadyInThisLevel = prev[activeCell.id] === activeCell.nivel;
                    const next = { ...prev, [activeCell.id]: isAlreadyInThisLevel ? undefined : activeCell.nivel };
                    const cleaned: Selection = {};
                    Object.entries(next).forEach(([k, v]) => { if (v !== undefined) cleaned[k] = v; });
                    return cleaned;
                });
            }
        } else {
            // Standard selection for viewing a student's rubric
            const existingEval = multiEvaluations[estId];
            if (existingEval) {
                setSelection(existingEval);
            }
        }
    }

    async function handleSave() {
        if (!selectedEst || !selectedAct || isSaving) return;
        setIsSaving(true);
        setSavedFlash(false);

        try {
            if (onSaveRubrica) {
                await onSaveRubrica({
                    estudianteId: selectedEst.id,
                    actividadId: selectedAct.id,
                    cursoId: selectedCursoId,
                    fecha: new Date().toISOString().split('T')[0],
                    selecciones: selection,
                    observaciones: comentarios,
                    puntajeTotal: calcPuntajeTotal(),
                    plantillaId: selectedPlantillaId,
                });
            }

            if (onUpdateDescriptor) {
                await onUpdateDescriptor(localDescriptors, selectedPlantillaId);
            }
            if (onUpdateNivelesPuntaje) {
                await onUpdateNivelesPuntaje(localNiveles);
            }

            setSavedFlash(true);
            setTimeout(() => setSavedFlash(false), 2200);
            setSelection({});
        } catch (error) {
            console.error('Error saving rúbrica:', error);
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
                const sel = multiEvaluations[estId];
                if (Object.keys(sel).length === 0) continue;

                if (onSaveRubrica) {
                    await onSaveRubrica({
                        estudianteId: estId,
                        actividadId: selectedAct.id,
                        cursoId: selectedCursoId,
                        fecha: new Date().toISOString().split('T')[0],
                        selecciones: sel,
                        observaciones: undefined,
                        puntajeTotal: calcPuntajeTotalWithSelection(sel),
                        plantillaId: selectedPlantillaId,
                    });
                }
            }

            if (onUpdateDescriptor) {
                await onUpdateDescriptor(localDescriptors, selectedPlantillaId);
            }
            if (onUpdateNivelesPuntaje) {
                await onUpdateNivelesPuntaje(localNiveles);
            }

            setSavedFlash(true);
            setTimeout(() => setSavedFlash(false), 2200);
            setMultiEvaluations({});
            setSelection({});
            setActiveCell(null);
        } catch (error) {
            console.error('Error in multi-student save:', error);
        } finally {
            setIsSaving(false);
        }
    }

    function handleLoadTemplate(templateId: number) {
        const found = rubricaPlantillas.find((plantilla) => plantilla.id === templateId);
        if (!found?.datos) return;

        const nextDescriptors = (found.datos.descriptores as DescriptorRubrica[]) || localDescriptors;
        const nextNiveles = (found.datos.niveles as NivelPuntaje[]) || localNiveles;

        setLocalDescriptors(normalizeDescriptors(nextDescriptors, templateId));
        setLocalNiveles(nextNiveles);
        setSelectedPlantillaId(templateId);
    }

    async function handleSaveTemplate() {
        const nombre = window.prompt('Nombre de la plantilla de rubrica:');
        if (!nombre?.trim()) return;

        if (onSavePlantilla) {
            const ok = await onSavePlantilla('rubrica', nombre.trim(), {
                descriptores: localDescriptors,
                niveles: localNiveles,
            });

            if (ok) {
                setSavedFlash(true);
                setTimeout(() => setSavedFlash(false), 2000);
            }
        }
    }

    function handleRubricaPaste(event: ClipboardEvent<HTMLDivElement>) {
        const text = event.clipboardData.getData('text/plain');
        if (!text.includes('\t') && !text.includes('\n')) return;

        event.preventDefault();

        const rows = text
            .replace(/\r/g, '')
            .split('\n')
            .map((row) => row.trimEnd())
            .filter((row) => row.length > 0)
            .slice(0, 7);

        if (!rows.length) return;

        const keys = NIVEL_FIELDS.map((field) => field.key);

        setLocalDescriptors((prev) => {
            const next = normalizeDescriptors(prev).map((descriptor) => ({ ...descriptor }));

            rows.forEach((row, rowIndex) => {
                const cols = row.split('\t');
                if (cols.length < 4 || rowIndex >= next.length) return;

                const startIndex = cols.length >= 5 ? 1 : 0;
                keys.forEach((key, colIndex) => {
                    const value = cols[startIndex + colIndex];
                    if (value === undefined) return;
                    ((next[rowIndex] as unknown) as Record<string, string>)[key as string] = toRichHtml(value.trim());
                });
            });

            return next;
        });
    }

    return (
        <div className="flex flex-1 h-full overflow-hidden bg-base-creme">
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
                                    <ClipboardList size={18} />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-xs font-black uppercase tracking-widest text-[#2E3330]">Instrumento</p>
                                    <h1 className="text-lg font-black text-[#2E3330] truncate font-notion-title">Rúbrica</h1>
                                </div>
                            </div>

                            <div className="p-4 space-y-4 flex-1">
                                <div className="space-y-4">
                                    <div className="space-y-3">
                                        <div className="px-1">
                                            <p className="text-xs font-black uppercase tracking-widest text-[#2E3330] mb-0.5">Enfoque</p>
                                            <p className="text-xs font-medium text-[#2E3330]/80">Configura el entorno de evaluación.</p>
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold text-[#2E3330] uppercase block mb-1">Curso / Grado</label>
                                            <select
                                                data-guide="selector-curso"
                                                className="w-full bg-base-creme border border-slate-350 rounded-full px-4 py-2 text-xs font-bold text-[#2E3330] outline-none transition-all cursor-pointer focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20 shadow-sm artisan-pill artisan-btn-white"
                                                value={selectedCursoId}
                                                onChange={(event) => {
                                                    setSelectedCursoId(Number(event.target.value));
                                                    setSelectedEstId(null);
                                                    setSelectedActId(null);
                                                }}
                                            >
                                                {state.cursos.map((curso) => (
                                                    <option key={curso.id} value={curso.id}>
                                                        {curso.grado} {curso.seccion} - {getAsignaturaNombre(curso.asignatura)}
                                                     </option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold text-[#2E3330] uppercase block mb-1">Actividad</label>
                                            <select
                                                data-guide="selector-actividad"
                                                className="w-full bg-base-creme border border-slate-350 rounded-full px-4 py-2 text-xs font-bold text-[#2E3330] outline-none transition-all cursor-pointer focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20 shadow-sm artisan-pill artisan-btn-white"
                                                value={selectedAct?.id ?? ''}
                                                onChange={(event) => setSelectedActId(Number(event.target.value) || null)}
                                            >
                                                <option value="">Seleccionar actividad...</option>
                                                {actividades.map((actividad) => (
                                                    <option key={actividad.id} value={actividad.id}>
                                                        {actividad.nombre} ({actividad.periodo})
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>

                                    <div className="h-px bg-slate-200" />

                                    <div className="space-y-3">
                                        <div className="px-1 flex items-center justify-between">
                                            <p className="text-xs font-black uppercase tracking-widest text-[#2E3330]">Plantillas</p>
                                            <div className="flex h-4.5 w-4.5 items-center justify-center rounded-full bg-slate-100 text-xs font-black text-[#2E3330]">{rubricaPlantillas.length}</div>
                                        </div>
                                        <div className="space-y-2">
                                            <div className="flex items-center gap-2 border border-slate-350 rounded-full px-4 py-2 bg-base-creme focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 transition-all shadow-sm artisan-pill artisan-btn-white">
                                                <BookMarked size={14} className="text-[#2E3330]" />
                                                <select
                                                    data-guide="selector-plantilla"
                                                    className="flex-1 bg-transparent text-xs font-bold outline-none text-[#2E3330] cursor-pointer"
                                                    disabled={!hasTemplates}
                                                    value={selectedPlantillaId ?? ''}
                                                    onChange={(event) => {
                                                        const val = event.target.value;
                                                        if (!val) {
                                                            setSelectedPlantillaId(null);
                                                            setLocalDescriptors(normalizeDescriptors(state.descriptoresRubrica.slice(0, 4)));
                                                            return;
                                                        }
                                                        handleLoadTemplate(Number(val));
                                                    }}
                                                >
                                                    <option value="">Evaluación Base</option>
                                                    {rubricaPlantillas.map((p) => (
                                                        <option key={p.id} value={p.id}>{p.nombre}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <button
                                                onClick={handleSaveTemplate}
                                                className="w-full bg-base-creme border border-slate-300 text-[#2E3330] font-black uppercase tracking-widest text-xs py-2 rounded-full hover:bg-slate-50 transition-all outline-none focus-visible:ring-2 focus-visible:ring-slate-400 shadow-sm artisan-pill artisan-btn-white"
                                            >
                                                Guardar como Plantilla
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                        </div>
                    ) : (
                        <div className="flex flex-col items-center py-6 gap-4 relative z-10">
                            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#1E293B] text-white shadow-sm">
                                <ClipboardList size={20} />
                            </div>
                            <div className="h-px w-8 bg-slate-200" />
                            <div className="flex flex-col gap-3">
                                <button onClick={() => setIsSidebarCollapsed(false)} className="p-2.5 hover:bg-slate-100 rounded-xl transition-all text-slate-500" title="Plantillas">
                                    <BookMarked size={18} />
                                </button>
                            </div>
                        </div>
                    )}
                </aside>
            )}

            <main className="flex-1 overflow-y-auto px-3 py-3 md:px-5 scroll-smooth scrollbar-hide">
                <div className="max-w-350 mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 fill-mode-both space-y-1.5">
                    <div className="flex flex-wrap items-center justify-between gap-6 pb-3">
                        <div>
                            <h1 className="text-3xl font-black text-[#2E3330] tracking-tight mb-2.5 font-notion-title">
                                {readOnly ? 'Vista Previa de Rúbrica' : 'Evaluación por Rúbrica'}
                            </h1>
                            <div className="flex items-center gap-3">
                                <CieloPill variant="neutral" uppercase className="px-3 text-black" style={{ backgroundColor: '#DDD5C8', borderColor: '#DDD5C8', color: '#000000' }}>
                                    Desempeño Detallado
                                </CieloPill>
                                <div className="h-1.5 w-1.5 rounded-full bg-slate-350"></div>
                                <span className="text-xs font-bold text-[#5F665E] uppercase tracking-[0.08em]">Instrumento Escolar</span>
                            </div>
                        </div>

                        {!readOnly && (
                            <div className="flex items-center gap-2.5">
                                {selectedEst && (
                                    <div className="flex bg-(--linen)/10 border border-(--border-soft) rounded-(--radius-md) px-4 py-2.5 items-center gap-4 shadow-sm">
                                        <div className="flex flex-col items-center">
                                            <p className="text-xs font-black uppercase tracking-widest text-(--ink-soft)">
                                                Puntaje Actual
                                            </p>
                                            <p className="mt-0.5 text-xl font-black tracking-tighter text-(--ink)">
                                                {calcPuntajeTotalWithSelection(selection)}
                                                <span className="ml-1 text-xs font-bold text-(--ink-soft)">/100</span>
                                            </p>
                                        </div>
                                        <div className="h-8 w-px bg-(--border-soft)" />
                                        <div className="flex items-center gap-3">
                                            <div
                                                className="flex h-8 w-8 items-center justify-center rounded-full text-[12px] font-black text-white shadow-sm"
                                                style={{ background: selectedEst.avatarColor }}
                                            >
                                                {selectedEst.nombre[0]}
                                            </div>
                                            <div className="flex flex-col">
                                                <p className="text-xs font-black uppercase tracking-widest text-(--ink-soft)">Estudiante</p>
                                                <span className="text-xs font-black uppercase tracking-widest text-(--ink)">
                                                    {selectedEst.nombre} {selectedEst.apellido}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {activeCell && (
                                    <div className="flex bg-white border border-(--border-soft) rounded-(--radius-md) px-4 py-2.5 items-center gap-3 shadow-sm animate-pulse">
                                        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-(--primary) text-white shadow-sm">
                                            <Plus size={16} />
                                        </div>
                                        <div className="flex flex-col">
                                            <p className="text-xs font-black uppercase tracking-widest text-(--ink-soft)">Asignando Descriptor</p>
                                            <span className="text-xs font-black uppercase tracking-widest text-(--ink)">
                                                {localDescriptors.find(d => d.id === activeCell.id)?.indicador.substring(0, 20)}...
                                            </span>
                                        </div>
                                        <button
                                            onClick={() => setActiveCell(null)}
                                            className="ml-1 text-xs font-black text-(--primary) uppercase tracking-widest hover:underline cursor-pointer"
                                        >
                                            Cancelar
                                        </button>
                                    </div>
                                )}

                                <CieloPill
                                    as="button"
                                    id="btn-evaluar-alumnos"
                                    variant={((!selectedEst && Object.keys(multiEvaluations).length === 0) || !selectedAct || isSaving) ? 'disabled' : 'primary'}
                                    disabled={(!selectedEst && Object.keys(multiEvaluations).length === 0) || !selectedAct || isSaving}
                                    onClick={Object.keys(multiEvaluations).length > 0 ? handleFinalizeGroupEvaluation : handleSave}
                                    className="px-5 gap-2.5 h-10"
                                >
                                    {isSaving ? <Loader2 size={16} className="animate-spin" /> : (savedFlash ? <CheckCircle size={18} /> : <Target size={18} />)}
                                    <span className="uppercase tracking-[0.08em]">
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
                                        <CieloPill variant="primary" uppercase className="px-3.5 bg-white text-(--primary) shadow-sm tracking-[0.16em]">
                                            Actividad: {selectedAct.nombre} ({selectedAct.periodo})
                                        </CieloPill>
                                    )}
                                </div>

                                <div className="w-full bg-white rounded-(--radius-md) p-2 border border-(--border-soft) shadow-sm">
                                    <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide py-1 px-2.5">
                                        {sortedEsts.map((estudiante, idx) => {
                                            const isViewing = selectedEstId === estudiante.id;
                                            const studentEval = multiEvaluations[estudiante.id];
                                            const numInvolved = studentEval ? Object.keys(studentEval).length : 0;
                                            const isInActiveCell = activeCell ? studentEval?.[activeCell.id] === activeCell.nivel : false;

                                            return (
                                                <button
                                                    key={estudiante.id}
                                                    data-guide="seleccionar-estudiantes"
                                                    onClick={() => handleAvatarClick(estudiante.id)}
                                                    className="flex min-w-12 flex-col items-center gap-1.5 outline-none group relative"
                                                >
                                                    <div
                                                        className={`flex h-10 w-10 items-center justify-center rounded-full text-[12px] font-black text-white transition-all ring-offset-2 ${isViewing
                                                            ? 'scale-105 ring-2 ring-(--primary) shadow-lg'
                                                            : 'opacity-50 grayscale hover:scale-105 hover:opacity-100 hover:grayscale-0'
                                                            } ${isInActiveCell ? 'ring-2 ring-(--primary) opacity-100 grayscale-0 ring-offset-2 scale-105' : ''}`}
                                                        style={{ background: estudiante.avatarColor }}
                                                    >
                                                        {estudiante.nombre[0]}
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
                                                        className={`text-center text-xs font-black uppercase tracking-[0.14em] transition-colors ${isViewing || isInActiveCell ? 'text-(--ink)' : 'text-(--ink-soft)'
                                                            }`}
                                                    >
                                                        {idx + 1}. {estudiante.nombre.split(' ')[0]}
                                                    </span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    <div
                        className="w-full rounded-[24px] border border-slate-200 bg-white shadow-xl shadow-slate-200/50 overflow-hidden"
                        tabIndex={0}
                        onPaste={handleRubricaPaste}
                    >
                        <div className="overflow-x-auto">
                            <table className="table-compact w-full border-collapse font-['Inter',sans-serif] text-[12px]">
                                <thead>
                                    <tr className="border-b border-slate-200 bg-[#1E293B] text-white">
                                        <th className="w-[30%] border-r border-white/30 px-3 py-2 text-center align-middle text-[12px] font-bold">
                                            Competencia
                                        </th>

                                        {NIVEL_FIELDS.map((field) => {
                                            const nivelFromState = state.nivelesPuntaje.find(n => n.nivel === field.nivel);
                                            const nivelActual =
                                                localNiveles.find((nivel) => nivel.nivel === field.nivel) ?? nivelFromState ?? null;

                                            return (
                                                <th
                                                    key={field.key}
                                                    className="w-[17.5%] border-r border-white/30 px-3 py-2 text-center align-middle last:border-r-0"
                                                    style={{ backgroundColor: field.headerBg }}
                                                >
                                                    <div className="flex flex-col items-center justify-center gap-1">
                                                        {readOnly ? (
                                                            <span className={`w-full text-center text-[12px] font-bold block ${field.headerTextColor || 'text-white'}`}>
                                                                {nivelActual?.nombre || field.label}
                                                            </span>
                                                        ) : (
                                                            <input
                                                                className={`w-full bg-transparent text-center text-[12px] font-bold outline-none ${field.headerTextColor || 'text-white'} placeholder:${field.headerTextColor === 'text-[#1E293B]' ? 'text-slate-700/50' : 'text-white/40'}`}
                                                                value={nivelActual?.nombre ?? ''}
                                                                placeholder={field.label}
                                                                onChange={(event) =>
                                                                    setLocalNiveles((prev) =>
                                                                        prev.map((nivel) =>
                                                                            nivel.nivel === field.nivel
                                                                                ? { ...nivel, nombre: event.target.value }
                                                                                : nivel
                                                                        )
                                                                    )
                                                                }
                                                                onBlur={() => onUpdateNivelesPuntaje && onUpdateNivelesPuntaje(localNiveles)}
                                                            />
                                                        )}

                                                        <div className="flex items-center justify-center gap-1">
                                                            <div className={`flex h-6 w-11 items-center justify-center rounded-md border ${field.headerTextColor === 'text-[#1E293B]' ? 'bg-black/10 border-black/20' : 'bg-white/15 border-white/40'}`}>
                                                                {readOnly ? (
                                                                    <span className={`text-center text-xs font-bold ${field.headerTextColor || 'text-white'}`}>
                                                                        {nivelActual?.puntaje ?? 0}
                                                                    </span>
                                                                ) : (
                                                                    <input
                                                                        className={`w-full bg-transparent text-center text-xs font-bold outline-none ${field.headerTextColor || 'text-white'}`}
                                                                        value={nivelActual?.puntaje ?? 0}
                                                                        onChange={(event) => {
                                                                            const value = parseInt(event.target.value, 10);
                                                                            setLocalNiveles((prev) =>
                                                                                prev.map((nivel) =>
                                                                                    nivel.nivel === field.nivel
                                                                                        ? {
                                                                                            ...nivel,
                                                                                            puntaje: Number.isNaN(value) ? 0 : value,
                                                                                        }
                                                                                        : nivel
                                                                                )
                                                                            );
                                                                        }}
                                                                    />
                                                                )}
                                                            </div>
                                                            <p className={`text-xs font-bold opacity-60 ${field.headerTextColor || 'text-white'}`}>pts</p>
                                                        </div>
                                                    </div>
                                                </th>
                                            );
                                        })}
                                    </tr>
                                </thead>

                                <tbody className="divide-y divide-slate-100">
                                    {localDescriptors.slice(0, 4).map((desc, index) => (
                                        <RubricaRow
                                            key={desc.id}
                                            desc={desc}
                                            index={index}
                                            selection={selection}
                                            activeCell={activeCell}
                                            activeFormatCell={activeFormatCell}
                                            sortedEsts={sortedEsts}
                                            multiEvaluations={multiEvaluations}
                                            readOnly={readOnly}
                                            onSelect={handleSelect}
                                            richCellRefs={richCellRefs}
                                            setActiveFormatCell={setActiveFormatCell}
                                            setDescriptorField={setDescriptorField}
                                            syncInlineToolbar={syncInlineToolbar}
                                            applyInlineFormat={applyInlineFormat}
                                            onDecouple={() => selectedCursoId && selectedActId && addFloatingRubric(desc.id, selectedCursoId, selectedActId)}
                                            onContextMenu={(e) => {
                                                if (readOnly) return;
                                                e.preventDefault();
                                                setContextMenu({
                                                    x: e.clientX,
                                                    y: e.clientY,
                                                    descId: desc.id
                                                });
                                            }}
                                        />
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>



                    <div className="pb-10 text-center">
                        <p className="text-xs font-black text-slate-400 uppercase tracking-widest italic">
                            {readOnly ? 'Modo de Vista Previa: Solo Lectura.' : 'Los datos de los descriptores se guardan globalmente al finalizar la evaluación.'}
                        </p>
                    </div>
                </div>
            </main>

            {contextMenu && (
                <div
                    className="fixed z-200 bg-white border border-slate-200 rounded-xl shadow-xl py-1.5 min-w-48 font-sans text-xs"
                    style={{ top: contextMenu.y, left: contextMenu.x }}
                    onClick={(e) => e.stopPropagation()}
                >
                    <button
                        onClick={() => {
                            if (selectedCursoId && selectedActId) {
                                addFloatingRubric(contextMenu.descId, selectedCursoId, selectedActId);
                            }
                            setContextMenu(null);
                        }}
                        className="w-full text-left px-4 py-2 hover:bg-slate-50 font-bold text-slate-700 flex items-center gap-2"
                    >
                        <span className="material-symbols-outlined text-[16px] text-slate-400">open_in_new</span>
                        <span>Abrir evaluación PiP</span>
                    </button>
                    <button
                        onClick={handlePaste}
                        className="w-full text-left px-4 py-2 hover:bg-slate-50 font-bold text-slate-700 flex items-center gap-2 border-t border-slate-100"
                    >
                        <span className="material-symbols-outlined text-[16px] text-slate-400">content_paste</span>
                        <span>Pegar</span>
                    </button>
                </div>
            )}
        </div>
    );
}
