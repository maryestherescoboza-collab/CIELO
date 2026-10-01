import { NIVELES_DOMINIO } from './evaluacionNiveles';

/**
 * Catalogo de sellos de CIELO.
 *
 * Vive aqui, y no dentro de `Sellos.tsx`, porque ya no lo consume una sola
 * pantalla: lo usan la pantalla de Sellos, la bandeja docente de Evidencias y
 * el Portafolio del estudiante. Duplicar estos 6 valores en tres sitios
 * guarantee que un dia el sello se pinte distinto en cada modulo.
 *
 * Los valores son los mismos que guarda `evidencias.sello`: 100, 85, 70, 55, 1
 * y 0. Las cuatro primeras etiquetas salen de `NIVELES_DOMINIO`; las dos
 * ultimas (negativa e inasistencia) no tienen entrada en `niveles_puntaje` y son
 * solo de la UI, igual que ya eran en Sellos.tsx.
 *
 * Los PNG viven en `public/sellos/`. Ojo con el nombre heredado: el sello de 55
 * se llama `sello-porlograr-65.png`. Es el archivo real, no un error.
 */

export interface SelloInfo {
    valor: 100 | 85 | 70 | 55 | 1 | 0;
    etiqueta: string;
    bg: string;
    color: string;
    circleBg: string;
    imagen: string;
}

export const SELLOS_INFO: readonly SelloInfo[] = [
    { valor: 100, etiqueta: NIVELES_DOMINIO[100].etiqueta, bg: '#DCF3E5', color: '#689C63', circleBg: '#E8F8EE', imagen: '/sellos/sello-excelente-100.png' },
    { valor: 85, etiqueta: NIVELES_DOMINIO[85].etiqueta, bg: '#E0F2FE', color: '#537BAC', circleBg: '#EFF9FF', imagen: '/sellos/sello-muybueno-85.png' },
    { valor: 70, etiqueta: NIVELES_DOMINIO[70].etiqueta, bg: '#DBEAFE', color: '#DEAE4D', circleBg: '#EEF4FF', imagen: '/sellos/sello-logrado-70.png' },
    { valor: 55, etiqueta: NIVELES_DOMINIO[55].etiqueta, bg: '#FEF3C7', color: '#EB8847', circleBg: '#FFFBEB', imagen: '/sellos/sello-porlograr-65.png' },
    { valor: 1, etiqueta: 'Se negó a realizar', bg: '#FDE8E8', color: '#DB5B48', circleBg: '#FDF2F2', imagen: '/sellos/sello-senego-1.png' },
    { valor: 0, etiqueta: 'Inasistencia', bg: '#E1EFFE', color: '#537BAC', circleBg: '#EBF5FF', imagen: '/sellos/sello-inasistencia-0.png' },
] as const;

export function selloPorValor(valor: number | null | undefined): SelloInfo | null {
    if (valor === null || valor === undefined) return null;
    return SELLOS_INFO.find(s => s.valor === valor) ?? null;
}
