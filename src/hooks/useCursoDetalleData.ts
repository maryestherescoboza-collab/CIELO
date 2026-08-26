import { useState, useMemo, useCallback, useEffect } from 'react';
import type { AppState, CalificacionActividad, RecuperacionBC, BCKey, CursoDocente } from '../types';
import { calculateStudentPeriodBC } from '../utils/academic';
import { perteneceAlContextoDelCurso, esEstudianteDelCurso } from '../utils/aislamiento';

import { useAppStore } from '../store/appStore';

interface Params {
    state: AppState;
    cursoId: number;
    currentUserId?: string;
    currentCourseRole?: CursoDocente;
    onSaveCalificaciones?: (califs: CalificacionActividad[], recs: RecuperacionBC[], cursoId: number) => Promise<any>;
}

export function useCursoDetalleData({ state, cursoId, currentUserId, currentCourseRole, onSaveCalificaciones }: Params) {
    const curso = state.cursos.find(c => c.id === cursoId);
    const { selectedPeriodo, setSelectedPeriodo } = useAppStore();
    const [buscar, setBuscar] = useState('');
    const [isPointMode, setIsPointMode] = useState(true);

    // Al entrar al componente o cambiar de curso, el modo pincel debe estar activado por defecto e inicializar período
    useEffect(() => {
        setIsPointMode(true);
        if (curso?.periodo) {
            setSelectedPeriodo(curso.periodo);
        }
    }, [cursoId, curso?.periodo, setSelectedPeriodo]);
    const [showRecoveryOnly, setShowRecoveryOnly] = useState(false);
    const [activePaintColor, setActivePaintColor] = useState<number>(100);
    const [rubricTarget, setRubricTarget] = useState<{ estId: number, bc: number, bcName: BCKey } | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [focusedCell, setFocusedCell] = useState<{ estId: number, actId: number } | null>(null);
    const [isFullScreen, setIsFullScreen] = useState(false);
    const [gradeAnimations, setGradeAnimations] = useState<Array<{ id: number, estId: number, actId: number, emojis: string[] }>>([]);
    const [isDirty, setIsDirty] = useState(false);

    const sharedCourseId = curso?.sharedCourseId || String(cursoId);
    const myAsignatura = currentCourseRole?.asignatura || curso?.asignatura || '';
    // Contexto institucional: el centro del propio curso es la autoridad.
    // sharedCourseId queda subordinado a este centro en todos los filtros.
    const centroContexto = curso?.centroId || null;

    // Local grade/recovery state
    const [localCalifs, setLocalCalifs] = useState<CalificacionActividad[]>([]);
    const [localRecs, setLocalRecs] = useState<RecuperacionBC[]>([]);

    const [bcSel, setBcSel] = useState<Record<number, Set<BCKey>>>({});

    useEffect(() => {
        const currentActs = state.actividades.filter(a => a.id && a.cursoId === cursoId && (!a.asignatura || a.asignatura === myAsignatura) && (a.userId === currentUserId || !a.userId));
        setLocalCalifs(state.calificaciones.filter(c => c.cursoId === cursoId && (!c.asignatura || c.asignatura === myAsignatura)));
        setLocalRecs(state.recuperaciones.filter(r => r.cursoId === cursoId && (!r.asignatura || r.asignatura === myAsignatura)));
        
        const nextBc: Record<number, Set<BCKey>> = {};
        currentActs.forEach(a => {
            const initial = (a.bcAsignados && a.bcAsignados.length > 0) ? a.bcAsignados : ['BC1'];
            nextBc[a.id] = new Set(initial as BCKey[]);
        });
        setBcSel(nextBc);
    }, [state.calificaciones, state.recuperaciones, state.actividades, state.cursos, cursoId, myAsignatura, currentUserId]);

    // Auto-save logic with 1 second debounce
    useEffect(() => {
        if (!isDirty || !onSaveCalificaciones) return;

        const timer = setTimeout(async () => {
            console.log('[DEBUG] 3. Se ejecuta el guardado automático desde useCursoDetalleData');
            setIsSaving(true);
            try {
                await onSaveCalificaciones(localCalifs, localRecs, cursoId);
                setIsDirty(false);
            } catch (err) {
                console.error("Auto-save grades failed:", err);
            } finally {
                setIsSaving(false);
            }
        }, 1000);

        return () => clearTimeout(timer);
    }, [localCalifs, localRecs, isDirty, cursoId, onSaveCalificaciones]);

    // Browser close warning
    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (isDirty) {
                e.preventDefault();
                e.returnValue = '';
            }
        };
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [isDirty]);

    const actividades = useMemo(() => {
        return state.actividades.filter(a => {
            const isMyAct = a.cursoId === cursoId;
            // Frontera institucional: compartido solo dentro del MISMO centro.
            const isSharedAct = a.cursoId !== cursoId && !!curso &&
                perteneceAlContextoDelCurso(state.cursos, curso, a.cursoId, centroContexto);
            const matchesPeriod = a.periodo === selectedPeriodo;
            const isMine = a.userId === currentUserId || !a.userId;
            return (isMyAct || isSharedAct) && matchesPeriod && isMine;
        });
    }, [state.actividades, state.cursos, cursoId, curso, centroContexto, selectedPeriodo, currentUserId]);

    const enhancedEstudiantes = useMemo(() => {
        const normalize = (str: string) => str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
        const filtered = state.estudiantes
            .filter(e => curso ? esEstudianteDelCurso(state.cursos, curso, e, centroContexto) : e.cursoId === cursoId)
            .filter(e => {
                if (!buscar) return true;
                const fullName = `${e.nombre || ''} ${e.apellido || ''}`;
                return normalize(fullName).includes(normalize(buscar)) ||
                       normalize(e.nombre || '').includes(normalize(buscar)) ||
                       normalize(e.apellido || '').includes(normalize(buscar));
            });

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

            const isDefault = est.nombre === 'Nuevo' && est.apellido === 'Estudiante';
            const displayName = isDefault ? `Estudiante ${filtered.findIndex(e => e.id === est.id) + 1}` : `${est.nombre} ${est.apellido}`;

            const califsMap: Record<number, number | null> = {};
            actividades.forEach(a => {
                califsMap[a.id] = localCalifs.find(c => c.estudianteId === est.id && c.actividadId === a.id)?.puntaje ?? null;
            });

            return { ...est, bcValues, promTotal, destaca, displayName, calificaciones: califsMap };
        });
    }, [state.estudiantes, state.cursos, curso, centroContexto, cursoId, buscar, actividades, bcSel, localCalifs, localRecs, selectedPeriodo]);

    const finalFilteredEstudiantes = useMemo(() => {
        if (!showRecoveryOnly) return enhancedEstudiantes.sort((a, b) => (a.numeroLista || 0) - (b.numeroLista || 0));
        return enhancedEstudiantes.filter(est => est.bcValues.some(v => v.avg !== null && v.avg < 70));
    }, [enhancedEstudiantes, showRecoveryOnly]);

    const setCalif = useCallback((estId: number, actId: number, val: number | null) => {
        setIsDirty(true);
        setLocalCalifs(prev => {
            const idx = prev.findIndex(c => c.estudianteId === estId && c.actividadId === actId);
            if (idx >= 0) return prev.map((c, i) => i === idx ? { ...c, puntaje: val } : c);
            const act = state.actividades.find(a => a.id === actId);
            return [...prev, {
                estudianteId: estId,
                actividadId: actId,
                puntaje: val,
                recuperacion: null,
                cursoId: cursoId,
                sharedCourseId: sharedCourseId,
                userId: currentUserId!,
                asignatura: act?.asignatura || myAsignatura,
                periodo: act?.periodo || 'P1',
                competencias: (act?.bcAsignados && act.bcAsignados.length > 0) ? act.bcAsignados : ['BC1'],
                descriptores: []
            }];
        });
    }, [state.actividades, cursoId, sharedCourseId, currentUserId, myAsignatura]);

    const setRec = useCallback((estId: number, bc: 1 | 2 | 3 | 4, val: number | null) => {
        console.log(`[DEBUG] 1. El usuario introduce la nota. estId: ${estId}, BC: ${bc}, val: ${val}`);
        setIsDirty(true);
        setLocalRecs(prev => {
            console.log('[DEBUG] 2. setRec() actualiza localRecs');
            const idx = prev.findIndex(r => r.estudianteId === estId && r.bc === bc && r.periodo === selectedPeriodo);
            if (idx >= 0) return prev.map((r, i) => i === idx ? { ...r, puntaje: val } : r);
            return [...prev, { 
                estudianteId: estId, 
                bc, 
                cursoId: cursoId, 
                puntaje: val, 
                periodo: selectedPeriodo,
                userId: currentUserId,
                asignatura: myAsignatura,
                sharedCourseId: sharedCourseId
            }];
        });
    }, [cursoId, selectedPeriodo, currentUserId, myAsignatura, sharedCourseId]);

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

    return {
        curso,
        selectedPeriodo,
        setSelectedPeriodo,
        buscar,
        setBuscar,
        isPointMode,
        setIsPointMode,
        showRecoveryOnly,
        setShowRecoveryOnly,
        activePaintColor,
        setActivePaintColor,
        rubricTarget,
        setRubricTarget,
        isSaving,
        setIsSaving,
        isDragging,
        setIsDragging,
        focusedCell,
        setFocusedCell,
        isFullScreen,
        setIsFullScreen,
        gradeAnimations,
        localCalifs,
        localRecs,
        bcSel,
        setBcSel,
        actividades,
        enhancedEstudiantes: finalFilteredEstudiantes,
        setCalif,
        setRec,
        triggerAnimation,
        isDirty,
        setIsDirty,
        myAsignatura,
        sharedCourseId
    };
}
