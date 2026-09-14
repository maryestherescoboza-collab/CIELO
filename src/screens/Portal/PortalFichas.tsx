import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Loader2 } from 'lucide-react';
import type { AsignaturaPublicada, Periodo } from './PortalLayout';

interface Evidencia {
  id: number;
  nombre: string;
  fecha: string;
  indicador: string;
  bcAsignados: string[] | any;
  puntaje: number | null;
  descriptores: string[] | null;
  // added manually to link evidence back to subject
  _asignatura: string; 
}

export default function PortalFichas() {
  const { sessionToken, asignaturas, selectedPeriodo } = useOutletContext<{
    sessionToken: string;
    asignaturas: AsignaturaPublicada[];
    selectedPeriodo: Periodo;
  }>();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [allEvidencias, setAllEvidencias] = useState<Evidencia[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (!sessionToken || asignaturas.length === 0) return;

    const fetchAllData = async () => {
      setLoading(true);
      setError(null);
      try {
        const promises = asignaturas.map(async (asig) => {
          if (!asig.mostrar_evidencias) return [];
          const { data, error } = await supabase.rpc('portal_get_evidencias', {
            p_session_token: sessionToken,
            p_periodo: selectedPeriodo,
            p_asignatura: asig.asignatura
          });
          if (error) throw error;
          if (data && data.error) throw new Error(data.error);
          
          return (data || []).map((ev: any) => ({
            ...ev,
            _asignatura: asig.asignatura
          }));
        });

        const results = await Promise.all(promises);
        const combined = results.flat();
        
        setAllEvidencias(combined);
      } catch (err: any) {
        console.error(err);
        setError(err.message || 'Error al cargar las fichas');
      } finally {
        setLoading(false);
      }
    };

    fetchAllData();
  }, [sessionToken, selectedPeriodo, asignaturas]);

  const filteredEvidencias = allEvidencias.filter(ev => {
    if (selectedSubject && ev._asignatura !== selectedSubject) return false;
    if (searchTerm && !ev.nombre.toLowerCase().includes(searchTerm.toLowerCase()) && !ev._asignatura.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  const getSubjectIcon = (name: string) => {
    const l = name.toLowerCase();
    if (l.includes('lengu')) return '📖';
    if (l.includes('mat')) return '📐';
    if (l.includes('cienc')) return '🔬';
    if (l.includes('hist')) return '⏳';
    if (l.includes('art')) return '🎨';
    if (l.includes('ing')) return '🌐';
    return '📚';
  };

  const getCardColorClass = (index: number) => {
    if (index % 3 === 1) return 'bg-brand-purple border-2 shadow-sm';
    return 'bg-white';
  };

  return (
    <div className="pt-2 px-5">
      <div className="mb-5">
        <div className="relative flex items-center">
          <div className="absolute left-3.5 pointer-events-none text-neutral-800">
            <svg className="w-4 h-4 stroke-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" strokeLinecap="round" strokeLinejoin="round"></path>
            </svg>
          </div>
          <input 
            className="w-full h-11 pl-10 pr-4 bg-white border border-black rounded-lg text-xs placeholder:text-neutral-500 focus:outline-none focus:ring-0 focus:border-black font-normal" 
            placeholder="Buscar asignaturas o fichas de clase..." 
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <section className="mb-5">
        <div className="flex space-x-2 overflow-x-auto custom-scrollbar -mx-1 px-1 py-1">
          <button 
            onClick={() => setSelectedSubject(null)}
            className={`flex-none px-3 py-1.5 border border-black rounded-lg text-xs flex items-center space-x-1.5 transition ${!selectedSubject ? 'bg-black text-white font-bold' : 'bg-white text-black font-semibold hover:bg-neutral-50'}`}
          >
            <span className="text-[11px]">📋</span>
            <span>Todas</span>
          </button>
          
          {asignaturas.map(asig => {
            const isSelected = selectedSubject === asig.asignatura;
            return (
              <button 
                key={asig.asignatura}
                onClick={() => setSelectedSubject(asig.asignatura)}
                className={`flex-none px-3 py-1.5 border border-black rounded-lg text-xs flex items-center space-x-1.5 transition ${isSelected ? 'bg-brand-purple text-black font-bold shadow-sm' : 'bg-white text-black font-semibold hover:bg-neutral-50'}`}
              >
                <span className="text-[11px]">{getSubjectIcon(asig.asignatura)}</span>
                <span className="truncate max-w-[100px]">{asig.asignatura}</span>
                {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-black ml-1"></span>}
              </button>
            );
          })}
        </div>
      </section>

      <section className="mb-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-black tracking-tight">Cronograma y Fichas</h2>
          <span className="text-xs text-neutral-500 font-medium">Período {selectedPeriodo.replace('P','')}</span>
        </div>
        
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="animate-spin text-stone-900" size={24} />
          </div>
        ) : error ? (
           <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-center">
             <p className="text-red-600 text-xs font-bold">{error}</p>
           </div>
        ) : filteredEvidencias.length === 0 ? (
          <div className="text-center py-10 bg-white border border-neutral-200 rounded-xl">
             <p className="text-neutral-500 text-sm">No hay fichas o actividades para mostrar.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredEvidencias.map((ev, i) => {
               const config = asignaturas.find(a => a.asignatura === ev._asignatura);
               
               return (
                <article key={`${ev._asignatura}-${ev.id}`} className={`w-full border border-black rounded-lg p-3 ${getCardColorClass(i)}`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <span className="text-[9px] font-bold px-1.5 py-0.5 bg-neutral-100 border border-black rounded text-black uppercase tracking-tight truncate max-w-[120px]">
                        {ev._asignatura}
                      </span>
                    </div>
                    {config?.mostrar_puntajes && ev.puntaje !== null ? (
                       <span className="text-[9px] font-bold px-2 py-0.5 bg-black text-white border border-black rounded whitespace-nowrap">
                         {ev.puntaje} pts
                       </span>
                    ) : (
                       <span className="text-[9px] font-bold px-2 py-0.5 bg-brand-yellow border border-black rounded text-black whitespace-nowrap">
                         Completada
                       </span>
                    )}
                  </div>
                  <h3 className="text-xs font-bold text-black">{ev.nombre}</h3>
                  {ev.indicador && (
                    <p className="text-[11px] text-neutral-700 mt-1 font-normal line-clamp-2">{ev.indicador}</p>
                  )}
                  
                  <div className="mt-2.5 pt-2 border-t border-black/10 flex flex-wrap items-center justify-between gap-2">
                    <span className="text-[10px] font-bold text-neutral-500">{ev.fecha}</span>
                    {ev.descriptores && ev.descriptores.length > 0 && (
                      <span className="text-[10px] font-bold text-black hover:underline cursor-pointer">
                        Ver detalles ›
                      </span>
                    )}
                  </div>
                </article>
               );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
