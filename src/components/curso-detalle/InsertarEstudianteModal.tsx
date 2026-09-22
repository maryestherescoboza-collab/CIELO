import React, { useState } from 'react';
import { X, AlertCircle } from 'lucide-react';

interface Props {
    show: boolean;
    onClose: () => void;
    maxPosicion: number;
    onInsertar: (nombre: string, apellido: string, posicion: number) => Promise<any>;
}

export default function InsertarEstudianteModal({ show, onClose, maxPosicion, onInsertar }: Props) {
    const [nombre, setNombre] = useState('');
    const [apellido, setApellido] = useState('');
    const [posicion, setPosicion] = useState<number | ''>('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    if (!show) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        const pos = Number(posicion);
        if (!nombre.trim()) {
            setError('El nombre es obligatorio.');
            return;
        }
        if (!pos || isNaN(pos) || pos <= 0) {
            setError('La posición debe ser un número mayor a 0.');
            return;
        }
        if (pos > maxPosicion + 1) {
            setError(`La posición máxima permitida es ${maxPosicion + 1}.`);
            return;
        }

        setIsSubmitting(true);
        try {
            const result = await onInsertar(nombre.trim(), apellido.trim(), pos);
            if (result) {
                setNombre('');
                setApellido('');
                setPosicion('');
                onClose();
            } else {
                setError('Falló la inserción. Revisa el mensaje rojo superior o la consola.');
            }
        } catch (err: any) {
            setError(err.message || 'Error inesperado.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm px-4">
            <div className="bg-white rounded-lg shadow-sm w-full max-w-sm overflow-hidden animate-fade-in-up border border-slate-200">
                <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-slate-800">Agregar estudiante en posición</h3>
                    <button 
                        onClick={onClose} 
                        disabled={isSubmitting}
                        className="text-slate-400 hover:text-slate-600 transition-colors"
                    >
                        <X size={18} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-5">
                    <div className="space-y-5">
                        {/* Campo principal: Posición */}
                        <div>
                            <label className="block text-[13px] font-semibold text-slate-700 mb-1.5 text-center">
                                Posición en la lista
                            </label>
                            <input
                                type="number"
                                min="1"
                                max={maxPosicion + 1}
                                value={posicion}
                                onChange={e => setPosicion(e.target.value ? Number(e.target.value) : '')}
                                placeholder={`1 - ${maxPosicion + 1}`}
                                disabled={isSubmitting}
                                className="w-full bg-[#BFC9A6]/20 border border-[#BFC9A6] rounded-md px-4 py-3 text-center text-xl font-bold text-[#689C63] focus:outline-none focus:ring-1 focus:ring-[#689C63] transition-colors"
                            />
                            <p className="text-[11px] text-slate-500 mt-1.5 text-center leading-tight">
                                Los estudiantes desde esta posición en adelante aumentarán su N.º de lista.
                            </p>
                        </div>

                        {/* Campos secundarios: Nombre y Apellido */}
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-[12px] font-medium text-slate-600 mb-1">Nombre</label>
                                <input
                                    type="text"
                                    value={nombre}
                                    onChange={e => setNombre(e.target.value)}
                                    placeholder="Ej. Ana"
                                    disabled={isSubmitting}
                                    className="w-full bg-white border border-slate-200 rounded-md px-3 py-1.5 text-sm text-slate-800 focus:outline-none focus:border-[#537BAC] transition-colors"
                                />
                            </div>
                            <div>
                                <label className="block text-[12px] font-medium text-slate-600 mb-1">Apellido (opcional)</label>
                                <input
                                    type="text"
                                    value={apellido}
                                    onChange={e => setApellido(e.target.value)}
                                    placeholder="Ej. Pérez"
                                    disabled={isSubmitting}
                                    className="w-full bg-white border border-slate-200 rounded-md px-3 py-1.5 text-sm text-slate-800 focus:outline-none focus:border-[#537BAC] transition-colors"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Mensaje de error */}
                    {error && (
                        <div className="mt-4 p-2.5 bg-[#EB8847]/10 border border-[#EB8847]/20 rounded-md flex items-start gap-2 text-[#EB8847] text-[13px] font-medium">
                            <AlertCircle size={16} className="shrink-0 mt-0.5" />
                            <p>{error}</p>
                        </div>
                    )}

                    {/* Botones de acción */}
                    <div className="mt-6 flex justify-end gap-2">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isSubmitting}
                            className="px-4 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-800 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-md transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="px-4 py-1.5 text-xs font-medium text-white bg-[#689C63] hover:bg-[#689C63]/90 rounded-md transition-colors flex items-center gap-2"
                        >
                            {isSubmitting ? 'Insertando...' : 'Confirmar'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
