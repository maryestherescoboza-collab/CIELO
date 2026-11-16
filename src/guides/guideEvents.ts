import { highlightStep, getCurrentStepIndex } from './driverGuides';
import type { GuideStep } from './catalogoGuias';
import { 
  subscribeGuideOperations, 
  type GuideExecutionState,
  type GuideOperationEventDetail 
} from './guideConfirmation';
import { voiceNarrator } from './voiceNarrator';

let activeListenerCleanup: (() => void) | null = null;
let activeOperationCleanup: (() => void) | null = null;
let activeSpeechWaitCleanup: (() => void) | null = null;
let activeNarratorSubCleanup: (() => void) | null = null;

let lastStepActivationTime = 0;
let studentClickCount = 0;
let lastActiveStepIndex = -1;

/**
 * Inicializa la escucha de eventos e interacciones del paso activo.
 * - Sincroniza la narración neuronal con la navegación: prohíbe avances prematuros mientras
 *   la voz o explicación siga activa.
 * - Espera que el usuario complete la interacción real.
 * - Si el paso requiere confirmación de backend (esperarOperacion), aguarda la respuesta exitosa
 *   real de CIELO (ej. Supabase INSERT), reproduce la confirmación y espera que concluya la voz
 *   antes de avanzar al siguiente paso.
 */
export function initGuideEventListeners(
  step: GuideStep,
  onAdvance: () => void,
  onStateChange?: (state: GuideExecutionState, message?: string) => void
) {
  cleanupGuideEventListeners();

  lastStepActivationTime = Date.now();
  let hasAdvanced = false;
  let isOperationInProgress = false;
  let isUserActionCompleted = false;
  let isSpeechCompleted = !voiceNarrator.isSpeaking();

  const actionSelector = step.targetActionSelector || step.selector;

  if (step.selector === '[data-guide="seleccionar-estudiantes"]') {
    const currentIdx = getCurrentStepIndex();
    if (currentIdx !== lastActiveStepIndex) {
      studentClickCount = 0;
      lastActiveStepIndex = currentIdx;
    }
  }

  // Ejecuta la transición de forma atómica únicamente cuando ambas condiciones se cumplan
  const triggerAdvance = () => {
    if (hasAdvanced) return;
    hasAdvanced = true;
    cleanupGuideEventListeners();
    onAdvance();
  };

  const tryAdvance = () => {
    if (hasAdvanced || isOperationInProgress) return;
    // Solo permitir el avance si el usuario interactuó Y la narración ha finalizado
    if (isUserActionCompleted && isSpeechCompleted) {
      triggerAdvance();
    }
  };

  const markActionDone = () => {
    if (hasAdvanced || isOperationInProgress) return;
    isUserActionCompleted = true;
    tryAdvance();
  };

  // 1. Escuchar fin de narración de voz del paso actual
  activeSpeechWaitCleanup = voiceNarrator.whenSpeechEnds(() => {
    isSpeechCompleted = true;
    tryAdvance();
  });

  // 2. Si el usuario reanuda o repite la voz (replay), actualizar estado para no cortar la repetición
  activeNarratorSubCleanup = voiceNarrator.subscribe(() => {
    if (voiceNarrator.isSpeaking()) {
      isSpeechCompleted = false;
      if (activeSpeechWaitCleanup) activeSpeechWaitCleanup();
      activeSpeechWaitCleanup = voiceNarrator.whenSpeechEnds(() => {
        isSpeechCompleted = true;
        tryAdvance();
      });
    }
  });

  // ── REGLA ESPECÍFICA: PASO 3 DE AGREGAR ACTIVIDAD (PRODUCTO) ──
  // No avanzar hasta detectar que el campo Producto tiene contenido válido (mínimo 3 caracteres).
  if (step.selector === '[data-guide="modal-actividad-producto"]') {
    let debounceTimer: any = null;

    const checkAndAdvance = (val: string) => {
      if (val.trim().length >= 3) {
        markActionDone();
      }
    };

    const handleInput = (e: Event) => {
      const input = e.target as HTMLInputElement;
      const val = input?.value || '';
      if (debounceTimer) clearTimeout(debounceTimer);
      if (val.trim().length >= 3) {
        debounceTimer = setTimeout(() => {
          checkAndAdvance(val);
        }, 800);
      }
    };

    const handleKeydown = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        const input = e.target as HTMLInputElement;
        const val = input?.value || '';
        checkAndAdvance(val);
      }
    };

    const handleChangeOrBlur = (e: Event) => {
      const input = e.target as HTMLInputElement;
      const val = input?.value || '';
      checkAndAdvance(val);
    };

    const handleClickGuardar = (e: MouseEvent) => {
      const btn = (e.target as HTMLElement)?.closest('[data-guide="modal-actividad-guardar"]');
      if (btn) {
        const input = document.querySelector<HTMLInputElement>('[data-guide="modal-actividad-producto"]');
        if (input && input.value.trim().length >= 3) {
          checkAndAdvance(input.value);
        }
      }
    };

    const opCleanup = subscribeGuideOperations({
      onSuccess: (detail) => {
        if (detail.operation === 'actividad_guardar') {
          markActionDone();
        }
      }
    });

    document.body.addEventListener('input', handleInput, true);
    document.body.addEventListener('keydown', handleKeydown as any, true);
    document.body.addEventListener('change', handleChangeOrBlur, true);
    document.body.addEventListener('blur', handleChangeOrBlur, true);
    document.body.addEventListener('click', handleClickGuardar, true);

    activeListenerCleanup = () => {
      opCleanup();
      if (debounceTimer) clearTimeout(debounceTimer);
      document.body.removeEventListener('input', handleInput, true);
      document.body.removeEventListener('keydown', handleKeydown as any, true);
      document.body.removeEventListener('change', handleChangeOrBlur, true);
      document.body.removeEventListener('blur', handleChangeOrBlur, true);
      document.body.removeEventListener('click', handleClickGuardar, true);
    };
    return;
  }

  // Si el paso espera una operación real de CIELO (ej. 'curso_guardar', 'actividad_guardar'),
  // suscribir el listener de confirmación antes de la interacción.
  if (step.esperarOperacion) {
    const expectedOp = step.esperarOperacion;

    activeOperationCleanup = subscribeGuideOperations({
      onStarted: (detail: GuideOperationEventDetail) => {
        if (detail.operation === expectedOp && !hasAdvanced) {
          isOperationInProgress = true;
          onStateChange?.('operacion_en_proceso', 'Guardando en CIELO…');
        }
      },
      onSuccess: (detail: GuideOperationEventDetail) => {
        if (detail.operation === expectedOp && !hasAdvanced) {
          isOperationInProgress = false;
          const successMsg = detail.message || step.mensajeExito || '¡Operación confirmada con éxito!';
          onStateChange?.('operacion_completada', successMsg);

          // Si hay mensaje de éxito, reproducir la locución y esperar que concluya antes de avanzar
          if (step.mensajeExito) {
            voiceNarrator.speak(step.mensajeExito, null, { force: true });
            voiceNarrator.whenSpeechEnds(() => {
              if (hasAdvanced) return;
              setTimeout(() => {
                triggerAdvance();
              }, 400); // Pausa natural de 400ms tras concluir la voz
            });
          } else {
            triggerAdvance();
          }
        }
      },
      onError: (detail: GuideOperationEventDetail) => {
        if (detail.operation === expectedOp) {
          isOperationInProgress = false;
          const errorMsg = detail.error || 'Ocurrió un error al procesar. Revisa los datos e intenta nuevamente.';
          onStateChange?.('operacion_fallida', errorMsg);
        }
      }
    });
  }

  const handleEvent = (e: Event) => {
    if (hasAdvanced || isOperationInProgress) return;

    // Prevenir saltos accidentales por rebotes de clics en menos de 300ms
    if (step.evento === 'click' && Date.now() - lastStepActivationTime < 300) {
      return;
    }

    const target = e.target as HTMLElement;
    if (!target) return;

    // Lógica para contar clics en selección de estudiantes
    if (step.selector === '[data-guide="seleccionar-estudiantes"]') {
      if (target.matches(step.selector) || target.closest(step.selector)) {
        studentClickCount++;
        if (studentClickCount >= 3) {
          markActionDone();
        } else {
          requestAnimationFrame(() => {
            highlightStep();
          });
        }
      }
      return;
    }

    // ── REGLA ESPECÍFICA: PASO 1 DE ACTIVIDAD (CONTENIDOS) ──
    // No avanzar si el usuario no pulsa sobre un ítem de contenido real (o indicador si es fallback)
    if (step.selector === '[data-guide="modal-actividad-selector-contenidos"]' || step.selector.includes('modal-actividad-selector-contenidos')) {
      const clickedItem = target.closest('[data-guide="item-contenido"]') || target.closest('[data-guide="modal-actividad-selector-contenidos"] button');
      if (clickedItem) {
        markActionDone();
        return;
      }
      if (target.closest('[data-guide="item-indicador"]')) {
        markActionDone();
        return;
      }
      return;
    }

    // ── REGLA ESPECÍFICA: PASO 2 DE ACTIVIDAD (INDICADORES DE LOGRO) ──
    // No avanzar si el usuario no selecciona un indicador real
    if (step.selector === '[data-guide="modal-actividad-selector-indicadores"]' || step.selector.includes('modal-actividad-selector-indicadores')) {
      const clickedItem = target.closest('[data-guide="item-indicador"]');
      if (!clickedItem) {
        return;
      }
      markActionDone();
      return;
    }

    // Verificar si el evento ocurrió sobre el selector de acción configurado
    const isActionMatch = actionSelector.split(',').some(s => {
      const trimmed = s.trim();
      return target.matches(trimmed) || target.closest(trimmed);
    });

    if (isActionMatch) {
      // Si el paso requiere confirmación real, esperar la respuesta de CIELO
      if (step.esperarOperacion) {
        onStateChange?.('interaccion_realizada');
        onStateChange?.('operacion_en_proceso', 'Procesando en CIELO…');
        return;
      }

      // Si es una interacción inmediata (como navegación de tabs o abrir modal)
      markActionDone();
    }
  };

  // Delegación de eventos en fase de captura para interceptar el evento de interacción
  document.body.addEventListener(step.evento, handleEvent, true);
  const isChangeEvent = step.evento === 'change';
  if (isChangeEvent) {
    document.body.addEventListener('blur', handleEvent, true);
  }

  activeListenerCleanup = () => {
    document.body.removeEventListener(step.evento, handleEvent, true);
    if (isChangeEvent) {
      document.body.removeEventListener('blur', handleEvent, true);
    }
  };
}

/**
 * Limpia los listeners activos del paso, cancela suscripciones pendientes de operaciones y voz.
 */
export function cleanupGuideEventListeners() {
  if (activeListenerCleanup) {
    activeListenerCleanup();
    activeListenerCleanup = null;
  }
  if (activeOperationCleanup) {
    activeOperationCleanup();
    activeOperationCleanup = null;
  }
  if (activeSpeechWaitCleanup) {
    activeSpeechWaitCleanup();
    activeSpeechWaitCleanup = null;
  }
  if (activeNarratorSubCleanup) {
    activeNarratorSubCleanup();
    activeNarratorSubCleanup = null;
  }
}
