import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Loader2 } from 'lucide-react';
import { usePortal } from './portalContext';
import type { Periodo } from './PortalLayout';
import { COMPETENCIAS_LABEL } from '../../types';

interface Evidencia {
  id: number;
  nombre: string;
  fecha: string;
  indicador?: string;
  bcAsignados?: string[] | any;
  puntaje: number | null;
  descriptores: string[] | null;
  eval_detalle?: any;
}

interface Recuperacion {
  bc: number;
  puntaje: number | null;
  fecha: string;
}

export default function PortalRecuperaciones() {
  const { sessionToken, asignaturas, selectedPeriodo, setSelectedPeriodo } = usePortal();

  const [selectedAsignatura, setSelectedAsignatura] = useState<string>(
    asignaturas.length > 0 ? asignaturas[0].asignatura : ''
  );

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [evidencias, setEvidencias] = useState<Evidencia[]>([]);
  const [recuperaciones, setRecuperaciones] = useState<Recuperacion[]>([]);

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
        const [evidenciasRes, recuperacionesRes] = await Promise.all([
          supabase.rpc('portal_get_evidencias', {
            p_session_token: sessionToken,
            p_periodo: selectedPeriodo,
            p_asignatura: selectedAsignatura
          }),
          supabase.rpc('portal_get_recuperaciones', {
            p_session_token: sessionToken,
            p_periodo: selectedPeriodo,
            p_asignatura: selectedAsignatura
          })
        ]);
        
        if (evidenciasRes.error) throw evidenciasRes.error;
        if (recuperacionesRes.error) throw recuperacionesRes.error;
        
        setEvidencias(evidenciasRes.data || []);
        setRecuperaciones(recuperacionesRes.data || []);
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

  if (!asignaturas.length) {
    // Antes `return null`: pantalla en blanco sin explicación.
    return (
      <div className="px-5 pt-10 pb-28 text-center">
        <p className="text-base font-black text-black">Todavía no hay nada publicado</p>
        <p className="text-sm text-stone-600 mt-2 leading-relaxed">
          Tu docente aún no ha compartido recuperaciones para este periodo.
        </p>
      </div>
    );
  }

  const bcsKeys = ['BC1', 'BC2', 'BC3', 'BC4'] as const;
  const passedBcs = bcsKeys.filter(bc => bcsData[bc].puntaje !== null && bcsData[bc].puntaje >= 70);
  const failedBcs = bcsKeys.filter(bc => bcsData[bc].puntaje !== null && bcsData[bc].puntaje < 70);

  return (
    <div className="px-5 pt-4 pb-28 space-y-6">
      
      <section className="space-y-3.5" data-purpose="student-id-card">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div>
              <h1 className="text-base font-black text-black">Recuperaciones</h1>
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
          {passedBcs.length > 0 && (() => {
              let msg = "";
              if (passedBcs.length === 4) {
                  msg = "¡Felicidades! No debes recuperar ninguna competencia.";
              } else {
                  const names = passedBcs.map(bc => COMPETENCIAS_LABEL[bc]);
                  if (names.length === 1) {
                      msg = `¡Felicidades! No debes recuperar la competencia ${names[0]}.`;
                  } else {
                      const last = names.pop();
                      const joined = names.join(', ') + ' y ' + last;
                      msg = `¡Felicidades! No debes recuperar las competencias ${joined}.`;
                  }
              }
              
              return (
                  <div className="bg-green-50 border border-green-200 rounded-xl p-3 flex items-start gap-2 mb-3 mt-1">
                      <span className="material-symbols-outlined text-green-600 text-[18px]">verified</span>
                      <p className="text-xs text-green-800 font-medium leading-relaxed">
                          {msg}
                      </p>
                  </div>
              );
          })()}

          {activeAsignaturaConfig.mostrar_recuperacion && failedBcs.length > 0 && (
            <section className="space-y-2.5" data-purpose="recovery-points-quest">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-bold tracking-wider uppercase text-black">Competencias a Recuperar</h2>
                <span className="px-2.5 py-0.5 border border-black rounded-full text-[10px] font-bold bg-stone-100 text-black">{failedBcs.length} Competencia{failedBcs.length !== 1 && 's'}</span>
              </div>
              <div className="space-y-3">
                {failedBcs.map(bcStr => {
                  const bcNum = Number(bcStr.replace('BC', ''));
                  const recup = recuperaciones.find(r => r.bc === bcNum);
                  const bcEvidencias = bcsData[bcStr].evidencias;
                  const indicadoresUnicos = Array.from(new Set(bcEvidencias.map(e => e.indicador).filter(Boolean)));
                  
                  return (
                    <div key={bcNum} className="border border-black rounded-2xl p-3.5 space-y-2.5 bg-white">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="text-[10px] font-bold uppercase text-stone-500">Competencia {bcNum}</span>
                          <h3 className="text-xs font-black text-black">{COMPETENCIAS_LABEL[bcStr as keyof typeof COMPETENCIAS_LABEL]}</h3>
                        </div>
                        {activeAsignaturaConfig.mostrar_puntajes && recup && recup.puntaje !== null ? (
                           <span className="text-xs font-bold border border-black px-2.5 py-0.5 rounded-full bg-black text-white whitespace-nowrap">
                             {recup.puntaje} pts
                           </span>
                        ) : (
                           <span className="text-[10px] font-bold border border-stone-300 px-2 py-0.5 rounded-full bg-stone-50 text-stone-500 whitespace-nowrap">
                             Sin evaluar
                           </span>
                        )}
                      </div>
                      
                      {indicadoresUnicos.length > 0 ? (
                        <ul className="space-y-1.5 text-xs font-medium text-black">
                          {indicadoresUnicos.map((ind, i) => (
                            <li key={i} className="flex items-start gap-1.5">
                              <span className="material-symbols-outlined text-base mt-0.5 shrink-0 text-black" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                              <span>{ind}</span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-[11px] text-stone-500 italic">No hay indicadores evaluados en este período.</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          )}

        </>
      )}

      <div className="sticky bottom-0 left-0 right-0 p-3 z-50 flex justify-center pointer-events-none"></div>
    </div>
  );
}
