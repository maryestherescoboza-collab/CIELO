import { useEffect, useRef, useState } from 'react';
import { BookOpen, Calendar, ChevronDown, Maximize2, Minimize2, Plus, Trash2, X, Bookmark } from 'lucide-react';
import blueBookIcon from '../assets/book-blue.png';
import purpleBookIcon from '../assets/book-purple.png';
import type { Curso, Secuencia } from '../types';
import { getPlanificacionDiariaTemplate } from '../templates/planificacion-diaria';

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
    const session = useAppStore((s) => s.session);

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
    const [importStep, setImportStep] = useState<'select' | 'html-form' | 'select-template' | 'template-editor'>('select');
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

    const secuenciasCurso = state.secuencias.filter((secuencia) => secuencia.cursoId === cursoSel && (secuencia.userId === session?.user?.id || !secuencia.userId));
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
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div>
                        <h1 className="text-3xl font-black text-[#2E3330] tracking-tight mb-2.5 font-notion-title">
                            Secuencias Didácticas
                        </h1>
                        <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2 bg-[#EAE4DA] px-3 py-1 rounded-full border border-[rgba(46,51,48,0.08)]">
                                <span className="text-[9px] font-bold text-[#2E3330] uppercase tracking-[0.08em]">
                                    Pedagogía y Secuencias
                                </span>
                            </div>
                            <div className="h-1.5 w-1.5 rounded-full bg-slate-350"></div>
                            <span className="text-[9px] font-bold text-[#5F665E] uppercase tracking-[0.08em]">Material Docente</span>
                        </div>
                    </div>

                    <div className="flex flex-col items-stretch sm:items-center gap-3 sm:flex-row">
                        <div className="relative group">
                            <select
                                className="pl-5 pr-10 appearance-none rounded-full bg-[#FDFBF7] border border-slate-300 text-[#2E3330] text-xs font-bold uppercase tracking-[0.08em] shadow-sm outline-none focus-visible:border-[#7A8D69] focus-visible:ring-2 focus-visible:ring-[#7A8D69]/20 cursor-pointer transition-all hover:bg-[#FAF6F0] min-w-60 artisan-pill"
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
                                className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 transition-colors group-hover:text-[#7A8D69]"
                            />
                        </div>

                        <button
                            onClick={() => { setShowModal(true); setImportStep('select'); }}
                            className="px-6 rounded-full bg-[#7A8D69] text-white text-xs font-black uppercase tracking-[0.08em] shadow-sm hover:bg-[#6C7E5C] hover:-translate-y-0.5 transition-all active:scale-95 outline-none focus-visible:ring-2 focus-visible:ring-[#7A8D69]/50 flex items-center justify-center gap-2.5 shrink-0"
                            style={{ height: '36px' }}
                        >
                            <Plus size={16} strokeWidth={3} className="transition-transform duration-700 hover:rotate-180" />
                            <span>Nueva secuencia</span>
                        </button>
                    </div>
                </div>

                <div className="max-w-350 mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 delay-100 fill-mode-both">
                    {secuenciasCurso.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 px-8 border-2 border-dashed border-slate-250 rounded-[20px] bg-[#FDFBF7] text-center shadow-sm">
                            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-5 shadow-inner border border-slate-100">
                                <BookOpen size={32} className="text-slate-400" />
                            </div>
                            <h2 className="text-xl font-black text-[#2E3330] tracking-tight font-notion-title mb-2">
                                No hay secuencias para este curso
                            </h2>
                            <p className="text-[#5F665E] font-medium max-w-sm mx-auto leading-relaxed text-xs">
                                Crea una nueva secuencia para comenzar a organizar el material didáctico de esta asignatura.
                            </p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 gap-x-5 gap-y-10 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                            {secuenciasCurso.map((seq, index) => {
                                const curso = state.cursos.find((item) => item.id === seq.cursoId);
                                const bookIcon = BOOK_ICONS[index % BOOK_ICONS.length];
                                const filledDots = getDotCount(seq.estado);

                                return (
                                    <button
                                        key={seq.id}
                                        type="button"
                                        onClick={() => setViewerSeq(seq)}
                                        className="group flex flex-col items-center text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7A8D69]/50 rounded-[20px] p-5 transition-all bg-[#FDFBF7] border border-[rgba(46,51,48,0.08)] shadow-sm hover:shadow-md hover:bg-[#F8F3ED]/30 hover:-translate-y-1"
                                    >
                                        <div className="relative flex h-40 items-end justify-center mb-4">
                                            <img
                                                src={bookIcon}
                                                alt=""
                                                className="w-28 transition-all duration-300 ease-out group-hover:-translate-y-3 group-hover:rotate-1 group-hover:drop-shadow-md"
                                            />
                                            <div className="pointer-events-none absolute bottom-0 h-4 w-16 rounded-full bg-slate-900/5 blur-md transition-all duration-300 group-hover:w-24 group-hover:bg-slate-900/10" />
                                        </div>

                                        <div className="max-w-44 flex-1">
                                            <h3 className="text-sm font-black text-[#2E3330] leading-snug group-hover:text-[#7A8D69] transition-colors font-notion-title">
                                                {seq.titulo}
                                            </h3>
                                            <p className="mt-1 text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                                                {curso?.grado} {curso?.seccion}
                                            </p>
                                        </div>

                                        <div className="mt-3.5 flex flex-col items-center gap-2">
                                            <div className="flex items-center gap-1">
                                                {[0, 1, 2].map((dot) => (
                                                    <span
                                                        key={dot}
                                                        className={`h-1.5 w-1.5 rounded-full ${dot < filledDots ? 'bg-[#7A8D69]' : 'bg-slate-200'}`}
                                                    />
                                                ))}
                                            </div>
                                            <p className="text-[9px] font-bold uppercase tracking-[0.08em] text-[#2E3330] px-2.5 py-0.5 rounded-full border border-slate-100 group-hover:border-[#7A8D69]/20 group-hover:text-[#7A8D69] bg-[#EAE4DA]/30 transition-colors">
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
                <div className="fixed inset-0 z-110 flex items-center justify-center bg-slate-900/40 px-4 py-5 backdrop-blur-sm sm:p-8">
                    <div
                        ref={viewerRef}
                        className="flex h-[min(92vh,58rem)] w-full max-w-6xl flex-col overflow-hidden rounded-[20px] border border-[rgba(46,51,48,0.08)] bg-[#FDFBF7] shadow-2xl animate-in zoom-in-95 duration-300"
                    >
                        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 bg-[#FDFBF7] px-8 py-6">
                            <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 mb-1.5">
                                    <span className="text-[9px] font-bold uppercase tracking-widest text-[#2E3330] bg-[#BFC9A6]/30 px-2.5 py-1 rounded-full border border-[rgba(46,51,48,0.08)]">
                                        Vista de Lectura
                                    </span>
                                </div>
                                <h2 className="text-xl font-black tracking-tight text-[#2E3330] font-notion-title">
                                    {viewerSeq.titulo}
                                </h2>
                                <div className="mt-2 flex flex-wrap items-center gap-3 text-[10px] font-bold text-[#5F665E] uppercase tracking-widest">
                                    <span className="flex items-center gap-1.5">
                                        <Bookmark size={12} className="text-slate-400" />
                                        {getCursoLabel(state.cursos.find((curso) => curso.id === viewerSeq.cursoId))}
                                    </span>
                                    <span className="text-slate-300">•</span>
                                    <span className="inline-flex items-center gap-1.5">
                                        <Calendar size={12} className="text-slate-400" />
                                        {new Date(viewerSeq.fechaInicio).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}
                                    </span>
                                </div>
                            </div>

                            <div className="flex flex-wrap items-center gap-2.5">
                                <select
                                    className="px-3 rounded-full border border-slate-350 bg-[#FDFBF7] text-[10px] font-bold text-[#2E3330] uppercase tracking-[0.08em] outline-none transition-all focus-visible:border-[#7A8D69] focus-visible:ring-2 focus-visible:ring-[#7A8D69]/20 appearance-none relative shadow-sm artisan-pill artisan-btn-white"
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

                                <button
                                    type="button"
                                    onClick={() => {
                                        void togglePresentation();
                                    }}
                                    className="px-4.5 rounded-full bg-[#FDFBF7] border border-slate-350 text-[#2E3330] text-[9px] font-bold uppercase tracking-[0.08em] shadow-sm hover:bg-[#FAF6F0] transition-all outline-none focus-visible:ring-2 focus-visible:ring-[#7A8D69]/50 flex items-center gap-1.5 artisan-pill"
                                    style={{ height: '36px' }}
                                >
                                    {isPresenting ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
                                    <span>{isPresenting ? 'Salir' : 'Presentar'}</span>
                                </button>

                                {viewerSeq.contenidoHtml?.includes('contenteditable="true"') && onUpdateSecuencia && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const container = document.getElementById('viewer-content-container');
                                            if (container && onUpdateSecuencia) {
                                                onUpdateSecuencia({ ...viewerSeq, contenidoHtml: container.innerHTML });
                                                void handleCloseViewer();
                                            }
                                        }}
                                        className="px-4.5 rounded-full bg-turf-green-base text-white text-[9px] font-bold uppercase tracking-[0.08em] shadow-sm hover:bg-turf-green-base/90 transition-all outline-none focus-visible:ring-2 focus-visible:ring-turf-green-base/50 flex items-center gap-1.5 artisan-pill"
                                        style={{ height: '36px' }}
                                    >
                                        Guardar
                                    </button>
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
                                        className="w-9 h-9 flex items-center justify-center rounded-full bg-[#FDFBF7] border border-slate-350 text-slate-400 hover:text-[#EB8847] hover:bg-[#EB8847]/5 hover:border-[#EB8847]/20 transition-all shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-[#EB8847]/50"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                )}

                                <button
                                    type="button"
                                    onClick={handleCloseViewer}
                                    className="w-9 h-9 flex items-center justify-center rounded-full bg-[#FDFBF7] border border-slate-350 text-slate-400 hover:text-[#2E3330] hover:bg-slate-100 transition-all shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
                                >
                                    <X size={15} strokeWidth={2.5} />
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 overflow-auto bg-slate-50 p-6 sm:p-10">
                            <div className="flex min-h-full items-start justify-center">
                                <div className="w-full max-w-4xl rounded-3xl border border-slate-200 bg-white p-8 shadow-sm sm:p-14">
                                    {viewerSeq.contenidoHtml ? (
                                        <div
                                            id="viewer-content-container"
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

            {showModal && importStep !== 'template-editor' && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm sm:p-6">
                    <div className="flex max-h-full w-full max-w-3xl flex-col overflow-hidden rounded-[2rem] bg-white shadow-2xl">
                        {/* Header del Modal */}
                        <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-8 py-6">
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

                                     <button
                                         onClick={() => {
                                             setErrorMsg(null);
                                             setImportStep('select-template');
                                         }}
                                         className="w-full text-left p-6 rounded-2xl border border-slate-200 bg-white hover:border-turf-green-base hover:bg-slate-50/50 transition-all cursor-pointer group"
                                     >
                                         <h3 className="text-sm font-black uppercase tracking-wider text-[#1E293B] group-hover:text-turf-green-base transition-colors">
                                             Usar una plantilla
                                         </h3>
                                         <p className="mt-2 text-xs font-medium text-slate-500 leading-relaxed">
                                             Seleccione una plantilla predefinida y deje que CIELO autocomplete su información para comenzar.
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

                         {importStep === 'select-template' && (
                             <div className="p-8 space-y-4">
                                 <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-6">
                                     Plantillas Disponibles
                                 </p>
                                 <div className="grid gap-4">
                                     <button
                                         onClick={() => {
                                             const curso = state.cursos.find(c => c.id === form.cursoId) || state.cursos[0];
                                             const centroNombre = session?.user?.user_metadata?.centro_nombre || 'Mi Centro'; // Simplified fallback
                                             const codigoCentro = session?.user?.user_metadata?.codigo_centro || '';
                                             const docenteNombre = session?.user?.user_metadata?.full_name || session?.user?.email || 'Docente';
                                             
                                             const htmlContent = getPlanificacionDiariaTemplate({
                                                 centro: centroNombre,
                                                 codigoCentro: codigoCentro,
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
                                         className="w-full text-left p-6 rounded-2xl border border-slate-200 bg-white hover:border-turf-green-base hover:bg-slate-50/50 transition-all cursor-pointer group flex items-start gap-4"
                                     >
                                         <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center shrink-0 border border-blue-100">
                                            <BookOpen size={24} className="text-blue-500" />
                                         </div>
                                         <div>
                                            <h3 className="text-sm font-black uppercase tracking-wider text-[#1E293B] group-hover:text-turf-green-base transition-colors">
                                                Planificación de Clase Diaria
                                            </h3>
                                            <p className="mt-1 text-xs font-medium text-slate-500 leading-relaxed">
                                                Formato estándar MINERD para planificar el día a día, con secciones de inicio, desarrollo, cierre e indicadores de logro.
                                            </p>
                                         </div>
                                     </button>
                                 </div>
                                 <div className="mt-6 pt-6 border-t border-slate-100 flex justify-start">
                                     <button
                                         type="button"
                                         onClick={() => setImportStep('select')}
                                         className="px-6 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-xs font-bold uppercase tracking-widest shadow-sm hover:bg-slate-50 transition-all"
                                     >
                                         Volver
                                     </button>
                                 </div>
                             </div>
                         )}
                     </div>
                </div>
            )}

            {showModal && importStep === 'template-editor' && (
                <div className="fixed inset-0 z-[100] bg-slate-50 flex flex-col w-full h-full">
                    <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shrink-0 shadow-sm">
                        <div className="flex flex-col gap-1">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Título de la Planificación</label>
                            <input 
                                className="px-3 py-2 text-sm font-bold border border-slate-200 rounded-lg outline-none focus:border-turf-green-base w-72 transition-colors"
                                value={form.titulo}
                                onChange={e => setForm(prev => ({...prev, titulo: e.target.value}))}
                                placeholder="Ej. Unidad 1 - Comprensión lectora"
                            />
                        </div>
                        <div className="flex flex-col gap-1">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Curso Vinculado</label>
                            <select 
                                className="px-3 py-2 text-sm font-bold border border-slate-200 rounded-lg outline-none focus:border-turf-green-base w-64 transition-colors"
                                value={form.cursoId}
                                onChange={e => setForm(prev => ({...prev, cursoId: Number(e.target.value)}))}
                            >
                                {state.cursos.map(c => <option key={c.id} value={c.id}>{getCursoLabel(c)}</option>)}
                            </select>
                        </div>
                        <div className="flex items-center gap-3">
                            <button
                                type="button"
                                onClick={() => setImportStep('select-template')}
                                className="px-6 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-600 text-xs font-bold uppercase tracking-widest shadow-sm hover:bg-slate-50 transition-all outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
                            >
                                Volver
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    const container = document.getElementById('template-editor-container');
                                    if (container) {
                                        setForm(prev => ({ ...prev, contenidoHtml: container.innerHTML }));
                                        onAddSecuencia({ ...form, contenidoHtml: container.innerHTML, estado: 'Pendiente', cursoId: form.cursoId });
                                        setShowModal(false);
                                        setForm({
                                           titulo: '',
                                           cursoId: state.cursos[0]?.id ?? 0,
                                           fechaInicio: new Date().toISOString().split('T')[0],
                                           contenidoHtml: '',
                                        });
                                    }
                                }}
                                className="px-6 py-2.5 rounded-xl bg-turf-green-base text-white text-xs font-black uppercase tracking-widest shadow-lg shadow-turf-green-base/20 hover:bg-turf-green-base/90 hover:-translate-y-0.5 active:scale-95 transition-all outline-none focus-visible:ring-2 focus-visible:ring-turf-green-base/50"
                            >
                                Guardar
                            </button>
                        </div>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-slate-100/50 flex justify-center">
                        <div className="w-full max-w-6xl bg-white shadow-xl border border-slate-200 p-8 rounded-xl shrink-0">
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
