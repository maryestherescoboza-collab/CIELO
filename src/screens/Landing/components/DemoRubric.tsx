import { motion } from 'framer-motion';
import { X, Check } from 'lucide-react';
import { useDemoStore } from '../store/useDemoStore';
import { demoRubricTemplate, demoStudents } from '../data/demoData';

interface Props {
  studentId: number;
  activityId: number;
  onClose: () => void;
}

export function DemoRubric({ studentId, activityId, onClose }: Props) {
  const { rubricSelections, setRubricSelection } = useDemoStore();
  const student = demoStudents.find(s => s.id === studentId);
  const selections = rubricSelections[`${studentId}-${activityId}`] || {};

  const handleSelect = (critId: number, levelId: number) => {
    // Calcular el puntaje temporal
    const currentSelections = { ...selections, [critId]: levelId };
    
    // Sumar scores ponderados
    let totalScore = 0;
    demoRubricTemplate.criterios.forEach(crit => {
      const selectedLevelId = currentSelections[crit.id] || crit.levels[crit.levels.length - 1].id;
      const level = crit.levels.find(l => l.id === selectedLevelId);
      const s = level ? level.score : 0;
      totalScore += (s * (crit.weight / 100));
    });

    setRubricSelection(studentId, activityId, critId, levelId, Math.round(totalScore));
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
    >
      <motion.div 
        initial={{ y: 50, scale: 0.95 }}
        animate={{ y: 0, scale: 1 }}
        exit={{ y: 20, scale: 0.95 }}
        className="bg-white rounded-3xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
      >
        <div className="p-4 md:p-6 border-b border-slate-100 flex items-center justify-between bg-[#FDFBF7]">
          <div>
            <h3 className="text-lg md:text-xl font-black text-[#2E3330]">Evaluando a {student?.name}</h3>
            <p className="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">
              {demoRubricTemplate.title}
            </p>
          </div>
          <button 
            onClick={onClose}
            className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-red-500 hover:border-red-200 transition-colors shadow-sm"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-4 md:p-6 overflow-y-auto flex-1 space-y-6 md:space-y-8 bg-[#FDFBF7]/50">
          {demoRubricTemplate.criterios.map(crit => (
            <div key={crit.id}>
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-sm font-black text-[#2E3330]">{crit.name}</h4>
                <span className="text-[10px] font-bold px-2 py-1 bg-[#EAE4DA] rounded-full text-[#ADC762] uppercase tracking-wider">
                  Valor: {crit.weight}%
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                {crit.levels.map(level => {
                  const isSelected = selections[crit.id] === level.id;
                  return (
                    <div 
                      key={level.id}
                      onClick={() => handleSelect(crit.id, level.id)}
                      className={`relative p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                        isSelected 
                          ? 'border-[#ADC762] bg-[#86A792]/10 shadow-sm' 
                          : 'border-slate-100 bg-white hover:border-[#ADC762]/30 hover:shadow-md'
                      }`}
                    >
                      {isSelected && (
                        <div className="absolute top-3 right-3 text-[#ADC762]">
                          <Check size={16} strokeWidth={3} />
                        </div>
                      )}
                      <div className={`text-xl font-black mb-2 ${isSelected ? 'text-[#ADC762]' : 'text-slate-300'}`}>
                        {level.score}
                      </div>
                      <p className={`text-xs font-medium leading-relaxed ${isSelected ? 'text-[#2E3330]' : 'text-slate-500'}`}>
                        {level.desc}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}
