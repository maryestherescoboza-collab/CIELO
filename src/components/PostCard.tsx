import React from 'react';
import { Eye, Plus, Trash2 } from 'lucide-react';
import { UserAvatar } from './ui/UserAvatar';
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
    <div className={`bg-white rounded-xl p-5 flex flex-col border border-(--border-soft) shadow-sm hover:shadow-md hover:border-(--primary) hover:-translate-y-0.5 transition-all duration-200 relative group min-h-56 ${post.isOptimistic ? 'opacity-75 grayscale-[0.3]' : ''}`}>
        {post.isOptimistic && (
            <div className="absolute top-3 right-3 flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 bg-(--primary) rounded-full animate-pulse"></div>
                <span className="text-xs font-black text-(--primary) uppercase tracking-widest">Enviando...</span>
            </div>
        )}
        
        <div className="flex justify-between items-start mb-4 w-full">
            <div className="flex items-center gap-2.5">
                <div 
                    onClick={(e) => onViewProfile(e, post.userId)}
                    className="w-9 h-9 cursor-pointer transition-all hover:ring-2 hover:ring-(--primary) rounded-lg overflow-hidden shrink-0"
                >
                    <UserAvatar src={post.avatarUrl} name={post.autor} className="w-full h-full rounded-none!" />
                </div>
                <div className="flex flex-col cursor-pointer group/name" onClick={(e) => onViewProfile(e, post.userId)}>
                    <span className="text-sm font-bold text-(--ink) leading-none mb-1 group-hover/name:text-(--primary) transition-colors">{post.autor}</span>
                    <div className="flex items-center gap-1.5">
                        <span className="text-xs text-(--ink-soft) font-black uppercase tracking-widest">{post.tiempo || 'Ahora'}</span>
                        <span className="text-xs text-(--danger) font-black uppercase tracking-widest whitespace-nowrap">&middot; {getRemainingDays(post.expiresAt)}d</span>
                    </div>
                </div>
            </div>
            <div className="flex flex-wrap gap-1 justify-end shrink-0 max-w-[40%]">
                <span className={`px-2.5 py-1 rounded-md text-xs font-black uppercase tracking-widest whitespace-nowrap border ${getTagStyles(post.tipo)}`}>
                    {getTipoLabel(post.tipo)}
                </span>
            </div>
        </div>

        <div className="flex-1 mb-4 border-l-2 border-(--border-soft) pl-3 flex flex-col justify-between">
            <h3 className="text-[14px] font-bold text-(--ink) leading-snug line-clamp-4">
                {post.contenido}
            </h3>
            {post.tipo === 'recurso' && post.recursoDatos?.recursoCompartido && (
                <div className="mt-3 p-3 rounded-lg border border-(--border-soft) bg-(--background) flex flex-col gap-1 text-left">
                    <span className="text-[10px] font-black uppercase text-(--ink-soft) tracking-widest leading-none">
                        Recurso: {post.recursoDatos.recursoCompartido.categoria || 'Otro'}
                    </span>
                    <span className="text-xs font-bold text-(--ink) truncate">
                        {post.recursoDatos.recursoCompartido.titulo || 'Sin título'}
                    </span>
                    {post.recursoDatos.recursoCompartido.descripcion && (
                        <span className="text-[11px] text-(--ink-soft) line-clamp-2 mt-0.5 font-medium leading-tight">
                            {post.recursoDatos.recursoCompartido.descripcion}
                        </span>
                    )}
                </div>
            )}
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-(--border-soft) mt-auto">
            <div className="flex items-center gap-1.5">
                {isAuthor && onDelete && (
                    <button 
                        onClick={() => onDelete(post.id)}
                        className="p-1.5 text-(--ink-soft) hover:text-(--danger) hover:bg-(--danger)/10 transition-all outline-none focus-visible:ring-2 focus-visible:ring-(--danger)/50 rounded-lg border border-transparent hover:border-(--danger)/20 cursor-pointer"
                        title="Eliminar publicación"
                    >
                        <Trash2 size={13} />
                    </button>
                )}
            </div>
            
            <div className="flex items-center gap-1.5">
                {post.tipo !== 'recurso' ? (
                    <>
                        <button
                            onClick={() => onPreview(post)}
                            className="h-8 px-3 rounded-lg bg-(--primary) border border-transparent flex items-center gap-1.5 text-white hover:opacity-90 active:scale-95 transition-all shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-(--primary) cursor-pointer"
                            title="Ver detalle"
                        >
                            <Eye size={13} />
                            <span className="text-xs font-black uppercase tracking-wider hidden sm:block">Ver</span>
                        </button>
                        <button
                            onClick={() => onImport?.(post)}
                            className="h-8 w-8 rounded-lg bg-(--linen)/20 border border-(--border-soft) flex items-center justify-center text-(--ink) hover:bg-(--primary) hover:text-white transition-all shadow-sm outline-none cursor-pointer"
                            title="Añadir"
                        >
                            <Plus size={14} />
                        </button>
                    </>
                ) : (
                    <button
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            if (post.recursoDatos?.recursoCompartido?.url) {
                                window.open(post.recursoDatos.recursoCompartido.url, '_blank', 'noopener,noreferrer');
                            }
                        }}
                        className="h-8 px-3 rounded-lg bg-(--primary) border border-transparent flex items-center gap-1.5 text-white hover:opacity-90 active:scale-95 transition-all shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-(--primary) cursor-pointer"
                        title="Abrir enlace"
                    >
                        <span className="text-xs font-black uppercase tracking-wider">Abrir Enlace</span>
                    </button>
                )}
            </div>
        </div>
    </div>
);
};

export default PostCard;
