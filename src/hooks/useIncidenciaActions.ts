import { useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAppStore } from '../store/appStore';
import type { Incidencia } from '../types';

export function useIncidenciaActions() {
    const state = useAppStore(s => s.state);
    const setState = useAppStore(s => s.setAppState);
    const session = useAppStore(s => s.session);


    const addIncidencia = useCallback(async (inc: Omit<Incidencia, 'id'>) => {
        if (!session?.user?.id) return;
        const student = state.estudiantes.find(e => e.id === inc.estudianteId);
        const sharedCourseId = inc.sharedCourseId || student?.sharedCourseId || "";
        
        const { data, error } = await supabase.from('incidencias').insert([{
            estudiante_id: inc.estudianteId,
            categoria: inc.categoria,
            descripcion: inc.descripcion,
            acciones_tomadas: inc.accionesTomadas,
            acuerdos: inc.acuerdos,
            fecha: inc.fecha,
            gravedad: inc.gravedad,
            user_id: session.user.id,
            shared_course_id: sharedCourseId
        }]).select();

        if (error) { 
            console.error('Error adding incidencia:', error); 
            return; 
        }

        if (data && data[0]) {
            const mapped = {
                id: data[0].id,
                estudianteId: data[0].estudiante_id,
                categoria: data[0].categoria,
                descripcion: data[0].descripcion,
                accionesTomadas: data[0].acciones_tomadas || [],
                acuerdos: data[0].acuerdos,
                fecha: data[0].fecha,
                gravedad: data[0].gravedad,
                userId: data[0].user_id,
                sharedCourseId: data[0].shared_course_id || sharedCourseId
            } as Incidencia;
            setState(s => ({
                ...s,
                incidencias: [mapped, ...s.incidencias],
                estudiantes: s.estudiantes.map(e =>
                    e.id === inc.estudianteId ? { ...e, enRiesgo: true } : e
                ),
            }));
        }
    }, [session, state.estudiantes, setState]);

    const deleteIncidencia = useCallback(async (id: number) => {
        if (!session?.user?.id) return;
        try {
            await supabase.from('incidencias').delete().eq('id', id);
            setState(s => ({ ...s, incidencias: s.incidencias.filter(i => i.id !== id) }));
        } catch (error) {
            console.error('Error deleting incidencia:', error);
        }
    }, [session, setState]);

    const updateIncidencia = useCallback(async (id: number, updates: Partial<Omit<Incidencia, 'id'>>) => {
        if (!session?.user?.id) {
            return { success: false, error: 'No hay sesión de usuario activa' };
        }

        try {
            const payload: Record<string, unknown> = {};
            if (updates.fecha !== undefined) payload.fecha = updates.fecha;
            if (updates.categoria !== undefined) payload.categoria = updates.categoria;
            if (updates.descripcion !== undefined) payload.descripcion = updates.descripcion;
            if (updates.accionesTomadas !== undefined) payload.acciones_tomadas = updates.accionesTomadas;
            if (updates.acuerdos !== undefined) payload.acuerdos = updates.acuerdos;
            if (updates.gravedad !== undefined) payload.gravedad = updates.gravedad;
            if (updates.estudianteId !== undefined) payload.estudiante_id = updates.estudianteId;
            if (updates.sharedCourseId !== undefined) payload.shared_course_id = updates.sharedCourseId;

            const { data, error } = await supabase
                .from('incidencias')
                .update(payload)
                .eq('id', id)
                .select();

            if (error) {
                console.error('Error updating incidencia:', error);
                return { success: false, error: error.message };
            }

            if (data && data[0]) {
                const updated = data[0];
                setState(s => ({
                    ...s,
                    incidencias: s.incidencias.map(item => {
                        if (item.id === id) {
                            return {
                                ...item,
                                categoria: updated.categoria ?? item.categoria,
                                descripcion: updated.descripcion ?? item.descripcion,
                                accionesTomadas: updated.acciones_tomadas ?? item.accionesTomadas,
                                acuerdos: updated.acuerdos ?? item.acuerdos,
                                fecha: updated.fecha ?? item.fecha,
                                gravedad: updated.gravedad ?? item.gravedad,
                                sharedCourseId: updated.shared_course_id ?? item.sharedCourseId,
                                centroId: updated.centro_id ?? item.centroId,
                            };
                        }
                        return item;
                    })
                }));
                return { success: true, data: data[0] };
            }

            // Fallback en caso de que la BD actualice correctamente pero el select no retorne tuplas por RLS selectivo
            setState(s => ({
                ...s,
                incidencias: s.incidencias.map(item => {
                    if (item.id === id) {
                        return {
                            ...item,
                            ...(updates.categoria !== undefined ? { categoria: updates.categoria } : {}),
                            ...(updates.descripcion !== undefined ? { descripcion: updates.descripcion } : {}),
                            ...(updates.accionesTomadas !== undefined ? { accionesTomadas: updates.accionesTomadas } : {}),
                            ...(updates.acuerdos !== undefined ? { acuerdos: updates.acuerdos } : {}),
                            ...(updates.fecha !== undefined ? { fecha: updates.fecha } : {}),
                            ...(updates.gravedad !== undefined ? { gravedad: updates.gravedad } : {}),
                            ...(updates.estudianteId !== undefined ? { estudianteId: updates.estudianteId } : {}),
                            ...(updates.sharedCourseId !== undefined ? { sharedCourseId: updates.sharedCourseId } : {}),
                        };
                    }
                    return item;
                })
            }));
            return { success: true };
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Error inesperado al actualizar incidencia';
            console.error('Unexpected error updating incidencia:', err);
            return { success: false, error: msg };
        }
    }, [session, setState]);

    return {
        addIncidencia,
        updateIncidencia,
        deleteIncidencia
    };
}
