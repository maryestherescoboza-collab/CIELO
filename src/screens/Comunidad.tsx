import React from 'react';
import type { Post, ResourceData } from '../types';
import type { PresenceUser } from '../hooks/usePresence';
import PostComposer from '../components/PostComposer';
import ComunidadFeed from '../components/comunidad/ComunidadFeed';
import ComunidadSidebar from '../components/comunidad/ComunidadSidebar';
import ModalsManager from '../components/comunidad/ModalsManager';
import { Info } from 'lucide-react';
import { useAppStore } from '../store/appStore';
import { CieloPill } from '../components/ui/CieloPill';
import { useComunidadData } from '../hooks/useComunidadData';
import { useCommunityData } from '../hooks/useCommunityData';

interface Props {
    onRefresh: () => void;
    onAddPost: (post: { contenido: string; tipo: Post['tipo']; asignatura: string; recursoId?: number }) => Promise<number | undefined>;
    onReportPost: (postId: number, razon: string, comentario?: string) => Promise<void>;
    onImportResource: (tipo: Post['tipo'], resourceData: ResourceData, recursoId?: number) => void;
    onViewProfile: (e: React.MouseEvent, userId?: string) => void;
    onlineUsers: PresenceUser[];
    onDeletePost?: (postId: number) => Promise<boolean>;
}

export default function Comunidad({
    onAddPost, onReportPost,
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
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-2">
                            <div>
                                <h1 className="text-3xl font-black text-[#2E3330] tracking-tight mb-2.5 font-notion-title">
                                    Comunidad Educativa
                                </h1>
                                <div className="flex items-center gap-3">
                                    <CieloPill variant="neutral" className="gap-2 px-3">
                                        <span className="text-xs font-bold text-[#2E3330] uppercase tracking-[0.08em]">
                                            Recursos Compartidos
                                        </span>
                                    </CieloPill>
                                    <div className="h-1.5 w-1.5 rounded-full bg-slate-350"></div>
                                    <span className="text-xs font-bold text-[#5F665E] uppercase tracking-[0.08em]">Intercambio Docente</span>
                                </div>
                            </div>
                        </div>

                        <section className="bg-[#FDFBF7] rounded-[20px] p-4 border border-[rgba(46,51,48,0.08)] shadow-sm mb-6">
                            <PostComposer
                                state={globalState}
                                onAddPost={onAddPost}
                            />
                        </section>

                        <div className="pt-2">
                            <ComunidadFeed
                                posts={filteredPosts}
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
                    <Info size={16} className="text-primary" />
                    <span className="text-xs font-black uppercase tracking-widest">Los recursos expiran automáticamente cada 15 días</span>
                </div>
            </div>
        </div>
    );
}
