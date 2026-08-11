import React from 'react';
import { Trash2, Users } from 'lucide-react';
import type { AppState } from '../../types';
import { ASIGNATURAS_CATALOGO } from '../../constants/asignaturas';
import { CieloModal } from '../ui/CieloModal';

interface VincularDocentesModalProps {
    show: boolean;
    onClose: () => void;
    state: AppState;
    cursoId: number;
    currentUserId: string;
    onToggleDocenteCurso: (cursoId: number, userId: string, role: any, asigId: string) => void;
    getAsignaturaNombre: (id: string) => string;
}

const VincularDocentesModal: React.FC<VincularDocentesModalProps> = ({
    show,
    onClose,
    state,
    cursoId,
    currentUserId,
    onToggleDocenteCurso,
    getAsignaturaNombre
}) => {
    if (!show) return null;

    return (
        <CieloModal
            isOpen={show}
            onClose={onClose}
            title="Configuración de Carga Académica"
            icon={<Users size={20} />}
            maxWidth="2xl"
        >
            <div className="space-y-4">
                    {ASIGNATURAS_CATALOGO.filter(a => a.id !== 'lengua_espanola').map((asig) => {
                        const linked = state.cursoDocentes.find(cd => cd.cursoId === cursoId && cd.asignatura === asig.id);
                        const profile = linked ? state.perfiles.find(p => p.userId === linked.userId) : null;

                        return (
                            <div key={asig.id} className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition-colors">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white font-black text-lg shadow-lg bg-indigo-500`}>
                                            {asig.nombre[0]}
                                        </div>
                                        <div>
                                            <h4 className="text-slate-900 font-black text-sm uppercase tracking-wide">{asig.nombre}</h4>
                                            <p className="text-slate-400 text-xs font-bold mt-0.5">
                                                {profile ? `Asignado a: ${profile.nombreDocente}` : 'Sin docente asignado'}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        {linked ? (
                                            <button 
                                                onClick={() => onToggleDocenteCurso(cursoId, linked.userId, 'co-docente', asig.id)}
                                                className="px-4 py-2 bg-rose-50 text-rose-600 rounded-full text-xs font-black uppercase border border-rose-100 hover:bg-rose-100 transition-all flex items-center gap-2"
                                            >
                                                <Trash2 size={14} /> Desvincular
                                            </button>
                                        ) : (
                                            <div className="flex items-center gap-2">
                                                <select 
                                                    className="text-xs font-bold border border-slate-200 rounded-full px-4 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/20"
                                                    onChange={(e) => {
                                                        const val = e.target.value;
                                                        if (val) onToggleDocenteCurso(cursoId, val, 'co-docente', asig.id);
                                                    }}
                                                    value=""
                                                >
                                                    <option value="">Seleccionar docente...</option>
                                                    {state.perfiles
                                                        .filter(p => p.userId !== currentUserId)
                                                        .map(p => (
                                                            <option key={p.userId} value={p.userId}>
                                                                {p.nombreDocente} ({getAsignaturaNombre(p.asignatura)})
                                                            </option>
                                                        ))
                                                    }
                                                </select>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
            </div>
        </CieloModal>
    );
};

export default React.memo(VincularDocentesModal);
