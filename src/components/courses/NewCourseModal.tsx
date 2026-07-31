import { X, Hash, Layers, GraduationCap, Clock, ChevronDown } from 'lucide-react';
import { ASIGNATURAS_CATALOGO } from '../../constants/asignaturas';

interface Props {
    show: boolean;
    onClose: () => void;
    form: any;
    setForm: (f: any) => void;
    isSaving: boolean;
    onConfirm: () => void;
}

const COLORS = ['#0f172a', '#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#8b5cf6'];

export function NewCourseModal({
    show,
    onClose,
    form,
    setForm,
    isSaving,
    onConfirm
}: Props) {
    if (!show) return null;

    const toggleDia = (d: string) => {
        setForm((f: any) => ({
            ...f,
            diasSemana: f.diasSemana.includes(d)
                ? f.diasSemana.filter((x: string) => x !== d)
                : [...f.diasSemana, d]
        }));
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="w-full max-w-xl bg-white rounded-none shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 border border-(--line)">
                <div className="px-10 py-8 border-b border-(--line) flex items-center justify-between bg-(--paper)">
                    <div>
                        <h2 className="text-2xl font-black text-slate-900 tracking-tight">Nuevo Curso</h2>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mt-1">Configuración inicial del aula virtual</p>
                    </div>
                    <button className="btn-secondary p-2!" onClick={onClose}><X size={20} /></button>
                </div>

                <div className="p-10 space-y-8">
                    <div className="space-y-3">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2 ml-1">
                            <Hash size={12} /> Título del Curso
                        </label>
                        <input
                            className="w-full bg-slate-100 border-2 border-transparent focus:border-emerald-500 focus:bg-white rounded-2xl px-5 py-4 text-sm font-bold text-slate-700 outline-none transition-all placeholder:text-slate-400"
                            placeholder="Ej: 3ro de Secundaria - Sección B"
                            value={form.nombre}
                            onChange={e => setForm((f: any) => ({ ...f, nombre: e.target.value }))}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-3">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2 ml-1">
                                <Layers size={12} /> Asignatura
                            </label>
                            <div className="relative">
                                <select
                                    className="w-full appearance-none bg-slate-100 border-2 border-transparent focus:border-emerald-500 focus:bg-white rounded-2xl px-5 py-4 text-sm font-bold text-slate-700 outline-none transition-all"
                                    value={form.asignatura}
                                    onChange={e => setForm((f: any) => ({ ...f, asignatura: e.target.value }))}
                                >
                                    {ASIGNATURAS_CATALOGO.map(a => <option key={a.id} value={a.id}>{a.nombre}</option>)}
                                </select>
                                <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400" />
                            </div>
                        </div>
                        <div className="space-y-3">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2 ml-1">
                                <GraduationCap size={12} /> Grado Escolar
                            </label>
                            <div className="relative">
                                <select
                                    className="w-full appearance-none bg-slate-100 border-2 border-transparent focus:border-emerald-500 focus:bg-white rounded-2xl px-5 py-4 text-sm font-bold text-slate-700 outline-none transition-all"
                                    value={form.grado}
                                    onChange={e => setForm((f: any) => ({ ...f, grado: e.target.value }))}
                                >
                                    {['1ro', '2do', '3ro', '4to', '5to', '6to'].map(g => <option key={g}>{g}</option>)}
                                </select>
                                <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400" />
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-3">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2 ml-1">
                                <Hash size={12} /> Sección
                            </label>
                            <input
                                className="w-full bg-slate-100 border-2 border-transparent focus:border-emerald-500 focus:bg-white rounded-2xl px-5 py-4 text-sm font-bold text-slate-700 outline-none transition-all uppercase placeholder:text-slate-400"
                                placeholder="A"
                                maxLength={2}
                                value={form.seccion}
                                onChange={e => setForm((f: any) => ({ ...f, seccion: e.target.value.toUpperCase() }))}
                            />
                        </div>
                        <div className="space-y-3">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2 ml-1">
                                <Clock size={12} /> Período Lectivo
                            </label>
                            <div className="relative">
                                <select
                                    className="w-full appearance-none bg-slate-100 border-2 border-transparent focus:border-emerald-500 focus:bg-white rounded-2xl px-5 py-4 text-sm font-bold text-slate-700 outline-none transition-all"
                                    value={form.periodo}
                                    onChange={e => setForm((f: any) => ({ ...f, periodo: e.target.value }))}
                                >
                                    {['P1', 'P2', 'P3', 'P4'].map(p => <option key={p}>{p}</option>)}
                                </select>
                                <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400" />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Frecuencia de Clases</label>
                        <div className="flex gap-2 flex-wrap">
                            {['Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sáb'].map(d => (
                                <button key={d} onClick={() => toggleDia(d)}
                                    className={`px-5 py-3 rounded-xl text-[11px] font-black uppercase tracking-widest border-2 transition-all ${form.diasSemana.includes(d) ? 'bg-slate-900 text-white border-slate-900 shadow-md translate-y-[-2px]' : 'bg-white border-slate-100 text-slate-400 hover:border-slate-300'}`}>
                                    {d}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="pt-2">
                        <label className="inline-flex items-center gap-3 cursor-pointer group">
                            <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${form.isTutorOficial ? 'bg-emerald-500 border-emerald-500 shadow-sm' : 'bg-slate-50 border-slate-200 group-hover:border-slate-300'}`}>
                                {form.isTutorOficial && <X size={14} className="text-white rotate-45" />}
                                <input type="checkbox" className="hidden" checked={form.isTutorOficial} onChange={(e) => setForm((f: any) => ({ ...f, isTutorOficial: e.target.checked }))} />
                            </div>
                            <span className="text-[11px] font-black text-slate-600 uppercase tracking-widest group-hover:text-slate-900 transition-colors">Soy el Tutor Oficial de este curso</span>
                        </label>
                    </div>

                    <div className="space-y-4">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Identidad Visual</label>
                        <div className="grid grid-cols-6 gap-3">
                            {COLORS.map(col => (
                                <button key={col} onClick={() => setForm((f: any) => ({ ...f, color: col }))}
                                    className={`w-full aspect-square rounded-2xl transition-all duration-300 relative group overflow-hidden ${form.color === col ? 'ring-4 ring-emerald-500 ring-offset-2 scale-110 shadow-lg' : 'hover:scale-105 opacity-60 hover:opacity-100'}`}
                                    style={{ background: col }}>
                                    <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="px-10 py-8 bg-slate-50 border-t border-slate-100 flex gap-4">
                    <button className="flex-1 btn-secondary py-4! text-[11px] font-black uppercase tracking-[0.2em]" onClick={onClose}>Descartar</button>
                    <button className="flex-1 btn-primary py-4! text-[11px] font-black uppercase tracking-[0.2em] shadow-xl shadow-emerald-900/10" disabled={isSaving} onClick={onConfirm}>
                        {isSaving ? 'Guardando...' : 'Confirmar Curso'}
                    </button>
                </div>
            </div>
        </div>
    );
}
