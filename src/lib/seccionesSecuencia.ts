// Secciones de una secuencia = Planes de Clase, derivados de su Planificación
// diaria (contenidoHtml). Reutiliza la estructura REAL ya persistida: cada
// .session-block es UN plan de clase completo e independiente. Una "sección"
// seleccionada desde la carpeta corresponde, por tanto, a un .session-block
// ENTERO, cuyo HTML se conserva íntegro para poder renderizarlo (y, si existía,
// mantener la edición) en el workspace. Solo lectura del HTML ya persistido: sin
// queries, sin stores, sin estado de selección propio.

export interface SeccionSecuencia {
    id: string;
    titulo: string;
    contenido: string;
    /** Posición del .session-block entre los bloques de su secuencia (0-based). */
    indice: number;
    /** HTML completo del .session-block (el plan de clase) tal como se guarda. */
    html: string;
}

const PLACEHOLDERS: readonly string[] = [
    'Describe las actividades de apertura: saludo, pase de lista, motivación, exploración de saberes previos y/o preguntas orales de retroalimentación de la clase anterior.',
    'Describe paso a paso el desarrollo de la clase: presentación del tema, explicación de la actividad, instrumento de evaluación, ejercicio a resolver, modalidad de trabajo (individual/parejas/grupos) y forma de validación de resultados.',
    'Describe la dinámica de cierre de la clase (por ejemplo, ticket de salida, síntesis oral, preguntas de reflexión) y qué deben entregar o responder los estudiantes antes de salir.',
    'Indica la técnica de evaluación a utilizar (por ejemplo: observación, prueba escrita, exposición oral).',
    'Indica el instrumento de evaluación (por ejemplo: rúbrica, lista de cotejo), el tipo (diagnóstica, formativa o sumativa) y el agente evaluador (autoevaluación, coevaluación, heteroevaluación).',
    'Redacta el propósito de aprendizaje de la clase: qué habilidad o conocimiento específico deben demostrar los estudiantes al finalizar la actividad.',
    'Escribe aquí las competencias fundamentales que se trabajarán en la clase (por ejemplo: Comunicativa, Resolución de Problemas, Pensamiento lógico-creativo-crítico, Desarrollo Personal y Espiritual, Ética y Ciudadana), indicando brevemente cómo se evidencia cada una en la actividad del día.',
    'Escribe el indicador de logro alineado al currículo dominicano (código IL y descripción), que precise qué debe ser capaz de hacer el estudiante al finalizar.',
];

const norm = (s: string): string => (s || '').replace(/\s+/g, ' ').trim();

const enUso = (s: string): string => {
    const t = norm(s);
    if (!t) return '';
    return PLACEHOLDERS.some((p) => norm(p).toLowerCase() === t.toLowerCase()) ? '' : t;
};

const slug = (s: string): string =>
    norm(s)
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '') || 'clase';

// Título/descripción legible para el selector. Usa la fecha de la sesión si el
// docente la rellenó; si no, lo identifica por su orden ("Clase N").
function tituloDeBloque(bloque: Element, indice: number): string {
    const fecha = norm(
        bloque.querySelector<HTMLElement>('.fecha-row .editable')?.textContent || ''
    );
    return fecha ? `Clase ${indice + 1} · ${fecha}` : `Clase ${indice + 1}`;
}

function resumenDeBloque(bloque: Element): string {
    const partes: string[] = [];
    for (const celda of Array.from(bloque.querySelectorAll<HTMLElement>('.session-block td.editable, .session-block span.editable'))) {
        const t = enUso(celda.textContent || '');
        if (t) partes.push(t);
    }
    return partes.join('\n');
}

export function extraerSeccionesSecuencia(html: string): SeccionSecuencia[] {
    if (!html) return [];
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const bloques = Array.from(doc.querySelectorAll<HTMLElement>('.session-block'));

    return bloques.map((bloque, indice) => ({
        id: `clase-${indice + 1}-${slug(bloque.querySelector<HTMLElement>('.session-header .session-title')?.textContent || 'plan')}`,
        titulo: tituloDeBloque(bloque, indice),
        contenido: resumenDeBloque(bloque),
        indice,
        html: bloque.outerHTML,
    }));
}