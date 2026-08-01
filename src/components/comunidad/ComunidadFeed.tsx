import React from 'react';
import type { Post, ComunidadUIState } from '../../types';
import PostCard from '../PostCard';
import { Globe } from 'lucide-react';

interface Props {
    posts: Post[];
    onToggleLike: (postId: number) => void;
    onViewProfile: (e: React.MouseEvent, userId?: string) => void;
    setUiState: React.Dispatch<React.SetStateAction<ComunidadUIState>>;
    onDeletePost?: (postId: number) => void;
    currentUserId?: string;
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
        case 'rubrica': return 'bg-[#FEE2E2] text-[#C81E1E] border-[#FCA5A5]';
        case 'cotejo': return 'bg-[#FEF3C7] text-[#B45309] border-[#FCD34D]';
        case 'secuencia': return 'bg-[#D1FAE5] text-[#065F46] border-[#6EE7B7]';
        default: return 'bg-slate-100 text-slate-600 border-slate-300';
    }
};

const getRemainingDays = (expiresAt?: string) => {
    if (!expiresAt) return 0;
    const expiry = Date.parse(expiresAt);
    const now = Date.now();
    const diff = expiry - now;
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
};

export default function ComunidadFeed({ 
    posts, onToggleLike, 
    onViewProfile, setUiState,
    onDeletePost, currentUserId
}: Props) {
    return (
        <div className="space-y-6">

            {/* Feed Grid - Highly responsive masonry-style grid that fills all space */}
            <section className="grid gap-5 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 3xl:grid-cols-6" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
                {posts.length > 0 ? (
                    posts.map((post) => (
                        <PostCard 
                            key={post.id}
                            post={post}
                            onToggleLike={onToggleLike}
                            onViewProfile={onViewProfile}
                            onPreview={() => setUiState({ activeModal: 'preview', selectedPostId: post.id })}
                            onDelete={onDeletePost}
                            currentUserId={currentUserId}
                            getRemainingDays={getRemainingDays}
                            getTipoLabel={getTipoLabel}
                            getTagStyles={getTagStyles}
                        />
                    ))
                ) : (
                        <div className="col-span-full py-24 text-center bg-white border border-dashed border-slate-200 rounded-[24px] shadow-sm">
                        <Globe size={48} className="text-slate-200 mb-4 mx-auto" />
                        <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">No hay resultados</p>
                    </div>
                )}
            </section>
        </div>
    );
}
