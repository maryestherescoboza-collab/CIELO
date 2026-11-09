import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { QRCodeSVG } from 'qrcode.react';
import { jsPDF } from 'jspdf';
import { saveAs } from 'file-saver';
import { supabase } from '../lib/supabase';
import type { AppState, BCKey, Skill, RecuperacionBC } from '../types';
import { getCompetenciaDisplay } from '../types';
import { getAsignaturaNombre } from '../constants/asignaturas';
import { INDICADORES_RECUPERACION, TITULOS_RECUPERACION } from '../constants/recuperacionCotejo';
import { actividadesParaRecuperacion } from './recuperacion';

export interface InformeCurricularData {
    est: any;
    curso: any;
    periodo: string;
    promedioPeriodo: string;
    rankingPeriodo: string;
    /** Se conserva por compatibilidad con el llamador; el apartado de atributos ya no se exporta. */
    studentHabilidades?: Skill[];
    actividadesPeriodo: any[];
    incidenciasEstudiante: any[];
    computedBCs: Record<'BC1' | 'BC2' | 'BC3' | 'BC4', number | null>;
    getDescriptorTexts: (studentId: number, actividadId: number) => string[];
    state: AppState;
    currentAsignatura?: string;
    isTutor?: boolean;
    currentUserId?: string;
    /** Token individual de `portal_accesos` si ya fue resuelto previamente. */
    portalAccessToken?: string | null;
    /** URL base opcional para construir el enlace del portal. */
    portalBaseUrl?: string;
    /** Callback opcional para notificar el token individual resuelto. */
    onTokenResolved?: (token: string) => void;
}

/* ═════════════════════════════════════════════════════════════════════════
   PALETA Y CONSTANTES DE PÁGINA (A4, milímetros)
   ═════════════════════════════════════════════════════════════════════════ */

const COLOR_TINTA = '#1B1F2A';
const COLOR_MUTED = '#4E5566';
const COLOR_CLARO = '#8A8FA0';
const COLOR_CORAL = '#DB5B48';
const COLOR_AZUL = '#537BAC';
const COLOR_VERDE = '#689C63';
const COLOR_NARANJA = '#EB8847';
const COLOR_BORDE = '#E4E3EC';
const COLOR_FONDO_HEADER = '#EEF3F8';
const COLOR_FONDO_TABLA = '#FAFAFB';

const PAGE_W = 210;
const PAGE_H = 297;
const MARGIN_X = 13;
const MARGIN_TOP = 13;
const MARGIN_BOTTOM = 13;
const CONTENT_W = PAGE_W - MARGIN_X * 2;
const CONTENT_BOTTOM = PAGE_H - MARGIN_BOTTOM;

const PT_TO_MM = 0.3528;
const LINE_FACTOR = 1.22;
const CELL_PAD_X = 1.8;
const CELL_PAD_Y = 1.3;

const BCS: Array<{ num: 1 | 2 | 3 | 4; key: BCKey; color: string }> = [
    { num: 1, key: 'BC1', color: COLOR_AZUL },
    { num: 2, key: 'BC2', color: COLOR_VERDE },
    { num: 3, key: 'BC3', color: COLOR_NARANJA },
    { num: 4, key: 'BC4', color: COLOR_CORAL },
];

/* ═════════════════════════════════════════════════════════════════════════
   UTILIDADES DE TEXTO
   ═════════════════════════════════════════════════════════════════════════ */

const fmt = (n: number): string => (Number.isInteger(n) ? String(n) : n.toFixed(2));

const normalizar = (t: string): string[] =>
    t
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9 ]/g, ' ')
        .split(/\s+/)
        .filter(Boolean);

function indiceIndicadorDefinitivo(bc: 1 | 2 | 3 | 4, textoAlmacenado: string): number {
    const definitivos = INDICADORES_RECUPERACION[bc];
    const exacto = definitivos.findIndex(d => d === textoAlmacenado);
    if (exacto >= 0) return exacto;

    const tokens = new Set(normalizar(textoAlmacenado));
    let mejor = -1;
    let mejorSim = 0;
    definitivos.forEach((d, i) => {
        const dtokens = new Set(normalizar(d));
        let inter = 0;
        for (const tok of dtokens) if (tokens.has(tok)) inter++;
        const union = dtokens.size + tokens.size - inter;
        const sim = union > 0 ? inter / union : 0;
        if (sim > mejorSim) {
            mejorSim = sim;
            mejor = i;
        }
    });
    return mejorSim >= 0.25 ? mejor : -1;
}

function formatearFecha(rawDate: string): string {
    if (!rawDate) return '—';
    const partes = rawDate.split('-');
    if (partes.length === 3) {
        const [yyyy, mm, dd] = partes;
        const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
        const mesIdx = parseInt(mm, 10) - 1;
        if (mesIdx >= 0 && mesIdx < 12) {
            return `${dd.slice(0, 2)} ${meses[mesIdx]} ${yyyy}`;
        }
    }
    return rawDate;
}

/**
 * Elimina del texto exportado los códigos internos de competencia (BC1–BC4),
 * incluidos sus separadores habituales: «BC1 - », «(BC2)», «[BC3]», «BC4:».
 * Solo afecta a la presentación del PDF; no modifica datos almacenados.
 */
export function ocultarCodigosBC(texto: string | null | undefined): string {
    if (!texto) return '';
    return String(texto)
        .replace(/[([]\s*BC\s?[1-4]\s*[)\]]/gi, ' ')
        .replace(/\bBC\s?[1-4]\b\s*[:\-–—.]?\s*/gi, ' ')
        .replace(/\s{2,}/g, ' ')
        .replace(/\s+([,.;:])/g, '$1')
        .trim();
}

/** Nombre descriptivo de una competencia sin su código. Devuelve '' si no existe. */
function nombreCompetencia(bc: string): string {
    const label = getCompetenciaDisplay(bc);
    if (!label || /^BC\s?\d$/i.test(label.trim())) return '';
    return ocultarCodigosBC(label);
}

/* ═════════════════════════════════════════════════════════════════════════
   ACCESO INDIVIDUAL AL PORTAL DEL ESTUDIANTE Y MATRIZ DEL CÓDIGO QR
   ═════════════════════════════════════════════════════════════════════════ */

const portalAccessTokenCache = new Map<number, string>();
const inFlightTokenRequests = new Map<number, Promise<string | null>>();

/**
 * Obtiene o crea el `access_token` individual del estudiante en `portal_accesos`
 * reutilizando el acceso existente sin duplicar registros.
 * No expone credenciales privadas ni tokens de sesión (`session_token`).
 */
export async function obtenerPortalAccessTokenEstudiante(
    est: any,
    curso: any,
    state: AppState,
    existingToken?: string | null
): Promise<string | null> {
    const estId = Number(est?.id);
    if (!Number.isFinite(estId) || estId <= 0) return null;

    if (existingToken && typeof existingToken === 'string' && existingToken.trim()) {
        const clean = existingToken.trim();
        portalAccessTokenCache.set(estId, clean);
        return clean;
    }
    if (est?.portalAccessToken && typeof est.portalAccessToken === 'string' && est.portalAccessToken.trim()) {
        const clean = est.portalAccessToken.trim();
        portalAccessTokenCache.set(estId, clean);
        return clean;
    }

    const cached = portalAccessTokenCache.get(estId);
    if (cached) return cached;

    const pending = inFlightTokenRequests.get(estId);
    if (pending) return pending;

    const requestPromise = (async (): Promise<string | null> => {
        try {
            // 1. Vía principal segura: RPC SECURITY DEFINER que verifica autorización docente y reutiliza o crea el acceso único
            const { data: rpcData, error: rpcError } = await supabase.rpc('portal_obtener_acceso_estudiante', {
                p_estudiante_id: estId,
            });

            if (!rpcError && rpcData && typeof rpcData.access_token === 'string' && rpcData.access_token.trim()) {
                const token = rpcData.access_token.trim();
                portalAccessTokenCache.set(estId, token);
                return token;
            }

            // 2. Respaldo directo en tabla por compatibilidad
            const { data: existingData } = await supabase
                .from('portal_accesos')
                .select('access_token')
                .eq('estudiante_id', estId)
                .limit(1)
                .maybeSingle();

            if (existingData?.access_token) {
                const token = String(existingData.access_token).trim();
                portalAccessTokenCache.set(estId, token);
                return token;
            }

            const cursoReal =
                curso || state?.cursos?.find((c: any) => c.id === est.curso_id || c.id === est.cursoId);
            const centroId =
                cursoReal?.centro_id ||
                cursoReal?.centroId ||
                state?.centroRolActual?.centro_id ||
                state?.centros?.[0]?.id ||
                null;

            const { data: newAccess } = await supabase
                .from('portal_accesos')
                .upsert(
                    {
                        estudiante_id: estId,
                        centro_id: centroId,
                        active: true,
                    },
                    { onConflict: 'estudiante_id' }
                )
                .select('access_token')
                .single();

            if (newAccess?.access_token) {
                const token = String(newAccess.access_token).trim();
                portalAccessTokenCache.set(estId, token);
                return token;
            }
        } catch {
            // Si no hay conexión en el momento de consultar, se devuelve null
        } finally {
            inFlightTokenRequests.delete(estId);
        }
        return null;
    })();

    inFlightTokenRequests.set(estId, requestPromise);
    return requestPromise;
}

/**
 * Construye la URL real hacia el Portal del Estudiante de CIELO.
 * Si el estudiante cuenta con su `access_token` individual, dirige directamente
 * a `/portal/:token` (donde el estudiante o familia se autentica con su PIN).
 */
export function construirUrlPortalEstudiante(accessToken: string | null | undefined, baseUrl?: string): string {
    const rawOrigin =
        baseUrl ||
        (typeof window !== 'undefined' && window.location?.origin && window.location.origin.startsWith('http')
            ? window.location.origin
            : 'https://cielo.app');
    const origin = rawOrigin.replace(/\/+$/, '');
    if (accessToken && accessToken.trim()) {
        return `${origin}/portal/${encodeURIComponent(accessToken.trim())}`;
    }
    return `${origin}/portal`;
}

/**
 * Construye la URL para el procedimiento de recuperación de clave del Portal CIELO.
 * Apunta a `/portal/recuperar/:recoveryToken`, que solicita establecer una nueva clave
 * y nunca otorga acceso directo al portal sin autenticación.
 */
export function construirUrlRecuperacionPortal(recoveryToken: string | null | undefined, baseUrl?: string): string {
    const rawOrigin =
        baseUrl ||
        (typeof window !== 'undefined' && window.location?.origin && window.location.origin.startsWith('http')
            ? window.location.origin
            : 'https://cielo.app');
    const origin = rawOrigin.replace(/\/+$/, '');
    if (recoveryToken && recoveryToken.trim()) {
        return `${origin}/portal/recuperar/${encodeURIComponent(recoveryToken.trim())}`;
    }
    return `${origin}/portal`;
}

/**
 * Extrae la matriz booleana exacta del QR a partir de `QRCodeSVG` (`qrcode.react`).
 * El QR se dibuja después como vectores en el PDF (nitidez máxima al imprimir).
 */
export function extraerMatrizQr(valor: string): boolean[][] {
    const svgMarkup = renderToStaticMarkup(
        React.createElement(QRCodeSVG, {
            value: valor,
            size: 256,
            level: 'M',
            marginSize: 2,
            bgColor: '#FFFFFF',
            fgColor: '#000000',
        })
    );

    const vbMatch = svgMarkup.match(/viewBox="0 0 (\d+) (\d+)"/);
    const numCells = vbMatch ? parseInt(vbMatch[1], 10) : 33;
    const matrix: boolean[][] = Array.from({ length: numCells }, () => Array(numCells).fill(false));

    const pathMatches = Array.from(svgMarkup.matchAll(/<path[^>]*d="([^"]+)"[^>]*>/g));
    const fgPath = pathMatches.length > 1 ? pathMatches[1][1] : pathMatches[0]?.[1] || '';

    const segRegex = /M(\d+)[ ,](\d+)\s*h(\d+)v1/g;
    let m: RegExpExecArray | null;
    while ((m = segRegex.exec(fgPath)) !== null) {
        const startX = parseInt(m[1], 10);
        const y = parseInt(m[2], 10);
        const width = parseInt(m[3], 10);
        if (y >= 0 && y < numCells) {
            for (let x = startX; x < startX + width && x < numCells; x++) {
                if (x >= 0) matrix[y][x] = true;
            }
        }
    }

    return matrix;
}

/* ═════════════════════════════════════════════════════════════════════════
   MOTOR DE MAQUETACIÓN COMPACTA SOBRE jsPDF
   ═════════════════════════════════════════════════════════════════════════ */

type FontStyle = 'normal' | 'bold' | 'italic' | 'bolditalic';

interface Run {
    text: string;
    style?: FontStyle;
    color?: string;
}

interface Parrafo {
    runs: Run[];
    size: number;
    align?: 'left' | 'right' | 'center';
    spaceAfter?: number;
}

interface LineaMaquetada {
    tokens: Array<{ text: string; x: number; style: FontStyle; color: string }>;
    width: number;
}

interface ParrafoMaquetado {
    lines: LineaMaquetada[];
    size: number;
    lineHeight: number;
    align: 'left' | 'right' | 'center';
    spaceAfter: number;
    height: number;
}

const p = (runs: Run[] | string, size: number, extra: Partial<Parrafo> = {}): Parrafo => ({
    runs: typeof runs === 'string' ? [{ text: runs }] : runs,
    size,
    ...extra,
});

class Maquetador {
    doc: jsPDF;
    y = MARGIN_TOP;

    constructor(doc: jsPDF) {
        this.doc = doc;
    }

    private medir(text: string, style: FontStyle, size: number): number {
        this.doc.setFont('helvetica', style);
        this.doc.setFontSize(size);
        return this.doc.getTextWidth(text);
    }

    maquetar(par: Parrafo, maxWidth: number): ParrafoMaquetado {
        const lineHeight = par.size * PT_TO_MM * LINE_FACTOR;
        const lines: LineaMaquetada[] = [];
        let current: LineaMaquetada = { tokens: [], width: 0 };

        const pushLine = () => {
            // Recortar espacios al final de la línea
            while (current.tokens.length && current.tokens[current.tokens.length - 1].text.trim() === '') {
                current.tokens.pop();
            }
            // Agrupar tokens contiguos con mismo estilo y color para conservar el espaciado nativo de la fuente
            const compactados: Array<{ text: string; x: number; style: FontStyle; color: string }> = [];
            let cursorX = 0;
            for (const tok of current.tokens) {
                const prev = compactados[compactados.length - 1];
                if (prev && prev.style === tok.style && prev.color === tok.color) {
                    prev.text += tok.text;
                } else {
                    compactados.push({ ...tok });
                }
            }
            for (const tok of compactados) {
                tok.x = cursorX;
                cursorX += this.medir(tok.text, tok.style, par.size);
            }
            lines.push({ tokens: compactados, width: cursorX });
            current = { tokens: [], width: 0 };
        };

        for (const run of par.runs) {
            const style = run.style || 'normal';
            const color = run.color || COLOR_TINTA;
            const partes = String(run.text ?? '').replace(/\s*\n\s*/g, ' ').split(/(\s+)/).filter(s => s.length > 0);

            for (const parte of partes) {
                const esEspacio = parte.trim() === '';
                const texto = esEspacio ? ' ' : parte;
                if (esEspacio && current.tokens.length === 0) continue;
                let w = this.medir(texto, style, par.size);

                if (!esEspacio && current.width + w > maxWidth && current.tokens.length > 0) {
                    pushLine();
                }

                // Palabra más ancha que la columna: se fragmenta por caracteres
                if (!esEspacio && w > maxWidth) {
                    let fragmento = '';
                    for (const ch of texto) {
                        const wf = this.medir(fragmento + ch, style, par.size);
                        if (current.width + wf > maxWidth && fragmento) {
                            current.tokens.push({ text: fragmento, x: current.width, style, color });
                            current.width += this.medir(fragmento, style, par.size);
                            pushLine();
                            fragmento = ch;
                        } else {
                            fragmento += ch;
                        }
                    }
                    if (fragmento) {
                        w = this.medir(fragmento, style, par.size);
                        current.tokens.push({ text: fragmento, x: current.width, style, color });
                        current.width += w;
                    }
                    continue;
                }

                current.tokens.push({ text: texto, x: current.width, style, color });
                current.width += w;
            }
        }
        if (current.tokens.length > 0 || lines.length === 0) pushLine();

        const spaceAfter = par.spaceAfter ?? 0.6;
        return {
            lines,
            size: par.size,
            lineHeight,
            align: par.align || 'left',
            spaceAfter,
            height: lines.length * lineHeight + spaceAfter,
        };
    }

    maquetarBloque(pars: Parrafo[], maxWidth: number): { items: ParrafoMaquetado[]; height: number } {
        const items = pars.map(par => this.maquetar(par, maxWidth));
        const height = items.reduce((acc, it, i) => acc + it.height - (i === items.length - 1 ? it.spaceAfter : 0), 0);
        return { items, height };
    }

    dibujarBloque(bloque: { items: ParrafoMaquetado[] }, x: number, y: number, width: number): void {
        let cy = y;
        for (const it of bloque.items) {
            for (const line of it.lines) {
                const baseline = cy + it.size * PT_TO_MM * 0.95;
                const offset =
                    it.align === 'right' ? width - line.width : it.align === 'center' ? (width - line.width) / 2 : 0;
                for (const tok of line.tokens) {
                    if (!tok.text.trim()) continue;
                    this.doc.setFont('helvetica', tok.style);
                    this.doc.setFontSize(it.size);
                    this.doc.setTextColor(tok.color);
                    this.doc.text(tok.text, x + offset + tok.x, baseline);
                }
                cy += it.lineHeight;
            }
            cy += it.spaceAfter;
        }
    }

    espacioRestante(): number {
        return CONTENT_BOTTOM - this.y;
    }

    nuevaPagina(): void {
        this.doc.addPage('a4', 'portrait');
        this.y = MARGIN_TOP;
    }

    asegurar(alto: number): void {
        if (this.y + alto > CONTENT_BOTTOM && this.y > MARGIN_TOP + 0.1) {
            this.nuevaPagina();
        }
    }

    tituloSeccion(titulo: string, altoMinimoSiguiente = 10): void {
        const alto = 6.2;
        this.asegurar(alto + altoMinimoSiguiente);
        if (this.y > MARGIN_TOP + 0.1) this.y += 2.2;
        const baseline = this.y + 3.2;
        this.doc.setFont('helvetica', 'bold');
        this.doc.setFontSize(9.5);
        this.doc.setTextColor(COLOR_CORAL);
        this.doc.text('//', MARGIN_X, baseline);
        const wSlash = this.doc.getTextWidth('// ');
        this.doc.setFontSize(9);
        this.doc.setTextColor(COLOR_TINTA);
        this.doc.text(titulo.toUpperCase(), MARGIN_X + wSlash, baseline);
        this.y += 4.8;
    }

    mensajeVacio(texto: string): void {
        const bloque = this.maquetarBloque([p([{ text: texto, style: 'italic', color: COLOR_CLARO }], 8)], CONTENT_W);
        this.asegurar(bloque.height);
        this.dibujarBloque(bloque, MARGIN_X, this.y, CONTENT_W);
        this.y += bloque.height + 0.8;
    }

    /**
     * Tabla con encabezado repetido en cada página y filas que no se parten
     * (salvo que una fila sea más alta que una página completa).
     */
    tabla(
        columnas: Array<{ titulo: string; ancho: number; align?: 'left' | 'right' }>,
        filas: Array<{ celdas: Parrafo[][]; acento?: string }>
    ): void {
        const anchos = columnas.map(c => (c.ancho / 100) * CONTENT_W);
        const xs: number[] = [];
        anchos.reduce((acc, w, i) => {
            xs[i] = acc;
            return acc + w;
        }, MARGIN_X);

        const encabezado = columnas.map((c, i) =>
            this.maquetarBloque(
                [p([{ text: c.titulo, style: 'bold', color: COLOR_TINTA }], 7, { align: c.align || 'left' })],
                anchos[i] - CELL_PAD_X * 2
            )
        );
        const altoEncabezado = Math.max(...encabezado.map(b => b.height)) + CELL_PAD_Y * 2;

        const dibujarEncabezado = () => {
            this.doc.setFillColor(COLOR_FONDO_HEADER);
            this.doc.setDrawColor(COLOR_BORDE);
            this.doc.setLineWidth(0.2);
            this.doc.rect(MARGIN_X, this.y, CONTENT_W, altoEncabezado, 'FD');
            encabezado.forEach((b, i) => {
                this.dibujarBloque(b, xs[i] + CELL_PAD_X, this.y + CELL_PAD_Y, anchos[i] - CELL_PAD_X * 2);
                if (i > 0) this.doc.line(xs[i], this.y, xs[i], this.y + altoEncabezado);
            });
            this.y += altoEncabezado;
        };

        const filasMaquetadas = filas.map(f => {
            const bloques = f.celdas.map((celda, i) => this.maquetarBloque(celda, anchos[i] - CELL_PAD_X * 2));
            const alto = Math.max(...bloques.map(b => b.height)) + CELL_PAD_Y * 2;
            return { bloques, alto, acento: f.acento };
        });

        this.asegurar(altoEncabezado + (filasMaquetadas[0]?.alto ?? 0));
        dibujarEncabezado();

        for (const fila of filasMaquetadas) {
            if (this.y + fila.alto > CONTENT_BOTTOM) {
                this.nuevaPagina();
                dibujarEncabezado();
            }
            this.doc.setDrawColor(COLOR_BORDE);
            this.doc.setLineWidth(0.2);
            this.doc.rect(MARGIN_X, this.y, CONTENT_W, fila.alto, 'S');
            fila.bloques.forEach((b, i) => {
                if (i > 0) this.doc.line(xs[i], this.y, xs[i], this.y + fila.alto);
                this.dibujarBloque(b, xs[i] + CELL_PAD_X, this.y + CELL_PAD_Y, anchos[i] - CELL_PAD_X * 2);
            });
            if (fila.acento) {
                this.doc.setFillColor(fila.acento);
                this.doc.rect(MARGIN_X, this.y, 0.9, fila.alto, 'F');
            }
            this.y += fila.alto;
        }
    }
}

/* ═════════════════════════════════════════════════════════════════════════
   CONSTRUCCIÓN DEL INFORME CURRICULAR EN PDF
   ═════════════════════════════════════════════════════════════════════════ */

export function generarNombreArchivoInformeCurricular(
    curso: any,
    asignaturaNombre: string,
    estudiante: any,
    periodo: string
): string {
    const grado = curso?.grado || 'Grado';
    const seccion = curso?.seccion || '';
    const asig = asignaturaNombre || curso?.asignatura || 'Asignatura';
    const nombreEst = estudiante ? `${estudiante.nombre || ''}_${estudiante.apellido || ''}`.trim() : 'Curso';

    const base = ['Informe_Curricular', grado, seccion, asig, nombreEst, periodo].filter(Boolean).join('_');
    const sanitizado = base
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9_-]/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_|_$/g, '');

    return `${sanitizado || 'Informe_Curricular'}.pdf`;
}

function dibujarQr(doc: jsPDF, matrix: boolean[][], x: number, y: number, size: number): void {
    const n = matrix.length || 1;
    const cell = size / n;
    doc.setFillColor('#FFFFFF');
    doc.rect(x, y, size, size, 'F');
    doc.setFillColor('#000000');
    for (let row = 0; row < n; row++) {
        let col = 0;
        while (col < n) {
            if (matrix[row][col]) {
                let end = col;
                while (end + 1 < n && matrix[row][end + 1]) end++;
                // Ligero solape (0.02 mm) para evitar líneas blancas entre módulos al rasterizar
                doc.rect(x + col * cell, y + row * cell, (end - col + 1) * cell + 0.02, cell + 0.02, 'F');
                col = end + 1;
            } else {
                col++;
            }
        }
    }
}

interface InfoPie {
    paginaInicio: number;
    paginaFin: number;
    texto: string;
}

async function dibujarInformeEstudiante(m: Maquetador, data: InformeCurricularData): Promise<InfoPie> {
    const {
        est,
        curso,
        periodo,
        promedioPeriodo,
        rankingPeriodo,
        actividadesPeriodo,
        incidenciasEstudiante,
        computedBCs,
        getDescriptorTexts,
        state,
        currentAsignatura,
        isTutor = false,
        currentUserId,
        portalAccessToken,
        portalBaseUrl,
        onTokenResolved,
    } = data;
    const doc = m.doc;
    const paginaInicio = doc.getNumberOfPages();

    const asignaturaNombre = getAsignaturaNombre(currentAsignatura || curso?.asignatura) || 'Asignatura';

    const centroId = curso?.centroId || curso?.centro_id || state?.centroRolActual?.centro_id || null;
    const centro = state?.centros?.find(c => c.id === centroId);
    const centroNombre =
        centro?.nombre ||
        (state?.instituto && state.instituto !== 'Instituto Central' ? state.instituto : '') ||
        state?.instituto ||
        '';

    const uid = currentUserId || curso?.userId;
    const userProfile = state?.perfiles?.find(pf => pf.userId === uid);
    const docenteNombre = userProfile?.nombreDocente || '';

    // Enlace individual al Portal del Estudiante
    const resolvedToken = await obtenerPortalAccessTokenEstudiante(est, curso, state, portalAccessToken);
    if (resolvedToken && onTokenResolved) onTokenResolved(resolvedToken);
    const urlPortal = construirUrlPortalEstudiante(resolvedToken, portalBaseUrl);
    const qrMatrix = extraerMatrizQr(urlPortal);

    /* ── 1. Cabecera: identificación + métricas (izquierda) y QR del portal (derecha) ── */
    const QR_CARD_W = 34;
    const GAP = 4;
    const leftW = CONTENT_W - QR_CARD_W - GAP;
    const topY = m.y;

    const parsIdent: Parrafo[] = [];
    if (centroNombre || docenteNombre) {
        const runs: Run[] = [];
        if (centroNombre) runs.push({ text: centroNombre.toUpperCase(), style: 'bold', color: COLOR_MUTED });
        if (centroNombre && docenteNombre) runs.push({ text: '   •   ', color: COLOR_CLARO });
        if (docenteNombre) {
            runs.push({ text: 'Docente: ', style: 'bold', color: COLOR_MUTED });
            runs.push({ text: docenteNombre, color: COLOR_MUTED });
        }
        parsIdent.push(p(runs, 7.5, { spaceAfter: 1.2 }));
    }
    parsIdent.push(
        p(
            [
                { text: `${est?.nombre || ''} `, style: 'bold', color: COLOR_TINTA },
                { text: `${est?.apellido || ''}`, style: 'bold', color: COLOR_CORAL },
            ],
            15,
            { spaceAfter: 0.8 }
        ),
        p(
            [
                { text: 'INFORME CURRICULAR', style: 'bold', color: COLOR_TINTA },
                {
                    text: `   •   Período ${periodo}   •   ${`${curso?.grado || ''} ${curso?.seccion || ''}`.trim()}   •   ${asignaturaNombre}`,
                    color: COLOR_MUTED,
                },
            ],
            8.5,
            { spaceAfter: 2.2 }
        )
    );
    const bloqueIdent = m.maquetarBloque(parsIdent, leftW);
    m.dibujarBloque(bloqueIdent, MARGIN_X, topY, leftW);

    // Métricas: Promedio y Ranking (el contador de competencias evaluadas ya no se exporta)
    const metY = topY + bloqueIdent.height + 2.2;
    const metH = 11;
    const metricas = [
        { label: 'PROMEDIO', valor: `${promedioPeriodo}%`, color: COLOR_AZUL },
        { label: 'RANKING', valor: `${rankingPeriodo}`, color: COLOR_CORAL },
    ];
    const metW = (leftW - 3) / metricas.length;
    metricas.forEach((met, i) => {
        const x = MARGIN_X + i * (metW + 3);
        doc.setFillColor(COLOR_FONDO_TABLA);
        doc.setDrawColor(COLOR_BORDE);
        doc.setLineWidth(0.2);
        doc.roundedRect(x, metY, metW, metH, 1.2, 1.2, 'FD');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(6.5);
        doc.setTextColor(COLOR_CLARO);
        doc.text(met.label, x + 2.5, metY + 3.8);
        doc.setFontSize(12);
        doc.setTextColor(met.color);
        doc.text(met.valor, x + 2.5, metY + 9);
    });
    const leftBottom = metY + metH;

    // Tarjeta QR
    const QR_SIZE = 24;
    const caption = m.maquetarBloque(
        [
            p([{ text: 'Escanea para acceder al portal del estudiante', style: 'bold', color: COLOR_MUTED }], 6.5, {
                align: 'center',
            }),
        ],
        QR_CARD_W - 4
    );
    const cardH = 2.5 + QR_SIZE + 1.5 + caption.height + 2.2;
    const cardX = MARGIN_X + leftW + GAP;
    doc.setFillColor(COLOR_FONDO_TABLA);
    doc.setDrawColor(COLOR_BORDE);
    doc.setLineWidth(0.2);
    doc.roundedRect(cardX, topY, QR_CARD_W, cardH, 1.5, 1.5, 'FD');
    dibujarQr(doc, qrMatrix, cardX + (QR_CARD_W - QR_SIZE) / 2, topY + 2.5, QR_SIZE);
    m.dibujarBloque(caption, cardX + 2, topY + 2.5 + QR_SIZE + 1.5, QR_CARD_W - 4);

    m.y = Math.max(leftBottom, topY + cardH) + 1;

    /* ── 2. Competencias evaluadas (solo nombres descriptivos, sin códigos BC) ── */
    m.tituloSeccion('Competencias evaluadas', 14);
    m.tabla(
        [
            { titulo: 'COMPETENCIA', ancho: 82 },
            { titulo: 'CALIFICACIÓN', ancho: 18, align: 'right' },
        ],
        BCS.map(({ key, color }) => {
            const score = computedBCs[key];
            return {
                acento: color,
                celdas: [
                    [p([{ text: nombreCompetencia(key), color: COLOR_TINTA }], 8.5, { spaceAfter: 0 })],
                    [
                        p(
                            [
                                {
                                    text: score !== null && score !== undefined ? `${score}%` : '—',
                                    style: score !== null && score !== undefined ? 'bold' : 'normal',
                                    color: score !== null && score !== undefined ? COLOR_TINTA : COLOR_CLARO,
                                },
                            ],
                            8.5,
                            { align: 'right', spaceAfter: 0 }
                        ),
                    ],
                ],
            };
        })
    );

    /* ── 3. Evidencias de aprendizaje y contenidos ── */
    m.tituloSeccion('Evidencias de aprendizaje y contenidos', 16);
    if (actividadesPeriodo && actividadesPeriodo.length > 0) {
        m.tabla(
            [
                { titulo: 'FECHA', ancho: 12 },
                { titulo: 'ACTIVIDAD, CONTENIDO E INDICADOR', ancho: 52 },
                { titulo: 'COMPETENCIAS', ancho: 23 },
                { titulo: 'CALIFICACIÓN', ancho: 13, align: 'right' },
            ],
            actividadesPeriodo.map(act => {
                const calif = state.calificaciones.find(c => c.estudianteId === est.id && c.actividadId === act.id);
                const isEvaluated = !!calif && calif.puntaje !== null && calif.puntaje !== undefined;
                const score = isEvaluated ? calif!.puntaje : null;
                const descriptors = (getDescriptorTexts(est.id, act.id) || [])
                    .map(d => ocultarCodigosBC(d))
                    .filter(Boolean);

                const contenido: Parrafo[] = [
                    p([{ text: ocultarCodigosBC(act.nombre), style: 'bold', color: COLOR_TINTA }], 8, { spaceAfter: 0.5 }),
                ];
                const descripcion = ocultarCodigosBC(act.descripcion);
                if (descripcion) {
                    contenido.push(
                        p(
                            [
                                { text: 'Contenido: ', style: 'bold', color: COLOR_MUTED },
                                { text: descripcion, style: 'italic', color: COLOR_MUTED },
                            ],
                            7.3,
                            { spaceAfter: 0.4 }
                        )
                    );
                }
                const indicador = ocultarCodigosBC(act.indicador);
                if (indicador) {
                    contenido.push(
                        p(
                            [
                                { text: 'Indicador: ', style: 'bold', color: COLOR_MUTED },
                                { text: indicador, color: COLOR_MUTED },
                            ],
                            7.3,
                            { spaceAfter: 0.4 }
                        )
                    );
                }
                if (isEvaluated && descriptors.length > 0) {
                    descriptors.forEach(desc =>
                        contenido.push(p([{ text: `• ${desc}`, color: COLOR_MUTED }], 7.3, { spaceAfter: 0.3 }))
                    );
                } else if (isEvaluated) {
                    contenido.push(
                        p([{ text: 'Sin descriptores registrados.', style: 'italic', color: COLOR_CLARO }], 7.3, {
                            spaceAfter: 0,
                        })
                    );
                } else {
                    contenido.push(
                        p([{ text: 'Evaluación pendiente.', style: 'italic', color: COLOR_CLARO }], 7.3, {
                            spaceAfter: 0,
                        })
                    );
                }

                const nombresBc = Array.from(
                    new Set<string>(((act.bcAsignados || []) as string[]).map(nombreCompetencia).filter(Boolean))
                );
                const competencias: Parrafo[] =
                    nombresBc.length > 0
                        ? nombresBc.map(nombre => p([{ text: nombre, color: COLOR_TINTA }], 7.3, { spaceAfter: 0.6 }))
                        : [p([{ text: '—', color: COLOR_CLARO }], 7.3)];

                return {
                    celdas: [
                        [p([{ text: formatearFecha(act.fecha), color: COLOR_CLARO }], 7.3)],
                        contenido,
                        competencias,
                        [
                            p(
                                [
                                    {
                                        text: isEvaluated ? `${score} %` : 'Pendiente',
                                        style: isEvaluated ? 'bold' : 'normal',
                                        color: isEvaluated ? COLOR_CORAL : COLOR_CLARO,
                                    },
                                ],
                                8,
                                { align: 'right' }
                            ),
                        ],
                    ],
                };
            })
        );
    } else {
        m.mensajeVacio('Sin actividades registradas en este período.');
    }

    /* ── 4. Bitácora de convivencia ── */
    m.tituloSeccion('Bitácora de convivencia', 12);
    if (incidenciasEstudiante && incidenciasEstudiante.length > 0) {
        m.tabla(
            [
                { titulo: 'FECHA', ancho: 13 },
                { titulo: 'CATEGORÍA', ancho: 23 },
                { titulo: 'DESCRIPCIÓN', ancho: 64 },
            ],
            incidenciasEstudiante.map(inc => ({
                celdas: [
                    [p([{ text: formatearFecha(inc.fecha), color: COLOR_CLARO }], 7.3)],
                    [p([{ text: inc.categoria || 'Incidencia', style: 'bold', color: COLOR_TINTA }], 7.8)],
                    [p([{ text: `"${inc.descripcion || ''}"`, style: 'italic', color: COLOR_MUTED }], 7.3)],
                ],
            }))
        );
    } else {
        m.mensajeVacio('Sin registros de convivencia.');
    }

    /* ── 5. Recuperación por competencia ── */
    m.tituloSeccion('Recuperación por competencia', 10);
    const asignaturaRecup = isTutor ? undefined : currentAsignatura;
    const cursoId = curso?.id;

    const bloquesRecuperacion = cursoId
        ? BCS.map(({ num, key, color }) => {
              const recuperacion = state.recuperaciones.find(
                  (r: RecuperacionBC) =>
                      r.estudianteId === est.id &&
                      r.cursoId === cursoId &&
                      r.bc === num &&
                      r.periodo === periodo &&
                      (!asignaturaRecup || !r.asignatura || r.asignatura === asignaturaRecup)
              );
              if (!recuperacion) return null;

              const cotejo = state.recuperacionesCotejo.filter(r => r.recuperacionId === recuperacion.id);
              const aplicables = actividadesParaRecuperacion(
                  state.actividades,
                  state.calificaciones,
                  est.id,
                  num,
                  periodo,
                  cursoId,
                  asignaturaRecup
              );

              const definitivos = INDICADORES_RECUPERACION[num];
              const logradasPorIndicador = definitivos.map(
                  (_d, i) => cotejo.filter(r => indiceIndicadorDefinitivo(num, r.indicador) === i).length
              );

              return {
                  color,
                  nombre: ocultarCodigosBC(TITULOS_RECUPERACION[key] || nombreCompetencia(key)),
                  indicadores: definitivos,
                  logradas: logradasPorIndicador,
                  totalActividades: aplicables.length,
                  resultados: recuperacion.puntaje,
              };
          }).filter((b): b is NonNullable<typeof b> => b !== null)
        : [];

    if (bloquesRecuperacion.length > 0) {
        m.tabla(
            [{ titulo: 'COMPETENCIA E INDICADORES DE RECUPERACIÓN', ancho: 100 }],
            bloquesRecuperacion.map(b => ({
                acento: b.color,
                celdas: [
                    [
                        p(
                            [
                                { text: `Competencia ${b.nombre}`, style: 'bold', color: COLOR_TINTA },
                                { text: '   |   Resultado de recuperación: ', color: COLOR_CLARO },
                                {
                                    text:
                                        b.resultados !== null && b.resultados !== undefined
                                            ? `${fmt(b.resultados)} puntos`
                                            : '—',
                                    style: 'bold',
                                    color: COLOR_CORAL,
                                },
                            ],
                            8,
                            { spaceAfter: 0.8 }
                        ),
                        ...b.indicadores.map((ind, i) =>
                            p(
                                [
                                    { text: `• ${ocultarCodigosBC(ind)} `, color: COLOR_MUTED },
                                    { text: 'Logrado en ', color: COLOR_MUTED },
                                    { text: `${b.logradas[i]}/${b.totalActividades}`, style: 'bold', color: COLOR_TINTA },
                                    { text: ' de las actividades evaluadas.', color: COLOR_MUTED },
                                ],
                                7.3,
                                { spaceAfter: 0.4 }
                            )
                        ),
                    ],
                ],
            }))
        );
    } else {
        m.mensajeVacio(`Sin registros de recuperación para el período ${periodo}.`);
    }

    return {
        paginaInicio,
        paginaFin: doc.getNumberOfPages(),
        texto: `Informe curricular · ${est?.nombre || ''} ${est?.apellido || ''} · ${asignaturaNombre}`,
    };
}

function dibujarEncabezadosYPies(doc: jsPDF, pies: InfoPie[]): void {
    for (const pie of pies) {
        const total = pie.paginaFin - pie.paginaInicio + 1;
        for (let pg = pie.paginaInicio; pg <= pie.paginaFin; pg++) {
            doc.setPage(pg);
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(6.5);
            doc.setTextColor(COLOR_CLARO);
            doc.text('CIELO · Plataforma Educativa', PAGE_W - MARGIN_X, 7.5, { align: 'right' });

            doc.setDrawColor(COLOR_BORDE);
            doc.setLineWidth(0.2);
            doc.line(MARGIN_X, PAGE_H - 9.5, PAGE_W - MARGIN_X, PAGE_H - 9.5);
            doc.text(pie.texto, MARGIN_X, PAGE_H - 6.5);
            doc.text(`Página ${pg - pie.paginaInicio + 1} de ${total}`, PAGE_W - MARGIN_X, PAGE_H - 6.5, {
                align: 'right',
            });
        }
    }
}

/**
 * Construye el PDF para un estudiante individual o una lista de estudiantes
 * (cada ficha comienza en una página nueva, con numeración propia).
 */
export async function generarPdfInformeCurricular(
    input: InformeCurricularData | InformeCurricularData[]
): Promise<jsPDF> {
    const lista = Array.isArray(input) ? input : [input];
    const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait', compress: true });
    const m = new Maquetador(doc);
    const pies: InfoPie[] = [];

    for (let i = 0; i < lista.length; i++) {
        if (i > 0) m.nuevaPagina();
        pies.push(await dibujarInformeEstudiante(m, lista[i]));
    }
    dibujarEncabezadosYPies(doc, pies);

    const primero = lista[0];
    const asignaturaNombre = primero
        ? getAsignaturaNombre(primero.currentAsignatura || primero.curso?.asignatura) || 'Asignatura'
        : 'Asignatura';
    doc.setProperties({
        title:
            lista.length === 1 && primero?.est
                ? `Informe Curricular - ${primero.est.nombre} ${primero.est.apellido || ''}`.trim()
                : `Informes Curriculares - ${primero?.curso?.grado || ''} ${primero?.curso?.seccion || ''}`.trim(),
        subject: `Informe Curricular de ${asignaturaNombre}`,
        creator: 'CIELO — Plataforma Educativa',
    });

    return doc;
}

/**
 * Exporta y descarga el archivo `.pdf` para un estudiante individual o varios estudiantes.
 */
export async function exportarInformeCurricularPdf(
    input: InformeCurricularData | InformeCurricularData[]
): Promise<void> {
    const lista = Array.isArray(input) ? input : [input];
    if (lista.length === 0) return;

    const doc = await generarPdfInformeCurricular(lista);
    const blob = doc.output('blob');

    const primero = lista[0];
    const asignaturaNombre = getAsignaturaNombre(primero.currentAsignatura || primero.curso?.asignatura) || 'Asignatura';
    const nombreArchivo =
        lista.length === 1
            ? generarNombreArchivoInformeCurricular(primero.curso, asignaturaNombre, primero.est, primero.periodo)
            : generarNombreArchivoInformeCurricular(
                  primero.curso,
                  asignaturaNombre,
                  { nombre: 'Grupo', apellido: `${lista.length}_Estudiantes` },
                  primero.periodo
              );

    saveAs(blob, nombreArchivo);
}

