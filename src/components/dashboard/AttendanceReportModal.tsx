import { useState, useEffect, useMemo } from 'react';
import { useAppStore } from '../../store/appStore';
import { supabase } from '../../lib/supabase';
import { X } from 'lucide-react';

interface AttendanceReportModalProps {
    date: string; // "YYYY-MM-DD"
    isOpen: boolean;
    onClose: () => void;
}

const statusColors: Record<string, string> = {
    P: 'text-[#689c63]',
    A: 'text-[#c63d3d]',
    T: 'text-[#eb8847]',
    E: 'text-[#537bac]',
};

export function AttendanceReportModal({ date, isOpen, onClose }: AttendanceReportModalProps) {
    const { state, session } = useAppStore();
    const [selectedCursoDocenteId, setSelectedCursoDocenteId] = useState<number | null>(null);
    const [sesiones, setSesiones] = useState<any[]>([]);
    const [excepciones, setExcepciones] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [showLegend, setShowLegend] = useState(false);

    // Filter available courses for the user based on their specific subjects
    const availableCursoDocentes = useMemo(() => {
        return (state.cursoDocentes || []).filter(cd => cd.userId === session?.user?.id);
    }, [state.cursoDocentes, session]);

    // Reset selected course if modal is reopened or courses change
    useEffect(() => {
        if (isOpen && !selectedCursoDocenteId && availableCursoDocentes.length > 0) {
            setSelectedCursoDocenteId(availableCursoDocentes[0].id);
        }
    }, [isOpen, availableCursoDocentes, selectedCursoDocenteId]);

    // Fetch monthly data
    useEffect(() => {
        if (!isOpen || !selectedCursoDocenteId || !date) return;
        
        const fetchMonthlyAttendance = async () => {
            setIsLoading(true);
            try {
                const currentDate = new Date(date + 'T12:00:00');
                const start = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).toISOString().split('T')[0];
                const end = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).toISOString().split('T')[0];

                const { data: sesData, error: sesError } = await supabase
                    .from('asistencia_sesiones')
                    .select('id, fecha')
                    .eq('curso_docente_id', selectedCursoDocenteId)
                    .gte('fecha', start)
                    .lte('fecha', end)
                    .order('fecha', { ascending: true });
                
                if (sesError) throw sesError;
                setSesiones(sesData || []);

                if (sesData && sesData.length > 0) {
                    const sessionIds = sesData.map((s: any) => s.id);
                    const { data: excData, error: excError } = await supabase
                        .from('asistencia_excepciones')
                        .select('sesion_id, estudiante_id, estado')
                        .in('sesion_id', sessionIds);
                    
                    if (excError) throw excError;
                    setExcepciones(excData || []);
                } else {
                    setExcepciones([]);
                }
            } catch (err) {
                console.error("Error fetching attendance report:", err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchMonthlyAttendance();
    }, [selectedCursoDocenteId, date, isOpen]);

    // Get course students
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

    // Month details
    const monthDetails = useMemo(() => {
        const currentDate = new Date(date + 'T12:00:00');
        const monthName = new Intl.DateTimeFormat('es-DO', { month: 'long', year: 'numeric' }).format(currentDate);
        return {
            title: monthName.charAt(0).toUpperCase() + monthName.slice(1),
            year: currentDate.getFullYear(),
            monthName
        };
    }, [date]);

    // Compute report table data based ONLY on real recorded sessions
    const tableData = useMemo(() => {
        if (!courseStudents.length) return [];

        return courseStudents.map(st => {
            const studentRow: Record<string, string> = {};
            let countP = 0;
            let countT = 0;
            let countA = 0;
            let countE = 0;

            // Iterate over the real sessions fetched from the database
            sesiones.forEach(sesion => {
                let dbStatus = 'P'; // Default implicit presence
                const exc = excepciones.find(ex => ex.sesion_id === sesion.id && ex.estudiante_id === st.id);
                if (exc) dbStatus = exc.estado;

                if (dbStatus === 'P') countP++;
                else if (dbStatus === 'F') countA++; // F = Ausente
                else if (dbStatus === 'A') countT++; // A = Tardanza
                else if (dbStatus === 'J') countE++; // J = Excusa

                let visualStatus = 'P';
                if (dbStatus === 'F') visualStatus = 'A';
                else if (dbStatus === 'A') visualStatus = 'T';
                else if (dbStatus === 'J') visualStatus = 'E';

                studentRow[sesion.fecha] = visualStatus;
            });

            // Calculation: 3 tardanzas = 1 ausencia
            const tardanzaAbsences = Math.floor(countT / 3);
            const effectiveAbsences = countA + tardanzaAbsences;
            
            // Porcentaje = (Total present + excusa) / (Total sessions)
            const totalSessions = sesiones.length;
            let percentage = 0;
            if (totalSessions > 0) {
                const effectivePresence = totalSessions - effectiveAbsences;
                percentage = Math.max(0, Math.round((effectivePresence / totalSessions) * 100));
            }

            return {
                estudiante: st,
                row: studentRow,
                countP,
                countA,
                countT,
                countE,
                percentage
            };
        });
    }, [courseStudents, sesiones, excepciones]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-[#fcfcfa] rounded-2xl shadow-2xl max-w-6xl w-full flex flex-col max-h-[90vh] overflow-hidden transition-all duration-300">
                <header className="px-6 py-4 border-b border-[#e6e8e2] bg-white flex justify-between items-center shrink-0">
                    <div>
                        <h2 className="text-xl font-bold text-[#263128]">Informe de asistencia</h2>
                        <div className="text-sm text-[#58625a] font-medium mt-0.5">{monthDetails.title}</div>
                    </div>
                    <button onClick={onClose} className="p-2 text-[#8a918b] hover:text-[#263128] hover:bg-[#f3f7ef] rounded-lg transition-colors">
                        <X size={20} />
                    </button>
                </header>

                <div className="flex-1 overflow-y-auto p-6 flex flex-col">
                    {/* Horizontal Course Selector */}
                    {availableCursoDocentes.length > 0 && (
                        <div className="flex gap-2 overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-slate-200 shrink-0">
                            {availableCursoDocentes.map(cd => {
                                const c = state.cursos?.find(curso => curso.id === cd.cursoId);
                                if (!c) return null;
                                return (
                                    <button
                                        key={cd.id}
                                        onClick={() => setSelectedCursoDocenteId(cd.id)}
                                        className={`shrink-0 px-4 py-2 rounded-xl text-sm font-bold border transition-colors ${
                                            selectedCursoDocenteId === cd.id 
                                                ? 'bg-[#f3f7ef] border-[#689c63] text-[#263128] shadow-sm' 
                                                : 'bg-white border-[#e6e8e2] text-[#58625a] hover:bg-[#f9faf8] hover:border-[#dce3ec]'
                                        }`}
                                    >
                                        {c.grado} {c.seccion} · {cd.asignatura || 'Sin asignatura'}
                                    </button>
                                );
                            })}
                        </div>
                    )}

                    <div className="bg-white border border-[#e6e8e2] rounded-xl flex-1 flex flex-col min-h-0">
                        {isLoading ? (
                            <div className="flex-1 flex justify-center items-center p-12">
                                <div className="w-8 h-8 border-4 border-[#689c63] border-t-transparent rounded-full animate-spin"></div>
                            </div>
                        ) : sesiones.length === 0 ? (
                            <div className="flex-1 flex justify-center items-center p-12 text-center text-[#58625a]">
                                <div>
                                    <div className="text-4xl mb-3 opacity-50">🗓️</div>
                                    <div className="font-bold text-lg text-[#263128]">Sin registros</div>
                                    <div className="text-sm mt-1">No hay registros de asistencia para este curso en {monthDetails.monthName}.</div>
                                </div>
                            </div>
                        ) : tableData.length === 0 ? (
                            <div className="flex-1 flex justify-center items-center p-12 text-center text-[#58625a]">
                                No hay estudiantes en este curso.
                            </div>
                        ) : (
                            <div className="flex-1 overflow-x-auto overflow-y-auto relative">
                                <table className="w-full text-left border-collapse text-xs">
                                    <thead className="sticky top-0 z-20">
                                        <tr className="bg-[#f9faf8] shadow-[0_1px_0_#e6e8e2]">
                                            <th className="px-4 py-3 font-bold text-[#58625a] sticky left-0 bg-[#f9faf8] z-30 min-w-37.5 max-w-50 border-r border-[#e6e8e2] shadow-[1px_0_0_#e6e8e2]">
                                                Estudiante
                                            </th>
                                            {sesiones.map(sesion => {
                                                const dayStr = sesion.fecha.split('-')[2];
                                                return (
                                                    <th key={sesion.id} className="px-2 py-3 font-bold text-[#7a817b] text-center min-w-8">
                                                        {dayStr}
                                                    </th>
                                                );
                                            })}
                                            <th className="px-3 py-3 font-bold text-[#58625a] text-center border-l border-[#e6e8e2] bg-[#f9faf8] sticky right-15 shadow-[-1px_0_0_#e6e8e2] z-20">P</th>
                                            <th className="px-4 py-3 font-bold text-[#58625a] text-center bg-[#f9faf8] sticky right-0 z-20">%</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {tableData.map((row) => (
                                            <tr key={row.estudiante.id} className="border-b border-[#e6e8e2] last:border-0 hover:bg-[#f3f7ef] group">
                                                <td className="px-4 py-2 font-bold text-[#263128] sticky left-0 bg-white group-hover:bg-[#f3f7ef] z-10 border-r border-[#e6e8e2] truncate shadow-[1px_0_0_#e6e8e2]" title={`${row.estudiante.nombre} ${row.estudiante.apellido}`}>
                                                    {row.estudiante.nombre.split(' ')[0]} {row.estudiante.apellido.split(' ')[0]}
                                                </td>
                                                {sesiones.map(sesion => {
                                                    const status = row.row[sesion.fecha];
                                                    return (
                                                        <td key={sesion.id} className={`px-2 py-2 text-center font-bold text-sm ${statusColors[status] || 'text-[#7a817b]'}`}>
                                                            {status}
                                                        </td>
                                                    );
                                                })}
                                                <td className="px-3 py-2 text-center font-medium border-l border-[#e6e8e2] bg-white group-hover:bg-[#f3f7ef] sticky right-15 shadow-[-1px_0_0_#e6e8e2] z-10">{row.countP}</td>
                                                <td className={`px-4 py-2 text-center font-bold bg-white group-hover:bg-[#f3f7ef] sticky right-0 z-10 shadow-[-1px_0_0_#e6e8e2] ${row.percentage < 80 ? 'text-[#c63d3d]' : 'text-[#689c63]'}`}>
                                                    {row.percentage}%
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>

                <footer className="px-6 py-4 border-t border-[#e6e8e2] bg-[#fcfcfa] shrink-0">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex flex-wrap gap-x-5 gap-y-2 text-xs font-bold uppercase tracking-wider text-[#7a817b]">
                            <span><span className="text-[#689c63] font-black text-sm mr-1">P</span> Presente</span>
                            <span><span className="text-[#eb8847] font-black text-sm mr-1">T</span> Tardanza</span>
                            <span><span className="text-[#c63d3d] font-black text-sm mr-1">A</span> Ausente</span>
                            <span><span className="text-[#537bac] font-black text-sm mr-1">E</span> Excusa</span>
                        </div>
                        
                        <div className="relative">
                            <button 
                                onClick={() => setShowLegend(!showLegend)} 
                                className="text-xs font-semibold text-[#537bac] hover:underline"
                            >
                                {showLegend ? 'Ocultar cálculo' : 'Ver cómo se calcula'}
                            </button>
                            
                            {showLegend && (
                                <div className="absolute bottom-full right-0 mb-2 w-72 p-4 bg-white rounded-xl shadow-lg border border-[#e6e8e2] text-xs text-[#2b405c] leading-relaxed animate-in fade-in slide-in-from-bottom-2 z-50">
                                    <h5 className="font-bold mb-1.5 text-[#263128]">Códigos de asistencia diaria</h5>
                                    <p className="mb-2.5 text-[#58625a]">En la hoja de asistencia del registro escolar, cada día se marca según corresponda: P, T, A o E.</p>
                                    <ul className="list-disc pl-4 mb-3 space-y-1">
                                        <li><strong className="text-[#263128]">P</strong>: Presente</li>
                                        <li><strong className="text-[#263128]">T</strong>: Tardanza — 3 tardanzas cuentan como 1 ausencia</li>
                                        <li><strong className="text-[#263128]">A</strong>: Ausente — falta sin justificación</li>
                                        <li><strong className="text-[#263128]">E</strong>: Excusa — ausencia justificada por padre, madre o tutor</li>
                                    </ul>
                                    <h5 className="font-bold mb-1 text-[#263128]">Porcentaje de asistencia mensual</h5>
                                    <p className="bg-[#f9faf8] p-2 rounded-lg border border-[#e6e8e2] font-mono text-[10px] my-1 text-[#58625a]">
                                        (Total de días presentes / Total de sesiones en el mes) × 100
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </footer>
            </div>
        </div>
    );
}
