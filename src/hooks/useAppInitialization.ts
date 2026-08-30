import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';

import { usePresence } from './usePresence';
import type { AppState } from '../types';
import { obtenerNombreVisible, NOMBRE_NEUTRO } from '../utils/nombres';

interface Params {
    state: AppState;
    session: any;
}

export function useAppInitialization({ state, session }: Params) {
    useEffect(() => {
        if (session?.user?.id) {
            const updateLastSeen = async () => {
                await supabase.from('perfiles').upsert({
                    user_id: session.user.id,
                    last_seen: new Date().toISOString(),
                });
            };
            updateLastSeen();
            const interval = setInterval(updateLastSeen, 60000);
            return () => clearInterval(interval);
        }
    }, [session]);

    const currentUserProfile = useMemo(
        () => state.perfiles.find(p => p.userId === session?.user?.id),
        [state.perfiles, session]
    );

    const DOCENTE = useMemo(
        () => obtenerNombreVisible(currentUserProfile, state.nombreDocente || NOMBRE_NEUTRO),
        [currentUserProfile, state.nombreDocente]
    );

    const [onlineSince] = useState(() => new Date().toISOString());

    const presencePayload = useMemo(() => ({
        nombre: currentUserProfile?.nombreDocente || DOCENTE,
        avatarUrl: state.perfilAvatarUrl || currentUserProfile?.avatarUrl || '',
        asignatura: Array.isArray(state.asignaturas) ? state.asignaturas[0] : '',
        onlineSince,
    }), [currentUserProfile?.nombreDocente, DOCENTE, state.perfilAvatarUrl, currentUserProfile?.avatarUrl, state.asignaturas, onlineSince]);

    const { onlineUsers } = usePresence(session?.user?.id, presencePayload);



    return {
        DOCENTE,
        currentUserProfile,
        onlineUsers
    };
}
