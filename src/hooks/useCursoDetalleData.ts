import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import type { AppState, CalificacionActividad, RecuperacionBC, RecuperacionCotejo, ContextoRecuperacion, BCKey, CursoDocente } from '../types';
import { calculateStudentPeriodBC, normalizeArea } from '../utils/academic';
import { perteneceAlContextoDelCurso, esEstudianteDelCurso } from '../utils/aislamiento';
import { sonMismaAsignatura } from '../constants/asignaturas';
import { useAppStore } from '../store/appStore';
import { usePersistenceStore, type PendingSaveItem } from '../store/persistenceStore';

export interface AcademicWarning {
    actividadId: number;
    actividadNombre: string;
    tipo: 'sin_competencia' | 'asignatura_inconsistente' | 'periodo_inconsistente';
    mensaje: string;
    accionTexto: string;
}

interface Params {
    state: AppState;
    cursoId: number;
    currentUserId?: string;
    currentCourseRole?: CursoDocente;
    onSaveCalificaciones?: (califs: CalificacionActividad[], recs: RecuperacionBC[], cursoId: number) => Promise<any>;
    onSaveRecuperacionCotejo?: (detalle: RecuperacionCotejo[], cursoId: number, contextos?: ContextoRecuperacion[]) => Promise<void>;
}

export function useCursoDetalleData({ state, cursoId, currentUserId, currentCourseRole, onSaveCalificaciones, onSaveRecuperacionCotejo }: Params) {
    const { selectedPeriodo, setSelectedPeriodo, selectedAsignatura: storeSelectedAsignatura } = useAppStore();
    const searchParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
    const urlAsignatura = searchParams?.get('asignatura') || null;
    const preferredAsignatura = urlAsignatura || currentCourseRole?.asignatura || storeSelectedAsignatura || '';
    const curso = state.cursos.find(c => c.id === cursoId && (!preferredAsignatura || sonMismaAsignatura(c.asignatura, preferredAsignatura)))
        || state.cursos.find(c => c.id === cursoId);
    const [buscar, setBuscar] = useState('');
    const [evalMode, setEvalMode] = useState<'pincel' | 'numerico' | 'libre'>('pincel');

    // Al entrar al componente o cambiar de curso, el modo pincel debe estar activado por defecto
    useEffect(() => {
        setEvalMode('pincel');
    }, [cursoId]);

    const [showRecoveryOnly, setShowRecoveryOnly] = useState(false);
    const [activePaintColor, setActivePaintColor] = useState<number>(100);
    const [rubricTarget, setRubricTarget] = useState<{ estId: number, bc: number, bcName: BCKey } | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [saveStatus, setSaveStatus] = useState<'idle' | 'unsaved' | 'saving' | 'verifying' | 'saved' | 'error'>('idle');
    const [saveError, setSaveError] = useState<string | null>(null);
    const [restoredFromBackupCount, setRestoredFromBackupCount] = useState<number>(0);
    const [isDragging, setIsDragging] = useState(false);
    const [focusedCell, setFocusedCell] = useState<{ estId: number, actId: number } | null>(null);
    const [isFullScreen, setIsFullScreen] = useState(false);
    const [gradeAnimations, setGradeAnimations] = useState<Array<{ id: number, estId: number, actId: number, emojis: string[] }>>([]);
    const [isDirty, setIsDirty] = useState(false);

    const sharedCourseId = curso?.sharedCourseId || String(cursoId);
    const myAsignatura = preferredAsignatura || curso?.asignatura || '';
    // Contexto institucional: el centro del propio curso es la autoridad.
    // sharedCourseId queda subordinado a este centro en todos los filtros.
    const centroContexto = curso?.centroId || null;

    // Local grade/recovery state
    const [localCalifs, setLocalCalifs] = useState<CalificacionActividad[]>([]);
    const [localRecs, setLocalRecs] = useState<RecuperacionBC[]>([]);
    const [localRecCotejo, setLocalRecCotejo] = useState<RecuperacionCotejo[]>([]);
    const [isDirtyCotejo, setIsDirtyCotejo] = useState(false);
    const [isSavingCotejo, setIsSavingCotejo] = useState(false);

    // Control atómico de ediciones pendientes por clave con timestamp monotónico para evitar condiciones de carrera
    const pendingCalifsRef = useRef<Map<string, { calif: CalificacionActividad, timestamp: number }>>(new Map());
    const pendingRecsRef = useRef<Map<string, { rec: RecuperacionBC, timestamp: number }>>(new Map());
    const inFlightCalifsRef = useRef<Map<string, number>>(new Map());
    const inFlightRecsRef = useRef<Map<string, number>>(new Map());
    const lastTimestampRef = useRef<number>(0);
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const isMountedRef = useRef(true);

    const getNextTimestamp = useCallback(() => {
        const now = Date.now();
        lastTimestampRef.current = Math.max(now, lastTimestampRef.current + 1);
        return lastTimestampRef.current;
    }, []);

    // Ref de guardia: protege el estado LOCAL de cotejo contra recargas/realtime
    const dirtyCotejoRef = useRef(false);
    dirtyCotejoRef.current = isDirtyCotejo;

    const [bcSel, setBcSel] = useState<Record<number, Set<BCKey>>>({});

    // Almacenamiento persistente resiliente (sessionStorage + localStorage)
    const PENDING_STORAGE_KEY = `cielo_pending_califs_${cursoId}`;

    const getPendingFromStorage = useCallback((): CalificacionActividad[] | null => {
        try {
            const sRaw = sessionStorage.getItem(PENDING_STORAGE_KEY);
            if (sRaw) {
                const parsed = JSON.parse(sRaw);
                if (Array.isArray(parsed) && parsed.length > 0) return parsed;
            }
            const lRaw = localStorage.getItem(PENDING_STORAGE_KEY);
            if (lRaw) {
                const parsed = JSON.parse(lRaw);
                if (Array.isArray(parsed) && parsed.length > 0) return parsed;
            }
        } catch (_) {}
        return null;
    }, [PENDING_STORAGE_KEY]);

    const persistPendingToStorage = useCallback((califs: CalificacionActividad[]) => {
        try {
            if (califs.length > 0) {
                const str = JSON.stringify(califs);
                sessionStorage.setItem(PENDING_STORAGE_KEY, str);
                localStorage.setItem(PENDING_STORAGE_KEY, str);
            } else {
                sessionStorage.removeItem(PENDING_STORAGE_KEY);
                localStorage.removeItem(PENDING_STORAGE_KEY);
            }
        } catch (_) {}
    }, [PENDING_STORAGE_KEY]);

    // 1. Recuperación de emergencia desde almacenamiento persistente al montar o cambiar cursoId
    useEffect(() => {
        try {
            const parsed = getPendingFromStorage();
            if (parsed && parsed.length > 0) {
                console.warn(`[RECOVERY] Restaurando ${parsed.length} calificaciones pendientes desde almacenamiento persistente para el curso ${cursoId}`);
                parsed.forEach(c => {
                    const key = `${c.estudianteId}_${c.actividadId}`;
                    pendingCalifsRef.current.set(key, { calif: c, timestamp: Date.now() });
                });
                setLocalCalifs(prev => {
                    const map = new Map<string, CalificacionActividad>();
                    prev.forEach(c => map.set(`${c.estudianteId}_${c.actividadId}`, c));
                    parsed.forEach(c => map.set(`${c.estudianteId}_${c.actividadId}`, c));
                    return Array.from(map.values());
                });
                setIsDirty(true);
                setSaveStatus('unsaved');
                setRestoredFromBackupCount(parsed.length);
                if (timerRef.current) clearTimeout(timerRef.current);
                timerRef.current = setTimeout(() => {
                    executeSave();
                }, 1000);
            }
        } catch (err) {
            console.error('[RECOVERY] Error restaurando desde almacenamiento persistente:', err);
        }
    }, [cursoId, getPendingFromStorage]);

    // 2. Sincronización segura con Zustand / Realtime sin sobrescribir ediciones pendientes ni notas locales válidas
    useEffect(() => {
        const currentActs = state.actividades.filter(a => 
            a.id && a.cursoId === cursoId && 
            (!a.asignatura || normalizeArea(a.asignatura) === normalizeArea(myAsignatura) || currentCourseRole?.rol === 'tutor') && 
            (a.userId === currentUserId || !a.userId || a.cursoId === cursoId || currentCourseRole?.rol === 'tutor')
        );
        
        // Reconciliación overlay: los cambios locales pendientes SIEMPRE ganan sobre datos entrantes
        // y las respuestas vacías del servidor NUNCA eliminan calificaciones válidas en memoria
        setLocalCalifs(prev => {
            const serverCalifs = state.calificaciones.filter(c => 
                c.cursoId === cursoId && 
                (!c.asignatura || normalizeArea(c.asignatura) === normalizeArea(myAsignatura) || currentCourseRole?.rol === 'tutor')
            );
            const map = new Map<string, CalificacionActividad>();

            // 1. Cargar servidor como base
            serverCalifs.forEach(c => {
                map.set(`${c.estudianteId}_${c.actividadId}`, c);
            });

            // 2. Preservar calificaciones locales existentes en memoria si el servidor aún no las tiene o devolvió vacío
            prev.forEach(c => {
                const key = `${c.estudianteId}_${c.actividadId}`;
                const serverItem = map.get(key);
                if (!serverItem && (c.puntaje !== null || c.recuperacion !== null)) {
                    map.set(key, c);
                }
            });

            // 3. Modificaciones en vuelo (enviadas a Supabase, esperando respuesta)
            inFlightCalifsRef.current.forEach((_, key) => {
                const pending = pendingCalifsRef.current.get(key);
                if (pending) {
                    map.set(key, pending.calif);
                }
            });

            // 4. Modificaciones locales pendientes SIEMPRE ganan sobre cualquier dato
            pendingCalifsRef.current.forEach(({ calif }, key) => {
                map.set(key, calif);
            });

            return Array.from(map.values());
        });

        setLocalRecs(prev => {
            const serverRecs = state.recuperaciones.filter(r => 
                r.cursoId === cursoId && 
                (!r.asignatura || normalizeArea(r.asignatura) === normalizeArea(myAsignatura) || currentCourseRole?.rol === 'tutor')
            );
            const map = new Map<string, RecuperacionBC>();

            // 1. Cargar servidor como base
            serverRecs.forEach(r => {
                map.set(`${r.estudianteId}_${r.bc}_${r.periodo}_${r.asignatura}`, r);
            });

            // 2. Preservar locales
            prev.forEach(r => {
                const key = `${r.estudianteId}_${r.bc}_${r.periodo}_${r.asignatura}`;
                const serverItem = map.get(key);
                if (!serverItem && r.puntaje !== null) {
                    map.set(key, r);
                }
            });

            // 3. En vuelo
            inFlightRecsRef.current.forEach((_, key) => {
                const pending = pendingRecsRef.current.get(key);
                if (pending) {
                    map.set(key, pending.rec);
                }
            });

            // 4. Pendientes ganan
            pendingRecsRef.current.forEach(({ rec }, key) => {
                map.set(key, rec);
            });

            return Array.from(map.values());
        });

        // Cotejo: cargar los ✓ si no hay ediciones locales sin guardar
        if (!dirtyCotejoRef.current) {
            setLocalRecCotejo(state.recuperacionesCotejo.filter(r => 
                r.cursoId === cursoId && 
                (!r.asignatura || normalizeArea(r.asignatura) === normalizeArea(myAsignatura) || currentCourseRole?.rol === 'tutor')
            ));
        }
        
        const nextBc: Record<number, Set<BCKey>> = {};
        currentActs.forEach(a => {
            const initial = (a.bcAsignados && a.bcAsignados.length > 0) ? a.bcAsignados : ['BC1'];
            nextBc[a.id] = new Set(initial as BCKey[]);
        });
        setBcSel(prev => {
            const merged = { ...nextBc };
            Object.keys(prev).forEach(k => {
                const numK = Number(k);
                if (prev[numK]) merged[numK] = prev[numK];
            });
            return merged;
        });
    }, [state.calificaciones, state.recuperaciones, state.recuperacionesCotejo, state.actividades, state.cursos, cursoId, myAsignatura, currentUserId, currentCourseRole?.rol]);

    // 3. Función atómica de guardado que reconcilia versiones y evita sobrescrituras de carreras
    const executeSave = useCallback(async (): Promise<boolean> => {
        if (!onSaveCalificaciones) return false;
        if (pendingCalifsRef.current.size === 0 && pendingRecsRef.current.size === 0) {
            setIsDirty(false);
            setSaveStatus('saved');
            usePersistenceStore.getState().setNavigationLock(false, null, cursoId);
            return true;
        }

        setIsSaving(true);
        setSaveStatus('saving');
        setSaveError(null);
        usePersistenceStore.getState().setNavigationLock(true, 'Guardando calificaciones en el servidor...', cursoId);

        // Snapshot inmutable de las ediciones pendientes al momento de iniciar la petición
        const califsToSave: CalificacionActividad[] = [];
        const flightCalifs = new Map<string, number>();
        pendingCalifsRef.current.forEach(({ calif, timestamp }, key) => {
            califsToSave.push(calif);
            flightCalifs.set(key, timestamp);
            usePersistenceStore.getState().updateItemStatus(key, 'saving');
        });

        const recsToSave: RecuperacionBC[] = [];
        const flightRecs = new Map<string, number>();
        pendingRecsRef.current.forEach(({ rec, timestamp }, key) => {
            recsToSave.push(rec);
            flightRecs.set(key, timestamp);
            usePersistenceStore.getState().updateItemStatus(key, 'saving');
        });

        inFlightCalifsRef.current = flightCalifs;
        inFlightRecsRef.current = flightRecs;

        try {
            console.log(`[AUTOSAVE] Persistiendo en Supabase: ${califsToSave.length} calificaciones, ${recsToSave.length} recuperaciones.`);
            setSaveStatus('verifying');
            flightCalifs.forEach((_, key) => usePersistenceStore.getState().updateItemStatus(key, 'verifying'));
            flightRecs.forEach((_, key) => usePersistenceStore.getState().updateItemStatus(key, 'verifying'));

            await onSaveCalificaciones(califsToSave, recsToSave, cursoId);

            // ÉXITO Y VERIFICACIÓN CONFIRMADA: remover de pendientes ÚNICAMENTE las entradas cuya marca temporal no haya cambiado
            const confirmedIds: string[] = [];
            flightCalifs.forEach((sentTs, key) => {
                const current = pendingCalifsRef.current.get(key);
                if (current && current.timestamp === sentTs) {
                    pendingCalifsRef.current.delete(key);
                    confirmedIds.push(key);
                }
            });
            flightRecs.forEach((sentTs, key) => {
                const current = pendingRecsRef.current.get(key);
                if (current && current.timestamp === sentTs) {
                    pendingRecsRef.current.delete(key);
                    confirmedIds.push(key);
                }
            });

            usePersistenceStore.getState().removeItems(confirmedIds);

            // Actualizar almacenamiento persistente seguro
            const remaining = Array.from(pendingCalifsRef.current.values()).map(x => x.calif);
            persistPendingToStorage(remaining);

            if (pendingCalifsRef.current.size === 0 && pendingRecsRef.current.size === 0) {
                setIsDirty(false);
                setSaveStatus('saved');
                setSaveError(null);
                usePersistenceStore.getState().setNavigationLock(false, null, cursoId);
            } else {
                // Se registraron nuevas ediciones mientras la petición estaba en vuelo
                console.log(`[AUTOSAVE] Quedan ${pendingCalifsRef.current.size} modificaciones posteriores; programando siguiente guardado.`);
                setIsDirty(true);
                setSaveStatus('unsaved');
                usePersistenceStore.getState().setNavigationLock(true, 'Guardando calificaciones pendientes...', cursoId);
                if (timerRef.current) clearTimeout(timerRef.current);
                timerRef.current = setTimeout(() => {
                    executeSave();
                }, 1000);
            }
            return true;
        } catch (err: any) {
            console.error("[AUTOSAVE] Error al persistir calificaciones en Supabase:", err);
            // Conservar todas las ediciones en pendingCalifsRef, localCalifs y cola persistente
            setIsDirty(true);
            setSaveStatus('error');
            setSaveError(err?.message || 'Error al persistir calificaciones en el servidor');
            flightCalifs.forEach((_, key) => usePersistenceStore.getState().updateItemStatus(key, 'error', { lastError: err?.message }));
            flightRecs.forEach((_, key) => usePersistenceStore.getState().updateItemStatus(key, 'error', { lastError: err?.message }));
            usePersistenceStore.getState().setNavigationLock(true, 'Error al guardar calificaciones (reintentando)', cursoId);
            return false;
        } finally {
            inFlightCalifsRef.current.clear();
            inFlightRecsRef.current.clear();
            setIsSaving(false);
        }
    }, [onSaveCalificaciones, cursoId, persistPendingToStorage]);

    // 4. Programación de guardado automático con debounce
    const scheduleDebounce = useCallback(() => {
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => {
            executeSave();
        }, 1000);
    }, [executeSave]);

    // 5. Guardado forzado inmediato (flush)
    const flushSave = useCallback(async (): Promise<boolean> => {
        if (timerRef.current) {
            clearTimeout(timerRef.current);
            timerRef.current = null;
        }
        if (pendingCalifsRef.current.size > 0 || pendingRecsRef.current.size > 0) {
            return await executeSave();
        }
        return true;
    }, [executeSave]);

    // 6. Salvaguarda al desmontar el componente (navegación o cierre)
    useEffect(() => {
        isMountedRef.current = true;
        return () => {
            isMountedRef.current = false;
            if (timerRef.current) {
                clearTimeout(timerRef.current);
            }
            if (pendingCalifsRef.current.size > 0 || pendingRecsRef.current.size > 0) {
                executeSave();
            }
        };
    }, [executeSave]);

    // 7. Advertencia de cierre de navegador con cambios pendientes
    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (pendingCalifsRef.current.size > 0 || isDirty || isDirtyCotejo) {
                e.preventDefault();
                e.returnValue = 'Tienes calificaciones pendientes de guardar. Si sales ahora, algunos cambios podrían no guardarse.';
                return e.returnValue;
            }
        };
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [isDirty, isDirtyCotejo]);

    const actividades = useMemo(() => {
        const res = state.actividades.filter(a => {
            const isMyAct = a.cursoId === cursoId;
            // Frontera institucional: compartido solo dentro del MISMO centro.
            const isSharedAct = a.cursoId !== cursoId && !!curso &&
                perteneceAlContextoDelCurso(state.cursos, curso, a.cursoId, centroContexto);
            const matchesPeriod = a.periodo === selectedPeriodo || (!a.periodo && selectedPeriodo === 'P1');
            const isMine = !currentUserId || a.userId === currentUserId || !a.userId || a.cursoId === cursoId;
            // Regla obligatoria: Exigir que la actividad tenga asignatura y que coincida con la materia activa.
            // Ser tutor no autoriza mezclar asignaturas en el registro pedagógico.
            const matchAsignatura = Boolean(a.asignatura) && Boolean(myAsignatura) && normalizeArea(a.asignatura) === normalizeArea(myAsignatura);
            return (isMyAct || isSharedAct) && matchesPeriod && isMine && matchAsignatura;
        });
        
        const sorted = [...res].sort((a, b) => {
            const isAProductoFinal = !!a.isProductoFinal;
            const isBProductoFinal = !!b.isProductoFinal;
            
            if (isAProductoFinal && !isBProductoFinal) return 1;
            if (!isAProductoFinal && isBProductoFinal) return -1;
            
            const timeA = new Date(a.fecha).getTime();
            const timeB = new Date(b.fecha).getTime();
            if (timeA !== timeB) return timeA - timeB;
            
            return a.id - b.id;
        });

        console.log(`[DIAG][SCREEN] CursoDetalle cursoId=${cursoId} userId=${currentUserId ?? 'sin-usuario'} sharedCourseId=${sharedCourseId} periodo=${selectedPeriodo} actividadesConsumidas=${sorted.length} globalActividades=${state.actividades.length} localCalifs=${localCalifs.length} localRecs=${localRecs.length} ts=${new Date().toISOString()}`);
        return sorted;
    }, [state.actividades, state.cursos, cursoId, curso, centroContexto, selectedPeriodo, currentUserId, myAsignatura, currentCourseRole?.rol, localCalifs.length, localRecs.length, sharedCourseId]);

    const allCourseStudents = useMemo(() => {
        const filtered = state.estudiantes
            .filter(e => curso ? esEstudianteDelCurso(state.cursos, curso, e, centroContexto) : e.cursoId === cursoId);

        return filtered.map(est => {
            const bcs: BCKey[] = ['BC1', 'BC2', 'BC3', 'BC4'];
            const bcValues = bcs.map((bc) => {
                const { avg, rec, final } = calculateStudentPeriodBC({
                    estudianteId: est.id,
                    bc,
                    periodo: selectedPeriodo,
                    actividades: state.actividades,
                    calificaciones: localCalifs,
                    recuperaciones: localRecs,
                    cursoId,
                    sharedCourseId: curso?.sharedCourseId,
                    targetAsignatura: myAsignatura,
                    bcSel,
                    currentUserId,
                    centroId: centroContexto,
                    cursos: state.cursos,
                    curso
                });
                return { bc, avg, rec, final };
            });

            const finals = bcValues.map(v => v.final).filter(v => v !== null) as number[];
            const promTotal = finals.length ? Math.round(finals.reduce((a, b) => a + b, 0) / finals.length) : null;
            
            let destaca: BCKey | null = null, bestVal = -1;
            bcValues.forEach(v => { if (v.avg !== null && v.avg > bestVal) { bestVal = v.avg; destaca = v.bc; } });

            const displayName = `${est.nombre} ${est.apellido}`;

            const califsMap: Record<number, number | null> = {};
            actividades.forEach(a => {
                califsMap[a.id] = localCalifs.find(c => c.estudianteId === est.id && c.actividadId === a.id)?.puntaje ?? null;
            });

            return { ...est, bcValues, promTotal, destaca, displayName, calificaciones: califsMap };
        });
    }, [state.estudiantes, state.cursos, curso, centroContexto, cursoId, actividades, bcSel, localCalifs, localRecs, selectedPeriodo, myAsignatura, currentUserId]);

    const enhancedEstudiantes = useMemo(() => {
        if (!buscar) return allCourseStudents;
        const normalize = (str: string) => str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
        return allCourseStudents.filter(e => {
            const fullName = `${e.nombre || ''} ${e.apellido || ''}`;
            return normalize(fullName).includes(normalize(buscar)) ||
                   normalize(e.nombre || '').includes(normalize(buscar)) ||
                   normalize(e.apellido || '').includes(normalize(buscar));
        });
    }, [allCourseStudents, buscar]);

    const finalFilteredEstudiantes = useMemo(() => {
        let lista = [...enhancedEstudiantes].sort((a, b) => (a.numeroLista || 0) - (b.numeroLista || 0));

        if (!showRecoveryOnly) {
            let maxN = 0;
            for (const est of lista) {
                if (est.numeroLista && est.numeroLista > maxN) {
                    maxN = est.numeroLista;
                }
            }
            
            const normalizedList: any[] = [];
            let currentIdx = 0;
            for (let i = 1; i <= maxN; i++) {
                if (currentIdx < lista.length && lista[currentIdx].numeroLista === i) {
                    normalizedList.push(lista[currentIdx]);
                    currentIdx++;
                } else {
                    normalizedList.push({
                        id: -(1000000 + i), // ID negativo estable: SOLO visual, nunca llega a Supabase
                        nombre: '',
                        apellido: '',
                        displayName: '',
                        numeroLista: i,
                        calificaciones: {},
                        bcValues: [
                            { bc: 'BC1', avg: null, rec: null, final: null },
                            { bc: 'BC2', avg: null, rec: null, final: null },
                            { bc: 'BC3', avg: null, rec: null, final: null },
                            { bc: 'BC4', avg: null, rec: null, final: null }
                        ],
                        promTotal: null,
                        destaca: null,
                        isPlaceholder: true
                    } as any);
                }
            }
            while (currentIdx < lista.length) {
                normalizedList.push(lista[currentIdx]);
                currentIdx++;
            }
            lista = normalizedList;
        } else {
            lista = lista.filter(est => est.bcValues.some(v => v.avg !== null && v.avg < 70));
        }

        console.log(`[DIAG][SCREEN] CursoDetalle estudiantesConsumidos=${lista.length} estudiantesGlobal=${state.estudiantes.length} ts=${new Date().toISOString()}`);
        return lista;
    }, [enhancedEstudiantes, showRecoveryOnly, state.estudiantes.length]);

    const setCalif = useCallback((estId: number, actId: number, val: number | null) => {
        if (estId <= 0 || actId <= 0) return; // Proteger contra filas placeholder
        setIsDirty(true);
        setSaveStatus('unsaved');
        setSaveError(null);

        const key = `${estId}_${actId}`;
        const act = state.actividades.find(a => a.id === actId);

        setLocalCalifs(prev => {
            const idx = prev.findIndex(c => c.estudianteId === estId && c.actividadId === actId);
            const updatedCalif: CalificacionActividad = idx >= 0
                ? { ...prev[idx], puntaje: val }
                : {
                    estudianteId: estId,
                    actividadId: actId,
                    puntaje: val,
                    recuperacion: null,
                    cursoId: cursoId,
                    sharedCourseId: sharedCourseId,
                    userId: currentUserId!,
                    asignatura: act?.asignatura || myAsignatura,
                    periodo: act?.periodo || selectedPeriodo || 'P2',
                    competencias: (act?.bcAsignados && act.bcAsignados.length > 0) ? act.bcAsignados : ['BC1'],
                    descriptores: []
                };

            pendingCalifsRef.current.set(key, { calif: updatedCalif, timestamp: getNextTimestamp() });

            // Registrar en la cola persistente global
            usePersistenceStore.getState().enqueueItems([{
                id: key,
                tipo: 'calificacion',
                cursoId: cursoId,
                actividadId: actId,
                estudianteId: estId,
                puntaje: val,
                periodo: updatedCalif.periodo,
                asignatura: updatedCalif.asignatura,
                competencias: updatedCalif.competencias,
                descriptores: updatedCalif.descriptores,
                sharedCourseId: updatedCalif.sharedCourseId,
                userId: currentUserId!,
                timestamp: Date.now(),
                status: 'pending',
                attempts: 0
            }]);
            usePersistenceStore.getState().setNavigationLock(true, 'Hay calificaciones pendientes de guardar y verificar', cursoId);

            // Almacenamiento seguro persistente (sessionStorage + localStorage)
            const pendingList = Array.from(pendingCalifsRef.current.values()).map(x => x.calif);
            persistPendingToStorage(pendingList);

            if (idx >= 0) return prev.map((c, i) => i === idx ? updatedCalif : c);
            return [...prev, updatedCalif];
        });

        scheduleDebounce();
    }, [state.actividades, cursoId, sharedCourseId, currentUserId, myAsignatura, selectedPeriodo, scheduleDebounce, getNextTimestamp, persistPendingToStorage]);

    const setCalifsBatch = useCallback((updates: Array<{ estId: number, actId: number, val: number | null }>) => {
        if (!updates || updates.length === 0) return;
        setIsDirty(true);
        setSaveStatus('unsaved');
        setSaveError(null);

        setLocalCalifs(prev => {
            const map = new Map<string, CalificacionActividad>();
            prev.forEach(c => map.set(`${c.estudianteId}_${c.actividadId}`, c));

            updates.forEach(({ estId, actId, val }) => {
                if (estId <= 0 || actId <= 0) return;
                const key = `${estId}_${actId}`;
                const act = state.actividades.find(a => a.id === actId);
                const existing = map.get(key);
                const updatedCalif: CalificacionActividad = existing
                    ? { ...existing, puntaje: val }
                    : {
                        estudianteId: estId,
                        actividadId: actId,
                        puntaje: val,
                        recuperacion: null,
                        cursoId: cursoId,
                        sharedCourseId: sharedCourseId,
                        userId: currentUserId!,
                        asignatura: act?.asignatura || myAsignatura,
                        periodo: act?.periodo || selectedPeriodo || 'P2',
                        competencias: (act?.bcAsignados && act.bcAsignados.length > 0) ? act.bcAsignados : ['BC1'],
                        descriptores: []
                    };
                map.set(key, updatedCalif);
                pendingCalifsRef.current.set(key, { calif: updatedCalif, timestamp: getNextTimestamp() });
            });

            // Registrar lote en la cola persistente global
            const queueItems: PendingSaveItem[] = updates.filter(u => u.estId > 0 && u.actId > 0).map(u => {
                const key = `${u.estId}_${u.actId}`;
                const item = map.get(key)!;
                return {
                    id: key,
                    tipo: 'calificacion',
                    cursoId: cursoId,
                    actividadId: u.actId,
                    estudianteId: u.estId,
                    puntaje: u.val,
                    periodo: item.periodo,
                    asignatura: item.asignatura,
                    competencias: item.competencias,
                    descriptores: item.descriptores,
                    sharedCourseId: item.sharedCourseId,
                    userId: currentUserId!,
                    timestamp: Date.now(),
                    status: 'pending',
                    attempts: 0
                };
            });
            usePersistenceStore.getState().enqueueItems(queueItems);
            usePersistenceStore.getState().setNavigationLock(true, 'Hay calificaciones pendientes de guardar y verificar', cursoId);

            // Almacenamiento seguro persistente (sessionStorage + localStorage)
            const pendingList = Array.from(pendingCalifsRef.current.values()).map(x => x.calif);
            persistPendingToStorage(pendingList);

            return Array.from(map.values());
        });

        scheduleDebounce();
    }, [state.actividades, cursoId, sharedCourseId, currentUserId, myAsignatura, selectedPeriodo, scheduleDebounce, getNextTimestamp, persistPendingToStorage]);

    const setRec = useCallback((estId: number, bc: 1 | 2 | 3 | 4, val: number | null) => {
        if (estId <= 0) return;
        setIsDirty(true);
        setSaveStatus('unsaved');
        setSaveError(null);

        const key = `${estId}_${bc}_${selectedPeriodo}_${myAsignatura}`;

        setLocalRecs(prev => {
            const idx = prev.findIndex(r => r.estudianteId === estId && r.bc === bc && r.periodo === selectedPeriodo);
            const updatedRec: RecuperacionBC = idx >= 0
                ? { ...prev[idx], puntaje: val }
                : { 
                    estudianteId: estId, 
                    bc, 
                    cursoId: cursoId, 
                    puntaje: val, 
                    periodo: selectedPeriodo,
                    userId: currentUserId,
                    asignatura: myAsignatura,
                    sharedCourseId: sharedCourseId
                };

            pendingRecsRef.current.set(key, { rec: updatedRec, timestamp: getNextTimestamp() });

            usePersistenceStore.getState().enqueueItems([{
                id: key,
                tipo: 'recuperacion',
                cursoId: cursoId,
                estudianteId: estId,
                bc,
                puntaje: val,
                periodo: selectedPeriodo,
                userId: currentUserId!,
                asignatura: myAsignatura,
                sharedCourseId: sharedCourseId,
                timestamp: Date.now(),
                status: 'pending',
                attempts: 0
            }]);
            usePersistenceStore.getState().setNavigationLock(true, 'Hay recuperaciones pendientes de guardar y verificar', cursoId);

            if (idx >= 0) return prev.map((r, i) => i === idx ? updatedRec : r);
            return [...prev, updatedRec];
        });

        scheduleDebounce();
    }, [cursoId, selectedPeriodo, currentUserId, myAsignatura, sharedCourseId, scheduleDebounce, getNextTimestamp]);

    const setCotejoCelda = useCallback((
        estId: number,
        bc: 1 | 2 | 3 | 4,
        indicador: string,
        actividadId: number,
        logrado: boolean,
    ) => {
        if (logrado === undefined || estId <= 0) return;
        setIsDirtyCotejo(true);

        const rest = localRecCotejo.filter(r => !(
            r.estudianteId === estId && r.bc === bc &&
            r.indicador === indicador && r.actividadId === actividadId &&
            r.periodo === selectedPeriodo
        ));

        const next = !logrado
            ? rest
            : [...rest, {
                id: localRecCotejo.find(r => r.estudianteId === estId && r.bc === bc && r.indicador === indicador && r.actividadId === actividadId && r.periodo === selectedPeriodo)?.id ?? 0,
                recuperacionId: localRecCotejo.find(r => r.estudianteId === estId && r.bc === bc && r.indicador === indicador && r.actividadId === actividadId && r.periodo === selectedPeriodo)?.recuperacionId ?? 0,
                estudianteId: estId,
                cursoId,
                bc,
                periodo: selectedPeriodo,
                asignatura: myAsignatura,
                indicador,
                actividadId,
                sharedCourseId,
                userId: currentUserId || '',
            } as RecuperacionCotejo];

        setLocalRecCotejo(next);
    }, [localRecCotejo, cursoId, selectedPeriodo, myAsignatura, sharedCourseId, currentUserId]);

    const saveCotejo = useCallback(async (contextos?: ContextoRecuperacion[]) => {
        if (!onSaveRecuperacionCotejo) return;
        setIsSavingCotejo(true);
        try {
            await onSaveRecuperacionCotejo(localRecCotejo, cursoId, contextos);
            setIsDirtyCotejo(false);
        } catch (err) {
            console.error("[RECUPERACION COTEJO] Error al guardar:", err);
            throw err;
        } finally {
            setIsSavingCotejo(false);
        }
    }, [onSaveRecuperacionCotejo, localRecCotejo, cursoId]);

    const discardCotejo = useCallback(() => {
        setLocalRecCotejo(state.recuperacionesCotejo.filter(r => r.cursoId === cursoId && (!r.asignatura || normalizeArea(r.asignatura) === normalizeArea(myAsignatura))));
        setIsDirtyCotejo(false);
    }, [state.recuperacionesCotejo, cursoId, myAsignatura]);

    const triggerAnimation = useCallback((estId: number, actId: number, score: number) => {
        const SCORE_EMOJIS: Record<number, string[]> = {
            100: ['🥰', '🥰', '🥰'],
            85: ['😊', '😊', '😊'],
            70: ['😐', '😐', '😐'],
            55: ['☹️', '☹️', '☹️']
        };
        const emojis = SCORE_EMOJIS[score] || [];
        if (emojis.length === 0) return;
        const id = Date.now();
        setGradeAnimations(prev => [...prev, { id, estId, actId, emojis }]);
        setTimeout(() => {
            setGradeAnimations(prev => prev.filter(anim => anim.id !== id));
        }, 1000);
    }, []);

    // 8. Auditoría preventiva en vivo: detecta actividades de la asignatura activa con calificaciones que no están computando
    const academicWarnings = useMemo<AcademicWarning[]>(() => {
        const warnings: AcademicWarning[] = [];
        // Inconsistencia preventiva: Actividades sin asignatura asignada en este curso
        const unassignedActs = state.actividades.filter(a => a.cursoId === cursoId && !a.asignatura);
        unassignedActs.forEach(a => {
            warnings.push({
                actividadId: a.id,
                actividadNombre: a.nombre,
                tipo: 'asignatura_inconsistente',
                mensaje: `La actividad "${a.nombre}" no tiene una asignatura asignada. Ha sido excluida de las columnas y de los promedios hasta que se le configure su materia.`,
                accionTexto: 'Configurar asignatura'
            });
        });

        // Filtrar SOLO las actividades legítimas de la asignatura activa
        const contextActs = state.actividades.filter(a => 
            a.cursoId === cursoId && 
            Boolean(a.asignatura) && 
            Boolean(myAsignatura) && 
            normalizeArea(a.asignatura) === normalizeArea(myAsignatura)
        );

        contextActs.forEach(a => {
            const hasGrades = localCalifs.some(c => c.actividadId === a.id && c.puntaje !== null);
            if (!hasGrades) return;

            // Inconsistencia 1: Sin competencias (BC)
            const assigned = bcSel[a.id] ?? (a.bcAsignados && a.bcAsignados.length > 0 ? new Set(a.bcAsignados) : new Set<BCKey>());
            if (assigned.size === 0) {
                warnings.push({
                    actividadId: a.id,
                    actividadNombre: a.nombre,
                    tipo: 'sin_competencia',
                    mensaje: `La actividad "${a.nombre}" tiene calificaciones registradas pero no tiene ninguna competencia asignada (BC). Sus puntajes no se suman a ningún promedio.`,
                    accionTexto: 'Asignar a BC1'
                });
            }

            // Inconsistencia 2: Sin período
            if (!a.periodo) {
                warnings.push({
                    actividadId: a.id,
                    actividadNombre: a.nombre,
                    tipo: 'periodo_inconsistente',
                    mensaje: `La actividad "${a.nombre}" tiene calificaciones pero no tiene período definido. Se procesa provisionalmente en P1.`,
                    accionTexto: 'Asignar período'
                });
            }
        });

        return warnings;
    }, [state.actividades, cursoId, localCalifs, bcSel, myAsignatura]);

    const handleSetSelectedPeriodo = useCallback((periodo: string) => {
        if (pendingCalifsRef.current.size > 0 || pendingRecsRef.current.size > 0) {
            console.log(`[AUTOSAVE] Persistiendo ediciones pendientes antes de cambiar al período ${periodo}`);
            executeSave();
        }
        setSelectedPeriodo(periodo);
    }, [executeSave, setSelectedPeriodo]);

    return {
        curso,
        selectedPeriodo,
        setSelectedPeriodo: handleSetSelectedPeriodo,
        buscar,
        setBuscar,
        evalMode,
        setEvalMode,
        showRecoveryOnly,
        setShowRecoveryOnly,
        activePaintColor,
        setActivePaintColor,
        rubricTarget,
        setRubricTarget,
        isSaving,
        setIsSaving,
        saveStatus,
        saveError,
        saveCalifs: executeSave,
        flushSave,
        retrySave: executeSave,
        restoredFromBackupCount,
        academicWarnings,
        isDragging,
        setIsDragging,
        focusedCell,
        setFocusedCell,
        isFullScreen,
        setIsFullScreen,
        gradeAnimations,
        localCalifs,
        localRecs,
        localRecCotejo,
        setCotejoCelda,
        saveCotejo,
        discardCotejo,
        isSavingCotejo,
        bcSel,
        setBcSel,
        actividades,
        enhancedEstudiantes: finalFilteredEstudiantes,
        allCourseStudents,
        setCalif,
        setCalifsBatch,
        setRec,
        triggerAnimation,
        isDirty,
        isDirtyCotejo,
        setIsDirty,
        myAsignatura,
        sharedCourseId
    };
}
