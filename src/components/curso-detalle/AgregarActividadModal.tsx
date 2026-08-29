import React, { useEffect, useState } from 'react';
import { PlusCircle } from 'lucide-react';
import { CieloModal } from '../ui/CieloModal';

interface AgregarActividadModalProps {
    show: boolean;
    onClose: () => void;
    onConfirm: (indicador: string, producto: string) => Promise<boolean>;
}

const AgregarActividadModal: React.FC<AgregarActividadModalProps> = ({ show, onClose, onConfirm }) => {
    const [indicador, setIndicador] = useState('');
    const [producto, setProducto] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (show) {
            setIndicador('');
            setProducto('');
            setIsSaving(false);
            setError(null);
        }
    }, [show]);

    const handleConfirm = async () => {
        const ind = indicador.trim();
        const prod = producto.trim();
        if (!ind || !prod) {
            setError('Debe completar el indicador de logro y el producto / evidencia.');
            return;
        }
        if (isSaving) return;

        setIsSaving(true);
        setError(null);
        try {
            const ok = await onConfirm(ind, prod);
            if (ok) {
                onClose();
            } else {
                setError('No se pudo guardar la actividad. Inténtelo nuevamente.');
            }
        } catch {
            setError('Error inesperado al guardar la actividad. Inténtelo nuevamente.');
        } finally {
            setIsSaving(false);
        }
    };

    const modalFooter = (
        <div className="flex items-center justify-end gap-3">
            <button
                type="button"
                onClick={onClose}
                disabled={isSaving}
                className="rounded-full px-6 py-2.5 text-xs font-black uppercase tracking-widest text-slate-500 hover:bg-slate-100 border border-slate-200 transition-all duration-200 disabled:opacity-50"
            >
                Cancelar
            </button>
            <button
                type="button"
                onClick={handleConfirm}
                disabled={isSaving}
                className="rounded-full px-6 py-2.5 text-xs font-black uppercase tracking-widest bg-primary text-[#2E3330] shadow-md shadow-primary/20 hover:bg-primary/90 transition-all duration-200 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
                <PlusCircle size={15} strokeWidth={2.6} />
                {isSaving ? 'Guardando…' : 'Agregar actividad'}
            </button>
        </div>
    );

    return (
        <CieloModal
            isOpen={show}
            onClose={onClose}
            title="Agregar actividad"
            maxWidth="sm"
            icon={<PlusCircle size={20} strokeWidth={2.4} />}
            footer={modalFooter}
        >
            <div className="space-y-5 py-1">
                <div className="space-y-2">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">
                        Indicador de logro *
                    </label>
                    <textarea
                        rows={3}
                        className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm bg-white outline-none focus:border-primary focus:ring-4 focus:ring-primary/5 font-medium transition-all resize-none"
                        placeholder="Ej: El estudiante identifica las ideas principales de un texto argumentativo."
                        value={indicador}
                        onChange={e => setIndicador(e.target.value)}
                    />
                </div>

                <div className="space-y-2">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">
                        Producto / Evidencia *
                    </label>
                    <input
                        className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm bg-white outline-none focus:border-primary focus:ring-4 focus:ring-primary/5 font-medium transition-all"
                        placeholder="Ej: Evidencia en el cuaderno, Proyecto, Canva, Infografía…"
                        value={producto}
                        onChange={e => setProducto(e.target.value)}
                    />
                </div>

                {error && (
                    <p className="text-xs font-bold text-(--danger) bg-(--danger)/10 border border-(--danger)/20 rounded-xl px-4 py-2.5 uppercase tracking-wider">
                        {error}
                    </p>
                )}
            </div>
        </CieloModal>
    );
};

export default AgregarActividadModal;