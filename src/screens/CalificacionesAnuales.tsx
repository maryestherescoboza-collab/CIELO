import { useState, useMemo } from 'react';
import { ChevronLeft, Printer, FileDown, GraduationCap, Users } from 'lucide-react';
import { getAsignaturaNombre } from '../constants/asignaturas';
import type { AppState, BCKey, Screen, CursoDocente } from '../types';

interface Props {
    state: AppState;
    currentCourseRole?: CursoDocente;
    cursoId: number;
    onNavigate: (s: Screen) => void;
}

export default function CalificacionesAnuales({ state, currentCourseRole, cursoId, onNavigate }: Props) {
    const curso = state.cursos.find(c => c.id === cursoId);
    const [editingExtra, setEditingExtra] = useState<Record<number, Record<string, number>>>({});

    const students = useMemo(() =>
        state.estudiantes
            .filter(e => e.sharedCourseId === curso?.sharedCourseId)
            .sort((a, b) => a.apellido.localeCompare(b.apellido)),
        [state.estudiantes, curso?.sharedCourseId]
    );

    const reportData = useMemo(() => {
        return students.map((est, idx) => {

            const calculatePC = (bc: BCKey) => {
                const targetAsignatura = currentCourseRole?.asignatura || curso?.asignatura;

                const califs = state.calificaciones.filter(c =>
                    c.estudianteId === est.id &&
                    (c.cursoId === cursoId || (curso?.sharedCourseId && c.sharedCourseId === curso.sharedCourseId)) &&
                    (!targetAsignatura || c.asignatura === targetAsignatura) &&
                    c.competencias?.includes(bc) &&
                    c.puntaje !== null
                );
                
                const avg = califs.length > 0 
                    ? Math.round(califs.reduce((acc, c) => acc + (c.puntaje as number), 0) / califs.length)
                    : 0;

                // Recovery logic extension
                if (avg < 70 || califs.length === 0) {
                    const bcNumber = Number(bc.replace('BC', ''));

                    const rec = (state.recuperaciones || [])
                        .filter(r => 
                            r.estudianteId === est.id &&
                            (r.cursoId === cursoId || (curso?.sharedCourseId && r.sharedCourseId === curso.sharedCourseId)) &&
                            (!targetAsignatura || r.asignatura === targetAsignatura) &&
                            Number(r.bc) === bcNumber
                        )
                        .sort((a, b) => {
                            const dateA = a.fecha ? new Date(a.fecha).getTime() : 0;
                            const dateB = b.fecha ? new Date(b.fecha).getTime() : 0;
                            return dateB - dateA;
                        })[0];

                    if (rec && rec.puntaje !== null) {
                        return rec.puntaje;
                    }
                }
                
                return avg;
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
    }, [students, state.calificaciones, editingExtra, cursoId]);

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
        <div className="min-h-screen bg-white p-4 md:p-8 print:p-0 font-body">
            {/* Header / Tools */}
            <div className="max-w-300 mx-auto mb-8 flex flex-col md:flex-row md:items-center justify-between gap-6 print:hidden">
                <div>
                    <button
                        onClick={() => onNavigate('cursos')}
                        className="flex items-center gap-2 text-(--ink-soft) hover:text-red-ochre transition-colors font-bold text-sm mb-4"
                    >
                        <ChevronLeft size={18} />
                        Volver a Cursos
                    </button>
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-lg" style={{ background: curso.color }}>
                            <GraduationCap size={24} />
                        </div>
                        <div>
                            <h1 className="text-2xl font-black text-(--ink) tracking-tight">{curso.nombre}</h1>
                            <div className="flex items-center gap-3 mt-1">
                                <p className="text-sm font-semibold text-(--ink-soft) uppercase tracking-widest">{getAsignaturaNombre(curso.asignatura)} · Reporte Anual</p>
                                {currentCourseRole && (
                                    <>
                                        <span className="w-1 h-1 rounded-full bg-(--line)"></span>
                                        {currentCourseRole.rol === 'tutor' ? (
                                            <span className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider border border-indigo-100">
                                                Tutor
                                            </span>
                                        ) : (
                                            <span className="bg-amber-50 text-amber-700 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider border border-amber-100">
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
                    <button onClick={handlePrint} className="bg-white border border-(--line) text-(--ink) px-6 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-slate-50 transition-all">
                        <Printer size={18} className="text-(--ink-soft)" />
                        Imprimir Reporte
                    </button>
                    <button className="bg-emerald-600 text-white px-6 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-900/10">
                        <FileDown size={18} />
                        Exportar PDF
                    </button>
                </div>
            </div>

            <main className="max-w-300 mx-auto overflow-x-auto bg-white shadow-2xl rounded-3xl border border-(--line) p-6 md:p-10 print:shadow-none print:border-none print:p-0">

                <div className="overflow-x-auto">
                    <table className="table-compact w-full border-collapse border border-black text-[13px]">
                        <thead>
                            <tr className="bg-slate-50">
                                <th className="border border-black w-10 px-1 py-1 text-center" rowSpan={3}>Nº</th>
                                <th className="border border-black px-4 py-2 text-left font-black uppercase tracking-wider" rowSpan={3}>
                                    Nombres de los Estudiantes
                                </th>
                                <th className="border border-black px-4 py-2 text-center font-black uppercase tracking-wider" colSpan={5}>
                                    CALIFICACIONES DEL AÑO ESCOLAR
                                </th>
                                <th className="border border-black bg-slate-100 px-4 py-2 text-center font-black uppercase tracking-wider" colSpan={4}>
                                    CALIFICACIÓN COMPLETIVA
                                </th>
                                <th className="border border-black px-4 py-2 text-center font-black uppercase tracking-wider" colSpan={4}>
                                    CALIFICACIONES EXTRAORDINARIAS
                                </th>
                                <th className="border border-black bg-slate-100 px-4 py-2 text-center font-black uppercase tracking-wider" colSpan={2}>
                                    CALIFICACIONES ESPECIALES
                                </th>
                                <th className="border border-black px-4 py-2 text-center font-black uppercase tracking-wider" colSpan={2}>
                                    SITUACIÓN FINAL
                                </th>
                            </tr>
                            <tr className="bg-slate-50">
                                <th className="border border-black text-[10px] py-2 px-1 font-bold leading-tight" colSpan={4}>
                                    PROMEDIO DE GRUPOS DE<br />COMPETENCIAS ESPECÍFICAS
                                </th>
                                <th className="border border-black text-xs font-black p-2" rowSpan={2}>C.F</th>

                                <th className="border border-black bg-slate-100 text-[10px] font-black p-1" rowSpan={2}>50%<br />C.F.</th>
                                <th className="border border-black bg-slate-100 text-[10px] font-black p-1" rowSpan={2}>C.E.C</th>
                                <th className="border border-black bg-slate-100 text-[10px] font-black p-1" rowSpan={2}>50%<br />C.E.C</th>
                                <th className="border border-black bg-slate-100 text-xs font-black p-2" rowSpan={2}>C.C.F</th>

                                <th className="border border-black text-[10px] font-black p-1" rowSpan={2}>30%<br />C.F</th>
                                <th className="border border-black text-[10px] font-black p-1" rowSpan={2}>C.<br />E.EX</th>
                                <th className="border border-black text-[10px] font-black p-1" rowSpan={2}>70%<br />C.E.EX</th>
                                <th className="border border-black text-xs font-black p-2" rowSpan={2}>C.EX.F</th>

                                <th className="border border-black bg-slate-100 text-xs font-black p-2" rowSpan={2}>C.F</th>
                                <th className="border border-black bg-slate-100 text-xs font-black p-2" rowSpan={2}>C.E.</th>

                                <th className="border border-black text-xs font-black p-2" rowSpan={2}>A</th>
                                <th className="border border-black text-xs font-black p-2" rowSpan={2}>R</th>
                            </tr>
                            <tr className="bg-slate-50 text-[10px] font-black">
                                <th className="border border-black p-1">PC1</th>
                                <th className="border border-black p-1">PC2</th>
                                <th className="border border-black p-1">PC3</th>
                                <th className="border border-black p-1">PC4</th>
                            </tr>
                        </thead>
                        <tbody>
                            {reportData.map((row) => (
                                <tr key={row.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="border border-black font-black text-center bg-slate-50 p-1 text-[11px]">{row.num}</td>
                                    <td className="border border-black px-4 py-1.5 font-bold text-left">{row.name}</td>
                                    <td className="border border-black p-1 text-center font-bold">{row.pc1 || ''}</td>
                                    <td className="border border-black p-1 text-center font-bold">{row.pc2 || ''}</td>
                                    <td className="border border-black p-1 text-center font-bold">{row.pc3 || ''}</td>
                                    <td className="border border-black p-1 text-center font-bold">{row.pc4 || ''}</td>
                                    <td className="border border-black p-1 text-center font-black bg-yellow-50">{row.cf || ''}</td>

                                    <td className="border border-black bg-slate-100 p-1 text-center text-slate-500">{row.cf50 || ''}</td>
                                    <td className="border border-black bg-white p-0 text-center">
                                        {row.cf < 70 && (
                                            <input
                                                type="number"
                                                className="w-full h-full border-none p-1 text-center font-bold bg-transparent focus:ring-1 focus:ring-emerald-500 outline-none print:bg-transparent"
                                                value={row.cec || ''}
                                                onChange={(e) => handleManualInput(row.id, 'cec', e.target.value)}
                                            />
                                        )}
                                    </td>
                                    <td className="border border-black bg-slate-100 p-1 text-center text-slate-500">{row.cec50 || ''}</td>
                                     <td className="border border-black bg-slate-100 p-1 text-center font-black">{row.ccf || ''}</td>
                                    <td className="border border-black p-1 text-center text-slate-500">{row.cf30 || ''}</td>
                                    <td className="border border-black p-0 text-center">
                                        {typeof row.ccf === 'number' && row.ccf < 70 && (
                                            <input
                                                type="number"
                                                className="w-full h-full border-none p-1 text-center font-bold bg-transparent focus:ring-1 focus:ring-emerald-500 outline-none"
                                                value={row.ceex || ''}
                                                onChange={(e) => handleManualInput(row.id, 'ceex', e.target.value)}
                                            />
                                        )}
                                    </td>
                                    <td className="border border-black p-1 text-center text-slate-500">{row.ceex70 || ''}</td>
                                    <td className="border border-black p-1 text-center font-black">{row.cexf || ''}</td>
 
                                    <td className="border border-black bg-slate-100 p-0 text-center">
                                        {typeof row.cexf === 'number' && row.cexf < 70 && (
                                            <input
                                                type="number"
                                                className="w-full h-full border-none p-1 text-center font-bold bg-transparent focus:ring-1 focus:ring-emerald-500 outline-none"
                                                value={row.cfSpec || ''}
                                                onChange={(e) => handleManualInput(row.id, 'cfSpec', e.target.value)}
                                            />
                                        )}
                                    </td>
                                    <td className="border border-black bg-slate-100 p-0 text-center">
                                        {typeof row.cexf === 'number' && row.cexf < 70 && (
                                            <input
                                                type="number"
                                                className="w-full h-full border-none p-1 text-center font-bold bg-transparent focus:ring-1 focus:ring-emerald-500 outline-none"
                                                value={row.ceSpec || ''}
                                                onChange={(e) => handleManualInput(row.id, 'ceSpec', e.target.value)}
                                            />
                                        )}
                                    </td>

                                    <td className="border border-black p-1 text-center font-black text-emerald-700 bg-emerald-50/30">
                                        {row.isAproved ? row.finalGrade : ''}
                                    </td>
                                    <td className="border border-black p-1 text-center font-black text-red-700 bg-red-50/30">
                                        {!row.isAproved ? row.finalGrade : ''}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <footer className="mt-8 pt-8 border-t border-(--line)">
                    <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-[10px] font-black uppercase tracking-wider text-(--ink-soft) opacity-40">
                        <span><strong>PC=</strong> Promedio Grupo de Competencias Específicas.</span>
                        <span><strong>C.F.=</strong> Calificación Final.</span>
                        <span><strong>C.E.C.=</strong> Calificación Evaluación Completiva.</span>
                        <span><strong>C.C.F.=</strong> Calificación Completiva Final.</span>
                        <span><strong>C.E.EX=</strong> Calificación Evaluación Extraordinaria.</span>
                        <span><strong>C.EX.F.=</strong> Calificación Extraordinaria Final.</span>
                        <span><strong>A=</strong> Aprobado.</span>
                        <span><strong>R=</strong> Reprobado.</span>
                    </div>
                </footer>
            </main>

            <div className="max-w-300 mx-auto mt-6 px-4 print:hidden">
                <div className="flex items-center gap-2 text-(--ink-soft) text-[10px] font-black uppercase tracking-widest bg-white/50 p-4 rounded-2xl border border-(--line)">
                    <Users size={14} />
                    <span>Mostrando registros de {students.length} estudiantes según los datos almacenados en curso_detalle.</span>
                </div>
            </div>
        </div>
    );
}
