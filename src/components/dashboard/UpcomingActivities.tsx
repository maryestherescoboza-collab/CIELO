import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { TC_Chronos } from '../icons/TerraCognitaIcons';
import { CieloPill } from '../ui/CieloPill';
import { CieloModal } from '../ui/CieloModal';

interface Event {
    id: string;
    originalId: number | string;
    titulo: string;
    fecha: string;
    tipo: string;
    isActivity: boolean;
    cursoId?: number;
    isMinerd?: boolean;
    fechaFin?: string;
    descripcion?: string;
}

interface UpcomingActivitiesProps {
    events: Event[];
}

function parseLocalDate(dateStr: string): Date {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
        return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    }
    return new Date(dateStr);
}

function formatTypeDisplay(tipo: string): string {
    const types: Record<string, string> = {
        academico: 'Académico',
        evaluacion: 'Evaluación',
        administrativo: 'Administrativo',
        planificacion: 'Planificación',
        feriado: 'Feriado',
        receso: 'Receso',
        institucional: 'Institucional',
        conmemoracion: 'Conmemoración',
        otro: 'Otro'
    };
    return types[tipo] || tipo;
}

function formatDateShort(dateStr: string): string {
    const d = parseLocalDate(dateStr);
    const months = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
    return `${String(d.getDate()).padStart(2, '0')} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

export function UpcomingActivities({ events }: UpcomingActivitiesProps) {
    const navigate = useNavigate();
    const [selectedMinerdEvent, setSelectedMinerdEvent] = useState<Event | null>(null);

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
                            evaluacion: 'bg-attention/15 text-attention border-attention/35 shadow-sm',
                            reunion: 'bg-warning/15 text-warning border-warning/35 shadow-sm',
                            actividad: 'bg-primary/15 text-primary border-primary/35 shadow-sm',
                            otro: 'bg-[#EAE4DA] text-[#2E3330] border-slate-300'
                        };

                        if (e.isMinerd) {
                            const localDate = parseLocalDate(e.fecha);
                            return (
                                <div key={e.id}
                                    className="flex items-center gap-5 p-4 rounded-[20px] border border-[#537BAC]/40 bg-[#F4F8FC] shadow-sm paper-card-interactive group cursor-pointer"
                                    onClick={() => setSelectedMinerdEvent(e)}
                                >
                                    <div className="w-12 h-12 rounded-2xl flex flex-col items-center justify-center shrink-0 border border-[#537BAC]/30 bg-[#E8F0F8] text-[#537BAC] font-notion-title transition-transform group-hover:scale-110">
                                        <span className="text-base font-black leading-none">{localDate.getDate()}</span>
                                        <span className="text-xs font-black uppercase tracking-tighter mt-1">{localDate.toLocaleString('default', { month: 'short' })}</span>
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-[14px] font-extrabold text-[#2E3330] leading-snug group-hover:text-[#537BAC] transition-colors truncate">{e.titulo}</p>
                                        <p className="text-[11px] font-bold text-slate-500 mt-1">
                                            {e.fechaFin && e.fechaFin !== e.fecha
                                                ? `${formatDateShort(e.fecha)} — ${formatDateShort(e.fechaFin)}`
                                                : formatDateShort(e.fecha)}
                                        </p>
                                        <div className="flex items-center gap-2 mt-2">
                                            <span className="text-[9px] font-black uppercase tracking-wider text-[#537BAC] bg-[#E8F0F8] px-2 py-0.5 rounded-full border border-[#537BAC]/20">
                                                MINERD
                                            </span>
                                            <span className="text-slate-350 text-[10px]">•</span>
                                            <span className="text-slate-500 text-[11px] font-semibold">
                                                {formatTypeDisplay(e.tipo)}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            );
                        }

                        return (
                            <div key={e.id}
                                className={`flex items-center gap-5 p-4 rounded-[20px] border paper-card-interactive group cursor-pointer ${e.isActivity ? 'border-primary/35 bg-white/95 shadow-sm' : 'border-slate-200 bg-white/95 shadow-sm'}`}
                                onClick={() => {
                                    if (e.isActivity && e.cursoId !== undefined) {
                                        navigate(`/curso-detalle/${e.cursoId}`);
                                    }
                                }}
                            >
                                <div className={`w-12 h-12 rounded-2xl flex flex-col items-center justify-center shrink-0 border ${typeStyles[e.tipo as keyof typeof typeStyles] || typeStyles.otro} font-notion-title transition-transform group-hover:scale-110`}>
                                    <span className="text-base font-black leading-none">{new Date(e.fecha).getDate()}</span>
                                    <span className="text-xs font-black uppercase tracking-tighter mt-1">{new Date(e.fecha).toLocaleString('default', { month: 'short' })}</span>
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="text-[14px] font-extrabold text-[#2E3330] truncate leading-snug group-hover:text-primary transition-colors">{e.titulo}</p>
                                    <div className="flex items-center gap-2 mt-2">
                                        {(() => {
                                            const pillVariants: Record<string, any> = {
                                                evaluacion: 'orange',
                                                reunion: 'warning',
                                                actividad: 'info',
                                                otro: 'terracotta'
                                            };
                                            return (
                                                <CieloPill variant={pillVariants[e.tipo] || 'neutral'} uppercase className="text-[10px] h-6 px-2">
                                                    {e.tipo}
                                                </CieloPill>
                                            );
                                        })()}
                                        {e.isActivity && <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {selectedMinerdEvent && (
                <CieloModal
                    isOpen={!!selectedMinerdEvent}
                    onClose={() => setSelectedMinerdEvent(null)}
                    title="Detalle del Evento Oficial"
                    subtitle="MINERD"
                    maxWidth="md"
                >
                    <div className="space-y-4">
                        <div>
                            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Título</h4>
                            <p className="text-sm font-extrabold text-[#2E3330] mt-1">{selectedMinerdEvent.titulo}</p>
                        </div>
                        <div>
                            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Fecha / Rango</h4>
                            <p className="text-sm font-medium text-[#2E3330] mt-1">
                                {selectedMinerdEvent.fechaFin && selectedMinerdEvent.fechaFin !== selectedMinerdEvent.fecha
                                    ? `${formatDateShort(selectedMinerdEvent.fecha)} — ${formatDateShort(selectedMinerdEvent.fechaFin)}`
                                    : formatDateShort(selectedMinerdEvent.fecha)}
                            </p>
                        </div>
                        <div>
                            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Tipo</h4>
                            <p className="text-sm font-medium text-[#2E3330] mt-1">{formatTypeDisplay(selectedMinerdEvent.tipo)}</p>
                        </div>
                        {selectedMinerdEvent.descripcion && (
                            <div>
                                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Descripción</h4>
                                <p className="text-sm font-medium text-slate-600 mt-1 leading-relaxed">{selectedMinerdEvent.descripcion}</p>
                            </div>
                        )}
                        <div className="flex justify-end pt-4 border-t border-slate-100">
                            <button
                                onClick={() => setSelectedMinerdEvent(null)}
                                className="px-5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-black uppercase tracking-widest rounded-full transition-colors cursor-pointer"
                            >
                                Cerrar
                            </button>
                        </div>
                    </div>
                </CieloModal>
            )}
        </div>
    );
}
