import { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../../lib/supabase';
import { useAppStore } from '../../store/appStore';
import { Check, X } from 'lucide-react';
import { getAsignaturaNombre } from '../../constants/asignaturas';
import { esEstudianteDelCurso } from '../../utils/aislamiento';

interface AttendanceWizardModalProps {
    date: string;
    isOpen: boolean;
    onClose: () => void;
}

type AttendanceStatus = 'P' | 'F' | 'J' | 'A';

export function AttendanceWizardModal({ date, isOpen, onClose }: AttendanceWizardModalProps) {
    const { state, session } = useAppStore();
    const [step, setStep] = useState(1);
    const [selectedCursoDocenteId, setSelectedCursoDocenteId] = useState<number | null>(null);
    const [attendanceState, setAttendanceState] = useState<Record<string, AttendanceStatus>>({});
    const [history, setHistory] = useState<Record<string, AttendanceStatus>[]>([]);
    const [isSaving, setIsSaving] = useState(false);
    const [existingRecordId, setExistingRecordId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [jumpNumber, setJumpNumber] = useState('');

    useEffect(() => {
        if (!isOpen) {
            setStep(1);
            setSelectedCursoDocenteId(null);
            setAttendanceState({});
            setHistory([]);
            setExistingRecordId(null);
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
            document.documentElement.style.overflow = 'hidden';
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

    const formatDate = (isoStr: string) => {
        const d = new Date(isoStr + 'T12:00:00'); // Prevent timezone issues
        return new Intl.DateTimeFormat('es-DO', { weekday: 'long', day: 'numeric', month: 'long' }).format(d);
    };

    return createPortal(
        <div className="fixed inset-0 z-9999 flex items-center justify-center bg-black/40 backdrop-blur-sm p-2 sm:p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full flex flex-col h-[95dvh] sm:h-auto sm:max-h-[90vh] overflow-hidden transition-all duration-300">
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
                            <span>{formatDate(date)}</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                        {step === 2 && (
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
                    {step === 1 && (
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
                    {step === 2 && (
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
