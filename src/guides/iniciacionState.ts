/**
 * Manages user-scoped onboarding progress for CIELO's interactive guide.
 * Includes local storage cache and cloud synchronization with Supabase user_metadata.
 */
import { supabase } from '../lib/supabase';

export type StageStatus = 'pendiente' | 'en_progreso' | 'completada';

/**
 * Fecha de corte oficial de implementación de la guía inicial en CIELO.
 * Solo las cuentas creadas a partir de esta fecha (15 de noviembre de 2026)
 * son candidatas a recibir la bienvenida interactiva automática tras su registro.
 * Todas las cuentas previas a esta fecha son consideradas existentes y nunca
 * recibirán la bienvenida automática.
 */
export const GUIA_INICIACION_CUTOFF_ISO = '2026-11-15T00:00:00.000Z';
export const GUIA_INICIACION_CUTOFF_TIME = new Date(GUIA_INICIACION_CUTOFF_ISO).getTime();

/**
 * Determina con certeza si una cuenta es nueva según su fecha real de creación (created_at).
 * - Cuentas existentes (creadas antes de la fecha de corte): retorna false.
 * - Cuentas nuevas (creadas a partir de la fecha de corte): retorna true.
 * - Si no es posible determinar con certeza la antigüedad (ej. sin created_at): retorna false.
 */
export function isNewUserAccount(user: { created_at?: string } | null | undefined): boolean {
  if (!user || !user.created_at) {
    return false;
  }
  const createdAtTime = new Date(user.created_at).getTime();
  if (isNaN(createdAtTime)) {
    return false;
  }
  return createdAtTime >= GUIA_INICIACION_CUTOFF_TIME;
}

export interface IniciacionProgress {
  userId: string;
  completed: boolean;
  completedAt?: string;
  currentStage: number; // 1 to 5
  currentStepIndex: number;
  dismissedWelcome: boolean;
  stages: {
    1: StageStatus; // Crear curso
    2: StageStatus; // Agregar alumnos
    3: StageStatus; // Crear actividad
    4: StageStatus; // Aprender a evaluar (Pincel, Libre, Numérico)
    5: StageStatus; // Explicar indicadores y niveles de logro
  };
  lastUpdated: string;
}

const STORAGE_KEY_PREFIX = 'cielo_iniciacion_progreso_';

/**
 * Resuelve el ID del usuario autenticado actual desde el almacenamiento de sesión si no se proporciona.
 */
export function getResolvedUserId(userId?: string | null): string {
  if (userId && userId !== 'anonymous' && userId !== 'default-user') return userId;
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && ((key.startsWith('sb-') && key.endsWith('-auth-token')) || key === 'supabase.auth.token')) {
        const val = localStorage.getItem(key);
        if (val) {
          const parsed = JSON.parse(val);
          const uid = parsed?.user?.id || parsed?.currentSession?.user?.id;
          if (uid) return uid;
        }
      }
    }
  } catch {
    // Ignore JSON parse errors
  }
  return userId || 'default-user';
}

export function getDefaultIniciacionProgress(userId: string): IniciacionProgress {
  return {
    userId,
    completed: false,
    currentStage: 1,
    currentStepIndex: 0,
    dismissedWelcome: false,
    stages: {
      1: 'pendiente',
      2: 'pendiente',
      3: 'pendiente',
      4: 'pendiente',
      5: 'pendiente',
    },
    lastUpdated: new Date().toISOString(),
  };
}

export function loadIniciacionProgress(
  userId?: string | null,
  userMetadata?: Record<string, any>
): IniciacionProgress {
  const resolvedId = getResolvedUserId(userId);
  let progress = getDefaultIniciacionProgress(resolvedId);

  try {
    const raw = localStorage.getItem(`${STORAGE_KEY_PREFIX}${resolvedId}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        progress = {
          ...progress,
          ...parsed,
          userId: resolvedId,
        };
      }
    }
  } catch (e) {
    console.warn('[iniciacionState] Failed to load progress from localStorage:', e);
  }

  // Sincronizar inmediatamente con metadata persistida en Supabase Auth
  // (mantiene el estado ante cambios de dispositivo, sesiones nuevas y borrado de caché)
  if (userMetadata?.cielo_iniciacion && typeof userMetadata.cielo_iniciacion === 'object') {
    const cloudProgress = userMetadata.cielo_iniciacion as Partial<IniciacionProgress>;
    if (cloudProgress.dismissedWelcome) {
      progress.dismissedWelcome = true;
    }
    if (cloudProgress.completed) {
      progress.completed = true;
    }
    if (typeof cloudProgress.currentStepIndex === 'number' && cloudProgress.currentStepIndex > progress.currentStepIndex) {
      progress.currentStepIndex = cloudProgress.currentStepIndex;
      progress.currentStage = cloudProgress.currentStage || progress.currentStage;
      progress.stages = { ...progress.stages, ...cloudProgress.stages };
    }
  }

  return progress;
}

export function saveIniciacionProgress(progress: IniciacionProgress, syncToCloud = true) {
  const uid = getResolvedUserId(progress.userId);
  progress.userId = uid;
  try {
    progress.lastUpdated = new Date().toISOString();
    localStorage.setItem(
      `${STORAGE_KEY_PREFIX}${uid}`,
      JSON.stringify(progress)
    );

    // Despachar evento para reactividad instantánea en los componentes
    window.dispatchEvent(
      new CustomEvent('cielo-iniciacion-updated', { detail: progress })
    );

    // Persistir en Supabase user_metadata para mantener el progreso entre dispositivos y sesiones
    if (syncToCloud && uid !== 'default-user' && uid !== 'anonymous') {
      supabase.auth.updateUser({
        data: { cielo_iniciacion: progress }
      }).catch(err => {
        console.warn('[iniciacionState] Error sincronizando con Supabase:', err);
      });
    }
  } catch (e) {
    console.warn('[iniciacionState] Failed to save progress:', e);
  }
}

/**
 * Sincroniza el progreso del usuario con Supabase Auth (conserva el progreso entre dispositivos).
 */
export async function syncIniciacionProgressWithCloud(userId?: string | null): Promise<IniciacionProgress> {
  const uid = getResolvedUserId(userId);
  let localProgress = loadIniciacionProgress(uid);

  try {
    const { data } = await supabase.auth.getUser();
    const cloudProgress = data?.user?.user_metadata?.cielo_iniciacion as IniciacionProgress | undefined;

    if (cloudProgress && cloudProgress.lastUpdated) {
      const localTime = localProgress.lastUpdated ? new Date(localProgress.lastUpdated).getTime() : 0;
      const cloudTime = new Date(cloudProgress.lastUpdated).getTime();

      if (cloudTime > localTime) {
        localProgress = {
          ...getDefaultIniciacionProgress(uid),
          ...cloudProgress,
          userId: uid,
        };
        saveIniciacionProgress(localProgress, false);
        return localProgress;
      }
    }

    // Si local tiene progreso no sincronizado, actualizar la nube
    if (localProgress.currentStepIndex > 0 && uid !== 'default-user') {
      supabase.auth.updateUser({
        data: { cielo_iniciacion: localProgress }
      }).catch(() => {});
    }
  } catch (e) {
    console.warn('[iniciacionState] Cloud sync error:', e);
  }

  return localProgress;
}

export function updateStageStatus(
  userId: string | null,
  stage: 1 | 2 | 3 | 4 | 5,
  status: StageStatus,
  stepIndex?: number
) {
  const uid = getResolvedUserId(userId);
  const progress = loadIniciacionProgress(uid);
  progress.stages[stage] = status;
  progress.currentStage = stage;
  if (typeof stepIndex === 'number') {
    progress.currentStepIndex = stepIndex;
  }
  // Verificar si todas las etapas están completadas
  const allCompleted = [1, 2, 3, 4, 5].every(
    (s) => progress.stages[s as 1 | 2 | 3 | 4 | 5] === 'completada'
  );
  if (allCompleted) {
    progress.completed = true;
    progress.completedAt = progress.completedAt || new Date().toISOString();
  }
  saveIniciacionProgress(progress);
}

/**
 * Conserva el progreso exacto al pulsar «Guardar y salir».
 * NUNCA marca la guía como completada ni borra el progreso pendiente.
 */
export function saveIniciacionProgressOnExit(userId: string | null, stepIndex: number, currentStage?: number) {
  const uid = getResolvedUserId(userId);
  const progress = loadIniciacionProgress(uid);
  progress.currentStepIndex = Math.max(0, stepIndex);
  progress.completed = false; // Garantiza que no se marque como completada al salir
  if (currentStage) {
    progress.currentStage = currentStage;
  }
  const stg = progress.currentStage as 1 | 2 | 3 | 4 | 5;
  if (stg && progress.stages[stg] !== 'completada') {
    progress.stages[stg] = 'en_progreso';
  }
  saveIniciacionProgress(progress, true);
}

export function setIniciacionCompleted(userId: string | null) {
  const uid = getResolvedUserId(userId);
  const progress = loadIniciacionProgress(uid);
  progress.completed = true;
  progress.completedAt = new Date().toISOString();
  progress.stages[1] = 'completada';
  progress.stages[2] = 'completada';
  progress.stages[3] = 'completada';
  progress.stages[4] = 'completada';
  progress.stages[5] = 'completada';
  saveIniciacionProgress(progress);
}

export function dismissIniciacionWelcome(userId: string | null) {
  const uid = getResolvedUserId(userId);
  const progress = loadIniciacionProgress(uid);
  progress.dismissedWelcome = true;
  saveIniciacionProgress(progress);
}

/**
 * Reinicia voluntariamente todo el recorrido solo ante la acción explícita «Comenzar desde cero».
 */
export function resetIniciacionProgress(userId: string | null) {
  const uid = getResolvedUserId(userId);
  const initial = getDefaultIniciacionProgress(uid);
  saveIniciacionProgress(initial, true);
}
