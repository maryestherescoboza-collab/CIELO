import { useState, useEffect } from 'react';
import { BookOpen, Calendar, ChevronDown, Plus, Trash2, X, Bookmark, Link as LinkIcon, Edit2, MessageSquare, Info, Zap, Gamepad2, Presentation, PenTool, RotateCcw } from 'lucide-react';
import blueBookIcon from '../assets/book-blue.png';
import purpleBookIcon from '../assets/book-purple.png';
import type { Curso, Secuencia, TipoRecurso } from '../types';

import { getPlanificacionDiariaTemplate } from '../templates/planificacion-diaria';
import { getPlanRecuperacionTemplate, PERIODOS_RECUPERACION, isPeriodoDisponible } from '../templates/plan-recuperacion';
import { CieloPill } from '../components/ui/CieloPill';
import { CieloModal } from '../components/ui/CieloModal';
import { supabase } from '../lib/supabase';

import { useAppStore } from '../store/appStore';
import RegistroAnecdotico from '../components/RegistroAnecdotico';

export function detectResourceType(url: string): TipoRecurso {
    const lowerUrl = url.toLowerCase();
    if (lowerUrl.includes('youtube.com') || lowerUrl.includes('youtu.be') || lowerUrl.includes('vimeo.com')) return 'video';
    if (lowerUrl.includes('docs.google.com/document') || lowerUrl.includes('word') || lowerUrl.includes('drive.google.com')) return 'documento';
    if (lowerUrl.includes('docs.google.com/presentation') || lowerUrl.includes('slides')) return 'presentacion';
    if (lowerUrl.includes('canva.com')) return 'canva';
    if (lowerUrl.endsWith('.pdf') || lowerUrl.includes('pdf')) return 'pdf';
    return 'web';
}

export const CATEGORIAS_RECURSOS = [
    'Reflexión',
    'Informativo',
    'Dinámica',
    'Juego',
    'Presentación',
    'Ejercicios',
    'Otro'
];

export function getCategoriaConfig(categoria: string) {
    switch (categoria) {
        case 'Reflexión': return { icon: MessageSquare, bg: 'bg-(--tag-indigo-bg)', text: 'text-(--tag-indigo-text)', border: 'border-(--tag-indigo-bg)' };
        case 'Informativo': return { icon: Info, bg: 'bg-(--tag-amber-bg)', text: 'text-(--tag-amber-text)', border: 'border-(--tag-amber-bg)' };
        case 'Dinámica': return { icon: Zap, bg: 'bg-(--tag-rose-bg)', text: 'text-(--tag-rose-text)', border: 'border-(--tag-rose-bg)' };
        case 'Juego': return { icon: Gamepad2, bg: 'bg-(--tag-emerald-bg)', text: 'text-(--tag-emerald-text)', border: 'border-(--tag-emerald-bg)' };
        case 'Presentación': return { icon: Presentation, bg: 'bg-(--tag-purple-bg)', text: 'text-(--tag-purple-text)', border: 'border-(--tag-purple-bg)' };
        case 'Ejercicios': return { icon: PenTool, bg: 'bg-(--tag-rose-bg)', text: 'text-(--tag-rose-text)', border: 'border-(--tag-rose-bg)' };
        default: return { icon: LinkIcon, bg: 'bg-(--linen)', text: 'text-(--ink-soft)', border: 'border-(--border-soft)' };
    }
}


interface Props {
    onAddSecuencia?: (s: Omit<Secuencia, 'id'>) => Promise<any> | any;
    onUpdateSecuencia?: (seq: Secuencia) => Promise<any> | any;
    onDeleteSecuencia?: (id: number) => Promise<any> | any;
    readOnly?: boolean;
    initialDatos?: Secuencia;
}

const BOOK_ICONS = [blueBookIcon, purpleBookIcon];

function getCursoLabel(curso?: Curso) {
    if (!curso) return 'Curso sin asignar';
    return `${curso.grado} ${curso.seccion} • ${curso.nombre}`;
}

// function getDisplayStatus(estado: Secuencia['estado']) {
//     if (estado === 'Completada') return 'Completado';
//     if (estado === 'En progreso') return 'En progreso';
//     return 'Sin iniciar';
// }

function getDotCount(estado: Secuencia['estado']) {
    if (estado === 'Completada') return 3;
    if (estado === 'En progreso') return 2;
    return 1;
}

import { useSupabaseData } from '../hooks/useSupabaseData';

export default function Planificacion({ onAddSecuencia = () => {}, onUpdateSecuencia, onDeleteSecuencia, readOnly, initialDatos }: Props) {
    const state = useAppStore((s) => s.state);
    const session = useAppStore((s) => s.session);
    const loading = useAppStore((s) => s.loading);
    const { loadPlanificacionData } = useSupabaseData(true);

    useEffect(() => {
        if (!readOnly) {
            loadPlanificacionData();
        }
    }, [readOnly, loadPlanificacionData]);

    if (readOnly && initialDatos) {
        return (
            <div className="flex h-full w-full flex-col overflow-hidden bg-base-creme">
                <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 bg-white px-8 py-6">
                    <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1.5">
                            <span className="text-xs font-black uppercase tracking-widest text-primary bg-primary/10 px-2.5 py-1 rounded-md">
                                Vista Previa de Secuencia Didáctica
                            </span>
                        </div>
                        <h2 className="text-2xl font-black tracking-tight text-[#1E293B] font-notion-title">
                            {initialDatos.titulo}
                        </h2>
                        <div className="mt-2 flex flex-wrap items-center gap-3 text-xs font-bold text-slate-500 uppercase tracking-widest">
                            <span className="inline-flex items-center gap-1.5">
                                <Calendar size={14} className="text-slate-400" />
                                {new Date(initialDatos.fechaInicio).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="flex-1 overflow-auto bg-slate-50 p-4 sm:p-6">
                    <div className="flex min-h-full items-start">
                        <div className="w-full max-w-4xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-10">
                            {initialDatos.contenidoHtml ? (
                                <div
                                    className="prose prose-slate prose-lg mx-auto max-w-none text-slate-800 prose-headings:font-extrabold prose-headings:tracking-tight prose-headings:text-slate-900 prose-p:text-slate-600 prose-strong:text-slate-900 prose-code:text-emerald-600"
                                    dangerouslySetInnerHTML={{ __html: initialDatos.contenidoHtml }}
                                />
                            ) : (
                                <div className="flex min-h-64 flex-col items-start text-left">
                                    <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center mb-4">
                                        <BookOpen size={24} className="text-slate-300" />
                                    </div>
                                    <h3 className="text-lg font-bold text-slate-900">
                                        Esta secuencia aún no tiene contenido
                                    </h3>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    const [cursoSel, setCursoSel] = useState(state.cursos[0]?.id ?? 0);

    useEffect(() => {
        if ((cursoSel === 0 || !state.cursos.some(c => c.id === cursoSel)) && state.cursos.length > 0) {
            setCursoSel(state.cursos[0].id);
        }
    }, [state.cursos, cursoSel]);

    useEffect(() => {
        const handleMessage = async (event: MessageEvent) => {
            if (!event.data || typeof event.data !== 'object') return;
            const { type, cursoId, html } = event.data;

            if (type === 'GET_ESPECIFICACIONES') {
                const seq = state.secuencias.find(s => s.cursoId === Number(cursoId) && s.titulo.startsWith('Especificaciones Curriculares'));
                const sourceWindow = event.source as Window | null;
                if (sourceWindow) {
                    if (seq) {
                        sourceWindow.postMessage({ type: 'LOAD_ESPECIFICACIONES', html: seq.contenidoHtml }, event.origin);
                    } else {
                        sourceWindow.postMessage({ type: 'LOAD_ESPECIFICACIONES', html: null }, event.origin);
                    }
                }
            }

            if (type === 'SAVE_ESPECIFICACIONES') {
                const title = `Especificaciones Curriculares - Curso ${cursoId}`;
                const matches = state.secuencias.filter(s => s.cursoId === Number(cursoId) && s.titulo.startsWith('Especificaciones Curriculares'));

                if (matches.length > 0) {
                    const existing = matches[0];
                    if (onUpdateSecuencia) {
                        await onUpdateSecuencia({
                            ...existing,
                            contenidoHtml: html
                        });
                    }
                    if (matches.length > 1 && onDeleteSecuencia) {
                        for (let i = 1; i < matches.length; i++) {
                            await onDeleteSecuencia(matches[i].id);
                        }
                    }
                } else {
                    if (onAddSecuencia) {
                        await onAddSecuencia({
                            titulo: title,
                            cursoId: Number(cursoId),
                            fechaInicio: new Date().toISOString().split('T')[0],
                            contenidoHtml: html,
                            estado: 'Pendiente'
                        });
                    }
                }
                const sourceWindow = event.source as Window | null;
                if (sourceWindow) {
                    sourceWindow.postMessage({ type: 'SAVE_SUCCESS' }, event.origin);
                }
            }

            if (type === 'DELETE_ESPECIFICACIONES') {
                const matches = state.secuencias.filter(s => s.cursoId === Number(cursoId) && s.titulo.startsWith('Especificaciones Curriculares'));
                if (matches.length > 0 && onDeleteSecuencia) {
                    for (const seq of matches) {
                        await onDeleteSecuencia(seq.id);
                    }
                }
                const sourceWindow = event.source as Window | null;
                if (sourceWindow) {
                    sourceWindow.postMessage({ type: 'DELETE_SUCCESS' }, event.origin);
                }
            }
        };

        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, [state.secuencias, onAddSecuencia, onUpdateSecuencia, onDeleteSecuencia]);
    const [showModal, setShowModal] = useState(false);
    const [importStep, setImportStep] = useState<'select-template' | 'template-editor'>('select-template');
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [form, setForm] = useState<{
        titulo: string;
        cursoId: number;
        fechaInicio: string;
        contenidoHtml: string;
        archivoUrl?: string;
        archivoNombre?: string;
        archivoSize?: number;
        archivoTipo?: string;
        archivoFechaCarga?: string;
        recursos?: any[];
    }>({
        titulo: '',
        cursoId: 0,
        fechaInicio: new Date().toISOString().split('T')[0],
        contenidoHtml: '',
        archivoUrl: undefined,
        archivoNombre: undefined,
        archivoSize: undefined,
        archivoTipo: undefined,
        archivoFechaCarga: undefined
    });
    const [viewerSeq, setViewerSeq] = useState<Secuencia | null>(null);
    const [periodoRecuperacion, setPeriodoRecuperacion] = useState<'P1' | 'P2' | 'P3'>('P1');

    const [isAddingRecurso, setIsAddingRecurso] = useState(false);
    const [editingRecursoId, setEditingRecursoId] = useState<string | null>(null);
    const [newRecursoUrl, setNewRecursoUrl] = useState('');
    const [newRecursoCategoria, setNewRecursoCategoria] = useState(CATEGORIAS_RECURSOS[0]);
    const [newRecursoTargetSeq, setNewRecursoTargetSeq] = useState<'new' | number>('new');
    const [recursosLoading, setRecursosLoading] = useState(false);
    const [recursoError, setRecursoError] = useState('');

    async function handleAddRecurso() {
        if (!newRecursoUrl.trim() || !newRecursoCategoria) return;

        try {
            const urlObj = new URL(newRecursoUrl.trim());
            if (urlObj.protocol !== 'http:' && urlObj.protocol !== 'https:') {
                setRecursoError('Introduce un enlace válido.');
                return;
            }
        } catch {
            setRecursoError('Introduce un enlace válido.');
            return;
        }

        setRecursosLoading(true);
        setRecursoError('');
        try {
            const parsedTipo = detectResourceType(newRecursoUrl.trim());
            if (viewerSeq) {
                let updatedSecuencia;
                if (editingRecursoId) {
                    updatedSecuencia = {
                        ...viewerSeq,
                        recursos: (viewerSeq.recursos || []).map((r: any) =>
                            r.id === editingRecursoId
                                ? { ...r, titulo: newRecursoCategoria, categoria: newRecursoCategoria, url: newRecursoUrl.trim(), tipo: parsedTipo }
                                : r
                        )
                    };
                } else {
                    const newRecurso = {
                        id: Date.now().toString(),
                        titulo: newRecursoCategoria,
                        categoria: newRecursoCategoria,
                        url: newRecursoUrl.trim(),
                        tipo: parsedTipo,
                        orden: (viewerSeq.recursos?.length || 0) + 1
                    };
                    updatedSecuencia = {
                        ...viewerSeq,
                        recursos: [...(viewerSeq.recursos || []), newRecurso]
                    };
                }

                if (onUpdateSecuencia) {
                    await onUpdateSecuencia(updatedSecuencia);
                }
                setViewerSeq(updatedSecuencia);
            } else {
                if (newRecursoTargetSeq !== 'new' && !editingRecursoId) {
                    const targetSeq = state.secuencias.find(s => s.id === newRecursoTargetSeq);
                    if (targetSeq) {
                        const newRecurso = {
                            id: Date.now().toString(),
                            titulo: newRecursoCategoria,
                            categoria: newRecursoCategoria,
                            url: newRecursoUrl.trim(),
                            tipo: parsedTipo,
                            orden: (targetSeq.recursos?.length || 0) + 1
                        };
                        const updatedSecuencia = {
                            ...targetSeq,
                            recursos: [...(targetSeq.recursos || []), newRecurso]
                        };
                        if (onUpdateSecuencia) {
                            await onUpdateSecuencia(updatedSecuencia);
                        }
                    }
                } else {
                    let updatedRecursos = form.recursos || [];
                    if (editingRecursoId) {
                        updatedRecursos = updatedRecursos.map((r: any) =>
                            r.id === editingRecursoId
                                ? { ...r, titulo: newRecursoCategoria, categoria: newRecursoCategoria, url: newRecursoUrl.trim(), tipo: parsedTipo }
                                : r
                        );
                    } else {
                        const newRecurso = {
                            id: Date.now().toString(),
                            titulo: newRecursoCategoria,
                            categoria: newRecursoCategoria,
                            url: newRecursoUrl.trim(),
                            tipo: parsedTipo,
                            orden: updatedRecursos.length + 1
                        };
                        updatedRecursos = [...updatedRecursos, newRecurso];
                    }
                    setForm(prev => ({ ...prev, recursos: updatedRecursos }));
                }
            }
            
            setIsAddingRecurso(false);
            setEditingRecursoId(null);
            setNewRecursoUrl('');
            setNewRecursoCategoria(CATEGORIAS_RECURSOS[0]);
        } catch (e) {
            console.error(e);
        } finally {
            setRecursosLoading(false);
        }
    }

    async function handleCloseViewer() {
        setViewerSeq(null);
    }

    const secuenciasCurso = state.secuencias.filter((secuencia: Secuencia) => secuencia.cursoId === cursoSel && (secuencia.userId === session?.user?.id || !secuencia.userId));

    const allRecursos = secuenciasCurso.flatMap(seq => {
        let rec = seq.recursos;
        if (typeof rec === 'string') {
            try { rec = JSON.parse(rec); } catch(e) { rec = []; }
        }
        return (rec || []).map((r: any) => ({ ...r, parentSeqId: seq.id }));
    });
    console.log('[DEBUG_RECURSOS] secuenciasCurso:', secuenciasCurso.map(s => ({ id: s.id, recursos: s.recursos })));
    console.log('[DEBUG_RECURSOS] allRecursos:', allRecursos);

    const viewerRecursos = viewerSeq 
        ? (viewerSeq.recursos || []).sort((a: any, b: any) => (a.orden || 0) - (b.orden || 0)) 
        : (form.recursos || []).sort((a: any, b: any) => (a.orden || 0) - (b.orden || 0));

    console.log('[PLANIFICACION] cursoSel:', cursoSel, 'loading:', loading, 'cursos.length:', state.cursos.length);

    if (loading && state.cursos.length === 0) {
        return (
            <div className="flex h-full w-full items-center justify-center bg-base-creme">
                <div className="flex flex-col items-center">
                    <div className="h-10 w-10 animate-spin rounded-full border-4 border-(--primary) border-t-transparent" />
                    <p className="mt-3 text-xs font-bold text-(--ink-soft)">Cargando secuencias didácticas...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col lg:flex-row flex-1 h-full overflow-hidden bg-(--background)">
            <div className="flex-1 overflow-y-auto px-4 py-6 md:px-8 scroll-smooth scrollbar-hide">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div>
                        <h1 className="text-2xl font-black text-(--ink) tracking-tight mb-2 font-notion-title">
                            Secuencias Didácticas
                        </h1>
                        <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2 bg-(--linen) px-3 py-1 rounded-full border border-(--border-soft)">
                                <span className="text-xs font-bold text-(--ink) uppercase tracking-wider">
                                    Pedagogía y Secuencias
                                </span>
                            </div>
                            <div className="h-1.5 w-1.5 rounded-full bg-(--border-soft)"></div>
                            <span className="text-xs font-bold text-(--ink-soft) uppercase tracking-wider">Material Docente</span>
                        </div>
                    </div>

                    <div className="flex flex-col items-stretch sm:items-center gap-3 sm:flex-row">
                        <div className="relative group">
                            <select
                                className="pl-5 pr-10 appearance-none rounded-full bg-white border border-(--border-soft) text-(--ink) text-xs font-bold uppercase tracking-wider shadow-sm outline-none focus-visible:border-(--primary) focus-visible:ring-2 focus-visible:ring-(--primary)/20 cursor-pointer transition-all hover:bg-(--linen)/45 min-w-60 artisan-pill"
                                value={cursoSel}
                                onChange={(event) => setCursoSel(Number(event.target.value))}
                            >
                                {state.cursos.map((curso) => (
                                    <option key={curso.id} value={curso.id}>
                                        {getCursoLabel(curso)}
                                    </option>
                                ))}
                            </select>
                            <ChevronDown
                                size={14}
                                className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-(--ink-soft) transition-colors group-hover:text-(--primary)"
                            />
                        </div>

                        <CieloPill
                            as="button"
                            onClick={() => { setShowModal(true); setImportStep('select-template'); }}
                            variant="primary"
                            className="px-6 gap-2.5 shrink-0 h-9"
                        >
                            <Plus size={16} strokeWidth={3} className="transition-transform duration-700 hover:rotate-180" />
                            <span>Nueva secuencia</span>
                        </CieloPill>
                    </div>
                </div>

                <div className="max-w-5xl animate-in fade-in slide-in-from-bottom-4 duration-500 delay-100 fill-mode-both">
                    {/* SECCIÓN RECURSOS */}
                    <div className="mb-6">
                        <h2 className="text-sm font-black text-(--ink) uppercase tracking-widest mb-3 border-b border-(--border-soft) pb-2 flex justify-between items-end">
                            <span>Recursos del Curso</span>
                        </h2>
                        
                        {allRecursos.length > 0 ? (
                            <div className="flex overflow-x-auto pb-4 gap-3 items-start [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                                {allRecursos.map((recurso: any, index: number) => {
                                    const cat = recurso.categoria || recurso.titulo || 'Otro';
                                    const { icon: Icon, bg, text, border } = getCategoriaConfig(cat);
                                    return (
                                        <div key={`${recurso.id}-${index}`} className="relative group flex flex-col items-start gap-1.5 w-14 shrink-0">
                                            <button
                                                onClick={() => window.open(recurso.url, "_blank", "noopener,noreferrer")}
                                                title="Abrir recurso"
                                                className={`relative w-14 h-18 rounded-r-md rounded-l-sm border ${bg} ${border} shadow-sm transition-all duration-300 ease-out flex flex-col items-center justify-center cursor-pointer outline-none group-hover:-translate-y-1 group-hover:shadow-md`}
                                            >
                                                <div className="absolute left-0 top-0 bottom-0 w-1 opacity-15 mix-blend-multiply bg-black rounded-l-sm"></div>
                                                <Icon size={18} className={`${text} opacity-80`} />
                                                <div className="absolute bottom-1.5 left-1.5 right-1.5 h-0.5 bg-black/5 rounded-full"></div>
                                            </button>
                                            <span className="text-[9px] font-bold text-(--ink-soft) text-left leading-tight w-full line-clamp-2 px-0.5" title={cat}>
                                                {cat}
                                            </span>
                                            
                                            <div className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center gap-1 z-10">
                                                <button
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        e.stopPropagation();
                                                        if (window.confirm('¿Eliminar recurso?')) {
                                                            const parentSeq = secuenciasCurso.find(s => s.id === recurso.parentSeqId);
                                                            if (parentSeq && onUpdateSecuencia) {
                                                                const updatedSeq = {
                                                                    ...parentSeq,
                                                                    recursos: (parentSeq.recursos || []).filter((r: any) => r.id !== recurso.id)
                                                                };
                                                                onUpdateSecuencia(updatedSeq);
                                                            }
                                                        }
                                                    }}
                                                    className="w-6 h-6 rounded-full bg-white border border-(--border-soft) flex items-center justify-center text-(--ink-soft) hover:text-(--danger) hover:border-(--danger)/30 shadow-md transition-colors outline-none"
                                                    title="Eliminar"
                                                >
                                                    <Trash2 size={10} />
                                                </button>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        ) : (
                            <div className="py-5 px-5 bg-(--linen)/30 border border-dashed border-(--border-soft) rounded-xl flex flex-col items-start text-left">
                                <p className="text-xs font-bold text-(--ink-soft) uppercase tracking-widest mb-1">No hay recursos</p>
                                <p className="text-xs text-(--ink-soft)/70 max-w-sm">Los enlaces y recursos que agregues a las secuencias de este curso aparecerán aquí como acceso rápido.</p>
                            </div>
                        )}
                    </div>

                    {/* SECCIÓN PLANTILLAS */}
                    <div>
                        <h2 className="text-sm font-black text-(--ink) uppercase tracking-widest mb-3 border-b border-(--border-soft) pb-2 flex justify-between items-end">
                            <span>Plantillas y Secuencias</span>
                        </h2>
                        
                        <div className="flex overflow-x-auto pb-6 gap-5 items-start [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden pt-1">
                            {/* Especificaciones Curriculares */}
                            <button
                                type="button"
                                onClick={() => window.open(`/especificaciones.html?cursoId=${cursoSel}`, '_blank')}
                                className="relative w-28 shrink-0 group flex flex-col items-start text-left cursor-pointer outline-none transition-all duration-300 hover:-translate-y-1"
                            >
                                <div className="w-full h-32 flex flex-col items-center justify-center mb-2">
                                    <img
                                        src="/especificaciones-icon.png"
                                        alt=""
                                        className="w-full h-full object-contain transition-transform duration-300 group-hover:scale-105 drop-shadow-sm"
                                        onError={(e) => { e.currentTarget.src = BOOK_ICONS[0]; }}
                                    />
                                </div>
                                <h3 className="text-[10px] font-black uppercase tracking-wider text-(--ink) group-hover:text-(--primary) transition-colors text-left w-full px-0.5 line-clamp-2 leading-snug">
                                    Especificaciones Curriculares
                                </h3>
                                <p className="mt-1 text-[9px] font-bold text-(--primary) text-left uppercase tracking-widest bg-(--primary)/10 px-1.5 py-0.5 rounded-full">
                                    Interactivo
                                </p>
                            </button>

                            {/* Resto de secuencias didácticas del curso */}
                            {secuenciasCurso.map((seq, index) => {
                                const curso = state.cursos.find((item) => item.id === seq.cursoId);
                                const bookIcon = BOOK_ICONS[index % BOOK_ICONS.length];
                                const filledDots = getDotCount(seq.estado);


                                return (
                                    <button
                                        key={seq.id}
                                        type="button"
                                        onClick={(e) => {
                                            e.preventDefault();
                                            setViewerSeq(seq);
                                        }}
                                        className="relative w-28 shrink-0 group flex flex-col items-start text-left cursor-pointer outline-none transition-all duration-300 hover:-translate-y-1"
                                    >
                                        <div className="w-full h-32 flex flex-col items-center justify-center mb-2">
                                            <img
                                                src={bookIcon}
                                                alt=""
                                                className="w-full h-full object-contain transition-transform duration-300 group-hover:scale-105 drop-shadow-sm"
                                            />
                                        </div>
                                        
                                        <h3 className="text-[10px] font-black uppercase tracking-wider text-(--ink) group-hover:text-(--primary) transition-colors text-left w-full px-0.5 line-clamp-2 leading-snug" title={seq.titulo}>
                                            {seq.titulo}
                                        </h3>
                                        
                                        <div className="mt-1 flex flex-col items-start gap-1 w-full">
                                            <p className="text-[9px] font-bold text-(--ink-soft) uppercase tracking-widest text-left truncate w-full px-0.5">
                                                {curso?.grado} {curso?.seccion}
                                            </p>
                                            <div className="flex items-center gap-1">
                                                {[0, 1, 2].map((dot) => (
                                                    <span
                                                        key={dot}
                                                        className={`h-1.5 w-1.5 rounded-full ${dot < filledDots ? 'bg-(--primary)' : 'bg-slate-200'}`}
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>

            {/* Right column: Registro Anecdótico */}
            <div className="w-full lg:w-90 border-t lg:border-t-0 lg:border-l border-(--border-soft) bg-white shrink-0 shadow-sm">
                <RegistroAnecdotico cursoId={cursoSel} />
            </div>

                      {viewerSeq && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-(--ink)/40 p-4 sm:p-6 backdrop-blur-sm animate-in fade-in duration-200">
                    <div
                        className="flex h-[min(92vh,58rem)] w-full max-w-6xl flex-col overflow-hidden rounded-(--radius-lg) border border-(--border-soft) bg-white shadow-md animate-in zoom-in-95 duration-300"
                    >
                        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-(--border-soft) bg-white px-6 py-4">
                            <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 mb-1.5">
                                    <span className="text-xs font-bold uppercase tracking-widest text-(--ink) bg-(--primary)/15 px-2.5 py-1 rounded-full border border-(--border-soft)">
                                        Vista de Lectura
                                    </span>
                                </div>
                                <h2 className="text-xl font-black tracking-tight text-(--ink) font-notion-title">
                                    {viewerSeq.titulo}
                                </h2>
                                <div className="mt-2 flex flex-wrap items-center gap-3 text-xs font-bold text-(--ink-soft) uppercase tracking-widest">
                                    <span className="flex items-center gap-1.5">
                                        <Bookmark size={12} className="text-(--ink-soft)" />
                                        {getCursoLabel(state.cursos.find((curso) => curso.id === viewerSeq.cursoId))}
                                    </span>
                                    <span className="text-slate-350">•</span>
                                    <span className="inline-flex items-center gap-1.5">
                                        <Calendar size={12} className="text-(--ink-soft)" />
                                        {new Date(viewerSeq.fechaInicio).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}
                                    </span>
                                </div>
                            </div>

                            <div className="flex flex-wrap items-center gap-2.5">
                                <select
                                    className="px-3 rounded-full border border-(--border-soft) bg-white text-xs font-bold text-(--ink) uppercase tracking-wider outline-none transition-all focus-visible:border-(--primary) focus-visible:ring-2 focus-visible:ring-(--primary)/20 appearance-none relative shadow-sm artisan-pill artisan-btn-white"
                                    value={viewerSeq.estado}
                                    style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%232e3330'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.75rem center', backgroundSize: '0.8rem', paddingRight: '2rem' }}
                                    onChange={(event) => {
                                        const nextEstado = event.target.value as Secuencia['estado'];
                                        setViewerSeq((current) => (current ? { ...current, estado: nextEstado } : null));
                                        if (onUpdateSecuencia) {
                                            onUpdateSecuencia({ ...viewerSeq, estado: nextEstado });
                                        }
                                    }}
                                >
                                    <option value="Pendiente">Pendiente</option>
                                    <option value="En progreso">En progreso</option>
                                    <option value="Completada">Completada</option>
                                </select>

                                {viewerSeq.contenidoHtml?.includes('contenteditable="true"') && onUpdateSecuencia && (
                                    <>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const container = document.getElementById('viewer-content-container');
                                                if (container && onUpdateSecuencia) {
                                                    onUpdateSecuencia({ ...viewerSeq, contenidoHtml: container.innerHTML });
                                                }
                                                window.open(`/planificacion-diaria/${viewerSeq.id}`, '_blank');
                                                void handleCloseViewer();
                                            }}
                                            className="px-4.5 rounded-full bg-white border border-(--border-soft) text-(--ink) text-xs font-bold uppercase tracking-wider shadow-sm hover:bg-(--linen)/30 transition-all outline-none flex items-center gap-1.5 artisan-pill"
                                            style={{ height: '36px' }}
                                        >
                                            Abrir en otra pestaña
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const container = document.getElementById('viewer-content-container');
                                                if (container && onUpdateSecuencia) {
                                                    onUpdateSecuencia({ ...viewerSeq, contenidoHtml: container.innerHTML });
                                                    void handleCloseViewer();
                                                }
                                            }}
                                            className="px-4.5 rounded-full bg-(--primary) text-white text-xs font-bold uppercase tracking-wider shadow-sm hover:opacity-90 transition-all outline-none focus-visible:ring-2 focus-visible:ring-(--primary)/50 flex items-center gap-1.5 artisan-pill"
                                            style={{ height: '36px' }}
                                        >
                                            Guardar
                                        </button>
                                    </>
                                )}

                                {onDeleteSecuencia && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            if (window.confirm('¿Eliminar esta planificación?')) {
                                                onDeleteSecuencia(viewerSeq.id);
                                                void handleCloseViewer();
                                            }
                                        }}
                                        className="w-9 h-9 flex items-center justify-center rounded-full bg-white border border-(--border-soft) text-(--ink-soft) hover:text-(--danger) hover:bg-(--tag-rose-bg) hover:border-(--border-soft) transition-all shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-(--danger)/50"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                )}

                                <button
                                    type="button"
                                    onClick={handleCloseViewer}
                                    className="w-9 h-9 flex items-center justify-center rounded-full bg-white border border-(--border-soft) text-(--ink-soft) hover:text-(--ink) hover:bg-(--linen)/30 transition-all shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-(--ink-soft)"
                                >
                                    <X size={15} strokeWidth={2.5} />
                                </button>
                            </div>
                        </div>

                            <div className="flex-1 overflow-auto bg-(--linen)/20 p-4 sm:p-6">
                            <div className="w-full max-w-4xl mb-4">
                                <div className="flex flex-wrap items-center gap-2">
                                    {viewerRecursos.map((recurso: any) => {
                                        const cat = recurso.categoria || recurso.titulo || 'Otro';
                                        const { icon: Icon, bg, text, border } = getCategoriaConfig(cat);
                                        return (
                                            <div key={recurso.id} className="relative group flex items-center">
                                                <button
                                                    onClick={() => window.open(recurso.url, "_blank", "noopener,noreferrer")}
                                                    title="Abrir recurso"
                                                    className={`flex items-center gap-2 px-3 py-1.5 rounded-full border ${bg} ${border} ${text} text-xs font-bold uppercase tracking-wider hover:brightness-95 transition-all shadow-sm artisan-pill cursor-pointer outline-none`}
                                                >
                                                    <Icon size={14} />
                                                    {cat}
                                                </button>
                                                <div className="absolute -top-3 -right-3 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 z-10">
                                                    <button
                                                        onClick={(e) => {
                                                            e.preventDefault();
                                                            e.stopPropagation();
                                                            setEditingRecursoId(recurso.id);
                                                            setNewRecursoCategoria(recurso.categoria || recurso.titulo || CATEGORIAS_RECURSOS[0]);
                                                            setNewRecursoUrl(recurso.url);
                                                            setRecursoError('');
                                                            setIsAddingRecurso(false);
                                                        }}
                                                        className="w-7 h-7 rounded-full bg-white border border-(--border-soft) flex items-center justify-center text-(--ink-soft) hover:text-(--primary) hover:border-(--primary)/30 shadow-sm transition-colors outline-none"
                                                        title="Editar recurso"
                                                    >
                                                        <Edit2 size={12} />
                                                    </button>
                                                    <button
                                                        onClick={(e) => {
                                                            e.preventDefault();
                                                            e.stopPropagation();
                                                            if (window.confirm('¿Eliminar recurso?')) {
                                                                if (viewerSeq) {
                                                                    const updatedSecuencia = {
                                                                        ...viewerSeq,
                                                                        recursos: (viewerSeq.recursos || []).filter((r: any) => r.id !== recurso.id)
                                                                    };
                                                                    if (onUpdateSecuencia) onUpdateSecuencia(updatedSecuencia);
                                                                    setViewerSeq(updatedSecuencia);
                                                                }
                                                            }
                                                        }}
                                                        className="w-7 h-7 rounded-full bg-white border border-(--border-soft) flex items-center justify-center text-(--ink-soft) hover:text-(--danger) hover:border-(--danger)/30 shadow-sm transition-colors outline-none"
                                                        title="Eliminar recurso"
                                                    >
                                                        <Trash2 size={12} />
                                                    </button>
                                                </div>
                                            </div>
                                        )
                                    })}
                                    
                                    {(!isAddingRecurso && !editingRecursoId) && (
                                        <button
                                            onClick={() => { setIsAddingRecurso(true); setEditingRecursoId(null); setNewRecursoCategoria(CATEGORIAS_RECURSOS[0]); setNewRecursoUrl(''); setRecursoError(''); }}
                                            className="px-3 py-1.5 rounded-full bg-(--linen)/30 border border-(--border-soft) text-(--ink-soft) text-xs font-bold uppercase tracking-wider hover:bg-(--linen) hover:text-(--ink) transition-all flex items-center gap-1.5 shadow-sm border-dashed artisan-pill outline-none"
                                        >
                                            <Plus size={14} strokeWidth={3} /> Agregar recurso
                                        </button>
                                    )}
                                </div>

                                {(isAddingRecurso || editingRecursoId) && (
                                    <div className="mt-4 p-5 rounded-2xl bg-white border border-(--border-soft) shadow-sm animate-in fade-in slide-in-from-top-2 max-w-2xl">
                                        <div className="grid gap-4 sm:grid-cols-12 mb-4">
                                            <div className="sm:col-span-6">
                                                <label className="block text-xs font-black uppercase tracking-widest text-(--ink-soft) mb-1.5 ml-1">Categoría</label>
                                                <div className="relative">
                                                    <select
                                                        value={newRecursoCategoria}
                                                        onChange={(e) => { setNewRecursoCategoria(e.target.value); setRecursoError(''); }}
                                                        className="w-full px-4 py-2.5 rounded-xl border border-(--border-soft) bg-white text-sm font-bold text-(--ink) focus:border-(--primary) focus:ring-2 focus:ring-(--primary)/20 outline-none transition-all appearance-none artisan-pill"
                                                        disabled={recursosLoading}
                                                    >
                                                        {CATEGORIAS_RECURSOS.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                                                    </select>
                                                    <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-(--ink-soft) pointer-events-none" />
                                                </div>
                                            </div>
                                            <div className="sm:col-span-6">
                                                <label className="block text-xs font-black uppercase tracking-widest text-(--ink-soft) mb-1.5 ml-1">URL (Enlace)</label>
                                                <input
                                                    type="url"
                                                    value={newRecursoUrl}
                                                    onChange={(e) => { setNewRecursoUrl(e.target.value); setRecursoError(''); }}
                                                    placeholder="https://"
                                                    className="w-full px-4 py-2.5 rounded-xl border border-(--border-soft) bg-white text-sm font-bold text-(--ink) focus:border-(--primary) focus:ring-2 focus:ring-(--primary)/20 outline-none transition-all artisan-pill"
                                                    disabled={recursosLoading}
                                                />
                                            </div>
                                        </div>
                                        {recursoError && <p className="text-xs font-bold text-(--danger) mb-3 ml-1">{recursoError}</p>}
                                        <div className="flex gap-3 justify-end">
                                            <button
                                                onClick={() => { setIsAddingRecurso(false); setEditingRecursoId(null); setNewRecursoCategoria(CATEGORIAS_RECURSOS[0]); setNewRecursoUrl(''); setRecursoError(''); }}
                                                className="px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest text-(--ink-soft) hover:bg-(--border-soft)/50 transition-colors artisan-pill"
                                                disabled={recursosLoading}
                                            >
                                                Cancelar
                                            </button>
                                            <button
                                                onClick={handleAddRecurso}
                                                className="px-5 py-2 rounded-xl bg-(--primary) text-white text-xs font-bold uppercase tracking-widest hover:opacity-90 transition-opacity disabled:opacity-50 artisan-pill shadow-sm"
                                                disabled={recursosLoading || !newRecursoUrl.trim()}
                                            >
                                                {recursosLoading ? 'Guardando...' : (editingRecursoId ? 'Actualizar' : 'Guardar')}
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="flex min-h-full items-start">
                                <div className="w-full max-w-4xl rounded-(--radius-lg) border border-(--border-soft) bg-white p-6 shadow-sm sm:p-10">
                                    {viewerSeq.contenidoHtml ? (
                                        <div
                                            id="viewer-content-container"
                                            className="z-100 prose prose-slate prose-lg mx-auto max-w-none text-(--ink) prose-headings:font-extrabold prose-headings:tracking-tight prose-headings:text-(--ink) prose-p:text-(--ink-soft) prose-strong:text-(--ink) prose-code:text-(--primary)"
                                            dangerouslySetInnerHTML={{ __html: viewerSeq.contenidoHtml }}
                                        />
                                    ) : (
                                        <div className="flex min-h-64 flex-col items-start text-left">
                                            <div className="w-12 h-12 rounded-full bg-(--linen)/20 flex items-center justify-center mb-4">
                                                <BookOpen size={24} className="text-(--ink-soft)" />
                                            </div>
                                            <h3 className="text-lg font-bold text-(--ink)">
                                                Esta secuencia aún no tiene contenido
                                            </h3>
                                            <p className="mt-2 max-w-sm text-xs font-medium text-(--ink-soft) leading-relaxed">
                                                Puedes editar esta secuencia para agregar el contenido didáctico, imágenes o recursos para tu clase.
                                            </p>
                                        </div>
                                    )}
                                         </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <CieloModal
                isOpen={showModal && importStep !== 'template-editor'}
                onClose={() => {
                    setShowModal(false);
                    setErrorMsg(null);
                }}
                title="Nueva Planificación"
                subtitle="Centro de Planificación"
                icon={<BookOpen size={20} />}
                maxWidth="3xl"
            >
                <div className="space-y-4">
                         {errorMsg && (
                             <div className="mb-6 p-4 rounded-xl bg-(--tag-rose-bg) border border-(--border-soft) text-(--tag-rose-text) text-xs font-bold uppercase tracking-wider">
                                 {errorMsg}
                             </div>
                         )}

                         {importStep === 'select-template' && (
                              <div className="p-5 space-y-3">
                                         {/* SECCIÓN RECURSOS */}
                                  <div className="mb-5">
                                      <div className="flex items-center justify-between mb-3">
                                        <h3 className="text-xs font-bold text-(--ink) uppercase tracking-widest flex items-center gap-1.5">
                                            <Bookmark size={14} className="text-(--primary)" /> Recursos Rápidos
                                        </h3>
                                      </div>

                                      <div className="flex flex-wrap items-center gap-2 mb-4">
                                          {viewerRecursos.map((recurso: any) => {
                                              const cat = recurso.categoria || recurso.titulo || 'Otro';
                                              const { icon: Icon, bg, text, border } = getCategoriaConfig(cat);
                                              return (
                                                  <div key={recurso.id} className="relative group flex items-center">
                                                      <button
                                                          onClick={() => window.open(recurso.url, "_blank", "noopener,noreferrer")}
                                                          title="Abrir recurso"
                                                          className={`flex items-center gap-2 px-3 py-1.5 rounded-full border ${bg} ${border} ${text} text-xs font-bold uppercase tracking-wider hover:brightness-95 transition-all shadow-sm artisan-pill cursor-pointer outline-none`}
                                                      >
                                                          <Icon size={14} />
                                                          {cat}
                                                      </button>
                                                      <div className="absolute -top-3 -right-3 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 z-10">
                                                          <button
                                                              onClick={(e) => {
                                                                  e.preventDefault();
                                                                  e.stopPropagation();
                                                                  setEditingRecursoId(recurso.id);
                                                                  setNewRecursoCategoria(recurso.categoria || recurso.titulo || CATEGORIAS_RECURSOS[0]);
                                                                  setNewRecursoUrl(recurso.url);
                                                                  setRecursoError('');
                                                                  setIsAddingRecurso(false);
                                                              }}
                                                              className="w-7 h-7 rounded-full bg-white border border-(--border-soft) flex items-center justify-center text-(--ink-soft) hover:text-(--primary) hover:border-(--primary)/30 shadow-sm transition-colors outline-none"
                                                              title="Editar recurso"
                                                          >
                                                              <Edit2 size={12} />
                                                          </button>
                                                          <button
                                                              onClick={(e) => {
                                                                  e.preventDefault();
                                                                  e.stopPropagation();
                                                                  if (window.confirm('¿Eliminar recurso?')) {
                                                                      const updatedRecursos = (form.recursos || []).filter((r: any) => r.id !== recurso.id);
                                                                      setForm(prev => ({ ...prev, recursos: updatedRecursos }));
                                                                  }
                                                              }}
                                                              className="w-7 h-7 rounded-full bg-white border border-(--border-soft) flex items-center justify-center text-(--ink-soft) hover:text-(--danger) hover:border-(--danger)/30 shadow-sm transition-colors outline-none"
                                                              title="Eliminar recurso"
                                                          >
                                                              <Trash2 size={12} />
                                                          </button>
                                                      </div>
                                                  </div>
                                              )
                                          })}
                                          
                                          {(!isAddingRecurso && !editingRecursoId) && (
                                              <button
                                                  onClick={() => { setIsAddingRecurso(true); setEditingRecursoId(null); setNewRecursoCategoria(CATEGORIAS_RECURSOS[0]); setNewRecursoUrl(''); setRecursoError(''); }}
                                                  className="px-3 py-1.5 rounded-full bg-(--linen)/30 border border-(--border-soft) text-(--ink-soft) text-xs font-bold uppercase tracking-wider hover:bg-(--linen) hover:text-(--ink) transition-all flex items-center gap-1.5 shadow-sm border-dashed artisan-pill outline-none"
                                              >
                                                  <Plus size={14} strokeWidth={3} /> Agregar recurso
                                              </button>
                                          )}
                                      </div>

                                      {(isAddingRecurso || editingRecursoId) && (
                                          <div className="mt-4 p-5 rounded-2xl bg-white border border-(--border-soft) shadow-sm animate-in fade-in slide-in-from-top-2 max-w-2xl">
                                              <div className="grid gap-4 sm:grid-cols-12 mb-4">
                                                  <div className={(!viewerSeq && !editingRecursoId) ? "sm:col-span-4" : "sm:col-span-6"}>
                                                      <label className="block text-xs font-black uppercase tracking-widest text-(--ink-soft) mb-1.5 ml-1">Categoría</label>
                                                      <div className="relative">
                                                          <select
                                                              value={newRecursoCategoria}
                                                              onChange={(e) => { setNewRecursoCategoria(e.target.value); setRecursoError(''); }}
                                                              className="w-full px-4 py-2.5 rounded-xl border border-(--border-soft) bg-white text-sm font-bold text-(--ink) focus:border-(--primary) focus:ring-2 focus:ring-(--primary)/20 outline-none transition-all appearance-none artisan-pill"
                                                              disabled={recursosLoading}
                                                          >
                                                              {CATEGORIAS_RECURSOS.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                                                          </select>
                                                          <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-(--ink-soft) pointer-events-none" />
                                                      </div>
                                                  </div>
                                                  <div className={(!viewerSeq && !editingRecursoId) ? "sm:col-span-4" : "sm:col-span-6"}>
                                                      <label className="block text-xs font-black uppercase tracking-widest text-(--ink-soft) mb-1.5 ml-1">URL (Enlace)</label>
                                                      <input
                                                          type="url"
                                                          value={newRecursoUrl}
                                                          onChange={(e) => { setNewRecursoUrl(e.target.value); setRecursoError(''); }}
                                                          placeholder="https://"
                                                          className="w-full px-4 py-2.5 rounded-xl border border-(--border-soft) bg-white text-sm font-bold text-(--ink) focus:border-(--primary) focus:ring-2 focus:ring-(--primary)/20 outline-none transition-all artisan-pill"
                                                          disabled={recursosLoading}
                                                      />
                                                  </div>
                                                  {(!viewerSeq && !editingRecursoId) && (
                                                      <div className="sm:col-span-4">
                                                          <label className="block text-xs font-black uppercase tracking-widest text-(--ink-soft) mb-1.5 ml-1">Vincular a</label>
                                                          <div className="relative">
                                                              <select
                                                                  value={newRecursoTargetSeq}
                                                                  onChange={(e) => { setNewRecursoTargetSeq(e.target.value === 'new' ? 'new' : Number(e.target.value)); setRecursoError(''); }}
                                                                  className="w-full px-4 py-2.5 rounded-xl border border-(--border-soft) bg-white text-sm font-bold text-(--ink) focus:border-(--primary) focus:ring-2 focus:ring-(--primary)/20 outline-none transition-all appearance-none artisan-pill truncate"
                                                                  disabled={recursosLoading}
                                                              >
                                                                  <option value="new">Nueva plantilla</option>
                                                                  {secuenciasCurso.map((seq: Secuencia) => (
                                                                      <option key={seq.id} value={seq.id}>{seq.titulo}</option>
                                                                  ))}
                                                              </select>
                                                              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-(--ink-soft) pointer-events-none" />
                                                          </div>
                                                      </div>
                                                  )}
                                              </div>
                                              {recursoError && <p className="text-xs font-bold text-(--danger) mb-3 ml-1">{recursoError}</p>}
                                              <div className="flex gap-3 justify-end">
                                                  <button
                                                      onClick={() => { setIsAddingRecurso(false); setEditingRecursoId(null); setNewRecursoCategoria(CATEGORIAS_RECURSOS[0]); setNewRecursoUrl(''); setRecursoError(''); }}
                                                      className="px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest text-(--ink-soft) hover:bg-(--border-soft)/50 transition-colors artisan-pill"
                                                      disabled={recursosLoading}
                                                  >
                                                      Cancelar
                                                  </button>
                                                  <button
                                                      onClick={handleAddRecurso}
                                                      className="px-5 py-2 rounded-xl bg-(--primary) text-white text-xs font-bold uppercase tracking-widest hover:opacity-90 transition-opacity disabled:opacity-50 artisan-pill shadow-sm"
                                                      disabled={recursosLoading || !newRecursoUrl.trim()}
                                                  >
                                                      {recursosLoading ? 'Guardando...' : (editingRecursoId ? 'Actualizar' : 'Guardar')}
                                                  </button>
                                              </div>
                                          </div>
                                      )}
                                  </div>
                                  <div className="border-t border-(--border-soft) pt-5">
                                      <p className="text-xs font-bold text-(--ink-soft) uppercase tracking-widest mb-4">
                                          Plantillas Disponibles
                                      </p>
                                      <div className="grid gap-3">
                                      <button
                                          onClick={() => {
                                                const curso = state.cursos.find(c => c.id === form.cursoId) || state.cursos[0];
                                                const centroNombre = session?.user?.user_metadata?.centro_nombre || 'Mi Centro';
                                                const codigoCentro = session?.user?.user_metadata?.codigo_centro || '';
                                                const docenteNombre = session?.user?.user_metadata?.full_name || session?.user?.user_metadata?.nombre_docente || 'Docente';
                                                const htmlContent = getPlanificacionDiariaTemplate({
                                                    centro: centroNombre,
                                                    codigoCentro,
                                                    docente: docenteNombre,
                                                    asignatura: curso?.asignatura || '',
                                                    grado: curso?.grado || '',
                                                    seccion: curso?.seccion || '',
                                                    fecha: form.fechaInicio
                                                });
                                                setForm(prev => ({
                                                    ...prev,
                                                    titulo: 'Planificación - ' + (curso?.asignatura || 'Clase'),
                                                    contenidoHtml: htmlContent
                                                }));
                                                setImportStep('template-editor');
                                          }}
                                          className="w-full text-left p-4 rounded-xl border border-(--border-soft) bg-white hover:border-(--primary) hover:bg-(--linen)/20 transition-all cursor-pointer group flex items-start gap-3"
                                      >
                                          <div className="w-10 h-10 rounded-lg bg-(--tag-indigo-bg) flex items-center justify-center shrink-0 border border-(--border-soft)">
                                             <BookOpen size={20} className="text-(--primary)" />
                                          </div>
                                          <div>
                                             <h3 className="text-sm font-black uppercase tracking-wider text-(--ink) group-hover:text-(--primary) transition-colors">
                                                 Planificación de Clase Diaria
                                             </h3>
                                             <p className="mt-1 text-xs font-medium text-(--ink-soft) leading-relaxed">
                                                 Formato estándar MINERD para planificar el día a día, con secciones de inicio, desarrollo, cierre e indicadores de logro.
                                             </p>
                                          </div>
                                      </button>

                                      {/* Selector de período de recuperación */}
                                      <div className="flex items-center gap-3 px-1">
                                          <label className="text-xs font-bold text-(--ink-soft) uppercase tracking-wider whitespace-nowrap">Período:</label>
                                          <div className="flex gap-1.5">
                                              {(['P1', 'P2', 'P3'] as const).map(p => (
                                                  <button
                                                      key={p}
                                                      onClick={() => setPeriodoRecuperacion(p)}
                                                      disabled={!isPeriodoDisponible(PERIODOS_RECUPERACION[p].fechaInicio)}
                                                      className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider transition-all cursor-pointer outline-none ${
                                                          periodoRecuperacion === p
                                                              ? 'bg-(--primary) text-white shadow-sm'
                                                              : isPeriodoDisponible(PERIODOS_RECUPERACION[p].fechaInicio)
                                                                  ? 'bg-white border border-(--border-soft) text-(--ink) hover:bg-(--linen)/40'
                                                                  : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                                      }`}
                                                  >
                                                      {p}
                                                  </button>
                                              ))}
                                          </div>
                                          <span className="text-[10px] font-medium text-(--ink-soft) italic">
                                              {PERIODOS_RECUPERACION[periodoRecuperacion].nombre}
                                          </span>
                                      </div>

                                      {/* Botón Plan de Recuperación Pedagógica */}
                                      <button
                                          onClick={async () => {
                                               const curso = state.cursos.find(c => c.id === form.cursoId) || state.cursos[0];
                                               if (!curso) return;

                                               const miPerfil = state.perfiles.find(p => p.userId === session?.user?.id);
                                               const centroNombre = state.centros?.find(c => c.id === miPerfil?.centro_id)?.nombre || session?.user?.user_metadata?.centro_nombre || 'Mi Centro';
                                               const codigoCentro = state.centros?.find(c => c.id === miPerfil?.centro_id)?.codigoCentro || session?.user?.user_metadata?.codigo_centro || '';
                                               const docenteNombre = miPerfil?.nombreDocente || session?.user?.user_metadata?.full_name || session?.user?.user_metadata?.nombre_docente || 'Docente';

                                               const periodo = PERIODOS_RECUPERACION[periodoRecuperacion];

                                               const { data: estudiantesRaw } = await supabase
                                                   .from('estudiantes')
                                                   .select('*')
                                                   .eq('curso_id', curso.id)
                                                   .eq('activo', true);

                                               const { data: calificacionesRaw } = await supabase
                                                   .from('calificaciones')
                                                   .select('*')
                                                   .eq('curso_id', curso.id);

                                               const estudiantes = (estudiantesRaw || []).map((e: any) => {
                                                   const calEst = (calificacionesRaw || []).filter((c: any) => c.estudiante_id === e.id);
                                                   const actividades = calEst
                                                       .filter((c: any) => c.puntaje < 70)
                                                       .map((c: any) => ({
                                                           nombre: c.asignatura || 'Actividad',
                                                           competencias: c.competencias || [],
                                                           indicador: '',
                                                           producto: '',
                                                           puntajeObtenido: c.puntaje || 0
                                                       }));
                                                   return {
                                                       nombreCompleto: `${e.nombre} ${e.apellido}`,
                                                       curso: `${curso.grado} "${curso.seccion}"`,
                                                       actividades
                                                   };
                                               }).filter((e: any) => e.actividades.length > 0);

                                               const htmlContent = getPlanRecuperacionTemplate({
                                                   centro: centroNombre,
                                                   codigoCentro,
                                                   docente: docenteNombre,
                                                   asignatura: curso.asignatura || '',
                                                   grado: curso.grado || '',
                                                   seccion: curso.seccion || '',
                                                   fecha: new Date().toISOString().split('T')[0],
                                                   periodoRecuperacion,
                                                   nombrePeriodo: periodo.nombre,
                                                   estudiantes
                                               });

                                               const blob = new Blob([htmlContent], { type: 'text/html' });
                                               const url = URL.createObjectURL(blob);
                                               window.open(url, '_blank');
                                               setShowModal(false);
                                           }}
                                          className="w-full text-left p-4 rounded-xl border border-(--border-soft) bg-white hover:border-herb-garden hover:bg-herb-garden/5 transition-all cursor-pointer group flex items-start gap-3"
                                      >
                                          <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0 border border-emerald-200">
                                             <RotateCcw size={20} className="text-herb-garden" />
                                          </div>
                                          <div>
                                             <h3 className="text-sm font-black uppercase tracking-wider text-(--ink) group-hover:text-herb-garden transition-colors">
                                                 Plan de Recuperación Pedagógica
                                             </h3>
                                             <p className="mt-1 text-xs font-medium text-(--ink-soft) leading-relaxed">
                                                 Documento individualizado para la recuperación académica de estudiantes con puntajes menores a 70. Periodo: {PERIODOS_RECUPERACION[periodoRecuperacion].nombre}.
                                             </p>
                                          </div>
                                      </button>
                                  </div>
                              </div>
                              </div>
                          )}
                 </div>
             </CieloModal>

             {showModal && importStep === 'template-editor' && (
                 <div className="fixed inset-0 z-100 bg-(--background) flex flex-col w-full h-full">
                     <div className="bg-white border-b border-(--border-soft) px-4 py-3 flex items-center justify-between shrink-0 shadow-sm">
                         <div className="flex flex-col gap-1">
                             <label className="text-xs font-black uppercase tracking-widest text-(--ink-soft)">Título de la Planificación</label>
                             <input 
                                 className="px-3 py-2 text-sm font-bold border border-(--border-soft) bg-(--linen)/15 text-(--ink) rounded-lg outline-none focus:border-(--primary) w-72 transition-colors"
                                 value={form.titulo}
                                 onChange={e => setForm(prev => ({...prev, titulo: e.target.value}))}
                                 placeholder="Ej. Unidad 1 - Comprensión lectora"
                             />
                         </div>
                         <div className="flex flex-col gap-1">
                             <label className="text-xs font-black uppercase tracking-widest text-(--ink-soft)">Curso Vinculado</label>
                             <select 
                                 className="px-3 py-2 text-sm font-bold border border-(--border-soft) bg-(--linen)/15 text-(--ink) rounded-lg outline-none focus:border-(--primary) w-64 transition-colors"
                                 value={form.cursoId}
                                 onChange={e => setForm(prev => ({...prev, cursoId: Number(e.target.value)}))}
                             >
                                 <option value={0}>Selecciona un curso</option>
                                 {state.cursos.map(c => <option key={c.id} value={c.id}>{getCursoLabel(c)}</option>)}
                             </select>
                         </div>
                         <div className="flex items-center gap-3">
                              <button
                                  type="button"
                                  onClick={() => setImportStep('select-template')}
                                  className="px-6 py-2.5 rounded-xl bg-white border border-(--border-soft) text-(--ink-soft) text-xs font-bold uppercase tracking-widest shadow-sm hover:bg-(--linen)/30 transition-all outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
                              >
                                  Volver
                              </button>
                              <button
                                  type="button"
onClick={() => {
                                       const curso = state.cursos.find(c => c.id === form.cursoId) || state.cursos[0];
                                       const miPerfil = state.perfiles.find(p => p.userId === session?.user?.id);
                                       const centroNombre = state.centros?.find(c => c.id === miPerfil?.centro_id)?.nombre || session?.user?.user_metadata?.centro_nombre || 'Mi Centro';
                                       const codigoCentro = state.centros?.find(c => c.id === miPerfil?.centro_id)?.codigoCentro || session?.user?.user_metadata?.codigo_centro || '';
                                       const docenteNombre = miPerfil?.nombreDocente || session?.user?.user_metadata?.full_name || session?.user?.user_metadata?.nombre_docente || 'Docente';
                                       const params = new URLSearchParams();
                                       if (form.cursoId) params.set('cursoId', String(form.cursoId));
                                       if (form.fechaInicio) params.set('fecha', form.fechaInicio);
                                       if (curso?.asignatura) params.set('asignatura', curso.asignatura);
                                       if (curso?.grado) params.set('grado', curso.grado);
                                       if (curso?.seccion) params.set('seccion', curso.seccion);
                                       params.set('centro', centroNombre);
                                       params.set('codigo', codigoCentro);
                                       params.set('docente', docenteNombre);
                                       const qs = params.toString();
                                       window.open(`/planificacion-diaria/plantilla${qs ? `?${qs}` : ''}`, '_blank');
                                       setShowModal(false);
                                   }}
                                  className="px-6 py-2.5 rounded-xl bg-white border border-(--border-soft) text-(--ink) text-xs font-bold uppercase tracking-widest shadow-sm hover:bg-(--linen)/30 transition-all outline-none"
                              >
                                  Abrir en otra pestaña
                              </button>
                              <button
                                  type="button"
onClick={async () => {
                                       const container = document.getElementById('template-editor-container');
                                       if (container) {
                                           const creada = await onAddSecuencia({ ...form, contenidoHtml: container.innerHTML, estado: 'Pendiente', cursoId: form.cursoId });
                                           if (!creada) return;
                                           setShowModal(false);
                                           setForm({
                                              titulo: '',
                                              cursoId: 0,
                                              fechaInicio: new Date().toISOString().split('T')[0],
                                              contenidoHtml: '',
                                           });
                                       }
                                   }}
                                  className="px-6 py-2.5 rounded-xl bg-(--primary) text-white text-xs font-black uppercase tracking-widest shadow-sm hover:opacity-90 active:scale-95 transition-all outline-none focus-visible:ring-2 focus-visible:ring-(--primary)/50"
                              >
                                  Guardar
                              </button>
                          </div>
                     </div>
                     
                     <div className="flex-1 overflow-y-auto p-3 md:p-6 bg-(--linen)/20 flex justify-center">
                         <div className="w-full max-w-6xl bg-white shadow-sm border border-(--border-soft) p-8 rounded-(--radius-md) shrink-0">
                             <div 
                                 id="template-editor-container"
                                 className="prose prose-slate max-w-none prose-sm w-full"
                                 dangerouslySetInnerHTML={{ __html: form.contenidoHtml }}
                             />
                         </div>
                     </div>
                 </div>
             )}
        </div>
    );
}
