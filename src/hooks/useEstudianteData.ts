import { useState, useMemo } from 'react';
import type { AppState, Skill, CursoDocente } from '../types';

interface Params {
    state: AppState;
    selectedId: number;
    currentCourseRole?: CursoDocente;
    currentUserId?: string;
}

export function useEstudianteData({ state, selectedId, currentCourseRole, currentUserId }: Params) {
    const [periodo, setPeriodo] = useState<string>('P1');
    const [activeTab, setActiveTab] = useState<'Perfil' | 'Evaluación'>('Perfil');
    const [habilidades, setHabilidades] = useState<Record<number, Skill[]>>({});

    const est = state.estudiantes.find(e => e.id === selectedId);
    const curso = est ? state.cursos.find(c => c.id === est.cursoId) : null;

    const studentHabilidades = est ? habilidades[est.id] || [] : [];

    const handleAddHabilidad = (selectedHabText: string) => {
        if (!est) return;
        if (studentHabilidades.length >= 10) return;
        if (studentHabilidades.find(h => h.text === selectedHabText)) {
            alert("Habilidad ya registrada.");
            return;
        }
        setHabilidades(prev => ({
            ...prev,
            [est.id]: [...(prev[est.id] || []), { text: selectedHabText }]
        }));
    };

    const removeHabilidad = (index: number) => {
        if (!est) return;
        setHabilidades(prev => ({
            ...prev,
            [est.id]: prev[est.id].filter((_, i) => i !== index)
        }));
    };

    const { promedioPeriodo, rankingPeriodo } = useMemo(() => {
        if (!est || !curso) return { promedioPeriodo: '0.0', rankingPeriodo: '-' };

        const actsPeriodo = state.actividades.filter(a => {
            const actCurso = state.cursos.find(c => c.id === a.cursoId);
            const isMatch = (actCurso?.sharedCourseId === est.sharedCourseId || a.cursoId === curso.id) && a.periodo === periodo;
            const actAsignatura = a.asignatura || actCurso?.asignatura || '';
            const matchesRole = !currentCourseRole || actAsignatura === currentCourseRole.asignatura;
            return isMatch && matchesRole;
        });
        
        const sum = actsPeriodo.reduce((acc, a) => acc + (state.calificaciones.find(c => c.actividadId === a.id && c.estudianteId === est.id)?.puntaje ?? 0), 0);
        // Only average activities that actually have a grade to be fair and accurate, similar to gradesMap
        const gradedActs = actsPeriodo.filter(a => {
            const val = state.calificaciones.find(c => c.actividadId === a.id && c.estudianteId === est.id)?.puntaje;
            return val !== undefined && val !== null;
        });
        
        const prom = gradedActs.length > 0 ? (sum / gradedActs.length).toFixed(1) : '0.0';

        const filteredEsts = state.estudiantes.filter(e => e.sharedCourseId === curso.sharedCourseId || e.cursoId === curso.id);

        const rankings = filteredEsts.map(e => {
            const eActs = state.actividades.filter(a => {
                const actCurso = state.cursos.find(cx => cx.id === a.cursoId);
                const isMatch = (actCurso?.sharedCourseId === est.sharedCourseId || a.cursoId === curso.id) && a.periodo === periodo;
                const actAsignatura = a.asignatura || actCurso?.asignatura || '';
                const matchesRole = !currentCourseRole || actAsignatura === currentCourseRole.asignatura;
                return isMatch && matchesRole;
            });
            const eGradedActs = eActs.filter(a => {
                const val = state.calificaciones.find(cal => cal.estudianteId === e.id && cal.actividadId === a.id)?.puntaje;
                return val !== undefined && val !== null;
            });
            const eSuma = eGradedActs.reduce((acc, a) => acc + (state.calificaciones.find(cal => cal.estudianteId === e.id && cal.actividadId === a.id)?.puntaje ?? 0), 0);
            return { id: e.id, prom: eGradedActs.length > 0 ? eSuma / eGradedActs.length : 0 };
        }).sort((a, b) => b.prom - a.prom);

        const rankIndex = rankings.findIndex(r => r.id === est.id);
        return { promedioPeriodo: prom, rankingPeriodo: rankIndex >= 0 ? `#${rankIndex + 1}` : '-' };
    }, [est, curso, periodo, state.estudiantes, state.actividades, state.calificaciones, currentCourseRole]);

    const actividadesPeriodo = useMemo(() => {
        if (!est || !curso) return [];
        const res = state.actividades.filter(a => {
            const actCurso = state.cursos.find(c => c.id === a.cursoId);
            const isMatch = (actCurso?.sharedCourseId === est.sharedCourseId || a.cursoId === curso.id) && a.periodo === periodo;
            const actAsignatura = a.asignatura || actCurso?.asignatura || '';
            const matchesRole = !currentCourseRole || actAsignatura === currentCourseRole.asignatura;
            return isMatch && matchesRole;
        }).sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());
        console.log(`[DIAG][SCREEN] Estudiante cursoId=${curso.id} estudianteId=${est.id} sharedCourseId=${est.sharedCourseId ?? 'sin-shared'} periodo=${periodo} actividadesConsumidas=${res.length} calificacionesGlobal=${state.calificaciones.length} ts=${new Date().toISOString()}`);
        return res;
    }, [est, curso, periodo, state.cursos, state.actividades, currentCourseRole]);

    const incidenciasEstudiante = useMemo(() => {
        if (!est) return [];
        return state.incidencias.filter(i => {
            const isStudent = i.estudianteId === est.id;
            const isMyIncidencia = !currentUserId || i.userId === currentUserId;
            return isStudent && isMyIncidencia;
        });
    }, [est, state.incidencias, currentUserId]);

    return {
        periodo,
        setPeriodo,
        activeTab,
        setActiveTab,
        est,
        curso,
        studentHabilidades,
        handleAddHabilidad,
        removeHabilidad,
        promedioPeriodo,
        rankingPeriodo,
        actividadesPeriodo,
        incidenciasEstudiante
    };
}
