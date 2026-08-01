import React from 'react';
import { Search, Bell } from 'lucide-react';
import logo from '../../assets/logo.png';
import type { SearchResults } from '../../types';

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
    return (
        <header className="app-header">
            <div className="flex items-center gap-4">
                <img src={logo} alt="Noether Logo" className="app-logo w-24 h-24" />
                <div className="hidden sm:block">
                    <p className="text-[10px] font-black uppercase tracking-widest text-(--ink-soft) opacity-40">Portafolio Docente</p>
                    <h1 className="text-lg font-black text-(--ink) leading-tight">CIELO</h1>
                </div>
            </div>

            <div className="search-container flex-1 mx-3 md:mx-6 max-w-md hidden md:flex bg-white border border-(--line) hover:border-emerald-200 transition-colors relative">
                <Search size={16} className="text-emerald-700" />
                <input
                    type="text"
                    className="bg-transparent border-none outline-none text-sm font-bold text-(--ink) w-full"
                    placeholder="Buscar estudiante, curso, actividad..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                />

                {searchResults && (
                    <div className="absolute top-full left-0 w-full mt-2 bg-white rounded-2xl shadow-xl border border-slate-100 z-50 p-2 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                        {searchResults.estudiantes.length > 0 && (
                            <div className="p-2">
                                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1 px-1">Estudiantes</p>
                                <div className="space-y-1">
                                    {searchResults.estudiantes.map((e) => (
                                        <button 
                                            key={e.id} 
                                            onClick={() => onSelectSearchResult('estudiante', e.id)}
                                            className="w-full flex items-center gap-3 p-2 hover:bg-slate-50 rounded-xl transition-all group"
                                        >
                                            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-xs font-black text-slate-400 border border-slate-200">
                                                {e.nombre[0]}
                                            </div>
                                            <div className="text-left">
                                                <p className="text-sm font-bold text-slate-800 group-hover:text-emerald-700">{e.nombre} {e.apellido}</p>
                                                <p className="text-[10px] font-medium text-slate-400">Ver Expediente Académico</p>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {searchResults.cursos.length > 0 && (
                            <div className="p-2 border-t border-slate-50">
                                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1 px-1">Cursos</p>
                                <div className="space-y-1">
                                    {searchResults.cursos.map((c) => (
                                        <button 
                                            key={c.id} 
                                            onClick={() => onSelectSearchResult('curso', c.id)}
                                            className="w-full flex items-center gap-3 p-2 hover:bg-slate-50 rounded-xl transition-all group"
                                        >
                                            <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
                                                <Search size={14} />
                                            </div>
                                            <div className="text-left">
                                                <p className="text-sm font-bold text-slate-800 group-hover:text-emerald-700">{c.nombre}</p>
                                                <p className="text-[10px] font-medium text-slate-400 uppercase tracking-tighter">{c.asignatura}</p>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {searchResults.actividades.length > 0 && (
                            <div className="p-2 border-t border-slate-50">
                                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1 px-1">Evaluaciones</p>
                                <div className="space-y-1">
                                    {searchResults.actividades.map((a) => (
                                        <button 
                                            key={a.id} 
                                            onClick={() => onSelectSearchResult('actividad', a.id)}
                                            className="w-full flex items-center gap-3 p-2 hover:bg-slate-50 rounded-xl transition-all group"
                                        >
                                            <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
                                                <Bell size={14} />
                                            </div>
                                            <div className="text-left">
                                                <p className="text-sm font-bold text-slate-800 group-hover:text-emerald-700">{a.nombre}</p>
                                                <p className="text-[10px] font-medium text-slate-400">{a.fecha}</p>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {searchResults.estudiantes.length === 0 && searchResults.cursos.length === 0 && searchResults.actividades.length === 0 && (
                            <div className="p-8 text-center text-slate-400">
                                <p className="text-sm font-medium">No se encontraron resultados para esta búsqueda</p>
                            </div>
                        )}
                    </div>
                )}
            </div>

            <div className="flex items-center gap-1 md:gap-3">

                <button className="btn-ghost relative" onClick={() => setShowNotifs(prev => !prev)} aria-label="Ver pendientes">
                    <Bell size={18} />
                    {hasUnread && (
                        <span className="absolute top-2 right-2 w-2 h-2 bg-rose-500 rounded-full border-2 border-white"></span>
                    )}
                </button>

                <div className="h-8 w-px bg-slate-200 mx-1 hidden sm:block"></div>

                <div className="flex items-center gap-3 cursor-pointer group px-2 py-1 rounded-lg hover:bg-emerald-50 transition-colors" onClick={onOpenSettings}>
                    <div className="text-right hidden sm:block">
                        <p className="text-[10px] font-black text-(--ink-soft) uppercase tracking-widest opacity-40 m-0">Docente Conectado</p>
                        <p className="text-sm font-black text-emerald-700 m-0 leading-tight">{docenteNombre}</p>
                    </div>
                    <div className="w-10 h-10 rounded-full border-2 border-white shadow-sm overflow-hidden bg-slate-100 ring-1 ring-slate-200">
                        <img
                            src={avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(docenteNombre)}&background=f1f5f9&color=0f172a&bold=true&size=128`}
                            alt="avatar"
                            className="w-full h-full object-cover"
                        />
                    </div>
                </div>
            </div>
        </header>
    );
};

export default Header;
