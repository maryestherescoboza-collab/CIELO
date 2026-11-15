import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Bell, HelpCircle } from 'lucide-react';
import logo from '../../assets/logo.png';
import type { SearchResults } from '../../types';
import { PresentationToggle } from '../PresentationToggle';
import { usePresentation } from '../../contexts/PresentationContext';
import { UserAvatar } from '../ui/UserAvatar';
import { CentroTutorialesModal } from '../tutorials/CentroTutorialesModal';

interface HeaderProps {
    darkMode: boolean;
    setDarkMode: (val: boolean) => void;
    searchQuery: string;
    setSearchQuery: (val: string) => void;
    searchResults: SearchResults | null;
    onSelectSearchResult: (type: 'estudiante' | 'curso' | 'actividad', id: number) => void;
    setShowNotifs: (val: boolean | ((prev: boolean) => boolean)) => void;
    hasUnread: boolean;
    docenteNombre: string;
    avatarUrl: string;
    onOpenSettings?: () => void;
}

const Header: React.FC<HeaderProps> = ({
    searchQuery, setSearchQuery,
    searchResults, onSelectSearchResult,
    setShowNotifs, hasUnread,
    docenteNombre, avatarUrl,
    onOpenSettings
}) => {
    const navigate = useNavigate();
    const { isPresenting, togglePresentation } = usePresentation();
    const [showTutorialModal, setShowTutorialModal] = useState(false);
    return (
        <header className="flex items-center justify-between px-4 pb-2 pt-[calc(8px+env(safe-area-inset-top))] bg-white border-b border-(--border-soft) sticky top-0 z-40 transition-all">
            <div className="flex items-center">
                <img src={logo} alt="CIELO Logo" className="h-10 w-auto object-contain shrink-0" />
                <div className="hidden lg:flex items-center gap-1.5 ml-2">
                    <p className="text-xs font-black uppercase tracking-widest text-(--ink-soft)">Portafolio Docente</p>
                    <span className="text-[9px] font-bold text-slate-500 bg-slate-100 border border-slate-200/50 px-1.5 py-0.5 rounded-full select-none capitalize tracking-normal leading-none">Beta</span>
                </div>
            </div>

            <div className="hidden lg:flex flex-1 mx-4 max-w-md">
                <div className="flex-1 w-full flex items-center gap-2 px-4.5 min-h-9 bg-white border border-(--border-soft) rounded-full hover:border-(--primary) transition-colors relative artisan-pill">
                    <Search size={14} className="text-(--ink-soft)" />
                    <input
                        type="text"
                        className="bg-transparent border-none outline-none text-xs font-bold text-(--ink) placeholder:text-(--ink-soft) w-full"
                        placeholder="Buscar estudiante, curso, actividad..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                    />

                    {searchResults && (
                        <div className="absolute top-full left-0 w-full mt-2 bg-white rounded-2xl shadow-md border border-(--border-soft) z-50 p-2 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                            {searchResults.estudiantes.length > 0 && (
                                <div className="p-2">
                                    <p className="text-xs font-black uppercase text-(--ink-soft) tracking-widest mb-1 px-1">Estudiantes</p>
                                    <div className="space-y-1">
                                        {searchResults.estudiantes.map((e) => (
                                            <button 
                                                key={e.id} 
                                                onClick={() => onSelectSearchResult('estudiante', e.id)}
                                                className="w-full flex items-center gap-2.5 p-2 hover:bg-(--linen)/50 rounded-xl transition-all group"
                                            >
                                                <div className="w-7 h-7 rounded-full bg-(--linen) flex items-center justify-center text-xs font-black text-(--ink-soft) border border-(--border-soft)">
                                                    {e.nombre[0]}
                                                </div>
                                                <div className="text-left">
                                                    <p className="text-xs font-bold text-(--ink) group-hover:text-(--primary)">{e.nombre} {e.apellido}</p>
                                                    <p className="text-xs font-medium text-(--ink-soft)">Ver Expediente</p>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {searchResults.cursos.length > 0 && (
                                <div className="p-2 border-t border-(--border-soft)">
                                    <p className="text-xs font-black uppercase text-(--ink-soft) tracking-widest mb-1 px-1">Cursos</p>
                                    <div className="space-y-1">
                                        {searchResults.cursos.map((c) => (
                                            <button 
                                                key={c.id} 
                                                onClick={() => onSelectSearchResult('curso', c.id)}
                                                className="w-full flex items-center gap-2.5 p-2 hover:bg-(--linen)/50 rounded-xl transition-all group"
                                            >
                                                <div className="w-7 h-7 rounded-lg bg-(--linen) flex items-center justify-center text-(--primary) border border-(--border-soft)">
                                                    <Search size={12} />
                                                </div>
                                                <div className="text-left">
                                                    <p className="text-xs font-bold text-(--ink) group-hover:text-(--primary)">{c.nombre}</p>
                                                    <p className="text-xs font-medium text-(--ink-soft) uppercase tracking-tighter">{c.asignatura}</p>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {searchResults.actividades.length > 0 && (
                                <div className="p-2 border-t border-(--border-soft)">
                                    <p className="text-xs font-black uppercase text-(--ink-soft) tracking-widest mb-1 px-1">Evaluaciones</p>
                                    <div className="space-y-1">
                                        {searchResults.actividades.map((a) => (
                                            <button 
                                                key={a.id} 
                                                onClick={() => onSelectSearchResult('actividad', a.id)}
                                                className="w-full flex items-center gap-2.5 p-2 hover:bg-(--linen)/50 rounded-xl transition-all group"
                                            >
                                                <div className="w-7 h-7 rounded-lg bg-(--linen) flex items-center justify-center text-(--attention) border border-(--border-soft)">
                                                    <Bell size={12} />
                                                </div>
                                                <div className="text-left">
                                                    <p className="text-xs font-bold text-(--ink) group-hover:text-(--primary)">{a.nombre}</p>
                                                    <p className="text-xs font-medium text-(--ink-soft)">{a.fecha}</p>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {searchResults.estudiantes.length === 0 && searchResults.cursos.length === 0 && searchResults.actividades.length === 0 && (
                                <div className="p-6 text-center text-(--ink-soft)">
                                    <p className="text-xs font-bold">No se encontraron resultados</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            <div className="flex items-center gap-2">
                <PresentationToggle checked={isPresenting} onChange={() => { void togglePresentation(); }} />
                <button 
                    id="btn-alertas-header"
                    data-guide="btn-alertas"
                    className="relative flex items-center justify-center gap-1.5 rounded-full bg-[#FFFFFF] border border-(--border-soft) text-(--ink-soft) hover:bg-(--linen)/55 hover:border-(--primary) transition-all px-4.5 py-2 min-h-9 font-semibold text-xs tracking-[0.08em] artisan-pill shrink-0" 
                    onClick={() => setShowNotifs(prev => !prev)} 
                    aria-label="Ver pendientes"
                >
                    <Bell size={14} className="shrink-0" />
                    <span className="hidden lg:inline shrink-0">Alertas</span>
                    {hasUnread && (
                        <span className="absolute top-1.5 right-2 flex h-2.5 w-2.5 items-center justify-center pointer-events-none">
                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-400 opacity-75"></span>
                            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-rose-600 border border-white animate-pulse"></span>
                        </span>
                    )}
                </button>

                {/* Botón Centro de Tutoriales */}
                <div className="relative hidden lg:block">
                    <button 
                        id="btn-tutorial"
                        className="relative flex items-center justify-center gap-1.5 rounded-full bg-[#FFFFFF] border border-(--border-soft) text-(--ink-soft) hover:bg-(--linen)/55 hover:border-(--primary) transition-all px-4.5 py-2 min-h-9 font-semibold text-xs tracking-[0.08em] artisan-pill shrink-0 cursor-pointer" 
                        onClick={() => setShowTutorialModal(true)}
                        aria-label="Ver centro de microlecciones y tutoriales"
                    >
                        <HelpCircle size={14} />
                        <span>Tutorial</span>
                    </button>
                    
                    <CentroTutorialesModal
                        isOpen={showTutorialModal}
                        onClose={() => setShowTutorialModal(false)}
                    />
                </div>

                {/* Botón Guías */}
                <button 
                    id="btn-guias"
                    className="relative hidden lg:flex items-center justify-center gap-1.5 rounded-full bg-[#FFFFFF] border border-(--border-soft) text-(--ink-soft) hover:bg-(--linen)/55 hover:border-(--primary) transition-all px-4.5 py-2 min-h-9 font-semibold text-xs tracking-[0.08em] artisan-pill shrink-0 cursor-pointer" 
                    onClick={() => navigate('/guias')}
                    aria-label="Ver las 23 guías de CIELO"
                >
                    <span>Guías</span>
                </button>

                <div className="h-6 w-px bg-(--border-soft) mx-1 hidden lg:block"></div>

                <div className="hidden lg:block shrink-0">
                    <div className="flex items-center gap-2 cursor-pointer group px-4.5 py-2 min-h-9 rounded-full border border-transparent bg-(--linen) transition-all artisan-pill" onClick={onOpenSettings}>
                        <div className="text-right">
                            <p className="text-xs font-black text-(--ink-soft) uppercase tracking-widest m-0 leading-none">Perfil Docente</p>
                            <p className="text-xs font-black text-(--ink) m-0 leading-tight">{docenteNombre}</p>
                        </div>
                        <UserAvatar src={avatarUrl} name={docenteNombre} className="w-6 h-6 shrink-0" />
                    </div>
                </div>
            </div>
        </header>
    );
}

export default Header;
