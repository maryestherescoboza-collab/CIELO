import { create } from 'zustand';
import type { AppState, Nivel, FloatingRubricWindow, CalificacionActividad, RecuperacionBC, EvaluacionRubrica } from '../../../types';
import { simulatorData } from '../data/simulatorData';

interface SimulatorStore {
    state: AppState;
    
    // UI State needed for RubricaModal and others
    darkMode: boolean;
    activeRubricSelection: Record<string, Nivel>;
    activeRubricMultiEvaluations: Record<number, Record<string, Nivel>>;
    activeRubricActiveCell: { id: string; nivel: Nivel } | null;
    activeRubricDescriptors: any[];
    activeRubricNiveles: any[];
    genericToast: { message: string; type: 'success' | 'warning' | 'info' | 'error' } | null;
    floatingRubrics: FloatingRubricWindow[];

    // Actions
    setAppState: (state: AppState | ((prev: AppState) => AppState)) => void;
    
    // Mutations for the simulation
    saveCalificaciones: (califs: CalificacionActividad[], recs: RecuperacionBC[], cursoId: number) => Promise<any>;
    saveevaluacionesRubrica: (detalles: EvaluacionRubrica[]) => Promise<any>;
}

export const useSimulatorStore = create<SimulatorStore>((set) => ({
    state: simulatorData,
    
    darkMode: false,
    activeRubricSelection: {},
    activeRubricMultiEvaluations: {},
    activeRubricActiveCell: null,
    activeRubricDescriptors: [],
    activeRubricNiveles: [],
    genericToast: null,
    floatingRubrics: [],

    setAppState: (update) => set((s) => ({ 
        state: typeof update === 'function' ? update(s.state) : update 
    })),

    saveCalificaciones: async (califs, recs) => {
        set((s) => {
            const newState = { ...s.state };
            
            // Upsert calificaciones
            califs.forEach(c => {
                const existingIdx = newState.calificaciones.findIndex(
                    (ex: any) => ex.estudianteId === c.estudianteId && ex.actividadId === c.actividadId
                );
                if (existingIdx >= 0) {
                    newState.calificaciones[existingIdx] = c;
                } else {
                    newState.calificaciones.push(c);
                }
            });

            // Upsert recuperaciones
            recs.forEach(r => {
                const existingIdx = newState.recuperaciones.findIndex(
                    (ex: any) => ex.estudianteId === r.estudianteId && ex.cursoId === r.cursoId && ex.periodo === r.periodo && ex.bc === r.bc
                );
                if (existingIdx >= 0) {
                    newState.recuperaciones[existingIdx] = r;
                } else {
                    newState.recuperaciones.push(r);
                }
            });

            return { state: newState };
        });
        return Promise.resolve();
    },

    saveevaluacionesRubrica: async (detalles) => {
        set((s) => {
            const newState = { ...s.state };
            detalles.forEach(d => {
                const existingIdx = newState.evaluacionesRubrica.findIndex(
                    (ex: any) => ex.estudianteId === d.estudianteId && ex.actividadId === d.actividadId
                );
                if (existingIdx >= 0) {
                    newState.evaluacionesRubrica[existingIdx] = d;
                } else {
                    newState.evaluacionesRubrica.push(d);
                }
            });
            return { state: newState };
        });
        return Promise.resolve();
    }
}));
