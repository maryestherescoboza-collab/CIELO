import { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../../lib/supabase';
import { useAppStore } from '../../store/appStore';
import { ChevronRight, ChevronLeft, Check, CalendarDays, X, Search } from 'lucide-react';
import { getAsignaturaNombre } from '../../constants/asignaturas';
import { esEstudianteDelCurso } from '../../utils/aislamiento';

interface AttendanceWizardModalProps {
    date: string;
    isOpen: boolean;
    onClose: () => void;
}

type AttendanceStatus = 'P' | 'F' | 'J' | 'A';

const statusLabels: Record<AttendanceStatus, string> = {
    P: 'Presente',
    F: 'Ausente',
    J: 'Excusa',
    A: 'Tardanza'
};

const statusColors: Record<AttendanceStatus, string> = {
    P: 'bg-[#689c63] text-white border-[#578952]',
    F: 'bg-[#c63d3d] text-white border-[#b03636]',
    J: 'bg-[#537bac] text-white border-[#456b9c]',
    A: 'bg-[#eb8847] text-white border-[#d87535]'
};

const statusIcons: Record<AttendanceStatus, string> = {
    P: 'P',
    F: 'A',
    J: 'E',
    A: 'T'
};

export function AttendanceWizardModal({ date, isOpen, onClose }: AttendanceWizardModalProps) {
    const { state, session } = useAppStore();
    const [step, setStep] = useState(1);
    const [selectedCursoDocenteId, setSelectedCursoDocenteId] = useState<number | null>(null);
    const [attendanceState, setAttendanceState] = useState<Record<string, AttendanceStatus>>({});
    const [history, setHistory] = useState<Record<string, AttendanceStatus>[]>([]);
    const [isSaving, setIsSaving] = useState(false);
    const [existingRecordId, setExistingRecordId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [jumpNumber, setJumpNumber] = useState('');

    useEffect(() => {
        if (!isOpen) {
            setStep(1);
            setSelectedCursoDocenteId(null);
            setAttendanceState({});
            setHistory([]);
            setExistingRecordId(null);
            setSearchTerm('');
            setJumpNumber('');

            // Restore scroll
            document.body.style.overflow = '';
            document.documentElement.style.overflow = '';
            const root = document.getElementById('root');
            if (root) {
                root.style.overflow = '';
                root.style.pointerEvents = '';
            }
        } else {
            // Lock scroll globally
            document.body.style.overflow = 'hidden';
            document.documentElement.style.overflow = '';
            const root = document.getElementById('root');
            if (root) {
                root.style.overflow = 'hidden';
                root.style.pointerEvents = 'none'; // Prevents scrolling on inner containers behind the modal
            }
        }

        return () => {
            document.body.style.overflow = '';
            document.documentElement.style.overflow = '';
            const root = document.getElementById('root');
            if (root) {
                root.style.overflow = '';
                root.style.pointerEvents = '';
            }
        };
    }, [isOpen]);

    useEffect(() => {
        if (selectedCursoDocenteId && isOpen && step === 2) {
            const fetchExisting = async () => {
                setIsLoading(true);
                const { data } = await supabase
                    .from('asistencia_sesiones')
                    .select('id')
                    .eq('curso_docente_id', selectedCursoDocenteId)
                    .eq('fecha', date)
                    .maybeSingle();

                if (data) {
                    setExistingRecordId(data.id);
                    const { data: excData } = await supabase
                        .from('asistencia_excepciones')
                        .select('estudiante_id, estado')
                        .eq('sesion_id', data.id);

                    const init: Record<string, AttendanceStatus> = {};
                    (excData || []).forEach(exc => {
                        init[exc.estudiante_id] = exc.estado as AttendanceStatus;
                    });
                    setAttendanceState(init);
                    setHistory([]);
                } else {
                    setExistingRecordId(null);
                    setAttendanceState({});
                    setHistory([]);
                }
                setIsLoading(false);
            };
            fetchExisting();
        }
    }, [selectedCursoDocenteId, date, isOpen, step, state.estudiantes]);

    const courseStudents = useMemo(() => {
        if (!selectedCursoDocenteId) return [];
        const cd = state.cursoDocentes?.find(c => c.id === selectedCursoDocenteId);
        if (!cd) return [];
        const course = (state.cursos || []).find(c => c.id === cd.cursoId);
        if (!course) return [];

        return (state.estudiantes || [])
            .filter(e => esEstudianteDelCurso(state.cursos || [], course, e, course.centroId))
            .sort((a, b) => {
                if (a.numeroLista != null && b.numeroLista != null) return a.numeroLista - b.numeroLista;
                return (a.nombre || '').localeCompare(b.nombre || '');
            });
    }, [state.estudiantes, state.cursos, state.cursoDocentes, selectedCursoDocenteId]);

    const filteredStudents = useMemo(() => {
        if (!searchTerm) return courseStudents;
        const q = searchTerm.toLowerCase();
        return courseStudents.filter(st =>
            `${st.nombre || ''} ${st.apellido || ''}`.toLowerCase().includes(q)
        );
    }, [courseStudents, searchTerm]);

    if (!isOpen) return null;

    const selectedCd = selectedCursoDocenteId ? state.cursoDocentes?.find(cd => cd.id === selectedCursoDocenteId) : null;
    const course = selectedCd ? (state.cursos || []).find(c => c.id === selectedCd.cursoId) : null;

    const summary = {
        P: courseStudents.filter(s => (attendanceState[s.id] || 'P') === 'P').length,
        F: courseStudents.filter(s => attendanceState[s.id] === 'F').length,
        J: courseStudents.filter(s => attendanceState[s.id] === 'J').length,
        A: courseStudents.filter(s => attendanceState[s.id] === 'A').length,
    };

    const pushHistory = (stateToSave: Record<string, AttendanceStatus>) => {
        setHistory(prev => [...prev.slice(-15), stateToSave]);
    };

    const handleUndo = () => {
        if (history.length === 0) return;
        const last = history[history.length - 1];
        setHistory(prev => prev.slice(0, -1));
        setAttendanceState(last);
    };

    const handleToggleAll = (status: 'P' | 'F') => {
        pushHistory(attendanceState);
        if (status === 'P') {
            setAttendanceState({});
        } else {
            const next: Record<string, AttendanceStatus> = {};
            courseStudents.forEach(st => {
                next[st.id] = 'F';
            });
            setAttendanceState(next);
        }
    };

    const cycleStudentStatus = (studentId: number) => {
        setAttendanceState(prev => {
            pushHistory(prev);
            const current = prev[studentId] || 'P';
            let next: AttendanceStatus = 'P';
            if (current === 'P') next = 'F';
            else if (current === 'F') next = 'A';
            else if (current === 'A') next = 'J';
            else next = 'P';
            return { ...prev, [studentId]: next };
        });
    };

    const handleJumpToNumber = (val: string) => {
        setJumpNumber(val);
        const num = parseInt(val, 10);
        if (!isNaN(num) && num > 0) {
            const el = document.getElementById(`student-cell-${num}`);
            if (el) {
                el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                el.classList.add('ring-3', 'ring-[#689c63]');
                setTimeout(() => {
                    el.classList.remove('ring-3', 'ring-[#689c63]');
                }, 1200);
            }
        }
    };

    const handleSave = async () => {
        if (!selectedCursoDocenteId || !session?.user?.id || !course) return;
        setIsSaving(true);
        try {
            let sessionId = existingRecordId;

            if (!sessionId) {
                const { data, error } = await supabase.from('asistencia_sesiones').insert({
                    curso_id: course.id,
                    curso_docente_id: selectedCursoDocenteId,
                    user_id: session.user.id,
                    fecha: date
                }).select().single();

                if (error) throw error;
                sessionId = data.id;
            }

            const exceptions = Object.entries(attendanceState)
                .filter(([_, st]) => st !== 'P')
                .map(([estId, st]) => ({
                    sesion_id: sessionId,
                    estudiante_id: Number(estId),
                    estado: st
                }));

            // Clear old exceptions
            await supabase.from('asistencia_excepciones').delete().eq('sesion_id', sessionId);

            // Insert new exceptions
            if (exceptions.length > 0) {
                await supabase.from('asistencia_excepciones').insert(exceptions);
            }

            onClose();
        } catch (error) {
            console.error("Error saving attendance", error);
            alert("Error al guardar la asistencia");
        } finally {
            setIsSaving(false);
        }
    };

    const formatDateDesktop = (isoStr: string) => {
        const d = new Date(isoStr + 'T12:00:00');
        return new Intl.DateTimeFormat('es-DO', { dateStyle: 'long' }).format(d);
    };

    const formatDateMobile = (isoStr: string) => {
        const d = new Date(isoStr + 'T12:00:00');
        return new Intl.DateTimeFormat('es-DO', { weekday: 'long', day: 'numeric', month: 'long' }).format(d);
    };

    const mobileStep = step >= 2 ? 2 : 1;

    return createPortal(
        <div className="fixed inset-0 z-9999 flex items-center justify-center bg-black/40 backdrop-blur-sm p-2 sm:p-4 animate-in fade-in duration-200">
            {/* ═══════════════════════════════════════════════════════════════════
                1. DISEÑO ORIGINAL PARA PC / ESCRITORIO (>= lg)
               ═══════════════════════════════════════════════════════════════════ */}
            <div className="hidden lg:flex bg-white rounded-2xl shadow-2xl max-w-7xl w-full flex-col max-h-[90vh] overflow-hidden transition-all duration-300">
                <header className="px-6 py-4 border-b border-slate-100 flex justify-between items-center shrink-0">
                    <div>
                        <h2 className="text-xl font-bold text-slate-800">Pase de lista</h2>
                        <div className="text-sm text-slate-500 mt-1 flex items-center gap-1.5">
                            <CalendarDays size={14} /> {formatDateDesktop(date)}
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer" aria-label="Cerrar">
                        <X size={20} />
                    </button>
                </header>

                <div className="flex-1 overflow-hidden flex flex-col">
                    {/* Progress Bar */}
                    <div className="flex px-6 py-4 shrink-0 border-b border-slate-50 bg-slate-50/50">
                        <div className={`flex-1 text-center text-xs font-bold uppercase tracking-wider ${step >= 1 ? 'text-[#689c63]' : 'text-slate-400'}`}>01. Curso</div>
                        <div className={`flex-1 text-center text-xs font-bold uppercase tracking-wider ${step >= 2 ? 'text-[#689c63]' : 'text-slate-400'}`}>02. Asistencia</div>
                        <div className={`flex-1 text-center text-xs font-bold uppercase tracking-wider ${step === 3 ? 'text-[#689c63]' : 'text-slate-400'}`}>03. Confirmar</div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6 relative">
                        {step === 1 && (
                            <div className="animate-in slide-in-from-right-4 duration-300">
                                <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-4">Selecciona la asignatura</h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {(state.cursoDocentes || [])
                                        .filter(cd => cd.userId === session?.user?.id)
                                        .map(cd => {
                                            const c = (state.cursos || []).find(curso => curso.id === cd.cursoId);
                                            if (!c) return null;
                                            const d = new Date(date + 'T12:00:00');
                                            const dayNames = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
                                            const dayName = dayNames[d.getDay()];
                                            const isScheduledToday = (cd.diasSemana || []).map(ds => ds.toLowerCase()).includes(dayName);

                                            return (
                                                <button
                                                    key={cd.id}
                                                    data-guide="btn-curso-asistencia"
                                                    onClick={() => setSelectedCursoDocenteId(cd.id)}
                                                    className={`p-4 rounded-xl border text-left transition-all relative cursor-pointer ${selectedCursoDocenteId === cd.id ? 'border-[#689c63] bg-[#689c63]/5 ring-2 ring-[#689c63]/20' : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'}`}
                                                >
                                                    {isScheduledToday && (
                                                        <div className="absolute top-4 right-4 bg-[#689c63]/10 text-[#689c63] text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                                                            Hoy corresponde
                                                        </div>
                                                    )}
                                                    <div className="font-bold text-slate-800 text-lg leading-none mb-1">{c.grado} {c.seccion}</div>
                                                    <div className="text-sm font-bold text-slate-700 mb-1">{getAsignaturaNombre(cd.asignatura) || 'Sin asignatura'}</div>
                                                    <div className="text-xs text-slate-500 font-medium">{c.nombre}</div>
                                                </button>
                                            );
                                        })}
                                </div>
                            </div>
                        )}

                        {step === 2 && (
                            <div className="animate-in slide-in-from-right-4 duration-300 flex flex-col h-full">
                                {isLoading ? (
                                    <div className="flex items-center justify-center flex-1">
                                        <div className="w-8 h-8 border-4 border-[#689c63] border-t-transparent rounded-full animate-spin"></div>
                                    </div>
                                ) : (
                                    <>
                                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 shrink-0 bg-slate-50 p-4 rounded-xl border border-slate-100">
                                            <div>
                                                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">{courseStudents.length} Estudiantes</h3>
                                                <div className="text-sm font-medium flex flex-wrap gap-x-5 gap-y-1 mt-2">
                                                    <span className="text-[#689c63] font-bold">Presentes {summary.P}</span>
                                                    <span className="text-[#c63d3d] font-bold">Ausentes {summary.F}</span>
                                                    <span className="text-[#eb8847] font-bold">Tardanzas {summary.A}</span>
                                                    <span className="text-[#537bac] font-bold">Excusas {summary.J}</span>
                                                </div>
                                            </div>
                                            <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                                                <div className="relative flex-1 md:w-64">
                                                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                                    <input
                                                        type="text"
                                                        placeholder="Buscar estudiante..."
                                                        value={searchTerm}
                                                        onChange={(e) => setSearchTerm(e.target.value)}
                                                        className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 focus:border-primary focus:ring-1 focus:ring-primary outline-none text-sm bg-white"
                                                    />
                                                </div>
                                                <div className="flex gap-2">
                                                    <button data-guide="btn-todos-presentes" onClick={() => handleToggleAll('P')} className="px-3 py-2 rounded-lg text-xs font-bold border border-[#b5ccb2] bg-[#f3f7ef] text-[#689c63] hover:bg-[#eaf1e5] transition-colors whitespace-nowrap cursor-pointer">
                                                        Todos Presentes
                                                    </button>
                                                    <button onClick={() => handleToggleAll('F')} className="px-3 py-2 rounded-lg text-xs font-bold border border-[#eabeb6] bg-[#fcf0ee] text-[#c63d3d] hover:bg-[#fae2df] transition-colors whitespace-nowrap cursor-pointer">
                                                        Todos Ausentes
                                                    </button>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex-1 overflow-y-auto pr-2 pb-2">
                                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-x-4 gap-y-3">
                                                {filteredStudents.map((st) => {
                                                    const status = attendanceState[st.id] || 'P';
                                                    return (
                                                        <div key={st.id} className="flex items-center gap-3 p-2 rounded-xl hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100 group">
                                                            <button
                                                                data-guide="btn-estado-estudiante"
                                                                onClick={() => cycleStudentStatus(st.id)}
                                                                className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 border transition-all shadow-sm font-bold text-sm cursor-pointer ${statusColors[status]}`}
                                                                title="Clic para cambiar estado"
                                                            >
                                                                {statusIcons[status]}
                                                            </button>
                                                            <div className="flex-1 min-w-0">
                                                                <div className="font-bold text-slate-800 text-sm truncate leading-tight">
                                                                    {st.nombre} {st.apellido}
                                                                </div>
                                                                <div className="text-xs text-slate-500 font-medium">
                                                                    {statusLabels[status]}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                                {filteredStudents.length === 0 && (
                                                    <div className="col-span-full py-10 text-center text-slate-400 font-medium">
                                                        No se encontraron estudiantes
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>
                        )}

                        {step === 3 && (
                            <div className="animate-in slide-in-from-right-4 duration-300">
                                <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-6 text-center">Revisar asistencia</h3>

                                <div className="max-w-md mx-auto bg-slate-50 border border-slate-100 rounded-2xl p-6">
                                    <div className="flex justify-between items-end border-b border-slate-200 pb-4 mb-4">
                                        <div>
                                            <div className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">Curso</div>
                                            <div className="font-bold text-slate-800 text-xl">{course?.grado} {course?.seccion}</div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">Fecha</div>
                                            <div className="font-bold text-slate-700">{formatDateDesktop(date)}</div>
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        <div className="flex justify-between items-center p-3 bg-[#f3f7ef] rounded-xl border border-[#b5ccb2]">
                                            <span className="font-bold text-[#689c63]">Presentes</span>
                                            <span className="font-black text-[#578952] text-lg">{summary.P}</span>
                                        </div>
                                        <div className="flex justify-between items-center p-3 bg-[#fcf0ee] rounded-xl border border-[#eabeb6]">
                                            <span className="font-bold text-[#c63d3d]">Ausentes</span>
                                            <span className="font-black text-[#b03636] text-lg">{summary.F}</span>
                                        </div>
                                        <div className="flex gap-3">
                                            <div className="flex-1 flex justify-between items-center p-3 bg-[#edf1f7] rounded-xl border border-[#c1d0e3]">
                                                <span className="font-bold text-[#537bac] text-sm">Excusas</span>
                                                <span className="font-black text-[#456b9c]">{summary.J}</span>
                                            </div>
                                            <div className="flex-1 flex justify-between items-center p-3 bg-[#fdf5f0] rounded-xl border border-[#f5d7c4]">
                                                <span className="font-bold text-[#eb8847] text-sm">Tardanzas</span>
                                                <span className="font-black text-[#d87535]">{summary.A}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <footer className="p-4 sm:p-6 border-t border-slate-100 bg-white shrink-0 flex justify-between items-center">
                    {step > 1 ? (
                        <button onClick={() => setStep(s => s - 1)} className="px-5 py-2.5 rounded-xl font-bold text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors flex items-center gap-2 cursor-pointer">
                            <ChevronLeft size={18} /> Volver
                        </button>
                    ) : <div></div>}

                    {step < 3 ? (
                        <button
                            data-guide="btn-continuar-asistencia"
                            onClick={() => setStep(s => s + 1)}
                            disabled={step === 1 && !selectedCursoDocenteId}
                            className="px-6 py-2.5 rounded-xl font-bold text-white bg-[#689c63] hover:bg-[#578952] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2 shadow-sm cursor-pointer"
                        >
                            Continuar <ChevronRight size={18} />
                        </button>
                    ) : (
                        <button
                            data-guide="btn-guardar-asistencia"
                            onClick={handleSave}
                            disabled={isSaving}
                            className="px-6 py-2.5 rounded-xl font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 transition-colors flex items-center gap-2 shadow-sm cursor-pointer"
                        >
                            {isSaving ? (
                                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                            ) : (
                                <Check size={18} />
                            )}
                            Guardar asistencia
                        </button>
                    )}
                </footer>
            </div>

            {/* ═══════════════════════════════════════════════════════════════════
                2. DISEÑO TÁCTIL PARA TELÉFONOS Y TABLETAS (< lg) — INTACTO
               ═══════════════════════════════════════════════════════════════════ */}
            <div className="flex lg:hidden bg-white rounded-2xl shadow-2xl max-w-4xl w-full flex-col h-[95dvh] sm:h-auto sm:max-h-[90vh] overflow-hidden transition-all duration-300">
                {/* 1. Encabezado */}
                <header className="px-4 py-3 sm:px-5 sm:py-3.5 border-b border-slate-100 flex justify-between items-center shrink-0 bg-white">
                    <div className="min-w-0 pr-2">
                        <div className="flex items-center gap-2">
                            <h2 className="text-lg sm:text-xl font-black text-slate-800 tracking-tight leading-tight">
                                Pase de lista
                            </h2>
                            {course && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-slate-100 text-slate-700 truncate max-w-37.5 sm:max-w-none">
                                    {course.grado} {course.seccion} · {getAsignaturaNombre(selectedCd?.asignatura)}
                                </span>
                            )}
                        </div>
                        <div className="text-xs text-slate-500 capitalize font-medium flex items-center gap-1.5 mt-0.5">
                            <span>{formatDateMobile(date)}</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                        {mobileStep === 2 && (
                            <div className="h-9 px-3.5 rounded-xl border border-slate-200 bg-white flex items-center justify-center font-bold text-sm sm:text-base text-slate-800 shadow-2xs" title="Total estudiantes">
                                {courseStudents.length}
                            </div>
                        )}
                        <button
                            onClick={onClose}
                            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
                            aria-label="Cerrar"
                        >
                            <X size={18} />
                        </button>
                    </div>
                </header>

                <div className="flex-1 overflow-hidden flex flex-col">
                    {/* PASO 1: Selección de Asignatura / Curso */}
                    {mobileStep === 1 && (
                        <div className="flex-1 overflow-y-auto p-4 sm:p-6 animate-in slide-in-from-right-4 duration-300">
                            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
                                Selecciona el curso y asignatura
                            </h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {(state.cursoDocentes || [])
                                    .filter(cd => cd.userId === session?.user?.id)
                                    .map(cd => {
                                        const c = (state.cursos || []).find(curso => curso.id === cd.cursoId);
                                        if (!c) return null;
                                        const d = new Date(date + 'T12:00:00');
                                        const dayNames = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
                                        const dayName = dayNames[d.getDay()];
                                        const isScheduledToday = (cd.diasSemana || []).map(ds => ds.toLowerCase()).includes(dayName);
                                        const isSelected = selectedCursoDocenteId === cd.id;

                                        return (
                                            <button
                                                key={cd.id}
                                                data-guide="btn-curso-asistencia"
                                                onClick={() => {
                                                    setSelectedCursoDocenteId(cd.id);
                                                    setStep(2);
                                                }}
                                                className={`p-4 rounded-xl border text-left transition-all relative cursor-pointer ${isSelected
                                                    ? 'border-[#689c63] bg-[#689c63]/5 ring-2 ring-[#689c63]/20'
                                                    : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                                                    }`}
                                            >
                                                {isScheduledToday && (
                                                    <div className="absolute top-3 right-3 bg-[#689c63]/10 text-[#689c63] text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                                                        Hoy
                                                    </div>
                                                )}
                                                <div className="font-black text-slate-800 text-lg leading-tight mb-1">
                                                    {c.grado} {c.seccion}
                                                </div>
                                                <div className="text-sm font-bold text-slate-700 mb-0.5">
                                                    {getAsignaturaNombre(cd.asignatura) || 'Sin asignatura'}
                                                </div>
                                                <div className="text-xs text-slate-500 font-medium truncate">
                                                    {c.nombre}
                                                </div>
                                            </button>
                                        );
                                    })}
                            </div>
                        </div>
                    )}

                    {/* PASO 2: Matriz Táctil de Asistencia de Alta Densidad */}
                    {mobileStep === 2 && (
                        <div className="flex-1 overflow-hidden flex flex-col animate-in slide-in-from-right-4 duration-300">
                            {isLoading ? (
                                <div className="flex items-center justify-center flex-1">
                                    <div className="w-8 h-8 border-3 border-[#689c63] border-t-transparent rounded-full animate-spin"></div>
                                </div>
                            ) : (
                                <>
                                    {/* 2. Píldoras Métricas de Resumen (4 columnas) */}
                                    <div className="p-3 sm:p-4 bg-slate-50/70 border-b border-slate-100 shrink-0 space-y-2.5">
                                        <div className="grid grid-cols-4 gap-1.5 sm:gap-2.5">
                                            {/* Presentes */}
                                            <div className="bg-[#f0f7ef] border border-[#c0dec0] rounded-xl p-2 sm:p-2.5 text-center">
                                                <div className="text-base sm:text-xl font-black text-[#204a25] leading-none">
                                                    {summary.P}
                                                </div>
                                                <div className="text-[10px] sm:text-xs font-bold text-[#2e5d32] mt-1 truncate">
                                                    Presentes
                                                </div>
                                            </div>

                                            {/* Ausentes */}
                                            <div className="bg-[#fdf0ee] border border-[#f5b8b0] rounded-xl p-2 sm:p-2.5 text-center">
                                                <div className="text-base sm:text-xl font-black text-[#9c2424] leading-none">
                                                    {summary.F}
                                                </div>
                                                <div className="text-[10px] sm:text-xs font-bold text-[#b03030] mt-1 truncate">
                                                    Ausentes
                                                </div>
                                            </div>

                                            {/* Tarde */}
                                            <div className="bg-[#fef7ee] border border-[#f8d4a6] rounded-xl p-2 sm:p-2.5 text-center">
                                                <div className="text-base sm:text-xl font-black text-[#a85210] leading-none">
                                                    {summary.A}
                                                </div>
                                                <div className="text-[10px] sm:text-xs font-bold text-[#ba5d13] mt-1 truncate">
                                                    Tarde
                                                </div>
                                            </div>

                                            {/* Excusa */}
                                            <div className="bg-[#edf4fb] border border-[#b5d3f2] rounded-xl p-2 sm:p-2.5 text-center">
                                                <div className="text-base sm:text-xl font-black text-[#1e4d82] leading-none">
                                                    {summary.J}
                                                </div>
                                                <div className="text-[10px] sm:text-xs font-bold text-[#295b94] mt-1 truncate">
                                                    Excusa
                                                </div>
                                            </div>
                                        </div>

                                        {/* 3. Fila de Control Rápido: Ir al n.° e Instrucción */}
                                        <div className="flex items-center gap-3 pt-0.5">
                                            <div className="w-24 sm:w-28 shrink-0">
                                                <input
                                                    type="number"
                                                    min="1"
                                                    max="60"
                                                    placeholder="Ir al n.º"
                                                    value={jumpNumber}
                                                    onChange={(e) => handleJumpToNumber(e.target.value)}
                                                    className="w-full h-8 px-2.5 text-xs font-medium bg-white rounded-lg border border-slate-200 focus:border-[#689c63] focus:ring-1 focus:ring-[#689c63] outline-none placeholder:text-slate-400"
                                                />
                                            </div>
                                            <p className="text-[11px] sm:text-xs text-slate-500 font-medium truncate">
                                                Toca: ausente, tarde, excusa. Mantén presionado: nota.
                                            </p>
                                        </div>
                                    </div>

                                    {/* 4. Matriz Táctil de Estudiantes (Cuadrícula de 5 columnas fija) */}
                                    <div className="flex-1 overflow-y-auto p-3 sm:p-4">
                                        <div className="grid grid-cols-5 gap-1.5 sm:gap-2.5">
                                            {courseStudents.map((st) => {
                                                const status = attendanceState[st.id] || 'P';
                                                const numDisplay = st.numeroLista != null ? st.numeroLista : '—';
                                                const firstName = (st.nombre || '').trim().split(' ')[0] || 'Est.';

                                                let cardStyles = 'bg-[#f0f7ef] border-[#c0dec0] text-[#204a25]';
                                                let badgeElement = <Check size={12} className="text-[#204a25] stroke-3" />;

                                                if (status === 'F') {
                                                    cardStyles = 'bg-[#fdf0ee] border-[#f5b8b0] text-[#9c2424]';
                                                    badgeElement = <span className="text-[10px] font-black text-[#9c2424] leading-none">A</span>;
                                                } else if (status === 'A') {
                                                    cardStyles = 'bg-[#fef7ee] border-[#f8d4a6] text-[#a85210]';
                                                    badgeElement = <span className="text-[10px] font-black text-[#a85210] leading-none">T</span>;
                                                } else if (status === 'J') {
                                                    cardStyles = 'bg-[#edf4fb] border-[#b5d3f2] text-[#1e4d82]';
                                                    badgeElement = <span className="text-[10px] font-black text-[#1e4d82] leading-none">E</span>;
                                                }

                                                return (
                                                    <button
                                                        key={st.id}
                                                        id={`student-cell-${st.numeroLista || st.id}`}
                                                        type="button"
                                                        data-guide="btn-estado-estudiante"
                                                        onClick={() => cycleStudentStatus(st.id)}
                                                        title={`${st.nombre} ${st.apellido} (${status})`}
                                                        className={`relative flex flex-col items-center justify-center p-1.5 sm:p-2 rounded-xl sm:rounded-2xl border transition-all duration-150 select-none cursor-pointer h-16 sm:h-18 active:scale-95 ${cardStyles}`}
                                                    >
                                                        {/* Badge de estado en esquina superior derecha */}
                                                        <div className="absolute top-1.5 right-1.5 w-3.5 h-3.5 flex items-center justify-center">
                                                            {badgeElement}
                                                        </div>

                                                        {/* Número de lista prominente */}
                                                        <span className="text-base sm:text-lg font-black leading-none mt-1">
                                                            {numDisplay}
                                                        </span>

                                                        {/* Nombre de pila recortado */}
                                                        <span className="text-[11px] sm:text-xs font-semibold truncate max-w-full px-1 mt-1 leading-tight">
                                                            {firstName}
                                                        </span>
                                                    </button>
                                                );
                                            })}

                                            {courseStudents.length === 0 && (
                                                <div className="col-span-full py-12 text-center text-slate-400 font-medium text-xs">
                                                    No hay estudiantes registrados en este curso.
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* 5. Barra Inferior Fija de Acciones (Thumb Zone) */}
                                    <footer className="p-3 sm:p-4 border-t border-slate-100 bg-white/95 backdrop-blur-sm shrink-0 flex items-center justify-between gap-2">
                                        <div className="flex items-center gap-2">
                                            <button
                                                type="button"
                                                onClick={handleUndo}
                                                disabled={history.length === 0}
                                                className="h-11 px-3.5 sm:px-4 rounded-xl border border-slate-200 bg-white text-slate-800 text-xs sm:text-sm font-bold hover:bg-slate-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center cursor-pointer"
                                            >
                                                Deshacer
                                            </button>

                                            <button
                                                type="button"
                                                data-guide="btn-todos-presentes"
                                                onClick={() => handleToggleAll('P')}
                                                className="h-11 px-3.5 sm:px-4 rounded-xl border border-slate-200 bg-white text-slate-800 text-xs sm:text-sm font-bold hover:bg-slate-50 transition-colors whitespace-nowrap cursor-pointer"
                                            >
                                                Todos presentes
                                            </button>
                                        </div>

                                        <button
                                            type="button"
                                            data-guide="btn-guardar-asistencia"
                                            onClick={handleSave}
                                            disabled={isSaving}
                                            className="h-11 px-6 sm:px-8 rounded-xl font-bold text-white bg-[#2e5d32] hover:bg-[#254c28] disabled:opacity-50 transition-colors flex items-center justify-center gap-2 shadow-sm cursor-pointer"
                                        >
                                            {isSaving && (
                                                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                                            )}
                                            <span>Guardar</span>
                                        </button>
                                    </footer>
                                </>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>,
        document.body
    );
}
