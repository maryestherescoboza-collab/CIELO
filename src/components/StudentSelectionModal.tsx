import { useState } from 'react';
import { Users, CheckCircle, Save, Loader2, X } from 'lucide-react';
import type { Estudiante } from '../types';

interface Props {
    availableEstudiantes: Estudiante[];
    onFinalize: (studentIds: number[]) => Promise<void>;
    isActive: boolean;
    onToggle: (active: boolean) => void;
}

export default function StudentSelectionModal({ availableEstudiantes, onFinalize, isActive, onToggle }: Props) {
    const [selectedStudents, setSelectedStudents] = useState<Estudiante[]>([]);
    const [isSaving, setIsSaving] = useState(false);

    // Estudiantes ordenados para determinar nÃºmero de lista (1-N)
    const sortedEsts = [...availableEstudiantes].sort((a, b) => 
        (a.apellido + a.nombre).localeCompare(b.apellido + b.nombre)
    );

    if (!isActive) return null;

    const handleSave = async () => {
        if (selectedStudents.length === 0) return;
        setIsSaving(true);
        try {
            await onFinalize(selectedStudents.map(s => s.id));
            setSelectedStudents([]);
            onToggle(false);
        } catch (error) {
            console.error('Error in multi-student evaluation finalize:', error);
        } finally {
            setIsSaving(false);
        }
    };

    const handleSelectAll = () => {
        if (selectedStudents.length === sortedEsts.length) {
            setSelectedStudents([]);
        } else {
            setSelectedStudents(sortedEsts);
        }
    };

    return (
        <div className="fixed inset-0 z-100 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-(--paper) w-full max-w-2xl rounded-none shadow-2xl border-2 border-(--ink) overflow-hidden flex flex-col max-h-[90vh]">
                <div className="p-8 border-b border-(--line) flex items-center justify-between bg-(--paper-soft)">
                    <div className="flex items-center gap-4">
                        <div className="p-3 rounded-2xl bg-(--ink) text-white">
                            <Users size={24} />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-(--ink)">EvaluaciÃ³n MÃºltiple</h2>
                            <p className="text-xs font-bold text-(--ink-soft) opacity-60 uppercase tracking-widest">
                                Seleccione los estudiantes a evaluar simultÃ¡neamente
                            </p>
                        </div>
                    </div>
                    <button 
                        onClick={() => onToggle(false)}
                        className="p-2 hover:bg-(--paper-deep) rounded-xl transition-all"
                    >
                        <X size={24} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-8 space-y-8">
                    <div className="bg-(--paper-deep) p-5 rounded-2xl border border-(--line)">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-xs font-black uppercase tracking-widest text-(--ink) opacity-60">Listado del Curso ({sortedEsts.length} estudiantes)</h3>
                            <button 
                                onClick={handleSelectAll}
                                className="text-[10px] font-black uppercase tracking-widest text-(--accent-orange) hover:underline"
                            >
                                {selectedStudents.length === sortedEsts.length ? 'Desmarcar Todos' : 'Seleccionar Todos'}
                                ({selectedStudents.length})
                            </button>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                            {sortedEsts.map((est, i) => {
                                const isSel = selectedStudents.some(s => s.id === est.id);
                                return (
                                    <button
                                        key={est.id}
                                        onClick={() => {
                                            if (isSel) setSelectedStudents(prev => prev.filter(s => s.id !== est.id));
                                            else setSelectedStudents(prev => [...prev, est]);
                                        }}
                                        className={`flex items-center gap-2.5 p-2.5 rounded-xl border-2 transition-all text-left ${
                                            isSel 
                                                ? 'bg-(--ink) border-(--ink) text-white shadow-lg scale-[1.02]' 
                                                : 'bg-white border-(--line) text-(--ink) hover:border-(--ink-soft)'
                                        }`}
                                    >
                                        <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 ${isSel ? 'bg-white/20' : 'bg-(--paper-soft)'}`}>
                                            {i + 1}
                                        </span>
                                        <span className="text-[11px] font-bold truncate flex-1">{est.nombre} {est.apellido}</span>
                                        {isSel && <CheckCircle size={12} className="text-white" />}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                        {selectedStudents.map(est => {
                            const listNum = sortedEsts.findIndex(s => s.id === est.id) + 1;
                            return (
                                <div key={est.id} className="relative group bg-white border border-(--line) rounded-2xl p-4 flex flex-col items-center gap-3 shadow-md animate-in zoom-in-95 duration-200">
                                    <button 
                                        onClick={() => setSelectedStudents(prev => prev.filter(s => s.id !== est.id))}
                                        className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-all z-20"
                                    >
                                        <X size={12} />
                                    </button>
                                    <div className="w-12 h-12 rounded-full flex items-center justify-center text-lg font-black text-white relative" style={{ background: est.avatarColor }}>
                                        {est.nombre?.[0] || '?'}
                                        <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-white rounded-full flex items-center justify-center text-[10px] font-black text-(--ink) shadow-sm border border-(--line)">
                                            {listNum}
                                        </div>
                                    </div>
                                    <div className="text-center overflow-hidden w-full">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-(--ink-soft) opacity-40">Estudiante</p>
                                        <p className="text-xs font-bold truncate">{est.nombre} {est.apellido}</p>
                                    </div>
                                    <CheckCircle size={16} className="text-green-500 absolute bottom-3 right-3 opacity-40" />
                                </div>
                            );
                        })}
                        
                        {selectedStudents.length === 0 && (
                            <div className="col-span-full py-16 flex flex-col items-center justify-center border-2 border-dashed border-(--line) rounded-4xl opacity-30 bg-(--paper-soft)">
                                <Users size={48} className="text-(--ink-soft)" />
                                <p className="mt-4 text-sm font-black uppercase tracking-[0.2em]">Seleccione estudiantes para evaluar</p>
                                <p className="text-[10px] font-medium mt-1">Haga clic en los nombres del listado superior</p>
                            </div>
                        )}
                    </div>
                </div>

                <div className="p-8 bg-(--paper-soft) border-t border-(--line) flex gap-4">
                    <button
                        onClick={() => onToggle(false)}
                        className="flex-1 flex items-center justify-center h-14 rounded-2xl text-sm font-black uppercase tracking-[0.2em] bg-white border-2 border-(--line) text-(--ink-soft) hover:bg-(--paper-deep) transition-all"
                    >
                        Cancelar
                    </button>
                    
                    <button
                        disabled={selectedStudents.length === 0 || isSaving}
                        onClick={handleSave}
                        className={`flex-1 flex items-center justify-center gap-3 h-14 rounded-2xl text-sm font-black uppercase tracking-[0.2em] transition-all shadow-xl ${
                            selectedStudents.length === 0 || isSaving
                                ? 'bg-slate-300 opacity-50 cursor-not-allowed'
                                : 'bg-(--accent-orange) text-white hover:scale-[1.02] active:scale-[0.98]'
                        }`}
                    >
                        {isSaving ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />}
                        Confirmar ({selectedStudents.length})
                    </button>
                </div>
            </div>
        </div>
    );
}
