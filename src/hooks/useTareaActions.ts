import { useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAppStore } from '../store/appStore';
import type { TareaInstitucional, TareaDocente } from '../types';

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
        if (!session?.user?.id) {
            return { data: null, error: new Error("No hay sesión activa.") };
        }

        try {
            // Llamar a la función RPC que maneja la transacción completa
            const { data: rpcData, error: rpcError } = await supabase.rpc('crear_tarea_institucional', {
                p_centro_id: input.centroId,
                p_descripcion: input.descripcion,
                p_docente_ids: input.docenteIds,
                p_fecha_limite: input.fechaLimite,
                p_prioridad: 'normal',
                p_titulo: input.titulo
            });

            if (rpcError) {
                console.error('[TAREAS INSTITUCIONALES] Error en RPC:', rpcError);
                return { data: null, error: rpcError };
            }

            if (!rpcData || !rpcData.id) {
                return { data: null, error: new Error("El servidor no devolvió el ID de la tarea creada.") };
            }
            
            const tareaId = rpcData.id;

            // Consultar la tarea recién creada (opcional, pero útil para tenerla en estado inmediatamente)
            const { data: tareaCreada, error: fetchError } = await supabase
                .from('tareas_institucionales')
                .select(`
                    *,
                    asignaciones:tarea_docente(*)
                `)
                .eq('id', tareaId)
                .single();

            if (fetchError || !tareaCreada) {
                console.error('[TAREAS INSTITUCIONALES] Error al cargar tarea recién creada:', fetchError);
                // Si falla la consulta, de igual modo mapeamos la estructura mínima para el frontend
            }

            const nowStr = new Date().toISOString();
            
            const asignacionesMapeadas: TareaDocente[] = input.docenteIds.map(uid => ({
                id: `temp-${Math.random()}`, // o usar el id real si fetch fue exitoso
                tareaId: tareaId,
                docenteId: uid,
                estado: 'pendiente' as const,
                createdAt: nowStr
            }));

            // Usar datos reales de base de datos si fetchError fue false
            const asignacionesFinales = tareaCreada?.asignaciones?.map((a: any) => ({
                id: a.id,
                tareaId: a.tarea_id,
                docenteId: a.docente_id,
                estado: a.estado,
                fechaEntrega: a.fecha_entrega,
                observaciones: a.observaciones,
                archivosEntrega: a.archivos_entrega,
                createdAt: a.created_at
            })) || asignacionesMapeadas;

            const mapped: TareaInstitucional = {
                id: tareaId,
                centroId: input.centroId,
                titulo: input.titulo,
                descripcion: input.descripcion,
                fechaLimite: input.fechaLimite,
                prioridad: 'normal',
                createdBy: session.user.id,
                createdAt: nowStr,
                asignaciones: asignacionesFinales
            };

            setState(s => ({ ...s, tareas: [mapped, ...s.tareas] }));
            return { data: mapped, error: null };
            
        } catch (error: any) {
            console.error('[TAREAS INSTITUCIONALES] Error inesperado:', error);
            return { data: null, error };
        }
    }, [session, setState]);

    const completeTarea = useCallback(async (tareaId: string) => {
        if (!session?.user?.id) return;

        const nowStr = new Date().toISOString();
        
        const { error } = await supabase
            .from('tarea_docente')
            .update({ 
                estado: 'completada', 
                fecha_entrega: nowStr 
            })
            .eq('tarea_id', tareaId)
            .eq('docente_id', session.user.id);

        if (error) {
            console.error('Error completando tarea:', error);
            return { error };
        }

        setState(s => ({
            ...s,
            tareas: s.tareas.map(t => t.id === tareaId
                ? {
                    ...t,
                    asignaciones: (t.asignaciones || []).map(a =>
                        a.docenteId === session.user.id
                            ? { ...a, estado: 'completada' as const, fechaEntrega: nowStr }
                            : a
                    )
                }
                : t
            )
        }));
        
        return { error: null };
    }, [session, setState]);

    const cancelTarea = useCallback(async (tareaId: string) => {
        if (!session?.user?.id) return;

        // La función de cancelar a nivel general en la UI no está explicitamente definida en la nueva arquitectura del usuario.
        // Asumiendo que se borra de tareas_institucionales
        const { error } = await supabase
            .from('tareas_institucionales')
            .delete()
            .eq('id', tareaId);

        if (error) {
            console.error('Error eliminando tarea:', error);
            return { error };
        }

        setState(s => ({
            ...s,
            tareas: s.tareas.filter(t => t.id !== tareaId)
        }));
        
        return { error: null };
    }, [session, setState]);

    return { addTarea, completeTarea, cancelTarea };
}
