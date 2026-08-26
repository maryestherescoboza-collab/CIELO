import React from 'react';
import { Search, Bell, HelpCircle } from 'lucide-react';
import logo from '../../assets/logo.png';
import type { SearchResults } from '../../types';
import { startGuide } from '../../guides/driverGuides';
import { PresentationToggle } from '../PresentationToggle';
import { usePresentation } from '../../contexts/PresentationContext';
import { UserAvatar } from '../ui/UserAvatar';

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
    const { isPresenting, togglePresentation } = usePresentation();
    const [showTutorialMenu, setShowTutorialMenu] = React.useState(false);
    const tutorialRef = React.useRef<HTMLDivElement>(null);

    React.useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (tutorialRef.current && !tutorialRef.current.contains(event.target as Node)) {
                setShowTutorialMenu(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);
    return (
        <header className="flex items-center justify-between px-4 py-2 bg-white border-b border-(--border-soft) sticky top-0 z-40 transition-all">
            <div className="flex items-center">
                <img src={logo} alt="CIELO Logo" className="h-10 w-auto object-contain" />
                <div className="hidden sm:flex items-center gap-1.5 ml-2">
                    <p className="text-xs font-black uppercase tracking-widest text-(--ink-soft)">Portafolio Docente</p>
                    <span className="text-[9px] font-bold text-slate-500 bg-slate-100 border border-slate-200/50 px-1.5 py-0.5 rounded-full select-none capitalize tracking-normal leading-none">Beta</span>
                </div>
            </div>

            <div className="flex-1 mx-4 max-w-md hidden md:flex items-center gap-2 px-4.5 min-h-9 bg-white border border-(--border-soft) rounded-full hover:border-(--primary) transition-colors relative artisan-pill">
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

            <div className="flex items-center gap-2">
                <PresentationToggle checked={isPresenting} onChange={() => { void togglePresentation(); }} />
                <button 
                    className="relative flex items-center justify-center gap-1.5 rounded-full bg-[#FFFFFF] border border-(--border-soft) text-(--ink-soft) hover:bg-(--linen)/55 hover:border-(--primary) transition-all px-4.5 py-2 min-h-9 font-semibold text-xs tracking-[0.08em] artisan-pill" 
                    onClick={() => setShowNotifs(prev => !prev)} 
                    aria-label="Ver pendientes"
                >
                    <Bell size={14} />
                    <span className="hidden sm:inline">Alertas</span>
                    {hasUnread && (
                        <span className="absolute top-1.5 right-2 w-2 h-2 bg-(--warning) rounded-full border border-white"></span>
                    )}
                </button>

                {/* Tutorial Button & Dropdown */}
                <div className="relative" ref={tutorialRef}>
                    <button 
                        id="btn-tutorial"
                        className="relative flex items-center justify-center gap-1.5 rounded-full bg-[#FFFFFF] border border-(--border-soft) text-(--ink-soft) hover:bg-(--linen)/55 hover:border-(--primary) transition-all px-4.5 py-2 min-h-9 font-semibold text-xs tracking-[0.08em] artisan-pill" 
                        onClick={() => setShowTutorialMenu(prev => !prev)}
                        aria-label="Ver tutoriales"
                    >
                        <HelpCircle size={14} />
                        <span>Tutorial</span>
                    </button>
                    
                    {showTutorialMenu && (
                        <div className="absolute right-0 mt-2 w-64 rounded-2xl bg-white border border-(--border-soft) shadow-md py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                            {[
                                { id: 'crear-curso', label: 'Crear un curso' },
                                { id: 'crear-actividades-alumnos', label: 'Crear actividades y agregar alumnos' },
                                { id: 'evaluar-actividad', label: 'Evaluar una actividad' },
                                { id: 'evaluar-rubrica', label: 'Cómo evaluar con rúbrica' },
                                { id: 'evaluar-cotejo', label: 'Cómo evaluar con cotejo' },
                                { id: 'crear-plantilla-rubrica', label: 'Crear una plantilla de rúbrica' },
                                { id: 'crear-plantilla-cotejo', label: 'Crear una plantilla de lista de cotejo' }
                            ].map(item => (
                                <button
                                    key={item.id}
                                    className="w-full text-left px-4 py-2.5 text-xs font-black text-(--ink-soft) uppercase tracking-[0.08em] hover:bg-(--linen)/50 hover:text-(--primary) transition-all"
                                    onClick={() => {
                                        setShowTutorialMenu(false);
                                        startGuide(item.id);
                                    }}
                                >
                                    {item.label}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                <div className="h-6 w-px bg-(--border-soft) mx-1 hidden sm:block"></div>

                <div className="flex items-center gap-2 cursor-pointer group px-4.5 py-2 min-h-9 rounded-full border border-transparent bg-(--linen) transition-all artisan-pill" onClick={onOpenSettings}>
                    <div className="text-right hidden sm:block">
                        <p className="text-xs font-black text-(--ink-soft) uppercase tracking-widest m-0 leading-none">Perfil Docente</p>
                        <p className="text-xs font-black text-(--ink) m-0 leading-tight">{docenteNombre}</p>
                    </div>
                    <UserAvatar src={avatarUrl} name={docenteNombre} className="w-6 h-6" />
                </div>
            </div>
        </header>
    );
}

export default Header;
