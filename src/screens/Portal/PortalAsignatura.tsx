import React, { useEffect, useState } from 'react';
import { useParams, useOutletContext, Navigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Loader2 } from 'lucide-react';
import type { AsignaturaPublicada } from './PortalLayout';

interface Evidencia {
  id: number;
  nombre: string;
  fecha: string;
  indicador?: string;
  bcAsignados?: string[] | any;
  puntaje: number | null;
  descriptores: string[] | null;
  eval_detalle?: {
    rubricaData?: Record<string, unknown>;
    cotejoData?: Record<string, unknown>;
    plantillaId?: number | null;
  } | null;
}

const getDescriptorText = (ev: Evidencia): string[] => {
    if (ev.descriptores && ev.descriptores.length > 0) {
        return ev.descriptores;
    }
    if (ev.puntaje !== null && (!ev.eval_detalle?.rubricaData && !ev.eval_detalle?.cotejoData)) {
        if (ev.puntaje === 100) return ["Demuestra el indicador completo, correctamente y con autonomía."];
        if (ev.puntaje === 85) return ["Demuestra el indicador completo, pero presenta alguna dificultad, imprecisión o necesidad de orientación."];
        if (ev.puntaje === 70) return ["Demuestra una parte del indicador, pero aún no alcanza el desempeño completo."];
        if (ev.puntaje === 55) return ["Muestra evidencia limitada del indicador y todavía necesita apoyo para alcanzarlo."];
    }
    return [];
};

interface Incidencia {
  id: number;
  fecha: string;
  categoria: string;
  descripcion: string;
}

export default function PortalAsignatura() {
  const { asignaturaId } = useParams<{ asignaturaId: string }>();
  const decodedAsignatura = asignaturaId ? decodeURIComponent(asignaturaId) : '';
  
  const { sessionToken, selectedPeriodo, asignaturas } = useOutletContext<{
    sessionToken: string;
    selectedPeriodo: string;
    asignaturas: AsignaturaPublicada[];
  }>();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [evidencias, setEvidencias] = useState<Evidencia[]>([]);
  const [incidencias, setIncidencias] = useState<Incidencia[]>([]);

  // Configuración de la asignatura actual
  const config = asignaturas.find(a => a.asignatura === decodedAsignatura);

  useEffect(() => {
    if (!sessionToken || !decodedAsignatura || !config) return;

    const fetchEvidencias = async () => {
      setLoading(true);
      setError(null);
      try {
        const [evidenciasRes, incidenciasRes] = await Promise.all([
          supabase.rpc('portal_get_evidencias', {
            p_session_token: sessionToken,
            p_periodo: selectedPeriodo,
            p_asignatura: decodedAsignatura
          }),
          supabase.rpc('portal_get_incidencias', {
            p_session_token: sessionToken,
            p_periodo: selectedPeriodo,
            p_asignatura: decodedAsignatura
          })
        ]);
        
        if (evidenciasRes.error) throw evidenciasRes.error;
        if (evidenciasRes.data && evidenciasRes.data.error) throw new Error(evidenciasRes.data.error);

        if (incidenciasRes.error) throw incidenciasRes.error;
        if (incidenciasRes.data && incidenciasRes.data.error) throw new Error(incidenciasRes.data.error);
        
        setEvidencias(evidenciasRes.data || []);
        setIncidencias(incidenciasRes.data || []);
      } catch (err: any) {
        console.error(err);
        setError(err.message || 'Error al cargar los datos');
      } finally {
        setLoading(false);
      }
    };

    fetchEvidencias();
  }, [sessionToken, selectedPeriodo, decodedAsignatura, config]);

  const computedBCs = React.useMemo(() => {
      const bcs: ('BC1' | 'BC2' | 'BC3' | 'BC4')[] = ['BC1', 'BC2', 'BC3', 'BC4'];
      const results: Record<'BC1' | 'BC2' | 'BC3' | 'BC4', number | null> = {
          BC1: null, BC2: null, BC3: null, BC4: null
      };
      const courseActs = evidencias.filter(e => e.puntaje !== null);
      bcs.forEach(bc => {
          const actsForBc = courseActs.filter(a => a.bcAsignados?.includes(bc));
          if (actsForBc.length > 0) {
              results[bc] = Math.round(actsForBc.reduce((sum, a) => sum + a.puntaje!, 0) / actsForBc.length);
          }
      });
      return results;
  }, [evidencias]);

    if (!config) {
    return <Navigate to={`/portal/${sessionToken}/dashboard`} replace />;
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Loader2 className="animate-spin text-(--teal) mb-4" size={32} />
        <p style={{ color: 'var(--ink)' }} className="text-sm font-semibold">Cargando...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="portal-card" style={{ borderColor: 'var(--coral)', textAlign: 'center' }}>
        <p style={{ color: 'var(--coral)', fontWeight: 900, textTransform: 'uppercase' }}>Error</p>
        <p>{error}</p>
      </div>
    );
  }

  // 1. Cálculos para el pasaporte
  const validNotas = evidencias.filter(e => e.puntaje !== null && e.puntaje > 0);
  const promedio = validNotas.length > 0 
    ? Math.round(validNotas.reduce((acc, e) => acc + e.puntaje!, 0) / validNotas.length) 
    : null;

  const inicial = "E"; // Por defecto, luego podríamos sacar la inicial real


  const renderCircularProgress = (score: number | null, bcId: string) => {
        const size = 56;
        const strokeWidth = 5;
        const radius = (size - strokeWidth) / 2;
        const circumference = radius * 2 * Math.PI;
        const colorsMap: Record<string, { fill: string, track: string }> = {
            'BC1': { fill: '#2D5A85', track: '#EAF2FA' },
            'BC2': { fill: '#2C6E49', track: '#EAF5ED' },
            'BC3': { fill: '#93541A', track: '#FDF3E7' },
            'BC4': { fill: '#5D4291', track: '#F4EFFF' }
        };
        const colors = colorsMap[bcId] || { fill: '#475569', track: '#f1f5f9' };

        if (score === null || !config.mostrar_puntajes) {
            return (
                <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
                    <svg width={size} height={size} className="transform -rotate-90">
                        <circle cx={size / 2} cy={size / 2} r={radius} fill="transparent" stroke="#cbd5e1" strokeWidth={strokeWidth} strokeDasharray="4 4" />
                    </svg>
                    <div className="absolute text-[10px] font-extrabold text-slate-400">—</div>
                </div>
            );
        }
        const strokeDashoffset = circumference - (score / 100) * circumference;
        return (
            <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
                <svg width={size} height={size} className="transform -rotate-90">
                    <circle cx={size / 2} cy={size / 2} r={radius} fill="transparent" stroke={colors.track} strokeWidth={strokeWidth} />
                    <circle cx={size / 2} cy={size / 2} r={radius} fill="transparent" stroke={colors.fill} strokeWidth={strokeWidth} strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} strokeLinecap="round" className="transition-all duration-500 ease-out" />
                </svg>
                <div className="absolute text-[11px] font-black text-center" style={{ color: colors.fill }}>{score}%</div>
            </div>
        );
  };

  // Renderizar descriptor tal cual viene de la base de datos
  const renderDescriptor = (desc: any, index: number) => {
    let texto = '';
    if (typeof desc === 'string') texto = desc;
    else if (typeof desc === 'object' && desc !== null) texto = Object.values(desc)[0] as string;
    if (!texto) return null;

    return (
      <div key={index} style={{ fontSize: 13, color: 'var(--ink)', marginBottom: 6, lineHeight: 1.4 }}>
        {texto}
      </div>
    );
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
      
      {/* ===== HERO PASAPORTE ===== */}
      <div className="passport">
        <div className="passport-watermark">ACADÉMICO</div>

        <div className="passport-topbar">
          <span className="passport-kicker">Sellos de asignatura</span>
          <div className="passport-print" onClick={() => window.print()}>🖨️ Imprimir</div>
        </div>

        <div className="stamps-zone">
          <div className="stamp stamp-rect" style={{ transform: 'rotate(-5deg)' }}>
            {decodedAsignatura}
          </div>

          <div className="stamp">
            <div style={{ border: '2px solid #1f6f63', borderRadius: 16, padding: '8px 16px', fontWeight: 800, fontStyle: 'italic', fontSize: 13, transform: 'rotate(4deg)' }}>
              Período {selectedPeriodo}
            </div>
          </div>

          <div className="stamp">
            <div style={{ border: '2.5px dotted #1f6f63', borderRadius: '50%', width: 96, height: 96, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', transform: 'rotate(-4deg)' }}>
              <span style={{ fontWeight: 900, fontSize: 18 }}>
                {config.mostrar_puntajes ? (promedio !== null ? `${promedio}%` : '--') : 'Oculto'}
              </span>
              <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: 0.5 }}>PROMEDIO</span>
            </div>
          </div>
        </div>

        <div className="passport-crease"></div>
        <h2 className="passport-title">PASAPORTE ACADÉMICO</h2>

        <div className="passport-body">
          <div className="passport-photo">
            <div className="photo-frame">{inicial}</div>
            <div className="photo-name">Estudiante</div>
            <div className="photo-role">Passenger</div>
          </div>

          <div className="passport-fields">
            <span className="field-label">RESUMEN ACADÉMICO</span>
            <div className="passport-data-row">
              <div className="pdr-item">
                <span className="pdr-value">{config.mostrar_puntajes ? (promedio !== null ? `${promedio}%` : '--') : '---'}</span>
                <span className="pdr-label">Promedio general · Período {selectedPeriodo}</span>
              </div>
            </div>

            <span className="field-label">COMPETENCIAS BASE</span>
            <div className="flex gap-4 pt-2">
              <div className="flex flex-col items-center gap-1.5">{renderCircularProgress(computedBCs.BC1, 'BC1')}<span style={{fontSize:9, fontWeight:800, color:'var(--ink-soft)'}}>BC1</span></div>
              <div className="flex flex-col items-center gap-1.5">{renderCircularProgress(computedBCs.BC2, 'BC2')}<span style={{fontSize:9, fontWeight:800, color:'var(--ink-soft)'}}>BC2</span></div>
              <div className="flex flex-col items-center gap-1.5">{renderCircularProgress(computedBCs.BC3, 'BC3')}<span style={{fontSize:9, fontWeight:800, color:'var(--ink-soft)'}}>BC3</span></div>
              <div className="flex flex-col items-center gap-1.5">{renderCircularProgress(computedBCs.BC4, 'BC4')}<span style={{fontSize:9, fontWeight:800, color:'var(--ink-soft)'}}>BC4</span></div>
            </div>
          </div>
        </div>
      </div>

      {/* ===== EVIDENCIAS DE APRENDIZAJE ===== */}
      {config.mostrar_evidencias && (
        <div className="portal-card">
          <div className="portal-section-head">
            <span className="dot"></span><h2>Evidencias de aprendizaje</h2>
          </div>
          
          {evidencias.length === 0 ? (
            <p style={{ fontStyle: 'italic', color: '#666', fontSize: 13 }}>No hay actividades publicadas para esta asignatura en este período.</p>
          ) : (
            <div className="evi-list">
              {evidencias.map((ev) => {
                const isEvaluated = ev.puntaje !== null || (ev.descriptores && ev.descriptores.length > 0) || ev.eval_detalle;
                const statusText = !isEvaluated ? 'Pendiente' : (config.mostrar_puntajes && ev.puntaje !== null) ? `${ev.puntaje}%` : 'Evaluada';
                const finalDescriptores = getDescriptorText(ev);

                return (
                <div key={ev.id} className="evi-card">
                  <div className="evi-top">
                    <div>
                      <h3 className="evi-title">{ev.nombre}</h3>
                      <div className="evi-date">{ev.fecha}</div>
                    </div>
                    <span className={`evi-score ${!isEvaluated ? '' : (ev.puntaje !== null && ev.puntaje >= 85) ? 'alto' : (ev.puntaje !== null && ev.puntaje >= 70) ? 'medio' : 'bajo'}`} style={!isEvaluated ? { background: '#f5f5f4', color: '#78716c' } : {}}>
                        {statusText}
                    </span>
                  </div>
                  
                  {ev.indicador && (
                    <div className="evi-comp" style={{ marginTop: 8 }}>
                      {ev.indicador}
                    </div>
                  )}

                  <div className="check-list" style={{ marginTop: 12 }}>
                    {finalDescriptores.length > 0 ? (
                      <div className="check-label-group">
                        <div className="glabel">Desempeño / Evidencias</div>
                        {finalDescriptores.map((desc, idx) => renderDescriptor(desc, idx))}
                      </div>
                    ) : (
                        isEvaluated ? <div className="evi-desc">Evaluada sin descriptores cualitativos.</div> : <div className="evi-desc" style={{fontStyle: 'italic', color: '#999'}}>Pendiente de evaluación.</div>
                    )}
                  </div>
                </div>
              )})}
            </div>
          )}
        </div>
      )}

      {/* ===== BITÁCORA / INCIDENCIAS ===== */}
      {config.mostrar_incidencias && incidencias.length > 0 && (
        <div className="portal-card">
          <div className="portal-section-head">
            <span className="dot"></span><h2>Bitácora Académica</h2>
          </div>
          <div>
            {incidencias.map((inc) => (
              <div key={inc.id} className="bitacora-entry" style={{ background: 'var(--yellow-soft)' }}>
                <div>
                  <div className="be-date">{inc.fecha}</div>
                  <div className="be-quote">"{inc.descripcion}"</div>
                </div>
                <span className="tag-pill">{inc.categoria}</span>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
