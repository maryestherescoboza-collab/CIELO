import { useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAppStore } from '../store/appStore';
import type { Curso } from '../types';

export function useCourseActions() {
    const state = useAppStore(s => s.state);
    const setState = useAppStore(s => s.setAppState);
    const session = useAppStore(s => s.session);
    const setGenericToast = useAppStore(s => s.setGenericToast);

    // Note: refresh is currently in useSupabaseData. We might need to move it to the store or a shared context.
    // For now, I'll assume we can use supabase directly for refresh if needed, 
    // or just trigger state updates that lead to re-fetches if using React Query later.

    const handleAddCurso = useCallback(async (c: Omit<Curso, 'id' | 'grupoId'>) => {
        if (!session?.user?.id) return null;
        
        const { data: grupoData, error: grupoError } = await supabase
            .from('grupos')
            .upsert({ 
                nombre: `${c.grado} ${c.seccion}`, 
                grado: c.grado, 
                seccion: c.seccion 
            }, { onConflict: 'grado,seccion' })
            .select();

        if (grupoError || !grupoData?.[0]) {
            console.error('Error al asegurar el grupo:', grupoError);
            setGenericToast({ message: "Error al sincronizar el grupo académico.", type: 'error' });
            setTimeout(() => setGenericToast(null), 3000);
            return null;
        }

        const grupo_id = grupoData[0].id;
        const shared_course_id = c.sharedCourseId || crypto.randomUUID();

        const { data, error } = await supabase.from('cursos').insert([{
            nombre: c.nombre,
            asignatura: c.asignatura,
            grado: c.grado,
            seccion: c.seccion,
            periodo: c.periodo,
            dias_semana: c.diasSemana,
            color: c.color,
            is_tutor_oficial: c.isTutorOficial,
            configuracion_evaluacion: c.configuracionEvaluacion || {},
            user_id: session.user.id,
            shared_course_id,
            grupo_id
        }]).select();

        if (error) { 
            console.error('Error adding curso:', error); 
            setGenericToast({ message: "No se pudo crear el curso. Error de base de datos.", type: 'error' });
            setTimeout(() => setGenericToast(null), 3000);
            return null; 
        }

        if (data && data[0]) {
            const mapped: Curso = {
                id: data[0].id,
                nombre: data[0].nombre,
                asignatura: data[0].asignatura,
                grado: data[0].grado,
                seccion: data[0].seccion,
                periodo: data[0].periodo,
                diasSemana: data[0].dias_semana,
                color: data[0].color,
                isTutorOficial: data[0].is_tutor_oficial,
                userId: data[0].user_id,
                grupoId: data[0].grupo_id,
                sharedCourseId: data[0].shared_course_id,
                configuracionEvaluacion: data[0].configuracion_evaluacion || {},
                createdAt: data[0].created_at
            };
            setState(s => ({ ...s, cursos: [...s.cursos, mapped] }));

            // Logic to resolve pending linking notifications
            const pendingNotif = state.notificaciones.find(n => 
                n.tipo === 'solicitud_vinculacion' && 
                n.estado === 'pendiente' && 
                n.grado === mapped.grado && 
                n.seccion === mapped.seccion
            );

            if (pendingNotif) {
                const tutorCurso = state.cursos.find(tc => 
                    tc.userId === pendingNotif.actorId && 
                    tc.grado === mapped.grado && 
                    tc.seccion === mapped.seccion
                );

                if (tutorCurso) {
                    await supabase.from('curso_docentes').insert([{
                        curso_id: tutorCurso.id,
                        docente_id: session.user.id,
                        rol: 'co-docente',
                        asignatura: mapped.asignatura
                    }]);
                    await supabase.from('notificaciones').update({ estado: 'resuelto', leida: true, fecha_lectura: new Date().toISOString() }).eq('id', pendingNotif.id);
                    // refresh(); // We need a way to refresh or just rely on the insert update
                }
            }

            return mapped;
        }
    }, [session, setState, setGenericToast]);

    const handleDeleteCurso = useCallback(async (id: number) => {
        // We'll use supabase directly here to bypass syncDelete from useSupabaseData if we want to be independent
        const { error } = await supabase.from('cursos').delete().eq('id', id);
        if (error) {
            console.error('Error deleting curso:', error);
            return;
        }
        setState(s => ({
            ...s,
            cursos: s.cursos.filter(c => c.id !== id),
            estudiantes: s.estudiantes.filter(e => e.cursoId !== id)
        }));
    }, [setState]);

    const handleSaveCurso = useCallback(async (c: Curso) => {
        if (!session?.user?.id) return;
        
        const { data: grp } = await supabase.from('grupos').upsert({
            nombre: `${c.grado} ${c.seccion}`,
            grado: c.grado,
            seccion: c.seccion
        }, { onConflict: 'grado,seccion' }).select();

        const grupo_id = grp?.[0]?.id || c.grupoId;

        setState(s => ({ ...s, cursos: s.cursos.map(cu => cu.id === c.id ? { ...c, grupoId: grupo_id } : cu) }));
        
        await supabase.from('cursos').upsert({
            id: c.id,
            nombre: c.nombre,
            asignatura: c.asignatura,
            grado: c.grado,
            seccion: c.seccion,
            periodo: c.periodo,
            dias_semana: c.diasSemana,
            color: c.color,
            is_tutor_oficial: c.isTutorOficial,
            configuracion_evaluacion: c.configuracionEvaluacion || {},
            user_id: session.user.id,
            grupo_id: grupo_id
        });
    }, [session, setState]);

    const handleToggleDocenteCurso = useCallback(async (cursoId: number, targetUserId: string, rol: 'tutor' | 'co-docente', asignatura: string, sendNotification: any, syncDelete: any) => {
        if (!session?.user?.id) return;

        const cursoTutor = state.cursos.find(c => c.id === cursoId);
        if (!cursoTutor) return;

        const existing = state.cursoDocentes.find(cd => cd.cursoId === cursoId && cd.userId === targetUserId && cd.asignatura === asignatura);

        if (existing) {
            await syncDelete('curso_docentes', existing.id);
            setState(s => ({ ...s, cursoDocentes: s.cursoDocentes.filter(cd => cd.id !== existing.id) }));
        } else {
            const { data, error } = await supabase.from('curso_docentes').insert([{
                curso_id: cursoId,
                docente_id: targetUserId,
                rol,
                asignatura
            }]).select();

            if (error) { console.error('Error in linking:', error); return; }

            if (data && data[0]) {
                const mapped = {
                    id: data[0].id,
                    cursoId: data[0].curso_id,
                    userId: data[0].docente_id,
                    rol: data[0].rol,
                    asignatura: data[0].asignatura,
                    createdAt: data[0].created_at
                };
                
                setState(s => ({ 
                    ...s, 
                    cursoDocentes: [...s.cursoDocentes, mapped]
                }));

                const coDocenteCurso = state.cursos.find(c =>
                    c.userId === targetUserId &&
                    c.grado === cursoTutor.grado &&
                    c.seccion === cursoTutor.seccion
                );

                if (coDocenteCurso) {
                    if (coDocenteCurso.sharedCourseId !== cursoTutor.sharedCourseId) {
                        await supabase.from('cursos').update({ shared_course_id: cursoTutor.sharedCourseId }).eq('id', coDocenteCurso.id);
                        setState(s => ({
                            ...s,
                            cursos: s.cursos.map(c => c.id === coDocenteCurso.id ? { ...c, sharedCourseId: cursoTutor.sharedCourseId } : c)
                        }));
                    }
                } else {
                    await sendNotification({
                        userId: targetUserId,
                        titulo: 'Vincular Co-docente (Acción Requerida)',
                        mensaje: `El docente tutor desea vincularte en ${cursoTutor.grado} ${cursoTutor.seccion}. Por favor, crea este curso para completar la vinculación.`,
                        tipo: 'solicitud_vinculacion',
                    });
                }
            }
        }
    }, [session, state.cursoDocentes, state.cursos, setState]);

    return {
        addCurso: handleAddCurso,
        deleteCurso: handleDeleteCurso,
        saveCurso: handleSaveCurso,
        toggleDocenteCurso: handleToggleDocenteCurso
    };
}
