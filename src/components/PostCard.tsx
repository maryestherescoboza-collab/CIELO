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
    <div className={`bg-white rounded-xl p-5 flex flex-col border-2 border-slate-100 shadow-sm hover:shadow-lg hover:border-slate-200 hover:-translate-y-0.5 transition-all duration-200 relative group min-h-56 ${post.isOptimistic ? 'opacity-75 grayscale-[0.3]' : ''}`}>
        {post.isOptimistic && (
            <div className="absolute top-3 right-3 flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 bg-turf-green-base rounded-full animate-pulse"></div>
                <span className="text-[10px] font-black text-turf-green-base uppercase tracking-widest">Enviando...</span>
            </div>
        )}
        
        <div className="flex justify-between items-start mb-4 w-full">
            <div className="flex items-center gap-2.5">
                <div 
                    onClick={(e) => onViewProfile(e, post.userId)}
                    className="w-9 h-9 rounded-lg overflow-hidden border-2 border-slate-100 bg-slate-50 flex items-center justify-center cursor-pointer hover:border-turf-green-base/50 transition-all"
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
                        <span className="text-[9px] text-slate-400 font-black uppercase tracking-widest">{post.tiempo || 'Ahora'}</span>
                        <span className="text-[9px] text-red-500 font-black uppercase tracking-widest whitespace-nowrap">&middot; {getRemainingDays(post.expiresAt)}d</span>
                    </div>
                </div>
            </div>
            <div className="flex flex-wrap gap-1 justify-end shrink-0 max-w-[40%]">
                <span className={`px-2.5 py-1 rounded-md text-[9px] font-black uppercase tracking-widest whitespace-nowrap border ${getTagStyles(post.tipo)}`}>
                    {getTipoLabel(post.tipo)}
                </span>
            </div>
        </div>

        <div className="flex-1 mb-4 border-l-2 border-slate-100 pl-3">
            <h3 className="text-[14px] font-bold text-[#1E293B] leading-snug line-clamp-4">
                {post.contenido}
            </h3>
        </div>

        <div className="flex items-center justify-between pt-3 border-t-2 border-slate-50 mt-auto">
            <div className="flex items-center gap-1.5">
                <button
                    onClick={(e) => { e.stopPropagation(); onToggleLike(post.id); }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-100 hover:bg-rose-50 hover:border-rose-200 transition-all group/btn outline-none focus-visible:ring-2 focus-visible:ring-rose-200"
                >
                    <span className="text-sm scale-110">🍎</span>
                    <span className="text-xs font-black text-slate-500 group-hover/btn:text-rose-600">{post.likes}</span>
                </button>
                {isAuthor && onDelete && (
                    <button 
                        onClick={() => onDelete(post.id)}
                        className="p-1.5 text-slate-300 hover:text-rose-600 hover:bg-rose-50 transition-all outline-none focus-visible:ring-2 focus-visible:ring-rose-500/50 rounded-lg border border-transparent hover:border-rose-200"
                        title="Eliminar publicación"
                    >
                        <Trash2 size={13} />
                    </button>
                )}
            </div>
            
            <div className="flex items-center gap-1.5">
                <button
                    onClick={() => onPreview(post)}
                    className="h-8 px-3 rounded-lg bg-slate-800 border border-slate-700 flex items-center gap-1.5 text-slate-100 hover:bg-slate-900 transition-all shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
                    title="Ver detalle"
                >
                    <Eye size={13} />
                    <span className="text-[9px] font-black uppercase tracking-wider hidden sm:block">Ver</span>
                </button>
                <button
                    className="h-8 w-8 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-turf-green-base hover:border-turf-green-base hover:text-white transition-all shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
                    title="Añadir"
                >
                    <Plus size={14} />
                </button>
            </div>
        </div>
    </div>
);
};

export default PostCard;
