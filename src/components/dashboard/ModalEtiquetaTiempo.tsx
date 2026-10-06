import React, { useState, useEffect } from 'react';
import { X, Clock, Trash2, Tag } from 'lucide-react';

export type TipoEtiquetaTiempo = 'Recreo' | 'Almuerzo' | 'Hora pedagógica';

export interface EtiquetaTiempoSemanal {
    id: string;
    tipo: TipoEtiquetaTiempo;
    dia: string; // e.g. 'Lunes', 'Martes', etc.
    inicio: string; // HH:MM
    fin: string; // HH:MM
}

interface ModalEtiquetaTiempoProps {
    show: boolean;
    onClose: () => void;
    initialDia: string;
    initialInicio?: string;
    initialFin?: string;
    existingEtiqueta?: EtiquetaTiempoSemanal | null;
    onSave: (etiqueta: EtiquetaTiempoSemanal) => void;
    onDelete?: (id: string) => void;
}

export const ModalEtiquetaTiempo: React.FC<ModalEtiquetaTiempoProps> = ({
    show,
    onClose,
    initialDia,
    initialInicio = '10:00',
    initialFin = '10:45',
    existingEtiqueta,
    onSave,
    onDelete,
}) => {
    const [tipo, setTipo] = useState<TipoEtiquetaTiempo>('Recreo');
    const [inicio, setInicio] = useState(initialInicio);
    const [fin, setFin] = useState(initialFin);
    const [dia, setDia] = useState(initialDia);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (show) {
            if (existingEtiqueta) {
                setTipo(existingEtiqueta.tipo);
                setInicio(existingEtiqueta.inicio);
                setFin(existingEtiqueta.fin);
                setDia(existingEtiqueta.dia);
            } else {
                setTipo('Recreo');
                setInicio(initialInicio);
                setFin(initialFin);
                setDia(initialDia);
            }
            setError(null);
        }
    }, [show, existingEtiqueta, initialDia, initialInicio, initialFin]);

    if (!show) return null;

    const handleSave = () => {
        if (inicio >= fin) {
            setError('La hora de inicio debe ser menor a la hora de fin');
            return;
        }

        const id = existingEtiqueta ? existingEtiqueta.id : `etiqueta-${Date.now()}`;
        onSave({
            id,
            tipo,
            dia,
            inicio,
            fin,
        });
        onClose();
    };

    const handleDelete = () => {
        if (existingEtiqueta && onDelete) {
            onDelete(existingEtiqueta.id);
            onClose();
        }
    };

    const opciones: { tipo: TipoEtiquetaTiempo; label: string; icon: string; desc: string }[] = [
        { tipo: 'Recreo', label: 'Recreo', icon: '☕', desc: 'Descanso o receso escolar' },
        { tipo: 'Almuerzo', label: 'Almuerzo', icon: '🍱', desc: 'Franja para alimentos' },
        { tipo: 'Hora pedagógica', label: 'Hora pedagógica', icon: '📚', desc: 'Período libre o administrativo' },
    ];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-slate-200">
                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                    <div className="flex items-center gap-2">
                        <Tag className="w-4 h-4 text-[#689c63]" />
                        <h3 className="text-base font-extrabold text-slate-800">
                            {existingEtiqueta ? 'Editar Etiqueta de Tiempo' : 'Nueva Etiqueta de Tiempo'}
                        </h3>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 space-y-5">
                    {error && (
                        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold rounded-xl">
                            {error}
                        </div>
                    )}

                    {/* Selector de Tipo */}
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                            Selecciona la etiqueta
                        </label>
                        <div className="grid grid-cols-1 gap-2">
                            {opciones.map((op) => (
                                <button
                                    key={op.tipo}
                                    type="button"
                                    onClick={() => setTipo(op.tipo)}
                                    className={`p-3 rounded-xl border text-left flex items-center justify-between transition-all ${
                                        tipo === op.tipo
                                            ? 'border-[#689c63] bg-[#f3f7ef] ring-2 ring-[#689c63]/20'
                                            : 'border-slate-200 bg-white hover:bg-slate-50'
                                    }`}
                                >
                                    <div className="flex items-center gap-2.5">
                                        <span className="text-lg">{op.icon}</span>
                                        <div>
                                            <div className="text-sm font-bold text-slate-800">{op.label}</div>
                                            <div className="text-[11px] text-slate-500">{op.desc}</div>
                                        </div>
                                    </div>
                                    <div
                                        className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                                            tipo === op.tipo
                                                ? 'border-[#689c63] bg-[#689c63]'
                                                : 'border-slate-300'
                                        }`}
                                    >
                                        {tipo === op.tipo && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Horarios */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1 flex items-center gap-1">
                                <Clock className="w-3.5 h-3.5 text-slate-400" />
                                Inicio
                            </label>
                            <input
                                type="time"
                                value={inicio}
                                onChange={(e) => setInicio(e.target.value)}
                                className="w-full px-3 py-2 text-sm font-semibold text-slate-800 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-[#689c63]"
                            />
                        </div>
                        <div>
                            <label className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1 flex items-center gap-1">
                                <Clock className="w-3.5 h-3.5 text-slate-400" />
                                Fin
                            </label>
                            <input
                                type="time"
                                value={fin}
                                onChange={(e) => setFin(e.target.value)}
                                className="w-full px-3 py-2 text-sm font-semibold text-slate-800 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-[#689c63]"
                            />
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                    {existingEtiqueta && onDelete ? (
                        <button
                            type="button"
                            onClick={handleDelete}
                            className="px-3 py-2 text-xs font-bold text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-xl transition-colors flex items-center gap-1.5"
                        >
                            <Trash2 className="w-4 h-4" />
                            Eliminar
                        </button>
                    ) : <div />}
                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 rounded-xl transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            type="button"
                            onClick={handleSave}
                            className="px-5 py-2 text-xs font-bold text-white bg-[#689c63] hover:bg-[#578952] rounded-xl shadow-xs transition-all"
                        >
                            {existingEtiqueta ? 'Guardar Cambios' : 'Agregar Etiqueta'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
