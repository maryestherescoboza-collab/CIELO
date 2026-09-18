import React, { useState, useEffect } from 'react';
import { CieloModal } from '../ui/CieloModal';

interface StudentObservationModalProps {
    show: boolean;
    estudiante: any | null;
    actividades: any[];
    onClose: () => void;
    onSave: (observacion: string) => void;
}

export default function StudentObservationModal({ show, estudiante, actividades, onClose, onSave }: StudentObservationModalProps) {
    const [text, setText] = useState('');

    useEffect(() => {
        if (show && estudiante) {
            setText(estudiante.observacion || '');
        }
    }, [show, estudiante]);

    const handleInsertDate = () => {
        const dateStr = new Date().toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
        setText(prev => prev + (prev.length > 0 && !prev.endsWith(' ') ? ' ' : '') + `El día (${dateStr}), `);
    };

    const handleInsertActivity = (e: React.ChangeEvent<HTMLSelectElement>) => {
        if (e.target.value) {
            setText(prev => prev + (prev.length > 0 && !prev.endsWith(' ') ? ' ' : '') + `en la actividad (${e.target.value}), el estudiante `);
            e.target.value = '';
        }
    };

    if (!estudiante) return null;

    return (
        <CieloModal
            isOpen={show}
            onClose={onClose}
            hideCloseButton={true}
            className="w-[95%] max-w-110 rounded-md! shadow-sm! border-gray-200! bg-[#fcfcfc]!"
        >
            <div className="flex flex-col h-full">
                {/* Custom Header */}
                <div className="flex items-center justify-between px-4 py-3 shrink-0">
                    <span className="text-[15px] font-semibold text-gray-800">
                        Observación de {estudiante.nombre} {estudiante.apellido}
                    </span>
                    <button 
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-700 transition-colors"
                        aria-label="Cerrar"
                    >
                        <span className="text-xl leading-none">&times;</span>
                    </button>
                </div>

                {/* Textarea Area */}
                <div className="px-4 pb-2 flex-1 flex flex-col">
                    <textarea
                        value={text}
                        onChange={e => setText(e.target.value)}
                        placeholder="Escribe la observación del estudiante..."
                        className="w-full flex-1 min-h-35 p-0 text-[14px] leading-relaxed bg-transparent border-0 outline-none resize-none text-gray-700 placeholder:text-gray-400"
                        autoFocus
                    />
                </div>

                {/* Context & Actions Footer */}
                <div className="px-4 py-3 flex items-center justify-between border-t border-gray-100 bg-white/50 shrink-0">
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleInsertDate}
                            className="text-[12px] font-medium text-gray-500 bg-gray-50 hover:bg-gray-100 px-2 py-1 rounded transition-colors"
                        >
                            Insertar Fecha
                        </button>
                        <div className="relative">
                            <select
                                onChange={handleInsertActivity}
                                className="appearance-none text-[12px] font-medium text-gray-500 bg-gray-50 hover:bg-gray-100 px-2 py-1 pr-4 rounded transition-colors cursor-pointer outline-none border-0"
                                title="Insertar Actividad"
                            >
                                <option value="">+ Insertar Actividad</option>
                                {actividades.map(act => (
                                    <option key={act.id} value={act.nombre}>{act.nombre}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <button 
                            onClick={onClose}
                            className="text-[13px] font-medium text-gray-500 hover:text-gray-700 transition-colors"
                        >
                            Cancelar
                        </button>
                        <button 
                            onClick={() => {
                                onSave(text);
                                onClose();
                            }}
                            className="text-[13px] font-semibold text-white bg-gray-800 hover:bg-gray-900 px-3 py-1.5 rounded transition-colors"
                        >
                            Guardar
                        </button>
                    </div>
                </div>
            </div>
        </CieloModal>
    );
}
