/**
 * Cliente de Evidencias.
 *
 * Dos superficies separadas a proposito, igual que `rutaApi.ts`, porque tienen
 * identidades distintas:
 *
 *  - `evidenciasApiPortal`: habla con un `session_token` de `portal_sesiones`.
 *    El estudiante no tiene cuenta de Supabase, asi que viaja `p_session_token`
 *    y la RPC resuelve solo al dueno. El cliente nunca dice de quien es.
 *  - `evidenciasApiDocente`: habla con un usuario autenticado. La identidad sale
 *    del JWT y la RPC comprueba `is_course_teacher(curso_id)` en cada operacion.
 *
 * Subir el binario es la excepcion: `storage.from().upload()` no es una RPC, asi
 * que va por el cliente de Storage con la clave anon. El objeto se nombra con un
 * uuid v4 y el bucket es privado; la fila es lo que RLS protege.
 */

import { supabase } from './supabase';
import {
    canonicalAsignaturaKey,
    fetchWithPortalCache,
    getCachedSignedUrl,
    invalidatePortalPortafolioCache,
    removeCachedSignedUrl,
    setCachedSignedUrl,
} from '../cache/portalCache';
import type {
    ActividadParaEvidencia,
    CursoConEvidencias,
    EvidenciaPortafolio,
    GrupoBandeja,
} from '../types/evidencias';

export const EVIDENCIAS_BUCKET = 'evidencias';
export const MAX_IMAGE_DIMENSION = 1600;
export const MAX_THUMB_DIMENSION = 160;
export const MAX_PROCESSED_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB máximo para imágenes procesadas

/** Toda RPC devuelve JSONB y reporta el fallo dentro del propio payload. */
function desenrollar<T>(data: unknown, fallback: string): T {
    if (!data) throw new Error(fallback);
    return data as T;
}

function mensajeDeError(data: unknown, fallback: string): string | null {
    if (data && typeof data === 'object' && 'error' in (data as Record<string, unknown>)) {
        const e = (data as Record<string, unknown>).error;
        if (typeof e === 'string' && e.trim()) return e;
        if (e && typeof e === 'object') {
            const msg = (e as { message?: unknown }).message;
            if (typeof msg === 'string' && msg.trim()) return msg;
        }
        return fallback;
    }
    return null;
}

function limpiarNombre(nombre: string): string {
    return nombre.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9._-]/g, '-');
}

/* ═════════════════════════════════════════════════════════════════════════
   COMPRESIÓN DE IMÁGENES EN CLIENTE (WEBP <= 1600PX, <= 5MB + MINIATURA)
   ═════════════════════════════════════════════════════════════════════════ */

export interface ImagenProcesadaEvidencia {
    archivo: File;
    thumbnailDataUrl: string | null;
}

const archivosYaProcesados = new WeakMap<File, ImagenProcesadaEvidencia>();

function esImagenProcesableEnCanvas(file: File): boolean {
    const mime = (file.type || '').toLowerCase();
    const ext = (file.name.split('.').pop() || '').toLowerCase();
    // Excluir GIF (puede ser animado) y SVG (vectorial)
    if (mime === 'image/gif' || mime === 'image/svg+xml' || ext === 'gif' || ext === 'svg') {
        return false;
    }
    if (mime.startsWith('image/')) return true;
    return ['jpg', 'jpeg', 'png', 'webp', 'bmp'].includes(ext);
}

function cargarImagenElemento(file: File): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const objectUrl = URL.createObjectURL(file);
        const img = new Image();
        img.onload = () => {
            URL.revokeObjectURL(objectUrl);
            resolve(img);
        };
        img.onerror = () => {
            URL.revokeObjectURL(objectUrl);
            reject(new Error('No se pudo decodificar la imagen seleccionada.'));
        };
        img.src = objectUrl;
    });
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
    return new Promise((resolve) => {
        canvas.toBlob((blob) => resolve(blob), type, quality);
    });
}

/**
 * Si el archivo es una imagen:
 * 1. Redimensiona proporcionalmente con máximo aproximado de 1600 px en su lado mayor.
 * 2. Convierte y comprime a WebP en el cliente.
 * 3. Verifica que el resultado procesado no supere los 5 MB.
 * 4. Genera una miniatura WebP ligera (~160 px) para evitar descargar la imagen
 *    original cuando solo se muestran miniaturas en el portafolio.
 */
export async function procesarArchivoParaEvidencia(file: File): Promise<ImagenProcesadaEvidencia> {
    const yaProcesado = archivosYaProcesados.get(file);
    if (yaProcesado) {
        return yaProcesado;
    }

    if (!esImagenProcesableEnCanvas(file)) {
        if (file.type.startsWith('image/') && file.size > MAX_PROCESSED_IMAGE_BYTES) {
            throw new Error('La imagen supera el límite permitido de 5 MB.');
        }
        const sinProcesar: ImagenProcesadaEvidencia = { archivo: file, thumbnailDataUrl: null };
        archivosYaProcesados.set(file, sinProcesar);
        return sinProcesar;
    }

    const img = await cargarImagenElemento(file);
    const naturalWidth = img.naturalWidth || img.width;
    const naturalHeight = img.naturalHeight || img.height;

    if (!naturalWidth || !naturalHeight) {
        if (file.size > MAX_PROCESSED_IMAGE_BYTES) {
            throw new Error('La imagen procesada supera el límite de 5 MB.');
        }
        return { archivo: file, thumbnailDataUrl: null };
    }

    // 1. Dimensiones de imagen principal (máx 1600 px)
    const maxSide = Math.max(naturalWidth, naturalHeight);
    const scale = maxSide > MAX_IMAGE_DIMENSION ? MAX_IMAGE_DIMENSION / maxSide : 1;
    const targetWidth = Math.max(1, Math.round(naturalWidth * scale));
    const targetHeight = Math.max(1, Math.round(naturalHeight * scale));

    const mainCanvas = document.createElement('canvas');
    mainCanvas.width = targetWidth;
    mainCanvas.height = targetHeight;
    const mainCtx = mainCanvas.getContext('2d');
    if (!mainCtx) {
        if (file.size > MAX_PROCESSED_IMAGE_BYTES) {
            throw new Error('La imagen supera el límite de 5 MB.');
        }
        return { archivo: file, thumbnailDataUrl: null };
    }
    mainCtx.imageSmoothingEnabled = true;
    mainCtx.imageSmoothingQuality = 'high';
    mainCtx.drawImage(img, 0, 0, targetWidth, targetHeight);

    // Probar calidades decrecientes hasta cumplir <= 5 MB
    const qualities = [0.82, 0.72, 0.6, 0.48];
    let finalBlob: Blob | null = null;
    for (const q of qualities) {
        const candidate = await canvasToBlob(mainCanvas, 'image/webp', q);
        if (candidate) {
            finalBlob = candidate;
            if (candidate.size <= MAX_PROCESSED_IMAGE_BYTES) {
                break;
            }
        }
    }

    if (!finalBlob) {
        if (file.size > MAX_PROCESSED_IMAGE_BYTES) {
            throw new Error('La imagen supera el límite de 5 MB.');
        }
        return { archivo: file, thumbnailDataUrl: null };
    }

    if (finalBlob.size > MAX_PROCESSED_IMAGE_BYTES) {
        throw new Error('La imagen procesada supera el límite máximo de 5 MB. Intenta con una imagen más liviana.');
    }

    // 2. Generar miniatura para el portafolio (máx 160 px, WebP)
    let thumbnailDataUrl: string | null = null;
    try {
        const thumbScale = maxSide > MAX_THUMB_DIMENSION ? MAX_THUMB_DIMENSION / maxSide : 1;
        const thumbWidth = Math.max(1, Math.round(naturalWidth * thumbScale));
        const thumbHeight = Math.max(1, Math.round(naturalHeight * thumbScale));
        const thumbCanvas = document.createElement('canvas');
        thumbCanvas.width = thumbWidth;
        thumbCanvas.height = thumbHeight;
        const thumbCtx = thumbCanvas.getContext('2d');
        if (thumbCtx) {
            thumbCtx.imageSmoothingEnabled = true;
            thumbCtx.imageSmoothingQuality = 'medium';
            thumbCtx.drawImage(mainCanvas, 0, 0, thumbWidth, thumbHeight);
            const dataUrl = thumbCanvas.toDataURL('image/webp', 0.68);
            if (dataUrl && dataUrl.startsWith('data:image/webp') && dataUrl.length < 32000) {
                thumbnailDataUrl = dataUrl;
            }
        }
    } catch {
        thumbnailDataUrl = null;
    }

    const baseName = file.name.replace(/\.[^.]+$/, '') || 'evidencia';
    const processedFile = new File([finalBlob], `${baseName}.webp`, {
        type: 'image/webp',
        lastModified: Date.now(),
    });

    const resultado: ImagenProcesadaEvidencia = {
        archivo: processedFile,
        thumbnailDataUrl,
    };

    archivosYaProcesados.set(file, resultado);
    archivosYaProcesados.set(processedFile, resultado);

    return resultado;
}

/* ═════════════════════════════════════════════════════════════════════════
   LADO PORTAL — el estudiante y su Portafolio
   ═════════════════════════════════════════════════════════════════════════ */

export const evidenciasApiPortal = {
    async listar(
        sessionToken: string,
        options?: { forceRefresh?: boolean; asignatura?: string }
    ): Promise<EvidenciaPortafolio[]> {
        const subKey = options?.asignatura ? canonicalAsignaturaKey(options.asignatura) : 'all';
        return fetchWithPortalCache<EvidenciaPortafolio[]>(
            sessionToken,
            'portafolio_evidencias',
            subKey,
            async () => {
                const { data, error } = await supabase.rpc('portal_listar_evidencias', {
                    p_session_token: sessionToken,
                    p_asignatura: options?.asignatura || null,
                });
                if (error) throw error;
                const msg = mensajeDeError(data, 'No se pudieron cargar tus evidencias');
                if (msg) throw new Error(msg);
                return desenrollar<EvidenciaPortafolio[]>(data, 'Respuesta vacia del portafolio');
            },
            { forceRefresh: options?.forceRefresh }
        );
    },

    async listarActividades(
        sessionToken: string,
        options?: { forceRefresh?: boolean; asignatura?: string }
    ): Promise<ActividadParaEvidencia[]> {
        const subKey = options?.asignatura ? canonicalAsignaturaKey(options.asignatura) : 'all';
        return fetchWithPortalCache<ActividadParaEvidencia[]>(
            sessionToken,
            'portafolio_actividades',
            subKey,
            async () => {
                const { data, error } = await supabase.rpc('portal_listar_actividades_para_evidencia', {
                    p_session_token: sessionToken,
                    p_asignatura: options?.asignatura || null,
                });
                if (error) throw error;
                const msg = mensajeDeError(data, 'No se pudieron cargar tus actividades');
                if (msg) throw new Error(msg);
                return desenrollar<ActividadParaEvidencia[]>(data, 'Respuesta vacia de actividades');
            },
            { forceRefresh: options?.forceRefresh }
        );
    },

    /** Procesa/comprime la imagen si corresponde, sube el archivo y registra la fila. */
    async crear(
        sessionToken: string,
        entrada: {
            actividadId: number;
            nombre: string;
            descripcion?: string | null;
            archivo: File;
            thumbnailUrl?: string | null;
            asignatura?: string | null;
        }
    ): Promise<{ id: number }> {
        const procesado = await procesarArchivoParaEvidencia(entrada.archivo);
        const archivoFinal = procesado.archivo;
        const thumbnailFinal = entrada.thumbnailUrl ?? procesado.thumbnailDataUrl ?? null;

        const extRaw = limpiarNombre(archivoFinal.name.split('.').pop() || 'bin').toLowerCase().replace(/[^a-z0-9]/g, '');
        const ext = (extRaw || 'bin').slice(0, 5);
        const path = `${crypto.randomUUID()}.${ext}`;

        const { error: uploadError } = await supabase.storage
            .from(EVIDENCIAS_BUCKET)
            .upload(path, archivoFinal, { upsert: false, contentType: archivoFinal.type || undefined });
        if (uploadError) throw new Error(`No se pudo subir el archivo: ${uploadError.message}`);

        const { data, error } = await supabase.rpc('portal_crear_evidencia', {
            p_session_token: sessionToken,
            p_actividad_id: entrada.actividadId,
            p_nombre: entrada.nombre.trim(),
            p_origen: 'storage',
            p_storage_path: path,
            p_mime_type: archivoFinal.type || null,
            p_tamano_bytes: archivoFinal.size || null,
            p_thumbnail_url: thumbnailFinal,
            p_descripcion: entrada.descripcion?.trim() || null,
            p_asignatura: entrada.asignatura || null,
        });
        if (error) {
            await supabase.storage.from(EVIDENCIAS_BUCKET).remove([path]);
            throw error;
        }
        const msg = mensajeDeError(data, 'No se pudo guardar la evidencia');
        if (msg) {
            // La fila fallo: el binario ya no tiene dueño y ocuparia el bucket.
            await supabase.storage.from(EVIDENCIAS_BUCKET).remove([path]);
            throw new Error(msg);
        }

        invalidatePortalPortafolioCache(sessionToken);
        return desenrollar<{ id: number }>(data, 'La evidencia se guardo sin identificador');
    },

    /**
     * Referencia un archivo que YA esta en el Drive del alumno.
     *
     * No se sube nada: el binario no pasa por Supabase. Se registra la
     * referencia y el `drive_carpeta_id` de la carpeta de la que salio, que la
     * RPC valida contra el session_token.
     */
    async crearDesdeDrive(
        sessionToken: string,
        entrada: {
            actividadId: number;
            nombre: string;
            descripcion?: string | null;
            driveFileId: string;
            driveUrl: string;
            mimeType: string | null;
            tamanoBytes: number | null;
            thumbnailUrl: string | null;
            driveCarpetaId: number | null;
            asignatura?: string | null;
        }
    ): Promise<{ id: number }> {
        const { data, error } = await supabase.rpc('portal_crear_evidencia', {
            p_session_token: sessionToken,
            p_actividad_id: entrada.actividadId,
            p_nombre: entrada.nombre.trim(),
            p_origen: 'drive',
            p_drive_file_id: entrada.driveFileId,
            p_drive_url: entrada.driveUrl,
            p_mime_type: entrada.mimeType,
            p_tamano_bytes: entrada.tamanoBytes,
            p_thumbnail_url: entrada.thumbnailUrl,
            p_descripcion: entrada.descripcion?.trim() || null,
            p_drive_carpeta_id: entrada.driveCarpetaId,
            p_asignatura: entrada.asignatura || null,
        });
        if (error) throw error;
        const msg = mensajeDeError(data, 'No se pudo guardar la evidencia');
        if (msg) throw new Error(msg);

        invalidatePortalPortafolioCache(sessionToken);
        return desenrollar<{ id: number }>(data, 'La evidencia se guardo sin identificador');
    },

    /** Retira la evidencia y, con ella, el archivo. Solo mientras siga pendiente. */
    async eliminar(sessionToken: string, evidenciaId: number): Promise<void> {
        const { data, error } = await supabase.rpc('portal_eliminar_evidencia', {
            p_session_token: sessionToken,
            p_evidencia_id: evidenciaId,
        });
        if (error) throw error;
        const msg = mensajeDeError(data, 'No se pudo retirar la evidencia');
        if (msg) throw new Error(msg);

        const path = (data as { storage_path?: string | null } | null)?.storage_path;
        if (path) {
            removeCachedSignedUrl(path);
            await supabase.storage.from(EVIDENCIAS_BUCKET).remove([path]);
        }

        invalidatePortalPortafolioCache(sessionToken);
    },
};

/* ═════════════════════════════════════════════════════════════════════════
   LADO DOCENTE — la bandeja global
   ═════════════════════════════════════════════════════════════════════════ */

export interface BandejaDocente {
    curso: {
        id: number;
        nombre: string | null;
        grado: string | null;
        seccion: string | null;
        periodo: string | null;
        asignatura: string | null;
    };
    grupos: GrupoBandeja[];
}

export const evidenciasApiDocente = {
    async cursos(): Promise<CursoConEvidencias[]> {
        const { data, error } = await supabase.rpc('docente_cursos_con_evidencias');
        if (error) throw error;
        const msg = mensajeDeError(data, 'No se pudieron cargar tus cursos');
        if (msg) throw new Error(msg);
        return desenrollar<CursoConEvidencias[]>(data, 'Respuesta vacia de cursos');
    },

    async bandeja(cursoId: number, asignatura: string | null, periodo: string | null): Promise<BandejaDocente> {
        const { data, error } = await supabase.rpc('docente_bandeja_evidencias', {
            p_curso_id: cursoId,
            p_asignatura: asignatura,
            p_periodo: periodo,
        });
        if (error) throw error;
        const msg = mensajeDeError(data, 'No se pudo cargar la bandeja');
        if (msg) throw new Error(msg);
        return desenrollar<BandejaDocente>(data, 'Respuesta vacia de la bandeja');
    },

    async revisar(evidenciaId: number, sello: number, comentario: string | null): Promise<void> {
        const { data, error } = await supabase.rpc('docente_revisar_evidencia', {
            p_evidencia_id: evidenciaId,
            p_sello: sello,
            p_comentario: comentario,
        });
        if (error) throw error;
        const msg = mensajeDeError(data, 'No se pudo guardar la revision');
        if (msg) throw new Error(msg);
    },
};

/* ═════════════════════════════════════════════════════════════════════════
   ARCHIVOS
   ═════════════════════════════════════════════════════════════════════════ */

export interface DescriptorEvidencia {
    clase: 'imagen' | 'video' | 'pdf' | 'documento' | 'audio' | 'otro';
    etiqueta: string;
    /** Icono lucide para cuando no hay miniatura real. */
    icono: 'imagen' | 'video' | 'pdf' | 'documento' | 'audio' | 'otro';
}

export function descriptorEvidencia(mime: string | null, nombre: string | null): DescriptorEvidencia {
    const m = (mime || '').toLowerCase();
    if (m.startsWith('image/')) return { clase: 'imagen', etiqueta: 'Imagen', icono: 'imagen' };
    if (m.startsWith('video/')) return { clase: 'video', etiqueta: 'Video', icono: 'video' };
    if (m === 'application/pdf' || (nombre || '').toLowerCase().endsWith('.pdf')) {
        return { clase: 'pdf', etiqueta: 'PDF', icono: 'pdf' };
    }
    if (m.startsWith('audio/')) return { clase: 'audio', etiqueta: 'Audio', icono: 'audio' };
    if (
        m.startsWith('text/') ||
        m.includes('document') ||
        m.includes('msword') ||
        m.includes('spreadsheet') ||
        m.includes('presentation') ||
        m === 'application/vnd.oasis.opendocument.text'
    ) {
        return { clase: 'documento', etiqueta: 'Documento', icono: 'documento' };
    }
    return { clase: 'otro', etiqueta: 'Archivo', icono: 'otro' };
}

export function urlDriveEvidencia(ev: { origen: string; drive_url: string | null }): string | null {
    return ev.origen === 'drive' && ev.drive_url ? ev.drive_url : null;
}

/**
 * Firma las rutas de CIELO Storage en UNA SOLA operación por lote (`createSignedUrls`)
 * y reutiliza enlaces firmados vigentes en caché para evitar solicitudes repetidas.
 */
export async function resolverUrls<
    T extends { id: number; origen: string; storage_path: string | null; drive_url: string | null }
>(evidencias: T[]): Promise<Map<number, string>> {
    const resultado = new Map<number, string>();
    const pathsToSign = new Set<string>();
    const pathToIds = new Map<string, number[]>();

    for (const ev of evidencias) {
        if (ev.origen === 'drive') {
            if (ev.drive_url) resultado.set(ev.id, ev.drive_url);
            continue;
        }
        if (!ev.storage_path) continue;

        const cachedUrl = getCachedSignedUrl(ev.storage_path);
        if (cachedUrl) {
            resultado.set(ev.id, cachedUrl);
            continue;
        }

        pathsToSign.add(ev.storage_path);
        const list = pathToIds.get(ev.storage_path) ?? [];
        list.push(ev.id);
        pathToIds.set(ev.storage_path, list);
    }

    const uniquePaths = Array.from(pathsToSign);
    if (uniquePaths.length > 0) {
        try {
            const { data, error } = await supabase.storage
                .from(EVIDENCIAS_BUCKET)
                .createSignedUrls(uniquePaths, 3600);

            if (!error && Array.isArray(data)) {
                for (const item of data) {
                    if (!item.error && item.path && item.signedUrl) {
                        setCachedSignedUrl(item.path, item.signedUrl);
                        const ids = pathToIds.get(item.path) ?? [];
                        for (const id of ids) {
                            resultado.set(id, item.signedUrl);
                        }
                    }
                }
            }
        } catch {
            // Un fallo de red al firmar no debe tumbar la pantalla del portafolio
        }
    }

    return resultado;
}

export function mensajeDeExcepcion(e: unknown, porDefecto: string): string {
    if (e && typeof e === 'object' && 'message' in e) {
        const msg = (e as { message?: unknown }).message;
        if (typeof msg === 'string' && msg.trim()) return msg;
    }
    return porDefecto;
}

export function tamanoLegible(bytes: number | null): string | null {
    if (!bytes || bytes <= 0) return null;
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
