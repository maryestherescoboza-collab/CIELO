import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Loader2 } from 'lucide-react';
import { usePortal } from './portalContext';
import type { Periodo } from './PortalLayout';

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

export default function PortalEstudiante() {
  const { sessionToken, asignaturas, selectedPeriodo, setSelectedPeriodo } = usePortal();

  const [selectedAsignatura, setSelectedAsignatura] = useState<string>(
    asignaturas.length > 0 ? asignaturas[0].asignatura : ''
  );

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [evidencias, setEvidencias] = useState<Evidencia[]>([]);
  const [incidencias, setIncidencias] = useState<Incidencia[]>([]);

  useEffect(() => {
    if (asignaturas.length > 0 && !selectedAsignatura) {
      setSelectedAsignatura(asignaturas[0].asignatura);
    }
  }, [asignaturas, selectedAsignatura]);

  const activeAsignaturaConfig = asignaturas.find(a => a.asignatura === selectedAsignatura);

  useEffect(() => {
    if (!sessionToken || !selectedAsignatura) return;

    const fetchDatos = async () => {
      setLoading(true);
      setError(null);
      try {
        const [evidenciasRes, incidenciasRes] = await Promise.all([
          supabase.rpc('portal_get_evidencias', {
            p_session_token: sessionToken,
            p_periodo: selectedPeriodo,
            p_asignatura: selectedAsignatura
          }),
          supabase.rpc('portal_get_incidencias', {
            p_session_token: sessionToken,
            p_periodo: selectedPeriodo,
            p_asignatura: selectedAsignatura
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

    fetchDatos();
  }, [sessionToken, selectedPeriodo, selectedAsignatura]);

  const bcsData = React.useMemo(() => {
    const bcs = ['BC1', 'BC2', 'BC3', 'BC4'] as const;
    const results: Record<string, { puntaje: number | null, evidencias: Evidencia[] }> = {
      BC1: { puntaje: null, evidencias: [] },
      BC2: { puntaje: null, evidencias: [] },
      BC3: { puntaje: null, evidencias: [] },
      BC4: { puntaje: null, evidencias: [] }
    };

    const courseActs = evidencias.filter(e => e.puntaje !== null);
    bcs.forEach(bc => {
      const actsForBc = courseActs.filter(a => a.bcAsignados?.includes(bc));
      if (actsForBc.length > 0) {
        const sum = actsForBc.reduce((acc, a) => acc + (a.puntaje || 0), 0);
        results[bc].puntaje = Math.round(sum / actsForBc.length);
      }
      results[bc].evidencias = evidencias.filter(a => a.bcAsignados?.includes(bc));
    });
    return results;
  }, [evidencias]);

  const renderCompetencyRing = (title: string, icon: string, value: number | null) => {
    const radius = 24;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = value !== null ? circumference - (value / 100) * circumference : circumference;

    const displayValue = activeAsignaturaConfig?.mostrar_puntajes ? value : null;

    return (
      <div className="flex flex-col items-center text-center">
        <div className="relative w-14 h-14 flex items-center justify-center">
          <svg className="w-14 h-14 -rotate-90" viewBox="0 0 56 56">
            <circle cx="28" cy="28" r="24" stroke="#e4e2e1" strokeWidth="3" fill="transparent" />
            <circle 
              cx="28" cy="28" r="24" 
              stroke="#18181b" 
              strokeWidth="3" 
              strokeLinecap="round" 
              strokeDasharray={circumference} 
              strokeDashoffset={displayValue !== null ? strokeDashoffset : circumference} 
              fill="transparent" 
              className="transition-all duration-500"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="material-symbols-outlined text-stone-700 text-base leading-none" style={{ fontVariationSettings: "'FILL' 1" }}>{icon}</span>
            <span className="text-[9px] font-black text-black leading-none mt-0.5">
              {displayValue !== null ? `${displayValue}%` : '--'}
            </span>
          </div>
        </div>
        <span className="text-[9px] font-bold tracking-tight mt-1 leading-tight line-clamp-1 text-black">{title}</span>
        <span className="text-[9px] font-mono font-bold border border-black px-1.5 py-0.5 rounded-md mt-0.5 bg-stone-50 text-black">
          {displayValue !== null ? `${displayValue}/100` : '--/--'}
        </span>
      </div>
    );
  };

  const mapDescriptores = (desc: any) => {
    if (typeof desc === 'string') return desc;
    if (typeof desc === 'object' && desc !== null) return Object.values(desc)[0] as string;
    return '';
  };

  if (!asignaturas.length) {
    // Antes `return null`: sin Publishing configurado el Portal se quedaba en
    // blanco sin decir nada. Ahora es un estado que el estudiante puede leer.
    return (
      <div className="px-5 pt-10 pb-28 text-center">
        <p className="text-base font-black text-black">Todavía no hay nada publicado</p>
        <p className="text-sm text-stone-600 mt-2 leading-relaxed">
          Tu docente aún no ha compartido notas ni actividades para este periodo.
        </p>
      </div>
    );
  }

  return (
    <div className="px-5 pt-4 pb-28 space-y-6">
      
      <section className="space-y-3.5" data-purpose="student-id-card">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div>
              <h1 className="text-base font-black text-black">Estudiante</h1>
              <p className="text-[11px] text-stone-600 font-medium">Portal Gamificado</p>
            </div>
          </div>
        </div>
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-[11px] font-bold text-black uppercase tracking-wider">Asignatura Activa</label>
            <span className="text-[11px] text-black font-bold px-2.5 py-0.5 rounded-full border border-black bg-stone-100">
              {asignaturas.findIndex(a => a.asignatura === selectedAsignatura) + 1} de {asignaturas.length}
            </span>
          </div>
          <div className="flex items-center gap-2 overflow-x-auto pb-1 custom-scrollbar">
            {asignaturas.map(a => {
              const isActive = a.asignatura === selectedAsignatura;
              return (
                <button 
                  key={a.asignatura}
                  onClick={() => setSelectedAsignatura(a.asignatura)}
                  className={`px-3.5 py-1.5 rounded-full border text-xs whitespace-nowrap active:scale-95 transition ${
                    isActive 
                      ? 'border-black bg-black text-white font-bold' 
                      : 'border-stone-300 bg-white text-stone-700 font-medium hover:border-black'
                  }`}
                >
                  {a.asignatura}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      <section className="space-y-3" data-purpose="academic-metrics">
        <div className="flex items-center justify-between pt-1">
          <h2 className="text-xs font-bold tracking-wider text-black uppercase">Período Académico</h2>
          <div className="flex gap-1.5 p-1 rounded-full border border-stone-200 bg-stone-50">
            {(['P1', 'P2', 'P3', 'P4'] as Periodo[]).map(p => (
              <button 
                key={p}
                onClick={() => setSelectedPeriodo(p)}
                className={`w-7 h-7 rounded-full text-xs flex items-center justify-center border-2 transition ${
                  selectedPeriodo === p 
                    ? 'bg-black text-white font-bold border-transparent' 
                    : 'text-stone-600 font-medium hover:bg-stone-200 border-transparent'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      </section>

      {loading && (
        <div className="flex justify-center items-center py-10">
          <Loader2 className="animate-spin text-stone-900" size={24} />
        </div>
      )}

      {error && !loading && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-center">
          <p className="text-red-600 text-xs font-bold">{error}</p>
        </div>
      )}

      {!loading && !error && activeAsignaturaConfig && (
        <>
          <section className="space-y-2" data-purpose="rpg-competency-stats">
            <div className="relative border border-black rounded-2xl p-3 bg-white">
              <div className="flex items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-2">
                  <h2 className="text-xs font-bold tracking-wider uppercase font-mono text-black">LOGRO POR COMPETENCIA</h2>
                </div>
              </div>
              <div className="grid grid-cols-4 gap-2 pt-1 pb-1">
                {renderCompetencyRing('Comunicativa', 'record_voice_over', bcsData.BC1.puntaje)}
                {renderCompetencyRing('Pensamiento', 'psychology', bcsData.BC2.puntaje)}
                {renderCompetencyRing('Científica', 'science', bcsData.BC3.puntaje)}
                {renderCompetencyRing('Ética y Ciudadana', 'balance', bcsData.BC4.puntaje)}
              </div>
            </div>
          </section>

          {activeAsignaturaConfig.mostrar_evidencias && evidencias.length > 0 && (
            <section className="space-y-3" data-purpose="learning-evidence-missions">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-bold tracking-wider uppercase text-black">Evidencias de Aprendizaje</h2>
                <span className="text-xs font-bold border border-black px-2.5 py-0.5 rounded-full bg-stone-100 text-black">
                  {evidencias.length} Actividad{evidencias.length !== 1 && 'es'}
                </span>
              </div>
              
              {evidencias.map(ev => {
                const isEvaluated = ev.puntaje !== null || (ev.descriptores && ev.descriptores.length > 0) || ev.eval_detalle;
                const statusText = !isEvaluated ? 'Pendiente' : (activeAsignaturaConfig.mostrar_puntajes && ev.puntaje !== null) ? `${ev.puntaje} %` : 'Evaluada';
                const finalDescriptores = getDescriptorText(ev);
                
                return (
                <article key={ev.id} className="border border-black rounded-2xl overflow-hidden bg-white">
                  <div className="p-3.5 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-stone-500">{ev.fecha}</span>
                      <span className={`text-base font-black tracking-tight ${!isEvaluated ? 'text-stone-400' : 'text-black'}`}>{statusText}</span>
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-black">{ev.nombre}</h3>
                    </div>
                    {finalDescriptores.length > 0 || ev.indicador ? (
                      <div className="rounded-xl p-2.5 text-xs border border-stone-200 space-y-1 bg-stone-50">
                        {ev.indicador && <p className="text-[11px] font-bold text-stone-700">{ev.indicador}</p>}
                        {finalDescriptores.map((desc, i) => (
                          <p key={i} className="text-[11px] leading-relaxed text-stone-700 font-medium">"{mapDescriptores(desc)}"</p>
                        ))}
                      </div>
                    ) : (
                        isEvaluated ? <p className="text-[11px] mt-0.5 italic text-stone-500">Evaluada sin descriptores detallados.</p> : null
                    )}
                  </div>
                  {ev.bcAsignados && ev.bcAsignados.length > 0 && (
                    <div className="border-t border-stone-200 p-3 flex flex-wrap items-center justify-between gap-2 bg-stone-50">
                      <div className="flex flex-wrap gap-1.5">
                        {ev.bcAsignados.map((bc: string) => (
                          <span key={bc} className="px-2.5 py-0.5 rounded-full border border-stone-300 text-[10px] font-medium bg-white text-stone-700">
                            #{bc === 'BC1' ? 'Comunicativa' : bc === 'BC2' ? 'PensamientoLógico' : bc === 'BC3' ? 'Científica' : 'ÉticaYCiudadana'}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </article>
              )})}
            </section>
          )}

          {activeAsignaturaConfig.mostrar_incidencias && incidencias.length > 0 && (
            <section className="space-y-2.5" data-purpose="convivencia-logbook">
              <h2 className="text-xs font-bold tracking-wider text-black uppercase">Bitácora de Convivencia</h2>
              <div className="space-y-2">
                {incidencias.map(inc => (
                  <div key={inc.id} className="border border-black rounded-2xl p-3 flex gap-3 items-start bg-white">
                    <div className="w-9 h-9 rounded-full border border-black flex items-center justify-center text-black shrink-0 bg-stone-100">
                      <span className="material-symbols-outlined text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>flag</span>
                    </div>
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-stone-500">{inc.fecha}</span>
                        <span className="px-2 py-0.5 border border-black text-[9px] font-bold rounded-full bg-stone-100 text-black">
                          {inc.categoria.toUpperCase()}
                        </span>
                      </div>
                      <h4 className="text-xs font-black text-black">"{inc.descripcion}"</h4>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}


        </>
      )}

      <div className="sticky bottom-0 left-0 right-0 p-3 z-50 flex justify-center pointer-events-none"></div>
    </div>
  );
}
