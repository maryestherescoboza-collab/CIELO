import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function SimTutorialOverlay() {
    const [step, setStep] = useState(0);

    // Step 0: Apuntar a la tabla (estudiante)
    // Step 1: Apuntar al boton P2 o actividades
    // Step 2: Desaparece tras 2 interacciones
    
    useEffect(() => {
        const handleClick = () => {
            setStep(s => s + 1);
        };
        
        // Listen for any click in the document to advance the tutorial
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, []);

    if (step >= 2) return null;

    return (
        <div className="fixed inset-0 z-[100] pointer-events-none">
            <AnimatePresence>
                {step === 0 && (
                    <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="absolute top-[45%] left-[50%] transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-2"
                    >
                        <div className="bg-attention text-white px-4 py-2 rounded-xl shadow-2xl font-black text-sm tracking-wider uppercase flex items-center gap-2 animate-bounce">
                            <span>Haz clic en una celda para evaluar</span>
                        </div>
                        <div className="w-0 h-0 border-l-[8px] border-l-transparent border-t-[10px] border-t-(--attention) border-r-[8px] border-r-transparent animate-bounce"></div>
                    </motion.div>
                )}
                {step === 1 && (
                    <motion.div 
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        className="absolute top-[15%] left-[20%] flex items-center gap-2"
                    >
                        <div className="bg-primary text-white px-4 py-2 rounded-xl shadow-2xl font-black text-sm tracking-wider uppercase animate-bounce">
                            Explora los distintos periodos
                        </div>
                        <div className="w-0 h-0 border-t-[8px] border-t-transparent border-l-[10px] border-l-(--primary) border-b-[8px] border-b-transparent animate-bounce"></div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
