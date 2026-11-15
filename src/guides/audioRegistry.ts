/**
 * Registro y resolución de audios neuronales para las guías interactivas de CIELO.
 * Permite reproducir audios pregenerados de alta calidad neuronal (Microsoft Azure AI Speech / ElevenLabs)
 * alojados en Supabase Storage o assets estáticos con fallback transparente a SpeechSynthesis.
 */

// Bucket público oficial de CIELO para audios de guías
export const SUPABASE_AUDIO_STORAGE_URL = 'https://sgjnactnhmpmbbgexcox.supabase.co/storage/v1/object/public/cielo-audios-guias';

/**
 * Genera una clave determinista basada en el texto o paso para caché e invalidación.
 */
export function getAudioKey(guideId: string, stepIndex: number, text?: string): string {
  if (text) {
    // Normalización de texto para hash determinista
    const clean = text.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 32);
    return `${guideId}_step_${stepIndex}_${clean}`;
  }
  return `${guideId}_step_${stepIndex}`;
}

/**
 * Mapa de audios precargados / pregenerados oficiales
 */
export const AUDIO_CATALOG: Record<string, string> = {
  // Bienvenida y felicitaciones
  'iniciacion_welcome': `${SUPABASE_AUDIO_STORAGE_URL}/iniciacion_welcome.mp3`,
  'iniciacion_celebration': `${SUPABASE_AUDIO_STORAGE_URL}/iniciacion_celebration.mp3`,

  // Frases de prueba y certificación de calidad neuronal (Sección 8)
  'test_sample_1': `${SUPABASE_AUDIO_STORAGE_URL}/test_sample_1.mp3`,
  'test_sample_2': `${SUPABASE_AUDIO_STORAGE_URL}/test_sample_2.mp3`,
  'test_sample_3': `${SUPABASE_AUDIO_STORAGE_URL}/test_sample_3.mp3`,
  'test_sample_4': `${SUPABASE_AUDIO_STORAGE_URL}/test_sample_4.mp3`,
  'test_sample_5': `${SUPABASE_AUDIO_STORAGE_URL}/test_sample_5.mp3`,
  'test_sample_6': `${SUPABASE_AUDIO_STORAGE_URL}/test_sample_6.mp3`,
  'test_sample_7': `${SUPABASE_AUDIO_STORAGE_URL}/test_sample_7.mp3`,

  // Guía de iniciación (Etapas 1 a 5)
  'iniciacion_step_0': `${SUPABASE_AUDIO_STORAGE_URL}/iniciacion_step_0.mp3`,
  'iniciacion_step_1': `${SUPABASE_AUDIO_STORAGE_URL}/iniciacion_step_1.mp3`,
  'iniciacion_step_2': `${SUPABASE_AUDIO_STORAGE_URL}/iniciacion_step_2.mp3`,
  'iniciacion_step_3': `${SUPABASE_AUDIO_STORAGE_URL}/iniciacion_step_3.mp3`,
  'iniciacion_step_4': `${SUPABASE_AUDIO_STORAGE_URL}/iniciacion_step_4.mp3`,
  'iniciacion_step_5': `${SUPABASE_AUDIO_STORAGE_URL}/iniciacion_step_5.mp3`,
  'iniciacion_step_6': `${SUPABASE_AUDIO_STORAGE_URL}/iniciacion_step_6.mp3`,
  'iniciacion_step_7': `${SUPABASE_AUDIO_STORAGE_URL}/iniciacion_step_7.mp3`,
  'iniciacion_step_8': `${SUPABASE_AUDIO_STORAGE_URL}/iniciacion_step_8.mp3`,
  'iniciacion_step_9': `${SUPABASE_AUDIO_STORAGE_URL}/iniciacion_step_9.mp3`,
  'iniciacion_step_10': `${SUPABASE_AUDIO_STORAGE_URL}/iniciacion_step_10.mp3`,
  'iniciacion_step_11': `${SUPABASE_AUDIO_STORAGE_URL}/iniciacion_step_11.mp3`,
  'iniciacion_step_12': `${SUPABASE_AUDIO_STORAGE_URL}/iniciacion_step_12.mp3`,
  'iniciacion_step_13': `${SUPABASE_AUDIO_STORAGE_URL}/iniciacion_step_13.mp3`,
  'iniciacion_step_14': `${SUPABASE_AUDIO_STORAGE_URL}/iniciacion_step_14.mp3`,
  'iniciacion_step_15': `${SUPABASE_AUDIO_STORAGE_URL}/iniciacion_step_15.mp3`,
  'iniciacion_step_16': `${SUPABASE_AUDIO_STORAGE_URL}/iniciacion_step_16.mp3`,
  'iniciacion_step_17': `${SUPABASE_AUDIO_STORAGE_URL}/iniciacion_step_17.mp3`,
  'iniciacion_step_18': `${SUPABASE_AUDIO_STORAGE_URL}/iniciacion_step_18.mp3`,
  'iniciacion_step_19': `${SUPABASE_AUDIO_STORAGE_URL}/iniciacion_step_19.mp3`,
  'iniciacion_step_20': `${SUPABASE_AUDIO_STORAGE_URL}/iniciacion_step_20.mp3`,
  'iniciacion_step_21': `${SUPABASE_AUDIO_STORAGE_URL}/iniciacion_step_21.mp3`,
  'iniciacion_step_22': `${SUPABASE_AUDIO_STORAGE_URL}/iniciacion_step_22.mp3`
};

/**
 * Resuelve la URL del audio neuronal para un paso específico.
 */
export function resolveAudioUrl(guideId?: string, stepIndex?: number, customAudioId?: string): string | null {
  if (customAudioId && AUDIO_CATALOG[customAudioId]) {
    return AUDIO_CATALOG[customAudioId];
  }
  if (guideId !== undefined && stepIndex !== undefined) {
    const key = `${guideId}_step_${stepIndex}`;
    return AUDIO_CATALOG[key] || null;
  }
  return null;
}

