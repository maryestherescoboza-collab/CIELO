import { useState, useRef, useEffect } from 'react';
import type { Actividad } from '../types';
import { useAppStore } from '../store/appStore';
import { 
    TC_Archive, 
    TC_Genesis, 
    TC_Flux, 
    TC_Echo
} from '../components/icons/TerraCognitaIcons';
import { CalendarWidget } from '../components/dashboard/CalendarWidget';
import { DashboardStats } from '../components/dashboard/DashboardStats';
import { RiskStudents } from '../components/dashboard/RiskStudents';
import { UpcomingActivities } from '../components/dashboard/UpcomingActivities';
import { NewActivityModal } from '../components/dashboard/NewActivityModal';
import { useDashboardData } from '../hooks/useDashboardData';

interface Props {
    onAddActividad: (a: Omit<Actividad, 'id'>) => Promise<any>;
    docenteNombre: string;
    onUpdateInstituto: (nombre: string) => void;
    currentCourseRole?: any;
}

export default function Inicio({ onAddActividad, docenteNombre, onUpdateInstituto, currentCourseRole }: Props) {
    const state = useAppStore(s => s.state);
    const [selectedCourseId, setSelectedCourseId] = useState<number | 'all'>('all');
    const [showModal, setShowModal] = useState(false);
    const [selectedDate, setSelectedDate] = useState<string | null>(null);
    const [saved, setSaved] = useState(false);
    const [isEditingInstituto, setIsEditingInstituto] = useState(false);
    const [institutoTemp, setInstitutoTemp] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isSelectOpen, setIsSelectOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const timer = setTimeout(() => setIsLoading(false), 700);
        return () => clearTimeout(timer);
    }, []);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsSelectOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const {
        totalEstudiantes,
        actividadesEvaluadas,
        totalCursos,
        avgGeneral,
        enRiesgo,
        getUpcomingEvents
    } = useDashboardData(state, selectedCourseId);

    const proximosEventosMerged = getUpcomingEvents(selectedDate);

    const handleNewActivitySuccess = () => {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
    };

    return (
        <div className="flex flex-1 min-h-screen bg-artisan-main">
            <div className="flex-1 px-6 py-6 md:px-12 scroll-smooth scrollbar-hide">
                {/* Refined Welcome Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 mb-8">
                    <div>
                        <h1 className="text-3xl font-black text-[#2E3330] tracking-tight mb-2 font-notion-title">
                            Saludos, <span className="text-[#ADC762]">{docenteNombre.split(' ')[0]}</span>
                        </h1>
                        <div className="flex items-center gap-4">
                            <div className={`flex items-center gap-2 bg-[#EAE4DA]/60 px-3 py-1.5 rounded-full border border-slate-200 transition-all ${currentCourseRole?.rol !== 'co-docente' ? 'group cursor-pointer hover:border-slate-350' : 'cursor-default'}`}>
                                <TC_Archive size={12} className="text-[#ADC762] transition-colors" />
                                {isEditingInstituto && currentCourseRole?.rol !== 'co-docente' ? (
                                    <input
                                        autoFocus
                                        className="bg-transparent border-none outline-none focus-visible:ring-2 focus-visible:ring-turf-green-base/50 rounded-md text-slate-700 font-bold text-xs w-40 focus:ring-0 uppercase tracking-widest px-1 -ml-1"
                                        value={institutoTemp}
                                        onChange={e => setInstitutoTemp(e.target.value)}
                                        onBlur={() => { setIsEditingInstituto(false); onUpdateInstituto(institutoTemp); }}
                                        onKeyDown={e => { if (e.key === 'Enter') { setIsEditingInstituto(false); onUpdateInstituto(institutoTemp); } }}
                                    />
                                ) : (
                                    <span onClick={() => { 
                                        if (currentCourseRole?.rol !== 'co-docente') {
                                            setInstitutoTemp(state.instituto || 'Instituto Central'); 
                                            setIsEditingInstituto(true); 
                                        }
                                    }} className={`text-[11px] font-black text-slate-600 uppercase tracking-widest transition-colors ${currentCourseRole?.rol !== 'co-docente' ? 'hover:text-slate-800' : ''}`}>
                                        {state.instituto || 'Instituto Central'}
                                    </span>
                                )}
                            </div>
                            <div className="h-1.5 w-1.5 rounded-full bg-slate-400"></div>
                            <span className="text-[11px] font-black text-slate-500 uppercase tracking-[0.2em]">Portafolio del Docente</span>
                        </div>
                    </div>
                    <div className="flex flex-col sm:flex-row items-center gap-4">
                        <div className="relative group" ref={dropdownRef}>
                            <button
                                onClick={() => setIsSelectOpen(!isSelectOpen)}
                                className="flex items-center justify-between min-w-60 px-5 rounded-full border border-slate-200 text-[#2E3330] text-xs font-semibold tracking-wider shadow-sm outline-none focus-visible:border-[#ADC762] focus-visible:ring-2 focus-visible:ring-[#ADC762]/20 cursor-pointer artisan-pill artisan-btn-neutral"
                            >
                                <span className="truncate pr-4">
                                    {selectedCourseId === 'all' ? 'Global (Todos)' : (() => {
                                        const c = state.cursos.find(c => c.id === selectedCourseId);
                                        return c ? `${c.grado} ${c.seccion} - ${c.nombre}` : 'Global (Todos)';
                                    })()}
                                </span>
                                <TC_Flux size={12} className={`text-[#2E3330]/60 transition-transform duration-200 ${isSelectOpen ? '-rotate-90 text-[#ADC762]' : 'rotate-90 group-hover:text-[#ADC762]'}`} />
                            </button>
                            {isSelectOpen && (
                                <div className="absolute top-[calc(100%+8px)] left-0 w-full bg-white border border-slate-200 rounded-[16px] shadow-md z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150 origin-top">
                                    <div className="max-h-75 overflow-y-auto py-2 scrollbar-hide">
                                        <button
                                            onClick={() => { setSelectedCourseId('all'); setIsSelectOpen(false); }}
                                            className={`w-full text-left px-6 py-3.5 text-xs font-black uppercase tracking-widest transition-colors ${selectedCourseId === 'all' ? 'bg-[#BFC9A6] text-[#2E3330]' : 'text-[#2E3330]/70 hover:bg-[#EAE4DA]'}`}
                                        >
                                            Global (Todos)
                                        </button>
                                        {state.cursos.map(c => (
                                            <button
                                                key={c.id}
                                                onClick={() => { setSelectedCourseId(c.id); setIsSelectOpen(false); }}
                                                className={`w-full text-left px-6 py-3.5 text-xs font-black uppercase tracking-widest transition-colors ${selectedCourseId === c.id ? 'bg-[#BFC9A6] text-[#2E3330]' : 'text-[#2E3330]/70 hover:bg-[#EAE4DA]'}`}
                                            >
                                                {c.grado} {c.seccion} - {c.nombre}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        <button
                            className="px-5 rounded-full bg-[#BFC9A6] text-[#2E3330] text-xs font-semibold tracking-wider shadow-sm active:scale-95 outline-none focus-visible:ring-2 focus-visible:ring-[#ADC762]/20 focus-visible:ring-offset-2 group flex items-center gap-2 artisan-pill"
                            onClick={() => setShowModal(true)}
                        >
                            <TC_Genesis size={16} className="group-hover:rotate-180 transition-transform duration-700" />
                            <span>Nueva Actividad</span>
                        </button>
                    </div>
                </div>

                <div className="mb-12 opacity-40">
                    <svg width="100%" height="20" viewBox="0 0 800 20" preserveAspectRatio="none">
                        <path d="M0 10 Q 100 5, 200 12 T 400 10 T 600 8 T 800 10" stroke="currentColor" fill="none" strokeWidth="1" strokeDasharray="5,5" className="text-slate-500" />
                    </svg>
                </div>

                {isLoading ? (
                    <>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
                            {[1, 2, 3, 4].map(i => (
                                <div key={i} className="min-h-35 rounded-[16px] bg-slate-200/40 animate-pulse border border-slate-200" />
                            ))}
                        </div>
                        <div className="h-100 w-full rounded-[24px] bg-slate-200/40 animate-pulse border border-slate-200" />
                    </>
                ) : (
                    <>
                        <DashboardStats 
                            totalEstudiantes={totalEstudiantes}
                            actividadesEvaluadas={actividadesEvaluadas}
                            avgGeneral={avgGeneral}
                            totalCursos={totalCursos}
                        />
                        <RiskStudents 
                            enRiesgo={enRiesgo}
                            incidencias={state.incidencias}
                            calificaciones={state.calificaciones}
                            actividades={state.actividades}
                            cursos={state.cursos}
                        />
                    </>
                )}
            </div>

            <div className="w-90 shrink-0 artisan-sidebar border-l border-slate-200 overflow-auto hidden lg:block p-6 scrollbar-hide">
                <div className="mb-8">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-[12px] font-black text-[#0F172A] uppercase tracking-[0.25em]">Calendario Escolar</h3>
                        <div className="w-2 h-2 rounded-full bg-turf-green-base animate-pulse shadow-lg shadow-turf-green-base/50"></div>
                    </div>
                    {isLoading ? (
                        <div className="h-70 w-full rounded-[10px] bg-slate-200/40 animate-pulse border border-slate-200" />
                    ) : (
                        <div className="bg-white border border-slate-200 rounded-[10px] p-6 shadow-sm relative overflow-hidden group">
                            <CalendarWidget eventos={state.eventos} actividades={state.actividades} onSelectDate={setSelectedDate} />
                        </div>
                    )}
                </div>

                {isLoading ? (
                    <div className="h-50 w-full rounded-[10px] bg-slate-200/40 animate-pulse border border-slate-200" />
                ) : (
                    <UpcomingActivities events={proximosEventosMerged} />
                )}
            </div>

            {saved && (
                <div className="fixed bottom-24 right-6 bg-slate-900 text-white px-6 py-4 rounded-[24px] shadow-2xl flex items-center gap-4 z-60 animate-in slide-in-from-right-8 duration-500 border border-white/10">
                    <TC_Echo size={20} className="text-emerald-400" />
                    <span className="text-[11px] font-black uppercase tracking-widest">Actividad Vinculada</span>
                </div>
            )}

            <NewActivityModal 
                show={showModal}
                onClose={() => setShowModal(false)}
                onAddActividad={onAddActividad}
                cursos={state.cursos}
                onSuccess={handleNewActivitySuccess}
            />
        </div>
    );
}
