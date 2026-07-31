import { useState } from 'react';
import { Image, Send, FileText } from 'lucide-react';
import { ASIGNATURAS_CATALOGO } from '../constants/asignaturas';
import type { AppState, Post } from '../types';

interface Props {
    state: AppState;
    onAddPost: (post: { contenido: string; tipo: Post['tipo']; asignatura: string; recursoId?: number }) => Promise<number | undefined>;
}

export default function PostComposer({ state, onAddPost }: Props) {
    const [isExpanded, setIsExpanded] = useState(false);
    const [loading, setLoading] = useState(false);
    const [form, setForm] = useState<{ contenido: string; tipo: Post['tipo']; asignatura: string; recursoId: number }>({
        contenido: '',
        tipo: 'general',
        asignatura: ASIGNATURAS_CATALOGO[0].id,
        recursoId: 0,
    });

    const handleShare = async () => {
        if (!form.contenido && form.tipo === 'general') return;
        setLoading(true);

        try {
            await onAddPost({
                contenido: form.contenido || (form.tipo !== 'general' ? `Compartiendo un recurso de ${form.tipo}` : ''),
                tipo: form.tipo,
                asignatura: form.asignatura,
                recursoId: form.recursoId ? Number(form.recursoId) : undefined,
            });

            setForm({ contenido: '', tipo: 'general', asignatura: ASIGNATURAS_CATALOGO[0].id, recursoId: 0 });
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
                <div className="relative flex items-center bg-slate-50 rounded-[10px] p-3 border border-slate-200 group focus-within:border-turf-green-base focus-within:ring-2 focus-within:ring-turf-green-base/20 transition-all">
                    <textarea
                        placeholder="Escribir publicación..."
                        value={form.contenido}
                        onChange={(e) => setForm({ ...form, contenido: e.target.value })}
                        onFocus={() => setIsExpanded(true)}
                        className="w-full bg-transparent border-none outline-none text-sm font-medium text-slate-700 placeholder:text-slate-400 min-h-11 max-h-40 resize-none py-1 scrollbar-hide"
                    />

                    <div className="flex items-center gap-2 ml-4 shrink-0 transition-opacity">
                        <button className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-white transition-all shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-slate-400">
                            <Image size={20} className="stroke-[1.5]" />
                        </button>
                        <button className="p-2 rounded-lg text-slate-400 hover:text-red-ochre-base hover:bg-white transition-all shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-red-ochre-base/50">
                            <FileText size={20} className="stroke-[1.5]" />
                        </button>
                    </div>
                </div>

                {isExpanded && (
                    <div className="flex flex-col gap-3.5 pt-1 animate-in fade-in slide-in-from-top-2 duration-300">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">Categoría</label>
                                <select
                                    value={form.tipo}
                                    onChange={(e) => setForm({ ...form, tipo: e.target.value as Post['tipo'], recursoId: 0 })}
                                    className="w-full bg-white border border-slate-200 rounded-[10px] px-3 py-2 text-xs font-bold text-slate-700 outline-none transition-all cursor-pointer focus-visible:border-turf-green-base focus-visible:ring-2 focus-visible:ring-turf-green-base/50"
                                >
                                    <option value="general">Mensaje / Idea</option>
                                    <option value="secuencia">Planificación</option>
                                    <option value="rubrica">Rúbrica</option>
                                    <option value="cotejo">Cotejo</option>
                                </select>
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">Asignatura</label>
                                <select
                                    value={form.asignatura}
                                    onChange={(e) => setForm({ ...form, asignatura: e.target.value })}
                                    className="w-full bg-white border border-slate-200 rounded-[10px] px-3 py-2 text-xs font-bold text-slate-700 outline-none transition-all cursor-pointer focus-visible:border-turf-green-base focus-visible:ring-2 focus-visible:ring-turf-green-base/50"
                                >
                                    {ASIGNATURAS_CATALOGO.map(a => (
                                        <option key={a.id} value={a.id}>{a.nombre}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {form.tipo !== 'general' && (
                            <div className="space-y-1">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">Vincular Recurso</label>
                                <select
                                    value={form.recursoId || ''}
                                    onChange={(e) => setForm({ ...form, recursoId: e.target.value ? Number(e.target.value) : 0 })}
                                    className="w-full bg-white border border-slate-200 rounded-[10px] px-3 py-2 text-xs font-bold text-slate-700 outline-none transition-all focus-visible:border-turf-green-base focus-visible:ring-2 focus-visible:ring-turf-green-base/50"
                                >
                                    <option value="">-- Selecciona un item de tu lista --</option>
                                    {form.tipo === 'secuencia' && state.secuencias.map(s => <option key={s.id} value={s.id}>{s.titulo}</option>)}
                                    {form.tipo === 'rubrica' && state.plantillas.filter(p => p.tipo === 'rubrica').map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                                    {form.tipo === 'cotejo' && state.plantillas.filter(p => p.tipo === 'cotejo').map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                                </select>
                            </div>
                        )}
 
                        <div className="flex items-center justify-end gap-3 pt-1">
                            <button
                                onClick={() => setIsExpanded(false)}
                                className="px-6 py-2 text-xs font-black text-slate-400 hover:text-slate-900 transition-colors uppercase tracking-widest"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleShare}
                                disabled={loading || (!form.contenido && form.tipo === 'general')}
                                className="bg-turf-green-base text-white px-6 py-2 rounded-[10px] text-xs font-black uppercase tracking-widest hover:bg-turf-green-base/90 disabled:opacity-50 disabled:hover:bg-turf-green-base transition-all flex items-center gap-2 shadow-lg shadow-turf-green-base/20 outline-none focus-visible:ring-2 focus-visible:ring-turf-green-base/50 hover:-translate-y-0.5 active:scale-95"
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
