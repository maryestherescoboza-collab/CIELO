import React from 'react';
import type { Post, ResourceData } from '../types';
import type { PresenceUser } from '../hooks/usePresence';
import PostComposer from '../components/PostComposer';
import ComunidadFeed from '../components/comunidad/ComunidadFeed';
import ComunidadSidebar from '../components/comunidad/ComunidadSidebar';
import ModalsManager from '../components/comunidad/ModalsManager';
import { Info } from 'lucide-react';
import { useAppStore } from '../store/appStore';
import { useComunidadData } from '../hooks/useComunidadData';
import { useCommunityData } from '../hooks/useCommunityData';

interface Props {
    onRefresh: () => void;
    onAddPost: (post: { contenido: string; tipo: Post['tipo']; asignatura: string; recursoId?: number }) => Promise<number | undefined>;
    onToggleLike: (postId: number) => void;
    onReportPost: (postId: number, razon: string, comentario?: string) => Promise<void>;
    onImportResource: (tipo: Post['tipo'], resourceData: ResourceData) => void;
    onViewProfile: (e: React.MouseEvent, userId?: string) => void;
    onlineUsers: PresenceUser[];
    onDeletePost?: (postId: number) => Promise<boolean>;
}

export default function Comunidad({
    onAddPost, onToggleLike, onReportPost,
    onImportResource, onViewProfile, onlineUsers,
    onDeletePost
}: Props) {
    const { state: globalState, session } = useAppStore();
    const { posts: newPosts, error: newError, topColaboradores: newColabs } = useCommunityData();

    // Fallback: use globalState only if new hook encounters an error
    const activePosts = newError ? globalState.posts : newPosts;
    const activePerfiles = newError ? globalState.perfiles : newColabs;

    const {
        uiState,
        setUiState,
        filter,
        setFilter,
        showSuccessToast,
        setShowSuccessToast,
        filteredPosts,
        topColaboradores
    } = useComunidadData({ 
        state: {
            ...globalState,
            posts: activePosts,
            perfiles: activePerfiles
        }
    });

    const handleDeleteConfirm = async (postId: number) => {
        if (!onDeletePost) return;
        const confirm = window.confirm("¿Estás seguro de que deseas eliminar esta publicación? Esta acción no se puede deshacer.");
        if (confirm) {
            await onDeletePost(postId);
        }
    };

    return (
        <div className="flex flex-col flex-1 min-h-screen bg-[#FDFBF7]">
            <main className="flex-1 px-6 py-10 md:pl-8 md:pr-12 scroll-smooth scrollbar-hide">
                <div className="max-w-350 ml-0 mr-auto animate-in fade-in slide-in-from-bottom-4 duration-500 fill-mode-both grid grid-cols-1 lg:grid-cols-12 gap-8">
                    <div className="lg:col-span-3 hidden lg:block">
                        <ComunidadSidebar
                            topColaboradores={topColaboradores}
                            onlineUsers={onlineUsers}
                            onViewProfile={onViewProfile}
                            filter={filter}
                            onSetFilter={setFilter}
                        />
                    </div>

                    <div className="lg:col-span-9 space-y-8">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 mb-4">
                            <div>
                                <h1 className="text-4xl font-black text-[#1E293B] tracking-tight mb-3 font-notion-title">
                                    Comunidad Educativa
                                </h1>
                                <div className="flex items-center gap-4">
                                    <div className="flex items-center gap-2.5 bg-slate-200/50 px-4 py-2 rounded-xl border border-slate-200">
                                        <span className="text-[11px] font-black text-slate-600 uppercase tracking-widest">
                                            Recursos Compartidos
                                        </span>
                                    </div>
                                    <div className="h-1.5 w-1.5 rounded-full bg-slate-400"></div>
                                    <span className="text-[11px] font-black text-slate-500 uppercase tracking-[0.2em]">Intercambio Docente</span>
                                </div>
                            </div>
                        </div>

                        <section className="bg-white rounded-[10px] p-4 border border-slate-200 shadow-xl shadow-slate-200/50 mb-6">
                            <PostComposer
                                state={globalState}
                                onAddPost={onAddPost}
                            />
                        </section>

                        <div className="pt-3">
                            <ComunidadFeed
                                posts={filteredPosts}
                                onToggleLike={onToggleLike}
                                onViewProfile={onViewProfile}
                                setUiState={setUiState}
                                onDeletePost={handleDeleteConfirm}
                                currentUserId={session?.user?.id}
                            />
                        </div>
                    </div>
                </div>
            </main>

            <ModalsManager
                uiState={uiState}
                setUiState={setUiState}
                posts={activePosts}
                onImportResource={onImportResource}
                onReportPost={onReportPost}
                showSuccessToast={showSuccessToast}
                setShowSuccessToast={setShowSuccessToast}
            />

            <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-50">
                <div className="bg-[#1E293B] text-white px-6 h-12 rounded-2xl shadow-2xl flex items-center gap-3 border border-slate-700/50 scale-90 md:scale-100 shadow-slate-900/50">
                    <Info size={16} className="text-turf-green-base" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Los recursos expiran automáticamente cada 15 días</span>
                </div>
            </div>
        </div>
    );
}
