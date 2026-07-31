import { useEffect, useRef, useState } from 'react';
import { BookOpen, Calendar, ChevronDown, Maximize2, Minimize2, Plus, Trash2, X, Bookmark } from 'lucide-react';
import blueBookIcon from '../assets/book-blue.png';
import purpleBookIcon from '../assets/book-purple.png';
import type { Curso, Secuencia } from '../types';

import { useAppStore } from '../store/appStore';

interface Props {
    onAddSecuencia?: (s: Omit<Secuencia, 'id'>) => void;
    onUpdateSecuencia?: (seq: Secuencia) => void;
    onDeleteSecuencia?: (id: number) => void;
    readOnly?: boolean;
    initialDatos?: Secuencia;
}

const BOOK_ICONS = [blueBookIcon, purpleBookIcon];

function getCursoLabel(curso?: Curso) {
    if (!curso) return 'Curso sin asignar';
    return `${curso.grado} ${curso.seccion} • ${curso.nombre}`;
}

function getDisplayStatus(estado: Secuencia['estado']) {
    if (estado === 'Completada') return 'Completado';
    if (estado === 'En progreso') return 'En progreso';
    return 'Sin iniciar';
}

function getDotCount(estado: Secuencia['estado']) {
    if (estado === 'Completada') return 3;
    if (estado === 'En progreso') return 2;
    return 1;
}

export default function Planificacion({ onAddSecuencia = () => {}, onUpdateSecuencia, onDeleteSecuencia, readOnly, initialDatos }: Props) {
    const state = useAppStore((s) => s.state);

    if (readOnly && initialDatos) {
        return (
            <div className="flex h-full w-full flex-col overflow-hidden bg-[#FDFBF7]">
                <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 bg-white px-8 py-6">
                    <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1.5">
                            <span className="text-[10px] font-black uppercase tracking-widest text-turf-green-base bg-turf-green-base/10 px-2.5 py-1 rounded-md">
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

                <div className="flex-1 overflow-auto bg-slate-50 p-6 sm:p-10">
                    <div className="flex min-h-full items-start justify-center">
                        <div className="w-full max-w-4xl rounded-3xl border border-slate-200 bg-white p-8 shadow-sm sm:p-14">
                            {initialDatos.contenidoHtml ? (
                                <div
                                    className="prose prose-slate prose-lg mx-auto max-w-none text-slate-800 prose-headings:font-extrabold prose-headings:tracking-tight prose-headings:text-slate-900 prose-p:text-slate-600 prose-strong:text-slate-900 prose-code:text-emerald-600"
                                    dangerouslySetInnerHTML={{ __html: initialDatos.contenidoHtml }}
                                />
                            ) : (
                                <div className="flex min-h-96 flex-col items-center justify-center text-center">
                                    <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center mb-6">
                                        <BookOpen size={32} className="text-slate-300" />
                                    </div>
                                    <h3 className="text-xl font-bold text-slate-900">
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
    const [showModal, setShowModal] = useState(false);
    const [importStep, setImportStep] = useState<'select' | 'html-form'>('select');
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
    }>({
        titulo: '',
        cursoId: state.cursos[0]?.id ?? 0,
        fechaInicio: new Date().toISOString().split('T')[0],
        contenidoHtml: '',
        archivoUrl: undefined,
        archivoNombre: undefined,
        archivoSize: undefined,
        archivoTipo: undefined,
        archivoFechaCarga: undefined
    });
    const [viewerSeq, setViewerSeq] = useState<Secuencia | null>(null);
    const [isPresenting, setIsPresenting] = useState(false);
    const viewerRef = useRef<HTMLDivElement | null>(null);

    const handleHtmlFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setErrorMsg(null);

        // Validation: verify file extension
        const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
        if (ext !== '.html' && ext !== '.htm') {
            setErrorMsg('El archivo seleccionado no es válido. Por favor, cargue un archivo con extensión .html o .htm.');
            e.target.value = ''; // Reset input
            return;
        }

        const reader = new FileReader();
        reader.onload = (event) => {
            const content = event.target?.result as string;
            const cleanName = file.name.replace(/\.[^/.]+$/, "");
            setForm({
                titulo: cleanName,
                cursoId: state.cursos[0]?.id ?? 0,
                fechaInicio: new Date().toISOString().split('T')[0],
                contenidoHtml: content,
                archivoUrl: undefined,
                archivoNombre: undefined,
                archivoSize: undefined,
                archivoTipo: undefined,
                archivoFechaCarga: undefined
            });
            setImportStep('html-form');
        };
        reader.onerror = () => {
            setErrorMsg('Error al leer el archivo. Inténtelo de nuevo.');
        };
        reader.readAsText(file);
        e.target.value = ''; // Reset input to allow choosing again
    };

    const secuenciasCurso = state.secuencias.filter((secuencia) => secuencia.cursoId === cursoSel);
    useEffect(() => {
        function handleFullscreenChange() {
            setIsPresenting(document.fullscreenElement === viewerRef.current);
        }

        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, []);

    function handleCreate() {
        if (!form.titulo.trim()) return;

        onAddSecuencia({ ...form, estado: 'Pendiente', cursoId: form.cursoId });
        setShowModal(false);
        setForm({
            titulo: '',
            cursoId: state.cursos[0]?.id ?? 0,
            fechaInicio: new Date().toISOString().split('T')[0],
            contenidoHtml: '',
            archivoUrl: undefined,
            archivoNombre: undefined,
            archivoSize: undefined,
            archivoTipo: undefined,
            archivoFechaCarga: undefined
        });
        setErrorMsg(null);
    }

    async function handleCloseViewer() {
        if (document.fullscreenElement === viewerRef.current) {
            await document.exitFullscreen();
        }
        setViewerSeq(null);
    }

    async function togglePresentation() {
        const viewerElement = viewerRef.current;
        if (!viewerElement) return;

        if (document.fullscreenElement === viewerElement) {
            await document.exitFullscreen();
            return;
        }

        if (document.fullscreenElement) {
            await document.exitFullscreen();
        }

        await viewerElement.requestFullscreen();
    }

    return (
        <div className="flex flex-col flex-1 h-full overflow-hidden bg-[#FDFBF7]">
            <div className="flex-1 overflow-y-auto px-6 py-10 md:px-12 scroll-smooth scrollbar-hide">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 mb-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div>
                        <h1 className="text-4xl font-black text-[#1E293B] tracking-tight mb-3 font-notion-title">
                            Secuencias Didácticas
                        </h1>
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2.5 bg-slate-200/50 px-4 py-2 rounded-xl border border-slate-200">
                                <span className="text-[11px] font-black text-slate-600 uppercase tracking-widest">
                                    Pedagogía y Secuencias
                                </span>
                            </div>
                            <div className="h-1.5 w-1.5 rounded-full bg-slate-400"></div>
                            <span className="text-[11px] font-black text-slate-500 uppercase tracking-[0.2em]">Material Docente</span>
                        </div>
                    </div>

                    <div className="flex flex-col items-stretch sm:items-center gap-4 sm:flex-row">
                        <div className="relative group">
                            <select
                                className="h-14 pl-6 pr-11 appearance-none rounded-2xl bg-white border border-slate-200 text-slate-700 text-sm font-bold uppercase tracking-widest shadow-lg shadow-slate-200/40 outline-none focus-visible:border-turf-green-base focus-visible:ring-2 focus-visible:ring-turf-green-base/50 cursor-pointer transition-all hover:border-slate-300 min-w-60"
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
                                className="pointer-events-none absolute right-5 top-1/2 -translate-y-1/2 text-slate-500 transition-colors group-hover:text-turf-green-base"
                            />
                        </div>

                        <button
                            onClick={() => { setShowModal(true); setImportStep('select'); }}
                            className="h-14 px-8 rounded-2xl bg-turf-green-base text-white text-sm font-black uppercase tracking-widest shadow-2xl shadow-turf-green-base/20 hover:bg-turf-green-base/90 hover:-translate-y-1 transition-all active:scale-95 outline-none focus-visible:ring-2 focus-visible:ring-turf-green-base/50 focus-visible:ring-offset-2 flex items-center justify-center gap-3 shrink-0"
                        >
                            <Plus size={20} strokeWidth={3} className="transition-transform duration-700 hover:rotate-180" />
                            <span>Nueva secuencia</span>
                        </button>
                    </div>
                </div>

                <div className="max-w-350 mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 delay-100 fill-mode-both">
                    {secuenciasCurso.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-24 px-8 border-2 border-dashed border-slate-300 rounded-4xl bg-white/50 text-center shadow-sm">
                            <div className="w-20 h-20 bg-slate-100/80 rounded-full flex items-center justify-center mb-6 shadow-inner border border-slate-200/50">
                                <BookOpen size={40} className="text-slate-400" />
                            </div>
                            <h2 className="text-2xl font-black text-[#1E293B] tracking-tight font-notion-title mb-2">
                                No hay secuencias para este curso
                            </h2>
                            <p className="text-slate-500 font-medium max-w-md mx-auto leading-relaxed text-sm">
                                Crea una nueva secuencia para comenzar a organizar el material didáctico de esta asignatura.
                            </p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 gap-x-6 gap-y-12 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                            {secuenciasCurso.map((seq, index) => {
                                const curso = state.cursos.find((item) => item.id === seq.cursoId);
                                const bookIcon = BOOK_ICONS[index % BOOK_ICONS.length];
                                const filledDots = getDotCount(seq.estado);

                                return (
                                    <button
                                        key={seq.id}
                                        type="button"
                                        onClick={() => setViewerSeq(seq)}
                                        className="group flex flex-col items-center text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-turf-green-base/50 rounded-2xl p-4 transition-all hover:bg-white hover:shadow-xl hover:shadow-slate-200/50 hover:-translate-y-1"
                                    >
                                        <div className="relative flex h-48 items-end justify-center mb-4">
                                            <img
                                                src={bookIcon}
                                                alt=""
                                                className="w-32 transition-all duration-300 ease-out group-hover:-translate-y-3 group-hover:rotate-1 group-hover:drop-shadow-xl"
                                            />
                                            <div className="pointer-events-none absolute bottom-0 h-4 w-20 rounded-full bg-slate-900/5 blur-md transition-all duration-300 group-hover:w-28 group-hover:bg-slate-900/10" />
                                        </div>

                                        <div className="max-w-48">
                                            <h3 className="text-[15px] font-black text-[#1E293B] leading-snug group-hover:text-turf-green-base transition-colors font-notion-title">
                                                {seq.titulo}
                                            </h3>
                                            <p className="mt-1 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                                {curso?.grado} {curso?.seccion}
                                            </p>
                                        </div>

                                        <div className="mt-4 flex flex-col items-center gap-2">
                                            <div className="flex items-center gap-1.5">
                                                {[0, 1, 2].map((dot) => (
                                                    <span
                                                        key={dot}
                                                        className={`h-1.5 w-1.5 rounded-full ${dot < filledDots ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]' : 'bg-slate-200'}`}
                                                    />
                                                ))}
                                            </div>
                                            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 px-2 py-0.5 rounded-md border border-slate-100 group-hover:border-emerald-100 group-hover:text-emerald-600 transition-colors">
                                                {getDisplayStatus(seq.estado)}
                                            </p>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {viewerSeq && (
                <div className="fixed inset-0 z-110 flex items-center justify-center bg-slate-900/60 px-4 py-5 backdrop-blur-sm sm:p-8">
                    <div
                        ref={viewerRef}
                        className="flex h-[min(92vh,58rem)] w-full max-w-6xl flex-col overflow-hidden rounded-none border border-slate-200 bg-white shadow-2xl animate-in zoom-in-95 duration-300"
                    >
                        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 bg-white px-8 py-6">
                            <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 mb-1.5">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-turf-green-base bg-turf-green-base/10 px-2.5 py-1 rounded-md">
                                        Vista de Lectura
                                    </span>
                                </div>
                                <h2 className="text-2xl font-black tracking-tight text-[#1E293B] font-notion-title">
                                    {viewerSeq.titulo}
                                </h2>
                                <div className="mt-2 flex flex-wrap items-center gap-3 text-xs font-bold text-slate-500 uppercase tracking-widest">
                                    <span className="flex items-center gap-1.5">
                                        <Bookmark size={14} className="text-slate-400" />
                                        {getCursoLabel(state.cursos.find((curso) => curso.id === viewerSeq.cursoId))}
                                    </span>
                                    <span className="text-slate-300">•</span>
                                    <span className="inline-flex items-center gap-1.5">
                                        <Calendar size={14} className="text-slate-400" />
                                        {new Date(viewerSeq.fechaInicio).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}
                                    </span>
                                </div>
                            </div>

                            <div className="flex flex-wrap items-center gap-3">
                                <select
                                    className="h-10 px-3 pr-8 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 outline-none transition-all focus-visible:border-turf-green-base focus-visible:ring-2 focus-visible:ring-turf-green-base/50 appearance-none relative shadow-sm"
                                    value={viewerSeq.estado}
                                    style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2394a3b8'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.5rem center', backgroundSize: '1rem' }}
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

                                <button
                                    type="button"
                                    onClick={() => {
                                        void togglePresentation();
                                    }}
                                    className="h-10 px-4 rounded-xl bg-white border border-slate-200 text-slate-600 text-xs font-bold uppercase tracking-widest shadow-sm hover:bg-slate-50 hover:border-slate-300 transition-all outline-none focus-visible:ring-2 focus-visible:ring-turf-green-base/50 flex items-center gap-2"
                                >
                                    {isPresenting ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                                    <span className="hidden sm:inline">{isPresenting ? 'Salir' : 'Presentar'}</span>
                                </button>

                                {onDeleteSecuencia && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            if (window.confirm('¿Eliminar esta planificación?')) {
                                                onDeleteSecuencia(viewerSeq.id);
                                                void handleCloseViewer();
                                            }
                                        }}
                                        className="h-10 w-10 flex items-center justify-center rounded-xl bg-white border border-slate-200 text-slate-400 hover:text-red-ochre-base hover:bg-red-ochre-base/5 hover:border-red-ochre-base/20 transition-all shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-red-ochre-base/50"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                )}

                                <button
                                    type="button"
                                    onClick={handleCloseViewer}
                                    className="h-10 w-10 flex items-center justify-center rounded-xl bg-white border border-slate-200 text-slate-400 hover:text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
                                >
                                    <X size={16} strokeWidth={2.5} />
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 overflow-auto bg-slate-50 p-6 sm:p-10">
                            <div className="flex min-h-full items-start justify-center">
                                <div className="w-full max-w-4xl rounded-3xl border border-slate-200 bg-white p-8 shadow-sm sm:p-14">
                                    {viewerSeq.contenidoHtml ? (
                                        <div
                                            className="prose prose-slate prose-lg mx-auto max-w-none text-slate-800 prose-headings:font-extrabold prose-headings:tracking-tight prose-headings:text-slate-900 prose-p:text-slate-600 prose-strong:text-slate-900 prose-code:text-emerald-600"
                                            dangerouslySetInnerHTML={{ __html: viewerSeq.contenidoHtml }}
                                        />
                                    ) : (
                                        <div className="flex min-h-96 flex-col items-center justify-center text-center">
                                            <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center mb-6">
                                                <BookOpen size={32} className="text-slate-300" />
                                            </div>
                                            <h3 className="text-xl font-bold text-slate-900">
                                                Esta secuencia aún no tiene contenido
                                            </h3>
                                            <p className="mt-3 max-w-sm text-sm font-medium text-slate-500 leading-relaxed">
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

            {showModal && (
                <div className="fixed inset-0 z-120 flex items-center justify-center bg-slate-900/60 px-4 py-5 backdrop-blur-sm sm:p-8">
                     <div className="w-full max-w-3xl overflow-hidden rounded-none border border-slate-200 bg-white shadow-2xl animate-in zoom-in-95 duration-200">
                         <div className="flex items-center justify-between border-b border-slate-100 bg-white px-8 py-6">
                             <div>
                                 <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                     Centro de Planificación
                                 </span>
                                 <h2 className="mt-1 text-2xl font-black tracking-tight text-[#1E293B] font-notion-title">
                                     {importStep === 'select' ? 'Nueva Planificación' : 'Crear Secuencia HTML'}
                                 </h2>
                             </div>
                             <button
                                 type="button"
                                 onClick={() => {
                                     setShowModal(false);
                                     setErrorMsg(null);
                                 }}
                                 className="px-3 py-1.5 rounded-xl border border-slate-200 text-slate-500 hover:text-slate-700 hover:bg-slate-50 transition-all text-xs font-black uppercase tracking-widest outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
                             >
                                 Cerrar
                             </button>
                         </div>

                         {errorMsg && (
                             <div className="mx-8 mt-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-bold uppercase tracking-wider">
                                 {errorMsg}
                             </div>
                         )}

                         {importStep === 'select' && (
                             <div className="p-8 space-y-4">
                                 <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-6">
                                     Seleccione el método de creación de su secuencia didáctica
                                 </p>
                                 
                                 <div className="grid gap-4">
                                     <button
                                         onClick={() => {
                                             setForm({
                                                 titulo: '',
                                                 cursoId: state.cursos[0]?.id ?? 0,
                                                 fechaInicio: new Date().toISOString().split('T')[0],
                                                 contenidoHtml: '',
                                                 archivoUrl: undefined,
                                                 archivoNombre: undefined,
                                                 archivoSize: undefined,
                                                 archivoTipo: undefined,
                                                 archivoFechaCarga: undefined
                                             });
                                             setErrorMsg(null);
                                             setImportStep('html-form');
                                         }}
                                         className="w-full text-left p-6 rounded-2xl border border-slate-200 bg-white hover:border-turf-green-base hover:bg-slate-50/50 transition-all cursor-pointer group"
                                     >
                                         <h3 className="text-sm font-black uppercase tracking-wider text-[#1E293B] group-hover:text-turf-green-base transition-colors">
                                             Crear secuencia HTML
                                         </h3>
                                         <p className="mt-2 text-xs font-medium text-slate-500 leading-relaxed">
                                             Diseñe y configure la secuencia estructurando manualmente el título, curso asignado y contenido HTML de la clase.
                                         </p>
                                     </button>

                                     <label
                                         className="w-full text-left p-6 rounded-2xl border border-slate-200 bg-white hover:border-turf-green-base hover:bg-slate-50/50 transition-all cursor-pointer group block"
                                     >
                                         <input
                                             type="file"
                                             accept=".html,.htm"
                                             className="hidden"
                                             onChange={handleHtmlFileChange}
                                         />
                                         <h3 className="text-sm font-black uppercase tracking-wider text-[#1E293B] group-hover:text-turf-green-base transition-colors">
                                             Subir archivo HTML
                                         </h3>
                                         <p className="mt-2 text-xs font-medium text-slate-500 leading-relaxed">
                                             Seleccione un archivo HTML (.html o .htm) de su computadora para cargar su contenido en el editor.
                                         </p>
                                     </label>
                                 </div>
                             </div>
                         )}

                         {importStep === 'html-form' && (
                             <>
                                 <div className="p-8 space-y-6 max-h-[60vh] overflow-y-auto">
                                     <div className="grid gap-6 md:grid-cols-2">
                                         <div className="space-y-2">
                                             <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">
                                                 Título de la secuencia
                                             </label>
                                             <input
                                                 className="h-14 w-full px-5 rounded-2xl bg-white border border-slate-200 text-[#1E293B] text-sm font-bold shadow-sm outline-none focus-visible:border-turf-green-base focus-visible:ring-2 focus-visible:ring-turf-green-base/50 transition-all placeholder:font-medium placeholder:text-slate-400"
                                                 placeholder="Ej. Unidad 1 - Comprensión lectora"
                                                 value={form.titulo}
                                                 onChange={(event) => setForm((prev) => ({ ...prev, titulo: event.target.value }))}
                                             />
                                         </div>

                                         <div className="space-y-2">
                                             <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">
                                                 Curso vinculado
                                             </label>
                                             <div className="relative">
                                                 <select
                                                     className="h-14 w-full px-5 pr-11 appearance-none rounded-2xl bg-white border border-slate-200 text-[#1E293B] text-sm font-bold shadow-sm outline-none transition-all focus-visible:border-turf-green-base focus-visible:ring-2 focus-visible:ring-turf-green-base/50 cursor-pointer"
                                                     value={form.cursoId}
                                                     onChange={(event) => setForm((prev) => ({ ...prev, cursoId: Number(event.target.value) }))}
                                                 >
                                                     {state.cursos.map((curso) => (
                                                         <option key={curso.id} value={curso.id}>
                                                             {getCursoLabel(curso)}
                                                         </option>
                                                     ))}
                                                 </select>
                                                 <ChevronDown
                                                     size={14}
                                                     className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-500"
                                                 />
                                             </div>
                                         </div>
                                     </div>

                                     <div className="space-y-2">
                                         <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">
                                             Contenido HTML (Cuerpo de la clase)
                                         </label>
                                         <textarea
                                             className="h-64 w-full rounded-2xl border border-slate-200 bg-slate-900 p-5 font-mono text-sm leading-relaxed text-[#0F753D] outline-none transition-all focus-visible:ring-2 focus-visible:ring-turf-green-base/50 focus-visible:border-turf-green-base shadow-sm"
                                             placeholder="<h2>Introducción</h2>\n<p>Escribe aquí el contenido didáctico de tu clase...</p>"
                                             value={form.contenidoHtml}
                                             onChange={(event) => setForm((prev) => ({ ...prev, contenidoHtml: event.target.value }))}
                                         />
                                     </div>
                                 </div>

                                 <div className="flex flex-col gap-3 border-t border-slate-100 bg-slate-50/50 px-8 py-6 sm:flex-row">
                                     <button
                                         type="button"
                                         onClick={() => {
                                             setErrorMsg(null);
                                             setImportStep('select');
                                         }}
                                         className="h-14 px-8 rounded-2xl bg-white border border-slate-200 text-slate-600 text-sm font-bold uppercase tracking-widest shadow-lg shadow-slate-200/40 hover:bg-slate-50 hover:border-slate-300 transition-all outline-none focus-visible:ring-2 focus-visible:ring-turf-green-base/50 flex-1 flex items-center justify-center"
                                     >
                                         Volver
                                     </button>
                                     <button
                                         type="button"
                                         onClick={handleCreate}
                                         className="h-14 px-8 rounded-2xl bg-turf-green-base text-white text-sm font-black uppercase tracking-widest shadow-2xl shadow-turf-green-base/20 hover:bg-turf-green-base/90 hover:-translate-y-1 active:scale-95 transition-all outline-none focus-visible:ring-2 focus-visible:ring-turf-green-base/50 flex-1 flex items-center justify-center"
                                     >
                                         Publicar Secuencia
                                     </button>
                                 </div>
                             </>
                         )}
                     </div>
                </div>
            )}
        </div>
    );
}
