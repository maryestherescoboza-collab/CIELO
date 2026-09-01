import React from 'react';

export interface WorkWindowPosition {
    x: number;
    y: number;
}

export interface FloatingWorkWindowProps {
    id: string;
    title: React.ReactNode;
    barColor?: string;
    position: WorkWindowPosition;
    width?: number;
    zIndex: number;
    onStartDrag: (id: string, e: React.PointerEvent) => void;
    onWindowFocus: (id: string) => void;
    onClose: () => void;
    children: React.ReactNode;
}

// Ventana flotante genérica tipo "ventana de escritorio" (referencia .win/.bar).
// - Arrastrable desde la barra (solo la barra; los botones/inputs no arrastran).
// - Controles `○ ‒ ✕`; ✕ cierra la ventana (nunca elimina o modifica la actividad).
// - El cuerpo es libre y puede contener cualquier ventana interna futura.
const FloatingWorkWindow: React.FC<FloatingWorkWindowProps> = ({
    id,
    title,
    barColor = '#F0C24E',
    position,
    width = 320,
    zIndex,
    onStartDrag,
    onWindowFocus,
    onClose,
    children,
}) => {
    const handleBarPointerDown = (e: React.PointerEvent) => {
        if ((e.target as HTMLElement).closest('button')) return;
        onStartDrag(id, e);
    };

    const handleWinPointerDown = (e: React.PointerEvent) => {
        if ((e.target as HTMLElement).closest('button, input, textarea, select')) return;
        onWindowFocus(id);
    };

    return (
        <div
            className="ws-win"
            style={{ left: position.x, top: position.y, zIndex, width }}
            onPointerDown={handleWinPointerDown}
        >
            <div className="ws-bar" style={{ background: barColor }} onPointerDown={handleBarPointerDown}>
                <span className="ws-bar-title">{title}</span>
                <span className="ws-ctrl">
                    <span aria-hidden="true">○</span>
                    <span aria-hidden="true">‒</span>
                    <button
                        type="button"
                        className="ws-close"
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={onClose}
                        title="Cerrar ventana"
                        aria-label="Cerrar ventana"
                    >
                        ✕
                    </button>
                </span>
            </div>
            <div className="ws-body">{children}</div>
        </div>
    );
};

export default React.memo(FloatingWorkWindow);