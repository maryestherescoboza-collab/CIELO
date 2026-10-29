import {
    AlignmentType,
    BorderStyle,
    Document,
    Footer,
    Header,
    Packer,
    PageNumber,
    PageOrientation,
    Paragraph,
    ShadingType,
    Table,
    TableCell,
    TableRow,
    TextRun,
    WidthType,
} from 'docx';
import { saveAs } from 'file-saver';
import type {
    DescriptorRubrica,
    NivelPuntaje,
    CriterioCotejo,
    UserProfile,
    Curso,
    Actividad,
    Estudiante,
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

