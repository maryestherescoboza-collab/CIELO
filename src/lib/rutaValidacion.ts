/**
 * Motor de validacion de Rutas de aprendizaje — lado DOCENTE.
 *
 * Para que sirve: el constructor necesita responder, en vivo, "isalo que
 * escribiste dara correcta?". Eso no puede depender de un viaje de ida y vuelta
 * a la base de datos por cada tecla.
 *
 * Para que NO sirve: en tiempo de juego el veredicto lo decide SIEMPRE
 * `ruta_evaluar_respuesta` en Supabase. Esta copia existe para dar feedback
 * inmediato y para revision; no es una segunda fuente de verdad, y por eso
 * replica exactamente las mismas estrategias.
 *
 * Si alguna vez divergen, la base de datos gana. Ver
 * supabase/migrations/20260926120200_rutas_aprendizaje_motor.sql
 */

import type {
    PasoProcedimiento,
    PreguntaConfig,
    RespuestaRuta,
    TipoActividad,
    TipoRespuesta,
} from '../types/rutas';
import { contarHuecos } from './rutaPasos';

/**
 * Actividades cuya respuesta correcta la DEFINEN las opciones, no un campo de
 * texto. En estas, `config.respuestaEsperada` no existe: el constructor ni
 * siquiera lo muestra, asi que exigirlo en la validacion dejaba al docente
 * bloqueado con "Define la respuesta correcta" sin tener donde escribirla.
 *
 * La unica fuente de verdad es `opciones[].es_correcta`.
 */
const RESPUESTA_EN_OPCIONES: readonly TipoActividad[] = ['opcion_multiple', 'verdadero_falso'];

/* ─────────────────────────────────────────────────────────────────────────
   Normalizacion — espejo de ruta_normalizar_texto
   ───────────────────────────────────────────────────────────────────────── */

export function normalizarTexto(texto: string | null | undefined): string {
    return (texto ?? '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9+\-*/^(). ]+/g, ' ')
        .trim();
}

/* ─────────────────────────────────────────────────────────────────────────
   Numeros — espejo de ruta_parsear_numero
   ───────────────────────────────────────────────────────────────────────── */

const UNIDADES = /\s|°|º|%|cm2|cm²|cm3|cm³|m2|m²|km|kg|ml|cm|mm|gr|g|mt|m|ud|unidades?|metros?|cuadrados?|cúbicos?/gi;

export function parsearNumero(texto: string | null | undefined): number | null {
    if (texto === null || texto === undefined) return null;
    let limpio = texto.replace(UNIDADES, '');

    // La coma decimal solo se acepta si NO hay punto.
    if (!limpio.includes('.') && limpio.includes(',')) {
        limpio = limpio.replace(/,/g, '.');
    } else {
        limpio = limpio.replace(/,/g, '');
    }
    limpio = limpio.trim();

    if (!/^-?\d*\.?\d+$/.test(limpio)) return null;
    const valor = Number(limpio);
    return Number.isFinite(valor) ? valor : null;
}

export function toleranciaEfectiva(esperado: number, config?: PreguntaConfig): number {
    return Math.max(
        config?.toleranciaAbs ?? 0,
        (config?.toleranciaRel ?? 0) * Math.abs(esperado),
    );
}

export function numerosEquivalentes(
    esperado: number | null,
    recibido: number | null,
    config?: PreguntaConfig,
): boolean {
    if (esperado === null || recibido === null) return false;
    return Math.abs(recibido - esperado) <= toleranciaEfectiva(esperado, config);
}

/* ─────────────────────────────────────────────────────────────────────────
   Expresiones — espejo de ruta_evaluar_expresion
   Shunting-yard minimo. NO es un motor algebraico: resuelve + - * / ^ y
   parentesis, que es lo que hace que "2+3" valga como "5".
   ───────────────────────────────────────────────────────────────────────── */

const PRECEDENCIA: Record<string, number> = { '^': 4, '*': 3, '/': 3, '+': 2, '-': 2 };

export function evaluarExpresion(texto: string | null | undefined): number | null {
    if (!texto) return null;
    if (!/[+\-*/^()]/.test(texto)) return null;

    const expr = normalizarTexto(texto);
    if (!expr) return null;

    const nums: number[] = [];
    const ops: string[] = [];
    let ultimo = ' ';

    const aplicar = (op: string): boolean => {
        const b = nums.pop();
        const a = nums.pop();
        if (a === undefined || b === undefined) return false;
        switch (op) {
            case '+': nums.push(a + b); break;
            case '-': nums.push(a - b); break;
            case '*': nums.push(a * b); break;
            case '/':
                if (b === 0) return false;
                nums.push(a / b);
                break;
            case '^': nums.push(Math.pow(a, b)); break;
            default: return false;
        }
        return true;
    };

    for (let i = 0; i < expr.length; ) {
        const car = expr[i];

        if (car === ' ') { i++; continue; }

        if (/[0-9.]/.test(car)) {
            let fin = i;
            while (fin < expr.length && /[0-9.]/.test(expr[fin])) fin++;
            const valor = parsearNumero(expr.slice(i, fin));
            if (valor === null) return null;
            nums.push(valor);
            ultimo = 'n';
            i = fin;
            continue;
        }

        if (car === '+' || car === '-' || car === '*' || car === '/' || car === '^') {
            // Signo unario: primer token, o justo despues de '(' u otro operador.
            // ' ' es el estado inicial, asi que "-3" es unario y no una resta
            // sin operando izquierdo.
            const esperaOperando = ultimo === 'o' || ultimo === '(' || ultimo === ' ';
            const unario = esperaOperando && (car === '+' || car === '-');

            if (unario) {
                if (car === '-') nums.push(0);
            } else {
                // '^' es asociativo por derecha: solo descarga si tiene MAYOR
                // prioridad. El resto, por izquierda.
                while (ops.length > 0 && ops[ops.length - 1] !== '(') {
                    const prioTop = PRECEDENCIA[ops[ops.length - 1]];
                    const prioOp = PRECEDENCIA[car];
                    if (prioTop < prioOp || (prioTop === prioOp && car === '^')) break;
                    const op = ops.pop() as string;
                    if (!aplicar(op)) return null;
                }
                ops.push(car);
            }
            ultimo = 'o';
            i++;
            continue;
        }

        if (car === '(') {
            ops.push('(');
            ultimo = '(';
            i++;
            continue;
        }

        if (car === ')') {
            while (ops.length > 0 && ops[ops.length - 1] !== '(') {
                const op = ops.pop() as string;
                if (!aplicar(op)) return null;
            }
            if (ops.length === 0) return null;   // parentesis sin abrir
            ops.pop();
            ultimo = 'n';
            i++;
            continue;
        }

        return null;   // caracter no permitido
    }

    while (ops.length > 0) {
        const op = ops.pop() as string;
        if (op === '(') return null;             // parentesis sin cerrar
        if (!aplicar(op)) return null;
    }

    return nums.length === 1 ? nums[0] : null;
}

/* ─────────────────────────────────────────────────────────────────────────
   La estrategia: comparar un valor contra un valor esperado
   ───────────────────────────────────────────────────────────────────────── */

export function comparar(
    esperado: string | null | undefined,
    recibido: string | null | undefined,
    tipo: TipoRespuesta,
    config?: PreguntaConfig,
): boolean {
    if (recibido === null || recibido === undefined || recibido.trim() === '') return false;
    if (esperado === null || esperado === undefined) return false;

    switch (tipo) {
        case 'numerica':
            return numerosEquivalentes(parsearNumero(esperado), parsearNumero(recibido), config);

        case 'expresion': {
            const ne = evaluarExpresion(esperado) ?? parsearNumero(esperado);
            const nr = evaluarExpresion(recibido) ?? parsearNumero(recibido);
            return numerosEquivalentes(ne, nr, config);
        }

        case 'booleana': {
            const r = normalizarTexto(recibido);
            const e = normalizarTexto(esperado);
            if (['verdadero', 'true', 'v', 'si', '1'].includes(e)) {
                return ['verdadero', 'true', 'v', 'si', '1'].includes(r);
            }
            if (['falso', 'false', 'f', 'no', '0'].includes(e)) {
                return ['falso', 'false', 'f', 'no', '0'].includes(r);
            }
            return e === r;
        }

        default:
            return normalizarTexto(esperado) === normalizarTexto(recibido);
    }
}

/* ─────────────────────────────────────────────────────────────────────────
   Evaluacion completa de una respuesta
   ───────────────────────────────────────────────────────────────────────── */

export interface ResultadoEvaluacion {
    correcto: boolean;
    parciales?: number;
    totalEspacios?: number;
    detalle?: { paso: number; espacio: number; correcto: boolean }[];
    sugerencia: string;
}

/**
 * Resuelve la respuesta esperada de un espacio desde `config.pasos`,
 * usando indices de 1 base. Devuelve null si no existe: una pregunta mal
 * construida se marca incorrecta, nunca "correcta por defecto".
 */
export function esperadoDeEspacio(
    pasos: PasoProcedimiento[] | undefined,
    paso: number,
    espacio: number,
): string | null {
    const p = pasos?.[paso - 1];
    if (!p) return null;
    const e = p.espacios[espacio - 1];
    return e ? e.respuesta : null;
}

/** Datos de la opcion que hacen falta para validar sin conocer la clave. */
export interface OpcionEvaluable {
    id: string;
    es_correcta: boolean;
    orden: number;
    clave?: string | null;
}

export function evaluarRespuesta(
    tipoRespuesta: TipoRespuesta,
    config: PreguntaConfig,
    respuesta: RespuestaRuta,
    opciones: OpcionEvaluable[] = [],
): ResultadoEvaluacion {
    // ── Procedimiento: un veredicto por espacio ──
    if ('espacios' in respuesta && respuesta.espacios) {
        const pasos = config.pasos ?? [];
        let parciales = 0;
        const detalle: { paso: number; espacio: number; correcto: boolean }[] = [];

        for (const esp of respuesta.espacios) {
            const esperado = esperadoDeEspacio(pasos, esp.paso, esp.espacio);
            const ok = comparar(esperado, esp.valor, tipoRespuesta, config);
            if (ok) parciales++;
            detalle.push({ paso: esp.paso, espacio: esp.espacio, correcto: ok });
        }

        const total = respuesta.espacios.length;
        // Responder solo 2 de 5 espacios correctos no es acertar la pregunta: un
        // envio parcial se cuenta como fallado, no como "a medias".
        const declarado = pasos.reduce((n, p) => n + p.espacios.length, 0);
        const completo = declarado > 0 && total === declarado;
        return {
            correcto: completo && parciales === declarado,
            parciales,
            totalEspacios: declarado,
            detalle,
            sugerencia: `Espacios correctos: ${parciales} de ${declarado}`,
        };
    }

    // ── Opciones: el conjunto debe coincidir exactamente ──
    if ('opcionIds' in respuesta) {
        if (opciones.length === 0) {
            return { correcto: false, sugerencia: 'La pregunta no tiene opciones' };
        }
        const correctas = new Set(opciones.filter((o) => o.es_correcta).map((o) => o.id));
        const elegidas = new Set(respuesta.opcionIds);
        const coincide =
            correctas.size === elegidas.size && [...correctas].every((id) => elegidas.has(id));
        return { correcto: coincide, sugerencia: 'Seleccion de opciones' };
    }

    // ── Orden: la secuencia de claves debe coincidir con el orden correcto ──
    if ('orden' in respuesta) {
        const conClave = opciones.filter((o) => o.clave).sort((a, b) => a.orden - b.orden);
        const esperado = conClave.map((o) => o.clave as string);
        const coincide = esperado.length === respuesta.orden.length
            && esperado.every((v, i) => v === respuesta.orden[i]);
        return { correcto: coincide, sugerencia: 'Orden de los pasos' };
    }

    // ── Escalar ──
    // El `in` explicito es lo que permite a TypeScript descartar los otros
    // miembros de la union: respuesta vacia si no trae `texto`.
    const recibido = 'texto' in respuesta ? respuesta.texto?.trim() : '';
    if (!recibido) {
        return { correcto: false, sugerencia: 'Sin respuesta' };
    }

    const esperados: string[] = [];
    if (config.respuestaEsperada?.trim()) esperados.push(config.respuestaEsperada.trim());
    for (const alt of config.respuestasAceptadas ?? []) {
        const limpio = alt.trim();
        if (limpio && !esperados.includes(limpio)) esperados.push(limpio);
    }

    if (esperados.length === 0) {
        return { correcto: false, sugerencia: 'La pregunta no tiene respuesta esperada' };
    }

    const correcto = esperados.some((e) => comparar(e, recibido, tipoRespuesta, config));
    return { correcto, sugerencia: `Estrategia: ${tipoRespuesta}` };
}

/* ─────────────────────────────────────────────────────────────────────────
   Utilidad para el constructor
   ───────────────────────────────────────────────────────────────────────── */

export interface AvisoPregunta {
    nivel: 'error' | 'aviso';
    mensaje: string;
}

/**
 * Comprueba que una pregunta quedo bien armada. Se muestra en el constructor
 * para que el docente no publique una actividad con claves rotas.
 *
 * La respuesta correcta se busca donde el docente realmente la puede escribir:
 * · en opcion_multiple / verdadero_falso -> en las opciones marcadas. Marcar
 *   una o varias es suficiente; no se pide ningun campo de texto adicional.
 * · en el resto -> en config.respuestaEsperada (+ alternas aceptadas).
 */
export function validarPregunta(
    enunciado: string,
    tipoActividad: TipoActividad,
    tipoRespuesta: TipoRespuesta,
    config: PreguntaConfig,
    totalOpciones: number,
    opcionesMarcadas: number,
): AvisoPregunta[] {
    const avisos: AvisoPregunta[] = [];

    if (!enunciado.trim()) {
        avisos.push({ nivel: 'error', mensaje: 'Falta el enunciado.' });
    }

    const pasos = config.pasos ?? [];
    if (pasos.length > 0) {
        const totalEspacios = pasos.reduce((n, p) => n + p.espacios.length, 0);

        // Un procedimiento sin NINGUN hueco no se puede responder: el motor
        // nunca lo daria por correcto y el estudiante se quedaria pulsando
        // "Comprobar" sin feedback posible. Es el error de authoring mas
        // silencioso que hay, asi que se corta aqui y no en el Portal.
        if (totalEspacios === 0) {
            avisos.push({
                nivel: 'error',
                mensaje: 'El procedimiento necesita al menos un espacio por completar.',
            });
        }

        const sinRespuesta = pasos.reduce(
            (n, p) => n + p.espacios.filter((e) => !e.respuesta.trim()).length,
            0,
        );
        if (sinRespuesta > 0) {
            avisos.push({
                nivel: 'error',
                mensaje: `${sinRespuesta} espacio(s) sin respuesta esperada.`,
            });
        }

        // El texto del paso y sus espacios se cuentan por posicion: si no
        // coinciden, el estudiante ve huecos que no puede responder.
        pasos.forEach((paso, i) => {
            const marcados = contarHuecos(paso.texto);
            if (marcados !== paso.espacios.length) {
                avisos.push({
                    nivel: 'error',
                    mensaje: `Paso ${i + 1}: el texto tiene ${marcados} hueco(s) y defines ${paso.espacios.length}.`,
                });
            }
        });
        return avisos;
    }

    // ── La clave son las opciones marcadas: no se exige respuestaEsperada ──
    if (RESPUESTA_EN_OPCIONES.includes(tipoActividad)) {
        if (totalOpciones === 0) {
            avisos.push({ nivel: 'error', mensaje: 'Agrega al menos una opción.' });
        } else if (opcionesMarcadas === 0) {
            avisos.push({ nivel: 'error', mensaje: 'Marca al menos una opción correcta.' });
        }
        return avisos;
    }

    const tienePrincipal = !!config.respuestaEsperada?.trim();
    const tieneAlternas = (config.respuestasAceptadas ?? []).some((a) => a.trim());

    if (!tienePrincipal && !tieneAlternas) {
        avisos.push({ nivel: 'error', mensaje: 'Define la respuesta correcta.' });
    }

    if (tipoRespuesta === 'numerica' && tienePrincipal && parsearNumero(config.respuestaEsperada) === null) {
        avisos.push({
            nivel: 'aviso',
            mensaje: 'La respuesta esperada no es numerica: se comparara como texto.',
        });
    }

    return avisos;
}

/* ─────────────────────────────────────────────────────────────────────────
   Validacion de la ruta completa — antes de publicar
   ───────────────────────────────────────────────────────────────────────── */

export interface AvisoRuta {
    nivel: 'error' | 'aviso';
    /** "Etapa 2 / Item 1 / Pregunta 3" */
    donde: string;
    mensaje: string;
}

/**
 * Revisa la ruta entera. Se ejecuta antes de publicar: una clave rota en el
 * Portal es mucho mas cara que un aviso withheld en el constructor, porque el
 * estudiante ya respondio.
 *
 * Devuelve problemas, no lanza: el constructor los muestra y deja publicar solo
 * cuando no hay errores.
 */
export function validarRuta(etapas: EtapaParaValidar[]): AvisoRuta[] {
    const avisos: AvisoRuta[] = [];

    if (etapas.length === 0) {
        return [{ nivel: 'error', donde: 'Ruta', mensaje: 'Agrega al menos una etapa.' }];
    }

    etapas.forEach((etapa, i) => {
        const etiquetaEtapa = `Etapa ${i + 1}`;

        if (!etapa.titulo?.trim()) {
            avisos.push({ nivel: 'error', donde: etiquetaEtapa, mensaje: 'La etapa sin nombre.' });
        }

        if (etapa.actividades.length === 0) {
            avisos.push({
                nivel: 'aviso',
                donde: etiquetaEtapa,
                mensaje: 'La etapa no tiene items: el estudiante la verá vacía.',
            });
        }

        etapa.actividades.forEach((actividad, j) => {
            const etiquetaActividad = `${etapa.titulo?.trim() || etiquetaEtapa} / Item ${j + 1}`;

            if (actividad.preguntas.length === 0) {
                avisos.push({
                    nivel: 'error',
                    donde: etiquetaActividad,
                    mensaje: 'El item no tiene preguntas.',
                });
            }

            actividad.preguntas.forEach((pregunta, k) => {
                const donde = `${etapa.titulo?.trim() || etiquetaEtapa} / Item ${j + 1} / Preg. ${k + 1}`;
                const dePregunta = validarPregunta(
                    pregunta.enunciado,
                    actividad.tipo,
                    pregunta.tipo_respuesta,
                    pregunta.config ?? {},
                    (pregunta.opciones ?? []).length,
                    (pregunta.opciones ?? []).filter((o) => o.es_correcta).length,
                );
                for (const a of dePregunta) {
                    avisos.push({ nivel: a.nivel, donde, mensaje: a.mensaje });
                }
            });
        });
    });

    return avisos;
}

/** Forma minima que necesita `validarRuta`; no importa los ids. */
export interface EtapaParaValidar {
    titulo?: string | null;
    actividades: {
        /** Necesario: de el depende DONDE vive la respuesta correcta. */
        tipo: TipoActividad;
        preguntas: {
            enunciado: string;
            tipo_respuesta: TipoRespuesta;
            config?: PreguntaConfig;
            opciones?: { es_correcta: boolean }[];
        }[];
    }[];
}
