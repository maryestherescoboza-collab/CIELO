import { useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAppStore } from '../store/appStore';
import type { Incidencia } from '../types';
import { useSupabaseData } from './useSupabaseData';

export function useIncidenciaActions() {
    const state = useAppStore(s => s.state);
    const setState = useAppStore(s => s.setAppState);
    const session = useAppStore(s => s.session);
    const { syncDelete } = useSupabaseData();

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
        await syncDelete('incidencias', id);
        setState(s => ({ ...s, incidencias: s.incidencias.filter(i => i.id !== id) }));
    }, [syncDelete, setState]);

    return {
        addIncidencia,
        deleteIncidencia
    };
}
