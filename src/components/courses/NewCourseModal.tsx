import { useMemo } from 'react';
import { ChevronDown, AlertCircle } from 'lucide-react';
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
    // Asignaturas ya registradas en el grado + sección seleccionados para este nivel educativo específico
    const asignaturasExistentesEnSeccion = useMemo(() => {
        const grado = String(form.grado || '').trim();
        const seccion = String(form.seccion || '').trim().toUpperCase();
        if (!grado || !seccion) return [];
        const targetNivel = (form.nivelEducativo || 'secundaria').toLowerCase();
        const cursosSeccion = existingCursos.filter(
            c => c.grado === grado && 
                 String(c.seccion || '').trim().toUpperCase() === seccion &&
                 (c.nivelEducativo || 'secundaria').toLowerCase() === targetNivel
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
    }, [existingCursos, cursoDocentes, form.grado, form.seccion, form.nivelEducativo]);

    // Asignaturas optativas personalizadas que el docente o centro ya creó previamente para este nivel
    const optativasPrevias = useMemo(() => {
        const map = new Map<string, string>();
        const targetNivel = (form.nivelEducativo || 'secundaria').toLowerCase();
        existingCursos.forEach(c => {
            if ((c.nivelEducativo || 'secundaria').toLowerCase() === targetNivel && esAsignaturaOptativa(c.asignatura)) {
                const id = crearAsignaturaOptativaId(getAsignaturaNombre(c.asignatura));
                if (id) map.set(id.toLowerCase(), id);
            }
        });
        const cursosNivelIds = new Set(
            existingCursos
                .filter(c => (c.nivelEducativo || 'secundaria').toLowerCase() === targetNivel)
                .map(c => c.id)
        );
        cursoDocentes.forEach(cd => {
            if (cursosNivelIds.has(cd.cursoId) && esAsignaturaOptativa(cd.asignatura)) {
                const id = crearAsignaturaOptativaId(getAsignaturaNombre(cd.asignatura));
                if (id) map.set(id.toLowerCase(), id);
            }
        });
        return Array.from(map.values());
    }, [existingCursos, cursoDocentes, form.nivelEducativo]);

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
            const nivelLabel = form.nivelEducativo === 'primaria' ? 'Primaria' : 'Secundaria';
            if (duplicadaEnCurso) {
                return {
                    valido: false,
                    mensaje: `La asignatura optativa «${nombreOptativaLimpio}» ya existe en ${form.grado} de ${nivelLabel} - Sección ${form.seccion || 'A'}.`
                };
            }
            return { valido: true, mensaje: null };
        } else {
            const duplicadaEnCurso = asignaturasExistentesEnSeccion.some(asig =>
                sonMismaAsignatura(asig, form.asignatura)
            );
            if (duplicadaEnCurso) {
                const nivelLabel = form.nivelEducativo === 'primaria' ? 'Primaria' : 'Secundaria';
                return {
                    valido: false,
                    mensaje: `La asignatura «${getAsignaturaNombre(form.asignatura)}» ya está registrada en ${form.grado} de ${nivelLabel} - Sección ${form.seccion || 'A'}.`
                };
            }
            return { valido: true, mensaje: null };
        }
    }, [form.esOptativa, form.asignatura, form.grado, form.seccion, form.nivelEducativo, nombreOptativaLimpio, asignaturasExistentesEnSeccion]);

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
        <div className="flex items-center justify-end gap-2 w-full">
            <button
                type="button"
                onClick={onClose}
                className="h-8 px-3.5 rounded-md text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
            >
                Cancelar
            </button>
            <button
                type="button"
                data-guide="modal-curso-confirmar"
                disabled={!canSubmit}
                onClick={onConfirm}
                className="h-8 px-4 rounded-md text-xs font-semibold text-white bg-[#689C63] hover:bg-[#5b8c56] disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
                {isSaving ? 'Guardando...' : 'Crear curso'}
            </button>
        </div>
    );

    return (
        <CieloModal
            isOpen={show}
            onClose={onClose}
            title={<span className="text-sm font-bold text-slate-900 normal-case tracking-normal">Nuevo curso</span>}
            maxWidth="2xl"
            footer={modalFooter}
        >
            <div data-guide="modal-curso-formulario" className="space-y-4">
                {/* 1. Selector de Nivel Educativo (Compacto, alineado a la izquierda) */}
                <div className="space-y-1.5">
                    <label className="block text-xs font-medium text-slate-600">
                        Nivel educativo
                    </label>
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            data-guide="modal-curso-nivel-primaria"
                            onClick={() => setForm((f: any) => ({ ...f, nivelEducativo: 'primaria' }))}
                            className={`h-8 w-28 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                                form.nivelEducativo === 'primaria'
                                    ? 'bg-[#689C63] text-white'
                                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                            }`}
                        >
                            Primaria
                        </button>
                        <button
                            type="button"
                            data-guide="modal-curso-nivel-secundaria"
                            onClick={() => setForm((f: any) => ({ ...f, nivelEducativo: 'secundaria' }))}
                            className={`h-8 w-28 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                                form.nivelEducativo === 'secundaria' || !form.nivelEducativo
                                    ? 'bg-[#689C63] text-white'
                                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                            }`}
                        >
                            Secundaria
                        </button>
                    </div>
                </div>

                {/* 2. Cuadrícula de 3 columnas (PC: 3 cols, Tablet: 2 cols, Móvil: 1 col) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {/* Grado */}
                    <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">
                            Grado escolar
                        </label>
                        <div className="relative">
                            <select
                                data-guide="modal-curso-grado"
                                className="w-full h-9 appearance-none bg-white border border-slate-200 focus:border-[#689C63] focus:ring-1 focus:ring-[#689C63] rounded-md px-3 pr-8 text-xs font-medium text-slate-800 outline-none transition-colors cursor-pointer"
                                value={form.grado}
                                onChange={e => setForm((f: any) => ({ ...f, grado: e.target.value }))}
                            >
                                {['1ro', '2do', '3ro', '4to', '5to', '6to'].map(g => (
                                    <option key={g} value={g}>{g}</option>
                                ))}
                            </select>
                            <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400" />
                        </div>
                    </div>

                    {/* Sección */}
                    <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">
                            Sección
                        </label>
                        <input
                            data-guide="modal-curso-seccion"
                            className="w-full h-9 bg-white border border-slate-200 focus:border-[#689C63] focus:ring-1 focus:ring-[#689C63] rounded-md px-3 text-xs font-medium text-slate-800 outline-none transition-colors uppercase placeholder:text-slate-400"
                            placeholder="Ej. A"
                            maxLength={2}
                            value={form.seccion}
                            onChange={e => setForm((f: any) => ({ ...f, seccion: e.target.value.toUpperCase() }))}
                        />
                    </div>

                    {/* Asignatura */}
                    <div className="sm:col-span-2 lg:col-span-1">
                        <label className="block text-xs font-medium text-slate-600 mb-1">
                            Asignatura
                        </label>
                        <div className="relative">
                            <select
                                data-guide="modal-curso-asignatura"
                                className="w-full h-9 appearance-none bg-white border border-slate-200 focus:border-[#689C63] focus:ring-1 focus:ring-[#689C63] rounded-md px-3 pr-8 text-xs font-medium text-slate-800 outline-none transition-colors cursor-pointer"
                                value={form.esOptativa ? OPCION_AGREGAR_OPTATIVA : form.asignatura}
                                onChange={e => handleSelectAsignaturaChange(e.target.value)}
                            >
                                <optgroup label="Oficiales">
                                    {ASIGNATURAS_CATALOGO.map(a => (
                                        <option key={a.id} value={a.id}>{a.nombre}</option>
                                    ))}
                                </optgroup>
                                {optativasPrevias.length > 0 && (
                                    <optgroup label="Optativas previas">
                                        {optativasPrevias.map(optId => (
                                            <option key={optId} value={optId}>
                                                {getAsignaturaNombre(optId)} (Optativa)
                                            </option>
                                        ))}
                                    </optgroup>
                                )}
                                <optgroup label="Personalizada">
                                    <option value={OPCION_AGREGAR_OPTATIVA}>+ Agregar optativa</option>
                                </optgroup>
                            </select>
                            <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400" />
                        </div>
                    </div>

                    {/* Fila condicional para Asignatura Optativa */}
                    {form.esOptativa && (
                        <div className="col-span-1 sm:col-span-2 lg:col-span-3">
                            <label className="block text-xs font-medium text-slate-600 mb-1">
                                Nombre de la asignatura optativa
                            </label>
                            <input
                                type="text"
                                autoFocus
                                maxLength={80}
                                placeholder="Ej. Robótica, Teatro, Emprendimiento..."
                                value={form.asignaturaOptativaNombre || ''}
                                onChange={e => setForm((f: any) => ({ ...f, asignaturaOptativaNombre: e.target.value }))}
                                onKeyDown={e => {
                                    if (e.key === 'Enter' && canSubmit) {
                                        e.preventDefault();
                                        onConfirm();
                                    }
                                }}
                                className="w-full h-9 bg-white border border-slate-200 focus:border-[#689C63] focus:ring-1 focus:ring-[#689C63] rounded-md px-3 text-xs font-medium text-slate-800 outline-none transition-colors placeholder:text-slate-400"
                            />
                        </div>
                    )}

                    {/* Mensaje de validación contextual */}
                    {validacionAsignatura.mensaje && (
                        <div className="col-span-1 sm:col-span-2 lg:col-span-3">
                            <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-amber-50 border border-amber-200 text-amber-800 text-xs font-medium">
                                <AlertCircle size={14} className="shrink-0 text-amber-600" />
                                <span>{validacionAsignatura.mensaje}</span>
                            </div>
                        </div>
                    )}
                </div>

                {/* 3. Días de clase (selectores pequeños cuadrados) y Tutor oficial en fila compacta */}
                <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-slate-600 mr-1">
                            Días:
                        </span>
                        <div className="flex items-center gap-1">
                            {['Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sáb'].map(d => (
                                <button
                                    key={d}
                                    type="button"
                                    onClick={() => toggleDia(d)}
                                    className={`w-8 h-8 rounded-md text-xs font-semibold flex items-center justify-center transition-colors cursor-pointer ${
                                        form.diasSemana.includes(d)
                                            ? 'bg-[#689C63] text-white'
                                            : 'bg-slate-50 border border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-slate-800'
                                    }`}
                                >
                                    {d}
                                </button>
                            ))}
                        </div>
                    </div>

                    <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                        <input
                            type="checkbox"
                            checked={Boolean(form.isTutorOficial)}
                            onChange={(e) => setForm((f: any) => ({ ...f, isTutorOficial: e.target.checked }))}
                            className="w-4 h-4 rounded border-slate-300 text-[#689C63] accent-[#689C63] focus:ring-[#689C63] cursor-pointer"
                        />
                        <span className="text-xs font-medium text-slate-700">
                            Soy el Tutor Oficial de este curso
                        </span>
                    </label>
                </div>
            </div>
        </CieloModal>
    );
}
