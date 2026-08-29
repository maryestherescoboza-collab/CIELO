import type { RecuperacionCotejo, Actividad, CalificacionActividad } from '../types';
import { INDICADORES_RECUPERACION } from '../constants/recuperacionCotejo';

// ============================================================
// MÓDULO AISLADO DE RECUPERACIÓN
// Lógica 100% propia de la Lista de Cotejo de Recuperación.
// NO depende de academic.ts ni de la lógica de calificaciones
// normales. NO modifica calificaciones, actividades ni promedios.
//
// Las actividades SOLO se leen como FILTRO para decidir qué
// columnas aparecen en la Lista de Cotejo:
//   puntaje < 70  Y  la competencia de la actividad == BC
// a recuperar (Ambas obligatorias, sin OR).
//
// RESULTADO DE RECUPERACIÓN (nuevo modelo):
//   puntos_faltantes   = 100 − puntaje_actual
//   puntos_recuperados = (✓ ÷ total_evidencias) × puntos_faltantes
//   resultado_final    = puntaje_actual + puntos_recuperados
//   → redondeado a ENTERO, nunca mayor a 100.
// El puntaje original NO se modifica; la recuperación calcula
// cuánto puede SUMAR al puntaje actual.
// ============================================================

const BC_KEY: Record<1 | 2 | 3 | 4, string> = { 1: 'BC1', 2: 'BC2', 3: 'BC3', 4: 'BC4' };

/**
 * Puntaje ACTUAL del estudiante en un BC (antes de recuperación):
 * promedio redondeado de las calificaciones de las actividades de ese BC
 * en el periodo (misma regla que el sistema: puntaje ausente cuenta 0;
 * se excluye la actividad genérica "Recuperación").
 * Solo LECTURA de calificaciones; nunca la modifica.
 * null si no hay actividades de ese BC en el periodo.
 */
export function puntajeActualBC(
    actividades: Actividad[],
    calificaciones: CalificacionActividad[],
    estudianteId: number,
    bc: 1 | 2 | 3 | 4,
    periodo: string,
    cursoId?: number,
    asignatura?: string,
): number | null {
    const bcKey = BC_KEY[bc];
    const actsBC = actividades.filter(act => {
        if (act.periodo !== periodo) return false;
        if (cursoId !== undefined && act.cursoId !== cursoId) return false;
        if (asignatura && act.asignatura && act.asignatura !== asignatura) return false;
        if (act.nombre === 'Recuperación') return false;
        const bcs = (act.bcAsignados && act.bcAsignados.length > 0 ? act.bcAsignados : ['BC1']) as string[];
        return bcs.includes(bcKey);
    });
    if (actsBC.length === 0) return null;
    const suma = actsBC.reduce((acc, act) => {
        const cal = calificaciones.find(c => c.estudianteId === estudianteId && c.actividadId === act.id);
        return acc + (cal?.puntaje ?? 0);
    }, 0);
    return Math.round(suma / actsBC.length);
}

/**
 * RESULTADO FINAL de la Lista de Cotejo de Recuperación:
 *   puntos_faltantes   = 100 − puntaje_actual
 *   puntos_recuperados = (✓ ÷ total_evidencias) × puntos_faltantes
 *   resultado          = puntaje_actual + puntos_recuperados
 * Redondeado a ENTERO y limitado a [0, 100].
 * totalEvidencias === 0 (sin actividades aplicables) → null (NO se calcula).
 */
export function calcularResultadoRecuperacion(
    puntajeActual: number | null,
    logradas: number,
    totalEvidencias: number,
): number | null {
    if (puntajeActual === null || totalEvidencias <= 0) return null;
    const faltantes = Math.max(0, 100 - puntajeActual);
    const recuperados = (logradas / totalEvidencias) * faltantes;
    const resultado = puntajeActual + recuperados;
    return Math.max(0, Math.min(100, Math.round(resultado)));
}

/**
 * Resultado de recuperación de una competencia:
 *   puntaje BC = redondear( cant✓ / totalEvidencias × 100 )
 * - Cada registro presente (celda marcada ✓) suma +1 logrado.
 * - Cada celda vacía (ausencia de registro) suma +0 logrado y NO
 *   se resta del denominador: TODAS las evidencias participan
 *   (Indicadores × Actividades aplicables).
 * - totalEvidencias === 0 (no hay actividades aplicables) → null.
 * - ninguna marcada (y hay evidencias) → 0%.
 */
export function calcularPuntajeRecuperacion(celdas: RecuperacionCotejo[], totalEvidencias: number): number | null {
    if (!totalEvidencias || totalEvidencias <= 0) return null;
    const logradas = celdas.length;
    return Math.round((logradas / totalEvidencias) * 10000) / 100;
}

/**
 * Filtro EXACTO de actividades que se muestran como columnas de la
 * Lista de Cotejo de Recuperación de un BC dado. Ambas condiciones
 * son OBLIGATORIAS:
 *   actividad.puntaje < 70        (puntaje real en calificaciones)
 *   AND la competencia de la actividad corresponde al BC
 * Columnas dinámicas: NOMBRES REALES de las actividades, nunca
 * "Actividad 1..4" genéricas. No crea actividades artificiales.
 */
export function actividadesParaRecuperacion(
    actividades: Actividad[],
    calificaciones: CalificacionActividad[],
    estudianteId: number,
    bc: 1 | 2 | 3 | 4,
    periodo: string,
    cursoId?: number,
    asignatura?: string,
): Actividad[] {
    const bcKey = BC_KEY[bc];
    return actividades
        .filter(act => {
            if (act.periodo !== periodo) return false;
            if (cursoId !== undefined && act.cursoId !== cursoId) return false;
            if (asignatura && act.asignatura && act.asignatura !== asignatura) return false;

            const calif = calificaciones.find(c =>
                c.estudianteId === estudianteId &&
                c.actividadId === act.id &&
                c.periodo === periodo,
            );
            if (!calif) return false; // sin calificación real no hay puntaje que cachear
            const puntaje = calif.puntaje;
            if (puntaje === null || puntaje === undefined || puntaje >= 70) return false; // debe ser MENOR a 70

            const competenciaActividad = (act.bcAsignados || []) as string[];
            const competenciaCalificacion = (calif.competencias || []) as string[];
            const coincide =
                competenciaActividad.includes(bcKey) ||
                competenciaCalificacion.includes(bcKey);
            return coincide;
        })
        .sort((a, b) => (a.fecha > b.fecha ? 1 : a.fecha < b.fecha ? -1 : a.id - b.id));
}

/**
 * Evidencias totales de la Lista de Cotejo para un BC:
 * indicadores fijos × número de columnas (actividades filtradas).
 */
export function totalEvidenciasPorBC(bc: 1 | 2 | 3 | 4, numActividades: number): number {
    return (INDICADORES_RECUPERACION[bc]?.length ?? 0) * numActividades;
}

/**
 * Filtra las celdas de cotejo de un estudiante+competencia+periodo
 * dentro del contexto del curso/asignatura.
 */
export function celdasDeEstudianteBC(
    rows: RecuperacionCotejo[],
    estudianteId: number,
    bc: 1 | 2 | 3 | 4,
    periodo: string,
    cursoId?: number,
    asignatura?: string,
): RecuperacionCotejo[] {
    return rows.filter(r =>
        r.estudianteId === estudianteId &&
        r.bc === bc &&
        r.periodo === periodo &&
        (!cursoId || r.cursoId === cursoId) &&
        (!asignatura || !r.asignatura || r.asignatura === asignatura),
    );
}

/**
 * Construye la rejilla de la Lista de Cotejo: filas = indicadores fijos,
 * columnas = las actividades YA filtradas (actividadesParaRecuperacion).
 * Alineación por actividadId. true = ✓ Logrado (registro presente),
 * false = celda vacía = NO LOGRADO. No existe tercer estado.
 */
export function construirRejillaBC(
    rows: RecuperacionCotejo[],
    estudianteId: number,
    bc: 1 | 2 | 3 | 4,
    periodo: string,
    actividades: Actividad[],
    cursoId?: number,
    asignatura?: string,
): Array<{ indicador: string; actividades: boolean[] }> {
    const existentes = celdasDeEstudianteBC(rows, estudianteId, bc, periodo, cursoId, asignatura);
    return (INDICADORES_RECUPERACION[bc] || []).map(indicador => ({
        indicador,
        actividades: actividades.map(act =>
            existentes.some(r => r.indicador === indicador && r.actividadId === act.id),
        ),
    }));
}