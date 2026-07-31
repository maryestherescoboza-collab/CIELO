import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';

export interface PresenceUser {
    userId: string;
    nombre: string;
    avatarUrl?: string;
    asignatura?: string;
    currentModule?: string;
    onlineSince: string;
}

interface TrackPayload {
    userId: string;
    nombre: string;
    avatarUrl?: string;
    asignatura?: string;
    currentModule?: string;
    onlineSince: string;
}

/**
 * Hook que usa Supabase Realtime Presence para rastrear usuarios online.
 * - Emite track() al montar, con los datos del usuario actual.
 * - Escucha 'presence_state' (sync) para obtener la lista actualizada.
 * - Limpia el canal al desmontar â†’ evita usuarios "fantasma".
 * - Actualiza currentModule cuando el mÃ³dulo activo cambia.
 */
export function usePresence(
    currentUserId: string | undefined,
    currentModule: string,
    userPayload?: Partial<TrackPayload>
) {
    const [onlineUsers, setOnlineUsers] = useState<PresenceUser[]>([]);
    const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

    useEffect(() => {
        if (!currentUserId) return;

        // Nombre del canal Ãºnico para presencia global
        const CHANNEL_NAME = 'global-presence';

        const channel = supabase.channel(CHANNEL_NAME, {
            config: {
                presence: {
                    key: currentUserId,
                },
            },
        });

        channelRef.current = channel;

        // Sincronizar lista de presencia â†’ sin usuarios fantasma
        channel.on('presence', { event: 'sync' }, () => {
            const state = channel.presenceState<TrackPayload>();
            const users: PresenceUser[] = [];

            Object.values(state).forEach((presences) => {
                // Cada key puede tener mÃºltiples presencias (pestaÃ±as diferentes)
                // Tomamos la mÃ¡s reciente
                const latest = presences[presences.length - 1] as TrackPayload;
                if (latest?.userId) {
                    users.push({
                        userId: latest.userId,
                        nombre: latest.nombre || 'Docente',
                        avatarUrl: latest.avatarUrl,
                        asignatura: latest.asignatura,
                        currentModule: latest.currentModule,
                        onlineSince: latest.onlineSince,
                    });
                }
            });

            // Ordenar por nombre
            users.sort((a, b) => a.nombre.localeCompare(b.nombre));
            setOnlineUsers(users);
        });

        // Suscribir y hacer track del usuario actual al conectar
        channel.subscribe(async (status) => {
            if (status === 'SUBSCRIBED') {
                await channel.track({
                    userId: currentUserId,
                    nombre: userPayload?.nombre || 'Docente',
                    avatarUrl: userPayload?.avatarUrl,
                    asignatura: userPayload?.asignatura,
                    currentModule,
                    onlineSince: new Date().toISOString(),
                } as TrackPayload);
            }
        });

        // Cleanup: desconectar al desmontar â†’ elimina presencia del usuario
        return () => {
            channel.untrack().then(() => {
                supabase.removeChannel(channel);
            });
            channelRef.current = null;
        };
        // Solo re-ejecutar si cambia el userId (no el mÃ³dulo, eso se maneja abajo)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentUserId]);

    // Actualizar el módulo activo sin re-suscribir el canal completo
    const payloadNombre = userPayload?.nombre;
    const payloadAvatarUrl = userPayload?.avatarUrl;
    const payloadAsignatura = userPayload?.asignatura;
    const payloadOnlineSince = userPayload?.onlineSince;

    useEffect(() => {
        const channel = channelRef.current;
        if (!channel || !currentUserId) return;

        channel.track({
            userId: currentUserId,
            nombre: payloadNombre || 'Docente',
            avatarUrl: payloadAvatarUrl,
            asignatura: payloadAsignatura,
            currentModule,
            onlineSince: payloadOnlineSince || new Date().toISOString(),
        } as TrackPayload);
    }, [currentModule, currentUserId, payloadNombre, payloadAvatarUrl, payloadAsignatura, payloadOnlineSince]);

    return { onlineUsers, count: onlineUsers.length };
}
