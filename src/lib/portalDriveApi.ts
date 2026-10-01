import { supabase } from './supabase';

/* ═════════════════════════════════════════════════════════════════════════
   GOOGLE DRIVE DESDE EL PORTAL DEL ESTUDIANTE
   ═════════════════════════════════════════════════════════════════════════
   Lo que hay en este archivo son llamadas a Supabase: la estructura de carpetas
   y el indice de archivos. Las llamadas a Google van en `googleDrive.ts`, que ya
   tenia el cliente OAuth y la API: aqui no se reimplementa nada de Google, solo
   se leen y se guardan los ids que devuelve.

   Que NO aparece en este archivo, y no por descuido:
   · Ningun token. Ni access, ni refresh, ni "guardar la sesion". El token vive
     en la memoria de `googleDrive.ts` y se pierde al recargar. No hay columna
     donde guardarlo ni funcion para escribirlo.
   · Ninguna subida. El binario del alumno no pasa por aqui: Drive lo tiene y
     Supabase solo guarda la referencia.
   ═════════════════════════════════════════════════════════════════════════ */

export interface CarpetaDrive {
    id: number;
    asignatura: string;
    asignatura_nombre: string;
    drive_folder_id: string;
    creado_en_drive: boolean;
    archivos: number;
}

export interface EstadoDrive {
    conectado: boolean;
    email: string | null;
    cielo_root_id: string | null;
    conectado_en?: string | null;
    carpetas: CarpetaDrive[];
}

/** Las RPC del Portal devuelven {error} en vez de lanzar; se normaliza aqui. */
async function rpc<T>(fn: string, args: Record<string, unknown>): Promise<T> {
    const { data, error } = await supabase.rpc(fn, args);
    if (error) throw new Error(error.message);
    if (data && typeof data === 'object' && 'error' in (data as Record<string, unknown>)) {
        throw new Error(String((data as Record<string, unknown>).error));
    }
    if (data === null || data === undefined) {
        throw new Error('Respuesta vacía del servidor');
    }
    return data as T;
}

export async function obtenerEstadoDrive(sessionToken: string): Promise<EstadoDrive> {
    // Sin defaults: `portal_drive_estado` devuelve la forma COMPLETA en los dos
    // casos (con y sin conexion), asi que rellenarla aqui solo taparia un fallo.
    return rpc<EstadoDrive>('portal_drive_estado', { p_session_token: sessionToken });
}

/**
 * Registrar que Drive quedo conectado. `cieloRootId` es null en el primer clic:
 * conectar NO crea la carpeta CIELO, y el parametro existe para que el cliente
 * pueda reanudar una raiz ya conocida sin tener que volver a buscarla.
 */
export async function registrarConexionDrive(
    sessionToken: string,
    email: string,
    cieloRootId: string | null,
): Promise<void> {
    await rpc('portal_drive_registrar_conexion', {
        p_session_token: sessionToken,
        p_email: email,
        p_cielo_root_id: cieloRootId,
    });
}

export async function registrarRaizDrive(sessionToken: string, cieloRootId: string): Promise<void> {
    await rpc('portal_drive_registrar_raiz', {
        p_session_token: sessionToken,
        p_cielo_root_id: cieloRootId,
    });
}

/** Enlaza (o re-enlaza) la carpeta de una asignatura con su id real de Drive. */
export async function registrarCarpetaDrive(
    sessionToken: string,
    asignatura: string,
    asignaturaNombre: string,
    driveFolderId: string,
    creadoEnDrive: boolean,
): Promise<void> {
    await rpc('portal_drive_registrar_carpeta', {
        p_session_token: sessionToken,
        p_asignatura: asignatura,
        p_asignatura_nombre: asignaturaNombre,
        p_drive_folder_id: driveFolderId,
        p_creado_en_drive: creadoEnDrive,
    });
}

/** Suelta la referencia del Portal. No toca Drive: el archivo es del alumno. */
export async function desconectarDrive(sessionToken: string): Promise<void> {
    await rpc('portal_drive_desconectar', { p_session_token: sessionToken });
}

export function buscarCarpeta(estado: EstadoDrive, asignatura: string): CarpetaDrive | undefined {
    return estado.carpetas.find(c => c.asignatura === asignatura);
}
