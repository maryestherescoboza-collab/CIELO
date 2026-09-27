/**
 * Marcadores de hueco del procedimiento matematico.
 *
 * Un hueco es cualquier cosa entre corchetes que NO sea un indice o un valor:
 * `[ ]`, `[*]`, `[__]`, `[?]`. Asi el docente escribe como habla ("[ ]" en la
 * pizarra, "[***]" si lo quiere visible de lejos) y el renderer siempre puede
 * dibujar un input donde toca.
 *
 * La correspondencia entre hueco del TEXTO y espacio de
 * `config.pasos[i].espacios[j]` es POR POSICION y en ese orden. Este modulo es
 * el unico lugar donde se decide como se cuenta, inserta y quita un hueco, para
 * que el constructor y el Portal no puedan discrepar.
 *
 * Lo que nunca se hace: enviar `espacios[j].respuesta` al estudiante. Aqui solo
 * vive el texto del paso y la cantidad de huecos.
 */

import type { PasoProcedimiento } from '../types/rutas';

/** `[ ]`, `[*]`, `[___]`, `[?]`... pero no `[i]`. */
const PATRON_HUECO = /\[[ \t_*?.xX]{0,12}\]/g;

export const HUECO_VACIO = '[ ]';

/** Cuantos huecos de completar hay en el texto de un paso. */
export function contarHuecos(texto: string | null | undefined): number {
    if (!texto) return 0;
    const encontrados = texto.match(PATRON_HUECO);
    return encontrados ? encontrados.length : 0;
}

/** Total de espacios declarados en todos los pasos de una pregunta. */
export function totalEspacios(pasos: PasoProcedimiento[] | null | undefined): number {
    if (!pasos) return 0;
    return pasos.reduce((n, p) => n + p.espacios.length, 0);
}

export type PartePaso =
    | { tipo: 'texto'; valor: string }
    | { tipo: 'hueco'; indice: number; ancho: number };

/**
 * Divide el texto del paso en texto y huecos, para que el Portal pueda
 * intercalar los inputs sin reescribir la frase a mano.
 */
export function partirPaso(texto: string | null | undefined): PartePaso[] {
    const fuente = texto ?? '';
    if (!fuente) return [];

    const partes: PartePaso[] = [];
    let cursor = 0;
    let indiceHueco = 0;

    for (const coincidencia of fuente.matchAll(PATRON_HUECO)) {
        const inicio = coincidencia.index ?? 0;
        const fin = inicio + coincidencia[0].length;

        if (inicio > cursor) {
            partes.push({ tipo: 'texto', valor: fuente.slice(cursor, inicio) });
        }

        partes.push({
            tipo: 'hueco',
            indice: indiceHueco,
            ancho: Math.max(1, coincidencia[0].length - 2),
        });

        indiceHueco++;
        cursor = fin;
    }

    if (cursor < fuente.length) {
        partes.push({ tipo: 'texto', valor: fuente.slice(cursor) });
    }

    return partes;
}

/** Agrega un hueco al final del texto. */
export function agregarHueco(texto: string | null | undefined): string {
    return `${(texto ?? '').trimEnd()} ${HUECO_VACIO}`;
}

/**
 * Quita el hueco `indice` (0 base) del texto.
 *
 * Quitar un hueco del medio no debe desalinear el resto, por eso se busca la
 * ocurrencia `indice` y no "el ultimo": el docente sigue viendo el paso en el
 * mismo orden en que lo escribio.
 */
export function quitarHueco(texto: string | null | undefined, indice: number): string {
    const fuente = texto ?? '';
    let resultado = '';
    let cursor = 0;
    let n = 0;

    for (const coincidencia of fuente.matchAll(PATRON_HUECO)) {
        if (n === indice) {
            const inicio = coincidencia.index ?? 0;
            resultado += fuente.slice(cursor, inicio);
            cursor = inicio + coincidencia[0].length;
        }
        n++;
    }

    resultado += fuente.slice(cursor);
    return resultado.trimEnd();
}

/**
 * Deja el texto con exactamente `total` huecos: agrega al final los que falten y
 * quita los sobrantes desde el final. Es la operacion que el constructor usa al
 * agregar o quitar un espacio, para que el texto y `espacios[]` no queden
 * descuadrados.
 */
export function sincronizarHuecos(texto: string | null | undefined, total: number): string {
    let actual = texto ?? '';
    const objetivo = Math.max(0, total);

    while (contarHuecos(actual) > objetivo) {
        actual = quitarHueco(actual, contarHuecos(actual) - 1);
    }
    while (contarHuecos(actual) < objetivo) {
        actual = agregarHueco(actual);
    }
    return actual.trimEnd();
}

export interface RevisionHuecos {
    texto: string;
    /** Avisos para el docente: el texto se ajusto, o no hizo falta. */
    avisos: string[];
}

/**
 * Revisa que el texto del paso y sus espacios coincidan y devuelve el texto ya
 * cuadrado. No tira: un paso puede ser decorativo y quedarse sin huecos, que es
 * una decision legitima del docente.
 */
export function revisarHuecos(texto: string, espacios: number): RevisionHuecos {
    const marcados = contarHuecos(texto);
    if (marcados === espacios) return { texto, avisos: [] };

    if (espacios === 0) {
        let limpio = texto;
        while (contarHuecos(limpio) > 0) {
            limpio = quitarHueco(limpio, contarHuecos(limpio) - 1);
        }
        return { texto: limpio, avisos: [] };
    }

    return {
        texto: sincronizarHuecos(texto, espacios),
        avisos: [
            marcados < espacios
                ? `El texto tenia ${marcados} hueco(s) y definiste ${espacios}: se agregaron ${espacios - marcados}.`
                : `El texto tenia ${marcados} hueco(s) y definiste ${espacios}: se quitaron ${marcados - espacios}.`,
        ],
    };
}
