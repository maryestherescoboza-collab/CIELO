import { highlightStep, moveNext, getCurrentStepIndex } from './driverGuides';
import type { GuideStep } from './catalogoGuias';
import { 
  subscribeGuideOperations, 
  type GuideExecutionState,
  type GuideOperationEventDetail 
} from './guideConfirmation';
import { voiceNarrator } from './voiceNarrator';

let activeListenerCleanup: (() => void) | null = null;
let activeOperationCleanup: (() => void) | null = null;
let lastStepActivationTime = 0;
let studentClickCount = 0;
let lastActiveStepIndex = -1;

/**
 * Inicializa la escucha de eventos e interacciones del paso activo.
 * - Detecta clics e interacciones de usuario en el target action.
 * - Si el paso requiere confirmación real (esperarOperacion), no avanza prematuramente:
 *   espera la respuesta exitosa del proceso asíncrono real de CIELO (ej. Supabase INSERT),
 *   muestra la confirmación breve, ejecuta la pausa natural y solo entonces avanza.
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

  // Selector del objetivo de acción: si tiene targetActionSelector usa ese, sino el selector del paso
  const actionSelector = step.targetActionSelector || step.selector;

  if (step.selector === '[data-guide="seleccionar-estudiantes"]') {
    const currentIdx = getCurrentStepIndex();
    if (currentIdx !== lastActiveStepIndex) {
      studentClickCount = 0;
      lastActiveStepIndex = currentIdx;
    }
  }

  // ── REGLA ESPECÍFICA: PASO 3 DE AGREGAR ACTIVIDAD (PRODUCTO) ──
  // No avanzar hasta detectar que el campo Producto tiene contenido válido (mínimo 3 caracteres).
  if (step.selector === '[data-guide="modal-actividad-producto"]') {
    let debounceTimer: any = null;

    const checkAndAdvance = (val: string) => {
      if (hasAdvanced) return;
      if (val.trim().length >= 3) {
        hasAdvanced = true;
        cleanupGuideEventListeners();
        onAdvance();
      }
    };

    const handleInput = (e: Event) => {
      const input = e.target as HTMLInputElement;
      const val = input?.value || '';
      if (debounceTimer) clearTimeout(debounceTimer);
      if (val.trim().length >= 3) {
        debounceTimer = setTimeout(() => {
          checkAndAdvance(val);
        }, 1200);
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

    document.body.addEventListener('input', handleInput, true);
    document.body.addEventListener('keydown', handleKeydown as any, true);
    document.body.addEventListener('change', handleChangeOrBlur, true);
    document.body.addEventListener('blur', handleChangeOrBlur, true);
    document.body.addEventListener('click', handleClickGuardar, true);

    activeListenerCleanup = () => {
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
          hasAdvanced = true;
          isOperationInProgress = false;
          const successMsg = detail.message || step.mensajeExito || '¡Operación confirmada con éxito!';
          
          onStateChange?.('operacion_completada', successMsg);

          // Narrar breve confirmación si está configurada
          if (step.mensajeExito) {
            voiceNarrator.speak(step.mensajeExito, null, { force: true });
          }

          // Pausa natural (1.4s) antes de avanzar al siguiente proceso
          setTimeout(() => {
            cleanupGuideEventListeners();
            onAdvance();
          }, 1400);
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

    // Prevenir saltos accidentales por rebotes de clics en menos de 400ms
    if (step.evento === 'click' && Date.now() - lastStepActivationTime < 400) {
      return;
    }

    const target = e.target as HTMLElement;
    if (!target) return;

    // Lógica para contar clics en selección de estudiantes
    if (step.selector === '[data-guide="seleccionar-estudiantes"]') {
      if (target.matches(step.selector) || target.closest(step.selector)) {
        studentClickCount++;
        if (studentClickCount >= 3) {
          hasAdvanced = true;
          cleanupGuideEventListeners();
          moveNext();
        } else {
          requestAnimationFrame(() => {
            highlightStep();
          });
        }
      }
      return;
    }

    // ── REGLA ESPECÍFICA: PASO 1 DE ACTIVIDAD (CONTENIDOS) ──
    // No avanzar si el usuario no pulsa sobre un ítem de contenido real
    if (step.selector === '[data-guide="modal-actividad-selector-contenidos"]') {
      const clickedItem = target.closest('[data-guide="item-contenido"]') || target.closest('[data-guide="modal-actividad-selector-contenidos"] button');
      if (!clickedItem) {
        return;
      }
      hasAdvanced = true;
      setTimeout(() => {
        cleanupGuideEventListeners();
        onAdvance();
      }, 400);
      return;
    }

    // ── REGLA ESPECÍFICA: PASO 2 DE ACTIVIDAD (INDICADORES DE LOGRO) ──
    // No avanzar si el usuario no selecciona un indicador real
    if (step.selector === '[data-guide="modal-actividad-selector-indicadores"]') {
      const clickedItem = target.closest('[data-guide="item-indicador"]');
      if (!clickedItem) {
        return;
      }
      hasAdvanced = true;
      setTimeout(() => {
        cleanupGuideEventListeners();
        onAdvance();
      }, 400);
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
      hasAdvanced = true;
      cleanupGuideEventListeners();
      onAdvance();
    }
  };

  // Delegación de eventos en fase de captura para interceptar el evento de interacción
  document.body.addEventListener(step.evento, handleEvent, true);

  activeListenerCleanup = () => {
    document.body.removeEventListener(step.evento, handleEvent, true);
  };
}

/**
 * Limpia los listeners activos del paso y cancela suscripciones pendientes de operaciones.
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
}
