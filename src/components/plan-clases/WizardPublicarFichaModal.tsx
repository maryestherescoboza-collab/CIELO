import { useEffect, useState, useMemo } from 'react';
import {
  X,
  Check,
  ArrowRight,
  ArrowLeft,
  AlertCircle,
  Loader2,
  Calendar,
  FileText
} from 'lucide-react';
import { useAppStore } from '../../store/appStore';
import {
  publicacionesApi,
  type EntradaPublicacionWizard,
  type ActividadExistenteCompatible
} from '../../lib/publicacionesApi';
import { getAsignaturaNombre } from '../../constants/asignaturas';

interface WizardPublicarFichaModalProps {
  abierto: boolean;
  notaId: string;
  notaTitulo?: string;
  onCerrar: () => void;
  onPublicadoExitoso?: () => void;
}

type Paso = 1 | 2 | 3 | 4;
type Periodo = 'P1' | 'P2' | 'P3' | 'P4';

const PERIODOS: Periodo[] = ['P1', 'P2', 'P3', 'P4'];

export function WizardPublicarFichaModal({
  abierto,
  notaId,
  notaTitulo,
  onCerrar,
  onPublicadoExitoso,
}: WizardPublicarFichaModalProps) {
  const sessionUserId = useAppStore(s => s.session?.user?.id);
  const cursosStore = useAppStore(s => s.state.cursos) || [];
  const selectedPeriodo = (useAppStore(s => s.selectedPeriodo) as Periodo) || 'P1';

  const [paso, setPaso] = useState<Paso>(1);
  const [cargando, setCargando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 1. Destino: Asignatura y Cursos seleccionados
  const [asignaturaSeleccionada, setAsignaturaSeleccionada] = useState<string>('');
  const [cursosSeleccionados, setCursosSeleccionados] = useState<number[]>([]);

  // 2. Actividad: Período y Actividad seleccionada por curso (mapa cursoId -> actividadId)
  const [periodoSeleccionado, setPeriodoSeleccionado] = useState<Periodo>(
    PERIODOS.includes(selectedPeriodo) ? selectedPeriodo : 'P1'
  );
  // Mapa de actividades disponibles por curso: cursoId -> ActividadExistenteCompatible[]
  const [actividadesPorCurso, setActividadesPorCurso] = useState<Record<number, ActividadExistenteCompatible[]>>({});
  const [cargandoActividades, setCargandoActividades] = useState(false);
  // Selección del docente: cursoId -> actividadId
  const [actividadSeleccionadaPorCurso, setActividadSeleccionadaPorCurso] = useState<Record<number, number>>({});

  // 3. Producto
  const [solicitaProducto, setSolicitaProducto] = useState<boolean>(true);
  const [descripcionProducto, setDescripcionProducto] = useState<string>('');

  // Lista única de asignaturas que el docente imparte en sus cursos
  const asignaturasDocente = useMemo(() => {
    const set = new Set<string>();
    cursosStore.forEach((c: any) => {
      if (c.asignatura) set.add(c.asignatura);
    });
    const lista = Array.from(set);
    return lista.length > 0 ? lista : ['general'];
  }, [cursosStore]);

  // Cursos compatibles con la asignatura seleccionada
  const cursosCompatibles = useMemo(() => {
    if (!asignaturaSeleccionada) return [];
    return cursosStore
      .filter((c: any) => !c.asignatura || c.asignatura === asignaturaSeleccionada)
      .map((c: any) => ({
        id: c.id,
        nombre: c.nombre || `${c.grado || ''} ${c.seccion || ''}`.trim(),
        grado: c.grado || '',
        seccion: c.seccion || '',
      }));
  }, [cursosStore, asignaturaSeleccionada]);

  // Inicializar estado y publicaciones previas
  useEffect(() => {
    if (!abierto || !notaId) return;
    let activo = true;

    (async () => {
      setCargando(true);
      setError(null);
      setPaso(1);

      try {
        const pubs = await publicacionesApi.listarPorFicha(notaId);
        if (!activo) return;

        if (pubs.length > 0) {
          const primera = pubs[0];
          setAsignaturaSeleccionada(primera.asignatura);
          setCursosSeleccionados(pubs.map(p => p.cursoId));
          setSolicitaProducto(primera.requiereProducto);

          const mapaInicial: Record<number, number> = {};
          pubs.forEach(p => {
            if (p.actividadId) mapaInicial[p.cursoId] = p.actividadId;
          });
          setActividadSeleccionadaPorCurso(mapaInicial);
        } else if (asignaturasDocente.length > 0) {
          setAsignaturaSeleccionada(asignaturasDocente[0]);
        }
      } catch (e: any) {
        if (activo) setError(e?.message || 'Error cargando datos previos');
      } finally {
        if (activo) setCargando(false);
      }
    })();

    return () => { activo = false; };
  }, [abierto, notaId, asignaturasDocente]);

  // Cargar actividades existentes cuando cambia el período o los cursos seleccionados
  useEffect(() => {
    if (!abierto || paso !== 2 || cursosSeleccionados.length === 0 || !asignaturaSeleccionada) return;

    let activo = true;
    (async () => {
      setCargandoActividades(true);
      setError(null);
      const resultado: Record<number, ActividadExistenteCompatible[]> = {};

      try {
        for (const cursoId of cursosSeleccionados) {
          const acts = await publicacionesApi.obtenerActividadesCompatibles(
            cursoId,
            asignaturaSeleccionada,
            periodoSeleccionado
          );
          resultado[cursoId] = acts;
        }

        if (activo) {
          setActividadesPorCurso(resultado);

          // Si una actividad previamente seleccionada ya no existe en el nuevo período, deseleccionar
          setActividadSeleccionadaPorCurso(prev => {
            const next = { ...prev };
            cursosSeleccionados.forEach(cId => {
              const acts = resultado[cId] || [];
              if (next[cId] && !acts.some(a => a.id === next[cId])) {
                delete next[cId];
              }
            });
            return next;
          });
        }
      } catch (err: any) {
        if (activo) setError(err?.message || 'Error consultando actividades');
      } finally {
        if (activo) setCargandoActividades(false);
      }
    })();

    return () => { activo = false; };
  }, [abierto, paso, cursosSeleccionados, asignaturaSeleccionada, periodoSeleccionado]);

  if (!abierto) return null;

  // Toggle curso
  const toggleCurso = (cursoId: number) => {
    setCursosSeleccionados(prev =>
      prev.includes(cursoId) ? prev.filter(id => id !== cursoId) : [...prev, cursoId]
    );
  };

  // Validaciones por paso
  const puedeAvanzarPaso1 = asignaturaSeleccionada !== '' && cursosSeleccionados.length > 0;
  
  // En Paso 2: Cada curso seleccionado debe tener una actividad existente vinculada
  const todosCursosTienenActividad = cursosSeleccionados.every(cId => Boolean(actividadSeleccionadaPorCurso[cId]));

  // Confirmar publicación
  const handlePublicar = async () => {
    if (!sessionUserId || !puedeAvanzarPaso1 || !todosCursosTienenActividad) return;
    setGuardando(true);
    setError(null);

    try {
      const entradas: EntradaPublicacionWizard[] = cursosSeleccionados.map(cursoId => ({
        cursoId,
        asignatura: asignaturaSeleccionada,
        actividadId: actividadSeleccionadaPorCurso[cursoId],
        requiereProducto: solicitaProducto,
        productoTexto: solicitaProducto ? descripcionProducto : null,
      }));

      await publicacionesApi.sincronizarPublicaciones(notaId, entradas, sessionUserId);

      if (onPublicadoExitoso) onPublicadoExitoso();
      onCerrar();
    } catch (e: any) {
      setError(e?.message || 'No se pudo publicar la ficha.');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-130 flex items-center justify-center p-3 sm:p-4 bg-[#2E3330]/40 backdrop-blur-xs font-['Inter',sans-serif]"
      onClick={onCerrar}
    >
      <div
        className="w-full max-w-lg bg-[#FCFCFA] rounded-2xl shadow-lg border border-[#2E3330]/15 overflow-hidden flex flex-col max-h-[90vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Cabecera compacta editorial CIELO */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#E2E5E0] bg-white">
          <div className="flex items-center gap-2.5">
            <span className="text-[11px] font-semibold tracking-wider uppercase px-2.5 py-0.5 bg-[#689C63]/12 text-[#689C63] rounded-full">
              Paso {paso} de 4
            </span>
            <h2 className="text-sm font-semibold text-[#2E3330] tracking-tight">
              {paso === 1 && '1. Destino (Asignatura y Cursos)'}
              {paso === 2 && '2. Actividad de Evaluación'}
              {paso === 3 && '3. Solicitud de Producto'}
              {paso === 4 && '4. Confirmación'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onCerrar}
            className="p-1 rounded-full text-[#5F665E] hover:text-[#2E3330] hover:bg-[#F7F7F4] transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Cuerpo del paso */}
        <div className="p-5 overflow-y-auto flex-1 space-y-4">
          {error && (
            <div className="p-3 bg-[#DB5B48]/10 border border-[#DB5B48]/25 rounded-xl text-xs font-medium text-[#DB5B48] flex items-center gap-2">
              <AlertCircle size={15} className="shrink-0 text-[#DB5B48]" />
              <span>{error}</span>
            </div>
          )}

          {cargando ? (
            <div className="flex items-center justify-center py-12 text-[#5F665E] gap-2">
              <Loader2 size={18} className="animate-spin text-[#689C63]" />
              <span className="text-xs font-medium">Cargando…</span>
            </div>
          ) : (
            <>
              {/* ── PASO 1: DESTINO ─────────────────────────────────────────── */}
              {paso === 1 && (
                <div className="space-y-4">
                  {/* Selector de Asignatura */}
                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#5F665E] mb-1.5">
                      Asignatura
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {asignaturasDocente.map(asig => {
                        const activa = asignaturaSeleccionada === asig;
                        return (
                          <button
                            key={asig}
                            type="button"
                            onClick={() => {
                              setAsignaturaSeleccionada(asig);
                              setCursosSeleccionados([]);
                              setActividadSeleccionadaPorCurso({});
                            }}
                            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all border ${
                              activa
                                ? 'bg-[#689C63] text-white border-[#689C63] shadow-xs'
                                : 'bg-white text-[#2E3330] border-[#E2E5E0] hover:border-[#689C63] hover:text-[#689C63]'
                            }`}
                          >
                            {getAsignaturaNombre(asig)}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Selector de Cursos compatibles */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#5F665E]">
                        Cursos compatibles ({cursosCompatibles.length})
                      </label>
                      {cursosCompatibles.length > 1 && (
                        <button
                          type="button"
                          onClick={() => {
                            if (cursosSeleccionados.length === cursosCompatibles.length) {
                              setCursosSeleccionados([]);
                            } else {
                              setCursosSeleccionados(cursosCompatibles.map(c => c.id));
                            }
                          }}
                          className="text-[11px] font-medium text-[#537BAC] hover:text-[#2E3330] underline"
                        >
                          {cursosSeleccionados.length === cursosCompatibles.length ? 'Deseleccionar todos' : 'Seleccionar todos'}
                        </button>
                      )}
                    </div>

                    {cursosCompatibles.length === 0 ? (
                      <p className="text-xs text-[#5F665E] py-3">No hay cursos registrados para esta asignatura.</p>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {cursosCompatibles.map(c => {
                          const seleccionado = cursosSeleccionados.includes(c.id);
                          return (
                            <button
                              key={c.id}
                              type="button"
                              onClick={() => toggleCurso(c.id)}
                              className={`p-3 rounded-xl border text-left flex items-center justify-between transition-all ${
                                seleccionado
                                  ? 'border-[#689C63] bg-[#689C63]/6 ring-1 ring-[#689C63]/30'
                                  : 'border-[#E2E5E0] bg-white hover:border-[#BFC9A6]'
                              }`}
                            >
                              <div>
                                <span className="block text-xs font-semibold text-[#2E3330]">{c.nombre}</span>
                                <span className="block text-[11px] text-[#5F665E] mt-0.5">
                                  {c.grado} {c.seccion}
                                </span>
                              </div>
                              <div
                                className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors ${
                                  seleccionado
                                    ? 'bg-[#689C63] border-[#689C63] text-white'
                                    : 'border-[#E2E5E0] bg-white'
                                }`}
                              >
                                {seleccionado && <Check size={12} strokeWidth={3} />}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ── PASO 2: ACTIVIDAD EXISTENTE ─────────────────────────────── */}
              {paso === 2 && (
                <div className="space-y-4">
                  {/* Selector de Período P1 - P4 */}
                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#5F665E] mb-1.5">
                      Filtrar por período académico
                    </label>
                    <div className="inline-flex items-center gap-1 bg-[#F7F7F4] p-1 rounded-full border border-[#E2E5E0]">
                      {PERIODOS.map(p => {
                        const activo = periodoSeleccionado === p;
                        return (
                          <button
                            key={p}
                            type="button"
                            onClick={() => setPeriodoSeleccionado(p)}
                            className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                              activo
                                ? 'bg-[#689C63] text-white shadow-xs'
                                : 'text-[#5F665E] hover:text-[#2E3330] hover:bg-white'
                            }`}
                          >
                            {p}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {cargandoActividades ? (
                    <div className="flex items-center justify-center py-8 text-[#5F665E] gap-2">
                      <Loader2 size={16} className="animate-spin text-[#689C63]" />
                      <span className="text-xs font-medium">Buscando actividades existentes…</span>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {cursosSeleccionados.map(cursoId => {
                        const curso = cursosCompatibles.find(c => c.id === cursoId);
                        const acts = actividadesPorCurso[cursoId] || [];
                        const actSeleccionadaId = actividadSeleccionadaPorCurso[cursoId] || null;

                        return (
                          <div
                            key={cursoId}
                            className="p-3.5 rounded-xl border border-[#E2E5E0] bg-[#F7F7F4]/60 space-y-2.5"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-semibold text-[#2E3330]">
                                {curso?.nombre} ({curso?.grado} {curso?.seccion})
                              </span>
                              <span className="text-[10px] font-medium text-[#5F665E] uppercase tracking-wide">
                                {acts.length} disponible{acts.length === 1 ? '' : 's'}
                              </span>
                            </div>

                            {acts.length === 0 ? (
                              <div className="p-3 bg-white rounded-lg border border-[#E2E5E0] text-center">
                                <p className="text-xs font-normal text-[#5F665E]">
                                  No hay actividades disponibles en este período.
                                </p>
                              </div>
                            ) : (
                              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                                {acts.map(act => {
                                  const esElegida = actSeleccionadaId === act.id;
                                  return (
                                    <button
                                      key={act.id}
                                      type="button"
                                      onClick={() => {
                                        setActividadSeleccionadaPorCurso(prev => ({
                                          ...prev,
                                          [cursoId]: act.id,
                                        }));
                                      }}
                                      className={`w-full p-2.5 rounded-xl border text-left transition-all flex items-start justify-between gap-3 ${
                                        esElegida
                                          ? 'border-[#689C63] bg-white ring-1 ring-[#689C63]/30 shadow-xs'
                                          : 'border-[#E2E5E0] bg-white hover:border-[#BFC9A6]'
                                      }`}
                                    >
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                          <span className="text-xs font-semibold text-[#2E3330] truncate">
                                            {act.nombre}
                                          </span>
                                          <span className="text-[10px] font-semibold px-2 py-0.5 bg-[#B8CADC]/25 text-[#537BAC] rounded-full">
                                            {act.periodo}
                                          </span>
                                        </div>

                                        <div className="flex items-center gap-3 mt-1 text-[11px] text-[#5F665E]">
                                          {act.fecha && (
                                            <span className="flex items-center gap-1">
                                              <Calendar size={11} />
                                              {act.fecha}
                                            </span>
                                          )}
                                          {act.indicador && (
                                            <span className="truncate max-w-55" title={act.indicador}>
                                              {act.indicador}
                                            </span>
                                          )}
                                        </div>
                                      </div>

                                      <div
                                        className={`w-4 h-4 rounded-full border mt-0.5 flex items-center justify-center shrink-0 ${
                                          esElegida
                                            ? 'border-[#689C63] bg-[#689C63] text-white'
                                            : 'border-[#E2E5E0] bg-white'
                                        }`}
                                      >
                                        {esElegida && <Check size={10} strokeWidth={3} />}
                                      </div>
                                    </button>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* ── PASO 3: PRODUCTO ────────────────────────────────────────── */}
              {paso === 3 && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#5F665E] mb-2">
                      ¿Solicitar un producto al estudiante?
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setSolicitaProducto(true)}
                        className={`py-2 px-3 rounded-full border text-xs font-semibold transition-all ${
                          solicitaProducto
                            ? 'bg-[#689C63] text-white border-[#689C63] shadow-xs'
                            : 'bg-white text-[#5F665E] border-[#E2E5E0] hover:border-[#689C63] hover:text-[#2E3330]'
                        }`}
                      >
                        Sí, solicitar producto
                      </button>
                      <button
                        type="button"
                        onClick={() => setSolicitaProducto(false)}
                        className={`py-2 px-3 rounded-full border text-xs font-semibold transition-all ${
                          !solicitaProducto
                            ? 'bg-[#689C63] text-white border-[#689C63] shadow-xs'
                            : 'bg-white text-[#5F665E] border-[#E2E5E0] hover:border-[#689C63] hover:text-[#2E3330]'
                        }`}
                      >
                        No, solo lectura
                      </button>
                    </div>
                  </div>

                  {solicitaProducto && (
                    <div className="space-y-1.5 pt-1">
                      <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#5F665E]">
                        Descripción del producto esperado
                      </label>
                      <textarea
                        rows={3}
                        value={descripcionProducto}
                        onChange={e => setDescripcionProducto(e.target.value)}
                        placeholder="Ej. Fotografía de los ejercicios resueltos en el cuaderno o archivo PDF."
                        className="w-full text-xs p-3 rounded-xl border border-[#E2E5E0] focus:outline-none focus:border-[#689C63] focus:ring-1 focus:ring-[#689C63]/30 bg-white text-[#2E3330] placeholder-[#5F665E]/50 font-normal transition-colors"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* ── PASO 4: CONFIRMACIÓN ────────────────────────────────────── */}
              {paso === 4 && (
                <div className="space-y-3">
                  <div className="p-4 rounded-xl border border-[#E2E5E0] bg-[#F7F7F4]/60 space-y-2.5 text-xs">
                    <div className="flex items-center justify-between pb-2 border-b border-[#E2E5E0]">
                      <span className="text-[#5F665E] font-medium">Ficha:</span>
                      <span className="font-semibold text-[#2E3330]">{notaTitulo || 'Ficha Didáctica'}</span>
                    </div>

                    <div className="flex items-center justify-between pb-2 border-b border-[#E2E5E0]">
                      <span className="text-[#5F665E] font-medium">Asignatura:</span>
                      <span className="font-semibold text-[#2E3330]">{getAsignaturaNombre(asignaturaSeleccionada)}</span>
                    </div>

                    <div className="flex items-center justify-between pb-2 border-b border-[#E2E5E0]">
                      <span className="text-[#5F665E] font-medium">Período:</span>
                      <span className="font-semibold text-[#2E3330]">{periodoSeleccionado}</span>
                    </div>

                    <div className="flex items-center justify-between pb-2 border-b border-[#E2E5E0]">
                      <span className="text-[#5F665E] font-medium">Cursos y Actividades vinculadas:</span>
                      <span className="font-semibold text-[#2E3330]">{cursosSeleccionados.length} sección(es)</span>
                    </div>

                    <div className="space-y-1.5 pl-2.5 pt-1 border-l-2 border-[#689C63]">
                      {cursosSeleccionados.map(cId => {
                        const curso = cursosCompatibles.find(c => c.id === cId);
                        const actId = actividadSeleccionadaPorCurso[cId];
                        const act = (actividadesPorCurso[cId] || []).find(a => a.id === actId);

                        return (
                          <div key={cId} className="flex items-center justify-between text-[11px]">
                            <span className="font-medium text-[#5F665E]">{curso?.nombre}:</span>
                            <span className="font-semibold text-[#2E3330] flex items-center gap-1.5">
                              <FileText size={12} className="text-[#537BAC]" />
                              {act?.nombre || `Actividad #${actId}`}
                            </span>
                          </div>
                        );
                      })}
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-[#E2E5E0]">
                      <span className="text-[#5F665E] font-medium">Entrega en Portal:</span>
                      <span className={`font-semibold ${solicitaProducto ? 'text-[#689C63]' : 'text-[#5F665E]'}`}>
                        {solicitaProducto ? 'Habilitada (Pide producto)' : 'Deshabilitada'}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Pie de navegación institucional CIELO */}
        <div className="px-5 py-3 border-t border-[#E2E5E0] bg-white flex items-center justify-between">
          {paso > 1 ? (
            <button
              type="button"
              onClick={() => setPaso(prev => ((prev - 1) as Paso))}
              disabled={guardando}
              className="px-4 py-1.5 rounded-full text-xs font-semibold text-[#5F665E] hover:text-[#2E3330] hover:bg-[#F7F7F4] transition-colors flex items-center gap-1.5"
            >
              <ArrowLeft size={13} />
              Atrás
            </button>
          ) : <div />}

          <div className="flex items-center gap-2">
            {paso < 4 ? (
              <button
                type="button"
                onClick={() => setPaso(prev => ((prev + 1) as Paso))}
                disabled={
                  (paso === 1 && !puedeAvanzarPaso1) ||
                  (paso === 2 && (!todosCursosTienenActividad || cargandoActividades))
                }
                className="px-5 py-1.5 rounded-full text-xs font-semibold bg-[#689C63] text-white hover:bg-[#5A8856] transition-all shadow-xs flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Siguiente
                <ArrowRight size={13} />
              </button>
            ) : (
              <button
                type="button"
                onClick={handlePublicar}
                disabled={guardando || !todosCursosTienenActividad}
                className="px-5 py-1.5 rounded-full text-xs font-semibold bg-[#689C63] text-white hover:bg-[#5A8856] transition-all shadow-xs flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {guardando ? (
                  <>
                    <Loader2 size={13} className="animate-spin" />
                    Publicando…
                  </>
                ) : (
                  <>
                    <Check size={14} strokeWidth={3} />
                    Publicar ficha
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
