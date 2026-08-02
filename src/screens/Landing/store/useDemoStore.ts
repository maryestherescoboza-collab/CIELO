import { create } from 'zustand';
import { generateInitialGrades, generateInitialRubricSelections, generateInitialCotejoChecks } from '../data/demoData';

interface DemoState {
  periodo: 'P1' | 'P2' | 'P3' | 'P4';
  setPeriodo: (p: 'P1' | 'P2' | 'P3' | 'P4') => void;
  
  grades: Record<string, number>; // key: studentId-activityId
  updateGrade: (studentId: number, activityId: number, newScore: number) => void;
  
  rubricSelections: Record<string, Record<number, number>>; // studentId-activityId -> critId -> levelId
  setRubricSelection: (studentId: number, activityId: number, critId: number, levelId: number, score: number) => void;

  cotejoChecks: Record<string, Record<number, boolean>>; // studentId-activityId -> critId -> boolean
  toggleCotejoCheck: (studentId: number, activityId: number, critId: number) => void;
}

export const useDemoStore = create<DemoState>((set) => ({
  periodo: 'P1',
  setPeriodo: (p) => set({ periodo: p }),
  
  grades: generateInitialGrades(),
  updateGrade: (sId, aId, score) => set((state) => ({
    grades: { ...state.grades, [`${sId}-${aId}`]: score }
  })),

  rubricSelections: generateInitialRubricSelections(),
  setRubricSelection: (sId, aId, critId, levelId, score) => set((state) => {
    const key = `${sId}-${aId}`;
    const current = state.rubricSelections[key] || {};
    return {
      rubricSelections: {
        ...state.rubricSelections,
        [key]: { ...current, [critId]: levelId }
      },
      // Note: In a real app we recalculate the weighted average. Here for demo we just update the total score directly for visual feedback.
      grades: { ...state.grades, [key]: score }
    };
  }),

  cotejoChecks: generateInitialCotejoChecks(),
  toggleCotejoCheck: (sId, aId, critId) => set((state) => {
    const key = `${sId}-${aId}`;
    const current = state.cotejoChecks[key] || {};
    const newValue = !current[critId];
    return {
      cotejoChecks: {
        ...state.cotejoChecks,
        [key]: { ...current, [critId]: newValue }
      }
    };
  }),
}));
