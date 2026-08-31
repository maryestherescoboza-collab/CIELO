import React from 'react';
import { AlertTriangle, Sparkles } from 'lucide-react';
import { attemptChunkRecovery, isChunkLoadError } from '../utils/chunkRecovery';

export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean, error: Error | null, isChunkError: boolean, recovering: boolean }> {
    constructor(props: { children: React.ReactNode }) {
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
                    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-(--bg-main)">
                        <div className="max-w-md w-full bg-white rounded-4xl shadow-xl overflow-hidden text-center relative border border-(--border-unificado)">
                            <div className="h-32 bg-linear-to-r from-(--french-blue) to-(--olive-branch) flex items-center justify-center">
                                <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center text-white ring-4 ring-white/30 shadow-lg">
                                    <Sparkles size={32} strokeWidth={2.5} />
                                </div>
                            </div>
                            <div className="p-10">
                                <h2 className="text-2xl font-bold text-(--ink) mb-4 tracking-tight">¡Tenemos algo nuevo para ti!</h2>
                                <p className="text-(--ink-soft) mb-6 leading-relaxed">
                                    CIELO se ha actualizado con mejoras para que tu experiencia siga siendo cada vez mejor.
                                </p>
                                <p className="text-(--ink-soft) mb-8 leading-relaxed">
                                    Haz clic en <strong>Actualizar CIELO</strong> y continúa trabajando con la nueva versión.
                                </p>
                                
                                <div className="bg-(--linen) rounded-xl p-4 mb-8 border border-(--border-unificado)">
                                    <p className="text-(--ink) font-semibold text-sm">
                                        Todo lo que has creado está guardado y seguro.
                                    </p>
                                </div>
                    
                                <button 
                                    onClick={() => window.location.reload()} 
                                    className="w-full py-4 bg-(--ink) hover:bg-black text-white rounded-xl font-bold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1"
                                >
                                    Actualizar CIELO
                                </button>
                            </div>
                        </div>
                    </div>
                );
            }

            // Fallback genérico para otros errores de React
            return (
                <div className="flex flex-col items-center justify-center p-12 text-center bg-rose-50 rounded-3xl border-2 border-dashed border-rose-200">
                    <div className="w-16 h-16 bg-rose-100 rounded-full flex items-center justify-center mb-4 text-rose-600">
                        <AlertTriangle size={32} />
                    </div>
                    <h2 className="text-xl font-bold text-rose-800">Ups, algo salió mal</h2>
                    <p className="text-rose-600 max-w-md mt-2">Ha ocurrido un error inesperado al renderizar este módulo.</p>
                    {this.state.error && (
                        <div className="mt-4 p-3 bg-rose-100 text-rose-800 text-xs text-left w-full max-w-lg rounded-xl overflow-auto font-mono">
                            {this.state.error.message}
                        </div>
                    )}
                    <button onClick={() => window.location.reload()} className="mt-6 px-6 py-2 bg-rose-600 text-white rounded-xl font-bold hover:scale-105 transition-transform">
                        Recargar Aplicación
                    </button>
                </div>
            );
        }
        return this.props.children;
    }
}

