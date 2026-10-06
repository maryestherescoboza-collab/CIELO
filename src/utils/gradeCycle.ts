const CICLO_CALIFICACION: Array<number | null> = [100, 85, 70, 55, null];

export const esEtiquetaPendiente = (valor: number | null): boolean =>
    valor === 0 || valor === 1;

export function nextGradeScore(actual: number | null, seleccionado: number, vacioEnCiclo = false): number | null {
    if (esEtiquetaPendiente(seleccionado)) return seleccionado;
    if (actual === null) return vacioEnCiclo ? 100 : seleccionado;
    const idx = CICLO_CALIFICACION.indexOf(actual);
    if (idx === -1) return 100;
    return CICLO_CALIFICACION[(idx + 1) % CICLO_CALIFICACION.length];
}
