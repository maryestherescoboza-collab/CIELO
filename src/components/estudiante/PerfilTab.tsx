import React from 'react';
import { getAsignaturaNombre } from '../../constants/asignaturas';
import type { Skill, AppState, Competencia, DescriptorRubrica, CriterioCotejo } from '../../types';
import { getCompetenciaDisplay } from '../../types';
import RecuperacionPerfil from './RecuperacionPerfil';
import { QRCodeSVG } from 'qrcode.react';
import { PORTAL_FAMILIA_ENABLED } from '../../config/features';
import { FileDown, QrCode, ExternalLink, Copy, Check, X, Loader2 } from 'lucide-react';
import {
    exportarInformeCurricularPdf,
    obtenerPortalAccessTokenEstudiante,
    construirUrlPortalEstudiante,
} from '../../utils/informeCurricularPdf';

interface PerfilTabProps {
    est: any;
    curso: any;
    periodo: string;
    promedioPeriodo: string;
    rankingPeriodo: string;
    studentHabilidades: Skill[];
    actividadesPeriodo: any[];
    incidenciasEstudiante: any[];
    state: AppState;
    currentAsignatura?: string;
    isTutor?: boolean;
    currentUserId?: string;
}

const PerfilTab: React.FC<PerfilTabProps> = ({
    est,
    curso,
    periodo,
    promedioPeriodo,
    rankingPeriodo,
    studentHabilidades,
    actividadesPeriodo,
    incidenciasEstudiante,
    state,
    currentAsignatura,
    isTutor = false,
    currentUserId
}) => {
    const [qrModalOpen, setQrModalOpen] = React.useState(false);
    const [qrAccessByStudent, setQrAccessByStudent] = React.useState<Record<number, string>>({});
    const [isGeneratingQr, setIsGeneratingQr] = React.useState(false);
    const [qrError, setQrError] = React.useState<string | null>(null);
    const [copiedLink, setCopiedLink] = React.useState(false);
    const [isExportingPdf, setIsExportingPdf] = React.useState(false);

    const currentStudentId = Number(est?.id);
    const activeQrToken =
        Number.isFinite(currentStudentId) && currentStudentId > 0
            ? (qrAccessByStudent[currentStudentId] ?? null)
            : null;
    const portalUrl = activeQrToken ? construirUrlPortalEstudiante(activeQrToken) : null;

    React.useEffect(() => {
        setQrModalOpen(false);
        setQrError(null);
        setCopiedLink(false);
    }, [est?.id]);

    React.useEffect(() => {
        if (!qrModalOpen) return;
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setQrModalOpen(false);
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [qrModalOpen]);

    const saveStudentToken = React.useCallback((studentId: number, token: string) => {
        if (!Number.isFinite(studentId) || studentId <= 0 || !token.trim()) return;
        setQrAccessByStudent(prev => (prev[studentId] === token.trim() ? prev : { ...prev, [studentId]: token.trim() }));
    }, []);

    const handleDownloadPdf = async () => {
        const studentIdAtStart = Number(est?.id);
        try {
            setIsExportingPdf(true);
            await exportarInformeCurricularPdf({
                est,
                curso,
                periodo,
                promedioPeriodo,
                rankingPeriodo,
                studentHabilidades,
                actividadesPeriodo,
                incidenciasEstudiante,
                computedBCs,
                getDescriptorTexts,
                state,
                currentAsignatura,
                isTutor,
                currentUserId,
                portalAccessToken: activeQrToken,
                onTokenResolved: (resolvedToken) => saveStudentToken(studentIdAtStart, resolvedToken),
            });
        } catch (err) {
            console.error("Error al exportar informe curricular en PDF:", err);
        } finally {
            setIsExportingPdf(false);
        }
    };

    const handleGenerateQR = async () => {
        if (!PORTAL_FAMILIA_ENABLED || !est?.id) return;

        const targetStudentId = Number(est.id);
        setQrError(null);
        setCopiedLink(false);
        setQrModalOpen(true);

        if (qrAccessByStudent[targetStudentId]) {
            return;
        }

        setIsGeneratingQr(true);
        try {
            const resolvedToken = await obtenerPortalAccessTokenEstudiante(
                est,
                curso,
                state,
                qrAccessByStudent[targetStudentId] ?? null
            );

            if (resolvedToken) {
                saveStudentToken(targetStudentId, resolvedToken);
            } else {
                setQrError('No se pudo obtener el acceso individual del estudiante. Inténtalo nuevamente.');
            }
        } catch (err) {
            console.error("Error generating QR:", err);
            setQrError('Ocurrió un error al generar el acceso familiar.');
        } finally {
            setIsGeneratingQr(false);
        }
    };

    const handleCopyPortalUrl = async () => {
        if (!portalUrl) return;
        try {
            await navigator.clipboard.writeText(portalUrl);
            setCopiedLink(true);
            setTimeout(() => setCopiedLink(false), 2000);
        } catch {
            // Fallback silencioso
        }
    };

    // Helper to get descriptors dynamically based on evaluation type
    const getDescriptorTexts = (studentId: number, actividadId: number): string[] => {
        const evalDetalle = state.cursoDetalle.find(
            cd => cd.estudianteId === studentId && cd.actividadId === actividadId
        );
        
        const califs = state.calificaciones.filter(
            c => c.estudianteId === studentId && c.actividadId === actividadId
        );

        const grade = califs.length > 0 ? califs[0].puntaje : (evalDetalle?.puntajeTotal ?? null);
        const hasRubrica = !!(evalDetalle?.rubricaData && Object.keys(evalDetalle.rubricaData).length > 0);
        const hasCotejo = !!(evalDetalle?.cotejoData && Object.keys(evalDetalle.cotejoData).length > 0);

        if (!hasRubrica && !hasCotejo && grade !== null) {
            const exactGrades = [100, 85, 70, 55];
            if (exactGrades.includes(grade)) {
                let text = '';
                if (grade === 100) text = "Demuestra el indicador completo, correctamente y con autonomía.";
                else if (grade === 85) text = "Demuestra el indicador completo, pero presenta alguna dificultad, imprecisión o necesidad de orientación.";
                else if (grade === 70) text = "Demuestra una parte del indicador, pero aún no alcanza el desempeño completo.";
                else if (grade === 55) text = "Muestra evidencia limitada del indicador y todavía necesita apoyo para alcanzarlo.";

                const act = state.actividades.find(a => a.id === actividadId);
                if (act?.indicador) return [text, act.indicador];
                return [text];
            }
            return [];
        }
        
        const savedDescriptors = califs.flatMap(c => c.descriptores || []).filter(Boolean);
        if (savedDescriptors.length > 0) return savedDescriptors;
        
        if (evalDetalle) {
            const plantilla = state.plantillas.find(p => p.id === evalDetalle.plantillaId);
            
            if (hasRubrica) {
                const descriptors: string[] = [];
                Object.entries(evalDetalle.rubricaData).forEach(([descriptorId, nivel]) => {
                    if (!nivel) return;
                    
                    const activeDesc = state.descriptoresRubrica.find(d => String(d.id) === String(descriptorId));
                    let comp: Competencia = 'BC1';
                    if (activeDesc?.bc) {
                        comp = activeDesc.bc;
                    } else if (String(descriptorId).includes('BC')) {
                        comp = String(descriptorId).split('-').pop() as Competencia;
                    }

                    const descriptorObj = (plantilla?.datos as any)?.descriptores?.find(
                        (d: any) => String(d.id) === String(descriptorId) || d.bc === comp
                    ) || activeDesc;

                    if (descriptorObj) {
                        const levelKeys: Record<number, keyof DescriptorRubrica> = {
                            1: 'receptivo',
                            2: 'resolutivo',
                            3: 'autonomo',
                            4: 'estrategico'
                        };
                        const key = levelKeys[nivel as number];
                        if (key && descriptorObj[key]) {
                            descriptors.push(descriptorObj[key] as string);
                        }
                    }
                });
                if (descriptors.length > 0) return descriptors;
            }
            
            if (hasCotejo) {
                const templateCriterios = plantilla?.tipo === 'cotejo' 
                    ? (plantilla.datos.criterios as CriterioCotejo[]) 
                    : state.criteriosCotejo;

                const cumpleList: string[] = [];
                const noCumpleList: string[] = [];

                Object.entries(evalDetalle.cotejoData).forEach(([critIdStr, val]) => {
                    const critId = parseInt(critIdStr);
                    const criterio = templateCriterios.find(c => c.id === critId);
                    if (criterio) {
                        const desc = criterio.descripcion || criterio.titulo;
                        if (val === 100 || val === 3 || val === 2 || val === 67) cumpleList.push(`• ${desc}`);
                        else if (val === 0 || val === 1) noCumpleList.push(`• ${desc}`);
                    }
                });

                const formattedDescriptors: string[] = [];
                if (cumpleList.length > 0) {
                    formattedDescriptors.push('Cumple:');
                    formattedDescriptors.push(...cumpleList);
                }
                if (noCumpleList.length > 0) {
                    formattedDescriptors.push('No cumple:');
                    formattedDescriptors.push(...noCumpleList);
                }

                if (formattedDescriptors.length > 0) return formattedDescriptors;
            }
        }
        
        return [];
    };

    const computedBCs = React.useMemo(() => {
        if (!est || !curso) return { BC1: null, BC2: null, BC3: null, BC4: null };

        const courseActs = state.actividades.filter(a => {
            const actCurso = state.cursos.find(c => c.id === a.cursoId);
            const isMatch = (actCurso?.sharedCourseId === est.sharedCourseId || a.cursoId === curso.id) && a.periodo === periodo;
            const actAsignatura = a.asignatura || actCurso?.asignatura || '';
            const matchesRole = isTutor || !currentAsignatura || actAsignatura === currentAsignatura;
            const matchesUser = isTutor || !currentUserId || a.userId === currentUserId || !a.userId;
            return isMatch && matchesRole && matchesUser;
        });

        const bcs: ('BC1' | 'BC2' | 'BC3' | 'BC4')[] = ['BC1', 'BC2', 'BC3', 'BC4'];
        const results: Record<'BC1' | 'BC2' | 'BC3' | 'BC4', number | null> = {
            BC1: null, BC2: null, BC3: null, BC4: null
        };

        bcs.forEach(bc => {
            const actsForBc = courseActs.filter(a => a.bcAsignados?.includes(bc));
            const scores: number[] = [];
            
            actsForBc.forEach(a => {
                const calif = state.calificaciones.find(
                    c => c.estudianteId === est.id && c.actividadId === a.id
                );
                if (calif && calif.puntaje !== null && calif.puntaje !== undefined) {
                    scores.push(calif.puntaje);
                }
            });

            if (scores.length > 0) {
                results[bc] = Math.round(scores.reduce((sum, val) => sum + val, 0) / scores.length);
            }
        });

        return results;
    }, [est, curso, periodo, state.actividades, state.calificaciones, isTutor, currentAsignatura, currentUserId]);

    const renderCircularProgress = (score: number | null, bcId: string) => {
        const size = 64;
        const strokeWidth = 5;
        const radius = (size - strokeWidth) / 2;
        const circumference = radius * 2 * Math.PI;
        
        const colorsMap: Record<string, { fill: string, track: string }> = {
            'BC1': { fill: '#537BAC', track: '#E4E3EC' },
            'BC2': { fill: '#689C63', track: '#E4E3EC' },
            'BC3': { fill: '#EB8847', track: '#E4E3EC' },
            'BC4': { fill: '#DB5B48', track: '#E4E3EC' }
        };
        const colors = colorsMap[bcId] || { fill: '#4E5566', track: '#E4E3EC' };

        if (score === null) {
            return (
                <div className="relative flex items-center justify-center shrink-0" style={{ width: size, height: size }}>
                    <svg width={size} height={size} className="transform -rotate-90">
                        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#E4E3EC" strokeWidth={strokeWidth} />
                    </svg>
                    <div className="absolute text-[11px] font-bold text-[#8A8FA0]">—</div>
                </div>
            );
        }

        const strokeDashoffset = circumference - (score / 100) * circumference;

        return (
            <div className="relative flex items-center justify-center shrink-0" style={{ width: size, height: size }}>
                <svg width={size} height={size} className="transform -rotate-90">
                    <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={colors.track} strokeWidth={strokeWidth} />
                    <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={colors.fill} strokeWidth={strokeWidth}
                        strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} strokeLinecap="round"
                    />
                </svg>
                <div className="absolute text-[11.5px] font-bold text-[#1B1F2A] font-['Space_Grotesk']">{score}%</div>
            </div>
        );
    };

    return (
        <>
            {/* PÁGINA 1 */}
            <div className="a4-page w-[210mm] min-h-[297mm] bg-white shadow-[0_1px_3px_rgba(30,30,25,.08),0_10px_28px_rgba(30,30,25,.10)] p-[20mm] flex flex-col shrink-0 font-sans relative">
                <div className="flex-1">
                    {/* Header Documento */}
                    <div className="mb-6 relative">
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                            <div>
                                <div className="font-['Space_Grotesk'] text-[30px] sm:text-[36px] font-bold text-[#1B1F2A] leading-[1.1] sm:leading-[1.15] tracking-tight break-words">
                                    {est.nombre} <span className="bg-[#DB5B48] text-white px-2.5 py-0.5 rounded-[5px] inline-block">{est.apellido}</span>
                                </div>
                                <div className="text-[12px] text-[#4E5566] mt-2.5">
                                    {curso?.grado} {curso?.seccion} • {getAsignaturaNombre(currentAsignatura || curso?.asignatura)}
                                </div>
                                <div className="mt-4 text-[17px] font-bold tracking-wide text-[#1B1F2A] font-['Space_Grotesk']">
                                    Informe curricular
                                </div>
                                <div className="text-[11px] text-[#8A8FA0] mt-0.5">
                                    Período {periodo}
                                </div>
                            </div>

                            <div className="no-print flex items-center gap-2 self-stretch sm:self-start shrink-0">
                                <button
                                    onClick={handleDownloadPdf}
                                    disabled={isExportingPdf}
                                    className="flex w-full sm:w-auto min-h-11 items-center justify-center gap-2 px-4 py-2 bg-[#1B1F2A] text-white text-[11px] font-bold uppercase rounded-lg hover:bg-[#2e3447] active:scale-95 transition-all shadow-sm disabled:opacity-50 tracking-wider cursor-pointer"
                                    title="Descargar informe curricular en PDF (.pdf)"
                                >
                                    <FileDown size={14} className="text-[#DB5B48]" />
                                    <span>{isExportingPdf ? 'Descargando...' : 'Descargar PDF'}</span>
                                </button>
                            </div>
                        </div>

                        {PORTAL_FAMILIA_ENABLED && (
                            <div className="no-print mt-3 flex flex-col gap-2">
                                <div className="flex items-center gap-3">
                                    <button
                                        type="button"
                                        onClick={handleGenerateQR}
                                        disabled={isGeneratingQr}
                                        className="min-h-10 px-3.5 py-1.5 bg-[#1B1F2A] text-white text-[10px] font-bold uppercase rounded-lg hover:bg-[#2e3447] active:scale-95 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-60"
                                    >
                                        <QrCode size={13} className="text-[#DB5B48]" />
                                        <span>{isGeneratingQr && !qrModalOpen ? 'Generando...' : 'Generar Acceso Familiar'}</span>
                                    </button>
                                </div>

                                {qrModalOpen && (
                                    <div
                                        className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 backdrop-blur-xs p-4 animate-in fade-in duration-200"
                                        onClick={() => setQrModalOpen(false)}
                                        role="dialog"
                                        aria-modal="true"
                                        aria-labelledby="modal-qr-estudiante-titulo"
                                    >
                                        <div
                                            className="w-full max-w-sm sm:max-w-md max-h-[92vh] overflow-y-auto bg-white rounded-2xl sm:rounded-3xl border border-(--border-unificado) shadow-lg px-5 py-6 sm:px-7 sm:py-7 text-center relative"
                                            onClick={e => e.stopPropagation()}
                                        >
                                            <button
                                                type="button"
                                                onClick={() => setQrModalOpen(false)}
                                                className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center text-(--ink-soft) hover:text-(--ink) hover:bg-(--linen)/70 transition-colors cursor-pointer"
                                                aria-label="Cerrar ventana"
                                            >
                                                <X size={16} />
                                            </button>

                                            <div className="pr-6 sm:pr-0">
                                                <p className="text-[10px] font-bold uppercase tracking-widest text-(--ink-soft) mb-1">
                                                    Portal del estudiante · CIELO
                                                </p>
                                                <h3
                                                    id="modal-qr-estudiante-titulo"
                                                    className="text-lg sm:text-xl font-bold text-(--ink) tracking-tight leading-snug"
                                                >
                                                    {est.nombre} {est.apellido}
                                                </h3>
                                                <p className="text-xs text-(--ink-soft) mt-0.5">
                                                    {curso?.grado} {curso?.seccion} • {getAsignaturaNombre(currentAsignatura || curso?.asignatura)}
                                                </p>
                                            </div>

                                            <div className="mt-5 mb-4 flex flex-col items-center justify-center">
                                                {isGeneratingQr && !portalUrl ? (
                                                    <div className="w-48 h-48 sm:w-52 sm:h-52 rounded-2xl bg-(--linen)/40 border border-(--border-unificado) flex flex-col items-center justify-center gap-2.5 p-4">
                                                        <Loader2 size={26} className="animate-spin text-(--ink-soft)" />
                                                        <span className="text-xs font-medium text-(--ink-soft)">
                                                            Generando código QR...
                                                        </span>
                                                    </div>
                                                ) : portalUrl ? (
                                                    <>
                                                        <a
                                                            href={portalUrl}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            title={`Abrir el portal de ${est.nombre} ${est.apellido || ''} en una nueva pestaña`}
                                                            className="group inline-flex flex-col items-center justify-center p-4 bg-white rounded-2xl border border-(--border-unificado) hover:border-(--ink) shadow-xs transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-(--ink)/20"
                                                        >
                                                            <QRCodeSVG
                                                                value={portalUrl}
                                                                size={184}
                                                                level="M"
                                                                marginSize={2}
                                                                bgColor="#FFFFFF"
                                                                fgColor="#000000"
                                                                className="w-40 h-40 sm:w-46 sm:h-46"
                                                            />
                                                            <span className="mt-2.5 inline-flex items-center gap-1.5 text-[11px] font-semibold text-(--ink-soft) group-hover:text-(--ink) transition-colors">
                                                                <span>Haz clic en el QR para abrir el portal</span>
                                                                <ExternalLink size={12} />
                                                            </span>
                                                        </a>
                                                        <p className="text-xs text-(--ink-soft) mt-3 leading-relaxed max-w-xs">
                                                            Escanea este código desde un teléfono o haz clic sobre él para acceder al portal individual del estudiante.
                                                        </p>
                                                    </>
                                                ) : (
                                                    <div className="w-full rounded-xl bg-(--linen)/50 border border-(--border-unificado) p-4">
                                                        <p className="text-xs text-(--ink) font-medium mb-3">
                                                            {qrError || 'No se pudo cargar el código QR de este estudiante.'}
                                                        </p>
                                                        <button
                                                            type="button"
                                                            onClick={handleGenerateQR}
                                                            className="px-4 py-2 bg-(--ink) text-white text-xs font-semibold rounded-lg hover:opacity-90 transition-opacity cursor-pointer"
                                                        >
                                                            Reintentar
                                                        </button>
                                                    </div>
                                                )}
                                            </div>

                                            {portalUrl && (
                                                <div className="mt-4 pt-4 border-t border-(--border-unificado) text-left">
                                                    <label className="block text-[10px] font-bold text-(--ink-soft) uppercase tracking-widest mb-1.5">
                                                        Enlace directo del estudiante
                                                    </label>
                                                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                                                        <input
                                                            type="text"
                                                            readOnly
                                                            value={portalUrl}
                                                            onFocus={e => e.currentTarget.select()}
                                                            className="text-xs px-3 py-2 border border-(--border-unificado) rounded-xl bg-(--bg-main) w-full min-w-0 text-(--ink) font-mono focus:outline-none"
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={handleCopyPortalUrl}
                                                            className="min-h-9 px-3.5 py-2 bg-(--linen) hover:bg-(--linen)/80 text-(--ink) text-xs font-semibold rounded-xl transition-colors flex items-center justify-center gap-1.5 shrink-0 cursor-pointer"
                                                        >
                                                            {copiedLink ? (
                                                                <>
                                                                    <Check size={13} className="text-[#689C63]" />
                                                                    <span>Copiado</span>
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <Copy size={13} />
                                                                    <span>Copiar</span>
                                                                </>
                                                            )}
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        <hr className="border-t-2 border-[#1B1F2A] my-4" />

                        <div className="grid grid-cols-2 gap-4 sm:flex sm:flex-wrap sm:gap-x-12 sm:gap-y-4">
                            <div>
                                <div className="text-[10px] text-[#8A8FA0] tracking-wide">Promedio</div>
                                <span className="font-['Space_Grotesk'] text-[21px] font-bold mt-1 text-[#537BAC] inline-block">{promedioPeriodo}%</span>
                                <div className="w-5 h-0.75 rounded bg-[#537BAC] mt-1.5"></div>
                            </div>
                            <div>
                                <div className="text-[10px] text-[#8A8FA0] tracking-wide">Ranking</div>
                                <span className="font-['Space_Grotesk'] text-[21px] font-bold mt-1 text-[#DB5B48] inline-block">#{rankingPeriodo}</span>
                                <div className="w-5 h-0.75 rounded bg-[#DB5B48] mt-1.5"></div>
                            </div>
                            <div>
                                <div className="text-[10px] text-[#8A8FA0] tracking-wide">Competencias</div>
                                <span className="font-['Space_Grotesk'] text-[21px] font-bold mt-1 text-[#689C63] inline-block">
                                    {Object.values(computedBCs).filter(v => v !== null).length} evaluadas
                                </span>
                                <div className="w-5 h-0.75 rounded bg-[#689C63] mt-1.5"></div>
                            </div>
                        </div>
                    </div>

                    {/* Competencias Evaluadas */}
                    <div className="mt-7 break-inside-avoid">
                        <div className="flex items-baseline gap-2">
                            <span className="font-['Space_Grotesk'] font-bold text-[#DB5B48] text-[13px]">//</span>
                            <h2 className="font-['Space_Grotesk'] text-[12px] font-bold tracking-[0.14em] uppercase text-[#1B1F2A]">Competencias evaluadas</h2>
                        </div>
                        <hr className="border-t border-[#E4E3EC] mt-2 mb-4" />

                        <div className="flex flex-col md:flex-row md:items-center gap-y-4">
                            {[
                                { id: 'BC1', label: getCompetenciaDisplay('BC1'), score: computedBCs.BC1, bg: '#537BAC' },
                                { id: 'BC2', label: getCompetenciaDisplay('BC2'), score: computedBCs.BC2, bg: '#689C63' },
                                { id: 'BC3', label: getCompetenciaDisplay('BC3'), score: computedBCs.BC3, bg: '#EB8847' },
                                { id: 'BC4', label: getCompetenciaDisplay('BC4'), score: computedBCs.BC4, bg: '#DB5B48' }
                            ].map((comp, idx, arr) => (
                                <React.Fragment key={comp.id}>
                                    <div className="flex-1 flex items-center gap-3 px-0 md:px-4 first:pl-0 last:pr-0">
                                        {renderCircularProgress(comp.score, comp.id)}
                                        <div>
                                            <div className="inline-block text-[9px] font-bold tracking-wide text-white px-1.5 py-0.5 rounded" style={{ background: comp.bg }}>
                                                {comp.id}
                                            </div>
                                            <div className="text-[11.5px] sm:text-[10.8px] text-[#4E5566] mt-1 leading-[1.3] font-medium">
                                                {comp.label}
                                            </div>
                                        </div>
                                    </div>
                                    {idx < arr.length - 1 && (
                                        <div className="hidden md:block w-px h-16 bg-[#EFEEF4]"></div>
                                    )}
                                </React.Fragment>
                            ))}
                        </div>
                    </div>

                    {/* Atributos */}
                    <div className="mt-7 break-inside-avoid">
                        <div className="flex items-baseline gap-2">
                            <span className="font-['Space_Grotesk'] font-bold text-[#DB5B48] text-[13px]">//</span>
                            <h2 className="font-['Space_Grotesk'] text-[12px] font-bold tracking-[0.14em] uppercase text-[#1B1F2A]">Atributos</h2>
                        </div>
                        <hr className="border-t border-[#E4E3EC] mt-2 mb-4" />
                        
                        {studentHabilidades.length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                                {studentHabilidades.map((hab, i) => (
                                    <span key={i} className="text-[11.5px] font-bold px-3 py-1 rounded-full border border-[#E4E3EC] bg-white text-[#1B1F2A]">
                                        {hab.text}
                                    </span>
                                ))}
                            </div>
                        ) : (
                            <div className="text-[11.5px] text-[#8A8FA0] italic">Sin atributos registrados para este período.</div>
                        )}
                    </div>

                    {/* Evidencias de aprendizaje */}
                    <div className="mt-7">
                        <div className="flex items-baseline gap-2 break-inside-avoid">
                            <span className="font-['Space_Grotesk'] font-bold text-[#DB5B48] text-[13px]">//</span>
                            <h2 className="font-['Space_Grotesk'] text-[12px] font-bold tracking-[0.14em] uppercase text-[#1B1F2A]">Evidencias de aprendizaje</h2>
                        </div>
                        <hr className="border-t border-[#E4E3EC] mt-2 mb-4 break-inside-avoid" />

                        <div className="relative">
                            {actividadesPeriodo.length > 0 ? (
                                actividadesPeriodo.map((act, index) => {
                                    const calif = state.calificaciones.find(c => c.estudianteId === est.id && c.actividadId === act.id);
                                    const isEvaluated = calif && calif.puntaje !== null && calif.puntaje !== undefined;
                                    const score = isEvaluated ? calif.puntaje : null;
                                    const descriptors = getDescriptorTexts(est.id, act.id);
                                    
                                    const rawDate = act.fecha || '';
                                    const [yyyy, mm, dd] = rawDate.split('-');
                                    const formattedDate = dd ? `${dd} ${['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'][parseInt(mm)-1]}\n${yyyy}` : rawDate;

                                    let bgColor = '#F8F9FA'; // default
                                    if (act.bcAsignados?.includes('BC1')) bgColor = '#F1F5FA'; // comunicativa bg
                                    else if (act.bcAsignados?.includes('BC2')) bgColor = '#F2F8F4'; // pensamiento bg
                                    else if (act.bcAsignados?.includes('BC3')) bgColor = '#FDF5F0'; // cientifica bg
                                    else if (act.bcAsignados?.includes('BC4')) bgColor = '#FCF3F2'; // etica bg

                                    return (
                                        <div key={act.id} className="grid grid-cols-[54px_14px_1fr] sm:grid-cols-[66px_16px_1fr] gap-0 mb-3 break-inside-avoid">
                                            <div className="text-[10px] sm:text-[9.5px] tracking-wide text-[#8A8FA0] uppercase font-bold text-right pr-2 sm:pr-2.5 pt-3.5 whitespace-pre-line leading-tight">
                                                {formattedDate}
                                            </div>
                                            <div className="relative">
                                                <div className={`absolute left-1.75 top-0 w-px bg-[#E4E3EC] ${index === actividadesPeriodo.length - 1 ? 'bottom-1/2' : '-bottom-3.5'}`}></div>
                                                <div className="absolute left-0.5 top-4.5 w-2.75 h-0.5 bg-[#DB5B48]"></div>
                                            </div>
                                            <div className="p-3 rounded-[3px]" style={{ background: bgColor }}>
                                                <div className="flex flex-wrap justify-between items-baseline gap-x-3 gap-y-1">
                                                    <div className="font-['Space_Grotesk'] text-[14.5px] font-bold text-[#1B1F2A] break-words">{act.nombre}</div>
                                                    <div className="font-['Space_Grotesk'] text-[13.5px] font-bold text-[#DB5B48] shrink-0">{isEvaluated ? `${score} %` : 'Pendiente'}</div>
                                                </div>
                                                <div className="flex flex-wrap gap-1.5 mt-2">
                                                    {(act.bcAsignados || []).map((bc: string) => {
                                                        const bcColors: Record<string, string> = {
                                                            'BC1': '#537BAC', 'BC2': '#689C63', 'BC3': '#EB8847', 'BC4': '#DB5B48'
                                                        };
                                                        return (
                                                            <span key={bc} className="text-[9.8px] font-bold px-2 py-0.5 rounded-full bg-white/70" style={{ color: bcColors[bc] || '#4E5566' }}>
                                                                {getCompetenciaDisplay(bc)}
                                                            </span>
                                                        );
                                                    })}
                                                </div>
                                                <div className="text-[11.5px] text-[#4E5566] mt-2 leading-[1.55]">
                                                    {isEvaluated && descriptors.length > 0 ? (
                                                        descriptors.map((desc, idx) => <div key={idx}>{desc}</div>)
                                                    ) : isEvaluated ? (
                                                        <span className="italic">Sin descriptores registrados.</span>
                                                    ) : (
                                                        <span className="text-[#8A8FA0] italic">Evaluación pendiente.</span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })
                            ) : (
                                <div className="text-[11.5px] text-[#8A8FA0] italic pl-2">Sin actividades registradas en este periodo.</div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="mt-8 pt-3 border-t border-[#EFEEF4] flex flex-col gap-1 sm:flex-row sm:justify-between sm:items-center text-[#8A8FA0] text-[9.5px]">
                    <span>Informe curricular · {est.nombre} {est.apellido} · {getAsignaturaNombre(currentAsignatura || curso?.asignatura)}</span>
                    <span>1 / 2</span>
                </div>
            </div>

            {/* PÁGINA 2 */}
            <div className="a4-page w-[210mm] min-h-[297mm] bg-white shadow-[0_1px_3px_rgba(30,30,25,.08),0_10px_28px_rgba(30,30,25,.10)] p-[20mm] flex flex-col shrink-0 font-sans relative">
                <div className="flex-1">
                    {/* Bitácora de convivencia */}
                    <div className="mt-0 break-inside-avoid">
                        <div className="flex items-baseline gap-2">
                            <span className="font-['Space_Grotesk'] font-bold text-[#DB5B48] text-[13px]">//</span>
                            <h2 className="font-['Space_Grotesk'] text-[12px] font-bold tracking-[0.14em] uppercase text-[#1B1F2A]">Bitácora de convivencia</h2>
                        </div>
                        <hr className="border-t border-[#E4E3EC] mt-2 mb-4" />

                        <div className="relative">
                            {incidenciasEstudiante.length > 0 ? (
                                incidenciasEstudiante.map((inc, index) => {
                                    const [yyyy, mm, dd] = inc.fecha.split('-');
                                    const formattedDate = dd ? `${dd} ${['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'][parseInt(mm)-1]}\n${yyyy}` : inc.fecha;
                                    return (
                                        <div key={index} className="grid grid-cols-[54px_14px_1fr] sm:grid-cols-[66px_16px_1fr] gap-0 mb-3 break-inside-avoid">
                                            <div className="text-[10px] sm:text-[9.5px] tracking-wide text-[#8A8FA0] uppercase font-bold text-right pr-2 sm:pr-2.5 pt-3.5 whitespace-pre-line leading-tight">
                                                {formattedDate}
                                            </div>
                                            <div className="relative">
                                                <div className={`absolute left-1.75 top-0 w-px bg-[#E4E3EC] ${index === incidenciasEstudiante.length - 1 ? 'bottom-1/2' : '-bottom-3.5'}`}></div>
                                                <div className="absolute left-0.5 top-4.5 w-2.75 h-0.5 bg-[#DB5B48]"></div>
                                            </div>
                                            <div className="p-3 rounded-[3px] bg-[#FDF5F0]">
                                                <div className="font-['Space_Grotesk'] text-[14.5px] font-bold text-[#1B1F2A]">{inc.categoria}</div>
                                                <div className="text-[11px] text-[#8A8FA0] italic mt-1.5">"{inc.descripcion}"</div>
                                            </div>
                                        </div>
                                    );
                                })
                            ) : (
                                <div className="text-[11.5px] text-[#8A8FA0] italic pl-2">Sin registros de convivencia.</div>
                            )}
                        </div>
                    </div>

                    {/* Recuperación */}
                    <div className="mt-7 break-inside-avoid">
                        <RecuperacionPerfil
                            est={est}
                            curso={curso}
                            periodo={periodo}
                            state={state}
                            currentAsignatura={currentAsignatura}
                            isTutor={isTutor}
                        />
                    </div>
                </div>

                <div className="mt-8 pt-3 border-t border-[#EFEEF4] flex flex-col gap-1 sm:flex-row sm:justify-between sm:items-center text-[#8A8FA0] text-[9.5px]">
                    <span>Informe curricular · {est.nombre} {est.apellido} · {getAsignaturaNombre(currentAsignatura || curso?.asignatura)}</span>
                    <span>2 / 2</span>
                </div>
            </div>
        </>
    );
};

export default React.memo(PerfilTab);
