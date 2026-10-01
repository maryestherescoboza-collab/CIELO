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
    ActividadExistente,
    ProgresoRuta,
    PuntajesDocente,
    PuntajesRuta,
    RespuestaRuta,
    ResumenRutaEstudiante,
    RutaDocente,
    RutaEstudiante,
    RutaResumen,
    TipoActividad,
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
        const err = mensajeDeError(data, 'No se pudo crear el item');
        if (err) throw new Error(err);
        return desenrollar<{ id: string }>(data, 'No se pudo crear el item');
    },

    async eliminarActividad(actividadId: string) {
        const { data, error } = await supabase.rpc('ruta_eliminar_actividad', {
            p_actividad_id: actividadId,
        });
        if (error) throw error;
        const err = mensajeDeError(data, 'No se pudo eliminar el item');
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
        const err = mensajeDeError(data, 'No se pudo guardar el item');
        if (err) throw new Error(err);
        return true;
    },

    /* ── Ponderación ── */

    /**
     * Guarda la ponderación completa de la ruta en una sola transaccion.
     *
     * El servidor valida que las etapas sumen 100 y que las actividades de
     * cada etapa sumen 100 ANTES de escribir nada. `faltan` viaja en el error
     * para que el constructor pueda decir cuántos puntos le faltan al docente
     * en vez de un "no se pudo guardar" sin explicación.
     */
    async actualizarPesos(
        rutaId: string,
        pesos: { etapas: { id?: string; peso: number; actividades: { id?: string; peso: number }[] }[] },
    ) {
        const { data, error } = await supabase.rpc('ruta_actualizar_pesos', {
            p_ruta_id: rutaId,
            p_pesos: pesos,
        });
        if (error) throw error;
        const err = mensajeDeError(data, 'No se pudieron guardar los porcentajes');
        if (err) throw new Error(err);
        return true;
    },

    /**
     * Reparte 100% en partes iguales. Sin `etapaId` reparte entre las etapas
     * de la ruta; con `etapaId`, entre las actividades de esa etapa.
     */
    async rebalancear(rutaId: string, etapaId?: string) {
        const { data, error } = await supabase.rpc('ruta_rebalancear_pesos', {
            p_ruta_id: rutaId,
            p_etapa_id: etapaId ?? null,
        });
        if (error) throw error;
        const err = mensajeDeError(data, 'No se pudo repartir el 100%');
        if (err) throw new Error(err);
        return true;
    },

    /* ── Reaprovechar actividades que ya existen en CIELO ── */

    /**
     * Catálogo de actividades de public.actividades que el docente puede
     * vincular. La RPC ya filtra por curso compartido y por autoría, así que
     * lo que llega aquí es solo lo que de verdad puede usar.
     */
    async actividadesExistentes(
        rutaId: string,
        opciones: { busqueda?: string; asignatura?: string } = {},
    ): Promise<ActividadExistente[]> {
        const { data, error } = await supabase.rpc('ruta_actividades_existentes', {
            p_ruta_id: rutaId,
            p_busqueda: opciones.busqueda?.trim() || null,
            p_asignatura: opciones.asignatura || null,
        });
        if (error) throw error;
        const err = mensajeDeError(data, 'No se pudieron cargar las actividades');
        if (err) throw new Error(err);
        return (data as ActividadExistente[]) ?? [];
    },

    /**
     * Vincula una actividad existente a una etapa SIN duplicarla: la ruta
     * apunta a la fila original y el puntaje acaba en calificaciones.
     *
     * `tipo` es el tipo de la RUTA, no el de CIELO: es lo que decide cómo se
     * corrige, con el mismo motor (ruta_evaluar_respuesta) que ya usa el
     * resto de actividades.
     */
    async vincularActividad(etapaId: string, actividadOrigenId: number, tipo: TipoActividad) {
        const { data, error } = await supabase.rpc('ruta_vincular_actividad', {
            p_etapa_id: etapaId,
            p_actividad_origen_id: actividadOrigenId,
            p_tipo: tipo,
        });
        if (error) throw error;
        const err = mensajeDeError(data, 'No se pudo calificar la actividad');
        if (err) throw new Error(err);
        return desenrollar<{ id: string; orden: number; titulo?: string }>(
            data,
            'No se pudo calificar la actividad',
        );
    },

    /** Cuaderno de notas ponderado de la ruta, por estudiante. */
    async puntajesDocente(rutaId: string): Promise<PuntajesDocente> {
        const { data, error } = await supabase.rpc('ruta_puntajes_docente', {
            p_ruta_id: rutaId,
        });
        if (error) throw error;
        const err = mensajeDeError(data, 'No se pudieron cargar los puntajes');
        if (err) throw new Error(err);
        return desenrollar<PuntajesDocente>(data, 'No se pudieron cargar los puntajes');
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

    /**
     * Puntaje ponderado del estudiante: por etapa, por actividad y total.
     * Es lo que la RPC proyecta ademas a calificaciones cuando la actividad
     * vino de CIELO.
     */
    async puntaje(sessionToken: string, rutaId: string): Promise<PuntajesRuta> {
        const { data, error } = await supabase.rpc('portal_ruta_puntaje', {
            p_session_token: sessionToken,
            p_ruta_id: rutaId,
        });
        if (error) throw error;
        const err = mensajeDeError(data, 'No se pudo cargar el puntaje');
        if (err) throw new Error(err);
        return desenrollar<PuntajesRuta>(data, 'No se pudo cargar el puntaje');
    },
};
