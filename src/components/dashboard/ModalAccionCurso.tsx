import React from 'react';
import { X, ArrowRight, BookOpen, Clock } from 'lucide-react';

interface ModalAccionCursoProps {
    show: boolean;
    onClose: () => void;
    cursoId: number;
    cursoNombre: string;
    asignatura: string;
    inicio: string;
    fin: string;
    onIrACurso: (cursoId: number) => void;
}

export const ModalAccionCurso: React.FC<ModalAccionCursoProps> = ({
    show,
    onClose,
    cursoId,
    cursoNombre,
    asignatura,
    inicio,
    fin,
    onIrACurso,
}) => {
    if (!show) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
                {/* Header */}
                <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                    <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-lg bg-[#e0e9f4] text-[#537bac]">
                            <BookOpen className="w-4 h-4" />
                        </div>
                        <h3 className="text-sm font-extrabold text-slate-800">Detalles de la Clase</h3>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-5 space-y-4">
                    <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1">
                        <div className="text-base font-black text-slate-800">{cursoNombre}</div>
                        <div className="text-xs font-semibold text-slate-600">{asignatura}</div>
                        <div className="text-xs text-slate-500 flex items-center gap-1 pt-1 font-mono">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            <span>{inicio} – {fin}</span>
                        </div>
                    </div>

                    {/* Single action button: Ir a curso */}
                    <button
                        type="button"
                        onClick={() => {
                            onClose();
                            onIrACurso(cursoId);
                        }}
                        className="w-full py-3 px-4 bg-[#689c63] hover:bg-[#578952] text-white text-xs font-extrabold rounded-xl transition-all flex items-center justify-center gap-2 shadow-sm uppercase tracking-wider"
                    >
                        <span>Ir a curso</span>
                        <ArrowRight className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    );
};
