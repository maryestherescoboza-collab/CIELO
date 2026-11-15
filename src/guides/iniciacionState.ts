/**
 * Manages user-scoped onboarding progress for CIELO's interactive guide.
 */

export type StageStatus = 'pendiente' | 'en_progreso' | 'completada';

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

export function loadIniciacionProgress(userId?: string): IniciacionProgress {
  if (!userId) return getDefaultIniciacionProgress('anonymous');
  try {
    const raw = localStorage.getItem(`${STORAGE_KEY_PREFIX}${userId}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        return {
          ...getDefaultIniciacionProgress(userId),
          ...parsed,
          userId,
        };
      }
    }
  } catch (e) {
    console.warn('[iniciacionState] Failed to load progress:', e);
  }
  return getDefaultIniciacionProgress(userId);
}

export function saveIniciacionProgress(progress: IniciacionProgress) {
  if (!progress.userId) return;
  try {
    progress.lastUpdated = new Date().toISOString();
    localStorage.setItem(
      `${STORAGE_KEY_PREFIX}${progress.userId}`,
      JSON.stringify(progress)
    );
    // Dispatch custom event for UI reactivity across components
    window.dispatchEvent(
      new CustomEvent('cielo-iniciacion-updated', { detail: progress })
    );
  } catch (e) {
    console.warn('[iniciacionState] Failed to save progress:', e);
  }
}

export function updateStageStatus(
  userId: string,
  stage: 1 | 2 | 3 | 4 | 5,
  status: StageStatus,
  stepIndex?: number
) {
  const progress = loadIniciacionProgress(userId);
  progress.stages[stage] = status;
  progress.currentStage = stage;
  if (typeof stepIndex === 'number') {
    progress.currentStepIndex = stepIndex;
  }
  // Check if all stages are completed
  const allCompleted = [1, 2, 3, 4, 5].every(
    (s) => progress.stages[s as 1 | 2 | 3 | 4 | 5] === 'completada'
  );
  if (allCompleted) {
    progress.completed = true;
    progress.completedAt = progress.completedAt || new Date().toISOString();
  }
  saveIniciacionProgress(progress);
}

export function setIniciacionCompleted(userId: string) {
  const progress = loadIniciacionProgress(userId);
  progress.completed = true;
  progress.completedAt = new Date().toISOString();
  progress.stages[1] = 'completada';
  progress.stages[2] = 'completada';
  progress.stages[3] = 'completada';
  progress.stages[4] = 'completada';
  progress.stages[5] = 'completada';
  saveIniciacionProgress(progress);
}

export function dismissIniciacionWelcome(userId: string) {
  const progress = loadIniciacionProgress(userId);
  progress.dismissedWelcome = true;
  saveIniciacionProgress(progress);
}

export function resetIniciacionProgress(userId: string) {
  const initial = getDefaultIniciacionProgress(userId);
  saveIniciacionProgress(initial);
}

