import { create } from 'zustand';

export interface PendingSaveItem {
    id: string; // `${estudianteId}_${actividadId}` o `${estudianteId}_${bc}_${periodo}_${asignatura}`
    tipo: 'calificacion' | 'recuperacion';
    cursoId: number;
    actividadId?: number;
    estudianteId: number;
    puntaje: number | null;
    periodo: string;
    asignatura?: string;
    competencias?: string[];
    descriptores?: string[];
    sharedCourseId?: string;
    userId: string;
    bc?: number;
    timestamp: number;
    status: 'pending' | 'saving' | 'verifying' | 'confirmed' | 'error' | 'conflict';
    attempts: number;
    lastError?: string;
}

export interface NavigationLockState {
    isLocked: boolean;
    reason: string | null;
    pendingCount: number;
    savingCount: number;
    verifyingCount: number;
    errorCount: number;
    courseId?: number | null;
    queue: Record<string, PendingSaveItem>;
}

const STORAGE_KEY = 'cielo_persistence_queue_v1';

function loadPersistedQueue(): Record<string, PendingSaveItem> {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
            const parsed = JSON.parse(raw);
            if (parsed && typeof parsed === 'object') {
                return parsed;
            }
        }
    } catch (_) {}
    return {};
}

function savePersistedQueue(queue: Record<string, PendingSaveItem>) {
    try {
        if (Object.keys(queue).length > 0) {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
        } else {
            localStorage.removeItem(STORAGE_KEY);
        }
    } catch (_) {}
}

interface PersistenceStoreActions {
    enqueueItems: (items: PendingSaveItem[]) => void;
    updateItemStatus: (id: string, status: PendingSaveItem['status'], extra?: Partial<PendingSaveItem>) => void;
    removeItem: (id: string) => void;
    removeItems: (ids: string[]) => void;
    setNavigationLock: (locked: boolean, reason?: string | null, courseId?: number | null) => void;
    clearCourseQueue: (courseId: number) => void;
    getPendingForCourse: (courseId: number) => PendingSaveItem[];
}

export type PersistenceStore = NavigationLockState & PersistenceStoreActions;

export const usePersistenceStore = create<PersistenceStore>((set, get) => ({
    isLocked: false,
    reason: null,
    pendingCount: 0,
    savingCount: 0,
    verifyingCount: 0,
    errorCount: 0,
    courseId: null,
    queue: loadPersistedQueue(),

    enqueueItems: (items: PendingSaveItem[]) => {
        set(state => {
            const nextQueue = { ...state.queue };
            items.forEach(it => {
                nextQueue[it.id] = {
                    ...it,
                    status: 'pending',
                    attempts: nextQueue[it.id]?.attempts || 0
                };
            });
            savePersistedQueue(nextQueue);

            const allItems = Object.values(nextQueue);
            const pendingCount = allItems.filter(i => i.status === 'pending').length;
            const savingCount = allItems.filter(i => i.status === 'saving').length;
            const verifyingCount = allItems.filter(i => i.status === 'verifying').length;
            const errorCount = allItems.filter(i => i.status === 'error').length;
            const isLocked = (pendingCount + savingCount + verifyingCount) > 0;

            return {
                queue: nextQueue,
                pendingCount,
                savingCount,
                verifyingCount,
                errorCount,
                isLocked
            };
        });
    },

    updateItemStatus: (id: string, status: PendingSaveItem['status'], extra?: Partial<PendingSaveItem>) => {
        set(state => {
            const current = state.queue[id];
            if (!current) return state;
            const nextQueue = {
                ...state.queue,
                [id]: {
                    ...current,
                    ...extra,
                    status
                }
            };
            savePersistedQueue(nextQueue);

            const allItems = Object.values(nextQueue);
            const pendingCount = allItems.filter(i => i.status === 'pending').length;
            const savingCount = allItems.filter(i => i.status === 'saving').length;
            const verifyingCount = allItems.filter(i => i.status === 'verifying').length;
            const errorCount = allItems.filter(i => i.status === 'error').length;
            const isLocked = (pendingCount + savingCount + verifyingCount) > 0;

            return {
                queue: nextQueue,
                pendingCount,
                savingCount,
                verifyingCount,
                errorCount,
                isLocked
            };
        });
    },

    removeItem: (id: string) => {
        set(state => {
            const nextQueue = { ...state.queue };
            delete nextQueue[id];
            savePersistedQueue(nextQueue);

            const allItems = Object.values(nextQueue);
            const pendingCount = allItems.filter(i => i.status === 'pending').length;
            const savingCount = allItems.filter(i => i.status === 'saving').length;
            const verifyingCount = allItems.filter(i => i.status === 'verifying').length;
            const errorCount = allItems.filter(i => i.status === 'error').length;
            const isLocked = (pendingCount + savingCount + verifyingCount) > 0;

            return {
                queue: nextQueue,
                pendingCount,
                savingCount,
                verifyingCount,
                errorCount,
                isLocked
            };
        });
    },

    removeItems: (ids: string[]) => {
        set(state => {
            const nextQueue = { ...state.queue };
            ids.forEach(id => delete nextQueue[id]);
            savePersistedQueue(nextQueue);

            const allItems = Object.values(nextQueue);
            const pendingCount = allItems.filter(i => i.status === 'pending').length;
            const savingCount = allItems.filter(i => i.status === 'saving').length;
            const verifyingCount = allItems.filter(i => i.status === 'verifying').length;
            const errorCount = allItems.filter(i => i.status === 'error').length;
            const isLocked = (pendingCount + savingCount + verifyingCount) > 0;

            return {
                queue: nextQueue,
                pendingCount,
                savingCount,
                verifyingCount,
                errorCount,
                isLocked
            };
        });
    },

    setNavigationLock: (locked: boolean, reason?: string | null, courseId?: number | null) => {
        set({
            isLocked: locked,
            reason: reason || null,
            courseId: courseId !== undefined ? courseId : get().courseId
        });
    },

    clearCourseQueue: (courseId: number) => {
        set(state => {
            const nextQueue = { ...state.queue };
            Object.keys(nextQueue).forEach(k => {
                if (nextQueue[k].cursoId === courseId) {
                    delete nextQueue[k];
                }
            });
            savePersistedQueue(nextQueue);
            return {
                queue: nextQueue,
                pendingCount: 0,
                savingCount: 0,
                verifyingCount: 0,
                errorCount: 0,
                isLocked: false
            };
        });
    },

    getPendingForCourse: (courseId: number) => {
        const queue = get().queue;
        return Object.values(queue).filter(it => it.cursoId === courseId);
    }
}));
