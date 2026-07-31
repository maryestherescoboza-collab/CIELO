import React from 'react';
import type { Post, ComunidadUIState } from '../../types';

interface Props {
    featuredPosts: Post[];
    setUiState: React.Dispatch<React.SetStateAction<ComunidadUIState>>;
}

const getTipoLabel = (tipo: Post['tipo']) => {
    switch (tipo) {
        case 'rubrica': return 'Rúbrica';
        case 'cotejo': return 'Cotejo';
        case 'secuencia': return 'Planificación';
        default: return 'General';
    }
};

const getTagStyles = (tipo: Post['tipo']) => {
    switch (tipo) {
        case 'rubrica': return 'bg-[#FDF2F2] text-[#E02424] border-transparent';
        case 'cotejo': return 'bg-[#FFFBEB] text-[#D97706] border-transparent';
        case 'secuencia': return 'bg-[#ECFDF5] text-[#059669] border-transparent';
        default: return 'bg-slate-100 text-slate-600 border-transparent';
    }
};

export default function FeaturedSection({ featuredPosts, setUiState }: Props) {
    if (featuredPosts.length === 0) return null;

    return (
        <section className="space-y-8 pt-10">
            <div className="flex items-center gap-3 mb-2">
                <div className="w-1.5 h-7 bg-red-ochre-base/80 rounded-full"></div>
                <h2 className="text-2xl font-black text-slate-900 tracking-tight">Instrumentos Destacados</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {featuredPosts.map((post, idx) => {
                    const labels = ['DESTACADO', 'TOP', 'PREMIUM'];
                    const labelStyles = [
                        'bg-[#FEF2F2] text-[#991B1B]',
                        'bg-[#FFFBEB] text-[#92400E]',
                        'bg-[#ECFDF5] text-[#065F46]'
                    ];
                    
                    return (
                        <div key={post.id} className="bg-white rounded-[24px] p-8 border border-slate-200 shadow-xl shadow-slate-200/50 flex flex-col relative group transition-all hover:-translate-y-1">
                            {/* Featured Tag */}
                            <div className={`absolute top-0 right-10 -translate-y-1/2 px-4 py-1.5 rounded-full text-[9px] font-black tracking-widest ${labelStyles[idx % 3]} shadow-sm`}>
                                {labels[idx % 3]}
                            </div>

                            {/* Card Header */}
                            <div className="flex items-center gap-4 mb-6">
                                <div className="w-12 h-12 rounded-[16px] overflow-hidden shadow-sm border border-slate-200 p-0.5 bg-white">
                                    {post.avatarUrl ? (
                                        <img alt={post.autor} className="w-full h-full object-cover rounded-xl" src={post.avatarUrl} />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center bg-slate-50 text-slate-400 font-bold">
                                            {post.autor?.[0]}
                                        </div>
                                    )}
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-sm font-bold text-slate-900">{post.autor}</span>
                                    <span className="text-[10px] text-emerald-600 font-bold uppercase tracking-wider">TRENDING</span>
                                </div>
                                <div className="ml-auto flex flex-wrap gap-1.5 justify-end shrink-0 max-w-[45%]">
                                    <span className={`px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-widest whitespace-nowrap truncate ${getTagStyles(post.tipo)}`}>
                                        {getTipoLabel(post.tipo)}
                                    </span>
                                </div>
                            </div>

                            {/* Card Title */}
                            <h3 className="text-[15px] font-black text-[#1E293B] leading-tight mb-8 font-notion-title">
                                {post.recursoDatos?.nombre || post.recursoDatos?.titulo || post.contenido || ''}
                            </h3>

                            {/* Card Footer */}
                            <div className="flex items-center justify-between pt-6 border-t border-slate-50 mt-auto">
                                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-rose-50 border border-rose-100/50">
                                    <span className="text-sm">🍎</span>
                                    <span className="text-xs font-black text-rose-600">{post.likes}</span>
                                </div>
                                
                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={() => setUiState({ activeModal: 'preview', selectedPostId: post.id })}
                                        className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 hover:bg-slate-900 hover:text-white transition-all outline-none focus-visible:ring-2 focus-visible:ring-slate-400 shadow-sm"
                                    >
                                        <span className="material-symbols-outlined text-[20px]">visibility</span>
                                    </button>
                                    <button
                                        onClick={() => setUiState({ activeModal: 'import', selectedPostId: post.id })}
                                        className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 hover:bg-slate-900 hover:text-white transition-all shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
                                    >
                                        <span className="material-symbols-outlined text-[20px]">add</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </section>
    );
}
