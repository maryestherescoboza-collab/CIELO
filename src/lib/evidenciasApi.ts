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
import type {
    ActividadParaEvidencia,
    CursoConEvidencias,
    EvidenciaPortafolio,
    GrupoBandeja,
} from '../types/evidencias';

export const EVIDENCIAS_BUCKET = 'evidencias';

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
   LADO PORTAL — el estudiante y su Portafolio
   ═════════════════════════════════════════════════════════════════════════ */

export const evidenciasApiPortal = {
    async listar(sessionToken: string): Promise<EvidenciaPortafolio[]> {
        const { data, error } = await supabase.rpc('portal_listar_evidencias', {
            p_session_token: sessionToken,
        });
        if (error) throw error;
        const msg = mensajeDeError(data, 'No se pudieron cargar tus evidencias');
        if (msg) throw new Error(msg);
        return desenrollar<EvidenciaPortafolio[]>(data, 'Respuesta vacia del portafolio');
    },

    async listarActividades(sessionToken: string): Promise<ActividadParaEvidencia[]> {
        const { data, error } = await supabase.rpc('portal_listar_actividades_para_evidencia', {
            p_session_token: sessionToken,
        });
        if (error) throw error;
        const msg = mensajeDeError(data, 'No se pudieron cargar tus actividades');
        if (msg) throw new Error(msg);
        return desenrollar<ActividadParaEvidencia[]>(data, 'Respuesta vacia de actividades');
    },

    /** Sube el archivo primero y registra la fila despues. */
    async crear(
        sessionToken: string,
        entrada: {
            actividadId: number;
            nombre: string;
            descripcion?: string | null;
            archivo: File;
        }
    ): Promise<{ id: number }> {
        const path = `${crypto.randomUUID()}.${limpiarNombre(entrada.archivo.name.split('.').pop() || 'bin')}`;

        const { error: uploadError } = await supabase.storage
            .from(EVIDENCIAS_BUCKET)
            .upload(path, entrada.archivo, { upsert: false, contentType: entrada.archivo.type || undefined });
        if (uploadError) throw new Error(`No se pudo subir el archivo: ${uploadError.message}`);

        const { data, error } = await supabase.rpc('portal_crear_evidencia', {
            p_session_token: sessionToken,
            p_actividad_id: entrada.actividadId,
            p_nombre: entrada.nombre.trim(),
            p_origen: 'storage',
            p_storage_path: path,
            p_mime_type: entrada.archivo.type || null,
            p_tamano_bytes: entrada.archivo.size || null,
            p_descripcion: entrada.descripcion?.trim() || null,
        });
        if (error) throw error;
        const msg = mensajeDeError(data, 'No se pudo guardar la evidencia');
        if (msg) {
            // La fila fallo: el binario ya no tiene dueño y ocuparia el bucket.
            await supabase.storage.from(EVIDENCIAS_BUCKET).remove([path]);
            throw new Error(msg);
        }
        return desenrollar<{ id: number }>(data, 'La evidencia se guardo sin identificador');
    },

    /**
     * Referencia un archivo que YA esta en el Drive del alumno.
     *
     * No se sube nada: el binario no pasa por Supabase. Se registra la
     * referencia y el `drive_carpeta_id` de la carpeta de la que salio, que la
     * RPC valida contra el session_token.
     *
     * `drive_file_id` y `drive_url` los entrega la API de Google con el token del
     * propio alumno. La `thumbnail_url` que devuelve Drive es un enlace con
     * credencial que caduca en unas horas, asi que se guarda como dato de
     * referencia y la UI la refresca contra la API cuando puede; no se usa como
     * unica fuente de verdad.
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
        });
        if (error) throw error;
        const msg = mensajeDeError(data, 'No se pudo guardar la evidencia');
        if (msg) throw new Error(msg);
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
            await supabase.storage.from(EVIDENCIAS_BUCKET).remove([path]);
        }
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

/**
 * Que se puede previsualizar sin dependencias.
 *
 * No se mete pdf.js ni un visor externo: la app no tiene esas librerias y
 * anadirlas por esto seria una migracion de peso. El PDF se abre con "Abrir
 * archivo" y su miniatura es el icono, que es justo el comportamiento que
 * espera un docente revisando 20 entregas en fila.
 */
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

/**
 * URL de una evidencia de Google Drive.
 *
 * Las de Drive son enlaces del propio Drive y se usan tal cual. Las de CIELO
 * Storage SIEMPRE pasan por `resolverUrls` de abajo: el bucket es privado, asi
 * que una URL publica no resolveria nada.
 */
export function urlDriveEvidencia(ev: { origen: string; drive_url: string | null }): string | null {
    return ev.origen === 'drive' && ev.drive_url ? ev.drive_url : null;
}

/**
 * Firma las rutas de CIELO Storage y devuelve `idEvidencia -> url`.
 *
 * El bucket es privado y el Portal no tiene JWT, asi que no hay URL publica: la
 * unica via es una signed URL de corta duracion, que la politica SELECT del
 * bucket permite porque la ruta con uuid es la credencial. Se firman todas en
 * una sola pasada para no lanzar una peticion por miniatura.
 *
 * Un fallo aqui no debe tumbar la pantalla: la evidencia se sigue listando con
 * su icono y "Abrir archivo" sigue funcionando con la ruta cruda.
 */
export async function resolverUrls<T extends { id: number; origen: string; storage_path: string | null; drive_url: string | null }>(
    evidencias: T[]
): Promise<Map<number, string>> {
    const resultado = new Map<number, string>();

    await Promise.all(
        evidencias.map(async (ev) => {
            if (ev.origen === 'drive') {
                if (ev.drive_url) resultado.set(ev.id, ev.drive_url);
                return;
            }
            if (!ev.storage_path) return;
            const { data, error } = await supabase.storage
                .from(EVIDENCIAS_BUCKET)
                .createSignedUrl(ev.storage_path, 300);
            if (!error && data?.signedUrl) resultado.set(ev.id, data.signedUrl);
        })
    );

    return resultado;
}

/**
 * Mensaje de una excepcion, sin `any`.
 *
 * Los `catch` de las pantallas necesitan el texto del fallo para pintar un aviso
 * legible, y repiten el mismo `err?.message || '...'` en cinco sitios. Aqui se
 * centraliza y se estrecha a `unknown`, que es lo que TypeScript infiere en un
 * catch y lo que evita el `@typescript-eslint/no-explicit-any`.
 */
export function mensajeDeExcepcion(e: unknown, porDefecto: string): string {
    if (e && typeof e === 'object' && 'message' in e) {
        const msg = (e as { message?: unknown }).message;
        if (typeof msg === 'string' && msg.trim()) return msg;
    }
    return porDefecto;
}

/** Tamano legible para la ficha de la evidencia. */
export function tamanoLegible(bytes: number | null): string | null {
    if (!bytes || bytes <= 0) return null;
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
