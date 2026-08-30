import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';

export interface PresenceUser {
    userId: string;
    nombre: string;
    avatarUrl?: string;
    asignatura?: string;
    onlineSince: string;
}

interface TrackPayload {
    userId: string;
    nombre: string;
    avatarUrl?: string;
    asignatura?: string;
    onlineSince: string;
}

/**
 * Hook que usa Supabase Realtime Presence para rastrear usuarios online.
 * - Emite track() al montar, con los datos del usuario actual.
 * - Escucha 'presence_state' (sync) para obtener la lista actualizada.
 * - Limpia el canal al desmontar -> evita usuarios "fantasma".
 */
export function usePresence(
    currentUserId: string | undefined,
    userPayload?: Partial<TrackPayload>
) {
    const [onlineUsers, setOnlineUsers] = useState<PresenceUser[]>([]);
    const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

    useEffect(() => {
        if (!currentUserId) return;

        const CHANNEL_NAME = 'global-presence';

        const channel = supabase.channel(CHANNEL_NAME, {
            config: {
                presence: {
                    key: currentUserId,
                },
            },
        });

        channelRef.current = channel;

        channel.on('presence', { event: 'sync' }, () => {
            const state = channel.presenceState<TrackPayload>();
            const users: PresenceUser[] = [];

            Object.values(state).forEach((presences) => {
                const latest = presences[presences.length - 1] as TrackPayload;
                if (latest?.userId) {
                    users.push({
                        userId: latest.userId,
                        nombre: latest.nombre || 'Docente',
                        avatarUrl: latest.avatarUrl,
                        asignatura: latest.asignatura,
                        onlineSince: latest.onlineSince,
                    });
                }
            });

            users.sort((a, b) => a.nombre.localeCompare(b.nombre));
            setOnlineUsers(users);
        });

        channel.subscribe(async (status) => {
            if (status === 'SUBSCRIBED') {
                await channel.track({
                    userId: currentUserId,
                    nombre: userPayload?.nombre || 'Docente',
                    avatarUrl: userPayload?.avatarUrl,
                    asignatura: userPayload?.asignatura,
                    onlineSince: new Date().toISOString(),
                } as TrackPayload);
            }
        });

        return () => {
            channel.untrack().then(() => {
                supabase.removeChannel(channel);
            });
            channelRef.current = null;
        };
    }, [currentUserId]);

    // Re-track if the payload changes (e.g. user profile loads after connection)
    useEffect(() => {
        if (!channelRef.current || !currentUserId) return;
        
        channelRef.current.track({
            userId: currentUserId,
            nombre: userPayload?.nombre || 'Docente',
            avatarUrl: userPayload?.avatarUrl,
            asignatura: userPayload?.asignatura,
            onlineSince: userPayload?.onlineSince || new Date().toISOString(),
        } as TrackPayload).catch(() => {
            // Ignore if channel is not fully joined yet
        });
    }, [
        currentUserId, 
        userPayload?.nombre, 
        userPayload?.avatarUrl, 
        userPayload?.asignatura, 
        userPayload?.onlineSince
    ]);

    return { onlineUsers, count: onlineUsers.length };
}
