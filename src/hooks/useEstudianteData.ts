import { useState, useMemo } from 'react';
import type { AppState, Skill } from '../types';

interface Params {
    state: AppState;
    selectedId: number;
}

export function useEstudianteData({ state, selectedId }: Params) {
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
            return (actCurso?.sharedCourseId === est.sharedCourseId || a.cursoId === curso.id) && a.periodo === periodo;
        });
        const sum = actsPeriodo.reduce((acc, a) => acc + (state.calificaciones.find(c => c.actividadId === a.id && c.estudianteId === est.id)?.puntaje ?? 0), 0);
        const prom = actsPeriodo.length > 0 ? (sum / actsPeriodo.length).toFixed(1) : '0.0';

        const filteredEsts = state.estudiantes.filter(e => e.sharedCourseId === curso.sharedCourseId || e.cursoId === curso.id);

        const rankings = filteredEsts.map(e => {
            const eActs = state.actividades.filter(a => (state.cursos.find(cx => cx.id === a.cursoId)?.sharedCourseId === est.sharedCourseId || a.cursoId === curso.id) && a.periodo === periodo);
            const eSuma = eActs.reduce((acc, a) => acc + (state.calificaciones.find(cal => cal.estudianteId === e.id && cal.actividadId === a.id)?.puntaje ?? 0), 0);
            return { id: e.id, prom: eActs.length > 0 ? eSuma / eActs.length : 0 };
        }).sort((a, b) => b.prom - a.prom);

        const rankIndex = rankings.findIndex(r => r.id === est.id);
        return { promedioPeriodo: prom, rankingPeriodo: rankIndex >= 0 ? `#${rankIndex + 1}` : '-' };
    }, [est, curso, periodo, state.estudiantes, state.actividades, state.calificaciones]);

    const actividadesPeriodo = useMemo(() => {
        if (!est || !curso) return [];
        return state.actividades.filter(a => {
            const actCurso = state.cursos.find(c => c.id === a.cursoId);
            return actCurso?.sharedCourseId === est.sharedCourseId && a.periodo === periodo;
        }).sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());
    }, [est, curso, periodo, state.cursos, state.actividades]);

    const incidenciasEstudiante = est ? state.incidencias.filter(i => i.estudianteId === est.id) : [];

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
