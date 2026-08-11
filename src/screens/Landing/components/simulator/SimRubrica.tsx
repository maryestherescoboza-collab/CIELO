import React from 'react';
import { X, AlertCircle } from 'lucide-react';
import type { BCKey } from '../../../../types';

interface RubricModalProps {
    targetEst: any;
    rubricTarget: { estId: number, bc: number, bcName: BCKey } | null;
    onClose: () => void;
    onSetRec: (estId: number, bc: 1 | 2 | 3 | 4, val: number | null) => void;
    selectedPeriodo: string;
    BC_COLOR_THEMES: Record<BCKey, { bg: string, text: string, active: string }>;
    BC_ICONS: Record<BCKey, React.ReactNode>;
}

const RubricModal: React.FC<RubricModalProps> = ({
    targetEst,
    rubricTarget,
    onClose,
    onSetRec,
    selectedPeriodo,
    BC_COLOR_THEMES,
    BC_ICONS
}) => {
    if (!rubricTarget || !targetEst) return null;

    return (
        <div className="fixed inset-0 z-100 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
            <div className="w-full max-w-7xl bg-white border border-slate-200 flex flex-col shadow-2xl animate-in fade-in zoom-in duration-200">
                <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
                    <div>
                        <h2 className="text-xs font-black text-slate-800 uppercase tracking-tighter italic leading-none">Acta de Recuperación de Competencias</h2>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-2">Estudiante: {targetEst.displayName} — {selectedPeriodo}</p>
                    </div>
                    <button onClick={onClose} className="p-3 hover:bg-slate-50 transition-colors rounded-full text-slate-400">
                        <X size={12} />
                    </button>
                </div>

                <div className="p-8 bg-white overflow-hidden">
                    <table className="w-full border-collapse border border-slate-200">
                        <thead>
                            <tr className="bg-slate-50 text-xs font-black uppercase text-slate-500 tracking-wider">
                                <th className="border border-slate-200 p-4 text-left w-1/3">Competencia Deficiente</th>
                                <th className="border border-slate-200 p-4 text-center">Estratégico: Muestra dominio de la competencia (100)</th>
                                <th className="border border-slate-200 p-4 text-center">Autónomo: Aplica la competencia con independencia (85)</th>
                                <th className="border border-slate-200 p-4 text-center">Resolutivo: Aplica la competencia con ayuda (70)</th>
                                <th className="border border-slate-200 p-4 text-center">Receptivo: No evidencia desarrollo de la competencia (55)</th>
                            </tr>
                        </thead>
                        <tbody>
                            {targetEst.bcValues.map((v: any, idx: number) => {
                                const bcIdx = (idx + 1) as 1 | 2 | 3 | 4;
                                const isPassed = v.avg !== null && v.avg >= 70;

                                return (
                                    <tr key={v.bc} className={`transition-colors h-16 ${isPassed ? 'bg-slate-50 opacity-40 grayscale pointer-events-none' : 'hover:bg-slate-50/50'}`}>
                                        <td className="border border-slate-200 p-4">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-8 h-8 rounded shrink-0 flex items-center justify-center ${BC_COLOR_THEMES[v.bc as BCKey].bg} ${BC_COLOR_THEMES[v.bc as BCKey].text}`}>
                                                    {BC_ICONS[v.bc as BCKey]}
                                                </div>
                                                <div>
                                                    <span className="block text-xs font-black text-slate-800 uppercase leading-none">{v.bc}</span>
                                                </div>
                                                <div className="ml-auto">
                                                    <span className={`text-xs font-black px-2 py-0.5 rounded border ${v.avg !== null && v.avg < 70 ? 'bg-rose-50 text-rose-600 border-rose-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100'}`}>
                                                        BC: {v.avg ?? '--'}
                                                    </span>
                                                </div>
                                            </div>
                                        </td>
                                        {[100, 85, 70, 55].map((score, sIdx) => {
                                            const isSelected = v.rec === score;
                                            const isReceptivo = sIdx === 3;
                                            const bgColors = [
                                                'bg-primary', // 100 -> Estratégico
                                                'bg-warning', // 85 -> Autónomo
                                                'bg-danger', // 70 -> Resolutivo
                                                'bg-[#3F3C36]'  // Receptivo
                                            ];
                                            const selectedBg = bgColors[sIdx];

                                            return (
                                                <td key={sIdx} className="border border-slate-200 p-0 text-center">
                                                    <button
                                                        onClick={() => onSetRec(targetEst.id, bcIdx, score)}
                                                        className={`w-full h-16 flex items-center justify-center transition-all ${isSelected ? selectedBg : 'hover:bg-slate-100'}`}
                                                    >
                                                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${isSelected ? 'border-white bg-white shadow-lg' : 'border-slate-300'}`}>
                                                            {isSelected && <div className={`w-2 h-2 rounded-full ${sIdx === 1 ? 'bg-[#8C6D1F]' : selectedBg}`} />}
                                                        </div>
                                                        {isReceptivo && isSelected && <span className="absolute mt-10 text-xs font-black text-white/50">{score} pts</span>}
                                                    </button>
                                                </td>
                                            );
                                        })}
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                <div className="p-8 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-black text-slate-400 uppercase tracking-widest">
                        <AlertCircle size={10} />
                        Solo las competencias con BC inferior a 70 son habilitadas para acta de recuperación.
                    </div>
                    <button
                        onClick={onClose}
                        className="px-12 py-4 bg-slate-800 text-white text-xs font-black uppercase tracking-widest hover:bg-black transition-all shadow-xl"
                    >
                        Registrar y Guardar
                    </button>
                </div>
            </div>
        </div>
    );
};

export default React.memo(RubricModal);
