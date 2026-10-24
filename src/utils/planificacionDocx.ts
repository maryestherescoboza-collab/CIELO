import {
    AlignmentType,
    BorderStyle,
    Document,
    HeadingLevel,
    LevelFormat,
    Packer,
    Paragraph,
    ShadingType,
    Table,
    TableCell,
    TableRow,
    TextRun,
    VerticalAlignTable,
    WidthType,
} from 'docx';
import { saveAs } from 'file-saver';

export interface PlanificacionDocxMeta {
    asignatura?: string;
    curso?: string;
    periodo?: string;
    titulo?: string;
    docente?: string;
    centro?: string;
}

const COLOR_TINTA = '1C2938';
const COLOR_AZUL = '1F3A5C';
const COLOR_ETIQUETA = 'EEF3F8';
const COLOR_BORDE = 'C6D2DE';
const COLOR_PLACEHOLDER = '5B6B7C';

const ETIQUETAS_IGNORADAS = new Set([
    'STYLE', 'SCRIPT', 'TEMPLATE', 'BUTTON', 'INPUT', 'TEXTAREA',
    'SELECT', 'OPTION', 'SVG', 'NOSCRIPT', 'IFRAME', 'CANVAS',
]);

const ETIQUETAS_BLOQUE = new Set([
    'DIV', 'TABLE', 'P', 'UL', 'OL', 'LI', 'H1', 'H2', 'H3', 'H4',
    'H5', 'H6', 'SECTION', 'ARTICLE', 'HEADER', 'FOOTER', 'BLOCKQUOTE',
    'PRE', 'FIGURE', 'FIGCAPTION', 'HR',
]);

const BORDES_TABLA = {
    top: { style: BorderStyle.SINGLE, size: 4, color: COLOR_BORDE },
    bottom: { style: BorderStyle.SINGLE, size: 4, color: COLOR_BORDE },
    left: { style: BorderStyle.SINGLE, size: 4, color: COLOR_BORDE },
    right: { style: BorderStyle.SINGLE, size: 4, color: COLOR_BORDE },
    insideHorizontal: { style: BorderStyle.SINGLE, size: 4, color: COLOR_BORDE },
    insideVertical: { style: BorderStyle.SINGLE, size: 4, color: COLOR_BORDE },
};

interface EstiloTexto {
    bold?: boolean;
    italics?: boolean;
    underline?: Record<string, never>;
    strike?: boolean;
    subScript?: boolean;
    superScript?: boolean;
    color?: string;
    size?: number;
    font?: string;
}

interface RunCrudo {
    text?: string;
    estilo: EstiloTexto;
    salto?: boolean;
    placeholder?: boolean;
}

function normalizarTexto(valor: string | null): string {
    return (valor || '').replace(/\u00a0/g, ' ').replace(/[ \t\r\n\f]+/g, ' ');
}

function esElemento(nodo: Node): nodo is HTMLElement {
    return nodo.nodeType === 1;
}

function debeIgnorar(el: HTMLElement): boolean {
    if (ETIQUETAS_IGNORADAS.has(el.tagName)) return true;
    if (el.getAttribute('data-docx-skip') === 'true') return true;
    if (el.getAttribute('aria-hidden') === 'true') return true;
    if (el.classList.contains('add-session-btn') || el.classList.contains('remove-session-btn')) return true;
    return false;
}

function tieneBloques(el: HTMLElement): boolean {
    for (const hijo of Array.from(el.children)) {
        if (ETIQUETAS_BLOQUE.has(hijo.tagName)) return true;
    }
    return false;
}

function recolectarRuns(nodo: Node, estilo: EstiloTexto, salida: RunCrudo[], dentroDePlaceholder: boolean): void {
    if (nodo.nodeType === 3) {
        const texto = normalizarTexto(nodo.nodeValue);
        if (!texto) return;
        salida.push({
            text: texto,
            estilo,
            placeholder: dentroDePlaceholder || undefined,
        });
        return;
    }
    if (!esElemento(nodo)) return;

    const el = nodo as HTMLElement;
    if (debeIgnorar(el)) return;

    if (el.tagName === 'BR') {
        salida.push({ estilo, salto: true });
        return;
    }

    const siguiente: EstiloTexto = { ...estilo };
    switch (el.tagName) {
        case 'B':
        case 'STRONG':
            siguiente.bold = true;
            break;
        case 'I':
        case 'EM':
            siguiente.italics = true;
            break;
        case 'U':
            siguiente.underline = {};
            break;
        case 'S':
        case 'STRIKE':
        case 'DEL':
            siguiente.strike = true;
            break;
        case 'SUB':
            siguiente.subScript = true;
            break;
        case 'SUP':
            siguiente.superScript = true;
            break;
        case 'CODE':
            siguiente.font = 'Consolas';
            break;
        default:
            break;
    }

    const esPlaceholder = dentroDePlaceholder || el.classList.contains('placeholder');
    for (const hijo of Array.from(el.childNodes)) {
        recolectarRuns(hijo, siguiente, salida, esPlaceholder);
    }
}

function recortarExtremos(runs: RunCrudo[]): RunCrudo[] {
    const copia = runs.map(r => ({ ...r }));
    while (copia.length > 0) {
        const primero = copia[0];
        if (primero.salto) break;
        const texto = (primero.text || '').replace(/^ +/, '');
        if (texto) { primero.text = texto; break; }
        copia.shift();
    }
    while (copia.length > 0) {
        const ultimo = copia[copia.length - 1];
        if (ultimo.salto) break;
        const texto = (ultimo.text || '').replace(/ +$/, '');
        if (texto) { ultimo.text = texto; break; }
        copia.pop();
    }
    return copia;
}

function runsATextRuns(runs: RunCrudo[]): TextRun[] {
    return runs.map(run => {
        if (run.salto) return new TextRun({ break: 1 });
        return new TextRun({ text: run.text || '', ...run.estilo });
    });
}

function alineacionDe(el: HTMLElement): (typeof AlignmentType)[keyof typeof AlignmentType] | undefined {
    const inline = (el.style.textAlign || '').toLowerCase();
    if (inline === 'center') return AlignmentType.CENTER;
    if (inline === 'right' || inline === 'end') return AlignmentType.RIGHT;
    if (inline === 'justify') return AlignmentType.JUSTIFIED;
    if (el.classList.contains('header-sub') || el.classList.contains('section-title')) return AlignmentType.CENTER;
    return undefined;
}

function parrafoDesdeElemento(el: HTMLElement, estiloBase: EstiloTexto): Paragraph | null {
    const crudos: RunCrudo[] = [];
    recolectarRuns(el, estiloBase, crudos, el.classList.contains('placeholder'));
    const recortados = recortarExtremos(crudos);
    if (recortados.length === 0) return null;

    const esTituloSeccion = el.classList.contains('section-title');
    const esHeaderSub = el.classList.contains('header-sub');
    const esSessionTitle = el.classList.contains('session-title');
    const esLabel = el.classList.contains('label') || el.classList.contains('label-sm');

    let heading: (typeof HeadingLevel)[keyof typeof HeadingLevel] | undefined;
    if (el.tagName === 'H1') heading = HeadingLevel.HEADING_1;
    else if (el.tagName === 'H2') heading = HeadingLevel.HEADING_2;
    else if (el.tagName === 'H3') heading = HeadingLevel.HEADING_3;
    else if (el.tagName === 'H4') heading = HeadingLevel.HEADING_4;

    const color = esHeaderSub || esTituloSeccion || esSessionTitle || esLabel ? COLOR_AZUL : COLOR_TINTA;
    const tamano = esHeaderSub ? 28 : esSessionTitle ? 22 : esTituloSeccion ? 20 : undefined;
    const negrita = esHeaderSub || esSessionTitle || esTituloSeccion || esLabel || undefined;

    const children = recortados.map(run => {
        if (run.salto) return new TextRun({ break: 1 });
        const esPlaceholder = run.placeholder;
        return new TextRun({
            text: run.text || '',
            bold: run.estilo.bold ?? negrita,
            italics: run.estilo.italics ?? (esPlaceholder || undefined),
            underline: run.estilo.underline,
            strike: run.estilo.strike,
            subScript: run.estilo.subScript,
            superScript: run.estilo.superScript,
            font: run.estilo.font,
            color: esPlaceholder ? COLOR_PLACEHOLDER : (run.estilo.color || color),
            size: tamano,
        });
    });

    return new Paragraph({
        children,
        alignment: alineacionDe(el),
        heading,
        spacing: { after: esHeaderSub ? 160 : esSessionTitle ? 120 : 60 },
    });
}

function construirLista(el: HTMLElement): Paragraph[] {
    const salida: Paragraph[] = [];
    const ordenada = el.tagName === 'OL';
    for (const item of Array.from(el.children)) {
        if (item.tagName !== 'LI') continue;
        const crudos: RunCrudo[] = [];
        recolectarRuns(item, {}, crudos, item.classList.contains('placeholder'));
        const recortados = recortarExtremos(crudos);
        if (recortados.length === 0) continue;
        salida.push(new Paragraph({
            children: runsATextRuns(recortados),
            ...(ordenada
                ? { numbering: { reference: 'lista-planificacion', level: 0 } }
                : { bullet: { level: 0 } }),
        }));
    }
    return salida;
}

function construirCelda(celda: HTMLTableCellElement): TableCell {
    const esTituloSeccion = celda.classList.contains('section-title');
    const esEtiqueta = celda.classList.contains('label') || celda.classList.contains('label-sm');
    const shading = esTituloSeccion ? COLOR_AZUL : esEtiqueta ? COLOR_ETIQUETA : undefined;
    const color = esTituloSeccion ? 'FFFFFF' : esEtiqueta ? COLOR_AZUL : COLOR_TINTA;

    const estiloBase: EstiloTexto = {
        bold: esTituloSeccion || esEtiqueta || undefined,
        color,
        italics: celda.classList.contains('placeholder') || undefined,
        size: 18,
    };

    const hijos = construirBloques(celda, estiloBase);
    const children = hijos.length > 0 ? hijos : [new Paragraph({ children: [new TextRun('')] })];

    return new TableCell({
        children,
        columnSpan: celda.colSpan > 1 ? celda.colSpan : undefined,
        rowSpan: celda.rowSpan > 1 ? celda.rowSpan : undefined,
        shading: shading ? { fill: shading, type: ShadingType.CLEAR, color: 'auto' } : undefined,
        verticalAlign: VerticalAlignTable.TOP,
        margins: { top: 60, bottom: 60, left: 100, right: 100 },
    });
}

function construirTabla(tabla: HTMLTableElement): Table | null {
    const filas = Array.from(tabla.rows).filter(fila => fila.cells.length > 0);
    if (filas.length === 0) return null;

    const rows = filas.map(fila => new TableRow({
        cantSplit: true,
        children: Array.from(fila.cells).map(construirCelda),
    }));

    return new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: BORDES_TABLA,
        rows,
    });
}

function construirBloques(raiz: HTMLElement, estiloBase: EstiloTexto): (Paragraph | Table)[] {
    const salida: (Paragraph | Table)[] = [];

    for (const nodo of Array.from(raiz.childNodes)) {
        if (nodo.nodeType === 3) {
            const texto = normalizarTexto(nodo.nodeValue);
            if (texto.trim()) salida.push(new Paragraph({ children: [new TextRun({ text: texto.trim() })] }));
            continue;
        }
        if (!esElemento(nodo)) continue;

        const el = nodo as HTMLElement;
        if (debeIgnorar(el)) continue;

        switch (el.tagName) {
            case 'TABLE': {
                const tabla = construirTabla(el as HTMLTableElement);
                if (tabla) salida.push(tabla);
                break;
            }
            case 'UL':
            case 'OL':
                salida.push(...construirLista(el));
                break;
            case 'HR':
                break;
            default: {
                if (tieneBloques(el)) {
                    salida.push(...construirBloques(el, estiloBase));
                } else {
                    const parrafo = parrafoDesdeElemento(el, estiloBase);
                    if (parrafo) salida.push(parrafo);
                }
                break;
            }
        }
    }

    return salida;
}

function sanitizarNombre(valor: string): string {
    return valor
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '')
        .replace(/_+/g, '_');
}

export function nombreArchivoPlanificacion(meta: PlanificacionDocxMeta): string {
    const partes = ['Planificacion', 'Diaria'];
    if (meta.asignatura) partes.push(meta.asignatura);
    if (meta.curso) partes.push(meta.curso);
    else if (meta.periodo) partes.push(meta.periodo);

    const base = sanitizarNombre(partes.join('_')) || 'Planificacion_Diaria';
    return `${base}.docx`;
}

export function crearDocumentoPlanificacion(contenedor: HTMLElement, meta: PlanificacionDocxMeta = {}): Document {
    const bloques = construirBloques(contenedor, {});
    if (bloques.length === 0) {
        throw new Error('El documento de la planificación está vacío.');
    }

    return new Document({
        creator: meta.docente || 'CIELO',
        title: meta.titulo || 'Planificación de clase diaria',
        description: 'Planificación diaria exportada desde CIELO',
        styles: {
            default: {
                document: {
                    run: { font: 'Segoe UI', size: 19, color: COLOR_TINTA },
                    paragraph: { spacing: { after: 60 } },
                },
            },
        },
        numbering: {
            config: [
                {
                    reference: 'lista-planificacion',
                    levels: [
                        {
                            level: 0,
                            format: LevelFormat.DECIMAL,
                            text: '%1.',
                            alignment: AlignmentType.START,
                            style: { paragraph: { indent: { left: 420, hanging: 300 } } },
                        },
                    ],
                },
            ],
        },
        sections: [
            {
                properties: {
                    page: {
                        size: { width: 15840, height: 12240 },
                        margin: { top: 720, right: 720, bottom: 720, left: 720 },
                    },
                },
                children: bloques,
            },
        ],
    });
}

export async function crearBlobPlanificacionDocx(
    contenedor: HTMLElement,
    meta: PlanificacionDocxMeta = {},
): Promise<Blob> {
    return Packer.toBlob(crearDocumentoPlanificacion(contenedor, meta));
}

export async function descargarPlanificacionDocx(
    contenedor: HTMLElement,
    meta: PlanificacionDocxMeta = {},
): Promise<void> {
    const blob = await crearBlobPlanificacionDocx(contenedor, meta);
    saveAs(blob, nombreArchivoPlanificacion(meta));
}
