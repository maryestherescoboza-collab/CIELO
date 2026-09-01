// Generación de instrumentos de evaluación (Rúbrica / Lista de Cotejo) con IA.
// Sigue las convenciones de NewActivityModal: Gemini + responseSchema estricto,
// mensajes de error en español y clave nunca expuesta en logs.

import { buildGeminiEndpoint } from './aiConfig';
import type { CriterioCotejo, NivelPuntaje } from '../types';

export type BCKey = 'BC1' | 'BC2' | 'BC3' | 'BC4';

export interface DescriptorGenerado {
    bc: BCKey;
    estrategico: string;
    autonomo: string;
    resolutivo: string;
    receptivo: string;
}

export interface ContextoInstrumento {
    asignatura: string;
    cursoNombre: string;
    periodo: string | null;
    actividadNombre: string | null;
    indicadorLogro: string | null;
    bcAsignados: string[] | null;
    notas: string;
    actividadesSeleccionadas?: { nombre: string; indicador: string | null; bcAsignados: string[] | null }[];
}

import { COMPETENCIAS_LABEL } from '../types';

const COMPETENCIAS_OFICIALES = COMPETENCIAS_LABEL;

const NIVELES_RUBRICAS = [
    { nombre: 'Estratégico', descripcion: 'Nivel de logro más alto (puntaje 100). Lidera procesos, propone soluciones innovadoras y actúa de manera autónoma y creativa.' },
    { nombre: 'Autónomo', descripcion: 'Nivel alto (puntaje 85). Realiza las tareas por sí solo, cumpliendo los objetivos con eficiencia.' },
    { nombre: 'Resolutivo', descripcion: 'Nivel medio (puntaje 70). Identifica el problema y aplica procedimientos básicos para resolverlo.' },
    { nombre: 'Receptivo', descripcion: 'Nivel inicial (puntaje 55). Requiere apoyo continuo para comprender tareas y alcanzar los objetivos.' },
];

export const NIVELES_RUBRICAS_DEFAULT: NivelPuntaje[] = [
    { nivel: 4, puntaje: 100, nombre: 'Estratégico', color: '#F5BC5D', description: 'Lidera procesos, propone soluciones innovadoras y actúa de manera autónoma y creativa.' },
    { nivel: 3, puntaje: 85, nombre: 'Autónomo', color: '#537BAC', description: 'Realiza las tareas por sí solo, cumpliendo los objetivos con eficiencia.' },
    { nivel: 2, puntaje: 70, nombre: 'Resolutivo', color: '#689C63', description: 'Identifica el problema y aplica procedimientos básicos para resolverlo.' },
    { nivel: 1, puntaje: 55, nombre: 'Receptivo', color: '#EB8847', description: 'Requiere apoyo continuo para comprender tareas y alcanzar los objetivos.' },
];

async function callGeminiJson<T>(apiKey: string, prompt: string, responseSchema: Record<string, unknown>): Promise<T> {
    const endpointUrl = buildGeminiEndpoint(apiKey);

    const response = await fetch(endpointUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
                responseMimeType: 'application/json',
                responseSchema
            }
        })
    });

    if (!response.ok) {
        const errText = await response.text();
        const cleanErrText = errText.replace(new RegExp(apiKey, 'g'), '***API_KEY***');
        console.error(`[Gemini API Technical Error] Code ${response.status}:`, cleanErrText);

        if (response.status === 400) {
            throw new Error('Solicitud incorrecta al servicio de IA. Verifica los datos ingresados.');
        } else if (response.status === 401 || response.status === 403) {
            throw new Error('API Key de Gemini no válida o sin permisos. Por favor, verifíquela.');
        } else if (response.status === 404) {
            throw new Error('El modelo de IA no está disponible o el endpoint es incorrecto para esta API Key.');
        } else {
            throw new Error(`Fallo en el servicio de Gemini (Código HTTP ${response.status}). Intente de nuevo más tarde.`);
        }
    }

    const resJson = await response.json();
    const textResponse = resJson.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!textResponse) {
        console.error('[Gemini API Technical Error] No text parts in response:', resJson);
        throw new Error('La IA no devolvió una respuesta legible. Intente de nuevo.');
    }

    try {
        return JSON.parse(textResponse) as T;
    } catch {
        console.error('[Gemini API Technical Error] Malformed JSON payload:', textResponse);
        throw new Error('La IA devolvió una respuesta con formato inválido. Intente de nuevo.');
    }
}

function construirContexto(ctx: ContextoInstrumento): string {
    const lineas = [
        `- Asignatura: ${ctx.asignatura || 'No especificada'}`,
        `- Curso: ${ctx.cursoNombre || 'No especificado'}`
    ];
    if (ctx.periodo) lineas.push(`- Período: ${ctx.periodo}`);
    if (ctx.actividadesSeleccionadas && ctx.actividadesSeleccionadas.length > 0) {
        lineas.push(`- Actividades seleccionadas como fuente:`);
        ctx.actividadesSeleccionadas.forEach((act, idx) => {
            lineas.push(`  * Actividad ${idx + 1}: "${act.nombre}"`);
            if (act.indicador) lineas.push(`    - Indicador de logro: "${act.indicador}"`);
            if (act.bcAsignados && act.bcAsignados.length > 0) {
                lineas.push(`    - Competencias asociadas: ${act.bcAsignados.join(', ')}`);
            }
        });
    } else {
        if (ctx.actividadNombre) lineas.push(`- Actividad a evaluar: "${ctx.actividadNombre}"`);
        if (ctx.indicadorLogro) lineas.push(`- Indicador de logro de la actividad: "${ctx.indicadorLogro}"`);
        if (ctx.bcAsignados && ctx.bcAsignados.length > 0) {
            lineas.push(`- Competencias oficialmente asignadas a esta actividad: ${ctx.bcAsignados.join(', ')}`);
        }
    }
    if (ctx.notas.trim()) lineas.push(`- Indicaciones adicionales del docente: "${ctx.notas.trim()}"`);
    return lineas.join('\n');
}

function validarContextoBasico(ctx: ContextoInstrumento): void {
    if (!ctx.asignatura && !ctx.notas.trim()) {
        throw new Error('Agrega una descripción o indicaciones para que la IA tenga contexto suficiente.');
    }
}

export async function generarRubricaConIA(
    apiKey: string,
    ctx: ContextoInstrumento,
): Promise<DescriptorGenerado[]> {
    validarContextoBasico(ctx);

    const competenciasCtx = Object.entries(COMPETENCIAS_OFICIALES)
        .map(([codigo, nombre]) => `${codigo}: ${nombre}`)
        .join('\n   ');

    const prompt = `Eres un experto en evaluación formativa por competencias (modelo chileno de Evaluación Procesual por Estándares, EPES). Redacta los descriptores de una rúbrica analítica para evaluar una actividad escolar.

CONTEXTO:
${construirContexto(ctx)}

COMPETENCIAS BÁSICAS COMUNALES (BC):
   ${competenciasCtx}

NIVELES DE LOGRO (de mayor a menor):
${NIVELES_RUBRICAS.map(n => `   - ${n.nombre}: ${n.descripcion}`).join('\n')}

INSTRUCCIONES:
1. Para cada competencia devuelve un objeto con su código "bc" exacto.
2. Cada descriptor debe ser un comportamiento OBSERVABLE del estudiante en esa actividad, redactado en tercera persona, presente del indicativo (ej. "Expresa sus ideas...", "Registra datos...").
3. Los descriptores de un mismo bc deben mostrar una progresión clara entre niveles: Estratégico supera lo esperado, Autónomo cumple lo esperado de forma independiente, Resolutivo cumple parcialmente con apoyo puntual, Receptivo está en desarrollo y requiere apoyo constante.
4. Usa entre 1 y 2 oraciones cortas por celda. Sin viñetas, sin markdown, sin HTML, sin comillas tipográficas.
5. Concéntrate en desempeños directamente relacionados con la actividad y la asignatura indicadas. No inventes contenidos de otras asignaturas.
6. Si el contexto declara competencias asignadas ("bcAsignados"), enfatiza esas competencias con descriptores más específicos; el resto debe mantenerse coherente pero más general.
7. Español de Chile neutro, registro formal pedagógico.

Devuelve JSON exactamente con este esquema.`;

    const data = await callGeminiJson<{ descriptores: DescriptorGenerado[] }>(apiKey, prompt, {
        type: 'OBJECT',
        properties: {
            descriptores: {
                type: 'ARRAY',
                items: {
                    type: 'OBJECT',
                    properties: {
                        bc: { type: 'STRING', enum: ['BC1', 'BC2', 'BC3', 'BC4'] },
                        estrategico: { type: 'STRING' },
                        autonomo: { type: 'STRING' },
                        resolutivo: { type: 'STRING' },
                        receptivo: { type: 'STRING' }
                    },
                    required: ['bc', 'estrategico', 'autonomo', 'resolutivo', 'receptivo']
                }
            }
        },
        required: ['descriptores']
    });

    const validos = (data.descriptores || []).filter(d =>
        d.bc && ['BC1', 'BC2', 'BC3', 'BC4'].includes(d.bc)
    );

    if (validos.length === 0) {
        throw new Error('La IA no generó descriptores utilizables. Intenta agregar más detalles al contexto.');
    }

    return validos;
}

export async function generarCotejoConIA(
    apiKey: string,
    ctx: ContextoInstrumento,
): Promise<CriterioCotejo[]> {
    validarContextoBasico(ctx);

    const prompt = `Eres un experto en evaluación formativa escolar. Genera los criterios de una Lista de Cotejo (checklist de verificación binaria: Logrado / No cumple) para evaluar una actividad escolar.

CONTEXTO:
${construirContexto(ctx)}

INSTRUCCIONES:
1. Genera entre 6 y 10 criterios verificables mediante observación directa: cada criterio debe poder marcarse como "Logrado" o "No cumple" sin ambigüedad ni grados intermedios.
2. "titulo": frase corta (máximo 8 palabras) que nombre el criterio. Empieza con sustantivo o verbo en infinitivo (ej. "Presentación oral del tema").
3. "descripcion": una oración que precise qué debe observarse para marcar Logrado (comportamiento o producto observable y medible).
4. Todos los criterios deben estar directamente relacionados con la actividad, la asignatura y el nivel escolar indicados.
5. Ordena los criterios siguiendo la secuencia lógica de ejecución de la actividad.
6. Sin viñetas, sin markdown, sin HTML. Español de Chile neutro, registro formal pedagógico.

Devuelve JSON exactamente con este esquema.`;

    const data = await callGeminiJson<{ criterios: Array<{ titulo: string; descripcion: string }> }>(apiKey, prompt, {
        type: 'OBJECT',
        properties: {
            criterios: {
                type: 'ARRAY',
                items: {
                    type: 'OBJECT',
                    properties: {
                        titulo: { type: 'STRING' },
                        descripcion: { type: 'STRING' }
                    },
                    required: ['titulo', 'descripcion']
                }
            }
        },
        required: ['criterios']
    });

    const base = Date.now();
    const criterios = (data.criterios || [])
        .filter(c => c.titulo?.trim())
        .map((c, i) => ({
            id: base + i,
            titulo: c.titulo.trim(),
            descripcion: c.descripcion?.trim() || ''
        }));

    if (criterios.length === 0) {
        throw new Error('La IA no generó criterios utilizables. Intenta agregar más detalles al contexto.');
    }

    return criterios;
}
