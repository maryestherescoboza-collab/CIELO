import { useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAppStore } from '../store/appStore';
import type { Secuencia } from '../types';
import { useSupabaseData } from './useSupabaseData';

export function useSecuenciaActions() {
    const setState = useAppStore(s => s.setAppState);
    const session = useAppStore(s => s.session);
    const setGenericToast = useAppStore(s => s.setGenericToast);
    const { syncDelete } = useSupabaseData();

    const addSecuencia = useCallback(async (seq: Omit<Secuencia, 'id'>) => {
        if (!session?.user?.id) return null;
        const { data, error } = await supabase.from('secuencias').insert([{
            titulo: seq.titulo,
            curso_id: seq.cursoId,
            fecha_inicio: seq.fechaInicio,
            contenido_html: seq.contenidoHtml,
            estado: seq.estado,
            user_id: session.user.id,
            recursos: seq.recursos || []
        }]).select();

        if (error) {
            console.error('Error adding secuencia:', error);
            setGenericToast({ 
                message: `Error al guardar la secuencia: ${error.message}`, 
                type: 'error' 
            });
            setTimeout(() => setGenericToast(null), 3000);
            return null;
        }

        if (data && data[0]) {
            let parsedRecursos = [];
            if (Array.isArray(data[0].recursos)) parsedRecursos = data[0].recursos;
            else if (typeof data[0].recursos === 'string') {
                try { parsedRecursos = JSON.parse(data[0].recursos); } catch(e) {}
            }

            const mapped = { 
                ...data[0], 
                cursoId: data[0].curso_id, 
                fechaInicio: data[0].fecha_inicio, 
                contenidoHtml: data[0].contenido_html,
                archivoUrl: data[0].archivo_url,
                archivoNombre: data[0].archivo_nombre,
                archivoSize: data[0].archivo_size,
                archivoTipo: data[0].archivo_tipo,
                archivoFechaCarga: data[0].archivo_fecha_carga,
                recursos: parsedRecursos
            };
            setState(s => ({ ...s, secuencias: [...s.secuencias, mapped] }));
            return mapped;
        }
        return null;
    }, [session, setState, setGenericToast]);

    const updateSecuencia = useCallback(async (sec: Secuencia) => {
        if (!session?.user?.id) return;
        setState(s => ({ ...s, secuencias: s.secuencias.map(x => x.id === sec.id ? sec : x) }));
        const { error } = await supabase.from('secuencias').upsert({
            id: sec.id,
            titulo: sec.titulo,
            curso_id: sec.cursoId,
            fecha_inicio: sec.fechaInicio,
            contenido_html: sec.contenidoHtml,
            estado: sec.estado,
            user_id: session.user.id,
            recursos: sec.recursos || []
        });
        if (error) console.error("Error updating secuencia:", error);
    }, [session, setState]);

    const deleteSecuencia = useCallback(async (id: number) => {
        await syncDelete('secuencias', id);
        setState(s => ({ ...s, secuencias: s.secuencias.filter(x => x.id !== id) }));
    }, [syncDelete, setState]);

    return {
        addSecuencia,
        updateSecuencia,
        deleteSecuencia
    };
}
