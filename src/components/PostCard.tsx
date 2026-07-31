import React from 'react';
import { Eye, Plus, Trash2 } from 'lucide-react';
import type { Post } from '../types';

interface PostCardProps {
    post: Post;
    onToggleLike: (postId: number) => void;
    onViewProfile: (e: React.MouseEvent, userId?: string) => void;
    onPreview: (post: Post) => void;
    onDelete?: (postId: number) => void;
    currentUserId?: string;
    getRemainingDays: (expiresAt?: string) => number;
    getTipoLabel: (tipo: Post['tipo']) => string;
    getTagStyles: (tipo: Post['tipo']) => string;
}

const PostCard = ({ 
    post, onToggleLike, onViewProfile, onPreview, 
    onDelete, currentUserId, getRemainingDays, getTipoLabel, getTagStyles 
}: PostCardProps) => {
    const isAuthor = post.userId && currentUserId && post.userId === currentUserId;
    return (
    <div className={`bg-white rounded-[10px] p-7 flex flex-col border border-slate-200 shadow-sm hover:shadow-xl hover:shadow-slate-200/50 hover:-translate-y-1 transition-all duration-300 relative group min-h-70 ${post.isOptimistic ? 'opacity-75 grayscale-[0.3]' : ''}`}>
        {post.isOptimistic && (
            <div className="absolute top-4 right-4 flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 bg-turf-green-base rounded-full animate-pulse"></div>
                <span className="text-[10px] font-black text-turf-green-base uppercase tracking-widest">Enviando...</span>
            </div>
        )}
        
        <div className="flex justify-between items-start mb-6 w-full">
            <div className="flex items-center gap-3">
                <div 
                    onClick={(e) => onViewProfile(e, post.userId)}
                    className="w-10 h-10 rounded-full overflow-hidden border border-slate-200 bg-slate-50 flex items-center justify-center cursor-pointer hover:ring-2 hover:ring-turf-green-base/30 transition-all shadow-sm"
                >
                    {post.avatarUrl ? (
                        <img alt={post.autor} className="w-full h-full object-cover" src={post.avatarUrl} />
                    ) : (
                        <span className="font-bold text-slate-400 text-xs">{post.autor?.[0]}</span>
                    )}
                </div>
                <div className="flex flex-col cursor-pointer group/name" onClick={(e) => onViewProfile(e, post.userId)}>
                    <span className="text-sm font-bold text-[#1E293B] leading-none mb-1 group-hover/name:text-turf-green-base transition-colors">{post.autor}</span>
                    <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest">{post.tiempo || 'Ahora'}</span>
                        <span className="text-[10px] text-red-500 font-black uppercase tracking-widest whitespace-nowrap">Expira en {getRemainingDays(post.expiresAt)} días</span>
                    </div>
                </div>
            </div>
            <div className="flex flex-wrap gap-1.5 justify-end shrink-0 max-w-[45%]">
                <span className={`px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-widest whitespace-nowrap truncate ${getTagStyles(post.tipo)}`}>
                    {getTipoLabel(post.tipo)}
                </span>
            </div>
        </div>

        <div className="flex-1 mb-6">
            <h3 className="text-[15px] font-bold text-[#1E293B] leading-snug line-clamp-3">
                {post.contenido}
            </h3>
        </div>

        <div className="flex items-center justify-between pt-5 border-t border-slate-50 mt-auto">
            <div className="flex items-center gap-2">
                <button
                    onClick={(e) => { e.stopPropagation(); onToggleLike(post.id); }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-50 hover:bg-rose-50 transition-colors group/btn outline-none focus-visible:ring-2 focus-visible:ring-rose-200"
                >
                    <span className="text-sm scale-110">🍎</span>
                    <span className="text-xs font-black text-slate-500 group-hover/btn:text-rose-600">{post.likes}</span>
                </button>
                {isAuthor && onDelete && (
                    <button 
                        onClick={() => onDelete(post.id)}
                        className="p-1.5 text-slate-300 hover:text-rose-600 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-rose-500/50 rounded-md"
                        title="Eliminar publicación"
                    >
                        <Trash2 size={14} />
                    </button>
                )}
            </div>
            
            <div className="flex items-center gap-2">
                <button
                    onClick={() => onPreview(post)}
                    className="w-9 h-9 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 hover:bg-slate-900 hover:text-white transition-all shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
                    title="Ver detalle"
                >
                    <Eye size={18} />
                </button>
                <button
                    className="w-9 h-9 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 hover:bg-slate-900 hover:text-white transition-all shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
                    title="Añadir"
                >
                    <Plus size={18} />
                </button>
            </div>
        </div>
    </div>
);
};

export default PostCard;
