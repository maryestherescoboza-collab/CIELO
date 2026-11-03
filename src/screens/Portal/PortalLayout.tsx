import { useEffect, useState, useMemo, useCallback } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import {
  Loader2,
  ArrowLeft,
  House,
  FolderOpen,
  Target,
  ClipboardList,
  Files,
  Frown
} from 'lucide-react';
import { PORTAL_FAMILIA_ENABLED } from '../../config/features';
import {
  SIETE_ASIGNATURAS_OFICIALES,
  ASIGNATURAS_CATALOGO,
  sonMismaAsignatura,
  getMensajeDocenteNoUsaCielo
} from '../../constants/asignaturas';
import {
  PortalAsignaturasSelector
} from './PortalAsignaturasSelector';
import type {
  AsignaturaPublicada,
  EstudianteContextInfo,
  Periodo,
  PortalConfig
} from './portalContext';

export type { AsignaturaPublicada, Periodo };

const PORTAL_NAV_TABS = [
  { key: 'estudiante', label: 'Inicio', icon: House, color: '#689C63', bgActive: 'bg-[#689C63]/12', borderActive: 'border-[#689C63]', textActive: 'text-[#689C63]', dotActive: 'bg-[#689C63]', ringActive: 'ring-[#689C63]/15' },
  { key: 'portafolio', label: 'Portafolio', icon: FolderOpen, color: '#537BAC', bgActive: 'bg-[#537BAC]/12', borderActive: 'border-[#537BAC]', textActive: 'text-[#537BAC]', dotActive: 'bg-[#537BAC]', ringActive: 'ring-[#537BAC]/15' },
  { key: 'recuperaciones', label: 'Recuperación', icon: Target, color: '#EB8847', bgActive: 'bg-[#EB8847]/12', borderActive: 'border-[#EB8847]', textActive: 'text-[#EB8847]', dotActive: 'bg-[#EB8847]', ringActive: 'ring-[#EB8847]/15' },
  { key: 'incidencias', label: 'Incidencias', icon: ClipboardList, color: '#DB5B48', bgActive: 'bg-[#DB5B48]/12', borderActive: 'border-[#DB5B48]', textActive: 'text-[#DB5B48]', dotActive: 'bg-[#DB5B48]', ringActive: 'ring-[#DB5B48]/15' },
  { key: 'fichas', label: 'Fichas', icon: Files, color: '#DEAE4D', bgActive: 'bg-[#DEAE4D]/15', borderActive: 'border-[#DEAE4D]', textActive: 'text-[#996B1E]', dotActive: 'bg-[#DEAE4D]', ringActive: 'ring-[#DEAE4D]/20' },
] as const;

export default function PortalLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const token = location.pathname.split('/')[2];
  const [sessionToken, setSessionToken] = useState<string | null>(null);

  const [selectedPeriodo, setSelectedPeriodo] = useState<Periodo>('P1');
  const [asignaturas, setAsignaturas] = useState<AsignaturaPublicada[]>([]);
  const [estudianteContext, setEstudianteContext] = useState<EstudianteContextInfo | null>(null);
  const [portalConfig, setPortalConfig] = useState<PortalConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Leer asignatura seleccionada de URL search param o de sessionStorage
  const [selectedAsignatura, setSelectedAsignaturaState] = useState<string | null>(() => {
    try {
      const fromUrl = new URLSearchParams(window.location.search).get('materia');
      if (fromUrl) return decodeURIComponent(fromUrl);
      const saved = sessionStorage.getItem('portal_materia_' + token);
      return saved || null;
    } catch {
      return null;
    }
  });

  // Validar sesión
  useEffect(() => {
    if (!PORTAL_FAMILIA_ENABLED) return;
    const session = sessionStorage.getItem('portal_session');
    if (!session) {
      navigate(`/portal/${token}`);
      return;
    }
    setSessionToken(session);
  }, [navigate, token]);

  // Sincronizar selectedAsignatura si cambia el search param de la URL (por ejemplo atrás/adelante en el navegador)
  useEffect(() => {
    try {
      const urlMateria = new URLSearchParams(location.search).get('materia');
      if (urlMateria && urlMateria !== selectedAsignatura) {
        setSelectedAsignaturaState(urlMateria);
        sessionStorage.setItem('portal_materia_' + token, urlMateria);
      } else if (!urlMateria && selectedAsignatura && !location.pathname.includes('/fichas/')) {
        // Si la URL no tiene materia y no estamos en una subruta de detalle de ficha, limpiar selección
        setSelectedAsignaturaState(null);
        sessionStorage.removeItem('portal_materia_' + token);
      }
    } catch {
      // ignore
    }
  }, [location.search, location.pathname, selectedAsignatura, token]);

  // Cargar contexto del estudiante y catálogo de asignaturas
  useEffect(() => {
    if (!sessionToken) return;

    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        // 1. Obtener contexto del estudiante (nombre, grado, sección, centro)
        const { data: contextData } = await supabase.rpc('portal_get_context', {
          p_session_token: sessionToken
        });

        if (contextData && contextData.valid) {
          setEstudianteContext({
            estudianteId: contextData.estudiante_id,
            nombre: contextData.estudiante_nombre,
            apellido: contextData.estudiante_apellido,
            grado: contextData.curso_grado,
            seccion: contextData.curso_seccion,
            centro: contextData.centro_nombre,
          });
        }

          if (contextData.portal_config) {
            setPortalConfig(contextData.portal_config);
            if (
              Array.isArray(contextData.portal_config.periodos_visibles) &&
              contextData.portal_config.periodos_visibles.length > 0 &&
              !contextData.portal_config.periodos_visibles.includes(selectedPeriodo)
            ) {
              setSelectedPeriodo(contextData.portal_config.periodos_visibles[0]);
            }
          }

        // 2. Obtener estado de las asignaturas
        const { data: asigData, error: rpcError } = await supabase.rpc('portal_get_asignaturas', {
          p_session_token: sessionToken,
          p_periodo: selectedPeriodo
        });

        if (rpcError) throw rpcError;
        if (asigData && asigData.error) throw new Error(asigData.error);

        const rawList: any[] = Array.isArray(asigData) ? asigData : [];

        // Combinar con las 7 asignaturas oficiales para asegurar presencia y nombres exactos
        const mergedList: AsignaturaPublicada[] = SIETE_ASIGNATURAS_OFICIALES.map((oficial) => {
          const match = rawList.find((item: any) => sonMismaAsignatura(item.asignatura, oficial.nombre));
          if (match) {
            return {
              asignatura: oficial.nombre,
              tiene_docente: match.tiene_docente !== undefined ? Boolean(match.tiene_docente) : true,
              total_actividades: match.total_actividades || 0,
              mostrar_puntajes: match.mostrar_puntajes ?? true,
              mostrar_evidencias: match.mostrar_evidencias ?? true,
              mostrar_recursos: match.mostrar_recursos ?? true,
              mostrar_incidencias: match.mostrar_incidencias ?? true,
              mostrar_recuperacion: match.mostrar_recuperacion ?? true,
              published_until: match.published_until,
            };
          }
          return {
            asignatura: oficial.nombre,
            tiene_docente: false,
            total_actividades: 0,
            mostrar_puntajes: true,
            mostrar_evidencias: true,
            mostrar_recursos: true,
            mostrar_incidencias: true,
            mostrar_recuperacion: true,
            published_until: null,
          };
        });

        // Incluir cualquier otra asignatura de rawList con docente (ej. Formación Integral)
        rawList.forEach((extra: any) => {
          if (!mergedList.some((m) => sonMismaAsignatura(m.asignatura, extra.asignatura))) {
            const catalogoItem = ASIGNATURAS_CATALOGO.find((c) => sonMismaAsignatura(c.id, extra.asignatura) || sonMismaAsignatura(c.nombre, extra.asignatura));
            const nombreMostrar = catalogoItem ? catalogoItem.nombre : extra.asignatura;
            mergedList.push({
              asignatura: nombreMostrar,
              tiene_docente: true,
              total_actividades: extra.total_actividades || 0,
              mostrar_puntajes: extra.mostrar_puntajes ?? true,
              mostrar_evidencias: extra.mostrar_evidencias ?? true,
              mostrar_recursos: extra.mostrar_recursos ?? true,
              mostrar_incidencias: extra.mostrar_incidencias ?? true,
              mostrar_recuperacion: extra.mostrar_recuperacion ?? true,
              published_until: extra.published_until,
            });
          }
        });

        setAsignaturas(mergedList);
      } catch (err: any) {
        console.error('Error al cargar portal:', err);
        setError(err.message || 'Error al cargar las asignaturas');
        if (err.message === 'Sesión inválida') {
          sessionStorage.removeItem('portal_session');
          navigate(`/portal/${token}`);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [sessionToken, selectedPeriodo, token, navigate]);

  // Manejar selección de asignatura
  
  // Pestañas visibles según la configuración del docente
  const visibleNavTabs = useMemo(() => {
    if (!portalConfig) return PORTAL_NAV_TABS;
    return PORTAL_NAV_TABS.filter((tab) => {
      if (tab.key === 'estudiante') return portalConfig.seccion_inicio !== false;
      if (tab.key === 'portafolio') return portalConfig.seccion_portafolio !== false;
      if (tab.key === 'recuperaciones') return portalConfig.seccion_recuperacion !== false;
      if (tab.key === 'incidencias') return portalConfig.seccion_incidencias !== false;
      if (tab.key === 'fichas') return portalConfig.seccion_fichas !== false;
      return true;
    });
  }, [portalConfig]);

  // Protección de rutas: Si el estudiante intenta acceder por URL directa a una sección deshabilitada
  useEffect(() => {
    if (!portalConfig || loading) return;

    const currentTab = location.pathname.split('/')[3] || 'estudiante';
    let isCurrentDisabled = false;

    if (currentTab === 'estudiante' && portalConfig.seccion_inicio === false) isCurrentDisabled = true;
    if (currentTab === 'portafolio' && portalConfig.seccion_portafolio === false) isCurrentDisabled = true;
    if (currentTab === 'recuperaciones' && portalConfig.seccion_recuperacion === false) isCurrentDisabled = true;
    if (currentTab === 'incidencias' && portalConfig.seccion_incidencias === false) isCurrentDisabled = true;
    if (currentTab === 'fichas' && portalConfig.seccion_fichas === false) isCurrentDisabled = true;

    if (isCurrentDisabled && visibleNavTabs.length > 0) {
      const firstEnabled = visibleNavTabs[0]?.key;
      const query = selectedAsignatura ? `?materia=${encodeURIComponent(selectedAsignatura)}` : '';
      navigate(`/portal/${token}/${firstEnabled}${query}`, { replace: true });
    }
  }, [portalConfig, location.pathname, loading, visibleNavTabs, selectedAsignatura, token, navigate]);

  const handleSelectAsignatura = useCallback((materia: string) => {
    setSelectedAsignaturaState(materia);
    sessionStorage.setItem('portal_materia_' + token, materia);

    const currentSegments = location.pathname.split('/');
    const currentTab = currentSegments[3] || 'estudiante';
    const targetTab = ['estudiante', 'portafolio', 'recuperaciones', 'incidencias', 'fichas', 'drive'].includes(currentTab)
      ? currentTab
      : 'estudiante';

    navigate(`/portal/${token}/${targetTab}?materia=${encodeURIComponent(materia)}`);
  }, [location.pathname, navigate, token]);

  // Manejar regreso a « Mis asignaturas
  const handleDeselectAsignatura = useCallback(() => {
    setSelectedAsignaturaState(null);
    sessionStorage.removeItem('portal_materia_' + token);
    navigate(`/portal/${token}/estudiante`);
  }, [navigate, token]);

  // Navegar entre pestañas preservando la asignatura activa
  const handleNavigateTab = (tab: string) => {
    const query = selectedAsignatura ? `?materia=${encodeURIComponent(selectedAsignatura)}` : '';
    navigate(`/portal/${token}/${tab}${query}`);
  };

  // Metadatos de la asignatura activa
  const activeOficial = useMemo(() => {
    if (!selectedAsignatura) return null;
    return SIETE_ASIGNATURAS_OFICIALES.find((a) => sonMismaAsignatura(a.nombre, selectedAsignatura)) || null;
  }, [selectedAsignatura]);

  const activePub = useMemo(() => {
    if (!selectedAsignatura) return null;
    return asignaturas.find((a) => sonMismaAsignatura(a.asignatura, selectedAsignatura)) || null;
  }, [asignaturas, selectedAsignatura]);

  const tieneDocenteActivo = activePub ? (activePub.tiene_docente ?? true) : false;

  if (loading && asignaturas.length === 0) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6">
        <Loader2 className="animate-spin text-stone-900 mb-4" size={32} />
        <p className="text-stone-600 text-sm font-semibold">Cargando tu portal...</p>
      </div>
    );
  }

  const currentPath = location.pathname.split('/')[3] || 'estudiante';

  // Si no hay asignatura seleccionada, o si la asignatura elegida no tiene docente asignado
  const renderSubjectSelector = !selectedAsignatura && currentPath !== 'incidencias';
  const renderUnassignedState = Boolean(selectedAsignatura && !tieneDocenteActivo && currentPath !== 'incidencias');

  return (
    <div className="portal-root w-full min-h-screen bg-[#FCFCFA] selection:bg-[#BFC9A6]/40">
      <main className="w-full min-h-screen flex flex-col relative text-[#1B1F2A] bg-[#FCFCFA]">
        {/* CABECERA CON BOTÓN « Mis asignaturas » */}
        {selectedAsignatura && !renderUnassignedState ? (
          <header className="sticky top-0 z-30 bg-[#FCFCFA]/95 backdrop-blur-md border-b border-[#E4E3EC] px-4 py-2.5 flex items-center justify-between">
            <button
              onClick={handleDeselectAsignatura}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-[#1B1F2A] bg-[#BFC9A6]/20 hover:bg-[#BFC9A6]/35 active:scale-95 rounded-full transition-all border border-[#BFC9A6]/40"
              title="Volver a la selección de asignaturas"
            >
              <ArrowLeft size={13} className="text-stone-600" />
              <span>Mis asignaturas</span>
            </button>

            <div className="flex items-center gap-1.5 px-3 py-1 bg-stone-50 border border-stone-200 rounded-full max-w-[55%]">
              <span className="text-xs shrink-0">{activeOficial?.icono || '📖'}</span>
              <span className="text-xs font-bold text-stone-900 truncate">
                {selectedAsignatura}
              </span>
            </div>
          </header>
        ) : (!selectedAsignatura && currentPath === 'incidencias') ? (
          <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-stone-200 px-4 py-2.5 flex items-center justify-between">
            <button
              onClick={handleDeselectAsignatura}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-stone-700 bg-stone-100 hover:bg-stone-200 active:scale-95 rounded-full transition-all"
              title="Volver a la selección de asignaturas"
            >
              <ArrowLeft size={13} className="text-stone-600" />
              <span>Mis asignaturas</span>
            </button>

            <div className="flex items-center gap-1.5 px-3 py-1 bg-stone-50 border border-stone-200 rounded-full">
              <span className="text-xs shrink-0">🚩</span>
              <span className="text-xs font-bold text-stone-900">
                Incidencias
              </span>
            </div>
          </header>
        ) : null}

        {/* ÁREA DE CONTENIDO */}
        <div className={`flex-1 overflow-y-auto custom-scrollbar ${(selectedAsignatura || currentPath === 'incidencias') && !renderUnassignedState ? 'pb-24 sm:pb-28 lg:pb-32' : 'pb-6 lg:pb-8'} w-full max-w-400 mx-auto px-0`}>
          {error ? (
            <div className="p-6 text-center mt-10">
              <p className="text-red-500 font-bold uppercase">Error de conexión</p>
              <p className="text-stone-600 text-sm mt-2">{error}</p>
            </div>
          ) : renderSubjectSelector ? (
            <PortalAsignaturasSelector
              sessionToken={sessionToken}
              selectedPeriodo={selectedPeriodo}
              estudianteContext={estudianteContext}
              asignaturas={asignaturas}
              onSelectAsignatura={handleSelectAsignatura}
            />
          ) : renderUnassignedState ? (
            /* Estado sobrio si la asignatura seleccionada no tiene docente en CIELO */
            <div className="px-5 py-6 flex flex-col min-h-[75vh] justify-between animate-in fade-in duration-200">
              <div>
                <button
                  onClick={handleDeselectAsignatura}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-stone-700 bg-stone-100 hover:bg-stone-200 active:scale-95 rounded-full transition-all mb-6"
                >
                  <ArrowLeft size={14} />
                  <span>Mis asignaturas</span>
                </button>

                <div className="relative max-w-sm mx-auto">
                  {/* Sombra rayada diagonal artesanal tipo grabado */}
                  <div
                    aria-hidden="true"
                    className="absolute top-1.5 left-1.5 -right-2 -bottom-2 rounded-3xl pointer-events-none portal-hatched-shadow"
                  />
                  <div className="relative z-10 bg-white border-[2.5px] border-[#1E1E24] rounded-3xl p-6 sm:p-8 text-center space-y-5">
                    <div className="flex items-center justify-center py-2">
                      <Frown className="w-16 h-16 text-[#1E1E24]" strokeWidth={1.8} />
                    </div>

                    <div className="space-y-2">
                      <span className="inline-block text-[11px] font-black tracking-wider uppercase px-2.5 py-0.5 rounded-full border border-stone-300 bg-stone-100 text-stone-700">
                        {selectedAsignatura}
                      </span>

                      <h2 className="text-base sm:text-lg font-black text-stone-900 leading-snug px-2">
                        «{getMensajeDocenteNoUsaCielo(selectedAsignatura || '')}»
                      </h2>

                      <p className="text-xs text-stone-600 leading-relaxed max-w-sm mx-auto pt-1">
                        Tan pronto como tu docente comience a registrar evaluaciones y actividades en la plataforma, podrás consultar aquí su progreso, calificaciones y portafolio.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-6 pb-2 max-w-sm mx-auto w-full">
                <button
                  onClick={handleDeselectAsignatura}
                  className="w-full py-3 px-4 rounded-2xl bg-[#1E1E24] hover:bg-black text-white font-black text-xs active:scale-98 transition flex items-center justify-center gap-2 shadow-sm"
                >
                  <ArrowLeft size={14} />
                  <span>Volver a mis asignaturas</span>
                </button>
              </div>
            </div>
          ) : (
            <Outlet context={{
              token,
              sessionToken,
              asignaturas,
              selectedPeriodo,
              setSelectedPeriodo,
              selectedAsignatura,
              setSelectedAsignatura: handleSelectAsignatura,
              estudianteContext,
              portalConfig,
            }} />
          )}
        </div>

        {/* BARRA INFERIOR DE NAVEGACIÓN: Visible cuando hay una asignatura activa o en Incidencias */}
        {(selectedAsignatura || currentPath === 'incidencias') && !renderUnassignedState && (
          <nav
            aria-label="Menú de navegación del portal"
            className="fixed bottom-0 left-0 right-0 h-16 sm:h-18 bg-[#FCFCFA]/95 backdrop-blur-md border-t border-[#E4E3EC] flex items-center justify-around px-1 sm:px-4 md:px-6 z-40 shadow-[0_-2px_10px_rgba(0,0,0,0.03)]"
          >
            {visibleNavTabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = tab.key === 'estudiante'
                ? (currentPath === 'estudiante' || currentPath === '')
                : currentPath === tab.key;

              return (
                <button
                  key={tab.key}
                  onClick={() => handleNavigateTab(tab.key)}
                  aria-label={tab.label}
                  aria-current={isActive ? 'page' : undefined}
                  className="flex-1 flex flex-col items-center justify-center h-full py-1 focus:outline-none transition-all group active:scale-95"
                >
                  <div
                    className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center transition-all duration-200 ${isActive
                        ? `${tab.bgActive} border-2 ${tab.borderActive} ${tab.textActive} shadow-xs ring-2 ${tab.ringActive} -translate-y-0.5`
                        : 'bg-white border border-[#E4E3EC] text-[#5F665E] group-hover:text-[#1B1F2A] group-hover:border-[#BFC9A6] group-hover:bg-[#FCFCFA] shadow-2xs'
                      }`}
                  >
                    <Icon
                      className="w-4.5 h-4.5 sm:w-5 sm:h-5 transition-transform group-hover:scale-105"
                      strokeWidth={isActive ? 2.2 : 1.9}
                    />
                  </div>
                  <span
                    className={`text-[10px] sm:text-[11px] mt-1 transition-colors leading-none tracking-tight ${isActive
                        ? 'font-bold text-[#1B1F2A]'
                        : 'font-medium text-[#767a76] group-hover:text-[#1B1F2A]'
                      }`}
                  >
                    {tab.label}
                  </span>
                  <span
                    className={`w-1 h-1 rounded-full mt-0.5 transition-all ${isActive ? `${tab.dotActive} scale-100 opacity-100` : 'bg-transparent scale-0 opacity-0'
                      }`}
                  />
                </button>
              );
            })}
          </nav>
        )}

      </main>
    </div>
  );
}
