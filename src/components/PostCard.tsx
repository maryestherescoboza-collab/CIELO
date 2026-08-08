import React from 'react';
import { Eye, Plus, Trash2 } from 'lucide-react';
import type { Post } from '../types';

interface PostCardProps {
    post: Post;
    onViewProfile: (e: React.MouseEvent, userId?: string) => void;
    onPreview: (post: Post) => void;
    onImport?: (post: Post) => void;
    onDelete?: (postId: number) => void;
    currentUserId?: string;
    getRemainingDays: (expiresAt?: string) => number;
    getTipoLabel: (tipo: Post['tipo']) => string;
    getTagStyles: (tipo: Post['tipo']) => string;
}

const PostCard = ({ 
    post, onViewProfile, onPreview, onImport,
    onDelete, currentUserId, getRemainingDays, getTipoLabel, getTagStyles 
}: PostCardProps) => {
    const isAuthor = post.userId && currentUserId && post.userId === currentUserId;
    return (
    <div className={`bg-white rounded-xl p-5 flex flex-col border border-[#2E3330]/20 shadow-sm hover:shadow-md hover:border-[#7A8D69] hover:-translate-y-0.5 transition-all duration-200 relative group min-h-56 ${post.isOptimistic ? 'opacity-75 grayscale-[0.3]' : ''}`}>
        {post.isOptimistic && (
            <div className="absolute top-3 right-3 flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 bg-[#7A8D69] rounded-full animate-pulse"></div>
                <span className="text-[10px] font-black text-[#7A8D69] uppercase tracking-widest">Enviando...</span>
            </div>
        )}
        
        <div className="flex justify-between items-start mb-4 w-full">
            <div className="flex items-center gap-2.5">
                <div 
                    onClick={(e) => onViewProfile(e, post.userId)}
                    className="w-9 h-9 rounded-lg overflow-hidden border border-[#2E3330]/15 bg-[#FAF6F0] flex items-center justify-center cursor-pointer hover:border-[#7A8D69] transition-all"
                >
                    {post.avatarUrl ? (
                        <img alt={post.autor} className="w-full h-full object-cover" src={post.avatarUrl} />
                    ) : (
                        <span className="font-bold text-[#2E3330]/60 text-xs">{post.autor?.[0]}</span>
                    )}
                </div>
                <div className="flex flex-col cursor-pointer group/name" onClick={(e) => onViewProfile(e, post.userId)}>
                    <span className="text-sm font-bold text-[#2E3330] leading-none mb-1 group-hover/name:text-[#7A8D69] transition-colors">{post.autor}</span>
                    <div className="flex items-center gap-1.5">
                        <span className="text-[9px] text-[#5F665E] font-black uppercase tracking-widest">{post.tiempo || 'Ahora'}</span>
                        <span className="text-[9px] text-red-600 font-black uppercase tracking-widest whitespace-nowrap">&middot; {getRemainingDays(post.expiresAt)}d</span>
                    </div>
                </div>
            </div>
            <div className="flex flex-wrap gap-1 justify-end shrink-0 max-w-[40%]">
                <span className={`px-2.5 py-1 rounded-md text-[9px] font-black uppercase tracking-widest whitespace-nowrap border ${getTagStyles(post.tipo)}`}>
                    {getTipoLabel(post.tipo)}
                </span>
            </div>
        </div>

        <div className="flex-1 mb-4 border-l-2 border-[#EAE4DA] pl-3">
            <h3 className="text-[14px] font-bold text-[#2E3330] leading-snug line-clamp-4">
                {post.contenido}
            </h3>
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-[#EAE4DA] mt-auto">
            <div className="flex items-center gap-1.5">
                {isAuthor && onDelete && (
                    <button 
                        onClick={() => onDelete(post.id)}
                        className="p-1.5 text-slate-450 hover:text-rose-600 hover:bg-rose-50 transition-all outline-none focus-visible:ring-2 focus-visible:ring-rose-500/50 rounded-lg border border-transparent hover:border-rose-255"
                        title="Eliminar publicación"
                    >
                        <Trash2 size={13} />
                    </button>
                )}
            </div>
            
            <div className="flex items-center gap-1.5">
                <button
                    onClick={() => onPreview(post)}
                    className="h-8 px-3 rounded-lg bg-[#7A8D69] border border-[#6C7E5C] flex items-center gap-1.5 text-white hover:bg-[#6C7E5C] transition-all shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-[#7A8D69]"
                    title="Ver detalle"
                >
                    <Eye size={13} />
                    <span className="text-[9px] font-black uppercase tracking-wider hidden sm:block">Ver</span>
                </button>
                <button
                    onClick={() => onImport?.(post)}
                    className="h-8 w-8 rounded-lg bg-[#EAE4DA]/40 border border-[#2E3330]/20 flex items-center justify-center text-[#2E3330] hover:bg-[#BFC9A6] hover:border-[#9AA77F] hover:text-[#2E3330] transition-all shadow-sm outline-none"
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
