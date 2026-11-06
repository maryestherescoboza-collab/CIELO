import {
    AlignmentType,
    BorderStyle,
    Document,
    Footer,
    Header,
    Packer,
    PageBreak,
    PageNumber,
    PageOrientation,
    Paragraph,
    ShadingType,
    Table,
    TableCell,
    TableRow,
    TextRun,
    VerticalAlign,
    WidthType,
} from 'docx';
import { saveAs } from 'file-saver';
import { normalizeArea } from './academic';
import { esEstudianteDelCurso } from './aislamiento';
import type {
    DescriptorRubrica,
    NivelPuntaje,
    CriterioCotejo,
    UserProfile,
    Curso,
    Actividad,
    Estudiante,
    CalificacionActividad,
    CursoDocente,
} from '../types';
import { COMPETENCIAS_LABEL } from '../types';
import { uploadDocxToDrive } from '../lib/googleDrive';

// Paleta de colores sobria y profesional para documentos educativos Word
const COLOR_TINTA = '1B1F2A';
const COLOR_TEXTO_MUTED = '4E5566';
const COLOR_GRIS_CLARO = '8A8FA0';
const COLOR_BORDE = 'D1D5DB';
const COLOR_BORDE_SUAVE = 'E5E7EB';
const COLOR_FONDO_HEADER = '1E293B'; // Azul pizarra oscuro
const COLOR_FONDO_META = 'F8FAFC'; // Gris perla suave

// Colores de niveles de desempeño según CIELO
const COLOR_ESTRATEGICO = '2E7D32'; // Verde bosque
const COLOR_AUTONOMO = 'B78103';    // Ámbar/dorado oscuro
const COLOR_RESOLUTIVO = 'C85A48';  // Terracota
const COLOR_RECEPTIVO = '5F665E';   // Pizarra
const COLOR_NOCUMPLE = 'C62828';    // Rojo carmesí

const BORDES_TABLA = {
    top: { style: BorderStyle.SINGLE, size: 4, color: COLOR_BORDE },
    bottom: { style: BorderStyle.SINGLE, size: 4, color: COLOR_BORDE },
    left: { style: BorderStyle.SINGLE, size: 4, color: COLOR_BORDE },
    right: { style: BorderStyle.SINGLE, size: 4, color: COLOR_BORDE },
    insideHorizontal: { style: BorderStyle.SINGLE, size: 4, color: COLOR_BORDE_SUAVE },
    insideVertical: { style: BorderStyle.SINGLE, size: 4, color: COLOR_BORDE_SUAVE },
};

const BORDES_SIN_EXTERIOR = {
    top: { style: BorderStyle.NONE, size: 0, color: 'auto' },
    bottom: { style: BorderStyle.NONE, size: 0, color: 'auto' },
    left: { style: BorderStyle.NONE, size: 0, color: 'auto' },
    right: { style: BorderStyle.NONE, size: 0, color: 'auto' },
    insideHorizontal: { style: BorderStyle.SINGLE, size: 2, color: COLOR_BORDE_SUAVE },
    insideVertical: { style: BorderStyle.NONE, size: 0, color: 'auto' },
};

export interface BaseExportOptions {
    curso: Curso | null | undefined;
    asignaturaNombre: string;
    periodo: string;
    actividad?: Actividad | null;
    userProfile?: UserProfile | null;
    estudiantes?: Estudiante[];
    tituloPersonalizado?: string;
}

export interface ExportarRubricaOptions extends BaseExportOptions {
    descriptores: DescriptorRubrica[];
    niveles: NivelPuntaje[];
    /** Mapeo de estudianteId -> { [descriptorId]: nivelVal (4 | 3 | 2 | 1) } */
    evaluaciones?: Record<number, Record<string, number>>;
}

export interface ExportarCotejoOptions extends BaseExportOptions {
    criterios: CriterioCotejo[];
    niveles: Array<{ val: number; label: string; pts: number }>;
    /** Mapeo de estudianteId -> { [criterioId]: valorNivel (0 | 100) } */
    evaluaciones?: Record<number, Record<number, number | null>>;
}

/**
 * Genera un nombre de archivo descriptivo y sanitizado para el documento Word.
 * Cumple con el formato: Rubrica_Matematicas_5to_Actividad.docx
 */
export function generarNombreArchivoInstrumento(
    tipo: 'Rubrica' | 'Lista_Cotejo',
    asignaturaNombre: string,
    curso: { grado?: string; seccion?: string } | null | undefined,
    actividadNombre?: string | null
): string {
    const grado = curso?.grado ? curso.grado.replace(/\s+/g, '') : '';
    const seccion = curso?.seccion ? curso.seccion.replace(/\s+/g, '') : '';
    const gradoSeccion = [grado, seccion].filter(Boolean).join('_');

    const partes = [
        tipo,
        asignaturaNombre || 'Asignatura',
        gradoSeccion,
        actividadNombre || ''
    ].filter(Boolean);

    const base = partes.join('_');
    const sanitizado = base
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9_\-]/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_|_$/g, '');

    return `${sanitizado || tipo}.docx`;
}

/**
 * Convierte un fragmento HTML enriquecido de descriptor o texto a TextRuns de docx.
 */
function htmlToRuns(html: string, options?: { size?: number; color?: string; boldDefault?: boolean }): TextRun[] {
    if (!html) {
        return [new TextRun({ text: '', size: options?.size ?? 18, color: options?.color ?? COLOR_TINTA })];
    }

    try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(`<div>${html}</div>`, 'text/html');
        const runs: TextRun[] = [];

        function walk(node: Node, bold = false, italic = false) {
            if (node.nodeType === Node.TEXT_NODE) {
                const text = node.textContent || '';
                if (text) {
                    runs.push(
                        new TextRun({
                            text,
                            bold: bold || options?.boldDefault || false,
                            italics: italic,
                            size: options?.size ?? 18,
                            color: options?.color ?? COLOR_TINTA,
                        })
                    );
                }
            } else if (node.nodeType === Node.ELEMENT_NODE) {
                const el = node as HTMLElement;
                const isBold = bold || el.tagName === 'B' || el.tagName === 'STRONG';
                const isItalic = italic || el.tagName === 'I' || el.tagName === 'EM';
                if (el.tagName === 'BR') {
                    runs.push(new TextRun({ break: 1 }));
                }
                el.childNodes.forEach(child => walk(child, isBold, isItalic));
            }
        }

        walk(doc.body);
        return runs.length > 0
            ? runs
            : [new TextRun({ text: html, size: options?.size ?? 18, color: options?.color ?? COLOR_TINTA })];
    } catch {
        const stripped = html.replace(/<[^>]+>/g, ' ').trim();
        return [new TextRun({ text: stripped, size: options?.size ?? 18, color: options?.color ?? COLOR_TINTA })];
    }
}

/**
 * Crea la tabla de encabezado institucional y datos de identificación.
 */
function crearTablaIdentificacion(
    titulo: string,
    subtitulo: string,
    options: BaseExportOptions
): Table {
    const { curso, asignaturaNombre, periodo, actividad, userProfile } = options;
    const centroNombre = userProfile?.centro?.nombre || userProfile?.institucion || userProfile?.instituto || 'Centro Educativo';
    const docenteNombre = userProfile?.nombreDocente || 'Docente titular';
    const gradoSeccion = curso ? `${curso.grado || ''} ${curso.seccion || ''}`.trim() : '—';
    const actividadTexto = actividad ? `${actividad.nombre} (${actividad.periodo})` : 'Instrumento en blanco / General';
    const fechaTexto = new Intl.DateTimeFormat('es-DO', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
    }).format(new Date());

    const celdaMeta = (etiqueta: string, valor: string, widthPercent: number) => {
        return new TableCell({
            width: { size: widthPercent, type: WidthType.PERCENTAGE },
            shading: { fill: COLOR_FONDO_META, type: ShadingType.CLEAR, color: 'auto' },
            margins: { top: 70, bottom: 70, left: 100, right: 100 },
            children: [
                new Paragraph({
                    spacing: { line: 220, after: 20 },
                    children: [
                        new TextRun({ text: etiqueta + ': ', bold: true, size: 17, color: COLOR_TEXTO_MUTED }),
                        new TextRun({ text: valor || '—', bold: false, size: 17, color: COLOR_TINTA }),
                    ],
                }),
            ],
        });
    };

    return new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: BORDES_SIN_EXTERIOR,
        rows: [
            // Fila de Título del Instrumento
            new TableRow({
                children: [
                    new TableCell({
                        columnSpan: 4,
                        width: { size: 100, type: WidthType.PERCENTAGE },
                        shading: { fill: COLOR_FONDO_HEADER, type: ShadingType.CLEAR, color: 'auto' },
                        margins: { top: 120, bottom: 120, left: 140, right: 140 },
                        children: [
                            new Paragraph({
                                alignment: AlignmentType.CENTER,
                                spacing: { after: 30 },
                                children: [
                                    new TextRun({
                                        text: titulo.toUpperCase(),
                                        bold: true,
                                        size: 26,
                                        color: 'FFFFFF',
                                    }),
                                ],
                            }),
                            new Paragraph({
                                alignment: AlignmentType.CENTER,
                                children: [
                                    new TextRun({
                                        text: subtitulo,
                                        italics: true,
                                        size: 18,
                                        color: 'CBD5E1',
                                    }),
                                ],
                            }),
                        ],
                    }),
                ],
            }),
            // Fila 1 de datos
            new TableRow({
                children: [
                    celdaMeta('Centro Educativo', centroNombre, 35),
                    celdaMeta('Docente', docenteNombre, 35),
                    celdaMeta('Grado y Sección', gradoSeccion, 15),
                    celdaMeta('Período', periodo, 15),
                ],
            }),
            // Fila 2 de datos
            new TableRow({
                children: [
                    celdaMeta('Asignatura', asignaturaNombre || '—', 35),
                    celdaMeta('Actividad', actividadTexto, 35),
                    celdaMeta('Fecha', fechaTexto, 30),
                ],
            }),
        ],
    });
}

/**
 * Crea una tabla anexa con la nómina de estudiantes y sus números de lista
 * para facilitar la lectura del documento impreso o en pantalla.
 */
function crearTablaNominaEstudiantes(estudiantes: Estudiante[]): Table | null {
    if (!estudiantes || estudiantes.length === 0) return null;

    const filas: TableRow[] = [];
    const columnasPorFila = 3;

    // Encabezado de la sección de nómina
    filas.push(
        new TableRow({
            children: [
                new TableCell({
                    columnSpan: columnasPorFila,
                    width: { size: 100, type: WidthType.PERCENTAGE },
                    shading: { fill: 'F1F5F9', type: ShadingType.CLEAR, color: 'auto' },
                    margins: { top: 80, bottom: 80, left: 100, right: 100 },
                    children: [
                        new Paragraph({
                            alignment: AlignmentType.START,
                            children: [
                                new TextRun({
                                    text: 'NÓMINA DE ESTUDIANTES (REFERENCIA DE NÚMEROS DE LISTA)',
                                    bold: true,
                                    size: 17,
                                    color: COLOR_TEXTO_MUTED,
                                }),
                            ],
                        }),
                    ],
                }),
            ],
        })
    );

    for (let i = 0; i < estudiantes.length; i += columnasPorFila) {
        const celdasFila: TableCell[] = [];
        for (let col = 0; col < columnasPorFila; col++) {
            const idxEst = i + col;
            const est = estudiantes[idxEst];
            const num = est ? (est.numeroLista || idxEst + 1) : null;
            const nombreCompleto = est ? `${num}. ${est.apellido || ''}, ${est.nombre || ''}`.trim() : '';

            celdasFila.push(
                new TableCell({
                    width: { size: Math.floor(100 / columnasPorFila), type: WidthType.PERCENTAGE },
                    margins: { top: 40, bottom: 40, left: 60, right: 60 },
                    children: [
                        new Paragraph({
                            spacing: { line: 200 },
                            children: [
                                new TextRun({
                                    text: nombreCompleto,
                                    size: 16,
                                    color: COLOR_TINTA,
                                }),
                            ],
                        }),
                    ],
                })
            );
        }
        filas.push(new TableRow({ children: celdasFila }));
    }

    return new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: BORDES_TABLA,
        rows: filas,
    });
}

// ═══════════════════════════════════════════════════════════════════════════
// GENERADOR DOCX — RÚBRICA
// ═══════════════════════════════════════════════════════════════════════════

export async function crearDocxRubrica(options: ExportarRubricaOptions): Promise<Blob> {
    const {
        descriptores,
        niveles,
        evaluaciones = {},
        estudiantes = [],
        actividad,
        tituloPersonalizado,
    } = options;

    const tituloDoc = tituloPersonalizado || 'Rúbrica Socioformativa de Evaluación';
    const subtituloDoc = actividad
        ? `Actividad vinculada: ${actividad.nombre} (${actividad.periodo})`
        : 'Plantilla de evaluación de competencias';

    // Ordenar estudiantes por número de lista
    const sortedEsts = [...estudiantes].sort((a, b) => {
        const numA = a.numeroLista || 0;
        const numB = b.numeroLista || 0;
        if (numA !== numB) return numA - numB;
        return (a.apellido + a.nombre).localeCompare(b.apellido + b.nombre);
    });

    // Mapeo de puntajes por nivel
    const ptsEstrategico = niveles.find(n => n.nivel === 4)?.puntaje ?? 100;
    const ptsAutonomo = niveles.find(n => n.nivel === 3)?.puntaje ?? 85;
    const ptsResolutivo = niveles.find(n => n.nivel === 2)?.puntaje ?? 70;
    const ptsReceptivo = niveles.find(n => n.nivel === 1)?.puntaje ?? 60;

    // Configuración de encabezados de nivel
    const encabezadosNivel = [
        { label: `ESTRATÉGICO (${ptsEstrategico} pts)`, nivel: 4, bg: COLOR_ESTRATEGICO },
        { label: `AUTÓNOMO (${ptsAutonomo} pts)`, nivel: 3, bg: COLOR_AUTONOMO },
        { label: `RESOLUTIVO (${ptsResolutivo} pts)`, nivel: 2, bg: COLOR_RESOLUTIVO },
        { label: `RECEPTIVO (${ptsReceptivo} pts)`, nivel: 1, bg: COLOR_RECEPTIVO },
    ];

    // Fila de encabezados de la tabla
    const celdasHeader: TableCell[] = [
        new TableCell({
            width: { size: 24, type: WidthType.PERCENTAGE },
            shading: { fill: COLOR_FONDO_HEADER, type: ShadingType.CLEAR, color: 'auto' },
            margins: { top: 120, bottom: 120, left: 100, right: 100 },
            children: [
                new Paragraph({
                    alignment: AlignmentType.CENTER,
                    children: [
                        new TextRun({
                            text: 'COMPETENCIAS / CRITERIOS',
                            bold: true,
                            size: 18,
                            color: 'FFFFFF',
                        }),
                    ],
                }),
            ],
        }),
    ];

    encabezadosNivel.forEach(h => {
        celdasHeader.push(
            new TableCell({
                width: { size: 19, type: WidthType.PERCENTAGE },
                shading: { fill: h.bg, type: ShadingType.CLEAR, color: 'auto' },
                margins: { top: 120, bottom: 120, left: 80, right: 80 },
                children: [
                    new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [
                            new TextRun({
                                text: h.label,
                                bold: true,
                                size: 17,
                                color: 'FFFFFF',
                            }),
                        ],
                    }),
                ],
            })
        );
    });

    const filasTabla: TableRow[] = [new TableRow({ children: celdasHeader })];

    // Filas de contenido por cada descriptor
    descriptores.forEach((desc) => {
        const nombreCompetencia = desc.bc ? (COMPETENCIAS_LABEL[desc.bc] || desc.bc) : (desc.indicador || 'Competencia');
        const parrafosComp: Paragraph[] = [
            new Paragraph({
                spacing: { after: 40 },
                children: [
                    new TextRun({
                        text: desc.bc ? `${desc.bc}: ${nombreCompetencia}` : nombreCompetencia,
                        bold: true,
                        size: 18,
                        color: COLOR_TINTA,
                    }),
                ],
            }),
        ];

        if (desc.indicador && desc.indicador !== nombreCompetencia) {
            parrafosComp.push(
                new Paragraph({
                    children: [
                        new TextRun({
                            text: desc.indicador,
                            italics: true,
                            size: 16,
                            color: COLOR_TEXTO_MUTED,
                        }),
                    ],
                })
            );
        }

        const celdaCompetencia = new TableCell({
            width: { size: 24, type: WidthType.PERCENTAGE },
            shading: { fill: 'F8FAFC', type: ShadingType.CLEAR, color: 'auto' },
            margins: { top: 100, bottom: 100, left: 100, right: 100 },
            children: parrafosComp,
        });

        const celdasNivelesFila: TableCell[] = [celdaCompetencia];

        encabezadosNivel.forEach((h) => {
            const nivelKey = h.nivel === 4 ? 'estrategico' : h.nivel === 3 ? 'autonomo' : h.nivel === 2 ? 'resolutivo' : 'receptivo';
            const textoDescriptor = (desc[nivelKey as keyof DescriptorRubrica] as string) || '';

            const parrafosCelda: Paragraph[] = [
                new Paragraph({
                    spacing: { line: 230, after: 60 },
                    children: htmlToRuns(textoDescriptor, { size: 17 }),
                }),
            ];

            // Inclusión de números de estudiantes según actividad seleccionada
            if (actividad && sortedEsts.length > 0) {
                const estudiantesEnCelda = sortedEsts
                    .map((s, idx) => ({ s, num: s.numeroLista || idx + 1 }))
                    .filter(({ s }) => evaluaciones[s.id]?.[desc.id] === h.nivel);

                if (estudiantesEnCelda.length > 0) {
                    const listaNumeros = estudiantesEnCelda.map(e => e.num).join(', ');
                    parrafosCelda.push(
                        new Paragraph({
                            spacing: { before: 80, after: 30 },
                            children: [
                                new TextRun({
                                    text: 'Estudiantes: ',
                                    bold: true,
                                    size: 16,
                                    color: COLOR_TEXTO_MUTED,
                                }),
                                new TextRun({
                                    text: listaNumeros,
                                    bold: true,
                                    size: 16,
                                    color: '0F766E', // Verde azulado distinguible
                                }),
                            ],
                        })
                    );
                }
            } else if (!actividad) {
                // Modo plantilla en blanco: línea para registro manual al imprimir
                parrafosCelda.push(
                    new Paragraph({
                        spacing: { before: 80 },
                        children: [
                            new TextRun({
                                text: 'Estudiantes: ________________',
                                italics: true,
                                size: 15,
                                color: COLOR_GRIS_CLARO,
                            }),
                        ],
                    })
                );
            }

            celdasNivelesFila.push(
                new TableCell({
                    width: { size: 19, type: WidthType.PERCENTAGE },
                    margins: { top: 100, bottom: 100, left: 80, right: 80 },
                    children: parrafosCelda,
                })
            );
        });

        filasTabla.push(new TableRow({ children: celdasNivelesFila }));
    });

    const tablaRubrica = new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: BORDES_TABLA,
        rows: filasTabla,
    });

    const bloques: (Table | Paragraph)[] = [
        crearTablaIdentificacion(tituloDoc, subtituloDoc, options),
        new Paragraph({ spacing: { before: 180, after: 80 } }),
        tablaRubrica,
    ];

    // Nómina de estudiantes anexa si hay actividad seleccionada
    if (actividad && sortedEsts.length > 0) {
        const tablaNomina = crearTablaNominaEstudiantes(sortedEsts);
        if (tablaNomina) {
            bloques.push(new Paragraph({ spacing: { before: 200, after: 80 } }));
            bloques.push(tablaNomina);
        }
    }

    const doc = new Document({
        creator: 'CIELO — Plataforma Educativa',
        title: tituloDoc,
        description: `Instrumento de evaluación exportado desde CIELO`,
        styles: {
            default: {
                document: {
                    run: { font: 'Arial', size: 18 },
                    paragraph: { spacing: { line: 240, after: 60 } },
                },
            },
        },
        sections: [
            {
                properties: {
                    page: {
                        size: {
                            orientation: PageOrientation.LANDSCAPE,
                            width: 16838, // A4 Landscape
                            height: 11906,
                        },
                        margin: { top: 900, right: 900, bottom: 900, left: 900 },
                    },
                },
                headers: {
                    default: new Header({
                        children: [
                            new Paragraph({
                                alignment: AlignmentType.RIGHT,
                                children: [
                                    new TextRun({
                                        text: 'CIELO · Plataforma Educativa',
                                        size: 15,
                                        color: COLOR_GRIS_CLARO,
                                    }),
                                ],
                            }),
                        ],
                    }),
                },
                footers: {
                    default: new Footer({
                        children: [
                            new Paragraph({
                                alignment: AlignmentType.CENTER,
                                children: [
                                    new TextRun({
                                        text: `Instrumento de evaluación · ${options.asignaturaNombre || 'CIELO'}   |   Página `,
                                        size: 15,
                                        color: COLOR_GRIS_CLARO,
                                    }),
                                    new TextRun({
                                        children: [PageNumber.CURRENT],
                                        size: 15,
                                        color: COLOR_GRIS_CLARO,
                                    }),
                                    new TextRun({
                                        text: ' de ',
                                        size: 15,
                                        color: COLOR_GRIS_CLARO,
                                    }),
                                    new TextRun({
                                        children: [PageNumber.TOTAL_PAGES],
                                        size: 15,
                                        color: COLOR_GRIS_CLARO,
                                    }),
                                ],
                            }),
                        ],
                    }),
                },
                children: bloques,
            },
        ],
    });

    return Packer.toBlob(doc);
}

// ═══════════════════════════════════════════════════════════════════════════
// GENERADOR DOCX — LISTA DE COTEJO
// ═══════════════════════════════════════════════════════════════════════════

export async function crearDocxCotejo(options: ExportarCotejoOptions): Promise<Blob> {
    const {
        criterios,
        niveles,
        evaluaciones = {},
        estudiantes = [],
        actividad,
        tituloPersonalizado,
    } = options;

    const tituloDoc = tituloPersonalizado || 'Lista de Cotejo';
    const subtituloDoc = actividad
        ? `Actividad vinculada: ${actividad.nombre} (${actividad.periodo})`
        : 'Registro de logros y verificación de competencias';

    const sortedEsts = [...estudiantes].sort((a, b) => {
        const numA = a.numeroLista || 0;
        const numB = b.numeroLista || 0;
        if (numA !== numB) return numA - numB;
        return (a.apellido + a.nombre).localeCompare(b.apellido + b.nombre);
    });

    // Columnas de niveles
    const nivelesConfig = niveles.length > 0 ? niveles : [
        { val: 0, label: 'No cumple', pts: 0 },
        { val: 100, label: 'Logrado', pts: 100 },
    ];

    const celdasHeader: TableCell[] = [
        new TableCell({
            width: { size: 66, type: WidthType.PERCENTAGE },
            shading: { fill: COLOR_FONDO_HEADER, type: ShadingType.CLEAR, color: 'auto' },
            margins: { top: 120, bottom: 120, left: 100, right: 100 },
            children: [
                new Paragraph({
                    alignment: AlignmentType.LEFT,
                    children: [
                        new TextRun({
                            text: 'INDICADORES DE LOGRO / CRITERIOS',
                            bold: true,
                            size: 18,
                            color: 'FFFFFF',
                        }),
                    ],
                }),
            ],
        }),
    ];

    const anchoNivel = Math.floor(34 / nivelesConfig.length);

    nivelesConfig.forEach((n) => {
        const bgNivel = n.val === 100 ? COLOR_ESTRATEGICO : COLOR_NOCUMPLE;
        celdasHeader.push(
            new TableCell({
                width: { size: anchoNivel, type: WidthType.PERCENTAGE },
                shading: { fill: bgNivel, type: ShadingType.CLEAR, color: 'auto' },
                margins: { top: 120, bottom: 120, left: 80, right: 80 },
                children: [
                    new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [
                            new TextRun({
                                text: `${n.label.toUpperCase()} (${n.pts} pts)`,
                                bold: true,
                                size: 17,
                                color: 'FFFFFF',
                            }),
                        ],
                    }),
                ],
            })
        );
    });

    const filasTabla: TableRow[] = [new TableRow({ children: celdasHeader })];

    criterios.forEach((crit, index) => {
        const descTexto = crit.descripcion || crit.titulo || `Criterio ${index + 1}`;

        const celdaCriterio = new TableCell({
            width: { size: 66, type: WidthType.PERCENTAGE },
            margins: { top: 90, bottom: 90, left: 100, right: 100 },
            children: [
                new Paragraph({
                    spacing: { line: 230 },
                    children: [
                        new TextRun({
                            text: `${index + 1}. `,
                            bold: true,
                            size: 18,
                            color: COLOR_TINTA,
                        }),
                        ...htmlToRuns(descTexto, { size: 18 }),
                    ],
                }),
            ],
        });

        const celdasFila: TableCell[] = [celdaCriterio];

        nivelesConfig.forEach((n) => {
            const parrafosNivel: Paragraph[] = [];

            if (actividad && sortedEsts.length > 0) {
                const estudiantesEnCelda = sortedEsts
                    .map((s, idx) => ({ s, num: s.numeroLista || idx + 1 }))
                    .filter(({ s }) => evaluaciones[s.id]?.[crit.id] === n.val);

                if (estudiantesEnCelda.length > 0) {
                    const listaNumeros = estudiantesEnCelda.map(e => e.num).join(', ');
                    parrafosNivel.push(
                        new Paragraph({
                            alignment: AlignmentType.CENTER,
                            spacing: { line: 220 },
                            children: [
                                new TextRun({
                                    text: 'Estudiantes: ',
                                    bold: true,
                                    size: 16,
                                    color: COLOR_TEXTO_MUTED,
                                }),
                                new TextRun({
                                    text: listaNumeros,
                                    bold: true,
                                    size: 16,
                                    color: n.val === 100 ? '0F766E' : 'B91C1C',
                                }),
                            ],
                        })
                    );
                } else {
                    parrafosNivel.push(
                        new Paragraph({
                            alignment: AlignmentType.CENTER,
                            children: [
                                new TextRun({
                                    text: '—',
                                    size: 16,
                                    color: COLOR_GRIS_CLARO,
                                }),
                            ],
                        })
                    );
                }
            } else {
                // Modo plantilla en blanco
                parrafosNivel.push(
                    new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [
                            new TextRun({
                                text: '[   ]',
                                size: 20,
                                color: COLOR_TEXTO_MUTED,
                            }),
                        ],
                    })
                );
            }

            celdasFila.push(
                new TableCell({
                    width: { size: anchoNivel, type: WidthType.PERCENTAGE },
                    margins: { top: 90, bottom: 90, left: 80, right: 80 },
                    children: parrafosNivel,
                })
            );
        });

        filasTabla.push(new TableRow({ children: celdasFila }));
    });

    const tablaCotejo = new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: BORDES_TABLA,
        rows: filasTabla,
    });

    const bloques: (Table | Paragraph)[] = [
        crearTablaIdentificacion(tituloDoc, subtituloDoc, options),
        new Paragraph({ spacing: { before: 180, after: 80 } }),
        tablaCotejo,
    ];

    if (actividad && sortedEsts.length > 0) {
        const tablaNomina = crearTablaNominaEstudiantes(sortedEsts);
        if (tablaNomina) {
            bloques.push(new Paragraph({ spacing: { before: 200, after: 80 } }));
            bloques.push(tablaNomina);
        }
    }

    const doc = new Document({
        creator: 'CIELO — Plataforma Educativa',
        title: tituloDoc,
        description: `Lista de cotejo exportada desde CIELO`,
        styles: {
            default: {
                document: {
                    run: { font: 'Arial', size: 18 },
                    paragraph: { spacing: { line: 240, after: 60 } },
                },
            },
        },
        sections: [
            {
                properties: {
                    page: {
                        size: {
                            orientation: PageOrientation.LANDSCAPE,
                            width: 16838,
                            height: 11906,
                        },
                        margin: { top: 900, right: 900, bottom: 900, left: 900 },
                    },
                },
                headers: {
                    default: new Header({
                        children: [
                            new Paragraph({
                                alignment: AlignmentType.RIGHT,
                                children: [
                                    new TextRun({
                                        text: 'CIELO · Plataforma Educativa',
                                        size: 15,
                                        color: COLOR_GRIS_CLARO,
                                    }),
                                ],
                            }),
                        ],
                    }),
                },
                footers: {
                    default: new Footer({
                        children: [
                            new Paragraph({
                                alignment: AlignmentType.CENTER,
                                children: [
                                    new TextRun({
                                        text: `Lista de cotejo · ${options.asignaturaNombre || 'CIELO'}   |   Página `,
                                        size: 15,
                                        color: COLOR_GRIS_CLARO,
                                    }),
                                    new TextRun({
                                        children: [PageNumber.CURRENT],
                                        size: 15,
                                        color: COLOR_GRIS_CLARO,
                                    }),
                                    new TextRun({
                                        text: ' de ',
                                        size: 15,
                                        color: COLOR_GRIS_CLARO,
                                    }),
                                    new TextRun({
                                        children: [PageNumber.TOTAL_PAGES],
                                        size: 15,
                                        color: COLOR_GRIS_CLARO,
                                    }),
                                ],
                            }),
                        ],
                    }),
                },
                children: bloques,
            },
        ],
    });

    return Packer.toBlob(doc);
}

// ═══════════════════════════════════════════════════════════════════════════
// ACCIONES DE DESCARGA Y GUARDADO EN GOOGLE DRIVE
// ═══════════════════════════════════════════════════════════════════════════

export async function descargarRubricaDocx(options: ExportarRubricaOptions): Promise<string> {
    const blob = await crearDocxRubrica(options);
    const nombreArchivo = generarNombreArchivoInstrumento(
        'Rubrica',
        options.asignaturaNombre,
        options.curso,
        options.actividad?.nombre
    );
    saveAs(blob, nombreArchivo);
    return nombreArchivo;
}

export async function guardarRubricaEnDrive(
    options: ExportarRubricaOptions
): Promise<{ fileId: string; viewUrl: string; fileName: string }> {
    const blob = await crearDocxRubrica(options);
    const fileName = generarNombreArchivoInstrumento(
        'Rubrica',
        options.asignaturaNombre,
        options.curso,
        options.actividad?.nombre
    );
    const { fileId, viewUrl } = await uploadDocxToDrive(blob, fileName);
    return { fileId, viewUrl, fileName };
}

export async function descargarCotejoDocx(options: ExportarCotejoOptions): Promise<string> {
    const blob = await crearDocxCotejo(options);
    const nombreArchivo = generarNombreArchivoInstrumento(
        'Lista_Cotejo',
        options.asignaturaNombre,
        options.curso,
        options.actividad?.nombre
    );
    saveAs(blob, nombreArchivo);
    return nombreArchivo;
}

export async function guardarCotejoEnDrive(
    options: ExportarCotejoOptions
): Promise<{ fileId: string; viewUrl: string; fileName: string }> {
    const blob = await crearDocxCotejo(options);
    const fileName = generarNombreArchivoInstrumento(
        'Lista_Cotejo',
        options.asignaturaNombre,
        options.curso,
        options.actividad?.nombre
    );
    const { fileId, viewUrl } = await uploadDocxToDrive(blob, fileName);
    return { fileId, viewUrl, fileName };
}

// ═══════════════════════════════════════════════════════════════════════════
// EXPORTACIÓN MASIVA: EVALUACIONES POR PERÍODO Y PLANTILLAS
// ═══════════════════════════════════════════════════════════════════════════

export interface EvaluacionActividadRubrica {
    actividad: Actividad;
    descriptores: DescriptorRubrica[];
    niveles: NivelPuntaje[];
    evaluaciones: Record<number, Record<string, number>>;
    puntajes?: Record<number, number>;
    observaciones?: Record<number, string>;
}

export interface ExportarEvaluacionesPeriodoRubricaOptions {
    curso: Curso | null | undefined;
    asignaturaNombre: string;
    periodo: string;
    userProfile?: UserProfile | null;
    estudiantes: Estudiante[];
    actividadesEvaluadas: EvaluacionActividadRubrica[];
}

export interface PlantillaRubricaItem {
    id?: number;
    nombre: string;
    descriptores: DescriptorRubrica[];
    niveles: NivelPuntaje[];
}

export interface ExportarPlantillasRubricaOptions {
    curso: Curso | null | undefined;
    asignaturaNombre: string;
    userProfile?: UserProfile | null;
    plantillas: PlantillaRubricaItem[];
}

export interface EvaluacionActividadCotejo {
    actividad: Actividad;
    criterios: CriterioCotejo[];
    niveles: Array<{ val: number; label: string; pts: number }>;
    evaluaciones: Record<number, Record<number, number | null>>;
    puntajes?: Record<number, number>;
    observaciones?: Record<number, string>;
}

export interface ExportarEvaluacionesPeriodoCotejoOptions {
    curso: Curso | null | undefined;
    asignaturaNombre: string;
    periodo: string;
    userProfile?: UserProfile | null;
    estudiantes: Estudiante[];
    actividadesEvaluadas: EvaluacionActividadCotejo[];
}

export interface PlantillaCotejoItem {
    id?: number;
    nombre: string;
    criterios: CriterioCotejo[];
    niveles: Array<{ val: number; label: string; pts: number }>;
}

export interface ExportarPlantillasCotejoOptions {
    curso: Curso | null | undefined;
    asignaturaNombre: string;
    userProfile?: UserProfile | null;
    plantillas: PlantillaCotejoItem[];
}

/**
 * Tabla resumen de calificaciones y niveles por estudiante para una actividad de rúbrica
 */
function crearTablaResumenEstudiantesRubrica(
    estudiantes: Estudiante[],
    evaluaciones: Record<number, Record<string, number>>,
    puntajes?: Record<number, number>,
    observaciones?: Record<number, string>
): Table | null {
    const evaluados = estudiantes.filter(e => Boolean(evaluaciones[e.id] && Object.keys(evaluaciones[e.id]).length > 0));
    if (evaluados.length === 0) return null;

    const filas: TableRow[] = [
        new TableRow({
            children: [
                new TableCell({
                    width: { size: 8, type: WidthType.PERCENTAGE },
                    shading: { fill: 'F1F5F9', type: ShadingType.CLEAR, color: 'auto' },
                    margins: { top: 70, bottom: 70, left: 60, right: 60 },
                    children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'No.', bold: true, size: 16, color: COLOR_TEXTO_MUTED })] })],
                }),
                new TableCell({
                    width: { size: 34, type: WidthType.PERCENTAGE },
                    shading: { fill: 'F1F5F9', type: ShadingType.CLEAR, color: 'auto' },
                    margins: { top: 70, bottom: 70, left: 80, right: 80 },
                    children: [new Paragraph({ children: [new TextRun({ text: 'Estudiante', bold: true, size: 16, color: COLOR_TEXTO_MUTED })] })],
                }),
                new TableCell({
                    width: { size: 18, type: WidthType.PERCENTAGE },
                    shading: { fill: 'F1F5F9', type: ShadingType.CLEAR, color: 'auto' },
                    margins: { top: 70, bottom: 70, left: 60, right: 60 },
                    children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Puntaje', bold: true, size: 16, color: COLOR_TEXTO_MUTED })] })],
                }),
                new TableCell({
                    width: { size: 20, type: WidthType.PERCENTAGE },
                    shading: { fill: 'F1F5F9', type: ShadingType.CLEAR, color: 'auto' },
                    margins: { top: 70, bottom: 70, left: 60, right: 60 },
                    children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Nivel General', bold: true, size: 16, color: COLOR_TEXTO_MUTED })] })],
                }),
                new TableCell({
                    width: { size: 20, type: WidthType.PERCENTAGE },
                    shading: { fill: 'F1F5F9', type: ShadingType.CLEAR, color: 'auto' },
                    margins: { top: 70, bottom: 70, left: 60, right: 60 },
                    children: [new Paragraph({ children: [new TextRun({ text: 'Observaciones', bold: true, size: 16, color: COLOR_TEXTO_MUTED })] })],
                }),
            ],
        }),
    ];

    evaluados.forEach((est, idx) => {
        const num = est.numeroLista || idx + 1;
        const nombre = `${est.apellido || ''}, ${est.nombre || ''}`.trim();
        const score = puntajes?.[est.id] !== undefined ? puntajes[est.id] : null;
        const obs = observaciones?.[est.id] || '—';

        let nivelTexto = 'En proceso';
        let colorNivel = COLOR_TEXTO_MUTED;
        if (score !== null) {
            if (score >= 90) { nivelTexto = 'Estratégico'; colorNivel = COLOR_ESTRATEGICO; }
            else if (score >= 80) { nivelTexto = 'Autónomo'; colorNivel = COLOR_AUTONOMO; }
            else if (score >= 70) { nivelTexto = 'Resolutivo'; colorNivel = COLOR_RESOLUTIVO; }
            else { nivelTexto = 'Receptivo'; colorNivel = COLOR_NOCUMPLE; }
        }

        filas.push(
            new TableRow({
                children: [
                    new TableCell({
                        width: { size: 8, type: WidthType.PERCENTAGE },
                        margins: { top: 60, bottom: 60, left: 60, right: 60 },
                        children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: String(num), bold: true, size: 16, color: COLOR_TEXTO_MUTED })] })],
                    }),
                    new TableCell({
                        width: { size: 34, type: WidthType.PERCENTAGE },
                        margins: { top: 60, bottom: 60, left: 80, right: 80 },
                        children: [new Paragraph({ children: [new TextRun({ text: nombre, bold: false, size: 16, color: COLOR_TINTA })] })],
                    }),
                    new TableCell({
                        width: { size: 18, type: WidthType.PERCENTAGE },
                        margins: { top: 60, bottom: 60, left: 60, right: 60 },
                        children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: score !== null ? `${score} / 100` : '—', bold: true, size: 16, color: COLOR_TINTA })] })],
                    }),
                    new TableCell({
                        width: { size: 20, type: WidthType.PERCENTAGE },
                        margins: { top: 60, bottom: 60, left: 60, right: 60 },
                        children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: nivelTexto, bold: true, size: 16, color: colorNivel })] })],
                    }),
                    new TableCell({
                        width: { size: 20, type: WidthType.PERCENTAGE },
                        margins: { top: 60, bottom: 60, left: 60, right: 60 },
                        children: [new Paragraph({ children: [new TextRun({ text: obs, italics: true, size: 15, color: COLOR_TEXTO_MUTED })] })],
                    }),
                ],
            })
        );
    });

    return new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: BORDES_TABLA,
        rows: filas,
    });
}

/**
 * Tabla resumen de calificaciones y logros por estudiante para una actividad de lista de cotejo
 */
function crearTablaResumenEstudiantesCotejo(
    estudiantes: Estudiante[],
    totalCriterios: number,
    evaluaciones: Record<number, Record<number, number | null>>,
    puntajes?: Record<number, number>,
    observaciones?: Record<number, string>
): Table | null {
    const evaluados = estudiantes.filter(e => Boolean(evaluaciones[e.id] && Object.keys(evaluaciones[e.id]).length > 0));
    if (evaluados.length === 0) return null;

    const filas: TableRow[] = [
        new TableRow({
            children: [
                new TableCell({
                    width: { size: 8, type: WidthType.PERCENTAGE },
                    shading: { fill: 'F1F5F9', type: ShadingType.CLEAR, color: 'auto' },
                    margins: { top: 70, bottom: 70, left: 60, right: 60 },
                    children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'No.', bold: true, size: 16, color: COLOR_TEXTO_MUTED })] })],
                }),
                new TableCell({
                    width: { size: 34, type: WidthType.PERCENTAGE },
                    shading: { fill: 'F1F5F9', type: ShadingType.CLEAR, color: 'auto' },
                    margins: { top: 70, bottom: 70, left: 80, right: 80 },
                    children: [new Paragraph({ children: [new TextRun({ text: 'Estudiante', bold: true, size: 16, color: COLOR_TEXTO_MUTED })] })],
                }),
                new TableCell({
                    width: { size: 20, type: WidthType.PERCENTAGE },
                    shading: { fill: 'F1F5F9', type: ShadingType.CLEAR, color: 'auto' },
                    margins: { top: 70, bottom: 70, left: 60, right: 60 },
                    children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Criterios Logrados', bold: true, size: 16, color: COLOR_TEXTO_MUTED })] })],
                }),
                new TableCell({
                    width: { size: 18, type: WidthType.PERCENTAGE },
                    shading: { fill: 'F1F5F9', type: ShadingType.CLEAR, color: 'auto' },
                    margins: { top: 70, bottom: 70, left: 60, right: 60 },
                    children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Calificación', bold: true, size: 16, color: COLOR_TEXTO_MUTED })] })],
                }),
                new TableCell({
                    width: { size: 20, type: WidthType.PERCENTAGE },
                    shading: { fill: 'F1F5F9', type: ShadingType.CLEAR, color: 'auto' },
                    margins: { top: 70, bottom: 70, left: 60, right: 60 },
                    children: [new Paragraph({ children: [new TextRun({ text: 'Observaciones', bold: true, size: 16, color: COLOR_TEXTO_MUTED })] })],
                }),
            ],
        }),
    ];

    evaluados.forEach((est, idx) => {
        const num = est.numeroLista || idx + 1;
        const nombre = `${est.apellido || ''}, ${est.nombre || ''}`.trim();
        const studentResp = evaluaciones[est.id] || {};
        const logrados = Object.values(studentResp).filter(v => v === 100).length;
        const score = puntajes?.[est.id] !== undefined ? puntajes[est.id] : Math.round((logrados / (totalCriterios || 1)) * 100);
        const obs = observaciones?.[est.id] || '—';

        filas.push(
            new TableRow({
                children: [
                    new TableCell({
                        width: { size: 8, type: WidthType.PERCENTAGE },
                        margins: { top: 60, bottom: 60, left: 60, right: 60 },
                        children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: String(num), bold: true, size: 16, color: COLOR_TEXTO_MUTED })] })],
                    }),
                    new TableCell({
                        width: { size: 34, type: WidthType.PERCENTAGE },
                        margins: { top: 60, bottom: 60, left: 80, right: 80 },
                        children: [new Paragraph({ children: [new TextRun({ text: nombre, bold: false, size: 16, color: COLOR_TINTA })] })],
                    }),
                    new TableCell({
                        width: { size: 20, type: WidthType.PERCENTAGE },
                        margins: { top: 60, bottom: 60, left: 60, right: 60 },
                        children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `${logrados} de ${totalCriterios}`, bold: true, size: 16, color: COLOR_ESTRATEGICO })] })],
                    }),
                    new TableCell({
                        width: { size: 18, type: WidthType.PERCENTAGE },
                        margins: { top: 60, bottom: 60, left: 60, right: 60 },
                        children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `${score} / 100`, bold: true, size: 16, color: COLOR_TINTA })] })],
                    }),
                    new TableCell({
                        width: { size: 20, type: WidthType.PERCENTAGE },
                        margins: { top: 60, bottom: 60, left: 60, right: 60 },
                        children: [new Paragraph({ children: [new TextRun({ text: obs, italics: true, size: 15, color: COLOR_TEXTO_MUTED })] })],
                    }),
                ],
            })
        );
    });

    return new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: BORDES_TABLA,
        rows: filas,
    });
}

/**
 * 1. DESCARGAR TODAS LAS EVALUACIONES DE RÚBRICA DEL PERÍODO
 */
export async function descargarEvaluacionesPeriodoRubricaDocx(
    options: ExportarEvaluacionesPeriodoRubricaOptions
): Promise<string> {
    const { curso, asignaturaNombre, periodo, userProfile, estudiantes, actividadesEvaluadas } = options;

    const sortedEsts = [...estudiantes].sort((a, b) => {
        const numA = a.numeroLista || 0;
        const numB = b.numeroLista || 0;
        if (numA !== numB) return numA - numB;
        return (a.apellido + a.nombre).localeCompare(b.apellido + b.nombre);
    });

    const tituloDoc = `Evaluaciones de Rúbrica — Período ${periodo}`;
    const subtituloDoc = `Registro completo de evaluaciones realizadas · ${asignaturaNombre}`;

    const bloques: (Table | Paragraph)[] = [
        crearTablaIdentificacion(tituloDoc, subtituloDoc, {
            curso,
            asignaturaNombre,
            periodo,
            actividad: null,
            userProfile,
        }),
    ];

    // Nómina de referencia de estudiantes
    if (sortedEsts.length > 0) {
        const tablaNomina = crearTablaNominaEstudiantes(sortedEsts);
        if (tablaNomina) {
            bloques.push(new Paragraph({ spacing: { before: 180, after: 80 } }));
            bloques.push(tablaNomina);
        }
    }

    if (actividadesEvaluadas.length === 0) {
        bloques.push(new Paragraph({
            spacing: { before: 240 },
            children: [new TextRun({ text: `No se encontraron evaluaciones registradas en el período ${periodo}.`, italics: true, size: 18, color: COLOR_TEXTO_MUTED })],
        }));
    }

    actividadesEvaluadas.forEach((item, actIndex) => {
        const act = item.actividad;
        const descriptores = item.descriptores;
        const niveles = item.niveles;
        const evaluaciones = item.evaluaciones;

        // Separador / Título de Actividad
        bloques.push(
            new Paragraph({
                spacing: { before: 280, after: 100 },
                children: [
                    new TextRun({
                        text: `ACTIVIDAD ${actIndex + 1}: ${act.nombre.toUpperCase()} (${act.periodo})`,
                        bold: true,
                        size: 22,
                        color: COLOR_FONDO_HEADER,
                    }),
                ],
            })
        );

        if (act.indicador || act.descripcion) {
            bloques.push(
                new Paragraph({
                    spacing: { after: 100 },
                    children: [
                        new TextRun({
                            text: `Indicador: ${act.indicador || act.descripcion || ''}`,
                            italics: true,
                            size: 16,
                            color: COLOR_TEXTO_MUTED,
                        }),
                    ],
                })
            );
        }

        // Matriz de Rúbrica para esta actividad
        const ptsE = niveles.find(n => n.nivel === 4)?.puntaje ?? 100;
        const ptsA = niveles.find(n => n.nivel === 3)?.puntaje ?? 85;
        const ptsR = niveles.find(n => n.nivel === 2)?.puntaje ?? 70;
        const ptsI = niveles.find(n => n.nivel === 1)?.puntaje ?? 60;

        const encabezadosNivel = [
            { label: `ESTRATÉGICO (${ptsE} pts)`, nivel: 4, bg: COLOR_ESTRATEGICO },
            { label: `AUTÓNOMO (${ptsA} pts)`, nivel: 3, bg: COLOR_AUTONOMO },
            { label: `RESOLUTIVO (${ptsR} pts)`, nivel: 2, bg: COLOR_RESOLUTIVO },
            { label: `RECEPTIVO (${ptsI} pts)`, nivel: 1, bg: COLOR_RECEPTIVO },
        ];

        const celdasHeader: TableCell[] = [
            new TableCell({
                width: { size: 24, type: WidthType.PERCENTAGE },
                shading: { fill: COLOR_FONDO_HEADER, type: ShadingType.CLEAR, color: 'auto' },
                margins: { top: 100, bottom: 100, left: 100, right: 100 },
                children: [
                    new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [new TextRun({ text: 'COMPETENCIAS / CRITERIOS', bold: true, size: 17, color: 'FFFFFF' })],
                    }),
                ],
            }),
        ];

        encabezadosNivel.forEach(h => {
            celdasHeader.push(
                new TableCell({
                    width: { size: 19, type: WidthType.PERCENTAGE },
                    shading: { fill: h.bg, type: ShadingType.CLEAR, color: 'auto' },
                    margins: { top: 100, bottom: 100, left: 80, right: 80 },
                    children: [
                        new Paragraph({
                            alignment: AlignmentType.CENTER,
                            children: [new TextRun({ text: h.label, bold: true, size: 16, color: 'FFFFFF' })],
                        }),
                    ],
                })
            );
        });

        const filasTabla: TableRow[] = [new TableRow({ children: celdasHeader })];

        descriptores.forEach((desc) => {
            const nombreComp = desc.bc ? (COMPETENCIAS_LABEL[desc.bc] || desc.bc) : (desc.indicador || 'Competencia');
            const parrafosComp: Paragraph[] = [
                new Paragraph({
                    spacing: { after: 30 },
                    children: [new TextRun({ text: desc.bc ? `${desc.bc}: ${nombreComp}` : nombreComp, bold: true, size: 17, color: COLOR_TINTA })],
                }),
            ];
            if (desc.indicador && desc.indicador !== nombreComp) {
                parrafosComp.push(
                    new Paragraph({
                        children: [new TextRun({ text: desc.indicador, italics: true, size: 15, color: COLOR_TEXTO_MUTED })],
                    })
                );
            }

            const celdasFila: TableCell[] = [
                new TableCell({
                    width: { size: 24, type: WidthType.PERCENTAGE },
                    shading: { fill: 'F8FAFC', type: ShadingType.CLEAR, color: 'auto' },
                    margins: { top: 90, bottom: 90, left: 90, right: 90 },
                    children: parrafosComp,
                }),
            ];

            encabezadosNivel.forEach((h) => {
                const nivelKey = h.nivel === 4 ? 'estrategico' : h.nivel === 3 ? 'autonomo' : h.nivel === 2 ? 'resolutivo' : 'receptivo';
                const textoDesc = (desc[nivelKey as keyof DescriptorRubrica] as string) || '';

                const parrafosCelda: Paragraph[] = [
                    new Paragraph({
                        spacing: { line: 220, after: 50 },
                        children: htmlToRuns(textoDesc, { size: 16 }),
                    }),
                ];

                const estsEnCelda = sortedEsts
                    .map((s, idx) => ({ s, num: s.numeroLista || idx + 1 }))
                    .filter(({ s }) => evaluaciones[s.id]?.[desc.id] === h.nivel);

                if (estsEnCelda.length > 0) {
                    parrafosCelda.push(
                        new Paragraph({
                            spacing: { before: 60, after: 20 },
                            children: [
                                new TextRun({ text: 'Estudiantes: ', bold: true, size: 15, color: COLOR_TEXTO_MUTED }),
                                new TextRun({ text: estsEnCelda.map(e => e.num).join(', '), bold: true, size: 15, color: '0F766E' }),
                            ],
                        })
                    );
                }

                celdasFila.push(
                    new TableCell({
                        width: { size: 19, type: WidthType.PERCENTAGE },
                        margins: { top: 90, bottom: 90, left: 80, right: 80 },
                        children: parrafosCelda,
                    })
                );
            });

            filasTabla.push(new TableRow({ children: celdasFila }));
        });

        bloques.push(
            new Table({
                width: { size: 100, type: WidthType.PERCENTAGE },
                borders: BORDES_TABLA,
                rows: filasTabla,
            })
        );

        // Tabla resumen de resultados de estudiantes para esta actividad
        const tablaResumen = crearTablaResumenEstudiantesRubrica(
            sortedEsts,
            evaluaciones,
            item.puntajes,
            item.observaciones
        );
        if (tablaResumen) {
            bloques.push(
                new Paragraph({
                    spacing: { before: 140, after: 60 },
                    children: [new TextRun({ text: `Calificaciones y Desempeño — ${act.nombre}`, bold: true, size: 17, color: COLOR_TEXTO_MUTED })],
                })
            );
            bloques.push(tablaResumen);
        }
    });

    const doc = new Document({
        creator: 'CIELO — Plataforma Educativa',
        title: tituloDoc,
        description: `Evaluaciones de Rúbrica del Período ${periodo}`,
        sections: [
            {
                properties: {
                    page: {
                        size: { orientation: PageOrientation.LANDSCAPE, width: 16838, height: 11906 },
                        margin: { top: 900, right: 900, bottom: 900, left: 900 },
                    },
                },
                headers: {
                    default: new Header({
                        children: [
                            new Paragraph({
                                alignment: AlignmentType.RIGHT,
                                children: [new TextRun({ text: 'CIELO · Plataforma Educativa', size: 15, color: COLOR_GRIS_CLARO })],
                            }),
                        ],
                    }),
                },
                footers: {
                    default: new Footer({
                        children: [
                            new Paragraph({
                                alignment: AlignmentType.CENTER,
                                children: [
                                    new TextRun({ text: `Rúbrica · ${asignaturaNombre} (Período ${periodo})   |   Página `, size: 15, color: COLOR_GRIS_CLARO }),
                                    new TextRun({ children: [PageNumber.CURRENT], size: 15, color: COLOR_GRIS_CLARO }),
                                    new TextRun({ text: ' de ', size: 15, color: COLOR_GRIS_CLARO }),
                                    new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 15, color: COLOR_GRIS_CLARO }),
                                ],
                            }),
                        ],
                    }),
                },
                children: bloques,
            },
        ],
    });

    const blob = await Packer.toBlob(doc);
    const nombreLimpio = `Evaluaciones_Rubrica_${asignaturaNombre}_${periodo}`
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9_\-]/g, '_')
        .replace(/_+/g, '_') + '.docx';

    saveAs(blob, nombreLimpio);
    return nombreLimpio;
}

/**
 * 2. DESCARGAR TODAS LAS PLANTILLAS DE RÚBRICA GUARDADAS
 */
export async function descargarPlantillasRubricaDocx(
    options: ExportarPlantillasRubricaOptions
): Promise<string> {
    const { curso, asignaturaNombre, userProfile, plantillas } = options;

    const tituloDoc = 'Plantillas Guardadas de Rúbrica';
    const subtituloDoc = `Instrumentos Curriculares Oficiales · ${asignaturaNombre}`;

    const bloques: (Table | Paragraph)[] = [
        crearTablaIdentificacion(tituloDoc, subtituloDoc, {
            curso,
            asignaturaNombre,
            periodo: 'Catálogo de Plantillas',
            actividad: null,
            userProfile,
        }),
    ];

    if (plantillas.length === 0) {
        bloques.push(
            new Paragraph({
                spacing: { before: 200 },
                children: [new TextRun({ text: 'No se encontraron plantillas guardadas en este módulo.', italics: true, size: 18, color: COLOR_TEXTO_MUTED })],
            })
        );
    }

    plantillas.forEach((plantilla, pIdx) => {
        const descriptores = plantilla.descriptores;
        const niveles = plantilla.niveles;

        bloques.push(
            new Paragraph({
                spacing: { before: 280, after: 100 },
                children: [
                    new TextRun({
                        text: `PLANTILLA ${pIdx + 1}: ${plantilla.nombre.toUpperCase()}`,
                        bold: true,
                        size: 22,
                        color: COLOR_FONDO_HEADER,
                    }),
                ],
            })
        );

        const ptsE = niveles.find(n => n.nivel === 4)?.puntaje ?? 100;
        const ptsA = niveles.find(n => n.nivel === 3)?.puntaje ?? 85;
        const ptsR = niveles.find(n => n.nivel === 2)?.puntaje ?? 70;
        const ptsI = niveles.find(n => n.nivel === 1)?.puntaje ?? 60;

        const encabezadosNivel = [
            { label: `ESTRATÉGICO (${ptsE} pts)`, nivel: 4, bg: COLOR_ESTRATEGICO },
            { label: `AUTÓNOMO (${ptsA} pts)`, nivel: 3, bg: COLOR_AUTONOMO },
            { label: `RESOLUTIVO (${ptsR} pts)`, nivel: 2, bg: COLOR_RESOLUTIVO },
            { label: `RECEPTIVO (${ptsI} pts)`, nivel: 1, bg: COLOR_RECEPTIVO },
        ];

        const celdasHeader: TableCell[] = [
            new TableCell({
                width: { size: 24, type: WidthType.PERCENTAGE },
                shading: { fill: COLOR_FONDO_HEADER, type: ShadingType.CLEAR, color: 'auto' },
                margins: { top: 100, bottom: 100, left: 100, right: 100 },
                children: [
                    new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [new TextRun({ text: 'COMPETENCIAS / CRITERIOS', bold: true, size: 17, color: 'FFFFFF' })],
                    }),
                ],
            }),
        ];

        encabezadosNivel.forEach(h => {
            celdasHeader.push(
                new TableCell({
                    width: { size: 19, type: WidthType.PERCENTAGE },
                    shading: { fill: h.bg, type: ShadingType.CLEAR, color: 'auto' },
                    margins: { top: 100, bottom: 100, left: 80, right: 80 },
                    children: [
                        new Paragraph({
                            alignment: AlignmentType.CENTER,
                            children: [new TextRun({ text: h.label, bold: true, size: 16, color: 'FFFFFF' })],
                        }),
                    ],
                })
            );
        });

        const filasTabla: TableRow[] = [new TableRow({ children: celdasHeader })];

        descriptores.forEach((desc) => {
            const nombreComp = desc.bc ? (COMPETENCIAS_LABEL[desc.bc] || desc.bc) : (desc.indicador || 'Competencia');
            const parrafosComp: Paragraph[] = [
                new Paragraph({
                    spacing: { after: 30 },
                    children: [new TextRun({ text: desc.bc ? `${desc.bc}: ${nombreComp}` : nombreComp, bold: true, size: 17, color: COLOR_TINTA })],
                }),
            ];
            if (desc.indicador && desc.indicador !== nombreComp) {
                parrafosComp.push(
                    new Paragraph({
                        children: [new TextRun({ text: desc.indicador, italics: true, size: 15, color: COLOR_TEXTO_MUTED })],
                    })
                );
            }

            const celdasFila: TableCell[] = [
                new TableCell({
                    width: { size: 24, type: WidthType.PERCENTAGE },
                    shading: { fill: 'F8FAFC', type: ShadingType.CLEAR, color: 'auto' },
                    margins: { top: 90, bottom: 90, left: 90, right: 90 },
                    children: parrafosComp,
                }),
            ];

            encabezadosNivel.forEach((h) => {
                const nivelKey = h.nivel === 4 ? 'estrategico' : h.nivel === 3 ? 'autonomo' : h.nivel === 2 ? 'resolutivo' : 'receptivo';
                const textoDesc = (desc[nivelKey as keyof DescriptorRubrica] as string) || '';

                celdasFila.push(
                    new TableCell({
                        width: { size: 19, type: WidthType.PERCENTAGE },
                        margins: { top: 90, bottom: 90, left: 80, right: 80 },
                        children: [
                            new Paragraph({
                                spacing: { line: 220, after: 60 },
                                children: htmlToRuns(textoDesc, { size: 16 }),
                            }),
                            new Paragraph({
                                spacing: { before: 60 },
                                children: [
                                    new TextRun({
                                        text: 'Estudiantes: ________________',
                                        italics: true,
                                        size: 14,
                                        color: COLOR_GRIS_CLARO,
                                    }),
                                ],
                            }),
                        ],
                    })
                );
            });

            filasTabla.push(new TableRow({ children: celdasFila }));
        });

        bloques.push(
            new Table({
                width: { size: 100, type: WidthType.PERCENTAGE },
                borders: BORDES_TABLA,
                rows: filasTabla,
            })
        );
    });

    const doc = new Document({
        creator: 'CIELO — Plataforma Educativa',
        title: tituloDoc,
        description: `Plantillas de Rúbrica de ${asignaturaNombre}`,
        sections: [
            {
                properties: {
                    page: {
                        size: { orientation: PageOrientation.LANDSCAPE, width: 16838, height: 11906 },
                        margin: { top: 900, right: 900, bottom: 900, left: 900 },
                    },
                },
                headers: {
                    default: new Header({
                        children: [
                            new Paragraph({
                                alignment: AlignmentType.RIGHT,
                                children: [new TextRun({ text: 'CIELO · Plataforma Educativa', size: 15, color: COLOR_GRIS_CLARO })],
                            }),
                        ],
                    }),
                },
                footers: {
                    default: new Footer({
                        children: [
                            new Paragraph({
                                alignment: AlignmentType.CENTER,
                                children: [
                                    new TextRun({ text: `Plantillas de Rúbrica · ${asignaturaNombre}   |   Página `, size: 15, color: COLOR_GRIS_CLARO }),
                                    new TextRun({ children: [PageNumber.CURRENT], size: 15, color: COLOR_GRIS_CLARO }),
                                    new TextRun({ text: ' de ', size: 15, color: COLOR_GRIS_CLARO }),
                                    new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 15, color: COLOR_GRIS_CLARO }),
                                ],
                            }),
                        ],
                    }),
                },
                children: bloques,
            },
        ],
    });

    const blob = await Packer.toBlob(doc);
    const nombreLimpio = `Plantillas_Rubrica_${asignaturaNombre}`
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9_\-]/g, '_')
        .replace(/_+/g, '_') + '.docx';

    saveAs(blob, nombreLimpio);
    return nombreLimpio;
}

/**
 * 3. DESCARGAR TODAS LAS EVALUACIONES DE LISTA DE COTEJO DEL PERÍODO
 */
export async function descargarEvaluacionesPeriodoCotejoDocx(
    options: ExportarEvaluacionesPeriodoCotejoOptions
): Promise<string> {
    const { curso, asignaturaNombre, periodo, userProfile, estudiantes, actividadesEvaluadas } = options;

    const sortedEsts = [...estudiantes].sort((a, b) => {
        const numA = a.numeroLista || 0;
        const numB = b.numeroLista || 0;
        if (numA !== numB) return numA - numB;
        return (a.apellido + a.nombre).localeCompare(b.apellido + b.nombre);
    });

    const tituloDoc = `Evaluaciones de Lista de Cotejo — Período ${periodo}`;
    const subtituloDoc = `Registro completo de evaluaciones realizadas · ${asignaturaNombre}`;

    const bloques: (Table | Paragraph)[] = [
        crearTablaIdentificacion(tituloDoc, subtituloDoc, {
            curso,
            asignaturaNombre,
            periodo,
            actividad: null,
            userProfile,
        }),
    ];

    if (sortedEsts.length > 0) {
        const tablaNomina = crearTablaNominaEstudiantes(sortedEsts);
        if (tablaNomina) {
            bloques.push(new Paragraph({ spacing: { before: 180, after: 80 } }));
            bloques.push(tablaNomina);
        }
    }

    if (actividadesEvaluadas.length === 0) {
        bloques.push(new Paragraph({
            spacing: { before: 240 },
            children: [new TextRun({ text: `No se encontraron evaluaciones registradas en el período ${periodo}.`, italics: true, size: 18, color: COLOR_TEXTO_MUTED })],
        }));
    }

    actividadesEvaluadas.forEach((item, actIndex) => {
        const act = item.actividad;
        const criterios = item.criterios;
        const niveles = item.niveles.length > 0 ? item.niveles : [
            { val: 0, label: 'No cumple', pts: 0 },
            { val: 100, label: 'Logrado', pts: 100 },
        ];
        const evaluaciones = item.evaluaciones;

        bloques.push(
            new Paragraph({
                spacing: { before: 280, after: 100 },
                children: [
                    new TextRun({
                        text: `ACTIVIDAD ${actIndex + 1}: ${act.nombre.toUpperCase()} (${act.periodo})`,
                        bold: true,
                        size: 22,
                        color: COLOR_FONDO_HEADER,
                    }),
                ],
            })
        );

        if (act.indicador || act.descripcion) {
            bloques.push(
                new Paragraph({
                    spacing: { after: 100 },
                    children: [
                        new TextRun({
                            text: `Indicador: ${act.indicador || act.descripcion || ''}`,
                            italics: true,
                            size: 16,
                            color: COLOR_TEXTO_MUTED,
                        }),
                    ],
                })
            );
        }

        const anchoNivel = Math.floor(34 / niveles.length);
        const celdasHeader: TableCell[] = [
            new TableCell({
                width: { size: 66, type: WidthType.PERCENTAGE },
                shading: { fill: COLOR_FONDO_HEADER, type: ShadingType.CLEAR, color: 'auto' },
                margins: { top: 100, bottom: 100, left: 100, right: 100 },
                children: [new Paragraph({ alignment: AlignmentType.LEFT, children: [new TextRun({ text: 'INDICADORES DE LOGRO / CRITERIOS', bold: true, size: 17, color: 'FFFFFF' })] })],
            }),
        ];

        niveles.forEach(n => {
            const bgNivel = n.val === 100 ? COLOR_ESTRATEGICO : COLOR_NOCUMPLE;
            celdasHeader.push(
                new TableCell({
                    width: { size: anchoNivel, type: WidthType.PERCENTAGE },
                    shading: { fill: bgNivel, type: ShadingType.CLEAR, color: 'auto' },
                    margins: { top: 100, bottom: 100, left: 80, right: 80 },
                    children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `${n.label.toUpperCase()} (${n.pts} pts)`, bold: true, size: 16, color: 'FFFFFF' })] })],
                })
            );
        });

        const filasTabla: TableRow[] = [new TableRow({ children: celdasHeader })];

        criterios.forEach((crit, index) => {
            const descTexto = crit.descripcion || crit.titulo || `Criterio ${index + 1}`;
            const celdasFila: TableCell[] = [
                new TableCell({
                    width: { size: 66, type: WidthType.PERCENTAGE },
                    margins: { top: 90, bottom: 90, left: 100, right: 100 },
                    children: [
                        new Paragraph({
                            spacing: { line: 220 },
                            children: [
                                new TextRun({ text: `${index + 1}. `, bold: true, size: 17, color: COLOR_TINTA }),
                                ...htmlToRuns(descTexto, { size: 17 }),
                            ],
                        }),
                    ],
                }),
            ];

            niveles.forEach(n => {
                const estsEnCelda = sortedEsts
                    .map((s, idx) => ({ s, num: s.numeroLista || idx + 1 }))
                    .filter(({ s }) => evaluaciones[s.id]?.[crit.id] === n.val);

                const parrafosNivel: Paragraph[] = [];
                if (estsEnCelda.length > 0) {
                    parrafosNivel.push(
                        new Paragraph({
                            alignment: AlignmentType.CENTER,
                            spacing: { line: 200 },
                            children: [
                                new TextRun({ text: 'Estudiantes: ', bold: true, size: 15, color: COLOR_TEXTO_MUTED }),
                                new TextRun({ text: estsEnCelda.map(e => e.num).join(', '), bold: true, size: 15, color: n.val === 100 ? COLOR_ESTRATEGICO : COLOR_NOCUMPLE }),
                            ],
                        })
                    );
                } else {
                    parrafosNivel.push(new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: '—', size: 16, color: COLOR_GRIS_CLARO })] }));
                }

                celdasFila.push(
                    new TableCell({
                        width: { size: anchoNivel, type: WidthType.PERCENTAGE },
                        margins: { top: 90, bottom: 90, left: 80, right: 80 },
                        children: parrafosNivel,
                    })
                );
            });

            filasTabla.push(new TableRow({ children: celdasFila }));
        });

        bloques.push(
            new Table({
                width: { size: 100, type: WidthType.PERCENTAGE },
                borders: BORDES_TABLA,
                rows: filasTabla,
            })
        );

        const tablaResumen = crearTablaResumenEstudiantesCotejo(
            sortedEsts,
            criterios.length,
            evaluaciones,
            item.puntajes,
            item.observaciones
        );
        if (tablaResumen) {
            bloques.push(
                new Paragraph({
                    spacing: { before: 140, after: 60 },
                    children: [new TextRun({ text: `Calificaciones y Logros — ${act.nombre}`, bold: true, size: 17, color: COLOR_TEXTO_MUTED })],
                })
            );
            bloques.push(tablaResumen);
        }
    });

    const doc = new Document({
        creator: 'CIELO — Plataforma Educativa',
        title: tituloDoc,
        description: `Evaluaciones de Lista de Cotejo del Período ${periodo}`,
        sections: [
            {
                properties: {
                    page: {
                        size: { orientation: PageOrientation.LANDSCAPE, width: 16838, height: 11906 },
                        margin: { top: 900, right: 900, bottom: 900, left: 900 },
                    },
                },
                headers: {
                    default: new Header({
                        children: [
                            new Paragraph({
                                alignment: AlignmentType.RIGHT,
                                children: [new TextRun({ text: 'CIELO · Plataforma Educativa', size: 15, color: COLOR_GRIS_CLARO })],
                            }),
                        ],
                    }),
                },
                footers: {
                    default: new Footer({
                        children: [
                            new Paragraph({
                                alignment: AlignmentType.CENTER,
                                children: [
                                    new TextRun({ text: `Lista de Cotejo · ${asignaturaNombre} (Período ${periodo})   |   Página `, size: 15, color: COLOR_GRIS_CLARO }),
                                    new TextRun({ children: [PageNumber.CURRENT], size: 15, color: COLOR_GRIS_CLARO }),
                                    new TextRun({ text: ' de ', size: 15, color: COLOR_GRIS_CLARO }),
                                    new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 15, color: COLOR_GRIS_CLARO }),
                                ],
                            }),
                        ],
                    }),
                },
                children: bloques,
            },
        ],
    });

    const blob = await Packer.toBlob(doc);
    const nombreLimpio = `Evaluaciones_Lista_Cotejo_${asignaturaNombre}_${periodo}`
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9_\-]/g, '_')
        .replace(/_+/g, '_') + '.docx';

    saveAs(blob, nombreLimpio);
    return nombreLimpio;
}

/**
 * 4. DESCARGAR TODAS LAS PLANTILLAS DE LISTA DE COTEJO GUARDADAS
 */
export async function descargarPlantillasCotejoDocx(
    options: ExportarPlantillasCotejoOptions
): Promise<string> {
    const { curso, asignaturaNombre, userProfile, plantillas } = options;

    const tituloDoc = 'Plantillas Guardadas de Lista de Cotejo';
    const subtituloDoc = `Instrumentos Curriculares Oficiales · ${asignaturaNombre}`;

    const bloques: (Table | Paragraph)[] = [
        crearTablaIdentificacion(tituloDoc, subtituloDoc, {
            curso,
            asignaturaNombre,
            periodo: 'Catálogo de Plantillas',
            actividad: null,
            userProfile,
        }),
    ];

    if (plantillas.length === 0) {
        bloques.push(
            new Paragraph({
                spacing: { before: 200 },
                children: [new TextRun({ text: 'No se encontraron plantillas guardadas en este módulo.', italics: true, size: 18, color: COLOR_TEXTO_MUTED })],
            })
        );
    }

    plantillas.forEach((plantilla, pIdx) => {
        const criterios = plantilla.criterios;
        const niveles = plantilla.niveles.length > 0 ? plantilla.niveles : [
            { val: 0, label: 'No cumple', pts: 0 },
            { val: 100, label: 'Logrado', pts: 100 },
        ];

        bloques.push(
            new Paragraph({
                spacing: { before: 280, after: 100 },
                children: [
                    new TextRun({
                        text: `PLANTILLA ${pIdx + 1}: ${plantilla.nombre.toUpperCase()}`,
                        bold: true,
                        size: 22,
                        color: COLOR_FONDO_HEADER,
                    }),
                ],
            })
        );

        const anchoNivel = Math.floor(24 / niveles.length);
        const celdasHeader: TableCell[] = [
            new TableCell({
                width: { size: 6, type: WidthType.PERCENTAGE },
                shading: { fill: COLOR_FONDO_HEADER, type: ShadingType.CLEAR, color: 'auto' },
                margins: { top: 100, bottom: 100, left: 60, right: 60 },
                children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'No.', bold: true, size: 16, color: 'FFFFFF' })] })],
            }),
            new TableCell({
                width: { size: 54, type: WidthType.PERCENTAGE },
                shading: { fill: COLOR_FONDO_HEADER, type: ShadingType.CLEAR, color: 'auto' },
                margins: { top: 100, bottom: 100, left: 100, right: 100 },
                children: [new Paragraph({ alignment: AlignmentType.LEFT, children: [new TextRun({ text: 'CRITERIOS DE OBSERVACIÓN / INDICADORES', bold: true, size: 16, color: 'FFFFFF' })] })],
            }),
        ];

        niveles.forEach(n => {
            const bgNivel = n.val === 100 ? COLOR_ESTRATEGICO : COLOR_NOCUMPLE;
            celdasHeader.push(
                new TableCell({
                    width: { size: anchoNivel, type: WidthType.PERCENTAGE },
                    shading: { fill: bgNivel, type: ShadingType.CLEAR, color: 'auto' },
                    margins: { top: 100, bottom: 100, left: 60, right: 60 },
                    children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: n.label.toUpperCase(), bold: true, size: 15, color: 'FFFFFF' })] })],
                })
            );
        });

        celdasHeader.push(
            new TableCell({
                width: { size: 16, type: WidthType.PERCENTAGE },
                shading: { fill: COLOR_FONDO_HEADER, type: ShadingType.CLEAR, color: 'auto' },
                margins: { top: 100, bottom: 100, left: 60, right: 60 },
                children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'OBSERVACIONES', bold: true, size: 16, color: 'FFFFFF' })] })],
            })
        );

        const filasTabla: TableRow[] = [new TableRow({ children: celdasHeader })];

        criterios.forEach((crit, index) => {
            const descTexto = crit.descripcion || crit.titulo || `Criterio ${index + 1}`;

            const celdasFila: TableCell[] = [
                new TableCell({
                    width: { size: 6, type: WidthType.PERCENTAGE },
                    margins: { top: 80, bottom: 80, left: 60, right: 60 },
                    children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: String(index + 1), bold: true, size: 16, color: COLOR_TEXTO_MUTED })] })],
                }),
                new TableCell({
                    width: { size: 54, type: WidthType.PERCENTAGE },
                    margins: { top: 80, bottom: 80, left: 100, right: 100 },
                    children: [new Paragraph({ spacing: { line: 220 }, children: htmlToRuns(descTexto, { size: 16 }) })],
                }),
            ];

            niveles.forEach(() => {
                celdasFila.push(
                    new TableCell({
                        width: { size: anchoNivel, type: WidthType.PERCENTAGE },
                        margins: { top: 80, bottom: 80, left: 60, right: 60 },
                        children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: '[   ]', size: 16, color: COLOR_GRIS_CLARO })] })],
                    })
                );
            });

            celdasFila.push(
                new TableCell({
                    width: { size: 16, type: WidthType.PERCENTAGE },
                    margins: { top: 80, bottom: 80, left: 60, right: 60 },
                    children: [new Paragraph({ children: [new TextRun({ text: '', size: 15 })] })],
                })
            );

            filasTabla.push(new TableRow({ children: celdasFila }));
        });

        bloques.push(
            new Table({
                width: { size: 100, type: WidthType.PERCENTAGE },
                borders: BORDES_TABLA,
                rows: filasTabla,
            })
        );
    });

    const doc = new Document({
        creator: 'CIELO — Plataforma Educativa',
        title: tituloDoc,
        description: `Plantillas de Lista de Cotejo de ${asignaturaNombre}`,
        sections: [
            {
                properties: {
                    page: {
                        size: { orientation: PageOrientation.LANDSCAPE, width: 16838, height: 11906 },
                        margin: { top: 900, right: 900, bottom: 900, left: 900 },
                    },
                },
                headers: {
                    default: new Header({
                        children: [
                            new Paragraph({
                                alignment: AlignmentType.RIGHT,
                                children: [new TextRun({ text: 'CIELO · Plataforma Educativa', size: 15, color: COLOR_GRIS_CLARO })],
                            }),
                        ],
                    }),
                },
                footers: {
                    default: new Footer({
                        children: [
                            new Paragraph({
                                alignment: AlignmentType.CENTER,
                                children: [
                                    new TextRun({ text: `Plantillas de Lista de Cotejo · ${asignaturaNombre}   |   Página `, size: 15, color: COLOR_GRIS_CLARO }),
                                    new TextRun({ children: [PageNumber.CURRENT], size: 15, color: COLOR_GRIS_CLARO }),
                                    new TextRun({ text: ' de ', size: 15, color: COLOR_GRIS_CLARO }),
                                    new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 15, color: COLOR_GRIS_CLARO }),
                                ],
                            }),
                        ],
                    }),
                },
                children: bloques,
            },
        ],
    });

    const blob = await Packer.toBlob(doc);
    const nombreLimpio = `Plantillas_Lista_Cotejo_${asignaturaNombre}`
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9_\-]/g, '_')
        .replace(/_+/g, '_') + '.docx';

    saveAs(blob, nombreLimpio);
    return nombreLimpio;
}

/**
 * ============================================================================
 * 5. DESCARGAR INSTRUMENTO DE EVALUACIÓN: ESCALA DE ESTIMATIVA (WORD .DOCX)
 * ============================================================================
 */
export interface ExportarEscalaEstimativaOptions {
    curso: Curso | null | undefined;
    asignaturaNombre: string;
    periodo: string;
    actividades: Actividad[];
    calificaciones: CalificacionActividad[];
    estudiantes: Estudiante[];
    cursoDocentes?: CursoDocente[];
    cursos?: Curso[];
    currentUserId?: string;
}

export interface ResultadoValidacionContexto {
    valido: boolean;
    error?: string;
    datosValidados?: {
        curso: Curso;
        asignatura: string;
        periodo: string;
        actividades: Actividad[];
        estudiantes: Estudiante[];
        calificaciones: CalificacionActividad[];
    };
}

/**
 * Validador estricto de contexto académico antes de exportar o generar el instrumento.
 * Asegura aislamiento total entre cursos, secciones, períodos y asignaturas.
 */
export function validarContextoAcademicoInstrumento(
    options: ExportarEscalaEstimativaOptions
): ResultadoValidacionContexto {
    const {
        curso,
        asignaturaNombre,
        periodo,
        actividades = [],
        calificaciones = [],
        estudiantes = [],
        cursoDocentes,
        cursos = [],
        currentUserId,
    } = options;

    // 1. Identificar el grupo exacto seleccionado (Curso y Sección con ID real)
    if (!curso || !curso.id) {
        return {
            valido: false,
            error: 'No fue posible validar el curso seleccionado. El identificador del curso es inválido o no existe en la base de datos.',
        };
    }

    const grado = (curso.grado || '').trim();
    const seccion = (curso.seccion || '').trim();
    if (!grado || !seccion) {
        return {
            valido: false,
            error: `El curso (ID: ${curso.id}) no posee grado y sección completos para emitir el instrumento.`,
        };
    }

    // 2. Verificar el período activo y su identificador
    const periodosValidos = ['P1', 'P2', 'P3', 'P4'];
    if (!periodo || !periodosValidos.includes(periodo)) {
        return {
            valido: false,
            error: `El período seleccionado ('${periodo || 'vacío'}') no es válido. Debe ser P1, P2, P3 o P4.`,
        };
    }

    // 3. Verificar la asignatura vinculada al docente mediante la relación existente en curso_docentes
    let asignaturaAutorizada = (asignaturaNombre || '').trim();

    if (cursoDocentes && Array.isArray(cursoDocentes) && cursoDocentes.length > 0) {
        const docenteAsignaciones = cursoDocentes.filter(
            (cd) => cd.cursoId === curso.id && (!currentUserId || cd.userId === currentUserId)
        );

        if (docenteAsignaciones.length > 0) {
            if (asignaturaAutorizada) {
                const matchDocente = docenteAsignaciones.find(
                    (cd) => normalizeArea(cd.asignatura) === normalizeArea(asignaturaAutorizada)
                );
                if (matchDocente) {
                    asignaturaAutorizada = matchDocente.asignatura;
                } else if (!docenteAsignaciones.some((cd) => cd.rol === 'tutor')) {
                    return {
                        valido: false,
                        error: `Inconsistencia académica: La asignatura '${asignaturaAutorizada}' no corresponde a las asignaciones del docente para el curso ${grado} ${seccion}.`,
                    };
                }
            } else {
                asignaturaAutorizada = docenteAsignaciones[0].asignatura;
            }
        }
    }

    if (!asignaturaAutorizada && curso.asignatura) {
        asignaturaAutorizada = curso.asignatura.trim();
    }

    if (!asignaturaAutorizada || asignaturaAutorizada.toLowerCase() === 'general') {
        return {
            valido: false,
            error: `No fue posible validar una asignatura académica específica para ${grado} ${seccion}. Por favor selecciona una asignatura en el selector.`,
        };
    }

    // 4. Aislamiento estricto de Estudiantes inscritos en este curso y sección
    const catalogoCursos = cursos.length > 0 ? cursos : [curso];
    const estudiantesValidados = estudiantes.filter((e) => {
        if (!e || !e.id) return false;
        return esEstudianteDelCurso(catalogoCursos, curso, e, curso.centroId);
    });

    // Protección contra datos cruzados: si en la nómina hay alumnos de cursos incompatibles
    const hayEstudiantesAjenos = estudiantes.some(
        (e) => e && e.cursoId && e.cursoId !== curso.id && !esEstudianteDelCurso(catalogoCursos, curso, e, curso.centroId)
    );
    if (hayEstudiantesAjenos) {
        return {
            valido: false,
            error: `Inconsistencia de aislamiento: se detectaron registros de estudiantes que pertenecen a otro curso o sección fuera de ${grado} ${seccion}.`,
        };
    }

    if (estudiantesValidados.length === 0) {
        return {
            valido: false,
            error: `El curso ${grado} ${seccion} no tiene estudiantes registrados para generar el instrumento.`,
        };
    }

    // 5. Aislamiento estricto de Actividades (curso + período + asignatura)
    const normAsig = normalizeArea(asignaturaAutorizada);
    const actividadesValidadas = actividades.filter((a) => {
        if (!a || !a.id) return false;
        const isMyAct = a.cursoId === curso.id;
        const isSharedAct = Boolean(curso.sharedCourseId && a.sharedCourseId === curso.sharedCourseId);
        if (!isMyAct && !isSharedAct) return false;

        // Período estricto
        if (a.periodo !== periodo) return false;

        // No incluir actividades de recuperación
        if (a.nombre === 'Recuperación') return false;

        // Coincidencia estricta de asignatura (prohibido cruzar con otras materias)
        if (!a.asignatura || normalizeArea(a.asignatura) !== normAsig) return false;

        return true;
    });

    if (actividadesValidadas.length === 0) {
        return {
            valido: false,
            error: `No se encontraron actividades registradas para la asignatura '${asignaturaAutorizada}' en el período ${periodo} de ${grado} ${seccion}. Registre las actividades correspondientes antes de descargar el instrumento.`,
        };
    }

    // 6. Recuperar y aislar las calificaciones de los estudiantes y actividades legítimas
    const studentIdsSet = new Set(estudiantesValidados.map((e) => e.id));
    const activityIdsSet = new Set(actividadesValidadas.map((a) => a.id));

    const calificacionesValidadas = calificaciones.filter((c) => {
        if (!c || !c.estudianteId || !c.actividadId) return false;
        if (!studentIdsSet.has(c.estudianteId)) return false;
        if (!activityIdsSet.has(c.actividadId)) return false;

        // Consistencia de asignatura y período si están en el registro
        if (c.asignatura && normalizeArea(c.asignatura) !== normAsig) return false;
        if (c.periodo && c.periodo !== periodo) return false;

        return true;
    });

    return {
        valido: true,
        datosValidados: {
            curso,
            asignatura: asignaturaAutorizada,
            periodo,
            actividades: actividadesValidadas,
            estudiantes: estudiantesValidados,
            calificaciones: calificacionesValidadas,
        },
    };
}

export function clasificarNivelEscalaEstimativa(score: number | null | undefined): 'completo' | 'esperado' | 'parcial' | 'iniciado' | null {
    if (score === null || score === undefined || isNaN(score)) return null;
    if (score >= 90) return 'completo';
    if (score >= 80) return 'esperado';
    if (score >= 70) return 'parcial';
    return 'iniciado';
}

export function resolverIndicadorActividad(act: Actividad): string {
    if (act.indicador && act.indicador.trim().length > 0) {
        return act.indicador.trim();
    }
    if (Array.isArray(act.indicadoresJson) && act.indicadoresJson.length > 0) {
        const ind = act.indicadoresJson
            .map((i: any) => i.indicador || i.texto || i.codigo)
            .filter(Boolean)
            .join('; ');
        if (ind) return ind;
    }
    if (typeof act.indicadores_json === 'string' && act.indicadores_json.trim().length > 0) {
        try {
            const parsed = JSON.parse(act.indicadores_json);
            if (Array.isArray(parsed) && parsed.length > 0) {
                const ind = parsed
                    .map((i: any) => i.indicador || i.texto || i.codigo)
                    .filter(Boolean)
                    .join('; ');
                if (ind) return ind;
            }
        } catch {
            // ignore
        }
    }
    if (act.descripcion && act.descripcion.trim().length > 0) {
        return act.descripcion.trim();
    }
    return act.nombre;
}

interface ConfiguracionPaginacionActividades {
    fontTitulo: number;
    fontMeta: number;
    fontLeyenda: number;
    fontActividad: number;
    fontIndicador: number;
    fontEscala: number;
    fontEstudiante: number;
    fontMarcaX: number;
    colWidthNum: number;
    colWidthName: number;
    paddingCelda: { top: number; bottom: number; left: number; right: number };
    spacingHeaderP: { before: number; after: number };
}

function obtenerConfiguracionPaginacion(numActs: number): ConfiguracionPaginacionActividades {
    if (numActs <= 10) {
        return {
            fontTitulo: 18,     // 9 pt
            fontMeta: 16,       // 8 pt
            fontLeyenda: 15,    // 7.5 pt
            fontActividad: 14,  // 7 pt
            fontIndicador: 13,  // 6.5 pt
            fontEscala: 13,     // 6.5 pt
            fontEstudiante: 15, // 7.5 pt
            fontMarcaX: 15,     // 7.5 pt
            colWidthNum: 340,   // ~0.60 cm
            colWidthName: 3118, // ~5.50 cm
            paddingCelda: { top: 35, bottom: 35, left: 25, right: 25 },
            spacingHeaderP: { before: 0, after: 25 },
        };
    } else if (numActs <= 15) {
        return {
            fontTitulo: 18,     // 9 pt
            fontMeta: 15,       // 7.5 pt
            fontLeyenda: 14,    // 7 pt
            fontActividad: 13,  // 6.5 pt
            fontIndicador: 12,  // 6 pt
            fontEscala: 12,     // 6 pt
            fontEstudiante: 14, // 7 pt
            fontMarcaX: 14,     // 7 pt
            colWidthNum: 284,   // ~0.50 cm
            colWidthName: 2551, // ~4.50 cm
            paddingCelda: { top: 25, bottom: 25, left: 18, right: 18 },
            spacingHeaderP: { before: 0, after: 20 },
        };
    } else if (numActs <= 20) {
        return {
            fontTitulo: 18,     // 9 pt
            fontMeta: 14,       // 7 pt
            fontLeyenda: 13,    // 6.5 pt
            fontActividad: 12,  // 6 pt
            fontIndicador: 11,  // 5.5 pt
            fontEscala: 12,     // 6 pt
            fontEstudiante: 14, // 7 pt
            fontMarcaX: 14,     // 7 pt
            colWidthNum: 255,   // ~0.45 cm
            colWidthName: 2268, // ~4.00 cm
            paddingCelda: { top: 20, bottom: 20, left: 14, right: 14 },
            spacingHeaderP: { before: 0, after: 18 },
        };
    } else {
        // 21 a 25 actividades: aprovechamiento máximo del ancho Legal horizontal
        return {
            fontTitulo: 18,     // 9 pt
            fontMeta: 14,       // 7 pt
            fontLeyenda: 13,    // 6.5 pt
            fontActividad: 12,  // 6 pt
            fontIndicador: 11,  // 5.5 pt
            fontEscala: 12,     // 6 pt
            fontEstudiante: 14, // 7 pt
            fontMarcaX: 14,     // 7 pt
            colWidthNum: 255,   // ~0.45 cm
            colWidthName: 2154, // ~3.80 cm
            paddingCelda: { top: 16, bottom: 16, left: 8, right: 8 },
            spacingHeaderP: { before: 0, after: 16 },
        };
    }
}

export async function generarDocumentoEscalaEstimativaDocx(
    options: ExportarEscalaEstimativaOptions
): Promise<Blob> {
    const validacion = validarContextoAcademicoInstrumento(options);
    if (!validacion.valido || !validacion.datosValidados) {
        throw new Error(validacion.error || 'No fue posible validar el contexto académico del instrumento.');
    }

    const {
        curso,
        asignatura: asignaturaNombre,
        periodo,
        actividades: actividadesParaTabla,
        estudiantes: estudiantesValidados,
        calificaciones,
    } = validacion.datosValidados;

    const sortedEsts = [...estudiantesValidados].sort((a, b) => {
        const numA = a.numeroLista || 0;
        const numB = b.numeroLista || 0;
        if (numA !== numB) return numA - numB;
        return (a.apellido || '').localeCompare(b.apellido || '') || (a.nombre || '').localeCompare(b.nombre || '');
    });

    // Dimensiones en twips (dxa) para papel Legal horizontal (35.56 cm x 21.59 cm)
    // En docx, al establecer PageOrientation.LANDSCAPE se pasan dimensiones en modo vertical
    // para que la librería aplique la rotación e invierta las dimensiones en el XML (w:w="20160" w:h="12240").
    const PAGE_PORTRAIT_WIDTH = 12240;  // 21.59 cm
    const PAGE_PORTRAIT_HEIGHT = 20160; // 35.56 cm
    const MARGIN_TWIPS = 284;           // 0.5 cm
    const TOTAL_USABLE_WIDTH = 20160 - (MARGIN_TWIPS * 2); // 19,592 dxa (~34.56 cm)

    const BORDES_ESCALA = {
        top: { style: BorderStyle.SINGLE, size: 4, color: '374151' },
        bottom: { style: BorderStyle.SINGLE, size: 4, color: '374151' },
        left: { style: BorderStyle.SINGLE, size: 4, color: '374151' },
        right: { style: BorderStyle.SINGLE, size: 4, color: '374151' },
        insideHorizontal: { style: BorderStyle.SINGLE, size: 2, color: '9CA3AF' },
        insideVertical: { style: BorderStyle.SINGLE, size: 2, color: 'D1D5DB' },
    };

    // Paginación inteligente: si hay más de 25 actividades, dividir en bloques de máximo 25 por página
    const CHUNK_SIZE = 25;
    const chunks: Actividad[][] = [];
    for (let i = 0; i < actividadesParaTabla.length; i += CHUNK_SIZE) {
        chunks.push(actividadesParaTabla.slice(i, i + CHUNK_SIZE));
    }

    const docChildren: (Paragraph | Table)[] = [];

    chunks.forEach((chunkActs, chunkIdx) => {
        const config = obtenerConfiguracionPaginacion(chunkActs.length);
        const anchoDisponibleActs = TOTAL_USABLE_WIDTH - (config.colWidthNum + config.colWidthName);
        const anchoPorActividad = Math.floor(anchoDisponibleActs / chunkActs.length);
        const remainingTwips = anchoDisponibleActs - (anchoPorActividad * chunkActs.length);
        const colWidthNameAjustado = config.colWidthName + remainingTwips;

        const subColBase = Math.floor(anchoPorActividad / 4);
        const subColLast = anchoPorActividad - (subColBase * 3);

        const columnWidths = [config.colWidthNum, colWidthNameAjustado];
        chunkActs.forEach(() => {
            columnWidths.push(subColBase, subColBase, subColBase, subColLast);
        });

        // Salto de página para bloques subsiguientes
        if (chunkIdx > 0) {
            docChildren.push(new Paragraph({ children: [new PageBreak()] }));
        }

        // 1. Encabezado del documento - Título
        docChildren.push(
            new Paragraph({
                spacing: { before: 0, after: config.spacingHeaderP.after },
                children: [
                    new TextRun({
                        text: chunkIdx === 0
                            ? 'INSTRUMENTO DE EVALUACIÓN: ESCALA DE ESTIMATIVA'
                            : `INSTRUMENTO DE EVALUACIÓN: ESCALA DE ESTIMATIVA (Continuación - Actividades ${chunkIdx * CHUNK_SIZE + 1} a ${chunkIdx * CHUNK_SIZE + chunkActs.length})`,
                        bold: true,
                        size: config.fontTitulo,
                        color: '111827',
                    }),
                ],
            })
        );

        // 2. Encabezado del documento - Datos generales (Asignatura, Curso y Sección, Período)
        const metaRuns: TextRun[] = [
            new TextRun({ text: 'Asignatura: ', bold: true, size: config.fontMeta, color: '111827' }),
            new TextRun({ text: asignaturaNombre || '—', size: config.fontMeta, color: '1F2937' }),
        ];

        if (curso) {
            const cursoStr = `${curso.grado || ''} ${curso.seccion || ''}`.trim();
            if (cursoStr) {
                metaRuns.push(
                    new TextRun({ text: '   |   Curso y Sección: ', bold: true, size: config.fontMeta, color: '111827' }),
                    new TextRun({ text: cursoStr, size: config.fontMeta, color: '1F2937' })
                );
            }
        }

        if (periodo) {
            metaRuns.push(
                new TextRun({ text: '   |   Período: ', bold: true, size: config.fontMeta, color: '111827' }),
                new TextRun({ text: periodo, size: config.fontMeta, color: '1F2937' })
            );
        }

        docChildren.push(
            new Paragraph({
                spacing: { before: 0, after: config.spacingHeaderP.after },
                children: metaRuns,
            })
        );

        // 3. Leyenda general única (no se repite en cada actividad)
        docChildren.push(
            new Paragraph({
                spacing: { before: 0, after: config.spacingHeaderP.after * 2 },
                children: [
                    new TextRun({
                        text: 'ESCALA DE VALORACIÓN: ',
                        bold: true,
                        size: config.fontLeyenda,
                        color: '111827',
                    }),
                    new TextRun({
                        text: 'DC: Dominio completo · LE: Logro esperado · LP: Logro parcial · I: Iniciado',
                        size: config.fontLeyenda,
                        color: '374151',
                    }),
                ],
            })
        );

        // Fila 1: N.º, APELLIDOS Y NOMBRES y Celda superior combinada por cada actividad
        const row1 = new TableRow({
            tableHeader: true,
            cantSplit: true,
            children: [
                new TableCell({
                    rowSpan: 3,
                    width: { size: config.colWidthNum, type: WidthType.DXA },
                    shading: { fill: 'F3F4F6', type: ShadingType.CLEAR, color: 'auto' },
                    verticalAlign: VerticalAlign.CENTER,
                    margins: config.paddingCelda,
                    children: [
                        new Paragraph({
                            alignment: AlignmentType.CENTER,
                            spacing: { before: 0, after: 0 },
                            children: [new TextRun({ text: 'N.º', bold: true, size: config.fontActividad, color: '111827' })],
                        }),
                    ],
                }),
                new TableCell({
                    rowSpan: 3,
                    width: { size: colWidthNameAjustado, type: WidthType.DXA },
                    shading: { fill: 'F3F4F6', type: ShadingType.CLEAR, color: 'auto' },
                    verticalAlign: VerticalAlign.CENTER,
                    margins: config.paddingCelda,
                    children: [
                        new Paragraph({
                            alignment: AlignmentType.CENTER,
                            spacing: { before: 0, after: 0 },
                            children: [new TextRun({ text: 'APELLIDOS Y NOMBRES', bold: true, size: config.fontActividad, color: '111827' })],
                        }),
                    ],
                }),
                ...chunkActs.map((act) =>
                    new TableCell({
                        columnSpan: 4,
                        width: { size: anchoPorActividad, type: WidthType.DXA },
                        shading: { fill: 'E5E7EB', type: ShadingType.CLEAR, color: 'auto' },
                        verticalAlign: VerticalAlign.CENTER,
                        margins: config.paddingCelda,
                        children: [
                            new Paragraph({
                                alignment: AlignmentType.CENTER,
                                spacing: { before: 0, after: 0 },
                                children: [new TextRun({ text: act.nombre || 'Actividad', bold: true, size: config.fontActividad, color: '111827' })],
                            }),
                        ],
                    })
                ),
            ],
        });

        // Fila 2: Indicador o fragmento del indicador evaluado por cada actividad
        const row2 = new TableRow({
            tableHeader: true,
            cantSplit: true,
            children: chunkActs.map((act) =>
                new TableCell({
                    columnSpan: 4,
                    width: { size: anchoPorActividad, type: WidthType.DXA },
                    shading: { fill: 'F9FAFB', type: ShadingType.CLEAR, color: 'auto' },
                    verticalAlign: VerticalAlign.CENTER,
                    margins: config.paddingCelda,
                    children: [
                        new Paragraph({
                            alignment: AlignmentType.CENTER,
                            spacing: { before: 0, after: 0 },
                            children: [new TextRun({ text: resolverIndicadorActividad(act), size: config.fontIndicador, color: '1F2937' })],
                        }),
                    ],
                })
            ),
        });

        // Fila 3: Subcolumnas de valoración agrupadas bajo cada actividad (DC, LE, LP, I)
        const row3 = new TableRow({
            tableHeader: true,
            cantSplit: true,
            children: chunkActs.flatMap(() => [
                new TableCell({
                    width: { size: subColBase, type: WidthType.DXA },
                    shading: { fill: 'F3F4F6', type: ShadingType.CLEAR, color: 'auto' },
                    verticalAlign: VerticalAlign.CENTER,
                    margins: config.paddingCelda,
                    children: [
                        new Paragraph({
                            alignment: AlignmentType.CENTER,
                            spacing: { before: 0, after: 0 },
                            children: [new TextRun({ text: 'DC', bold: true, size: config.fontEscala, color: '111827' })],
                        }),
                    ],
                }),
                new TableCell({
                    width: { size: subColBase, type: WidthType.DXA },
                    shading: { fill: 'F3F4F6', type: ShadingType.CLEAR, color: 'auto' },
                    verticalAlign: VerticalAlign.CENTER,
                    margins: config.paddingCelda,
                    children: [
                        new Paragraph({
                            alignment: AlignmentType.CENTER,
                            spacing: { before: 0, after: 0 },
                            children: [new TextRun({ text: 'LE', bold: true, size: config.fontEscala, color: '111827' })],
                        }),
                    ],
                }),
                new TableCell({
                    width: { size: subColBase, type: WidthType.DXA },
                    shading: { fill: 'F3F4F6', type: ShadingType.CLEAR, color: 'auto' },
                    verticalAlign: VerticalAlign.CENTER,
                    margins: config.paddingCelda,
                    children: [
                        new Paragraph({
                            alignment: AlignmentType.CENTER,
                            spacing: { before: 0, after: 0 },
                            children: [new TextRun({ text: 'LP', bold: true, size: config.fontEscala, color: '111827' })],
                        }),
                    ],
                }),
                new TableCell({
                    width: { size: subColLast, type: WidthType.DXA },
                    shading: { fill: 'F3F4F6', type: ShadingType.CLEAR, color: 'auto' },
                    verticalAlign: VerticalAlign.CENTER,
                    margins: config.paddingCelda,
                    children: [
                        new Paragraph({
                            alignment: AlignmentType.CENTER,
                            spacing: { before: 0, after: 0 },
                            children: [new TextRun({ text: 'I', bold: true, size: config.fontEscala, color: '111827' })],
                        }),
                    ],
                }),
            ]),
        });

        // Filas de estudiantes con marcas de valoración ('X') por actividad
        const studentRows = sortedEsts.map((est, idx) => {
            const studentName = [est.apellido, est.nombre].filter(Boolean).join(', ').toUpperCase();
            return new TableRow({
                cantSplit: true,
                children: [
                    new TableCell({
                        width: { size: config.colWidthNum, type: WidthType.DXA },
                        verticalAlign: VerticalAlign.CENTER,
                        margins: config.paddingCelda,
                        children: [
                            new Paragraph({
                                alignment: AlignmentType.CENTER,
                                spacing: { before: 0, after: 0 },
                                children: [new TextRun({ text: String(est.numeroLista || idx + 1), size: config.fontEstudiante, color: '374151' })],
                            }),
                        ],
                    }),
                    new TableCell({
                        width: { size: colWidthNameAjustado, type: WidthType.DXA },
                        verticalAlign: VerticalAlign.CENTER,
                        margins: config.paddingCelda,
                        children: [
                            new Paragraph({
                                alignment: AlignmentType.LEFT,
                                spacing: { before: 0, after: 0 },
                                children: [new TextRun({ text: studentName, size: config.fontEstudiante, color: '111827' })],
                            }),
                        ],
                    }),
                    ...chunkActs.flatMap((act) => {
                        const cal = calificaciones.find((c) => c.estudianteId === est.id && c.actividadId === act.id);
                        const score =
                            cal?.puntaje !== null && cal?.puntaje !== undefined
                                ? cal.puntaje
                                : cal?.recuperacion !== null && cal?.recuperacion !== undefined
                                ? cal.recuperacion
                                : null;
                        const nivel = clasificarNivelEscalaEstimativa(score);

                        const markCell = (isMarked: boolean, widthCell: number) =>
                            new TableCell({
                                width: { size: widthCell, type: WidthType.DXA },
                                verticalAlign: VerticalAlign.CENTER,
                                margins: config.paddingCelda,
                                children: [
                                    new Paragraph({
                                        alignment: AlignmentType.CENTER,
                                        spacing: { before: 0, after: 0 },
                                        children: isMarked
                                            ? [new TextRun({ text: 'X', bold: true, size: config.fontMarcaX, color: '111827' })]
                                            : [],
                                    }),
                                ],
                            });

                        return [
                            markCell(nivel === 'completo', subColBase),
                            markCell(nivel === 'esperado', subColBase),
                            markCell(nivel === 'parcial', subColBase),
                            markCell(nivel === 'iniciado', subColLast),
                        ];
                    }),
                ],
            });
        });

        const table = new Table({
            columnWidths,
            width: { size: TOTAL_USABLE_WIDTH, type: WidthType.DXA },
            borders: BORDES_ESCALA,
            rows: [row1, row2, row3, ...studentRows],
        });

        docChildren.push(table);
    });

    const doc = new Document({
        creator: 'CIELO — Plataforma Educativa',
        title: `Instrumento de evaluación: Escala de estimativa — ${asignaturaNombre}`,
        description: 'Escala de estimativa por competencias',
        sections: [
            {
                properties: {
                    page: {
                        size: {
                            orientation: PageOrientation.LANDSCAPE,
                            width: PAGE_PORTRAIT_WIDTH,
                            height: PAGE_PORTRAIT_HEIGHT,
                        },
                        margin: {
                            top: MARGIN_TWIPS,
                            right: MARGIN_TWIPS,
                            bottom: MARGIN_TWIPS,
                            left: MARGIN_TWIPS,
                        },
                    },
                },
                children: docChildren,
            },
        ],
    });

    return await Packer.toBlob(doc);
}

export async function descargarInstrumentoEscalaEstimativaDocx(
    options: ExportarEscalaEstimativaOptions
): Promise<string> {
    const validacion = validarContextoAcademicoInstrumento(options);
    if (!validacion.valido || !validacion.datosValidados) {
        throw new Error(validacion.error || 'No fue posible validar los datos del instrumento de evaluación.');
    }
    const { curso, asignatura, periodo } = validacion.datosValidados;
    const blob = await generarDocumentoEscalaEstimativaDocx(options);

    const cursoStr = `${curso.grado || ''}_${curso.seccion || ''}`.replace(/\s+/g, '_');
    const asigClean = (asignatura || 'Asignatura')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9_\-]/g, '_')
        .replace(/_+/g, '_');

    const fileName = `Escala_Estimativa_${cursoStr}_${periodo}_${asigClean}.docx`;
    saveAs(blob, fileName);
    return fileName;
}


