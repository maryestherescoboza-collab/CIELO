/**
 * Constructor de Rutas de aprendizaje (lado docente).
 *
 * Se abre desde la Ficha. Cumle el requisito de "interfaz sencilla": tres
 * niveles (ruta → etapas → actividades) y un formulario por pregunta. No es un
 * constructor de arrastrar-y-soltar sophistication; es una lista ordenada con
 * formularios, que es lo que hace mantenible la v1.
 *
 * Todo se guarda contra RPC que exigen ser dueño de la ficha, así que no hace
 * falta pasar el usuario ni comprobar permisos en el cliente.
 */

import { useCallback, useEffect, useState } from 'react';
import {
    X,
    Plus,
    Trash2,
    ChevronUp,
    ChevronDown,
    Loader2,
    Check,
    Send,
    Save,
    Route as RouteIcon,
    CircleAlert,
} from 'lucide-react';

import type {
    ActividadDocente,
    EtapaDocente,
    PasoProcedimiento,
    PreguntaDocente,
    PreguntaConfig,
    RutaResumen,
    TipoActividad,
    TipoRespuesta,
} from '../../../types/rutas';
import {
    ETIQUETA_TIPO_ACTIVIDAD,
    TIPOS_ACTIVIDAD_V1,
    esTipoActividadV1,
} from '../../../types/rutas';
import { rutaApiDocente } from '../../../lib/rutaApi';
import { validarPregunta, validarRuta } from '../../../lib/rutaValidacion';
import { EditorPasos } from './EditorPasos';

/* ─────────────────────────────────────────────────────────────────────────
   Ayudas locales
   ───────────────────────────────────────────────────────────────────────── */

const TIPOS_RESPUESTA_POR_ACTIVIDAD: Record<TipoActividad, TipoRespuesta[]> = {
    opcion_multiple: ['textual'],
    verdadero_falso: ['booleana'],
    completar: ['textual', 'numerica'],
    respuesta_numerica: ['numerica', 'expresion'],
    respuesta_escrita: ['textual'],
    ordenar_pasos: ['ordenada'],
    relacionar: ['ordenada'],
    procedimiento_matematico: ['numerica', 'expresion', 'textual'],
};

function actividadVacia(tipo: TipoActividad): ActividadDocente {
    const base: ActividadDocente = {
        tipo,
        titulo: '',
        instrucciones: '',
        orden: 0,
        config: { datos: [] },
        obligatorio: true,
        preguntas: [preguntaVacia(TIPOS_RESPUESTA_POR_ACTIVIDAD[tipo][0], tipo)],
    };
    if (tipo === 'verdadero_falso') {
        base.preguntas[0].opciones = [
            { texto: 'Verdadero', orden: 1, es_correcta: true },
            { texto: 'Falso', orden: 2, es_correcta: false },
        ];
    }
    return base;
}

function preguntaVacia(tipo: TipoRespuesta, actividad: TipoActividad): PreguntaDocente {
    return {
        orden: 1,
        enunciado: '',
        tipo_respuesta: tipo,
        config:
            actividad === 'procedimiento_matematico'
                ? { pasos: [{ texto: '', espacios: [{ respuesta: '' }] }] }
                : {},
        pista: '',
        retroalimentacion_ok: '',
        retroalimentacion_error: '',
        peso: 1,
        opciones: [],
    };
}

/* ─────────────────────────────────────────────────────────────────────────
   Panel principal
   ───────────────────────────────────────────────────────────────────────── */

interface ConstructorRutaProps {
    notaId: string;
    onCerrar: () => void;
}

export default function ConstructorRuta({ notaId, onCerrar }: ConstructorRutaProps) {
    const [rutaId, setRutaId] = useState<string | null>(null);
    const [titulo, setTitulo] = useState('');
    const [descripcion, setDescripcion] = useState('');
    const [estado, setEstado] = useState<'borrador' | 'publicada' | 'archivada'>('borrador');
    const [etapas, setEtapas] = useState<EtapaDocente[]>([]);
    const [disponibles, setDisponibles] = useState<RutaResumen[]>([]);

    const [cargando, setCargando] = useState(true);
    const [guardando, setGuardando] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [aviso, setAviso] = useState<string | null>(null);

    const [etapaAbierta, setEtapaAbierta] = useState<string | null>(null);
    const [actividadAbierta, setActividadAbierta] = useState<string | null>(null);

    /* ── Carga: la ficha puede tener varias rutas, no solo una ── */
    useEffect(() => {
        let vigente = true;
        (async () => {
            try {
                const rutas = await rutaApiDocente.listar(notaId);
                if (!vigente) return;
                setDisponibles(rutas);

                if (rutas.length > 0) {
                    // Se abre la primera: el caso comun es seguir editando.
                    const completa = await rutaApiDocente.obtener(rutas[0].id);
                    if (!vigente) return;
                    setRutaId(completa.id);
                    setTitulo(completa.titulo);
                    setDescripcion(completa.descripcion ?? '');
                    setEstado(completa.estado);
                    setEtapas(completa.etapas ?? []);
                }
            } catch (e) {
                if (vigente) setError(e instanceof Error ? e.message : 'No se pudo cargar');
            } finally {
                if (vigente) setCargando(false);
            }
        })();
        return () => {
            vigente = false;
        };
    }, [notaId]);

    const abrirRuta = async (id: string) => {
        setGuardando(true);
        setError(null);
        try {
            const completa = await rutaApiDocente.obtener(id);
            setRutaId(completa.id);
            setTitulo(completa.titulo);
            setDescripcion(completa.descripcion ?? '');
            setEstado(completa.estado);
            setEtapas(completa.etapas ?? []);
            setEtapaAbierta(null);
            setActividadAbierta(null);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'No se pudo abrir la ruta');
        } finally {
            setGuardando(false);
        }
    };

    /** Empezar una ruta en blanco sin tocar la que se está editando. */
    const empezarNueva = () => {
        setRutaId(null);
        setTitulo('');
        setDescripcion('');
        setEstado('borrador');
        setEtapas([]);
        setEtapaAbierta(null);
        setActividadAbierta(null);
        setError(null);
    };

    const eliminarRutaActual = async () => {
        if (!rutaId) return;
        if (!window.confirm('¿Eliminar esta ruta, sus etapas y el progreso registrado?')) return;
        try {
            await rutaApiDocente.eliminar(rutaId);
            const resto = disponibles.filter((r) => r.id !== rutaId);
            setDisponibles(resto);
            if (resto.length > 0) await abrirRuta(resto[0].id);
            else empezarNueva();
        } catch (e) {
            setError(e instanceof Error ? e.message : 'No se pudo eliminar la ruta');
        }
    };

    const hayCambiosSinGuardar = useCallback(
        () => !rutaId && (titulo.trim() !== '' || etapas.length > 0),
        [rutaId, titulo, etapas],
    );

    const refrescarLista = useCallback(async () => {
        try {
            setDisponibles(await rutaApiDocente.listar(notaId));
        } catch {
            /* el selector de rutas es secundario: no interrumpe la edicion */
        }
    }, [notaId]);

    const crearRutaSiHaceFalta = useCallback(async (): Promise<string> => {
        if (rutaId) return rutaId;
        const creada = await rutaApiDocente.crear(notaId, titulo.trim() || 'Nueva ruta', descripcion);
        setRutaId(creada.id);
        setDisponibles((prev) =>
            prev.some((r) => r.id === creada.id)
                ? prev
                : [
                      {
                          id: creada.id,
                          titulo: titulo.trim() || 'Nueva ruta',
                          estado: 'borrador',
                          descripcion,
                          actualizado_en: new Date().toISOString(),
                          total_etapas: 0,
                          total_actividades: 0,
                      },
                      ...prev,
                  ],
        );
        return creada.id;
    }, [rutaId, notaId, titulo, descripcion]);

    /* ── Guardado ── */
    const guardar = useCallback(async () => {
        setGuardando(true);
        setError(null);
        setAviso(null);
        try {
            const id = await crearRutaSiHaceFalta();
            await rutaApiDocente.actualizar(id, {
                titulo: titulo.trim(),
                descripcion,
                estado,
            });
            setAviso('Guardado');
            setTimeout(() => setAviso(null), 1800);
            await refrescarLista();
        } catch (e) {
            setError(e instanceof Error ? e.message : 'No se pudo guardar');
        } finally {
            setGuardando(false);
        }
    }, [crearRutaSiHaceFalta, titulo, descripcion, estado, refrescarLista]);

    /* ── Etapas ── */
    const agregarEtapa = async () => {
        setError(null);
        try {
            const id = await crearRutaSiHaceFalta();
            const creada = await rutaApiDocente.crearEtapa(id, `Etapa ${etapas.length + 1}`);
            setEtapas((prev) => [
                ...prev,
                { id: creada.id, titulo: `Etapa ${prev.length + 1}`, descripcion: '', orden: prev.length, actividades: [] },
            ]);
            setEtapaAbierta(creada.id);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'No se pudo crear la etapa');
        }
    };

    const actualizarEtapaLocal = (etapaId: string, cambios: Partial<EtapaDocente>) => {
        setEtapas((prev) => prev.map((e) => (e.id === etapaId ? { ...e, ...cambios } : e)));
    };

    const eliminarEtapa = async (etapaId: string) => {
        if (!window.confirm('¿Eliminar esta etapa y sus actividades? Se perderá el progreso registrado.')) return;
        try {
            await rutaApiDocente.eliminarEtapa(etapaId);
            setEtapas((prev) => prev.filter((e) => e.id !== etapaId));
        } catch (e) {
            setError(e instanceof Error ? e.message : 'No se pudo eliminar');
        }
    };

    const moverEtapa = async (indice: number, delta: number) => {
        const destino = indice + delta;
        if (destino < 0 || destino >= etapas.length) return;
        const nuevos = [...etapas];
        [nuevos[indice], nuevos[destino]] = [nuevos[destino], nuevos[indice]];
        setEtapas(nuevos);
        try {
            if (rutaId) {
                await rutaApiDocente.reordenarEtapas(rutaId, nuevos.map((e) => e.id!));
            }
        } catch (e) {
            setError(e instanceof Error ? e.message : 'No se pudo reordenar');
        }
    };

    /* ── Actividades ── */
    const agregarActividad = async (etapaId: string, tipo: TipoActividad) => {
        if (!esTipoActividadV1(tipo)) return;
        setError(null);
        try {
            const creada = await rutaApiDocente.crearActividad(etapaId, tipo, { config: { datos: [] } });
            setEtapas((prev) =>
                prev.map((e) =>
                    e.id === etapaId
                        ? {
                              ...e,
                              actividades: [
                                  ...e.actividades,
                                  { ...actividadVacia(tipo), id: creada.id, orden: e.actividades.length },
                              ],
                          }
                        : e,
                ),
            );
            setEtapaAbierta(etapaId);
            setActividadAbierta(creada.id);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'No se pudo crear la actividad');
        }
    };

    const actualizarActividadLocal = (etapaId: string, actividadId: string, cambios: Partial<ActividadDocente>) => {
        setEtapas((prev) =>
            prev.map((e) =>
                e.id === etapaId
                    ? {
                          ...e,
                          actividades: e.actividades.map((a) =>
                              a.id === actividadId ? { ...a, ...cambios } : a,
                          ),
                      }
                    : e,
            ),
        );
    };

    const eliminarActividad = async (etapaId: string, actividadId: string) => {
        try {
            await rutaApiDocente.eliminarActividad(actividadId);
            setEtapas((prev) =>
                prev.map((e) =>
                    e.id === etapaId
                        ? { ...e, actividades: e.actividades.filter((a) => a.id !== actividadId) }
                        : e,
                ),
            );
        } catch (e) {
            setError(e instanceof Error ? e.message : 'No se pudo eliminar');
        }
    };

    const guardarActividad = async (actividad: ActividadDocente) => {
        if (!actividad.id) return;
        setGuardando(true);
        setError(null);
        try {
            await rutaApiDocente.guardarActividad(actividad.id, actividad);
            setAviso('Actividad guardada');
            setTimeout(() => setAviso(null), 1800);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'No se pudo guardar la actividad');
        } finally {
            setGuardando(false);
        }
    };

    /* ── Publicar / despublicar ── */
    const despublicar = async () => {
        if (!rutaId) return;
        setGuardando(true);
        try {
            await rutaApiDocente.actualizar(rutaId, { estado: 'borrador' });
            setEstado('borrador');
            await refrescarLista();
        } catch (e) {
            setError(e instanceof Error ? e.message : 'No se pudo cambiar el estado');
        } finally {
            setGuardando(false);
        }
    };

    const totalActividades = etapas.reduce((n, e) => n + e.actividades.length, 0);

    /**
     * Publicar es el punto de no retorno: despues el estudiante ve el
     * contenido. Por eso se revisa la ruta entera y se bloquea si hay errores.
     */
    const problemas = validarRuta(etapas);
    const errores = problemas.filter((p) => p.nivel === 'error');

    const publicar = async () => {
        if (errores.length > 0) {
            setError('Corrige los errores antes de publicar.');
            return;
        }
        setGuardando(true);
        setError(null);
        try {
            const id = await crearRutaSiHaceFalta();
            await rutaApiDocente.actualizar(id, { titulo: titulo.trim(), descripcion, estado: 'publicada' });
            setEstado('publicada');
            await refrescarLista();
        } catch (e) {
            setError(e instanceof Error ? e.message : 'No se pudo publicar');
        } finally {
            setGuardando(false);
        }
    };

    if (cargando) {
        return (
            <div className="min-h-screen bg-white flex items-center justify-center">
                <Loader2 className="animate-spin text-[#689C63]" size={28} />
            </div>
        );
    }

    return (
        <div className="flex flex-col min-h-screen bg-[#FAF9F7]">
            {/* ── Cabecera ── */}
            <header className="sticky top-0 z-40 border-b border-[#2E3330]/10 bg-white/92 backdrop-blur">
                <div className="mx-auto flex items-center gap-3 px-4 sm:px-6" style={{ maxWidth: 1000, minHeight: 52 }}>
                    <button
                        onClick={onCerrar}
                        className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-[13px] font-semibold text-[#2E3330]/60 hover:bg-[#2E3330]/5 transition-colors"
                    >
                        <X size={15} />
                        <span className="hidden sm:inline">Cerrar</span>
                    </button>
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[#4a7a46] bg-[#689C63]/15 px-2.5 py-1 rounded-full">
                        <RouteIcon size={12} /> Ruta de aprendizaje
                    </span>

                    <div className="flex-1" />

                    {aviso && (
                        <span className="inline-flex items-center gap-1 text-[12px] font-semibold text-[#4a7a46]">
                            <Check size={13} /> {aviso}
                        </span>
                    )}

                    <button
                        onClick={guardar}
                        disabled={guardando}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-[#2E3330]/10 bg-white px-3.5 text-[13px] font-semibold h-9 text-[#2E3330] hover:bg-[#2E3330]/5 disabled:opacity-50 transition-colors"
                    >
                        <Save size={14} />
                        <span className="hidden sm:inline">Guardar</span>
                    </button>

                    {estado === 'publicada' ? (
                        <button
                            onClick={despublicar}
                            disabled={guardando}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-[#2E3330]/10 bg-white px-3.5 sm:px-4 text-[13px] font-semibold h-9 text-[#2E3330] hover:bg-[#2E3330]/5 disabled:opacity-50 transition-colors"
                        >
                            Despublicar
                        </button>
                    ) : (
                        <button
                            onClick={publicar}
                            disabled={guardando || errores.length > 0}
                            title={
                                errores.length > 0
                                    ? `Corrige ${errores.length} error(es) antes de publicar`
                                    : undefined
                            }
                            className="inline-flex items-center gap-1.5 rounded-xl bg-[#689C63] px-3.5 sm:px-4 text-white text-[13px] font-bold h-9 hover:bg-[#5a8a55] disabled:opacity-40 transition-colors"
                        >
                            <Send size={14} />
                            <span className="hidden sm:inline">Publicar</span>
                        </button>
                    )}
                </div>
            </header>

            <main className="mx-auto px-4 sm:px-6 py-6 w-full" style={{ maxWidth: 1000 }}>
                {error && (
                    <div className="mb-4 flex items-start gap-2 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-[13px]">
                        <CircleAlert size={15} className="mt-0.5 shrink-0" />
                        <span>{error}</span>
                    </div>
                )}

                {estado === 'publicada' && (
                    <div className="mb-4 p-3 rounded-xl bg-[#689C63]/10 border border-[#689C63]/25 text-[#4a7a46] text-[13px]">
                        Esta ruta es visible en el Portal del estudiante. Los cambios se guardan al
                        pulsar Guardar.
                    </div>
                )}

                {hayCambiosSinGuardar() && (
                    <div className="mb-4 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-[13px]">
                        Hay cambios sin guardar en una ruta que aun no existe. Pulsa Guardar para
                        crearla.
                    </div>
                )}

                {/* ── Avisos de publicacion ── */}
                {problemas.length > 0 && estado !== 'publicada' && (
                    <details
                        open={errores.length > 0}
                        className="mb-4 rounded-xl border border-amber-200 bg-amber-50/60 p-3"
                    >
                        <summary className="cursor-pointer text-[13px] font-bold text-amber-900 list-none">
                            {errores.length > 0
                                ? `${errores.length} error(es) que impiden publicar`
                                : `${problemas.length} aviso(s) antes de publicar`}
                        </summary>
                        <ul className="mt-2 space-y-1">
                            {problemas.map((p, i) => (
                                <li
                                    key={`${p.donde}-${i}`}
                                    className={`text-[12px] leading-relaxed ${
                                        p.nivel === 'error' ? 'text-red-700' : 'text-amber-800'
                                    }`}
                                >
                                    <span className="font-semibold">{p.donde}:</span> {p.mensaje}
                                </li>
                            ))}
                        </ul>
                    </details>
                )}

                {/* ── Datos de la ruta ── */}
                <section className="bg-white rounded-2xl border border-[#2E3330]/10 p-5 mb-5">
                    {disponibles.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1.5 mb-4 pb-4 border-b border-[#2E3330]/8">
                            {disponibles.map((r) => {
                                const activa = r.id === rutaId;
                                return (
                                    <button
                                        key={r.id}
                                        onClick={() => !activa && abrirRuta(r.id)}
                                        disabled={guardando}
                                        className={`inline-flex items-center gap-1.5 rounded-full px-3 h-8 text-[12.5px] font-semibold border transition-colors disabled:opacity-50 ${
                                            activa
                                                ? 'bg-[#2E3330] text-white border-[#2E3330]'
                                                : 'bg-white text-[#2E3330]/70 border-[#2E3330]/12 hover:bg-[#2E3330]/5'
                                        }`}
                                    >
                                        {r.titulo || 'Sin titulo'}
                                        <span
                                            className={`text-[10px] font-bold uppercase tracking-wide ${
                                                activa ? 'text-white/55' : 'text-[#2E3330]/35'
                                            }`}
                                        >
                                            {r.estado}
                                        </span>
                                    </button>
                                );
                            })}
                            <button
                                onClick={empezarNueva}
                                disabled={guardando || !rutaId}
                                title="Crear una ruta nueva en esta ficha"
                                className="inline-flex items-center gap-1 rounded-full px-3 h-8 text-[12.5px] font-semibold text-[#4a7a46] border border-dashed border-[#689C63]/50 hover:bg-[#689C63]/10 disabled:opacity-40 transition-colors"
                            >
                                <Plus size={12} /> Nueva
                            </button>
                        </div>
                    )}

                    <label className="block text-[11px] font-bold uppercase tracking-wide text-[#2E3330]/55 mb-1.5">
                        Nombre de la ruta
                    </label>
                    <input
                        value={titulo}
                        onChange={(e) => setTitulo(e.target.value)}
                        placeholder="Domina el Teorema de Pitágoras"
                        className="w-full text-[19px] font-bold tracking-tight text-[#2E3330] bg-transparent outline-none placeholder:text-[#2E3330]/25 mb-4"
                    />

                    <label className="block text-[11px] font-bold uppercase tracking-wide text-[#2E3330]/55 mb-1.5">
                        Descripción
                    </label>
                    <textarea
                        value={descripcion}
                        onChange={(e) => setDescripcion(e.target.value)}
                        rows={2}
                        placeholder="Qué logrará el estudiante al recorrer esta ruta."
                        className="w-full text-[14px] text-[#2E3330]/75 bg-transparent outline-none placeholder:text-[#2E3330]/25 resize-y leading-relaxed"
                    />

                    <div className="mt-4 pt-3 border-t border-[#2E3330]/8 flex items-center gap-4 text-[12px] text-[#2E3330]/55">
                        <span>
                            {etapas.length} etapa{etapas.length === 1 ? '' : 's'}
                        </span>
                        <span>
                            {totalActividades} actividade{totalActividades === 1 ? '' : 's'}
                        </span>
                        <span className="ml-auto">Desbloqueo secuencial</span>
                        {rutaId && (
                            <button
                                onClick={eliminarRutaActual}
                                className="inline-flex items-center gap-1 font-semibold text-[#2E3330]/40 hover:text-red-600 transition-colors"
                            >
                                <Trash2 size={12} /> Eliminar ruta
                            </button>
                        )}
                    </div>
                </section>

                {/* ── Etapas ── */}
                <div className="space-y-3">
                    {etapas.map((etapa, indiceEtapa) => (
                        <section
                            key={etapa.id}
                            className="bg-white rounded-2xl border border-[#2E3330]/10 overflow-hidden"
                        >
                            <div className="flex items-center gap-2 px-4 py-3">
                                <span className="w-6 h-6 rounded-lg bg-[#2E3330] text-white text-[11px] font-bold flex items-center justify-center shrink-0">
                                    {indiceEtapa + 1}
                                </span>
                                <input
                                    value={etapa.titulo}
                                    onChange={(e) => actualizarEtapaLocal(etapa.id!, { titulo: e.target.value })}
                                    onBlur={async () => {
                                        try {
                                            await rutaApiDocente.actualizarEtapa(etapa.id!, etapa.titulo);
                                        } catch {
                                            /* el error global ya se muestra */
                                        }
                                    }}
                                    placeholder="Nombre de la etapa"
                                    className="flex-1 text-[15px] font-bold text-[#2E3330] bg-transparent outline-none placeholder:text-[#2E3330]/25 min-w-0"
                                />
                                <div className="flex items-center gap-0.5 shrink-0">
                                    <button
                                        onClick={() => moverEtapa(indiceEtapa, -1)}
                                        disabled={indiceEtapa === 0}
                                        className="p-1.5 rounded-lg text-[#2E3330]/35 hover:text-[#2E3330] disabled:opacity-25 transition-colors"
                                        aria-label="Subir etapa"
                                    >
                                        <ChevronUp size={14} />
                                    </button>
                                    <button
                                        onClick={() => moverEtapa(indiceEtapa, 1)}
                                        disabled={indiceEtapa === etapas.length - 1}
                                        className="p-1.5 rounded-lg text-[#2E3330]/35 hover:text-[#2E3330] disabled:opacity-25 transition-colors"
                                        aria-label="Bajar etapa"
                                    >
                                        <ChevronDown size={14} />
                                    </button>
                                    <button
                                        onClick={() => eliminarEtapa(etapa.id!)}
                                        className="p-1.5 rounded-lg text-[#2E3330]/35 hover:text-red-600 transition-colors"
                                        aria-label="Eliminar etapa"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            </div>

                            {etapaAbierta === etapa.id && (
                                <div className="border-t border-[#2E3330]/8 bg-[#FAF9F7] p-3 space-y-2">
                                    {etapa.actividades.length === 0 && (
                                        <p className="text-[12px] text-[#2E3330]/45 py-2 text-center">
                                            Esta etapa aun no tiene actividades.
                                        </p>
                                    )}

                                    {etapa.actividades.map((actividad) => (
                                        <div
                                            key={actividad.id}
                                            className="bg-white rounded-xl border border-[#2E3330]/10 overflow-hidden"
                                        >
                                            <div className="flex items-center gap-2 px-3 py-2">
                                                <span className="px-2 py-0.5 rounded-md bg-[#3e6088]/10 text-[#3e6088] text-[10px] font-bold uppercase tracking-wide">
                                                    {ETIQUETA_TIPO_ACTIVIDAD[actividad.tipo]}
                                                </span>
                                                <input
                                                    value={actividad.titulo ?? ''}
                                                    onChange={(e) =>
                                                        actualizarActividadLocal(etapa.id!, actividad.id!, {
                                                            titulo: e.target.value,
                                                        })
                                                    }
                                                    placeholder="Título de la actividad (opcional)"
                                                    className="flex-1 text-[13px] font-semibold text-[#2E3330] bg-transparent outline-none placeholder:text-[#2E3330]/30 min-w-0"
                                                />
                                                <span className="text-[10px] text-[#2E3330]/40 shrink-0">
                                                    {actividad.preguntas.length} preg.
                                                </span>
                                                <button
                                                    onClick={() =>
                                                        setActividadAbierta(
                                                            actividadAbierta === actividad.id ? null : actividad.id!,
                                                        )
                                                    }
                                                    className="p-1.5 rounded-lg text-[#2E3330]/40 hover:text-[#3e6088] transition-colors"
                                                    aria-label="Editar actividad"
                                                >
                                                    {actividadAbierta === actividad.id ? (
                                                        <ChevronUp size={14} />
                                                    ) : (
                                                        <ChevronDown size={14} />
                                                    )}
                                                </button>
                                                <button
                                                    onClick={() => eliminarActividad(etapa.id!, actividad.id!)}
                                                    className="p-1.5 rounded-lg text-[#2E3330]/35 hover:text-red-600 transition-colors"
                                                    aria-label="Eliminar actividad"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>

                                            {actividadAbierta === actividad.id && (
                                                <FormularioActividad
                                                    actividad={actividad}
                                                    onChange={(cambios) =>
                                                        actualizarActividadLocal(etapa.id!, actividad.id!, cambios)
                                                    }
                                                    onGuardar={() => {
                                                        const actual = etapas
                                                            .find((e) => e.id === etapa.id)
                                                            ?.actividades.find((a) => a.id === actividad.id);
                                                        if (actual) void guardarActividad(actual);
                                                    }}
                                                    guardando={guardando}
                                                />
                                            )}
                                        </div>
                                    ))}

                                    <SelectorTipoActividad
                                        onElegir={(tipo) => agregarActividad(etapa.id!, tipo)}
                                    />
                                </div>
                            )}
                        </section>
                    ))}
                </div>

                <button
                    onClick={agregarEtapa}
                    className="mt-3 w-full inline-flex items-center justify-center gap-1.5 rounded-2xl border border-dashed border-[#2E3330]/20 py-3 text-[13px] font-bold text-[#2E3330]/55 hover:bg-white hover:border-[#689C63]/50 hover:text-[#4a7a46] transition-colors"
                >
                    <Plus size={15} /> Agregar etapa
                </button>
            </main>
        </div>
    );
}

/* ─────────────────────────────────────────────────────────────────────────
   Selector de tipo de actividad
   ───────────────────────────────────────────────────────────────────────── */

function SelectorTipoActividad({ onElegir }: { onElegir: (tipo: TipoActividad) => void }) {
    const [abierto, setAbierto] = useState(false);

    return (
        <div className="pt-1">
            {!abierto ? (
                <button
                    onClick={() => setAbierto(true)}
                    className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl border border-dashed border-[#2E3330]/18 py-2.5 text-[12px] font-bold text-[#2E3330]/50 hover:border-[#689C63]/45 hover:text-[#4a7a46] transition-colors"
                >
                    <Plus size={13} /> Agregar actividad
                </button>
            ) : (
                <div className="rounded-xl border border-[#2E3330]/10 bg-white p-2.5">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-[#2E3330]/45 mb-2 px-1">
                        Tipo de actividad
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                        {TIPOS_ACTIVIDAD_V1.map((tipo) => (
                            <button
                                key={tipo}
                                onClick={() => {
                                    onElegir(tipo);
                                    setAbierto(false);
                                }}
                                className="text-left px-2.5 py-2 rounded-lg text-[12px] font-semibold text-[#2E3330] hover:bg-[#689C63]/10 hover:text-[#4a7a46] transition-colors"
                            >
                                {ETIQUETA_TIPO_ACTIVIDAD[tipo]}
                            </button>
                        ))}
                    </div>
                    <button
                        onClick={() => setAbierto(false)}
                        className="mt-2 w-full text-[11px] font-semibold text-[#2E3330]/45 hover:text-[#2E3330]"
                    >
                        Cancelar
                    </button>
                </div>
            )}
        </div>
    );
}

/* ─────────────────────────────────────────────────────────────────────────
   Formulario de actividad: preguntas segun el tipo
   ───────────────────────────────────────────────────────────────────────── */

interface FormularioActividadProps {
    actividad: ActividadDocente;
    onChange: (cambios: Partial<ActividadDocente>) => void;
    onGuardar: () => void;
    guardando: boolean;
}

function FormularioActividad({ actividad, onChange, onGuardar, guardando }: FormularioActividadProps) {
    const tipos = TIPOS_RESPUESTA_POR_ACTIVIDAD[actividad.tipo];
    const esProcedimiento = actividad.tipo === 'procedimiento_matematico';
    const usaOpciones = actividad.tipo === 'opcion_multiple' || actividad.tipo === 'verdadero_falso';

    const actualizarPregunta = (indice: number, cambios: Partial<PreguntaDocente>) => {
        onChange({
            preguntas: actividad.preguntas.map((p, i) => (i === indice ? { ...p, ...cambios } : p)),
        });
    };

    const agregarPregunta = () => {
        onChange({
            preguntas: [
                ...actividad.preguntas,
                preguntaVacia(tipos[0], actividad.tipo),
            ],
        });
    };

    const eliminarPregunta = (indice: number) => {
        if (actividad.preguntas.length === 1) return;
        onChange({ preguntas: actividad.preguntas.filter((_, i) => i !== indice) });
    };

    return (
        <div className="border-t border-[#2E3330]/8 p-3.5 space-y-4">
            <div>
                <label className="block text-[10px] font-bold uppercase tracking-wide text-[#2E3330]/50 mb-1">
                    Instrucciones
                </label>
                <textarea
                    value={actividad.instrucciones ?? ''}
                    onChange={(e) => onChange({ instrucciones: e.target.value })}
                    rows={2}
                    placeholder="Qué debe hacer el estudiante en esta actividad."
                    className="w-full px-3 py-2 text-[13px] rounded-lg border border-[#2E3330]/10 focus:outline-none focus:border-[#689C63] resize-y leading-relaxed"
                />
            </div>

            {actividad.preguntas.map((pregunta, indice) => {
                const pasos = pregunta.config.pasos ?? [];
                const avisos = validarPregunta(
                    pregunta.enunciado,
                    actividad.tipo,
                    pregunta.tipo_respuesta,
                    pregunta.config,
                    pregunta.opciones.length,
                    pregunta.opciones.filter((o) => o.es_correcta).length,
                );

                return (
                    <div
                        key={indice}
                        className="rounded-xl border border-[#2E3330]/10 bg-[#FAF9F7] p-3 space-y-3"
                    >
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold uppercase tracking-wide text-[#2E3330]/45">
                                Pregunta {indice + 1}
                            </span>
                            <div className="flex-1" />

                            {tipos.length > 1 && (
                                <select
                                    value={pregunta.tipo_respuesta}
                                    onChange={(e) =>
                                        actualizarPregunta(indice, {
                                            tipo_respuesta: e.target.value as TipoRespuesta,
                                        })
                                    }
                                    className="text-[11px] font-semibold px-2 py-1 rounded-lg border border-[#2E3330]/10 bg-white focus:outline-none"
                                >
                                    {tipos.map((t) => (
                                        <option key={t} value={t}>
                                            {t}
                                        </option>
                                    ))}
                                </select>
                            )}

                            {actividad.preguntas.length > 1 && (
                                <button
                                    onClick={() => eliminarPregunta(indice)}
                                    className="p-1.5 rounded-lg text-[#2E3330]/35 hover:text-red-600 transition-colors"
                                    aria-label="Eliminar pregunta"
                                >
                                    <Trash2 size={13} />
                                </button>
                            )}
                        </div>

                        <textarea
                            value={pregunta.enunciado}
                            onChange={(e) => actualizarPregunta(indice, { enunciado: e.target.value })}
                            rows={2}
                            placeholder={
                                esProcedimiento
                                    ? 'Dados b = 2 y c = 3, encuentra a usando el teorema de Pitágoras.'
                                    : 'Escribe el enunciado de la pregunta.'
                            }
                            className="w-full px-3 py-2 text-[13px] font-semibold rounded-lg border border-[#2E3330]/10 bg-white focus:outline-none focus:border-[#689C63] resize-y leading-relaxed"
                        />

                        {/* ── Procedimiento matemático ── */}
                        {esProcedimiento && (
                            <EditorPasos
                                pasos={pasos}
                                onChange={(nuevos: PasoProcedimiento[]) =>
                                    actualizarPregunta(indice, {
                                        config: { ...pregunta.config, pasos: nuevos },
                                    })
                                }
                                tipoRespuesta={pregunta.tipo_respuesta}
                                config={pregunta.config}
                                datos={actividad.config.datos ?? []}
                                onDatosChange={(datos) => onChange({ config: { ...actividad.config, datos } })}
                            />
                        )}

                        {/* ── Opciones ── */}
                        {usaOpciones && (
                            <EditorOpciones
                                opciones={pregunta.opciones}
                                onChange={(opciones) => actualizarPregunta(indice, { opciones })}
                                fija={actividad.tipo === 'verdadero_falso'}
                            />
                        )}

                        {/* ── Respuesta esperada escalar ── */}
                        {!esProcedimiento && !usaOpciones && (
                            <EditorRespuestaEsperada
                                config={pregunta.config}
                                tipoRespuesta={pregunta.tipo_respuesta}
                                onChange={(config: PreguntaConfig) => actualizarPregunta(indice, { config })}
                            />
                        )}

                        {/* ── Retroalimentación y pista ── */}
                        <details className="group">
                            <summary className="cursor-pointer text-[11px] font-bold uppercase tracking-wide text-[#2E3330]/45 hover:text-[#2E3330] list-none">
                                Pista y retroalimentación
                            </summary>
                            <div className="mt-2 space-y-2">
                                <input
                                    value={pregunta.pista ?? ''}
                                    onChange={(e) => actualizarPregunta(indice, { pista: e.target.value })}
                                    placeholder="Pista que se muestra si el estudiante falla."
                                    className="w-full px-3 py-2 text-[12px] rounded-lg border border-[#2E3330]/10 bg-white focus:outline-none focus:border-[#689C63]"
                                />
                                <input
                                    value={pregunta.retroalimentacion_ok ?? ''}
                                    onChange={(e) =>
                                        actualizarPregunta(indice, { retroalimentacion_ok: e.target.value })
                                    }
                                    placeholder="Explicación cuando acierta."
                                    className="w-full px-3 py-2 text-[12px] rounded-lg border border-[#2E3330]/10 bg-white focus:outline-none focus:border-[#689C63]"
                                />
                                <input
                                    value={pregunta.retroalimentacion_error ?? ''}
                                    onChange={(e) =>
                                        actualizarPregunta(indice, { retroalimentacion_error: e.target.value })
                                    }
                                    placeholder="Explicación cuando se equivoca."
                                    className="w-full px-3 py-2 text-[12px] rounded-lg border border-[#2E3330]/10 bg-white focus:outline-none focus:border-[#689C63]"
                                />
                            </div>
                        </details>

                        {avisos.length > 0 && (
                            <div className="space-y-1">
                                {avisos.map((a) => (
                                    <p
                                        key={a.mensaje}
                                        className={`text-[11px] flex items-start gap-1.5 ${
                                            a.nivel === 'error' ? 'text-red-700' : 'text-amber-700'
                                        }`}
                                    >
                                        <CircleAlert size={11} className="mt-0.5 shrink-0" />
                                        {a.mensaje}
                                    </p>
                                ))}
                            </div>
                        )}
                    </div>
                );
            })}

            <div className="flex items-center gap-2">
                <button
                    onClick={agregarPregunta}
                    className="inline-flex items-center gap-1 text-[12px] font-bold text-[#3e6088] hover:underline"
                >
                    <Plus size={12} /> Agregar pregunta
                </button>
                <div className="flex-1" />
                <button
                    onClick={onGuardar}
                    disabled={guardando}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-[#2E3330] px-3.5 py-1.5 text-white text-[12px] font-bold hover:bg-[#3e463f] disabled:opacity-50 transition-colors"
                >
                    {guardando ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                    Guardar actividad
                </button>
            </div>
        </div>
    );
}

/* ─────────────────────────────────────────────────────────────────────────
   Editores auxiliares
   ───────────────────────────────────────────────────────────────────────── */

function EditorOpciones({
    opciones,
    onChange,
    fija,
}: {
    opciones: PreguntaDocente['opciones'];
    onChange: (opciones: PreguntaDocente['opciones']) => void;
    fija: boolean;
}) {
    return (
        <div className="space-y-1.5">
            {opciones.map((opcion, i) => (
                <div key={i} className="flex items-center gap-2">
                    <input
                        type="radio"
                        checked={opcion.es_correcta}
                        onChange={() =>
                            onChange(opciones.map((o, j) => ({ ...o, es_correcta: j === i })))
                        }
                        disabled={fija}
                        className="accent-[#689C63] shrink-0"
                        title={opcion.es_correcta ? 'Respuesta correcta' : 'Marcar como correcta'}
                    />
                    <input
                        value={opcion.texto}
                        onChange={(e) =>
                            onChange(opciones.map((o, j) => (j === i ? { ...o, texto: e.target.value } : o)))
                        }
                        disabled={fija}
                        className="flex-1 px-3 py-1.5 text-[13px] rounded-lg border border-[#2E3330]/10 bg-white focus:outline-none focus:border-[#689C63] disabled:bg-[#2E3330]/[0.03] disabled:text-[#2E3330]/60"
                    />
                    {!fija && opciones.length > 2 && (
                        <button
                            onClick={() => onChange(opciones.filter((_, j) => j !== i))}
                            className="p-1.5 rounded-lg text-[#2E3330]/35 hover:text-red-600 transition-colors"
                            aria-label="Eliminar opción"
                        >
                            <Trash2 size={12} />
                        </button>
                    )}
                </div>
            ))}
            {!fija && (
                <button
                    onClick={() =>
                        onChange([
                            ...opciones,
                            { texto: '', orden: opciones.length, es_correcta: false },
                        ])
                    }
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-[#3e6088] hover:underline"
                >
                    <Plus size={11} /> Agregar opción
                </button>
            )}
        </div>
    );
}

function EditorRespuestaEsperada({
    config,
    tipoRespuesta,
    onChange,
}: {
    config: PreguntaConfig;
    tipoRespuesta: TipoRespuesta;
    onChange: (config: PreguntaConfig) => void;
}) {
    const alternas = config.respuestasAceptadas ?? [];

    return (
        <div className="space-y-2">
            <div>
                <label className="block text-[10px] font-bold uppercase tracking-wide text-[#2E3330]/50 mb-1">
                    Respuesta correcta
                </label>
                <input
                    value={config.respuestaEsperada ?? ''}
                    onChange={(e) => onChange({ ...config, respuestaEsperada: e.target.value })}
                    placeholder={tipoRespuesta === 'numerica' ? '5' : 'la respuesta'}
                    className="w-full px-3 py-2 text-[13px] font-mono rounded-lg border border-[#689C63]/40 bg-[#689C63]/5 focus:outline-none focus:border-[#689C63] focus:bg-white transition-colors"
                />
            </div>

            {tipoRespuesta === 'numerica' && (
                <div className="flex gap-2">
                    <label className="flex-1">
                        <span className="block text-[10px] text-[#2E3330]/50 mb-0.5">
                            Tolerancia absoluta
                        </span>
                        <input
                            type="number"
                            step="any"
                            value={config.toleranciaAbs ?? 0.001}
                            onChange={(e) =>
                                onChange({ ...config, toleranciaAbs: Number(e.target.value) })
                            }
                            className="w-full px-2.5 py-1.5 text-[12px] font-mono rounded-lg border border-[#2E3330]/10 bg-white focus:outline-none"
                        />
                    </label>
                    <label className="flex-1">
                        <span className="block text-[10px] text-[#2E3330]/50 mb-0.5">
                            Tolerancia relativa
                        </span>
                        <input
                            type="number"
                            step="any"
                            value={config.toleranciaRel ?? 0}
                            onChange={(e) =>
                                onChange({ ...config, toleranciaRel: Number(e.target.value) })
                            }
                            className="w-full px-2.5 py-1.5 text-[12px] font-mono rounded-lg border border-[#2E3330]/10 bg-white focus:outline-none"
                        />
                    </label>
                </div>
            )}

            <div>
                <label className="block text-[10px] font-bold uppercase tracking-wide text-[#2E3330]/50 mb-1">
                    También se acepta
                </label>
                <div className="space-y-1">
                    {alternas.map((alt, i) => (
                        <div key={i} className="flex items-center gap-2">
                            <input
                                value={alt}
                                onChange={(e) =>
                                    onChange({
                                        ...config,
                                        respuestasAceptadas: alternas.map((a, j) =>
                                            j === i ? e.target.value : a,
                                        ),
                                    })
                                }
                                className="flex-1 px-2.5 py-1.5 text-[12px] font-mono rounded-lg border border-[#2E3330]/10 bg-white focus:outline-none"
                            />
                            <button
                                onClick={() =>
                                    onChange({
                                        ...config,
                                        respuestasAceptadas: alternas.filter((_, j) => j !== i),
                                    })
                                }
                                className="p-1.5 rounded-lg text-[#2E3330]/35 hover:text-red-600 transition-colors"
                                aria-label="Eliminar alternativa"
                            >
                                <Trash2 size={12} />
                            </button>
                        </div>
                    ))}
                    <button
                        onClick={() =>
                            onChange({ ...config, respuestasAceptadas: [...alternas, ''] })
                        }
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-[#3e6088] hover:underline"
                    >
                        <Plus size={11} /> Agregar alternativa
                    </button>
                </div>
            </div>
        </div>
    );
}
