import { useMemo } from 'react';
import { X, Hash, Layers, GraduationCap, Clock, ChevronDown, PlusCircle, Sparkles, AlertCircle } from 'lucide-react';
import {
    ASIGNATURAS_CATALOGO,
    OPCION_AGREGAR_OPTATIVA,
    crearAsignaturaOptativaId,
    esAsignaturaOptativa,
    getAsignaturaNombre,
    sonMismaAsignatura
} from '../../constants/asignaturas';
import type { Curso, CursoDocente } from '../../types';
import { CieloModal } from '../ui/CieloModal';

interface Props {
    show: boolean;
    onClose: () => void;
    form: any;
    setForm: (f: any) => void;
    isSaving: boolean;
    onConfirm: () => void;
    existingCursos?: Curso[];
    cursoDocentes?: CursoDocente[];
}

export function NewCourseModal({
    show,
    onClose,
    form,
    setForm,
    isSaving,
    onConfirm,
    existingCursos = [],
    cursoDocentes = []
}: Props) {
    // Asignaturas ya registradas en el grado + sección seleccionados
    const asignaturasExistentesEnSeccion = useMemo(() => {
        const grado = String(form.grado || '').trim();
        const seccion = String(form.seccion || '').trim().toUpperCase();
        if (!grado || !seccion) return [];
        const cursosSeccion = existingCursos.filter(
            c => c.grado === grado && String(c.seccion || '').trim().toUpperCase() === seccion
        );
        const idsCursos = new Set(cursosSeccion.map(c => c.id));
        const lista = new Set<string>();
        cursosSeccion.forEach(c => {
            if (c.asignatura) lista.add(c.asignatura);
        });
        cursoDocentes.forEach(cd => {
            if (idsCursos.has(cd.cursoId) && cd.asignatura) {
                lista.add(cd.asignatura);
            }
        });
        return Array.from(lista);
    }, [existingCursos, cursoDocentes, form.grado, form.seccion]);

    // Asignaturas optativas personalizadas que el docente o centro ya creó previamente (para reutilizarlas rápido si desea)
    const optativasPrevias = useMemo(() => {
        const map = new Map<string, string>();
        existingCursos.forEach(c => {
            if (esAsignaturaOptativa(c.asignatura)) {
                const id = crearAsignaturaOptativaId(getAsignaturaNombre(c.asignatura));
                if (id) map.set(id.toLowerCase(), id);
            }
        });
        cursoDocentes.forEach(cd => {
            if (esAsignaturaOptativa(cd.asignatura)) {
                const id = crearAsignaturaOptativaId(getAsignaturaNombre(cd.asignatura));
                if (id) map.set(id.toLowerCase(), id);
            }
        });
        return Array.from(map.values());
    }, [existingCursos, cursoDocentes]);

    const nombreOptativaLimpio = String(form.asignaturaOptativaNombre || '').replace(/\s+/g, ' ').trim();

    // Validación en tiempo real para asignatura optativa o duplicada en el mismo curso
    const validacionAsignatura = useMemo(() => {
        if (form.esOptativa) {
            if (!nombreOptativaLimpio) {
                return {
                    valido: false,
                    mensaje: null // No mostrar error agresivo mientras está vacío antes de escribir
                };
            }
            const coincideOficial = ASIGNATURAS_CATALOGO.find(a =>
                sonMismaAsignatura(a.nombre, nombreOptativaLimpio) ||
                a.nombre.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase() ===
                nombreOptativaLimpio.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
            );
            if (coincideOficial) {
                return {
                    valido: false,
                    mensaje: `«${coincideOficial.nombre}» ya forma parte del catálogo oficial. Selecciónala directamente en la lista.`
                };
            }
            const idOptativa = crearAsignaturaOptativaId(nombreOptativaLimpio);
            const duplicadaEnCurso = asignaturasExistentesEnSeccion.some(asig =>
                sonMismaAsignatura(asig, idOptativa)
            );
            if (duplicadaEnCurso) {
                return {
                    valido: false,
                    mensaje: `La asignatura optativa «${nombreOptativaLimpio}» ya existe en ${form.grado} - Sección ${form.seccion || 'A'}.`
                };
            }
            return { valido: true, mensaje: null };
        } else {
            const duplicadaEnCurso = asignaturasExistentesEnSeccion.some(asig =>
                sonMismaAsignatura(asig, form.asignatura)
            );
            if (duplicadaEnCurso) {
                return {
                    valido: false,
                    mensaje: `La asignatura «${getAsignaturaNombre(form.asignatura)}» ya está registrada en ${form.grado} - Sección ${form.seccion || 'A'}.`
                };
            }
            return { valido: true, mensaje: null };
        }
    }, [form.esOptativa, form.asignatura, form.grado, form.seccion, nombreOptativaLimpio, asignaturasExistentesEnSeccion]);

    if (!show) return null;

    const toggleDia = (d: string) => {
        setForm((f: any) => ({
            ...f,
            diasSemana: f.diasSemana.includes(d)
                ? f.diasSemana.filter((x: string) => x !== d)
                : [...f.diasSemana, d]
        }));
    };

    const handleSelectAsignaturaChange = (val: string) => {
        if (val === OPCION_AGREGAR_OPTATIVA) {
            setForm((f: any) => ({
                ...f,
                esOptativa: true,
                asignaturaOptativaNombre: f.asignaturaOptativaNombre || ''
            }));
        } else {
            setForm((f: any) => ({
                ...f,
                asignatura: val,
                esOptativa: false,
                asignaturaOptativaNombre: ''
            }));
        }
    };

    const canSubmit = Boolean(form.seccion?.trim()) && !isSaving && validacionAsignatura.valido;

    const modalFooter = (
        <div className="flex gap-4 w-full">
            <button className="flex-1 h-10 rounded-full text-xs font-bold uppercase tracking-widest bg-white border border-slate-200 text-slate-500 hover:bg-slate-50 hover:border-slate-300 transition-all" onClick={onClose}>Descartar</button>
            <button
                className="flex-1 h-10 rounded-full text-xs font-bold uppercase tracking-widest bg-slate-900 text-white shadow-md shadow-slate-900/20 transition-all hover:bg-black disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={!canSubmit}
                onClick={onConfirm}
            >
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
                        <div className="flex items-center justify-between ml-1">
                            <label className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                <Layers size={12} /> Asignatura
                            </label>
                            {form.esOptativa || esAsignaturaOptativa(form.asignatura) ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-200/80">
                                    <Sparkles size={10} /> Optativa personalizada
                                </span>
                            ) : (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-500">
                                    Oficial
                                </span>
                            )}
                        </div>
                        <div className="relative">
                            <select
                                className="w-full appearance-none bg-slate-100 border-2 border-transparent focus:border-primary focus:bg-white rounded-2xl px-5 py-4 text-sm font-bold text-slate-700 outline-none transition-all"
                                value={form.esOptativa ? OPCION_AGREGAR_OPTATIVA : form.asignatura}
                                onChange={e => handleSelectAsignaturaChange(e.target.value)}
                            >
                                <optgroup label="Asignaturas Oficiales">
                                    {ASIGNATURAS_CATALOGO.map(a => (
                                        <option key={a.id} value={a.id}>{a.nombre}</option>
                                    ))}
                                </optgroup>
                                {optativasPrevias.length > 0 && (
                                    <optgroup label="Asignaturas Optativas Creadas">
                                        {optativasPrevias.map(optId => (
                                            <option key={optId} value={optId}>
                                                {getAsignaturaNombre(optId)} (Optativa)
                                            </option>
                                        ))}
                                    </optgroup>
                                )}
                                <optgroup label="Personalizada">
                                    <option value={OPCION_AGREGAR_OPTATIVA}>+ Agregar asignatura optativa</option>
                                </optgroup>
                            </select>
                            <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400" />
                        </div>

                        {form.esOptativa && (
                            <div className="pt-1 animate-in fade-in slide-in-from-top-1 duration-200">
                                <div className="relative">
                                    <input
                                        type="text"
                                        autoFocus
                                        maxLength={80}
                                        placeholder="Escribe el nombre de la asignatura optativa (ej. Robótica, Teatro, Emprendimiento...)"
                                        value={form.asignaturaOptativaNombre || ''}
                                        onChange={e => setForm((f: any) => ({ ...f, asignaturaOptativaNombre: e.target.value }))}
                                        onKeyDown={e => {
                                            if (e.key === 'Enter' && canSubmit) {
                                                e.preventDefault();
                                                onConfirm();
                                            }
                                        }}
                                        className="w-full bg-white border-2 border-slate-200 focus:border-primary rounded-2xl px-5 py-3.5 text-sm font-bold text-slate-800 outline-none transition-all placeholder:text-slate-400 placeholder:font-medium shadow-xs"
                                    />
                                </div>
                                <p className="text-[11px] font-medium text-slate-400 mt-1.5 ml-1">
                                    Quedará vinculada a este curso, centro educativo y período académico como asignatura optativa.
                                </p>
                            </div>
                        )}

                        {validacionAsignatura.mensaje && (
                            <div className="flex items-start gap-2 px-3.5 py-2.5 rounded-xl bg-amber-50/90 border border-amber-200/80 text-amber-800 text-xs font-semibold">
                                <AlertCircle size={14} className="shrink-0 mt-0.5 text-amber-600" />
                                <span>{validacionAsignatura.mensaje}</span>
                            </div>
                        )}
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
