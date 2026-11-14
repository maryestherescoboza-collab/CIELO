import { useEffect } from 'react';
import { ActividadesPorCursoSection } from '../../components/planificacion/ActividadesPorCursoSection';
import { useSupabaseData } from '../../hooks/useSupabaseData';

export default function ActividadesIndex() {
    const periodos = ['P1', 'P2', 'P3', 'P4'];
    const { loadActividadesData, contextReady } = useSupabaseData(true);

    useEffect(() => {
        if (contextReady) {
            loadActividadesData();
        }
    }, [contextReady, loadActividadesData]);

    return (
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 max-w-[clamp(64rem,92vw,110rem)] mx-auto w-full px-[clamp(1rem,3vw,3rem)] py-[clamp(1.25rem,2.5vw,2.5rem)] flex-1 flex flex-col">
            <div className="mb-[clamp(1.25rem,2vw,2rem)]">
                <h1 className="text-[clamp(1.75rem,2.5vw,2.25rem)] font-black text-(--ink) tracking-tight">Actividades</h1>
                <p className="text-(--ink-soft) mt-2 text-sm md:text-base font-medium max-w-2xl">
                    Biblioteca de actividades organizadas por período.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-[clamp(1rem,1.5vw,1.5rem)]">
                {periodos.map(periodo => {
                    return (
                        <div key={periodo} className="flex flex-col">
                            <h2 className="text-xs font-black text-(--ink) uppercase tracking-widest mb-4 border-b border-(--border-soft) pb-2 flex justify-between items-end">
                                <span>{periodo === 'P1' ? 'Primer' : periodo === 'P2' ? 'Segundo' : periodo === 'P3' ? 'Tercer' : 'Cuarto'} periodo</span>
                            </h2>
                            
                            <ActividadesPorCursoSection periodo={periodo} hideTitle />
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
