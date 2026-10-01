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
    Scale,
    Link2,
    PhoneCall,
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
    opcionesVerdaderoFalso,
    normalizarOpcionesVerdaderoFalso,
    TEXTO_VERDADERO_FALSO,
} from '../../../types/rutas';
import { rutaApiDocente } from '../../../lib/rutaApi';
import { validarPregunta, validarRuta } from '../../../lib/rutaValidacion';
import {
    aPayloadPesos,
    esExacto,
    excedente,
    faltante,
    formatear,
    leerPorcentaje,
    repartirEnPartesIguales,
    sumarPesos,
    validarPesos,
} from '../../../lib/rutaPesos';
import { EditorPasos } from './EditorPasos';
import { SelectorActividadExistente } from './SelectorActividadExistente';

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
        // El servidor rebalancea al crear; el objeto local nace en 100 para que
        // el campo no parpadee cuando la etapa tiene un solo item.
        peso: 100,
        orden: 0,
        config: { datos: [] },
        obligatorio: true,
        preguntas: [preguntaVacia(TIPOS_RESPUESTA_POR_ACTIVIDAD[tipo][0], tipo)],
    };
    if (tipo === 'verdadero_falso') {
        base.preguntas[0].opciones = opcionesVerdaderoFalso();
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

/**
 * Deja un item de Verdadero/Falso con "Verdadero" como unica correcta.
 *
 * Se aplica al CARGAR y al GUARDAR, no solo al crear. Un item guardado antes de
 * este cambio puede tener "Falso" marcada, y sin normalizarlo el docente abriria
 * el formulario, veria que dice "Respuesta correcta: Verdadero" y el servidor
 * seguiria sumando al reves: la interfaz y la correccion discrepando, que es
 * justo el bug que el cambio busca cerrar.
 *
 * No destruye nada: conserva ids, textos y orden, y solo mueve la marca.
 */
function normalizarItem(actividad: ActividadDocente): ActividadDocente {
    if (actividad.tipo !== 'verdadero_falso') return actividad;
    return {
        ...actividad,
        preguntas: actividad.preguntas.map((p) => ({
            ...p,
            opciones: normalizarOpcionesVerdaderoFalso(p.opciones),
        })),
    };
}

function normalizarItems(etapas: EtapaDocente[]): EtapaDocente[] {
    return etapas.map((etapa) => ({
        ...etapa,
        actividades: etapa.actividades.map(normalizarItem),
    }));
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
    const [etapaParaVincular, setEtapaParaVincular] = useState<string | null>(null);

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
                    setEtapas(normalizarItems(completa.etapas ?? []));
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
            setEtapas(normalizarItems(completa.etapas ?? []));
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

    /**
     * Persiste la ponderación en la misma transacción que valida el servidor.
     *
     * Se manda aunque las sumas no cuadren: la RPC lo rechaza con un mensaje
     * claro, y preferimos que el error llegue del servidor —que es quien
     * valida de verdad— a que el cliente invente una excepcion. El estado
     * local nunca se da por bueno sin que la base lo confirme.
     */
    const guardarPesos = useCallback(
        async (id: string) => {
            const persistibles = etapas.filter((e) => e.id);
            if (persistibles.length === 0) return;
            await rutaApiDocente.actualizarPesos(id, aPayloadPesos(persistibles));
        },
        [etapas],
    );

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
            await guardarPesos(id);
            setAviso('Guardado');
            setTimeout(() => setAviso(null), 1800);
            await refrescarLista();
        } catch (e) {
            setError(e instanceof Error ? e.message : 'No se pudo guardar');
        } finally {
            setGuardando(false);
        }
    }, [crearRutaSiHaceFalta, guardarPesos, titulo, descripcion, estado, refrescarLista]);

    /* ── Etapas ── */
    const agregarEtapa = async () => {
        setError(null);
        try {
            const id = await crearRutaSiHaceFalta();
            const creada = await rutaApiDocente.crearEtapa(id, `Etapa ${etapas.length + 1}`);
            setEtapas((prev) => {
                const siguiente = [
                    ...prev,
                    {
                        id: creada.id,
                        titulo: `Etapa ${prev.length + 1}`,
                        descripcion: '',
                        peso: 0,
                        orden: prev.length,
                        actividades: [],
                    },
                ];
                return repartirEnPartesIguales(siguiente);
            });
            setEtapaAbierta(creada.id);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'No se pudo crear la etapa');
        }
    };

    const actualizarEtapaLocal = (etapaId: string, cambios: Partial<EtapaDocente>) => {
        setEtapas((prev) => prev.map((e) => (e.id === etapaId ? { ...e, ...cambios } : e)));
    };

    const eliminarEtapa = async (etapaId: string) => {
        if (!window.confirm('¿Eliminar esta etapa y sus items? Se perderá el progreso registrado.')) return;
        try {
            await rutaApiDocente.eliminarEtapa(etapaId);
            // La RPC rebalancea las etapas que quedan; el reparto local es el
            // mismo calculo, asi que la pantalla no queda desfasada.
            setEtapas((prev) => repartirEnPartesIguales(prev.filter((e) => e.id !== etapaId)));
            if (etapaAbierta === etapaId) setEtapaAbierta(null);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'No se pudo eliminar');
        }
    };

    /** Reparte 100% en partes iguales entre las actividades de una etapa. */
    const repartirEtapa = async (etapaId: string) => {
        if (!rutaId) {
            setError('Guarda la ruta antes de repartir: hace falta su identificador.');
            return;
        }
        try {
            await rutaApiDocente.rebalancear(rutaId, etapaId);
            setEtapas((prev) =>
                prev.map((e) =>
                    e.id === etapaId ? { ...e, actividades: repartirEnPartesIguales(e.actividades) } : e,
                ),
            );
            setAviso('Repartido en partes iguales');
            setTimeout(() => setAviso(null), 1800);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'No se pudo repartir');
        }
    };

    /** Reparte 100% en partes iguales entre las etapas de la ruta. */
    const repartirRuta = async () => {
        if (!rutaId) {
            setError('Guarda la ruta antes de repartir: hace falta su identificador.');
            return;
        }
        try {
            await rutaApiDocente.rebalancear(rutaId);
            setEtapas((prev) => repartirEnPartesIguales(prev));
            setAviso('Repartido en partes iguales');
            setTimeout(() => setAviso(null), 1800);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'No se pudo repartir');
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
                              actividades: repartirEnPartesIguales([
                                  ...e.actividades,
                                  { ...actividadVacia(tipo), id: creada.id, orden: e.actividades.length },
                              ]),
                          }
                        : e,
                ),
            );
            setEtapaAbierta(etapaId);
            setActividadAbierta(creada.id);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'No se pudo crear el item');
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
                        ? {
                              ...e,
                              actividades: repartirEnPartesIguales(
                                  e.actividades.filter((a) => a.id !== actividadId),
                              ),
                          }
                        : e,
                ),
            );
            if (actividadAbierta === actividadId) setActividadAbierta(null);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'No se pudo eliminar');
        }
    };

    /**
     * Vincula una actividad que ya existe en CIELO.
     *
     * La RPC crea el puntero y precarga titulo e instrucciones desde
     * public.actividades, que despues el docente puede reescribir: lo que se
     * reutiliza es la actividad, no su redaccion. La fila local nace con las
     * preguntas en blanco porque una actividad de CIELO no trae preguntas con
     * respuesta declarada; hay que escribirlas para que el motor sepa corregir.
     */
    const vincularActividad = async (
        etapaId: string,
        actividadOrigenId: number,
        tipo: TipoActividad,
    ) => {
        setError(null);
        try {
            const creada = await rutaApiDocente.vincularActividad(etapaId, actividadOrigenId, tipo);
            setEtapas((prev) =>
                prev.map((e) => {
                    if (e.id !== etapaId) return e;
                    const actividad: ActividadDocente = {
                        ...actividadVacia(tipo),
                        id: creada.id,
                        orden: e.actividades.length,
                        actividad_origen_id: actividadOrigenId,
                    };
                    return { ...e, actividades: repartirEnPartesIguales([...e.actividades, actividad]) };
                }),
            );
            setEtapaAbierta(etapaId);
            setActividadAbierta(creada.id);
            setEtapaParaVincular(null);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'No se pudo calificar la actividad');
        }
    };

    const guardarActividad = async (actividad: ActividadDocente) => {
        if (!actividad.id) return;
        setGuardando(true);
        setError(null);
        try {
            // Se normaliza aqui y no solo en memoria: si por lo que sea el
            // estado trajera "Falso" como correcta, esta es la ultima linea
            // antes de que llegue a la base, y ahi no puede colarse.
            const aGuardar = normalizarItem(actividad);
            await rutaApiDocente.guardarActividad(actividad.id, aGuardar);
            setAviso('Item guardado');
            setTimeout(() => setAviso(null), 1800);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'No se pudo guardar el item');
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
     *
     * Los porcentajes van en la misma lista que el resto porque un error de
     * ponderacion es tan bloqueante como una pregunta sin enunciado: con las
     * etapas en 80 % el calculo del puntaje deja de ser justo, aunque todas las
     * preguntas esten perfectas.
     */
    const problemas = [...validarRuta(etapas), ...validarPesos(etapas)];
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
            // Se persiste la ponderacion ANTES de publicar: si los porcentajes
            // no cuadran, la ruta se queda en borrador y el estudiante nunca
            // ve un puntaje mal repartido.
            await guardarPesos(id);
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

                    <div className="mt-4 pt-3 border-t border-[#2E3330]/8 flex flex-wrap items-center gap-x-4 gap-y-2 text-[12px] text-[#2E3330]/55">
                        <span>
                            {etapas.length} etapa{etapas.length === 1 ? '' : 's'}
                        </span>
                        <span>
                            {totalActividades} item{totalActividades === 1 ? '' : 's'}
                        </span>
                        {etapas.length > 0 && (
                            <>
                                <ResumenSuma
                                    pesos={etapas.map((e) => e.peso)}
                                    cantidad={etapas.length}
                                />
                                <button
                                    onClick={repartirRuta}
                                    className="inline-flex items-center gap-1 text-[11px] font-bold text-[#2E3330]/40 hover:text-[#4a7a46] transition-colors"
                                    title="Repartir 100% en partes iguales entre las etapas de la ruta"
                                >
                                    <Scale size={11} /> Repartir
                                </button>
                            </>
                        )}
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
                                <CampoPeso
                                    valor={etapa.peso}
                                    etiqueta={`Peso de la etapa ${indiceEtapa + 1} en la ruta, en porcentaje`}
                                    onCommit={(peso) =>
                                        peso !== null && actualizarEtapaLocal(etapa.id!, { peso })
                                    }
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
                                    {etapa.actividades.length > 0 && (
                                        <div className="flex items-center gap-2 px-1">
                                            <ResumenSuma
                                                pesos={etapa.actividades.map((a) => a.peso)}
                                                cantidad={etapa.actividades.length}
                                            />
                                            <div className="flex-1" />
                                            <button
                                                onClick={() => repartirEtapa(etapa.id!)}
                                                className="inline-flex items-center gap-1 text-[11px] font-bold text-[#2E3330]/40 hover:text-[#4a7a46] transition-colors"
                                                title="Repartir 100% en partes iguales entre los items de esta etapa"
                                            >
                                                <Scale size={11} /> Repartir
                                            </button>
                                        </div>
                                    )}

                                    {etapa.actividades.length === 0 && (
                                        <p className="text-[12px] text-[#2E3330]/45 py-2 text-center">
                                            Esta etapa aún no tiene items.
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
                                                {actividad.actividad_origen_id && (
                                                    <span
                                                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#689C63]/15 text-[#4a7a46] text-[10px] font-bold uppercase tracking-wide"
                                                        title="Este item viene de CIELO. Al completarse, su puntaje pasa a calificaciones."
                                                    >
                                                        <Link2 size={9} /> CIELO
                                                    </span>
                                                )}
                                                <input
                                                    value={actividad.titulo ?? ''}
                                                    onChange={(e) =>
                                                        actualizarActividadLocal(etapa.id!, actividad.id!, {
                                                            titulo: e.target.value,
                                                        })
                                                    }
                                                    placeholder="Título del item (opcional)"
                                                    className="flex-1 text-[13px] font-semibold text-[#2E3330] bg-transparent outline-none placeholder:text-[#2E3330]/30 min-w-0"
                                                />
                                                <span className="text-[10px] text-[#2E3330]/40 shrink-0">
                                                    {actividad.preguntas.length} preg.
                                                </span>
                                                <CampoPeso
                                                    valor={actividad.peso}
                                                    etiqueta={`Peso del item dentro de ${etapa.titulo || 'la etapa'}, en porcentaje`}
                                                    onCommit={(peso) =>
                                                        peso !== null &&
                                                        actualizarActividadLocal(etapa.id!, actividad.id!, {
                                                            peso,
                                                        })
                                                    }
                                                />
                                                <button
                                                    onClick={() =>
                                                        setActividadAbierta(
                                                            actividadAbierta === actividad.id ? null : actividad.id!,
                                                        )
                                                    }
                                                    className="p-1.5 rounded-lg text-[#2E3330]/40 hover:text-[#3e6088] transition-colors"
                                                    aria-label="Editar item"
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
                                                    aria-label="Eliminar item"
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

                                    <button
                                        onClick={() => setEtapaParaVincular(etapa.id!)}
                                        disabled={!rutaId}
                                        title={
                                            rutaId
                                                ? 'Califica una actividad que ya existe en CIELO con esta ruta, sin duplicarla'
                                                : 'Guarda la ruta primero: hace falta su identificador para buscar actividades'
                                        }
                                        className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl border border-dashed border-[#689C63]/45 py-2.5 px-3 text-center text-[12px] font-bold leading-snug text-[#4a7a46] bg-[#689C63]/6 hover:bg-[#689C63]/12 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                    >
                                        <Link2 size={13} /> Calificar una actividad con esta ruta de aprendizaje
                                    </button>
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

            {etapaParaVincular && rutaId && (
                <SelectorActividadExistente
                    rutaId={rutaId}
                    etapaTitulo={etapas.find((e) => e.id === etapaParaVincular)?.titulo ?? 'la etapa'}
                    onVincular={(actividadOrigenId, tipo) =>
                        vincularActividad(etapaParaVincular, actividadOrigenId, tipo)
                    }
                    onCerrar={() => setEtapaParaVincular(null)}
                />
            )}
        </div>
    );
}

/* ─────────────────────────────────────────────────────────────────────────
   Campos de ponderación
   ───────────────────────────────────────────────────────────────────────── */

/**
 * Input de porcentaje.
 *
 * Se escribe con estado propio para no romper el estado del formulario: cada
 * tecla es un borrador y solo al salir del campo se avisa al padre. Un input
 * controlado que sube el valor en cada pulsación hace focus-salto en el
 * maestro y es imposible escribir "0.5" encima de "25".
 */
function CampoPeso({
    valor,
    onCommit,
    etiqueta,
    className = '',
}: {
    valor: number;
    onCommit: (valor: number | null) => void;
    etiqueta: string;
    className?: string;
}) {
    const [borrador, setBorrador] = useState<string | null>(null);

    const mostrado = borrador ?? String(valor);

    const confirmar = () => {
        if (borrador === null) return;
        const leido = leerPorcentaje(borrador);
        if (leido !== null) onCommit(leido);
        setBorrador(null);
    };

    return (
        <label
            className={`inline-flex items-center gap-1 rounded-lg border border-[#2E3330]/10 bg-white px-1.5 h-7 focus-within:border-[#689C63] transition-colors ${className}`}
            title={etiqueta}
        >
            <span className="text-[10px] font-bold text-[#2E3330]/35 leading-none">%</span>
            <input
                value={mostrado}
                onChange={(e) => setBorrador(e.target.value)}
                onBlur={confirmar}
                onKeyDown={(e) => {
                    if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                    if (e.key === 'Escape') setBorrador(null);
                }}
                inputMode="decimal"
                aria-label={etiqueta}
                className="w-11 bg-transparent outline-none text-[12px] font-bold text-[#2E3330] tabular-nums text-right"
            />
        </label>
    );
}

/**
 * Estado de una suma de porcentajes.
 *
 * El mensaje es el que el docente necesita para decidir, no "inválido":
 * saber que faltan 15 % es accionable; saber que la suma no es 100 no lo es.
 */
function ResumenSuma({ pesos, cantidad }: { pesos: number[]; cantidad: number }) {
    if (cantidad === 0) return null;
    const suma = sumarPesos(pesos);
    const ok = esExacto(suma);

    return (
        <span
            className={`inline-flex items-center gap-1 text-[11px] font-semibold ${
                ok ? 'text-[#4a7a46]' : 'text-amber-700'
            }`}
        >
            {ok ? (
                <>
                    <Check size={11} /> Suma {formatear(suma)} %
                </>
            ) : suma > 100 ? (
                <>
                    <CircleAlert size={11} /> Excede {formatear(excedente(suma))} %
                </>
            ) : (
                <>
                    <CircleAlert size={11} /> Faltan {formatear(faltante(suma))} %
                </>
            )}
        </span>
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
                    <Plus size={13} /> Agregar item
                </button>
            ) : (
                <div className="rounded-xl border border-[#2E3330]/10 bg-white p-2.5">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-[#2E3330]/45 mb-2 px-1">
                        Tipo de item
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
            {/*
              No hay campo de Instrucciones. El enunciado de cada pregunta ya
              dice que hacer y el titulo del item dice de que trata: un campo mas
              era texto que el docente tenia que repetir en todos los items.

              `instrucciones` NO se borra del objeto ni de la base: los items
              antiguos que ya la tienen la conservan y siguen guardandola al
              editar, asi que quitar el campo no destructura nada.
            */}

            <div className="rounded-xl border border-[#2E3330]/10 bg-white p-3 space-y-3">
                <label className="flex items-start gap-2.5 cursor-pointer">
                    <input
                        type="checkbox"
                        checked={actividad.config.solicita_producto ?? false}
                        onChange={(e) =>
                            onChange({
                                config: { ...actividad.config, solicita_producto: e.target.checked },
                            })
                        }
                        className="mt-0.5"
                    />
                    <div>
                        <span className="flex items-center gap-1.5 text-[12px] font-bold text-[#2E3330]">
                            <PhoneCall size={13} className="text-[#689C63]" />
                            Solicitar subir producto (Evidencia)
                        </span>
                        <span className="block text-[11px] text-[#2E3330]/50 mt-0.5 leading-relaxed">
                            El estudiante tendrá un espacio para subir un archivo o enlazar su Google Drive en este ítem.
                        </span>
                    </div>
                </label>

                {(actividad.config.solicita_producto ?? false) && (
                    <div className="pl-6 space-y-3 pt-2 border-t border-[#2E3330]/5">
                        <label className="block">
                            <span className="block text-[10px] font-bold uppercase tracking-wide text-[#2E3330]/50 mb-1">
                                Nombre del producto
                            </span>
                            <input
                                type="text"
                                value={actividad.config.nombre_producto ?? ''}
                                onChange={(e) =>
                                    onChange({
                                        config: { ...actividad.config, nombre_producto: e.target.value },
                                    })
                                }
                                placeholder="Ej: Ensayo final, Presentación en PDF..."
                                className="w-full px-3 py-2 text-[12px] font-semibold rounded-lg border border-[#2E3330]/10 bg-white focus:outline-none focus:border-[#689C63]"
                            />
                        </label>
                        <label className="block">
                            <span className="block text-[10px] font-bold uppercase tracking-wide text-[#2E3330]/50 mb-1">
                                Instrucciones específicas (opcional)
                            </span>
                            <textarea
                                value={actividad.config.instruccion_producto ?? ''}
                                onChange={(e) =>
                                    onChange({
                                        config: { ...actividad.config, instruccion_producto: e.target.value },
                                    })
                                }
                                placeholder="Describe qué esperas que entregue el estudiante..."
                                rows={2}
                                className="w-full px-3 py-2 text-[12px] font-semibold rounded-lg border border-[#2E3330]/10 bg-white focus:outline-none focus:border-[#689C63] resize-y"
                            />
                        </label>
                    </div>
                )}
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
                    Guardar item
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
    // En Verdadero/Falso no hay nada que decidir: la correcta es SIEMPRE
    // "Verdadero" y las dos opciones las ve el estudiante al responder. Se
    // muestran como informacion, sin radio ni campos, para que no exista por
    // donde marcar "Falso". El texto se imprime desde la constante para que no
    // pueda desincronizarse de lo que el servidor da por correcto.
    if (fija) {
        return (
            <div className="rounded-lg border border-[#2E3330]/10 bg-[#FAF9F7] px-3 py-2.5">
                <p className="text-[10px] font-bold uppercase tracking-wide text-[#2E3330]/50 mb-1.5">
                    Respuesta correcta
                </p>
                <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-lg bg-[#689C63]/15 px-2.5 py-1 text-[13px] font-bold text-[#4a7a46]">
                        <Check size={13} /> {TEXTO_VERDADERO_FALSO.verdadero}
                    </span>
                    <span className="text-[11px] text-[#2E3330]/45">
                        El estudiante ve las dos opciones; solo {TEXTO_VERDADERO_FALSO.verdadero.toLowerCase()} suma.
                    </span>
                </div>
            </div>
        );
    }

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
                        className="accent-[#689C63] shrink-0"
                        title={opcion.es_correcta ? 'Respuesta correcta' : 'Marcar como correcta'}
                    />
                    <input
                        value={opcion.texto}
                        onChange={(e) =>
                            onChange(opciones.map((o, j) => (j === i ? { ...o, texto: e.target.value } : o)))
                        }
                        className="flex-1 px-3 py-1.5 text-[13px] rounded-lg border border-[#2E3330]/10 bg-white focus:outline-none focus:border-[#689C63]"
                    />
                    {opciones.length > 2 && (
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
