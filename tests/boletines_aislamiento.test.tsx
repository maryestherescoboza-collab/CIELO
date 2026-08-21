// ─────────────────────────────────────────────────────────────────────────
// TEST DE AISLAMIENTO — COLORIMETRÍA DE BOLETINES (CIELO)
//
// Verifica que la configuración de color de cada plantilla de boletín
// (1ro–6to) renderiza sin excepciones y produce variables CSS válidas,
// incluso con cursos desconocidos o datos ausentes (sin pantalla blanca).
//
// Ejecución (no requiere framework):
//   npx esbuild tests/boletines_aislamiento.test.tsx --bundle
//     --platform=node --format=cjs --jsx=automatic
//     --outfile="%TEMP%/opencode/boletines-test/test.cjs"
//   node "%TEMP%/opencode/boletines-test/test.cjs"
// ─────────────────────────────────────────────────────────────────────────

import type { ReactElement } from 'react';
import { renderToString } from 'react-dom/server';
import Boletin1ero from '../src/templates/boletines/Boletin1ero';
import Boletin2do from '../src/templates/boletines/Boletin2do';
import Boletin3ero from '../src/templates/boletines/Boletin3ero';
import Boletin4to from '../src/templates/boletines/Boletin4to';
import Boletin5to from '../src/templates/boletines/Boletin5to';
import Boletin6to from '../src/templates/boletines/Boletin6to';
import type { BoletinTemplateProps } from '../src/templates/boletines/types';
import type { AppState, BCKey, Centro, Curso, Estudiante, UserProfile } from '../src/types';

type ComponenteBoletin = (props: BoletinTemplateProps) => ReactElement;

interface NotasAsignatura {
    P1: Record<BCKey, number | null>;
    P2: Record<BCKey, number | null>;
    P3: Record<BCKey, number | null>;
    P4: Record<BCKey, number | null>;
    PC: Record<BCKey, number | null>;
    finalGrade: number | null;
}

type NotasEstudiante = Record<number, Record<string, NotasAsignatura>>;

interface ResultadoCaso {
    nombre: string;
    ok: boolean;
    error?: string;
}

const resultados: ResultadoCaso[] = [];
let ejecucionesRender = 0;

function assert(condicion: unknown, mensaje: string): asserts condicion {
    if (!condicion) throw new Error(mensaje);
}

async function ejecutarCaso(nombre: string, fn: () => void): Promise<void> {
    try {
        fn();
        resultados.push({ nombre, ok: true });
        console.log(`  PASS  ${nombre}`);
    } catch (e) {
        resultados.push({ nombre, ok: false, error: e instanceof Error ? e.message : String(e) });
        console.log(`  FAIL  ${nombre}\n        ${e instanceof Error ? e.message : String(e)}`);
    }
}

// ── Datos de prueba ─────────────────────────────────────────────────────

const CENTRO_PRUEBA: Centro = { id: 'centro-test-001', nombre: 'Centro Educativo de Prueba' };

function crearCurso(grado: string, cursoId: number): Curso {
    return {
        id: cursoId,
        nombre: `Curso de Prueba ${grado}`,
        asignatura: 'Matemática',
        grado,
        seccion: 'A',
        periodo: 'P1',
        diasSemana: ['Lunes'],
        color: '#1c3f5f',
        userId: 'user-docente-001',
        grupoId: 1,
        sharedCourseId: 'sc-001',
        centroId: CENTRO_PRUEBA.id,
    };
}

function crearEstudiante(id: number, cursoId: number): Estudiante {
    const puntajeBC = { nivel: 2 as const, puntaje: 80 };
    return {
        id,
        nombre: 'Ana',
        apellido: 'Pérez',
        avatarColor: '#cc0000',
        cursoId,
        grupoId: 1,
        nivel: 2,
        puntaje: 80,
        bc1: puntajeBC,
        bc2: puntajeBC,
        bc3: puntajeBC,
        bc4: puntajeBC,
        actividadesRecientes: 3,
        enRiesgo: false,
        numeroLista: id,
    };
}

function crearPerfilDocente(): UserProfile {
    return {
        userId: 'user-docente-001',
        nombreDocente: 'Prof. Ana Docente',
        bio: '',
        avatarUrl: '',
        asignatura: 'Matemática',
    };
}

function crearStateBase(): AppState {
    return {
        cursos: [],
        estudiantes: [],
        incidencias: [],
        actividades: [],
        calificaciones: [],
        recuperaciones: [],
        secuencias: [],
        eventos: [],
        posts: [],
        descriptoresRubrica: [],
        nivelesPuntaje: [],
        evaluacionesRubrica: [],
        criteriosCotejo: [],
        evaluacionesCotejo: [],
        docentes: [],
        plantillas: [],
        cursoDetalle: [],
        perfiles: [crearPerfilDocente()],
        notificaciones: [],
        cursoDocentes: [],
        grupos: [],
        registrosAnecdoticos: [],
        registroImagenes: [],
        tareas: [],
        instituto: 'Instituto de Prueba CIELO',
        centros: [CENTRO_PRUEBA],
    };
}

function crearNotas(estudianteId: number): NotasEstudiante {
    const vacio = (): Record<BCKey, number | null> => ({ BC1: null, BC2: null, BC3: null, BC4: null });
    return {
        [estudianteId]: {
            MAT: {
                P1: { ...vacio(), BC1: 70 },
                P2: { ...vacio(), BC1: 75 },
                P3: { ...vacio(), BC1: 80 },
                P4: { ...vacio(), BC1: 85 },
                PC: { ...vacio(), BC1: 77 },
                finalGrade: 77,
            },
        },
    };
}

function crearProps(
    curso: Curso,
    state: AppState,
    estudiantes: Estudiante[],
    notas: NotasEstudiante
): BoletinTemplateProps {
    return {
        curso,
        estudiantes,
        docenteNombre: 'Prof. Ana Docente',
        studentGrades: notas,
        state,
    };
}

// Render SSR capturando console.error (avisos de runtime sin excepción).
function renderBoletin(Template: ComponenteBoletin, props: BoletinTemplateProps): string {
    const erroresConsola: string[] = [];
    const originalError = console.error;
    console.error = (...args: unknown[]) => {
        erroresConsola.push(args.map(a => (typeof a === 'string' ? a : JSON.stringify(a))).join(' '));
    };
    try {
        const html = renderToString(<Template {...props} />);
        ejecucionesRender += 1;
        if (erroresConsola.length > 0) {
            throw new Error(`console.error durante el render: ${erroresConsola[0]}`);
        }
        return html;
    } finally {
        console.error = originalError;
    }
}

const HEX_RE = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;

function extraerColorimetría(html: string): Record<string, string> {
    const vars: Record<string, string> = {};
    for (const m of html.matchAll(/--(navy|lightblue)\s*:\s*([^;}]+)/g)) {
        vars[m[1]] = m[2].trim();
    }
    return vars;
}

function validarColorimetría(nombreTemplate: string, html: string): void {
    const vars = extraerColorimetría(html);
    assert(vars.navy !== undefined, `${nombreTemplate}: no define --navy`);
    assert(vars.lightblue !== undefined, `${nombreTemplate}: no define --lightblue`);
    assert(HEX_RE.test(vars.navy), `${nombreTemplate}: --navy inválido (${vars.navy})`);
    assert(HEX_RE.test(vars.lightblue), `${nombreTemplate}: --lightblue inválido (${vars.lightblue})`);
}

function assertHtmlNoBlanco(nombreTemplate: string, html: string): void {
    assert(typeof html === 'string' && html.length > 500, `${nombreTemplate}: HTML vacío o demasiado corto (${html?.length ?? 0} chars) — posible pantalla blanca`);
}

// ── Escenarios ──────────────────────────────────────────────────────────

const PLANTILLAS_POR_GRADO: Array<{ grado: string; Template: ComponenteBoletin; etiqueta: string }> = [
    { grado: '1', Template: Boletin1ero, etiqueta: '1ro' },
    { grado: '2', Template: Boletin2do, etiqueta: '2do' },
    { grado: '3', Template: Boletin3ero, etiqueta: '3ro' },
    { grado: '4', Template: Boletin4to, etiqueta: '4to' },
    { grado: '5', Template: Boletin5to, etiqueta: '5to' },
    { grado: '6', Template: Boletin6to, etiqueta: '6to' },
];

async function main(): Promise<void> {
    console.log('\n═══ TEST DE AISLAMIENTO: COLORIMETRÍA DE BOLETINES ═══\n');

    // Casos 1–6: configuración de color por grado.
    for (const { grado, Template, etiqueta } of PLANTILLAS_POR_GRADO) {
        await ejecutarCaso(`Configuración de color de ${etiqueta} funciona`, () => {
            const curso = crearCurso(grado, 100 + Number(grado));
            const estudiante = crearEstudiante(1, curso.id);
            const props = crearProps(curso, crearStateBase(), [estudiante], crearNotas(estudiante.id));
            const html = renderBoletin(Template, props);
            assertHtmlNoBlanco(etiqueta, html);
            validarColorimetría(etiqueta, html);
        });
    }

    // Caso 7: curso desconocido no produce error.
    await ejecutarCaso('Curso desconocido no produce error', () => {
        for (const Template of [Boletin2do, Boletin4to]) {
            const cursoDesconocido = crearCurso('Grado Inventado XYZ', 999);
            const props = crearProps(cursoDesconocido, crearStateBase(), [], {});
            const html = renderBoletin(Template, props);
            assertHtmlNoBlanco('curso desconocido', html);
        }
    });

    // Caso 8: ausencia de datos del curso no provoca pantalla blanca.
    await ejecutarCaso('Ausencia de datos del curso no provoca pantalla blanca', () => {
        for (const { Template, etiqueta } of PLANTILLAS_POR_GRADO) {
            const stateVacio = crearStateBase();
            delete stateVacio.centros;
            const cursoSinCentro: Curso = { ...crearCurso('', 0), centroId: undefined, sharedCourseId: undefined, seccion: '' };
            const props = crearProps(cursoSinCentro, stateVacio, [], {});
            const html = renderBoletin(Template, props);
            assertHtmlNoBlanco(`${etiqueta} sin datos`, html);
        }
    });

    // Caso 9: los colores devueltos son válidos en todos los renders.
    await ejecutarCaso('Los colores devueltos son válidos (hex)', () => {
        for (const { grado, Template, etiqueta } of PLANTILLAS_POR_GRADO) {
            const curso = crearCurso(grado, 200 + Number(grado));
            const estudiante = crearEstudiante(7, curso.id);
            const props = crearProps(curso, crearStateBase(), [estudiante], crearNotas(estudiante.id));
            const html = renderToString(<Template {...props} />);
            ejecucionesRender += 1;
            const vars = extraerColorimetría(html);
            for (const [clave, valor] of Object.entries(vars)) {
                assert(HEX_RE.test(valor), `${etiqueta}: variable --${clave} no es un hex válido (${valor})`);
            }
        }
    });

    // Caso 10: el sistema de colorimetría completo se ejecuta sin lanzar excepciones.
    await ejecutarCaso('La colorimetría completa se ejecuta sin excepciones', () => {
        let rendersLocales = 0;
        for (const { grado, Template } of PLANTILLAS_POR_GRADO) {
            const variantes: Array<{ curso: Curso; state: AppState; estudiantes: Estudiante[]; notas: NotasEstudiante }> = [
                (() => {
                    const c = crearCurso(grado, 300 + Number(grado));
                    const e = crearEstudiante(11, c.id);
                    return { curso: c, state: crearStateBase(), estudiantes: [e], notas: crearNotas(e.id) };
                })(),
                (() => {
                    const c = crearCurso(grado, 400 + Number(grado));
                    return { curso: c, state: crearStateBase(), estudiantes: [], notas: {} };
                })(),
            ];
            for (const v of variantes) {
                renderBoletin(Template, crearProps(v.curso, v.state, v.estudiantes, v.notas));
                rendersLocales += 1;
            }
        }
        assert(rendersLocales === 12, `Se esperaban 12 renders limpios, hubo ${rendersLocales}`);
    });

    // ── Resumen ─────────────────────────────────────────────────────────
    const fallos = resultados.filter(r => !r.ok);
    const pasados = resultados.length - fallos.length;
    console.log(`\n═══ RESULTADO: ${pasados}/${resultados.length} casos PASS · ${ejecucionesRender} renders ejecutados ═══`);

    if (fallos.length > 0) {
        console.error('\nCASOS FALLIDOS:');
        for (const f of fallos) console.error(` - ${f.nombre}: ${f.error}`);
        process.exitCode = 1;
    } else {
        console.log('TODOS LOS CASOS PASARON');
    }
}

void main();
