let activeListenerCleanup: (() => void) | null = null;

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

  const handleEvent = (e: Event) => {
    const target = e.target as HTMLElement;
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
