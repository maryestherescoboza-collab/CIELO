import { Camera, Loader2 } from 'lucide-react';

interface TemplateCaptureButtonProps {
    isCapturing: boolean;
    onClick: () => void;
    title?: string;
}

export function TemplateCaptureButton({ isCapturing, onClick, title = "Guardar captura en Google Drive" }: TemplateCaptureButtonProps) {
    return (
        <button
            data-html2canvas-ignore="true"
            aria-label={title}
            title={title}
            onClick={onClick}
            disabled={isCapturing}
            className="flex items-center justify-center w-8 h-8 rounded-full bg-white border border-(--border-soft) shadow-sm text-(--ink-soft) hover:text-(--primary) hover:border-(--primary)/50 transition-all outline-none focus-visible:ring-2 focus-visible:ring-(--primary)/50 disabled:opacity-50 disabled:cursor-not-allowed ml-auto"
        >
            {isCapturing ? <Loader2 size={16} className="animate-spin text-(--primary)" /> : <Camera size={16} />}
        </button>
    );
}
