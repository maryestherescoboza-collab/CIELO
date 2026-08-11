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
                
                let btnBg = 'bg-transparent';
                if (isActive) {
                    btnBg = 'bg-primary';
                } else if (item.label === 'Comunidad') {
                    // Let's make Comunidad have the highlight background F5BC5D
                    btnBg = 'hover:bg-[#D4CCBE]';
                }

                return (
                    <button 
                        key={item.label} 
                        id={item.screen === 'cursos' ? 'nav-cursos' : undefined}
                        onClick={() => onNavigate(item.screen)} 
                        className={`flex flex-col items-center justify-center gap-0.5 px-3.5 py-1 rounded-full transition-all duration-200 ${btnBg} hover:bg-slate-100 text-[#2E3330]`}
                        style={{ minWidth: '72px', height: '40px' }}
                    >
                        <div className="text-[#2E3330]">
                            {item.icon}
                        </div>
                        <span className="text-xs font-semibold uppercase tracking-[0.08em] text-[#2E3330]">{item.label}</span>
                    </button>
                );
            })}
        </nav>
    );
};

export default BottomNav;
