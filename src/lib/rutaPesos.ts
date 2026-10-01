/**
 * Aritmética de ponderación de Rutas (compartida por el constructor y el
 * Portal).
 *
 * Este módulo NO decide nada: el servidor es la fuente de verdad y valida lo
 * mismo en ruta_actualizar_pesos. Lo que vive aquí es para que el docente vea
 * la aritmética mientras edita —"te faltan 15 %", "esta actividad aporta
 * 18.4 a la Ficha"— y para decidir qué botón pulsar.
 *
 * Las tres operaciones replicate EXACTAMENTE lo que hace el SQL:
 *
 *   repartir100(n)      ≡ ruta_rebalancear_etapas / ruta_rebalancear_actividades
 *   esExacto(suma)     ≡ ABS(suma - 100) <= 0.005  (ruta_actualizar_pesos)
 *   puntaje            ≡ ruta_actividad_puntaje + ruta_puntajes_ruta
 *
 * La tolerancia de 0.005 no es holgura arbitraria: los porcentajes se guardan
 * con 3 decimales, así que 33.333 × 3 = 99.999 es la misma operación, no un
 * error del docente.
 */

import { TOLERANCIA_PESOS, TOTAL_PESOS } from '../types/rutas';

/* ─────────────────────────────────────────────────────────────────────────
   Porcentajes
   ───────────────────────────────────────────────────────────────────────── */

/** Redondea a los 3 decimales con los que se guarda en la base. */
export function redondearPeso(valor: number): number {
    if (!Number.isFinite(valor)) return 0;
    return Math.trunc(valor * 1000) / 1000;
}

/**
 * Reparte 100 en `cantidad` partes iguales.
 *
 * Todos reciben la parte entera y el ÚLTIMO se queda con el resto. Es la única
 * forma de cerrar en 100 exacto sin que ninguna parte pase de 3 decimales:
 * sin ese resto, 7 actividades a 14.285 % sumarían 99.995 % y una ruta
 * válida quedaría bloqueada.
 */
export function repartir100(cantidad: number): number[] {
    if (!Number.isFinite(cantidad) || cantidad <= 0) return [];

    const base = redondearPeso(TOTAL_PESOS / cantidad);
    const pesos = Array.from({ length: cantidad }, () => base);

    pesos[pesos.length - 1] = redondearPeso(
        TOTAL_PESOS - base * (cantidad - 1),
    );

    return pesos;
}

export function sumarPesos(pesos: readonly number[]): number {
    return pesos.reduce((total, peso) => total + (Number.isFinite(peso) ? peso : 0), 0);
}

/** Cuánto falta para llegar a 100. Siempre >= 0. */
export function faltante(suma: number): number {
    return Math.max(0, redondearPeso(TOTAL_PESOS - suma));
}

/** Cuánto se pasó de 100. Siempre >= 0. */
export function excedente(suma: number): number {
    return Math.max(0, redondearPeso(suma - TOTAL_PESOS));
}

/** La suma vale 100 dentro de la tolerancia de la base. */
export function esExacto(suma: number): boolean {
    return Math.abs(suma - TOTAL_PESOS) <= TOLERANCIA_PESOS;
}

export type EstadoSuma = 'vacio' | 'ok' | 'falta' | 'excede';

/**
 * Estado de una suma de porcentajes, para pintar el mensaje sin repetir el
 * cálculo en cada componente.
 */
export function estadoSuma(suma: number, cantidad: number): EstadoSuma {
    if (cantidad === 0) return 'vacio';
    if (esExacto(suma)) return 'ok';
    return suma > TOTAL_PESOS ? 'excede' : 'falta';
}

/**
 * Texto del problema, o `null` si la suma está bien.
 * `faltan` alimenta el aviso rojo del constructor.
 */
export function mensajeSuma(suma: number, cantidad: number): string | null {
    const estado = estadoSuma(suma, cantidad);
    if (estado === 'vacio') return null;
    if (estado === 'ok') return null;
    if (estado === 'excede') {
        return `Suma ${formatear(suma)} %. Te pasaste ${formatear(excedente(suma))} %: baja algún porcentaje.`;
    }
    return `Suma ${formatear(suma)} %. Faltan ${formatear(faltante(suma))} % para llegar a 100.`;
}

/**
 * Formato para el docente: un decimal alcanza para leer y no ensucia la
 * pantalla con el ruido de los 3 decimales de la base.
 */
export function formatear(valor: number): string {
    if (!Number.isFinite(valor)) return '0';
    return String(Number(valor.toFixed(1)));
}

/**
 * Interpreta lo que el docente escribe en el campo de porcentaje.
 * Devuelve `null` cuando el campo está vacío o no es un número: es preferible
 * no tener valor a tener un 0 silencioso que se guarda como decisión.
 */
export function leerPorcentaje(entrada: string | number): number | null {
    if (entrada === '' || entrada === null || entrada === undefined) return null;
    const n = typeof entrada === 'number' ? entrada : Number(String(entrada).replace(',', '.'));
    if (!Number.isFinite(n)) return null;
    return redondearPeso(Math.min(TOTAL_PESOS, Math.max(0, n)));
}

/* ─────────────────────────────────────────────────────────────────────────
   Puntajes
   ───────────────────────────────────────────────────────────────────────── */

export interface ActividadConPuntaje {
    peso: number;
    puntaje: number;
}

export interface EtapaConPuntaje {
    peso: number;
    actividades: ActividadConPuntaje[];
}

/**
 * Espejo de ruta_puntajes_ruta.
 *
 *   Etapa = Σ(Actividad × pesoActividad / 100)
 *   Ruta  = Σ(Etapa     × pesoEtapa     / 100)
 *
 * Recibe datos que el servidor ya calculó (o estimated localmente con
 * `puntajesDeEjemplo`); no intenta deducir el puntaje de una actividad a
 * partir de las preguntas, porque eso vive en ruta_actividad_puntaje y
 * depende del histórico de intentos del estudiante.
 */
export function calcularPuntajeRuta<T extends EtapaConPuntaje>(etapas: readonly T[]) {
    const porEtapa = etapas.map((etapa) => {
        const puntaje = redondear(
            etapa.actividades.reduce(
                (total, actividad) => total + (actividad.puntaje * actividad.peso) / TOTAL_PESOS,
                0,
            ),
        );
        return {
            ...etapa,
            puntaje,
            aporte: redondear((puntaje * etapa.peso) / TOTAL_PESOS),
        };
    });

    return {
        etapas: porEtapa,
        puntaje: redondear(porEtapa.reduce((total, etapa) => total + etapa.aporte, 0)),
    };
}

function redondear(valor: number): number {
    if (!Number.isFinite(valor)) return 0;
    return Math.round(valor * 100) / 100;
}

/* ─────────────────────────────────────────────────────────────────────────
   Estructura de pesos (la que viaja a ruta_actualizar_pesos)
   ───────────────────────────────────────────────────────────────────────── */

export interface NodoPeso {
    id?: string;
    peso: number;
}

export interface NodoEtapa extends NodoPeso {
    actividades: NodoPeso[];
}

export interface ErrorPesos {
    nivel: 'error' | 'aviso';
    donde: string;
    mensaje: string;
}

/**
 * Traduce las etapas locales al payload de ruta_actualizar_pesos.
 *
 * Una etapa sin `id` todavía no existe en la base (la acaba de crear el
 * constructor en otra llamada) y una actividad sin preguntas todavía puede
 * cambiar: se omiten del payload y el servidor conserva lo que ya tiene, en
 * vez de mandarle un id vacío que lo haría fallar.
 */
export function aPayloadPesos(
    etapas: readonly {
        id?: string;
        titulo: string;
        peso: number;
        actividades: { id?: string; titulo?: string | null; peso: number }[];
    }[],
): { etapas: NodoEtapa[] } {
    return {
        etapas: etapas.map((etapa) => ({
            id: etapa.id,
            peso: etapa.peso,
            actividades: etapa.actividades
                .filter((actividad) => Boolean(actividad.id))
                .map((actividad) => ({ id: actividad.id, peso: actividad.peso })),
        })),
    };
}

/**
 * Revisa la ponderación antes de dejar guardar.
 *
 * Devuelve los mismos objetos que validarRuta para que el constructor pueda
 * mostrar los dos listados en el mismo bloque de "antes de publicar".
 */
export function validarPesos(
    etapas: readonly {
        id?: string;
        titulo: string;
        peso: number;
        actividades: { id?: string; titulo?: string | null; peso: number }[];
    }[],
): ErrorPesos[] {
    const avisos: ErrorPesos[] = [];

    if (etapas.length === 0) return avisos;

    // ── Actividades dentro de cada etapa ──
    etapas.forEach((etapa, i) => {
        const nombre = etapa.titulo?.trim() || `Etapa ${i + 1}`;

        if (etapa.actividades.length === 0) {
            // Sin actividades no hay nada que repartir: lo trata validarRuta.
            return;
        }

        const suma = sumarPesos(etapa.actividades.map((a) => a.peso));
        const problema = mensajeSuma(suma, etapa.actividades.length);
        if (problema) {
            avisos.push({ nivel: 'error', donde: nombre, mensaje: `${problema} (items)` });
        }

        etapa.actividades.forEach((actividad, j) => {
            if (actividad.peso < 0 || actividad.peso > TOTAL_PESOS) {
                avisos.push({
                    nivel: 'error',
                    donde: nombre,
                    mensaje: `${actividad.titulo?.trim() || `Item ${j + 1}`}: el porcentaje debe estar entre 0 y 100.`,
                });
            }
        });
    });

    // ── Etapas dentro de la ruta ──
    const sumaEtapas = sumarPesos(etapas.map((e) => e.peso));
    const problemaRuta = mensajeSuma(sumaEtapas, etapas.length);
    if (problemaRuta) {
        avisos.push({ nivel: 'error', donde: 'Ruta', mensaje: `${problemaRuta} (etapas)` });
    }

    etapas.forEach((etapa, i) => {
        if (etapa.peso < 0 || etapa.peso > TOTAL_PESOS) {
            avisos.push({
                nivel: 'error',
                donde: etapa.titulo?.trim() || `Etapa ${i + 1}`,
                mensaje: 'El porcentaje de la etapa debe estar entre 0 y 100.',
            });
        }
    });

    return avisos;
}

/**
 * Reparte en partes iguales la lista de pesos recibida y devuelve copias con
 * el peso nuevo. Quien lo llama decide si actualiza su estado con el
 * resultado: mantener la función pura es lo que permite preverla desde el
 * constructor sin effects colaterales.
 */
export function repartirEnPartesIguales<T extends NodoPeso>(nodos: readonly T[]): T[] {
    const pesos = repartir100(nodos.length);
    return nodos.map((nodo, i) => ({ ...nodo, peso: pesos[i] }));
}
