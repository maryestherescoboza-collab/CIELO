/**
 * Biblioteca de formulas para el Item "Procedimiento matematico".
 *
 * REGLA INNEGOCIABLE: la biblioteca genera ESTRUCTURA, nunca soluciones.
 * - No hay ni un solo numero de resultado en este archivo.
 * - Cada paso trae sus huecos `[ ]` y las PIEZAS controladas que el estudiante
 *   puede usar para armarlo. El docente despues pone la respuesta esperada de
 *   cada hueco.
 * - Agregar una formula nueva es agregar un objeto a FORMULAS_MATEMATICAS: no
 *   hay logica condicional por formula en ningun otro modulo.
 */

import type { ElementoProcedimiento, PasoProcedimiento } from '../types/rutas';
import { contarHuecos } from './rutaPasos';

export type CategoriaFormula = 'geometria' | 'algebra' | 'porcentajes' | 'trigonometria' | 'funciones';

export interface FormulaPasoPlantilla {
    /** Texto del paso con los huecos `[ ]` ya marcados. */
    texto: string;
    /**
     * Piezas que el estudiante puede usar en CUALQUIER hueco de este paso.
     * Si se omite, el paso cae a texto libre (compatibilidad con items viejos).
     */
    piezas?: ElementoProcedimiento[];
}

export interface FormulaPlantilla {
    id: string;
    nombre: string;
    categoria: CategoriaFormula;
    /** Formula canonica, solo como referencia visual para el docente. */
    referencia?: string;
    pasos: FormulaPasoPlantilla[];
}

/** Digitos sueltos: para responder un valor numerico con teclado controlado. */
const digitos = (): ElementoProcedimiento[] =>
    Array.from({ length: 10 }, (_, i) => ({ tipo: 'numero', valor: String(i) }));

/** Teclado de expresion: digitos + operaciones + parentesis + potencias y raiz. */
export const PIEZAS_EXPRESION: ElementoProcedimiento[] = [
    ...digitos(),
    { tipo: 'operador', valor: '+' },
    { tipo: 'operador', valor: '-' },
    { tipo: 'operador', valor: '*' },
    { tipo: 'operador', valor: '/' },
    { tipo: 'simbolo', valor: '(' },
    { tipo: 'simbolo', valor: ')' },
    { tipo: 'simbolo', valor: '²' },
    { tipo: 'simbolo', valor: '√' },
];

const soloDigitos = (): ElementoProcedimiento[] => digitos();

/**
 * La formula de ejemplo: teorema de Pitagoras.
 * Los pasos son la derivacion tipica del ejercicio, no sus numeros.
 */
const PITAGORAS: FormulaPlantilla = {
    id: 'pitagoras',
    nombre: 'Teorema de Pitagoras',
    categoria: 'geometria',
    referencia: 'a² = b² + c²',
    pasos: [
        { texto: 'a² = b² + c²', piezas: soloDigitos() },
        { texto: 'a² = ( [ ] )² + ( [ ] )²', piezas: soloDigitos() },
        { texto: 'a² = ( [ ] ) + ( [ ] )', piezas: soloDigitos() },
        { texto: 'a² = [ ]', piezas: soloDigitos() },
        { texto: '√( a² ) = √[ ]', piezas: soloDigitos() },
        { texto: 'a = [ ]', piezas: soloDigitos() },
    ],
};

export const FORMULAS_MATEMATICAS: FormulaPlantilla[] = [
    PITAGORAS,
    {
        id: 'area_rectangulo',
        nombre: 'Area del rectangulo',
        categoria: 'geometria',
        referencia: 'A = b · h',
        pasos: [
            { texto: 'A = b · h', piezas: soloDigitos() },
            { texto: 'A = [ ] · [ ]', piezas: soloDigitos() },
            { texto: 'A = [ ]', piezas: soloDigitos() },
        ],
    },
    {
        id: 'area_triangulo',
        nombre: 'Area del triangulo',
        categoria: 'geometria',
        referencia: 'A = (b · h) / 2',
        pasos: [
            { texto: 'A = (b · h) / 2', piezas: soloDigitos() },
            { texto: 'A = ( [ ] · [ ] ) / 2', piezas: soloDigitos() },
            { texto: 'A = ( [ ] ) / 2', piezas: soloDigitos() },
            { texto: 'A = [ ]', piezas: soloDigitos() },
        ],
    },
    {
        id: 'area_circulo',
        nombre: 'Area del circulo',
        categoria: 'geometria',
        referencia: 'A = π · r²',
        pasos: [
            { texto: 'A = π · r²', piezas: soloDigitos() },
            { texto: 'A = π · ( [ ] )²', piezas: soloDigitos() },
            { texto: 'A = π · [ ]', piezas: soloDigitos() },
            { texto: 'A = [ ]', piezas: soloDigitos() },
        ],
    },
    {
        id: 'perimetro_rectangulo',
        nombre: 'Perimetro del rectangulo',
        categoria: 'geometria',
        referencia: 'P = 2 · (b + h)',
        pasos: [
            { texto: 'P = 2 · (b + h)', piezas: soloDigitos() },
            { texto: 'P = 2 · ( [ ] + [ ] )', piezas: soloDigitos() },
            { texto: 'P = 2 · ( [ ] )', piezas: soloDigitos() },
            { texto: 'P = [ ]', piezas: soloDigitos() },
        ],
    },
    {
        id: 'ecuacion_lineal',
        nombre: 'Ecuacion lineal (a·x + b = c)',
        categoria: 'algebra',
        referencia: 'x = (c - b) / a',
        pasos: [
            { texto: 'a · x + b = c', piezas: soloDigitos() },
            { texto: '[ ] · x + [ ] = [ ]', piezas: soloDigitos() },
            { texto: '[ ] · x = [ ] - [ ]', piezas: soloDigitos() },
            { texto: '[ ] · x = [ ]', piezas: soloDigitos() },
            { texto: '[ ] · x = [ ] / [ ]', piezas: PIEZAS_EXPRESION },
            { texto: 'x = [ ]', piezas: soloDigitos() },
        ],
    },
    {
        id: 'porcentaje',
        nombre: 'Porcentaje de una cantidad',
        categoria: 'porcentajes',
        referencia: 'valor = (p / 100) · total',
        pasos: [
            { texto: 'valor = (p / 100) · total', piezas: soloDigitos() },
            { texto: 'valor = ( [ ] / 100 ) · [ ]', piezas: soloDigitos() },
            { texto: 'valor = ( [ ] ) · [ ]', piezas: soloDigitos() },
            { texto: 'valor = [ ]', piezas: soloDigitos() },
        ],
    },
    {
        id: 'aumento_porcentual',
        nombre: 'Aumento porcentual',
        categoria: 'porcentajes',
        referencia: 'final = inicial · (1 + p/100)',
        pasos: [
            { texto: 'final = inicial · (1 + p / 100)', piezas: soloDigitos() },
            { texto: 'final = [ ] · (1 + [ ] / 100)', piezas: soloDigitos() },
            { texto: 'final = [ ] · ( [ ] )', piezas: soloDigitos() },
            { texto: 'final = [ ]', piezas: soloDigitos() },
        ],
    },
    {
        id: 'descuento_porcentual',
        nombre: 'Descuento porcentual',
        categoria: 'porcentajes',
        referencia: 'final = inicial · (1 - p/100)',
        pasos: [
            { texto: 'final = inicial · (1 - p / 100)', piezas: soloDigitos() },
            { texto: 'final = [ ] · (1 - [ ] / 100)', piezas: soloDigitos() },
            { texto: 'final = [ ] · ( [ ] )', piezas: soloDigitos() },
            { texto: 'final = [ ]', piezas: soloDigitos() },
        ],
    },
    {
        id: 'slopes',
        nombre: 'Ecuacion de la recta (pendiente y ordenada)',
        categoria: 'funciones',
        referencia: 'y = m · x + b',
        pasos: [
            { texto: 'y = m · x + b', piezas: soloDigitos() },
            { texto: 'y = [ ] · x + [ ]', piezas: soloDigitos() },
            { texto: 'y = [ ] · [ ] + [ ]', piezas: soloDigitos() },
            { texto: 'y = [ ]', piezas: soloDigitos() },
        ],
    },
    {
        id: 'distancia_entre_puntos',
        nombre: 'Distancia entre dos puntos',
        categoria: 'geometria',
        referencia: 'd = √((x₂-x₁)² + (y₂-y₁)²)',
        pasos: [
            { texto: 'd = √((x₂ - x₁)² + (y₂ - y₁)²)', piezas: soloDigitos() },
            { texto: 'd = √( ( [ ] )² + ( [ ] )² )', piezas: soloDigitos() },
            { texto: 'd = √( [ ] + [ ] )', piezas: soloDigitos() },
            { texto: 'd = √[ ]', piezas: soloDigitos() },
            { texto: 'd = [ ]', piezas: soloDigitos() },
        ],
    },
];

export function buscarFormula(id: string | null | undefined): FormulaPlantilla | undefined {
    if (!id) return undefined;
    return FORMULAS_MATEMATICAS.find((f) => f.id === id);
}

/**
 * Convierte una plantilla en `config.pasos` listo para guardar.
 *
 * Las respuestas esperadas nacen VACIAS a proposito: la biblioteca propone la
 * estructura y es el docente quien dice "este hueco vale tal". El generador no
 * resuelve ni una ecuacion.
 */
export function generarPasosDesdeFormula(formula: FormulaPlantilla): PasoProcedimiento[] {
    return formula.pasos.map((paso) => ({
        texto: paso.texto,
        espacios: Array.from({ length: contarHuecos(paso.texto) }, () => ({
            respuesta: '',
            piezas: paso.piezas,
        })),
        piezas: paso.piezas,
    }));
}