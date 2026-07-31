import React from 'react';
import { Home, BookOpen, TrendingUp, AlertTriangle, Calendar, Users, ClipboardList, SquareCheck, User, X } from 'lucide-react';
import type { Screen } from '../../types';

interface BottomNavProps {
    currentScreen: Screen;
    onNavigate: (s: Screen) => void;
}

const NAV_ITEMS: { label: string; screen: Screen; icon: React.ReactNode; isClose?: boolean }[] = [
    { label: 'Inicio', screen: 'inicio', icon: <Home size={18} /> },
    { label: 'Dashboard', screen: 'dashboard', icon: <TrendingUp size={18} /> },
    { label: 'Cursos', screen: 'cursos', icon: <BookOpen size={18} /> },
    { label: 'Incidencias', screen: 'incidencias', icon: <AlertTriangle size={18} /> },
    { label: 'Planificación', screen: 'planificacion', icon: <Calendar size={18} /> },
    { label: 'Comunidad', screen: 'comunidad', icon: <Users size={18} /> },
    { label: 'Rúbrica', screen: 'rubrica', icon: <ClipboardList size={18} /> },
    { label: 'Cotejo', screen: 'cotejo', icon: <SquareCheck size={18} /> },
    { label: 'Estudiante', screen: 'estudiante', icon: <User size={18} /> },
    { label: 'Cerrar', screen: 'inicio', icon: <X size={18} />, isClose: true },
];

const BottomNav: React.FC<BottomNavProps> = ({ currentScreen, onNavigate }) => {
    return (
        <nav className="app-bottom-nav">
            {NAV_ITEMS.map(item => {
                const isActive = currentScreen === item.screen && !item.isClose;
                const isComunidad = item.screen === 'comunidad';
                
                if (isComunidad) {
                    return (
                        <button 
                            key={item.label} 
                            onClick={() => onNavigate(item.screen)} 
                            className={`flex flex-col items-center justify-center gap-1.5 px-8 py-2 rounded-[1.25rem] transition-all ${isActive ? 'bg-[#FDE2E2] scale-105' : 'text-slate-400 opacity-60 hover:opacity-100'}`}
                        >
                            <div className={`${isActive ? 'text-[#991B1B]' : ''}`}>
                                {item.icon}
                            </div>
                            <span className={`text-[9px] font-black uppercase tracking-widest ${isActive ? 'text-[#991B1B]' : ''}`}>{item.label}</span>
                        </button>
                    );
                }

                return (
                    <button key={item.label} onClick={() => onNavigate(item.screen)} className={`teacher-nav-item ${isActive ? 'active' : ''} group`}>
                        <div className={`p-2.5 rounded-xl transition-all ${isActive ? 'bg-slate-900 text-white shadow-lg shadow-slate-900/20' : 'text-slate-400 group-hover:bg-slate-50 group-hover:text-slate-600'}`}>
                            {item.icon}
                        </div>
                        <span className={`text-[10px] font-black uppercase tracking-widest ${isActive ? 'text-slate-900' : 'text-slate-400 opacity-60'}`}>{item.label}</span>
                    </button>
                );
            })}
        </nav>
    );
};

export default BottomNav;
