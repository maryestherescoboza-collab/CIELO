import { X, Hash, Layers, GraduationCap, Clock, ChevronDown, PlusCircle } from 'lucide-react';
import { ASIGNATURAS_CATALOGO } from '../../constants/asignaturas';
import { CieloModal } from '../ui/CieloModal';

interface Props {
    show: boolean;
    onClose: () => void;
    form: any;
    setForm: (f: any) => void;
    isSaving: boolean;
    onConfirm: () => void;
}



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

    const modalFooter = (
        <div className="flex gap-4 w-full">
            <button className="flex-1 h-10 rounded-full text-xs font-bold uppercase tracking-widest bg-white border border-slate-200 text-slate-500 hover:bg-slate-50 hover:border-slate-300 transition-all" onClick={onClose}>Descartar</button>
            <button className="flex-1 h-10 rounded-full text-xs font-bold uppercase tracking-widest bg-slate-900 text-white shadow-md shadow-slate-900/20 transition-all hover:bg-black disabled:opacity-50" disabled={isSaving} onClick={onConfirm}>
                {isSaving ? 'Guardando...' : 'Confirmar Curso'}
            </button>
        </div>
    );

    return (
        <CieloModal
            isOpen={show}
            onClose={onClose}
            title="Nuevo Curso"
            subtitle="Configuración inicial del aula virtual"
            icon={<PlusCircle size={20} />}
            maxWidth="xl"
            footer={modalFooter}
        >
            <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-3">
                            <label className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-2 ml-1">
                                <GraduationCap size={12} /> Grado Escolar
                            </label>
                            <div className="relative">
                                <select
                                    className="w-full appearance-none bg-slate-100 border-2 border-transparent focus:border-primary focus:bg-white rounded-2xl px-5 py-4 text-sm font-bold text-slate-700 outline-none transition-all"
                                    value={form.grado}
                                    onChange={e => setForm((f: any) => ({ ...f, grado: e.target.value }))}
                                >
                                    {['1ro', '2do', '3ro', '4to', '5to', '6to'].map(g => <option key={g}>{g}</option>)}
                                </select>
                                <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400" />
                            </div>
                        </div>

                        <div className="space-y-3">
                            <label className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-2 ml-1">
                                <Hash size={12} /> Sección
                            </label>
                            <input
                                className="w-full bg-slate-100 border-2 border-transparent focus:border-primary focus:bg-white rounded-2xl px-5 py-4 text-sm font-bold text-slate-700 outline-none transition-all uppercase placeholder:text-slate-400"
                                placeholder="A"
                                maxLength={2}
                                value={form.seccion}
                                onChange={e => setForm((f: any) => ({ ...f, seccion: e.target.value.toUpperCase() }))}
                            />
                        </div>
                    </div>

                    <div className="space-y-3">
                        <label className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-2 ml-1">
                            <Layers size={12} /> Asignatura
                        </label>
                        <div className="relative">
                            <select
                                className="w-full appearance-none bg-slate-100 border-2 border-transparent focus:border-primary focus:bg-white rounded-2xl px-5 py-4 text-sm font-bold text-slate-700 outline-none transition-all"
                                value={form.asignatura}
                                onChange={e => setForm((f: any) => ({ ...f, asignatura: e.target.value }))}
                            >
                                {ASIGNATURAS_CATALOGO.map(a => <option key={a.id} value={a.id}>{a.nombre}</option>)}
                            </select>
                            <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400" />
                        </div>
                    </div>

                    <div className="space-y-4">
                        <label className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-2 ml-1">
                            <Clock size={12} /> Días de clase
                        </label>
                        <div className="flex gap-2 flex-wrap">
                            {['Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sáb'].map(d => (
                                <button key={d} onClick={() => toggleDia(d)}
                                    className={`h-10 rounded-full font-black text-xs uppercase tracking-widest shadow-md transition-all duration-200 hover:-translate-y-0.5 active:scale-95 flex-1 ${form.diasSemana.includes(d) ? 'bg-[#2E3330] text-white border-[#2E3330] shadow-md -translate-y-0.5' : 'bg-white border-slate-100 text-slate-400 hover:border-slate-350'}`}>
                                    {d}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="pt-2">
                        <label className="inline-flex items-center gap-3 cursor-pointer group">
                            <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${form.isTutorOficial ? 'bg-primary border-primary shadow-sm' : 'bg-slate-50 border-slate-200 group-hover:border-slate-300'}`}>
                                {form.isTutorOficial && <X size={14} className="text-white rotate-45" />}
                                <input type="checkbox" className="hidden" checked={form.isTutorOficial} onChange={(e) => setForm((f: any) => ({ ...f, isTutorOficial: e.target.checked }))} />
                            </div>
                            <span className="text-xs font-black text-slate-600 uppercase tracking-widest group-hover:text-slate-900 transition-colors">Soy el Tutor Oficial de este curso</span>
                        </label>
                    </div>
            </div>
        </CieloModal>
    );
}
