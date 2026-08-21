import { useState, useMemo } from 'react';
import { ChevronLeft, Printer, GraduationCap, Users } from 'lucide-react';
import { getAsignaturaNombre } from '../constants/asignaturas';
import type { AppState, BCKey, Screen, CursoDocente } from '../types';
import { calculateStudentPeriodBC } from '../utils/academic';
import { esEstudianteDelCurso } from '../utils/aislamiento';

interface Props {
    state: AppState;
    currentCourseRole?: CursoDocente;
    cursoId: number;
    onNavigate: (s: Screen) => void;
}

export default function CalificacionesAnuales({ state, currentCourseRole, cursoId, onNavigate }: Props) {
    const curso = state.cursos.find(c => c.id === cursoId);
    const [editingExtra, setEditingExtra] = useState<Record<number, Record<string, number>>>({});

    // Aislamiento institucional: el centro del curso (o el contexto activo)
    // subordina cualquier relación por sharedCourseId.
    const centroContexto = curso?.centroId || state.centroRolActual?.centro_id || null;

    const cursosCentro = useMemo(() => {
        const m = new Map<number, string>();
        state.cursos.forEach(c => { if (c.centroId) m.set(c.id, c.centroId); });
        return m;
    }, [state.cursos]);

    const students = useMemo(() => {
        if (!curso) return [];
        return state.estudiantes
            .filter(e => esEstudianteDelCurso(state.cursos, curso, e, centroContexto))
            .sort((a, b) => a.apellido.localeCompare(b.apellido));
    }, [state.estudiantes, state.cursos, curso, centroContexto]);

    const reportData = useMemo(() => {
        return students.map((est, idx) => {

            const calculatePC = (bc: BCKey) => {
                const targetAsignatura = currentCourseRole?.asignatura || curso?.asignatura;
                const periods: ('P1' | 'P2' | 'P3' | 'P4')[] = ['P1', 'P2', 'P3', 'P4'];

                const periodScores = periods.map(p => {
                    const { final } = calculateStudentPeriodBC({
                        estudianteId: est.id,
                        bc,
                        periodo: p,
                        actividades: state.actividades,
                        calificaciones: state.calificaciones,
                        recuperaciones: state.recuperaciones,
                        cursoId,
                        sharedCourseId: curso?.sharedCourseId,
                        targetAsignatura,
                        centroId: centroContexto,
                        cursosCentro,
                        cursos: state.cursos,
                        curso,
                    });
                    return final;
                });

                const validScores = periodScores.filter(v => v !== null) as number[];
                return validScores.length > 0
                    ? Math.round(validScores.reduce((acc, score) => acc + score, 0) / validScores.length)
                    : 0;
            };

            const pc1 = calculatePC('BC1');
            const pc2 = calculatePC('BC2');
            const pc3 = calculatePC('BC3');
            const pc4 = calculatePC('BC4');

            const cf = Math.round((pc1 + pc2 + pc3 + pc4) / 4);

            let cf50: number | string = '';
            let cec: number | string = '';
            let cec50: number | string = '';
            let ccf: number | string = '';

            let cf30: number | string = '';
            let ceex: number | string = '';
            let ceex70: number | string = '';
            let cexf: number | string = '';

            let cfSpec: number | string = '';
            let ceSpec: number | string = '';
            let finalEspecial = 0;

            let finalGrade = cf;

            if (cf < 70) {
                cf50 = parseFloat((cf * 0.5).toFixed(1));
                cec = editingExtra[est.id]?.cec ?? 0;
                cec50 = parseFloat((cec * 0.5).toFixed(1));
                ccf = Math.round(cf50 + cec50);

                finalGrade = ccf;

                if (ccf < 70) {
                    cf30 = parseFloat((cf * 0.3).toFixed(1));
                    ceex = editingExtra[est.id]?.ceex ?? 0;
                    ceex70 = parseFloat((ceex * 0.7).toFixed(1));
                    cexf = Math.round(cf30 + ceex70);

                    finalGrade = cexf;

                    if (cexf < 70) {
                        cfSpec = editingExtra[est.id]?.cfSpec ?? cf;
                        ceSpec = editingExtra[est.id]?.ceSpec ?? 0;
                        finalEspecial = cfSpec + ceSpec;

                        if (finalEspecial > finalGrade) {
                            finalGrade = finalEspecial;
                        }
                    }
                }
            }

            const isAproved = finalGrade >= 70;

            return {
                id: est.id,
                num: idx + 1,
                name: `${est.apellido}, ${est.nombre}`,
                pc1, pc2, pc3, pc4,
                cf, cf50, cec, cec50, ccf,
                cf30, ceex, ceex70, cexf,
                cfSpec, ceSpec,
                finalGrade,
                isAproved
            };
        });
    }, [students, state.calificaciones, state.actividades, state.recuperaciones, state.cursos, editingExtra, cursoId, curso, centroContexto, cursosCentro]);

    const handleManualInput = (estId: number, field: string, value: string) => {
        const val = parseFloat(value) || 0;
        setEditingExtra(prev => ({
            ...prev,
            [estId]: {
                ...(prev[estId] || {}),
                [field]: val
            }
        }));
    };

    const handlePrint = () => {
        window.print();
    };

    if (!curso) return null;

    return (
        <div className="min-h-screen bg-(--background) p-4 md:p-8 print:p-0 font-body">
            <style>{`
                @media print {
                    @page {
                        size: A4;
                        margin: 10mm;
                    }
                    body {
                        transform: scale(0.62);
                        transform-origin: top left;
                        width: 161.29% !important;
                    }
                }
            `}</style>
            {/* Header / Tools */}
            <div className="max-w-300 mx-auto mb-8 flex flex-col md:flex-row md:items-center justify-between gap-6 print:hidden">
                <div>
                    <button
                        onClick={() => onNavigate('cursos')}
                        className="flex items-center gap-2 text-(--ink-soft) hover:text-(--danger) transition-colors font-bold text-sm mb-4 animate-in fade-in"
                    >
                        <ChevronLeft size={18} />
                        Volver a Cursos
                    </button>
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-sm" style={{ background: curso.color }}>
                            <GraduationCap size={24} />
                        </div>
                        <div>
                            <h1 className="text-2xl font-black text-(--ink) tracking-tight">{curso.nombre}</h1>
                            <div className="flex items-center gap-3 mt-1">
                                <p className="text-sm font-semibold text-(--ink-soft) uppercase tracking-widest">{getAsignaturaNombre(currentCourseRole?.asignatura || curso.asignatura)} · Reporte Anual</p>
                                {currentCourseRole && (
                                    <>
                                        <span className="w-1 h-1 rounded-full bg-(--border-soft)"></span>
                                        {currentCourseRole.rol === 'tutor' ? (
                                            <span className="px-2 py-0.5 rounded text-xs font-black uppercase tracking-wider border text-white" style={{ backgroundColor: 'var(--success)', borderColor: 'var(--success)' }}>
                                                Tutor
                                            </span>
                                        ) : (
                                            <span className="bg-(--tag-yellow-bg) text-(--tag-yellow-text) px-2 py-0.5 rounded text-xs font-black uppercase tracking-wider border border-(--border-soft)">
                                                Co-docente ({getAsignaturaNombre(currentCourseRole.asignatura)})
                                            </span>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button onClick={handlePrint} className="bg-white border border-(--border-soft) text-(--ink) px-6 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-(--linen)/20 transition-all cursor-pointer">
                        <Printer size={18} className="text-(--ink-soft)" />
                        Imprimir Reporte
                    </button>
                </div>
            </div>

            <main className="max-w-300 mx-auto overflow-x-auto bg-white shadow-sm rounded-(--radius-lg) border border-(--border-soft) p-6 md:p-10 print:shadow-none print:border-none print:p-0">

                <div className="overflow-x-auto">
                    <table className="table-compact w-full border-collapse border border-(--ink) text-[13px]">
                        <thead>
                            <tr className="bg-(--linen)/20">
                                <th className="border border-(--ink) w-10 px-1 py-1 text-center" rowSpan={3}>Nº</th>
                                <th className="border border-(--ink) px-4 py-2 text-left font-black uppercase tracking-wider" rowSpan={3}>
                                    Nombres de los Estudiantes
                                </th>
                                <th className="border border-(--ink) px-4 py-2 text-center font-black uppercase tracking-wider" colSpan={5}>
                                    CALIFICACIONES DEL AÑO ESCOLAR
                                </th>
                                <th className="border border-(--ink) bg-(--linen)/45 px-4 py-2 text-center font-black uppercase tracking-wider" colSpan={4}>
                                    CALIFICACIÓN COMPLETIVA
                                </th>
                                <th className="border border-(--ink) px-4 py-2 text-center font-black uppercase tracking-wider" colSpan={4}>
                                    CALIFICACIONES EXTRAORDINARIAS
                                </th>
                                <th className="border border-(--ink) bg-(--linen)/45 px-4 py-2 text-center font-black uppercase tracking-wider" colSpan={2}>
                                    CALIFICACIONES ESPECIALES
                                </th>
                                <th className="border border-(--ink) px-4 py-2 text-center font-black uppercase tracking-wider" colSpan={2}>
                                    SITUACIÓN FINAL
                                </th>
                            </tr>
                            <tr className="bg-(--linen)/20">
                                <th className="border border-(--ink) text-xs py-2 px-1 font-bold leading-tight" colSpan={4}>
                                    PROMEDIO DE GRUPOS DE<br />COMPETENCIAS ESPECÍFICAS
                                </th>
                                <th className="border border-(--ink) text-xs font-black p-2" rowSpan={2}>C.F</th>

                                <th className="border border-(--ink) bg-(--linen)/45 text-xs font-black p-1" rowSpan={2}>50%<br />C.F.</th>
                                <th className="border border-(--ink) bg-(--linen)/45 text-xs font-black p-1" rowSpan={2}>C.E.C</th>
                                <th className="border border-(--ink) bg-(--linen)/45 text-xs font-black p-1" rowSpan={2}>50%<br />C.E.C</th>
                                <th className="border border-(--ink) bg-(--linen)/45 text-xs font-black p-2" rowSpan={2}>C.C.F</th>

                                <th className="border border-(--ink) text-xs font-black p-1" rowSpan={2}>30%<br />C.F</th>
                                <th className="border border-(--ink) text-xs font-black p-1" rowSpan={2}>C.<br />E.EX</th>
                                <th className="border border-(--ink) text-xs font-black p-1" rowSpan={2}>70%<br />C.E.EX</th>
                                <th className="border border-(--ink) text-xs font-black p-2" rowSpan={2}>C.EX.F</th>

                                <th className="border border-(--ink) bg-(--linen)/45 text-xs font-black p-2" rowSpan={2}>C.F</th>
                                <th className="border border-(--ink) bg-(--linen)/45 text-xs font-black p-2" rowSpan={2}>C.E.</th>

                                <th className="border border-(--ink) text-xs font-black p-2" rowSpan={2}>A</th>
                                <th className="border border-(--ink) text-xs font-black p-2" rowSpan={2}>R</th>
                            </tr>
                            <tr className="bg-(--linen)/20 text-xs font-black">
                                <th className="border border-(--ink) p-1">PC1</th>
                                <th className="border border-(--ink) p-1">PC2</th>
                                <th className="border border-(--ink) p-1">PC3</th>
                                <th className="border border-(--ink) p-1">PC4</th>
                            </tr>
                        </thead>
                        <tbody>
                            {reportData.map((row) => (
                                <tr key={row.id} className="hover:bg-(--linen)/10 transition-colors">
                                    <td className="border border-(--ink) font-black text-center bg-(--linen)/10 p-1 text-xs">{row.num}</td>
                                    <td className="border border-(--ink) px-4 py-1.5 font-bold text-left">{row.name}</td>
                                    <td className="border border-(--ink) p-1 text-center font-bold">{row.pc1 || ''}</td>
                                    <td className="border border-(--ink) p-1 text-center font-bold">{row.pc2 || ''}</td>
                                    <td className="border border-(--ink) p-1 text-center font-bold">{row.pc3 || ''}</td>
                                    <td className="border border-(--ink) p-1 text-center font-bold">{row.pc4 || ''}</td>
                                    <td className="border border-(--ink) p-1 text-center font-black bg-(--tag-yellow-bg)/20 text-(--tag-yellow-text)">{row.cf || ''}</td>

                                    <td className="border border-(--ink) bg-(--linen)/45 p-1 text-center text-(--ink-soft)">{row.cf50 || ''}</td>
                                    <td className="border border-(--ink) bg-white p-0 text-center">
                                        {row.cf < 70 && (
                                            <input
                                                type="number"
                                                className="w-full h-full border-none p-1 text-center font-bold bg-transparent focus:ring-1 focus:ring-(--primary) outline-none print:bg-transparent"
                                                value={row.cec || ''}
                                                onChange={(e) => handleManualInput(row.id, 'cec', e.target.value)}
                                            />
                                        )}
                                    </td>
                                    <td className="border border-(--ink) bg-(--linen)/45 p-1 text-center text-(--ink-soft)">{row.cec50 || ''}</td>
                                     <td className="border border-(--ink) bg-(--linen)/45 p-1 text-center font-black">{row.ccf || ''}</td>
                                    <td className="border border-(--ink) p-1 text-center text-(--ink-soft)">{row.cf30 || ''}</td>
                                    <td className="border border-(--ink) p-0 text-center">
                                        {typeof row.ccf === 'number' && row.ccf < 70 && (
                                            <input
                                                type="number"
                                                className="w-full h-full border-none p-1 text-center font-bold bg-transparent focus:ring-1 focus:ring-(--primary) outline-none"
                                                value={row.ceex || ''}
                                                onChange={(e) => handleManualInput(row.id, 'ceex', e.target.value)}
                                            />
                                        )}
                                    </td>
                                    <td className="border border-(--ink) p-1 text-center text-(--ink-soft)">{row.ceex70 || ''}</td>
                                    <td className="border border-(--ink) p-1 text-center font-black">{row.cexf || ''}</td>
 
                                    <td className="border border-(--ink) bg-(--linen)/45 p-0 text-center">
                                        {typeof row.cexf === 'number' && row.cexf < 70 && (
                                            <input
                                                type="number"
                                                className="w-full h-full border-none p-1 text-center font-bold bg-transparent focus:ring-1 focus:ring-(--primary) outline-none"
                                                value={row.cfSpec || ''}
                                                onChange={(e) => handleManualInput(row.id, 'cfSpec', e.target.value)}
                                            />
                                        )}
                                    </td>
                                    <td className="border border-(--ink) bg-(--linen)/45 p-0 text-center">
                                        {typeof row.cexf === 'number' && row.cexf < 70 && (
                                            <input
                                                type="number"
                                                className="w-full h-full border-none p-1 text-center font-bold bg-transparent focus:ring-1 focus:ring-(--primary) outline-none"
                                                value={row.ceSpec || ''}
                                                onChange={(e) => handleManualInput(row.id, 'ceSpec', e.target.value)}
                                            />
                                        )}
                                    </td>

                                    <td className="border border-(--ink) p-1 text-center font-black text-(--success) bg-(--success)/10">
                                        {row.isAproved ? row.finalGrade : ''}
                                    </td>
                                    <td className="border border-(--ink) p-1 text-center font-black text-(--danger) bg-(--danger)/10">
                                        {!row.isAproved ? row.finalGrade : ''}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <footer className="mt-8 pt-8 border-t border-(--border-soft)">
                    <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-xs font-black uppercase tracking-wider text-(--ink-soft) opacity-40">
                        <span><strong>PC=</strong> Promedio Grupo de Competencias Específicas.</span>
                        <span><strong>C.F.=</strong> Calificación Final.</span>
                        <span><strong>C.E.C.=</strong> Calificación Evaluacion Completiva.</span>
                        <span><strong>C.C.F.=</strong> Calificación Completiva Final.</span>
                        <span><strong>C.E.EX=</strong> Calificación Evaluación Extraordinaria.</span>
                        <span><strong>C.EX.F.=</strong> Calificación Extraordinaria Final.</span>
                        <span><strong>A=</strong> Aprobado.</span>
                        <span><strong>R=</strong> Reprobado.</span>
                    </div>
                </footer>
            </main>

            <div className="max-w-300 mx-auto mt-6 px-4 print:hidden">
                <div className="flex items-center gap-2 text-(--ink-soft) text-xs font-black uppercase tracking-widest bg-white/50 p-4 rounded-2xl border border-(--border-soft)">
                    <Users size={14} />
                    <span>Mostrando registros de {students.length} estudiantes según los datos almacenados en curso_detalle.</span>
                </div>
            </div>
        </div>
    );
}
