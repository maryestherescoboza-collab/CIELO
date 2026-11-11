import React from 'react';
import { ShieldAlert } from 'lucide-react';
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
    onRetry
}) => {
    const { errorCount } = usePersistenceStore();

    // Solo se muestra en caso de ERROR real para permitir al usuario reintentar o conocer el fallo.
    // Los estados normales de progreso ("guardando...", "verificando almacenamiento..." y "guardado correctamente")
    // han sido silenciados por completo para evitar banners emergentes que interrumpan o desplacen la pantalla.
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
                            Algunas puntuaciones todavía no han podido verificarse en el servidor. Tus cambios permanecen protegidos localmente.
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

    return null;
};
