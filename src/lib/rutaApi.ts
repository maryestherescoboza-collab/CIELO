/**
 * Cliente RPC de Rutas de aprendizaje.
 *
 * Dos superficies separadas a proposito, porque tienen identidades distintas:
 *
 *  - `rutaApiDocente`: habla con un usuario autenticado (auth.users). La
 *    identidad sale del JWT; el cliente nunca la envia. Las RPC verifican que
 *    el usuario es dueno de la ficha.
 *  - `rutaApiPortal`: habla con un token de sesion de `portal_sesiones`. El
 *    estudiante no tiene cuenta de Supabase, por eso viaja `p_session_token`.
 *
 * Ninguna devuelve respuestas correctas al Portal: eso lo decide la RPC.
 */

import { supabase } from './supabase';
import type {
    ActividadDocente,
    ProgresoRuta,
    RespuestaRuta,
    ResumenRutaEstudiante,
    RutaDocente,
    RutaEstudiante,
    RutaResumen,
    VeredictoIntento,
} from '../types/rutas';

/** Toda RPC devuelve JSONB y reporta el fallo en la propia respuesta. */
function desenrollar<T>(data: unknown, fallback: string): T {
    // Un payload vacio NO es una respuesta valida. Antes se devolvia
    // `{ error: fallback }` disfrazado de `T`, y la pantalla recibia un objeto
    // sin `etapas`: el `.find` siguiente reventaba con un TypeError en vez de
    // mostrar un estado de error.
    if (!data) throw new Error(fallback || 'El servidor devolvió una respuesta vacía.');
    return data as T;
}

function mensajeDeError(data: unknown, fallback: string): string | null {
    if (data && typeof data === 'object' && 'error' in (data as Record<string, unknown>)) {
        const e = (data as Record<string, unknown>).error;
        // Un `error: ''` tambien es un fallo: si se devolvia tal cual, el
        // `if (err) throw` de abajo no disparaba y la pantalla seguia en blanco.
        if (typeof e === 'string' && e.trim()) return e;
        if (e != null && typeof e === 'object') {
            const msg = (e as Record<string, unknown>).message;
            if (typeof msg === 'string' && msg.trim()) return msg;
        }
        return fallback;
    }
    return null;
}

/* ═════════════════════════════════════════════════════════════════════════
   LADO DOCENTE
   ═════════════════════════════════════════════════════════════════════════ */

export const rutaApiDocente = {
    async crear(notaId: string, titulo: string, descripcion?: string) {
        const { data, error } = await supabase.rpc('ruta_crear', {
            p_nota_id: notaId,
            p_titulo: titulo,
            p_descripcion: descripcion ?? null,
        });
        if (error) throw error;
        const err = mensajeDeError(data, 'No se pudo crear la ruta');
        if (err) throw new Error(err);
        return desenrollar<{ id: string }>(data, 'No se pudo crear la ruta');
    },

    async listar(notaId: string): Promise<RutaResumen[]> {
        const { data, error } = await supabase.rpc('ruta_listar_por_ficha', {
            p_nota_id: notaId,
        });
        if (error) throw error;
        const err = mensajeDeError(data, 'No se pudieron cargar las rutas');
        if (err) throw new Error(err);
        return (data as RutaResumen[]) ?? [];
    },

    async obtener(rutaId: string): Promise<RutaDocente> {
        const { data, error } = await supabase.rpc('ruta_obtener', { p_ruta_id: rutaId });
        if (error) throw error;
        const err = mensajeDeError(data, 'No se pudo cargar la ruta');
        if (err) throw new Error(err);
        return desenrollar<RutaDocente>(data, 'No se pudo cargar la ruta');
    },

    async actualizar(
        rutaId: string,
        cambios: {
            titulo?: string;
            descripcion?: string;
            estado?: 'borrador' | 'publicada' | 'archivada';
            reglaDesbloqueo?: object;
        },
    ) {
        const { data, error } = await supabase.rpc('ruta_actualizar', {
            p_ruta_id: rutaId,
            p_titulo: cambios.titulo ?? null,
            p_descripcion: cambios.descripcion ?? null,
            p_estado: cambios.estado ?? null,
            p_regla_desbloqueo: cambios.reglaDesbloqueo ?? null,
        });
        if (error) throw error;
        const err = mensajeDeError(data, 'No se pudo actualizar la ruta');
        if (err) throw new Error(err);
        return true;
    },

    async eliminar(rutaId: string) {
        const { data, error } = await supabase.rpc('ruta_eliminar', { p_ruta_id: rutaId });
        if (error) throw error;
        const err = mensajeDeError(data, 'No se pudo eliminar la ruta');
        if (err) throw new Error(err);
        return true;
    },

    /* ── Etapas ── */
    async crearEtapa(rutaId: string, titulo: string, descripcion?: string, orden?: number) {
        const { data, error } = await supabase.rpc('ruta_crear_etapa', {
            p_ruta_id: rutaId,
            p_titulo: titulo,
            p_descripcion: descripcion ?? null,
            p_orden: orden ?? null,
        });
        if (error) throw error;
        const err = mensajeDeError(data, 'No se pudo crear la etapa');
        if (err) throw new Error(err);
        return desenrollar<{ id: string }>(data, 'No se pudo crear la etapa');
    },

    async actualizarEtapa(etapaId: string, titulo?: string, descripcion?: string) {
        const { data, error } = await supabase.rpc('ruta_actualizar_etapa', {
            p_etapa_id: etapaId,
            p_titulo: titulo ?? null,
            p_descripcion: descripcion ?? null,
        });
        if (error) throw error;
        const err = mensajeDeError(data, 'No se pudo actualizar la etapa');
        if (err) throw new Error(err);
        return true;
    },

    async eliminarEtapa(etapaId: string) {
        const { data, error } = await supabase.rpc('ruta_eliminar_etapa', { p_etapa_id: etapaId });
        if (error) throw error;
        const err = mensajeDeError(data, 'No se pudo eliminar la etapa');
        if (err) throw new Error(err);
        return true;
    },

    async reordenarEtapas(rutaId: string, etapaIds: string[]) {
        const { data, error } = await supabase.rpc('ruta_reordenar_etapas', {
            p_ruta_id: rutaId,
            p_etapa_ids: etapaIds,
        });
        if (error) throw error;
        const err = mensajeDeError(data, 'No se pudo reordenar');
        if (err) throw new Error(err);
        return true;
    },

    /* ── Actividades ── */
    async crearActividad(
        etapaId: string,
        tipo: string,
        datos: { titulo?: string; instrucciones?: string; config?: object; obligatorio?: boolean } = {},
    ) {
        const { data, error } = await supabase.rpc('ruta_crear_actividad', {
            p_etapa_id: etapaId,
            p_tipo: tipo,
            p_titulo: datos.titulo ?? null,
            p_instrucciones: datos.instrucciones ?? null,
            p_orden: null,
            p_config: datos.config ?? {},
            p_obligatorio: datos.obligatorio ?? true,
        });
        if (error) throw error;
        const err = mensajeDeError(data, 'No se pudo crear la actividad');
        if (err) throw new Error(err);
        return desenrollar<{ id: string }>(data, 'No se pudo crear la actividad');
    },

    async eliminarActividad(actividadId: string) {
        const { data, error } = await supabase.rpc('ruta_eliminar_actividad', {
            p_actividad_id: actividadId,
        });
        if (error) throw error;
        const err = mensajeDeError(data, 'No se pudo eliminar la actividad');
        if (err) throw new Error(err);
        return true;
    },

    async reordenarActividades(etapaId: string, actividadIds: string[]) {
        const { data, error } = await supabase.rpc('ruta_reordenar_actividades', {
            p_etapa_id: etapaId,
            p_actividad_ids: actividadIds,
        });
        if (error) throw error;
        const err = mensajeDeError(data, 'No se pudo reordenar');
        if (err) throw new Error(err);
        return true;
    },

    /**
     * Guarda el contenido completo de una actividad (preguntas + opciones) en
     * una sola transaccion. La RPC conserva los intentos de las preguntas que
     * siguen en la misma posicion.
     */
    async guardarActividad(actividadId: string, actividad: ActividadDocente) {
        const { data, error } = await supabase.rpc('ruta_guardar_actividad', {
            p_actividad_id: actividadId,
            p_datos: {
                titulo: actividad.titulo ?? null,
                instrucciones: actividad.instrucciones ?? null,
                config: actividad.config ?? {},
                obligatorio: actividad.obligatorio,
                preguntas: (actividad.preguntas ?? []).map((p, i) => ({
                    orden: p.orden ?? i + 1,
                    enunciado: p.enunciado,
                    tipoRespuesta: p.tipo_respuesta,
                    config: p.config ?? {},
                    respuestasAceptadas: p.config?.respuestasAceptadas ?? [],
                    pista: p.pista ?? null,
                    retroalimentacionOk: p.retroalimentacion_ok ?? null,
                    retroalimentacionError: p.retroalimentacion_error ?? null,
                    peso: p.peso ?? 1,
                    opciones: (p.opciones ?? []).map((o, j) => ({
                        texto: o.texto,
                        orden: o.orden ?? j + 1,
                        esCorrecta: o.es_correcta,
                        clave: o.clave ?? null,
                        valor: o.valor ?? null,
                    })),
                })),
            },
        });
        if (error) throw error;
        const err = mensajeDeError(data, 'No se pudo guardar la actividad');
        if (err) throw new Error(err);
        return true;
    },
};

/* ═════════════════════════════════════════════════════════════════════════
   LADO PORTAL (estudiante)
   ═════════════════════════════════════════════════════════════════════════ */

export const rutaApiPortal = {
    async listar(sessionToken: string, notaId: string): Promise<ResumenRutaEstudiante[]> {
        const { data, error } = await supabase.rpc('portal_ruta_listar', {
            p_session_token: sessionToken,
            p_nota_id: notaId,
        });
        if (error) throw error;
        const err = mensajeDeError(data, 'No se pudieron cargar las rutas');
        if (err) throw new Error(err);
        return (data as ResumenRutaEstudiante[]) ?? [];
    },

    async obtener(sessionToken: string, rutaId: string): Promise<RutaEstudiante> {
        const { data, error } = await supabase.rpc('portal_ruta_obtener', {
            p_session_token: sessionToken,
            p_ruta_id: rutaId,
        });
        if (error) throw error;
        const err = mensajeDeError(data, 'No se pudo cargar la ruta');
        if (err) throw new Error(err);
        return desenrollar<RutaEstudiante>(data, 'No se pudo cargar esta ruta de aprendizaje.');
    },

    /**
     * Registra un intento. El veredicto lo decide el servidor: esta funcion
     * nunca recibe ni devuelve la respuesta correcta.
     */
    async registrarIntento(
        sessionToken: string,
        preguntaId: string,
        respuesta: RespuestaRuta,
        duracionSegundos?: number,
    ): Promise<VeredictoIntento> {
        const { data, error } = await supabase.rpc('portal_ruta_registrar_intento', {
            p_session_token: sessionToken,
            p_pregunta_id: preguntaId,
            p_respuesta: respuesta,
            p_duracion_segundos: duracionSegundos ?? null,
        });
        if (error) throw error;
        return desenrollar<VeredictoIntento>(data, 'No se pudo registrar el intento');
    },

    async progreso(sessionToken: string, rutaId: string): Promise<ProgresoRuta> {
        const { data, error } = await supabase.rpc('portal_ruta_progreso', {
            p_session_token: sessionToken,
            p_ruta_id: rutaId,
        });
        if (error) throw error;
        const err = mensajeDeError(data, 'No se pudo cargar el progreso');
        if (err) throw new Error(err);
        return desenrollar<ProgresoRuta>(data, 'No se pudo cargar el progreso');
    },
};
