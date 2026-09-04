import { useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAppStore } from '../store/appStore';
import type { 
    Actividad, CalificacionActividad, RecuperacionBC, RecuperacionCotejo, ContextoRecuperacion, Competencia,
    NivelPuntaje, CursoDetalleEvaluacion, EvaluacionRubrica, EvaluacionCotejo,
    Plantilla, BCKey, DescriptorRubrica, CriterioCotejo
} from '../types';
import { calcularResultadoRecuperacion, puntajeActualBC, actividadesParaRecuperacion, totalEvidenciasPorBC } from '../utils/recuperacion';
import { clearPlantillaCache } from '../cache/plantillaCache';

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
            is_producto_final: a.isProductoFinal,
            user_id: session.user.id,
            asignatura: a.asignatura || '',
            shared_course_id: shared_course_id,
            indicador: a.indicador,
            producto: a.producto
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
                isProductoFinal: actData[0].is_producto_final,
                userId: actData[0].user_id,
                asignatura: actData[0].asignatura,
                sharedCourseId: actData[0].shared_course_id,
                indicador: actData[0].indicador,
                producto: actData[0].producto
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
        if (cursoId === null || !session?.user?.id) {
            console.error('[CALIFICACIONES] Operación abortada ANTES de contactar Supabase:', {
                motivo: cursoId === null ? 'cursoId es null' : 'sin sesión activa',
                cursoIdOverride,
                selectedCursoIdStore: selectedCursoId,
                haySesion: !!session?.user?.id,
                filasRecibidas: califs.length
            });
            return;
        }

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
        if (dbCalifs.length > 0) {
            dbCalifs.forEach(c => {
                console.log(`[CALIFICACIONES] fila → op=UPSERT tabla=calificaciones onConflict=(estudiante_id,actividad_id) estudiante_id=${c.estudiante_id} curso_id=${c.curso_id} actividad_id=${c.actividad_id} periodo=${c.periodo} puntaje=${c.puntaje}`);
            });
            promises.push(supabase.from('calificaciones').upsert(dbCalifs, { onConflict: 'estudiante_id,actividad_id' }));
        }
        if (dbRecs.length > 0) {
            // FIX: Include asignatura in onConflict to match new primary key
            promises.push(supabase.from('recuperaciones').upsert(dbRecs, { onConflict: 'estudiante_id,curso_id,bc,periodo,asignatura' }));
        }
        
        if (promises.length > 0) {
            console.log('[DEBUG] Esperando respuesta de Supabase...');
            const upsertResults = await Promise.all(promises);
            const califsResult = upsertResults[0];
            if (dbCalifs.length > 0 && !califsResult?.error) {
                console.log(`[CALIFICACIONES] OK: Supabase aceptó el UPSERT en calificaciones (filas=${dbCalifs.length}).`);
            }
            const upsertErrors = upsertResults.filter(r => r?.error);
            if (upsertErrors.length > 0) {
                upsertErrors.forEach(r => console.error('[CALIFICACIONES] Error Supabase:', {
                    message: r.error?.message,
                    details: r.error?.details,
                    hint: r.error?.hint,
                    code: r.error?.code
                }));
            }
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

    // ============================================================
    // LISTA DE COTEJO DE RECUPERACIÓN — ruta PROPIA y aislada.
    // Escribe únicamente resultados de recuperación (recuperaciones
    // como resultado % y recuperaciones_cotejo como evidencias).
    // NO toca calificaciones normales, actividades, rúbricas, cotejos
    // ni promedios (academic.ts / boletines.ts permanecen intactos).
    // ============================================================
    const saveRecuperacionCotejo = useCallback(async (detalle: RecuperacionCotejo[], cursoIdOverride?: number | null, contextos?: ContextoRecuperacion[]) => {
        const cursoId = cursoIdOverride ?? selectedCursoId;
        if (cursoId === null || !session?.user?.id) return;

        // Cada registro presente = celda marcada ✓ = LOGRO.
        // La ausencia de registro = celda vacía = NO LOGRADO (no se persiste).

        // Reconciliación: eliminar filas que ya no existen (celdas → vacío = NO LOGRADO).
        const existentes = state.recuperacionesCotejo.filter(r => r.cursoId === cursoId);
        const clave = (r: RecuperacionCotejo) => `${r.estudianteId}|${r.bc}|${r.indicador}|${r.actividadId}|${r.periodo}`;
        const clavesNuevas = new Set(detalle.map(clave));
        const porEliminar = existentes.filter(r => !clavesNuevas.has(clave(r)));
        if (porEliminar.length > 0) {
            const { error: delError } = await supabase.from('recuperaciones_cotejo').delete().in('id', porEliminar.map(r => r.id));
            if (delError) console.error('[RECUPERACION COTEJO] Error eliminando celdas desmarcadas:', delError);
        }

        // Agrupar por (estudiante, bc) para escribir la cabecera resultado.
        const grupos = new Map<string, RecuperacionCotejo[]>();
        detalle.forEach(r => {
            const k = `${r.estudianteId}|${r.bc}`;
            const lista = grupos.get(k) || [];
            lista.push(r);
            grupos.set(k, lista);
        });

        // Aseguramos una cabecera por cada BC que esté abierto en la Lista de
        // Cotejo, aunque haya quedado con 0 ✓ (celdas vacías = NO LOGRADO).
        // Así el resultado_final de recuperaciones.puntaje SIEMPRE se actualiza
        // (y corrige) al pulsar "Guardar recuperación", nunca queda residual.
        const cursoRec = state.cursos.find(c => c.id === cursoId);
        (contextos || []).forEach(ctx => {
            const k = `${ctx.estudianteId}|${ctx.bc}`;
            if (!grupos.has(k)) grupos.set(k, []);
        });

        const cabeceras: RecuperacionBC[] = [];
        const filasAGuardar: {
            recuperacion_id: number;
            estudiante_id: number;
            curso_id: number;
            bc: number;
            periodo: string;
            asignatura: string;
            indicador: string;
            actividad_id: number;
            shared_course_id: string;
            user_id: string;
        }[] = [];
        const idsCabecera = new Map<string, number>();

        for (const [k, filasBC] of grupos) {
            const first = filasBC[0] || {
                id: 0,
                recuperacionId: 0,
                estudianteId: Number(k.split('|')[0]),
                cursoId,
                bc: Number(k.split('|')[1]) as 1 | 2 | 3 | 4,
                periodo: (contextos || []).find(c => `${c.estudianteId}|${c.bc}` === k)?.periodo ?? detalle.find(d => `${d.estudianteId}|${d.bc}` === k)?.periodo ?? '',
                asignatura: cursoRec?.asignatura || '',
                indicador: '',
                actividadId: 0,
                sharedCourseId: cursoRec?.sharedCourseId || '',
                userId: session.user.id
            } as RecuperacionCotejo;
            // Denominador = TODAS las evidencias: indicadores × actividades
            // aplicables del estudiante (puntaje < 70 y competencia == BC).
            const aplicables = actividadesParaRecuperacion(
                state.actividades,
                state.calificaciones,
                first.estudianteId,
                first.bc as 1 | 2 | 3 | 4,
                first.periodo,
                cursoId,
            );
            const total = totalEvidenciasPorBC(first.bc as 1 | 2 | 3 | 4, aplicables.length);
            // Resultado por sumatoria de puntos (no reemplaza la calificación):
            //   resultado = puntaje_actual + (✓ ÷ total) × (100 − puntaje_actual)
            // redondeado a entero. El puntaje original NO se modifica.
            const puntajeActual = puntajeActualBC(
                state.actividades,
                state.calificaciones,
                first.estudianteId,
                first.bc as 1 | 2 | 3 | 4,
                first.periodo,
                cursoId,
            );
            const puntaje = calcularResultadoRecuperacion(puntajeActual, filasBC.length, total);
            // Sin evidencias aplicables (total ≤ 0) no se calcula ni se toca la cabecera.
            if (total <= 0) continue;
            const cabecera = {
                user_id: session.user.id,
                estudiante_id: first.estudianteId,
                curso_id: first.cursoId,
                bc: first.bc,
                puntaje,
                periodo: first.periodo,
                shared_course_id: first.sharedCourseId || String(first.cursoId),
                asignatura: first.asignatura || ''
            };
            const { data: headData, error: headError } = await supabase
                .from('recuperaciones')
                .upsert(cabecera, { onConflict: 'estudiante_id,curso_id,bc,periodo,asignatura' })
                .select('*');
            if (headError) {
                console.error('[RECUPERACION COTEJO] Error escribiendo resultado de cabecera:', headError);
                continue;
            }
            const recuperacionId = headData?.[0]?.id ?? 0;
            idsCabecera.set(k, recuperacionId);
            cabeceras.push({
                id: recuperacionId,
                estudianteId: first.estudianteId,
                cursoId: first.cursoId,
                bc: first.bc,
                puntaje,
                periodo: first.periodo,
                sharedCourseId: first.sharedCourseId,
                asignatura: first.asignatura || '',
                userId: session.user.id
            });

            filasBC.forEach(r => {
                filasAGuardar.push({
                    recuperacion_id: recuperacionId,
                    estudiante_id: r.estudianteId,
                    curso_id: r.cursoId,
                    bc: r.bc,
                    periodo: r.periodo,
                    asignatura: r.asignatura || '',
                    indicador: r.indicador,
                    actividad_id: r.actividadId,
                    shared_course_id: r.sharedCourseId || String(r.cursoId),
                    user_id: session.user.id
                });
            });
        }

        if (filasAGuardar.length > 0) {
            const { error } = await supabase.from('recuperaciones_cotejo')
                .upsert(filasAGuardar, { onConflict: 'recuperacion_id,bc,indicador,actividad_id' });
            if (error) console.error('[RECUPERACION COTEJO] Error persistiendo evidencias:', error);
        }

        // Estado local (solo recuperación; calificaciones intactas).
        setState(s => {
            const nextRecs = [...s.recuperaciones];
            cabeceras.forEach(nr => {
                const idx = nextRecs.findIndex(or => or.estudianteId === nr.estudianteId && or.cursoId === nr.cursoId && or.bc === nr.bc && or.periodo === nr.periodo && or.asignatura === nr.asignatura);
                if (idx !== -1) nextRecs[idx] = nr; else nextRecs.push(nr);
            });

            const cotejoActualizado = detalle.map(r => ({
                ...r,
                recuperacionId: idsCabecera.get(`${r.estudianteId}|${r.bc}`) ?? r.recuperacionId,
            } as RecuperacionCotejo));

            return {
                ...s,
                recuperaciones: nextRecs,
                recuperacionesCotejo: [
                    ...s.recuperacionesCotejo.filter(r => r.cursoId !== cursoId),
                    ...cotejoActualizado
                ]
            };
        });
    }, [session, selectedCursoId, state, setState]);

    const updateNivelesPuntaje = useCallback(async (nps: NivelPuntaje[]) => {
        if (!session?.user?.id) return;
        const defaults: Record<number, { puntaje: number; nombre: string; color: string; description: string }> = {
            4: { puntaje: 100, nombre: 'Estratégico', color: '#F5BC5D', description: 'Lidera procesos, propone soluciones innovadoras y actúa de manera autónoma y creativa.' },
            3: { puntaje: 85, nombre: 'Autónomo', color: '#537BAC', description: 'Realiza las tareas por sí solo, cumpliendo los objetivos con eficiencia.' },
            2: { puntaje: 70, nombre: 'Resolutivo', color: '#689C63', description: 'Identifica el problema y aplica procedimientos básicos para resolverlo.' },
            1: { puntaje: 55, nombre: 'Receptivo', color: '#EB8847', description: 'Requiere apoyo continuo para comprender tareas y alcanzar los objetivos.' }
        };

        const sanitizedNps = nps.map(np => {
            const lvl = Number(np.nivel);
            const defaultVal = defaults[lvl] || defaults[1];
            const currentPuntaje = np.puntaje !== null && np.puntaje !== undefined ? Number(np.puntaje) : 0;
            return {
                ...np,
                nivel: lvl as 1 | 2 | 3 | 4,
                nombre: np.nombre || defaultVal.nombre,
                puntaje: (!currentPuntaje || currentPuntaje === 0) ? defaultVal.puntaje : currentPuntaje,
                color: np.color || defaultVal.color,
                description: np.description || defaultVal.description
            };
        });

        setState(s => ({ ...s, nivelesPuntaje: sanitizedNps }));
        await Promise.all(sanitizedNps.map(np => supabase.from('niveles_puntaje').upsert({
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
                const tipoEvaluacion = evalData.rubricaData ? 'RUBRICA' : evalData.cotejoData ? 'COTEJO' : 'manual';
                console.log(`[CALIFICACIONES] Origen=${tipoEvaluacion} → updateCursoDetalle → saveCalificaciones (curso_id=${cursoId}, actividad_id=${evalData.actividadId}, puntajeTotal=${evalData.puntajeTotal})`);
                await saveCalificaciones(califsToSave, [], cursoId);
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

            const activeDesc = activeDescriptors.find(d => String(d.id) === String(descriptorId));
            
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
        if (!session?.user?.id || descriptors.length === 0) return null;

        // Tabla propia descriptores_rubrica: upsert solo cuando existe un id
        // real (bigint); los ids locales de respaldo ('competencia-BCx') se
        // insertan dejando que la identidad genere el PK.
        const results = await Promise.all(descriptors.map(d => {
            const payload = {
                bc: d.bc, indicador: d.indicador, estrategico: d.estrategico,
                autonomo: d.autonomo, resolutivo: d.resolutivo, receptivo: d.receptivo,
                user_id: session.user.id,
                plantilla_id: d.plantillaId || plantillaId
            };
            return /^\d+$/.test(d.id)
                ? supabase.from('descriptores_rubrica').upsert({ ...payload, id: Number(d.id) }).select()
                : supabase.from('descriptores_rubrica').insert(payload).select();
        }));
        const dbError = results.map(r => r.error).find(Boolean);
        if (dbError) {
            console.error('[PLANTILLAS][RUBRICA] Error persistiendo en descriptores_rubrica:', { message: dbError.message, details: dbError.details, hint: dbError.hint, code: dbError.code });
            return null;
        }

        const returnedDescs: DescriptorRubrica[] = results.map((r, idx) => {
            const dbRow = r.data?.[0];
            if (dbRow) {
                return {
                    id: String(dbRow.id),
                    bc: dbRow.bc as BCKey,
                    indicador: dbRow.indicador as string,
                    estrategico: dbRow.estrategico as string,
                    autonomo: dbRow.autonomo as string,
                    resolutivo: dbRow.resolutivo as string,
                    receptivo: dbRow.receptivo as string,
                    plantillaId: dbRow.plantilla_id as number
                };
            }
            return descriptors[idx];
        });

        // Fusión localizada del pool en memoria: conserva los descriptores del
        // resto de plantillas en lugar de reemplazar el estado completo.
        setState(s => ({
            ...s,
            descriptoresRubrica: [
                ...s.descriptoresRubrica.filter(x => !returnedDescs.some(nd =>
                    nd.bc === x.bc && (nd.plantillaId ?? null) === (x.plantillaId ?? null)
                )),
                ...returnedDescs,
            ],
        }));

        // Espejo obligatorio hacia plantillas.datos: la reapertura de una
        // plantilla lee este jsonb; sin esta sincronización el docente vería
        // el texto anterior tras editar y usar "Guardar".
        if (plantillaId) {
            const actual = state.plantillas.find(p => p.id === plantillaId);
            if (!actual?.datos) return returnedDescs;
            const nuevosDatos = { ...actual.datos, descriptores: returnedDescs };
            const { data, error } = await supabase.from('plantillas')
                .update({ datos: nuevosDatos })
                .eq('id', plantillaId)
                .eq('user_id', session.user.id)
                .select('id');
            if (error) {
                console.error('[PLANTILLAS][RUBRICA] Error espejando a plantillas.datos:', { message: error.message, details: error.details, hint: error.hint, code: error.code });
                return returnedDescs;
            }
            if (!data || data.length === 0) {
                console.error('[PLANTILLAS][RUBRICA] UPDATE sin efecto (0 filas):', { plantillaId });
                return returnedDescs;
            }
            // Estado/cache localizado con la versión confirmada por Supabase.
            setState(s => ({ ...s, plantillas: s.plantillas.map(p => p.id === plantillaId ? { ...p, datos: nuevosDatos } : p) }));
        }

        return returnedDescs;
    }, [session, state.plantillas, setState]);

    const updateCriterios = useCallback(async (criterios: CriterioCotejo[], plantillaId?: number | null) => {
        if (!session?.user?.id) return null;

        const results = await Promise.all(criterios.map(c => {
            const payload = {
                titulo: c.titulo, descripcion: c.descripcion, user_id: session.user.id
            };
            const isNew = typeof c.id !== 'number' || c.id < 0;
            return isNew
                ? supabase.from('criterios_cotejo').insert([payload]).select()
                : supabase.from('criterios_cotejo').upsert([{ ...payload, id: c.id }]).select();
        }));
        const dbError = results.map(r => r.error).find(Boolean);
        if (dbError) {
            console.error('[PLANTILLAS][COTEJO] Error persistiendo en criterios_cotejo:', { message: dbError.message, details: dbError.details, hint: dbError.hint, code: dbError.code });
            return null;
        }

        const returnedCriterios: CriterioCotejo[] = results.map((r, idx) => {
            const dbRow = r.data?.[0];
            if (dbRow) {
                return {
                    id: dbRow.id,
                    titulo: dbRow.titulo,
                    descripcion: dbRow.descripcion
                };
            }
            return criterios[idx];
        });

        setState(s => ({
            ...s,
            criteriosCotejo: [
                ...s.criteriosCotejo.filter(x => !returnedCriterios.some(rc => rc.id === x.id)),
                ...returnedCriterios
            ]
        }));

        // Espejo hacia plantillas.datos.criterios: la reapertura de una
        // plantilla de cotejo lee este jsonb, no la tabla criterios_cotejo.
        if (plantillaId) {
            const actual = state.plantillas.find(p => p.id === plantillaId);
            if (!actual?.datos) return returnedCriterios;
            const nuevosDatos = { ...actual.datos, criterios: returnedCriterios };
            const { data, error } = await supabase.from('plantillas')
                .update({ datos: nuevosDatos })
                .eq('id', plantillaId)
                .eq('user_id', session.user.id)
                .select('id');
            if (error) {
                console.error('[PLANTILLAS][COTEJO] Error espejando a plantillas.datos:', { message: error.message, details: error.details, hint: error.hint, code: error.code });
                return returnedCriterios;
            }
            if (!data || data.length === 0) {
                console.error('[PLANTILLAS][COTEJO] UPDATE sin efecto (0 filas):', { plantillaId });
                return returnedCriterios;
            }
            setState(s => ({ ...s, plantillas: s.plantillas.map(p => p.id === plantillaId ? { ...p, datos: nuevosDatos } : p) }));
        }

        return returnedCriterios;
    }, [session, state.plantillas, setState]);

    const savePlantilla = useCallback(async (tipo: 'rubrica' | 'cotejo', nombre: string, datos: Record<string, unknown>): Promise<boolean> => {
        if (!session?.user?.id) return false;

        // El límite de 10 por docente y tipo se garantiza en la base de datos
        // mediante la función crear_plantilla (advisory lock anti-carrera).
        const { data, error } = await supabase.rpc('crear_plantilla', {
            p_tipo: tipo,
            p_nombre: nombre,
            p_datos: datos
        });

        if (error) {
            if (typeof error.message === 'string' && error.message.includes('LIMITE_PLANTILLAS')) {
                alert(`Límite alcanzado: máximo 10 plantillas de ${tipo}. Elimina una antes de crear otra.`);
            } else {
                console.error('[PLANTILLAS] Error creando plantilla:', { message: error.message, details: error.details, hint: error.hint, code: error.code });
                alert('No se pudo guardar la plantilla. Intente de nuevo.');
            }
            return false;
        }
        if (data && data[0]) {
            const plantillaId = data[0].id;
            let updatedDatos = { ...datos };
            let newPlantilla: Plantilla = { id: plantillaId, userId: session.user.id, tipo: data[0].tipo, nombre: data[0].nombre, datos: updatedDatos, createdAt: data[0].created_at };
            
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
            // Invalidar el caché de plantillas: se creó una plantilla nueva.
            clearPlantillaCache(session.user.id);
        }
        return true;
    }, [session, setState]);

    const updatePlantilla = useCallback(async (id: number, patch: Partial<Pick<Plantilla, 'nombre' | 'datos'>>): Promise<boolean> => {
        if (!session?.user?.id || !id) return false;

        // Trazabilidad del payload real enviado a Supabase.
        const datosKeys = patch.datos ? Object.keys(patch.datos) : [];
        console.log('[PLANTILLAS] Enviando UPDATE:', {
            plantillaId: id,
            keys: Object.keys(patch),
            datosKeys,
            resumenDatos: datosKeys.map(k => {
                const v = (patch.datos as Record<string, unknown>)[k];
                return `${k}: Array(${Array.isArray(v) ? v.length : '?'}) primerItem=${JSON.stringify(Array.isArray(v) ? v[0] : v)?.slice(0, 160)}`;
            }),
        });

        // Actualización dirigida por identificador y propiedad (defensa en
        // profundidad: RLS ya restringe a filas propias). El .select permite
        // detectar un UPDATE que afectó 0 filas en lugar de fingir éxito.
        const { data, error } = await supabase.from('plantillas')
            .update(patch)
            .eq('id', id)
            .eq('user_id', session.user.id)
            .select('id');

        if (error) {
            console.error('[PLANTILLAS] Error actualizando plantilla:', { message: error.message, details: error.details, hint: error.hint, code: error.code });
            return false;
        }
        if (!data || data.length === 0) {
            // RLS o id inexistente: PostgREST no reporta error pero nada cambió.
            console.error('[PLANTILLAS] UPDATE sin efecto (0 filas):', { plantillaId: id, userId: session.user.id });
            return false;
        }

        console.log('[PLANTILLAS] OK: Supabase confirmó el UPDATE de la plantilla', id);

        // Actualización localizada del estado (sin refetch global).
        setState(s => ({ ...s, plantillas: s.plantillas.map(p => p.id === id ? { ...p, ...patch } : p) }));
        // Invalidar el caché de plantillas: cambió el nombre o los datos de la plantilla.
        clearPlantillaCache(session.user.id);
        return true;
    }, [session, setState]);

    const deletePlantilla = useCallback(async (id: number) => {
        // Archivo lógico en lugar de borrado físico: las evaluaciones históricas
        // (curso_detalle, evaluaciones_rubrica/cotejo) conservan su referencia e
        // integridad. Solo el docente propietario puede archivar.
        if (!session?.user?.id) return;
        const { error } = await supabase.from('plantillas').update({ archivado: true }).eq('id', id).eq('user_id', session.user.id);
        if (error) {
            console.error('[PLANTILLAS] Error al eliminar plantilla:', { message: error.message, details: error.details, hint: error.hint, code: error.code });
            return;
        }
        setState(s => ({ ...s, plantillas: s.plantillas.filter(p => p.id !== id) }));
        // Invalidar el caché de plantillas: la plantilla se archivó.
        clearPlantillaCache(session.user.id);
    }, [session, setState]);

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
            shared_course_id: merged.sharedCourseId,
            indicador: merged.indicador,
            producto: merged.producto
        });

        if (!error) {
            setState(s => ({ ...s, actividades: s.actividades.map(a => a.id === merged.id ? merged : a) }));
        }
    }, [session, state.actividades, setState]);

    const deleteActividad = useCallback(async (id: number) => {
        // Real physical delete
        const { error } = await supabase.from('actividades').delete().eq('id', id);
        
        if (error) {
            console.error('Error deleting actividad:', error);
            return;
        }
        
        setState(s => ({ ...s, actividades: s.actividades.filter(a => a.id !== id) }));
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
        saveRecuperacionCotejo,
        updateNivelesPuntaje,
        updateCursoDetalle,
        saveRubrica,
        saveCotejo,
        updateDescriptor,
        updateCriterios,
        savePlantilla,
        updatePlantilla,
        deletePlantilla,
        resetSchoolYear
    };
}
