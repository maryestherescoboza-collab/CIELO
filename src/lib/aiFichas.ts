import { callAI } from './aiProvider';
import type { NotaContenido } from '../types/planClases';

export interface ContextoFichaIA {
    curso: {
        grado: string;
        asignatura: string;
        seccion?: string;
    };
    actividad?: {
        titulo: string;
        indicadorLogro?: string;
        competencias: string[];
        producto?: string;
        descripcion?: string;
    };
    contextoClase: {
        duracionMinutos?: number;
        tema?: string;
        instrucciones?: string;
    };
}

export interface SugerenciaFichaIA {
    tituloFicha: string;
    metadata: {
        duracionMinutos: number;
        materialesRequeridos: string[];
    };
    intencionPedagogica: string;
    competenciasTrabajar: string[];
    indicadorLogro: string;
    inicio: {
        desafio: string;
        conceptos: string[];
        preguntas: string[];
    };
    desarrollo: {
        actividades: string[];
        pasos: string[];
    };
    cierre: {
        checklist: string[];
        metacognicion: string[];
    };
    evidencia: string;
}

export async function sugerirFichaPedagogica(
    userId: string,
    contexto: ContextoFichaIA,
    signal?: AbortSignal
): Promise<NotaContenido> {
    const prompt = `Actúa como un docente experto en diseño pedagógico. Redacta una ficha de clase estructurada.
NO inventes competencias ni indicadores. Utiliza EXCLUSIVAMENTE los que se proporcionan en el contexto.

CONTEXTO OFICIAL DE CIELO:
Grado y Asignatura: ${contexto.curso.grado} - ${contexto.curso.asignatura}
${contexto.actividad ? `Actividad: ${contexto.actividad.titulo}
Descripción de la actividad: ${contexto.actividad.descripcion || 'N/A'}
Competencias: ${contexto.actividad.competencias.join(', ')}
Indicador de logro: ${contexto.actividad.indicadorLogro || 'N/A'}
Producto/Evidencia esperada: ${contexto.actividad.producto || 'N/A'}
` : ''}
PARÁMETROS DE LA CLASE:
Tema/Propósito: ${contexto.contextoClase.tema || 'Derivarlo de la actividad'}
Duración sugerida: ${contexto.contextoClase.duracionMinutos ? contexto.contextoClase.duracionMinutos + ' minutos' : 'No especificada'}
Instrucciones especiales: ${contexto.contextoClase.instrucciones || 'Ninguna'}

RESTRICCIONES:
1. Las "competenciasTrabajar" y el "indicadorLogro" deben reflejar fielmente los proporcionados en el contexto (no inventes nuevos).
2. El "desarrollo" debe conducir directamente a la creación del "Producto/Evidencia" esperado.
3. Devuelve los datos estrictamente en el formato JSON especificado.`;

    const respuestaIA = await callAI<SugerenciaFichaIA>({
        userId,
        prompt,
        signal,
        temperature: 0.5,
        operation: 'generate_lesson_plan',
        geminiResponseSchema: {
            type: 'object',
            properties: {
                tituloFicha: { type: 'string' },
                metadata: {
                    type: 'object',
                    properties: {
                        duracionMinutos: { type: 'number' },
                        materialesRequeridos: { type: 'array', items: { type: 'string' } }
                    },
                    required: ['duracionMinutos', 'materialesRequeridos']
                },
                intencionPedagogica: { type: 'string' },
                competenciasTrabajar: { type: 'array', items: { type: 'string' } },
                indicadorLogro: { type: 'string' },
                inicio: {
                    type: 'object',
                    properties: {
                        desafio: { type: 'string' },
                        conceptos: { type: 'array', items: { type: 'string' } },
                        preguntas: { type: 'array', items: { type: 'string' } }
                    },
                    required: ['desafio', 'conceptos', 'preguntas']
                },
                desarrollo: {
                    type: 'object',
                    properties: {
                        actividades: { type: 'array', items: { type: 'string' } },
                        pasos: { type: 'array', items: { type: 'string' } }
                    },
                    required: ['actividades', 'pasos']
                },
                cierre: {
                    type: 'object',
                    properties: {
                        checklist: { type: 'array', items: { type: 'string' } },
                        metacognicion: { type: 'array', items: { type: 'string' } }
                    },
                    required: ['checklist', 'metacognicion']
                },
                evidencia: { type: 'string' }
            },
            required: ['tituloFicha', 'metadata', 'intencionPedagogica', 'competenciasTrabajar', 'indicadorLogro', 'inicio', 'desarrollo', 'cierre', 'evidencia']
        }
    });

    if (!respuestaIA || typeof respuestaIA !== 'object') {
        throw new Error('La IA devolvió una respuesta inválida.');
    }

    const ficha = convertirAFichaEditorJS(respuestaIA);
    if ((respuestaIA as any)._fallbackUsed) {
        (ficha as any)._fallbackUsed = true;
    }
    return ficha;
}

function convertirAFichaEditorJS(data: SugerenciaFichaIA): NotaContenido {
    const blocks: any[] = [];
    const idObj = () => Math.random().toString(36).substring(2, 10);

    blocks.push({ id: idObj(), type: 'header', data: { text: data.tituloFicha || 'Ficha de Clase', level: 2 } });

    blocks.push({
        id: idObj(), type: 'quote',
        data: { 
            text: `<b>Intención pedagógica:</b> ${data.intencionPedagogica}<br><br><b>Competencias:</b> ${data.competenciasTrabajar.join(', ')}<br><br><b>Indicador de logro:</b> ${data.indicadorLogro}<br><br><b>Producto esperado:</b> ${data.evidencia}<br><br><b>Duración:</b> ${data.metadata.duracionMinutos} min`,
            caption: 'Contexto Pedagógico',
            alignment: 'left'
        }
    });

    blocks.push({ id: idObj(), type: 'delimiter', data: {} });

    blocks.push({ id: idObj(), type: 'header', data: { text: '1. Inicio: Desafío y Exploración', level: 3 } });
    if (data.inicio.desafio) blocks.push({ id: idObj(), type: 'paragraph', data: { text: data.inicio.desafio } });
    if (data.inicio.conceptos?.length) {
        blocks.push({ id: idObj(), type: 'paragraph', data: { text: '<b>Conceptos clave:</b>' } });
        blocks.push({ id: idObj(), type: 'list', data: { style: 'unordered', items: data.inicio.conceptos.map(c => ({ content: c, items: [] })) } });
    }
    if (data.inicio.preguntas?.length) {
        blocks.push({ id: idObj(), type: 'paragraph', data: { text: '<b>Preguntas detonantes:</b>' } });
        blocks.push({ id: idObj(), type: 'list', data: { style: 'unordered', items: data.inicio.preguntas.map(p => ({ content: p, items: [] })) } });
    }

    blocks.push({ id: idObj(), type: 'delimiter', data: {} });

    blocks.push({ id: idObj(), type: 'header', data: { text: '2. Desarrollo: Manos a la Obra', level: 3 } });
    if (data.metadata.materialesRequeridos?.length) {
        blocks.push({ id: idObj(), type: 'paragraph', data: { text: `<b>Materiales necesarios:</b> ${data.metadata.materialesRequeridos.join(', ')}` } });
    }
    if (data.desarrollo.actividades?.length) {
        for (const act of data.desarrollo.actividades) {
            blocks.push({ id: idObj(), type: 'paragraph', data: { text: act } });
        }
    }
    if (data.desarrollo.pasos?.length) {
        blocks.push({ id: idObj(), type: 'paragraph', data: { text: '<b>Instrucciones paso a paso:</b>' } });
        blocks.push({ id: idObj(), type: 'list', data: { style: 'ordered', items: data.desarrollo.pasos.map(p => ({ content: p, items: [] })) } });
    }

    blocks.push({ id: idObj(), type: 'delimiter', data: {} });

    blocks.push({ id: idObj(), type: 'header', data: { text: '3. Cierre: Autoevaluación y Reflexión', level: 3 } });
    if (data.cierre.checklist?.length) {
        blocks.push({ id: idObj(), type: 'paragraph', data: { text: '<b>Revisa tu trabajo:</b>' } });
        blocks.push({ id: idObj(), type: 'checklist', data: { items: data.cierre.checklist.map(c => ({ text: c, checked: false })) } });
    }
    if (data.cierre.metacognicion?.length) {
        blocks.push({ id: idObj(), type: 'paragraph', data: { text: '<b>Preguntas de reflexión final:</b>' } });
        blocks.push({ id: idObj(), type: 'list', data: { style: 'unordered', items: data.cierre.metacognicion.map(m => ({ content: m, items: [] })) } });
    }

    return { time: Date.now(), blocks };
}
