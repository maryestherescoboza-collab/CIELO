import { useState } from 'react';
import type { AppState, Actividad, BCKey } from '../../types';
import { COMPETENCIAS_LABEL } from '../../types';
import { TC_Flux } from '../icons/TerraCognitaIcons';

interface NewActivityModalProps {
    show: boolean;
    onClose: () => void;
    onAddActividad: (a: Omit<Actividad, 'id'>) => Promise<any>;
    cursos: AppState['cursos'];
    onSuccess: () => void;
}

import { CieloModal } from '../ui/CieloModal';

export function NewActivityModal({ show, onClose, onAddActividad, cursos, onSuccess }: NewActivityModalProps) {
    const today = new Date().toISOString().split('T')[0];
    const [isSaving, setIsSaving] = useState(false);
    const [form, setForm] = useState({
        nombre: '',
        fecha: today,
        secuenciaId: '',
        bcs: ['BC1'] as BCKey[],
        cursoId: cursos[0]?.id ?? 0
    });

    async function handleCreate() {
        if (!form.nombre.trim() || !form.cursoId || form.bcs.length === 0 || isSaving) return;
        setIsSaving(true);
        try {
            const curso = cursos.find(c => c.id === form.cursoId);
            const result = await onAddActividad({
                nombre: form.nombre,
                fecha: form.fecha,
                cursoId: form.cursoId,
                periodo: curso?.periodo ?? 'P1',
                bcAsignados: form.bcs,
                secuenciaId: form.secuenciaId ? parseInt(form.secuenciaId) : undefined,
                sharedCourseId: curso?.sharedCourseId
            });

            if (result) {
                onSuccess();
                onClose();
                setForm({ nombre: '', fecha: today, secuenciaId: '', bcs: ['BC1'], cursoId: cursos[0]?.id ?? 0 });
            }
        } catch (error) {
            console.error('Error in handleCreate:', error);
        } finally {
            setIsSaving(false);
        }
    }

    const modalFooter = (
        <div className="flex gap-4 w-full">
            <button className="flex-1 h-10 rounded-full text-xs font-bold uppercase tracking-widest bg-white border border-slate-200 text-slate-500 hover:bg-slate-50 hover:border-slate-300 transition-all active:scale-95" onClick={onClose}>Cancelar</button>
            <button 
                className={`flex-1 h-10 rounded-full text-xs font-bold uppercase tracking-widest bg-primary text-white shadow-md shadow-primary/20 hover:bg-primary/90 transition-all active:scale-95 flex items-center justify-center gap-2 ${isSaving ? 'opacity-50 cursor-not-allowed' : ''}`} 
                onClick={handleCreate}
                disabled={isSaving}
            >
                {isSaving ? 'Guardando...' : (
                    <>
                        <span>Programar Actividad</span>
                        <TC_Flux size={14} />
                    </>
                )}
            </button>
        </div>
    );

    return (
        <CieloModal
            isOpen={show}
            onClose={onClose}
            title="Nueva Planificación"
            maxWidth="lg"
            footer={modalFooter}
        >
            <div className="space-y-6">
                    <div className="space-y-2.5">
                        <label className="notion-label">Nombre de la actividad</label>
                        <div className="search-container h-12! rounded-xl!">
                            <input className="text-base font-medium w-full" placeholder="Ej: Análisis Crítico de Textos" value={form.nombre} onChange={e => setForm(p => ({ ...p, nombre: e.target.value }))} />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-2.5">
                            <label className="notion-label">Fecha programada</label>
                            <input type="date" className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm bg-white outline-none focus:border-primary focus:ring-4 focus:ring-primary/5 font-medium transition-all"
                                value={form.fecha} onChange={e => setForm(p => ({ ...p, fecha: e.target.value }))} />
                        </div>
                        <div className="space-y-2.5">
                            <label className="notion-label">Curso destino</label>
                            <div className="relative">
                                <select className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm bg-white outline-none focus:border-primary focus:ring-4 focus:ring-primary/5 font-medium appearance-none transition-all"
                                    value={form.cursoId} onChange={e => setForm(p => ({ ...p, cursoId: Number(e.target.value) }))}>
                                    <option value={0} disabled>Seleccione curso...</option>
                                    {cursos.map(c => <option key={c.id} value={c.id}>{c.grado} {c.seccion} - {c.nombre}</option>)}
                                </select>
                                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                                    <TC_Flux size={14} className="rotate-90" />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <label className="notion-label">Competencias a evaluar</label>
                        <div className="grid grid-cols-1 gap-3">
                            {(Object.keys(COMPETENCIAS_LABEL) as BCKey[]).map(bcId => {
                                const isSelected = form.bcs.includes(bcId);
                                return (
                                    <button key={bcId}
                                        onClick={() => {
                                            setForm(p => ({
                                                ...p,
                                                bcs: isSelected
                                                    ? p.bcs.filter(x => x !== bcId)
                                                    : [...p.bcs, bcId]
                                            }));
                                        }}
                                        className={`
                                             p-4 rounded-2xl border text-left flex items-start gap-4 transition-all
                                             ${isSelected ? `bg-white border-slate-900 shadow-xl ring-1 ring-slate-900` : 'bg-slate-50/50 border-transparent hover:border-slate-200'}
                                         `}>
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${isSelected ? 'bg-slate-900 text-white' : 'bg-slate-200 text-slate-500'} transition-colors`}>
                                            <span className="text-xs font-bold">{bcId}</span>
                                        </div>
                                        <div className="flex-1">
                                            <p className={`text-[13px] font-bold ${isSelected ? 'text-slate-900' : 'text-slate-500'}`}>{COMPETENCIAS_LABEL[bcId]}</p>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>
        </CieloModal>
    );
}
