import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAppStore } from '../store/appStore';
import type { Post, UserProfile } from '../types';

export function useCommunityData() {
    const session = useAppStore(s => s.session);
    const globalState = useAppStore(s => s.state);
    const setAppState = useAppStore(s => s.setState);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<Error | null>(null);
    const [topColaboradores, setTopColaboradores] = useState<UserProfile[]>([]);
    const [page, setPage] = useState(0);
    const [hasMore, setHasMore] = useState(true);
    const POSTS_PER_PAGE = 20;

    const fetchCommunityData = useCallback(async (pageNumber: number = 0) => {
        if (!session?.user?.id) return;
        setLoading(true);
        setError(null);
        console.log("[Community] Loading posts...");

        try {
            const [postsRes, histRes] = await Promise.all([
                supabase.from('posts')
                    .select('*, profiles:perfiles(nombre_docente, avatar_url, bio)')
                    .order('id', { ascending: false })
                    .range(pageNumber * POSTS_PER_PAGE, (pageNumber + 1) * POSTS_PER_PAGE - 1),
                supabase.from('historial_colaboradores')
                    .select('*')
            ]);

            if (postsRes.error) throw postsRes.error;
            if (histRes.error) throw histRes.error;

            const secuencias = globalState.secuencias || [];
            const plantillas = globalState.plantillas || [];

            // El fetch global de plantillas está acotado al docente propio.
            // Los recursos compartidos por otros (rúbricas/cotejos en posts)
            // se resuelven con una consulta puntual por ids faltantes; la RLS
            // "plantillas_lectura_comunidad" permite leer exactamente esas filas.
            const missingPlantillaIds = Array.from(new Set(
                (postsRes.data || [])
                    .filter((p: any) => (p.tipo === 'rubrica' || p.tipo === 'cotejo') && p.recurso_id && !plantillas.some((pl: any) => pl.id === p.recurso_id))
                    .map((p: any) => p.recurso_id as number)
            ));
            let plantillasComunidad = plantillas as any[];
            if (missingPlantillaIds.length > 0) {
                const { data: sharedPlants, error: sharedErr } = await supabase
                    .from('plantillas')
                    .select('*')
                    .in('id', missingPlantillaIds);
                if (!sharedErr && sharedPlants) {
                    plantillasComunidad = [...plantillas, ...sharedPlants];
                } else if (sharedErr) {
                    console.warn('[Community] No se pudieron cargar plantillas compartidas:', sharedErr.message);
                }
            }

            const missingSecuenciaIds = Array.from(new Set(
                (postsRes.data || [])
                    .filter((p: any) => p.tipo === 'secuencia' && p.recurso_id && !secuencias.some((s: any) => s.id === p.recurso_id))
                    .map((p: any) => p.recurso_id as number)
            ));
            let secuenciasComunidad = secuencias as any[];
            if (missingSecuenciaIds.length > 0) {
                const { data: sharedSecs, error: sharedErr } = await supabase
                    .from('secuencias')
                    .select('*')
                    .in('id', missingSecuenciaIds);
                if (!sharedErr && sharedSecs) {
                    secuenciasComunidad = [...secuencias, ...sharedSecs];
                } else if (sharedErr) {
                    console.warn('[Community] No se pudieron cargar secuencias compartidas:', sharedErr.message);
                }
            }

            const mappedPosts: Post[] = (postsRes.data || []).map((p: any): Post => {
                const prof = (Array.isArray(p.profiles) ? p.profiles[0] : p.profiles) as Record<string, any> | undefined;
                
                let resolvedRecursoDatos = p.recurso_datos as Record<string, unknown> | undefined;
                if (!resolvedRecursoDatos && p.recurso_id && p.tipo) {
                    if (p.tipo === 'secuencia') {
                        resolvedRecursoDatos = secuenciasComunidad.find((s: any) => s.id === p.recurso_id) as Record<string, unknown> | undefined;
                    } else if (p.tipo === 'rubrica' || p.tipo === 'cotejo') {
                        resolvedRecursoDatos = plantillasComunidad.find((pl: any) => pl.id === p.recurso_id) as Record<string, unknown> | undefined;
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
                    tipo: p.tipo as 'rubrica' | 'secuencia' | 'general' | 'cotejo' | 'recurso',
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
                .filter((usuario) => {
                    const total = usuario.publicacionesRealizadas;
                    return typeof total === 'number' && Number.isFinite(total) && total > 0;
                })
                .sort((a, b) => (b.publicacionesRealizadas || 0) - (a.publicacionesRealizadas || 0))
                .slice(0, 5);

            const optimisticPosts = (useAppStore.getState().state.posts || []).filter(p =>
                p.isOptimistic && !mappedPosts.some(mp => mp.id === p.id)
            );

            setTopColaboradores(topColabs);
            
            if ((postsRes.data || []).length < POSTS_PER_PAGE) {
                setHasMore(false);
            } else {
                setHasMore(true);
            }

            setAppState(prev => {
                const existing = pageNumber === 0 ? [] : (prev.posts || []).filter(p => !p.isOptimistic);
                const merged = [...existing];
                mappedPosts.forEach(mp => {
                    if (!merged.some(ep => ep.id === mp.id)) merged.push(mp);
                });
                return {
                    ...prev,
                    posts: [...optimisticPosts, ...merged]
                };
            });
            console.log("[Community] Posts loaded and written to global store.");
        } catch (err: any) {
            console.error("[Community] Error fetching community data:", err);
            setError(err instanceof Error ? err : new Error(String(err)));
        } finally {
            setLoading(false);
        }
    }, [session?.user?.id, globalState.secuencias, globalState.plantillas, globalState.perfiles, setAppState]);

    useEffect(() => {
        if (!session?.user?.id) return;

        fetchCommunityData();

    }, [session?.user?.id, fetchCommunityData]);

    const loadMorePosts = useCallback(() => {
        if (!loading && hasMore) {
            const nextPage = page + 1;
            setPage(nextPage);
            fetchCommunityData(nextPage);
        }
    }, [loading, hasMore, page, fetchCommunityData]);

    return {
        posts: globalState.posts,
        loading,
        error,
        topColaboradores,
        refresh: () => { setPage(0); fetchCommunityData(0); },
        loadMorePosts,
        hasMore
    };
}
