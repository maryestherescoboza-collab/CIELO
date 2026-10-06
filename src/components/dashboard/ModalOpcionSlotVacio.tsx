import React from 'react';
import { X, BookOpen, Tag } from 'lucide-react';

interface ModalOpcionSlotVacioProps {
    show: boolean;
    onClose: () => void;
    dateIso: string;
    timeStr: string;
    onSelectClase: () => void;
    onSelectEtiqueta: () => void;
}

export const ModalOpcionSlotVacio: React.FC<ModalOpcionSlotVacioProps> = ({
    show,
    onClose,
    dateIso,
    timeStr,
    onSelectClase,
    onSelectEtiqueta,
}) => {
    if (!show) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden border border-slate-200">
                {/* Header */}
                <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                    <div>
                        <h3 className="text-sm font-extrabold text-slate-800">Franja Horaria Vacía</h3>
                        <p className="text-[11px] font-semibold text-slate-500">{dateIso} · {timeStr}</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-5 space-y-3">
                    <button
                        type="button"
                        onClick={() => {
                            onClose();
                            onSelectClase();
                        }}
                        className="w-full p-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 transition-all text-left flex items-start gap-3 group"
                    >
                        <div className="p-2.5 rounded-lg bg-[#e0e9f4] text-[#537bac] group-hover:bg-[#537bac] group-hover:text-white transition-colors">
                            <BookOpen className="w-5 h-5" />
                        </div>
                        <div>
                            <div className="text-sm font-bold text-slate-800">Asignar Clase de Curso</div>
                            <div className="text-xs text-slate-500 mt-0.5">Programar un curso o asignatura en este horario</div>
                        </div>
                    </button>

                    <button
                        type="button"
                        onClick={() => {
                            onClose();
                            onSelectEtiqueta();
                        }}
                        className="w-full p-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 transition-all text-left flex items-start gap-3 group"
                    >
                        <div className="p-2.5 rounded-lg bg-emerald-100 text-emerald-700 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                            <Tag className="w-5 h-5" />
                        </div>
                        <div>
                            <div className="text-sm font-bold text-slate-800">Colocar Etiqueta de Tiempo</div>
                            <div className="text-xs text-slate-500 mt-0.5">Recreo, Almuerzo o Hora pedagógica</div>
                        </div>
                    </button>
                </div>
            </div>
        </div>
    );
};
