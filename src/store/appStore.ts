import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Session } from '@supabase/supabase-js';
import type { AppState, SearchResults, FloatingRubricWindow, Nivel, Centro, Curso, CursoDocente, Plantilla, Actividad, CalificacionActividad, Secuencia } from '../types';
import { initialState } from '../data/mockData';

export interface CentroCacheEntry {
    centroId: string;
    data: Centro;
    cachedAt: number;
    expiresAt: number;
}

export interface PerfilCacheEntry {
    userId: string;
    data: {
        nombre?: string;
        avatar_url?: string;
        nombre_docente?: string;
        centro_id?: string | null;
        rol?: string;
    };
    cachedAt: number;
    expiresAt: number;
}

export interface CursoCacheData {
    cursos: Curso[];
    cursoDocentes: CursoDocente[];
}

export interface CursoCacheEntry {
    /** Clave compuesta `${userId}:${centroId}` para aislar por usuario y centro. */
    key: string;
    userId: string;
    centroId?: string;
    /** Cursos ya filtrados para el usuario + sus relaciones de docente activas. */
    data: CursoCacheData;
    cachedAt: number;
    expiresAt: number;
}

export interface PlantillaCacheEntry {
    /** Clave `${userId}`: una plantilla pertenece a su creador, aislado por user_id. */
    key: string;
    userId: string;
    /** Colección de plantillas activas del usuario, exactamente como se guardan en Zustand. */
    data: Plantilla[];
    cachedAt: number;
    expiresAt: number;
}

/**
 * Slice EN MEMORIA del caché académico por curso + período (Paso 7).
 * Almacena SOLO datos fuente (actividades + calificaciones) de un curso en un
 * período. Los períodos son conjuntos independientes: P1 en caché NO implica
 * P2/P3/P4. Por diseño NO se persiste en `localStorage` (el estado académico
 * masivo no debe copiarse al almacenamiento persistente).
 */
export interface AcademicCacheEntry {
    /** Clave `${userId}:${centroId}:${cursoId}:${periodo}`: aísla por usuario, centro, curso y período. */
    key: string;
    userId: string;
    centroId?: string;
    cursoId: number;
    periodo: string;
    data: {
        actividades: Actividad[];
        calificaciones: CalificacionActividad[];
    };
    cachedAt: number;
    expiresAt: number;
}

/**
 * Entrada EN MEMORIA de UNA secuencia completa.
 * Una sola entrada incluye metadata + `contenidoHtml` + `recursos` (el HTML
 * nunca se duplica en un caché aparte). NO se persiste en localStorage: el
 * contenido HTML no debe sobrevivir a recargas ni sesiones.
 */
export interface SecuenciaCacheEntry {
    /** Clave `${userId}:${cursoId}:${secuenciaId}`: aísla por usuario y curso. */
    key: string;
    userId: string;
    cursoId: number;
    secuenciaId: number;
    /** user_id real de la fila (creador), cuando lo aporta la lectura fuente. */
    autorId?: string;
    activo?: boolean;
    createdAt?: string;
    /** Secuencia completa mapeada (incluye contenidoHtml + recursos). */
    data: Secuencia;
    cachedAt: number;
    expiresAt: number;
}

interface AppStore {
    // Data State
    state: AppState;
    session: Session | null;
    loading: boolean;
    authInitialized: boolean;

    // Caché persistente del registro del centro, aislado por centroId.
    centroCache: Record<string, CentroCacheEntry>;
    setCentroCache: (entry: CentroCacheEntry | ((prev: Record<string, CentroCacheEntry>) => Record<string, CentroCacheEntry>)) => void;

    // Caché persistente del perfil básico del usuario, aislado por userId.
    perfilCache: Record<string, PerfilCacheEntry>;
    setPerfilCache: (entry: PerfilCacheEntry | ((prev: Record<string, PerfilCacheEntry>) => Record<string, PerfilCacheEntry>)) => void;

    // Caché persistente de los cursos del usuario, aislado por {userId}:{centroId}.
    cursoCache: Record<string, CursoCacheEntry>;
    setCursoCache: (entry: CursoCacheEntry | ((prev: Record<string, CursoCacheEntry>) => Record<string, CursoCacheEntry>)) => void;

    // Caché persistente de las plantillas del usuario, aislado por {userId}.
    plantillaCache: Record<string, PlantillaCacheEntry>;
    setPlantillaCache: (entry: PlantillaCacheEntry | ((prev: Record<string, PlantillaCacheEntry>) => Record<string, PlantillaCacheEntry>)) => void;

    // Caché EN MEMORIA por curso + período (actividades + calificaciones), aislado por
    // {userId}:{centroId}:{cursoId}:{periodo}. NO se persiste en localStorage.
    academicCache: Record<string, AcademicCacheEntry>;
    setAcademicCache: (entry: AcademicCacheEntry | ((prev: Record<string, AcademicCacheEntry>) => Record<string, AcademicCacheEntry>)) => void;

    // Caché EN MEMORIA de secuencias completas, aislado por {userId}:{cursoId}:{secuenciaId}.
    // NO se persiste en localStorage; se limpia en setSession al cambiar de usuario.
    secuenciaCache: Record<string, SecuenciaCacheEntry>;
    setSecuenciaCache: (entry: SecuenciaCacheEntry | ((prev: Record<string, SecuenciaCacheEntry>) => Record<string, SecuenciaCacheEntry>)) => void;
    
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

        // Cache del registro del centro (en memoria), persistido por Zustand.
        centroCache: {},
        setCentroCache: (entry: CentroCacheEntry | ((prev: Record<string, CentroCacheEntry>) => Record<string, CentroCacheEntry>)) => set((s: AppStore) => ({
            centroCache: typeof entry === 'function'
                ? entry(s.centroCache)
                : { ...s.centroCache, [entry.centroId]: entry }
        })),

        // Cache del perfil básico del usuario (en memoria), persistido por Zustand.
        perfilCache: {},
        setPerfilCache: (entry: PerfilCacheEntry | ((prev: Record<string, PerfilCacheEntry>) => Record<string, PerfilCacheEntry>)) => set((s: AppStore) => ({
            perfilCache: typeof entry === 'function'
                ? entry(s.perfilCache)
                : { ...s.perfilCache, [entry.userId]: entry }
        })),

        // Cache de los cursos del usuario (en memoria), persistido por Zustand.
        cursoCache: {},
        setCursoCache: (entry: CursoCacheEntry | ((prev: Record<string, CursoCacheEntry>) => Record<string, CursoCacheEntry>)) => set((s: AppStore) => ({
            cursoCache: typeof entry === 'function'
                ? entry(s.cursoCache)
                : { ...s.cursoCache, [entry.key]: entry }
        })),

        // Cache de las plantillas del usuario (en memoria), persistido por Zustand.
        plantillaCache: {},
        setPlantillaCache: (entry: PlantillaCacheEntry | ((prev: Record<string, PlantillaCacheEntry>) => Record<string, PlantillaCacheEntry>)) => set((s: AppStore) => ({
            plantillaCache: typeof entry === 'function'
                ? entry(s.plantillaCache)
                : { ...s.plantillaCache, [entry.key]: entry }
        })),

        // Cache EN MEMORIA por curso + período. No se persiste.
        academicCache: {},
        setAcademicCache: (entry: AcademicCacheEntry | ((prev: Record<string, AcademicCacheEntry>) => Record<string, AcademicCacheEntry>)) => set((s: AppStore) => ({
            academicCache: typeof entry === 'function'
                ? entry(s.academicCache)
                : { ...s.academicCache, [entry.key]: entry }
        })),

        // Cache EN MEMORIA de secuencias completas. No se persiste.
        secuenciaCache: {},
        setSecuenciaCache: (entry: SecuenciaCacheEntry | ((prev: Record<string, SecuenciaCacheEntry>) => Record<string, SecuenciaCacheEntry>)) => set((s: AppStore) => ({
            secuenciaCache: typeof entry === 'function'
                ? entry(s.secuenciaCache)
                : { ...s.secuenciaCache, [entry.key]: entry }
        })),
        
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
                console.log(`[DIAG][SETSESSION] userChanged old=${s.session?.user?.id ?? 'null'} new=${session?.user?.id ?? 'null'} limpia=loadedModules,loadedCursos,cursoCache,plantillaCache,academicCache,secuenciaCache conserva=state(perfiles,estudiantes,actividades,calificaciones,secuencias,grupos,...),centroCache,perfilCache ts=${new Date().toISOString()}`);
                return { session, loadedModules: [], loadedCursos: [], cursoCache: {}, plantillaCache: {}, academicCache: {}, secuenciaCache: {} };
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
        darkMode: state.darkMode,
        centroCache: state.centroCache,
        perfilCache: state.perfilCache,
        cursoCache: state.cursoCache,
        plantillaCache: state.plantillaCache
      }),
      merge: (persistedState: any, currentState: any) => {
        // Only merge the keys we explicitly partialize, discarding any legacy corrupted state
        // Las entradas de caché de centro expiradas se descartan al hidratar.
        const nowMs = Date.now();
        const persistedCache = (persistedState?.centroCache || {}) as Record<string, CentroCacheEntry>;
        const validCache: Record<string, CentroCacheEntry> = {};
        for (const key of Object.keys(persistedCache)) {
          const entry = persistedCache[key];
          if (entry && typeof entry.expiresAt === 'number' && entry.expiresAt > nowMs && entry.data) {
            validCache[key] = entry;
          }
        }
        // Las entradas de caché de perfil expiradas se descartan al hidratar.
        const persistedPerfilCache = (persistedState?.perfilCache || {}) as Record<string, PerfilCacheEntry>;
        const validPerfilCache: Record<string, PerfilCacheEntry> = {};
        for (const key of Object.keys(persistedPerfilCache)) {
          const entry = persistedPerfilCache[key];
          if (entry && typeof entry.expiresAt === 'number' && entry.expiresAt > nowMs && entry.data) {
            validPerfilCache[key] = entry;
          }
        }
        // Las entradas de caché de cursos expiradas se descartan al hidratar.
        const persistedCursoCache = (persistedState?.cursoCache || {}) as Record<string, CursoCacheEntry>;
        const validCursoCache: Record<string, CursoCacheEntry> = {};
        for (const key of Object.keys(persistedCursoCache)) {
          const entry = persistedCursoCache[key];
          if (entry && typeof entry.expiresAt === 'number' && entry.expiresAt > nowMs && entry.data) {
            validCursoCache[key] = entry;
          }
        }
        // Las entradas de caché de plantillas expiradas se descartan al hidratar.
        const persistedPlantillaCache = (persistedState?.plantillaCache || {}) as Record<string, PlantillaCacheEntry>;
        const validPlantillaCache: Record<string, PlantillaCacheEntry> = {};
        for (const key of Object.keys(persistedPlantillaCache)) {
          const entry = persistedPlantillaCache[key];
          if (entry && typeof entry.expiresAt === 'number' && entry.expiresAt > nowMs && Array.isArray(entry.data)) {
            validPlantillaCache[key] = entry;
          }
        }
        return {
          ...currentState,
          selectedCursoId: persistedState?.selectedCursoId ?? currentState.selectedCursoId,
          selectedEstudianteId: persistedState?.selectedEstudianteId ?? currentState.selectedEstudianteId,
          selectedPeriodo: persistedState?.selectedPeriodo ?? currentState.selectedPeriodo ?? 'P1',
          darkMode: persistedState?.darkMode ?? currentState.darkMode,
          centroCache: validCache,
          perfilCache: validPerfilCache,
          cursoCache: validCursoCache,
          plantillaCache: validPlantillaCache,
        };
      },
    }
  )
);

