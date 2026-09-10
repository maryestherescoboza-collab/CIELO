import React, { useState, useRef, useEffect } from 'react';
import { Home, BookOpen, TrendingUp, AlertTriangle, NotebookPen, Users, ClipboardList, SquareCheck, Stamp, User, X, HelpCircle, MoreHorizontal } from 'lucide-react';
import type { Screen } from '../../types';

const SUPPORT_URL = 'https://docs.google.com/forms/d/e/1FAIpQLSfhlDqJnUXMrxOtz8mkE5NWmMz6E33JgwCyd13dLao2_nDtyA/viewform?usp=preview';

interface BottomNavProps {
    currentScreen: Screen;
    onNavigate: (s: Screen) => void;
}

const NAV_ITEMS: { label: string; screen: Screen; icon: React.ReactNode; isClose?: boolean }[] = [
    { label: 'Inicio', screen: 'inicio', icon: <Home size={18} /> },
    { label: 'Dashboard', screen: 'dashboard', icon: <TrendingUp size={18} /> },
    { label: 'Cursos', screen: 'cursos', icon: <BookOpen size={18} /> },
    { label: 'Incidencias', screen: 'incidencias', icon: <AlertTriangle size={18} /> },
    { label: 'Plan clases', screen: 'plan-de-clases', icon: <NotebookPen size={18} /> },
    { label: 'Comunidad', screen: 'comunidad', icon: <Users size={18} /> },
    { label: 'Rúbrica', screen: 'rubrica', icon: <ClipboardList size={18} /> },
    { label: 'Cotejo', screen: 'cotejo', icon: <SquareCheck size={18} /> },
    { label: 'Sellos', screen: 'sellos', icon: <Stamp size={18} /> },
    { label: 'Estudiante', screen: 'estudiante', icon: <User size={18} /> },
    { label: 'Cerrar', screen: 'inicio', icon: <X size={18} />, isClose: true },
];

const MOBILE_PRIMARY = ['Inicio', 'Sellos', 'Rúbrica', 'Cotejo', 'Incidencias', 'Cursos'];

const BottomNav: React.FC<BottomNavProps> = ({ currentScreen, onNavigate }) => {
    const [showMore, setShowMore] = useState(false);
    const moreMenuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (moreMenuRef.current && !moreMenuRef.current.contains(e.target as Node)) {
                setShowMore(false);
            }
        };
        if (showMore) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showMore]);

    return (
        <nav className="app-bottom-nav px-2 lg:px-4 justify-around lg:justify-center">
            {NAV_ITEMS.map(item => {
                const isActive = currentScreen === item.screen && !item.isClose;
                const isPrimary = MOBILE_PRIMARY.includes(item.label);
                
                let btnBg = 'bg-transparent text-(--ink)';
                if (isActive) {
                    btnBg = 'bg-(--primary) text-white shadow-sm';
                } else if (item.label === 'Comunidad') {
                    btnBg = 'hover:bg-(--linen) text-(--ink)';
                }

                return (
                    <button 
                        key={item.label} 
                        id={item.screen === 'cursos' ? 'nav-cursos' : undefined}
                        onClick={() => { onNavigate(item.screen); setShowMore(false); }} 
                        aria-label={item.label}
                        title={item.label}
                        className={`${isPrimary ? 'flex' : 'hidden lg:flex'} shrink-0 flex-col items-center justify-center gap-0.5 px-0 lg:px-3.5 py-1 rounded-full transition-all duration-200 ${btnBg} hover:bg-(--linen)/40 flex-1 lg:flex-none lg:min-w-18 h-10`}
                    >
                        <div className={isActive ? 'text-white' : 'text-(--ink)'}>
                            {item.icon}
                        </div>
                        <span className={`text-[10px] font-bold uppercase tracking-[0.05em] ${isActive ? 'text-white' : 'text-(--ink)'} hidden lg:block`}>{item.label}</span>
                    </button>
                );
            })}

            {/* Acceso global a Soporte (navegación externa, versión PC) */}
            <div className="mx-1 h-8 w-px bg-(--border-soft) shrink-0 hidden lg:block" aria-hidden="true" />
            <a
                href={SUPPORT_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="hidden lg:flex shrink-0 flex-col items-center justify-center gap-0.5 px-3.5 py-1 rounded-full transition-all duration-200 bg-transparent text-(--ink) hover:bg-(--linen)/40 lg:min-w-18 h-10"
                aria-label="Soporte - Formulario oficial de CIELO"
            >
                <div className="text-(--ink)">
                    <HelpCircle size={18} />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-[0.05em] text-(--ink) hidden lg:block">Soporte</span>
            </a>

            {/* Botón "Más" para Móvil/Tablet */}
            <div className="relative flex lg:hidden flex-1 items-center justify-center" ref={moreMenuRef}>
                <button
                    onClick={() => setShowMore(!showMore)}
                    className={`flex flex-col items-center justify-center gap-0.5 px-0 py-1 rounded-full transition-all duration-200 ${showMore ? 'bg-(--linen) text-(--ink)' : 'bg-transparent text-(--ink)'} hover:bg-(--linen)/40 w-full h-10`}
                    aria-label="Más opciones"
                >
                    <MoreHorizontal size={18} />
                </button>
                
                {/* Menú desplegable "Más" */}
                {showMore && (
                    <div className="absolute bottom-12 right-2 bg-white border border-(--border-soft) rounded-2xl shadow-lg p-2 flex flex-col gap-1 z-50 min-w-50 animate-in fade-in slide-in-from-bottom-2">
                        {NAV_ITEMS.filter(item => !MOBILE_PRIMARY.includes(item.label)).map(item => {
                            const isActive = currentScreen === item.screen && !item.isClose;
                            let btnBg = 'bg-transparent text-(--ink)';
                            if (isActive) btnBg = 'bg-(--primary) text-white shadow-sm';
                            
                            return (
                                <button
                                    key={`more-${item.label}`}
                                    onClick={() => { onNavigate(item.screen); setShowMore(false); }}
                                    className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${btnBg} hover:bg-(--linen)/40`}
                                >
                                    <div className={isActive ? 'text-white' : 'text-(--ink-soft)'}>
                                        {item.icon}
                                    </div>
                                    <span className="text-xs font-bold uppercase tracking-wider">{item.label}</span>
                                </button>
                            )
                        })}
                        <div className="h-px bg-(--border-soft) my-1" />
                        <a
                            href={SUPPORT_URL}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-3 px-4 py-3 rounded-xl transition-all bg-transparent text-(--ink) hover:bg-(--linen)/40"
                        >
                            <div className="text-(--ink-soft)">
                                <HelpCircle size={18} />
                            </div>
                            <span className="text-xs font-bold uppercase tracking-wider">Soporte</span>
                        </a>
                    </div>
                )}
            </div>
        </nav>
    );
};

export default BottomNav;
