import { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
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

import { useSupabaseData } from '../hooks/useSupabaseData';
import { usePremiumAccess } from '../hooks/usePremiumAccess';

interface Props {
    onAddActividad: (a: Omit<Actividad, 'id'>) => Promise<any>;
    docenteNombre: string;
    onUpdateInstituto: (nombre: string) => void;
    currentCourseRole?: any;
}

export default function Inicio({ onAddActividad, docenteNombre, onUpdateInstituto, currentCourseRole }: Props) {
    const state = useAppStore(s => s.state);
    const session = useAppStore(s => s.session);
    const { hasTrial, trialDaysLeft, suscripcionActual } = usePremiumAccess();
    const { loadDashboardData, contextReady } = useSupabaseData(true);
    const [selectedCourseId, setSelectedCourseId] = useState<number | 'all'>('all');
    const [showModal, setShowModal] = useState(false);
    const [selectedDate, setSelectedDate] = useState<string | null>(null);
    const [saved, setSaved] = useState(false);
    const [isEditingInstituto, setIsEditingInstituto] = useState(false);
    const [institutoTemp, setInstitutoTemp] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isSelectOpen, setIsSelectOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    
    const location = useLocation();
    const navigate = useNavigate();
    const [showTrialWelcome, setShowTrialWelcome] = useState(() => {
        return location.state?.freeTrial === true;
    });

    useEffect(() => {
        if (location.state?.freeTrial) {
            navigate(location.pathname, { replace: true, state: {} });
        }
    }, [location, navigate]);

    useEffect(() => {
        if (contextReady) {
            loadDashboardData();
        }
    }, [contextReady, loadDashboardData]);

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
        incidenciasCount,
        totalCursos,
        avgGeneral,
        enRiesgo,
        getUpcomingEvents
    } = useDashboardData(state, selectedCourseId, session?.user?.id, currentCourseRole);

    const proximosEventosMerged = getUpcomingEvents(selectedDate);

    const handleNewActivitySuccess = () => {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
    };

    return (
        <div className="flex flex-1 min-h-screen bg-artisan-main">
            <div className="flex-1 px-6 py-6 md:px-12 scroll-smooth scrollbar-hide">
                {/* Refined Welcome Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                    <div>
                        <h1 className="text-2xl font-black text-[#2E3330] tracking-tight mb-2 font-notion-title flex items-center gap-3">
                            <span>Saludos, <span className="text-primary">{docenteNombre.split(' ')[0]}</span></span>
                            {hasTrial && !suscripcionActual?.estado && (
                                <span className="px-2.5 py-1 bg-amber-100 text-amber-800 text-xs font-bold rounded-md uppercase tracking-wider">
                                    {trialDaysLeft > 0 
                                        ? `Prueba gratuita · ${trialDaysLeft} días restantes` 
                                        : 'Tu prueba gratuita termina hoy'}
                                </span>
                            )}
                        </h1>
                        <div className="flex items-center gap-4">
                            <div className={`flex items-center gap-2 bg-[#EAE4DA]/60 px-3 py-1.5 rounded-full border border-slate-200 transition-all ${currentCourseRole?.rol !== 'co-docente' ? 'group cursor-pointer hover:border-slate-350' : 'cursor-default'}`}>
                                <TC_Archive size={12} className="text-primary transition-colors" />
                                {isEditingInstituto && currentCourseRole?.rol !== 'co-docente' ? (
                                    <input
                                        autoFocus
                                        className="bg-transparent border-none outline-none focus-visible:ring-2 focus-visible:ring-primary/50 rounded-md text-slate-700 font-bold text-xs w-40 focus:ring-0 uppercase tracking-widest px-1 -ml-1"
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
                                    }} className={`text-xs font-black text-slate-600 uppercase tracking-widest transition-colors ${currentCourseRole?.rol !== 'co-docente' ? 'hover:text-slate-800' : ''}`}>
                                        {state.instituto || 'Instituto Central'}
                                    </span>
                                )}
                            </div>
                            <div className="h-1.5 w-1.5 rounded-full bg-slate-400"></div>
                            <span className="text-xs font-black text-slate-500 uppercase tracking-[0.2em]">Portafolio del Docente</span>
                        </div>
                    </div>
                    <div className="flex flex-col sm:flex-row items-center gap-4">
                        <div className="relative group" ref={dropdownRef}>
                            <button
                                onClick={() => setIsSelectOpen(!isSelectOpen)}
                                className="flex items-center justify-between min-w-60 px-5 rounded-full border border-slate-200 text-[#2E3330] text-xs font-semibold tracking-wider shadow-sm outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20 cursor-pointer artisan-pill artisan-btn-neutral"
                            >
                                <span className="truncate pr-4">
                                    {selectedCourseId === 'all' ? 'Global (Todos)' : (() => {
                                        const c = state.cursos.find(c => c.id === selectedCourseId);
                                        return c ? `${c.grado} ${c.seccion} - ${c.nombre}` : 'Global (Todos)';
                                    })()}
                                </span>
                                <TC_Flux size={12} className={`text-[#2E3330]/60 transition-transform duration-200 ${isSelectOpen ? '-rotate-90 text-primary' : 'rotate-90 group-hover:text-primary'}`} />
                            </button>
                            {isSelectOpen && (
                                <div className="absolute top-[calc(100%+8px)] left-0 w-full bg-white border border-slate-200 rounded-[16px] shadow-md z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150 origin-top">
                                    <div className="max-h-75 overflow-y-auto py-2 scrollbar-hide">
                                        <button
                                            onClick={() => { setSelectedCourseId('all'); setIsSelectOpen(false); }}
                                            className={`w-full text-left px-6 py-3.5 text-xs font-black uppercase tracking-widest transition-colors ${selectedCourseId === 'all' ? 'bg-primary text-[#2E3330]' : 'text-[#2E3330]/70 hover:bg-[#EAE4DA]'}`}
                                        >
                                            Global (Todos)
                                        </button>
                                        {state.cursos.map(c => (
                                            <button
                                                key={c.id}
                                                onClick={() => { setSelectedCourseId(c.id); setIsSelectOpen(false); }}
                                                className={`w-full text-left px-6 py-3.5 text-xs font-black uppercase tracking-widest transition-colors ${selectedCourseId === c.id ? 'bg-primary text-[#2E3330]' : 'text-[#2E3330]/70 hover:bg-[#EAE4DA]'}`}
                                            >
                                                {c.grado} {c.seccion} - {c.nombre}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        <button
                            data-guide="btn-nueva-actividad"
                            className="px-5 rounded-full bg-primary text-[#2E3330] text-xs font-semibold tracking-wider shadow-sm active:scale-95 outline-none focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:ring-offset-2 group flex items-center gap-2 artisan-pill"
                            onClick={() => setShowModal(true)}
                        >
                            <TC_Genesis size={16} className="group-hover:rotate-180 transition-transform duration-700" />
                            <span>Nueva Actividad</span>
                        </button>
                    </div>
                </div>

                <div className="mb-8 opacity-40">
                    <svg width="100%" height="20" viewBox="0 0 800 20" preserveAspectRatio="none">
                        <path d="M0 10 Q 100 5, 200 12 T 400 10 T 600 8 T 800 10" stroke="currentColor" fill="none" strokeWidth="1" strokeDasharray="5,5" className="text-slate-500" />
                    </svg>
                </div>

                {isLoading ? (
                    <>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
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
                            incidenciasCount={incidenciasCount}
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
                        <div className="w-2 h-2 rounded-full bg-primary animate-pulse shadow-lg shadow-primary/50"></div>
                    </div>
                    {isLoading ? (
                        <div className="h-70 w-full rounded-[10px] bg-slate-200/40 animate-pulse border border-slate-200" />
                    ) : (
                        <div className="bg-white rounded-[10px] p-6 relative overflow-hidden group">
                            <CalendarWidget eventos={state.eventos} actividades={state.actividades} tareas={state.tareas} onSelectDate={setSelectedDate} />
                            <div className="mt-4 flex justify-end">
                                <button 
                                    onClick={() => navigate('/calendario')}
                                    className="group flex items-center gap-2 text-[#465a38] hover:text-[#2d3a23] transition-all text-[13px] font-black uppercase tracking-widest bg-transparent p-1 mt-2"
                                >
                                    <span>Abrir calendario</span>
                                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="transition-transform duration-300 group-hover:translate-x-1.5">
                                        <path fillRule="evenodd" clipRule="evenodd" d="M12 4C7.58172 4 4 7.58172 4 12C4 16.4183 7.58172 20 12 20C16.4183 20 20 16.4183 20 12C20 7.58172 16.4183 4 12 4ZM2 12C2 6.47715 6.47715 2 12 2C17.5228 2 22 6.47715 22 12C22 17.5228 17.5228 22 12 22C6.47715 22 2 17.5228 2 12ZM11.2929 8.70711C10.9024 8.31658 10.9024 7.68342 11.2929 7.29289C11.6834 6.90237 12.3166 6.90237 12.7071 7.29289L16.7071 11.2929C17.0976 11.6834 17.0976 12.3166 16.7071 12.7071L12.7071 16.7071C12.3166 17.0976 11.6834 17.0976 11.2929 16.7071C10.9024 16.3166 10.9024 15.6834 11.2929 15.2929L13.5858 13H8C7.44772 13 7 12.5523 7 12C7 11.4477 7.44772 11 8 11H13.5858L11.2929 8.70711Z" fill="currentColor"/>
                                    </svg>
                                </button>
                            </div>
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
                    <span className="text-xs font-black uppercase tracking-widest">Actividad Vinculada</span>
                </div>
            )}

            {showTrialWelcome && (
                <div className="fixed inset-0 z-100 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-300">
                    <div className="bg-white rounded-[24px] p-8 max-w-sm w-full shadow-2xl relative overflow-hidden text-center animate-in zoom-in-95 duration-300">
                        <div className="w-16 h-16 bg-[#689C63]/10 rounded-full flex items-center justify-center mx-auto mb-6">
                            <span className="text-[#689C63] text-2xl font-black">15</span>
                        </div>
                        <h3 className="text-xl font-black text-[#2E3330] mb-2 tracking-tight">¡Bienvenido a CIELO!</h3>
                        <p className="text-sm text-slate-500 mb-6 leading-relaxed">
                            Tienes <strong>15 días de acceso completo</strong> a todas las funciones premium.
                            <br /><br />
                            <span className="text-xs bg-slate-100 px-3 py-1.5 rounded-md font-semibold text-slate-600 uppercase tracking-widest">
                                Sin tarjeta de crédito
                            </span>
                        </p>
                        <button 
                            onClick={() => setShowTrialWelcome(false)}
                            className="w-full py-3.5 bg-[#2E3330] hover:bg-black text-white rounded-xl font-bold text-sm tracking-wide transition-all shadow-md hover:shadow-xl active:scale-[0.98]"
                        >
                            Comenzar ahora
                        </button>
                    </div>
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
