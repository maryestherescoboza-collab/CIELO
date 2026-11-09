import React, { useEffect, useState } from 'react';
import { PlusCircle } from 'lucide-react';
import { CieloModal } from '../ui/CieloModal';
import { SelectorIndicadorFragmento, type SelectorIndicadorData } from '../curriculo/SelectorIndicadorFragmento';
import { esAsignaturaOptativa, getAsignaturaNombre } from '../../constants/asignaturas';
import type { Curso, BCKey } from '../../types';

interface AgregarActividadModalProps {
    show: boolean;
    onClose: () => void;
    onConfirm: (
        indicador: string,
        producto: string,
        extra?: {
            indicadores_json?: any[];
            bcAsignados?: BCKey[];
        }
    ) => Promise<boolean>;
    curso?: Curso | null;
    asignatura?: string | null;
}

const AgregarActividadModal: React.FC<AgregarActividadModalProps> = ({
    show,
    onClose,
    onConfirm,
    curso,
    asignatura,
}) => {
    const [indicadorData, setIndicadorData] = useState<SelectorIndicadorData>({
        indicadorTexto: '',
        fragmento: null,
        indicadoresJson: [],
        bcSugerido: null,
    });
    const [producto, setProducto] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (show) {
            setIndicadorData({
                indicadorTexto: '',
                fragmento: null,
                indicadoresJson: [],
                bcSugerido: null,
            });
            setProducto('');
            setIsSaving(false);
            setError(null);
        }
    }, [show]);

    const handleConfirm = async () => {
        const ind = indicadorData.indicadorTexto.trim();
        const prod = producto.trim();
        if (!ind || !prod) {
            setError('Debe completar el indicador de logro y el producto / evidencia.');
            return;
        }
        if (isSaving) return;

        setIsSaving(true);
        setError(null);
        try {
            const ok = await onConfirm(ind, prod, {
                indicadores_json: indicadorData.indicadoresJson,
                bcAsignados: indicadorData.bcSugerido ? [indicadorData.bcSugerido] : undefined,
            });
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
        <div className="flex items-center justify-end gap-3 w-full">
            <button
                type="button"
                onClick={onClose}
                disabled={isSaving}
                className="rounded-full px-6 py-2.5 text-xs font-black uppercase tracking-wider text-slate-700 hover:bg-slate-50 border border-slate-300 transition-all disabled:opacity-50 cursor-pointer"
            >
                Cancelar
            </button>
            <button
                type="button"
                onClick={handleConfirm}
                disabled={isSaving}
                className="rounded-full px-6 py-2.5 text-xs font-black uppercase tracking-wider bg-[#689C63] text-white shadow-md shadow-[#689C63]/25 hover:bg-[#5a8a55] transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
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
            title={
                <div className="flex items-center gap-3 flex-wrap">
                    <span className="text-base font-black text-[#2E3330] tracking-tight uppercase">
                        Agregar actividad
                    </span>
                    {curso && (
                        <span className="text-xs font-bold text-slate-700 bg-slate-100 border border-slate-300 px-2.5 py-0.5 rounded-lg normal-case tracking-normal">
                            {curso.grado} {curso.seccion} · {getAsignaturaNombre(asignatura || curso.asignatura)}
                            {esAsignaturaOptativa(asignatura || curso.asignatura) ? ' (Optativa)' : ''}
                        </span>
                    )}
                </div>
            }
            maxWidth="7xl"
            className="w-[90vw] max-w-7xl lg:w-[88vw]"
            icon={<PlusCircle size={20} strokeWidth={2.4} className="text-[#689C63]" />}
            footer={modalFooter}
        >
            <div className="space-y-5 py-2">
                {/* Selector curricular y resaltador de fragmento */}
                <SelectorIndicadorFragmento
                    grado={curso?.grado}
                    asignatura={asignatura || curso?.asignatura}
                    cursoId={curso?.id}
                    periodo={curso?.periodo}
                    onChange={setIndicadorData}
                    disabled={isSaving}
                />

                <div className="space-y-1.5 pt-1">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                        Producto / Evidencia de aprendizaje *
                    </label>
                    <input
                        className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-xs sm:text-sm bg-white text-[#1E2421] placeholder:text-slate-500 outline-none focus:border-[#689C63] focus:ring-4 focus:ring-[#689C63]/10 font-semibold transition-all"
                        placeholder="Ej: Cuaderno de trabajo, Proyecto grupal, Canva, Infografía, Debate…"
                        value={producto}
                        onChange={(e) => setProducto(e.target.value)}
                        disabled={isSaving}
                    />
                    <p className="text-xs text-slate-600 font-medium">
                        Indica qué entregable o evidencia generará el estudiante para evidenciar este indicador de logro.
                    </p>
                </div>

                {error && (
                    <p className="text-xs font-bold text-rose-800 bg-rose-50 border border-rose-200 rounded-xl px-4 py-2.5 uppercase tracking-wider">
                        {error}
                    </p>
                )}
            </div>
        </CieloModal>
    );
};

export default AgregarActividadModal;
