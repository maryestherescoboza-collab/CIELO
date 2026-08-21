import { useMemo, useState } from 'react';
import { ChevronDown, Download, FileDown } from 'lucide-react';
import { useAppStore } from '../../store/appStore';
import { getAsignaturaNombre } from '../../constants/asignaturas';
import { estudiantesDelCurso, obtenerDocenteResponsable } from '../../utils/aislamiento';
import type { Curso } from '../../types';
import BoletinesPrintOverlay from './BoletinesPrintOverlay';

interface Props {
    centroId: string;
    centroNombre: string;
}

export default function CentroBoletines({ centroId, centroNombre }: Props) {
    const state = useAppStore(s => s.state);

    const cursosCentro = useMemo(() => {
        const seen = new Set<string>();
        return (state.cursos || [])
            .filter(c => c.centroId === centroId)
            .filter(c => {
                const key = c.sharedCourseId || String(c.id);
                if (seen.has(key)) return false;
                seen.add(key);
                return true;
            })
            .sort((a, b) => (a.grado || '').localeCompare(b.grado || '', 'es') || (a.seccion || '').localeCompare(b.seccion || ''));
    }, [state.cursos, centroId]);

    const [selectedCursoId, setSelectedCursoId] = useState<number | null>(null);
    const [printCurso, setPrintCurso] = useState<Curso | null>(null);

    const selectedCurso = useMemo(
        () => cursosCentro.find(c => c.id === selectedCursoId) || null,
        [cursosCentro, selectedCursoId]
    );

    const estudiantesCurso = useMemo(() =>
        selectedCurso
            ? estudiantesDelCurso(state.cursos, state.estudiantes, selectedCurso, centroId)
            : [],
        [state.cursos, state.estudiantes, selectedCurso, centroId]
    );

    // Docente responsable real del curso (curso.userId → perfil), nunca el
    // administrador que genera el boletín.
    const docenteBoletin = useMemo(
        () => obtenerDocenteResponsable(state.perfiles, selectedCurso),
        [state.perfiles, selectedCurso]
    );

    return (
        <section className="bg-[#F9F8F6] border border-[#E6E1D8] rounded-2xl shadow-[0_1px_2px_rgba(0,0,0,0.04),0_12px_32px_rgba(0,0,0,0.05)] overflow-hidden">
            <header className="px-5 py-3.5 border-b border-[#E6E1D8] flex items-center gap-3">
                <span className="w-9 h-9 rounded-xl bg-white border border-[#E6E1D8] flex items-center justify-center text-primary shrink-0">
                    <FileDown size={16} />
                </span>
                <div>
                    <h2 className="text-[15px] font-semibold text-[#3F3C36]">Boletines</h2>
                    <p className="text-[12px] text-[#6B7280] mt-0.5">Cursos de la institución y descarga de calificaciones</p>
                </div>
            </header>

            <div className="px-5 py-3.5">
                <label className="block text-[12px] font-medium text-[#6B7280] mb-2">Seleccionar curso</label>
                <div className="relative max-w-md">
                    <select
                        value={selectedCursoId ?? ''}
                        onChange={(e) => setSelectedCursoId(e.target.value ? Number(e.target.value) : null)}
                        className="w-full appearance-none bg-white border border-[#E6E1D8] rounded-xl pl-4 pr-10 py-3 text-[13px] text-[#3F3C36] outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all shadow-sm cursor-pointer"
                    >
                        <option value="">Elegir un curso…</option>
                        {cursosCentro.map(c => (
                            <option key={c.id} value={c.id}>
                                {c.grado} {c.seccion} · {getAsignaturaNombre(c.asignatura)}
                            </option>
                        ))}
                    </select>
                    <ChevronDown size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#6B7280] pointer-events-none" />
                </div>

                {cursosCentro.length === 0 ? (
                    <div className="mt-6 rounded-2xl border border-dashed border-[#E6E1D8] bg-white/60 px-5 py-8 text-center">
                        <p className="text-[13px] text-[#6B7280]">Aún no hay cursos registrados en esta institución.</p>
                    </div>
                ) : selectedCurso ? (
                    <div className="mt-6 rounded-2xl bg-white border border-[#E6E1D8] p-6 shadow-sm">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                            <div>
                                <p className="text-xs font-medium uppercase tracking-wide text-[#6B7280]">Curso</p>
                                <p className="mt-1 text-[14px] font-semibold text-[#3F3C36]">{selectedCurso.grado} {selectedCurso.seccion}</p>
                                <p className="text-[12px] text-[#6B7280]">{getAsignaturaNombre(selectedCurso.asignatura)}</p>
                            </div>
                            <div>
                                <p className="text-xs font-medium uppercase tracking-wide text-[#6B7280]">Docente</p>
                                <p className="mt-1 text-[14px] font-semibold text-[#3F3C36]">{docenteBoletin}</p>
                            </div>
                            <div>
                                <p className="text-xs font-medium uppercase tracking-wide text-[#6B7280]">Estudiantes</p>
                                <p className="mt-1 text-[14px] font-semibold text-[#3F3C36]">{estudiantesCurso.length}</p>
                            </div>
                        </div>
                        <button
                            onClick={() => setPrintCurso(selectedCurso)}
                            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-primary text-white text-[13px] font-semibold px-4 py-2.5 hover:bg-[#5F839E] transition-colors"
                        >
                            <Download size={15} />
                            Descargar boletines
                        </button>
                    </div>
                ) : (
                    <p className="mt-6 text-[13px] text-[#6B7280]">
                        Selecciona un curso para ver el resumen y descargar los boletines.
                    </p>
                )}
            </div>

            {printCurso && (
                <BoletinesPrintOverlay
                    curso={printCurso}
                    centroId={centroId}
                    state={{ ...state, instituto: centroNombre }}
                    docenteNombre={docenteBoletin}
                    onClose={() => setPrintCurso(null)}
                />
            )}
        </section>
    );
}
