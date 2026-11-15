import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';
import { CATALOGO_GUIAS, type Guide, type GuideStep } from './catalogoGuias';
import { initGuideEventListeners, cleanupGuideEventListeners } from './guideEvents';
import { voiceNarrator } from './voiceNarrator';
import { resolveAudioUrl } from './audioRegistry';
import type { GuideExecutionState } from './guideConfirmation';
import {
  updateStageStatus,
  setIniciacionCompleted,
  loadIniciacionProgress,
  saveIniciacionProgressOnExit,
  resetIniciacionProgress,
  getResolvedUserId
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

let isStoppingGuide = false;

/**
 * Stops the active guide, destroys the Driver.js instance, stops voice narration,
 * and cleans up event listeners and observers.
 */
export function stopActiveGuide() {
  if (isStoppingGuide) return;
  isStoppingGuide = true;

  try {
    voiceNarrator.stop();

    if (activeMutationObserver) {
      activeMutationObserver.disconnect();
      activeMutationObserver = null;
    }

    cleanupGuideEventListeners();

    if (driverObj) {
      const instance = driverObj;
      driverObj = null;
      try {
        instance.destroy();
      } catch {
        // Ignore destruction errors
      }
    }

    currentGuideId = null;
    currentStepIndex = 0;
  } finally {
    isStoppingGuide = false;
  }
}

/**
 * Starts a guide by its ID from the catalog, optionally resuming from a specific step.
 */
export function startGuide(guideId: string, initialStep?: number, userId?: string, forceFromZero = false) {
  stopActiveGuide();

  const normalized = guideId.trim().toLowerCase();
  const guide = CATALOGO_GUIAS.find(g => 
    g.id === normalized ||
    g.id === `guia-${normalized}` ||
    g.id === `guia-${normalized.padStart(2, '0')}` ||
    g.id.replace('guia-', '') === normalized.padStart(2, '0') ||
    (normalized.includes('actividad') && (g.id === 'agregar-actividad' || g.id === 'guia-12'))
  );
  if (!guide) return;

  currentGuideId = guide.id;
  activeUserId = getResolvedUserId(userId);

  // Si es la guía de iniciación y no se especificó un paso forzado desde cero, retomar progreso
  if (currentGuideId === 'iniciacion' && initialStep === undefined && !forceFromZero) {
    const saved = loadIniciacionProgress(activeUserId);
    if (saved.currentStepIndex > 0 && !saved.completed) {
      currentStepIndex = Math.max(0, Math.min(saved.currentStepIndex, guide.steps.length - 1));
    } else {
      currentStepIndex = 0;
    }
  } else {
    currentStepIndex = Math.max(0, Math.min(initialStep || 0, guide.steps.length - 1));
  }

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

// ── CONSTANTES VISUALES: ICONOS LUCIDE PARA EL POPOVER DEL TOUR ──
const ICON_VOLUME_2 = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path><path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path></svg>`;
const ICON_VOLUME_X = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><line x1="22" y1="9" x2="16" y2="15"></line><line x1="16" y1="9" x2="22" y2="15"></line></svg>`;
const ICON_PAUSE = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>`;
const ICON_PLAY = `<svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>`;
const ICON_ROTATE_CCW = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path><path d="M3 3v5h5"></path></svg>`;

const EMBLEM_SVG = `
  <div class="cielo-tour-emblem-wrap">
    <svg viewBox="0 0 64 64" class="cielo-tour-emblem-svg" fill="none">
      <circle cx="32" cy="32" r="28" fill="#FFF7ED" stroke="#FFEDD5" stroke-width="1.5" />
      <path d="M14 18 L18 20 M10 30 L14 30 M15 42 L18 40" stroke="#FDBA74" stroke-width="2" stroke-linecap="round" />
      <polygon points="32,18 52,27 32,36 12,27" fill="#EB8847" stroke="#9A3412" stroke-width="2.2" stroke-linejoin="round" />
      <path d="M20 31 L20 42 Q32 49 44 42 L44 31" fill="#C2410C" stroke="#9A3412" stroke-width="2.2" />
      <path d="M32,27 L48,36 L48,46" stroke="#DEAE4D" stroke-width="2" stroke-linecap="round" />
      <circle cx="48" cy="47" r="2.8" fill="#DEAE4D" stroke="#B45309" stroke-width="1" />
    </svg>
  </div>
`;

/**
 * Separa el texto de la instrucción en un titular con alta presencia y descripción cómoda.
 */
function parseStepContent(texto: string): { title: string; description: string } {
  const match = texto.match(/^([^.!?]+[.!?])\s*(.*)$/);
  if (match && match[1] && match[2] && match[2].trim().length > 0) {
    return {
      title: match[1].trim(),
      description: match[2].trim()
    };
  }
  return {
    title: texto.trim(),
    description: ''
  };
}

/**
 * Builds the interactive HTML content for the guide popover, including voice and exit controls.
 */
function buildPopoverHtml(step: GuideStep, currentIdx: number, totalSteps: number, guide: Guide): string {
  const isMuted = voiceNarrator.isMuted();
  const isPaused = voiceNarrator.isPaused();

  let stageNumber = step.etapa || 1;
  let sectionTitle = guide.titulo;

  if (step.tituloEtapa) {
    const etapaMatch = step.tituloEtapa.match(/Etapa\s*(\d+)\s*:\s*(.*)/i);
    if (etapaMatch) {
      stageNumber = parseInt(etapaMatch[1], 10) || stageNumber;
      sectionTitle = etapaMatch[2].trim();
    } else {
      sectionTitle = step.tituloEtapa.trim();
    }
  } else if (guide.titulo) {
    sectionTitle = guide.titulo.replace(/^Guía\s*(de)?\s*/i, '').trim();
  }

  const { title, description } = parseStepContent(step.texto);
  const progressPercent = Math.round(((currentIdx + 1) / totalSteps) * 100);

  return `
    <div class="cielo-tour-popover-card">
      <div class="cielo-tour-header">
        <div class="cielo-tour-header-left">
          <div class="cielo-tour-stage-indicator">
            <span class="cielo-tour-stage-num">${stageNumber}</span>
          </div>
          <span class="cielo-tour-header-divider"></span>
          <h4 class="cielo-tour-section-title">${sectionTitle}</h4>
        </div>
        <div class="cielo-tour-progress-badge">
          Paso ${currentIdx + 1} de ${totalSteps}
        </div>
      </div>

      <div class="cielo-tour-progress-track">
        <div class="cielo-tour-progress-bar" style="width: ${progressPercent}%"></div>
      </div>

      <div class="cielo-tour-body">
        ${EMBLEM_SVG}
        <div class="cielo-tour-content-text">
          <h3 class="cielo-tour-headline">${title}</h3>
          ${description ? `<p class="cielo-tour-description">${description}</p>` : ''}
          <div id="cielo-tour-status-container" class="cielo-tour-status-container"></div>
        </div>
      </div>

      <div class="cielo-tour-footer">
        <div class="cielo-tour-audio-controls">
          <button type="button" id="cielo-guide-mute-btn" class="cielo-tour-ctrl-btn ${isMuted ? 'is-muted' : ''}" title="${isMuted ? 'Activar voz' : 'Silenciar voz'}">
            ${isMuted ? ICON_VOLUME_X : ICON_VOLUME_2}
          </button>
          <button type="button" id="cielo-guide-pause-btn" class="cielo-tour-ctrl-btn" title="${isPaused ? 'Reanudar voz' : 'Pausar voz'}">
            ${isPaused ? ICON_PLAY : ICON_PAUSE}
          </button>
          <button type="button" id="cielo-guide-replay-btn" class="cielo-tour-ctrl-btn" title="Repetir instrucción">
            ${ICON_ROTATE_CCW}
          </button>
        </div>
        <div class="cielo-tour-footer-actions">
          ${currentGuideId === 'iniciacion' && currentStepIndex > 0 ? `
            <button type="button" id="cielo-guide-restart-btn" class="cielo-tour-restart-action" title="Reiniciar voluntariamente todo el recorrido desde cero">
              Comenzar desde cero
            </button>
          ` : ''}
          <button type="button" id="cielo-guide-exit-btn" class="cielo-tour-exit-action" title="Guardar progreso y salir">
            Guardar y salir
          </button>
        </div>
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
        muteBtn.innerHTML = nextMuted ? ICON_VOLUME_X : ICON_VOLUME_2;
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
          pauseBtn.innerHTML = ICON_PAUSE;
          pauseBtn.title = 'Pausar voz';
        } else {
          voiceNarrator.pause();
          pauseBtn.innerHTML = ICON_PLAY;
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

    const restartBtn = document.getElementById('cielo-guide-restart-btn');
    if (restartBtn) {
      restartBtn.onclick = (e) => {
        e.stopPropagation();
        if (window.confirm('¿Deseas reiniciar la guía de iniciación desde el principio?')) {
          resetIniciacionProgress(activeUserId);
          stopActiveGuide();
          setTimeout(() => {
            startGuide('iniciacion', 0, activeUserId || undefined, true);
          }, 150);
        }
      };
    }

    const exitBtn = document.getElementById('cielo-guide-exit-btn');
    if (exitBtn) {
      exitBtn.onclick = (e) => {
        e.stopPropagation();
        if (currentGuideId === 'iniciacion') {
          saveIniciacionProgressOnExit(activeUserId, currentStepIndex);
        }
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
 * Actualiza el indicador visual de estado de ejecución dentro del popover.
 */
function updatePopoverStatus(state: GuideExecutionState, message?: string) {
  const container = document.getElementById('cielo-tour-status-container');
  if (!container) return;

  if (state === 'operacion_en_proceso') {
    container.innerHTML = `
      <div class="cielo-tour-status-pill in-progress">
        <span class="cielo-tour-spinner"></span>
        <span>${message || 'Guardando en CIELO…'}</span>
      </div>
    `;
  } else if (state === 'operacion_completada') {
    container.innerHTML = `
      <div class="cielo-tour-status-pill success">
        <span class="cielo-tour-check">✓</span>
        <span>${message || '¡Operación confirmada!'}</span>
      </div>
    `;
  } else if (state === 'operacion_fallida') {
    container.innerHTML = `
      <div class="cielo-tour-status-pill error">
        <span>⚠</span>
        <span>${message || 'Error en la operación. Inténtalo de nuevo.'}</span>
      </div>
    `;
  } else {
    container.innerHTML = '';
  }
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

    // Reproducir narración neuronal de forma estrictamente idempotente (una sola vez por paso)
    const stepText = step.voz || step.texto;
    const stepKey = `${currentGuideId}:${currentStepIndex}:${stepText}`;
    const audioUrl = resolveAudioUrl(currentGuideId, currentStepIndex);
    voiceNarrator.speak(stepText, audioUrl, { stepKey });

    // Precargar de manera anticipada el audio del siguiente paso para latencia cero
    if (guide.steps[currentStepIndex + 1]) {
      const nextAudioUrl = resolveAudioUrl(currentGuideId, currentStepIndex + 1);
      voiceNarrator.preload(nextAudioUrl);
    }

    // Bind audio toolbar buttons inside popover
    bindPopoverControls();
  } catch (e) {
    console.error('[driverGuides] Failed to highlight:', resolvedSelector, e);
  }

  // Setup event listener that triggers advancing to next step when user interacts with target element
  initGuideEventListeners(step, () => {
    requestAnimationFrame(() => {
      advanceStep();
    });
  }, (state, message) => {
    updatePopoverStatus(state, message);
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
