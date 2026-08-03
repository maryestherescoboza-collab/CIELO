import { useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAppStore } from '../store/appStore';
import type { 
    Actividad, CalificacionActividad, RecuperacionBC, Competencia,
    NivelPuntaje, CursoDetalleEvaluacion, EvaluacionRubrica, EvaluacionCotejo,
    Plantilla, BCKey, DescriptorRubrica, CriterioCotejo
} from '../types';

export function useEvaluationActions() {
    const state = useAppStore(s => s.state);
    const setState = useAppStore(s => s.setAppState);
    const session = useAppStore(s => s.session);
    const setGenericToast = useAppStore(s => s.setGenericToast);
    const selectedCursoId = useAppStore(s => s.selectedCursoId);

    const addActividad = useCallback(async (a: Omit<Actividad, 'id'>) => {
        if (!session?.user?.id) return null;
        const currentCurso = state.cursos.find(c => c.id === a.cursoId);
        const shared_course_id = a.sharedCourseId || currentCurso?.sharedCourseId || `group_${currentCurso?.grupoId}` || String(a.cursoId);

        const { data: actData, error: actError } = await supabase.from('actividades').insert([{
            nombre: a.nombre,
            fecha: a.fecha,
            periodo: a.periodo,
            curso_id: a.cursoId,
            bc_asignados: a.bcAsignados || ['BC1'],
            secuencia_id: a.secuenciaId,
            is_rec: a.isRec,
            user_id: session.user.id,
            asignatura: a.asignatura || '',
            shared_course_id: shared_course_id
        }]).select();

        if (actError) { 
            setGenericToast({ message: `Error al crear la actividad: ${actError.message}`, type: 'error' });
            setTimeout(() => setGenericToast(null), 3000);
            return null; 
        }

        if (actData && actData[0]) {
            const newAct: Actividad = {
                id: actData[0].id,
                nombre: actData[0].nombre,
                fecha: actData[0].fecha,
                periodo: actData[0].periodo,
                cursoId: actData[0].curso_id,
                bcAsignados: actData[0].bc_asignados || ['BC1'],
                secuenciaId: actData[0].secuencia_id,
                isRec: actData[0].is_rec,
                userId: actData[0].user_id,
                asignatura: actData[0].asignatura,
                sharedCourseId: actData[0].shared_course_id
            };
            setState(s => ({ ...s, actividades: [...s.actividades, newAct] }));
            return newAct;
        }
        return null;
    }, [session, state.cursos, setState, setGenericToast]);

    const saveCalificaciones = useCallback(async (
        califs: CalificacionActividad[],
        recs: RecuperacionBC[],
        cursoIdOverride?: number | null,
    ) => {
        console.log('[DEBUG] 4. saveCalificaciones() se ejecuta transformando los datos. Recs a guardar:', recs.length);
        const cursoId = cursoIdOverride ?? selectedCursoId;
        if (cursoId === null || !session?.user?.id) return;

        const dbCalifs = califs.map(c => {
            const act = state.actividades.find(a => a.id === c.actividadId);
            const student = state.estudiantes.find(e => e.id === c.estudianteId);
            return {
                user_id: session.user.id,
                curso_id: cursoId,
                estudiante_id: c.estudianteId,
                actividad_id: c.actividadId,
                asignatura: c.asignatura || act?.asignatura || '',
                periodo: c.periodo,
                competencias: c.competencias,
                descriptores: c.descriptores || [],
                puntaje: c.puntaje,
                recuperacion: c.recuperacion,
                shared_course_id: c.sharedCourseId || student?.sharedCourseId || String(cursoId)
            };
        });

        const dbRecs = recs.map(r => {
            const student = state.estudiantes.find(e => e.id === r.estudianteId);
            const cursoRec = state.cursos.find(c => c.id === r.cursoId);
            return {
                user_id: session.user.id,
                estudiante_id: r.estudianteId,
                curso_id: r.cursoId,
                bc: r.bc,
                puntaje: r.puntaje,
                periodo: r.periodo,
                shared_course_id: r.sharedCourseId || student?.sharedCourseId || String(r.cursoId),
                asignatura: r.asignatura || cursoRec?.asignatura || ''
            };
        });

        const promises = [];
        if (dbCalifs.length > 0) promises.push(supabase.from('calificaciones').upsert(dbCalifs, { onConflict: 'estudiante_id,actividad_id' }));
        if (dbRecs.length > 0) {
            // FIX: Include asignatura in onConflict to match new primary key
            promises.push(supabase.from('recuperaciones').upsert(dbRecs, { onConflict: 'estudiante_id,curso_id,bc,periodo,asignatura' }));
        }
        
        if (promises.length > 0) {
            console.log('[DEBUG] Esperando respuesta de Supabase...');
            await Promise.all(promises);
            console.log('[DEBUG] 6. Supabase responde exitosamente (upsert resuelto).');
            setState(s => {
                console.log('[DEBUG] 7. Actualizando estado global de Zustand con las recuperaciones...');
                const nextCalifs = [...s.calificaciones];
                califs.forEach(newC => {
                    const idx = nextCalifs.findIndex(oc => oc.estudianteId === newC.estudianteId && oc.actividadId === newC.actividadId);
                    if (idx !== -1) nextCalifs[idx] = newC; else nextCalifs.push(newC);
                });
                const nextRecs = [...s.recuperaciones];
                recs.forEach(nr => {
                    const idx = nextRecs.findIndex(or => or.estudianteId === nr.estudianteId && or.cursoId === nr.cursoId && or.bc === nr.bc && or.periodo === nr.periodo && or.asignatura === nr.asignatura);
                    if (idx !== -1) nextRecs[idx] = nr; else nextRecs.push(nr);
                });
                return { ...s, calificaciones: nextCalifs, recuperaciones: nextRecs };
            });
        }
    }, [session, selectedCursoId, state, setState]);

    const updateNivelesPuntaje = useCallback(async (nps: NivelPuntaje[]) => {
        if (!session?.user?.id) return;
        setState(s => ({ ...s, nivelesPuntaje: nps }));
        await Promise.all(nps.map(np => supabase.from('niveles_puntaje').upsert({
          nivel: np.nivel,
          nombre: np.nombre,
          puntaje: np.puntaje,
          color: np.color,
          descripcion: np.description,
          user_id: session.user.id
        })));
    }, [session, setState]);

    const updateCursoDetalle = useCallback(async (
        evalData: Partial<Omit<CursoDetalleEvaluacion, 'observaciones'>> & { 
            estudianteId: number; 
            actividadId: number; 
            cursoId: number;
            observaciones?: string | string[];
        },
        competenciasScores?: { competencias: BCKey[]; puntaje: number }[]
    ) => {
        if (!evalData.estudianteId || !evalData.actividadId || !session?.user?.id) return;

        const cursoId = evalData.cursoId ?? selectedCursoId;
        if (!cursoId) return;

        const existing = state.cursoDetalle.find(cd =>
            cd.estudianteId === evalData.estudianteId &&
            cd.actividadId === evalData.actividadId
        );

        const actividad = state.actividades.find(a => a.id === evalData.actividadId);
        
        let finalObs: string[] = existing?.observaciones || [];
        if (evalData.observaciones !== undefined) {
            const rawObs = evalData.observaciones;
            if (Array.isArray(rawObs)) {
                finalObs = rawObs;
            } else if (typeof rawObs === 'string') {
                finalObs = rawObs.split('\n').map(s => s.trim()).filter(Boolean);
            }
        }

        const student = state.estudiantes.find(e => e.id === evalData.estudianteId);
        const dbData = {
            user_id: session.user.id,
            curso_id: cursoId,
            actividad_id: evalData.actividadId,
            estudiante_id: evalData.estudianteId,
            rubrica_data: evalData.rubricaData || existing?.rubricaData || {},
            cotejo_data: evalData.cotejoData || existing?.cotejoData || {},
            puntaje_total: evalData.puntajeTotal !== undefined ? evalData.puntajeTotal : existing?.puntajeTotal,
            observaciones: finalObs,
            plantilla_id: evalData.plantillaId !== undefined ? evalData.plantillaId : existing?.plantillaId,
            shared_course_id: evalData.sharedCourseId || actividad?.sharedCourseId || student?.sharedCourseId || String(cursoId)
        };

        const { error: cdError } = await supabase.from('curso_detalle').upsert([dbData], {
            onConflict: 'estudiante_id,actividad_id'
        });

        if (cdError) {
            console.error('Error updating curso_detalle:', cdError);
            return;
        }

        setState(s => {
            const idx = s.cursoDetalle.findIndex(cd =>
                cd.estudianteId === evalData.estudianteId &&
                cd.actividadId === evalData.actividadId
            );
            const next = [...s.cursoDetalle];
            const merged = {
                ...dbData,
                id: s.cursoDetalle[idx]?.id || 0,
                cursoId, actividadId: evalData.actividadId!, estudianteId: evalData.estudianteId!,
                rubricaData: dbData.rubrica_data, cotejoData: dbData.cotejo_data,
                puntajeTotal: dbData.puntaje_total,
                plantillaId: dbData.plantilla_id,
                descriptores: evalData.descriptores || s.cursoDetalle[idx]?.descriptores || [],
                observaciones: dbData.observaciones
            } as CursoDetalleEvaluacion;
            if (idx !== -1) next[idx] = merged;
            else next.push(merged);
            return { ...s, cursoDetalle: next };
        });

        if (actividad) {
            const califsToSave: any[] = [];
            
            if (competenciasScores && competenciasScores.length > 0) {
                // Remove the strict filter so grades are saved even if competence isn't assigned to the activity
                const relevantScores = competenciasScores;
                
                if (relevantScores.length > 0) {
                    const evaluatedBCs = Array.from(new Set(relevantScores.flatMap(cs => cs.competencias)));
                    
                    // Force the grade to strictly match the rubric's overall score so it stays consistent
                    const avgPuntaje = evalData.puntajeTotal !== undefined 
                        ? evalData.puntajeTotal 
                        : Math.round(relevantScores.reduce((acc, curr) => acc + curr.puntaje, 0) / relevantScores.length);
                        
                    califsToSave.push({
                        estudianteId: evalData.estudianteId!,
                        actividadId: evalData.actividadId!,
                        cursoId: cursoId,
                        periodo: actividad.periodo || 'P1',
                        competencias: evaluatedBCs,
                        puntaje: avgPuntaje,
                        descriptores: evalData.descriptores || existing?.descriptores || [],
                        asignatura: actividad.asignatura || 'Sin Asignatura',
                        userId: session.user.id,
                        sharedCourseId: actividad.sharedCourseId,
                        recuperacion: null
                    });
                }
            } else if (evalData.puntajeTotal !== undefined && evalData.puntajeTotal !== null) {
                califsToSave.push({
                    estudianteId: evalData.estudianteId!,
                    actividadId: evalData.actividadId!,
                    cursoId: cursoId,
                    periodo: actividad.periodo || 'P1',
                    competencias: actividad.bcAsignados && actividad.bcAsignados.length > 0 ? actividad.bcAsignados : ['BC1'],
                    descriptores: evalData.descriptores || existing?.descriptores || [],
                    puntaje: evalData.puntajeTotal,
                    userId: session.user.id,
                    asignatura: actividad.asignatura || 'Sin Asignatura',
                    sharedCourseId: actividad.sharedCourseId,
                    recuperacion: null
                });
            }
            
            if (califsToSave.length > 0) {
                await saveCalificaciones(califsToSave, []);
            }
        }
    }, [session, state.cursoDetalle, state.estudiantes, selectedCursoId, state.actividades, saveCalificaciones, setState]);

    const saveRubrica = useCallback(async (er: Omit<EvaluacionRubrica, 'id'>) => {
        if (!session?.user?.id) return;
        const selectedDescriptorTexts: string[] = [];
        const scoresByBC: Record<string, number[]> = {};
        let totalPuntaje = 0;
        let totalCeldas = 0;

        const activeDescriptors = useAppStore.getState().activeRubricDescriptors as DescriptorRubrica[];

        Object.entries(er.selecciones).forEach(([descriptorId, nivel]) => {
            // Ensure nivel is treated as a number
            const numNivel = Number(nivel);
            if (!numNivel) return;
            const nivInfo = state.nivelesPuntaje.find(np => np.nivel === numNivel);
            const puntajeCelda = nivInfo?.puntaje ?? er.puntajeTotal ?? 0;
            totalPuntaje += puntajeCelda;
            totalCeldas++;

            const activeDesc = state.descriptoresRubrica.find(d => String(d.id) === String(descriptorId))
                || activeDescriptors.find(d => String(d.id) === String(descriptorId));
            
            // Extract comp properly
            let comp: Competencia = 'BC1';
            if (activeDesc?.bc) {
                comp = activeDesc.bc;
            } else if (String(descriptorId).includes('BC')) {
                comp = String(descriptorId).split('-').pop() as Competencia;
            }

            const bcIndexMap: Record<string, number> = { 'BC1': 0, 'BC2': 1, 'BC3': 2, 'BC4': 3 };
            const dIdx = bcIndexMap[comp] ?? 0;
            
            if (!scoresByBC[comp]) scoresByBC[comp] = [];
            scoresByBC[comp].push(puntajeCelda);

            const plantilla = state.plantillas.find(p => p.id === er.plantillaId);
            if (plantilla) {
                const descriptor = (plantilla.datos as any).criterios?.[dIdx]?.descriptores?.[numNivel];
                if (descriptor) selectedDescriptorTexts.push(descriptor);
            }
        });

        // Round finalPuntaje using standard Math.round
        const finalPuntaje = totalCeldas > 0 ? Math.round(totalPuntaje / totalCeldas) : 0;
        
        // compScores correctly computes the arithmetic average of all indicators in a competence
        const compScores = Object.entries(scoresByBC).map(([comp, scores]) => ({
            competencias: [comp as BCKey],
            puntaje: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
        }));

        await updateCursoDetalle({
            estudianteId: er.estudianteId,
            actividadId: er.actividadId,
            cursoId: er.cursoId,
            rubricaData: er.selecciones,
            puntajeTotal: finalPuntaje,
            observaciones: er.observaciones,
            plantillaId: er.plantillaId,
            descriptores: selectedDescriptorTexts
        }, compScores);
    }, [session, state.cursoDetalle, state.descriptoresRubrica, state.nivelesPuntaje, state.plantillas, updateCursoDetalle]);

    const saveCotejo = useCallback(async (ec: Omit<EvaluacionCotejo, 'id'>) => {
        if (!session?.user?.id) return;

        const dbCotejoData: Record<number, number> = {};
        let total = 0;
        let count = 0;

        Object.entries(ec.respuestas).forEach(([critId, val]) => {
            if (val === null || val === undefined) return;
            const pts = Number(val);
            dbCotejoData[Number(critId)] = pts;
            total += pts;
            count++;
        });

        const puntajeTotal = count > 0 ? Math.round(total / count) : 0;

        await updateCursoDetalle({
            estudianteId: ec.estudianteId,
            actividadId: ec.actividadId,
            cursoId: ec.cursoId,
            cotejoData: dbCotejoData,
            puntajeTotal: puntajeTotal,
            observaciones: ec.comentarios,
            plantillaId: ec.plantillaId
        });
    }, [session, updateCursoDetalle]);

    const updateDescriptor = useCallback(async (descriptors: DescriptorRubrica[], plantillaId: number | null = null) => {
        if (!session?.user?.id) return;
        setState(s => ({ ...s, descriptoresRubrica: descriptors }));
        await Promise.all(descriptors.map(d => supabase.from('descriptores_rubrica').upsert({
            id: d.id, bc: d.bc, indicador: d.indicador, estrategico: d.estrategico,
            autonomo: d.autonomo, resolutivo: d.resolutivo, receptivo: d.receptivo, user_id: session.user.id,
            plantilla_id: d.plantillaId || plantillaId
        })));
    }, [session, setState]);

    const updateCriterios = useCallback(async (criterios: CriterioCotejo[]) => {
        if (!session?.user?.id) return;
        setState(s => ({ ...s, criteriosCotejo: criterios }));
        await Promise.all(criterios.map(c => supabase.from('criterios_cotejo').upsert({
            id: c.id, titulo: c.titulo, descripcion: c.descripcion, user_id: session.user.id
        })));
    }, [session, setState]);

    const savePlantilla = useCallback(async (tipo: 'rubrica' | 'cotejo', nombre: string, datos: Record<string, unknown>): Promise<boolean> => {
        if (!session?.user?.id) return false;
        const existing = state.plantillas.filter(p => p.tipo === tipo);
        if (existing.length >= 5) {
            alert(`No puedes guardar más de 5 plantillas de ${tipo}. Elimina una antes de continuar.`);
            return false;
        }
        const { data, error } = await supabase.from('plantillas').insert([{ user_id: session.user.id, tipo, nombre, datos }]).select();
        if (error) { 
            console.error('Error saving plantilla:', error); 
            return false; 
        }
        if (data && data[0]) {
            const plantillaId = data[0].id;
            let updatedDatos = { ...datos };
            let newPlantilla: Plantilla = { id: plantillaId, tipo: data[0].tipo, nombre: data[0].nombre, datos: updatedDatos, createdAt: data[0].created_at };
            
            if (tipo === 'rubrica' && datos.descriptores) {
                const descs = datos.descriptores as DescriptorRubrica[];
                const { data: insertedDescs, error: descError } = await supabase.from('descriptores_rubrica').insert(
                    descs.map(d => ({
                        bc: d.bc,
                        indicador: d.indicador,
                        estrategico: d.estrategico,
                        autonomo: d.autonomo,
                        resolutivo: d.resolutivo,
                        receptivo: d.receptivo,
                        user_id: session.user.id,
                        plantilla_id: plantillaId
                    }))
                ).select();
                
                if (!descError && insertedDescs) {
                    const mappedDescs = insertedDescs.map(d => ({
                        id: String(d.id),
                        bc: d.bc as BCKey,
                        indicador: d.indicador,
                        estrategico: d.estrategico,
                        autonomo: d.autonomo,
                        resolutivo: d.resolutivo,
                        receptivo: d.receptivo,
                        plantillaId: d.plantilla_id ? Number(d.plantilla_id) : null
                    }));
                    
                    await supabase.from('plantillas').update({
                        datos: {
                            ...datos,
                            descriptores: mappedDescs
                        }
                    }).eq('id', plantillaId);
                    
                    updatedDatos.descriptores = mappedDescs;
                    newPlantilla.datos = updatedDatos;
                    
                    setState(s => ({ 
                        ...s, 
                        descriptoresRubrica: [...s.descriptoresRubrica.filter(x => !mappedDescs.some(md => md.bc === x.bc && md.plantillaId === x.plantillaId)), ...mappedDescs] 
                    }));
                }
            }
            
            setState(s => ({ ...s, plantillas: [newPlantilla, ...s.plantillas] }));
        }
        return true;
    }, [session, state.plantillas, setState]);

    const deletePlantilla = useCallback(async (id: number) => {
        // Logical archive instead of physical delete
        await supabase.from('plantillas').update({ archivado: true }).eq('id', id);
        setState(s => ({ ...s, plantillas: s.plantillas.filter(p => p.id !== id) }));
    }, [setState]);

    const updateActividad = useCallback(async (
        actOrId: Actividad | number,
        maybePartial?: Partial<Actividad>
    ) => {
        if (!session?.user?.id) return;

        let id: number;
        let updateData: Partial<Actividad>;

        if (typeof actOrId === 'object' && actOrId !== null) {
            id = actOrId.id;
            updateData = actOrId;
        } else {
            id = actOrId;
            updateData = maybePartial || {};
        }

        const existing = state.actividades.find(a => a.id === id);
        const merged = { ...existing, ...updateData, id } as Actividad;

        const { error } = await supabase.from('actividades').upsert({
            id: merged.id,
            nombre: merged.nombre,
            fecha: merged.fecha,
            periodo: merged.periodo,
            curso_id: merged.cursoId,
            bc_asignados: merged.bcAsignados,
            secuencia_id: merged.secuenciaId,
            is_rec: merged.isRec,
            user_id: session.user.id,
            asignatura: merged.asignatura,
            shared_course_id: merged.sharedCourseId
        });

        if (!error) {
            setState(s => ({ ...s, actividades: s.actividades.map(a => a.id === merged.id ? merged : a) }));
        }
    }, [session, state.actividades, setState]);

    const deleteActividad = useCallback(async (id: number) => {
        // Logical deactivation instead of physical delete
        const { error } = await supabase.from('actividades').update({ activo: false }).eq('id', id);
        if (!error) {
            setState(s => ({ ...s, actividades: s.actividades.filter(a => a.id !== id) }));
        }
    }, [setState]);

    const resetSchoolYear = useCallback(async () => {
        if (!session?.user?.id) return;
        try {
            setGenericToast({ message: 'Reiniciando año escolar...', type: 'info' });
            const { error } = await supabase.rpc('reset_user_school_year', { target_user_id: session.user.id });
            if (error) throw error;
            setGenericToast({ message: 'Reinicio completado con éxito', type: 'success' });
            setTimeout(() => window.location.reload(), 1500);
        } catch (error) {
            console.error('Error al reiniciar año escolar:', error);
            setGenericToast({ message: 'Error al reiniciar datos', type: 'error' });
            setTimeout(() => setGenericToast(null), 3000);
        }
    }, [session, setGenericToast]);

    return {
        addActividad,
        updateActividad,
        deleteActividad,
        saveCalificaciones,
        updateNivelesPuntaje,
        updateCursoDetalle,
        saveRubrica,
        saveCotejo,
        updateDescriptor,
        updateCriterios,
        savePlantilla,
        deletePlantilla,
        resetSchoolYear
    };
}
