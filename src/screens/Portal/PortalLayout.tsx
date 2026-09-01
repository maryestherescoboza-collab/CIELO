import { useEffect, useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Loader2, LogOut } from 'lucide-react';
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

export default function PortalLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const token = location.pathname.split('/')[2]; // /portal/:token/...
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  
  const [periodos] = useState(['P1', 'P2', 'P3', 'P4']);
  const [selectedPeriodo, setSelectedPeriodo] = useState('P1');
  
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
        if (data && data.error) {
          throw new Error(data.error);
        }
        
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

  const handleLogout = () => {
    sessionStorage.removeItem('portal_session');
    navigate(`/portal/${token}`);
  };

  if (loading && asignaturas.length === 0) {
    return (
      <div className="min-h-screen bg-(--background) flex flex-col items-center justify-center p-6">
        <Loader2 className="animate-spin text-(--primary) mb-4" size={32} />
        <p className="text-(--ink-soft) text-sm font-semibold">Cargando información académica...</p>
      </div>
    );
  }

  const currentTab = location.pathname.split('/').pop() || 'dashboard';

  return (
    <div className="portal-root">
      <div className="portal-wrap">
        {/* ── Top Nav ── */}
        <div className="portal-navbar print:hidden">
          <div className="portal-logo"><span className="logo-badge">📘</span> EduTrack</div>
          
          <div className="portal-navtabs custom-scrollbar">
            <span
              onClick={() => navigate(`/portal/${token}/dashboard`)}
              className={`ntab ${currentTab === 'dashboard' ? 'active' : ''}`}
            >
              Resumen General
            </span>
            
            {asignaturas.map((asig, i) => {
              const isActive = location.pathname.includes(`/asignatura/${encodeURIComponent(asig.asignatura)}`);
              return (
                <span
                  key={i}
                  onClick={() => navigate(`/portal/${token}/asignatura/${encodeURIComponent(asig.asignatura)}`)}
                  className={`ntab ${isActive ? 'active' : ''}`}
                >
                  {asig.asignatura}
                </span>
              );
            })}
          </div>

          <div className="flex items-center gap-3">
            <select
              value={selectedPeriodo}
              onChange={(e) => setSelectedPeriodo(e.target.value)}
              className="bg-(--yellow-soft) border-2 border-(--ink) text-(--ink) text-xs font-bold uppercase tracking-widest py-1.5 px-3 rounded-xl cursor-pointer"
            >
              {periodos.map(p => (
                <option key={p} value={p}>Periodo {p.replace('P', '')}</option>
              ))}
            </select>
            <div className="portal-nav-avatar cursor-pointer hover:bg-(--coral-soft) transition-colors" onClick={handleLogout} title="Cerrar Sesión">
              <LogOut size={16} />
            </div>
          </div>
        </div>

        {/* ── Contenido Principal ── */}
        <main>
          {error ? (
            <div className="portal-card" style={{ borderColor: 'var(--coral)', textAlign: 'center' }}>
              <p style={{ color: 'var(--coral)', fontWeight: 900, textTransform: 'uppercase' }}>Error de conexión</p>
              <p>{error}</p>
            </div>
          ) : (
            <Outlet context={{ asignaturas, selectedPeriodo, sessionToken }} />
          )}
        </main>
      </div>
    </div>
  );
}
