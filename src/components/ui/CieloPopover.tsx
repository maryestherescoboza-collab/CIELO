import React, { useEffect, useRef } from 'react';

export interface CieloPopoverProps {
    isOpen: boolean;
    onClose: () => void;
    children: React.ReactNode;
    title?: string;
    triggerRef: React.RefObject<HTMLElement | null>;
    className?: string;
    width?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'auto' | 'full';
    position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
}

const widthMap = {
    'xs': 'w-48',
    'sm': 'w-64',
    'md': 'w-80',
    'lg': 'w-96',
    'xl': 'w-[32rem]',
    'auto': 'w-auto',
    'full': 'w-full'
};

export const CieloPopover: React.FC<CieloPopoverProps> = ({
    isOpen,
    onClose,
    children,
    title,
    triggerRef,
    className = '',
    width = 'md',
    position = 'bottom-right'
}) => {
    const popoverRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                popoverRef.current && 
                !popoverRef.current.contains(event.target as Node) &&
                triggerRef.current &&
                !triggerRef.current.contains(event.target as Node)
            ) {
                onClose();
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen, onClose, triggerRef]);

    if (!isOpen) return null;

    const positionClasses = {
        'bottom-right': 'top-[calc(100%+0.5rem)] right-0',
        'bottom-left': 'top-[calc(100%+0.5rem)] left-0',
        'top-right': 'bottom-[calc(100%+0.5rem)] right-0',
        'top-left': 'bottom-[calc(100%+0.5rem)] left-0',
    };

    return (
        <div 
            ref={popoverRef}
            className={`absolute z-50 ${positionClasses[position]} ${widthMap[width]} bg-white rounded-(--radius-md) shadow-md border border-(--border-soft) p-5 animate-in fade-in slide-in-from-top-2 duration-200 ${className}`}
        >
            {title && (
                <div className="flex items-center justify-between border-b border-(--border-soft) pb-3 mb-4">
                    <h3 className="text-xs font-black text-(--ink) uppercase tracking-widest">{title}</h3>
                </div>
            )}
            <div className="space-y-4">
                {children}
            </div>
        </div>
    );
};
