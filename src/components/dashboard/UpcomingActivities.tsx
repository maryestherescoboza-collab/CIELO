import { useNavigate } from 'react-router-dom';
import { TC_Chronos } from '../icons/TerraCognitaIcons';

interface Event {
    id: string;
    originalId: number;
    titulo: string;
    fecha: string;
    tipo: string;
    isActivity: boolean;
    cursoId?: number;
}

interface UpcomingActivitiesProps {
    events: Event[];
}

export function UpcomingActivities({ events }: UpcomingActivitiesProps) {
    const navigate = useNavigate();

    return (
        <div className="mb-8">
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-[12px] font-black text-[#2E3330] uppercase tracking-[0.25em]">Actividades próximas</h3>
                <TC_Chronos size={14} className="text-slate-400" />
            </div>
            {events.length === 0 ? (
                <div className="py-10 flex flex-col items-center justify-center bg-white/90 rounded-[20px] border border-dashed border-slate-300 shadow-sm">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest italic">Sin actividades para hoy</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {events.map(e => {
                        const typeStyles = {
                            evaluacion: 'bg-[#EB8847]/15 text-[#EB8847] border-[#EB8847]/35 shadow-sm',
                            reunion: 'bg-[#F5BC5D]/15 text-[#F5BC5D] border-[#F5BC5D]/35 shadow-sm',
                            actividad: 'bg-[#ADC762]/15 text-[#ADC762] border-[#ADC762]/35 shadow-sm',
                            otro: 'bg-[#EAE4DA] text-[#2E3330] border-slate-300'
                        };
                        return (
                            <div key={e.id}
                                className={`flex items-center gap-5 p-4 rounded-[20px] border paper-card-interactive group cursor-pointer ${e.isActivity ? 'border-[#BFC9A6]/35 bg-white/95 shadow-sm' : 'border-slate-200 bg-white/95 shadow-sm'}`}
                                onClick={() => {
                                    if (e.isActivity && e.cursoId !== undefined) {
                                        navigate(`/curso-detalle/${e.cursoId}`);
                                    }
                                }}
                            >
                                <div className={`w-12 h-12 rounded-2xl flex flex-col items-center justify-center shrink-0 border ${typeStyles[e.tipo as keyof typeof typeStyles] || typeStyles.otro} font-notion-title transition-transform group-hover:scale-110`}>
                                    <span className="text-base font-black leading-none">{new Date(e.fecha).getDate()}</span>
                                    <span className="text-[9px] font-black uppercase tracking-tighter mt-1">{new Date(e.fecha).toLocaleString('default', { month: 'short' })}</span>
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="text-[14px] font-extrabold text-[#2E3330] truncate leading-snug group-hover:text-[#ADC762] transition-colors">{e.titulo}</p>
                                    <div className="flex items-center gap-2 mt-1.5">
                                        <span className="text-[9px] font-black uppercase tracking-widest text-[#2E3330]/70">{e.tipo}</span>
                                        {e.isActivity && <span className="w-1.5 h-1.5 rounded-full bg-[#ADC762]"></span>}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
