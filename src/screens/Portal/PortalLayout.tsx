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
      <main className="w-full max-w-[430px] min-h-screen sm:min-h-[890px] sm:max-h-[940px] sm:rounded-[36px] sm:border-2 sm:border-zinc-900 overflow-hidden flex flex-col relative sm:shadow-2xl text-zinc-900 bg-white">
        <div className="flex-1 overflow-y-auto custom-scrollbar pb-24">
          {error ? (
            <div className="p-6 text-center mt-10">
              <p className="text-red-500 font-bold uppercase">Error de conexión</p>
              <p className="text-stone-600 text-sm mt-2">{error}</p>
            </div>
          ) : (
            <Outlet context={{ 
              asignaturas, 
              selectedPeriodo, 
              setSelectedPeriodo,
              sessionToken 
            }} />
          )}
        </div>

        {/* BEGIN: BottomNavigationBar */}
        <nav className="absolute bottom-0 left-0 right-0 h-16 bg-white border-t border-black flex items-center justify-around px-6 z-20">
          <button 
            onClick={() => navigate(`/portal/${token}/estudiante`)}
            aria-label="Inicio" 
            className={`flex flex-col items-center justify-center focus:outline-none ${currentPath === 'estudiante' ? 'text-black' : 'text-neutral-700 hover:text-black'}`}
          >
            <svg className="w-5 h-5 stroke-[1.8]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path d="M2.25 12l8.954-8.955a1.126 1.126 0 011.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" strokeLinecap="round" strokeLinejoin="round"></path>
            </svg>
            <span className="text-[9px] font-semibold mt-0.5">Inicio</span>
          </button>
          
          <button 
            onClick={() => navigate(`/portal/${token}/fichas`)}
            aria-current="page" 
            aria-label="Agenda" 
            className={`flex items-center space-x-1 px-4 py-1.5 border border-black rounded-lg text-black focus:outline-none ${currentPath === 'fichas' ? 'bg-brand-purple font-bold' : 'bg-transparent border-transparent'}`}
          >
            <svg className="w-4 h-4 stroke-[2]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 9v7.5" strokeLinecap="round" strokeLinejoin="round"></path>
            </svg>
            <span className="text-[10px] font-bold ml-1">Agenda</span>
          </button>
        </nav>
        {/* END: BottomNavigationBar */}
      </main>
    </div>
  );
}
