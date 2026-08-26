// Asistente pedagógico contextual para Planificación diaria.
// Reutiliza la capa única de IA (aiConfig.ts): una sola llamada por solicitud,
// respuesta estructurada en 5 categorías. Nunca modifica el texto del docente.

import { buildGeminiEndpoint } from './aiConfig';

export interface SugerenciaEvaluacion {
    tecnica: string;
    instrumento: string;
    sugerencia: string;
}

export interface SugerenciasIA {
    recursos: string[];
    estrategiaInclusiva: string[];
    evidencias: string[];
    evaluacion: SugerenciaEvaluacion;
    metacognicion: string[];
}

export interface ContextoPlanificacion {
    asignatura: string;
    grado: string;
    contenidos: { conceptual: string; procedimental: string; actitudes: string };
    competencias: string;
    intencionPedagogica: string;
    indicadorLogro: string;
    sesiones: Array<{
        fecha: string;
        inicio: string;
        desarrollo: string;
        cierre: string;
        recursosActuales: string;
        estrategiaActual: string;
        evidenciasActuales: string;
        tecnicaActual: string;
        instrumentoActual: string;
        metacognicionActual: string;
    }>;
}

// Textos guía de la plantilla: si una celda contiene exactamente uno de estos,
// el docente aún no escribió nada ahí y debe ignorarse como contexto.
const PLACEHOLDERS_PLANTILLA: readonly string[] = [
    'Escribe el tema o concepto matemático que se abordará (el "qué").',
    'Describe el procedimiento o destreza que el estudiante debe aplicar (el "cómo").',
    'Describe la actitud o valor que se busca desarrollar durante la actividad.',
    'Escribe aquí las competencias fundamentales que se trabajarán en la clase (por ejemplo: Comunicativa, Resolución de Problemas, Pensamiento lógico-creativo-crítico, Desarrollo Personal y Espiritual, Ética y Ciudadana), indicando brevemente cómo se evidencia cada una en la actividad del día.',
    'Redacta el propósito de aprendizaje de la clase: qué habilidad o conocimiento específico deben demostrar los estudiantes al finalizar la sesión.',
    'Escribe el indicador de logro alineado al currículo dominicano (código IL y descripción), que precise qué debe ser capaz de hacer el estudiante al finalizar.',
    'Describe las actividades de apertura: saludo, pase de lista, motivación, exploración de saberes previos y/o preguntas orales de retroalimentación de la clase anterior.',
    'Lista los materiales y recursos didácticos que se usarán durante la clase (pizarra, marcadores, computadora, enlaces, guías, etc.).',
    'Describe paso a paso el desarrollo de la clase: presentación del tema, explicación de la actividad, instrumento de evaluación, ejercicio a resolver, modalidad de trabajo (individual/parejas/grupos) y forma de validación de resultados.',
    'Describe la dinámica de cierre de la clase (por ejemplo, ticket de salida, síntesis oral, preguntas de reflexión) y qué deben entregar o responder los estudiantes antes de salir.',
    'Describe la(s) adecuación(es) o apoyo(s) que se brindará a estudiantes con necesidades específicas (por ejemplo: andamiaje visual, guías paso a paso, tiempo adicional, material adaptado, trabajo en pareja de apoyo).',
    'Indica qué productos o evidencias se recogerán como muestra del trabajo realizado (fotos, cuaderno, hojas de trabajo, portafolio, etc.).',
    'Indica la técnica de evaluación a utilizar (por ejemplo: observación, prueba escrita, exposición oral).',
    'Indica el instrumento de evaluación (por ejemplo: rúbrica, lista de cotejo), el tipo (diagnóstica, formativa o sumativa) y el agente evaluador (autoevaluación, coevaluación, heteroevaluación).',
    'Escribe una o dos preguntas de reflexión final para que el estudiante piense sobre su propio proceso de aprendizaje (por ejemplo: ¿Qué me sorprendió más?, ¿Qué parte me resultó más difícil?).'
];

const norm = (s: string): string => (s || '').replace(/\s+/g, ' ').trim();

const esVaciaOPlaceholder = (texto: string): boolean => {
    const t = norm(texto);
    if (!t || t === 'min.') return true;
    return PLACEHOLDERS_PLANTILLA.some(p => norm(p).toLowerCase() === t.toLowerCase());
};

const textoCelda = (el: Element | null | undefined): string =>
    esVaciaOPlaceholder(el?.textContent || '') ? '' : norm(el?.textContent || '');

function valorTrasEtiqueta(
    raiz: Element,
    etiqueta: string,
    selectorEtiqueta: string
): string {
    const etiquetaNorm = norm(etiqueta).replace(/:$/, '').toLowerCase();
    const celdas = raiz.querySelectorAll(selectorEtiqueta);
    for (let i = 0; i < celdas.length; i++) {
        const actual = norm(celdas[i].textContent || '').replace(/:$/, '').toLowerCase();
        if (actual.startsWith(etiquetaNorm)) {
            return textoCelda(celdas[i].nextElementSibling);
        }
    }
    return '';
}

export function extraerContextoPlanificacion(contenedor: HTMLElement): ContextoPlanificacion {
    const sesiones = Array.from(contenedor.querySelectorAll('.session-block')).map(bloque => ({
        fecha: textoCelda(bloque.querySelector('.fecha-row .editable')),
        inicio: valorTrasEtiquetaMomento(bloque, 'inicio'),
        desarrollo: valorTrasEtiquetaMomento(bloque, 'desarrollo'),
        cierre: valorTrasEtiquetaMomento(bloque, 'cierre'),
        recursosActuales: textoCelda(bloque.querySelector('td[rowspan]')),
        estrategiaActual: valorTrasEtiqueta(bloque, 'Estrategia inclusiva', 'td.label'),
        evidenciasActuales: valorTrasEtiqueta(bloque, 'Evidencias o productos intermedios', 'td.label'),
        tecnicaActual: valorTrasEtiqueta(bloque, 'Técnica', 'td.label-sm'),
        instrumentoActual: valorTrasEtiqueta(bloque, 'Instrumento', 'td.label-sm'),
        metacognicionActual: valorTrasEtiqueta(bloque, 'Metacognición', 'td.label')
    }));

    return {
        asignatura: valorTrasEtiqueta(contenedor, 'Asignatura', 'td.label'),
        grado: valorTrasEtiqueta(contenedor, 'Grado', 'td.label'),
        contenidos: {
            conceptual: valorTrasEtiquetaTablaContenidos(contenedor, 'Conceptual'),
            procedimental: valorTrasEtiquetaTablaContenidos(contenedor, 'Procedimental'),
            actitudes: valorTrasEtiquetaTablaContenidos(contenedor, 'Actitudes y valores')
        },
        competencias: valorTrasEtiqueta(contenedor, 'Competencias fundamentales', 'td.label'),
        intencionPedagogica: valorTrasEtiqueta(contenedor, 'Intención pedagógica', 'td.label'),
        indicadorLogro: valorTrasEtiqueta(contenedor, 'Indicador de logro', 'td.label'),
        sesiones
    };
}

function valorTrasEtiquetaMomento(bloque: Element, momento: string): string {
    const celdas = bloque.querySelectorAll('td.editable');
    for (let i = 0; i < celdas.length; i++) {
        const contenido = norm(celdas[i].textContent || '').toLowerCase();
        if (contenido === momento) {
            return textoCelda(celdas[i].nextElementSibling?.nextElementSibling);
        }
    }
    return '';
}

function valorTrasEtiquetaTablaContenidos(contenedor: Element, columna: string): string {
    const tablas = contenedor.querySelectorAll('table');
    for (let i = 0; i < tablas.length; i++) {
        const titulo = tablas[i].querySelector('td.section-title');
        if (!titulo || !norm(titulo.textContent || '').toUpperCase().includes('CONTENIDOS')) continue;
        const encabezados = tablas[i].querySelectorAll('td.label-sm');
        for (let j = 0; j < encabezados.length; j++) {
            if (norm(encabezados[j].textContent || '').toLowerCase() === columna.toLowerCase()) {
                const filaValores = encabezados[j].closest('tr')?.nextElementSibling;
                const celda = encabezados[j] as HTMLTableCellElement;
                if (filaValores && celda.cellIndex >= 0) {
                    return textoCelda(filaValores.children[celda.cellIndex]);
                }
            }
        }
    }
    return '';
}

export function desarrolloSuficiente(ctx: ContextoPlanificacion): boolean {
    const texto = ctx.sesiones.map(s => `${s.inicio} ${s.desarrollo} ${s.cierre}`).join(' ');
    return norm(texto).length >= 50;
}

function construirPrompt(ctx: ContextoPlanificacion): string {
    return `Actúa como asistente pedagógico para docentes de República Dominicana. Analiza EXCLUSIVAMENTE la siguiente planificación de clase ya escrita por el docente y sugiere mejoras puntuales. No inventes información que no esté disponible; trabaja con lo proporcionado.

PLANIFICACIÓN DEL DOCENTE (fuente principal):
${JSON.stringify(ctx, null, 2)}

Genera sugerencias organizadas en estas categorías:

1. RECURSOS: materiales didácticos, recursos visuales, herramientas digitales, organizadores, textos o materiales manipulativos que complementen lo que REALMENTE ocurre en la clase. No recomiendes recursos genéricos sin relación con la planificación.

2. ESTRATEGIA INCLUSIVA: UNA estrategia concreta para facilitar acceso al contenido, participación, comprensión o expresión del aprendizaje, aplicable SIN asumir diagnósticos ni condiciones personales (ej.: instrucciones orales y visuales, ejemplos resueltos previos, roles definidos en grupos, andamiaje progresivo). No entregues una lista genérica de adaptaciones: máximo 2 elementos específicos para ESTA clase.

3. EVIDENCIAS DEL APRENDIZAJE: qué evidencias observables pueden producirse DURANTE el desarrollo, antes del producto final (procedimiento escrito, borrador, esquema, tabla, mapa conceptual, explicación oral, resolución parcial, registro). Indica qué permite observar cada evidencia sobre el aprendizaje.

4. EVALUACIÓN: combina pedagógicamente una TÉCNICA (observación, análisis de desempeño, interrogatorio, análisis de producciones) con un INSTRUMENTO (lista de cotejo, rúbrica, escala de valoración, registro anecdótico, guía de observación) coherentes con la actividad descrita. No recomiendes instrumentos innecesariamente complejos. Si la planificación ya menciona técnica/instrumento, evalúa su coherencia y sugiere mejora SOLO si aporta valor real; si ya es adecuado, confírmalo en "sugerencia".

5. METACOGNICIÓN: una o dos preguntas o acciones breves directamente relacionadas con la actividad realizada. Evita preguntas genéricas como únicamente "¿Qué aprendiste hoy?".

Prioriza sugerencias que mejoren la coherencia: ACTIVIDAD -> EVIDENCIA -> EVALUACION -> REFLEXION. Cada elemento debe ser concreto, breve y utilizable tal cual. Sin explicaciones teóricas extensas.`;
}

export async function generarSugerenciasPedagogicas(
    apiKey: string,
    contexto: ContextoPlanificacion,
    signal?: AbortSignal
): Promise<SugerenciasIA> {
    const response = await fetch(buildGeminiEndpoint(apiKey), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal,
        body: JSON.stringify({
            contents: [{ parts: [{ text: construirPrompt(contexto) }] }],
            generationConfig: {
                responseMimeType: 'application/json',
                responseSchema: {
                    type: 'OBJECT',
                    properties: {
                        recursos: { type: 'ARRAY', items: { type: 'STRING' } },
                        estrategiaInclusiva: { type: 'ARRAY', items: { type: 'STRING' } },
                        evidencias: { type: 'ARRAY', items: { type: 'STRING' } },
                        evaluacion: {
                            type: 'OBJECT',
                            properties: {
                                tecnica: { type: 'STRING' },
                                instrumento: { type: 'STRING' },
                                sugerencia: { type: 'STRING' }
                            },
                            required: ['tecnica', 'instrumento', 'sugerencia']
                        },
                        metacognicion: { type: 'ARRAY', items: { type: 'STRING' } }
                    },
                    required: ['recursos', 'estrategiaInclusiva', 'evidencias', 'evaluacion', 'metacognicion']
                }
            }
        })
    });

    if (!response.ok) {
        const detalle = await response.text();
        console.error('[Gemini Planificación] HTTP', response.status, detalle.replace(new RegExp(apiKey, 'g'), '***'));
        if (response.status === 400) throw new Error('La solicitud de IA fue rechazada. Revisa el contenido e inténtalo de nuevo.');
        if (response.status === 401 || response.status === 403) throw new Error('API Key de Gemini no válida o sin permisos.');
        if (response.status === 404) throw new Error('El modelo de IA no está disponible para esta API Key.');
        throw new Error(`Fallo del servicio de IA (HTTP ${response.status}). Inténtalo de nuevo.`);
    }

    const resJson: unknown = await response.json();
    const texto = (resJson as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> })
        ?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!texto) throw new Error('La IA no devolvió sugerencias legibles. Inténtalo de nuevo.');

    let data: Partial<SugerenciasIA>;
    try {
        data = JSON.parse(texto) as Partial<SugerenciasIA>;
    } catch {
        throw new Error('La IA devolvió un formato inválido. Inténtalo de nuevo.');
    }

    const limpiar = (arr: unknown): string[] =>
        Array.isArray(arr) ? arr.filter((x): x is string => typeof x === 'string' && norm(x).length > 0) : [];

    const resultado: SugerenciasIA = {
        recursos: limpiar(data.recursos),
        estrategiaInclusiva: limpiar(data.estrategiaInclusiva),
        evidencias: limpiar(data.evidencias),
        evaluacion: {
            tecnica: typeof data.evaluacion?.tecnica === 'string' ? data.evaluacion.tecnica : '',
            instrumento: typeof data.evaluacion?.instrumento === 'string' ? data.evaluacion.instrumento : '',
            sugerencia: typeof data.evaluacion?.sugerencia === 'string' ? data.evaluacion.sugerencia : ''
        },
        metacognicion: limpiar(data.metacognicion)
    };

    const hayAlgo = resultado.recursos.length > 0 || resultado.estrategiaInclusiva.length > 0 ||
        resultado.evidencias.length > 0 || resultado.metacognicion.length > 0 ||
        resultado.evaluacion.tecnica || resultado.evaluacion.instrumento;
    if (!hayAlgo) throw new Error('La IA no generó sugerencias para este contenido. Enriquece el desarrollo e inténtalo otra vez.');

    return resultado;
}

// ===================== INSERCIÓN INDIVIDUAL EN EL DOCUMENTO =====================

const escaparRegex = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function anexarEnCelda(celda: HTMLElement, texto: string): void {
    const contenidoPrevio = norm(celda.textContent || '');
    const eraPlaceholder = PLACEHOLDERS_PLANTILLA.some(p =>
        contenidoPrevio.toLowerCase() === norm(p).toLowerCase()
    );
    if (!eraPlaceholder && contenidoPrevio.length > 0) {
        celda.appendChild(document.createElement('br'));
    } else if (eraPlaceholder) {
        celda.textContent = '';
    }
    const linea = document.createElement('div');
    linea.textContent = texto;
    celda.appendChild(linea);
}

export type CategoriaSugerencia =
    | { tipo: 'recursos'; texto: string }
    | { tipo: 'estrategia'; texto: string }
    | { tipo: 'evidencia'; texto: string }
    | { tipo: 'tecnica'; texto: string }
    | { tipo: 'instrumento'; texto: string }
    | { tipo: 'metacognicion'; texto: string };

export function insertarSugerencia(indiceSesion: number, sugerencia: CategoriaSugerencia): boolean {
    const contenedor = document.getElementById('template-editor-container');
    if (!contenedor) return false;
    const bloques = contenedor.querySelectorAll('.session-block');
    const bloque = bloques[indiceSesion];
    if (!bloque) return false;

    switch (sugerencia.tipo) {
        case 'recursos': {
            const celda = bloque.querySelector('td[rowspan]');
            if (!(celda instanceof HTMLElement)) return false;
            anexarEnCelda(celda, sugerencia.texto);
            return true;
        }
        case 'estrategia':
            return insertarTrasEtiqueta(bloque, 'Estrategia inclusiva', 'td.label', sugerencia.texto);
        case 'evidencia':
            return insertarTrasEtiqueta(bloque, 'Evidencias o productos intermedios', 'td.label', sugerencia.texto);
        case 'tecnica':
            return insertarTrasEtiqueta(bloque, 'Técnica', 'td.label-sm', sugerencia.texto);
        case 'instrumento':
            return insertarTrasEtiqueta(bloque, 'Instrumento', 'td.label-sm', sugerencia.texto);
        case 'metacognicion':
            return insertarTrasEtiqueta(bloque, 'Metacognición', 'td.label', sugerencia.texto);
        default:
            return false;
    }
}

function insertarTrasEtiqueta(
    bloque: Element,
    etiqueta: string,
    selector: string,
    texto: string
): boolean {
    const patron = new RegExp('^' + escaparRegex(norm(etiqueta)).replace(/:/g, '') , 'i');
    const celdas = bloque.querySelectorAll(selector);
    for (let i = 0; i < celdas.length; i++) {
        const actual = norm(celdas[i].textContent || '').replace(/:$/, '');
        if (patron.test(actual)) {
            const vecina = celdas[i].nextElementSibling;
            if (vecina instanceof HTMLElement) {
                anexarEnCelda(vecina, texto);
                return true;
            }
        }
    }
    return false;
}
