/**
 * Servicio de narración neuronal para CIELO.
 *
 * Arquitectura híbrida:
 * 1. Reproducción de audio neuronal natural pregenerado (Microsoft Azure AI Speech es-DO-RamonaNeural / ElevenLabs)
 *    almacenado en Supabase Storage o CDN con precarga anticipada (0ms latencia).
 * 2. Fallback de emergencia a Web Speech API (SpeechSynthesis) si el archivo de audio no está disponible o falla la red.
 * 3. Controles integrales: Play, Pausa, Reanudar, Repetir y Silenciar (persistido en localStorage).
 */

class VoiceNarrator {
  private audioElement: HTMLAudioElement | null = null;
  private currentAudioUrl: string | null = null;
  private preloadedAudio: HTMLAudioElement | null = null;

  private synth: SpeechSynthesis | null = null;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private cachedVoices: SpeechSynthesisVoice[] = [];

  private isMutedState = false;
  private currentText = '';
  private isPausedState = false;
  private isUsingFallbackSynth = false;

  private listeners: Set<() => void> = new Set();

  constructor() {
    if (typeof window !== 'undefined') {
      // 1. Inicialización de Audio Element para audio neuronal
      this.audioElement = new Audio();
      this.audioElement.preload = 'auto';

      this.audioElement.onended = () => {
        this.isPausedState = false;
        this.notify();
      };

      this.audioElement.onerror = () => {
        // En caso de error de red o audio inexistente, activar fallback SpeechSynthesis
        console.info('[voiceNarrator] Audio neuronal no disponible. Activando fallback sintético.');
        this.fallbackToSpeechSynthesis(this.currentText);
      };

      // 2. Inicialización de SpeechSynthesis como respaldo
      if ('speechSynthesis' in window) {
        this.synth = window.speechSynthesis;
        this.loadVoices();
        if (this.synth.onvoiceschanged !== undefined) {
          this.synth.onvoiceschanged = () => this.loadVoices();
        }
      }

      // 3. Recuperar estado de silencio
      try {
        const savedMute = localStorage.getItem('cielo_narrator_muted');
        if (savedMute !== null) {
          this.isMutedState = savedMute === 'true';
        }
      } catch {
        // Ignorar restricciones de almacenamiento
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

  /**
   * Precarga el audio del siguiente paso en segundo plano para evitar retrasos de buffering.
   */
  public preload(audioUrl?: string | null) {
    if (!audioUrl || typeof window === 'undefined') return;
    try {
      this.preloadedAudio = new Audio();
      this.preloadedAudio.preload = 'auto';
      this.preloadedAudio.src = audioUrl;
    } catch {
      // Ignorar fallos de precarga
    }
  }

  /**
   * Reproduce una instrucción, priorizando el archivo de audio neuronal.
   */
  public speak(text: string, audioUrl?: string | null) {
    this.stop();
    this.currentText = text;
    this.currentAudioUrl = audioUrl || null;
    this.isPausedState = false;
    this.isUsingFallbackSynth = false;

    if (this.isMutedState) {
      this.notify();
      return;
    }

    // 1. Si disponemos de una URL de audio neuronal válida, reproducirla con HTMLAudio
    if (audioUrl && this.audioElement) {
      try {
        this.audioElement.src = audioUrl;
        this.audioElement.currentTime = 0;
        const playPromise = this.audioElement.play();
        if (playPromise !== undefined) {
          playPromise
            .then(() => {
              this.notify();
            })
            .catch((err) => {
              // El navegador puede bloquear autoplay sin interacción previa del usuario
              if (err.name === 'NotAllowedError') {
                console.warn('[voiceNarrator] Autoplay bloqueado hasta interacción del usuario.');
              } else {
                console.warn('[voiceNarrator] Fallo de reproducción audio neuronal:', err);
                this.fallbackToSpeechSynthesis(text);
              }
            });
        }
        return;
      } catch (err) {
        console.warn('[voiceNarrator] Error iniciando audio HTML:', err);
      }
    }

    // 2. Si no hay audioUrl o falló el elemento de audio, usar SpeechSynthesis
    this.fallbackToSpeechSynthesis(text);
  }

  /**
   * Fallback de emergencia utilizando SpeechSynthesis con voz española y entonación mejorada.
   */
  private fallbackToSpeechSynthesis(text: string) {
    if (!this.synth || this.isMutedState) {
      this.notify();
      return;
    }

    this.isUsingFallbackSynth = true;

    // Limpieza de etiquetas
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
      utterance.rate = 0.95; // Ritmo pausado y pedagógico
      utterance.pitch = 1.0;
      utterance.volume = 1.0;

      utterance.onend = () => {
        this.currentUtterance = null;
        this.isPausedState = false;
        this.notify();
      };

      utterance.onerror = (e) => {
        if (e.error !== 'canceled' && e.error !== 'interrupted') {
          console.warn('[voiceNarrator] Fallback utterance error:', e.error);
        }
        this.currentUtterance = null;
        this.isPausedState = false;
        this.notify();
      };

      this.currentUtterance = utterance;
      this.synth.speak(utterance);
      this.notify();
    } catch (err) {
      console.warn('[voiceNarrator] Error en síntesis fallback:', err);
    }
  }

  /**
   * Pausa la reproducción del audio actual.
   */
  public pause() {
    this.isPausedState = true;

    if (this.audioElement && !this.audioElement.paused && !this.isUsingFallbackSynth) {
      try {
        this.audioElement.pause();
      } catch (err) {
        console.warn('[voiceNarrator] Audio pause error:', err);
      }
    }

    if (this.synth && this.synth.speaking && !this.synth.paused) {
      try {
        this.synth.pause();
      } catch (err) {
        console.warn('[voiceNarrator] Synth pause error:', err);
      }
    }

    this.notify();
  }

  /**
   * Reanuda la reproducción pausada.
   */
  public resume() {
    this.isPausedState = false;

    if (this.audioElement && this.audioElement.paused && this.audioElement.currentTime > 0 && !this.isUsingFallbackSynth) {
      try {
        this.audioElement.play().catch(() => {});
        this.notify();
        return;
      } catch {
        // Continuar a fallback
      }
    }

    if (this.synth && this.synth.paused) {
      try {
        this.synth.resume();
        this.notify();
        return;
      } catch {
        // Reintentar speak
      }
    }

    if (this.currentText) {
      this.speak(this.currentText, this.currentAudioUrl);
    }
  }

  /**
   * Repite la instrucción actual desde el inicio.
   */
  public replay() {
    if (this.currentText) {
      this.speak(this.currentText, this.currentAudioUrl);
    }
  }

  /**
   * Detiene toda reproducción en curso.
   */
  public stop() {
    if (this.audioElement) {
      try {
        this.audioElement.pause();
        this.audioElement.currentTime = 0;
      } catch {
        // Ignorar
      }
    }

    if (this.synth) {
      try {
        this.synth.cancel();
      } catch {
        // Ignorar
      }
      this.currentUtterance = null;
    }

    this.isPausedState = false;
    this.notify();
  }

  /**
   * Activa o desactiva el sonido.
   */
  public setMuted(muted: boolean) {
    this.isMutedState = muted;
    try {
      localStorage.setItem('cielo_narrator_muted', String(muted));
    } catch {
      // Ignorar
    }

    if (this.audioElement) {
      this.audioElement.muted = muted;
    }

    if (muted) {
      this.stop();
    } else if (this.currentText) {
      this.speak(this.currentText, this.currentAudioUrl);
    } else {
      this.notify();
    }
  }

  public isMuted(): boolean {
    return this.isMutedState;
  }

  public isSpeaking(): boolean {
    if (this.isMutedState) return false;
    if (this.audioElement && !this.audioElement.paused && !this.audioElement.ended) {
      return true;
    }
    return !!(this.synth && (this.synth.speaking || this.currentUtterance) && !this.synth.paused);
  }

  public isPaused(): boolean {
    return this.isPausedState;
  }

  public isSupported(): boolean {
    return typeof window !== 'undefined' && (!!this.audioElement || !!this.synth);
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
        // Ignorar errores de suscriptores
      }
    });
  }
}

export const voiceNarrator = new VoiceNarrator();
