import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Loader2,
  ArrowLeft,
  Lock,
  Check,
  X,
  ChevronDown,
  ChevronUp,
  Lightbulb,
  Route as RouteIcon,
  Target,
  AlertTriangle,
} from 'lucide-react';

import { rutaApiPortal } from '../../lib/rutaApi';
import { partirPaso } from '../../lib/rutaPasos';
import { usePortal, rutaPortal } from './portalContext';
import type {
  ActividadEstudiante,
  DetalleEspacio,
  EtapaEstudiante,
  PasoPublico,
  PreguntaEstudiante,
  RespuestaEspacio,
  RutaEstudiante,
  VeredictoIntento,
} from '../../types/rutas';

/** Estado del formulario por pregunta, indexado por id. */
type Borrador = { texto: string; elegidas: string[]; espacios: Record<string, string> };

const borradorVacio: Borrador = { texto: '', elegidas: [], espacios: {} };

const claveEspacio = (paso: number, espacio: number) => `${paso}:${espacio}`;

const SIN_DATOS = 'No se pudo cargar esta ruta de aprendizaje.';

export default function PortalRuta() {
  const { id, rutaId } = useParams<{ id: string; rutaId: string }>();
  const navigate = useNavigate();
  const { token, sessionToken } = usePortal();

  const [ruta, setRuta] = useState<RutaEstudiante | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [borradores, setBorradores] = useState<Record<string, Borrador>>({});
  const [abiertoEn, setAbiertoEn] = useState<Record<string, number>>({});
  const [veredictos, setVeredictos] = useState<Record<string, VeredictoIntento>>({});
  const [enviando, setEnviando] = useState<string | null>(null);
  const [etapaAbierta, setEtapaAbierta] = useState<string | null>(null);
  const [pistaAbierta, setPistaAbierta] = useState<Record<string, boolean>>({});
  const [errorPregunta, setErrorPregunta] = useState<Record<string, string>>({});

  const cargar = useCallback(async () => {
    // Sin token de sesion o sin id de ruta no hay nada que pedir. Antes este
    // `return` salia ANTES del finally y dejaba `cargando` en true para
    // siempre: un spinner eterno, indistinguible de una pantalla en blanco.
    if (!sessionToken || !rutaId) {
      setRuta(null);
      setError(SIN_DATOS);
      setCargando(false);
      return;
    }
    try {
      const data = await rutaApiPortal.obtener(sessionToken, rutaId);
      setError(null);
      setRuta(data);
      // Se abre la primera etapa disponible: entrar y ver candados no ayuda.
      // Al recargar tras responder NO se cambia la que el estudiante tiene
      // abierta, o el acordeón se le cerraria encima.
      const etapas = Array.isArray(data.etapas) ? data.etapas : [];
      setEtapaAbierta((actual) => {
        if (actual && etapas.some((e) => e.id === actual)) return actual;
        return etapas.find((e) => e.desbloqueada)?.id ?? null;
      });
    } catch (e) {
      setRuta(null);
      setError(e instanceof Error && e.message ? e.message : SIN_DATOS);
    } finally {
      setCargando(false);
    }
  }, [sessionToken, rutaId]);

  useEffect(() => {
    setCargando(true);
    setError(null);
    void cargar();
  }, [cargar]);

  const borrador = (preguntaId: string): Borrador => borradores[preguntaId] ?? borradorVacio;

  const setCampo = <K extends keyof Borrador>(preguntaId: string, campo: K, valor: Borrador[K]) => {
    setBorradores((prev) => ({
      ...prev,
      [preguntaId]: { ...borrador(preguntaId), [campo]: valor },
    }));
    // El cronometro arranca la primera vez que el estudiante toca la pregunta.
    // Medir en `enviar` daba siempre 0 porque se tomaba justo antes del await.
    setAbiertoEn((prev) => (prev[preguntaId] ? prev : { ...prev, [preguntaId]: Date.now() }));
    // Cambiar la respuesta invalida el veredicto anterior: ya no corresponde.
    setVeredictos((prev) => {
      if (!prev[preguntaId]) return prev;
      const copia = { ...prev };
      delete copia[preguntaId];
      return copia;
    });
  };

  const construirRespuesta = (pregunta: PreguntaEstudiante): Record<string, unknown> | null => {
    const b = borrador(pregunta.id);
    const pasos = Array.isArray(pregunta.pasos) ? pregunta.pasos : [];
    const opciones = Array.isArray(pregunta.opciones) ? pregunta.opciones : [];

    if (pasos.length > 0) {
      const espacios: RespuestaEspacio[] = [];
      pasos.forEach((paso, indicePaso) => {
        for (let i = 0; i < (paso.espacios || 0); i++) {
          const clave = claveEspacio(indicePaso, i);
          const valor = (b.espacios[clave] ?? '').trim();
          // Se manda SIEMPRE la lista completa, vacia o no. El servidor exige
          // el envio completo y asi el estudiante ve de un vistazo que le falta.
          espacios.push({ paso: indicePaso + 1, espacio: i + 1, valor });
        }
      });
      return { espacios };
    }

    if (opciones.length > 0) {
      return { opcionIds: b.elegidas };
    }

    const texto = b.texto.trim();
    if (!texto) return null;
    return { texto };
  };

  const enviar = async (pregunta: PreguntaEstudiante, actividad: ActividadEstudiante) => {
    if (!sessionToken) {
      setErrorPregunta((p) => ({ ...p, [pregunta.id]: 'Tu sesión expiró. Vuelve a entrar al portal.' }));
      return;
    }

    const respuesta = construirRespuesta(pregunta);
    if (!respuesta) {
      setErrorPregunta((p) => ({ ...p, [pregunta.id]: 'Escribe tu respuesta antes de continuar.' }));
      return;
    }

    setEnviando(pregunta.id);
    setErrorPregunta((p) => ({ ...p, [pregunta.id]: '' }));

    const duracion = abiertoEn[pregunta.id]
      ? Math.max(0, Math.round((Date.now() - abiertoEn[pregunta.id]) / 1000))
      : undefined;

    try {
      const veredicto = await rutaApiPortal.registrarIntento(
        sessionToken,
        pregunta.id,
        respuesta as never,
        duracion,
      );

      if (veredicto.error) {
        setErrorPregunta((p) => ({ ...p, [pregunta.id]: veredicto.error as string }));
        return;
      }

      setVeredictos((v) => ({ ...v, [pregunta.id]: veredicto }));

      // El progreso de la actividad y el candado de la etapa siguiente solo los
      // sabe calcular el servidor, asi que se recarga cuando la actividad queda
      // completa. `cargar` conserva `cargando` en false: recargar no es volver a
      // abrir la pantalla.
      const preguntas = Array.isArray(actividad.preguntas) ? actividad.preguntas : [];
      const ultima = preguntas[preguntas.length - 1];
      if (veredicto.correcto && ultima?.id === pregunta.id) {
        await cargar();
      }
    } catch (e) {
      setErrorPregunta((p) => ({
        ...p,
        [pregunta.id]: e instanceof Error && e.message ? e.message : 'No se pudo registrar la respuesta',
      }));
    } finally {
      setEnviando(null);
    }
  };

  const porcentaje = useMemo(() => {
    const prog = ruta?.progreso;
    if (!prog || !prog.total) return 0;
    return Math.round((prog.completadas / prog.total) * 100);
  }, [ruta]);

  if (cargando) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="animate-spin text-stone-900" size={32} />
      </div>
    );
  }

  if (error || !ruta) {
    return (
      <div className="p-5">
        <Volver onVolver={() => navigate(rutaPortal(token, 'fichas', id ?? ''))} />
        <EstadoRutaVacia
          titulo={SIN_DATOS}
          detalle={error || 'La ruta no existe o todavía no fue publicada.'}
        />
      </div>
    );
  }

  const etapas = ruta.etapas ?? [];
  const total = ruta.progreso?.total ?? 0;
  const completadas = ruta.progreso?.completadas ?? 0;

  return (
    <div className="pt-2 px-5 pb-10 max-w-3xl">
      <Volver onVolver={() => navigate(rutaPortal(token, 'fichas', id ?? ''))} />

      <header className="bg-white border border-neutral-200 rounded-2xl p-6 mb-4">
        <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-neutral-500 bg-neutral-100 px-2.5 py-1 rounded-full mb-3">
          <RouteIcon size={11} /> Ruta de aprendizaje
        </span>
        <h1 className="text-xl md:text-2xl font-bold text-black tracking-tight mb-1">
          {ruta.titulo}
        </h1>
        {ruta.descripcion && (
          <p className="text-sm text-neutral-600 leading-relaxed mb-4">{ruta.descripcion}</p>
        )}

        <div className="flex items-center gap-3">
          <div className="flex-1 h-2 rounded-full bg-neutral-100 overflow-hidden">
            <div
              className="h-full rounded-full bg-black transition-all duration-500"
              style={{ width: `${porcentaje}%` }}
            />
          </div>
          <span className="text-xs font-bold text-neutral-600 tabular-nums shrink-0">
            {completadas}/{total} · {porcentaje}%
          </span>
        </div>
      </header>

      {etapas.length === 0 && (
        <p className="text-sm text-neutral-500 text-center py-10">
          Esta ruta todavía no tiene actividades.
        </p>
      )}

      <div className="space-y-3">
        {etapas.map((etapa, indice) => (
          <Etapa
            key={etapa.id}
            etapa={etapa}
            indice={indice}
            abierta={etapaAbierta === etapa.id}
            onToggle={() => setEtapaAbierta(etapaAbierta === etapa.id ? null : etapa.id)}
            borrador={borrador}
            setCampo={setCampo}
            veredicto={(preguntaId) => veredictos[preguntaId]}
            errorDe={(preguntaId) => errorPregunta[preguntaId]}
            pistaAbierta={pistaAbierta}
            setPistaAbierta={setPistaAbierta}
            enviando={enviando}
            onEnviar={enviar}
          />
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Piezas
   ───────────────────────────────────────────────────────────────────────── */

function Volver({ onVolver }: { onVolver: () => void }) {
  return (
    <button
      onClick={onVolver}
      className="flex items-center text-xs font-bold mb-6 text-neutral-600 hover:text-black transition-colors"
    >
      <ArrowLeft size={14} className="mr-1.5" /> Volver a la ficha
    </button>
  );
}

/**
 * Estado por defecto cuando la ruta no se puede mostrar. Es lo que el estudiante
 * ve en vez de una pantalla en blanco cuando la consulta falla, la sesion expiro
 * o la ruta todavia no fue publicada.
 */
function EstadoRutaVacia({ titulo, detalle }: { titulo: string; detalle: string }) {
  return (
    <div className="p-6 bg-white border border-neutral-200 rounded-2xl text-center">
      <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-red-50 text-red-500 mb-3">
        <AlertTriangle size={18} />
      </span>
      <p className="text-sm font-bold text-black">{titulo}</p>
      <p className="text-xs text-neutral-600 mt-1 leading-relaxed">{detalle}</p>
    </div>
  );
}

interface EtapaProps {
  etapa: EtapaEstudiante;
  indice: number;
  abierta: boolean;
  onToggle: () => void;
  borrador: (preguntaId: string) => Borrador;
  setCampo: <K extends keyof Borrador>(
    preguntaId: string,
    campo: K,
    valor: Borrador[K],
  ) => void;
  veredicto: (preguntaId: string) => VeredictoIntento | undefined;
  errorDe: (preguntaId: string) => string | undefined;
  pistaAbierta: Record<string, boolean>;
  setPistaAbierta: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  enviando: string | null;
  onEnviar: (pregunta: PreguntaEstudiante, actividad: ActividadEstudiante) => void;
}

function Etapa({
  etapa,
  indice,
  abierta,
  onToggle,
  borrador,
  setCampo,
  veredicto,
  errorDe,
  pistaAbierta,
  setPistaAbierta,
  enviando,
  onEnviar,
}: EtapaProps) {
  const bloqueada = !etapa.desbloqueada;
  const actividades = Array.isArray(etapa.actividades) ? etapa.actividades : [];

  return (
    <section
      className={`bg-white border rounded-2xl overflow-hidden ${
        bloqueada ? 'border-neutral-200 opacity-70' : 'border-neutral-200'
      }`}
    >
      <button onClick={onToggle} className="w-full flex items-center gap-3 px-5 py-4 text-left">
        <span
          className={`w-7 h-7 rounded-lg flex items-center justify-center text-[11px] font-bold shrink-0 ${
            etapa.completada
              ? 'bg-black text-white'
              : bloqueada
                ? 'bg-neutral-100 text-neutral-400'
                : 'bg-neutral-100 text-black'
          }`}
        >
          {etapa.completada ? <Check size={14} /> : bloqueada ? <Lock size={12} /> : indice + 1}
        </span>

        <span className="flex-1 min-w-0">
          <span className="block text-sm font-bold text-black truncate">{etapa.titulo}</span>
          {bloqueada && (
            <span className="block text-[11px] text-neutral-500">Completa la etapa anterior para abrirla</span>
          )}
        </span>

        {abierta ? (
          <ChevronUp size={16} className="text-neutral-400 shrink-0" />
        ) : (
          <ChevronDown size={16} className="text-neutral-400 shrink-0" />
        )}
      </button>

      {abierta && (
        <div className="border-t border-neutral-100 px-5 py-4 space-y-4">
          {etapa.descripcion && (
            <p className="text-sm text-neutral-600 leading-relaxed">{etapa.descripcion}</p>
          )}

          {actividades.length === 0 && (
            <p className="text-sm text-neutral-500">Esta etapa no tiene actividades todavía.</p>
          )}

          {actividades.map((actividad) => (
            <Actividad
              key={actividad.id}
              actividad={actividad}
              bloqueada={bloqueada}
              borrador={borrador}
              setCampo={setCampo}
              veredicto={veredicto}
              errorDe={errorDe}
              pistaAbierta={pistaAbierta}
              setPistaAbierta={setPistaAbierta}
              enviando={enviando}
              onEnviar={onEnviar}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function Actividad({
  actividad,
  bloqueada,
  borrador,
  setCampo,
  veredicto,
  errorDe,
  pistaAbierta,
  setPistaAbierta,
  enviando,
  onEnviar,
}: Omit<EtapaProps, 'etapa' | 'indice' | 'abierta' | 'onToggle'> & {
  actividad: ActividadEstudiante;
  bloqueada: boolean;
}) {
  // El RPC devuelve JSONB: ninguna coleccion viene garantizada como arreglo.
  // Toda lectura se pasa por `?? []` para que un payload inesperado caiga en un
  // estado vacio visible y no en un TypeError de render (pantalla en blanco).
  const datos = Array.isArray(actividad.config?.datos) ? actividad.config.datos : [];
  const preguntas = Array.isArray(actividad.preguntas) ? actividad.preguntas : [];

  return (
    <div
      className={`rounded-xl border p-4 ${
        actividad.completada ? 'border-black/15 bg-neutral-50' : 'border-neutral-200'
      }`}
    >
      <div className="flex items-center gap-2 mb-1">
        <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">
          {actividad.tipo_etiqueta}
        </span>
        {actividad.completada && (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-black bg-neutral-200 px-1.5 py-0.5 rounded-full">
            <Check size={9} /> Completada
          </span>
        )}
        {!actividad.obligatorio && (
          <span className="text-[10px] font-bold text-neutral-400 bg-neutral-100 px-1.5 py-0.5 rounded-full">
            Opcional
          </span>
        )}
      </div>

      {actividad.titulo && (
        <h3 className="text-sm font-bold text-black mb-1">{actividad.titulo}</h3>
      )}
      {actividad.instrucciones && (
        <p className="text-sm text-neutral-600 leading-relaxed mb-3">{actividad.instrucciones}</p>
      )}

      {datos.length > 0 && (
        <div className="mb-4 p-3 rounded-lg bg-neutral-50 border border-neutral-100">
          <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 mb-1.5">
            Datos
          </p>
          {datos.map((dato, i) => (
            <p key={i} className="text-sm font-mono text-neutral-700">
              {dato}
            </p>
          ))}
        </div>
      )}

      <div className="space-y-4">
        {preguntas.map((pregunta) => (
          <Pregunta
            key={pregunta.id}
            pregunta={pregunta}
            seleccionMultiple={actividad.tipo === 'opcion_multiple'}
            bloqueada={bloqueada}
            borrador={borrador(pregunta.id)}
            setCampo={(campo, valor) => setCampo(pregunta.id, campo, valor)}
            veredicto={veredicto(pregunta.id)}
            error={errorDe(pregunta.id)}
            pistaAbierta={!!pistaAbierta[pregunta.id]}
            setPista={(v) => setPistaAbierta((p) => ({ ...p, [pregunta.id]: v }))}
            enviando={enviando === pregunta.id}
            onEnviar={() => onEnviar(pregunta, actividad)}
          />
        ))}
      </div>
    </div>
  );
}

interface PreguntaProps {
  pregunta: PreguntaEstudiante;
  /** Viene del TIPO DE ACTIVIDAD, nunca de la clave: saber si hay una o varias
      respuestas correctas no es informacion que el estudiante deba recibir. */
  seleccionMultiple: boolean;
  bloqueada: boolean;
  borrador: Borrador;
  setCampo: <K extends keyof Borrador>(campo: K, valor: Borrador[K]) => void;
  veredicto?: VeredictoIntento;
  error?: string;
  pistaAbierta: boolean;
  setPista: (v: boolean) => void;
  enviando: boolean;
  onEnviar: () => void;
}

function Pregunta({
  pregunta,
  seleccionMultiple,
  bloqueada,
  borrador,
  setCampo,
  veredicto,
  error,
  pistaAbierta,
  setPista,
  enviando,
  onEnviar,
}: PreguntaProps) {
  const resuelta = !!veredicto;
  const opciones = Array.isArray(pregunta.opciones) ? pregunta.opciones : [];
  const pasos = Array.isArray(pregunta.pasos) ? pregunta.pasos : [];
  const esOpciones = opciones.length > 0;
  const esProcedimiento = pasos.length > 0;

  // Correcto/incorrecto por hueco, para resaltar solo lo que fallo.
  const porEspacio = useMemo(() => {
    const mapa = new Map<string, boolean>();
    for (const d of (veredicto?.detalleEspacios ?? []) as DetalleEspacio[]) {
      mapa.set(claveEspacio(d.paso - 1, d.espacio - 1), d.correcto);
    }
    return mapa;
  }, [veredicto]);

  const alternarOpcion = (opcionId: string) => {
    if (resuelta) return;
    const marcadas = new Set(borrador.elegidas);
    if (marcadas.has(opcionId)) marcadas.delete(opcionId);
    else marcadas.add(opcionId);
    setCampo('elegidas', [...marcadas]);
  };

  return (
    <div className="pt-3 border-t border-neutral-100 first:border-0 first:pt-0">
      <p className="text-sm font-semibold text-black leading-relaxed mb-3">{pregunta.enunciado}</p>

      {/* ── Procedimiento matemático ── */}
      {esProcedimiento && (
        <div className="space-y-3">
          {pasos.map((paso, indicePaso) => (
            <PasoInteractivo
              key={indicePaso}
              paso={paso}
              indicePaso={indicePaso}
              valores={borrador.espacios}
              porEspacio={porEspacio}
              disabled={bloqueada || resuelta}
              onChange={(clave, valor) =>
                setCampo('espacios', { ...borrador.espacios, [clave]: valor })
              }
            />
          ))}
        </div>
      )}

      {/* ── Opciones ── */}
      {esOpciones && (
        <div className="space-y-2">
          {opciones.map((opcion) => {
            const elegida = borrador.elegidas.includes(opcion.id);
            return (
              <button
                key={opcion.id}
                type="button"
                onClick={() => alternarOpcion(opcion.id)}
                disabled={bloqueada || resuelta}
                className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left text-sm transition-colors disabled:cursor-default ${
                  elegida
                    ? 'border-black bg-neutral-50 text-black font-semibold'
                    : 'border-neutral-200 text-neutral-700 hover:border-neutral-300 bg-white'
                }`}
              >
                <span
                  className={`w-5 h-5 flex-none flex items-center justify-center ${
                    seleccionMultiple ? 'rounded-md' : 'rounded-full'
                  } border-2 ${
                    elegida ? 'border-black bg-black text-white' : 'border-neutral-300'
                  }`}
                >
                  {elegida && <Check size={11} strokeWidth={3} />}
                </span>
                {opcion.texto}
              </button>
            );
          })}
        </div>
      )}

      {/* ── Respuesta abierta ── */}
      {!esOpciones && !esProcedimiento && (
        <input
          type="text"
          value={borrador.texto}
          onChange={(e) => setCampo('texto', e.target.value)}
          disabled={bloqueada || resuelta}
          placeholder={pregunta.tipo_respuesta === 'numerica' ? 'Escribe un número' : 'Escribe tu respuesta'}
          className="w-full p-3 text-sm bg-white border border-neutral-200 rounded-xl focus:outline-none focus:border-black transition-colors disabled:bg-neutral-50 disabled:text-neutral-500 font-mono"
        />
      )}

      {/* ── Pista ── */}
      {pregunta.pista && !resuelta && (
        <div className="mt-2">
          {pistaAbierta ? (
            <p className="flex items-start gap-1.5 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-2">
              <Lightbulb size={12} className="mt-0.5 shrink-0" />
              {pregunta.pista}
            </p>
          ) : (
            <button
              type="button"
              onClick={() => setPista(true)}
              className="inline-flex items-center gap-1 text-xs font-semibold text-neutral-500 hover:text-black"
            >
              <Lightbulb size={12} /> Ver pista
            </button>
          )}
        </div>
      )}

      {error && <p className="mt-2 text-xs text-red-600 font-semibold">{error}</p>}

      {/* ── Veredicto ── */}
      {veredicto && (
        <div
          className={`mt-3 p-3 rounded-xl border flex items-start gap-2.5 ${
            veredicto.correcto
              ? 'bg-[#689C63]/10 border-[#689C63]/30'
              : 'bg-red-50 border-red-200'
          }`}
        >
          <span
            className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-white ${
              veredicto.correcto ? 'bg-[#689C63]' : 'bg-red-500'
            }`}
          >
            {veredicto.correcto ? <Check size={12} strokeWidth={3} /> : <X size={12} strokeWidth={3} />}
          </span>
          <div className="min-w-0">
            <p className={`text-sm font-bold ${veredicto.correcto ? 'text-[#4a7a46]' : 'text-red-700'}`}>
              {veredicto.correcto
                ? '¡Correcto!'
                : esProcedimiento && (veredicto.parciales ?? 0) > 0
                  ? `Vas ${veredicto.parciales} de ${veredicto.totalEspacios} espacios`
                  : 'Todavía no es correcto'}
            </p>
            {veredicto.retroalimentacion && (
              <p className="text-xs text-neutral-700 leading-relaxed mt-0.5">
                {veredicto.retroalimentacion}
              </p>
            )}
          </div>
        </div>
      )}

      {!resuelta && (
        <button
          onClick={onEnviar}
          disabled={bloqueada || enviando}
          className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 bg-black text-white text-xs font-bold rounded-xl hover:bg-neutral-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {enviando ? <Loader2 size={13} className="animate-spin" /> : <Target size={13} />}
          Comprobar
        </button>
      )}
    </div>
  );
}

/**
 * Un paso del procedimiento: el texto del docente intercalado con los inputs.
 *
 * El texto llega del servidor ya sin respuestas (ruta_pasos_publicos), asi que
 * aqui no hay nada secreto que proteger. Los huecos se cuentan con el mismo
 * modulo que usa el constructor: si el texto trae mas marcadores que espacios
 * declarados, los sobrantes se muestran como texto y el estudiante no puede
 * escribir en un hueco que el servidor no va a evaluar.
 */
function PasoInteractivo({
  paso,
  indicePaso,
  valores,
  porEspacio,
  disabled,
  onChange,
}: {
  paso: PasoPublico;
  indicePaso: number;
  valores: Record<string, string>;
  porEspacio: Map<string, boolean>;
  disabled: boolean;
  onChange: (clave: string, valor: string) => void;
}) {
  const partes = partirPaso(paso.texto);
  const huecosEnTexto = partes.filter((p) => p.tipo === 'hueco').length;
  const extra = Math.max(0, paso.espacios - huecosEnTexto);

  const input = (indiceHueco: number) => {
    const clave = claveEspacio(indicePaso, indiceHueco);
    const acierto = porEspacio.get(clave);
    return (
      <input
        key={clave}
        type="text"
        value={valores[clave] ?? ''}
        onChange={(e) => onChange(clave, e.target.value)}
        disabled={disabled}
        aria-label={`Hueco del paso ${indicePaso + 1}`}
        className={`inline-block w-16 px-2 py-0.5 mx-0.5 font-mono text-sm text-center border-b-2 bg-transparent focus:outline-none focus:border-black transition-colors disabled:text-neutral-500 ${
          acierto === true
            ? 'border-[#689C63] text-[#4a7a46]'
            : acierto === false
              ? 'border-red-400 text-red-600'
              : 'border-neutral-300'
        }`}
      />
    );
  };

  return (
    <div className="p-3 rounded-xl bg-neutral-50 border border-neutral-100">
      <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 mb-1.5">
        Paso {indicePaso + 1}
      </p>
      <p className="text-sm font-mono text-neutral-800 leading-loose">
        {partes.map((parte, i) =>
          parte.tipo === 'texto' ? (
            <span key={i}>{parte.valor}</span>
          ) : parte.indice < paso.espacios ? (
            input(parte.indice)
          ) : (
            <span key={i} className="text-neutral-400">[&nbsp;&nbsp;]</span>
          ),
        )}
        {/* Huecos declarados que el texto no muestra: se agregan al final para
            que el estudiante pueda contestarlos y el servidor los evalue. */}
        {Array.from({ length: extra }, (_, i) => (
          <span key={`extra-${i}`} className="inline-flex items-center ml-2">
            {i === 0 && <span className="text-neutral-400">respuesta: </span>}
            {input(huecosEnTexto + i)}
          </span>
        ))}
      </p>
    </div>
  );
}
