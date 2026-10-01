import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Loader2,
  ArrowLeft,
  Lock,
  Check,
  X,
  ChevronDown,
  CircleAlert,
  Lightbulb,
  Route as RouteIcon,
  Target,
  AlertTriangle,
  Upload,
} from 'lucide-react';

import { rutaApiPortal } from '../../lib/rutaApi';
import { partirPaso } from '../../lib/rutaPasos';
import { usePortal, rutaPortal } from './portalContext';
import PortalEvidenciaForm from './PortalEvidenciaForm';
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

/**
 * El puntaje viene de la base con decimales, pero al estudiante un 66.6667 no
 * le aporta nada y hace creer que la nota tiene una precision que no tiene.
 */
function redondearPuntaje(valor: number): string {
  if (!Number.isFinite(valor)) return '0';
  return String(Math.round(valor * 10) / 10);
}

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
  const [pistaAbierta, setPistaAbierta] = useState<Record<string, boolean>>({});
  const [errorPregunta, setErrorPregunta] = useState<Record<string, string>>({});

  /**
   * Un item a la vez, no un acordeon.
   *
   * `etapaAbierta` + `itemActual` son una maquina de dos pasos: entrar a una
   * etapa abre directamente el item pendiente (no hay pantalla intermedia de
   * lista de items) y `Continuar` avanza al siguiente sin pasar por atras. La
   * lista de items se volveria a ver solo al salir de un item, que es un
   * clic y no un paso obligatorio del recorrido.
   */
  const [etapaAbierta, setEtapaAbierta] = useState<string | null>(null);
  const [itemActual, setItemActual] = useState<string | null>(null);
  /** El item en pantalla quedo resuelto: habilita el boton Continuar. */
  const [itemTerminado, setItemTerminado] = useState(false);

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

  const etapaVisible = ruta?.etapas?.find((e) => e.id === etapaAbierta) ?? null;
  const itemVisible = etapaVisible?.actividades?.find((a) => a.id === itemActual) ?? null;

  /** Primer item sin completar: por ahi siempre se entra. */
  const itemPendiente = (etapa: EtapaEstudiante): ActividadEstudiante | null => {
    const items = Array.isArray(etapa.actividades) ? etapa.actividades : [];
    return items.find((a) => !a.completada) ?? null;
  };

  const entrarAEtapa = (etapa: EtapaEstudiante) => {
    // `desbloqueada` en true significa ABIERTA. La guarda es la inversa: con
    // `if (etapa.desbloqueada) return` se salia justamente de las etapas que
    // se pueden hacer, y solo se entraba a las bloqueadas.
    if (!etapa.desbloqueada) return;
    setEtapaAbierta(etapa.id);
    const pendiente = itemPendiente(etapa);
    const items = Array.isArray(etapa.actividades) ? etapa.actividades : [];
    const item = pendiente ?? items[items.length - 1] ?? null;
    setItemActual(item?.id ?? null);
    setItemTerminado(!!item?.completada);
  };

  const salirDeEtapa = () => {
    setEtapaAbierta(null);
    setItemActual(null);
    setItemTerminado(false);
  };

  /**
   * Avanza al siguiente item de la etapa. Si era el ultimo, vuelve a la lista
   * de etapas: la siguiente ya aparece desbloqueada por la logica que siempre
   * rigio el desbloqueo secuencial, aqui no hay que forzar nada.
   */
  const continuar = () => {
    if (!etapaVisible) return;
    const items = Array.isArray(etapaVisible.actividades) ? etapaVisible.actividades : [];
    const i = items.findIndex((a) => a.id === itemActual);
    const siguiente = items[i + 1];
    if (siguiente) {
      setItemActual(siguiente.id);
      setItemTerminado(!!siguiente.completada);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      salirDeEtapa();
    }
  };

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
      /*
       * El paso se arma en pantalla como un rompecabezas, pero lo que viaja es
       * la lista de huecos: la comparacion mathematica la hace el servidor
       * hueco por hueco (ruta_comparar), no sobre el texto del paso.
       *
       * Es la decision correcta y no solo la comoda: el texto del paso lo
       * escribio el docente y es el mismo para todos, asi que compararlo no
       * anade informacion; lo que si vary es lo que el estudiante pone en cada
       * hueco, y eso se valida con equivalencia numerica (3 = 3,0 = 3,00 y
       * 1/2 = 0,5 dan igual). Comparar el paso entero como cadena, ademas,
       * fallaria siempre: el motor no puede evaluar `a² = 3² + 4²` porque la
       * variable no es un numero.
       */
      const espacios: RespuestaEspacio[] = [];
      let hayAlguno = false;
      pasos.forEach((paso, indicePaso) => {
        for (let i = 0; i < (paso.espacios || 0); i++) {
          const clave = claveEspacio(indicePaso, i);
          const valor = (b.espacios[clave] ?? '').trim();
          if (valor) hayAlguno = true;
          // Se manda SIEMPRE la lista completa, vacia o no. El servidor exige
          // el envio completo y asi el estudiante ve de un vistazo que le falta.
          espacios.push({ paso: indicePaso + 1, espacio: i + 1, valor });
        }
      });
      return hayAlguno ? { espacios } : null;
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
      //
      // La RPC avisa explicitamente con `actividad_completada`, que es la senal
      // fiable; la comparacion con la ultima pregunta queda como red de
      // seguridad por si el servidor devuelve el payload viejo.
      const preguntas = Array.isArray(actividad.preguntas) ? actividad.preguntas : [];
      const ultima = preguntas[preguntas.length - 1];
      const completo = veredicto.actividad_completada || (veredicto.correcto && ultima?.id === pregunta.id);
      if (completo) {
        setItemTerminado(true);
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

  /* ── Pantalla de un solo item ── */
  if (etapaVisible && itemVisible) {
    const items = Array.isArray(etapaVisible.actividades) ? etapaVisible.actividades : [];
    // Un item sin preguntas no tiene nada que responder, y sin preguntas NUNCA
    // llega a "completada" (eso solo lo decide un intento). Antes, en el
    // acordeon, el estudiante simply salia de la etapa; con la secuencia
    // obligatoria eso lo dejaba atrapado para siempre en una tarjeta vacia,
    // sin poder avanzar ni con la etapa entera bloqueada. Se trata como
    // siempre resuelto: no hay nada que confirmar, asi que se puede pasar.
    const sinPreguntas = !Array.isArray(itemVisible.preguntas) || itemVisible.preguntas.length === 0;
    return (
      <div className="pt-2 px-5 pb-10 max-w-3xl">
        <button
          onClick={salirDeEtapa}
          className="flex items-center text-xs font-bold mb-4 text-neutral-600 hover:text-black transition-colors"
        >
          <ArrowLeft size={14} className="mr-1.5" /> Salir de la etapa
        </button>

        <header className="bg-white border border-neutral-200 rounded-2xl p-5 mb-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 mb-1">
            {etapaVisible.titulo}
          </p>
          {/* La descripcion de la etapa se mostraba al desplegar el acordeon y
              al quitarlo se perdia de vista. Va en la cabecera del item, que es
              donde el esta leyendo. */}
          {etapaVisible.descripcion && (
            <p className="text-[13px] text-neutral-600 leading-relaxed mb-3">
              {etapaVisible.descripcion}
            </p>
          )}
          <h1 className="text-lg md:text-xl font-bold text-black tracking-tight mb-3">
            Item {items.findIndex((a) => a.id === itemVisible.id) + 1} de {items.length}
          </h1>
          <ProgresoItems
            total={items.length}
            actual={items.findIndex((a) => a.id === itemVisible.id)}
            terminados={items.map((a) => a.completada)}
          />
        </header>

        <ItemEnCurso
          actividad={itemVisible}
          bloqueada={!etapaVisible.desbloqueada}
          terminado={itemTerminado || sinPreguntas}
          esUltimo={items.findIndex((a) => a.id === itemVisible.id) === items.length - 1}
          borrador={borrador}
          setCampo={setCampo}
          veredicto={(preguntaId) => veredictos[preguntaId]}
          errorDe={(preguntaId) => errorPregunta[preguntaId]}
          pistaAbierta={pistaAbierta}
          setPistaAbierta={setPistaAbierta}
          enviando={enviando}
          onEnviar={enviar}
          onContinuar={continuar}
        />
      </div>
    );
  }

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

        {/* Puntaje ponderado. Se separa del avance a proposito: "hice 4 de 6
            items" y "saque 72 de 100" son dos cosas distintas y confundirlas
            hace creer al estudiante que el esfuerzo es la nota. El total lo
            calcula el servidor (ruta_puntajes_ruta) con los pesos que fijo el
            docente, no contando items. */}
        {total > 0 && (
          <div className="mt-4 pt-4 border-t border-neutral-100 flex items-center gap-3">
            <div className="flex-1 h-2 rounded-full bg-neutral-100 overflow-hidden">
              <div
                className="h-full rounded-full bg-[#689C63] transition-all duration-500"
                style={{ width: `${Math.min(100, ruta.puntaje)}%` }}
              />
            </div>
            <span className="text-xs font-bold text-[#4a7a46] tabular-nums shrink-0">
              {redondearPuntaje(ruta.puntaje)} / 100
            </span>
          </div>
        )}
      </header>

      <div className="mb-4">
        <h2 className="text-lg font-bold text-black tracking-tight">Misiones</h2>
      </div>

      {etapas.length === 0 && (
        <p className="text-sm text-neutral-500 text-center py-10">
          Esta ficha todavía no tiene misiones.
        </p>
      )}

      <div className="space-y-3">
        {etapas.map((etapa, indice) => (
          <Etapa
            key={etapa.id}
            etapa={etapa}
            indice={indice}
            onEntrar={() => entrarAEtapa(etapa)}
          />
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Piezas
   ───────────────────────────────────────────────────────────────────────── */

/**
 * Donde estoy dentro de la etapa: un punto por item.
 *
 *Lleno = completado, con anillo = el que estas resolviendo, hueco = lo que
 *falta. Es la misma idea de Duolingo pero con los recursos de CIELO: puntos
 *chicos, sin bordes, sin iconos ajenos. Responde de un vistazo "cuantos
 *items tiene, cual hago y cuales me faltan", que es lo unico que hace falta.
 */
function ProgresoItems({
  total,
  actual,
  terminados,
}: {
  total: number;
  actual: number;
  terminados: boolean[];
}) {
  if (total === 0) return null;
  // `actual` es -1 cuando no hay item en pantalla (etapa bloqueada): sin este
  // caso el lector de pantalla anunciaba "Item 0 de 4".
  const etiqueta =
    actual >= 0
      ? `Item ${actual + 1} de ${total}`
      : `${terminados.filter(Boolean).length} de ${total} items completados`;
  return (
    <div className="flex items-center gap-1.5" role="img" aria-label={etiqueta}>
      {Array.from({ length: total }, (_, i) => {
        const esActual = i === actual;
        const hecho = terminados[i];
        return (
          <span
            key={i}
            className={`h-2.5 rounded-full transition-all ${
              esActual
                ? 'w-6 bg-black'
                : hecho
                  ? 'w-2.5 bg-[#689C63]'
                  : 'w-2.5 bg-neutral-200'
            }`}
          />
        );
      })}
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
  onEntrar: () => void;
}

/**
 * Tarjeta de etapa en la lista. No despliega items: entrar es un paso aparte.
 *
 * Antes esta tarjeta era un acordeon y mostraba todos los items de una vez. Con
 * un solo item en pantalla, abrir la etapa tiene que LLEVAR al item, no
 * esconderlo tras un desplegable: si no, el estudiante aterriza en la misma
 * pared larga de antes y el cambio no sirve de nada.
 */
function Etapa({ etapa, indice, onEntrar }: EtapaProps) {
  const bloqueada = !etapa.desbloqueada;
  const items = Array.isArray(etapa.actividades) ? etapa.actividades : [];
  const hechos = items.filter((a) => a.completada).length;
  const vacia = items.length === 0;
  // Items que el docente todavia no ha llenado de preguntas. Entrar en uno no
  // muestra nada que responder, asi que se avisa aqui y no al-deadlock del
  // estudiante dentro de la etapa.
  const sinPreguntas = items.filter(
    (a) => !Array.isArray(a.preguntas) || a.preguntas.length === 0,
  ).length;

  return (
    <section className="bg-white border border-neutral-200 rounded-2xl overflow-hidden">
      <button
        onClick={onEntrar}
        disabled={bloqueada || vacia}
        className="w-full flex items-center gap-3 px-5 py-4 text-left disabled:cursor-default"
      >
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
          {bloqueada ? (
            <span className="block text-[11px] text-neutral-500">
              Completa la etapa anterior para abrirla
            </span>
          ) : vacia ? (
            <span className="block text-[11px] text-neutral-500">Todavía no tiene items</span>
          ) : (
            <span className="block text-[11px] text-neutral-500 tabular-nums">
              {hechos}/{items.length} items · {redondearPuntaje(etapa.peso)} % de la ruta
            </span>
          )}
        </span>

        {etapa.completada && (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-black bg-neutral-200 px-1.5 py-0.5 rounded-full shrink-0">
            <Check size={9} /> Completada
          </span>
        )}

        {!bloqueada && !vacia && sinPreguntas > 0 && (
          <span
            className="inline-flex items-center gap-1 text-[10px] font-bold text-[#8a6d2f] bg-[#d8b45a]/18 px-1.5 py-0.5 rounded-full shrink-0"
            title={`${sinPreguntas} item(s) sin preguntas`}
          >
            <CircleAlert size={9} /> {sinPreguntas} sin preguntas
          </span>
        )}

        {!bloqueada && !vacia && (
          <span className="text-[10px] font-bold uppercase tracking-wide text-neutral-400 shrink-0">
            Entrar
          </span>
        )}
      </button>

      {bloqueada && (
        <div className="px-5 pb-4 -mt-1">
          <ProgresoItems total={items.length} actual={-1} terminados={items.map((a) => a.completada)} />
        </div>
      )}
    </section>
  );
}

interface ItemEnCursoProps {
  actividad: ActividadEstudiante;
  bloqueada: boolean;
  /** El item ya quedo resuelto: habilita Continuar. */
  terminado: boolean;
  esUltimo: boolean;
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
  onContinuar: () => void;
}

/**
 * Un item, en su propia pantalla.
 *
 * Es la unica actividad que se monta. Al terminar, el item no se sustituye en
 * el sitio: aparece el boton Continuar, y el siguiente item entra como pantalla
 * nueva. Asi el estudiante nunca ve los dos a la vez, que es el punto.
 */
function ItemEnCurso({
  actividad,
  bloqueada,
  terminado,
  esUltimo,
  borrador,
  setCampo,
  veredicto,
  errorDe,
  pistaAbierta,
  setPistaAbierta,
  enviando,
  onEnviar,
  onContinuar,
}: ItemEnCursoProps) {
  const { token, sessionToken } = usePortal();
  const [mostrandoFormEvidencia, setMostrandoFormEvidencia] = useState(false);

  // El RPC devuelve JSONB: ninguna coleccion viene garantizada como arreglo.
  // Toda lectura se pasa por `?? []` para que un payload inesperado caiga en un
  // estado vacio visible y no en un TypeError de render (pantalla en blanco).
  const datos = Array.isArray(actividad.config?.datos) ? actividad.config.datos : [];
  const preguntas = Array.isArray(actividad.preguntas) ? actividad.preguntas : [];
  const solicitaProducto = actividad.config?.solicita_producto;
  const nombreProducto = actividad.config?.nombre_producto;
  const instruccionProducto = actividad.config?.instruccion_producto;

  return (
    <>
      <div
        className={`bg-white border rounded-2xl p-5 ${
          actividad.completada ? 'border-black/15' : 'border-neutral-200'
        }`}
      >
        <div className="flex items-center gap-2 mb-2">
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
          <span className="flex-1" />
          <span className="text-[10px] font-bold text-neutral-500 tabular-nums shrink-0">
            {redondearPuntaje(actividad.peso)} % · {redondearPuntaje(actividad.puntaje)} / 100
          </span>
        </div>

        {actividad.titulo && (
          <h2 className="text-lg font-bold text-black tracking-tight mb-1">{actividad.titulo}</h2>
        )}

        {datos.length > 0 && (
          <div className="my-4 p-3 rounded-lg bg-neutral-50 border border-neutral-100">
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

        {preguntas.length === 0 ? (
          <div className="rounded-xl border border-dashed border-neutral-200 bg-neutral-50 px-4 py-6 text-center">
            <p className="text-[13px] font-semibold text-neutral-700 mb-1">
              Este item todavía no tiene preguntas
            </p>
            <p className="text-[12px] text-neutral-500 leading-relaxed">
              No hay nada que responder. Puedes seguir con el siguiente item.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {preguntas.map((pregunta) => (
              <Pregunta
                key={pregunta.id}
                pregunta={pregunta}
                seleccionMultiple={actividad.tipo === 'opcion_multiple'}
                bloqueada={bloqueada || terminado}
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
        )}
      </div>

      {/* El boton aparece SOLO al resolver. Antes no esta porque no hay nada que
          confirmar: todavia se esta trabajando el item. */}
      {terminado && (
        <div className="mt-4 flex justify-end">
          <button
            onClick={onContinuar}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-black text-white text-xs font-bold rounded-xl hover:bg-neutral-800 transition-colors"
          >
            {esUltimo ? 'Terminar etapa' : 'Continuar'}
            <ChevronDown size={14} className="-rotate-90" />
          </button>
        </div>
      )}

      {solicitaProducto && actividad.actividad_origen_id && (
        <div className="mt-4 bg-white border border-neutral-200 rounded-2xl p-5">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <Upload size={20} />
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-black">
                {nombreProducto || 'Subir producto solicitado'}
              </p>
              {instruccionProducto && (
                <p className="text-xs text-neutral-600 mt-1 leading-relaxed">
                  {instruccionProducto}
                </p>
              )}
              <div className="mt-3">
                <button
                  onClick={() => setMostrandoFormEvidencia(true)}
                  disabled={bloqueada}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Upload size={14} /> Subir producto
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {mostrandoFormEvidencia && sessionToken && actividad.actividad_origen_id && (
        <PortalEvidenciaForm
          sessionToken={sessionToken}
          token={token}
          actividades={[{
            actividad_id: actividad.actividad_origen_id,
            actividad: actividad.titulo || 'Actividad',
            asignatura: actividad.tipo_etiqueta,
            fecha: null,
            periodo: null,
            ficha_id: null,
            ficha: null,
            evidencias: 0
          }]}
          actividadInicial={actividad.actividad_origen_id}
          onCerrar={() => setMostrandoFormEvidencia(false)}
          onGuardada={() => {
            setMostrandoFormEvidencia(false);
            // Notificamos exito con un toast
            alert('Producto entregado con éxito');
          }}
        />
      )}
    </>
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
  const porRompecabezas = esProcedimiento && pasos.some((p) => (p.piezas?.length ?? 0) > 0);

  // Correcto/incorrecto por hueco, para resaltar solo lo que fallo.
  const porEspacio = useMemo(() => {
    const mapa = new Map<string, boolean>();
    for (const d of (veredicto?.detalleEspacios ?? []) as DetalleEspacio[]) {
      mapa.set(claveEspacio(d.paso - 1, (d.espacio ?? 1) - 1), d.correcto);
    }
    return mapa;
  }, [veredicto]);

  /**
   * En rompecabezas el paso va entero o no va: no tiene sentido "Comprobar" con
   * la mitad de los huecos. En los items viejos por hueco si se permite, porque
   * ahi el envio parcial si es una respuesta valida.
   */
  const faltanHuecos =
    porRompecabezas &&
    pasos.some((paso, i) =>
      Array.from({ length: paso.espacios ?? 0 }, (_, j) => borrador.espacios[claveEspacio(i, j)] ?? '').some(
        (v) => !v.trim(),
      ),
    );

  const alternarOpcion = (opcionId: string) => {    if (resuelta) return;
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
                  ? porRompecabezas
                    ? `Va ${veredicto.parciales} de ${veredicto.totalEspacios} pasos`
                    : `Vas ${veredicto.parciales} de ${veredicto.totalEspacios} espacios`
                  : 'Todavía no es correcto'}
            </p>
            {veredicto.retroalimentacion && (
              <p className="text-xs text-neutral-700 leading-relaxed mt-0.5">
                {veredicto.retroalimentacion}
              </p>
            )}
            {/* El puntaje se muestra en cuanto el servidor lo calcula, sin
                esperar al recarga: da la sensacion de que la respuesta cuenta
                y evita que el estudiante vuelva a comprobar lo mismo. */}
            {veredicto.puntaje_actividad !== undefined && (
              <p className="text-[11px] font-bold text-neutral-600 tabular-nums mt-1">
                Este item vale {redondearPuntaje(veredicto.puntaje_actividad)} / 100
              </p>
            )}
            {veredicto.actividad_completada && (
              <p className="text-[11px] text-[#4a7a46] mt-0.5">
                Item completado. Tu nota quedó registrada en Calificaciones.
              </p>
            )}
          </div>
        </div>
      )}

      {faltanHuecos && (
        <p className="text-[11px] text-neutral-500 mt-2">Completa todos los huecos de los pasos para comprobar.</p>
      )}

      {!resuelta && (
        <button
          onClick={onEnviar}
          disabled={bloqueada || enviando || faltanHuecos}
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
  // Piezas del paso, o las del hueco si el docente las puso una por una.
  const piezasPaso = paso.piezas ?? [];

  const clasesHueco = (acierto: boolean | undefined) =>
    `inline-block w-16 px-2 py-0.5 mx-0.5 font-mono text-sm text-center border-b-2 bg-transparent focus:outline-none focus:border-black transition-colors disabled:text-neutral-500 ${
      acierto === true
        ? 'border-[#689C63] text-[#4a7a46]'
        : acierto === false
          ? 'border-red-400 text-red-600'
          : 'border-neutral-300'
    }`;

  /** Hueco con teclado matematico controlado: sin teclado libre. */
  const huecoControlado = (indiceHueco: number) => {
    const clave = claveEspacio(indicePaso, indiceHueco);
    const acierto = porEspacio.get(clave);
    const piezas = piezasPaso.length > 0 ? piezasPaso : (paso.espaciosPublicos?.[indiceHueco]?.piezas ?? []);
    const pista = paso.espaciosPublicos?.[indiceHueco]?.pista;
    const valor = valores[clave] ?? '';
    const quitar = () => onChange(clave, valor.slice(0, -1));
    const borrar = () => onChange(clave, '');

    return (
      <span key={clave} className="inline-flex flex-col items-start align-top mx-1 my-1">
        <span
          className={`inline-block w-16 px-2 py-0.5 font-mono text-sm text-center border-b-2 bg-transparent ${
            acierto === true
              ? 'border-[#689C63] text-[#4a7a46]'
              : acierto === false
                ? 'border-red-400 text-red-600'
                : 'border-neutral-300'
          }`}
        >
          {valor || <span className="text-neutral-300">·</span>}
        </span>
        {!disabled && piezas.length > 0 && (
          <span className="flex flex-wrap gap-1 mt-1 max-w-56">
            {piezas.map((pieza, i) => (
              <button
                key={`${pieza.valor}-${i}`}
                type="button"
                onClick={() => onChange(clave, valor + pieza.valor)}
                aria-label={`Agregar ${pieza.valor} al hueco ${indiceHueco + 1} del paso ${indicePaso + 1}`}
                className="min-w-6 h-6 px-1.5 rounded-md border border-neutral-300 bg-white text-[11px] font-mono font-bold text-neutral-700 hover:border-black hover:bg-neutral-50 active:scale-95 transition-all"
              >
                {pieza.valor}
              </button>
            ))}
            <button
              type="button"
              onClick={quitar}
              disabled={!valor}
              aria-label={`Borrar el ultimo digito del hueco ${indiceHueco + 1}`}
              className="min-w-6 h-6 px-1.5 rounded-md border border-neutral-200 bg-white text-[11px] font-bold text-neutral-500 hover:border-black disabled:opacity-30 transition-colors"
            >
              ⌫
            </button>
            <button
              type="button"
              onClick={borrar}
              disabled={!valor}
              aria-label={`Limpiar el hueco ${indiceHueco + 1}`}
              className="min-w-6 h-6 px-1.5 rounded-md border border-neutral-200 bg-white text-[11px] font-bold text-neutral-500 hover:border-red-400 hover:text-red-600 disabled:opacity-30 transition-colors"
            >
              ×
            </button>
          </span>
        )}
        {pista && <span className="text-[10px] text-amber-700 mt-0.5 max-w-56">{pista}</span>}
      </span>
    );
  };

  /** Hueco clasico de texto libre: items viejos que no traen piezas. */
  const input = (indiceHueco: number) => {
    const clave = claveEspacio(indicePaso, indiceHueco);
    return (
      <input
        key={clave}
        type="text"
        value={valores[clave] ?? ''}
        onChange={(e) => onChange(clave, e.target.value)}
        disabled={disabled}
        aria-label={`Hueco del paso ${indicePaso + 1}`}
        className={clasesHueco(porEspacio.get(clave))}
      />
    );
  };

  const hueco = (indiceHueco: number) =>
    piezasPaso.length > 0 || (paso.espaciosPublicos?.[indiceHueco]?.piezas?.length ?? 0) > 0
      ? huecoControlado(indiceHueco)
      : input(indiceHueco);

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
            hueco(parte.indice)
          ) : (
            <span key={i} className="text-neutral-400">[&nbsp;&nbsp;]</span>
          ),
        )}
        {/* Huecos declarados que el texto no muestra: se agregan al final para
            que el estudiante pueda contestarlos y el servidor los evalue. */}
        {Array.from({ length: extra }, (_, i) => (
          <span key={`extra-${i}`} className="inline-flex items-center ml-2">
            {i === 0 && <span className="text-neutral-400">respuesta: </span>}
            {hueco(huecosEnTexto + i)}
          </span>
        ))}
      </p>
    </div>
  );
}
