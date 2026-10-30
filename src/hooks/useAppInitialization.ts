import { useState, useMemo } from 'react';
import { usePresence } from './usePresence';
import type { AppState } from '../types';
import { obtenerNombreVisible, NOMBRE_NEUTRO } from '../utils/nombres';

interface Params {
    state: AppState;
    session: any;
}

export function useAppInitialization({ state, session }: Params) {
    // La presencia de usuarios conectados se gestiona exclusivamente mediante usePresence (Realtime en memoria).
    // Se eliminan tanto las escrituras periódicas (setInterval) como el upsert inicial de perfiles.last_seen.
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
