import { useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAppStore } from '../store/appStore';
import type { Tarea } from '../types';

export function useTareaActions() {
    const setState = useAppStore(s => s.setAppState);
    const session = useAppStore(s => s.session);

    const addTarea = useCallback(async (input: {
        centroId: string;
        titulo: string;
        descripcion: string;
        fechaLimite: string;
        docenteIds: string[];
    }) => {
        if (!session?.user?.id) return null;

        const { data, error } = await supabase.from('tareas').insert([{
            centro_id: input.centroId,
            titulo: input.titulo,
            descripcion: input.descripcion,
            fecha_limite: input.fechaLimite || null,
            estado: 'pendiente',
            created_by: session.user.id
        }]).select();

        if (error || !data?.[0]) {
            console.error('Error creando tarea:', error);
            return null;
        }
        const tarea = data[0];

        const asignaciones: Record<string, unknown>[] = input.docenteIds.map(uid => ({
            tarea_id: tarea.id,
            user_id: uid,
            estado: 'pendiente'
        }));

        if (asignaciones.length > 0) {
            const { error: aError } = await supabase.from('tarea_asignaciones').insert(asignaciones);
            if (aError) console.error('Error asignando tarea:', aError);
        }

        // Notificar a cada docente asignado
        await Promise.all(input.docenteIds.map(uid =>
            supabase.from('notificaciones').insert([{
                user_id: uid,
                actor_id: session.user.id,
                titulo: 'Nueva tarea asignada',
                mensaje: input.titulo,
                tipo: 'tarea',
                tarea_id: tarea.id,
                estado: 'pendiente',
                leida: false
            }]).select()
        ));

        const mapped: Tarea = {
            id: tarea.id,
            centroId: tarea.centro_id,
            titulo: tarea.titulo,
            descripcion: tarea.descripcion || '',
            fechaLimite: tarea.fecha_limite || '',
            estado: tarea.estado,
            userId: tarea.created_by,
            createdAt: tarea.created_at,
            asignaciones: input.docenteIds.map(uid => ({
                id: -Date.now() - Math.floor(Math.random() * 1000),
                tareaId: tarea.id,
                userId: uid,
                estado: 'pendiente'
            }))
        };

        setState(s => ({ ...s, tareas: [mapped, ...s.tareas] }));
        return mapped;
    }, [session, setState]);

    const completeTarea = useCallback(async (tareaId: number) => {
        if (!session?.user?.id) return;

        const { error } = await supabase
            .from('tarea_asignaciones')
            .update({ estado: 'completada', fecha_completado: new Date().toISOString() })
            .eq('tarea_id', tareaId)
            .eq('user_id', session.user.id);

        if (error) {
            console.error('Error completando tarea:', error);
            return;
        }

        const fecha = new Date().toISOString();
        setState(s => ({
            ...s,
            tareas: s.tareas.map(t => t.id === tareaId
                ? {
                    ...t,
                    asignaciones: (t.asignaciones || []).map(a =>
                        a.userId === session.user.id
                            ? { ...a, estado: 'completada' as const, fechaCompletado: fecha }
                            : a
                    )
                }
                : t
            )
        }));
    }, [session, setState]);

    const cancelTarea = useCallback(async (tareaId: number) => {
        if (!session?.user?.id) return;

        const { error } = await supabase
            .from('tareas')
            .update({ estado: 'cancelada' })
            .eq('id', tareaId);

        if (error) {
            console.error('Error cancelando tarea:', error);
            return;
        }

        setState(s => ({
            ...s,
            tareas: s.tareas.map(t => t.id === tareaId ? { ...t, estado: 'cancelada' as const } : t)
        }));
    }, [session, setState]);

    return {
        addTarea,
        completeTarea,
        cancelTarea
    };
}
