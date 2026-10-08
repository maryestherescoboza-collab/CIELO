import { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../../lib/supabase';
import { useAppStore } from '../../store/appStore';
import { ChevronRight, ChevronLeft, Check, CalendarDays, X, Search } from 'lucide-react';

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
    const [isSaving, setIsSaving] = useState(false);
    const [existingRecordId, setExistingRecordId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        if (!isOpen) {
            setStep(1);
            setSelectedCursoDocenteId(null);
            setAttendanceState({});
            setExistingRecordId(null);
            setSearchTerm('');
            
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
                } else {
                    setExistingRecordId(null);
                    setAttendanceState({});
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
            .filter(e => {
                const eShared = e.sharedCourseId || (state.cursos || []).find(cx => cx.id === e.cursoId)?.sharedCourseId;
                const cShared = course.sharedCourseId;
                return e.cursoId === course.id || (cShared && eShared === cShared);
            })
            .sort((a, b) => {
                if (a.numeroLista != null && b.numeroLista != null) return a.numeroLista - b.numeroLista;
                return (a.nombre || '').localeCompare(b.nombre || '');
            });
    }, [state.estudiantes, state.cursos, state.cursoDocentes, selectedCursoDocenteId]);

    const filteredStudents = useMemo(() => {
        if (!searchTerm) return courseStudents;
        const q = searchTerm.toLowerCase();
        return courseStudents.filter(st => (st.nombre || '').toLowerCase().includes(q));
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

    const handleToggleAll = (status: 'P' | 'F') => {
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
            const current = prev[studentId] || 'P';
            let next: AttendanceStatus = 'P';
            if (current === 'P') next = 'F';
            else if (current === 'F') next = 'A';
            else if (current === 'A') next = 'J';
            else next = 'P';
            return { ...prev, [studentId]: next };
        });
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
        return new Intl.DateTimeFormat('es-DO', { dateStyle: 'long' }).format(d);
    };

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl max-w-7xl w-full flex flex-col max-h-[90vh] overflow-hidden transition-all duration-300">
                <header className="px-6 py-4 border-b border-slate-100 flex justify-between items-center shrink-0">
                    <div>
                        <h2 className="text-xl font-bold text-slate-800">Pase de lista</h2>
                        <div className="text-sm text-slate-500 mt-1 flex items-center gap-1.5">
                            <CalendarDays size={14} /> {formatDate(date)}
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-50 transition-colors">
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
                                            // Check if today matches any of the diasSemana
                                            // date is 'YYYY-MM-DD', we need to check if it's one of the configured days
                                            const d = new Date(date + 'T12:00:00');
                                            const dayNames = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
                                            const dayName = dayNames[d.getDay()];
                                            const isScheduledToday = (cd.diasSemana || []).map(ds => ds.toLowerCase()).includes(dayName);
                                            
                                            // Option should ideally be visually distinct if it is scheduled today, but the user didn't request disabling others.
                                            // We will add a small indicator.
                                            
                                            return (
                                                <button
                                                    key={cd.id}
                                                    onClick={() => setSelectedCursoDocenteId(cd.id)}
                                                    className={`p-4 rounded-xl border text-left transition-all relative ${selectedCursoDocenteId === cd.id ? 'border-[#689c63] bg-[#689c63]/5 ring-2 ring-[#689c63]/20' : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'}`}
                                                >
                                                    {isScheduledToday && (
                                                        <div className="absolute top-4 right-4 bg-[#689c63]/10 text-[#689c63] text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                                                            Hoy corresponde
                                                        </div>
                                                    )}
                                                    <div className="font-bold text-slate-800 text-lg leading-none mb-1">{c.grado} {c.seccion}</div>
                                                    <div className="text-sm font-bold text-slate-700 mb-1">{cd.asignatura || 'Sin asignatura'}</div>
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
                                                        className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 focus:border-primary focus:ring-1 focus:ring-primary outline-none text-sm"
                                                    />
                                                </div>
                                                <div className="flex gap-2">
                                                    <button onClick={() => handleToggleAll('P')} className="px-3 py-2 rounded-lg text-xs font-bold border border-[#b5ccb2] bg-[#f3f7ef] text-[#689c63] hover:bg-[#eaf1e5] transition-colors whitespace-nowrap">
                                                        Todos Presentes
                                                    </button>
                                                    <button onClick={() => handleToggleAll('F')} className="px-3 py-2 rounded-lg text-xs font-bold border border-[#eabeb6] bg-[#fcf0ee] text-[#c63d3d] hover:bg-[#fae2df] transition-colors whitespace-nowrap">
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
                                                                onClick={() => cycleStudentStatus(st.id)}
                                                                className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 border transition-all shadow-sm font-bold text-sm ${statusColors[status]}`}
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
                                            <div className="font-bold text-slate-700">{formatDate(date)}</div>
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
                        <button onClick={() => setStep(s => s - 1)} className="px-5 py-2.5 rounded-xl font-bold text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors flex items-center gap-2">
                            <ChevronLeft size={18} /> Volver
                        </button>
                    ) : <div></div>}
                    
                    {step < 3 ? (
                        <button 
                            onClick={() => setStep(s => s + 1)} 
                            disabled={step === 1 && !selectedCursoDocenteId}
                            className="px-6 py-2.5 rounded-xl font-bold text-white bg-[#689c63] hover:bg-[#578952] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2 shadow-sm"
                        >
                            Continuar <ChevronRight size={18} />
                        </button>
                    ) : (
                        <button 
                            onClick={handleSave} 
                            disabled={isSaving}
                            className="px-6 py-2.5 rounded-xl font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 transition-colors flex items-center gap-2 shadow-sm"
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
        </div>,
        document.body
    );
}
