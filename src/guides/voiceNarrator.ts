/**
 * Voice narrator service for CIELO using Web Speech API (SpeechSynthesis).
 * Provides natural Spanish narration with pause, resume, replay and mute controls.
 */

class VoiceNarrator {
  private synth: SpeechSynthesis | null = null;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private isMutedState = false;
  private currentText = '';
  private cachedVoices: SpeechSynthesisVoice[] = [];
  private listeners: Set<() => void> = new Set();
  private isPausedState = false;

  constructor() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.synth = window.speechSynthesis;
      this.loadVoices();
      if (this.synth.onvoiceschanged !== undefined) {
        this.synth.onvoiceschanged = () => this.loadVoices();
      }
      try {
        const savedMute = localStorage.getItem('cielo_narrator_muted');
        if (savedMute !== null) {
          this.isMutedState = savedMute === 'true';
        }
      } catch {
        // Ignore localStorage restrictions
      }
    }
  }

  private loadVoices() {
    if (!this.synth) return;
    try {
      this.cachedVoices = this.synth.getVoices();
    } catch {
      this.cachedVoices = [];
    }
  }

  private getSpanishVoice(): SpeechSynthesisVoice | null {
    if (!this.cachedVoices.length && this.synth) {
      this.loadVoices();
    }
    const priorityCodes = ['es-DO', 'es-US', 'es-MX', 'es-419', 'es-ES'];
    for (const code of priorityCodes) {
      const match = this.cachedVoices.find(v => v.lang.toLowerCase() === code.toLowerCase());
      if (match) return match;
    }
    return this.cachedVoices.find(v => v.lang.toLowerCase().startsWith('es')) || null;
  }

  public speak(text: string) {
    if (!this.synth) return;
    this.stop();
    this.currentText = text;
    this.isPausedState = false;

    if (this.isMutedState) {
      this.notify();
      return;
    }

    // Clean plain text
    const cleanText = text
      .replace(/<[^>]*>?/gm, ' ')
      .replace(/[«»]/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    if (!cleanText) return;

    try {
      const utterance = new SpeechSynthesisUtterance(cleanText);
      const voice = this.getSpanishVoice();
      if (voice) {
        utterance.voice = voice;
        utterance.lang = voice.lang;
      } else {
        utterance.lang = 'es-ES';
      }
      utterance.rate = 0.95; // Natural, calm pace
      utterance.pitch = 1.0;
      utterance.volume = 1.0;

      utterance.onend = () => {
        this.currentUtterance = null;
        this.isPausedState = false;
        this.notify();
      };

      utterance.onerror = (e) => {
        // e.error === 'canceled' or 'interrupted' is expected when stopping/advancing
        if (e.error !== 'canceled' && e.error !== 'interrupted') {
          console.warn('[voiceNarrator] Utterance error:', e.error);
        }
        this.currentUtterance = null;
        this.isPausedState = false;
        this.notify();
      };

      this.currentUtterance = utterance;
      this.synth.speak(utterance);
      this.notify();
    } catch (err) {
      console.warn('[voiceNarrator] speak error:', err);
    }
  }

  public pause() {
    if (this.synth && this.synth.speaking && !this.synth.paused) {
      try {
        this.synth.pause();
        this.isPausedState = true;
        this.notify();
      } catch (err) {
        console.warn('[voiceNarrator] pause error:', err);
      }
    }
  }

  public resume() {
    if (this.synth && this.synth.paused) {
      try {
        this.synth.resume();
        this.isPausedState = false;
        this.notify();
      } catch (err) {
        console.warn('[voiceNarrator] resume error:', err);
      }
    } else if (this.currentText && !this.isSpeaking()) {
      this.speak(this.currentText);
    }
  }

  public replay() {
    if (this.currentText) {
      this.speak(this.currentText);
    }
  }

  public stop() {
    if (this.synth) {
      try {
        this.synth.cancel();
      } catch (err) {
        console.warn('[voiceNarrator] cancel error:', err);
      }
      this.currentUtterance = null;
      this.isPausedState = false;
      this.notify();
    }
  }

  public setMuted(muted: boolean) {
    this.isMutedState = muted;
    try {
      localStorage.setItem('cielo_narrator_muted', String(muted));
    } catch {
      // Ignore
    }
    if (muted) {
      this.stop();
    } else if (this.currentText) {
      this.speak(this.currentText);
    } else {
      this.notify();
    }
  }

  public isMuted(): boolean {
    return this.isMutedState;
  }

  public isSpeaking(): boolean {
    return !!(this.synth && (this.synth.speaking || this.currentUtterance) && !this.synth.paused);
  }

  public isPaused(): boolean {
    return this.isPausedState || !!(this.synth && this.synth.paused);
  }

  public isSupported(): boolean {
    return !!this.synth;
  }

  public subscribe(cb: () => void): () => void {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  private notify() {
    this.listeners.forEach(cb => {
      try {
        cb();
      } catch {
        // Ignore subscriber errors
      }
    });
  }
}

export const voiceNarrator = new VoiceNarrator();
