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

        const userProfile = state.perfiles.find(p => p.userId === session.user.id);
        const centro_id = userProfile?.centro_id;

        if (!centro_id) {
            setGenericToast({ message: "Debes estar registrado en un centro educativo para crear cursos.", type: 'error' });
            setTimeout(() => setGenericToast(null), 3000);
            return null;
        }

        // 1. Check if course already exists in this school for the same grade/section
        const { data: existingData, error: findError } = await supabase
            .from('cursos')
            .select('*')
            .eq('centro_id', centro_id)
            .eq('grado', c.grado)
            .eq('seccion', c.seccion)
            .maybeSingle();

        if (findError) {
            console.error('Error checking course existence:', findError);
        }

        let finalCurso = null;

        if (existingData) {
            // Course exists, reuse it!
            finalCurso = existingData;
            
            // Check if this teacher is already assigned to this subject in the course
            const existingLink = state.cursoDocentes.find(cd => cd.cursoId === existingData.id && cd.asignatura === c.asignatura);
            if (existingLink) {
                setGenericToast({ message: `Ya hay un docente asignado a ${c.asignatura} en este curso.`, type: 'error' });
                setTimeout(() => setGenericToast(null), 3000);
                return null;
            }

            // Insert linking record in curso_docentes
            const { data: linkData, error: linkError } = await supabase
                .from('curso_docentes')
                .insert([{
                    curso_id: existingData.id,
                    docente_id: session.user.id,
                    rol: c.isTutorOficial ? 'tutor' : 'co-docente',
                    es_tutor: !!c.isTutorOficial,
                    asignatura: c.asignatura,
                    dias_semana: c.diasSemana
                }])
                .select();

            if (linkError) {
                console.error('Error linking to existing course:', linkError);
                setGenericToast({ message: "No se pudo realizar la vinculación al curso existente.", type: 'error' });
                setTimeout(() => setGenericToast(null), 3000);
                return null;
            }

            if (linkData && linkData[0]) {
                const mappedLink = {
                    id: linkData[0].id,
                    cursoId: linkData[0].curso_id,
                    userId: linkData[0].docente_id,
                    rol: linkData[0].rol,
                    esTutor: linkData[0].es_tutor,
                    asignatura: linkData[0].asignatura,
                    diasSemana: linkData[0].dias_semana,
                    createdAt: linkData[0].created_at
                };
                setState(s => ({
                    ...s,
                    cursoDocentes: [...s.cursoDocentes, mappedLink]
                }));
            }
        } else {
            // Course does not exist, create a new one!
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
                color: c.color,
                is_tutor_oficial: c.isTutorOficial,
                configuracion_evaluacion: c.configuracionEvaluacion || {},
                user_id: session.user.id,
                shared_course_id,
                grupo_id,
                centro_id
            }]).select();

            if (error) { 
                console.error('Error adding curso:', error); 
                setGenericToast({ message: "No se pudo crear el curso. Error de base de datos.", type: 'error' });
                setTimeout(() => setGenericToast(null), 3000);
                return null; 
            }

            if (data && data[0]) {
                finalCurso = data[0];

                // Also insert tutor link in curso_docentes
                const { data: linkData } = await supabase.from('curso_docentes').insert([{
                    curso_id: finalCurso.id,
                    docente_id: session.user.id,
                    rol: 'tutor',
                    es_tutor: true,
                    asignatura: c.asignatura,
                    dias_semana: c.diasSemana
                }]).select();

                if (linkData && linkData[0]) {
                    const mappedLink = {
                        id: linkData[0].id,
                        cursoId: linkData[0].curso_id,
                        userId: linkData[0].docente_id,
                        rol: linkData[0].rol,
                        esTutor: linkData[0].es_tutor,
                        asignatura: linkData[0].asignatura,
                        diasSemana: linkData[0].dias_semana,
                        createdAt: linkData[0].created_at
                    };
                    setState(s => ({
                        ...s,
                        cursoDocentes: [...s.cursoDocentes, mappedLink]
                    }));
                }
            }
        }

        if (finalCurso) {
            const mapped: Curso = {
                id: finalCurso.id,
                nombre: finalCurso.nombre,
                asignatura: c.asignatura,
                grado: finalCurso.grado,
                seccion: finalCurso.seccion,
                periodo: finalCurso.periodo,
                diasSemana: c.diasSemana,
                color: finalCurso.color,
                isTutorOficial: finalCurso.is_tutor_oficial,
                userId: finalCurso.user_id,
                grupoId: finalCurso.grupo_id,
                sharedCourseId: finalCurso.shared_course_id,
                centroId: finalCurso.centro_id,
                configuracionEvaluacion: finalCurso.configuracion_evaluacion || {},
                createdAt: finalCurso.created_at
            };
            
            // Add mapped course to state if it isn't already there
            setState(s => {
                const exists = s.cursos.some(cur => cur.id === mapped.id);
                return {
                    ...s,
                    cursos: exists ? s.cursos : [...s.cursos, mapped]
                };
            });

            return mapped;
        }
        return null;
    }, [session, setState, setGenericToast, state.perfiles, state.cursoDocentes]);

    const handleDeleteCurso = useCallback(async (id: number) => {
        if (!session?.user?.id) return;
        
        // Logical delete (hide) instead of physical delete
        const { error } = await supabase
            .from('curso_docentes')
            .update({ activo: false })
            .eq('curso_id', id)
            .eq('docente_id', session.user.id);
            
        if (error) {
            console.error('Error hiding curso:', error);
            return;
        }
        
        setState(s => ({
            ...s,
            cursoDocentes: s.cursoDocentes.filter(cd => !(cd.cursoId === id && cd.userId === session.user.id)),
            // Filter out the course locally if no longer linked
            cursos: s.cursos.filter(c => c.id !== id || s.cursoDocentes.some(cd => cd.cursoId === c.id && cd.userId !== session.user.id && cd.cursoId !== id)) 
        }));
    }, [session, setState]);

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
            grado: c.grado,
            seccion: c.seccion,
            periodo: c.periodo,
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
                es_tutor: false,
                asignatura
            }]).select();

            if (error) { console.error('Error in linking:', error); return; }

            if (data && data[0]) {
                const mapped = {
                    id: data[0].id,
                    cursoId: data[0].curso_id,
                    userId: data[0].docente_id,
                    rol: data[0].rol,
                    esTutor: data[0].es_tutor,
                    asignatura: data[0].asignatura,
                    diasSemana: data[0].dias_semana || [],
                    createdAt: data[0].created_at
                };
                
                setState(s => ({ 
                    ...s, 
                    cursoDocentes: [...s.cursoDocentes, mapped]
                }));

                await sendNotification({
                    userId: targetUserId,
                    titulo: 'Nuevo Curso Vinculado',
                    mensaje: `Has sido vinculado como co-docente en ${cursoTutor.grado} ${cursoTutor.seccion} para la asignatura de ${asignatura}.`,
                    tipo: 'info',
                });
            }
        }
    }, [session, state.cursoDocentes, state.cursos, setState]);

    const handleUpdateDocenteAsignatura = useCallback(async (cursoId: number, asignatura: string) => {
        if (!session?.user?.id) return;
        
        // 1. Check if asignatura is already assigned to another teacher in this course
        const isAlreadyAssignedLocal = state.cursoDocentes.some(cd => 
            cd.cursoId === cursoId && 
            cd.asignatura === asignatura && 
            cd.userId !== session.user.id
        );
        if (isAlreadyAssignedLocal) {
            setGenericToast({ message: "Esta asignatura ya está asignada a otro docente en este curso.", type: 'error' });
            setTimeout(() => setGenericToast(null), 3000);
            return;
        }

        const { data: duplicateCheck } = await supabase
            .from('curso_docentes')
            .select('id')
            .eq('curso_id', cursoId)
            .eq('asignatura', asignatura)
            .eq('activo', true)
            .neq('docente_id', session.user.id);

        if (duplicateCheck && duplicateCheck.length > 0) {
            setGenericToast({ message: "Esta asignatura ya está asignada a otro docente en este curso.", type: 'error' });
            setTimeout(() => setGenericToast(null), 3000);
            return;
        }

        let existing = state.cursoDocentes.find(cd => cd.cursoId === cursoId && cd.userId === session.user.id);
        if (!existing) {
            const curso = state.cursos.find(c => c.id === cursoId);
            if (curso && curso.userId === session.user.id) {
                const { data, error } = await supabase.from('curso_docentes').insert([{
                    curso_id: cursoId,
                    docente_id: session.user.id,
                    rol: 'tutor',
                    es_tutor: true,
                    asignatura: asignatura,
                    dias_semana: curso.diasSemana || []
                }]).select();
                if (error || !data?.[0]) {
                    console.error('Error creating missing tutor link:', error);
                    setGenericToast({ message: "No se pudo actualizar la asignatura.", type: 'error' });
                    setTimeout(() => setGenericToast(null), 3000);
                    return;
                }
                const newLink = {
                    id: data[0].id,
                    cursoId: data[0].curso_id,
                    userId: data[0].docente_id,
                    rol: data[0].rol,
                    esTutor: data[0].es_tutor,
                    asignatura: data[0].asignatura,
                    diasSemana: data[0].dias_semana || [],
                    createdAt: data[0].created_at
                };
                setState(s => ({
                    ...s,
                    cursoDocentes: [...s.cursoDocentes, newLink],
                    cursos: s.cursos.map(cu => cu.id === cursoId ? { ...cu, asignatura, diasSemana: newLink.diasSemana } : cu)
                }));
                return;
            } else {
                return;
            }
        } else {
            const { error } = await supabase
                .from('curso_docentes')
                .update({ asignatura })
                .eq('id', existing.id);

            if (error) {
                console.error('Error updating docente asignatura:', error);
                setGenericToast({ message: "No se pudo actualizar la asignatura.", type: 'error' });
                setTimeout(() => setGenericToast(null), 3000);
                return;
            }

            setState(s => ({
                ...s,
                cursoDocentes: s.cursoDocentes.map(cd => cd.id === existing.id ? { ...cd, asignatura } : cd),
                cursos: s.cursos.map(cu => cu.id === cursoId ? { ...cu, asignatura } : cu)
            }));
        }
    }, [session, state.cursoDocentes, state.cursos, setState, setGenericToast]);

    const handleUpdateDocenteDias = useCallback(async (cursoId: number, diasSemana: string[]) => {
        if (!session?.user?.id) return;

        let existing = state.cursoDocentes.find(cd => cd.cursoId === cursoId && cd.userId === session.user.id);
        if (!existing) {
            const curso = state.cursos.find(c => c.id === cursoId);
            if (curso && curso.userId === session.user.id) {
                const { data, error } = await supabase.from('curso_docentes').insert([{
                    curso_id: cursoId,
                    docente_id: session.user.id,
                    rol: 'tutor',
                    es_tutor: true,
                    asignatura: curso.asignatura || 'Sin Asignatura',
                    dias_semana: diasSemana
                }]).select();
                if (error || !data?.[0]) {
                    console.error('Error creating missing tutor link:', error);
                    setGenericToast({ message: "No se pudo actualizar los días de clase.", type: 'error' });
                    setTimeout(() => setGenericToast(null), 3000);
                    return;
                }
                const newLink = {
                    id: data[0].id,
                    cursoId: data[0].curso_id,
                    userId: data[0].docente_id,
                    rol: data[0].rol,
                    esTutor: data[0].es_tutor,
                    asignatura: data[0].asignatura,
                    diasSemana: data[0].dias_semana || [],
                    createdAt: data[0].created_at
                };
                setState(s => ({
                    ...s,
                    cursoDocentes: [...s.cursoDocentes, newLink],
                    cursos: s.cursos.map(cu => cu.id === cursoId ? { ...cu, diasSemana, asignatura: newLink.asignatura } : cu)
                }));
                return;
            } else {
                return;
            }
        } else {
            const { error } = await supabase
                .from('curso_docentes')
                .update({ dias_semana: diasSemana })
                .eq('id', existing.id);

            if (error) {
                console.error('Error updating docente dias:', error);
                setGenericToast({ message: "No se pudo actualizar los días de clase.", type: 'error' });
                setTimeout(() => setGenericToast(null), 3000);
                return;
            }

            setState(s => ({
                ...s,
                cursoDocentes: s.cursoDocentes.map(cd => cd.id === existing.id ? { ...cd, diasSemana } : cd),
                cursos: s.cursos.map(cu => cu.id === cursoId ? { ...cu, diasSemana } : cu)
            }));
        }
    }, [session, state.cursoDocentes, state.cursos, setState, setGenericToast]);

    return {
        addCurso: handleAddCurso,
        deleteCurso: handleDeleteCurso,
        saveCurso: handleSaveCurso,
        toggleDocenteCurso: handleToggleDocenteCurso,
        updateDocenteAsignatura: handleUpdateDocenteAsignatura,
        updateDocenteDias: handleUpdateDocenteDias
    };
}
