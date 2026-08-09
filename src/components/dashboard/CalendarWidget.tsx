import { useState } from 'react';
import type { AppState, Actividad } from '../../types';
import { TC_Flux } from '../icons/TerraCognitaIcons';
import { useAppStore } from '../../store/appStore';


interface CalendarWidgetProps {
    eventos: AppState['eventos'];
    actividades: Actividad[];
    onSelectDate: (d: string | null) => void;
}

export function CalendarWidget({ eventos, actividades, onSelectDate }: CalendarWidgetProps) {
    const today = new Date();
    const [viewDate, setViewDate] = useState(today);
    const [selectedDate, setSelectedDate] = useState<string | null>(null);
    const [activeDateForDetails, setActiveDateForDetails] = useState<string | null>(null);

    const { state, session } = useAppStore();

    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    const dayNames = ['L', 'M', 'M', 'J', 'V'];
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const offset = firstDay === 0 ? 6 : firstDay - 1;

    const allItems = [
        ...eventos.map(e => ({ id: `e${e.id}`, title: e.titulo, date: e.fecha, type: 'evento', color: 'bg-[#3F3C36]' })),
        ...actividades.map(a => ({ id: `a${a.id}`, title: a.nombre, date: a.fecha, type: 'actividad', color: 'bg-[#7C9672]' }))
    ];

    const prevMonth = () => setViewDate(new Date(year, month - 1, 1));
    const nextMonth = () => setViewDate(new Date(year, month + 1, 1));

    const activeDateRecords = activeDateForDetails 
        ? state.registrosAnecdoticos?.filter(r => r.fecha === activeDateForDetails && r.profileId === session?.user?.id) || []
        : [];

    return (
        <div className="terra-calendar-root relative">
            <div className="flex items-center justify-between mb-4">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest font-notion-title">{monthNames[month]} {year}</span>
                <div className="flex gap-1">
                    <button className="h-7 w-7 flex items-center justify-center rounded-lg hover:bg-slate-100 transition-colors text-slate-500 hover:text-slate-800" onClick={prevMonth}>
                        <TC_Flux size={14} className="rotate-180" />
                    </button>
                    <button className="h-7 w-7 flex items-center justify-center rounded-lg hover:bg-slate-100 transition-colors text-slate-500 hover:text-slate-800" onClick={nextMonth}>
                        <TC_Flux size={14} />
                    </button>
                </div>
            </div>
            <div className="grid grid-cols-7 gap-1 mb-2">
                {dayNames.map((d, i) => (
                    <div key={i} className="text-center text-[10px] font-bold text-slate-600 uppercase tracking-widest">{d}</div>
                ))}
            </div>
            <div className="grid grid-cols-7 gap-1.5">
                {Array.from({ length: offset }).map((_, i) => <div key={`e${i}`} />)}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                    const day = i + 1;
                    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                    const isToday = dateStr === today.toISOString().split('T')[0];
                    const dayItems = allItems.filter(item => item.date === dateStr);
                    const dayRecords = state.registrosAnecdoticos?.filter(r => r.fecha === dateStr && r.profileId === session?.user?.id) || [];
                    const hasRecord = dayRecords.length > 0;

                    return (
                        <button
                            key={day}
                            onClick={() => {
                                const newDate = selectedDate === dateStr ? null : dateStr;
                                setSelectedDate(newDate);
                                onSelectDate(newDate);
                                if (hasRecord) {
                                    setActiveDateForDetails(dateStr);
                                } else {
                                    setActiveDateForDetails(null);
                                }
                            }}
                            className={`
                                aspect-square w-full flex flex-col items-center justify-center rounded-lg text-[11px] font-medium transition-all relative overflow-hidden
                                ${isToday ? 'bg-[#ADC762] text-white shadow-sm z-10' : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900 font-bold'}
                                ${selectedDate === dateStr && !isToday ? 'ring-2 ring-[#BFC9A6] bg-[#BFC9A6]/20 text-[#2E3330] font-bold' : ''}
                            `}
                        >
                            {hasRecord && (
                                <span className="absolute top-1 left-1.5 w-1.5 h-1.5 rounded-full bg-[#D8B55A] shadow-sm z-20" />
                            )}
                            <>
                                <span className="relative z-10">{day}</span>
                                <div className="absolute bottom-1.5 flex gap-0.5 justify-center px-0.5">
                                    {dayItems.slice(0, 3).map((_item, idx) => (
                                        <span key={idx} className={`w-1 h-1 rounded-full ${isToday ? 'bg-white' : 'bg-turf-green-base'}`} />
                                    ))}
                                </div>
                            </>
                        </button>
                    );
                })}
            </div>

            {activeDateForDetails && (
                <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm z-30 rounded-[20px] p-4 flex flex-col items-center justify-center transition-all duration-300">
                    <h4 className="text-white text-xs font-bold mb-3 tracking-wide">Detalle del {activeDateForDetails.split('-')[2]}/{activeDateForDetails.split('-')[1]}</h4>
                    
                    {activeDateRecords.length > 0 ? (
                        <div className="w-full max-h-40 overflow-y-auto scrollbar-hide text-left">
                            <h5 className="text-[9px] font-bold text-slate-300 uppercase tracking-widest mb-1.5">Acontecimientos del día:</h5>
                            {activeDateRecords.map(r => (
                                <div key={r.id} className="mb-2 last:mb-0 p-2 bg-white/5 rounded-lg border border-white/5">
                                    <div className="text-[10px] font-bold text-white mb-0.5">{r.titulo}</div>
                                    <div className="text-[9px] text-slate-300 leading-normal">{r.descripcion}</div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-[11px] text-slate-400 mb-4">No hay acontecimientos registrados para este día.</div>
                    )}

                    <button
                        onClick={() => setActiveDateForDetails(null)}
                        className="mt-4 px-4 py-1.5 bg-white/10 hover:bg-white/20 text-white text-[10px] font-bold rounded-lg transition-colors cursor-pointer"
                    >
                        Cerrar
                    </button>
                </div>
            )}
        </div>
    );
}

