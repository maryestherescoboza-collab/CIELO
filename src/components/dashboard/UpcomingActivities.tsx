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
        <div className="mb-12">
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-[11px] font-black text-slate-500 uppercase tracking-[0.25em]">Actividades próximas</h3>
                <TC_Chronos size={16} className="text-slate-400" />
            </div>
            {events.length === 0 ? (
                <div className="py-12 flex flex-col items-center justify-center bg-slate-100/50 rounded-4xl border border-dashed border-slate-200">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest italic">Sin actividades para hoy</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {events.map(e => {
                        const typeStyles = {
                            evaluacion: 'bg-[#CB4834]/10 text-[#CB4834] border-[#CB4834]/20 shadow-lg shadow-[#CB4834]/5',
                            reunion: 'bg-[#D8B55A]/10 text-[#D8B55A] border-[#D8B55A]/20 shadow-lg shadow-[#D8B55A]/5',
                            actividad: 'bg-[#7C9672]/10 text-[#7C9672] border-[#7C9672]/20 shadow-lg shadow-[#7C9672]/5',
                            otro: 'bg-slate-50 text-slate-400 border-slate-200'
                        };
                        return (
                            <div key={e.id}
                                className={`flex items-center gap-5 p-4 rounded-[24px] border transition-all duration-500 hover:bg-white hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-200/50 group cursor-pointer ${e.isActivity ? 'border-turf-green-base/20 bg-turf-green-base/5' : 'border-slate-100 bg-white'}`}
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
                                    <p className="text-[14px] font-bold text-[#1E293B] truncate leading-snug group-hover:text-turf-green-base transition-colors">{e.titulo}</p>
                                    <div className="flex items-center gap-2 mt-1.5">
                                        <span className="text-[9px] font-black uppercase tracking-widest opacity-50 text-slate-500">{e.tipo}</span>
                                        {e.isActivity && <span className="w-1 h-1 rounded-full bg-turf-green-base"></span>}
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
