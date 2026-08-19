import React from 'react';
import { AlertCircle, FileText } from 'lucide-react';
import type { BCKey } from '../../types';
import { CieloPill } from '../ui/CieloPill';
import { CieloModal } from '../ui/CieloModal';

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

    const modalFooter = (
        <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2 text-xs font-black text-slate-400 uppercase tracking-widest">
                <AlertCircle size={14} />
                Solo competencias {'<'} 70
            </div>
            <CieloPill
                as="button"
                variant="primary"
                onClick={onClose}
                className="px-8 shadow-xl bg-slate-800 hover:bg-black uppercase tracking-widest text-xs"
            >
                Registrar y Guardar
            </CieloPill>
        </div>
    );

    return (
        <CieloModal
            isOpen={true}
            onClose={onClose}
            title="Acta de Recuperación de Competencias"
            subtitle={`Estudiante: ${targetEst.displayName} — ${selectedPeriodo}`}
            icon={<FileText size={20} />}
            maxWidth="7xl"
            footer={modalFooter}
        >
            <div className="overflow-x-auto">
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
                                                'bg-(--success)', // 100 -> Estratégico
                                                'bg-(--success-soft)', // 85 -> Autónomo
                                                'bg-(--primary)', // 70 -> Resolutivo
                                                'bg-(--danger)'  // Receptivo
                                            ];
                                            const selectedBg = bgColors[sIdx];

                                            return (
                                                <td key={sIdx} className="border border-slate-200 p-0 text-center">
                                                    <button
                                                        onClick={() => onSetRec(targetEst.id, bcIdx, score)}
                                                        className={`w-full h-16 flex items-center justify-center transition-all ${isSelected ? selectedBg : 'hover:bg-slate-100'}`}
                                                    >
                                                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${isSelected ? 'border-white bg-white shadow-lg' : 'border-slate-300'}`}>
                                                            {isSelected && <div className={`w-2 h-2 rounded-full ${sIdx === 1 ? 'bg-(--success)' : selectedBg}`} />}
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
        </CieloModal>
    );
};

export default React.memo(RubricModal);
