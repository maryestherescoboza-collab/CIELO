import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';
import { CATALOGO_GUIAS, type Guide, type GuideStep } from './catalogoGuias';
import { initGuideEventListeners, cleanupGuideEventListeners } from './guideEvents';
import { voiceNarrator } from './voiceNarrator';
import {
  updateStageStatus,
  setIniciacionCompleted
} from './iniciacionState';

let driverObj: any = null;
let currentGuideId: string | null = null;
let currentStepIndex = 0;
let activeUserId: string | null = null;
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

export function getActiveUserId(): string | null {
  return activeUserId;
}

/**
 * Stops the active guide, destroys the Driver.js instance, stops voice narration,
 * and cleans up event listeners and observers.
 */
export function stopActiveGuide() {
  voiceNarrator.stop();

  if (activeMutationObserver) {
    activeMutationObserver.disconnect();
    activeMutationObserver = null;
  }

  cleanupGuideEventListeners();

  if (driverObj) {
    try {
      driverObj.destroy();
    } catch {
      // Ignore destruction errors
    }
    driverObj = null;
  }

  currentGuideId = null;
  currentStepIndex = 0;
}

/**
 * Starts a guide by its ID from the catalog, optionally resuming from a specific step.
 */
export function startGuide(guideId: string, initialStep = 0, userId?: string) {
  stopActiveGuide();

  // Guía inicial oculta para todos los docentes
  if (guideId === 'iniciacion') return;

  const guide = CATALOGO_GUIAS.find(g => g.id === guideId);
  if (!guide) return;

  currentGuideId = guideId;
  activeUserId = userId || null;
  currentStepIndex = Math.max(0, Math.min(initialStep, guide.steps.length - 1));

  // Configure Driver.js instance
  driverObj = driver({
    showButtons: [], // Custom interactive controls handled inside popover
    allowClose: true,
    overlayColor: 'rgba(0, 0, 0, 0.55)',
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
  // Support comma-separated selectors: pick first match in DOM
  if (selector.includes(',')) {
    const parts = selector.split(',').map(s => s.trim());
    for (const part of parts) {
      if (document.querySelector(part)) {
        return part;
      }
    }
    return parts[0];
  }

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
 * Builds the interactive HTML content for the guide popover, including voice and exit controls.
 */
function buildPopoverHtml(step: GuideStep, currentIdx: number, totalSteps: number, guide: Guide): string {
  const isMuted = voiceNarrator.isMuted();
  const isPaused = voiceNarrator.isPaused();
  const stageHeader = step.tituloEtapa
    ? `<div class="cielo-tour-stage-badge">${step.tituloEtapa}</div>`
    : `<div class="cielo-tour-stage-badge">${guide.titulo}</div>`;

  return `
    <div class="cielo-tour-popover-card">
      <div class="cielo-tour-header">
        ${stageHeader}
        <span class="cielo-tour-step-counter">Paso ${currentIdx + 1} de ${totalSteps}</span>
      </div>
      <p class="cielo-tour-text">${step.texto}</p>
      <div class="cielo-tour-footer">
        <div class="cielo-tour-audio-controls">
          <button type="button" id="cielo-guide-mute-btn" class="cielo-tour-btn ${isMuted ? 'is-muted' : ''}" title="${isMuted ? 'Activar voz' : 'Silenciar voz'}">
            ${isMuted ? '🔇' : '🔊'}
          </button>
          <button type="button" id="cielo-guide-pause-btn" class="cielo-tour-btn" title="${isPaused ? 'Reanudar voz' : 'Pausar voz'}">
            ${isPaused ? '▶' : '⏸'}
          </button>
          <button type="button" id="cielo-guide-replay-btn" class="cielo-tour-btn" title="Repetir instrucción">
            🔁
          </button>
        </div>
        <button type="button" id="cielo-guide-exit-btn" class="cielo-tour-exit-action" title="Guardar progreso y salir">
          Guardar y salir
        </button>
      </div>
    </div>
  `;
}

/**
 * Attaches interactive click handlers to voice narrator buttons rendered in the popover.
 */
function bindPopoverControls() {
  requestAnimationFrame(() => {
    const muteBtn = document.getElementById('cielo-guide-mute-btn');
    if (muteBtn) {
      muteBtn.onclick = (e) => {
        e.stopPropagation();
        const nextMuted = !voiceNarrator.isMuted();
        voiceNarrator.setMuted(nextMuted);
        muteBtn.innerHTML = nextMuted ? '🔇' : '🔊';
        muteBtn.title = nextMuted ? 'Activar voz' : 'Silenciar voz';
        muteBtn.classList.toggle('is-muted', nextMuted);
      };
    }

    const pauseBtn = document.getElementById('cielo-guide-pause-btn');
    if (pauseBtn) {
      pauseBtn.onclick = (e) => {
        e.stopPropagation();
        if (voiceNarrator.isPaused()) {
          voiceNarrator.resume();
          pauseBtn.innerHTML = '⏸';
          pauseBtn.title = 'Pausar voz';
        } else {
          voiceNarrator.pause();
          pauseBtn.innerHTML = '▶';
          pauseBtn.title = 'Reanudar voz';
        }
      };
    }

    const replayBtn = document.getElementById('cielo-guide-replay-btn');
    if (replayBtn) {
      replayBtn.onclick = (e) => {
        e.stopPropagation();
        voiceNarrator.replay();
      };
    }

    const exitBtn = document.getElementById('cielo-guide-exit-btn');
    if (exitBtn) {
      exitBtn.onclick = (e) => {
        e.stopPropagation();
        stopActiveGuide();
      };
    }
  });
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

  // Update onboarding state if this is the onboarding guide
  if (currentGuideId === 'iniciacion' && activeUserId && step.etapa) {
    updateStageStatus(activeUserId, step.etapa as 1 | 2 | 3 | 4 | 5, 'en_progreso', currentStepIndex);
  }

  // Check if target element exists in DOM; if not, wait using MutationObserver
  const resolvedSelector = getResolvedSelector(step.selector);
  const element = document.querySelector(resolvedSelector);
  if (!element) {
    waitForElement(resolvedSelector, () => {
      if (currentGuideId === guide.id) {
        highlightElement(step, resolvedSelector, guide);
      }
    });
    return;
  }

  highlightElement(step, resolvedSelector, guide);
}

/**
 * Displays the Driver.js popover on the target element and initializes interaction listeners.
 */
function highlightElement(step: GuideStep, resolvedSelector: string, guide: Guide) {
  if (!driverObj || !currentGuideId) return;

  try {
    const popoverHtml = buildPopoverHtml(step, currentStepIndex, guide.steps.length, guide);

    driverObj.highlight({
      element: resolvedSelector,
      popover: {
        description: popoverHtml,
        side: 'bottom',
        align: 'start'
      }
    });

    // Speak instruction using Web Speech API
    voiceNarrator.speak(step.voz || step.texto);

    // Bind audio toolbar buttons inside popover
    bindPopoverControls();
  } catch (e) {
    console.error('[driverGuides] Failed to highlight:', resolvedSelector, e);
  }

  // Setup event listener that triggers advancing to next step when user interacts with target element
  initGuideEventListeners(step.selector, step.evento, () => {
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

  voiceNarrator.stop();

  const prevStep = guide.steps[currentStepIndex];
  currentStepIndex++;

  if (currentGuideId === 'iniciacion' && activeUserId && prevStep?.etapa) {
    const nextStep = guide.steps[currentStepIndex];
    // If we transitioned to a new stage or completed all steps
    if (!nextStep || nextStep.etapa !== prevStep.etapa) {
      updateStageStatus(activeUserId, prevStep.etapa as 1 | 2 | 3 | 4 | 5, 'completada', currentStepIndex);
    }
  }

  if (currentStepIndex >= guide.steps.length) {
    // Guide completed!
    if (currentGuideId === 'iniciacion' && activeUserId) {
      setIniciacionCompleted(activeUserId);
      window.dispatchEvent(new CustomEvent('cielo-iniciacion-celebration'));
    }
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
