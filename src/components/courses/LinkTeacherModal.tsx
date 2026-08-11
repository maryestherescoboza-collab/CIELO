import { Search, Users, UserPlus, BookOpen } from 'lucide-react';
import { getAsignaturaNombre } from '../../constants/asignaturas';
import { CieloModal } from '../ui/CieloModal';
import type { AppState } from '../../types';

interface Props {
    courseId: number | null;
    onClose: () => void;
    state: AppState;
    teacherSearch: string;
    setTeacherSearch: (s: string) => void;
    filteredPerfiles: any[];
    onToggleLink: (courseId: number, userId: string, subject: string) => void;
}

export function LinkTeacherModal({
    courseId,
    onClose,
    state,
    teacherSearch,
    setTeacherSearch,
    filteredPerfiles,
    onToggleLink
}: Props) {
    if (!courseId) return null;

    const copyLink = () => {
        const expires = Date.now() + 7 * 24 * 60 * 60 * 1000; // 7 días de validez
        const url = `${window.location.origin}/?vincular=${courseId}&exp=${expires}`;
        navigator.clipboard.writeText(url);
        alert('Enlace copiado al portapapeles: ' + url);
    };

    return (
        <CieloModal
            isOpen={true}
            onClose={onClose}
            title="Vincular Docentes"
            subtitle="Invita a otros maestros al curso"
            icon={<UserPlus size={20} />}
            maxWidth="lg"
        >
            <div className="space-y-6">
                    <div className="mb-6 p-6 rounded-3xl bg-primary/5 border border-primary/20">
                        <h3 className="text-xs font-black text-primary uppercase tracking-widest mb-2">Compartir Enlace</h3>
                        <p className="text-xs text-slate-600 mb-4 font-medium">Invita a otros maestros directamente enviándoles este enlace de acceso rápido.</p>
                        <button onClick={copyLink} className="w-full py-3 bg-white border border-primary/30 rounded-xl text-primary text-xs font-bold shadow-sm hover:bg-primary hover:text-white transition-all flex items-center justify-center gap-2">
                            <BookOpen size={14} /> Copiar Enlace de Invitación
                        </button>
                    </div>

                    <div className="space-y-4">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                            <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest">Docentes Registrados</h3>
                            <div className="relative">
                                <input
                                    type="text"
                                    placeholder="Buscar por nombre..."
                                    value={teacherSearch}
                                    onChange={(e) => setTeacherSearch(e.target.value)}
                                    className="bg-slate-100 border-none rounded-lg py-1 px-3 text-xs font-bold text-slate-700 w-40 focus:ring-2 focus:ring-slate-900 transition-all outline-none"
                                />
                                <Search size={10} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400" />
                            </div>
                        </div>
                        <div className="space-y-2">
                            {filteredPerfiles.length === 0 ? (
                                <div className="text-center py-10 px-4 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
                                    <Users size={32} className="mx-auto text-slate-300 mb-3" />
                                    <p className="text-sm font-bold text-slate-600">No se encontraron docentes</p>
                                    <p className="text-xs text-slate-400 uppercase tracking-widest mt-1">
                                        {teacherSearch ? `Para la búsqueda: "${teacherSearch}"` : 'en la plataforma'}
                                    </p>
                                </div>
                            ) : (
                                filteredPerfiles.map(p => {
                                    const isLinked = state.cursoDocentes?.some(cd => cd.cursoId === courseId && cd.userId === p.userId);
                                    return (
                                        <div key={p.userId} className="flex items-center justify-between p-4 rounded-2xl border border-slate-100 hover:border-slate-300 bg-slate-50/30 transition-all">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-black shadow-sm" style={{ backgroundColor: p.avatarColor || '#64748b' }}>
                                                    {p.nombreDocente.substring(0, 2).toUpperCase()}
                                                </div>
                                                <div className="max-w-40">
                                                    <p className="text-sm font-bold text-slate-900 truncate">{p.nombreDocente}</p>
                                                    <p className="text-xs font-black uppercase tracking-widest text-slate-400 truncate">
                                                        {getAsignaturaNombre(p.asignatura)} • <span className="text-slate-300 lowercase">{p.institucion || 'Incierto'}</span>
                                                    </p>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => onToggleLink(courseId, p.userId, p.asignatura)}
                                                className={`px-4 py-2 rounded-full text-xs font-black uppercase tracking-widest transition-all ${isLinked
                                                        ? 'bg-red-50 text-red-600 hover:bg-red-100 border border-red-100'
                                                        : 'bg-slate-900 text-white hover:bg-black shadow-sm'
                                                    }`}
                                            >
                                                {isLinked ? 'Eliminar' : 'Vincular'}
                                            </button>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
            </div>
        </CieloModal>
    );
}
