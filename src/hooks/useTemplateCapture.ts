import { useState, useCallback } from 'react';
import html2canvas from 'html2canvas';
import { useGoogleDrive } from './useGoogleDrive';
import { useAppStore } from '../store/appStore';

interface CaptureOptions {
    fileName: string;
    existingFileId?: string;
    onSuccess?: (fileId: string) => void;
}

export function useTemplateCapture() {
    const { isConnected, ensureCapturasFolder, uploadImage } = useGoogleDrive();
    const setGenericToast = useAppStore(s => s.setGenericToast);
    const [isCapturing, setIsCapturing] = useState(false);

    const showToast = useCallback((message: string, type: 'success' | 'error') => {
        setGenericToast({ message, type });
        setTimeout(() => setGenericToast(null), 4000);
    }, [setGenericToast]);

    const captureAndUpload = useCallback(async (element: HTMLElement, options: CaptureOptions) => {
        if (!isConnected) {
            showToast('Conecta Google Drive para guardar la captura.', 'error');
            return;
        }

        if (isCapturing) return;

        try {
            setIsCapturing(true);

            const canvas = await html2canvas(element, {
                useCORS: true,
                scale: 2,
                backgroundColor: '#ffffff',
                logging: false,
                windowWidth: element.scrollWidth,
                windowHeight: element.scrollHeight,
            });

            const blob = await new Promise<Blob | null>((resolve) => {
                canvas.toBlob((b) => resolve(b), 'image/png');
            });

            if (!blob) throw new Error('No se pudo generar el PNG.');

            const folderId = await ensureCapturasFolder();
            
            const result = await uploadImage(blob, options.fileName, folderId, options.existingFileId);
            
            if (options.onSuccess) {
                options.onSuccess(result.fileId);
            }
            
            showToast('Captura guardada en Google Drive.', 'success');

        } catch (error) {
            console.error('[useTemplateCapture] Error:', error);
            showToast('No fue posible guardar la captura en Google Drive.', 'error');
        } finally {
            setIsCapturing(false);
        }
    }, [isConnected, isCapturing, ensureCapturasFolder, uploadImage, showToast]);

    return { captureAndUpload, isCapturing };
}
