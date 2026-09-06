import { buildGeminiEndpoint } from './aiConfig';
import type { NotaContenido } from '../types/planClases';

export interface SugerenciaFichaIA {
    intencionPedagogica: string;
    competenciasTrabajar: string;
    indicadorLogro: string;
    inicio: {
        desafio: string;
        conceptos: string[];
        fuentes: string;
        preguntas: string[];
    };
    desarrollo: {
        copiar: string;
        preguntas: string[];
        dibujar: string;
        pasos: string[];
        materiales: string[];
    };
    cierre: {
        checklist: string[];
        metacognicion: string[];
    };
}

export async function sugerirFichaPedagogica(
    apiKey: string,
    contextoSeccion: string,
    temaOpcional: string,
    signal?: AbortSignal
): Promise<NotaContenido> {
    const prompt = `Actúa como un docente experto en diseño pedagógico. Redacta una ficha de aprendizaje con un texto bonito, inspirador y muy claro para los estudiantes. Desarrolla exactamente la siguiente estructura basada en el tema que te daré al final:

Intención pedagógica: [Redacta la meta aquí]
Competencias a trabajar: [Redacta las competencias aquí]
Indicador de logro: [Redacta el indicador aquí]

Inicio:
Presenta el desafío inicial conectándolo de forma simple con la vida cotidiana y real. Incluye preguntas reflexivas que inviten al estudiante a imaginar la situación para acercarse al tema de forma natural. Detalla los conceptos clave que deben investigar y sugiere fuentes accesibles.

Desarrollo:
Bajo el título "Registro en el Cuaderno y Manos a la Obra", detalla con precisión quirúrgica TODO lo que el estudiante debe hacer. Especifica qué título e información deben copiar, qué preguntas responder, qué deben dibujar y el paso a paso detallado de la actividad práctica (incluyendo materiales obligatorios).

Cierre:
Bajo el título "Autoevaluación y Reflexión", incluye una lista de verificación con casillas [ ] (checkbox) para que el alumno revise de forma autónoma su trabajo entregable, seguido de exactamente 2 preguntas de metacognición para cerrar la sesión.

Tema, asignatura y grado del proyecto: ${temaOpcional || 'Utiliza el siguiente contexto para determinar el tema de la actividad.'}

Contexto pedagógico de referencia (Sección de planificación extraída):
${contextoSeccion}`;

    const body = {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
            temperature: 0.7,
            responseMimeType: 'application/json',
            responseSchema: {
                type: 'object',
                properties: {
                    intencionPedagogica: { type: 'string' },
                    competenciasTrabajar: { type: 'string' },
                    indicadorLogro: { type: 'string' },
                    inicio: {
                        type: 'object',
                        properties: {
                            desafio: { type: 'string' },
                            conceptos: { type: 'array', items: { type: 'string' } },
                            fuentes: { type: 'string' },
                            preguntas: { type: 'array', items: { type: 'string' } },
                        },
                        required: ['desafio', 'conceptos', 'fuentes', 'preguntas']
                    },
                    desarrollo: {
                        type: 'object',
                        properties: {
                            copiar: { type: 'string' },
                            preguntas: { type: 'array', items: { type: 'string' } },
                            dibujar: { type: 'string' },
                            pasos: { type: 'array', items: { type: 'string' } },
                            materiales: { type: 'array', items: { type: 'string' } }
                        },
                        required: ['copiar', 'preguntas', 'dibujar', 'pasos', 'materiales']
                    },
                    cierre: {
                        type: 'object',
                        properties: {
                            checklist: { type: 'array', items: { type: 'string' } },
                            metacognicion: { type: 'array', items: { type: 'string' } }
                        },
                        required: ['checklist', 'metacognicion']
                    }
                },
                required: ['intencionPedagogica', 'competenciasTrabajar', 'indicadorLogro', 'inicio', 'desarrollo', 'cierre']
            }
        }
    };

    const res = await fetch(buildGeminiEndpoint(apiKey), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal
    });

    if (!res.ok) {
        let errDesc = 'Error al generar la ficha';
        try {
            const errJson = await res.json();
            errDesc = errJson.error?.message || errDesc;
        } catch { }
        throw new Error(errDesc);
    }

    const data = await res.json();
    const texto = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!texto) throw new Error('Respuesta vacía o inválida del modelo.');

    let respuestaIA: SugerenciaFichaIA;
    try {
        respuestaIA = JSON.parse(texto);
    } catch (e) {
        throw new Error('El modelo devolvió un JSON inválido.');
    }

    // Convertimos SugerenciaFichaIA a NotaContenido (EditorJS compatible)
    return converirAFichaEditorJS(respuestaIA);
}

function converirAFichaEditorJS(data: SugerenciaFichaIA): NotaContenido {
    const blocks: any[] = [];
    const idObj = () => Math.random().toString(36).substring(2, 10);

    // Header principal
    blocks.push({
        id: idObj(), type: 'header',
        data: { text: '📚 Ficha de Aprendizaje Sugerida', level: 2 }
    });

    // Marco Curricular (Info para docente)
    blocks.push({
        id: idObj(), type: 'quote',
        data: { 
            text: `<b>Intención pedagógica:</b> ${data.intencionPedagogica}<br><br><b>Competencias a trabajar:</b> ${data.competenciasTrabajar}<br><br><b>Indicador de logro:</b> ${data.indicadorLogro}`,
            caption: 'Marco Curricular (Información para el Docente)',
            alignment: 'left'
        }
    });

    blocks.push({ id: idObj(), type: 'delimiter', data: {} });

    // Inicio
    blocks.push({ id: idObj(), type: 'header', data: { text: 'Paso 1: Investigar y Descubrir 🔍', level: 3 } });
    blocks.push({ id: idObj(), type: 'paragraph', data: { text: data.inicio.desafio } });
    
    if (data.inicio.conceptos && data.inicio.conceptos.length > 0) {
        blocks.push({ id: idObj(), type: 'paragraph', data: { text: '<b>Conceptos clave:</b>' } });
        blocks.push({
            id: idObj(), type: 'list',
            data: { style: 'unordered', items: data.inicio.conceptos.map(c => ({ content: c, items: [] })) }
        });
    }

    if (data.inicio.fuentes) {
        blocks.push({ id: idObj(), type: 'paragraph', data: { text: `<b>Fuentes recomendadas:</b> ${data.inicio.fuentes}` } });
    }

    if (data.inicio.preguntas && data.inicio.preguntas.length > 0) {
        blocks.push({ id: idObj(), type: 'paragraph', data: { text: '<b>Preguntas para pensar:</b>' } });
        blocks.push({
            id: idObj(), type: 'list',
            data: { style: 'unordered', items: data.inicio.preguntas.map(p => ({ content: p, items: [] })) }
        });
    }

    blocks.push({ id: idObj(), type: 'delimiter', data: {} });

    // Desarrollo
    blocks.push({ id: idObj(), type: 'header', data: { text: 'Paso 2: Registro y Manos a la Obra ✍️', level: 3 } });
    
    if (data.desarrollo.materiales && data.desarrollo.materiales.length > 0) {
        blocks.push({ id: idObj(), type: 'paragraph', data: { text: `<b>Materiales:</b> ${data.desarrollo.materiales.join(', ')}` } });
    }

    if (data.desarrollo.copiar) {
        blocks.push({ id: idObj(), type: 'paragraph', data: { text: `<b>En tu cuaderno:</b><br>${data.desarrollo.copiar}` } });
    }

    if (data.desarrollo.dibujar) {
        blocks.push({ id: idObj(), type: 'paragraph', data: { text: `<b>Para dibujar:</b><br>${data.desarrollo.dibujar}` } });
    }

    if (data.desarrollo.pasos && data.desarrollo.pasos.length > 0) {
        blocks.push({ id: idObj(), type: 'paragraph', data: { text: '<b>Instrucciones paso a paso:</b>' } });
        blocks.push({
            id: idObj(), type: 'list',
            data: { style: 'ordered', items: data.desarrollo.pasos.map(p => ({ content: p, items: [] })) }
        });
    }

    if (data.desarrollo.preguntas && data.desarrollo.preguntas.length > 0) {
        blocks.push({ id: idObj(), type: 'paragraph', data: { text: '<b>Responde lo siguiente:</b>' } });
        blocks.push({
            id: idObj(), type: 'list',
            data: { style: 'unordered', items: data.desarrollo.preguntas.map(p => ({ content: p, items: [] })) }
        });
    }

    blocks.push({ id: idObj(), type: 'delimiter', data: {} });

    // Cierre
    blocks.push({ id: idObj(), type: 'header', data: { text: 'Paso 3 y 4: Autoevaluación y Reflexión 💡', level: 3 } });
    
    if (data.cierre.checklist && data.cierre.checklist.length > 0) {
        blocks.push({
            id: idObj(), type: 'checklist',
            data: { items: data.cierre.checklist.map(c => ({ text: c, checked: false })) }
        });
    }

    if (data.cierre.metacognicion && data.cierre.metacognicion.length > 0) {
        blocks.push({ id: idObj(), type: 'paragraph', data: { text: '<b>Reflexión final:</b>' } });
        blocks.push({
            id: idObj(), type: 'list',
            data: { style: 'unordered', items: data.cierre.metacognicion.map(m => ({ content: m, items: [] })) }
        });
    }

    return {
        time: Date.now(),
        blocks: blocks
    };
}
