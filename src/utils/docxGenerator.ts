import { Document, Packer, Paragraph, TextRun, AlignmentType, convertInchesToTwip, ImageRun } from 'docx';
import { saveAs } from 'file-saver';
import type { AppState, Incidencia } from '../types';
import minerdLogo from '../assets/minerd-logo.jpg';

export const generarFichaReferenciaDocx = async (
    incidencia: Incidencia,
    state: AppState,
    session: any
) => {
    const estudiante = state.estudiantes.find(e => e.id === incidencia.estudianteId);
    if (!estudiante) return;

    const curso = state.cursos.find(c => c.id === estudiante.cursoId);
    
    const centroId = incidencia.centroId || curso?.centroId || state.centroRolActual?.centro_id || state.perfiles.find(p => p.userId === session?.user?.id)?.centro_id || null;
    const centro = state.centros?.find(c => c.id === centroId);
    const centroNombre = centro?.nombre || state.instituto || 'Centro Educativo No Definido';
    
    const uid = incidencia.userId || session?.user?.id;
    const userProfile = state.perfiles.find(p => p.userId === uid);
    const personaRefiere = userProfile?.nombreDocente || '';

    const clasificacion =
        incidencia.gravedad === 'leve' ? 'primera vez' :
        incidencia.gravedad === 'moderada' ? 'recurrente' :
        'persistente';

    const textoClasificacion = `La situación se presenta desde ${incidencia.fecha} y es ${clasificacion} en incurrir en la incidencia descrita.`;

    const DESCRIPCIONES_ACCIONES: Record<string, string> = {
        'Llamado verbal': 'Se dialogó con el estudiante sobre la situación presentada para favorecer la reflexión sobre sus acciones y sus consecuencias.',
        'Nota a padres': 'Se comunicó a la familia la situación presentada para favorecer el acompañamiento del estudiante en su proceso de mejora.',
        'Orientación': 'Se acompañó al estudiante en la reflexión sobre la situación para identificar estrategias que le permitan afrontarla de manera adecuada.',
        'Compromiso': 'Se acordó con el estudiante una acción concreta para favorecer la mejora de la situación y fortalecer su responsabilidad.',
        'Reconocimiento': 'Se dialogó con el estudiante sobre la situación presentada, logrando identificar los aspectos que necesita mejorar y asumir su participación en el proceso de cambio.',
        'Servicio': 'Se promovió la participación del estudiante en una actividad de colaboración que contribuya a fortalecer su responsabilidad y sentido de pertenencia.',
        'Dirección': 'Se presentó la situación a la Dirección del centro educativo para establecer el seguimiento correspondiente.',
    };

    const accionesParagraphs: Paragraph[] = [];
    if (incidencia.accionesTomadas && incidencia.accionesTomadas.length > 0) {
        incidencia.accionesTomadas.forEach(accion => {
            const desc = DESCRIPCIONES_ACCIONES[accion] || '';
            accionesParagraphs.push(
                new Paragraph({
                    indent: { left: 400 },
                    spacing: { after: 50 },
                    children: [
                        new TextRun({ text: accion, bold: true }),
                    ],
                }),
                new Paragraph({
                    indent: { left: 400 },
                    spacing: { after: 150 },
                    children: [
                        new TextRun(desc),
                    ],
                })
            );
        });
    } else {
        accionesParagraphs.push(
            new Paragraph({
                indent: { left: 400 },
                spacing: { after: 150 },
                children: [
                    new TextRun("Ninguna acción registrada."),
                ],
            })
        );
    }

    if (incidencia.acuerdos) {
        accionesParagraphs.push(
            new Paragraph({
                indent: { left: 400 },
                spacing: { after: 50 },
                children: [
                    new TextRun({ text: "Acuerdos:", bold: true }),
                ],
            }),
            ...incidencia.acuerdos.split('\n').map(line =>
                new Paragraph({
                    children: [new TextRun(line)],
                    indent: { left: 400 },
                    spacing: { after: 50 },
                })
            )
        );
    }

    let imageBuffer: ArrayBuffer | null = null;
    let targetWidth = 120;
    let targetHeight = 60;
    try {
        const imageRes = await fetch(minerdLogo);
        const imageBlob = await imageRes.blob();
        imageBuffer = await imageBlob.arrayBuffer();
        
        const dims = await new Promise<{width: number, height: number}>((resolve) => {
            const url = URL.createObjectURL(imageBlob);
            const img = new Image();
            img.onload = () => {
                resolve({ width: img.width, height: img.height });
                URL.revokeObjectURL(url);
            };
            img.src = url;
        });

        const MAX_WIDTH = 120;
        const MAX_HEIGHT = 80;
        targetWidth = dims.width;
        targetHeight = dims.height;
        
        if (targetWidth > MAX_WIDTH || targetHeight > MAX_HEIGHT) {
            const ratio = Math.min(MAX_WIDTH / targetWidth, MAX_HEIGHT / targetHeight);
            targetWidth = Math.round(targetWidth * ratio);
            targetHeight = Math.round(targetHeight * ratio);
        }
    } catch (e) {
        console.warn("Could not load minerd logo", e);
    }

    const doc = new Document({
        creator: "Centro Educativo",
        title: "Ficha de Referencia",
        description: "Ficha de referencia a la Unidad de Orientación y Psicología",
        styles: {
            default: {
                document: {
                    run: {
                        size: 22, // 11pt
                        font: "Arial",
                    },
                    paragraph: {
                        spacing: {
                            line: 276, // 1.15 line spacing
                            before: 0,
                            after: 200,
                        },
                    },
                },
            },
        },
        sections: [
            {
                properties: {
                    page: {
                        margin: {
                            top: convertInchesToTwip(1),
                            right: convertInchesToTwip(1),
                            bottom: convertInchesToTwip(1),
                            left: convertInchesToTwip(1),
                        },
                    },
                },
                children: [
                    // Encabezado institucional (todo centrado, sin lineas)
                    ...(imageBuffer ? [
                        new Paragraph({
                            alignment: AlignmentType.CENTER,
                            spacing: { after: 100 },
                            children: [
                                new ImageRun({
                                    data: imageBuffer,
                                    transformation: {
                                        width: targetWidth,
                                        height: targetHeight,
                                    },
                                    type: "jpg"
                                })
                            ]
                        })
                    ] : []),
                    new Paragraph({
                        alignment: AlignmentType.CENTER,
                        spacing: { after: 0, line: 240 },
                        children: [
                            new TextRun({
                                text: centroNombre.toUpperCase(),
                                bold: true,
                            }),
                        ],
                    }),
                    new Paragraph({
                        alignment: AlignmentType.CENTER,
                        spacing: { after: 0, line: 240 },
                        children: [
                            new TextRun({
                                text: "“Año del fomento a las exportaciones”",
                            }),
                        ],
                    }),
                    new Paragraph({
                        alignment: AlignmentType.CENTER,
                        spacing: { after: 0, line: 240 },
                        children: [
                            new TextRun({
                                text: "Unidad de Orientación y Psicología",
                            }),
                        ],
                    }),
                    new Paragraph({
                        alignment: AlignmentType.CENTER,
                        spacing: { after: 600, line: 240 },
                        children: [
                            new TextRun({
                                text: "Ficha de referencia a la Unidad de Orientación y Psicología",
                            }),
                        ],
                    }),

                    // Datos del estudiante
                    new Paragraph({
                        spacing: { after: 150 },
                        children: [
                            new TextRun({ text: "Nombres y apellidos: ", bold: true }),
                            new TextRun(`${estudiante.nombre} ${estudiante.apellido}`),
                        ],
                    }),
                    new Paragraph({
                        spacing: { after: 150 },
                        children: [
                            new TextRun({ text: "Grado y sección: ", bold: true }),
                            new TextRun(`${curso ? `${curso.grado} ${curso.seccion}` : 'No definido'}`),
                            new TextRun({ text: "    Sexo: ", bold: true }),
                            new TextRun("---"),
                        ],
                    }),
                    new Paragraph({
                        spacing: { after: 400 },
                        children: [
                            new TextRun({ text: "Persona que refiere: ", bold: true }),
                            new TextRun(personaRefiere),
                        ],
                    }),

                    // Secciones de incidencia
                    new Paragraph({
                        spacing: { after: 100 },
                        children: [
                            new TextRun({ text: "1. Razones por las que se refiere al estudiante a la Unidad de Orientación y Psicología:", bold: true }),
                        ],
                    }),
                    ...incidencia.descripcion.split('\n').map(line => 
                        new Paragraph({
                            children: [new TextRun(line)],
                            indent: { left: 400 },
                            spacing: { after: 50 },
                        })
                    ),
                    new Paragraph({ spacing: { after: 300 }, children: [] }),

                    new Paragraph({
                        spacing: { after: 100 },
                        children: [
                            new TextRun({ text: "2. Señale desde cuándo se presenta la situación:", bold: true }),
                        ],
                    }),
                    new Paragraph({
                        indent: { left: 400 },
                        spacing: { after: 300 },
                        children: [new TextRun(textoClasificacion)],
                    }),

                    new Paragraph({
                        spacing: { after: 100 },
                        children: [
                            new TextRun({ text: "3. Describa las actuaciones realizadas ante la situación:", bold: true }),
                        ],
                    }),
                    ...accionesParagraphs,
                    new Paragraph({ spacing: { after: 800 }, children: [] }),

                    // Firmas
                    new Paragraph({
                        spacing: { after: 400 },
                        children: [
                            new TextRun({ text: "Firma persona que refiere: ", bold: true }),
                            new TextRun("______________________________"),
                        ],
                    }),
                    new Paragraph({
                        spacing: { after: 400 },
                        children: [
                            new TextRun({ text: "Firma persona que recibe: ", bold: true }),
                            new TextRun("_______________________________"),
                        ],
                    }),
                    new Paragraph({
                        children: [
                            new TextRun({ text: "Fecha y hora que se recibe: ", bold: true }),
                            new TextRun("______________________________"),
                        ],
                    }),
                ],
            },
        ],
    });

    const blob = await Packer.toBlob(doc);
    const safeName = `${estudiante.nombre}_${estudiante.apellido}`.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '');
    saveAs(blob, `Ficha_Referencia_${safeName}.docx`);
};
