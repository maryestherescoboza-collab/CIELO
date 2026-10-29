import { useEffect, useState, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import { Loader2 } from 'lucide-react';
import { usePortal } from './portalContext';
import type { Periodo } from './PortalLayout';
import { COMPETENCIAS_LABEL } from '../../types';
import { INDICADORES_RECUPERACION, TITULOS_RECUPERACION } from '../../constants/recuperacionCotejo';
import { sonMismaAsignatura, SIETE_ASIGNATURAS_OFICIALES } from '../../constants/asignaturas';

interface CotejoItem {
  id: number;
  indicador: string;
  actividad_id?: number;
}

interface Evidencia {
  id: number;
  nombre: string;
  fecha: string;
  indicador?: string;
  bcAsignados?: string[];
  puntaje: number | null;
  descriptores: string[] | null;
}

interface Recuperacion {
  id?: number;
  bc: number;
  puntaje: number | null;
  fecha: string;
  cotejo?: CotejoItem[];
}

const fmt = (n: number): string => (Number.isInteger(n) ? String(n) : n.toFixed(1));

const BCS: Array<{ num: 1 | 2 | 3 | 4; key: 'BC1' | 'BC2' | 'BC3' | 'BC4' }> = [
  { num: 1, key: 'BC1' },
  { num: 2, key: 'BC2' },
  { num: 3, key: 'BC3' },
  { num: 4, key: 'BC4' },
];

const BC_COLORS: Record<string, string> = {
  BC1: '#537BAC',
  BC2: '#689C63',
  BC3: '#EB8847',
  BC4: '#DB5B48',
};

const normalizar = (t: string): string[] =>
  t
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);

function indiceIndicadorDefinitivo(bc: 1 | 2 | 3 | 4, textoAlmacenado: string): number {
  const definitivos = INDICADORES_RECUPERACION[bc];
  const exacto = definitivos.findIndex(d => d === textoAlmacenado);
  if (exacto >= 0) return exacto;

  const tokens = new Set(normalizar(textoAlmacenado));
  let mejor = -1;
  let mejorSim = 0;
  definitivos.forEach((d, i) => {
    const dtokens = new Set(normalizar(d));
    let inter = 0;
    for (const tok of dtokens) if (tokens.has(tok)) inter++;
    const union = dtokens.size + tokens.size - inter;
    const sim = union > 0 ? inter / union : 0;
    if (sim > mejorSim) {
      mejorSim = sim;
      mejor = i;
    }
  });
  return mejorSim >= 0.25 ? mejor : -1;
}

export default function PortalRecuperaciones() {
  const { 
    sessionToken, 
    asignaturas, 
    selectedPeriodo, 
    setSelectedPeriodo,
    selectedAsignatura,
    estudianteContext 
  } = usePortal();

  const activeMateria = selectedAsignatura || asignaturas.find(a => a.tiene_docente)?.asignatura || asignaturas[0]?.asignatura || '';
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [evidencias, setEvidencias] = useState<Evidencia[]>([]);
  const [recuperaciones, setRecuperaciones] = useState<Recuperacion[]>([]);

  const activeAsignaturaConfig = asignaturas.find(a => sonMismaAsignatura(a.asignatura, activeMateria)) || {
    asignatura: activeMateria,
    tiene_docente: true,
    total_actividades: evidencias.length,
    mostrar_puntajes: true,
    mostrar_evidencias: true,
    mostrar_recursos: true,
    mostrar_incidencias: true,
    mostrar_recuperacion: true,
    published_until: null,
  };
  const activeOficial = SIETE_ASIGNATURAS_OFICIALES.find(o => sonMismaAsignatura(o.nombre, activeMateria));

  useEffect(() => {
    if (!sessionToken || !activeMateria) return;

    const fetchDatos = async () => {
      setLoading(true);
      setError(null);
      try {
        const [evidenciasRes, recuperacionesRes] = await Promise.all([
          supabase.rpc('portal_get_evidencias', {
            p_session_token: sessionToken,
            p_periodo: selectedPeriodo,
            p_asignatura: activeMateria
          }),
          supabase.rpc('portal_get_recuperaciones', {
            p_session_token: sessionToken,
            p_periodo: selectedPeriodo,
            p_asignatura: activeMateria
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
  }, [sessionToken, selectedPeriodo, activeMateria]);

  // Evaluated averages per competency before recovery
  const bcsPromedios = useMemo(() => {
    const bcs = ['BC1', 'BC2', 'BC3', 'BC4'] as const;
    const results: Record<string, number | null> = { BC1: null, BC2: null, BC3: null, BC4: null };

    const courseActs = evidencias.filter(e => e.puntaje !== null && e.puntaje !== undefined && !isNaN(Number(e.puntaje)) && e.nombre !== 'Recuperación');
    bcs.forEach(bc => {
      const actsForBc = courseActs.filter(a => a.bcAsignados?.includes(bc));
      if (actsForBc.length > 0) {
        const sum = actsForBc.reduce((acc, a) => acc + Number(a.puntaje), 0);
        results[bc] = Math.round(sum / actsForBc.length);
      }
    });
    return results;
  }, [evidencias]);

  // Recovery blocks per competency
  const bloques = useMemo(() => {
    return BCS.map(({ num, key }) => {
      const recup = recuperaciones.find(r => r.bc === num);

      // Applicable activities evaluated for this BC where score is < 70
      const aplicables = evidencias.filter(e => {
        if (e.nombre === 'Recuperación') return false;
        if (e.puntaje === null || e.puntaje === undefined || isNaN(Number(e.puntaje))) return false;
        if (Number(e.puntaje) >= 70) return false;
        return e.bcAsignados?.includes(key);
      }).sort((a, b) => (a.fecha > b.fecha ? 1 : a.fecha < b.fecha ? -1 : a.id - b.id));

      // If no recovery record and no failed activities, this BC does not require recovery
      if (!recup && aplicables.length === 0) return null;

      const cotejo = recup?.cotejo || [];
      const definitivos = INDICADORES_RECUPERACION[num];
      const logradasPorIndicador = definitivos.map(
        (_d, i) => cotejo.filter(c => indiceIndicadorDefinitivo(num, c.indicador) === i).length
      );

      // Build unique evaluated activities list (from aplicables and cotejo references)
      const actividadesMap = new Map<number, Evidencia>();
      aplicables.forEach(a => actividadesMap.set(a.id, a));
      cotejo.forEach(c => {
        if (c.actividad_id) {
          const found = evidencias.find(e => e.id === c.actividad_id);
          if (found) actividadesMap.set(found.id, found);
        }
      });
      const actividadesEvaluadas = Array.from(actividadesMap.values());

      const distinctCotejoActs = new Set(cotejo.map(c => c.actividad_id).filter(Boolean));
      const totalActividades = Math.max(aplicables.length, distinctCotejoActs.size, 1);

      return {
        key,
        num,
        nombre: TITULOS_RECUPERACION[key] || COMPETENCIAS_LABEL[key],
        indicadores: definitivos,
        logradas: logradasPorIndicador,
        totalActividades,
        resultados: recup ? recup.puntaje : null,
        color: BC_COLORS[key] || '#4E5566',
        fecha: recup?.fecha,
        actividadesEvaluadas,
        pendiente: !recup,
      };
    }).filter((b): b is NonNullable<typeof b> => b !== null);
  }, [recuperaciones, evidencias]);

  const bcsKeys = ['BC1', 'BC2', 'BC3', 'BC4'] as const;
  const passedBcs = bcsKeys.filter(bc => bcsPromedios[bc] !== null && bcsPromedios[bc]! >= 70);
  const totalEvaluatedBcs = bcsKeys.filter(bc => bcsPromedios[bc] !== null).length;

  if (!asignaturas.length) {
    return (
      <div className="px-5 pt-10 pb-28 text-center">
        <p className="text-base font-black text-black">Todavía no hay nada publicado</p>
        <p className="text-sm text-stone-600 mt-2 leading-relaxed">
          Tu docente aún no ha compartido recuperaciones para este periodo.
        </p>
      </div>
    );
  }

  return (
    <div className="px-5 pt-4 pb-28 space-y-6">
      
      {/* Student ID Card */}
      <section className="space-y-3.5" data-purpose="student-id-card">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider font-mono">
              {[estudianteContext?.grado, estudianteContext?.seccion ? `Sec. ${estudianteContext.seccion}` : null].filter(Boolean).join(' • ') || 'Recuperación'}
            </span>
            <h1 className="text-base font-black text-black">
              {[estudianteContext?.nombre, estudianteContext?.apellido].filter(Boolean).join(' ') || 'Estudiante'}
            </h1>
          </div>
          
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-stone-200 bg-stone-50 shadow-xs">
            <span className="text-xs">{activeOficial?.icono || '📖'}</span>
            <span className="text-xs font-bold text-stone-900">{activeMateria}</span>
          </div>
        </div>
      </section>

      {/* Period Selector */}
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

      {!loading && !error && (
        <div className="w-full font-sans">
          
          {/* Detailed Header like in /estudiante */}
          <div className="flex items-baseline gap-2">
            <span className="font-['Space_Grotesk'] font-bold text-[#DB5B48] text-[13px]">//</span>
            <h2 className="font-['Space_Grotesk'] text-[12px] font-bold tracking-[0.14em] uppercase text-[#1B1F2A]">
              Recuperación por competencia
            </h2>
          </div>
          <hr className="border-t border-[#E4E3EC] mt-2 mb-4" />

          {/* Teacher visibility toggle check */}
          {!activeAsignaturaConfig.mostrar_recuperacion ? (
            <div className="p-4 bg-stone-50 border border-stone-200 rounded-xl text-center">
              <p className="text-xs text-stone-500 italic">
                La visualización de recuperaciones para esta asignatura no está habilitada por el docente.
              </p>
            </div>
          ) : (
            <>
              {/* Congratulations Banner if all evaluated competencies are passed */}
              {bloques.length === 0 && totalEvaluatedBcs > 0 && passedBcs.length === totalEvaluatedBcs && (
                <div className="bg-green-50 border border-green-200 rounded-xl p-3.5 flex items-start gap-2.5 mb-4">
                  <span className="material-symbols-outlined text-green-600 text-[20px] shrink-0">verified</span>
                  <div>
                    <p className="text-xs text-green-900 font-bold">¡Felicidades!</p>
                    <p className="text-[11.5px] text-green-800 font-medium leading-relaxed mt-0.5">
                      No debes recuperar ninguna competencia para el período {selectedPeriodo}.
                    </p>
                  </div>
                </div>
              )}

              {/* No records message */}
              {bloques.length === 0 ? (
                <div className="text-[11.5px] text-[#8A8FA0] italic py-2">
                  Sin registros de recuperación para el período {selectedPeriodo}.
                </div>
              ) : (
                /* Grid of Competency Recovery Cards */
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {bloques.map(({ key, nombre, indicadores, logradas, totalActividades, resultados, color, fecha, actividadesEvaluadas, pendiente }) => (
                    <div 
                      key={key} 
                      className="border border-[#E4E3EC] bg-white rounded-xl p-4 shadow-xs flex flex-col justify-between break-inside-avoid"
                    >
                      <div>
                        {/* Competency Badge */}
                        <div className="flex items-center justify-between mb-3">
                          <div 
                            className="inline-block font-['Space_Grotesk'] text-[11px] font-bold tracking-[0.02em] leading-[1.35] text-white px-2.5 py-1 rounded shadow-xs" 
                            style={{ background: color }}
                          >
                            Competencia {nombre.toLowerCase()}
                          </div>
                          {fecha && (
                            <span className="text-[10px] text-[#8A8FA0] font-mono">
                              {fecha}
                            </span>
                          )}
                        </div>
                        
                        {/* Indicators with exact X/Y ratio */}
                        <div className="space-y-2 mb-3.5">
                          {indicadores.map((indicador, i) => (
                            <div key={indicador} className="text-[11px] text-[#4E5566] leading-normal flex items-start gap-2">
                              <span 
                                className="material-symbols-outlined text-[15px] mt-0.5 shrink-0"
                                style={{ color: logradas[i] > 0 ? color : '#CBD5E1' }}
                              >
                                {logradas[i] > 0 ? 'check_circle' : 'radio_button_unchecked'}
                              </span>
                              <span>
                                {indicador} Logrado en <strong className="font-bold text-[#1B1F2A]">{logradas[i]}/{totalActividades}</strong> de las actividades evaluadas.
                              </span>
                            </div>
                          ))}
                        </div>

                        {/* Activities requiring recovery */}
                        {actividadesEvaluadas.length > 0 && (
                          <div className="pt-2.5 border-t border-dashed border-[#EFEEF4] mb-3">
                            <span className="text-[9.5px] font-bold uppercase tracking-wider text-[#8A8FA0] block mb-1.5">
                              Actividades a recuperar
                            </span>
                            <div className="space-y-1">
                              {actividadesEvaluadas.map(act => (
                                <div key={act.id} className="flex items-center justify-between text-[10.5px] bg-[#F8F8FB] px-2.5 py-1.5 rounded border border-[#EFEEF4]">
                                  <span className="font-medium text-[#1B1F2A] truncate pr-2">{act.nombre}</span>
                                  <span className="text-[10px] font-mono text-stone-500 shrink-0">
                                    {act.puntaje !== null ? `${act.puntaje} pts` : '—'}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Bottom Footer: Recovery Result */}
                      <div className="mt-3 pt-2.5 border-t border-[#EFEEF4] flex items-baseline justify-between">
                        <div className="text-[10.5px] text-[#8A8FA0] font-medium">
                          {pendiente ? 'Estado' : 'Resultado de recuperación'}
                        </div>
                        <div className="font-['Space_Grotesk'] text-[14px] font-bold" style={{ color: pendiente ? '#8A8FA0' : color }}>
                          {pendiente ? (
                            'Pendiente de evaluación'
                          ) : activeAsignaturaConfig.mostrar_puntajes ? (
                            resultados !== null && resultados !== undefined ? `${fmt(resultados)} puntos` : '—'
                          ) : (
                            resultados !== null && resultados !== undefined ? 'Calificado' : '—'
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

        </div>
      )}

      <div className="sticky bottom-0 left-0 right-0 p-3 z-50 flex justify-center pointer-events-none"></div>
    </div>
  );
}
