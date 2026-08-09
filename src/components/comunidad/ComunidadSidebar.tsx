import React from 'react';
import type { UserProfile } from '../../types';
import type { PresenceUser } from '../../hooks/usePresence';
import { ASIGNATURAS_CATALOGO } from '../../constants/asignaturas';

interface Props {
    topColaboradores: UserProfile[];
    onlineUsers: PresenceUser[];
    onViewProfile: (e: React.MouseEvent, userId?: string) => void;
    filter: string;
    onSetFilter: (filter: string) => void;
}

const getModuleActivity = (module?: string) => {
    switch (module) {
        case 'cursos':
        case 'curso-detalle':
            return 'trabajando en secuencia';
        case 'estudiante':
            return 'revisando progreso';
        case 'comunidad':
            return 'participando en comunidad';
        case 'rubrica':
            return 'trabajando en rúbrica';
        case 'cotejo':
            return 'trabajando en cotejo';
        default:
            return 'activo ahora';
    }
};

export default function ComunidadSidebar({ 
    topColaboradores, onlineUsers, onViewProfile,
    filter, onSetFilter
}: Props) {
    return (
        <aside className="space-y-5">
            {/* Subject Filter Dropdown Card */}
            <section className="bg-[#FDFBF7] rounded-[20px] border border-[rgba(46,51,48,0.08)] p-5 shadow-sm">
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#2E3330] mb-2.5">
                    asignatura
                </h3>
                <div className="relative">
                    <select 
                        value={filter}
                        onChange={(e) => onSetFilter(e.target.value)}
                        className="w-full h-10 pl-4 pr-10 bg-[#FDFBF7] border border-slate-300 rounded-full text-xs font-bold text-[#2E3330] focus:outline-none focus:border-[#ADC762] transition-all appearance-none cursor-pointer lowercase artisan-pill"
                        style={{
                            backgroundImage: `url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3E%3Cpath stroke='%232E3330' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3E%3C/svg%3E")`,
                            backgroundSize: '1.25rem',
                            backgroundPosition: 'right 12px center',
                            backgroundRepeat: 'no-repeat',
                        }}
                    >
                        <option value="todos">todas las asignaturas</option>
                        {ASIGNATURAS_CATALOGO.map(a => (
                            <option key={a.id} value={a.id}>
                                {a.nombre.toLowerCase()}
                            </option>
                        ))}
                    </select>
                </div>
            </section>

            {/* Top Collaborators Card */}
            <section className="bg-[#FDFBF7] rounded-[20px] border border-[rgba(46,51,48,0.08)] p-5 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#2E3330] m-0">
                        top colaboradores
                    </h3>
                </div>
                
                <div className="space-y-4">
                    {topColaboradores.map((profile, index) => (
                        <div 
                            key={profile.userId} 
                            className="flex items-center justify-between group cursor-pointer hover:opacity-90 transition-opacity"
                            onClick={(e) => onViewProfile(e, profile.userId)}
                        >
                            <div className="flex items-center gap-3 min-w-0">
                                <div className="w-5 h-5 rounded-full bg-slate-50 border border-slate-200/60 flex items-center justify-center text-[10px] font-black text-slate-500 shrink-0">
                                    {index + 1}
                                </div>
                                <div className="w-9 h-9 rounded-full overflow-hidden shadow-sm border border-[rgba(46,51,48,0.08)] bg-white p-0.5 shrink-0">
                                    {profile.avatarUrl ? (
                                        <img src={profile.avatarUrl} alt={profile.nombreDocente} className="w-full h-full object-cover rounded-full" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center bg-slate-50 text-slate-400 text-xs font-bold overflow-hidden rounded-full">
                                            {profile.nombreDocente?.[0]?.toLowerCase()}
                                        </div>
                                    )}
                                </div>
                                <div className="flex flex-col min-w-0">
                                    <span className="text-xs font-bold text-[#2E3330] leading-tight mb-0.5 truncate">
                                        {profile.nombreDocente}
                                    </span>
                                    <span className="text-[9px] font-black uppercase tracking-widest text-[#5F665E] truncate max-w-30">{profile.asignatura?.toLowerCase()}</span>
                                </div>
                            </div>
                            <div className="text-[10px] font-bold text-slate-500 shrink-0">
                                {profile.publicacionesRealizadas || 0} {profile.publicacionesRealizadas === 1 ? 'publicación' : 'publicaciones'}
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* Connected Teachers Card */}
            <section className="bg-[#FDFBF7] rounded-[20px] border border-[rgba(46,51,48,0.08)] p-5 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#2E3330] m-0">
                        docentes conectados
                    </h3>
                </div>

                <div className="space-y-4">
                    {onlineUsers.length > 0 ? (
                        onlineUsers.map((user) => (
                            <div 
                                key={user.userId} 
                                className="flex items-center gap-3 group cursor-pointer hover:opacity-90 transition-opacity"
                                onClick={(e) => onViewProfile(e, user.userId)}
                            >
                                <div className="relative shrink-0">
                                    <div className="w-9 h-9 rounded-full bg-slate-50 flex items-center justify-center overflow-hidden border border-[rgba(46,51,48,0.08)] p-0.5 shadow-sm">
                                        {user.avatarUrl ? (
                                            <img src={user.avatarUrl} alt={user.nombre} className="w-full h-full object-cover rounded-full" />
                                        ) : (
                                            <span className="font-bold text-slate-400 text-xs">{user.nombre?.[0]?.toLowerCase()}</span>
                                        )}
                                    </div>
                                    <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-[#ADC762] border-2 border-white rounded-full"></span>
                                </div>

                                <div className="flex flex-col min-w-0">
                                    <span className="text-xs font-bold text-[#2E3330] truncate leading-tight mb-0.5">{user.nombre}</span>
                                    <span className="text-[9px] font-black uppercase tracking-widest text-[#5F665E] italic truncate">
                                        {getModuleActivity(user.currentModule || '')}
                                    </span>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="text-center py-2">
                            <p className="text-[9px] text-slate-300 font-bold uppercase tracking-widest">sin actividad</p>
                        </div>
                    )}
                </div>
            </section>
        </aside>
    );
}
