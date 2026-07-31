import { useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAppStore } from '../store/appStore';

export function useNotificationActions() {
    const { session, setState } = useAppStore();

    const sendNotification = useCallback(async (n: { 
        userId: string, 
        titulo: string, 
        mensaje: string, 
        tipo?: string, 
        postId?: number, 
        grado?: string, 
        seccion?: string, 
        estado?: 'pendiente' | 'resuelto' 
    }) => {
        if (!session?.user?.id) return;
        const { data, error } = await supabase.from('notificaciones').insert([{
            user_id: n.userId,
            actor_id: session.user.id,
            titulo: n.titulo,
            mensaje: n.mensaje,
            tipo: n.tipo || 'info',
            post_id: n.postId,
            grado: n.grado,
            seccion: n.seccion,
            estado: n.estado || 'pendiente',
            leida: false
        }]).select();

        if (error) { 
            console.error('Error sending notification:', error); 
            return; 
        }
        
        if (data && data[0]) {
            setState(s => ({
                ...s,
                notificaciones: session.user.id === n.userId ? [data[0], ...s.notificaciones] : s.notificaciones
            }));
        }
    }, [session, setState]);

    const markAsRead = useCallback(async (id: number) => {
        const currentNotifications = useAppStore.getState().state.notificaciones;
        const notif = currentNotifications.find(n => n.id === id);

        if (notif && notif.tipo === 'like') {
            setState(s => ({
                ...s,
                notificaciones: s.notificaciones.filter(n => n.id !== id)
            }));
            await supabase.from('notificaciones').delete().eq('id', id);
        } else {
            setState(s => ({
                ...s,
                notificaciones: s.notificaciones.filter(n => n.id !== id)
            }));
            await supabase.from('notificaciones').update({ leida: true, fecha_lectura: new Date().toISOString() }).eq('id', id);
        }
    }, [setState]);

    return {
        sendNotification,
        markAsRead
    };
}
