import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Session } from '@supabase/supabase-js';
import type { AppState, SearchResults, FloatingRubricWindow, Nivel, Centro, Curso, CursoDocente, Plantilla, Actividad, CalificacionActividad, Secuencia, Estudiante } from '../types';
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
 * Caché persistente (TTL de hasta 1 año / 365 días) de la lista de estudiantes
 * de un curso físico (`cursoId`).
 * Aislado por `${userId}:${centroId || 'sin-centro'}:${cursoId}` para garantizar
 * que jamás se mezclen estudiantes entre centros, cursos o usuarios.
 */
export interface EstudianteCacheEntry {
    /** Clave compuesta `${userId}:${centroId || 'sin-centro'}:${cursoId}` */
    key: string;
    userId: string;
    centroId?: string;
    cursoId: number;
    /** Lista de estudiantes activos del curso físico, ordenados por numeroLista. */
    data: Estudiante[];
    cachedAt: number;
    updatedAt: number;
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

    // Caché persistente (1 año) de estudiantes por curso físico, aislado por {userId}:{centroId}:{cursoId}.
    estudianteCache: Record<string, EstudianteCacheEntry>;
    setEstudianteCache: (entry: EstudianteCacheEntry | ((prev: Record<string, EstudianteCacheEntry>) => Record<string, EstudianteCacheEntry>)) => void;

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
    selectedCursoDocenteId: number | null;
    selectedAsignatura: string | null;
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
    setSelectedCursoDocenteId: (id: number | null) => void;
    setSelectedAsignatura: (asignatura: string | null) => void;
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

        // Cache persistente de estudiantes por curso físico (TTL 365 días), persistido por Zustand.
        estudianteCache: {},
        setEstudianteCache: (entry: EstudianteCacheEntry | ((prev: Record<string, EstudianteCacheEntry>) => Record<string, EstudianteCacheEntry>)) => set((s: AppStore) => ({
            estudianteCache: typeof entry === 'function'
                ? entry(s.estudianteCache)
                : { ...s.estudianteCache, [entry.key]: entry }
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
        selectedCursoDocenteId: null,
        selectedAsignatura: null,
        selectedEstudianteId: null,
        selectedActividadId: null,
        selectedPeriodo: 'P2',
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
            const oldUserId = s.session?.user?.id ?? null;
            const newUserId = session?.user?.id ?? null;
            const userChanged = oldUserId !== newUserId;
            if (userChanged) {
                // NOTA CRÍTICA DE PERSISTENCIA:
                // Los cachés persistentes (`centroCache`, `perfilCache`, `cursoCache`, `plantillaCache`, `estudianteCache`)
                // están estrictamente aislados por claves compuestas con `userId` y `centroId` y se validan por `expiresAt`.
                // NUNCA deben vaciarse en `setSession` (especialmente en el arranque cuando `s.session` pasa de `null` a `session`,
                // ni al cerrar/reabrir sesión), para garantizar que la caché persistente de 1 año sobreviva a recargas y reinicios.
                // Al cerrar sesión o cambiar a un usuario distinto, se limpian únicamente las banderas y cachés en memoria de la sesión,
                // y si se cerró sesión o cambió a otro usuario distinto, se limpia el `state` en memoria para evitar fugas entre sesiones.
                const shouldResetInMemoryState = oldUserId !== null && oldUserId !== newUserId;
                console.log(`[DIAG][SETSESSION] userChanged old=${oldUserId ?? 'null'} new=${newUserId ?? 'null'} resetInMemoryState=${shouldResetInMemoryState} conservaCachesPersistentes=centroCache,perfilCache,cursoCache,plantillaCache,estudianteCache ts=${new Date().toISOString()}`);
                return {
                    session,
                    ...(shouldResetInMemoryState ? { state: initialState } : {}),
                    loadedModules: [],
                    loadedCursos: [],
                    academicCache: {},
                    secuenciaCache: {},
                };
            }
            return { session };
        }),
        setAuthInitialized: (authInitialized: boolean) => set({ authInitialized }),
        setLoading: (loading: boolean) => set({ loading }),
        setDarkMode: (updater: boolean | ((prev: boolean) => boolean)) => set((prev: AppStore) => ({
            darkMode: typeof updater === 'function' ? updater(prev.darkMode) : updater
        })),
        setSelectedCursoId: (selectedCursoId: number | null) => set({ selectedCursoId }),
        setSelectedCursoDocenteId: (selectedCursoDocenteId: number | null) => set({ selectedCursoDocenteId }),
        setSelectedAsignatura: (selectedAsignatura: string | null) => set({ selectedAsignatura }),
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
        selectedCursoDocenteId: state.selectedCursoDocenteId,
        selectedAsignatura: state.selectedAsignatura,
        selectedEstudianteId: state.selectedEstudianteId,
        selectedPeriodo: state.selectedPeriodo,
        defaultPeriodoV4: true,
        darkMode: state.darkMode,
        centroCache: state.centroCache,
        perfilCache: state.perfilCache,
        cursoCache: state.cursoCache,
        plantillaCache: state.plantillaCache,
        estudianteCache: state.estudianteCache
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
        // Las entradas de caché de estudiantes por curso expiradas (TTL 365 días) se descartan al hidratar.
        const persistedEstudianteCache = (persistedState?.estudianteCache || {}) as Record<string, EstudianteCacheEntry>;
        const validEstudianteCache: Record<string, EstudianteCacheEntry> = {};
        for (const key of Object.keys(persistedEstudianteCache)) {
          const entry = persistedEstudianteCache[key];
          if (
            entry &&
            typeof entry.expiresAt === 'number' &&
            entry.expiresAt > nowMs &&
            typeof entry.cursoId === 'number' &&
            typeof entry.userId === 'string' &&
            Array.isArray(entry.data)
          ) {
            validEstudianteCache[key] = entry;
          }
        }

        // Migración del período predeterminado a P2:
        // P2 es el período inicial obligatorio al entrar a CIELO.
        // Si el usuario tenía sesiones anteriores guardadas en P1 (o en versiones previas v1/v2/v3),
        // se actualiza a P2 directamente sin borrar sus demás preferencias.
        let periodoInicial = 'P2';
        if (persistedState) {
          if (!persistedState.defaultPeriodoV4) {
            periodoInicial = 'P2';
          } else {
            periodoInicial = persistedState.selectedPeriodo ?? 'P2';
          }
        }

        return {
          ...currentState,
          selectedCursoId: persistedState?.selectedCursoId ?? currentState.selectedCursoId,
          selectedCursoDocenteId: persistedState?.selectedCursoDocenteId ?? currentState.selectedCursoDocenteId,
          selectedAsignatura: persistedState?.selectedAsignatura ?? currentState.selectedAsignatura,
          selectedEstudianteId: persistedState?.selectedEstudianteId ?? currentState.selectedEstudianteId,
          selectedPeriodo: periodoInicial,
          darkMode: persistedState?.darkMode ?? currentState.darkMode,
          centroCache: validCache,
          perfilCache: validPerfilCache,
          cursoCache: validCursoCache,
          plantillaCache: validPlantillaCache,
          estudianteCache: validEstudianteCache,
        };
      },
    }
  )
);

