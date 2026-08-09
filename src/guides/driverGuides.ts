import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';
import { CATALOGO_GUIAS } from './catalogoGuias';
import { initGuideEventListeners, cleanupGuideEventListeners } from './guideEvents';

let driverObj: any = null;
let currentGuideId: string | null = null;
let currentStepIndex = 0;
let activeMutationObserver: MutationObserver | null = null;

export function isGuideActive(): boolean {
  return !!currentGuideId;
}

export function getCurrentGuideId(): string | null {
  return currentGuideId;
}

export function getCurrentStepIndex(): number {
  return currentStepIndex;
}

/**
 * Stops the active guide, destroys the Driver.js instance, and cleans up event listeners and observers.
 */
export function stopActiveGuide() {
  if (activeMutationObserver) {
    activeMutationObserver.disconnect();
    activeMutationObserver = null;
  }
  
  cleanupGuideEventListeners();

  if (driverObj) {
    try {
      driverObj.destroy();
    } catch (e) {
      // Ignore destruction errors
    }
    driverObj = null;
  }

  currentGuideId = null;
  currentStepIndex = 0;
}

/**
 * Starts a guide by its ID from the catalog.
 */
export function startGuide(guideId: string) {
  stopActiveGuide();

  const guide = CATALOGO_GUIAS.find(g => g.id === guideId);
  if (!guide) return;

  currentGuideId = guideId;
  currentStepIndex = 0;

  // Configure Driver.js options according to instructions
  driverObj = driver({
    showButtons: [], // Disables default navigation buttons
    allowClose: true,
    overlayColor: 'rgba(0, 0, 0, 0.45)',
    onDestroyed: () => {
      stopActiveGuide();
    }
  });

  highlightStep();
}

/**
 * Dynamically resolves selectors to their parent container for group highlighting (e.g. students).
 */
function getResolvedSelector(selector: string): string {
  if (selector === '[data-guide="seleccionar-estudiantes"]') {
    const firstStudent = document.querySelector('[data-guide="seleccionar-estudiantes"]');
    if (firstStudent && firstStudent.parentElement) {
      const parent = firstStudent.parentElement;
      if (!parent.id) {
        parent.id = 'dynamic-students-container';
      }
      return '#' + parent.id;
    }
  }
  if (selector === '[data-guide="celda-cotejo"]') {
    const firstCell = document.querySelector('[data-guide="celda-cotejo"]');
    const table = firstCell?.closest('table');
    if (table) {
      if (!table.id) {
        table.id = 'dynamic-cotejo-table';
      }
      return '#' + table.id;
    }
  }
  return selector;
}

/**
 * Highlights the current step of the active guide.
 */
export function highlightStep() {
  if (!currentGuideId || !driverObj) return;

  const guide = CATALOGO_GUIAS.find(g => g.id === currentGuideId);
  if (!guide) return;

  const step = guide.steps[currentStepIndex];
  if (!step) {
    stopActiveGuide();
    return;
  }

  // Check if the target element exists in the DOM. If not, wait for it using a MutationObserver
  const resolvedSelector = getResolvedSelector(step.selector);
  const element = document.querySelector(resolvedSelector);
  if (!element) {
    waitForElement(resolvedSelector, () => {
      if (currentGuideId === guide.id) {
        highlightElement(step, resolvedSelector);
      }
    });
    return;
  }

  highlightElement(step, resolvedSelector);
}

/**
 * Displays the Driver.js popover on the target element and initializes interaction listeners.
 */
function highlightElement(step: any, resolvedSelector: string) {
  if (!driverObj || !currentGuideId) return;

  try {
    driverObj.highlight({
      element: resolvedSelector,
      popover: {
        description: step.texto,
        side: 'bottom',
        align: 'start'
      }
    });
  } catch (e) {
    console.error('[driverGuides] Failed to highlight:', resolvedSelector, e);
  }

  // Setup the event listener that triggers advancing to the next step when the action is executed
  initGuideEventListeners(step.selector, step.evento, () => {
    // Delay slightly to allow the React state/DOM to update before highlighting the next step
    requestAnimationFrame(() => {
      advanceStep();
    });
  });
}

/**
 * Advances the active guide to the next step.
 */
export function advanceStep() {
  if (!currentGuideId) return;

  const guide = CATALOGO_GUIAS.find(g => g.id === currentGuideId);
  if (!guide) return;

  currentStepIndex++;
  if (currentStepIndex >= guide.steps.length) {
    stopActiveGuide();
  } else {
    highlightStep();
  }
}

/**
 * Executes driverObj.moveNext() and advances internal step tracking.
 */
export function moveNext() {
  if (driverObj && typeof driverObj.moveNext === 'function') {
    try {
      driverObj.moveNext();
    } catch (e) {
      console.error('[driverGuides] moveNext failed:', e);
    }
  }
  advanceStep();
}

/**
 * Watches the DOM to wait for a target selector to become available without arbitrary timers.
 */
function waitForElement(selector: string, callback: () => void) {
  if (activeMutationObserver) {
    activeMutationObserver.disconnect();
  }

  const checkExist = document.querySelector(selector);
  if (checkExist) {
    callback();
    return;
  }

  activeMutationObserver = new MutationObserver((_mutations, obs) => {
    const el = document.querySelector(selector);
    if (el) {
      obs.disconnect();
      activeMutationObserver = null;
      callback();
    }
  });

  activeMutationObserver.observe(document.body, {
    childList: true,
    subtree: true
  });
}
