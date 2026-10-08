import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from 'react';
import { ArrowLeft, ArrowRight, Check, ChevronRight, ClipboardList, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAppStore } from '../../store/appStore';
import { useEspecificacionesStore } from '../../store/especificacionesStore';
import { useCombinacionesCurriculares } from '../../hooks/useCombinacionesCurriculares';
import { PERIODOS_ACADEMICOS } from '../../cache/academicCache';
import {
  BLOQUES_CF,
  configuracionCompleta,
  crearCompetenciasBase,
  filtrarContenidos,
  filtrarIndicadores,
} from '../../lib/curriculo';
import type {
  CombinacionCurricular,
  CompetenciaCurricular,
  FilaContenido,
  FilaIndicador,
} from '../../types/especificaciones';

const PASOS = [
  { numero: 1, etiqueta: 'Competencias' },
  { numero: 2, etiqueta: 'CE del período' },
  { numero: 3, etiqueta: 'Contenidos' },
  { numero: 4, etiqueta: 'Indicadores' },
] as const;

const claveCF = (cf: CompetenciaCurricular) => `${cf.bloque}|${cf.nombre}`;

const estiloBotonPrimario =
  'px-5 h-10 rounded-full bg-[#689C63] text-white font-bold text-[13px] hover:bg-[#5a8a55] transition-all shadow-sm flex items-center gap-2 active:scale-95 disabled:opacity-50 disabled:pointer-events-none';

const estiloBotonSecundario =
  'px-4 h-10 rounded-full border border-[#2E3330]/15 text-[#2E3330] font-bold text-[13px] hover:bg-[#2E3330]/5 transition-all flex items-center gap-2 disabled:opacity-40 disabled:pointer-events-none';

export default function EspecificacionesCurriculares() {
  const session = useAppStore((s) => s.session);
  const setGenericToast = useAppStore((s) => s.setGenericToast);
  const combinaciones = useCombinacionesCurriculares();

  const {
    especificaciones,
    fetchEspecificaciones,
    getEspecificacion,
    guardarBase,
    fetchPeriodo,
    guardarPeriodo,
  } = useEspecificacionesStore();

  const [pantalla, setPantalla] = useState<'lista' | 'recorrido'>('lista');
  const [combo, setCombo] = useState<CombinacionCurricular | null>(null);
  const [paso, setPaso] = useState<number>(1);
  const [periodo, setPeriodo] = useState<string>('P1');
  const [competencias, setCompetencias] = useState<CompetenciaCurricular[]>(crearCompetenciasBase);
  const [ceSeleccionadas, setCeSeleccionadas] = useState<Set<string>>(new Set());
  const [contenidosSel, setContenidosSel] = useState<Set<string>>(new Set());
  const [indicadoresSel, setIndicadoresSel] = useState<Set<string>>(new Set());
  const [contenidos, setContenidos] = useState<FilaContenido[]>([]);
  const [indicadores, setIndicadores] = useState<FilaIndicador[]>([]);
  const [cargandoCatalogo, setCargandoCatalogo] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const [periodoCargado, setPeriodoCargado] = useState<string | null>(null);

  const periodoRef = useRef<string>(periodo);
  periodoRef.current = periodo;
  const cargaTokenRef = useRef(0);

  const espec = useMemo(() => {
    if (!combo) return undefined;
    return especificaciones.find(
      (e) => e.curso_id === combo.cursoId && e.asignatura === combo.asignatura
    );
  }, [especificaciones, combo]);

  const usuarioId = session?.user?.id;

  useEffect(() => {
    if (usuarioId) fetchEspecificaciones(usuarioId);
  }, [usuarioId, fetchEspecificaciones]);

  /* ---------------- Catálogo curricular del grado + asignatura ---------------- */
  useEffect(() => {
    if (pantalla !== 'recorrido' || !combo) return;
    let cancelado = false;
    (async () => {
      setCargandoCatalogo(true);
      try {
        const [inds, conts] = await Promise.all([
          supabase
            .from('curr_indicadores')
            .select('id, grado, asignatura, competencia, codigo, descripcion, is_active')
            .eq('grado', combo.grado),
          supabase
            .from('curr_contenidos')
            .select('id, grado, asignatura, contenido')
            .eq('grado', combo.grado),
        ]);
        if (cancelado) return;
        setIndicadores(filtrarIndicadores((inds.data as FilaIndicador[]) || [], combo.grado, combo.asignatura));
        setContenidos(filtrarContenidos((conts.data as FilaContenido[]) || [], combo.grado, combo.asignatura));
      } finally {
        if (!cancelado) setCargandoCatalogo(false);
      }
    })();
    return () => {
      cancelado = true;
    };
  }, [pantalla, combo]);

  /* ---------------- Carga de las selecciones del período activo ---------------- */
  useEffect(() => {
    if (pantalla !== 'recorrido' || paso < 2 || !combo || !espec) return;
    const clave = `${espec.id}|${periodo}`;
    if (periodoCargado === clave) return;

    const token = ++cargaTokenRef.current;
    (async () => {
      const guardada = useEspecificacionesStore.getState().getPeriodo(espec.id, periodo);
      const fila = guardada ?? (await fetchPeriodo(espec.id, periodo)) ?? undefined;
      if (cargaTokenRef.current !== token || periodoRef.current !== periodo) return;

      setCeSeleccionadas(new Set((fila?.competencias_especificas || []).map(claveCF)));
      setContenidosSel(new Set((fila?.contenidos || []).map((c) => c.contenido_id)));
      setIndicadoresSel(new Set((fila?.indicadores || []).map((i) => i.curr_indicador_id)));
      setPeriodoCargado(clave);
    })();
  }, [pantalla, paso, combo, espec, periodo, periodoCargado, fetchPeriodo]);

  /* ---------------- Persistencia ---------------- */
  const persistirBase = useCallback(
    async (pasoDestino: number) => {
      if (!usuarioId || !combo) return null;
      return guardarBase(usuarioId, combo, competencias, pasoDestino, periodo);
    },
    [usuarioId, combo, competencias, periodo, guardarBase]
  );

  const datosPeriodo = useCallback(
    () => ({
      competencias_especificas: competencias.filter((c) => ceSeleccionadas.has(claveCF(c))),
      contenidos: contenidos
        .filter((c) => contenidosSel.has(c.id))
        .map((c) => ({ contenido_id: c.id, contenido: c.contenido })),
      indicadores: indicadores
        .filter((i) => indicadoresSel.has(i.id))
        .map((i) => ({ curr_indicador_id: i.id, codigo: i.codigo })),
    }),
    [competencias, ceSeleccionadas, contenidos, contenidosSel, indicadores, indicadoresSel]
  );

  /** Guarda el estado actual (base + selecciones del período) antes de moverse de paso o salir. */
  const persistir = useCallback(
    async (pasoDestino: number): Promise<string | null> => {
      setGuardando(true);
      try {
        const base = await persistirBase(pasoDestino);
        if (!base) return null;
        // Solo hay selecciones de período cuando se está trabajando en los pasos 2-4.
        if (pasoDestino >= 2 || paso >= 2) {
          await guardarPeriodo(base.id, periodo, datosPeriodo());
        }
        return base.id;
      } finally {
        setGuardando(false);
      }
    },
    [persistirBase, guardarPeriodo, datosPeriodo, periodo, paso]
  );

  /* ---------------- Navegación del recorrido ---------------- */
  const abrirCombo = useCallback(
    (c: CombinacionCurricular) => {
      const guardada = getEspecificacion(c);
      const base =
        guardada && configuracionCompleta(guardada.competencias)
          ? guardada.competencias
          : crearCompetenciasBase();
      const periodoGuardado =
        guardada?.periodo_actual &&
        (PERIODOS_ACADEMICOS as readonly string[]).includes(guardada.periodo_actual)
          ? guardada.periodo_actual
          : 'P1';

      setCombo(c);
      setCompetencias(base);
      setCeSeleccionadas(new Set());
      setContenidosSel(new Set());
      setIndicadoresSel(new Set());
      setPeriodo(periodoGuardado);
      periodoRef.current = periodoGuardado;
      setPeriodoCargado(null);
      setAviso(null);
      setPaso(configuracionCompleta(base) && guardada ? guardada.paso_actual || 1 : 1);
      setPantalla('recorrido');
    },
    [getEspecificacion]
  );

  const irAPaso = useCallback(
    async (destino: number) => {
      if (!combo || destino === paso) return;
      if (destino > 1 && !configuracionCompleta(competencias)) {
        setAviso('Completa las 7 competencias (código y descriptor) para continuar.');
        return;
      }
      setAviso(null);
      const guardado = await persistir(destino);
      if (destino >= 2 && !guardado) {
        setAviso('No se pudo guardar la configuración. Intenta de nuevo.');
        return;
      }
      setPaso(destino);
    },
    [combo, paso, competencias, persistir]
  );

  const cambiarPeriodo = useCallback(
    async (nuevo: string) => {
      if (nuevo === periodo || !espec) return;
      setGuardando(true);
      try {
        await guardarPeriodo(espec.id, periodo, datosPeriodo());
      } finally {
        setGuardando(false);
      }
      setPeriodo(nuevo);
      periodoRef.current = nuevo;
      setPeriodoCargado(null);
    },
    [periodo, espec, guardarPeriodo, datosPeriodo]
  );

  const siguiente = useCallback(async () => {
    if (paso === 1) {
      if (!configuracionCompleta(competencias)) {
        setAviso('Completa las 7 competencias (código y descriptor) para continuar.');
        return;
      }
      await irAPaso(2);
      return;
    }
    if (paso < 4) {
      await irAPaso(paso + 1);
      return;
    }
    // Finalizar
    setGuardando(true);
    try {
      await persistir(4);
      if (usuarioId) await fetchEspecificaciones(usuarioId, true);
      setGenericToast({ message: 'Especificación curricular guardada.', type: 'success' });
      setPantalla('lista');
      setCombo(null);
    } finally {
      setGuardando(false);
    }
  }, [paso, competencias, irAPaso, persistir, usuarioId, fetchEspecificaciones, setGenericToast]);

  const salir = useCallback(async () => {
    setGuardando(true);
    try {
      await persistir(paso);
      if (usuarioId) await fetchEspecificaciones(usuarioId, true);
    } finally {
      setGuardando(false);
      setPantalla('lista');
      setCombo(null);
    }
  }, [persistir, paso, usuarioId, fetchEspecificaciones]);

  const actualizarCF = (nombre: string, patch: Partial<CompetenciaCurricular>) => {
    setAviso(null);
    setCompetencias((prev) => prev.map((cf) => (cf.nombre === nombre ? { ...cf, ...patch } : cf)));
  };

  const alternar = (setter: Dispatch<SetStateAction<Set<string>>>, id: string) => {
    setter((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const pendientes = combinaciones.filter(
    (c) => !configuracionCompleta(getEspecificacion(c)?.competencias)
  ).length;

  /* ================================ LISTA ================================ */
  if (pantalla === 'lista') {
    return (
      <div className="min-h-screen bg-white" style={{ fontFamily: 'Manrope, Inter, system-ui' }}>
        <main className="px-4 sm:px-8 py-7 max-w-4xl w-full mx-auto flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2.5">
              <span className="w-9 h-9 rounded-full bg-[#689C63]/10 flex items-center justify-center">
                <ClipboardList size={18} className="text-[#689C63]" />
              </span>
              <h1 className="font-bold text-[26px] md:text-[30px] text-[#2E3330] tracking-tight">
                Especificaciones curriculares
              </h1>
            </div>
            <p className="text-[#2E3330]/70 text-[15px] leading-relaxed max-w-2xl">
              Hola, vamos a organizar tus especificaciones curriculares de tus cursos, para ayudarte
              con tus planes de clase y las especificaciones en los registros.
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <h2 className="text-[15px] font-bold text-[#2E3330]">¿Por cuál quieres comenzar?</h2>

            {combinaciones.length === 0 ? (
              <div className="rounded-3xl border border-[#2E3330]/10 border-dashed p-8 text-center">
                <p className="font-bold text-[#2E3330]">No tienes cursos con asignaturas asignadas</p>
                <p className="text-[14px] text-[#2E3330]/60 mt-1">
                  Vincula tus asignaturas desde Cursos para organizar tus especificaciones.
                </p>
              </div>
            ) : (
              <ul className="flex flex-col gap-2.5">
                {combinaciones.map((c) => {
                  const guardada = getEspecificacion(c);
                  const completa = configuracionCompleta(guardada?.competencias);
                  return (
                    <li key={c.key}>
                      <button
                        onClick={() => abrirCombo(c)}
                        className="w-full flex items-center gap-3 text-left rounded-2xl border border-[#2E3330]/10 bg-white p-4 transition-all duration-200 hover:border-[#689C63]/40 hover:shadow-sm active:scale-[0.99]"
                      >
                        <span className="w-10 h-10 shrink-0 rounded-full bg-[#689C63]/10 border border-[#689C63]/20 flex items-center justify-center">
                          <ClipboardList size={17} className="text-[#689C63]" />
                        </span>
                        <span className="flex-1 min-w-0">
                          <span className="block font-extrabold text-[15px] text-[#2E3330] truncate">
                            {c.cursoNombre} — {c.asignaturaNombre}
                          </span>
                          <span className="block text-[12px] font-semibold text-[#2E3330]/50 mt-0.5">
                            {c.grado} · {c.seccion}
                          </span>
                        </span>
                        <span
                          className={`px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider shrink-0 ${
                            completa
                              ? 'bg-[#689C63]/10 text-[#689C63]'
                              : 'bg-[#2E3330]/5 text-[#2E3330]/55'
                          }`}
                        >
                          {completa ? 'Configurada' : 'Pendiente'}
                        </span>
                        <ChevronRight size={18} className="text-[#2E3330]/30 shrink-0" />
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {combinaciones.length > 0 && (
            <p className="text-[13px] font-semibold text-[#2E3330]/50">
              {combinaciones.length - pendientes} de {combinaciones.length} configurada
              {combinaciones.length - pendientes !== 1 ? 's' : ''} · {pendientes} pendiente
              {pendientes !== 1 ? 's' : ''}
            </p>
          )}
        </main>
      </div>
    );
  }

  /* ================================ RECORRIDO ================================ */
  const bloquesConCF = BLOQUES_CF.map((b) => ({
    ...b,
    items: competencias.filter((cf) => cf.bloque === b.bloque),
  }));

  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: 'Manrope, Inter, system-ui' }}>
      <main className="px-4 sm:px-8 py-7 max-w-4xl w-full mx-auto flex flex-col gap-5">
        {/* Cabecera */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={salir}
              disabled={guardando}
              className={estiloBotonSecundario}
              title="Volver"
            >
              <ArrowLeft size={15} /> Atrás
            </button>
            <div className="flex flex-col">
              <h1 className="font-bold text-[20px] text-[#2E3330] tracking-tight leading-tight">
                {combo?.cursoNombre} — {combo?.asignaturaNombre}
              </h1>
              <p className="text-[12px] font-semibold text-[#2E3330]/50">
                {combo?.grado} · Sección {combo?.seccion}
              </p>
            </div>
          </div>

          {/* Indicador de progreso */}
          <ol className="flex flex-wrap items-center gap-1.5">
            {PASOS.map((p) => {
              const activo = p.numero === paso;
              const alcanzable = p.numero === 1 || configuracionCompleta(competencias);
              return (
                <li key={p.numero} className="flex items-center gap-1.5">
                  <button
                    onClick={() => alcanzable && irAPaso(p.numero)}
                    disabled={!alcanzable || guardando}
                    className={`px-3 h-7 rounded-full text-[12px] font-bold transition-colors ${
                      activo
                        ? 'bg-[#689C63] text-white'
                        : alcanzable
                        ? 'bg-[#2E3330]/5 text-[#2E3330]/60 hover:bg-[#2E3330]/10'
                        : 'bg-[#2E3330]/5 text-[#2E3330]/30'
                    }`}
                  >
                    {p.numero}. {p.etiqueta}
                  </button>
                  {p.numero < 4 && (
                    <ChevronRight size={12} className="text-[#2E3330]/20 shrink-0" />
                  )}
                </li>
              );
            })}
          </ol>
        </div>

        {aviso && (
          <div className="bg-[#F5BC5D]/15 border border-[#F5BC5D]/40 text-[#8A6412] text-[13px] font-bold px-4 py-2.5 rounded-xl">
            {aviso}
          </div>
        )}

        {/* Selector de período (pasos 2 a 4) */}
        {paso >= 2 && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[12px] font-bold uppercase tracking-wider text-[#2E3330]/50">
              Período
            </span>
            <div className="flex items-center gap-1.5">
              {PERIODOS_ACADEMICOS.map((p) => (
                <button
                  key={p}
                  onClick={() => cambiarPeriodo(p)}
                  disabled={guardando}
                  className={`px-3.5 h-8 rounded-full text-[13px] font-black transition-colors ${
                    periodo === p
                      ? 'bg-[#2E3330] text-white'
                      : 'bg-[#2E3330]/5 text-[#2E3330]/60 hover:bg-[#2E3330]/10'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ---------------- PASO 1: Competencias ---------------- */}
        {paso === 1 && (
          <div className="flex flex-col gap-5">
            <p className="text-[14px] text-[#2E3330]/70">
              Registra la Competencia Específica de cada Competencia Fundamental para este grado y
              asignatura. Solo se hace una vez: después se reutiliza en todos los períodos.
            </p>

            {bloquesConCF.map((b) => (
              <section key={b.bloque} className="flex flex-col gap-2.5">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-full bg-[#689C63]/10 text-[#689C63] text-[11px] font-black tracking-wider">
                    {b.bloque}
                  </span>
                  <span className="text-[12px] font-bold text-[#2E3330]/50">Bloque</span>
                </div>

                {b.items.map((cf) => (
                  <div
                    key={cf.nombre}
                    className="rounded-2xl border border-[#2E3330]/10 bg-white p-4 flex flex-col gap-3"
                  >
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[15px] font-extrabold text-[#2E3330]">{cf.nombre}</span>
                      <span className="text-[11px] font-bold uppercase tracking-wider text-[#2E3330]/40">
                        {cf.bloque}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-[140px_1fr] gap-3">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[11px] font-bold uppercase tracking-wider text-[#2E3330]/50">
                          Código
                        </label>
                        <input
                          value={cf.codigo}
                          onChange={(e) => actualizarCF(cf.nombre, { codigo: e.target.value })}
                          placeholder="CE1"
                          className="h-9 px-3 rounded-xl border border-[#2E3330]/10 text-[14px] font-bold text-[#2E3330] outline-none focus:border-[#689C63] transition-colors"
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[11px] font-bold uppercase tracking-wider text-[#2E3330]/50">
                          Descriptor
                        </label>
                        <textarea
                          value={cf.descriptor}
                          onChange={(e) => actualizarCF(cf.nombre, { descriptor: e.target.value })}
                          rows={2}
                          placeholder="Texto oficial de la competencia específica"
                          className="px-3 py-2 rounded-xl border border-[#2E3330]/10 text-[14px] text-[#2E3330] resize-none outline-none focus:border-[#689C63] transition-colors"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </section>
            ))}
          </div>
        )}

        {/* ---------------- PASO 2: CE del período ---------------- */}
        {paso === 2 && (
          <div className="flex flex-col gap-3">
            <p className="text-[14px] text-[#2E3330]/70">
              Selecciona las competencias específicas que trabajarás en este período.
            </p>
            <ul className="flex flex-col gap-2">
              {competencias.map((cf) => {
                const seleccionada = ceSeleccionadas.has(claveCF(cf));
                return (
                  <li key={claveCF(cf)}>
                    <button
                      onClick={() => alternar(setCeSeleccionadas, claveCF(cf))}
                      className={`w-full flex items-start gap-3 text-left rounded-2xl border p-3.5 transition-all ${
                        seleccionada
                          ? 'border-[#689C63]/50 bg-[#689C63]/5'
                          : 'border-[#2E3330]/10 bg-white hover:border-[#2E3330]/20'
                      }`}
                    >
                      <span
                        className={`w-5 h-5 mt-0.5 shrink-0 rounded-md border flex items-center justify-center ${
                          seleccionada
                            ? 'bg-[#689C63] border-[#689C63]'
                            : 'border-[#2E3330]/25 bg-white'
                        }`}
                      >
                        {seleccionada && <Check size={13} className="text-white" strokeWidth={3} />}
                      </span>
                      <span className="flex-1 min-w-0">
                        <span className="flex flex-wrap items-center gap-2">
                          <span className="px-2 py-0.5 rounded-full bg-[#2E3330]/5 text-[#2E3330] text-[11px] font-black">
                            {cf.codigo}
                          </span>
                          <span className="text-[13px] font-bold text-[#2E3330]">{cf.nombre}</span>
                          <span className="px-1.5 py-0.5 rounded-full bg-[#689C63]/10 text-[#689C63] text-[10px] font-black tracking-wider">
                            {cf.bloque}
                          </span>
                        </span>
                        <span className="block text-[13px] text-[#2E3330]/70 mt-1 leading-snug">
                          {cf.descriptor}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
            <p className="text-[12px] font-semibold text-[#2E3330]/50">
              {ceSeleccionadas.size} de {competencias.length} seleccionadas para {periodo}
            </p>
          </div>
        )}

        {/* ---------------- PASO 3: Contenidos ---------------- */}
        {paso === 3 && (
          <div className="flex flex-col gap-3">
            <p className="text-[14px] text-[#2E3330]/70">
              Selecciona los contenidos que trabajarás en este período.
            </p>
            {cargandoCatalogo ? (
              <div className="flex items-center justify-center py-14">
                <Loader2 size={28} className="animate-spin text-[#689C63]" />
              </div>
            ) : contenidos.length === 0 ? (
              <div className="rounded-3xl border border-[#2E3330]/10 border-dashed p-7 text-center">
                <p className="font-bold text-[#2E3330]">Sin contenidos curriculares disponibles</p>
                <p className="text-[14px] text-[#2E3330]/60 mt-1">
                  No hay contenidos registrados para {combo?.grado} — {combo?.asignaturaNombre}.
                </p>
              </div>
            ) : (
              <ul className="flex flex-col gap-2">
                {contenidos.map((c) => {
                  const seleccionado = contenidosSel.has(c.id);
                  return (
                    <li key={c.id}>
                      <button
                        onClick={() => alternar(setContenidosSel, c.id)}
                        className={`w-full flex items-center gap-3 text-left rounded-2xl border p-3.5 transition-all ${
                          seleccionado
                            ? 'border-[#689C63]/50 bg-[#689C63]/5'
                            : 'border-[#2E3330]/10 bg-white hover:border-[#2E3330]/20'
                        }`}
                      >
                        <span
                          className={`w-5 h-5 shrink-0 rounded-md border flex items-center justify-center ${
                            seleccionado
                              ? 'bg-[#689C63] border-[#689C63]'
                              : 'border-[#2E3330]/25 bg-white'
                          }`}
                        >
                          {seleccionado && <Check size={13} className="text-white" strokeWidth={3} />}
                        </span>
                        <span className="flex-1 text-[14px] font-semibold text-[#2E3330]">
                          {c.contenido}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
            <p className="text-[12px] font-semibold text-[#2E3330]/50">
              {contenidosSel.size} seleccionado{contenidosSel.size !== 1 ? 's' : ''} para {periodo}
            </p>
          </div>
        )}

        {/* ---------------- PASO 4: Indicadores ---------------- */}
        {paso === 4 && (
          <div className="flex flex-col gap-3">
            <p className="text-[14px] text-[#2E3330]/70">
              Selecciona los indicadores que trabajarás en este período.
            </p>
            {cargandoCatalogo ? (
              <div className="flex items-center justify-center py-14">
                <Loader2 size={28} className="animate-spin text-[#689C63]" />
              </div>
            ) : indicadores.length === 0 ? (
              <div className="rounded-3xl border border-[#2E3330]/10 border-dashed p-7 text-center">
                <p className="font-bold text-[#2E3330]">Sin indicadores disponibles</p>
                <p className="text-[14px] text-[#2E3330]/60 mt-1">
                  No hay indicadores registrados para {combo?.grado} — {combo?.asignaturaNombre}.
                </p>
              </div>
            ) : (
              <ul className="flex flex-col gap-2">
                {indicadores.map((i) => {
                  const seleccionado = indicadoresSel.has(i.id);
                  return (
                    <li key={i.id}>
                      <button
                        onClick={() => alternar(setIndicadoresSel, i.id)}
                        className={`w-full flex items-start gap-3 text-left rounded-2xl border p-3.5 transition-all ${
                          seleccionado
                            ? 'border-[#689C63]/50 bg-[#689C63]/5'
                            : 'border-[#2E3330]/10 bg-white hover:border-[#2E3330]/20'
                        }`}
                      >
                        <span
                          className={`w-5 h-5 mt-0.5 shrink-0 rounded-md border flex items-center justify-center ${
                            seleccionado
                              ? 'bg-[#689C63] border-[#689C63]'
                              : 'border-[#2E3330]/25 bg-white'
                          }`}
                        >
                          {seleccionado && <Check size={13} className="text-white" strokeWidth={3} />}
                        </span>
                        <span className="flex-1 min-w-0">
                          <span className="px-2 py-0.5 rounded-full bg-[#2E3330]/5 text-[#2E3330] text-[11px] font-black">
                            {i.codigo || '—'}
                          </span>
                          <span className="block text-[13px] text-[#2E3330]/80 mt-1 leading-snug">
                            {i.descripcion}
                          </span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
            <p className="text-[12px] font-semibold text-[#2E3330]/50">
              {indicadoresSel.size} seleccionado{indicadoresSel.size !== 1 ? 's' : ''} para {periodo}
            </p>
          </div>
        )}

        {/* ---------------- Acciones ---------------- */}
        <div className="flex items-center justify-between gap-3 pt-4 border-t border-[#2E3330]/10">
          <button
            onClick={() => (paso === 1 ? salir() : irAPaso(paso - 1))}
            disabled={guardando}
            className={estiloBotonSecundario}
          >
            <ArrowLeft size={15} /> Atrás
          </button>

          <button onClick={siguiente} disabled={guardando} className={estiloBotonPrimario}>
            {guardando ? (
              <Loader2 size={15} className="animate-spin" />
            ) : paso === 4 ? (
              <Check size={15} />
            ) : (
              <ArrowRight size={15} />
            )}
            {paso === 4 ? 'Guardar' : 'Siguiente'}
          </button>
        </div>
      </main>
    </div>
  );
}
