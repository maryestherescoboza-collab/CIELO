import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';

interface PresentationContextType {
    isPresenting: boolean;
    togglePresentation: () => void;
}

const PresentationContext = createContext<PresentationContextType | null>(null);

export function PresentationProvider({ children }: { children: ReactNode }) {
    const [isPresenting, setIsPresenting] = useState(false);

    useEffect(() => {
        const handleFullscreenChange = () => {
            const isFullscreen = document.fullscreenElement !== null;
            setIsPresenting(isFullscreen);
        };

        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, []);

    const togglePresentation = useCallback(async () => {
        const target = document.documentElement; // GLOBAL TARGET for the entire app
        
        try {
            if (!document.fullscreenElement) {
                if (target.requestFullscreen) {
                    await target.requestFullscreen();
                } else if ((target as any).webkitRequestFullscreen) {
                    await (target as any).webkitRequestFullscreen();
                }
            } else {
                if (document.exitFullscreen) {
                    await document.exitFullscreen();
                } else if ((document as any).webkitExitFullscreen) {
                    await (document as any).webkitExitFullscreen();
                }
            }
        } catch (error) {
            console.error('Error toggling presentation mode:', error);
        }
    }, []);

    return (
        <PresentationContext.Provider value={{ isPresenting, togglePresentation }}>
            {children}
        </PresentationContext.Provider>
    );
}

export function usePresentation() {
    const context = useContext(PresentationContext);
    if (!context) {
        throw new Error('usePresentation must be used within a PresentationProvider');
    }
    return context;
}
