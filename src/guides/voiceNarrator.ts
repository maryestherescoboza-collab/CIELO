/**
 * Servicio de narración neuronal para CIELO.
 *
 * Arquitectura de voz neuronal masculina:
 * 1. Motor principal: ElevenLabs (Voz masculina latina, cálida, natural y profesional) / Azure Speech (es-DO-EmilioNeural).
 * 2. Velocidad de narración ágil y conversacional: 1.10x.
 * 3. Control estricto de idempotencia por stepKey y token atómico para evitar reproducciones duplicadas.
 * 4. Fallback de emergencia exclusivo y seguro a Web Speech API con selección de voz masculina.
 * 5. Una sola fuente activa: detención y purga inmediata de cualquier audio o síntesis previa.
 */

export interface SpeakOptions {
  stepKey?: string;
  force?: boolean;
}

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

  // Control de idempotencia y sincronización atómica
  private lastPlayedKey: string | null = null;
  private currentPlaybackToken = 0;

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

      // 2. Inicialización de SpeechSynthesis como respaldo
      if ('speechSynthesis' in window) {
        this.synth = window.speechSynthesis;
        this.loadVoices();
        if (this.synth.onvoiceschanged !== undefined) {
          this.synth.onvoiceschanged = () => this.loadVoices();
        }
      }

      // 3. Recuperar estado de silencio persistido
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

  /**
   * Selecciona una voz MASCULINA en español, priorizando dominicano/latinoamericano.
   * Evita explícitamente voces femeninas o sintéticas robotizadas.
   */
  private getSpanishMaleVoice(): SpeechSynthesisVoice | null {
    if (!this.cachedVoices.length && this.synth) {
      this.loadVoices();
    }

    const spanishVoices = this.cachedVoices.filter(v => 
      v.lang.toLowerCase().startsWith('es')
    );

    if (!spanishVoices.length) return null;

    const femaleKeywords = [
      'ramona', 'sabina', 'helena', 'laura', 'monica', 'paulina', 
      'sofia', 'zira', 'elena', 'lucia', 'hilda', 'mia', 'female', 'mujer'
    ];

    const maleKeywords = [
      'emilio', 'jorge', 'alvaro', 'pablo', 'raul', 'diego', 
      'manuel', 'gonzalo', 'carlos', 'miguel', 'david', 'male', 'hombre'
    ];

    // Prioridad 1: Voz dominicana masculina específica (es-DO Emilio)
    const domMale = spanishVoices.find(v => 
      v.lang.toLowerCase().includes('do') && 
      (v.name.toLowerCase().includes('emilio') || !femaleKeywords.some(fk => v.name.toLowerCase().includes(fk)))
    );
    if (domMale) return domMale;

    // Prioridad 2: Voces masculinas conocidas por nombre
    for (const kw of maleKeywords) {
      const match = spanishVoices.find(v => v.name.toLowerCase().includes(kw));
      if (match) return match;
    }

    // Prioridad 3: Cualquier voz en español que no sea identificada como femenina
    const nonFemale = spanishVoices.find(v => 
      !femaleKeywords.some(fk => v.name.toLowerCase().includes(fk))
    );
    if (nonFemale) return nonFemale;

    // Prioridad 4: Primera voz en español disponible
    return spanishVoices[0];
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
   * Reproduce una instrucción de forma idempotente, garantizando UNA SOLA emisión por paso.
   */
  public speak(text: string, audioUrl?: string | null, options?: SpeakOptions) {
    // 1. Control de Idempotencia: si ya se reprodujo este paso y no es forzado, ignorar
    if (!options?.force && options?.stepKey && options.stepKey === this.lastPlayedKey) {
      return;
    }

    // 2. Detener inmediatamente cualquier audio o narración anterior
    this.stop();

    // 3. Registrar nuevo token y clave de reproducción activa
    const token = ++this.currentPlaybackToken;
    this.lastPlayedKey = options?.stepKey || null;
    this.currentText = text;
    this.currentAudioUrl = audioUrl || null;
    this.isPausedState = false;
    this.isUsingFallbackSynth = false;

    if (this.isMutedState) {
      this.notify();
      return;
    }

    let fallbackTriggered = false;
    const triggerFallback = (reason: string) => {
      // Garantizar que el fallback solo se ejecute UNA vez y si este token sigue vigente
      if (fallbackTriggered || this.currentPlaybackToken !== token) return;
      fallbackTriggered = true;
      console.info(`[voiceNarrator] Fallback SpeechSynthesis activado (${reason})`);
      this.fallbackToSpeechSynthesis(text, token);
    };

    // 4. Si disponemos de URL de audio neuronal, intentar reproducirla
    if (audioUrl && this.audioElement) {
      try {
        this.audioElement.playbackRate = 1.10; // Velocidad 1.10x ágil y natural
        this.audioElement.src = audioUrl;
        this.audioElement.currentTime = 0;

        this.audioElement.onerror = () => {
          triggerFallback('error al cargar archivo');
        };

        const playPromise = this.audioElement.play();
        if (playPromise !== undefined) {
          playPromise
            .then(() => {
              if (this.currentPlaybackToken !== token) {
                this.audioElement?.pause();
                return;
              }
              this.notify();
            })
            .catch((err) => {
              if (this.currentPlaybackToken !== token) return;
              if (err.name === 'AbortError') {
                // Operación cancelada limpiamente por stop() o avance de paso
                return;
              }
              if (err.name === 'NotAllowedError') {
                console.warn('[voiceNarrator] Autoplay bloqueado hasta interacción del usuario.');
                return;
              }
              triggerFallback(`fallo de reproducción: ${err.name}`);
            });
        }
        return;
      } catch (err) {
        console.warn('[voiceNarrator] Error iniciando HTMLAudioElement:', err);
        triggerFallback('excepción síncrona');
        return;
      }
    }

    // 5. Si no hay URL de audio neuronal disponible, recurrir al fallback
    triggerFallback('sin URL neuronal');
  }

  /**
   * Fallback de emergencia utilizando SpeechSynthesis con voz MASCULINA y velocidad 1.10x.
   */
  private fallbackToSpeechSynthesis(text: string, token: number) {
    if (this.currentPlaybackToken !== token || !this.synth || this.isMutedState) {
      this.notify();
      return;
    }

    this.isUsingFallbackSynth = true;

    // Purga obligatoria de cualquier emisión pendiente en cola del navegador
    try {
      this.synth.cancel();
    } catch {
      // Ignorar
    }

    const cleanText = text
      .replace(/<[^>]*>?/gm, ' ')
      .replace(/[«»]/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    if (!cleanText) return;

    try {
      const utterance = new SpeechSynthesisUtterance(cleanText);
      const voice = this.getSpanishMaleVoice();
      if (voice) {
        utterance.voice = voice;
        utterance.lang = voice.lang;
      } else {
        utterance.lang = 'es-DO';
      }

      // Velocidad ágil de narración (1.10x) y tono masculino
      utterance.rate = 1.10;
      utterance.pitch = 0.98;
      utterance.volume = 1.0;

      utterance.onend = () => {
        if (this.currentPlaybackToken === token) {
          this.currentUtterance = null;
          this.isPausedState = false;
          this.notify();
        }
      };

      utterance.onerror = (e) => {
        if (e.error !== 'canceled' && e.error !== 'interrupted') {
          console.warn('[voiceNarrator] Fallback utterance error:', e.error);
        }
        if (this.currentPlaybackToken === token) {
          this.currentUtterance = null;
          this.isPausedState = false;
          this.notify();
        }
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
      this.replay();
    }
  }

  /**
   * Repite la instrucción actual desde el inicio forzando la reproducción voluntaria.
   */
  public replay() {
    if (this.currentText) {
      this.speak(this.currentText, this.currentAudioUrl, { 
        stepKey: this.lastPlayedKey || undefined, 
        force: true 
      });
    }
  }

  /**
   * Detiene toda reproducción en curso, invalida tokens activos y vacía las colas.
   */
  public stop() {
    ++this.currentPlaybackToken;

    if (this.audioElement) {
      try {
        this.audioElement.pause();
        this.audioElement.currentTime = 0;
        this.audioElement.removeAttribute('src');
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
   * Activa o desactiva el sonido y persiste la preferencia.
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
      this.replay();
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
