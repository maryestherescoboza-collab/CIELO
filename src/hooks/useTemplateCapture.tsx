import { useState, useCallback } from 'react';
import { CieloModal } from '../components/ui/CieloModal';

interface CaptureOptions {
    fileName: string;
    existingFileId?: string;
    onSuccess?: (fileId: string) => void;
}

export function useTemplateCapture() {
    const [isShowingComingSoon, setIsShowingComingSoon] = useState(false);

    const startCapture = useCallback((_options: CaptureOptions) => {
        setIsShowingComingSoon(true);
    }, []);

    const handleCancel = useCallback(() => {
        setIsShowingComingSoon(false);
    }, []);

    const captureOverlay = (
        <CieloModal
            isOpen={isShowingComingSoon}
            onClose={handleCancel}
            title="Algo nuevo está por llegar"
            maxWidth="md"
        >
            <div className="space-y-4 text-slate-600 text-[15px] leading-relaxed pb-4">
                <p>
                    Muy pronto podrás capturar tus rúbricas y listas de cotejo directamente desde CIELO y guardarlas automáticamente en tu Google Drive.
                </p>
                <p>
                    Estamos preparando esta función para que sea rápida, sencilla y realmente útil para tu trabajo docente.
                </p>
                <p className="font-semibold text-blue-600 pt-2">
                    Disponible próximamente.
                </p>
            </div>
            <div className="flex justify-end pt-4 border-t border-slate-200 mt-4">
                <button
                    onClick={handleCancel}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md text-sm font-medium transition-colors"
                >
                    Cerrar
                </button>
            </div>
        </CieloModal>
    );

    return { 
        startCapture, 
        isCapturing: false, 
        captureOverlay 
    };
}
