import React, { useEffect } from 'react';
import { X } from 'lucide-react';

export interface CieloModalProps {
    isOpen: boolean;
    onClose: () => void;
    title?: React.ReactNode;
    subtitle?: React.ReactNode;
    children: React.ReactNode;
    footer?: React.ReactNode;
    maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl' | '6xl' | '7xl';
    hideCloseButton?: boolean;
    className?: string;
    icon?: React.ReactNode;
}

const maxWidthMap = {
    'sm': 'max-w-sm',
    'md': 'max-w-md',
    'lg': 'max-w-lg',
    'xl': 'max-w-xl',
    '2xl': 'max-w-2xl',
    '3xl': 'max-w-3xl',
    '4xl': 'max-w-4xl',
    '5xl': 'max-w-5xl',
    '6xl': 'max-w-6xl',
    '7xl': 'max-w-7xl',
};

export const CieloModal: React.FC<CieloModalProps> = ({
    isOpen,
    onClose,
    title,
    subtitle,
    children,
    footer,
    maxWidth = '2xl',
    hideCloseButton = false,
    className = '',
    icon,
}) => {
    // Close on Escape key
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isOpen) {
                onClose();
            }
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    // Prevent body scroll when open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div 
            className="fixed inset-0 z-100 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 sm:p-6 animate-in fade-in duration-200"
            onClick={onClose}
        >
            <div 
                className={`w-full ${maxWidthMap[maxWidth]} bg-white border border-(--border-soft) shadow-md rounded-(--radius-lg) flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-200 ${className}`}
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                {(title || !hideCloseButton) && (
                    <div className="px-5 py-4 border-b border-(--border-soft) flex items-start justify-between bg-white shrink-0">
                        <div className="flex items-center gap-3">
                            {icon && (
                                <div className="p-2 rounded-xl bg-(--linen)/50 text-(--ink) border border-(--border-soft) shadow-sm">
                                    {icon}
                                </div>
                            )}
                            <div>
                                {title && (
                                    <h2 className="text-base font-black text-(--ink) tracking-tight uppercase">
                                        {title}
                                    </h2>
                                )}
                                {subtitle && (
                                    <p className="text-xs font-bold text-(--ink-soft) uppercase tracking-widest mt-0.5">
                                        {subtitle}
                                    </p>
                                )}
                            </div>
                        </div>
                        
                        {!hideCloseButton && (
                            <button 
                                onClick={onClose}
                                className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-(--linen) transition-colors text-(--ink-soft) hover:text-(--ink) shrink-0 ml-4"
                                aria-label="Cerrar modal"
                            >
                                <X size={18} />
                            </button>
                        )}
                    </div>
                )}

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-5">
                    {children}
                </div>

                {/* Footer */}
                {footer && (
                    <div className="px-5 py-3.5 bg-(--linen)/30 border-t border-(--border-soft) shrink-0">
                        {footer}
                    </div>
                )}
            </div>
        </div>
    );
};
