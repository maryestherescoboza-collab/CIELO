// Generación de instrumentos de evaluación (Rúbrica / Lista de Cotejo) con IA.
// Sigue las convenciones de NewActivityModal: Gemini + responseSchema estricto,
// mensajes de error en español y clave nunca expuesta en logs.

import type { NivelPuntaje } from '../types';

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

export function generarPromptRubrica(ctx: ContextoInstrumento): string {
    validarContextoBasico(ctx);

    const competenciasCtx = Object.entries(COMPETENCIAS_OFICIALES)
        .map(([codigo, nombre]) => `${codigo}: ${nombre}`)
        .join('\n   ');

    return `Eres un experto en evaluación formativa por competencias (modelo chileno de Evaluación Procesual por Estándares, EPES). Redacta los descriptores de una rúbrica analítica para evaluar una actividad escolar.

CONTEXTO:
${construirContexto(ctx)}

COMPETENCIAS BÁSICAS COMUNALES (BC):
   ${competenciasCtx}

NIVELES DE LOGRO (de mayor a menor):
${NIVELES_RUBRICAS.map(n => `   - ${n.nombre}: ${n.descripcion}`).join('\n')}

INSTRUCCIONES DE ANÁLISIS:
Analiza qué se pretende evaluar, qué evidencias son observables en estas actividades y si pueden unificarse. Identifica los aspectos críticos de desempeño antes de construir la rúbrica. Razona sobre qué elementos deben evaluarse en cada nivel.
Cada descriptor debe ser un comportamiento OBSERVABLE del estudiante, redactado en tercera persona, presente del indicativo.
Los descriptores de un mismo bc deben mostrar una progresión clara entre niveles: Estratégico supera lo esperado, Autónomo cumple lo esperado de forma independiente, Resolutivo cumple parcialmente con apoyo puntual, Receptivo está en desarrollo y requiere apoyo constante.
Si el contexto declara competencias asignadas ("bcAsignados"), enfatiza esas competencias con descriptores más específicos.

INSTRUCCIONES DE SALIDA:
1. Redacta libremente tu análisis pedagógico y fundamenta tu propuesta.
2. Al FINAL de tu respuesta, incluye ESTRICTAMENTE un único bloque \`\`\`json con la rúbrica estructurada.
3. El JSON debe tener esta estructura exacta:
{
  "descriptores": [
    {
      "bc": "BC1", // (Solo usar: BC1, BC2, BC3 o BC4)
      "estrategico": "Descripción observable...",
      "autonomo": "Descripción observable...",
      "resolutivo": "Descripción observable...",
      "receptivo": "Descripción observable..."
    }
  ]
}`;
}


export function generarPromptCotejo(ctx: ContextoInstrumento): string {
    validarContextoBasico(ctx);

    return `Eres un experto en evaluación formativa escolar. Genera los criterios de una Lista de Cotejo (checklist de verificación binaria: Logrado / No cumple) para evaluar una actividad escolar.

CONTEXTO:
${construirContexto(ctx)}

INSTRUCCIONES DE ANÁLISIS:
Analiza los indicadores y determina qué acciones o características del producto son verdaderamente observables de forma binaria (Logrado/No Cumple). Descarta criterios ambiguos o redundantes. Razona sobre por qué seleccionaste esos criterios (genera entre 6 y 10). Ordena los criterios siguiendo la secuencia lógica de ejecución de la actividad.

INSTRUCCIONES DE SALIDA:
1. Redacta libremente tu análisis pedagógico y fundamenta tu propuesta.
2. Al FINAL de tu respuesta, incluye ESTRICTAMENTE un único bloque \`\`\`json con la lista de cotejo estructurada.
3. El JSON debe tener esta estructura exacta:
{
  "criterios": [
    {
      "titulo": "Frase corta (máx 8 palabras)",
      "descripcion": "Comportamiento o producto observable y medible para marcar Logrado"
    }
  ]
}`;
}
