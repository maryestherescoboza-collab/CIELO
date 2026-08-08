import { useState, useMemo } from 'react';
import type { AppState, ComunidadUIState } from '../types';

interface Params {
    state: AppState;
}

export function useComunidadData({ state }: Params) {
    const [uiState, setUiState] = useState<ComunidadUIState>({
        activeModal: null,
        selectedPostId: null
    });

    const [filter, setFilter] = useState('todos');
    const [showSuccessToast, setShowSuccessToast] = useState(false);

    const processedPosts = useMemo(() => {
        return state.posts.map(post => ({
            ...post,
            created_at_ts: post.fechaPublicacion ? Date.parse(post.fechaPublicacion) : 0
        }));
    }, [state.posts]);

    const filteredPosts = useMemo(() => {
        let result = processedPosts;
        if (filter !== 'todos') {
            result = result.filter(p => p.asignatura === filter);
        }
        return result.sort((a, b) => (b.created_at_ts || 0) - (a.created_at_ts || 0));
    }, [processedPosts, filter]);

    const featuredPosts = useMemo(() => {
        return [...processedPosts]
            .sort((a, b) => (b.created_at_ts || 0) - (a.created_at_ts || 0))
            .slice(0, 3);
    }, [processedPosts]);

    const topColaboradores = useMemo(() => {
        return [...state.perfiles]
            .filter((usuario) => {
                const total = usuario.publicacionesRealizadas;
                return typeof total === 'number' && Number.isFinite(total) && total > 0;
            })
            .sort((a, b) => (b.publicacionesRealizadas || 0) - (a.publicacionesRealizadas || 0))
            .slice(0, 5);
    }, [state.perfiles]);

    return {
        uiState,
        setUiState,
        filter,
        setFilter,
        showSuccessToast,
        setShowSuccessToast,
        filteredPosts,
        featuredPosts,
        topColaboradores
    };
}
