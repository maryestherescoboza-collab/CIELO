import { useEffect, useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Loader2 } from 'lucide-react';
import { PORTAL_FAMILIA_ENABLED } from '../../config/features';

export interface AsignaturaPublicada {
  asignatura: string;
  mostrar_puntajes: boolean;
  mostrar_evidencias: boolean;
  mostrar_recursos: boolean;
  mostrar_incidencias: boolean;
  mostrar_recuperacion: boolean;
  published_until: string;
}

export type Periodo = 'P1' | 'P2' | 'P3' | 'P4';

export default function PortalLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const token = location.pathname.split('/')[2]; 
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  
  const [selectedPeriodo, setSelectedPeriodo] = useState<Periodo>('P1');
  const [asignaturas, setAsignaturas] = useState<AsignaturaPublicada[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!PORTAL_FAMILIA_ENABLED) return;
    const session = sessionStorage.getItem('portal_session');
    if (!session) {
      navigate(`/portal/${token}`);
      return;
    }
    setSessionToken(session);
  }, [navigate, token]);

  useEffect(() => {
    if (!sessionToken) return;

    const fetchAsignaturas = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data, error: rpcError } = await supabase.rpc('portal_get_asignaturas', {
          p_session_token: sessionToken,
          p_periodo: selectedPeriodo
        });
        
        if (rpcError) throw rpcError;
        if (data && data.error) throw new Error(data.error);
        
        setAsignaturas(data || []);
      } catch (err: any) {
        console.error(err);
        setError(err.message || 'Error al cargar las asignaturas');
        if (err.message === 'Sesión inválida') {
          sessionStorage.removeItem('portal_session');
          navigate(`/portal/${token}`);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchAsignaturas();
  }, [sessionToken, selectedPeriodo, token, navigate]);

  if (loading && asignaturas.length === 0) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6">
        <Loader2 className="animate-spin text-stone-900 mb-4" size={32} />
        <p className="text-stone-600 text-sm font-semibold">Cargando...</p>
      </div>
    );
  }

  const currentPath = location.pathname.split('/').pop() || '';

  return (
    <div className="portal-root flex justify-center items-center min-h-screen py-0 sm:py-6 selection:bg-purple-200 bg-white">
      <main className="w-full max-w-107.5 min-h-screen sm:min-h-222.5 sm:max-h-235 sm:rounded-[36px] sm:border-2 sm:border-zinc-900 overflow-hidden flex flex-col relative sm:shadow-2xl text-zinc-900 bg-white">
        <div className="flex-1 overflow-y-auto custom-scrollbar pb-24">
          {error ? (
            <div className="p-6 text-center mt-10">
              <p className="text-red-500 font-bold uppercase">Error de conexión</p>
              <p className="text-stone-600 text-sm mt-2">{error}</p>
            </div>
          ) : (
            <Outlet context={{
              token,
              asignaturas,
              selectedPeriodo,
              setSelectedPeriodo,
              sessionToken
            }} />
          )}
        </div>

        {/* BEGIN: BottomNavigationBar */}
        <nav className="absolute bottom-0 left-0 right-0 h-16 bg-white border-t border-[#E4E3EC] flex items-center justify-around px-2 sm:px-6 z-20">
          <button 
            onClick={() => navigate(`/portal/${token}/estudiante`)}
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
            onClick={() => navigate(`/portal/${token}/portafolio`)}
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
            onClick={() => navigate(`/portal/${token}/recuperaciones`)}
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
            onClick={() => navigate(`/portal/${token}/fichas`)}
            aria-current="page" 
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
        {/* END: BottomNavigationBar */}
      </main>
    </div>
  );
}
