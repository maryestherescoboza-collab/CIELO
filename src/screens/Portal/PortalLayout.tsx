import { useEffect, useState, useMemo, useCallback } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Loader2, ArrowLeft } from 'lucide-react';
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
import { getIlustracionAsignatura } from './PortalCardIllustrations';
import type { 
  AsignaturaPublicada, 
  EstudianteContextInfo,
  Periodo
} from './portalContext';

export type { AsignaturaPublicada, Periodo };

export default function PortalLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const token = location.pathname.split('/')[2]; 
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  
  const [selectedPeriodo, setSelectedPeriodo] = useState<Periodo>('P1');
  const [asignaturas, setAsignaturas] = useState<AsignaturaPublicada[]>([]);
  const [estudianteContext, setEstudianteContext] = useState<EstudianteContextInfo | null>(null);
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
    <div className="portal-root w-full min-h-screen bg-white selection:bg-purple-200">
      <main className="w-full min-h-screen flex flex-col relative text-zinc-900 bg-white">
        {/* CABECERA CON BOTÓN « Mis asignaturas » */}
        {selectedAsignatura && !renderUnassignedState ? (
          <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-stone-200 px-4 py-2.5 flex items-center justify-between">
            <button
              onClick={handleDeselectAsignatura}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-stone-700 bg-stone-100 hover:bg-stone-200 active:scale-95 rounded-full transition-all"
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
        <div className={`flex-1 overflow-y-auto custom-scrollbar ${(selectedAsignatura || currentPath === 'incidencias') && !renderUnassignedState ? 'pb-24 sm:pb-28 lg:pb-32' : 'pb-6 lg:pb-8'} w-full max-w-[1600px] mx-auto px-0`}>
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

                <div className="bg-white border-2 border-[#1E1E24] rounded-3xl p-6 sm:p-8 text-center space-y-5 shadow-md max-w-sm mx-auto">
                  <div className="w-28 h-28 mx-auto rounded-2xl border-2 border-[#1E1E24] overflow-hidden shadow-sm">
                    {getIlustracionAsignatura(selectedAsignatura || '', "w-full h-full object-cover")}
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
            }} />
          )}
        </div>

        {/* BARRA INFERIOR DE NAVEGACIÓN: Visible cuando hay una asignatura activa o en Incidencias */}
        {(selectedAsignatura || currentPath === 'incidencias') && !renderUnassignedState && (
          <nav className="fixed bottom-0 left-0 right-0 h-16 bg-white border-t border-[#E4E3EC] flex items-center justify-around px-1 sm:px-3 md:px-6 lg:px-8 z-40">
            <button 
              onClick={() => handleNavigateTab('estudiante')}
              aria-label="Inicio" 
              className={`flex-1 flex flex-col items-center justify-center h-full focus:outline-none transition-colors ${currentPath === 'estudiante' || currentPath === '' ? 'text-[#1B1F2A]' : 'text-[#767a76] hover:text-[#1B1F2A]'}`}
            >
              <div className={`flex flex-col items-center justify-center p-1.5 rounded-xl ${currentPath === 'estudiante' || currentPath === '' ? 'bg-[#F1F1EC]' : ''}`}>
                <svg className="w-5 h-5 stroke-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path d="M2.25 12l8.954-8.955a1.126 1.126 0 011.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" strokeLinecap="round" strokeLinejoin="round"></path>
                </svg>
                <span className={`text-[10px] mt-0.5 ${currentPath === 'estudiante' || currentPath === '' ? 'font-bold' : 'font-medium'}`}>Inicio</span>
              </div>
            </button>
            
            <button 
              onClick={() => handleNavigateTab('portafolio')}
              aria-label="Portafolio" 
              className={`flex-1 flex flex-col items-center justify-center h-full focus:outline-none transition-colors ${currentPath === 'portafolio' ? 'text-[#1B1F2A]' : 'text-[#767a76] hover:text-[#1B1F2A]'}`}
            >
              <div className={`flex flex-col items-center justify-center p-1.5 rounded-xl ${currentPath === 'portafolio' ? 'bg-[#F1F1EC]' : ''}`}>
                <svg className="w-5 h-5 stroke-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path d="M2.25 13.5h3.86a2.25 2.25 0 012.012 1.244l.256.512a2.25 2.25 0 002.013 1.244h3.218a2.25 2.25 0 002.013-1.244l.256-.512a2.25 2.25 0 012.013-1.244h3.859m-19.5.338V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18v-4.162c0-.224-.034-.447-.1-.661L19.24 5.338a2.25 2.25 0 00-2.15-1.588H6.911a2.25 2.25 0 00-2.15 1.588L2.35 13.177a2.25 2.25 0 00-.1.661z" strokeLinecap="round" strokeLinejoin="round"></path>
                </svg>
                <span className={`text-[10px] mt-0.5 ${currentPath === 'portafolio' ? 'font-bold' : 'font-medium'}`}>Portafolio</span>
              </div>
            </button>

            <button 
              onClick={() => handleNavigateTab('recuperaciones')}
              aria-label="Recuperaciones" 
              className={`flex-1 flex flex-col items-center justify-center h-full focus:outline-none transition-colors ${currentPath === 'recuperaciones' ? 'text-[#1B1F2A]' : 'text-[#767a76] hover:text-[#1B1F2A]'}`}
            >
              <div className={`flex flex-col items-center justify-center p-1.5 rounded-xl ${currentPath === 'recuperaciones' ? 'bg-[#F1F1EC]' : ''}`}>
                <svg className="w-5 h-5 stroke-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                </svg>
                <span className={`text-[10px] mt-0.5 ${currentPath === 'recuperaciones' ? 'font-bold' : 'font-medium'}`}>Recuperación</span>
              </div>
            </button>

            <button 
              onClick={() => handleNavigateTab('incidencias')}
              aria-label="Incidencias" 
              className={`flex-1 flex flex-col items-center justify-center h-full focus:outline-none transition-colors ${currentPath === 'incidencias' ? 'text-[#1B1F2A]' : 'text-[#767a76] hover:text-[#1B1F2A]'}`}
            >
              <div className={`flex flex-col items-center justify-center p-1.5 rounded-xl ${currentPath === 'incidencias' ? 'bg-[#F1F1EC]' : ''}`}>
                <svg className="w-5 h-5 stroke-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 3v1.5M3 21v-6m0 0 2.77-.693a9 9 0 0 1 6.208.682l.108.054a9 9 0 0 0 6.086.71l3.114-.732a48.524 48.524 0 0 1-.005-10.499l-3.11.732a9 9 0 0 1-6.085-.711l-.108-.054a9 9 0 0 0-6.208-.682L3 4.5M3 15V4.5" />
                </svg>
                <span className={`text-[10px] mt-0.5 ${currentPath === 'incidencias' ? 'font-bold' : 'font-medium'}`}>Incidencias</span>
              </div>
            </button>

            <button 
              onClick={() => handleNavigateTab('fichas')}
              aria-label="Fichas" 
              className={`flex-1 flex flex-col items-center justify-center h-full focus:outline-none transition-colors ${currentPath === 'fichas' ? 'text-[#1B1F2A]' : 'text-[#767a76] hover:text-[#1B1F2A]'}`}
            >
              <div className={`flex flex-col items-center justify-center p-1.5 rounded-xl ${currentPath === 'fichas' ? 'bg-[#F1F1EC]' : ''}`}>
                <svg className="w-5 h-5 stroke-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 9v7.5" strokeLinecap="round" strokeLinejoin="round"></path>
                </svg>
                <span className={`text-[10px] mt-0.5 ${currentPath === 'fichas' ? 'font-bold' : 'font-medium'}`}>Fichas</span>
              </div>
            </button>
          </nav>
        )}

      </main>
    </div>
  );
}
