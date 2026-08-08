import { useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAppStore } from '../store/appStore';
import type { Tarea, TareaAsignacion } from '../types';

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

        let asignacionesDb: Record<string, unknown>[] = [];
        if (asignaciones.length > 0) {
            const { data: rows, error: aError } = await supabase
                .from('tarea_asignaciones')
                .insert(asignaciones)
                .select('id, tarea_id, user_id, estado, fecha_completado, created_at');
            if (aError) {
                console.error('Error asignando tarea:', aError);
            } else {
                asignacionesDb = rows || [];
            }
        }

        // Notificar a cada docente asignado (se capturan fallos individuales
        // para no asumir que la notificación llegó si RLS/red lo impide)
        const resultadosNotificacion = await Promise.all(input.docenteIds.map(async uid => {
            const { error: nError } = await supabase.from('notificaciones').insert([{
                user_id: uid,
                actor_id: session.user.id,
                titulo: 'Nueva tarea asignada',
                mensaje: input.titulo,
                tipo: 'tarea',
                tarea_id: tarea.id,
                estado: 'pendiente',
                leida: false
            }]);
            if (nError) {
                console.error(`[useTareaActions] No se pudo notificar a ${uid}:`, nError);
                return false;
            }
            return true;
        }));
        const notificacionesFallidas = resultadosNotificacion.filter(ok => !ok).length;

        const asignacionesMapeadas: TareaAsignacion[] = asignacionesDb.length > 0
            ? asignacionesDb.map(a => ({
                id: a.id as number,
                tareaId: a.tarea_id as number,
                userId: a.user_id as string,
                estado: a.estado as 'pendiente' | 'completada',
                fechaCompletado: a.fecha_completado as string | undefined,
                createdAt: a.created_at as string,
            }))
            : input.docenteIds.map(uid => ({
                id: -Date.now() - Math.floor(Math.random() * 1000),
                tareaId: tarea.id,
                userId: uid,
                estado: 'pendiente' as const
            }));

        const mapped: Tarea = {
            id: tarea.id,
            centroId: tarea.centro_id,
            titulo: tarea.titulo,
            descripcion: tarea.descripcion || '',
            fechaLimite: tarea.fecha_limite || '',
            estado: tarea.estado,
            userId: tarea.created_by,
            createdAt: tarea.created_at,
            asignaciones: asignacionesMapeadas
        };

        setState(s => ({ ...s, tareas: [mapped, ...s.tareas] }));
        return { tarea: mapped, notificacionesFallidas };
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
