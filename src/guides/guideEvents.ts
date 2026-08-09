import { highlightStep, moveNext, getCurrentStepIndex } from './driverGuides';

let activeListenerCleanup: (() => void) | null = null;
let lastStepActivationTime = 0;
let studentClickCount = 0;
let lastActiveStepIndex = -1;

/**
 * Initializes a global event listener on document.body using event delegation (capture phase)
 * to detect when the user interacts with the targeted element of the active guide step.
 */
export function initGuideEventListeners(
  selector: string,
  eventType: 'click' | 'change',
  onAdvance: () => void
) {
  cleanupGuideEventListeners();

  lastStepActivationTime = Date.now();

  if (selector === '[data-guide="seleccionar-estudiantes"]') {
    const currentIdx = getCurrentStepIndex();
    if (currentIdx !== lastActiveStepIndex) {
      studentClickCount = 0;
      lastActiveStepIndex = currentIdx;
    }
  }

  const handleEvent = (e: Event) => {
    // Prevent automated skipping from rapid successive clicks, double clicks, 
    // or mouseup events triggered when dropdowns close.
    if (eventType === 'click' && Date.now() - lastStepActivationTime < 400) {
      return;
    }

    const target = e.target as HTMLElement;

    // Lógica para contar clics en estudiantes:
    // Permite seleccionar hasta 3 estudiantes antes de avanzar.
    if (selector === '[data-guide="seleccionar-estudiantes"]') {
      if (target && (target.matches(selector) || target.closest(selector))) {
        studentClickCount++;
        if (studentClickCount >= 3) {
          moveNext();
        } else {
          // Reposicionar el popup/overlay del tutorial después de que el DOM y el scroll se actualicen
          requestAnimationFrame(() => {
            highlightStep();
          });
        }
      }
      return;
    }

    if (target && (target.matches(selector) || target.closest(selector))) {
      // For change events on text inputs, the change event only fires when the value is modified and blurred.
      // This ensures we do not advance simply on focus.
      onAdvance();
    }
  };

  // Using capture phase (true) ensures we intercept events reliably
  document.body.addEventListener(eventType, handleEvent, true);

  activeListenerCleanup = () => {
    document.body.removeEventListener(eventType, handleEvent, true);
  };
}

/**
 * Cleans up any active guide event listeners to prevent memory leaks.
 */
export function cleanupGuideEventListeners() {
  if (activeListenerCleanup) {
    activeListenerCleanup();
    activeListenerCleanup = null;
  }
}
