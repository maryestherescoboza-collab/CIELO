import { useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAppStore } from '../store/appStore';
import type { Post, ResourceData, Plantilla } from '../types';

export function usePostActions() {
    const state = useAppStore(s => s.state);
    const setState = useAppStore(s => s.setAppState);
    const session = useAppStore(s => s.session);
    const setGenericToast = useAppStore(s => s.setGenericToast);

    const togglePostLike = useCallback(async (postId: number) => {
        if (!session?.user?.id) return;
        
        let isCurrentlyLiked = false;

        setState(s => {
            const post = s.posts.find(p => p.id === postId);
            if (!post) return s;
            isCurrentlyLiked = post.likedByMe || false;

            return {
                ...s,
                posts: s.posts.map(p => p.id === postId ? { 
                   ...p, 
                   likes: isCurrentlyLiked ? Math.max(0, p.likes - 1) : p.likes + 1, 
                   likedByMe: !isCurrentlyLiked 
                } : p)
            };
        });

        try {
            if (isCurrentlyLiked) {
                await supabase.from('post_likes').delete().match({ post_id: postId, user_id: session.user.id });
            } else {
                await supabase.from('post_likes').insert({ post_id: postId, user_id: session.user.id });
            }
        } catch (error) {
            console.error('Error toggling like:', error);
            setState(s => ({
                ...s,
                posts: s.posts.map(p => p.id === postId ? { 
                    ...p, 
                    likes: isCurrentlyLiked ? p.likes + 1 : Math.max(0, p.likes - 1), 
                    likedByMe: isCurrentlyLiked 
                } : p)
            }));
        }
    }, [session, setState]);
    
    const reportPost = useCallback(async (postId: number, razon: string, comentario?: string) => {
        if (!session?.user?.id) return;
        
        const { error } = await supabase.from('reportes_comunidad').insert({
            post_id: postId,
            reporter_id: session.user.id,
            razon,
            comentario,
            estado: 'pendiente'
        });

        if (error) {
           console.error('Error reporting post:', error);
           setGenericToast({ message: 'Error al enviar reporte', type: 'warning' });
           setTimeout(() => setGenericToast(null), 3000);
        } else {
           setGenericToast({ message: 'Post reportado correctamente', type: 'success' });
           setTimeout(() => setGenericToast(null), 3000);
        }
    }, [session, setGenericToast]);

    const addPost = useCallback(async (newPost: { contenido: string; tipo: Post['tipo']; asignatura: string; recursoId?: number }): Promise<number | undefined> => {
        const currentSession = session;
        if (!currentSession?.user?.id) return;
        
        const tempId = Date.now();
        const tempPost: Post = {
            id: tempId,
            autor: state.nombreDocente || 'Docente',
            cargo: state.cursos[0]?.asignatura ?? 'Docente',
            avatarUrl: state.perfilAvatarUrl || '',
            contenido: newPost.contenido,
            tipo: newPost.tipo,
            asignatura: newPost.asignatura,
            recursoId: newPost.recursoId,
            likes: 0,
            likedByMe: false,
            userId: currentSession.user.id,
            fechaPublicacion: new Date().toISOString(),
            tiempo: 'Publicando...',
            isOptimistic: true 
        } as Post;
        
        setState(s => ({ ...s, posts: [tempPost, ...s.posts] }));

        try {
            const { data, error } = await supabase.from('posts').insert([{
                autor: state.nombreDocente || 'Docente',
                cargo: state.cursos[0]?.asignatura ?? 'Docente',
                contenido: newPost.contenido,
                tipo: newPost.tipo,
                asignatura: newPost.asignatura,
                user_id: currentSession.user.id,
                recurso_id: newPost.recursoId,
            }]).select();

            if (error) throw error;

            if (data && data[0]) {
                const p = data[0];
                const mapped: Post = { 
                    id: p.id,
                    autor: state.nombreDocente || p.autor as string,
                    cargo: p.cargo,
                    avatarUrl: state.perfilAvatarUrl || '',
                    contenido: p.contenido,
                    tiempo: 'Ahora',
                    fechaPublicacion: p.fecha_publicacion,
                    likes: p.likes || 0,
                    likedByMe: false, 
                    tipo: p.tipo,
                    asignatura: p.asignatura,
                    userId: p.user_id, 
                    recursoId: p.recurso_id, 
                    recursoDatos: p.recurso_datos, 
                    expiresAt: p.expires_at,
                    isOptimistic: false
                };

                setState(s => {
                    const filtered = s.posts.filter(post => post.id !== tempId);
                    const realPostExists = filtered.some(post => post.id === mapped.id);
                    
                    if (realPostExists) return { ...s, posts: filtered };
                    return { ...s, posts: [mapped, ...filtered] };
                });
                
                return data[0].id;
            }
        } catch (err) {
            console.error('Error adding post:', err);
            setState(s => ({ ...s, posts: s.posts.filter(p => p.id !== tempId) }));
        }
    }, [session, state.nombreDocente, state.cursos, state.perfilAvatarUrl, setState]);

    const importResource = useCallback(async (tipo: Post['tipo'], resourceData: ResourceData) => {
        if (!session?.user?.id) return;
        if (!resourceData) return;

        if (tipo === 'rubrica' || tipo === 'cotejo') {
            const { data, error } = await supabase.from('plantillas').insert([{
                user_id: session.user.id,
                tipo: tipo,
                nombre: `Importado: ${resourceData.nombre || resourceData.titulo || 'Recurso'}`,
                datos: resourceData
            }]).select();

            if (error) { console.error('Error importing resource:', error); return; }
            if (data && data[0]) {
                const newPlantilla: Plantilla = { id: data[0].id, tipo: data[0].tipo, nombre: data[0].nombre, datos: data[0].datos, createdAt: data[0].created_at };
                setState(s => ({ ...s, plantillas: [newPlantilla, ...s.plantillas] }));
                alert('Recurso importado exitosamente a tus plantillas.');
            }
        }
    }, [session, setState]);

    const deletePost = useCallback(async (postId: number) => {
        if (!session?.user?.id) return false;
        
        try {
            const { error } = await supabase
                .from('posts')
                .delete()
                .match({ id: postId, user_id: session.user.id });

            if (error) {
                console.error('Error deleting post:', error);
                setGenericToast({ message: 'Error al eliminar la publicación', type: 'error' });
                setTimeout(() => setGenericToast(null), 3000);
                return false;
            }

            setState(s => ({
                ...s,
                posts: s.posts.filter(p => p.id !== postId)
            }));

            setGenericToast({ message: 'Publicación eliminada correctamente', type: 'success' });
            setTimeout(() => setGenericToast(null), 3000);
            return true;
        } catch (err) {
            console.error('Error deleting post:', err);
            setGenericToast({ message: 'Error al eliminar la publicación', type: 'error' });
            setTimeout(() => setGenericToast(null), 3000);
            return false;
        }
    }, [session, setState, setGenericToast]);

    return {
        togglePostLike,
        reportPost,
        addPost,
        importResource,
        deletePost
    };
}
