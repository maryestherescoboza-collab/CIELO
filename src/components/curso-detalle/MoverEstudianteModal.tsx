import React, { useState, useEffect } from 'react';
import { X, AlertCircle, ArrowUpDown } from 'lucide-react';

interface Props {
    show: boolean;
    onClose: () => void;
    estudiante: { id: number; displayName: string; numeroLista: number } | null;
    totalEstudiantes: number;
    onMover: (estudianteId: number, posicionDestino: number) => Promise<boolean>;
}

export default function MoverEstudianteModal({ show, onClose, estudiante, totalEstudiantes, onMover }: Props) {
    const [posicion, setPosicion] = useState<number | ''>('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (estudiante) {
            setPosicion(estudiante.numeroLista);
            setError(null);
        }
    }, [estudiante, show]);

    if (!show || !estudiante) return null;

    const currentPos = estudiante.numeroLista;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        const targetPos = Number(posicion);

        if (!targetPos || isNaN(targetPos) || targetPos <= 0) {
            setError('La posición debe ser un número entero mayor a 0.');
            return;
        }

        if (targetPos > totalEstudiantes) {
            setError(`La posición máxima permitida en este curso es ${totalEstudiantes}.`);
            return;
        }

        if (targetPos === currentPos) {
            setError('El estudiante ya se encuentra en esta posición.');
            return;
        }

        setIsSubmitting(true);
        try {
            const success = await onMover(estudiante.id, targetPos);
            if (success) {
                onClose();
            } else {
                setError('No se pudo reordenar la posición. Revisa los mensajes del sistema.');
            }
        } catch (err: any) {
            setError(err.message || 'Error inesperado al mover de posición.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const targetNum = typeof posicion === 'number' ? posicion : null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm px-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
                <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-[#689C63]/10 text-[#689C63] flex items-center justify-center">
                            <ArrowUpDown size={16} />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-slate-800">Mover posición en la lista</h3>
                            <p className="text-[11px] font-medium text-slate-500 truncate max-w-[200px]">
                                {estudiante.displayName}
                            </p>
                        </div>
                    </div>
                    <button 
                        onClick={onClose} 
                        disabled={isSubmitting}
                        className="text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-lg hover:bg-slate-100"
                    >
                        <X size={18} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-5">
                    <div className="space-y-4">
                        {/* Selector de nueva posición */}
                        <div>
                            <label className="block text-[12px] font-bold text-slate-600 mb-1.5 uppercase tracking-wider text-center">
                                Nueva posición de lista
                            </label>
                            <div className="flex items-center justify-center gap-3">
                                <div className="text-center">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Actual</span>
                                    <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-lg font-black text-slate-600">
                                        {currentPos}
                                    </div>
                                </div>

                                <div className="text-slate-300 text-xl font-bold">→</div>

                                <div className="text-center">
                                    <span className="text-[10px] font-bold text-[#689C63] uppercase block">Destino</span>
                                    <input
                                        type="number"
                                        min="1"
                                        max={totalEstudiantes}
                                        value={posicion}
                                        onChange={e => setPosicion(e.target.value ? Number(e.target.value) : '')}
                                        placeholder={`1 - ${totalEstudiantes}`}
                                        disabled={isSubmitting}
                                        autoFocus
                                        className="w-16 h-12 bg-[#689C63]/10 border-2 border-[#689C63] rounded-xl text-center text-xl font-black text-[#689C63] focus:outline-none focus:ring-2 focus:ring-[#689C63]/30 transition-all"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Explicación de lo que ocurrirá */}
                        {targetNum !== null && targetNum > 0 && targetNum <= totalEstudiantes && targetNum !== currentPos && (
                            <div className="p-3 bg-slate-50 border border-slate-200/70 rounded-xl text-[12px] text-slate-600 leading-relaxed">
                                {currentPos > targetNum ? (
                                    <span>
                                        El estudiante subirá de la posición <strong>#{currentPos}</strong> a la <strong>#{targetNum}</strong>. Los estudiantes entre las posiciones #{targetNum} y #{currentPos - 1} bajarán una posición.
                                    </span>
                                ) : (
                                    <span>
                                        El estudiante bajará de la posición <strong>#{currentPos}</strong> a la <strong>#{targetNum}</strong>. Los estudiantes entre las posiciones #{currentPos + 1} y #{targetNum} subirán una posición.
                                    </span>
                                )}
                            </div>
                        )}

                        {/* Mensaje de error */}
                        {error && (
                            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2 text-rose-700 text-[12px] font-medium">
                                <AlertCircle size={16} className="shrink-0 mt-0.5" />
                                <p>{error}</p>
                            </div>
                        )}
                    </div>

                    {/* Acciones */}
                    <div className="mt-6 flex items-center justify-end gap-2">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isSubmitting}
                            className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting || posicion === currentPos}
                            className="px-5 py-2 text-xs font-bold text-white bg-[#689C63] hover:bg-[#588554] active:scale-95 disabled:opacity-50 disabled:pointer-events-none rounded-xl transition-all shadow-sm"
                        >
                            {isSubmitting ? 'Guardando...' : 'Mover estudiante'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
