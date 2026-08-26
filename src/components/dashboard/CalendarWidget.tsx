import { useState } from 'react';
import type { AppState } from '../../types';
import { TC_Flux } from '../icons/TerraCognitaIcons';
import { useAppStore } from '../../store/appStore';

interface CalendarWidgetProps {
    eventos: AppState['eventos'];
    actividades: any[];
    tareas?: AppState['tareas'];
    onSelectDate: (d: string | null) => void;
}

function parseLocalDate(dateStr: string): Date {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
        return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    }
    return new Date(dateStr);
}

const isDateInRange = (dateStr: string, startStr: string, endStr: string) => {
    return dateStr >= startStr && dateStr <= endStr;
};

const getDaysDuration = (startStr: string, endStr: string): number => {
    const start = parseLocalDate(startStr);
    const end = parseLocalDate(endStr);
    const diff = Math.round((end.getTime() - start.getTime()) / (1000 * 3600 * 24));
    return diff + 1;
};

export function CalendarWidget({ actividades = [], onSelectDate }: CalendarWidgetProps) {
    const today = new Date();
    const [viewDate, setViewDate] = useState(today);
    const [selectedDate, setSelectedDate] = useState<string | null>(null);

    const { state, session } = useAppStore();

    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    const dayNames = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const offset = firstDay === 0 ? 6 : firstDay - 1;

    const prevMonth = () => setViewDate(new Date(year, month - 1, 1));
    const nextMonth = () => setViewDate(new Date(year, month + 1, 1));

    // Build flat days list for grid view
    const totalDays: ({ dateStr: string | null; dayNum: number | null } | null)[] = [];
    for (let i = 0; i < offset; i++) {
        totalDays.push(null);
    }
    for (let i = 1; i <= daysInMonth; i++) {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
        totalDays.push({ dateStr, dayNum: i });
    }
    while (totalDays.length % 7 !== 0) {
        totalDays.push(null);
    }

    return (
        <div className="terra-calendar-root relative select-none">
            {/* Header controls */}
            <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest font-notion-title">{monthNames[month]} {year}</span>
                <div className="flex gap-1">
                    <button className="h-7 w-7 flex items-center justify-center rounded-lg hover:bg-slate-100 transition-colors text-slate-500 hover:text-slate-800" onClick={prevMonth}>
                        <TC_Flux size={14} className="rotate-180" />
                    </button>
                    <button className="h-7 w-7 flex items-center justify-center rounded-lg hover:bg-slate-100 transition-colors text-slate-500 hover:text-slate-800" onClick={nextMonth}>
                        <TC_Flux size={14} />
                    </button>
                </div>
            </div>

            {/* Flat Grid (Zero Gap) */}
            <div className="grid grid-cols-7 gap-0 border border-slate-150 rounded-2xl overflow-hidden bg-white shadow-sm">
                {dayNames.map((d, i) => (
                    <div key={i} className="text-center py-2.5 text-[10px] font-black text-slate-500 uppercase tracking-wider bg-slate-50/50 border-b border-slate-100">{d}</div>
                ))}
                {totalDays.map((dayObj, idx) => {
                    if (!dayObj || !dayObj.dateStr) {
                        return <div key={`empty-${idx}`} className="bg-slate-50/20 aspect-square w-full" />;
                    }

                    const dateStr = dayObj.dateStr;
                    const colIndex = idx % 7;

                    const isToday = dateStr === today.toISOString().split('T')[0];
                    const isSelected = selectedDate === dateStr;

                    const dayRecords = state.registrosAnecdoticos?.filter(r => r.fecha === dateStr && r.profileId === session?.user?.id) || [];
                    const hasRecord = dayRecords.length > 0;

                    // Filter MINERD events active on this date
                    const minerdEvents = (state.calendarioMinerd || []).filter(e => 
                        e.fechaInicio && e.fechaFin && isDateInRange(dateStr, e.fechaInicio, e.fechaFin)
                    );

                    // Check ranges classifications
                    const activeShortRanges = minerdEvents.filter(e => {
                        const dur = getDaysDuration(e.fechaInicio!, e.fechaFin!);
                        return dur >= 2 && dur <= 4;
                    });
                    const hasShortRange = activeShortRanges.length > 0;

                    const hasStart = minerdEvents.some(e => e.fechaInicio === dateStr);
                    const hasEnd = minerdEvents.some(e => e.fechaFin === dateStr);
                    const hasSingleDay = minerdEvents.some(e => e.fechaInicio === e.fechaFin);

                    // Compute background band styling (only for short ranges of 2-4 days)
                    let bandBgClass = '';
                    let roundingClass = 'rounded-none';

                    if (hasShortRange) {
                        bandBgClass = 'bg-[#E8F0F8]';

                        const anyShortStart = activeShortRanges.some(e => e.fechaInicio === dateStr);
                        const anyShortEnd = activeShortRanges.some(e => e.fechaFin === dateStr);

                        let roundLeft = false;
                        let roundRight = false;

                        if (anyShortStart) {
                            roundLeft = true;
                        } else if (colIndex === 0) {
                            roundLeft = false;
                        } else {
                            const yesterday = new Date(parseLocalDate(dateStr).getTime() - 86400000).toISOString().split('T')[0];
                            const prevActiveShort = activeShortRanges.some(e => isDateInRange(yesterday, e.fechaInicio || '', e.fechaFin || ''));
                            roundLeft = !prevActiveShort;
                        }

                        if (anyShortEnd) {
                            roundRight = true;
                        } else if (colIndex === 6) {
                            roundRight = false;
                        } else {
                            const tomorrow = new Date(parseLocalDate(dateStr).getTime() + 86400000).toISOString().split('T')[0];
                            const nextActiveShort = activeShortRanges.some(e => isDateInRange(tomorrow, e.fechaInicio || '', e.fechaFin || ''));
                            roundRight = !nextActiveShort;
                        }

                        roundingClass = roundLeft && roundRight 
                            ? 'rounded-full' 
                            : roundLeft 
                                ? 'rounded-l-full' 
                                : roundRight 
                                    ? 'rounded-r-full' 
                                    : 'rounded-none';
                    }

                    // Compute day number highlight (circle)
                    let circleClass = 'text-slate-700 font-medium';
                    if (hasStart || hasEnd) {
                        circleClass = 'bg-[#537BAC] text-white font-black rounded-full shadow-sm';
                    } else if (hasSingleDay) {
                        circleClass = 'bg-[#E8F0F8] text-[#537BAC] font-bold rounded-full';
                    } else if (isToday) {
                        circleClass = 'bg-primary text-white font-black rounded-full shadow-sm';
                    }

                    const dayActividadesCount = actividades.filter(a => a.fecha === dateStr).length;

                    return (
                        <button
                            key={dateStr}
                            onClick={() => {
                                const newDate = selectedDate === dateStr ? null : dateStr;
                                setSelectedDate(newDate);
                                onSelectDate(newDate);
                            }}
                            className={`
                                aspect-square w-full flex flex-col items-center justify-center relative transition-colors text-center select-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:z-10 outline-none group
                                ${bandBgClass}
                                ${roundingClass}
                                ${isSelected && !hasShortRange ? 'bg-primary/10' : ''}
                                ${isSelected ? 'ring-2 ring-primary/40 z-10' : 'hover:bg-slate-50/50'}
                            `}
                        >
                            {hasRecord && (
                                <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-warning shadow-sm z-20" />
                            )}
                            
                            <span className={`w-7 h-7 flex items-center justify-center text-xs transition-transform group-hover:scale-105 ${circleClass}`}>
                                {dayObj.dayNum}
                            </span>

                            {dayActividadesCount > 0 && (
                                <div className="flex gap-0.5 mt-0.5 justify-center h-1 items-center">
                                    {Array.from({ length: Math.min(3, dayActividadesCount) }).map((_, idx) => (
                                        <span key={idx} className="w-1 h-1 rounded-full bg-primary" />
                                    ))}
                                </div>
                            )}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
