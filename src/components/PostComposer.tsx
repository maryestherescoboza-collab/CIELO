import { useState } from 'react';
import { Send } from 'lucide-react';
import { ASIGNATURAS_CATALOGO } from '../constants/asignaturas';
import type { AppState, Post, ResourceData } from '../types';

interface Props {
    state: AppState;
    onAddPost: (post: { contenido: string; tipo: Post['tipo']; asignatura: string; recursoId?: number; recursoDatos?: ResourceData }) => Promise<number | undefined>;
}

export default function PostComposer({ state, onAddPost }: Props) {
    const [isExpanded, setIsExpanded] = useState(false);
    const [loading, setLoading] = useState(false);
    const [selectedResource, setSelectedResource] = useState<any>(null);
    const [form, setForm] = useState<{ contenido: string; tipo: Post['tipo']; asignatura: string; recursoId: number }>({
        contenido: '',
        tipo: 'secuencia',
        asignatura: ASIGNATURAS_CATALOGO[0].id,
        recursoId: 0,
    });

    const handleShare = async () => {
        if (!form.contenido && form.tipo === 'general') return;
        if (form.tipo === 'recurso' && !selectedResource) return;
        setLoading(true);

        try {
            const defaultContent = form.tipo === 'recurso'
                ? `Compartiendo el recurso "${selectedResource?.titulo || selectedResource?.categoria || 'Sin título'}"`
                : `Compartiendo un recurso de ${form.tipo}`;

            await onAddPost({
                contenido: form.contenido || defaultContent,
                tipo: form.tipo,
                asignatura: form.asignatura,
                recursoId: form.recursoId ? Number(form.recursoId) : undefined,
                recursoDatos: form.tipo === 'recurso' && selectedResource ? {
                    titulo: selectedResource.titulo || selectedResource.categoria || 'Sin título',
                    recursoCompartido: {
                        id: selectedResource.id,
                        url: selectedResource.url,
                        tipo: selectedResource.tipo,
                        titulo: selectedResource.titulo || selectedResource.categoria || 'Sin título',
                        categoria: selectedResource.categoria,
                        descripcion: selectedResource.descripcion
                    }
                } : undefined
            });

            setForm({ contenido: '', tipo: 'secuencia', asignatura: ASIGNATURAS_CATALOGO[0].id, recursoId: 0 });
            setSelectedResource(null);
            setIsExpanded(false);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={`w-full bg-white transition-all duration-300 ${isExpanded ? '' : ''}`}>
            <div className="flex flex-col gap-3">
                <div className="relative flex items-center bg-white rounded-(--radius-sm) p-3 border border-(--border-soft) group focus-within:border-(--primary) focus-within:ring-2 focus-within:ring-(--primary)/20 transition-all">
                    <textarea
                        placeholder="Escribir publicación..."
                        value={form.contenido}
                        onChange={(e) => setForm({ ...form, contenido: e.target.value })}
                        onFocus={() => setIsExpanded(true)}
                        className="w-full bg-transparent border-none outline-none text-sm font-medium text-(--ink) placeholder:text-(--ink-soft) min-h-11 max-h-40 resize-none py-1 scrollbar-hide"
                    />
                </div>

                {isExpanded && (
                    <div className="flex flex-col gap-3.5 pt-1 animate-in fade-in slide-in-from-top-2 duration-300">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-xs font-black uppercase tracking-widest text-(--ink-soft) px-1">Categoría</label>
                                <select
                                    value={form.tipo}
                                    onChange={(e) => {
                                        setForm({ ...form, tipo: e.target.value as Post['tipo'], recursoId: 0 });
                                        setSelectedResource(null);
                                    }}
                                    className="w-full bg-white border border-(--border-soft) rounded-(--radius-sm) px-3 py-2 text-xs font-bold text-(--ink) outline-none transition-all cursor-pointer focus-visible:border-(--primary) focus-visible:ring-2 focus-visible:ring-(--primary)/50"
                                >
                                    <option value="secuencia">Planificación</option>
                                    <option value="recurso">Recurso de Secuencia</option>
                                    <option value="rubrica">Rúbrica</option>
                                    <option value="cotejo">Cotejo</option>
                                </select>
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-black uppercase tracking-widest text-(--ink-soft) px-1">Asignatura</label>
                                <select
                                    value={form.asignatura}
                                    onChange={(e) => setForm({ ...form, asignatura: e.target.value })}
                                    className="w-full bg-white border border-(--border-soft) rounded-(--radius-sm) px-3 py-2 text-xs font-bold text-(--ink) outline-none transition-all cursor-pointer focus-visible:border-(--primary) focus-visible:ring-2 focus-visible:ring-(--primary)/50"
                                >
                                    {ASIGNATURAS_CATALOGO.map(a => (
                                        <option key={a.id} value={a.id}>{a.nombre}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {form.tipo !== 'general' && (
                            <div className="space-y-1">
                                <label className="text-xs font-black uppercase tracking-widest text-(--ink-soft) px-1">Vincular Recurso</label>
                                {form.tipo === 'recurso' ? (
                                    (() => {
                                        const resourcesList: Array<{ seqTitulo: string; resource: any }> = [];
                                        state.secuencias.forEach(seq => {
                                            let recs = seq.recursos || [];
                                            if (typeof recs === 'string') {
                                                try { recs = JSON.parse(recs); } catch { recs = []; }
                                            }
                                            if (Array.isArray(recs)) {
                                                recs.forEach((r: any) => {
                                                    resourcesList.push({ seqTitulo: seq.titulo, resource: r });
                                                });
                                            }
                                        });

                                        return (
                                            <select
                                                value={selectedResource?.id || ''}
                                                onChange={(e) => {
                                                    const val = e.target.value;
                                                    const found = resourcesList.find(x => String(x.resource.id) === val)?.resource || null;
                                                    setSelectedResource(found);
                                                }}
                                                className="w-full bg-white border border-(--border-soft) rounded-(--radius-sm) px-3 py-2 text-xs font-bold text-(--ink) outline-none transition-all focus-visible:border-(--primary) focus-visible:ring-2 focus-visible:ring-(--primary)/50"
                                            >
                                                <option value="">-- Selecciona un recurso de tus secuencias --</option>
                                                {resourcesList.length === 0 ? (
                                                    <option value="" disabled>No tienes recursos en tus planificaciones</option>
                                                ) : (
                                                    resourcesList.map(({ seqTitulo, resource }) => (
                                                        <option key={resource.id} value={resource.id}>
                                                            {`[${seqTitulo}] ${resource.titulo || resource.categoria || 'Sin título'} (${resource.categoria || resource.tipo || 'Otro'})`}
                                                        </option>
                                                    ))
                                                )}
                                            </select>
                                        );
                                    })()
                                ) : (
                                    <select
                                        value={form.recursoId || ''}
                                        onChange={(e) => setForm({ ...form, recursoId: e.target.value ? Number(e.target.value) : 0 })}
                                        className="w-full bg-white border border-(--border-soft) rounded-(--radius-sm) px-3 py-2 text-xs font-bold text-(--ink) outline-none transition-all focus-visible:border-(--primary) focus-visible:ring-2 focus-visible:ring-(--primary)/50"
                                    >
                                        <option value="">-- Selecciona un item de tu lista --</option>
                                        {form.tipo === 'secuencia' && state.secuencias.map(s => <option key={s.id} value={s.id}>{s.titulo}</option>)}
                                        {form.tipo === 'rubrica' && state.plantillas.filter(p => p.tipo === 'rubrica').map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                                        {form.tipo === 'cotejo' && state.plantillas.filter(p => p.tipo === 'cotejo').map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                                    </select>
                                )}
                            </div>
                        )}
 
                        <div className="flex items-center justify-end gap-3 pt-1">
                            <button
                                onClick={() => {
                                    setIsExpanded(false);
                                    setSelectedResource(null);
                                }}
                                className="px-6 py-2 text-xs font-black text-(--ink-soft) hover:text-(--ink) transition-colors uppercase tracking-widest cursor-pointer"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleShare}
                                disabled={loading || (form.tipo === 'general' && !form.contenido) || (form.tipo === 'recurso' && !selectedResource)}
                                className="bg-(--primary) text-white px-6 py-2 rounded-(--radius-sm) text-xs font-black uppercase tracking-widest hover:opacity-90 disabled:opacity-50 disabled:hover:bg-(--primary) transition-all flex items-center gap-2 shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-(--primary)/50 hover:-translate-y-0.5 active:scale-95 cursor-pointer"
                            >
                                {loading ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" /> : <Send size={14} />}
                                <span>Compartir</span>
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
