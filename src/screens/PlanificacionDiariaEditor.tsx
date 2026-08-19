import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Printer } from 'lucide-react';
import type { AppState, Secuencia, Curso } from '../types';

interface Props {
    state: AppState;
    onUpdateSecuencia?: (seq: Secuencia) => Promise<void> | void;
}

function getCursoLabel(curso?: Curso) {
    if (!curso) return 'Curso sin asignar';
    return `${curso.grado} ${curso.seccion} • ${curso.nombre}`;
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
            </div>
        </div>
    );
}
