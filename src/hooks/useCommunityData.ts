import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAppStore } from '../store/appStore';
import type { Post, UserProfile } from '../types';

export function useCommunityData() {
    const session = useAppStore(s => s.session);
    const globalState = useAppStore(s => s.state);
    const [posts, setPosts] = useState<Post[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<Error | null>(null);
    const [topColaboradores, setTopColaboradores] = useState<UserProfile[]>([]);

    const fetchCommunityData = useCallback(async () => {
        if (!session?.user?.id) return;
        setLoading(true);
        setError(null);
        console.log("[Community] Loading posts...");

        try {
            const [postsRes, likesRes, histRes] = await Promise.all([
                supabase.from('posts')
                    .select('*, profiles:perfiles(nombre_docente, avatar_url, bio)')
                    .order('id', { ascending: false }),
                supabase.from('post_likes')
                    .select('post_id')
                    .eq('user_id', session.user.id),
                supabase.from('historial_colaboradores')
                    .select('*')
            ]);

            if (postsRes.error) throw postsRes.error;
            if (likesRes.error) throw likesRes.error;
            if (histRes.error) throw histRes.error;

            const userLikedPostIds = new Set((likesRes.data || []).map(l => l.post_id as number));
            const secuencias = globalState.secuencias || [];
            const plantillas = globalState.plantillas || [];

            const mappedPosts: Post[] = (postsRes.data || []).map((p: any): Post => {
                const prof = (Array.isArray(p.profiles) ? p.profiles[0] : p.profiles) as Record<string, any> | undefined;
                
                let resolvedRecursoDatos = p.recurso_datos as Record<string, unknown> | undefined;
                if (!resolvedRecursoDatos && p.recurso_id && p.tipo) {
                    if (p.tipo === 'secuencia') {
                        resolvedRecursoDatos = secuencias.find((s: any) => s.id === p.recurso_id) as Record<string, unknown> | undefined;
                    } else if (p.tipo === 'rubrica' || p.tipo === 'cotejo') {
                        resolvedRecursoDatos = plantillas.find((pl: any) => pl.id === p.recurso_id) as Record<string, unknown> | undefined;
                    }
                }

                return {
                    id: p.id as number,
                    autor: prof?.nombre_docente as string || p.autor as string,
                    cargo: p.cargo as string,
                    avatarUrl: prof?.avatar_url as string || '',
                    contenido: p.contenido as string,
                    tiempo: p.tiempo as string || 'Hace un momento',
                    fechaPublicacion: p.fecha_publicacion as string,
                    likes: p.likes as number,
                    likedByMe: userLikedPostIds.has(p.id as number),
                    tipo: p.tipo as 'rubrica' | 'secuencia' | 'general' | 'cotejo',
                    asignatura: p.asignatura as string,
                    userId: p.user_id as string,
                    userBio: prof?.bio as string || '',
                    expiresAt: p.expires_at as string,
                    recursoDatos: resolvedRecursoDatos || {},
                    recursoId: p.recurso_id as number,
                };
            });

            // Map top colaboradores based on history
            const profilesWithHist = (globalState.perfiles || []).map((p: UserProfile): UserProfile => {
                const hist = (histRes.data || []).find(h => h.usuario_id === p.userId);
                return {
                    ...p,
                    publicacionesRealizadas: hist ? (hist.publicaciones_realizadas as number) : 0
                };
            });

            const topColabs = [...profilesWithHist]
                .sort((a, b) => (b.publicacionesRealizadas || 0) - (a.publicacionesRealizadas || 0))
                .slice(0, 5);

            setPosts(mappedPosts);
            setTopColaboradores(topColabs);
            console.log("[Community] Posts loaded successfully.");
        } catch (err: any) {
            console.error("[Community] Error fetching community data:", err);
            setError(err instanceof Error ? err : new Error(String(err)));
        } finally {
            setLoading(false);
        }
    }, [session?.user?.id, globalState.secuencias, globalState.plantillas, globalState.perfiles]);

    useEffect(() => {
        if (!session?.user?.id) return;

        fetchCommunityData();

        console.log("[Community] Setting up Realtime channels...");
        const channel = supabase.channel(`community-changes-${session.user.id}-${Date.now()}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'posts' }, () => {
                console.log("[Community] Realtime event received for table 'posts'.");
                fetchCommunityData();
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'historial_colaboradores' }, () => {
                console.log("[Community] Realtime event received for table 'historial_colaboradores'.");
                fetchCommunityData();
            })
            .subscribe();

        return () => {
            console.log("[Community] Cleaning up Realtime channel.");
            supabase.removeChannel(channel);
        };
    }, [session?.user?.id, fetchCommunityData]);

    return {
        posts,
        loading,
        error,
        topColaboradores,
        refresh: fetchCommunityData
    };
}
