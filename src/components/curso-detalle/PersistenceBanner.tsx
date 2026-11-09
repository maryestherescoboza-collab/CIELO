import React from 'react';
import { Loader2, ShieldAlert, CheckCircle2, RotateCw } from 'lucide-react';
import { usePersistenceStore } from '../../store/persistenceStore';
import { CieloPill } from '../ui/CieloPill';

interface Props {
    saveStatus: 'idle' | 'unsaved' | 'saving' | 'verifying' | 'saved' | 'error';
    saveError: string | null;
    isDirty: boolean;
    onRetry?: () => void;
}

export const PersistenceBanner: React.FC<Props> = ({
    saveStatus,
    saveError,
    isDirty,
    onRetry
}) => {
    const { pendingCount, savingCount, verifyingCount, errorCount } = usePersistenceStore();

    if (saveStatus === 'idle' && !isDirty && pendingCount === 0) {
        return null;
    }

    // ESTADO 1: Guardando
    if (saveStatus === 'saving' || savingCount > 0) {
        return (
            <div className="bg-amber-500/10 border-b border-amber-500/30 px-6 py-2.5 flex items-center justify-between text-xs text-amber-900 animate-in fade-in duration-200">
                <div className="flex items-center gap-3">
                    <Loader2 size={16} className="text-amber-600 animate-spin shrink-0" />
                    <div>
                        <span className="font-black uppercase tracking-wider text-[11px] block text-amber-800">
                            Guardando puntuaciones...
                        </span>
                        <p className="text-[11px] text-amber-750 font-medium">
                            Estamos guardando tus puntuaciones en el servidor. Por favor, espera y no salgas de este curso hasta que CIELO confirme que todas las calificaciones se han guardado correctamente.
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    <span className="bg-amber-100 text-amber-800 px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-wider uppercase">
                        {savingCount > 0 ? `${savingCount} guardando` : 'En progreso'}
                    </span>
                </div>
            </div>
        );
    }

    // ESTADO 2: Verificando
    if (saveStatus === 'verifying' || verifyingCount > 0) {
        return (
            <div className="bg-indigo-500/10 border-b border-indigo-500/30 px-6 py-2.5 flex items-center justify-between text-xs text-indigo-900 animate-in fade-in duration-200">
                <div className="flex items-center gap-3">
                    <RotateCw size={16} className="text-indigo-600 animate-spin shrink-0" />
                    <div>
                        <span className="font-black uppercase tracking-wider text-[11px] block text-indigo-800">
                            Verificando almacenamiento...
                        </span>
                        <p className="text-[11px] text-indigo-750 font-medium">
                            Las puntuaciones ya fueron enviadas. Estamos comprobando que cada calificación se encuentre correctamente almacenada en Supabase.
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    <span className="bg-indigo-100 text-indigo-800 px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-wider uppercase">
                        {verifyingCount > 0 ? `${verifyingCount} verificando` : 'Verificando en BD'}
                    </span>
                </div>
            </div>
        );
    }

    // ESTADO 4: Error
    if (saveStatus === 'error' || errorCount > 0) {
        return (
            <div className="bg-rose-500/10 border-b border-rose-500/30 px-6 py-2.5 flex items-center justify-between text-xs text-rose-900 animate-in fade-in duration-200">
                <div className="flex items-center gap-3">
                    <ShieldAlert size={18} className="text-rose-600 shrink-0" />
                    <div>
                        <span className="font-black uppercase tracking-wider text-[11px] block text-rose-800">
                            No se pudo confirmar el guardado.
                        </span>
                        <p className="text-[11px] text-rose-750 font-medium">
                            Algunas puntuaciones todavía no han podido verificarse. Tus cambios permanecen protegidos localmente. No salgas de este curso mientras CIELO intenta completar la sincronización.
                            {saveError && <span className="block mt-0.5 text-[10px] text-rose-600 font-mono">Detalle: {saveError}</span>}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    {onRetry && (
                        <CieloPill
                            as="button"
                            variant="danger"
                            className="h-7 px-3 text-[10px] font-bold tracking-wider"
                            onClick={onRetry}
                        >
                            Reintentar Sincronización
                        </CieloPill>
                    )}
                </div>
            </div>
        );
    }

    // ESTADO 3: Confirmado (cuando se acaba de guardar y no hay pendientes)
    if (saveStatus === 'saved' && !isDirty && pendingCount === 0 && savingCount === 0 && verifyingCount === 0) {
        return (
            <div className="bg-emerald-500/10 border-b border-emerald-500/30 px-6 py-2 flex items-center justify-between text-xs text-emerald-900 animate-in fade-in duration-200">
                <div className="flex items-center gap-2.5">
                    <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />
                    <span className="text-[11px] font-medium text-emerald-800">
                        <strong className="font-bold">Guardado correctamente:</strong> Todas las puntuaciones de esta actividad se han guardado y verificado correctamente. Ya puedes continuar.
                    </span>
                </div>
                <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full text-[10px] font-bold">
                    100% Verificado
                </span>
            </div>
        );
    }

    return null;
};
