import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Settings, BarChart2, FileText, CheckCircle2 } from 'lucide-react';
import { useDemoStore } from '../store/useDemoStore';
import { demoStudents, demoActivities } from '../data/demoData';
import { DemoRubric } from './DemoRubric';

export function InteractiveDemo() {
  const { periodo, setPeriodo, grades } = useDemoStore();
  const [selectedActivityId, setSelectedActivityId] = useState(demoActivities[0].id);
  const [activeRubricStudent, setActiveRubricStudent] = useState<number | null>(null);

  const selectedActivity = demoActivities.find(a => a.id === selectedActivityId);

  return (
    <section className="py-24 relative overflow-hidden bg-[#FDFBF7]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 relative z-10">
        <div className="text-center mb-10 md:mb-16">
          <h2 className="text-3xl md:text-5xl font-black text-[#2E3330] tracking-tighter mb-4">
            Vive la experiencia CIELO
          </h2>
          <p className="text-slate-500 font-medium text-base md:text-lg max-w-2xl mx-auto px-2">
            Interactúa con nuestro módulo de calificación simulado. Modifica notas, explora rúbricas y observa cómo todo reacciona al instante.
          </p>
        </div>

        {/* Demo App Container */}
        <div className="bg-white rounded-2xl md:rounded-3xl shadow-2xl border border-[rgba(46,51,48,0.08)] overflow-hidden flex flex-col h-[500px] md:h-[600px] w-full max-w-5xl mx-auto">
          {/* Top Bar (Filters) */}
          <div className="bg-[#FAF6F0]/80 backdrop-blur-md p-3 md:p-4 border-b border-[rgba(46,51,48,0.08)] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2 md:gap-4">
              <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-xl border border-[rgba(46,51,48,0.08)] shadow-sm">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Curso</span>
                <span className="text-sm font-black text-[#2E3330]">6to Secundaria B</span>
              </div>
              <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-xl border border-[rgba(46,51,48,0.08)] shadow-sm cursor-pointer hover:border-[#7A8D69] transition-colors">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Período</span>
                <select 
                  className="text-sm font-black text-[#2E3330] bg-transparent outline-none cursor-pointer"
                  value={periodo}
                  onChange={(e) => setPeriodo(e.target.value as any)}
                >
                  <option value="P1">P1</option>
                  <option value="P2">P2</option>
                  <option value="P3">P3</option>
                  <option value="P4">P4</option>
                </select>
              </div>
            </div>

            <div className="hidden sm:flex items-center gap-3">
              <button className="p-2 text-slate-400 hover:text-[#2E3330] transition-colors bg-white rounded-xl border border-[rgba(46,51,48,0.08)] shadow-sm">
                <BarChart2 size={18} />
              </button>
              <button className="p-2 text-slate-400 hover:text-[#2E3330] transition-colors bg-white rounded-xl border border-[rgba(46,51,48,0.08)] shadow-sm">
                <Settings size={18} />
              </button>
            </div>
          </div>

          {/* Activities Tabs */}
          <div className="px-4 md:px-6 py-3 flex gap-2 md:gap-3 border-b border-[rgba(46,51,48,0.04)] bg-white overflow-x-auto whitespace-nowrap hide-scrollbar">
            {demoActivities.map(act => (
              <button
                key={act.id}
                onClick={() => setSelectedActivityId(act.id)}
                className={`flex-none px-4 py-2 rounded-full text-xs font-bold transition-all border ${
                  selectedActivityId === act.id 
                    ? 'bg-[#BFC9A6] border-slate-350 text-[#2E3330] shadow-sm' 
                    : 'bg-white border-slate-200 text-slate-500 hover:bg-[#FAF6F0]'
                }`}
              >
                {act.title}
              </button>
            ))}
          </div>

          {/* Table Area */}
          <div className="flex-1 overflow-auto bg-white p-4 md:p-6">
            <div className="min-w-[600px]">
              <table className="w-full text-left">
                <thead>
                  <tr>
                    <th className="pb-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Estudiante</th>
                    <th className="pb-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">Calificación</th>
                    <th className="pb-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Herramientas</th>
                  </tr>
                </thead>
                <tbody>
                  <AnimatePresence>
                    {demoStudents.map((st, i) => {
                    const gradeKey = `${st.id}-${selectedActivityId}`;
                    const currentGrade = grades[gradeKey] || 0;
                    
                    return (
                      <motion.tr 
                        key={st.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className="group border-b border-slate-100 last:border-0 hover:bg-[#FAF6F0]/50 transition-colors"
                      >
                        <td className="py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-[#EAE4DA] flex items-center justify-center text-[10px] font-black text-[#7A8D69]">
                              {st.avatar}
                            </div>
                            <div>
                              <p className="text-sm font-bold text-[#2E3330]">{st.name} {st.surname}</p>
                              <p className="text-[10px] font-medium text-slate-400">ID: 00{st.id}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 text-center">
                          <div className={`inline-flex items-center justify-center w-12 h-8 rounded-lg font-black text-sm transition-all ${
                            currentGrade >= 90 ? 'bg-[#86A792]/20 text-[#7A8D69]' :
                            currentGrade >= 70 ? 'bg-[#F2D6A2]/30 text-[#A3792E]' :
                            'bg-[#E88C6B]/20 text-[#E88C6B]'
                          }`}>
                            {currentGrade}
                          </div>
                        </td>
                        <td className="py-4 text-right">
                          {selectedActivity?.type === 'Rubrica' ? (
                            <button 
                              onClick={() => setActiveRubricStudent(st.id)}
                              className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:border-[#7A8D69] hover:text-[#7A8D69] transition-all shadow-sm"
                            >
                              <FileText size={14} /> Evaluar con Rúbrica
                            </button>
                          ) : (
                            <button className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:border-[#7A8D69] hover:text-[#7A8D69] transition-all shadow-sm">
                              <CheckCircle2 size={14} /> Evaluar con Cotejo
                            </button>
                          )}
                        </td>
                      </motion.tr>
                    );
                  })}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>

    {/* Floating Rubric Modal */}
      <AnimatePresence>
        {activeRubricStudent !== null && selectedActivity?.type === 'Rubrica' && (
          <DemoRubric 
            studentId={activeRubricStudent} 
            activityId={selectedActivityId} 
            onClose={() => setActiveRubricStudent(null)} 
          />
        )}
      </AnimatePresence>
    </section>
  );
}
