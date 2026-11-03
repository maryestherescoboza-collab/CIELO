import React from 'react';
import logo from '../assets/logo.png';
import { attemptChunkRecovery, isChunkLoadError } from '../utils/chunkRecovery';

interface ErrorBoundaryProps {
    children: React.ReactNode;
    /**
     * Pantalla propia para errores que NO sean de carga de chunk. Sirve para que
     * el Portal del estudiante no muestre el cartel de "Algo salió mal" de la
     * aplicacion docente. Si no se pasa, se usa el generico de siempre.
     */
    fallback?: React.ReactNode;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, { hasError: boolean, error: Error | null, isChunkError: boolean, recovering: boolean }> {
    constructor(props: ErrorBoundaryProps) {
        super(props);
        this.state = { hasError: false, error: null, isChunkError: false, recovering: false };
    }
    static getDerivedStateFromError(error: Error) { 
        return { 
            hasError: true, 
            error, 
            isChunkError: isChunkLoadError(error) 
        }; 
    }
    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        console.error("[ErrorBoundary] Error caught:", error, errorInfo);
        if (isChunkLoadError(error)) {
            const willRecover = attemptChunkRecovery(error);
            if (willRecover) {
                this.setState({ recovering: true });
            }
        }
    }
    render() {
        if (this.state.recovering) {
            // Recuperación silenciosa: no mostrar UI de error mientras recarga
            return null;
        }

        if (this.state.hasError) {
            if (this.state.isChunkError) {
                // Si llegamos aquí con un error de chunk, es porque la recuperación (reloading) falló o ya se intentó.
                return (
                    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-8 sm:p-6 bg-(--bg-main)">
                        <div className="max-w-md w-full bg-white rounded-2xl sm:rounded-3xl shadow-sm overflow-hidden text-center border border-(--border-unificado) px-6 py-8 sm:px-10 sm:py-10">
                            <div className="flex justify-center mb-6 sm:mb-7">
                                <img
                                    src={logo}
                                    alt="CIELO"
                                    className="h-14 sm:h-16 w-auto object-contain select-none"
                                />
                            </div>

                            <h2 className="text-xl sm:text-2xl font-bold text-(--ink) mb-3.5 tracking-tight">
                                ¡Tenemos algo nuevo para ti!
                            </h2>

                            <p className="text-sm sm:text-base text-(--ink-soft) mb-3.5 leading-relaxed">
                                CIELO se ha actualizado con mejoras para que tu experiencia siga siendo cada vez mejor.
                            </p>

                            <p className="text-sm sm:text-base text-(--ink-soft) mb-6 leading-relaxed">
                                Haz clic en <strong className="font-semibold text-(--ink)">Actualizar CIELO</strong> y continúa trabajando con la nueva versión.
                            </p>

                            <div className="bg-(--linen)/60 rounded-xl px-4 py-3.5 mb-6 border border-(--border-unificado)">
                                <p className="text-(--ink) font-medium text-xs sm:text-sm leading-snug">
                                    Todo lo que has creado está guardado y seguro.
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={() => window.location.reload()}
                                className="w-full py-3.5 px-6 bg-(--ink) hover:bg-[#1f2321] active:scale-[0.99] text-white rounded-xl font-semibold text-sm sm:text-base tracking-wide transition-colors duration-200 cursor-pointer"
                            >
                                Actualizar CIELO
                            </button>
                        </div>
                    </div>
                );
            }

            // Fallback propio de quien lo paso (p.ej. el Portal del estudiante).
            if (this.props.fallback) {
                return this.props.fallback;
            }

            // Fallback genérico para otros errores de React
            return (
                <div className="flex flex-col items-center justify-center p-12 text-center bg-white rounded-3xl border border-(--border-unificado) shadow-sm w-full h-full min-h-75">
                    <h2 className="text-xl font-semibold text-(--ink) mb-3 tracking-tight">Algo salió mal</h2>
                    <p className="text-(--ink-soft) max-w-md mb-8 leading-relaxed">
                        Ocurrió un problema momentáneo al cargar este módulo.
                    </p>
                    <button 
                        onClick={() => window.location.reload()} 
                        className="px-8 py-3 bg-(--ink) hover:bg-black text-white rounded-xl font-medium shadow-md hover:shadow-lg transition-all"
                    >
                        Intentar nuevamente
                    </button>
                </div>
            );
        }
        return this.props.children;
    }
}

