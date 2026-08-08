import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Session } from '@supabase/supabase-js';
import type { AppState, SearchResults, FloatingRubricWindow, Nivel } from '../types';
import { initialState } from '../data/mockData';

interface AppStore {
    // Data State
    state: AppState;
    session: Session | null;
    loading: boolean;
    
    // UI State
    darkMode: boolean;
    selectedCursoId: number | null;
    selectedEstudianteId: number | null;
    selectedActividadId: number | null;
    searchQuery: string;
    showProfileSettings: boolean;

    genericToast: { message: string; type: 'success' | 'warning' | 'info' | 'error' } | null;
    searchResults: SearchResults | null;

    floatingRubrics: FloatingRubricWindow[];

    activeRubricSelection: Record<string, Nivel>;
    activeRubricMultiEvaluations: Record<number, Record<string, Nivel>>;
    activeRubricActiveCell: { id: string; nivel: Nivel } | null;
    activeRubricDescriptors: any[];
    activeRubricNiveles: any[];

    // Actions
    setAppState: (state: AppState | ((prev: AppState) => AppState)) => void;
    setState: (state: AppState | ((prev: AppState) => AppState)) => void;
    setSession: (session: Session | null) => void;
    setLoading: (loading: boolean) => void;
    setDarkMode: (darkMode: boolean | ((prev: boolean) => boolean)) => void;
    setSelectedCursoId: (id: number | null) => void;
    setSelectedEstudianteId: (id: number | null) => void;
    setSelectedActividadId: (id: number | null) => void;
    setSearchQuery: (query: string) => void;
    setShowProfileSettings: (show: boolean) => void;

    setGenericToast: (toast: { message: string; type: 'success' | 'warning' | 'info' | 'error' } | null) => void;
    setSearchResults: (results: SearchResults | null) => void;

    addFloatingRubric: (descriptorId: string, cursoId: number, actividadId: number) => void;
    removeFloatingRubric: (id: string) => void;
    updateFloatingRubric: (id: string, updates: Partial<FloatingRubricWindow>) => void;
}

export const useAppStore = create<AppStore>()(
  persist(
    (set) => ({
        // Data State
        state: initialState,
        session: null,
        loading: true,

        // UI State
        darkMode: false,
        selectedCursoId: null,
        selectedEstudianteId: null,
        selectedActividadId: null,
        searchQuery: '',
        showProfileSettings: false,

        genericToast: null,
        searchResults: null,

        floatingRubrics: [],

        activeRubricSelection: {},
        activeRubricMultiEvaluations: {},
        activeRubricActiveCell: null,
        activeRubricDescriptors: [],
        activeRubricNiveles: [],

        // Actions
        setAppState: (updater) => set((prev) => ({
            state: typeof updater === 'function' ? updater(prev.state) : updater
        })),
        setState: (updater) => set((prev) => ({
            state: typeof updater === 'function' ? updater(prev.state) : updater
        })),
        setSession: (session) => set({ session }),
        setLoading: (loading) => set({ loading }),
        setDarkMode: (updater) => set((prev) => ({
            darkMode: typeof updater === 'function' ? updater(prev.darkMode) : updater
        })),
        setSelectedCursoId: (selectedCursoId) => set({ selectedCursoId }),
        setSelectedEstudianteId: (selectedEstudianteId) => set({ selectedEstudianteId }),
        setSelectedActividadId: (selectedActividadId) => set({ selectedActividadId }),
        setSearchQuery: (searchQuery) => set({ searchQuery }),
        setShowProfileSettings: (showProfileSettings) => set({ showProfileSettings }),

        setGenericToast: (genericToast) => set({ genericToast }),
        setSearchResults: (searchResults: SearchResults | null) => set({ searchResults }),

        addFloatingRubric: (descriptorId, cursoId, actividadId) => set((state) => {
            const id = `float-comp-${descriptorId}`;
            const existing = state.floatingRubrics.find(w => w.id === id);
            if (existing) {
                // Bring to front by moving it to the end of the array
                const filtered = state.floatingRubrics.filter(w => w.id !== id);
                return { floatingRubrics: [...filtered, existing] };
            }
            const newWindow: FloatingRubricWindow = {
                id,
                descriptorId,
                cursoId,
                actividadId,
                position: { x: 100 + state.floatingRubrics.length * 25, y: 150 + state.floatingRubrics.length * 25 }
            };
            return { floatingRubrics: [...state.floatingRubrics, newWindow] };
        }),
        removeFloatingRubric: (id) => set((state) => ({
            floatingRubrics: state.floatingRubrics.filter(w => w.id !== id)
        })),
        updateFloatingRubric: (id, updates) => set((state) => ({
            floatingRubrics: state.floatingRubrics.map(w => w.id === id ? { ...w, ...updates } : w)
        })),
    }),
    {
      name: 'terra-cognita-storage',
      partialize: (state) => ({ 
        selectedCursoId: state.selectedCursoId, 
        selectedEstudianteId: state.selectedEstudianteId,
        darkMode: state.darkMode
      }),
      merge: (persistedState: any, currentState: any) => {
        // Only merge the keys we explicitly partialize, discarding any legacy corrupted state
        return {
          ...currentState,
          selectedCursoId: persistedState?.selectedCursoId ?? currentState.selectedCursoId,
          selectedEstudianteId: persistedState?.selectedEstudianteId ?? currentState.selectedEstudianteId,
          darkMode: persistedState?.darkMode ?? currentState.darkMode,
        };
      },
    }
  )
);

