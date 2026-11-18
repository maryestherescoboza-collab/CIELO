/**
 * MOTOR DE PROCEDIMIENTO MATEMÁTICO INTELIGENTE — CIELO
 *
 * Genera automáticamente el procedimiento resuelto paso a paso a partir de una fórmula
 * y sus datos, calcula las claves, gestiona niveles de andamiaje y serializa al modelo
 * de datos canónico y compatible con las rutas de aprendizaje.
 *
 * Principio: Cero errores de sintaxis, tokens atómicos limpios y tipografía matemática clara.
 */

import type { PasoProcedimiento } from '../types/rutas';

export type TipoEntradaEspacio = 'numerico' | 'alfanumerico';
export type NivelAyuda = 'guiado' | 'medio' | 'final';

export interface DatoProblema {
  clave: string;
  nombre: string;
  valor: number;
  rango?: [number, number];
}

export interface EspacioConfig {
  id: string;
  posicion: number;
  clave: string;
  entrada: TipoEntradaEspacio;
  equivalentes: string[];
  longitud: number;
}

/** Convierte dígitos, signos y operadores matemáticos a superíndices Unicode reales */
export function aSuperindice(val: string | number): string {
  const map: Record<string, string> = {
    '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴',
    '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹',
    '+': '⁺', '-': '⁻', '=': '⁼', '(': '⁽', ')': '⁾',
    '/': 'ᐟ', 'n': 'ⁿ', 'm': 'ᵐ', 'x': 'ˣ', 'y': 'ʸ'
  };
  return val.toString().split('').map((c) => map[c] || c).join('');
}

export interface TokenPasoMatematico {
  id: string;
  texto: string;
  esEstatico: boolean;
  esEspacio: boolean;
  clave: string;
  tipoEntrada: TipoEntradaEspacio;
  equivalentes: string[];
  longitud: number;
  latex?: string;
}

export interface PasoMatematicoGenerado {
  id: string;
  titulo: string;
  latexCompleto: string;
  tokens: TokenPasoMatematico[];
}

export interface DefinicionFormula {
  id: string;
  nombre: string;
  categoria: string;
  latexReferencia: string;
  enunciadoPlantilla: (datos: Record<string, number>) => string;
  datosDefecto: DatoProblema[];
  generarPasos: (datos: Record<string, number>, entradaGlobal: TipoEntradaEspacio) => PasoMatematicoGenerado[];
  presetsAyuda: {
    guiado: (tokens: TokenPasoMatematico[]) => void;
    medio: (tokens: TokenPasoMatematico[]) => void;
    final: (tokens: TokenPasoMatematico[]) => void;
  };
}

/* ──────────────────────────────────────────────────────────────────────────
   CATÁLOGO COMPLETO DE FÓRMULAS CON PROCEDIMIENTOS MATEMÁTICOS LIMPIOS
   ────────────────────────────────────────────────────────────────────────── */

export const CATALOGO_FORMULAS: DefinicionFormula[] = [
  /* ══════════════════════════════════════════════════════════════════════════
     1. ÁLGEBRA Y PRODUCTOS NOTABLES
     ══════════════════════════════════════════════════════════════════════════ */
  {
    id: 'binomio_cuadrado_suma',
    nombre: 'Binomio al cuadrado (suma)',
    categoria: 'Álgebra y Productos Notables',
    latexReferencia: '(a + b)² = a² + 2ab + b²',
    enunciadoPlantilla: (d) =>
      `Desarrolla el binomio al cuadrado (${d.a ?? 3} + ${d.b ?? 2})² aplicando la regla de productos notables.`,
    datosDefecto: [
      { clave: 'a', nombre: 'Término a', valor: 3, rango: [2, 9] },
      { clave: 'b', nombre: 'Término b', valor: 2, rango: [2, 9] },
    ],
    generarPasos: (d, entradaGlobal) => {
      const a = d.a ?? 3;
      const b = d.b ?? 2;
      const a2 = a * a;
      const doble = 2 * a * b;
      const b2 = b * b;
      const resultado = a2 + doble + b2;

      return [
        {
          id: 'p1',
          titulo: 'Fórmula notable',
          latexCompleto: '(a + b)² = a² + 2ab + b²',
          tokens: [
            { id: 'p1_t1', texto: '(a + b)² = a² + 2ab + b²', esEstatico: true, esEspacio: false, clave: '', tipoEntrada: entradaGlobal, equivalentes: [], longitud: 24 },
          ],
        },
        {
          id: 'p2',
          titulo: 'Sustitución de términos',
          latexCompleto: `(${a} + ${b})² = (${a})² + 2(${a})(${b}) + (${b})²`,
          tokens: [
            { id: 'p2_t1', texto: '(', esEstatico: true, esEspacio: false, clave: '', tipoEntrada: entradaGlobal, equivalentes: [], longitud: 1 },
            { id: 'p2_t2', texto: a.toString(), esEstatico: false, esEspacio: false, clave: a.toString(), tipoEntrada: entradaGlobal, equivalentes: [], longitud: a.toString().length },
            { id: 'p2_t3', texto: ' + ', esEstatico: true, esEspacio: false, clave: '', tipoEntrada: entradaGlobal, equivalentes: [], longitud: 3 },
            { id: 'p2_t4', texto: b.toString(), esEstatico: false, esEspacio: false, clave: b.toString(), tipoEntrada: entradaGlobal, equivalentes: [], longitud: b.toString().length },
            { id: 'p2_t5', texto: ')² = (', esEstatico: true, esEspacio: false, clave: '', tipoEntrada: entradaGlobal, equivalentes: [], longitud: 6 },
            { id: 'p2_t6', texto: a.toString(), esEstatico: false, esEspacio: false, clave: a.toString(), tipoEntrada: entradaGlobal, equivalentes: [], longitud: a.toString().length },
            { id: 'p2_t7', texto: ')² + 2(', esEstatico: true, esEspacio: false, clave: '', tipoEntrada: entradaGlobal, equivalentes: [], longitud: 7 },
            { id: 'p2_t8', texto: a.toString(), esEstatico: false, esEspacio: false, clave: a.toString(), tipoEntrada: entradaGlobal, equivalentes: [], longitud: a.toString().length },
            { id: 'p2_t9', texto: ')(', esEstatico: true, esEspacio: false, clave: '', tipoEntrada: entradaGlobal, equivalentes: [], longitud: 2 },
            { id: 'p2_t10', texto: b.toString(), esEstatico: false, esEspacio: false, clave: b.toString(), tipoEntrada: entradaGlobal, equivalentes: [], longitud: b.toString().length },
            { id: 'p2_t11', texto: ') + (', esEstatico: true, esEspacio: false, clave: '', tipoEntrada: entradaGlobal, equivalentes: [], longitud: 5 },
            { id: 'p2_t12', texto: b.toString(), esEstatico: false, esEspacio: false, clave: b.toString(), tipoEntrada: entradaGlobal, equivalentes: [], longitud: b.toString().length },
            { id: 'p2_t13', texto: ')²', esEstatico: true, esEspacio: false, clave: '', tipoEntrada: entradaGlobal, equivalentes: [], longitud: 2 },
          ],
        },
        {
          id: 'p3',
          titulo: 'Potencias y doble producto',
          latexCompleto: `= ${a2} + ${doble} + ${b2}`,
          tokens: [
            { id: 'p3_t1', texto: '= ', esEstatico: true, esEspacio: false, clave: '', tipoEntrada: entradaGlobal, equivalentes: [], longitud: 2 },
            { id: 'p3_t2', texto: a2.toString(), esEstatico: false, esEspacio: false, clave: a2.toString(), tipoEntrada: entradaGlobal, equivalentes: [`${a}²`], longitud: a2.toString().length },
            { id: 'p3_t3', texto: ' + ', esEstatico: true, esEspacio: false, clave: '', tipoEntrada: entradaGlobal, equivalentes: [], longitud: 3 },
            { id: 'p3_t4', texto: doble.toString(), esEstatico: false, esEspacio: false, clave: doble.toString(), tipoEntrada: entradaGlobal, equivalentes: [], longitud: doble.toString().length },
            { id: 'p3_t5', texto: ' + ', esEstatico: true, esEspacio: false, clave: '', tipoEntrada: entradaGlobal, equivalentes: [], longitud: 3 },
            { id: 'p3_t6', texto: b2.toString(), esEstatico: false, esEspacio: false, clave: b2.toString(), tipoEntrada: entradaGlobal, equivalentes: [`${b}²`], longitud: b2.toString().length },
          ],
        },
        {
          id: 'p4',
          titulo: 'Resultado final',
          latexCompleto: `= ${resultado}`,
          tokens: [
            { id: 'p4_t1', texto: '= ', esEstatico: true, esEspacio: false, clave: '', tipoEntrada: entradaGlobal, equivalentes: [], longitud: 2 },
            { id: 'p4_t2', texto: resultado.toString(), esEstatico: false, esEspacio: false, clave: resultado.toString(), tipoEntrada: entradaGlobal, equivalentes: [], longitud: resultado.toString().length },
          ],
        },
      ];
    },
    presetsAyuda: {
      guiado: (tokens) => {
        const targets = new Set(['p2_t6', 'p2_t10', 'p3_t2', 'p3_t4', 'p3_t6', 'p4_t2']);
        tokens.forEach((t) => { if (targets.has(t.id)) t.esEspacio = true; });
      },
      medio: (tokens) => {
        const targets = new Set(['p3_t4', 'p4_t2']);
        tokens.forEach((t) => { if (targets.has(t.id)) t.esEspacio = true; });
      },
      final: (tokens) => {
        const targets = new Set(['p4_t2']);
        tokens.forEach((t) => { if (targets.has(t.id)) t.esEspacio = true; });
      },
    },
  },
  {
    id: 'binomio_cuadrado_resta',
    nombre: 'Binomio al cuadrado (resta)',
    categoria: 'Álgebra y Productos Notables',
    latexReferencia: '(a - b)² = a² - 2ab + b²',
    enunciadoPlantilla: (d) =>
      `Desarrolla el binomio al cuadrado (${d.a ?? 5} - ${d.b ?? 3})² aplicando la regla de productos notables.`,
    datosDefecto: [
      { clave: 'a', nombre: 'Término a', valor: 5, rango: [3, 9] },
      { clave: 'b', nombre: 'Término b', valor: 3, rango: [2, 8] },
    ],
    generarPasos: (d, entradaGlobal) => {
      const a = d.a ?? 5;
      const b = d.b ?? 3;
      const a2 = a * a;
      const doble = 2 * a * b;
      const b2 = b * b;
      const resultado = a2 - doble + b2;

      return [
        {
          id: 'p1',
          titulo: 'Fórmula notable',
          latexCompleto: '(a - b)² = a² - 2ab + b²',
          tokens: [
            { id: 'p1_t1', texto: '(a - b)² = a² - 2ab + b²', esEstatico: true, esEspacio: false, clave: '', tipoEntrada: entradaGlobal, equivalentes: [], longitud: 24 },
          ],
        },
        {
          id: 'p2',
          titulo: 'Sustitución de términos',
          latexCompleto: `(${a} - ${b})² = (${a})² - 2(${a})(${b}) + (${b})²`,
          tokens: [
            { id: 'p2_t1', texto: '(', esEstatico: true, esEspacio: false, clave: '', tipoEntrada: entradaGlobal, equivalentes: [], longitud: 1 },
            { id: 'p2_t2', texto: a.toString(), esEstatico: false, esEspacio: false, clave: a.toString(), tipoEntrada: entradaGlobal, equivalentes: [], longitud: a.toString().length },
            { id: 'p2_t3', texto: ' - ', esEstatico: true, esEspacio: false, clave: '', tipoEntrada: entradaGlobal, equivalentes: [], longitud: 3 },
            { id: 'p2_t4', texto: b.toString(), esEstatico: false, esEspacio: false, clave: b.toString(), tipoEntrada: entradaGlobal, equivalentes: [], longitud: b.toString().length },
            { id: 'p2_t5', texto: ')² = (', esEstatico: true, esEspacio: false, clave: '', tipoEntrada: entradaGlobal, equivalentes: [], longitud: 6 },
            { id: 'p2_t6', texto: a.toString(), esEstatico: false, esEspacio: false, clave: a.toString(), tipoEntrada: entradaGlobal, equivalentes: [], longitud: a.toString().length },
            { id: 'p2_t7', texto: ')² - 2(', esEstatico: true, esEspacio: false, clave: '', tipoEntrada: entradaGlobal, equivalentes: [], longitud: 7 },
            { id: 'p2_t8', texto: a.toString(), esEstatico: false, esEspacio: false, clave: a.toString(), tipoEntrada: entradaGlobal, equivalentes: [], longitud: a.toString().length },
            { id: 'p2_t9', texto: ')(', esEstatico: true, esEspacio: false, clave: '', tipoEntrada: entradaGlobal, equivalentes: [], longitud: 2 },
            { id: 'p2_t10', texto: b.toString(), esEstatico: false, esEspacio: false, clave: b.toString(), tipoEntrada: entradaGlobal, equivalentes: [], longitud: b.toString().length },
            { id: 'p2_t11', texto: ') + (', esEstatico: true, esEspacio: false, clave: '', tipoEntrada: entradaGlobal, equivalentes: [], longitud: 5 },
            { id: 'p2_t12', texto: b.toString(), esEstatico: false, esEspacio: false, clave: b.toString(), tipoEntrada: entradaGlobal, equivalentes: [], longitud: b.toString().length },
            { id: 'p2_t13', texto: ')²', esEstatico: true, esEspacio: false, clave: '', tipoEntrada: entradaGlobal, equivalentes: [], longitud: 2 },
          ],
        },
        {
          id: 'p3',
          titulo: 'Potencias y doble producto',
          latexCompleto: `= ${a2} - ${doble} + ${b2}`,
          tokens: [
            { id: 'p3_t1', texto: '= ', esEstatico: true, esEspacio: false, clave: '', tipoEntrada: entradaGlobal, equivalentes: [], longitud: 2 },
            { id: 'p3_t2', texto: a2.toString(), esEstatico: false, esEspacio: false, clave: a2.toString(), tipoEntrada: entradaGlobal, equivalentes: [`${a}²`], longitud: a2.toString().length },
            { id: 'p3_t3', texto: ' - ', esEstatico: true, esEspacio: false, clave: '', tipoEntrada: entradaGlobal, equivalentes: [], longitud: 3 },
            { id: 'p3_t4', texto: doble.toString(), esEstatico: false, esEspacio: false, clave: doble.toString(), tipoEntrada: entradaGlobal, equivalentes: [], longitud: doble.toString().length },
            { id: 'p3_t5', texto: ' + ', esEstatico: true, esEspacio: false, clave: '', tipoEntrada: entradaGlobal, equivalentes: [], longitud: 3 },
            { id: 'p3_t6', texto: b2.toString(), esEstatico: false, esEspacio: false, clave: b2.toString(), tipoEntrada: entradaGlobal, equivalentes: [`${b}²`], longitud: b2.toString().length },
          ],
        },
        {
          id: 'p4',
          titulo: 'Resultado final',
          latexCompleto: `= ${resultado}`,
          tokens: [
            { id: 'p4_t1', texto: '= ', esEstatico: true, esEspacio: false, clave: '', tipoEntrada: entradaGlobal, equivalentes: [], longitud: 2 },
            { id: 'p4_t2', texto: resultado.toString(), esEstatico: false, esEspacio: false, clave: resultado.toString(), tipoEntrada: entradaGlobal, equivalentes: [], longitud: resultado.toString().length },
          ],
        },
      ];
    },
    presetsAyuda: {
      guiado: (tokens) => {
        const targets = new Set(['p2_t6', 'p2_t10', 'p3_t2', 'p3_t4', 'p3_t6', 'p4_t2']);
        tokens.forEach((t) => { if (targets.has(t.id)) t.esEspacio = true; });
      },
      medio: (tokens) => {
        const targets = new Set(['p3_t4', 'p4_t2']);
        tokens.forEach((t) => { if (targets.has(t.id)) t.esEspacio = true; });
      },
      final: (tokens) => {
        const targets = new Set(['p4_t2']);
        tokens.forEach((t) => { if (targets.has(t.id)) t.esEspacio = true; });
      },
    },
  },
  {
    id: 'diferencia_cuadrados',
    nombre: 'Diferencia de cuadrados',
    categoria: 'Álgebra y Productos Notables',
    latexReferencia: 'a² - b² = (a + b)(a - b)',
    enunciadoPlantilla: (d) =>
      `Factoriza y calcula la diferencia de cuadrados (${d.a ?? 6})² - (${d.b ?? 4})².`,
    datosDefecto: [
      { clave: 'a', nombre: 'Término a', valor: 6, rango: [4, 12] },
      { clave: 'b', nombre: 'Término b', valor: 4, rango: [2, 10] },
    ],
    generarPasos: (d, entradaGlobal) => {
      const a = d.a ?? 6;
      const b = d.b ?? 4;
      const a2 = a * a;
      const b2 = b * b;
      const suma = a + b;
      const resta = a - b;
      const producto = suma * resta;

      return [
        {
          id: 'p1',
          titulo: 'Identidad notable',
          latexCompleto: 'a² - b² = (a + b)(a - b)',
          tokens: [
            { id: 'p1_t1', texto: 'a² - b² = (a + b)(a - b)', esEstatico: true, esEspacio: false, clave: '', tipoEntrada: entradaGlobal, equivalentes: [], longitud: 24 },
          ],
        },
        {
          id: 'p2',
          titulo: 'Sustitución en factores',
          latexCompleto: `(${a})² - (${b})² = (${a} + ${b})(${a} - ${b})`,
          tokens: [
            { id: 'p2_t1', texto: `${a2} - ${b2} = (`, esEstatico: true, esEspacio: false, clave: '', tipoEntrada: entradaGlobal, equivalentes: [], longitud: 10 },
            { id: 'p2_t2', texto: a.toString(), esEstatico: false, esEspacio: false, clave: a.toString(), tipoEntrada: entradaGlobal, equivalentes: [], longitud: a.toString().length },
            { id: 'p2_t3', texto: ' + ', esEstatico: true, esEspacio: false, clave: '', tipoEntrada: entradaGlobal, equivalentes: [], longitud: 3 },
            { id: 'p2_t4', texto: b.toString(), esEstatico: false, esEspacio: false, clave: b.toString(), tipoEntrada: entradaGlobal, equivalentes: [], longitud: b.toString().length },
            { id: 'p2_t5', texto: ')(', esEstatico: true, esEspacio: false, clave: '', tipoEntrada: entradaGlobal, equivalentes: [], longitud: 2 },
            { id: 'p2_t6', texto: a.toString(), esEstatico: false, esEspacio: false, clave: a.toString(), tipoEntrada: entradaGlobal, equivalentes: [], longitud: a.toString().length },
            { id: 'p2_t7', texto: ' - ', esEstatico: true, esEspacio: false, clave: '', tipoEntrada: entradaGlobal, equivalentes: [], longitud: 3 },
            { id: 'p2_t8', texto: b.toString(), esEstatico: false, esEspacio: false, clave: b.toString(), tipoEntrada: entradaGlobal, equivalentes: [], longitud: b.toString().length },
            { id: 'p2_t9', texto: ')', esEstatico: true, esEspacio: false, clave: '', tipoEntrada: entradaGlobal, equivalentes: [], longitud: 1 },
          ],
        },
        {
          id: 'p3',
          titulo: 'Evaluación de paréntesis',
          latexCompleto: `= (${suma})(${resta})`,
          tokens: [
            { id: 'p3_t1', texto: '= (', esEstatico: true, esEspacio: false, clave: '', tipoEntrada: entradaGlobal, equivalentes: [], longitud: 3 },
            { id: 'p3_t2', texto: suma.toString(), esEstatico: false, esEspacio: false, clave: suma.toString(), tipoEntrada: entradaGlobal, equivalentes: [], longitud: suma.toString().length },
            { id: 'p3_t3', texto: ')(', esEstatico: true, esEspacio: false, clave: '', tipoEntrada: entradaGlobal, equivalentes: [], longitud: 2 },
            { id: 'p3_t4', texto: resta.toString(), esEstatico: false, esEspacio: false, clave: resta.toString(), tipoEntrada: entradaGlobal, equivalentes: [], longitud: resta.toString().length },
            { id: 'p3_t5', texto: ')', esEstatico: true, esEspacio: false, clave: '', tipoEntrada: entradaGlobal, equivalentes: [], longitud: 1 },
          ],
        },
        {
          id: 'p4',
          titulo: 'Resultado final',
          latexCompleto: `= ${producto}`,
          tokens: [
            { id: 'p4_t1', texto: '= ', esEstatico: true, esEspacio: false, clave: '', tipoEntrada: entradaGlobal, equivalentes: [], longitud: 2 },
            { id: 'p4_t2', texto: producto.toString(), esEstatico: false, esEspacio: false, clave: producto.toString(), tipoEntrada: entradaGlobal, equivalentes: [], longitud: producto.toString().length },
          ],
        },
      ];
    },
    presetsAyuda: {
      guiado: (tokens) => {
        const targets = new Set(['p2_t2', 'p2_t4', 'p3_t2', 'p3_t4', 'p4_t2']);
        tokens.forEach((t) => { if (targets.has(t.id)) t.esEspacio = true; });
      },
      medio: (tokens) => {
        const targets = new Set(['p3_t2', 'p3_t4', 'p4_t2']);
        tokens.forEach((t) => { if (targets.has(t.id)) t.esEspacio = true; });
      },
      final: (tokens) => {
        const targets = new Set(['p4_t2']);
        tokens.forEach((t) => { if (targets.has(t.id)) t.esEspacio = true; });
      },
    },
  },
  {
    id: 'binomio_cubo_suma',
    nombre: 'Binomio al cubo (suma)',
    categoria: 'Álgebra y Productos Notables',
    latexReferencia: '(a + b)³ = a³ + 3a²b + 3ab² + b³',
    enunciadoPlantilla: (d) =>
      `Desarrolla el cubo del binomio (${d.a ?? 2} + ${d.b ?? 3})³ aplicando la fórmula notable paso a paso.`,
    datosDefecto: [
      { clave: 'a', nombre: 'Término a', valor: 2, rango: [1, 5] },
      { clave: 'b', nombre: 'Término b', valor: 3, rango: [1, 5] },
    ],
    generarPasos: (d, entradaGlobal) => {
      const a = d.a ?? 2;
      const b = d.b ?? 3;
      const a3 = Math.pow(a, 3);
      const a2 = a * a;
      const b2 = b * b;
      const b3 = Math.pow(b, 3);
      const t2 = 3 * a2 * b;
      const t3 = 3 * a * b2;
      const total = a3 + t2 + t3 + b3;

      return [
        {
          id: 'p1',
          titulo: 'Fórmula del binomio al cubo',
          latexCompleto: '(a + b)³ = a³ + 3a²b + 3ab² + b³',
          tokens: [
            { id: 'p1_t1', texto: '(a + b)³ = a³ + 3a²b + 3ab² + b³', esEstatico: true, esEspacio: false, clave: '', tipoEntrada: entradaGlobal, equivalentes: [], longitud: 30 },
          ],
        },
        {
          id: 'p2',
          titulo: 'Sustitución ordenada',
          latexCompleto: `(${a} + ${b})³ = (${a})³ + 3(${a})²(${b}) + 3(${a})(${b})² + (${b})³`,
          tokens: [
            { id: 'p2_t1', texto: `(${a} + ${b})³ = (`, esEstatico: true, esEspacio: false, clave: '', tipoEntrada: entradaGlobal, equivalentes: [], longitud: 12 },
            { id: 'p2_t2', texto: a.toString(), esEstatico: false, esEspacio: false, clave: a.toString(), tipoEntrada: entradaGlobal, equivalentes: [], longitud: a.toString().length },
            { id: 'p2_t3', texto: ')³ + 3(', esEstatico: true, esEspacio: false, clave: '', tipoEntrada: entradaGlobal, equivalentes: [], longitud: 7 },
            { id: 'p2_t4', texto: a.toString(), esEstatico: false, esEspacio: false, clave: a.toString(), tipoEntrada: entradaGlobal, equivalentes: [], longitud: a.toString().length },
            { id: 'p2_t5', texto: ')²(', esEstatico: true, esEspacio: false, clave: '', tipoEntrada: entradaGlobal, equivalentes: [], longitud: 3 },
            { id: 'p2_t6', texto: b.toString(), esEstatico: false, esEspacio: false, clave: b.toString(), tipoEntrada: entradaGlobal, equivalentes: [], longitud: b.toString().length },
            { id: 'p2_t7', texto: ') + 3(', esEstatico: true, esEspacio: false, clave: '', tipoEntrada: entradaGlobal, equivalentes: [], longitud: 6 },
            { id: 'p2_t8', texto: a.toString(), esEstatico: false, esEspacio: false, clave: a.toString(), tipoEntrada: entradaGlobal, equivalentes: [], longitud: a.toString().length },
            { id: 'p2_t9', texto: ')(', esEstatico: true, esEspacio: false, clave: '', tipoEntrada: entradaGlobal, equivalentes: [], longitud: 2 },
            { id: 'p2_t10', texto: b.toString(), esEstatico: false, esEspacio: false, clave: b.toString(), tipoEntrada: entradaGlobal, equivalentes: [], longitud: b.toString().length },
            { id: 'p2_t11', texto: ')² + (', esEstatico: true, esEspacio: false, clave: '', tipoEntrada: entradaGlobal, equivalentes: [], longitud: 6 },
            { id: 'p2_t12', texto: b.toString(), esEstatico: false, esEspacio: false, clave: b.toString(), tipoEntrada: entradaGlobal, equivalentes: [], longitud: b.toString().length },
            { id: 'p2_t13', texto: ')³', esEstatico: true, esEspacio: false, clave: '', tipoEntrada: entradaGlobal, equivalentes: [], longitud: 2 },
          ],
        },
        {
          id: 'p3',
          titulo: 'Cálculo de potencias',
          latexCompleto: `= ${a3} + 3(${a2})(${b}) + 3(${a})(${b2}) + ${b3}`,
          tokens: [
            { id: 'p3_t1', texto: '= ', esEstatico: true, esEspacio: false, clave: '', tipoEntrada: entradaGlobal, equivalentes: [], longitud: 2 },
            { id: 'p3_t2', texto: a3.toString(), esEstatico: false, esEspacio: false, clave: a3.toString(), tipoEntrada: entradaGlobal, equivalentes: [], longitud: a3.toString().length },
            { id: 'p3_t3', texto: ' + 3(', esEstatico: true, esEspacio: false, clave: '', tipoEntrada: entradaGlobal, equivalentes: [], longitud: 5 },
            { id: 'p3_t4', texto: a2.toString(), esEstatico: false, esEspacio: false, clave: a2.toString(), tipoEntrada: entradaGlobal, equivalentes: [], longitud: a2.toString().length },
            { id: 'p3_t5', texto: `)(${b}) + 3(${a})(`, esEstatico: true, esEspacio: false, clave: '', tipoEntrada: entradaGlobal, equivalentes: [], longitud: 12 },
            { id: 'p3_t6', texto: b2.toString(), esEstatico: false, esEspacio: false, clave: b2.toString(), tipoEntrada: entradaGlobal, equivalentes: [], longitud: b2.toString().length },
            { id: 'p3_t7', texto: ') + ', esEstatico: true, esEspacio: false, clave: '', tipoEntrada: entradaGlobal, equivalentes: [], longitud: 4 },
            { id: 'p3_t8', texto: b3.toString(), esEstatico: false, esEspacio: false, clave: b3.toString(), tipoEntrada: entradaGlobal, equivalentes: [], longitud: b3.toString().length },
          ],
        },
        {
          id: 'p4',
          titulo: 'Multiplicación de productos',
          latexCompleto: `= ${a3} + ${t2} + ${t3} + ${b3}`,
          tokens: [
            { id: 'p4_t1', texto: `= ${a3} + `, esEstatico: true, esEspacio: false, clave: '', tipoEntrada: entradaGlobal, equivalentes: [], longitud: 6 },
            { id: 'p4_t2', texto: t2.toString(), esEstatico: false, esEspacio: false, clave: t2.toString(), tipoEntrada: entradaGlobal, equivalentes: [], longitud: t2.toString().length },
            { id: 'p4_t3', texto: ' + ', esEstatico: true, esEspacio: false, clave: '', tipoEntrada: entradaGlobal, equivalentes: [], longitud: 3 },
            { id: 'p4_t4', texto: t3.toString(), esEstatico: false, esEspacio: false, clave: t3.toString(), tipoEntrada: entradaGlobal, equivalentes: [], longitud: t3.toString().length },
            { id: 'p4_t5', texto: ` + ${b3}`, esEstatico: true, esEspacio: false, clave: '', tipoEntrada: entradaGlobal, equivalentes: [], longitud: 6 },
          ],
        },
        {
          id: 'p5',
          titulo: 'Resultado final',
          latexCompleto: `= ${total}`,
          tokens: [
            { id: 'p5_t1', texto: '= ', esEstatico: true, esEspacio: false, clave: '', tipoEntrada: entradaGlobal, equivalentes: [], longitud: 2 },
            { id: 'p5_t2', texto: total.toString(), esEstatico: false, esEspacio: false, clave: total.toString(), tipoEntrada: entradaGlobal, equivalentes: [], longitud: total.toString().length },
          ],
        },
      ];
    },
    presetsAyuda: {
      guiado: (tokens) => {
        const targets = new Set(['p2_t4', 'p2_t6', 'p3_t2', 'p4_t2', 'p4_t4', 'p5_t2']);
        tokens.forEach((t) => { if (targets.has(t.id)) t.esEspacio = true; });
      },
      medio: (tokens) => {
        const targets = new Set(['p4_t2', 'p4_t4', 'p5_t2']);
        tokens.forEach((t) => { if (targets.has(t.id)) t.esEspacio = true; });
      },
      final: (tokens) => {
        const targets = new Set(['p5_t2']);
        tokens.forEach((t) => { if (targets.has(t.id)) t.esEspacio = true; });
      },
    },
  },
  {
    id: 'binomio_cubo_resta',
    nombre: 'Binomio al cubo (resta)',
    categoria: 'Álgebra y Productos Notables',
    latexReferencia: '(a - b)³ = a³ - 3a²b + 3ab² - b³',
    enunciadoPlantilla: (d) =>
      `Desarrolla el cubo del binomio (${d.a ?? 4} - ${d.b ?? 1})³ aplicando la fórmula notable paso a paso.`,
    datosDefecto: [
      { clave: 'a', nombre: 'Término a', valor: 4, rango: [2, 6] },
      { clave: 'b', nombre: 'Término b', valor: 1, rango: [1, 4] },
    ],
    generarPasos: (d, entradaGlobal) => {
      const a = d.a ?? 4;
      const b = d.b ?? 1;
      const a3 = Math.pow(a, 3);
      const a2 = a * a;
      const b2 = b * b;
      const b3 = Math.pow(b, 3);
      const t2 = 3 * a2 * b;
      const t3 = 3 * a * b2;
      const total = a3 - t2 + t3 - b3;

      return [
        {
          id: 'p1',
          titulo: 'Fórmula notable',
          latexCompleto: '(a - b)³ = a³ - 3a²b + 3ab² - b³',
          tokens: [
            { id: 'p1_t1', texto: '(a - b)³ = a³ - 3a²b + 3ab² - b³', esEstatico: true, esEspacio: false, clave: '', tipoEntrada: entradaGlobal, equivalentes: [], longitud: 30 },
          ],
        },
        {
          id: 'p2',
          titulo: 'Sustitución ordenada',
          latexCompleto: `(${a} - ${b})³ = (${a})³ - 3(${a})²(${b}) + 3(${a})(${b})² - (${b})³`,
          tokens: [
            { id: 'p2_t1', texto: `(${a} - ${b})³ = (`, esEstatico: true, esEspacio: false, clave: '', tipoEntrada: entradaGlobal, equivalentes: [], longitud: 12 },
            { id: 'p2_t2', texto: a.toString(), esEstatico: false, esEspacio: false, clave: a.toString(), tipoEntrada: entradaGlobal, equivalentes: [], longitud: a.toString().length },
            { id: 'p2_t3', texto: ')³ - 3(', esEstatico: true, esEspacio: false, clave: '', tipoEntrada: entradaGlobal, equivalentes: [], longitud: 7 },
            { id: 'p2_t4', texto: a.toString(), esEstatico: false, esEspacio: false, clave: a.toString(), tipoEntrada: entradaGlobal, equivalentes: [], longitud: a.toString().length },
            { id: 'p2_t5', texto: ')²(', esEstatico: true, esEspacio: false, clave: '', tipoEntrada: entradaGlobal, equivalentes: [], longitud: 3 },
            { id: 'p2_t6', texto: b.toString(), esEstatico: false, esEspacio: false, clave: b.toString(), tipoEntrada: entradaGlobal, equivalentes: [], longitud: b.toString().length },
            { id: 'p2_t7', texto: ') + 3(', esEstatico: true, esEspacio: false, clave: '', tipoEntrada: entradaGlobal, equivalentes: [], longitud: 6 },
            { id: 'p2_t8', texto: a.toString(), esEstatico: false, esEspacio: false, clave: a.toString(), tipoEntrada: entradaGlobal, equivalentes: [], longitud: a.toString().length },
            { id: 'p2_t9', texto: ')(', esEstatico: true, esEspacio: false, clave: '', tipoEntrada: entradaGlobal, equivalentes: [], longitud: 2 },
            { id: 'p2_t10', texto: b.toString(), esEstatico: false, esEspacio: false, clave: b.toString(), tipoEntrada: entradaGlobal, equivalentes: [], longitud: b.toString().length },
            { id: 'p2_t11', texto: ')² - (', esEstatico: true, esEspacio: false, clave: '', tipoEntrada: entradaGlobal, equivalentes: [], longitud: 6 },
            { id: 'p2_t12', texto: b.toString(), esEstatico: false, esEspacio: false, clave: b.toString(), tipoEntrada: entradaGlobal, equivalentes: [], longitud: b.toString().length },
            { id: 'p2_t13', texto: ')³', esEstatico: true, esEspacio: false, clave: '', tipoEntrada: entradaGlobal, equivalentes: [], longitud: 2 },
          ],
        },
        {
          id: 'p3',
          titulo: 'Cálculo de potencias',
          latexCompleto: `= ${a3} - 3(${a2})(${b}) + 3(${a})(${b2}) - ${b3}`,
          tokens: [
            { id: 'p3_t1', texto: '= ', esEstatico: true, esEspacio: false, clave: '', tipoEntrada: entradaGlobal, equivalentes: [], longitud: 2 },
            { id: 'p3_t2', texto: a3.toString(), esEstatico: false, esEspacio: false, clave: a3.toString(), tipoEntrada: entradaGlobal, equivalentes: [], longitud: a3.toString().length },
            { id: 'p3_t3', texto: ' - 3(', esEstatico: true, esEspacio: false, clave: '', tipoEntrada: entradaGlobal, equivalentes: [], longitud: 5 },
            { id: 'p3_t4', texto: a2.toString(), esEstatico: false, esEspacio: false, clave: a2.toString(), tipoEntrada: entradaGlobal, equivalentes: [], longitud: a2.toString().length },
            { id: 'p3_t5', texto: `)(${b}) + 3(${a})(`, esEstatico: true, esEspacio: false, clave: '', tipoEntrada: entradaGlobal, equivalentes: [], longitud: 12 },
            { id: 'p3_t6', texto: b2.toString(), esEstatico: false, esEspacio: false, clave: b2.toString(), tipoEntrada: entradaGlobal, equivalentes: [], longitud: b2.toString().length },
            { id: 'p3_t7', texto: ') - ', esEstatico: true, esEspacio: false, clave: '', tipoEntrada: entradaGlobal, equivalentes: [], longitud: 4 },
            { id: 'p3_t8', texto: b3.toString(), esEstatico: false, esEspacio: false, clave: b3.toString(), tipoEntrada: entradaGlobal, equivalentes: [], longitud: b3.toString().length },
          ],
        },
        {
          id: 'p4',
          titulo: 'Multiplicación de productos',
          latexCompleto: `= ${a3} - ${t2} + ${t3} - ${b3}`,
          tokens: [
            { id: 'p4_t1', texto: `= ${a3} - `, esEstatico: true, esEspacio: false, clave: '', tipoEntrada: entradaGlobal, equivalentes: [], longitud: 6 },
            { id: 'p4_t2', texto: t2.toString(), esEstatico: false, esEspacio: false, clave: t2.toString(), tipoEntrada: entradaGlobal, equivalentes: [], longitud: t2.toString().length },
            { id: 'p4_t3', texto: ' + ', esEstatico: true, esEspacio: false, clave: '', tipoEntrada: entradaGlobal, equivalentes: [], longitud: 3 },
            { id: 'p4_t4', texto: t3.toString(), esEstatico: false, esEspacio: false, clave: t3.toString(), tipoEntrada: entradaGlobal, equivalentes: [], longitud: t3.toString().length },
            { id: 'p4_t5', texto: ` - ${b3}`, esEstatico: true, esEspacio: false, clave: '', tipoEntrada: entradaGlobal, equivalentes: [], longitud: 6 },
          ],
        },
        {
          id: 'p5',
          titulo: 'Resultado final',
          latexCompleto: `= ${total}`,
          tokens: [
            { id: 'p5_t1', texto: '= ', esEstatico: true, esEspacio: false, clave: '', tipoEntrada: entradaGlobal, equivalentes: [], longitud: 2 },
            { id: 'p5_t2', texto: total.toString(), esEstatico: false, esEspacio: false, clave: total.toString(), tipoEntrada: entradaGlobal, equivalentes: [], longitud: total.toString().length },
          ],
        },
      ];
    },
    presetsAyuda: {
      guiado: (tokens) => {
        const targets = new Set(['p2_t4', 'p2_t6', 'p3_t2', 'p4_t2', 'p4_t4', 'p5_t2']);
        tokens.forEach((t) => { if (targets.has(t.id)) t.esEspacio = true; });
      },
      medio: (tokens) => {
        const targets = new Set(['p4_t2', 'p4_t4', 'p5_t2']);
        tokens.forEach((t) => { if (targets.has(t.id)) t.esEspacio = true; });
      },
      final: (tokens) => {
        const targets = new Set(['p5_t2']);
        tokens.forEach((t) => { if (targets.has(t.id)) t.esEspacio = true; });
      },
    },
  },
  {
    id: 'suma_cubos',
    nombre: 'Suma de cubos',
    categoria: 'Álgebra y Productos Notables',
    latexReferencia: 'a³ + b³ = (a + b)(a² - ab + b²)',
    enunciadoPlantilla: (d) =>
      `Factoriza la suma de cubos (${d.a ?? 3})³ + (${d.b ?? 2})³.`,
    datosDefecto: [
      { clave: 'a', nombre: 'Término a', valor: 3, rango: [2, 6] },
      { clave: 'b', nombre: 'Término b', valor: 2, rango: [1, 5] },
    ],
    generarPasos: (d, entradaGlobal) => {
      const a = d.a ?? 3;
      const b = d.b ?? 2;
      const suma = a + b;
      const a2 = a * a;
      const ab = a * b;
      const b2 = b * b;
      const trin = a2 - ab + b2;
      const res = suma * trin;

      return [
        {
          id: 'p1',
          titulo: 'Fórmula de factorización',
          latexCompleto: 'a³ + b³ = (a + b)(a² - ab + b²)',
          tokens: [
            { id: 'p1_t1', texto: 'a³ + b³ = (a + b)(a² - ab + b²)', esEstatico: true, esEspacio: false, clave: '', tipoEntrada: entradaGlobal, equivalentes: [], longitud: 30 },
          ],
        },
        {
          id: 'p2',
          titulo: 'Sustitución en factores',
          latexCompleto: `(${a})³ + (${b})³ = (${a} + ${b})((${a})² - (${a})(${b}) + (${b})²)`,
          tokens: [
            { id: 'p2_t1', texto: `(${a})³ + (${b})³ = (`, esEstatico: true, esEspacio: false, clave: '', tipoEntrada: entradaGlobal, equivalentes: [], longitud: 12 },
            { id: 'p2_t2', texto: a.toString(), esEstatico: false, esEspacio: false, clave: a.toString(), tipoEntrada: entradaGlobal, equivalentes: [], longitud: a.toString().length },
            { id: 'p2_t3', texto: ' + ', esEstatico: true, esEspacio: false, clave: '', tipoEntrada: entradaGlobal, equivalentes: [], longitud: 3 },
            { id: 'p2_t4', texto: b.toString(), esEstatico: false, esEspacio: false, clave: b.toString(), tipoEntrada: entradaGlobal, equivalentes: [], longitud: b.toString().length },
            { id: 'p2_t5', texto: ')(', esEstatico: true, esEspacio: false, clave: '', tipoEntrada: entradaGlobal, equivalentes: [], longitud: 2 },
            { id: 'p2_t6', texto: a2.toString(), esEstatico: false, esEspacio: false, clave: a2.toString(), tipoEntrada: entradaGlobal, equivalentes: [], longitud: a2.toString().length },
            { id: 'p2_t7', texto: ' - ', esEstatico: true, esEspacio: false, clave: '', tipoEntrada: entradaGlobal, equivalentes: [], longitud: 3 },
            { id: 'p2_t8', texto: ab.toString(), esEstatico: false, esEspacio: false, clave: ab.toString(), tipoEntrada: entradaGlobal, equivalentes: [], longitud: ab.toString().length },
            { id: 'p2_t9', texto: ' + ', esEstatico: true, esEspacio: false, clave: '', tipoEntrada: entradaGlobal, equivalentes: [], longitud: 3 },
            { id: 'p2_t10', texto: b2.toString(), esEstatico: false, esEspacio: false, clave: b2.toString(), tipoEntrada: entradaGlobal, equivalentes: [], longitud: b2.toString().length },
            { id: 'p2_t11', texto: ')', esEstatico: true, esEspacio: false, clave: '', tipoEntrada: entradaGlobal, equivalentes: [], longitud: 1 },
          ],
        },
        {
          id: 'p3',
          titulo: 'Simplificación de términos',
          latexCompleto: `= (${suma})(${trin})`,
          tokens: [
            { id: 'p3_t1', texto: '= (', esEstatico: true, esEspacio: false, clave: '', tipoEntrada: entradaGlobal, equivalentes: [], longitud: 3 },
            { id: 'p3_t2', texto: suma.toString(), esEstatico: false, esEspacio: false, clave: suma.toString(), tipoEntrada: entradaGlobal, equivalentes: [], longitud: suma.toString().length },
            { id: 'p3_t3', texto: ')(', esEstatico: true, esEspacio: false, clave: '', tipoEntrada: entradaGlobal, equivalentes: [], longitud: 2 },
            { id: 'p3_t4', texto: trin.toString(), esEstatico: false, esEspacio: false, clave: trin.toString(), tipoEntrada: entradaGlobal, equivalentes: [], longitud: trin.toString().length },
            { id: 'p3_t5', texto: ')', esEstatico: true, esEspacio: false, clave: '', tipoEntrada: entradaGlobal, equivalentes: [], longitud: 1 },
          ],
        },
        {
          id: 'p4',
          titulo: 'Resultado final',
          latexCompleto: `= ${res}`,
          tokens: [
            { id: 'p4_t1', texto: '= ', esEstatico: true, esEspacio: false, clave: '', tipoEntrada: entradaGlobal, equivalentes: [], longitud: 2 },
            { id: 'p4_t2', texto: res.toString(), esEstatico: false, esEspacio: false, clave: res.toString(), tipoEntrada: entradaGlobal, equivalentes: [], longitud: res.toString().length },
          ],
        },
      ];
    },
    presetsAyuda: {
      guiado: (tokens) => {
        const targets = new Set(['p2_t2', 'p2_t4', 'p2_t8', 'p3_t2', 'p3_t4', 'p4_t2']);
        tokens.forEach((t) => { if (targets.has(t.id)) t.esEspacio = true; });
      },
      medio: (tokens) => {
        const targets = new Set(['p3_t2', 'p3_t4', 'p4_t2']);
        tokens.forEach((t) => { if (targets.has(t.id)) t.esEspacio = true; });
      },
      final: (tokens) => {
        const targets = new Set(['p4_t2']);
        tokens.forEach((t) => { if (targets.has(t.id)) t.esEspacio = true; });
      },
    },
  },
  {
    id: 'diferencia_cubos',
    nombre: 'Diferencia de cubos',
    categoria: 'Álgebra y Productos Notables',
    latexReferencia: 'a³ - b³ = (a - b)(a² + ab + b²)',
    enunciadoPlantilla: (d) =>
      `Factoriza la diferencia de cubos (${d.a ?? 4})³ - (${d.b ?? 2})³.`,
    datosDefecto: [
      { clave: 'a', nombre: 'Término a', valor: 4, rango: [3, 7] },
      { clave: 'b', nombre: 'Término b', valor: 2, rango: [1, 5] },
    ],
    generarPasos: (d, entradaGlobal) => {
      const a = d.a ?? 4;
      const b = d.b ?? 2;
      const resta = a - b;
      const a2 = a * a;
      const ab = a * b;
      const b2 = b * b;
      const trin = a2 + ab + b2;
      const res = resta * trin;

      return [
        {
          id: 'p1',
          titulo: 'Fórmula de factorización',
          latexCompleto: 'a³ - b³ = (a - b)(a² + ab + b²)',
          tokens: [
            { id: 'p1_t1', texto: 'a³ - b³ = (a - b)(a² + ab + b²)', esEstatico: true, esEspacio: false, clave: '', tipoEntrada: entradaGlobal, equivalentes: [], longitud: 30 },
          ],
        },
        {
          id: 'p2',
          titulo: 'Sustitución en factores',
          latexCompleto: `(${a})³ - (${b})³ = (${a} - ${b})((${a})² + (${a})(${b}) + (${b})²)`,
          tokens: [
            { id: 'p2_t1', texto: `(${a})³ - (${b})³ = (`, esEstatico: true, esEspacio: false, clave: '', tipoEntrada: entradaGlobal, equivalentes: [], longitud: 12 },
            { id: 'p2_t2', texto: a.toString(), esEstatico: false, esEspacio: false, clave: a.toString(), tipoEntrada: entradaGlobal, equivalentes: [], longitud: a.toString().length },
            { id: 'p2_t3', texto: ' - ', esEstatico: true, esEspacio: false, clave: '', tipoEntrada: entradaGlobal, equivalentes: [], longitud: 3 },
            { id: 'p2_t4', texto: b.toString(), esEstatico: false, esEspacio: false, clave: b.toString(), tipoEntrada: entradaGlobal, equivalentes: [], longitud: b.toString().length },
            { id: 'p2_t5', texto: ')(', esEstatico: true, esEspacio: false, clave: '', tipoEntrada: entradaGlobal, equivalentes: [], longitud: 2 },
            { id: 'p2_t6', texto: a2.toString(), esEstatico: false, esEspacio: false, clave: a2.toString(), tipoEntrada: entradaGlobal, equivalentes: [], longitud: a2.toString().length },
            { id: 'p2_t7', texto: ' + ', esEstatico: true, esEspacio: false, clave: '', tipoEntrada: entradaGlobal, equivalentes: [], longitud: 3 },
            { id: 'p2_t8', texto: ab.toString(), esEstatico: false, esEspacio: false, clave: ab.toString(), tipoEntrada: entradaGlobal, equivalentes: [], longitud: ab.toString().length },
            { id: 'p2_t9', texto: ' + ', esEstatico: true, esEspacio: false, clave: '', tipoEntrada: entradaGlobal, equivalentes: [], longitud: 3 },
            { id: 'p2_t10', texto: b2.toString(), esEstatico: false, esEspacio: false, clave: b2.toString(), tipoEntrada: entradaGlobal, equivalentes: [], longitud: b2.toString().length },
            { id: 'p2_t11', texto: ')', esEstatico: true, esEspacio: false, clave: '', tipoEntrada: entradaGlobal, equivalentes: [], longitud: 1 },
          ],
        },
        {
          id: 'p3',
          titulo: 'Simplificación de términos',
          latexCompleto: `= (${resta})(${trin})`,
          tokens: [
            { id: 'p3_t1', texto: '= (', esEstatico: true, esEspacio: false, clave: '', tipoEntrada: entradaGlobal, equivalentes: [], longitud: 3 },
            { id: 'p3_t2', texto: resta.toString(), esEstatico: false, esEspacio: false, clave: resta.toString(), tipoEntrada: entradaGlobal, equivalentes: [], longitud: resta.toString().length },
            { id: 'p3_t3', texto: ')(', esEstatico: true, esEspacio: false, clave: '', tipoEntrada: entradaGlobal, equivalentes: [], longitud: 2 },
            { id: 'p3_t4', texto: trin.toString(), esEstatico: false, esEspacio: false, clave: trin.toString(), tipoEntrada: entradaGlobal, equivalentes: [], longitud: trin.toString().length },
            { id: 'p3_t5', texto: ')', esEstatico: true, esEspacio: false, clave: '', tipoEntrada: entradaGlobal, equivalentes: [], longitud: 1 },
          ],
        },
        {
          id: 'p4',
          titulo: 'Resultado final',
          latexCompleto: `= ${res}`,
          tokens: [
            { id: 'p4_t1', texto: '= ', esEstatico: true, esEspacio: false, clave: '', tipoEntrada: entradaGlobal, equivalentes: [], longitud: 2 },
            { id: 'p4_t2', texto: res.toString(), esEstatico: false, esEspacio: false, clave: res.toString(), tipoEntrada: entradaGlobal, equivalentes: [], longitud: res.toString().length },
          ],
        },
      ];
    },
    presetsAyuda: {
      guiado: (tokens) => {
        const targets = new Set(['p2_t2', 'p2_t4', 'p2_t8', 'p3_t2', 'p3_t4', 'p4_t2']);
        tokens.forEach((t) => { if (targets.has(t.id)) t.esEspacio = true; });
      },
      medio: (tokens) => {
        const targets = new Set(['p3_t2', 'p3_t4', 'p4_t2']);
        tokens.forEach((t) => { if (targets.has(t.id)) t.esEspacio = true; });
      },
      final: (tokens) => {
        const targets = new Set(['p4_t2']);
        tokens.forEach((t) => { if (targets.has(t.id)) t.esEspacio = true; });
      },
    },
  },

  /* ══════════════════════════════════════════════════════════════════════════
     2. PROPIEDADES DE POTENCIAS Y RAÍCES
     ══════════════════════════════════════════════════════════════════════════ */
  {
    id: 'potencias_multiplicacion',
    nombre: 'Multiplicación de potencias de igual base',
    categoria: 'Potencias y Raíces',
    latexReferencia: 'aᵐ · aⁿ = aᵐ⁺ⁿ',
    enunciadoPlantilla: (d) =>
      `Aplica la propiedad del producto de potencias de igual base a (${d.a ?? 2})³ · (${d.a ?? 2})⁴.`,
    datosDefecto: [
      { clave: 'a', nombre: 'Base a', valor: 2, rango: [2, 5] },
      { clave: 'm', nombre: 'Exponente m', valor: 3, rango: [1, 4] },
      { clave: 'n', nombre: 'Exponente n', valor: 4, rango: [1, 4] },
    ],
    generarPasos: (d, entradaGlobal) => {
      const a = d.a ?? 2;
      const m = d.m ?? 3;
      const n = d.n ?? 4;
      const expSuma = m + n;
      const resultado = Math.pow(a, expSuma);

      return [
        {
          id: 'p1',
          titulo: 'Propiedad general',
          latexCompleto: 'aᵐ · aⁿ = aᵐ⁺ⁿ',
          tokens: [
            { id: 'p1_t1', texto: 'aᵐ · aⁿ = aᵐ⁺ⁿ', esEstatico: true, esEspacio: false, clave: '', tipoEntrada: entradaGlobal, equivalentes: [], longitud: 15 },
          ],
        },
        {
          id: 'p2',
          titulo: 'Sustitución de exponentes',
          latexCompleto: `(${a})${aSuperindice(m)} · (${a})${aSuperindice(n)} = (${a})${aSuperindice(`(${m} + ${n})`)}`,
          tokens: [
            { id: 'p2_t1', texto: `(${a})${aSuperindice(m)} · (${a})${aSuperindice(n)} = (${a})⁽`, esEstatico: true, esEspacio: false, clave: '', tipoEntrada: entradaGlobal, equivalentes: [], longitud: 16 },
            { id: 'p2_t2', texto: m.toString(), esEstatico: false, esEspacio: false, clave: m.toString(), tipoEntrada: entradaGlobal, equivalentes: [], longitud: m.toString().length },
            { id: 'p2_t3', texto: ' + ', esEstatico: true, esEspacio: false, clave: '', tipoEntrada: entradaGlobal, equivalentes: [], longitud: 3 },
            { id: 'p2_t4', texto: n.toString(), esEstatico: false, esEspacio: false, clave: n.toString(), tipoEntrada: entradaGlobal, equivalentes: [], longitud: n.toString().length },
            { id: 'p2_t5', texto: '⁾', esEstatico: true, esEspacio: false, clave: '', tipoEntrada: entradaGlobal, equivalentes: [], longitud: 1 },
          ],
        },
        {
          id: 'p3',
          titulo: 'Suma de exponentes',
          latexCompleto: `= (${a})${aSuperindice(expSuma)}`,
          tokens: [
            { id: 'p3_t1', texto: `= (${a})`, esEstatico: true, esEspacio: false, clave: '', tipoEntrada: entradaGlobal, equivalentes: [], longitud: 4 },
            { id: 'p3_t2', texto: aSuperindice(expSuma), esEstatico: false, esEspacio: false, clave: expSuma.toString(), tipoEntrada: entradaGlobal, equivalentes: [aSuperindice(expSuma)], longitud: expSuma.toString().length },
          ],
        },
        {
          id: 'p4',
          titulo: 'Valor calculado',
          latexCompleto: `= ${resultado}`,
          tokens: [
            { id: 'p4_t1', texto: '= ', esEstatico: true, esEspacio: false, clave: '', tipoEntrada: entradaGlobal, equivalentes: [], longitud: 2 },
            { id: 'p4_t2', texto: resultado.toString(), esEstatico: false, esEspacio: false, clave: resultado.toString(), tipoEntrada: entradaGlobal, equivalentes: [], longitud: resultado.toString().length },
          ],
        },
      ];
    },
    presetsAyuda: {
      guiado: (tokens) => {
        const targets = new Set(['p2_t2', 'p2_t4', 'p3_t2', 'p4_t2']);
        tokens.forEach((t) => { if (targets.has(t.id)) t.esEspacio = true; });
      },
      medio: (tokens) => {
        const targets = new Set(['p3_t2', 'p4_t2']);
        tokens.forEach((t) => { if (targets.has(t.id)) t.esEspacio = true; });
      },
      final: (tokens) => {
        const targets = new Set(['p4_t2']);
        tokens.forEach((t) => { if (targets.has(t.id)) t.esEspacio = true; });
      },
    },
  },
  {
    id: 'potencias_division',
    nombre: 'División de potencias de igual base',
    categoria: 'Potencias y Raíces',
    latexReferencia: 'aᵐ / aⁿ = aᵐ⁻ⁿ',
    enunciadoPlantilla: (d) =>
      `Aplica la propiedad del cociente de potencias de igual base a (${d.a ?? 3})⁵ / (${d.a ?? 3})².`,
    datosDefecto: [
      { clave: 'a', nombre: 'Base a', valor: 3, rango: [2, 5] },
      { clave: 'm', nombre: 'Exponente m (mayor)', valor: 5, rango: [3, 6] },
      { clave: 'n', nombre: 'Exponente n (menor)', valor: 2, rango: [1, 3] },
    ],
    generarPasos: (d, entradaGlobal) => {
      const a = d.a ?? 3;
      const m = d.m ?? 5;
      const n = d.n ?? 2;
      const expResta = m - n;
      const resultado = Math.pow(a, expResta);

      return [
        {
          id: 'p1',
          titulo: 'Propiedad del cociente',
          latexCompleto: 'aᵐ / aⁿ = aᵐ⁻ⁿ',
          tokens: [
            { id: 'p1_t1', texto: 'aᵐ / aⁿ = aᵐ⁻ⁿ', esEstatico: true, esEspacio: false, clave: '', tipoEntrada: entradaGlobal, equivalentes: [], longitud: 15 },
          ],
        },
        {
          id: 'p2',
          titulo: 'Resta de exponentes',
          latexCompleto: `(${a})${aSuperindice(m)} / (${a})${aSuperindice(n)} = (${a})${aSuperindice(`(${m} - ${n})`)}`,
          tokens: [
            { id: 'p2_t1', texto: `(${a})${aSuperindice(m)} / (${a})${aSuperindice(n)} = (${a})⁽`, esEstatico: true, esEspacio: false, clave: '', tipoEntrada: entradaGlobal, equivalentes: [], longitud: 18 },
            { id: 'p2_t2', texto: m.toString(), esEstatico: false, esEspacio: false, clave: m.toString(), tipoEntrada: entradaGlobal, equivalentes: [], longitud: m.toString().length },
            { id: 'p2_t3', texto: ' - ', esEstatico: true, esEspacio: false, clave: '', tipoEntrada: entradaGlobal, equivalentes: [], longitud: 3 },
            { id: 'p2_t4', texto: n.toString(), esEstatico: false, esEspacio: false, clave: n.toString(), tipoEntrada: entradaGlobal, equivalentes: [], longitud: n.toString().length },
            { id: 'p2_t5', texto: '⁾', esEstatico: true, esEspacio: false, clave: '', tipoEntrada: entradaGlobal, equivalentes: [], longitud: 1 },
          ],
        },
        {
          id: 'p3',
          titulo: 'Potencia simplificada',
          latexCompleto: `= (${a})${aSuperindice(expResta)}`,
          tokens: [
            { id: 'p3_t1', texto: `= (${a})`, esEstatico: true, esEspacio: false, clave: '', tipoEntrada: entradaGlobal, equivalentes: [], longitud: 4 },
            { id: 'p3_t2', texto: aSuperindice(expResta), esEstatico: false, esEspacio: false, clave: expResta.toString(), tipoEntrada: entradaGlobal, equivalentes: [aSuperindice(expResta)], longitud: expResta.toString().length },
          ],
        },
        {
          id: 'p4',
          titulo: 'Valor calculado',
          latexCompleto: `= ${resultado}`,
          tokens: [
            { id: 'p4_t1', texto: '= ', esEstatico: true, esEspacio: false, clave: '', tipoEntrada: entradaGlobal, equivalentes: [], longitud: 2 },
            { id: 'p4_t2', texto: resultado.toString(), esEstatico: false, esEspacio: false, clave: resultado.toString(), tipoEntrada: entradaGlobal, equivalentes: [], longitud: resultado.toString().length },
          ],
        },
      ];
    },
    presetsAyuda: {
      guiado: (tokens) => {
        const targets = new Set(['p2_t2', 'p2_t4', 'p3_t2', 'p4_t2']);
        tokens.forEach((t) => { if (targets.has(t.id)) t.esEspacio = true; });
      },
      medio: (tokens) => {
        const targets = new Set(['p3_t2', 'p4_t2']);
        tokens.forEach((t) => { if (targets.has(t.id)) t.esEspacio = true; });
      },
      final: (tokens) => {
        const targets = new Set(['p4_t2']);
        tokens.forEach((t) => { if (targets.has(t.id)) t.esEspacio = true; });
      },
    },
  },
  {
    id: 'potencia_de_potencia',
    nombre: 'Potencia de una potencia',
    categoria: 'Potencias y Raíces',
    latexReferencia: '(aᵐ)ⁿ = aᵐ·ⁿ',
    enunciadoPlantilla: (d) =>
      `Simplifica la potencia de una potencia ((${d.a ?? 2})${aSuperindice(d.m ?? 2)})${aSuperindice(d.n ?? 3)}.`,
    datosDefecto: [
      { clave: 'a', nombre: 'Base a', valor: 2, rango: [2, 5] },
      { clave: 'm', nombre: 'Exponente interno m', valor: 2, rango: [2, 3] },
      { clave: 'n', nombre: 'Exponente externo n', valor: 3, rango: [2, 3] },
    ],
    generarPasos: (d, entradaGlobal) => {
      const a = d.a ?? 2;
      const m = d.m ?? 2;
      const n = d.n ?? 3;
      const expProd = m * n;
      const resultado = Math.pow(a, expProd);

      return [
        {
          id: 'p1',
          titulo: 'Propiedad general',
          latexCompleto: '(aᵐ)ⁿ = aᵐ·ⁿ',
          tokens: [
            { id: 'p1_t1', texto: '(aᵐ)ⁿ = aᵐ·ⁿ', esEstatico: true, esEspacio: false, clave: '', tipoEntrada: entradaGlobal, equivalentes: [], longitud: 15 },
          ],
        },
        {
          id: 'p2',
          titulo: 'Multiplicación de exponentes',
          latexCompleto: `((${a})${aSuperindice(m)})${aSuperindice(n)} = (${a})${aSuperindice(`(${m} · ${n})`)}`,
          tokens: [
            { id: 'p2_t1', texto: `((${a})${aSuperindice(m)})${aSuperindice(n)} = (${a})⁽`, esEstatico: true, esEspacio: false, clave: '', tipoEntrada: entradaGlobal, equivalentes: [], longitud: 16 },
            { id: 'p2_t2', texto: m.toString(), esEstatico: false, esEspacio: false, clave: m.toString(), tipoEntrada: entradaGlobal, equivalentes: [], longitud: m.toString().length },
            { id: 'p2_t3', texto: ' · ', esEstatico: true, esEspacio: false, clave: '', tipoEntrada: entradaGlobal, equivalentes: [], longitud: 3 },
            { id: 'p2_t4', texto: n.toString(), esEstatico: false, esEspacio: false, clave: n.toString(), tipoEntrada: entradaGlobal, equivalentes: [], longitud: n.toString().length },
            { id: 'p2_t5', texto: '⁾', esEstatico: true, esEspacio: false, clave: '', tipoEntrada: entradaGlobal, equivalentes: [], longitud: 1 },
          ],
        },
        {
          id: 'p3',
          titulo: 'Potencia final',
          latexCompleto: `= (${a})${aSuperindice(expProd)}`,
          tokens: [
            { id: 'p3_t1', texto: `= (${a})`, esEstatico: true, esEspacio: false, clave: '', tipoEntrada: entradaGlobal, equivalentes: [], longitud: 4 },
            { id: 'p3_t2', texto: aSuperindice(expProd), esEstatico: false, esEspacio: false, clave: expProd.toString(), tipoEntrada: entradaGlobal, equivalentes: [aSuperindice(expProd)], longitud: expProd.toString().length },
          ],
        },
        {
          id: 'p4',
          titulo: 'Resultado numérico',
          latexCompleto: `= ${resultado}`,
          tokens: [
            { id: 'p4_t1', texto: '= ', esEstatico: true, esEspacio: false, clave: '', tipoEntrada: entradaGlobal, equivalentes: [], longitud: 2 },
            { id: 'p4_t2', texto: resultado.toString(), esEstatico: false, esEspacio: false, clave: resultado.toString(), tipoEntrada: entradaGlobal, equivalentes: [], longitud: resultado.toString().length },
          ],
        },
      ];
    },
    presetsAyuda: {
      guiado: (tokens) => {
        const targets = new Set(['p2_t2', 'p2_t4', 'p3_t2', 'p4_t2']);
        tokens.forEach((t) => { if (targets.has(t.id)) t.esEspacio = true; });
      },
      medio: (tokens) => {
        const targets = new Set(['p3_t2', 'p4_t2']);
        tokens.forEach((t) => { if (targets.has(t.id)) t.esEspacio = true; });
      },
      final: (tokens) => {
        const targets = new Set(['p4_t2']);
        tokens.forEach((t) => { if (targets.has(t.id)) t.esEspacio = true; });
      },
    },
  },
  {
    id: 'exponente_negativo',
    nombre: 'Exponente negativo',
    categoria: 'Potencias y Raíces',
    latexReferencia: 'a⁻ⁿ = 1 / aⁿ',
    enunciadoPlantilla: (d) =>
      `Expresa con exponente positivo y calcula (${d.a ?? 4})${aSuperindice(`-${d.n ?? 2}`)}.`,
    datosDefecto: [
      { clave: 'a', nombre: 'Base a', valor: 4, rango: [2, 6] },
      { clave: 'n', nombre: 'Exponente n', valor: 2, rango: [1, 4] },
    ],
    generarPasos: (d, entradaGlobal) => {
      const a = d.a ?? 4;
      const n = d.n ?? 2;
      const an = Math.pow(a, n);
      const dec = Math.round((1 / an) * 10000) / 10000;

      return [
        {
          id: 'p1',
          titulo: 'Definición de exponente negativo',
          latexCompleto: 'a⁻ⁿ = 1 / aⁿ',
          tokens: [
            { id: 'p1_t1', texto: 'a⁻ⁿ = 1 / aⁿ', esEstatico: true, esEspacio: false, clave: '', tipoEntrada: entradaGlobal, equivalentes: [], longitud: 15 },
          ],
        },
        {
          id: 'p2',
          titulo: 'Sustitución en el denominador',
          latexCompleto: `(${a})${aSuperindice(`-${n}`)} = 1 / (${a})${aSuperindice(n)}`,
          tokens: [
            { id: 'p2_t1', texto: `(${a})${aSuperindice(`-${n}`)} = 1 / (`, esEstatico: true, esEspacio: false, clave: '', tipoEntrada: entradaGlobal, equivalentes: [], longitud: 12 },
            { id: 'p2_t2', texto: a.toString(), esEstatico: false, esEspacio: false, clave: a.toString(), tipoEntrada: entradaGlobal, equivalentes: [], longitud: a.toString().length },
            { id: 'p2_t3', texto: `)${aSuperindice(n)}`, esEstatico: true, esEspacio: false, clave: '', tipoEntrada: entradaGlobal, equivalentes: [], longitud: 4 },
          ],
        },
        {
          id: 'p3',
          titulo: 'Fracción resuelta',
          latexCompleto: `= 1 / ${an}`,
          tokens: [
            { id: 'p3_t1', texto: '= 1 / ', esEstatico: true, esEspacio: false, clave: '', tipoEntrada: entradaGlobal, equivalentes: [], longitud: 6 },
            { id: 'p3_t2', texto: an.toString(), esEstatico: false, esEspacio: false, clave: an.toString(), tipoEntrada: entradaGlobal, equivalentes: [], longitud: an.toString().length },
          ],
        },
        {
          id: 'p4',
          titulo: 'Forma decimal aproximada',
          latexCompleto: `≈ ${dec}`,
          tokens: [
            { id: 'p4_t1', texto: '≈ ', esEstatico: true, esEspacio: false, clave: '', tipoEntrada: entradaGlobal, equivalentes: [], longitud: 2 },
            { id: 'p4_t2', texto: dec.toString(), esEstatico: false, esEspacio: false, clave: dec.toString(), tipoEntrada: entradaGlobal, equivalentes: [`1/${an}`], longitud: dec.toString().length },
          ],
        },
      ];
    },
    presetsAyuda: {
      guiado: (tokens) => {
        const targets = new Set(['p2_t2', 'p3_t2', 'p4_t2']);
        tokens.forEach((t) => { if (targets.has(t.id)) t.esEspacio = true; });
      },
      medio: (tokens) => {
        const targets = new Set(['p3_t2', 'p4_t2']);
        tokens.forEach((t) => { if (targets.has(t.id)) t.esEspacio = true; });
      },
      final: (tokens) => {
        const targets = new Set(['p3_t2']);
        tokens.forEach((t) => { if (targets.has(t.id)) t.esEspacio = true; });
      },
    },
  },
  {
    id: 'exponente_fraccionario',
    nombre: 'Exponente fraccionario (raíz)',
    categoria: 'Potencias y Raíces',
    latexReferencia: 'aᵐᐟⁿ = ⁿ√(aᵐ)',
    enunciadoPlantilla: (d) =>
      `Convierte a radical y simplifica (${d.a ?? 8})${aSuperindice(`(${d.m ?? 2}/${d.n ?? 3})`)}.`,
    datosDefecto: [
      { clave: 'a', nombre: 'Base a', valor: 8, rango: [4, 27] },
      { clave: 'm', nombre: 'Numerador m', valor: 2, rango: [1, 4] },
      { clave: 'n', nombre: 'Índice de la raíz n', valor: 3, rango: [2, 3] },
    ],
    generarPasos: (d, entradaGlobal) => {
      const a = d.a ?? 8;
      const m = d.m ?? 2;
      const n = d.n ?? 3;
      const potenciaInt = Math.pow(a, m);
      const resRaiz = Math.round(Math.pow(potenciaInt, 1 / n) * 100) / 100;
      const simboloRaiz = n === 3 ? '∛' : '√';

      return [
        {
          id: 'p1',
          titulo: 'Definición de exponente fraccionario',
          latexCompleto: 'aᵐᐟⁿ = ⁿ√(aᵐ)',
          tokens: [
            { id: 'p1_t1', texto: 'aᵐᐟⁿ = ⁿ√(aᵐ)', esEstatico: true, esEspacio: false, clave: '', tipoEntrada: entradaGlobal, equivalentes: [], longitud: 18 },
          ],
        },
        {
          id: 'p2',
          titulo: 'Conversión a radical',
          latexCompleto: `(${a})${aSuperindice(`(${m}/${n})`)} = ${simboloRaiz}((${a})${aSuperindice(m)})`,
          tokens: [
            { id: 'p2_t1', texto: `(${a})${aSuperindice(`(${m}/${n})`)} = ${simboloRaiz}( (`, esEstatico: true, esEspacio: false, clave: '', tipoEntrada: entradaGlobal, equivalentes: [], longitud: 16 },
            { id: 'p2_t2', texto: a.toString(), esEstatico: false, esEspacio: false, clave: a.toString(), tipoEntrada: entradaGlobal, equivalentes: [], longitud: a.toString().length },
            { id: 'p2_t3', texto: `)${aSuperindice(m)} )`, esEstatico: true, esEspacio: false, clave: '', tipoEntrada: entradaGlobal, equivalentes: [], longitud: 4 },
          ],
        },
        {
          id: 'p3',
          titulo: 'Potencia del radicando',
          latexCompleto: `= ${simboloRaiz}(${potenciaInt})`,
          tokens: [
            { id: 'p3_t1', texto: `= ${simboloRaiz}(`, esEstatico: true, esEspacio: false, clave: '', tipoEntrada: entradaGlobal, equivalentes: [], longitud: 6 },
            { id: 'p3_t2', texto: potenciaInt.toString(), esEstatico: false, esEspacio: false, clave: potenciaInt.toString(), tipoEntrada: entradaGlobal, equivalentes: [], longitud: potenciaInt.toString().length },
            { id: 'p3_t3', texto: ')', esEstatico: true, esEspacio: false, clave: '', tipoEntrada: entradaGlobal, equivalentes: [], longitud: 1 },
          ],
        },
        {
          id: 'p4',
          titulo: 'Resultado final',
          latexCompleto: `= ${resRaiz}`,
          tokens: [
            { id: 'p4_t1', texto: '= ', esEstatico: true, esEspacio: false, clave: '', tipoEntrada: entradaGlobal, equivalentes: [], longitud: 2 },
            { id: 'p4_t2', texto: resRaiz.toString(), esEstatico: false, esEspacio: false, clave: resRaiz.toString(), tipoEntrada: entradaGlobal, equivalentes: [], longitud: resRaiz.toString().length },
          ],
        },
      ];
    },
    presetsAyuda: {
      guiado: (tokens) => {
        const targets = new Set(['p2_t2', 'p2_t4', 'p3_t2', 'p4_t2']);
        tokens.forEach((t) => { if (targets.has(t.id)) t.esEspacio = true; });
      },
      medio: (tokens) => {
        const targets = new Set(['p3_t2', 'p4_t2']);
        tokens.forEach((t) => { if (targets.has(t.id)) t.esEspacio = true; });
      },
      final: (tokens) => {
        const targets = new Set(['p4_t2']);
        tokens.forEach((t) => { if (targets.has(t.id)) t.esEspacio = true; });
      },
    },
  },

  /* ══════════════════════════════════════════════════════════════════════════
     3. ECUACIÓN CUADRÁTICA Y DISCRIMINANTE
     ══════════════════════════════════════════════════════════════════════════ */
  {
    id: 'discriminante',
    nombre: 'Discriminante de la cuadrática',
    categoria: 'Ecuaciones Cuadráticas',
    latexReferencia: 'Δ = b² - 4ac',
    enunciadoPlantilla: (d) =>
      `Calcula el discriminante (Δ) de la ecuación ${d.a ?? 1}x² + (${d.b ?? 5})x + (${d.c ?? 6}) = 0 para determinar el número de soluciones reales.`,
    datosDefecto: [
      { clave: 'a', nombre: 'Coeficiente a', valor: 1, rango: [1, 4] },
      { clave: 'b', nombre: 'Coeficiente b', valor: 5, rango: [1, 9] },
      { clave: 'c', nombre: 'Término c', valor: 6, rango: [1, 10] },
    ],
    generarPasos: (d, entradaGlobal) => {
      const a = d.a ?? 1;
      const b = d.b ?? 5;
      const c = d.c ?? 6;
      const b2 = b * b;
      const ac4 = 4 * a * c;
      const delta = b2 - ac4;
      const tipo = delta > 0 ? '2 soluciones reales' : delta === 0 ? '1 solución real' : 'Sin soluciones reales';

      return [
        {
          id: 'p1',
          titulo: 'Fórmula del discriminante',
          latexCompleto: 'Δ = b² - 4ac',
          tokens: [
            { id: 'p1_t1', texto: 'Δ = b² - 4ac', esEstatico: true, esEspacio: false, clave: '', tipoEntrada: entradaGlobal, equivalentes: [], longitud: 12 },
          ],
        },
        {
          id: 'p2',
          titulo: 'Sustitución de coeficientes',
          latexCompleto: `Δ = (${b})² - 4(${a})(${c})`,
          tokens: [
            { id: 'p2_t1', texto: 'Δ = (', esEstatico: true, esEspacio: false, clave: '', tipoEntrada: entradaGlobal, equivalentes: [], longitud: 5 },
            { id: 'p2_t2', texto: b.toString(), esEstatico: false, esEspacio: false, clave: b.toString(), tipoEntrada: entradaGlobal, equivalentes: [], longitud: b.toString().length },
            { id: 'p2_t3', texto: ')² - 4(', esEstatico: true, esEspacio: false, clave: '', tipoEntrada: entradaGlobal, equivalentes: [], longitud: 7 },
            { id: 'p2_t4', texto: a.toString(), esEstatico: false, esEspacio: false, clave: a.toString(), tipoEntrada: entradaGlobal, equivalentes: [], longitud: a.toString().length },
            { id: 'p2_t5', texto: ')(', esEstatico: true, esEspacio: false, clave: '', tipoEntrada: entradaGlobal, equivalentes: [], longitud: 2 },
            { id: 'p2_t6', texto: c.toString(), esEstatico: false, esEspacio: false, clave: c.toString(), tipoEntrada: entradaGlobal, equivalentes: [], longitud: c.toString().length },
            { id: 'p2_t7', texto: ')', esEstatico: true, esEspacio: false, clave: '', tipoEntrada: entradaGlobal, equivalentes: [], longitud: 1 },
          ],
        },
        {
          id: 'p3',
          titulo: 'Cálculo de potencias y productos',
          latexCompleto: `Δ = ${b2} - ${ac4}`,
          tokens: [
            { id: 'p3_t1', texto: 'Δ = ', esEstatico: true, esEspacio: false, clave: '', tipoEntrada: entradaGlobal, equivalentes: [], longitud: 4 },
            { id: 'p3_t2', texto: b2.toString(), esEstatico: false, esEspacio: false, clave: b2.toString(), tipoEntrada: entradaGlobal, equivalentes: [], longitud: b2.toString().length },
            { id: 'p3_t3', texto: ' - ', esEstatico: true, esEspacio: false, clave: '', tipoEntrada: entradaGlobal, equivalentes: [], longitud: 3 },
            { id: 'p3_t4', texto: ac4.toString(), esEstatico: false, esEspacio: false, clave: ac4.toString(), tipoEntrada: entradaGlobal, equivalentes: [], longitud: ac4.toString().length },
          ],
        },
        {
          id: 'p4',
          titulo: 'Valor del discriminante e interpretación',
          latexCompleto: `Δ = ${delta} (${tipo})`,
          tokens: [
            { id: 'p4_t1', texto: 'Δ = ', esEstatico: true, esEspacio: false, clave: '', tipoEntrada: entradaGlobal, equivalentes: [], longitud: 4 },
            { id: 'p4_t2', texto: delta.toString(), esEstatico: false, esEspacio: false, clave: delta.toString(), tipoEntrada: entradaGlobal, equivalentes: [], longitud: delta.toString().length },
            { id: 'p4_t3', texto: ` (${tipo})`, esEstatico: true, esEspacio: false, clave: '', tipoEntrada: entradaGlobal, equivalentes: [], longitud: 22 },
          ],
        },
      ];
    },
    presetsAyuda: {
      guiado: (tokens) => {
        const targets = new Set(['p2_t2', 'p2_t4', 'p2_t6', 'p3_t2', 'p3_t4', 'p4_t2']);
        tokens.forEach((t) => { if (targets.has(t.id)) t.esEspacio = true; });
      },
      medio: (tokens) => {
        const targets = new Set(['p3_t2', 'p3_t4', 'p4_t2']);
        tokens.forEach((t) => { if (targets.has(t.id)) t.esEspacio = true; });
      },
      final: (tokens) => {
        const targets = new Set(['p4_t2']);
        tokens.forEach((t) => { if (targets.has(t.id)) t.esEspacio = true; });
      },
    },
  },
  {
    id: 'ecuacion_cuadratica',
    nombre: 'Fórmula general cuadrática',
    categoria: 'Ecuaciones Cuadráticas',
    latexReferencia: 'x = (-b ± √(b² - 4ac)) / (2a)',
    enunciadoPlantilla: (d) =>
      `Halla las raíces de la ecuación ${d.a ?? 1}x² + (${d.b ?? -5})x + (${d.c ?? 6}) = 0 usando la fórmula general.`,
    datosDefecto: [
      { clave: 'a', nombre: 'Coeficiente a', valor: 1, rango: [1, 2] },
      { clave: 'b', nombre: 'Coeficiente b', valor: -5, rango: [-7, -3] },
      { clave: 'c', nombre: 'Término c', valor: 6, rango: [2, 10] },
    ],
    generarPasos: (d, entradaGlobal) => {
      const a = d.a ?? 1;
      const b = d.b ?? -5;
      const c = d.c ?? 6;
      const menosB = -b;
      const delta = b * b - 4 * a * c;
      const raizDelta = Math.round(Math.sqrt(Math.max(0, delta)) * 100) / 100;
      const denom = 2 * a;
      const x1 = Math.round(((menosB + raizDelta) / denom) * 100) / 100;
      const x2 = Math.round(((menosB - raizDelta) / denom) * 100) / 100;

      return [
        {
          id: 'p1',
          titulo: 'Fórmula general',
          latexCompleto: 'x = (-b ± √(b² - 4ac)) / (2a)',
          tokens: [
            { id: 'p1_t1', texto: 'x = (-b ± √(b² - 4ac)) / (2a)', esEstatico: true, esEspacio: false, clave: '', tipoEntrada: entradaGlobal, equivalentes: [], longitud: 28 },
          ],
        },
        {
          id: 'p2',
          titulo: 'Sustitución de coeficientes',
          latexCompleto: `x = (-(${b}) ± √(((${b})² - 4(${a})(${c})))) / (2(${a}))`,
          tokens: [
            { id: 'p2_t1', texto: 'x = (- (', esEstatico: true, esEspacio: false, clave: '', tipoEntrada: entradaGlobal, equivalentes: [], longitud: 8 },
            { id: 'p2_t2', texto: b.toString(), esEstatico: false, esEspacio: false, clave: b.toString(), tipoEntrada: entradaGlobal, equivalentes: [], longitud: b.toString().length },
            { id: 'p2_t3', texto: ') ± √((', esEstatico: true, esEspacio: false, clave: '', tipoEntrada: entradaGlobal, equivalentes: [], longitud: 8 },
            { id: 'p2_t4', texto: b.toString(), esEstatico: false, esEspacio: false, clave: b.toString(), tipoEntrada: entradaGlobal, equivalentes: [], longitud: b.toString().length },
            { id: 'p2_t5', texto: `)² - 4(${a})(${c}))) / (2(`, esEstatico: true, esEspacio: false, clave: '', tipoEntrada: entradaGlobal, equivalentes: [], longitud: 18 },
            { id: 'p2_t6', texto: a.toString(), esEstatico: false, esEspacio: false, clave: a.toString(), tipoEntrada: entradaGlobal, equivalentes: [], longitud: a.toString().length },
            { id: 'p2_t7', texto: '))', esEstatico: true, esEspacio: false, clave: '', tipoEntrada: entradaGlobal, equivalentes: [], longitud: 2 },
          ],
        },
        {
          id: 'p3',
          titulo: 'Radicando y denominador',
          latexCompleto: `x = (${menosB} ± √${delta}) / ${denom}`,
          tokens: [
            { id: 'p3_t1', texto: 'x = (', esEstatico: true, esEspacio: false, clave: '', tipoEntrada: entradaGlobal, equivalentes: [], longitud: 5 },
            { id: 'p3_t2', texto: menosB.toString(), esEstatico: false, esEspacio: false, clave: menosB.toString(), tipoEntrada: entradaGlobal, equivalentes: [], longitud: menosB.toString().length },
            { id: 'p3_t3', texto: ' ± √', esEstatico: true, esEspacio: false, clave: '', tipoEntrada: entradaGlobal, equivalentes: [], longitud: 4 },
            { id: 'p3_t4', texto: delta.toString(), esEstatico: false, esEspacio: false, clave: delta.toString(), tipoEntrada: entradaGlobal, equivalentes: [], longitud: delta.toString().length },
            { id: 'p3_t5', texto: ') / ', esEstatico: true, esEspacio: false, clave: '', tipoEntrada: entradaGlobal, equivalentes: [], longitud: 4 },
            { id: 'p3_t6', texto: denom.toString(), esEstatico: false, esEspacio: false, clave: denom.toString(), tipoEntrada: entradaGlobal, equivalentes: [], longitud: denom.toString().length },
          ],
        },
        {
          id: 'p4',
          titulo: 'Extracción de raíz',
          latexCompleto: `x = (${menosB} ± ${raizDelta}) / ${denom}`,
          tokens: [
            { id: 'p4_t1', texto: `x = (${menosB} ± `, esEstatico: true, esEspacio: false, clave: '', tipoEntrada: entradaGlobal, equivalentes: [], longitud: 10 },
            { id: 'p4_t2', texto: raizDelta.toString(), esEstatico: false, esEspacio: false, clave: raizDelta.toString(), tipoEntrada: entradaGlobal, equivalentes: [], longitud: raizDelta.toString().length },
            { id: 'p4_t3', texto: `) / ${denom}`, esEstatico: true, esEspacio: false, clave: '', tipoEntrada: entradaGlobal, equivalentes: [], longitud: 6 },
          ],
        },
        {
          id: 'p5',
          titulo: 'Soluciones reales x₁ y x₂',
          latexCompleto: `x₁ = ${x1},   x₂ = ${x2}`,
          tokens: [
            { id: 'p5_t1', texto: 'x₁ = ', esEstatico: true, esEspacio: false, clave: '', tipoEntrada: entradaGlobal, equivalentes: [], longitud: 5 },
            { id: 'p5_t2', texto: x1.toString(), esEstatico: false, esEspacio: false, clave: x1.toString(), tipoEntrada: entradaGlobal, equivalentes: [], longitud: x1.toString().length },
            { id: 'p5_t3', texto: ' ,   x₂ = ', esEstatico: true, esEspacio: false, clave: '', tipoEntrada: entradaGlobal, equivalentes: [], longitud: 9 },
            { id: 'p5_t4', texto: x2.toString(), esEstatico: false, esEspacio: false, clave: x2.toString(), tipoEntrada: entradaGlobal, equivalentes: [], longitud: x2.toString().length },
          ],
        },
      ];
    },
    presetsAyuda: {
      guiado: (tokens) => {
        const targets = new Set(['p2_t2', 'p3_t2', 'p3_t4', 'p4_t2', 'p5_t2', 'p5_t4']);
        tokens.forEach((t) => { if (targets.has(t.id)) t.esEspacio = true; });
      },
      medio: (tokens) => {
        const targets = new Set(['p4_t2', 'p5_t2', 'p5_t4']);
        tokens.forEach((t) => { if (targets.has(t.id)) t.esEspacio = true; });
      },
      final: (tokens) => {
        const targets = new Set(['p5_t2', 'p5_t4']);
        tokens.forEach((t) => { if (targets.has(t.id)) t.esEspacio = true; });
      },
    },
  },

  /* ══════════════════════════════════════════════════════════════════════════
     4. PROPIEDADES DE LOS LOGARITMOS
     ══════════════════════════════════════════════════════════════════════════ */
  {
    id: 'log_producto',
    nombre: 'Logaritmo de un producto',
    categoria: 'Logaritmos',
    latexReferencia: 'log_b(x · y) = log_b(x) + log_b(y)',
    enunciadoPlantilla: (d) =>
      `Aplica la propiedad del producto de logaritmos a log_{${d.b ?? 2}}(${d.x ?? 4} · ${d.y ?? 8}).`,
    datosDefecto: [
      { clave: 'b', nombre: 'Base b', valor: 2, rango: [2, 5] },
      { clave: 'x', nombre: 'Factor x', valor: 4, rango: [2, 16] },
      { clave: 'y', nombre: 'Factor y', valor: 8, rango: [2, 16] },
    ],
    generarPasos: (d, entradaGlobal) => {
      const b = d.b ?? 2;
      const x = d.x ?? 4;
      const y = d.y ?? 8;
      const logX = Math.round((Math.log(x) / Math.log(b)) * 100) / 100;
      const logY = Math.round((Math.log(y) / Math.log(b)) * 100) / 100;
      const res = Math.round((logX + logY) * 100) / 100;

      return [
        {
          id: 'p1',
          titulo: 'Propiedad del producto',
          latexCompleto: 'log_b(x · y) = log_b(x) + log_b(y)',
          tokens: [
            { id: 'p1_t1', texto: 'log_b(x · y) = log_b(x) + log_b(y)', esEstatico: true, esEspacio: false, clave: '', tipoEntrada: entradaGlobal, equivalentes: [], longitud: 30 },
          ],
        },
        {
          id: 'p2',
          titulo: 'Separación en suma',
          latexCompleto: `log_${b}(${x} · ${y}) = log_${b}(${x}) + log_${b}(${y})`,
          tokens: [
            { id: 'p2_t1', texto: `log_${b}(${x} · ${y}) = log_${b}(`, esEstatico: true, esEspacio: false, clave: '', tipoEntrada: entradaGlobal, equivalentes: [], longitud: 18 },
            { id: 'p2_t2', texto: x.toString(), esEstatico: false, esEspacio: false, clave: x.toString(), tipoEntrada: entradaGlobal, equivalentes: [], longitud: x.toString().length },
            { id: 'p2_t3', texto: `) + log_${b}(`, esEstatico: true, esEspacio: false, clave: '', tipoEntrada: entradaGlobal, equivalentes: [], longitud: 10 },
            { id: 'p2_t4', texto: y.toString(), esEstatico: false, esEspacio: false, clave: y.toString(), tipoEntrada: entradaGlobal, equivalentes: [], longitud: y.toString().length },
            { id: 'p2_t5', texto: ')', esEstatico: true, esEspacio: false, clave: '', tipoEntrada: entradaGlobal, equivalentes: [], longitud: 1 },
          ],
        },
        {
          id: 'p3',
          titulo: 'Evaluación de logaritmos',
          latexCompleto: `= ${logX} + ${logY}`,
          tokens: [
            { id: 'p3_t1', texto: '= ', esEstatico: true, esEspacio: false, clave: '', tipoEntrada: entradaGlobal, equivalentes: [], longitud: 2 },
            { id: 'p3_t2', texto: logX.toString(), esEstatico: false, esEspacio: false, clave: logX.toString(), tipoEntrada: entradaGlobal, equivalentes: [], longitud: logX.toString().length },
            { id: 'p3_t3', texto: ' + ', esEstatico: true, esEspacio: false, clave: '', tipoEntrada: entradaGlobal, equivalentes: [], longitud: 3 },
            { id: 'p3_t4', texto: logY.toString(), esEstatico: false, esEspacio: false, clave: logY.toString(), tipoEntrada: entradaGlobal, equivalentes: [], longitud: logY.toString().length },
          ],
        },
        {
          id: 'p4',
          titulo: 'Resultado final',
          latexCompleto: `= ${res}`,
          tokens: [
            { id: 'p4_t1', texto: '= ', esEstatico: true, esEspacio: false, clave: '', tipoEntrada: entradaGlobal, equivalentes: [], longitud: 2 },
            { id: 'p4_t2', texto: res.toString(), esEstatico: false, esEspacio: false, clave: res.toString(), tipoEntrada: entradaGlobal, equivalentes: [], longitud: res.toString().length },
          ],
        },
      ];
    },
    presetsAyuda: {
      guiado: (tokens) => {
        const targets = new Set(['p2_t2', 'p2_t4', 'p3_t2', 'p3_t4', 'p4_t2']);
        tokens.forEach((t) => { if (targets.has(t.id)) t.esEspacio = true; });
      },
      medio: (tokens) => {
        const targets = new Set(['p3_t2', 'p3_t4', 'p4_t2']);
        tokens.forEach((t) => { if (targets.has(t.id)) t.esEspacio = true; });
      },
      final: (tokens) => {
        const targets = new Set(['p4_t2']);
        tokens.forEach((t) => { if (targets.has(t.id)) t.esEspacio = true; });
      },
    },
  },
  {
    id: 'log_cociente',
    nombre: 'Logaritmo de un cociente',
    categoria: 'Logaritmos',
    latexReferencia: 'log_b(x / y) = log_b(x) - log_b(y)',
    enunciadoPlantilla: (d) =>
      `Aplica la propiedad del cociente de logaritmos a log_{${d.b ?? 3}}(${d.x ?? 81} / ${d.y ?? 9}).`,
    datosDefecto: [
      { clave: 'b', nombre: 'Base b', valor: 3, rango: [2, 5] },
      { clave: 'x', nombre: 'Numerador x', valor: 81, rango: [8, 81] },
      { clave: 'y', nombre: 'Denominador y', valor: 9, rango: [2, 9] },
    ],
    generarPasos: (d, entradaGlobal) => {
      const b = d.b ?? 3;
      const x = d.x ?? 81;
      const y = d.y ?? 9;
      const logX = Math.round((Math.log(x) / Math.log(b)) * 100) / 100;
      const logY = Math.round((Math.log(y) / Math.log(b)) * 100) / 100;
      const res = Math.round((logX - logY) * 100) / 100;

      return [
        {
          id: 'p1',
          titulo: 'Propiedad del cociente',
          latexCompleto: 'log_b(x / y) = log_b(x) - log_b(y)',
          tokens: [
            { id: 'p1_t1', texto: 'log_b(x / y) = log_b(x) - log_b(y)', esEstatico: true, esEspacio: false, clave: '', tipoEntrada: entradaGlobal, equivalentes: [], longitud: 30 },
          ],
        },
        {
          id: 'p2',
          titulo: 'Separación en resta',
          latexCompleto: `log_${b}(${x} / ${y}) = log_${b}(${x}) - log_${b}(${y})`,
          tokens: [
            { id: 'p2_t1', texto: `log_${b}(${x} / ${y}) = log_${b}(`, esEstatico: true, esEspacio: false, clave: '', tipoEntrada: entradaGlobal, equivalentes: [], longitud: 18 },
            { id: 'p2_t2', texto: x.toString(), esEstatico: false, esEspacio: false, clave: x.toString(), tipoEntrada: entradaGlobal, equivalentes: [], longitud: x.toString().length },
            { id: 'p2_t3', texto: `) - log_${b}(`, esEstatico: true, esEspacio: false, clave: '', tipoEntrada: entradaGlobal, equivalentes: [], longitud: 10 },
            { id: 'p2_t4', texto: y.toString(), esEstatico: false, esEspacio: false, clave: y.toString(), tipoEntrada: entradaGlobal, equivalentes: [], longitud: y.toString().length },
            { id: 'p2_t5', texto: ')', esEstatico: true, esEspacio: false, clave: '', tipoEntrada: entradaGlobal, equivalentes: [], longitud: 1 },
          ],
        },
        {
          id: 'p3',
          titulo: 'Evaluación individual',
          latexCompleto: `= ${logX} - ${logY}`,
          tokens: [
            { id: 'p3_t1', texto: '= ', esEstatico: true, esEspacio: false, clave: '', tipoEntrada: entradaGlobal, equivalentes: [], longitud: 2 },
            { id: 'p3_t2', texto: logX.toString(), esEstatico: false, esEspacio: false, clave: logX.toString(), tipoEntrada: entradaGlobal, equivalentes: [], longitud: logX.toString().length },
            { id: 'p3_t3', texto: ' - ', esEstatico: true, esEspacio: false, clave: '', tipoEntrada: entradaGlobal, equivalentes: [], longitud: 3 },
            { id: 'p3_t4', texto: logY.toString(), esEstatico: false, esEspacio: false, clave: logY.toString(), tipoEntrada: entradaGlobal, equivalentes: [], longitud: logY.toString().length },
          ],
        },
        {
          id: 'p4',
          titulo: 'Resultado final',
          latexCompleto: `= ${res}`,
          tokens: [
            { id: 'p4_t1', texto: '= ', esEstatico: true, esEspacio: false, clave: '', tipoEntrada: entradaGlobal, equivalentes: [], longitud: 2 },
            { id: 'p4_t2', texto: res.toString(), esEstatico: false, esEspacio: false, clave: res.toString(), tipoEntrada: entradaGlobal, equivalentes: [], longitud: res.toString().length },
          ],
        },
      ];
    },
    presetsAyuda: {
      guiado: (tokens) => {
        const targets = new Set(['p2_t2', 'p2_t4', 'p3_t2', 'p3_t4', 'p4_t2']);
        tokens.forEach((t) => { if (targets.has(t.id)) t.esEspacio = true; });
      },
      medio: (tokens) => {
        const targets = new Set(['p3_t2', 'p3_t4', 'p4_t2']);
        tokens.forEach((t) => { if (targets.has(t.id)) t.esEspacio = true; });
      },
      final: (tokens) => {
        const targets = new Set(['p4_t2']);
        tokens.forEach((t) => { if (targets.has(t.id)) t.esEspacio = true; });
      },
    },
  },
  {
    id: 'log_potencia',
    nombre: 'Logaritmo de una potencia',
    categoria: 'Logaritmos',
    latexReferencia: 'log_b(xⁿ) = n · log_b(x)',
    enunciadoPlantilla: (d) =>
      `Aplica la propiedad de la potencia en logaritmos a log_{${d.b ?? 2}}((${d.x ?? 8})³).`,
    datosDefecto: [
      { clave: 'b', nombre: 'Base b', valor: 2, rango: [2, 5] },
      { clave: 'x', nombre: 'Argumento x', valor: 8, rango: [2, 16] },
      { clave: 'n', nombre: 'Exponente n', valor: 3, rango: [2, 5] },
    ],
    generarPasos: (d, entradaGlobal) => {
      const b = d.b ?? 2;
      const x = d.x ?? 8;
      const n = d.n ?? 3;
      const logX = Math.round((Math.log(x) / Math.log(b)) * 100) / 100;
      const res = Math.round(n * logX * 100) / 100;

      return [
        {
          id: 'p1',
          titulo: 'Propiedad de la potencia',
          latexCompleto: 'log_b(xⁿ) = n · log_b(x)',
          tokens: [
            { id: 'p1_t1', texto: 'log_b(xⁿ) = n · log_b(x)', esEstatico: true, esEspacio: false, clave: '', tipoEntrada: entradaGlobal, equivalentes: [], longitud: 24 },
          ],
        },
        {
          id: 'p2',
          titulo: 'Bajada del exponente',
          latexCompleto: `log_${b}((${x})^${n}) = ${n} · log_${b}(${x})`,
          tokens: [
            { id: 'p2_t1', texto: `log_${b}((${x})^${n}) = `, esEstatico: true, esEspacio: false, clave: '', tipoEntrada: entradaGlobal, equivalentes: [], longitud: 16 },
            { id: 'p2_t2', texto: n.toString(), esEstatico: false, esEspacio: false, clave: n.toString(), tipoEntrada: entradaGlobal, equivalentes: [], longitud: n.toString().length },
            { id: 'p2_t3', texto: ` · log_${b}(`, esEstatico: true, esEspacio: false, clave: '', tipoEntrada: entradaGlobal, equivalentes: [], longitud: 10 },
            { id: 'p2_t4', texto: x.toString(), esEstatico: false, esEspacio: false, clave: x.toString(), tipoEntrada: entradaGlobal, equivalentes: [], longitud: x.toString().length },
            { id: 'p2_t5', texto: ')', esEstatico: true, esEspacio: false, clave: '', tipoEntrada: entradaGlobal, equivalentes: [], longitud: 1 },
          ],
        },
        {
          id: 'p3',
          titulo: 'Cálculo del logaritmo',
          latexCompleto: `= ${n} · ${logX}`,
          tokens: [
            { id: 'p3_t1', texto: `= ${n} · `, esEstatico: true, esEspacio: false, clave: '', tipoEntrada: entradaGlobal, equivalentes: [], longitud: 8 },
            { id: 'p3_t2', texto: logX.toString(), esEstatico: false, esEspacio: false, clave: logX.toString(), tipoEntrada: entradaGlobal, equivalentes: [], longitud: logX.toString().length },
          ],
        },
        {
          id: 'p4',
          titulo: 'Resultado final',
          latexCompleto: `= ${res}`,
          tokens: [
            { id: 'p4_t1', texto: '= ', esEstatico: true, esEspacio: false, clave: '', tipoEntrada: entradaGlobal, equivalentes: [], longitud: 2 },
            { id: 'p4_t2', texto: res.toString(), esEstatico: false, esEspacio: false, clave: res.toString(), tipoEntrada: entradaGlobal, equivalentes: [], longitud: res.toString().length },
          ],
        },
      ];
    },
    presetsAyuda: {
      guiado: (tokens) => {
        const targets = new Set(['p2_t2', 'p2_t4', 'p3_t2', 'p4_t2']);
        tokens.forEach((t) => { if (targets.has(t.id)) t.esEspacio = true; });
      },
      medio: (tokens) => {
        const targets = new Set(['p3_t2', 'p4_t2']);
        tokens.forEach((t) => { if (targets.has(t.id)) t.esEspacio = true; });
      },
      final: (tokens) => {
        const targets = new Set(['p4_t2']);
        tokens.forEach((t) => { if (targets.has(t.id)) t.esEspacio = true; });
      },
    },
  },
  {
    id: 'log_cambio_base',
    nombre: 'Cambio de base en logaritmos',
    categoria: 'Logaritmos',
    latexReferencia: 'log_b(x) = log_c(x) / log_c(b)',
    enunciadoPlantilla: (d) =>
      `Calcula log_{${d.b ?? 4}}(${d.x ?? 64}) realizando un cambio a base ${d.c ?? 2}.`,
    datosDefecto: [
      { clave: 'b', nombre: 'Base original b', valor: 4, rango: [3, 9] },
      { clave: 'x', nombre: 'Argumento x', valor: 64, rango: [8, 128] },
      { clave: 'c', nombre: 'Nueva base c', valor: 2, rango: [2, 10] },
    ],
    generarPasos: (d, entradaGlobal) => {
      const b = d.b ?? 4;
      const x = d.x ?? 64;
      const c = d.c ?? 2;
      const logX = Math.round((Math.log(x) / Math.log(c)) * 100) / 100;
      const logB = Math.round((Math.log(b) / Math.log(c)) * 100) / 100;
      const res = Math.round((logX / logB) * 100) / 100;

      return [
        {
          id: 'p1',
          titulo: 'Fórmula de cambio de base',
          latexCompleto: 'log_b(x) = log_c(x) / log_c(b)',
          tokens: [
            { id: 'p1_t1', texto: 'log_b(x) = log_c(x) / log_c(b)', esEstatico: true, esEspacio: false, clave: '', tipoEntrada: entradaGlobal, equivalentes: [], longitud: 28 },
          ],
        },
        {
          id: 'p2',
          titulo: 'Sustitución en la nueva base',
          latexCompleto: `log_${b}(${x}) = log_${c}(${x}) / log_${c}(${b})`,
          tokens: [
            { id: 'p2_t1', texto: `log_${b}(${x}) = log_${c}(`, esEstatico: true, esEspacio: false, clave: '', tipoEntrada: entradaGlobal, equivalentes: [], longitud: 16 },
            { id: 'p2_t2', texto: x.toString(), esEstatico: false, esEspacio: false, clave: x.toString(), tipoEntrada: entradaGlobal, equivalentes: [], longitud: x.toString().length },
            { id: 'p2_t3', texto: `) / log_${c}(`, esEstatico: true, esEspacio: false, clave: '', tipoEntrada: entradaGlobal, equivalentes: [], longitud: 12 },
            { id: 'p2_t4', texto: b.toString(), esEstatico: false, esEspacio: false, clave: b.toString(), tipoEntrada: entradaGlobal, equivalentes: [], longitud: b.toString().length },
            { id: 'p2_t5', texto: ')', esEstatico: true, esEspacio: false, clave: '', tipoEntrada: entradaGlobal, equivalentes: [], longitud: 1 },
          ],
        },
        {
          id: 'p3',
          titulo: 'Evaluación de logaritmos',
          latexCompleto: `= ${logX} / ${logB}`,
          tokens: [
            { id: 'p3_t1', texto: '= ', esEstatico: true, esEspacio: false, clave: '', tipoEntrada: entradaGlobal, equivalentes: [], longitud: 2 },
            { id: 'p3_t2', texto: logX.toString(), esEstatico: false, esEspacio: false, clave: logX.toString(), tipoEntrada: entradaGlobal, equivalentes: [], longitud: logX.toString().length },
            { id: 'p3_t3', texto: ' / ', esEstatico: true, esEspacio: false, clave: '', tipoEntrada: entradaGlobal, equivalentes: [], longitud: 3 },
            { id: 'p3_t4', texto: logB.toString(), esEstatico: false, esEspacio: false, clave: logB.toString(), tipoEntrada: entradaGlobal, equivalentes: [], longitud: logB.toString().length },
          ],
        },
        {
          id: 'p4',
          titulo: 'Cociente final',
          latexCompleto: `= ${res}`,
          tokens: [
            { id: 'p4_t1', texto: '= ', esEstatico: true, esEspacio: false, clave: '', tipoEntrada: entradaGlobal, equivalentes: [], longitud: 2 },
            { id: 'p4_t2', texto: res.toString(), esEstatico: false, esEspacio: false, clave: res.toString(), tipoEntrada: entradaGlobal, equivalentes: [], longitud: res.toString().length },
          ],
        },
      ];
    },
    presetsAyuda: {
      guiado: (tokens) => {
        const targets = new Set(['p2_t2', 'p2_t4', 'p3_t2', 'p3_t4', 'p4_t2']);
        tokens.forEach((t) => { if (targets.has(t.id)) t.esEspacio = true; });
      },
      medio: (tokens) => {
        const targets = new Set(['p3_t2', 'p3_t4', 'p4_t2']);
        tokens.forEach((t) => { if (targets.has(t.id)) t.esEspacio = true; });
      },
      final: (tokens) => {
        const targets = new Set(['p4_t2']);
        tokens.forEach((t) => { if (targets.has(t.id)) t.esEspacio = true; });
      },
    },
  },

  /* ══════════════════════════════════════════════════════════════════════════
     5. SUCESIONES Y MATEMÁTICA FINANCIERA
     ══════════════════════════════════════════════════════════════════════════ */
  {
    id: 'pa_termino_general',
    nombre: 'Progresión Aritmética (PA) — Término general',
    categoria: 'Sucesiones y Finanzas',
    latexReferencia: 'aₙ = a₁ + (n - 1)d',
    enunciadoPlantilla: (d) =>
      `Halla el término a_{${d.n ?? 10}} de una progresión aritmética con primer término a₁ = ${d.a1 ?? 3} y diferencia d = ${d.d ?? 5}.`,
    datosDefecto: [
      { clave: 'a1', nombre: 'Primer término a₁', valor: 3, rango: [1, 10] },
      { clave: 'd', nombre: 'Diferencia común d', valor: 5, rango: [2, 8] },
      { clave: 'n', nombre: 'Posición n', valor: 10, rango: [5, 20] },
    ],
    generarPasos: (d, entradaGlobal) => {
      const a1 = d.a1 ?? 3;
      const dif = d.d ?? 5;
      const n = d.n ?? 10;
      const nMenos1 = n - 1;
      const prod = nMenos1 * dif;
      const an = a1 + prod;

      return [
        {
          id: 'p1',
          titulo: 'Fórmula del término general',
          latexCompleto: 'aₙ = a₁ + (n - 1)d',
          tokens: [
            { id: 'p1_t1', texto: 'aₙ = a₁ + (n - 1)d', esEstatico: true, esEspacio: false, clave: '', tipoEntrada: entradaGlobal, equivalentes: [], longitud: 20 },
          ],
        },
        {
          id: 'p2',
          titulo: 'Sustitución de datos',
          latexCompleto: `a_${n} = ${a1} + (${n} - 1)(${dif})`,
          tokens: [
            { id: 'p2_t1', texto: `a_${n} = `, esEstatico: true, esEspacio: false, clave: '', tipoEntrada: entradaGlobal, equivalentes: [], longitud: 6 },
            { id: 'p2_t2', texto: a1.toString(), esEstatico: false, esEspacio: false, clave: a1.toString(), tipoEntrada: entradaGlobal, equivalentes: [], longitud: a1.toString().length },
            { id: 'p2_t3', texto: ` + (${n} - 1)(`, esEstatico: true, esEspacio: false, clave: '', tipoEntrada: entradaGlobal, equivalentes: [], longitud: 12 },
            { id: 'p2_t4', texto: dif.toString(), esEstatico: false, esEspacio: false, clave: dif.toString(), tipoEntrada: entradaGlobal, equivalentes: [], longitud: dif.toString().length },
            { id: 'p2_t5', texto: ')', esEstatico: true, esEspacio: false, clave: '', tipoEntrada: entradaGlobal, equivalentes: [], longitud: 1 },
          ],
        },
        {
          id: 'p3',
          titulo: 'Multiplicación de la diferencia',
          latexCompleto: `= ${a1} + (${nMenos1})(${dif}) = ${a1} + ${prod}`,
          tokens: [
            { id: 'p3_t1', texto: `= ${a1} + `, esEstatico: true, esEspacio: false, clave: '', tipoEntrada: entradaGlobal, equivalentes: [], longitud: 6 },
            { id: 'p3_t2', texto: prod.toString(), esEstatico: false, esEspacio: false, clave: prod.toString(), tipoEntrada: entradaGlobal, equivalentes: [], longitud: prod.toString().length },
          ],
        },
        {
          id: 'p4',
          titulo: 'Término aₙ calculado',
          latexCompleto: `a_${n} = ${an}`,
          tokens: [
            { id: 'p4_t1', texto: `a_${n} = `, esEstatico: true, esEspacio: false, clave: '', tipoEntrada: entradaGlobal, equivalentes: [], longitud: 6 },
            { id: 'p4_t2', texto: an.toString(), esEstatico: false, esEspacio: false, clave: an.toString(), tipoEntrada: entradaGlobal, equivalentes: [], longitud: an.toString().length },
          ],
        },
      ];
    },
    presetsAyuda: {
      guiado: (tokens) => {
        const targets = new Set(['p2_t2', 'p2_t4', 'p3_t2', 'p4_t2']);
        tokens.forEach((t) => { if (targets.has(t.id)) t.esEspacio = true; });
      },
      medio: (tokens) => {
        const targets = new Set(['p3_t2', 'p4_t2']);
        tokens.forEach((t) => { if (targets.has(t.id)) t.esEspacio = true; });
      },
      final: (tokens) => {
        const targets = new Set(['p4_t2']);
        tokens.forEach((t) => { if (targets.has(t.id)) t.esEspacio = true; });
      },
    },
  },
  {
    id: 'pa_suma_terminos',
    nombre: 'Progresión Aritmética (PA) — Suma de términos',
    categoria: 'Sucesiones y Finanzas',
    latexReferencia: 'Sₙ = (a₁ + aₙ) · n / 2',
    enunciadoPlantilla: (d) =>
      `Calcula la suma de los primeros ${d.n ?? 10} términos de una PA con a₁ = ${d.a1 ?? 2} y a_{${d.n ?? 10}} = ${d.an ?? 20}.`,
    datosDefecto: [
      { clave: 'a1', nombre: 'Primer término a₁', valor: 2, rango: [1, 10] },
      { clave: 'an', nombre: 'Último término aₙ', valor: 20, rango: [15, 60] },
      { clave: 'n', nombre: 'Cantidad de términos n', valor: 10, rango: [4, 20] },
    ],
    generarPasos: (d, entradaGlobal) => {
      const a1 = d.a1 ?? 2;
      const an = d.an ?? 20;
      const n = d.n ?? 10;
      const sumaExtremos = a1 + an;
      const prod = sumaExtremos * n;
      const sn = prod / 2;

      return [
        {
          id: 'p1',
          titulo: 'Fórmula de la suma en PA',
          latexCompleto: 'Sₙ = (a₁ + aₙ) · n / 2',
          tokens: [
            { id: 'p1_t1', texto: 'Sₙ = (a₁ + aₙ) · n / 2', esEstatico: true, esEspacio: false, clave: '', tipoEntrada: entradaGlobal, equivalentes: [], longitud: 22 },
          ],
        },
        {
          id: 'p2',
          titulo: 'Sustitución de datos',
          latexCompleto: `S_${n} = (${a1} + ${an}) · ${n} / 2`,
          tokens: [
            { id: 'p2_t1', texto: `S_${n} = (`, esEstatico: true, esEspacio: false, clave: '', tipoEntrada: entradaGlobal, equivalentes: [], longitud: 8 },
            { id: 'p2_t2', texto: a1.toString(), esEstatico: false, esEspacio: false, clave: a1.toString(), tipoEntrada: entradaGlobal, equivalentes: [], longitud: a1.toString().length },
            { id: 'p2_t3', texto: ' + ', esEstatico: true, esEspacio: false, clave: '', tipoEntrada: entradaGlobal, equivalentes: [], longitud: 3 },
            { id: 'p2_t4', texto: an.toString(), esEstatico: false, esEspacio: false, clave: an.toString(), tipoEntrada: entradaGlobal, equivalentes: [], longitud: an.toString().length },
            { id: 'p2_t5', texto: `) · ${n} / 2`, esEstatico: true, esEspacio: false, clave: '', tipoEntrada: entradaGlobal, equivalentes: [], longitud: 10 },
          ],
        },
        {
          id: 'p3',
          titulo: 'Suma de extremos y producto',
          latexCompleto: `= (${sumaExtremos} · ${n}) / 2 = ${prod} / 2`,
          tokens: [
            { id: 'p3_t1', texto: `= (${sumaExtremos} · ${n}) / 2 = `, esEstatico: true, esEspacio: false, clave: '', tipoEntrada: entradaGlobal, equivalentes: [], longitud: 16 },
            { id: 'p3_t2', texto: prod.toString(), esEstatico: false, esEspacio: false, clave: prod.toString(), tipoEntrada: entradaGlobal, equivalentes: [], longitud: prod.toString().length },
            { id: 'p3_t3', texto: ' / 2', esEstatico: true, esEspacio: false, clave: '', tipoEntrada: entradaGlobal, equivalentes: [], longitud: 4 },
          ],
        },
        {
          id: 'p4',
          titulo: 'Suma total Sₙ',
          latexCompleto: `S_${n} = ${sn}`,
          tokens: [
            { id: 'p4_t1', texto: `S_${n} = `, esEstatico: true, esEspacio: false, clave: '', tipoEntrada: entradaGlobal, equivalentes: [], longitud: 6 },
            { id: 'p4_t2', texto: sn.toString(), esEstatico: false, esEspacio: false, clave: sn.toString(), tipoEntrada: entradaGlobal, equivalentes: [], longitud: sn.toString().length },
          ],
        },
      ];
    },
    presetsAyuda: {
      guiado: (tokens) => {
        const targets = new Set(['p2_t2', 'p2_t4', 'p3_t2', 'p4_t2']);
        tokens.forEach((t) => { if (targets.has(t.id)) t.esEspacio = true; });
      },
      medio: (tokens) => {
        const targets = new Set(['p3_t2', 'p4_t2']);
        tokens.forEach((t) => { if (targets.has(t.id)) t.esEspacio = true; });
      },
      final: (tokens) => {
        const targets = new Set(['p4_t2']);
        tokens.forEach((t) => { if (targets.has(t.id)) t.esEspacio = true; });
      },
    },
  },
  {
    id: 'pg_termino_general',
    nombre: 'Progresión Geométrica (PG) — Término general',
    categoria: 'Sucesiones y Finanzas',
    latexReferencia: 'aₙ = a₁ · rⁿ⁻¹',
    enunciadoPlantilla: (d) =>
      `Halla el término a_{${d.n ?? 5}} de una progresión geométrica con a₁ = ${d.a1 ?? 3} y razón r = ${d.r ?? 2}.`,
    datosDefecto: [
      { clave: 'a1', nombre: 'Primer término a₁', valor: 3, rango: [1, 6] },
      { clave: 'r', nombre: 'Razón r', valor: 2, rango: [2, 4] },
      { clave: 'n', nombre: 'Posición n', valor: 5, rango: [3, 8] },
    ],
    generarPasos: (d, entradaGlobal) => {
      const a1 = d.a1 ?? 3;
      const r = d.r ?? 2;
      const n = d.n ?? 5;
      const exp = n - 1;
      const pot = Math.pow(r, exp);
      const an = a1 * pot;

      return [
        {
          id: 'p1',
          titulo: 'Fórmula general en PG',
          latexCompleto: 'aₙ = a₁ · rⁿ⁻¹',
          tokens: [
            { id: 'p1_t1', texto: 'aₙ = a₁ · rⁿ⁻¹', esEstatico: true, esEspacio: false, clave: '', tipoEntrada: entradaGlobal, equivalentes: [], longitud: 15 },
          ],
        },
        {
          id: 'p2',
          titulo: 'Sustitución de datos',
          latexCompleto: `a_${n} = ${a1} · (${r})^(${n} - 1)`,
          tokens: [
            { id: 'p2_t1', texto: `a_${n} = `, esEstatico: true, esEspacio: false, clave: '', tipoEntrada: entradaGlobal, equivalentes: [], longitud: 6 },
            { id: 'p2_t2', texto: a1.toString(), esEstatico: false, esEspacio: false, clave: a1.toString(), tipoEntrada: entradaGlobal, equivalentes: [], longitud: a1.toString().length },
            { id: 'p2_t3', texto: ` · (${r})^`, esEstatico: true, esEspacio: false, clave: '', tipoEntrada: entradaGlobal, equivalentes: [], longitud: 8 },
            { id: 'p2_t4', texto: exp.toString(), esEstatico: false, esEspacio: false, clave: exp.toString(), tipoEntrada: entradaGlobal, equivalentes: [], longitud: exp.toString().length },
          ],
        },
        {
          id: 'p3',
          titulo: 'Cálculo de la potencia',
          latexCompleto: `= ${a1} · ${pot}`,
          tokens: [
            { id: 'p3_t1', texto: `= ${a1} · `, esEstatico: true, esEspacio: false, clave: '', tipoEntrada: entradaGlobal, equivalentes: [], longitud: 6 },
            { id: 'p3_t2', texto: pot.toString(), esEstatico: false, esEspacio: false, clave: pot.toString(), tipoEntrada: entradaGlobal, equivalentes: [], longitud: pot.toString().length },
          ],
        },
        {
          id: 'p4',
          titulo: 'Término aₙ calculado',
          latexCompleto: `a_${n} = ${an}`,
          tokens: [
            { id: 'p4_t1', texto: `a_${n} = `, esEstatico: true, esEspacio: false, clave: '', tipoEntrada: entradaGlobal, equivalentes: [], longitud: 6 },
            { id: 'p4_t2', texto: an.toString(), esEstatico: false, esEspacio: false, clave: an.toString(), tipoEntrada: entradaGlobal, equivalentes: [], longitud: an.toString().length },
          ],
        },
      ];
    },
    presetsAyuda: {
      guiado: (tokens) => {
        const targets = new Set(['p2_t2', 'p2_t4', 'p3_t2', 'p4_t2']);
        tokens.forEach((t) => { if (targets.has(t.id)) t.esEspacio = true; });
      },
      medio: (tokens) => {
        const targets = new Set(['p3_t2', 'p4_t2']);
        tokens.forEach((t) => { if (targets.has(t.id)) t.esEspacio = true; });
      },
      final: (tokens) => {
        const targets = new Set(['p4_t2']);
        tokens.forEach((t) => { if (targets.has(t.id)) t.esEspacio = true; });
      },
    },
  },
  {
    id: 'pg_suma_terminos',
    nombre: 'Progresión Geométrica (PG) — Suma de términos',
    categoria: 'Sucesiones y Finanzas',
    latexReferencia: 'Sₙ = a₁(rⁿ - 1) / (r - 1)',
    enunciadoPlantilla: (d) =>
      `Calcula la suma de los primeros ${d.n ?? 4} términos de una PG con a₁ = ${d.a1 ?? 2} y razón r = ${d.r ?? 3}.`,
    datosDefecto: [
      { clave: 'a1', nombre: 'Primer término a₁', valor: 2, rango: [1, 5] },
      { clave: 'r', nombre: 'Razón r', valor: 3, rango: [2, 4] },
      { clave: 'n', nombre: 'Cantidad de términos n', valor: 4, rango: [3, 6] },
    ],
    generarPasos: (d, entradaGlobal) => {
      const a1 = d.a1 ?? 2;
      const r = d.r ?? 3;
      const n = d.n ?? 4;
      const rN = Math.pow(r, n);
      const numerador = a1 * (rN - 1);
      const denominador = r - 1;
      const sn = numerador / denominador;

      return [
        {
          id: 'p1',
          titulo: 'Fórmula de la suma en PG',
          latexCompleto: 'Sₙ = a₁(rⁿ - 1) / (r - 1)',
          tokens: [
            { id: 'p1_t1', texto: 'Sₙ = a₁(rⁿ - 1) / (r - 1)', esEstatico: true, esEspacio: false, clave: '', tipoEntrada: entradaGlobal, equivalentes: [], longitud: 24 },
          ],
        },
        {
          id: 'p2',
          titulo: 'Sustitución de datos',
          latexCompleto: `S_${n} = ${a1} · ((${r})^${n} - 1) / (${r} - 1)`,
          tokens: [
            { id: 'p2_t1', texto: `S_${n} = `, esEstatico: true, esEspacio: false, clave: '', tipoEntrada: entradaGlobal, equivalentes: [], longitud: 6 },
            { id: 'p2_t2', texto: a1.toString(), esEstatico: false, esEspacio: false, clave: a1.toString(), tipoEntrada: entradaGlobal, equivalentes: [], longitud: a1.toString().length },
            { id: 'p2_t3', texto: ` · ((${r})^${n} - 1) / (`, esEstatico: true, esEspacio: false, clave: '', tipoEntrada: entradaGlobal, equivalentes: [], longitud: 18 },
            { id: 'p2_t4', texto: denominador.toString(), esEstatico: false, esEspacio: false, clave: denominador.toString(), tipoEntrada: entradaGlobal, equivalentes: [], longitud: denominador.toString().length },
            { id: 'p2_t5', texto: ')', esEstatico: true, esEspacio: false, clave: '', tipoEntrada: entradaGlobal, equivalentes: [], longitud: 1 },
          ],
        },
        {
          id: 'p3',
          titulo: 'Potencia y producto en numerador',
          latexCompleto: `= ${numerador} / ${denominador}`,
          tokens: [
            { id: 'p3_t1', texto: '= ', esEstatico: true, esEspacio: false, clave: '', tipoEntrada: entradaGlobal, equivalentes: [], longitud: 2 },
            { id: 'p3_t2', texto: numerador.toString(), esEstatico: false, esEspacio: false, clave: numerador.toString(), tipoEntrada: entradaGlobal, equivalentes: [], longitud: numerador.toString().length },
            { id: 'p3_t3', texto: ` / ${denominador}`, esEstatico: true, esEspacio: false, clave: '', tipoEntrada: entradaGlobal, equivalentes: [], longitud: 6 },
          ],
        },
        {
          id: 'p4',
          titulo: 'Suma final Sₙ',
          latexCompleto: `S_${n} = ${sn}`,
          tokens: [
            { id: 'p4_t1', texto: `S_${n} = `, esEstatico: true, esEspacio: false, clave: '', tipoEntrada: entradaGlobal, equivalentes: [], longitud: 6 },
            { id: 'p4_t2', texto: sn.toString(), esEstatico: false, esEspacio: false, clave: sn.toString(), tipoEntrada: entradaGlobal, equivalentes: [], longitud: sn.toString().length },
          ],
        },
      ];
    },
    presetsAyuda: {
      guiado: (tokens) => {
        const targets = new Set(['p2_t2', 'p2_t4', 'p3_t2', 'p4_t2']);
        tokens.forEach((t) => { if (targets.has(t.id)) t.esEspacio = true; });
      },
      medio: (tokens) => {
        const targets = new Set(['p3_t2', 'p4_t2']);
        tokens.forEach((t) => { if (targets.has(t.id)) t.esEspacio = true; });
      },
      final: (tokens) => {
        const targets = new Set(['p4_t2']);
        tokens.forEach((t) => { if (targets.has(t.id)) t.esEspacio = true; });
      },
    },
  },
  {
    id: 'interes_simple',
    nombre: 'Interés simple',
    categoria: 'Sucesiones y Finanzas',
    latexReferencia: 'I = Cᵢ · r · t',
    enunciadoPlantilla: (d) =>
      `Calcula el interés simple generado por un capital inicial de $${d.Ci ?? 1000} a una tasa anual del ${((d.r ?? 0.05) * 100).toFixed(0)}% durante ${d.t ?? 3} años.`,
    datosDefecto: [
      { clave: 'Ci', nombre: 'Capital inicial Ci', valor: 1000, rango: [500, 5000] },
      { clave: 'r', nombre: 'Tasa r (en decimal, ej: 0.05)', valor: 0.05, rango: [0.02, 0.1] },
      { clave: 't', nombre: 'Tiempo t (años)', valor: 3, rango: [1, 10] },
    ],
    generarPasos: (d, entradaGlobal) => {
      const ci = d.Ci ?? 1000;
      const r = d.r ?? 0.05;
      const t = d.t ?? 3;
      const prodCiR = Math.round(ci * r * 100) / 100;
      const interes = Math.round(ci * r * t * 100) / 100;

      return [
        {
          id: 'p1',
          titulo: 'Fórmula de interés simple',
          latexCompleto: 'I = Cᵢ · r · t',
          tokens: [
            { id: 'p1_t1', texto: 'I = Cᵢ · r · t', esEstatico: true, esEspacio: false, clave: '', tipoEntrada: entradaGlobal, equivalentes: [], longitud: 14 },
          ],
        },
        {
          id: 'p2',
          titulo: 'Sustitución de datos',
          latexCompleto: `I = (${ci}) · (${r}) · (${t})`,
          tokens: [
            { id: 'p2_t1', texto: 'I = (', esEstatico: true, esEspacio: false, clave: '', tipoEntrada: entradaGlobal, equivalentes: [], longitud: 5 },
            { id: 'p2_t2', texto: ci.toString(), esEstatico: false, esEspacio: false, clave: ci.toString(), tipoEntrada: entradaGlobal, equivalentes: [], longitud: ci.toString().length },
            { id: 'p2_t3', texto: ') · (', esEstatico: true, esEspacio: false, clave: '', tipoEntrada: entradaGlobal, equivalentes: [], longitud: 5 },
            { id: 'p2_t4', texto: r.toString(), esEstatico: false, esEspacio: false, clave: r.toString(), tipoEntrada: entradaGlobal, equivalentes: [], longitud: r.toString().length },
            { id: 'p2_t5', texto: ') · (', esEstatico: true, esEspacio: false, clave: '', tipoEntrada: entradaGlobal, equivalentes: [], longitud: 5 },
            { id: 'p2_t6', texto: t.toString(), esEstatico: false, esEspacio: false, clave: t.toString(), tipoEntrada: entradaGlobal, equivalentes: [], longitud: t.toString().length },
            { id: 'p2_t7', texto: ')', esEstatico: true, esEspacio: false, clave: '', tipoEntrada: entradaGlobal, equivalentes: [], longitud: 1 },
          ],
        },
        {
          id: 'p3',
          titulo: 'Producto intermedio',
          latexCompleto: `= ${prodCiR} · ${t}`,
          tokens: [
            { id: 'p3_t1', texto: '= ', esEstatico: true, esEspacio: false, clave: '', tipoEntrada: entradaGlobal, equivalentes: [], longitud: 2 },
            { id: 'p3_t2', texto: prodCiR.toString(), esEstatico: false, esEspacio: false, clave: prodCiR.toString(), tipoEntrada: entradaGlobal, equivalentes: [], longitud: prodCiR.toString().length },
            { id: 'p3_t3', texto: ` · ${t}`, esEstatico: true, esEspacio: false, clave: '', tipoEntrada: entradaGlobal, equivalentes: [], longitud: 6 },
          ],
        },
        {
          id: 'p4',
          titulo: 'Interés total generado',
          latexCompleto: `I = ${interes}`,
          tokens: [
            { id: 'p4_t1', texto: 'I = ', esEstatico: true, esEspacio: false, clave: '', tipoEntrada: entradaGlobal, equivalentes: [], longitud: 4 },
            { id: 'p4_t2', texto: interes.toString(), esEstatico: false, esEspacio: false, clave: interes.toString(), tipoEntrada: entradaGlobal, equivalentes: [], longitud: interes.toString().length },
          ],
        },
      ];
    },
    presetsAyuda: {
      guiado: (tokens) => {
        const targets = new Set(['p2_t2', 'p2_t4', 'p2_t6', 'p3_t2', 'p4_t2']);
        tokens.forEach((t) => { if (targets.has(t.id)) t.esEspacio = true; });
      },
      medio: (tokens) => {
        const targets = new Set(['p3_t2', 'p4_t2']);
        tokens.forEach((t) => { if (targets.has(t.id)) t.esEspacio = true; });
      },
      final: (tokens) => {
        const targets = new Set(['p4_t2']);
        tokens.forEach((t) => { if (targets.has(t.id)) t.esEspacio = true; });
      },
    },
  },
  {
    id: 'interes_compuesto',
    nombre: 'Interés compuesto (capital final)',
    categoria: 'Sucesiones y Finanzas',
    latexReferencia: 'C_f = Cᵢ · (1 + r)ᵗ',
    enunciadoPlantilla: (d) =>
      `Calcula el capital final (C_f) de una inversión inicial de $${d.Ci ?? 1000} al ${((d.r ?? 0.05) * 100).toFixed(0)}% anual compuesto durante ${d.t ?? 2} años.`,
    datosDefecto: [
      { clave: 'Ci', nombre: 'Capital inicial Ci', valor: 1000, rango: [500, 5000] },
      { clave: 'r', nombre: 'Tasa r (en decimal, ej: 0.05)', valor: 0.05, rango: [0.02, 0.1] },
      { clave: 't', nombre: 'Tiempo t (años)', valor: 2, rango: [1, 5] },
    ],
    generarPasos: (d, entradaGlobal) => {
      const ci = d.Ci ?? 1000;
      const r = d.r ?? 0.05;
      const t = d.t ?? 2;
      const factorBase = Math.round((1 + r) * 1000) / 1000;
      const factorPotencia = Math.round(Math.pow(1 + r, t) * 10000) / 10000;
      const cf = Math.round(ci * factorPotencia * 100) / 100;

      return [
        {
          id: 'p1',
          titulo: 'Fórmula de interés compuesto',
          latexCompleto: 'C_f = Cᵢ · (1 + r)ᵗ',
          tokens: [
            { id: 'p1_t1', texto: 'C_f = Cᵢ · (1 + r)ᵗ', esEstatico: true, esEspacio: false, clave: '', tipoEntrada: entradaGlobal, equivalentes: [], longitud: 18 },
          ],
        },
        {
          id: 'p2',
          titulo: 'Sustitución de datos',
          latexCompleto: `C_f = (${ci}) · (1 + ${r})^${t}`,
          tokens: [
            { id: 'p2_t1', texto: 'C_f = (', esEstatico: true, esEspacio: false, clave: '', tipoEntrada: entradaGlobal, equivalentes: [], longitud: 7 },
            { id: 'p2_t2', texto: ci.toString(), esEstatico: false, esEspacio: false, clave: ci.toString(), tipoEntrada: entradaGlobal, equivalentes: [], longitud: ci.toString().length },
            { id: 'p2_t3', texto: ') · (1 + ', esEstatico: true, esEspacio: false, clave: '', tipoEntrada: entradaGlobal, equivalentes: [], longitud: 9 },
            { id: 'p2_t4', texto: r.toString(), esEstatico: false, esEspacio: false, clave: r.toString(), tipoEntrada: entradaGlobal, equivalentes: [], longitud: r.toString().length },
            { id: 'p2_t5', texto: `)^${t}`, esEstatico: true, esEspacio: false, clave: '', tipoEntrada: entradaGlobal, equivalentes: [], longitud: 4 },
          ],
        },
        {
          id: 'p3',
          titulo: 'Suma de la base y potencia',
          latexCompleto: `= (${ci}) · (${factorBase})^${t} = (${ci}) · (${factorPotencia})`,
          tokens: [
            { id: 'p3_t1', texto: `= (${ci}) · (`, esEstatico: true, esEspacio: false, clave: '', tipoEntrada: entradaGlobal, equivalentes: [], longitud: 12 },
            { id: 'p3_t2', texto: factorPotencia.toString(), esEstatico: false, esEspacio: false, clave: factorPotencia.toString(), tipoEntrada: entradaGlobal, equivalentes: [], longitud: factorPotencia.toString().length },
            { id: 'p3_t3', texto: ')', esEstatico: true, esEspacio: false, clave: '', tipoEntrada: entradaGlobal, equivalentes: [], longitud: 1 },
          ],
        },
        {
          id: 'p4',
          titulo: 'Capital final calculado',
          latexCompleto: `C_f = ${cf}`,
          tokens: [
            { id: 'p4_t1', texto: 'C_f = ', esEstatico: true, esEspacio: false, clave: '', tipoEntrada: entradaGlobal, equivalentes: [], longitud: 6 },
            { id: 'p4_t2', texto: cf.toString(), esEstatico: false, esEspacio: false, clave: cf.toString(), tipoEntrada: entradaGlobal, equivalentes: [], longitud: cf.toString().length },
          ],
        },
      ];
    },
    presetsAyuda: {
      guiado: (tokens) => {
        const targets = new Set(['p2_t2', 'p2_t4', 'p3_t2', 'p4_t2']);
        tokens.forEach((t) => { if (targets.has(t.id)) t.esEspacio = true; });
      },
      medio: (tokens) => {
        const targets = new Set(['p3_t2', 'p4_t2']);
        tokens.forEach((t) => { if (targets.has(t.id)) t.esEspacio = true; });
      },
      final: (tokens) => {
        const targets = new Set(['p4_t2']);
        tokens.forEach((t) => { if (targets.has(t.id)) t.esEspacio = true; });
      },
    },
  },

  /* ══════════════════════════════════════════════════════════════════════════
     6. GEOMETRÍA PLANA (ÁREAS Y PERÍMETROS)
     ══════════════════════════════════════════════════════════════════════════ */
  {
    id: 'pitagoras',
    nombre: 'Teorema de Pitágoras',
    categoria: 'Geometría Plana',
    latexReferencia: 'a² = b² + c²',
    enunciadoPlantilla: (d) =>
      `Calcula la hipotenusa (a) de un triángulo rectángulo cuyos catetos miden b = ${d.b ?? 3} cm y c = ${d.c ?? 4} cm.`,
    datosDefecto: [
      { clave: 'b', nombre: 'Cateto b', valor: 3, rango: [2, 9] },
      { clave: 'c', nombre: 'Cateto c', valor: 4, rango: [2, 9] },
    ],
    generarPasos: (d, entradaGlobal) => {
      const b = d.b ?? 3;
      const c = d.c ?? 4;
      const b2 = b * b;
      const c2 = c * c;
      const suma = b2 + c2;
      const a = Math.sqrt(suma);
      const esExacto = Number.isInteger(a);
      const resFinal = esExacto ? a.toString() : (Math.round(a * 100) / 100).toString();

      return [
        {
          id: 'p1',
          titulo: 'Fórmula canónica',
          latexCompleto: 'a² = b² + c²',
          tokens: [
            { id: 'p1_t1', texto: 'a² = b² + c²', esEstatico: true, esEspacio: false, clave: '', tipoEntrada: entradaGlobal, equivalentes: [], longitud: 12 },
          ],
        },
        {
          id: 'p2',
          titulo: 'Sustitución de catetos',
          latexCompleto: `a² = (${b})² + (${c})²`,
          tokens: [
            { id: 'p2_t1', texto: 'a² = (', esEstatico: true, esEspacio: false, clave: '', tipoEntrada: entradaGlobal, equivalentes: [], longitud: 6 },
            { id: 'p2_t2', texto: b.toString(), esEstatico: false, esEspacio: false, clave: b.toString(), tipoEntrada: entradaGlobal, equivalentes: [], longitud: b.toString().length },
            { id: 'p2_t3', texto: ')² + (', esEstatico: true, esEspacio: false, clave: '', tipoEntrada: entradaGlobal, equivalentes: [], longitud: 6 },
            { id: 'p2_t4', texto: c.toString(), esEstatico: false, esEspacio: false, clave: c.toString(), tipoEntrada: entradaGlobal, equivalentes: [], longitud: c.toString().length },
            { id: 'p2_t5', texto: ')²', esEstatico: true, esEspacio: false, clave: '', tipoEntrada: entradaGlobal, equivalentes: [], longitud: 2 },
          ],
        },
        {
          id: 'p3',
          titulo: 'Cálculo de potencias',
          latexCompleto: `a² = ${b2} + ${c2}`,
          tokens: [
            { id: 'p3_t1', texto: 'a² = ', esEstatico: true, esEspacio: false, clave: '', tipoEntrada: entradaGlobal, equivalentes: [], longitud: 5 },
            { id: 'p3_t2', texto: b2.toString(), esEstatico: false, esEspacio: false, clave: b2.toString(), tipoEntrada: entradaGlobal, equivalentes: [`${b}²`], longitud: b2.toString().length },
            { id: 'p3_t3', texto: ' + ', esEstatico: true, esEspacio: false, clave: '', tipoEntrada: entradaGlobal, equivalentes: [], longitud: 3 },
            { id: 'p3_t4', texto: c2.toString(), esEstatico: false, esEspacio: false, clave: c2.toString(), tipoEntrada: entradaGlobal, equivalentes: [`${c}²`], longitud: c2.toString().length },
          ],
        },
        {
          id: 'p4',
          titulo: 'Suma de cuadrados',
          latexCompleto: `a² = ${suma}`,
          tokens: [
            { id: 'p4_t1', texto: 'a² = ', esEstatico: true, esEspacio: false, clave: '', tipoEntrada: entradaGlobal, equivalentes: [], longitud: 5 },
            { id: 'p4_t2', texto: suma.toString(), esEstatico: false, esEspacio: false, clave: suma.toString(), tipoEntrada: entradaGlobal, equivalentes: [], longitud: suma.toString().length },
          ],
        },
        {
          id: 'p5',
          titulo: 'Raíz cuadrada y resultado',
          latexCompleto: esExacto ? `a = √${suma} = ${resFinal}` : `a = √${suma} ≈ ${resFinal}`,
          tokens: [
            { id: 'p5_t1', texto: 'a = √', esEstatico: true, esEspacio: false, clave: '', tipoEntrada: entradaGlobal, equivalentes: [], longitud: 5 },
            { id: 'p5_t2', texto: suma.toString(), esEstatico: false, esEspacio: false, clave: suma.toString(), tipoEntrada: entradaGlobal, equivalentes: [], longitud: suma.toString().length },
            { id: 'p5_t3', texto: esExacto ? ' = ' : ' ≈ ', esEstatico: true, esEspacio: false, clave: '', tipoEntrada: entradaGlobal, equivalentes: [], longitud: 3 },
            { id: 'p5_t4', texto: resFinal, esEstatico: false, esEspacio: false, clave: resFinal, tipoEntrada: entradaGlobal, equivalentes: [], longitud: resFinal.length },
          ],
        },
      ];
    },
    presetsAyuda: {
      guiado: (tokens) => {
        const targets = new Set(['p2_t2', 'p2_t4', 'p3_t2', 'p3_t4', 'p4_t2', 'p5_t4']);
        tokens.forEach((t) => { if (targets.has(t.id)) t.esEspacio = true; });
      },
      medio: (tokens) => {
        const targets = new Set(['p2_t2', 'p2_t4', 'p5_t4']);
        tokens.forEach((t) => { if (targets.has(t.id)) t.esEspacio = true; });
      },
      final: (tokens) => {
        const targets = new Set(['p5_t4']);
        tokens.forEach((t) => { if (targets.has(t.id)) t.esEspacio = true; });
      },
    },
  },
  {
    id: 'area_cuadrado',
    nombre: 'Cuadrado — Perímetro y Área',
    categoria: 'Geometría Plana',
    latexReferencia: 'P = 4l,   A = l²',
    enunciadoPlantilla: (d) =>
      `Calcula el perímetro (P) y el área (A) de un cuadrado de lado l = ${d.l ?? 5} cm.`,
    datosDefecto: [
      { clave: 'l', nombre: 'Lado l', valor: 5, rango: [2, 15] },
    ],
    generarPasos: (d, entradaGlobal) => {
      const l = d.l ?? 5;
      const p = 4 * l;
      const a = l * l;

      return [
        {
          id: 'p1',
          titulo: 'Fórmulas de perímetro y área',
          latexCompleto: 'P = 4l,   A = l²',
          tokens: [
            { id: 'p1_t1', texto: 'P = 4l,   A = l²', esEstatico: true, esEspacio: false, clave: '', tipoEntrada: entradaGlobal, equivalentes: [], longitud: 16 },
          ],
        },
        {
          id: 'p2',
          titulo: 'Cálculo del perímetro',
          latexCompleto: `P = 4(${l}) = ${p}`,
          tokens: [
            { id: 'p2_t1', texto: 'P = 4(', esEstatico: true, esEspacio: false, clave: '', tipoEntrada: entradaGlobal, equivalentes: [], longitud: 6 },
            { id: 'p2_t2', texto: l.toString(), esEstatico: false, esEspacio: false, clave: l.toString(), tipoEntrada: entradaGlobal, equivalentes: [], longitud: l.toString().length },
            { id: 'p2_t3', texto: ') = ', esEstatico: true, esEspacio: false, clave: '', tipoEntrada: entradaGlobal, equivalentes: [], longitud: 4 },
            { id: 'p2_t4', texto: p.toString(), esEstatico: false, esEspacio: false, clave: p.toString(), tipoEntrada: entradaGlobal, equivalentes: [], longitud: p.toString().length },
          ],
        },
        {
          id: 'p3',
          titulo: 'Sustitución en el área',
          latexCompleto: `A = (${l})²`,
          tokens: [
            { id: 'p3_t1', texto: 'A = (', esEstatico: true, esEspacio: false, clave: '', tipoEntrada: entradaGlobal, equivalentes: [], longitud: 5 },
            { id: 'p3_t2', texto: l.toString(), esEstatico: false, esEspacio: false, clave: l.toString(), tipoEntrada: entradaGlobal, equivalentes: [], longitud: l.toString().length },
            { id: 'p3_t3', texto: ')²', esEstatico: true, esEspacio: false, clave: '', tipoEntrada: entradaGlobal, equivalentes: [], longitud: 2 },
          ],
        },
        {
          id: 'p4',
          titulo: 'Área calculada',
          latexCompleto: `A = ${a}`,
          tokens: [
            { id: 'p4_t1', texto: 'A = ', esEstatico: true, esEspacio: false, clave: '', tipoEntrada: entradaGlobal, equivalentes: [], longitud: 4 },
            { id: 'p4_t2', texto: a.toString(), esEstatico: false, esEspacio: false, clave: a.toString(), tipoEntrada: entradaGlobal, equivalentes: [], longitud: a.toString().length },
          ],
        },
      ];
    },
    presetsAyuda: {
      guiado: (tokens) => {
        const targets = new Set(['p2_t2', 'p2_t4', 'p3_t2', 'p4_t2']);
        tokens.forEach((t) => { if (targets.has(t.id)) t.esEspacio = true; });
      },
      medio: (tokens) => {
        const targets = new Set(['p2_t4', 'p4_t2']);
        tokens.forEach((t) => { if (targets.has(t.id)) t.esEspacio = true; });
      },
      final: (tokens) => {
        const targets = new Set(['p4_t2']);
        tokens.forEach((t) => { if (targets.has(t.id)) t.esEspacio = true; });
      },
    },
  },
  {
    id: 'area_rectangulo',
    nombre: 'Rectángulo — Perímetro y Área',
    categoria: 'Geometría Plana',
    latexReferencia: 'P = 2(b + h),   A = b · h',
    enunciadoPlantilla: (d) =>
      `Calcula el perímetro y área de un rectángulo con base b = ${d.b ?? 8} cm y altura h = ${d.h ?? 4} cm.`,
    datosDefecto: [
      { clave: 'b', nombre: 'Base b', valor: 8, rango: [4, 15] },
      { clave: 'h', nombre: 'Altura h', valor: 4, rango: [2, 10] },
    ],
    generarPasos: (d, entradaGlobal) => {
      const b = d.b ?? 8;
      const h = d.h ?? 4;
      const sumaLados = b + h;
      const p = 2 * sumaLados;
      const a = b * h;

      return [
        {
          id: 'p1',
          titulo: 'Fórmulas de rectángulo',
          latexCompleto: 'P = 2(b + h),   A = b · h',
          tokens: [
            { id: 'p1_t1', texto: 'P = 2(b + h),   A = b · h', esEstatico: true, esEspacio: false, clave: '', tipoEntrada: entradaGlobal, equivalentes: [], longitud: 24 },
          ],
        },
        {
          id: 'p2',
          titulo: 'Cálculo del perímetro',
          latexCompleto: `P = 2(${b} + ${h}) = 2(${sumaLados}) = ${p}`,
          tokens: [
            { id: 'p2_t1', texto: 'P = 2(', esEstatico: true, esEspacio: false, clave: '', tipoEntrada: entradaGlobal, equivalentes: [], longitud: 6 },
            { id: 'p2_t2', texto: b.toString(), esEstatico: false, esEspacio: false, clave: b.toString(), tipoEntrada: entradaGlobal, equivalentes: [], longitud: b.toString().length },
            { id: 'p2_t3', texto: ' + ', esEstatico: true, esEspacio: false, clave: '', tipoEntrada: entradaGlobal, equivalentes: [], longitud: 3 },
            { id: 'p2_t4', texto: h.toString(), esEstatico: false, esEspacio: false, clave: h.toString(), tipoEntrada: entradaGlobal, equivalentes: [], longitud: h.toString().length },
            { id: 'p2_t5', texto: ') = 2(', esEstatico: true, esEspacio: false, clave: '', tipoEntrada: entradaGlobal, equivalentes: [], longitud: 6 },
            { id: 'p2_t6', texto: sumaLados.toString(), esEstatico: false, esEspacio: false, clave: sumaLados.toString(), tipoEntrada: entradaGlobal, equivalentes: [], longitud: sumaLados.toString().length },
            { id: 'p2_t7', texto: ') = ', esEstatico: true, esEspacio: false, clave: '', tipoEntrada: entradaGlobal, equivalentes: [], longitud: 4 },
            { id: 'p2_t8', texto: p.toString(), esEstatico: false, esEspacio: false, clave: p.toString(), tipoEntrada: entradaGlobal, equivalentes: [], longitud: p.toString().length },
          ],
        },
        {
          id: 'p3',
          titulo: 'Sustitución en el área',
          latexCompleto: `A = (${b}) · (${h})`,
          tokens: [
            { id: 'p3_t1', texto: 'A = (', esEstatico: true, esEspacio: false, clave: '', tipoEntrada: entradaGlobal, equivalentes: [], longitud: 5 },
            { id: 'p3_t2', texto: b.toString(), esEstatico: false, esEspacio: false, clave: b.toString(), tipoEntrada: entradaGlobal, equivalentes: [], longitud: b.toString().length },
            { id: 'p3_t3', texto: ') · (', esEstatico: true, esEspacio: false, clave: '', tipoEntrada: entradaGlobal, equivalentes: [], longitud: 5 },
            { id: 'p3_t4', texto: h.toString(), esEstatico: false, esEspacio: false, clave: h.toString(), tipoEntrada: entradaGlobal, equivalentes: [], longitud: h.toString().length },
            { id: 'p3_t5', texto: ')', esEstatico: true, esEspacio: false, clave: '', tipoEntrada: entradaGlobal, equivalentes: [], longitud: 1 },
          ],
        },
        {
          id: 'p4',
          titulo: 'Área calculada',
          latexCompleto: `A = ${a}`,
          tokens: [
            { id: 'p4_t1', texto: 'A = ', esEstatico: true, esEspacio: false, clave: '', tipoEntrada: entradaGlobal, equivalentes: [], longitud: 4 },
            { id: 'p4_t2', texto: a.toString(), esEstatico: false, esEspacio: false, clave: a.toString(), tipoEntrada: entradaGlobal, equivalentes: [], longitud: a.toString().length },
          ],
        },
      ];
    },
    presetsAyuda: {
      guiado: (tokens) => {
        const targets = new Set(['p2_t2', 'p2_t4', 'p2_t8', 'p3_t2', 'p3_t4', 'p4_t2']);
        tokens.forEach((t) => { if (targets.has(t.id)) t.esEspacio = true; });
      },
      medio: (tokens) => {
        const targets = new Set(['p2_t8', 'p4_t2']);
        tokens.forEach((t) => { if (targets.has(t.id)) t.esEspacio = true; });
      },
      final: (tokens) => {
        const targets = new Set(['p4_t2']);
        tokens.forEach((t) => { if (targets.has(t.id)) t.esEspacio = true; });
      },
    },
  },
  {
    id: 'area_triangulo',
    nombre: 'Triángulo — Perímetro y Área',
    categoria: 'Geometría Plana',
    latexReferencia: 'P = a + b + c,   A = (b · h) / 2',
    enunciadoPlantilla: (d) =>
      `Calcula el perímetro y área de un triángulo con base b = ${d.b ?? 6} cm, altura h = ${d.h ?? 4} cm, y lados a = ${d.a ?? 5} cm, c = ${d.c ?? 5} cm.`,
    datosDefecto: [
      { clave: 'b', nombre: 'Base b', valor: 6, rango: [4, 12] },
      { clave: 'h', nombre: 'Altura h', valor: 4, rango: [2, 10] },
      { clave: 'a', nombre: 'Lado a', valor: 5, rango: [3, 10] },
      { clave: 'c', nombre: 'Lado c', valor: 5, rango: [3, 10] },
    ],
    generarPasos: (d, entradaGlobal) => {
      const b = d.b ?? 6;
      const h = d.h ?? 4;
      const aLado = d.a ?? 5;
      const cLado = d.c ?? 5;
      const p = aLado + b + cLado;
      const producto = b * h;
      const area = producto / 2;

      return [
        {
          id: 'p1',
          titulo: 'Fórmulas del triángulo',
          latexCompleto: 'P = a + b + c,   A = (b · h) / 2',
          tokens: [
            { id: 'p1_t1', texto: 'P = a + b + c,   A = (b · h) / 2', esEstatico: true, esEspacio: false, clave: '', tipoEntrada: entradaGlobal, equivalentes: [], longitud: 30 },
          ],
        },
        {
          id: 'p2',
          titulo: 'Cálculo del perímetro',
          latexCompleto: `P = ${aLado} + ${b} + ${cLado} = ${p}`,
          tokens: [
            { id: 'p2_t1', texto: 'P = ', esEstatico: true, esEspacio: false, clave: '', tipoEntrada: entradaGlobal, equivalentes: [], longitud: 4 },
            { id: 'p2_t2', texto: aLado.toString(), esEstatico: false, esEspacio: false, clave: aLado.toString(), tipoEntrada: entradaGlobal, equivalentes: [], longitud: aLado.toString().length },
            { id: 'p2_t3', texto: ' + ', esEstatico: true, esEspacio: false, clave: '', tipoEntrada: entradaGlobal, equivalentes: [], longitud: 3 },
            { id: 'p2_t4', texto: b.toString(), esEstatico: false, esEspacio: false, clave: b.toString(), tipoEntrada: entradaGlobal, equivalentes: [], longitud: b.toString().length },
            { id: 'p2_t5', texto: ' + ', esEstatico: true, esEspacio: false, clave: '', tipoEntrada: entradaGlobal, equivalentes: [], longitud: 3 },
            { id: 'p2_t6', texto: cLado.toString(), esEstatico: false, esEspacio: false, clave: cLado.toString(), tipoEntrada: entradaGlobal, equivalentes: [], longitud: cLado.toString().length },
            { id: 'p2_t7', texto: ' = ', esEstatico: true, esEspacio: false, clave: '', tipoEntrada: entradaGlobal, equivalentes: [], longitud: 3 },
            { id: 'p2_t8', texto: p.toString(), esEstatico: false, esEspacio: false, clave: p.toString(), tipoEntrada: entradaGlobal, equivalentes: [], longitud: p.toString().length },
          ],
        },
        {
          id: 'p3',
          titulo: 'Sustitución en el área',
          latexCompleto: `A = (${b} · ${h}) / 2 = ${producto} / 2`,
          tokens: [
            { id: 'p3_t1', texto: 'A = (', esEstatico: true, esEspacio: false, clave: '', tipoEntrada: entradaGlobal, equivalentes: [], longitud: 5 },
            { id: 'p3_t2', texto: b.toString(), esEstatico: false, esEspacio: false, clave: b.toString(), tipoEntrada: entradaGlobal, equivalentes: [], longitud: b.toString().length },
            { id: 'p3_t3', texto: ' · ', esEstatico: true, esEspacio: false, clave: '', tipoEntrada: entradaGlobal, equivalentes: [], longitud: 3 },
            { id: 'p3_t4', texto: h.toString(), esEstatico: false, esEspacio: false, clave: h.toString(), tipoEntrada: entradaGlobal, equivalentes: [], longitud: h.toString().length },
            { id: 'p3_t5', texto: ') / 2 = ', esEstatico: true, esEspacio: false, clave: '', tipoEntrada: entradaGlobal, equivalentes: [], longitud: 8 },
            { id: 'p3_t6', texto: producto.toString(), esEstatico: false, esEspacio: false, clave: producto.toString(), tipoEntrada: entradaGlobal, equivalentes: [], longitud: producto.toString().length },
            { id: 'p3_t7', texto: ' / 2', esEstatico: true, esEspacio: false, clave: '', tipoEntrada: entradaGlobal, equivalentes: [], longitud: 4 },
          ],
        },
        {
          id: 'p4',
          titulo: 'Área calculada',
          latexCompleto: `A = ${area}`,
          tokens: [
            { id: 'p4_t1', texto: 'A = ', esEstatico: true, esEspacio: false, clave: '', tipoEntrada: entradaGlobal, equivalentes: [], longitud: 4 },
            { id: 'p4_t2', texto: area.toString(), esEstatico: false, esEspacio: false, clave: area.toString(), tipoEntrada: entradaGlobal, equivalentes: [], longitud: area.toString().length },
          ],
        },
      ];
    },
    presetsAyuda: {
      guiado: (tokens) => {
        const targets = new Set(['p2_t2', 'p2_t4', 'p2_t8', 'p3_t2', 'p3_t4', 'p4_t2']);
        tokens.forEach((t) => { if (targets.has(t.id)) t.esEspacio = true; });
      },
      medio: (tokens) => {
        const targets = new Set(['p2_t8', 'p4_t2']);
        tokens.forEach((t) => { if (targets.has(t.id)) t.esEspacio = true; });
      },
      final: (tokens) => {
        const targets = new Set(['p4_t2']);
        tokens.forEach((t) => { if (targets.has(t.id)) t.esEspacio = true; });
      },
    },
  },
  {
    id: 'area_trapecio',
    nombre: 'Trapecio — Área',
    categoria: 'Geometría Plana',
    latexReferencia: 'A = (B + b) · h / 2',
    enunciadoPlantilla: (d) =>
      `Calcula el área de un trapecio con base mayor B = ${d.B ?? 10} cm, base menor b = ${d.b ?? 6} cm y altura h = ${d.h ?? 4} cm.`,
    datosDefecto: [
      { clave: 'B', nombre: 'Base mayor B', valor: 10, rango: [6, 16] },
      { clave: 'b', nombre: 'Base menor b', valor: 6, rango: [2, 10] },
      { clave: 'h', nombre: 'Altura h', valor: 4, rango: [2, 8] },
    ],
    generarPasos: (d, entradaGlobal) => {
      const B = d.B ?? 10;
      const b = d.b ?? 6;
      const h = d.h ?? 4;
      const sumaBases = B + b;
      const prod = sumaBases * h;
      const area = prod / 2;

      return [
        {
          id: 'p1',
          titulo: 'Fórmula del área del trapecio',
          latexCompleto: 'A = (B + b) · h / 2',
          tokens: [
            { id: 'p1_t1', texto: 'A = (B + b) · h / 2', esEstatico: true, esEspacio: false, clave: '', tipoEntrada: entradaGlobal, equivalentes: [], longitud: 18 },
          ],
        },
        {
          id: 'p2',
          titulo: 'Sustitución de bases y altura',
          latexCompleto: `A = (${B} + ${b}) · ${h} / 2`,
          tokens: [
            { id: 'p2_t1', texto: 'A = (', esEstatico: true, esEspacio: false, clave: '', tipoEntrada: entradaGlobal, equivalentes: [], longitud: 5 },
            { id: 'p2_t2', texto: B.toString(), esEstatico: false, esEspacio: false, clave: B.toString(), tipoEntrada: entradaGlobal, equivalentes: [], longitud: B.toString().length },
            { id: 'p2_t3', texto: ' + ', esEstatico: true, esEspacio: false, clave: '', tipoEntrada: entradaGlobal, equivalentes: [], longitud: 3 },
            { id: 'p2_t4', texto: b.toString(), esEstatico: false, esEspacio: false, clave: b.toString(), tipoEntrada: entradaGlobal, equivalentes: [], longitud: b.toString().length },
            { id: 'p2_t5', texto: ') · ', esEstatico: true, esEspacio: false, clave: '', tipoEntrada: entradaGlobal, equivalentes: [], longitud: 4 },
            { id: 'p2_t6', texto: h.toString(), esEstatico: false, esEspacio: false, clave: h.toString(), tipoEntrada: entradaGlobal, equivalentes: [], longitud: h.toString().length },
            { id: 'p2_t7', texto: ' / 2', esEstatico: true, esEspacio: false, clave: '', tipoEntrada: entradaGlobal, equivalentes: [], longitud: 4 },
          ],
        },
        {
          id: 'p3',
          titulo: 'Suma y multiplicación en el numerador',
          latexCompleto: `= (${sumaBases} · ${h}) / 2 = ${prod} / 2`,
          tokens: [
            { id: 'p3_t1', texto: `= (${sumaBases} · ${h}) / 2 = `, esEstatico: true, esEspacio: false, clave: '', tipoEntrada: entradaGlobal, equivalentes: [], longitud: 16 },
            { id: 'p3_t2', texto: prod.toString(), esEstatico: false, esEspacio: false, clave: prod.toString(), tipoEntrada: entradaGlobal, equivalentes: [], longitud: prod.toString().length },
            { id: 'p3_t3', texto: ' / 2', esEstatico: true, esEspacio: false, clave: '', tipoEntrada: entradaGlobal, equivalentes: [], longitud: 4 },
          ],
        },
        {
          id: 'p4',
          titulo: 'Área calculada',
          latexCompleto: `A = ${area}`,
          tokens: [
            { id: 'p4_t1', texto: 'A = ', esEstatico: true, esEspacio: false, clave: '', tipoEntrada: entradaGlobal, equivalentes: [], longitud: 4 },
            { id: 'p4_t2', texto: area.toString(), esEstatico: false, esEspacio: false, clave: area.toString(), tipoEntrada: entradaGlobal, equivalentes: [], longitud: area.toString().length },
          ],
        },
      ];
    },
    presetsAyuda: {
      guiado: (tokens) => {
        const targets = new Set(['p2_t2', 'p2_t4', 'p2_t6', 'p3_t2', 'p4_t2']);
        tokens.forEach((t) => { if (targets.has(t.id)) t.esEspacio = true; });
      },
      medio: (tokens) => {
        const targets = new Set(['p3_t2', 'p4_t2']);
        tokens.forEach((t) => { if (targets.has(t.id)) t.esEspacio = true; });
      },
      final: (tokens) => {
        const targets = new Set(['p4_t2']);
        tokens.forEach((t) => { if (targets.has(t.id)) t.esEspacio = true; });
      },
    },
  },
  {
    id: 'area_rombo',
    nombre: 'Rombo — Perímetro y Área',
    categoria: 'Geometría Plana',
    latexReferencia: 'P = 4l,   A = (D · d) / 2',
    enunciadoPlantilla: (d) =>
      `Calcula el perímetro y área de un rombo de lado l = ${d.l ?? 5} cm, diagonal mayor D = ${d.D ?? 8} cm y diagonal menor d = ${d.d ?? 6} cm.`,
    datosDefecto: [
      { clave: 'l', nombre: 'Lado l', valor: 5, rango: [3, 10] },
      { clave: 'D', nombre: 'Diagonal mayor D', valor: 8, rango: [6, 16] },
      { clave: 'd', nombre: 'Diagonal menor d', valor: 6, rango: [4, 12] },
    ],
    generarPasos: (d, entradaGlobal) => {
      const l = d.l ?? 5;
      const D = d.D ?? 8;
      const diagMenor = d.d ?? 6;
      const p = 4 * l;
      const prod = D * diagMenor;
      const area = prod / 2;

      return [
        {
          id: 'p1',
          titulo: 'Fórmulas del rombo',
          latexCompleto: 'P = 4l,   A = (D · d) / 2',
          tokens: [
            { id: 'p1_t1', texto: 'P = 4l,   A = (D · d) / 2', esEstatico: true, esEspacio: false, clave: '', tipoEntrada: entradaGlobal, equivalentes: [], longitud: 24 },
          ],
        },
        {
          id: 'p2',
          titulo: 'Cálculo del perímetro',
          latexCompleto: `P = 4(${l}) = ${p}`,
          tokens: [
            { id: 'p2_t1', texto: 'P = 4(', esEstatico: true, esEspacio: false, clave: '', tipoEntrada: entradaGlobal, equivalentes: [], longitud: 6 },
            { id: 'p2_t2', texto: l.toString(), esEstatico: false, esEspacio: false, clave: l.toString(), tipoEntrada: entradaGlobal, equivalentes: [], longitud: l.toString().length },
            { id: 'p2_t3', texto: ') = ', esEstatico: true, esEspacio: false, clave: '', tipoEntrada: entradaGlobal, equivalentes: [], longitud: 4 },
            { id: 'p2_t4', texto: p.toString(), esEstatico: false, esEspacio: false, clave: p.toString(), tipoEntrada: entradaGlobal, equivalentes: [], longitud: p.toString().length },
          ],
        },
        {
          id: 'p3',
          titulo: 'Sustitución en el área',
          latexCompleto: `A = (${D} · ${diagMenor}) / 2 = ${prod} / 2`,
          tokens: [
            { id: 'p3_t1', texto: 'A = (', esEstatico: true, esEspacio: false, clave: '', tipoEntrada: entradaGlobal, equivalentes: [], longitud: 5 },
            { id: 'p3_t2', texto: D.toString(), esEstatico: false, esEspacio: false, clave: D.toString(), tipoEntrada: entradaGlobal, equivalentes: [], longitud: D.toString().length },
            { id: 'p3_t3', texto: ' · ', esEstatico: true, esEspacio: false, clave: '', tipoEntrada: entradaGlobal, equivalentes: [], longitud: 3 },
            { id: 'p3_t4', texto: diagMenor.toString(), esEstatico: false, esEspacio: false, clave: diagMenor.toString(), tipoEntrada: entradaGlobal, equivalentes: [], longitud: diagMenor.toString().length },
            { id: 'p3_t5', texto: ') / 2 = ', esEstatico: true, esEspacio: false, clave: '', tipoEntrada: entradaGlobal, equivalentes: [], longitud: 8 },
            { id: 'p3_t6', texto: prod.toString(), esEstatico: false, esEspacio: false, clave: prod.toString(), tipoEntrada: entradaGlobal, equivalentes: [], longitud: prod.toString().length },
            { id: 'p3_t7', texto: ' / 2', esEstatico: true, esEspacio: false, clave: '', tipoEntrada: entradaGlobal, equivalentes: [], longitud: 4 },
          ],
        },
        {
          id: 'p4',
          titulo: 'Área calculada',
          latexCompleto: `A = ${area}`,
          tokens: [
            { id: 'p4_t1', texto: 'A = ', esEstatico: true, esEspacio: false, clave: '', tipoEntrada: entradaGlobal, equivalentes: [], longitud: 4 },
            { id: 'p4_t2', texto: area.toString(), esEstatico: false, esEspacio: false, clave: area.toString(), tipoEntrada: entradaGlobal, equivalentes: [], longitud: area.toString().length },
          ],
        },
      ];
    },
    presetsAyuda: {
      guiado: (tokens) => {
        const targets = new Set(['p2_t2', 'p2_t4', 'p3_t2', 'p3_t4', 'p4_t2']);
        tokens.forEach((t) => { if (targets.has(t.id)) t.esEspacio = true; });
      },
      medio: (tokens) => {
        const targets = new Set(['p2_t4', 'p4_t2']);
        tokens.forEach((t) => { if (targets.has(t.id)) t.esEspacio = true; });
      },
      final: (tokens) => {
        const targets = new Set(['p4_t2']);
        tokens.forEach((t) => { if (targets.has(t.id)) t.esEspacio = true; });
      },
    },
  },
  {
    id: 'area_poligono_regular',
    nombre: 'Polígono regular — Perímetro y Área',
    categoria: 'Geometría Plana',
    latexReferencia: 'P = n · l,   A = (P · a) / 2',
    enunciadoPlantilla: (d) =>
      `Calcula el perímetro y área de un polígono regular de ${d.n ?? 5} lados, con lado l = ${d.l ?? 6} cm y apotema a = ${d.a ?? 4.1} cm.`,
    datosDefecto: [
      { clave: 'n', nombre: 'Número de lados n', valor: 5, rango: [5, 8] },
      { clave: 'l', nombre: 'Longitud del lado l', valor: 6, rango: [3, 10] },
      { clave: 'a', nombre: 'Apotema a', valor: 4.1, rango: [2, 8] },
    ],
    generarPasos: (d, entradaGlobal) => {
      const n = d.n ?? 5;
      const l = d.l ?? 6;
      const ap = d.a ?? 4.1;
      const p = n * l;
      const prod = Math.round(p * ap * 100) / 100;
      const area = Math.round((prod / 2) * 100) / 100;

      return [
        {
          id: 'p1',
          titulo: 'Fórmulas del polígono regular',
          latexCompleto: 'P = n · l,   A = (P · a) / 2',
          tokens: [
            { id: 'p1_t1', texto: 'P = n · l,   A = (P · a) / 2', esEstatico: true, esEspacio: false, clave: '', tipoEntrada: entradaGlobal, equivalentes: [], longitud: 26 },
          ],
        },
        {
          id: 'p2',
          titulo: 'Cálculo del perímetro',
          latexCompleto: `P = (${n}) · (${l}) = ${p}`,
          tokens: [
            { id: 'p2_t1', texto: 'P = (', esEstatico: true, esEspacio: false, clave: '', tipoEntrada: entradaGlobal, equivalentes: [], longitud: 5 },
            { id: 'p2_t2', texto: n.toString(), esEstatico: false, esEspacio: false, clave: n.toString(), tipoEntrada: entradaGlobal, equivalentes: [], longitud: n.toString().length },
            { id: 'p2_t3', texto: ') · (', esEstatico: true, esEspacio: false, clave: '', tipoEntrada: entradaGlobal, equivalentes: [], longitud: 5 },
            { id: 'p2_t4', texto: l.toString(), esEstatico: false, esEspacio: false, clave: l.toString(), tipoEntrada: entradaGlobal, equivalentes: [], longitud: l.toString().length },
            { id: 'p2_t5', texto: ') = ', esEstatico: true, esEspacio: false, clave: '', tipoEntrada: entradaGlobal, equivalentes: [], longitud: 4 },
            { id: 'p2_t6', texto: p.toString(), esEstatico: false, esEspacio: false, clave: p.toString(), tipoEntrada: entradaGlobal, equivalentes: [], longitud: p.toString().length },
          ],
        },
        {
          id: 'p3',
          titulo: 'Sustitución en el área',
          latexCompleto: `A = (${p} · ${ap}) / 2 = ${prod} / 2`,
          tokens: [
            { id: 'p3_t1', texto: 'A = (', esEstatico: true, esEspacio: false, clave: '', tipoEntrada: entradaGlobal, equivalentes: [], longitud: 5 },
            { id: 'p3_t2', texto: p.toString(), esEstatico: false, esEspacio: false, clave: p.toString(), tipoEntrada: entradaGlobal, equivalentes: [], longitud: p.toString().length },
            { id: 'p3_t3', texto: ' · ', esEstatico: true, esEspacio: false, clave: '', tipoEntrada: entradaGlobal, equivalentes: [], longitud: 3 },
            { id: 'p3_t4', texto: ap.toString(), esEstatico: false, esEspacio: false, clave: ap.toString(), tipoEntrada: entradaGlobal, equivalentes: [], longitud: ap.toString().length },
            { id: 'p3_t5', texto: ') / 2 = ', esEstatico: true, esEspacio: false, clave: '', tipoEntrada: entradaGlobal, equivalentes: [], longitud: 8 },
            { id: 'p3_t6', texto: prod.toString(), esEstatico: false, esEspacio: false, clave: prod.toString(), tipoEntrada: entradaGlobal, equivalentes: [], longitud: prod.toString().length },
            { id: 'p3_t7', texto: ' / 2', esEstatico: true, esEspacio: false, clave: '', tipoEntrada: entradaGlobal, equivalentes: [], longitud: 4 },
          ],
        },
        {
          id: 'p4',
          titulo: 'Área calculada',
          latexCompleto: `A = ${area}`,
          tokens: [
            { id: 'p4_t1', texto: 'A = ', esEstatico: true, esEspacio: false, clave: '', tipoEntrada: entradaGlobal, equivalentes: [], longitud: 4 },
            { id: 'p4_t2', texto: area.toString(), esEstatico: false, esEspacio: false, clave: area.toString(), tipoEntrada: entradaGlobal, equivalentes: [], longitud: area.toString().length },
          ],
        },
      ];
    },
    presetsAyuda: {
      guiado: (tokens) => {
        const targets = new Set(['p2_t2', 'p2_t4', 'p2_t6', 'p3_t2', 'p3_t4', 'p4_t2']);
        tokens.forEach((t) => { if (targets.has(t.id)) t.esEspacio = true; });
      },
      medio: (tokens) => {
        const targets = new Set(['p2_t6', 'p4_t2']);
        tokens.forEach((t) => { if (targets.has(t.id)) t.esEspacio = true; });
      },
      final: (tokens) => {
        const targets = new Set(['p4_t2']);
        tokens.forEach((t) => { if (targets.has(t.id)) t.esEspacio = true; });
      },
    },
  },
  {
    id: 'area_circulo',
    nombre: 'Círculo — Perímetro y Área',
    categoria: 'Geometría Plana',
    latexReferencia: 'P = 2πr,   A = πr²',
    enunciadoPlantilla: (d) =>
      `Calcula el perímetro/circunferencia (P) y el área (A) de un círculo cuyo radio es r = ${d.r ?? 5} cm.`,
    datosDefecto: [
      { clave: 'r', nombre: 'Radio r', valor: 5, rango: [2, 12] },
    ],
    generarPasos: (d, entradaGlobal) => {
      const r = d.r ?? 5;
      const r2 = r * r;
      const perimetro = Math.round(2 * Math.PI * r * 100) / 100;
      const area = Math.round(Math.PI * r2 * 100) / 100;

      return [
        {
          id: 'p1',
          titulo: 'Fórmulas de círculo',
          latexCompleto: 'P = 2πr,   A = πr²',
          tokens: [
            { id: 'p1_t1', texto: 'P = 2πr,   A = πr²', esEstatico: true, esEspacio: false, clave: '', tipoEntrada: entradaGlobal, equivalentes: [], longitud: 18 },
          ],
        },
        {
          id: 'p2',
          titulo: 'Perímetro (circunferencia)',
          latexCompleto: `P = 2π(${r}) ≈ ${perimetro}`,
          tokens: [
            { id: 'p2_t1', texto: 'P = 2π(', esEstatico: true, esEspacio: false, clave: '', tipoEntrada: entradaGlobal, equivalentes: [], longitud: 7 },
            { id: 'p2_t2', texto: r.toString(), esEstatico: false, esEspacio: false, clave: r.toString(), tipoEntrada: entradaGlobal, equivalentes: [], longitud: r.toString().length },
            { id: 'p2_t3', texto: ') ≈ ', esEstatico: true, esEspacio: false, clave: '', tipoEntrada: entradaGlobal, equivalentes: [], longitud: 4 },
            { id: 'p2_t4', texto: perimetro.toString(), esEstatico: false, esEspacio: false, clave: perimetro.toString(), tipoEntrada: entradaGlobal, equivalentes: [], longitud: perimetro.toString().length },
          ],
        },
        {
          id: 'p3',
          titulo: 'Sustitución en el área',
          latexCompleto: `A = π(${r})² = π(${r2})`,
          tokens: [
            { id: 'p3_t1', texto: 'A = π(', esEstatico: true, esEspacio: false, clave: '', tipoEntrada: entradaGlobal, equivalentes: [], longitud: 6 },
            { id: 'p3_t2', texto: r.toString(), esEstatico: false, esEspacio: false, clave: r.toString(), tipoEntrada: entradaGlobal, equivalentes: [], longitud: r.toString().length },
            { id: 'p3_t3', texto: ')² = π(', esEstatico: true, esEspacio: false, clave: '', tipoEntrada: entradaGlobal, equivalentes: [], longitud: 7 },
            { id: 'p3_t4', texto: r2.toString(), esEstatico: false, esEspacio: false, clave: r2.toString(), tipoEntrada: entradaGlobal, equivalentes: [`${r}²`], longitud: r2.toString().length },
            { id: 'p3_t5', texto: ')', esEstatico: true, esEspacio: false, clave: '', tipoEntrada: entradaGlobal, equivalentes: [], longitud: 1 },
          ],
        },
        {
          id: 'p4',
          titulo: 'Área calculada',
          latexCompleto: `A ≈ ${area}`,
          tokens: [
            { id: 'p4_t1', texto: 'A ≈ ', esEstatico: true, esEspacio: false, clave: '', tipoEntrada: entradaGlobal, equivalentes: [], longitud: 4 },
            { id: 'p4_t2', texto: area.toString(), esEstatico: false, esEspacio: false, clave: area.toString(), tipoEntrada: entradaGlobal, equivalentes: [], longitud: area.toString().length },
          ],
        },
      ];
    },
    presetsAyuda: {
      guiado: (tokens) => {
        const targets = new Set(['p2_t2', 'p2_t4', 'p3_t2', 'p3_t4', 'p4_t2']);
        tokens.forEach((t) => { if (targets.has(t.id)) t.esEspacio = true; });
      },
      medio: (tokens) => {
        const targets = new Set(['p2_t4', 'p4_t2']);
        tokens.forEach((t) => { if (targets.has(t.id)) t.esEspacio = true; });
      },
      final: (tokens) => {
        const targets = new Set(['p4_t2']);
        tokens.forEach((t) => { if (targets.has(t.id)) t.esEspacio = true; });
      },
    },
  },
  {
    id: 'formula_heron',
    nombre: 'Fórmula de Herón (Área del triángulo)',
    categoria: 'Geometría Plana',
    latexReferencia: 's = (a+b+c)/2,   A = √(s(s-a)(s-b)(s-c))',
    enunciadoPlantilla: (d) =>
      `Calcula el semiperímetro (s) y el área (A) de un triángulo con lados a = ${d.a ?? 5} cm, b = ${d.b ?? 6} cm y c = ${d.c ?? 7} cm mediante la fórmula de Herón.`,
    datosDefecto: [
      { clave: 'a', nombre: 'Lado a', valor: 5, rango: [3, 10] },
      { clave: 'b', nombre: 'Lado b', valor: 6, rango: [4, 11] },
      { clave: 'c', nombre: 'Lado c', valor: 7, rango: [5, 12] },
    ],
    generarPasos: (d, entradaGlobal) => {
      const a = d.a ?? 5;
      const b = d.b ?? 6;
      const c = d.c ?? 7;
      const sumaLados = a + b + c;
      const s = sumaLados / 2;
      const sa = s - a;
      const sb = s - b;
      const sc = s - c;
      const radicando = Math.max(0, s * sa * sb * sc);
      const area = Math.round(Math.sqrt(radicando) * 100) / 100;

      return [
        {
          id: 'p1',
          titulo: 'Fórmulas de Herón',
          latexCompleto: 's = (a + b + c) / 2,   A = √(s(s - a)(s - b)(s - c))',
          tokens: [
            { id: 'p1_t1', texto: 's = (a + b + c) / 2,   A = √(s(s - a)(s - b)(s - c))', esEstatico: true, esEspacio: false, clave: '', tipoEntrada: entradaGlobal, equivalentes: [], longitud: 45 },
          ],
        },
        {
          id: 'p2',
          titulo: 'Cálculo del semiperímetro (s)',
          latexCompleto: `s = (${a} + ${b} + ${c}) / 2 = ${sumaLados} / 2 = ${s}`,
          tokens: [
            { id: 'p2_t1', texto: 's = (', esEstatico: true, esEspacio: false, clave: '', tipoEntrada: entradaGlobal, equivalentes: [], longitud: 5 },
            { id: 'p2_t2', texto: a.toString(), esEstatico: false, esEspacio: false, clave: a.toString(), tipoEntrada: entradaGlobal, equivalentes: [], longitud: a.toString().length },
            { id: 'p2_t3', texto: ' + ', esEstatico: true, esEspacio: false, clave: '', tipoEntrada: entradaGlobal, equivalentes: [], longitud: 3 },
            { id: 'p2_t4', texto: b.toString(), esEstatico: false, esEspacio: false, clave: b.toString(), tipoEntrada: entradaGlobal, equivalentes: [], longitud: b.toString().length },
            { id: 'p2_t5', texto: ' + ', esEstatico: true, esEspacio: false, clave: '', tipoEntrada: entradaGlobal, equivalentes: [], longitud: 3 },
            { id: 'p2_t6', texto: c.toString(), esEstatico: false, esEspacio: false, clave: c.toString(), tipoEntrada: entradaGlobal, equivalentes: [], longitud: c.toString().length },
            { id: 'p2_t7', texto: ') / 2 = ', esEstatico: true, esEspacio: false, clave: '', tipoEntrada: entradaGlobal, equivalentes: [], longitud: 8 },
            { id: 'p2_t8', texto: s.toString(), esEstatico: false, esEspacio: false, clave: s.toString(), tipoEntrada: entradaGlobal, equivalentes: [], longitud: s.toString().length },
          ],
        },
        {
          id: 'p3',
          titulo: 'Sustitución en el radical',
          latexCompleto: `A = √(${s}(${sa})(${sb})(${sc}))`,
          tokens: [
            { id: 'p3_t1', texto: 'A = √(', esEstatico: true, esEspacio: false, clave: '', tipoEntrada: entradaGlobal, equivalentes: [], longitud: 6 },
            { id: 'p3_t2', texto: s.toString(), esEstatico: false, esEspacio: false, clave: s.toString(), tipoEntrada: entradaGlobal, equivalentes: [], longitud: s.toString().length },
            { id: 'p3_t3', texto: ` · (${sa}) · (${sb}) · (${sc})`, esEstatico: false, esEspacio: false, clave: `${sa}*${sb}*${sc}`, tipoEntrada: entradaGlobal, equivalentes: [], longitud: 16 },
            { id: 'p3_t4', texto: ')', esEstatico: true, esEspacio: false, clave: '', tipoEntrada: entradaGlobal, equivalentes: [], longitud: 1 },
          ],
        },
        {
          id: 'p4',
          titulo: 'Producto del radicando y raíz',
          latexCompleto: `A = √${radicando} ≈ ${area}`,
          tokens: [
            { id: 'p4_t1', texto: 'A = √', esEstatico: true, esEspacio: false, clave: '', tipoEntrada: entradaGlobal, equivalentes: [], longitud: 5 },
            { id: 'p4_t2', texto: radicando.toString(), esEstatico: false, esEspacio: false, clave: radicando.toString(), tipoEntrada: entradaGlobal, equivalentes: [], longitud: radicando.toString().length },
            { id: 'p4_t3', texto: ' ≈ ', esEstatico: true, esEspacio: false, clave: '', tipoEntrada: entradaGlobal, equivalentes: [], longitud: 3 },
            { id: 'p4_t4', texto: area.toString(), esEstatico: false, esEspacio: false, clave: area.toString(), tipoEntrada: entradaGlobal, equivalentes: [], longitud: area.toString().length },
          ],
        },
      ];
    },
    presetsAyuda: {
      guiado: (tokens) => {
        const targets = new Set(['p2_t2', 'p2_t8', 'p3_t2', 'p4_t2', 'p4_t4']);
        tokens.forEach((t) => { if (targets.has(t.id)) t.esEspacio = true; });
      },
      medio: (tokens) => {
        const targets = new Set(['p2_t8', 'p4_t4']);
        tokens.forEach((t) => { if (targets.has(t.id)) t.esEspacio = true; });
      },
      final: (tokens) => {
        const targets = new Set(['p4_t4']);
        tokens.forEach((t) => { if (targets.has(t.id)) t.esEspacio = true; });
      },
    },
  },
  {
    id: 'suma_angulos_poligono',
    nombre: 'Suma de ángulos interiores de un polígono',
    categoria: 'Geometría Plana',
    latexReferencia: 'S = 180° · (n - 2)',
    enunciadoPlantilla: (d) =>
      `Calcula la suma total de los ángulos interiores (S) de un polígono regular de ${d.n ?? 5} lados.`,
    datosDefecto: [
      { clave: 'n', nombre: 'Número de lados n', valor: 5, rango: [3, 12] },
    ],
    generarPasos: (d, entradaGlobal) => {
      const n = d.n ?? 5;
      const nMenos2 = n - 2;
      const sumaTotal = 180 * nMenos2;

      return [
        {
          id: 'p1',
          titulo: 'Fórmula de la suma de ángulos',
          latexCompleto: 'S = 180° · (n - 2)',
          tokens: [
            { id: 'p1_t1', texto: 'S = 180° · (n - 2)', esEstatico: true, esEspacio: false, clave: '', tipoEntrada: entradaGlobal, equivalentes: [], longitud: 18 },
          ],
        },
        {
          id: 'p2',
          titulo: 'Sustitución del número de lados',
          latexCompleto: `S = 180° · (${n} - 2)`,
          tokens: [
            { id: 'p2_t1', texto: 'S = 180° · (', esEstatico: true, esEspacio: false, clave: '', tipoEntrada: entradaGlobal, equivalentes: [], longitud: 12 },
            { id: 'p2_t2', texto: n.toString(), esEstatico: false, esEspacio: false, clave: n.toString(), tipoEntrada: entradaGlobal, equivalentes: [], longitud: n.toString().length },
            { id: 'p2_t3', texto: ' - 2)', esEstatico: true, esEspacio: false, clave: '', tipoEntrada: entradaGlobal, equivalentes: [], longitud: 5 },
          ],
        },
        {
          id: 'p3',
          titulo: 'Resta y multiplicación',
          latexCompleto: `= 180° · (${nMenos2})`,
          tokens: [
            { id: 'p3_t1', texto: '= 180° · (', esEstatico: true, esEspacio: false, clave: '', tipoEntrada: entradaGlobal, equivalentes: [], longitud: 10 },
            { id: 'p3_t2', texto: nMenos2.toString(), esEstatico: false, esEspacio: false, clave: nMenos2.toString(), tipoEntrada: entradaGlobal, equivalentes: [], longitud: nMenos2.toString().length },
            { id: 'p3_t3', texto: ')', esEstatico: true, esEspacio: false, clave: '', tipoEntrada: entradaGlobal, equivalentes: [], longitud: 1 },
          ],
        },
        {
          id: 'p4',
          titulo: 'Suma de ángulos interiores',
          latexCompleto: `S = ${sumaTotal}°`,
          tokens: [
            { id: 'p4_t1', texto: 'S = ', esEstatico: true, esEspacio: false, clave: '', tipoEntrada: entradaGlobal, equivalentes: [], longitud: 4 },
            { id: 'p4_t2', texto: sumaTotal.toString(), esEstatico: false, esEspacio: false, clave: sumaTotal.toString(), tipoEntrada: entradaGlobal, equivalentes: [], longitud: sumaTotal.toString().length },
            { id: 'p4_t3', texto: '°', esEstatico: true, esEspacio: false, clave: '', tipoEntrada: entradaGlobal, equivalentes: [], longitud: 1 },
          ],
        },
      ];
    },
    presetsAyuda: {
      guiado: (tokens) => {
        const targets = new Set(['p2_t2', 'p3_t2', 'p4_t2']);
        tokens.forEach((t) => { if (targets.has(t.id)) t.esEspacio = true; });
      },
      medio: (tokens) => {
        const targets = new Set(['p3_t2', 'p4_t2']);
        tokens.forEach((t) => { if (targets.has(t.id)) t.esEspacio = true; });
      },
      final: (tokens) => {
        const targets = new Set(['p4_t2']);
        tokens.forEach((t) => { if (targets.has(t.id)) t.esEspacio = true; });
      },
    },
  },
];

/* ──────────────────────────────────────────────────────────────────────────
   HELPERS DEL MOTOR
   ────────────────────────────────────────────────────────────────────────── */

export function buscarDefinicionFormula(id: string): DefinicionFormula {
  return CATALOGO_FORMULAS.find((f) => f.id === id) || CATALOGO_FORMULAS[0];
}

/** Genera variantes aleatorias dentro de los rangos definidos por el docente */
export function generarVariantesAleatorias(
  formula: DefinicionFormula,
  cantidad = 3
): { datos: Record<string, number>; resultadoFinal: string }[] {
  const variantes: { datos: Record<string, number>; resultadoFinal: string }[] = [];

  for (let i = 0; i < cantidad; i++) {
    const datosVar: Record<string, number> = {};
    formula.datosDefecto.forEach((d) => {
      const min = d.rango ? d.rango[0] : d.valor;
      const max = d.rango ? d.rango[1] : d.valor + 5;
      datosVar[d.clave] = Math.floor(Math.random() * (max - min + 1)) + min;
    });

    const pasos = formula.generarPasos(datosVar, 'numerico');
    const ultimoPaso = pasos[pasos.length - 1];
    const ultimoToken = ultimoPaso.tokens[ultimoPaso.tokens.length - 1];

    variantes.push({
      datos: datosVar,
      resultadoFinal: ultimoToken.clave || ultimoToken.texto,
    });
  }

  return variantes;
}

/**
 * Convierte el modelo de pasos matemáticos generados al formato canónico
 * `PasoProcedimiento[]` que CIELO almacena en base de datos y consume en el Portal.
 */
export function exportarAPasosCanónicos(pasos: PasoMatematicoGenerado[]): PasoProcedimiento[] {
  return pasos.map((paso) => {
    let texto = '';
    const espacios: { respuesta: string; pista?: string }[] = [];

    paso.tokens.forEach((token) => {
      if (token.esEspacio) {
        texto += '[ ]';
        espacios.push({
          respuesta: token.clave,
          pista: token.equivalentes.length > 0 ? `Equivalentes: ${token.equivalentes.join(', ')}` : undefined,
        });
      } else {
        texto += token.texto;
      }
    });

    return {
      texto,
      espacios,
    };
  });
}
