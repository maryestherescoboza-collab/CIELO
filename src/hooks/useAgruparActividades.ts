import { useMemo } from 'react';
import { useAppStore } from '../store/appStore';
import type { Actividad } from '../types';

export interface GrupoActividades {
    cursoId: number;
    cursoName: string;
    asignatura: string;
    periodo: string;
    actividades: Actividad[];
}

export function useAgruparActividades() {
    const state = useAppStore((s: any) => s.state);
    const session = useAppStore((s: any) => s.session);

    const groups = useMemo(() => {
        const initialAcc: Record<string, GrupoActividades> = {};
        const isMine = (act: Actividad) => !session?.user?.id || act.userId === session?.user?.id || !act.userId;
        const acc = (state.actividades as Actividad[]).filter(isMine).reduce((acc, act) => {
            const curso = (state.cursos as any[]).find(c => c.id === act.cursoId);
            if (!curso) return acc;
            
            const asignatura = act.asignatura || curso.asignatura || 'Sin asignatura';
            const periodo = act.periodo || curso.periodo || 'P2';
            const key = `${curso.id}|${asignatura}|${periodo}`;
            
            if (!acc[key]) {
                acc[key] = {
                    cursoId: curso.id,
                    cursoName: `${curso.grado} ${curso.seccion}`,
                    asignatura,
                    periodo,
                    actividades: []
                };
            }
            acc[key].actividades.push(act);
            return acc;
        }, initialAcc);

        return acc;
    }, [state.actividades, state.cursos]);

    const groupList = useMemo(() => {
        return Object.entries(groups).sort((a, b) => a[1].cursoName.localeCompare(b[1].cursoName)) as [string, GrupoActividades][];
    }, [groups]);

    return {
        groups,
        groupList
    };
}
