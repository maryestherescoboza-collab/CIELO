import { useMemo } from 'react';
import type { AppState, BCKey } from '../types';

export function useDashboardData(state: AppState, selectedCourseId: number | 'all', userId?: string) {
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
        const base = state.actividades.filter(a => a.userId === userId || !a.userId);
        if (selectedCourseId === 'all') return base;
        return base.filter(a => a.cursoId === selectedCourseId);
    }, [state.actividades, selectedCourseId, userId]);

    const filteredCalificaciones = useMemo(() => {
        const studentIds = new Set(myStudents.map(s => s.id));
        return state.calificaciones.filter(c => studentIds.has(c.estudianteId));
    }, [state.calificaciones, myStudents]);

    const filteredIncidencias = useMemo(() => {
        const studentIds = new Set(myStudents.map(s => s.id));
        return state.incidencias.filter(i => studentIds.has(i.estudianteId));
    }, [state.incidencias, myStudents]);

    const totalEstudiantes = myStudents.length;
    const actividadesEvaluadas = filteredCalificaciones.filter(c => c.puntaje !== null).length;
    const incidenciasCount = filteredIncidencias.length;
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
        return ([
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
            })),
            ...state.tareas.filter(t => !userId || t.asignaciones?.some(asig => asig.docenteId === userId)).map(t => ({
                id: `tar-${t.id}`,
                originalId: t.id,
                titulo: t.titulo,
                fecha: t.fechaLimite || today,
                tipo: 'tarea' as const,
                isActivity: false,
                cursoId: undefined
            })),
            ...(state.calendarioMinerd || []).map(e => ({
                id: `minerd-${e.id}`,
                originalId: e.id,
                titulo: e.titulo,
                fecha: e.fechaInicio || e.fecha || today,
                fechaFin: e.fechaFin,
                tipo: e.tipo,
                isActivity: false,
                cursoId: undefined,
                isMinerd: true,
                descripcion: e.descripcion
            }))
        ] as {
            id: string;
            originalId: number | string;
            titulo: string;
            fecha: string;
            fechaFin?: string;
            tipo: string;
            isActivity: boolean;
            cursoId?: number;
            isMinerd?: boolean;
            descripcion?: string;
        }[])
        .filter(e => {
            const refDate = selectedDate || today;
            if ('isMinerd' in e && e.isMinerd) {
                return e.fechaFin ? e.fechaFin >= refDate : e.fecha >= refDate;
            }
            return e.fecha >= refDate;
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
        incidenciasCount,
        totalCursos,
        avgGeneral,
        enRiesgo,
        getUpcomingEvents
    };
}
