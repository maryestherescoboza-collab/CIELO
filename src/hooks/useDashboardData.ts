import { useMemo } from 'react';
import type { AppState, BCKey } from '../types';

export function useDashboardData(state: AppState, selectedCourseId: number | 'all') {
    const today = new Date().toISOString().split('T')[0];

    const sharedCourseIds = useMemo(() => 
        new Set(state.cursos.map(c => c.sharedCourseId).filter(Boolean)), 
    [state.cursos]);

    const myStudents = useMemo(() => {
        let res = state.estudiantes.filter(e => 
            sharedCourseIds.has(e.sharedCourseId) || 
            state.cursos.some(c => c.id === e.cursoId)
        );
        if (selectedCourseId !== 'all') {
            res = res.filter(e => e.cursoId === selectedCourseId);
        }
        return res;
    }, [state.estudiantes, sharedCourseIds, state.cursos, selectedCourseId]);

    const filteredActividades = useMemo(() => {
        if (selectedCourseId === 'all') return state.actividades;
        return state.actividades.filter(a => a.cursoId === selectedCourseId);
    }, [state.actividades, selectedCourseId]);

    const filteredCalificaciones = useMemo(() => {
        const studentIds = new Set(myStudents.map(s => s.id));
        return state.calificaciones.filter(c => studentIds.has(c.estudianteId));
    }, [state.calificaciones, myStudents]);

    const totalEstudiantes = myStudents.length;
    const actividadesEvaluadas = filteredCalificaciones.filter(c => c.puntaje !== null).length;
    const totalCursos = selectedCourseId === 'all' ? state.cursos.length : 1;

    const avgBC = (bc: BCKey) => {
        const actsBc = filteredActividades.filter(a => a.bcAsignados?.includes(bc));
        const actsIds = new Set(actsBc.map(a => a.id));
        const scores = filteredCalificaciones.filter(c => 
            actsIds.has(c.actividadId) && 
            c.competencias?.includes(bc) && 
            c.puntaje !== null
        ).map(c => c.puntaje as number);
        
        if (scores.length === 0) return 0;
        return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
    };

    const avgBC1 = avgBC('BC1');
    const avgBC2 = avgBC('BC2');
    const avgBC3 = avgBC('BC3');
    const avgBC4 = avgBC('BC4');
    const avgGeneral = Math.round((avgBC1 + avgBC2 + avgBC3 + avgBC4) / 4);

    const estudiantesRiesgoUnicos = new Set(
        filteredCalificaciones
            .filter(c => c.puntaje !== null && c.puntaje < 70)
            .map(c => c.estudianteId)
    );
    
    const enRiesgo = myStudents.filter(e => e.enRiesgo || estudiantesRiesgoUnicos.has(e.id));

    const getUpcomingEvents = (selectedDate: string | null) => {
        return [
            ...state.eventos.map(e => ({ 
                id: `evt-${e.id}`, 
                originalId: e.id, 
                titulo: e.titulo, 
                fecha: e.fecha, 
                tipo: e.tipo, 
                isActivity: false, 
                cursoId: undefined 
            })),
            ...state.actividades.map(a => ({ 
                id: `act-${a.id}`, 
                originalId: a.id, 
                titulo: a.nombre, 
                fecha: a.fecha, 
                tipo: 'actividad' as const, 
                isActivity: true, 
                cursoId: a.cursoId 
            }))
        ]
        .filter(e => {
            if (selectedDate) return e.fecha >= selectedDate;
            return e.fecha >= today;
        })
        .sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime())
        .slice(0, 4);
    };

    return {
        myStudents,
        filteredActividades,
        filteredCalificaciones,
        totalEstudiantes,
        actividadesEvaluadas,
        totalCursos,
        avgGeneral,
        enRiesgo,
        getUpcomingEvents
    };
}
