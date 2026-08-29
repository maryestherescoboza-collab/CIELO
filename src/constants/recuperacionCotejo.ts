import type { BCKey } from '../types';

// ============================================================
// LISTA DE COTEJO DE RECUPERACIÓN — DEFINICIÓN DEL INSTRUMENTO
// Los indicadores son FIJOS e INMUTABLES. No provienen de ninguna
// tabla (actividades, planificación, IA), no son editables ni
// dinámicos. No se deben modificar salvo decisión explícita.
//
// Las COLUMNAS del cotejo NO se definen aquí: son las actividades
// reales que cumplen (puntaje < 70 Y competencia == BC a recuperar),
// calculadas en src/utils/recuperacion.ts.
// ============================================================

export const INDICADORES_RECUPERACION: Record<1 | 2 | 3 | 4, string[]> = {
    1: [
        'Explica conceptos con claridad y con sus propias palabras.',
        'Sigue y comunica correctamente las instrucciones dadas.',
    ],
    2: [
        'Corrige sus errores a partir de la retroalimentación recibida.',
        'Formula preguntas y consulta sus dudas para mejorar su aprendizaje.',
    ],
    3: [
        'Trabaja con autonomía, responsabilidad y disposición para mejorar.',
        'Respeta las normas, los acuerdos y a los demás durante el trabajo.',
    ],
    4: [
        'Entrega las actividades dentro del plazo establecido.',
        'Presenta un trabajo ordenado y organizado.',
        'Evidencia mejoras en su desempeño respecto al período anterior.',
    ],
};

// Títulos de bloque definidos para la Lista de Cotejo (no modifican
// COMPETENCIAS_LABEL de la app).
export const TITULOS_RECUPERACION: Record<BCKey, string> = {
    BC1: 'Comunicativa',
    BC2: 'Científica y tecnológica; ambiental y de la salud',
    BC3: 'Desarrollo personal y espiritual; ética y ciudadana',
    BC4: 'Pensamiento lógico, creativo y crítico; resolución de problemas',
};