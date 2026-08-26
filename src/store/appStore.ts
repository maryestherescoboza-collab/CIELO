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
    authInitialized: boolean;
    
    // UI State
    darkMode: boolean;
    selectedCursoId: number | null;
    selectedEstudianteId: number | null;
    selectedActividadId: number | null;
    selectedPeriodo: string;
    searchQuery: string;
    showProfileSettings: boolean;
    
    loadedModules: string[];
    loadedCursos: number[];

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
    setAuthInitialized: (authInitialized: boolean) => void;
    setLoading: (loading: boolean) => void;
    setDarkMode: (darkMode: boolean | ((prev: boolean) => boolean)) => void;
    setSelectedCursoId: (id: number | null) => void;
    setSelectedEstudianteId: (id: number | null) => void;
    setSelectedActividadId: (id: number | null) => void;
    setSelectedPeriodo: (periodo: string) => void;
    setSearchQuery: (query: string) => void;
    setShowProfileSettings: (show: boolean) => void;
    
    addLoadedModule: (module: string) => void;
    addLoadedCurso: (cursoId: number) => void;

    setGenericToast: (toast: { message: string; type: 'success' | 'warning' | 'info' | 'error' } | null) => void;
    setSearchResults: (results: SearchResults | null) => void;

    addFloatingRubric: (descriptorId: string, cursoId: number, actividadId: number) => void;
    removeFloatingRubric: (id: string) => void;
    updateFloatingRubric: (id: string, updates: Partial<FloatingRubricWindow>) => void;
}

// [TEMPORAL - DIAGNÓSTICO] Trazabilidad de cada cambio del estado compartido de incidencias.
const traceCambioIncidencias = (prev: AppState, next: AppState) => {
    const prevList = prev.incidencias || [];
    const nextList = next.incidencias || [];
    if (prevList === nextList) return;
    const prevIds = prevList.map(i => i.id);
    const nextIds = nextList.map(i => i.id);
    if (prevIds.join(',') === nextIds.join(',')) return;
    const bajas = prevIds.filter(id => !nextIds.includes(id));
    const altas = nextIds.filter(id => !prevIds.includes(id));
    const origen = (new Error().stack || '')
        .split('\n')
        .filter(l => l.includes('at ') && !l.includes('appStore') && !l.includes('traceCambioIncidencias') && !l.includes('zustand'))
        .slice(0, 3)
        .join(' <- ');
    console.warn(`[TRACE INCIDENCIAS] ANTES=${prevIds.length} [${prevIds.join(',')}] | DESPUÉS=${nextIds.length} [${nextIds.join(',')}] | ALTAS=[${altas.join(',')}] BAJAS=[${bajas.join(',')}] | ORIGEN: ${origen}`);
};

export const useAppStore = create<AppStore>()(
  persist(
    (set) => ({
        // Data State
        state: initialState,
        session: null,
        loading: false, // Start false, use authInitialized for initial splash
        authInitialized: false,

        // UI State
        darkMode: false,
        selectedCursoId: null,
        selectedEstudianteId: null,
        selectedActividadId: null,
        selectedPeriodo: 'P1',
        searchQuery: '',
        showProfileSettings: false,
        
        loadedModules: [],
        loadedCursos: [],

        genericToast: null,
        searchResults: null,

        floatingRubrics: [],

        activeRubricSelection: {},
        activeRubricMultiEvaluations: {},
        activeRubricActiveCell: null,
        activeRubricDescriptors: [],
        activeRubricNiveles: [],

        // Actions
        setAppState: (updater: AppState | ((prev: AppState) => AppState)) => set((prev: AppStore) => {
            const nextState = typeof updater === 'function' ? updater(prev.state) : updater;
            traceCambioIncidencias(prev.state, nextState);
            return { state: nextState };
        }),
        setState: (updater: AppState | ((prev: AppState) => AppState)) => set((prev: AppStore) => {
            const nextState = typeof updater === 'function' ? updater(prev.state) : updater;
            traceCambioIncidencias(prev.state, nextState);
            return { state: nextState };
        }),
        setSession: (session: Session | null) => set((s: AppStore) => {
            const userChanged = s.session?.user?.id !== session?.user?.id;
            if (userChanged) {
                return { session, loadedModules: [], loadedCursos: [] };
            }
            return { session };
        }),
        setAuthInitialized: (authInitialized: boolean) => set({ authInitialized }),
        setLoading: (loading: boolean) => set({ loading }),
        setDarkMode: (updater: boolean | ((prev: boolean) => boolean)) => set((prev: AppStore) => ({
            darkMode: typeof updater === 'function' ? updater(prev.darkMode) : updater
        })),
        setSelectedCursoId: (selectedCursoId: number | null) => set({ selectedCursoId }),
        setSelectedEstudianteId: (selectedEstudianteId: number | null) => set({ selectedEstudianteId }),
        setSelectedActividadId: (selectedActividadId: number | null) => set({ selectedActividadId }),
        setSelectedPeriodo: (selectedPeriodo: string) => set({ selectedPeriodo }),
        setSearchQuery: (searchQuery: string) => set({ searchQuery }),
        setShowProfileSettings: (showProfileSettings: boolean) => set({ showProfileSettings }),
        
        addLoadedModule: (module: string) => set((s: AppStore) => {
            if (s.loadedModules.includes(module)) return {};
            return { loadedModules: [...s.loadedModules, module] };
        }),
        addLoadedCurso: (cursoId: number) => set((s: AppStore) => {
            if (s.loadedCursos.includes(cursoId)) return {};
            return { loadedCursos: [...s.loadedCursos, cursoId] };
        }),

        setGenericToast: (genericToast: { message: string; type: 'success' | 'warning' | 'info' | 'error' } | null) => set({ genericToast }),
        setSearchResults: (searchResults: SearchResults | null) => set({ searchResults }),

        addFloatingRubric: (descriptorId: string, cursoId: number, actividadId: number) => set((state: AppStore) => {
            const id = `float-comp-${descriptorId}`;
            const existing = state.floatingRubrics.find((w: FloatingRubricWindow) => w.id === id);
            if (existing) {
                // Bring to front by moving it to the end of the array
                const filtered = state.floatingRubrics.filter((w: FloatingRubricWindow) => w.id !== id);
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
        removeFloatingRubric: (id: string) => set((state: AppStore) => ({
            floatingRubrics: state.floatingRubrics.filter((w: FloatingRubricWindow) => w.id !== id)
        })),
        updateFloatingRubric: (id: string, updates: Partial<FloatingRubricWindow>) => set((state: AppStore) => ({
            floatingRubrics: state.floatingRubrics.map((w: FloatingRubricWindow) => w.id === id ? { ...w, ...updates } : w)
        })),
    }),
    {
      name: 'terra-cognita-storage',
      partialize: (state) => ({ 
        selectedCursoId: state.selectedCursoId, 
        selectedEstudianteId: state.selectedEstudianteId,
        selectedPeriodo: state.selectedPeriodo,
        darkMode: state.darkMode
      }),
      merge: (persistedState: any, currentState: any) => {
        // Only merge the keys we explicitly partialize, discarding any legacy corrupted state
        return {
          ...currentState,
          selectedCursoId: persistedState?.selectedCursoId ?? currentState.selectedCursoId,
          selectedEstudianteId: persistedState?.selectedEstudianteId ?? currentState.selectedEstudianteId,
          selectedPeriodo: persistedState?.selectedPeriodo ?? currentState.selectedPeriodo ?? 'P1',
          darkMode: persistedState?.darkMode ?? currentState.darkMode,
        };
      },
    }
  )
);

