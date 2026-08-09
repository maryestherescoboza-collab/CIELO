import React from 'react';
import { Search, Bell, HelpCircle } from 'lucide-react';
import logo from '../../assets/logo.png';
import type { SearchResults } from '../../types';
import { startGuide } from '../../guides/driverGuides';

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
        <header className="flex items-center justify-between px-4 py-2 bg-[#F9F8F6] border-b border-[rgba(46,51,48,0.08)] sticky top-0 z-40 transition-all">
            <div className="flex items-center gap-2">
                <img src={logo} alt="CIELO Logo" className="w-6 h-6 object-contain" />
                <div className="hidden sm:block">
                    <p className="text-[8px] font-black uppercase tracking-widest text-[#5F665E]">Portafolio Docente</p>
                    <h1 className="text-xs font-black text-[#2E3330] leading-tight">CIELO</h1>
                </div>
            </div>

            <div className="flex-1 mx-4 max-w-md hidden md:flex items-center gap-2 px-[18px] min-h-[36px] bg-white border border-[#ADC762]/35 rounded-full hover:border-[#ADC762] transition-colors relative artisan-pill">
                <Search size={14} className="text-[#5F665E]" />
                <input
                    type="text"
                    className="bg-transparent border-none outline-none text-xs font-bold text-[#2E3330] placeholder:text-[#5F665E] w-full"
                    placeholder="Buscar estudiante, curso, actividad..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                />

                {searchResults && (
                    <div className="absolute top-full left-0 w-full mt-2 bg-white rounded-2xl shadow-xl border border-slate-100 z-50 p-2 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                        {searchResults.estudiantes.length > 0 && (
                            <div className="p-2">
                                <p className="text-[9px] font-black uppercase text-[#5F665E] tracking-widest mb-1 px-1">Estudiantes</p>
                                <div className="space-y-1">
                                    {searchResults.estudiantes.map((e) => (
                                        <button 
                                            key={e.id} 
                                            onClick={() => onSelectSearchResult('estudiante', e.id)}
                                            className="w-full flex items-center gap-2.5 p-2 hover:bg-[#FDFBF7] rounded-xl transition-all group"
                                        >
                                            <div className="w-7 h-7 rounded-full bg-[#EAE4DA] flex items-center justify-center text-[10px] font-black text-[#5F665E] border border-[rgba(46,51,48,0.08)]">
                                                {e.nombre[0]}
                                            </div>
                                            <div className="text-left">
                                                <p className="text-xs font-bold text-[#2E3330] group-hover:text-[#ADC762]">{e.nombre} {e.apellido}</p>
                                                <p className="text-[9px] font-medium text-[#5F665E]">Ver Expediente</p>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {searchResults.cursos.length > 0 && (
                            <div className="p-2 border-t border-[rgba(46,51,48,0.08)]">
                                <p className="text-[9px] font-black uppercase text-[#5F665E] tracking-widest mb-1 px-1">Cursos</p>
                                <div className="space-y-1">
                                    {searchResults.cursos.map((c) => (
                                        <button 
                                            key={c.id} 
                                            onClick={() => onSelectSearchResult('curso', c.id)}
                                            className="w-full flex items-center gap-2.5 p-2 hover:bg-[#FDFBF7] rounded-xl transition-all group"
                                        >
                                            <div className="w-7 h-7 rounded-lg bg-[#EAE4DA]/50 flex items-center justify-center text-[#ADC762]">
                                                <Search size={12} />
                                            </div>
                                            <div className="text-left">
                                                <p className="text-xs font-bold text-[#2E3330] group-hover:text-[#ADC762]">{c.nombre}</p>
                                                <p className="text-[9px] font-medium text-[#5F665E] uppercase tracking-tighter">{c.asignatura}</p>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {searchResults.actividades.length > 0 && (
                            <div className="p-2 border-t border-[rgba(46,51,48,0.08)]">
                                <p className="text-[9px] font-black uppercase text-[#5F665E] tracking-widest mb-1 px-1">Evaluaciones</p>
                                <div className="space-y-1">
                                    {searchResults.actividades.map((a) => (
                                        <button 
                                            key={a.id} 
                                            onClick={() => onSelectSearchResult('actividad', a.id)}
                                            className="w-full flex items-center gap-2.5 p-2 hover:bg-[#FDFBF7] rounded-xl transition-all group"
                                        >
                                            <div className="w-7 h-7 rounded-lg bg-[#EAE4DA]/50 flex items-center justify-center text-[#F5BC5D]">
                                                <Bell size={12} />
                                            </div>
                                            <div className="text-left">
                                                <p className="text-xs font-bold text-[#2E3330] group-hover:text-[#ADC762]">{a.nombre}</p>
                                                <p className="text-[9px] font-medium text-[#5F665E]">{a.fecha}</p>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {searchResults.estudiantes.length === 0 && searchResults.cursos.length === 0 && searchResults.actividades.length === 0 && (
                            <div className="p-6 text-center text-[#5F665E]">
                                <p className="text-xs font-bold">No se encontraron resultados</p>
                            </div>
                        )}
                    </div>
                )}
            </div>

            <div className="flex items-center gap-2">
                <button 
                    className="relative flex items-center justify-center gap-1.5 rounded-full bg-[#FFFFFF] border border-[rgba(122,141,105,0.35)] text-[#5F665E] hover:bg-[#F9F8F6] hover:border-[#ADC762] transition-all px-[18px] py-[8px] min-h-[36px] font-semibold text-[10px] tracking-[0.08em] artisan-pill" 
                    onClick={() => setShowNotifs(prev => !prev)} 
                    aria-label="Ver pendientes"
                >
                    <Bell size={14} />
                    <span className="hidden sm:inline">Alertas</span>
                    {hasUnread && (
                        <span className="absolute top-1.5 right-2 w-2 h-2 bg-[#F5BC5D] rounded-full border border-white"></span>
                    )}
                </button>

                {/* Tutorial Button & Dropdown */}
                <div className="relative" ref={tutorialRef}>
                    <button 
                        id="btn-tutorial"
                        className="relative flex items-center justify-center gap-1.5 rounded-full bg-[#FFFFFF] border border-[rgba(122,141,105,0.35)] text-[#5F665E] hover:bg-[#F9F8F6] hover:border-[#ADC762] transition-all px-[18px] py-[8px] min-h-[36px] font-semibold text-[10px] tracking-[0.08em] artisan-pill" 
                        onClick={() => setShowTutorialMenu(prev => !prev)}
                        aria-label="Ver tutoriales"
                    >
                        <HelpCircle size={14} />
                        <span>Tutorial</span>
                    </button>
                    
                    {showTutorialMenu && (
                        <div className="absolute right-0 mt-2 w-64 rounded-2xl bg-white border border-[rgba(46,51,48,0.08)] shadow-lg py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                            {[
                                { id: 'crear-curso', label: 'Crear un curso' },
                                { id: 'crear-actividades-alumnos', label: 'Crear actividades y agregar alumnos' },
                                { id: 'evaluar-actividad', label: 'Evaluar una actividad' },
                                { id: 'evaluar-rubrica', label: 'Cómo evaluar con rúbrica' },
                                { id: 'evaluar-cotejo', label: 'Cómo evaluar con cotejo' }
                            ].map(item => (
                                <button
                                    key={item.id}
                                    className="w-full text-left px-4 py-2.5 text-[10px] font-black text-[#5F665E] uppercase tracking-[0.08em] hover:bg-[#F9F8F6] hover:text-[#ADC762] transition-all"
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

                <div className="h-6 w-px bg-[rgba(46,51,48,0.08)] mx-1 hidden sm:block"></div>

                <div className="flex items-center gap-2 cursor-pointer group px-[18px] py-[8px] min-h-[36px] rounded-full border border-transparent hover:border-[#ADC762]/35 hover:bg-white transition-all artisan-pill" onClick={onOpenSettings}>
                    <div className="text-right hidden sm:block">
                        <p className="text-[8px] font-black text-[#5F665E] uppercase tracking-widest m-0 leading-none">Perfil Docente</p>
                        <p className="text-[10px] font-black text-[#ADC762] m-0 leading-tight">{docenteNombre}</p>
                    </div>
                    <div className="w-6 h-6 rounded-full border border-[rgba(46,51,48,0.08)] overflow-hidden bg-white">
                        <img
                            src={avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(docenteNombre)}&background=F9F8F6&color=2E3330&bold=true&size=128`}
                            alt="avatar"
                            className="w-full h-full object-cover"
                        />
                    </div>
                </div>
            </div>
        </header>
    );
}

export default Header;
