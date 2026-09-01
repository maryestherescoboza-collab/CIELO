import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Loader2, AlertCircle, Award } from 'lucide-react';
import type { AsignaturaPublicada } from './PortalLayout';

interface DashboardSubject {
  asignatura: string;
  mostrar_puntajes: boolean;
  promedio: number | null;
}

interface DashboardData {
  promedio_general: number;
  ranking: number;
  total_estudiantes: number;
  asignaturas: DashboardSubject[];
}

export default function PortalDashboard() {
  const { sessionToken, selectedPeriodo } = useOutletContext<{
    sessionToken: string;
    selectedPeriodo: string;
    asignaturas: AsignaturaPublicada[];
  }>();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);

  useEffect(() => {
    if (!sessionToken) return;

    const fetchDashboard = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data, error: rpcError } = await supabase.rpc('portal_get_dashboard', {
          p_session_token: sessionToken,
          p_periodo: selectedPeriodo
        });
        
        if (rpcError) throw rpcError;
        if (data && data.error) {
          throw new Error(data.error);
        }
        
        setDashboardData(data as DashboardData);
      } catch (err: any) {
        console.error(err);
        setError(err.message || 'Error al cargar el resumen');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, [sessionToken, selectedPeriodo]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Loader2 className="animate-spin text-(--primary) mb-4" size={32} />
        <p className="text-(--ink-soft) text-sm font-semibold">Cargando resumen del {selectedPeriodo}...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-danger/20 text-center">
        <AlertCircle className="mx-auto text-danger mb-2" size={32} />
        <p className="text-danger font-bold text-sm uppercase tracking-widest mb-2">Error</p>
        <p className="text-(--ink-soft) text-sm">{error}</p>
      </div>
    );
  }

  if (!dashboardData || !dashboardData.asignaturas || dashboardData.asignaturas.length === 0) {
    return (
      <div className="bg-white p-12 rounded-3xl shadow-sm border border-(--border-soft) text-center">
        <div className="w-16 h-16 bg-(--linen)/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Award className="text-(--ink-soft)" size={32} />
        </div>
        <h3 className="text-lg font-black text-(--ink) mb-2">Sin calificaciones</h3>
        <p className="text-(--ink-soft) text-sm max-w-md mx-auto">
          Aún no hay calificaciones publicadas para este período.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300 print:space-y-4">
      {/* ===== HERO PASAPORTE EN DASHBOARD ===== */}
      <div className="passport">
        <div className="passport-watermark">ACADÉMICO</div>
        <div className="passport-topbar">
          <span className="passport-kicker">Resumen General</span>
          <div className="passport-print" onClick={() => window.print()}>🖨️ Imprimir</div>
        </div>
        <div className="stamps-zone">
          <div className="stamp stamp-rect" style={{ transform: 'rotate(-5deg)' }}>
            PERÍODO {selectedPeriodo}
          </div>
          <div className="stamp">
            <div style={{ border: '2.5px dotted #1f6f63', borderRadius: '50%', width: 96, height: 96, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', transform: 'rotate(-4deg)' }}>
              <span style={{ fontWeight: 900, fontSize: 18 }}>
                {dashboardData.promedio_general}%
              </span>
              <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: 0.5 }}>PROMEDIO</span>
            </div>
          </div>
        </div>
        <div className="passport-crease"></div>
        <h2 className="passport-title">PASAPORTE ACADÉMICO</h2>
        <div className="passport-body">
          <div className="passport-photo">
            <div className="photo-frame">E</div>
            <div className="photo-name">Estudiante</div>
            <div className="photo-role">Passenger</div>
          </div>
          <div className="passport-fields">
            <span className="field-label">RESUMEN ACADÉMICO</span>
            <div className="passport-data-row">
              <div className="pdr-item">
                <span className="pdr-value">{dashboardData.promedio_general}%</span>
                <span className="pdr-label">Promedio general · Período {selectedPeriodo}</span>
              </div>
            </div>
            <span className="field-label">RANKING DE CURSO</span>
            <div className="passport-data-row">
              <div className="pdr-item">
                <span className="pdr-value">#{dashboardData.ranking}</span>
                <span className="pdr-label">De {dashboardData.total_estudiantes} estudiantes</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border-2 border-(--border-soft) print:border-none print:shadow-none print:p-0">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-black text-(--ink) uppercase tracking-tight print:text-2xl">Desglose por Asignatura</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {dashboardData.asignaturas.map((sub, i) => (
            <div key={i} className="bg-(--background) p-5 rounded-2xl border border-(--border-soft) flex items-center justify-between">
              <div>
                <h3 className="text-sm font-black text-(--ink) uppercase tracking-widest">{sub.asignatura}</h3>
                <p className="text-xs text-(--ink-soft) font-medium mt-1">Calificación promedio</p>
              </div>
              <div className="text-right">
                {sub.mostrar_puntajes ? (
                  <span className={`text-2xl font-black ${sub.promedio && sub.promedio >= 70 ? 'text-(--herb-garden)' : sub.promedio && sub.promedio > 0 ? 'text-danger' : 'text-(--ink-soft)'}`}>
                    {sub.promedio !== null && sub.promedio > 0 ? sub.promedio : '--'}
                  </span>
                ) : (
                  <span className="text-sm font-bold text-(--ink-soft)">Oculto</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
