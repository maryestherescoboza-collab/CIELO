import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from 'react';
import { AlertCircle, ArrowLeft, ArrowRight, BookOpen, Check, ChevronDown, ChevronRight, ChevronUp, ClipboardList, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAppStore } from '../../store/appStore';
import { useEspecificacionesStore } from '../../store/especificacionesStore';
import { useCombinacionesCurriculares } from '../../hooks/useCombinacionesCurriculares';
import { PERIODOS_ACADEMICOS } from '../../cache/academicCache';
import ResumenEspecificaciones from '../../components/plan-clases/ResumenEspecificaciones';
import LeyendaCompetenciasCF from '../../components/plan-clases/LeyendaCompetenciasCF';
import {
  COLORES_BLOQUE_CF,
  bloqueDeIndicador,
  claveGrado,
  configuracionCompleta,
  filtrarCompetenciasEspecificas,
  filtrarContenidos,
  filtrarIndicadores,
} from '../../lib/curriculo';
import type {
  BloqueCF,
  CombinacionCurricular,
  CompetenciaCurricular,
  ContenidoJson,
  FilaCompetenciaEspecifica,
  FilaContenido,
  FilaIndicador,
} from '../../types/especificaciones';

const PASOS = [
  { numero: 1, etiqueta: 'Competencias específicas' },
  { numero: 2, etiqueta: 'Contenidos' },
  { numero: 3, etiqueta: 'Indicadores' },
] as const;

/**
 * Los pasos guardados con la numeración anterior (1 base · 2 CE del período ·
 * 3 contenidos · 4 indicadores) se remapean a la numeración unificada:
 * 1 base + CE del período · 2 contenidos · 3 indicadores.
 */
const normalizarPasoGuardado = (paso: number): number => {
  if (paso >= 4) return 3;
  if (paso === 3) return 2;
  return 1;
};

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
    periodos,
    fetchEspecificaciones,
    getEspecificacion,
    guardarBase,
    fetchPeriodo,
    fetchPeriodos,
    guardarPeriodo,
  } = useEspecificacionesStore();

  const [pantalla, setPantalla] = useState<'lista' | 'recorrido' | 'resumen'>('lista');
  const [combo, setCombo] = useState<CombinacionCurricular | null>(null);
  const [paso, setPaso] = useState<number>(1);
  const [periodo, setPeriodo] = useState<string>('P1');
  const [competenciasCatalogo, setCompetenciasCatalogo] = useState<FilaCompetenciaEspecifica[]>([]);
  const [ceSeleccionadas, setCeSeleccionadas] = useState<Set<string>>(new Set());
  const [contenidosSel, setContenidosSel] = useState<Set<string>>(new Set());
  const [contenidosDetalleSel, setContenidosDetalleSel] = useState<
    Record<
      string,
      {
        conceptos: Set<string>;
        procedimientos: Set<string>;
        actitudes_valores: Set<string>;
      }
    >
  >({});
  const [contenidosExpandidos, setContenidosExpandidos] = useState<Set<string>>(new Set());
  const [indicadoresSel, setIndicadoresSel] = useState<Set<string>>(new Set());
  const [contenidos, setContenidos] = useState<FilaContenido[]>([]);
  const [indicadores, setIndicadores] = useState<FilaIndicador[]>([]);
  const [cargandoCatalogo, setCargandoCatalogo] = useState(false);
  const [cargandoPeriodo, setCargandoPeriodo] = useState(false);
  const [errorCatalogo, setErrorCatalogo] = useState<string | null>(null);
  const [intentoCatalogo, setIntentoCatalogo] = useState(0);
  const [guardando, setGuardando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const [periodoCargado, setPeriodoCargado] = useState<string | null>(null);
  const [cargandoResumen, setCargandoResumen] = useState(false);
  const [puenteCeInd, setPuenteCeInd] = useState<Map<string, string[]>>(new Map());
  /** Clave del combo cuyo catálogo curricular ya terminó de cargarse. */
  const [catalogoListo, setCatalogoListo] = useState<string | null>(null);
  /** Clave (combo | especificación) del resumen ya preparado (períodos + puente). */
  const [resumenListoClave, setResumenListoClave] = useState<string | null>(null);
  /** Dónde se abrió el resumen: 'lista' = solo lectura; 'formulario' = revisión final. */
  const [origenResumen, setOrigenResumen] = useState<'lista' | 'formulario'>('formulario');

  const periodoRef = useRef<string>(periodo);
  periodoRef.current = periodo;
  const cargaTokenRef = useRef(0);

  /**
   * Competencias seleccionadas para el período activo, en el mismo formato que se
   * persiste tanto en la base (pc_especificaciones.competencias) como en el período.
   * Nacen desmarcadas: solo se rellenan con la selección explícita del usuario.
   */
  const competencias = useMemo<CompetenciaCurricular[]>(
    () =>
      competenciasCatalogo
        .filter((f) => ceSeleccionadas.has(f.codigo))
        .map((f) => ({
          bloque: f.bloque,
          nombre: f.competencia_fundamental,
          codigo: f.codigo,
          descriptor: f.descriptor,
        })),
    [competenciasCatalogo, ceSeleccionadas]
  );

  const espec = useMemo(() => {
    if (!combo) return undefined;
    return especificaciones.find(
      (e) => e.curso_id === combo.cursoId && e.asignatura === combo.asignatura
    );
  }, [especificaciones, combo]);

  /**
   * Agrupación del catálogo por Bloque CF. Es un hook, así que DEBE declararse antes de
   * cualquier return temprano (el de la lista); de lo contrario React rompe el módulo con
   * "Rendered more hooks than during the previous render".
   */
  const bloquesCatalogo = useMemo(() => {
    const bloques: Record<BloqueCF, FilaCompetenciaEspecifica[]> = {
      BC1: [],
      BC2: [],
      BC3: [],
      BC4: [],
    };
    for (const f of competenciasCatalogo) {
      if (f && f.bloque && bloques[f.bloque]) {
        bloques[f.bloque].push(f);
      }
    }
    return (['BC1', 'BC2', 'BC3', 'BC4'] as const)
      .filter((b) => bloques[b].length > 0)
      .map((b) => ({
        bloque: b,
        items: bloques[b],
      }));
  }, [competenciasCatalogo]);

  /**
   * Períodos guardados de la especificación activa (el resumen nunca mezcla datos de
   * otras combinaciones ni de otros usuarios: todo se filtra por el id de la base).
   */
  const periodosEspec = useMemo(
    () => (espec ? periodos.filter((p) => p.especificacion_id === espec.id) : []),
    [periodos, espec]
  );

  const usuarioId = session?.user?.id;

  useEffect(() => {
    if (usuarioId) fetchEspecificaciones(usuarioId);
  }, [usuarioId, fetchEspecificaciones]);

  /* ---------------- Catálogo curricular del grado + asignatura ----------------
     Se carga tanto en el formulario como en el resumen (la vista «Ver» abre el
     resumen directamente desde la lista y necesita el mismo catálogo real). */
  useEffect(() => {
    if (pantalla === 'lista' || !combo) return;
    const claveCatalogo = combo.key;
    let cancelado = false;
    (async () => {
      setCargandoCatalogo(true);
      setErrorCatalogo(null);
      try {
        const gradoStr = String(combo.grado || '');
        const gradoCanonico = claveGrado(combo.grado) || gradoStr;

        const [inds, conts, ces] = await Promise.all([
          supabase
            .from('curr_indicadores')
            .select('id, grado, asignatura, competencia, codigo, descripcion, is_active')
            .eq('grado', gradoCanonico),
          supabase
            .from('curr_contenidos')
            .select('id, grado, asignatura, contenido, contenido_json')
            .eq('grado', gradoCanonico),
          supabase
            .from('curr_competencias_especificas')
            .select('id, nivel, grado, asignatura, bloque, competencia_fundamental, codigo, descriptor')
            .eq('grado', gradoCanonico),
        ]);
        if (cancelado) return;

        if (inds.error) {
          console.error('[Especificaciones] Error consultando curr_indicadores:', inds.error);
        }
        if (conts.error) {
          console.error('[Especificaciones] Error consultando curr_contenidos:', conts.error);
        }

        let cesData: FilaCompetenciaEspecifica[] = (ces.data as FilaCompetenciaEspecifica[]) ?? [];
        if (ces.error) {
          // No se interpreta como "sin datos": es un fallo real de la consulta.
          console.error('[Especificaciones] Error consultando curr_competencias_especificas:', ces.error);
          setErrorCatalogo(ces.error.message || 'No se pudo consultar curr_competencias_especificas');
          cesData = [];
        } else if (cesData.length === 0) {
          // Grado con formato distinto al catálogo: consultar el catálogo completo y filtrar por normalización.
          const fallback = await supabase
            .from('curr_competencias_especificas')
            .select('id, nivel, grado, asignatura, bloque, competencia_fundamental, codigo, descriptor');
          if (cancelado) return;
          if (fallback.error) {
            console.error('[Especificaciones] Error consultando catálogo completo:', fallback.error);
            setErrorCatalogo(fallback.error.message || 'No se pudo consultar curr_competencias_especificas');
            cesData = [];
          } else {
            cesData = (fallback.data as FilaCompetenciaEspecifica[]) ?? [];
          }
        }

        let contsData: FilaContenido[] = (conts.data as FilaContenido[]) ?? [];
        if (contsData.length === 0) {
          const fallbackConts = await supabase
            .from('curr_contenidos')
            .select('id, grado, asignatura, contenido, contenido_json');
          if (!cancelado && fallbackConts.data) {
            contsData = fallbackConts.data as FilaContenido[];
          }
        }

        let indsData: FilaIndicador[] = (inds.data as FilaIndicador[]) ?? [];
        if (indsData.length === 0) {
          const fallbackInds = await supabase
            .from('curr_indicadores')
            .select('id, grado, asignatura, competencia, codigo, descripcion, is_active');
          if (!cancelado && fallbackInds.data) {
            indsData = fallbackInds.data as FilaIndicador[];
          }
        }

        const cesFiltradas = filtrarCompetenciasEspecificas(cesData, combo.grado, combo.asignatura);
        setCompetenciasCatalogo(cesFiltradas);
        setIndicadores(filtrarIndicadores(indsData, combo.grado, combo.asignatura));
        setContenidos(filtrarContenidos(contsData, combo.grado, combo.asignatura));

        // Sincronizar la selección: se descartan códigos que ya no existen en el
        // catálogo. Nunca se preselecciona nada: la elección es siempre del usuario
        // (la restauración de una selección guardada la hace el efecto del período).
        setCeSeleccionadas((prev) => {
          if (prev.size === 0) return prev;
          const codigosCatalogo = new Set(cesFiltradas.map((f) => f.codigo));
          const validos = new Set<string>();
          for (const cod of prev) {
            if (codigosCatalogo.has(cod)) validos.add(cod);
          }
          return validos;
        });
      } catch (err) {
        // Un fallo del catálogo no debe tumbar el módulo: se reporta y se queda en estado vacío controlado.
        console.error('[Especificaciones] Error inesperado cargando el catálogo curricular:', err);
        if (!cancelado) {
          setCompetenciasCatalogo([]);
          setErrorCatalogo(err instanceof Error ? err.message : String(err));
        }
      } finally {
        if (!cancelado) {
          setCargandoCatalogo(false);
          setCatalogoListo(claveCatalogo);
        }
      }
    })();
    return () => {
      cancelado = true;
    };
  }, [pantalla, combo, intentoCatalogo]);

  /* ---------------- Carga de las selecciones del período activo ---------------- */
  useEffect(() => {
    if (pantalla !== 'recorrido' || !combo) return;
    if (!espec) {
      // Todavía no existe una especificación guardada para esta combinación:
      // no hay selección previa que restaurar, así que empieza vacía.
      setCargandoPeriodo(false);
      return;
    }
    const clave = `${espec.id}|${periodo}`;
    if (periodoCargado === clave) return;

    const token = ++cargaTokenRef.current;
    setCargandoPeriodo(true);
    (async () => {
      try {
        const guardada = useEspecificacionesStore.getState().getPeriodo(espec.id, periodo);
        const fila = guardada ?? (await fetchPeriodo(espec.id, periodo)) ?? undefined;
        if (cargaTokenRef.current !== token || periodoRef.current !== periodo) return;

        // Restaurar la selección guardada de este período. Si no existe ninguna
        // selección guardada, queda vacía (el usuario debe elegir explícitamente).
        const cCodigos = new Set<string>();
        const ces = Array.isArray(fila?.competencias_especificas) ? fila.competencias_especificas : [];
        for (const c of ces) {
          if (c && typeof c === 'object') {
            if (c.codigo) cCodigos.add(c.codigo);
            if (c.bloque && c.nombre) cCodigos.add(`${c.bloque}|${c.nombre}`);
          }
        }
        setCeSeleccionadas(cCodigos);

        const conts = Array.isArray(fila?.contenidos) ? fila.contenidos : [];
        const contIds = new Set<string>();
        const detalleMap: Record<
          string,
          { conceptos: Set<string>; procedimientos: Set<string>; actitudes_valores: Set<string> }
        > = {};
        for (const c of conts) {
          if (c && typeof c === 'object' && c.contenido_id) {
            contIds.add(c.contenido_id);
            detalleMap[c.contenido_id] = {
              conceptos: new Set(Array.isArray(c.conceptos) ? c.conceptos : []),
              procedimientos: new Set(Array.isArray(c.procedimientos) ? c.procedimientos : []),
              actitudes_valores: new Set(Array.isArray(c.actitudes_valores) ? c.actitudes_valores : []),
            };
          }
        }
        setContenidosSel(contIds);
        setContenidosDetalleSel(detalleMap);

        const inds = Array.isArray(fila?.indicadores) ? fila.indicadores : [];
        setIndicadoresSel(new Set(inds.map((i) => (i && typeof i === 'object' ? i.curr_indicador_id : '')).filter(Boolean)));

        setPeriodoCargado(clave);
      } catch (err) {
        // No debe tumbar el módulo, pero la causa queda visible para depurar.
        console.error('[Especificaciones] Error cargando las selecciones del período:', err);
      } finally {
        if (cargaTokenRef.current === token) setCargandoPeriodo(false);
      }
    })();
  }, [pantalla, combo, espec, periodo, periodoCargado, fetchPeriodo]);

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
      competencias_especificas: competencias,
      contenidos: contenidos
        .filter((c) => contenidosSel.has(c.id))
        .map((c) => {
          const detalle = contenidosDetalleSel[c.id];
          const todosConceptos = Array.isArray(c.contenido_json?.conceptos) ? c.contenido_json.conceptos : [];
          const todosProcedimientos = Array.isArray(c.contenido_json?.procedimientos)
            ? c.contenido_json.procedimientos
            : [];
          const todasActitudes = Array.isArray(c.contenido_json?.actitudes_valores)
            ? c.contenido_json.actitudes_valores
            : Array.isArray(c.contenido_json?.actitudes)
            ? c.contenido_json.actitudes
            : [];

          const selConceptos = detalle?.conceptos
            ? todosConceptos.filter((x) => detalle.conceptos.has(x))
            : todosConceptos;
          const selProcedimientos = detalle?.procedimientos
            ? todosProcedimientos.filter((x) => detalle.procedimientos.has(x))
            : todosProcedimientos;
          const selActitudes = detalle?.actitudes_valores
            ? todasActitudes.filter((x) => detalle.actitudes_valores.has(x))
            : todasActitudes;

          return {
            contenido_id: c.id,
            contenido: c.contenido,
            conceptos: selConceptos,
            procedimientos: selProcedimientos,
            actitudes_valores: selActitudes,
          };
        }),
      indicadores: indicadores
        .filter((i) => indicadoresSel.has(i.id))
        .map((i) => ({ curr_indicador_id: i.id, codigo: i.codigo })),
    }),
    [competencias, contenidos, contenidosSel, contenidosDetalleSel, indicadores, indicadoresSel]
  );

  /** Guarda el estado actual (base + selecciones del período) antes de moverse de paso o salir. */
  const persistir = useCallback(
    async (pasoDestino: number): Promise<string | null> => {
      setGuardando(true);
      try {
        const base = await persistirBase(pasoDestino);
        if (!base) return null;
        // El paso unificado ya contiene la selección del período, así que se
        // persiste siempre junto con la base para no perder la elección del usuario.
        await guardarPeriodo(base.id, periodo, datosPeriodo());
        return base.id;
      } finally {
        setGuardando(false);
      }
    },
    [persistirBase, guardarPeriodo, datosPeriodo, periodo]
  );

  /** Hay algo seleccionado en el período activo (competencias, contenidos o indicadores). */
  const hayDatosPeriodo = ceSeleccionadas.size > 0 || contenidosSel.size > 0 || indicadoresSel.size > 0;

  /* ---------------- Navegación del recorrido ---------------- */
  const abrirCombo = useCallback(
    (c: CombinacionCurricular) => {
      const guardada = getEspecificacion(c);
      const tieneBase = !!guardada && configuracionCompleta(guardada.competencias);
      const periodoGuardado =
        guardada?.periodo_actual &&
        (PERIODOS_ACADEMICOS as readonly string[]).includes(guardada.periodo_actual)
          ? guardada.periodo_actual
          : 'P1';

      setCombo(c);
      setCompetenciasCatalogo([]);
      setCeSeleccionadas(new Set());
      setContenidosSel(new Set());
      setContenidosDetalleSel({});
      setContenidosExpandidos(new Set());
      setIndicadoresSel(new Set());
      setPeriodo(periodoGuardado);
      periodoRef.current = periodoGuardado;
      setPeriodoCargado(null);
      setCargandoPeriodo(true);
      setErrorCatalogo(null);
      setAviso(null);
      setCargandoResumen(false);
      setPuenteCeInd(new Map());
      setCatalogoListo(null);
      setResumenListoClave(null);
      setOrigenResumen('formulario');
      setPaso(tieneBase ? normalizarPasoGuardado(guardada.paso_actual || 1) : 1);
      setPantalla('recorrido');
    },
    [getEspecificacion]
  );

  /**
   * Abre el resumen SOLO LECTURA desde la lista (botón «Ver» de la tarjeta):
   * nunca persiste ni entra al formulario; la tabla se prepara con los datos reales.
   */
  const verResumen = useCallback((c: CombinacionCurricular) => {
    setCombo(c);
    setCompetenciasCatalogo([]);
    setCeSeleccionadas(new Set());
    setContenidosSel(new Set());
    setContenidosDetalleSel({});
    setContenidosExpandidos(new Set());
    setIndicadoresSel(new Set());
    setPeriodo('P1');
    periodoRef.current = 'P1';
    setPeriodoCargado(null);
    setCargandoCatalogo(true);
    setCargandoPeriodo(false);
    setErrorCatalogo(null);
    setAviso(null);
    setCargandoResumen(false);
    setPuenteCeInd(new Map());
    setCatalogoListo(null);
    setResumenListoClave(null);
    setOrigenResumen('lista');
    setPaso(1);
    setPantalla('resumen');
  }, []);

  const irAPaso = useCallback(
    async (destino: number) => {
      if (!combo || destino === paso) return;
      if (destino > 1 && (!configuracionCompleta(competencias) || ceSeleccionadas.size === 0)) {
        setAviso('Selecciona al menos una competencia específica para continuar.');
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
    [combo, paso, competencias, ceSeleccionadas.size, persistir]
  );

  const cambiarPeriodo = useCallback(
    async (nuevo: string) => {
      if (nuevo === periodo || !espec) return;
      // Solo se escribe el período saliente si hay algo seleccionado: así un cambio
      // de período sin elección no borra una selección guardada previamente.
      if (hayDatosPeriodo) {
        setGuardando(true);
        try {
          await guardarPeriodo(espec.id, periodo, datosPeriodo());
        } finally {
          setGuardando(false);
        }
      }
      setPeriodo(nuevo);
      periodoRef.current = nuevo;
      setPeriodoCargado(null);
      setCargandoPeriodo(true);
      setCeSeleccionadas(new Set());
      setContenidosSel(new Set());
      setContenidosDetalleSel({});
      setContenidosExpandidos(new Set());
      setIndicadoresSel(new Set());
      setAviso(null);
    },
    [periodo, espec, guardarPeriodo, datosPeriodo, hayDatosPeriodo]
  );

  /**
   * Relación curricular CE ↔ indicador de la base (curr_ce_indicadores) para las CE del
   * grado y la asignatura. Si la tabla puente no tiene filas, el resumen usa la relación
   * real del catálogo (curr_indicadores.competencia frente al bloque de la CE).
   */
  const cargarPuente = useCallback(async (): Promise<Map<string, string[]>> => {
    const mapa = new Map<string, string[]>();
    const ceIds = competenciasCatalogo.map((c) => c.id).filter(Boolean);
    if (ceIds.length === 0) return mapa;
    try {
      const { data, error } = await supabase
        .from('curr_ce_indicadores')
        .select('ce_id, indicador_id')
        .in('ce_id', ceIds);
      if (error) throw error;
      const codigoPorId = new Map(competenciasCatalogo.map((c) => [c.id, c.codigo]));
      const filas = (data ?? []) as Array<{ ce_id: string; indicador_id: string }>;
      for (const fila of filas) {
        const codigo = codigoPorId.get(fila.ce_id);
        if (!codigo || !fila.indicador_id) continue;
        const lista = mapa.get(codigo) ?? [];
        if (!lista.includes(fila.indicador_id)) lista.push(fila.indicador_id);
        mapa.set(codigo, lista);
      }
    } catch (err) {
      // Un fallo del puente no debe impedir el resumen: se usa solo la relación del catálogo.
      console.error('[Especificaciones] Error consultando curr_ce_indicadores:', err);
    }
    return mapa;
  }, [competenciasCatalogo]);

  /**
   * Preparación del resumen (solo lectura): carga los períodos guardados de la
   * especificación y la relación CE↔indicador cuando el catálogo del combo ya está
   * listo. Sirve tanto a la revisión del formulario como a la vista «Ver» de la lista.
   */
  useEffect(() => {
    if (pantalla !== 'resumen' || !combo || catalogoListo !== combo.key) return;
    const clave = `${combo.key}|${espec?.id ?? ''}`;
    if (resumenListoClave === clave) return;
    let cancelado = false;
    (async () => {
      setCargandoResumen(true);
      try {
        if (espec) await fetchPeriodos(espec.id);
        const puente = await cargarPuente();
        if (!cancelado) {
          setPuenteCeInd(puente);
          setResumenListoClave(clave);
        }
      } catch (err) {
        // Nunca debe tumbar la pantalla: el resumen se muestra con los datos disponibles.
        console.error('[Especificaciones] Error preparando el resumen:', err);
        if (!cancelado) setResumenListoClave(clave);
      } finally {
        setCargandoResumen(false);
      }
    })();
    return () => {
      cancelado = true;
    };
  }, [pantalla, combo, espec, catalogoListo, resumenListoClave, fetchPeriodos, cargarPuente]);

  const siguiente = useCallback(async () => {
    if (paso === 1) {
      if (competenciasCatalogo.length === 0) {
        setAviso('No hay competencias específicas oficiales para esta combinación.');
        return;
      }
      if (ceSeleccionadas.size === 0 || !configuracionCompleta(competencias)) {
        setAviso('Selecciona al menos una competencia específica para continuar.');
        return;
      }
      await irAPaso(2);
      return;
    }
    if (paso < PASOS.length) {
      await irAPaso(paso + 1);
      return;
    }
    // Último paso del formulario: guardar todo y pasar a la pantalla de resumen
    // (revisión final por período) antes de confirmar definitivamente. La preparación
    // del resumen (períodos guardados + puente CE↔indicador) la hace su propio efecto
    // al entrar en la pantalla, igual que en la vista «Ver» de la lista.
    if (ceSeleccionadas.size === 0 || !configuracionCompleta(competencias)) {
      setAviso('Selecciona al menos una competencia específica para continuar.');
      return;
    }
    const guardado = await persistir(PASOS.length);
    if (!guardado) {
      setAviso('No se pudo guardar la configuración. Intenta de nuevo.');
      return;
    }
    setPantalla('resumen');
  }, [paso, competenciasCatalogo.length, ceSeleccionadas.size, competencias, irAPaso, persistir]);

  const salir = useCallback(async () => {
    setGuardando(true);
    try {
      if (configuracionCompleta(competencias) && ceSeleccionadas.size > 0) {
        await persistir(paso);
        if (usuarioId) await fetchEspecificaciones(usuarioId, true);
      }
    } finally {
      setGuardando(false);
      setPantalla('lista');
      setCombo(null);
    }
  }, [persistir, paso, competencias, ceSeleccionadas.size, usuarioId, fetchEspecificaciones]);

  /**
   * Atrás del resumen: si se abrió desde la lista (solo lectura) vuelve a la lista;
   * si es la revisión final del formulario, vuelve al último paso para editar.
   */
  const volverDelResumen = useCallback(() => {
    if (origenResumen === 'lista') {
      setPantalla('lista');
      setCombo(null);
      return;
    }
    setPantalla('recorrido');
  }, [origenResumen]);

  /** Acción de confirmación del resumen: persiste, recarga y cierra con el aviso de éxito. */
  const confirmarResumen = useCallback(async () => {
    setGuardando(true);
    try {
      await persistir(PASOS.length);
      if (usuarioId) await fetchEspecificaciones(usuarioId, true);
      setGenericToast({ message: 'Especificación curricular guardada.', type: 'success' });
      setPantalla('lista');
      setCombo(null);
    } finally {
      setGuardando(false);
    }
  }, [persistir, usuarioId, fetchEspecificaciones, setGenericToast]);

  const alternarCE = useCallback((codigo: string) => {
    setAviso(null);
    setCeSeleccionadas((prev) => {
      const next = new Set(prev);
      if (next.has(codigo)) next.delete(codigo);
      else next.add(codigo);
      return next;
    });
  }, []);

  const seleccionarTodasCE = useCallback(() => {
    setAviso(null);
    setCeSeleccionadas(new Set(competenciasCatalogo.map((f) => f.codigo)));
  }, [competenciasCatalogo]);

  const deseleccionarTodasCE = useCallback(() => {
    setAviso(null);
    setCeSeleccionadas(new Set());
  }, []);

  const obtenerConceptos = (json?: ContenidoJson | null): string[] =>
    Array.isArray(json?.conceptos) ? json.conceptos : [];

  const obtenerProcedimientos = (json?: ContenidoJson | null): string[] =>
    Array.isArray(json?.procedimientos) ? json.procedimientos : [];

  const obtenerActitudes = (json?: ContenidoJson | null): string[] => {
    if (Array.isArray(json?.actitudes_valores)) return json.actitudes_valores;
    if (Array.isArray(json?.actitudes)) return json.actitudes;
    return [];
  };

  const alternarContenido = useCallback(
    (id: string) => {
      setAviso(null);
      setContenidosSel((prev) => {
        const next = new Set(prev);
        if (next.has(id)) {
          next.delete(id);
        } else {
          next.add(id);
          setContenidosExpandidos((exp) => new Set(exp).add(id));
          setContenidosDetalleSel((det) => {
            if (det[id]) return det;
            const target = contenidos.find((x) => x.id === id);
            return {
              ...det,
              [id]: {
                conceptos: new Set(obtenerConceptos(target?.contenido_json)),
                procedimientos: new Set(obtenerProcedimientos(target?.contenido_json)),
                actitudes_valores: new Set(obtenerActitudes(target?.contenido_json)),
              },
            };
          });
        }
        return next;
      });
    },
    [contenidos]
  );

  const alternarSubItem = useCallback(
    (
      contenidoId: string,
      tipo: 'conceptos' | 'procedimientos' | 'actitudes_valores',
      valor: string
    ) => {
      setAviso(null);
      setContenidosSel((prev) => new Set(prev).add(contenidoId));
      setContenidosDetalleSel((prev) => {
        const target = contenidos.find((x) => x.id === contenidoId);
        const actual = prev[contenidoId] ?? {
          conceptos: new Set(obtenerConceptos(target?.contenido_json)),
          procedimientos: new Set(obtenerProcedimientos(target?.contenido_json)),
          actitudes_valores: new Set(obtenerActitudes(target?.contenido_json)),
        };
        const subSet = new Set(actual[tipo]);
        if (subSet.has(valor)) {
          subSet.delete(valor);
        } else {
          subSet.add(valor);
        }
        return {
          ...prev,
          [contenidoId]: {
            ...actual,
            [tipo]: subSet,
          },
        };
      });
    },
    [contenidos]
  );

  const seleccionarTodoDesglose = useCallback(
    (contenidoId: string) => {
      setAviso(null);
      const target = contenidos.find((x) => x.id === contenidoId);
      if (!target) return;
      setContenidosSel((prev) => new Set(prev).add(contenidoId));
      setContenidosDetalleSel((prev) => ({
        ...prev,
        [contenidoId]: {
          conceptos: new Set(obtenerConceptos(target.contenido_json)),
          procedimientos: new Set(obtenerProcedimientos(target.contenido_json)),
          actitudes_valores: new Set(obtenerActitudes(target.contenido_json)),
        },
      }));
    },
    [contenidos]
  );

  const deseleccionarTodoDesglose = useCallback((contenidoId: string) => {
    setAviso(null);
    setContenidosDetalleSel((prev) => ({
      ...prev,
      [contenidoId]: {
        conceptos: new Set(),
        procedimientos: new Set(),
        actitudes_valores: new Set(),
      },
    }));
  }, []);

  const alternarExpansionContenido = useCallback((id: string) => {
    setContenidosExpandidos((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const seleccionarTodosContenidos = useCallback(() => {
    setAviso(null);
    setContenidosSel(new Set(contenidos.map((c) => c.id)));
    const detalleMap: Record<
      string,
      { conceptos: Set<string>; procedimientos: Set<string>; actitudes_valores: Set<string> }
    > = {};
    for (const c of contenidos) {
      detalleMap[c.id] = {
        conceptos: new Set(obtenerConceptos(c.contenido_json)),
        procedimientos: new Set(obtenerProcedimientos(c.contenido_json)),
        actitudes_valores: new Set(obtenerActitudes(c.contenido_json)),
      };
    }
    setContenidosDetalleSel(detalleMap);
  }, [contenidos]);

  const deseleccionarTodosContenidos = useCallback(() => {
    setAviso(null);
    setContenidosSel(new Set());
    setContenidosDetalleSel({});
  }, []);

  const expandirTodosContenidos = useCallback(() => {
    setContenidosExpandidos(new Set(contenidos.map((c) => c.id)));
  }, [contenidos]);

  const contraerTodosContenidos = useCallback(() => {
    setContenidosExpandidos(new Set());
  }, []);

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
                      <div className="flex items-stretch gap-2 rounded-2xl border border-[#2E3330]/10 bg-white p-2 pl-4 transition-all duration-200 hover:border-[#689C63]/40 hover:shadow-sm active:scale-[0.99]">
                        <button
                          onClick={() => abrirCombo(c)}
                          className="flex-1 min-w-0 flex items-center gap-3 text-left py-2"
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
                        <button
                          onClick={() => verResumen(c)}
                          title="Ver la especificación curricular aplicada por período (solo lectura)"
                          className="shrink-0 self-center flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[#2E3330]/15 text-[12px] font-bold text-[#2E3330]/70 transition-colors hover:border-[#689C63] hover:text-[#689C63] hover:bg-[#689C63]/5"
                        >
                          <BookOpen size={15} />
                          Ver
                        </button>
                      </div>
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

  /* ================================ RESUMEN ================================ */
  if (pantalla === 'resumen') {
    const claveResumen = `${combo?.key ?? ''}|${espec?.id ?? ''}`;
    const resumenListo = resumenListoClave === claveResumen;
    const soloLectura = origenResumen === 'lista';
    const cargandoResumenVisible = !resumenListo || cargandoResumen;
    return (
      <div className="min-h-screen bg-white" style={{ fontFamily: 'Manrope, Inter, system-ui' }}>
        <main className="px-4 sm:px-8 py-7 max-w-4xl w-full mx-auto flex flex-col gap-5">
          <div className="flex items-center gap-3">
            <button
              onClick={volverDelResumen}
              disabled={guardando || cargandoResumenVisible}
              className={estiloBotonSecundario}
              title={soloLectura ? 'Volver a la lista de asignaturas' : 'Volver al formulario'}
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

          {!soloLectura && (
            <div className="flex flex-col gap-1.5">
              <h2 className="font-bold text-[22px] text-[#2E3330] tracking-tight">
                Resumen de la configuración
              </h2>
              <p className="text-[14px] text-[#2E3330]/70 leading-relaxed max-w-2xl">
                Revisa las selecciones guardadas por período. Puedes volver atrás para modificarlas
                y el resumen se actualizará con tus cambios.
              </p>
            </div>
          )}

          {cargandoResumenVisible ? (
            <div className="flex flex-col items-center justify-center gap-3 py-14 rounded-3xl border border-[#2E3330]/10 border-dashed">
              <Loader2 size={22} className="animate-spin text-[#689C63]" />
              <p className="text-[13px] font-semibold text-[#2E3330]/60">Cargando el resumen…</p>
            </div>
          ) : (
            <ResumenEspecificaciones
              periodos={periodosEspec}
              catalogoCE={competenciasCatalogo}
              catalogoIndicadores={indicadores}
              puente={puenteCeInd}
            />
          )}

          <div className="flex items-center justify-between gap-3 pt-4 border-t border-[#2E3330]/10">
            <button
              onClick={volverDelResumen}
              disabled={guardando || cargandoResumenVisible}
              className={estiloBotonSecundario}
            >
              <ArrowLeft size={15} /> Atrás
            </button>

            {!soloLectura && (
              <button
                onClick={confirmarResumen}
                disabled={guardando || cargandoResumenVisible}
                className={estiloBotonPrimario}
              >
                {guardando ? (
                  <Loader2 size={15} className="animate-spin" />
                ) : (
                  <Check size={15} />
                )}
                Confirmar y guardar
              </button>
            )}
          </div>
        </main>
      </div>
    );
  }

  /* ================================ RECORRIDO ================================ */
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
              const alcanzable = p.numero === 1 || ceSeleccionadas.size > 0;
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
                  {p.numero < PASOS.length && (
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

        {/* Selector de período (la selección de competencias, contenidos e indicadores es por período) */}
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

        {/* ---------------- PASO 1: Competencias específicas del grado y la asignatura ---------------- */}
        {paso === 1 && (
          <div className="flex flex-col gap-4">
            <p className="text-[14px] text-[#2E3330]/70 leading-relaxed">
              Selecciona las competencias específicas del currículo dominicano que trabajarás en el
              período <strong className="text-[#2E3330]">{periodo}</strong> para este grado y asignatura.
            </p>

            {cargandoCatalogo || cargandoPeriodo ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <Loader2 size={30} className="animate-spin text-[#689C63]" />
                <p className="text-[13px] font-semibold text-[#2E3330]/60">
                  Cargando las competencias específicas del grado…
                </p>
              </div>
            ) : errorCatalogo ? (
              <div className="rounded-3xl border border-red-200 bg-red-50 p-8 text-center flex flex-col items-center gap-2.5">
                <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mb-1">
                  <AlertCircle size={24} />
                </div>
                <p className="font-extrabold text-[16px] text-[#2E3330]">
                  No se pudieron cargar las competencias específicas
                </p>
                <p className="text-[13px] text-[#2E3330]/65 max-w-md leading-relaxed">
                  Ocurrió un problema al recuperar las competencias del currículo. El módulo sigue
                  operativo; vuelve a intentarlo.
                </p>
                <button
                  type="button"
                  onClick={() => setIntentoCatalogo((i) => i + 1)}
                  className="px-5 h-9 rounded-full bg-[#2E3330] text-white text-[13px] font-bold hover:bg-black transition-colors mt-2"
                >
                  Reintentar
                </button>
              </div>
            ) : competenciasCatalogo.length === 0 ? (
              <div className="rounded-3xl border border-[#2E3330]/10 border-dashed p-8 text-center flex flex-col items-center gap-2 bg-[#FAF8F5]">
                <div className="w-12 h-12 rounded-full bg-[#F5BC5D]/20 text-[#8A6412] flex items-center justify-center mb-1">
                  <AlertCircle size={24} />
                </div>
                <p className="font-extrabold text-[16px] text-[#2E3330]">
                  Sin competencias específicas registradas
                </p>
                <p className="text-[13px] text-[#2E3330]/65 max-w-md leading-relaxed">
                  No hay competencias específicas del currículo disponibles para{' '}
                  <strong className="text-[#2E3330]">{combo?.grado}</strong> —{' '}
                  <strong className="text-[#2E3330]">{combo?.asignaturaNombre}</strong>.
                </p>
                <span className="text-[11px] font-bold text-[#8A6412] bg-[#F5BC5D]/15 px-3 py-1.5 rounded-full mt-2">
                  Selecciona al menos una competencia para poder continuar.
                </span>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {/* Barra de control y revisión de selección */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-3.5 rounded-2xl bg-[#2E3330]/3 border border-[#2E3330]/5">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 rounded-full bg-[#689C63]/15 text-[#689C63] text-[12px] font-extrabold">
                      {ceSeleccionadas.size} de {competenciasCatalogo.length}
                    </span>
                    <span className="text-[13px] font-bold text-[#2E3330]/70">
                      competencias seleccionadas
                    </span>
                  </div>

                  <div className="flex items-center gap-2 self-start sm:self-auto">
                    <button
                      type="button"
                      onClick={seleccionarTodasCE}
                      className="px-3 h-7 rounded-full bg-white border border-[#2E3330]/15 text-[12px] font-bold text-[#2E3330] hover:bg-[#689C63]/10 hover:border-[#689C63] hover:text-[#689C63] transition-colors"
                    >
                      Seleccionar todas
                    </button>
                    <button
                      type="button"
                      onClick={deseleccionarTodasCE}
                      className="px-3 h-7 rounded-full bg-white border border-[#2E3330]/15 text-[12px] font-bold text-[#2E3330]/60 hover:bg-[#2E3330]/5 hover:text-[#2E3330] transition-colors"
                    >
                      Deseleccionar todas
                    </button>
                  </div>
                </div>

                {/* Lista de competencias agrupadas por bloque curricular (sin etiquetas BC#) */}
                {bloquesCatalogo.map((b) => (
                  <section key={b.bloque} className="flex flex-col gap-2.5">
                    <div className="flex items-center gap-2">
                      <span className="text-[12px] font-bold text-[#2E3330]/50 uppercase tracking-wider">
                        {b.bloque === 'BC1'
                          ? 'Comunicación'
                          : b.bloque === 'BC2'
                          ? 'Pensamiento & Problemas'
                          : b.bloque === 'BC3'
                          ? 'Científica & Ambiental'
                          : 'Ética & Desarrollo'}
                      </span>
                    </div>

                    <div className="flex flex-col gap-2">
                      {b.items.map((f) => {
                        const seleccionada = ceSeleccionadas.has(f.codigo);
                        return (
                          <button
                            key={f.codigo}
                            type="button"
                            onClick={() => alternarCE(f.codigo)}
                            className={`w-full flex items-start gap-3.5 text-left rounded-2xl border p-4 transition-all duration-150 ${
                              seleccionada
                                ? 'border-[#689C63]/60 bg-[#689C63]/5 shadow-xs'
                                : 'border-[#2E3330]/10 bg-white hover:border-[#2E3330]/25'
                            }`}
                          >
                            <span
                              className={`w-5 h-5 mt-0.5 shrink-0 rounded-md border flex items-center justify-center transition-colors ${
                                seleccionada
                                  ? 'bg-[#689C63] border-[#689C63]'
                                  : 'border-[#2E3330]/25 bg-white'
                              }`}
                            >
                              {seleccionada && <Check size={13} className="text-white" strokeWidth={3} />}
                            </span>
                            <span className="flex-1 min-w-0">
                              <span className="flex flex-wrap items-center gap-2">
                                <span className="px-2 py-0.5 rounded-full bg-[#2E3330]/5 text-[#2E3330] text-[11px] font-black tracking-wide">
                                  {f.codigo}
                                </span>
                                <span className="text-[13px] font-extrabold text-[#2E3330]">
                                  {f.competencia_fundamental}
                                </span>
                              </span>
                              <span className="block text-[13px] text-[#2E3330]/80 mt-1.5 leading-relaxed font-normal">
                                {f.descriptor}
                              </span>
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </section>
                ))}

                <p className="text-[12px] font-semibold text-[#2E3330]/50">
                  {ceSeleccionadas.size} de {competenciasCatalogo.length} seleccionadas para {periodo}
                </p>
              </div>
            )}
          </div>
        )}

        {/* ---------------- PASO 2: Contenidos ---------------- */}
        {paso === 2 && (
          <div className="flex flex-col gap-4">
            <p className="text-[14px] text-[#2E3330]/70 leading-relaxed">
              Selecciona los contenidos y su desglose (conceptos, procedimientos, actitudes y valores)
              que trabajarás en el período <strong className="text-[#2E3330]">{periodo}</strong>.
              Puedes marcar contenidos completos o desplegarlos para seleccionar elementos específicos del JSON.
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
              <div className="flex flex-col gap-4">
                {/* Barra de control y revisión de selección */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-3.5 rounded-2xl bg-[#2E3330]/3 border border-[#2E3330]/5">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 rounded-full bg-[#689C63]/15 text-[#689C63] text-[12px] font-extrabold">
                      {contenidosSel.size} de {contenidos.length}
                    </span>
                    <span className="text-[13px] font-bold text-[#2E3330]/70">
                      contenidos seleccionados
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
                    <button
                      type="button"
                      onClick={seleccionarTodosContenidos}
                      className="px-3 h-7 rounded-full bg-white border border-[#2E3330]/15 text-[12px] font-bold text-[#2E3330] hover:bg-[#689C63]/10 hover:border-[#689C63] hover:text-[#689C63] transition-colors"
                    >
                      Seleccionar todos
                    </button>
                    <button
                      type="button"
                      onClick={deseleccionarTodosContenidos}
                      className="px-3 h-7 rounded-full bg-white border border-[#2E3330]/15 text-[12px] font-bold text-[#2E3330]/60 hover:bg-[#2E3330]/5 hover:text-[#2E3330] transition-colors"
                    >
                      Deseleccionar todos
                    </button>
                    <button
                      type="button"
                      onClick={expandirTodosContenidos}
                      className="px-3 h-7 rounded-full bg-white border border-[#2E3330]/15 text-[12px] font-bold text-[#2E3330]/70 hover:bg-[#2E3330]/5 transition-colors"
                    >
                      Expandir todos
                    </button>
                    <button
                      type="button"
                      onClick={contraerTodosContenidos}
                      className="px-3 h-7 rounded-full bg-white border border-[#2E3330]/15 text-[12px] font-bold text-[#2E3330]/70 hover:bg-[#2E3330]/5 transition-colors"
                    >
                      Contraer todos
                    </button>
                  </div>
                </div>

                {/* Lista de contenidos con desglose JSON expandible */}
                <ul className="flex flex-col gap-3">
                  {contenidos.map((c) => {
                    const seleccionado = contenidosSel.has(c.id);
                    const expandido = contenidosExpandidos.has(c.id);

                    const todosConceptos = obtenerConceptos(c.contenido_json);
                    const todosProcedimientos = obtenerProcedimientos(c.contenido_json);
                    const todasActitudes = obtenerActitudes(c.contenido_json);
                    const totalElementos =
                      todosConceptos.length + todosProcedimientos.length + todasActitudes.length;

                    const detalle = contenidosDetalleSel[c.id];
                    const selConceptos =
                      detalle?.conceptos ?? (seleccionado ? new Set(todosConceptos) : new Set());
                    const selProcedimientos =
                      detalle?.procedimientos ?? (seleccionado ? new Set(todosProcedimientos) : new Set());
                    const selActitudes =
                      detalle?.actitudes_valores ?? (seleccionado ? new Set(todasActitudes) : new Set());
                    const totalSeleccionados =
                      selConceptos.size + selProcedimientos.size + selActitudes.size;

                    return (
                      <li key={c.id}>
                        <div
                          className={`rounded-2xl border transition-all duration-200 overflow-hidden ${
                            seleccionado
                              ? 'border-[#689C63]/50 bg-white shadow-xs'
                              : 'border-[#2E3330]/10 bg-white hover:border-[#2E3330]/25'
                          }`}
                        >
                          {/* Cabecera del contenido */}
                          <div className="p-3.5 flex items-start gap-3">
                            <button
                              type="button"
                              onClick={() => alternarContenido(c.id)}
                              className="mt-0.5"
                              title={seleccionado ? 'Deseleccionar contenido' : 'Seleccionar contenido'}
                            >
                              <span
                                className={`w-5 h-5 shrink-0 rounded-md border flex items-center justify-center transition-colors ${
                                  seleccionado
                                    ? 'bg-[#689C63] border-[#689C63]'
                                    : 'border-[#2E3330]/25 bg-white hover:border-[#689C63]'
                                }`}
                              >
                                {seleccionado && <Check size={13} className="text-white" strokeWidth={3} />}
                              </span>
                            </button>

                            <div
                              className="flex-1 min-w-0 cursor-pointer"
                              onClick={() =>
                                totalElementos > 0
                                  ? alternarExpansionContenido(c.id)
                                  : alternarContenido(c.id)
                              }
                            >
                              <div className="flex flex-wrap items-center gap-2">
                                {c.contenido_json?.disciplina && (
                                  <span className="px-2 py-0.5 rounded-full bg-[#2E3330]/5 text-[#2E3330] text-[10px] font-black uppercase tracking-wider">
                                    {c.contenido_json.disciplina}
                                  </span>
                                )}
                                <span className="font-extrabold text-[14px] text-[#2E3330] leading-snug">
                                  {c.contenido}
                                </span>
                              </div>

                              {totalElementos > 0 && (
                                <div className="flex flex-wrap items-center gap-2 mt-1.5">
                                  <span
                                    className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                                      totalSeleccionados === totalElementos && totalElementos > 0
                                        ? 'bg-[#689C63]/15 text-[#689C63]'
                                        : totalSeleccionados > 0
                                        ? 'bg-[#D97706]/15 text-[#D97706]'
                                        : 'bg-[#2E3330]/5 text-[#2E3330]/50'
                                    }`}
                                  >
                                    {totalSeleccionados === totalElementos && totalElementos > 0
                                      ? `Desglose completo (${totalElementos})`
                                      : `${totalSeleccionados} de ${totalElementos} del desglose`}
                                  </span>
                                  <span className="text-[11px] font-medium text-[#2E3330]/50">
                                    {todosConceptos.length} conceptos · {todosProcedimientos.length} procedimientos · {todasActitudes.length} actitudes
                                  </span>
                                </div>
                              )}
                            </div>

                            {totalElementos > 0 && (
                              <button
                                type="button"
                                onClick={() => alternarExpansionContenido(c.id)}
                                className="shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-xl text-[12px] font-bold text-[#2E3330]/65 hover:bg-[#2E3330]/5 hover:text-[#2E3330] transition-colors"
                                title={expandido ? 'Ocultar desglose JSON' : 'Ver desglose JSON'}
                              >
                                <span>{expandido ? 'Ocultar' : 'Desglose'}</span>
                                {expandido ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                              </button>
                            )}
                          </div>

                          {/* Desglose JSON expandible */}
                          {expandido && totalElementos > 0 && (
                            <div className="border-t border-[#2E3330]/10 bg-[#FAF8F5]/60 p-3.5 flex flex-col gap-4">
                              {/* Barra de acciones del desglose */}
                              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#2E3330]/10 pb-2.5">
                                <span className="text-[12px] font-extrabold text-[#2E3330]/80">
                                  Desglose curricular del contenido (JSON):
                                </span>
                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => seleccionarTodoDesglose(c.id)}
                                    className="px-2.5 py-1 rounded-lg bg-white border border-[#2E3330]/15 text-[11px] font-bold text-[#689C63] hover:bg-[#689C63]/10 hover:border-[#689C63] transition-colors"
                                  >
                                    Seleccionar todo el desglose
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => deseleccionarTodoDesglose(c.id)}
                                    className="px-2.5 py-1 rounded-lg bg-white border border-[#2E3330]/15 text-[11px] font-bold text-[#2E3330]/60 hover:bg-[#2E3330]/5 transition-colors"
                                  >
                                    Deseleccionar desglose
                                  </button>
                                </div>
                              </div>

                              {/* 1. CONCEPTOS */}
                              {todosConceptos.length > 0 && (
                                <div className="flex flex-col gap-2">
                                  <div className="flex items-center gap-2">
                                    <span className="px-2 py-0.5 rounded-full bg-[#2563EB]/10 text-[#2563EB] text-[11px] font-black uppercase tracking-wider">
                                      Conceptos ({selConceptos.size} de {todosConceptos.length})
                                    </span>
                                  </div>
                                  <div className="grid grid-cols-1 gap-1.5">
                                    {todosConceptos.map((cTexto, idx) => {
                                      const activo = selConceptos.has(cTexto);
                                      return (
                                        <button
                                          key={`${idx}-${cTexto}`}
                                          type="button"
                                          onClick={() => alternarSubItem(c.id, 'conceptos', cTexto)}
                                          className={`w-full flex items-start gap-2.5 text-left rounded-xl p-2.5 text-[13px] transition-all ${
                                            activo
                                              ? 'bg-white border border-[#2563EB]/40 shadow-2xs font-medium text-[#1E3A8A]'
                                              : 'bg-white/80 border border-[#2E3330]/10 text-[#2E3330]/75 hover:border-[#2E3330]/25'
                                          }`}
                                        >
                                          <span
                                            className={`w-4 h-4 mt-0.5 shrink-0 rounded border flex items-center justify-center transition-colors ${
                                              activo
                                                ? 'bg-[#2563EB] border-[#2563EB]'
                                                : 'border-[#2E3330]/25 bg-white'
                                            }`}
                                          >
                                            {activo && (
                                              <Check size={11} className="text-white" strokeWidth={3} />
                                            )}
                                          </span>
                                          <span className="flex-1 leading-snug">{cTexto}</span>
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}

                              {/* 2. PROCEDIMIENTOS */}
                              {todosProcedimientos.length > 0 && (
                                <div className="flex flex-col gap-2">
                                  <div className="flex items-center gap-2">
                                    <span className="px-2 py-0.5 rounded-full bg-[#0D9488]/10 text-[#0D9488] text-[11px] font-black uppercase tracking-wider">
                                      Procedimientos ({selProcedimientos.size} de {todosProcedimientos.length})
                                    </span>
                                  </div>
                                  <div className="grid grid-cols-1 gap-1.5">
                                    {todosProcedimientos.map((pTexto, idx) => {
                                      const activo = selProcedimientos.has(pTexto);
                                      return (
                                        <button
                                          key={`${idx}-${pTexto}`}
                                          type="button"
                                          onClick={() => alternarSubItem(c.id, 'procedimientos', pTexto)}
                                          className={`w-full flex items-start gap-2.5 text-left rounded-xl p-2.5 text-[13px] transition-all ${
                                            activo
                                              ? 'bg-white border border-[#0D9488]/40 shadow-2xs font-medium text-[#134E4A]'
                                              : 'bg-white/80 border border-[#2E3330]/10 text-[#2E3330]/75 hover:border-[#2E3330]/25'
                                          }`}
                                        >
                                          <span
                                            className={`w-4 h-4 mt-0.5 shrink-0 rounded border flex items-center justify-center transition-colors ${
                                              activo
                                                ? 'bg-[#0D9488] border-[#0D9488]'
                                                : 'border-[#2E3330]/25 bg-white'
                                            }`}
                                          >
                                            {activo && (
                                              <Check size={11} className="text-white" strokeWidth={3} />
                                            )}
                                          </span>
                                          <span className="flex-1 leading-snug">{pTexto}</span>
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}

                              {/* 3. ACTITUDES Y VALORES */}
                              {todasActitudes.length > 0 && (
                                <div className="flex flex-col gap-2">
                                  <div className="flex items-center gap-2">
                                    <span className="px-2 py-0.5 rounded-full bg-[#D97706]/10 text-[#D97706] text-[11px] font-black uppercase tracking-wider">
                                      Actitudes y Valores ({selActitudes.size} de {todasActitudes.length})
                                    </span>
                                  </div>
                                  <div className="grid grid-cols-1 gap-1.5">
                                    {todasActitudes.map((aTexto, idx) => {
                                      const activo = selActitudes.has(aTexto);
                                      return (
                                        <button
                                          key={`${idx}-${aTexto}`}
                                          type="button"
                                          onClick={() => alternarSubItem(c.id, 'actitudes_valores', aTexto)}
                                          className={`w-full flex items-start gap-2.5 text-left rounded-xl p-2.5 text-[13px] transition-all ${
                                            activo
                                              ? 'bg-white border border-[#D97706]/40 shadow-2xs font-medium text-[#78350F]'
                                              : 'bg-white/80 border border-[#2E3330]/10 text-[#2E3330]/75 hover:border-[#2E3330]/25'
                                          }`}
                                        >
                                          <span
                                            className={`w-4 h-4 mt-0.5 shrink-0 rounded border flex items-center justify-center transition-colors ${
                                              activo
                                                ? 'bg-[#D97706] border-[#D97706]'
                                                : 'border-[#2E3330]/25 bg-white'
                                            }`}
                                          >
                                            {activo && (
                                              <Check size={11} className="text-white" strokeWidth={3} />
                                            )}
                                          </span>
                                          <span className="flex-1 leading-snug">{aTexto}</span>
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
            <p className="text-[12px] font-semibold text-[#2E3330]/50">
              {contenidosSel.size} contenido{contenidosSel.size !== 1 ? 's' : ''} seleccionado{contenidosSel.size !== 1 ? 's' : ''} para {periodo}
            </p>
          </div>
        )}

        {/* ---------------- PASO 3: Indicadores ---------------- */}
        {paso === 3 && (
          <div className="flex flex-col gap-3">
            <p className="text-[14px] text-[#2E3330]/70">
              Selecciona los indicadores que trabajarás en el período{' '}
              <strong className="text-[#2E3330]">{periodo}</strong>.
            </p>
            <LeyendaCompetenciasCF />
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
                  // Acento por Competencia Fundamental: color CIELO en la etiqueta del código.
                  const bloqueIL = bloqueDeIndicador(i);
                  const colorIL = bloqueIL ? COLORES_BLOQUE_CF[bloqueIL] : null;
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
                          <span
                            className="px-2 py-0.5 rounded-full text-[11px] font-black text-[#2E3330]"
                            style={{ backgroundColor: colorIL ? `${colorIL}1F` : 'rgba(46, 51, 48, 0.05)' }}
                          >
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

          <button
            onClick={siguiente}
            disabled={
              guardando ||
              cargandoResumen ||
              cargandoCatalogo ||
              cargandoPeriodo ||
              (paso === 1 && (competenciasCatalogo.length === 0 || ceSeleccionadas.size === 0))
            }
            className={estiloBotonPrimario}
          >
            {guardando || cargandoResumen ? (
              <Loader2 size={15} className="animate-spin" />
            ) : (
              <ArrowRight size={15} />
            )}
            {paso === PASOS.length ? 'Revisar' : 'Siguiente'}
          </button>
        </div>
      </main>
    </div>
  );
}
