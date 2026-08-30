import { useState, useEffect } from 'react';
import type { MouseEvent } from 'react';
import { Check, X } from 'lucide-react';

export interface CaptureRect {
    x: number;
    y: number;
    width: number;
    height: number;
}

interface Props {
    onConfirm: (rect: CaptureRect) => void;
    onCancel: () => void;
}

export function RegionCaptureOverlay({ onConfirm, onCancel }: Props) {
    const [isDrawing, setIsDrawing] = useState(false);
    const [startPos, setStartPos] = useState({ x: 0, y: 0 });
    const [currentPos, setCurrentPos] = useState({ x: 0, y: 0 });
    const [finalRect, setFinalRect] = useState<CaptureRect | null>(null);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onCancel();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onCancel]);

    const handleMouseDown = (e: MouseEvent) => {
        if ((e.target as HTMLElement).closest('.capture-controls')) return;
        
        setIsDrawing(true);
        setFinalRect(null);
        setStartPos({ x: e.clientX, y: e.clientY });
        setCurrentPos({ x: e.clientX, y: e.clientY });
    };

    const handleMouseMove = (e: MouseEvent) => {
        if (!isDrawing) return;
        setCurrentPos({ x: e.clientX, y: e.clientY });
    };

    const handleMouseUp = () => {
        if (!isDrawing) return;
        setIsDrawing(false);
        
        const x = Math.min(startPos.x, currentPos.x);
        const y = Math.min(startPos.y, currentPos.y);
        const width = Math.abs(currentPos.x - startPos.x);
        const height = Math.abs(currentPos.y - startPos.y);

        if (width > 10 && height > 10) {
            setFinalRect({ x, y, width, height });
        } else {
            setFinalRect(null);
        }
    };

    const x = isDrawing ? Math.min(startPos.x, currentPos.x) : finalRect?.x || 0;
    const y = isDrawing ? Math.min(startPos.y, currentPos.y) : finalRect?.y || 0;
    const width = isDrawing ? Math.abs(currentPos.x - startPos.x) : finalRect?.width || 0;
    const height = isDrawing ? Math.abs(currentPos.y - startPos.y) : finalRect?.height || 0;

    const hasSelection = width > 0 && height > 0;

    return (
        <div 
            className="fixed inset-0 z-9999 cursor-crosshair select-none"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
        >
            {/* Dark overlay when there's no selection */}
            {!hasSelection && (
                <div className="absolute inset-0 bg-black/40 pointer-events-none" />
            )}

            {hasSelection && (
                <div 
                    className="absolute border-2 border-blue-500 shadow-[0_0_0_9999px_rgba(0,0,0,0.4)] pointer-events-none"
                    style={{
                        left: x,
                        top: y,
                        width,
                        height,
                    }}
                >
                    {!isDrawing && finalRect && (
                        <div 
                            className="capture-controls absolute right-0 flex gap-2 p-2 bg-white rounded-lg shadow-lg border border-slate-200 pointer-events-auto"
                            style={{ 
                                top: '100%', 
                                marginTop: '8px',
                                cursor: 'default'
                            }}
                            onMouseDown={(e) => e.stopPropagation()}
                        >
                            <button
                                onClick={onCancel}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-slate-600 hover:bg-slate-100 transition-colors text-sm font-medium"
                            >
                                <X className="w-4 h-4" /> Cancelar
                            </button>
                            <button
                                onClick={() => onConfirm(finalRect)}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-colors text-sm font-medium"
                            >
                                <Check className="w-4 h-4" /> Capturar
                            </button>
                        </div>
                    )}
                </div>
            )}
            
            {!hasSelection && (
                <div className="absolute top-8 left-1/2 -translate-x-1/2 bg-black/75 text-white px-4 py-2 rounded-full text-sm pointer-events-none">
                    Arrastra el cursor para seleccionar el área a capturar
                </div>
            )}
        </div>
    );
}
