import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { attemptChunkRecovery } from '../utils/chunkRecovery';

export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean, error: Error | null }> {
    constructor(props: { children: React.ReactNode }) {
        super(props);
        this.state = { hasError: false, error: null };
    }
    static getDerivedStateFromError(error: Error) { return { hasError: true, error }; }
    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        console.error("[ErrorBoundary] Error caught:", error, errorInfo);
        // Recuperación automática controlada ante chunks obsoletos por despliegue.
        attemptChunkRecovery(error);
    }
    render() {
        if (this.state.hasError) {
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
