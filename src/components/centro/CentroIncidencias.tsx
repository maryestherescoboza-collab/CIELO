import { useMemo, useState } from 'react';
import { Search, ChevronDown, FileDown, AlertTriangle } from 'lucide-react';
import { useAppStore } from '../../store/appStore';
import { buildIncidenciaReport } from '../../templates/incidenciaReport';
import { normalize, GRAVEDAD_LABELS } from './centroUi';
import type { Incidencia } from '../../types';

interface Props {
    centroId: string;
    centroNombre?: string;
    centroCodigo?: string;
}

export default function CentroIncidencias({ centroId, centroNombre, centroCodigo }: Props) {
    const state = useAppStore(s => s.state);

    const centroSharedIds = useMemo(() => {
        const set = new Set<string>();
        (state.cursos || [])
            .filter(c => c.centroId === centroId)
            .forEach(c => { if (c.sharedCourseId) set.add(c.sharedCourseId); });
        return set;
    }, [state.cursos, centroId]);

    const incidenciasCentro = useMemo(() =>
        (state.incidencias || []).filter(i => centroSharedIds.has(i.sharedCourseId || '')),
        [state.incidencias, centroSharedIds]
    );

    const [buscarDocente, setBuscarDocente] = useState('');
    const [buscarEstudiante, setBuscarEstudiante] = useState('');
    const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());

    const incidenciasFiltradas = useMemo(() => {
        return incidenciasCentro.filter(i => {
            const estudiante = state.estudiantes.find(e => e.id === i.estudianteId);
            const docente = state.perfiles.find(p => p.userId === i.userId);
            const nombreEst = estudiante ? `${estudiante.nombre} ${estudiante.apellido}` : '';
            const nombreDoc = docente?.nombreDocente || '';
            const okDocente = buscarDocente.trim() === '' || normalize(nombreDoc).includes(normalize(buscarDocente));
            const okEstudiante = buscarEstudiante.trim() === '' || normalize(nombreEst).includes(normalize(buscarEstudiante));
            return okDocente && okEstudiante;
        }).sort((a, b) => (b.fecha || '').localeCompare(a.fecha || ''));
    }, [incidenciasCentro, state.estudiantes, state.perfiles, buscarDocente, buscarEstudiante]);

    const toggleExpand = (id: number) => {
        setExpandedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const descargarInforme = (incidencia: Incidencia) => {
        const estudiante = state.estudiantes.find(e => e.id === incidencia.estudianteId);
        const docente = state.perfiles.find(p => p.userId === incidencia.userId);
        const curso = state.cursos.find(c => c.sharedCourseId === incidencia.sharedCourseId);
        const html = buildIncidenciaReport({
            incidencia,
            estudiante,
            docente,
            curso,
            centroNombre,
            centroCodigo,
        });
        const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        const nombreEst = estudiante ? `${estudiante.nombre}_${estudiante.apellido}` : 'estudiante';
        a.href = url;
        a.download = `informe-incidencia-${nombreEst}-${incidencia.id}.html`;
        a.click();
        URL.revokeObjectURL(url);
    };

    return (
        <section className="bg-[#F9F8F6] border border-[#E6E1D8] rounded-2xl shadow-[0_1px_2px_rgba(0,0,0,0.04),0_12px_32px_rgba(0,0,0,0.05)] overflow-hidden">
            <header className="px-5 py-3.5 border-b border-[#E6E1D8] flex items-center gap-3">
                <span className="w-9 h-9 rounded-xl bg-white border border-[#E6E1D8] flex items-center justify-center text-[#6F94AF] shrink-0">
                    <AlertTriangle size={16} />
                </span>
                <div>
                    <h2 className="text-[15px] font-semibold text-[#3F3C36]">Incidencias</h2>
                    <p className="text-[12px] text-[#6B7280] mt-0.5">Registro anecdótico de los estudiantes</p>
                </div>
            </header>

            <div className="px-5 py-3.5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="flex items-center gap-2 bg-white border border-[#E6E1D8] rounded-xl px-3.5 focus-within:border-[#6F94AF] focus-within:ring-2 focus-within:ring-[#6F94AF]/20 transition-all shadow-sm">
                        <Search size={14} className="text-[#6B7280] shrink-0" />
                        <input
                            type="text"
                            placeholder="Buscar por docente…"
                            value={buscarDocente}
                            onChange={(e) => setBuscarDocente(e.target.value)}
                            className="bg-transparent border-none outline-none text-[13px] text-[#3F3C36] placeholder:text-[#6B7280]/60 w-full py-2.5"
                        />
                    </div>
                    <div className="flex items-center gap-2 bg-white border border-[#E6E1D8] rounded-xl px-3.5 focus-within:border-[#6F94AF] focus-within:ring-2 focus-within:ring-[#6F94AF]/20 transition-all shadow-sm">
                        <Search size={14} className="text-[#6B7280] shrink-0" />
                        <input
                            type="text"
                            placeholder="Buscar por estudiante…"
                            value={buscarEstudiante}
                            onChange={(e) => setBuscarEstudiante(e.target.value)}
                            className="bg-transparent border-none outline-none text-[13px] text-[#3F3C36] placeholder:text-[#6B7280]/60 w-full py-2.5"
                        />
                    </div>
                </div>

                <div className="mt-3.5 grid grid-cols-1 xl:grid-cols-2 gap-4">
                    {incidenciasFiltradas.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-[#E6E1D8] bg-white/60 px-5 py-10 text-center">
                            <p className="text-[13px] text-[#6B7280]">No se encontraron incidencias</p>
                        </div>
                    ) : (
                        incidenciasFiltradas.map(inc => {
                            const estudiante = state.estudiantes.find(e => e.id === inc.estudianteId);
                            const docente = state.perfiles.find(p => p.userId === inc.userId);
                            const curso = state.cursos.find(c => c.sharedCourseId === inc.sharedCourseId);
                            const expanded = expandedIds.has(inc.id);
                            const iniciales = `${estudiante?.nombre?.[0] || ''}${estudiante?.apellido?.[0] || ''}`.toUpperCase() || '?';
                            return (
                                <article key={inc.id} className="bg-white border border-[#E6E1D8] rounded-xl p-4 shadow-sm">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex items-center gap-2.5 min-w-0">
                                            <span className="w-8 h-8 rounded-full bg-[#6F94AF]/10 text-[#6F94AF] flex items-center justify-center text-[12px] font-bold shrink-0">
                                                {iniciales}
                                            </span>
                                            <div className="min-w-0">
                                                <h3 className="text-[13px] font-semibold text-[#3F3C36] truncate">
                                                    {estudiante?.nombre} {estudiante?.apellido}
                                                </h3>
                                                <p className="text-[11px] text-[#6B7280]">
                                                    {inc.categoria} · {GRAVEDAD_LABELS[inc.gravedad] || inc.gravedad}
                                                </p>
                                            </div>
                                        </div>
                                        <span className="text-[11px] text-[#6B7280] shrink-0">{inc.fecha}</span>
                                    </div>

                                    <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1.5">
                                        <div>
                                            <dt className="text-[11px] font-medium uppercase tracking-wide text-[#6B7280]">Curso</dt>
                                            <dd className="mt-0.5 text-[12px] font-medium text-[#3F3C36]">
                                                {curso ? `${curso.grado} ${curso.seccion}` : '—'}
                                            </dd>
                                        </div>
                                        <div>
                                            <dt className="text-[11px] font-medium uppercase tracking-wide text-[#6B7280]">Docente</dt>
                                            <dd className="mt-0.5 text-[12px] font-medium text-[#3F3C36] truncate">{docente?.nombreDocente || 'Docente'}</dd>
                                        </div>
                                    </dl>

                                    {expanded && (
                                        <p className="mt-3 text-[12px] text-[#3F3C36] leading-relaxed whitespace-pre-wrap">
                                            {inc.descripcion}
                                        </p>
                                    )}

                                    {expanded && (
                                        <div className="mt-3 rounded-lg bg-[#F9F8F6] border border-[#E6E1D8] p-3 space-y-2.5">
                                            <div>
                                                <p className="text-[10px] font-medium uppercase tracking-wide text-[#6B7280]">Acciones pedagógicas</p>
                                                <p className="mt-0.5 text-[12px] text-[#3F3C36]">
                                                    {inc.accionesTomadas?.length ? inc.accionesTomadas.join(' · ') : 'Sin acciones registradas'}
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-medium uppercase tracking-wide text-[#6B7280]">Acuerdos y compromisos</p>
                                                <p className="mt-0.5 text-[12px] text-[#3F3C36]">{inc.acuerdos || 'Sin acuerdos registrados'}</p>
                                            </div>
                                        </div>
                                    )}

                                    <div className="mt-3 flex items-center gap-2">
                                        <button
                                            onClick={() => toggleExpand(inc.id)}
                                            className="inline-flex items-center gap-1.5 rounded-lg border border-[#E6E1D8] bg-white text-[12px] font-medium text-[#3F3C36] px-3 py-1.5 hover:bg-[#F9F8F6] transition-colors"
                                        >
                                            <ChevronDown size={14} className={`transition-transform ${expanded ? 'rotate-180' : ''}`} />
                                            {expanded ? 'Ocultar detalles' : 'Ver detalles'}
                                        </button>
                                        <button
                                            onClick={() => descargarInforme(inc)}
                                            className="inline-flex items-center gap-1.5 rounded-lg border border-[#E6E1D8] bg-white text-[12px] font-medium text-[#3F3C36] px-3 py-1.5 hover:bg-[#F9F8F6] transition-colors"
                                        >
                                            <FileDown size={14} />
                                            Descargar
                                        </button>
                                    </div>
                                </article>
                            );
                        })
                    )}
                </div>
            </div>
        </section>
    );
}
