import React from 'react';
import { getAsignaturaNombre, sonMismaAsignatura } from '../../constants/asignaturas';
import { normalizeArea } from '../../utils/academic';
import type { Skill, AppState, Competencia, DescriptorRubrica, CriterioCotejo } from '../../types';
import { getCompetenciaDisplay } from '../../types';
import RecuperacionPerfil from './RecuperacionPerfil';
import { QRCodeSVG } from 'qrcode.react';
import { PORTAL_FAMILIA_ENABLED } from '../../config/features';
import { FileDown, QrCode, ExternalLink, Copy, Check, X, Loader2, KeyRound, Download, RefreshCw, ShieldCheck } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import {
    exportarInformeCurricularPdf,
    obtenerPortalAccessTokenEstudiante,
    construirUrlPortalEstudiante,
    construirUrlRecuperacionPortal,
} from '../../utils/informeCurricularPdf';

interface RecuperacionQrEstado {
    recovery_token: string | null;
    estado: 'pendiente' | 'utilizado' | 'vencido';
    created_at: string;
    expires_at: string;
    used_at: string | null;
}

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
    const [hasPinByStudent, setHasPinByStudent] = React.useState<Record<number, boolean>>({});
    const [recoveryQrByStudent, setRecoveryQrByStudent] = React.useState<Record<number, RecuperacionQrEstado | null>>({});
    const [activeQrTab, setActiveQrTab] = React.useState<'acceso' | 'recuperacion'>('acceso');
    const [isGeneratingQr, setIsGeneratingQr] = React.useState(false);
    const [isGeneratingRecoveryQr, setIsGeneratingRecoveryQr] = React.useState(false);
    const [qrError, setQrError] = React.useState<string | null>(null);
    const [recoveryQrError, setRecoveryQrError] = React.useState<string | null>(null);
    const [copiedLink, setCopiedLink] = React.useState(false);
    const [copiedRecoveryLink, setCopiedRecoveryLink] = React.useState(false);
    const [isExportingPdf, setIsExportingPdf] = React.useState(false);
    const qrSvgWrapRef = React.useRef<HTMLDivElement | null>(null);
    const recoveryQrSvgWrapRef = React.useRef<HTMLDivElement | null>(null);

    const currentStudentId = Number(est?.id);
    const activeQrToken =
        Number.isFinite(currentStudentId) && currentStudentId > 0
            ? (qrAccessByStudent[currentStudentId] ?? null)
            : null;
    const portalUrl = activeQrToken ? construirUrlPortalEstudiante(activeQrToken) : null;
    const currentStudentHasPin =
        Number.isFinite(currentStudentId) && currentStudentId > 0
            ? Boolean(hasPinByStudent[currentStudentId])
            : false;
    const activeRecoveryState =
        Number.isFinite(currentStudentId) && currentStudentId > 0
            ? (recoveryQrByStudent[currentStudentId] ?? null)
            : null;
    const recoveryPortalUrl =
        activeRecoveryState?.estado === 'pendiente' && activeRecoveryState.recovery_token
            ? construirUrlRecuperacionPortal(activeRecoveryState.recovery_token)
            : null;

    React.useEffect(() => {
        setQrModalOpen(false);
        setQrError(null);
        setRecoveryQrError(null);
        setCopiedLink(false);
        setCopiedRecoveryLink(false);
        setActiveQrTab('acceso');
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

    const cargarEstadoQrEstudiante = React.useCallback(async (targetStudentId: number) => {
        setIsGeneratingQr(true);
        setQrError(null);
        try {
            const { data: estadoData, error: estadoError } = await supabase.rpc('portal_obtener_estado_qr_estudiante', {
                p_estudiante_id: targetStudentId,
            });

            if (!estadoError && estadoData && !estadoData.error && typeof estadoData.access_token === 'string') {
                saveStudentToken(targetStudentId, estadoData.access_token);
                setHasPinByStudent(prev => ({ ...prev, [targetStudentId]: Boolean(estadoData.has_pin) }));
                setRecoveryQrByStudent(prev => ({
                    ...prev,
                    [targetStudentId]: estadoData.recuperacion ?? null,
                }));
                return;
            }

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
    }, [est, curso, state, qrAccessByStudent, saveStudentToken]);

    const handleGenerateQR = async () => {
        if (!PORTAL_FAMILIA_ENABLED || !est?.id) return;

        const targetStudentId = Number(est.id);
        setQrError(null);
        setRecoveryQrError(null);
        setCopiedLink(false);
        setCopiedRecoveryLink(false);
        setQrModalOpen(true);

        await cargarEstadoQrEstudiante(targetStudentId);
    };

    const handleGenerateRecoveryQR = async () => {
        if (!PORTAL_FAMILIA_ENABLED || !est?.id) return;

        const targetStudentId = Number(est.id);
        setRecoveryQrError(null);
        setCopiedRecoveryLink(false);
        setIsGeneratingRecoveryQr(true);

        try {
            const { data, error } = await supabase.rpc('portal_generar_qr_recuperacion', {
                p_estudiante_id: targetStudentId,
            });

            if (error) throw error;

            if (!data || !data.success) {
                setRecoveryQrError(data?.error || 'No se pudo generar el QR de recuperación.');
                return;
            }

            if (typeof data.access_token === 'string') {
                saveStudentToken(targetStudentId, data.access_token);
            }
            if (typeof data.has_pin === 'boolean') {
                setHasPinByStudent(prev => ({ ...prev, [targetStudentId]: Boolean(data.has_pin) }));
            }
            setRecoveryQrByStudent(prev => ({
                ...prev,
                [targetStudentId]: data.recuperacion ?? null,
            }));
            setActiveQrTab('recuperacion');
        } catch (err) {
            console.error("Error generating recovery QR:", err);
            setRecoveryQrError('Ocurrió un error al generar el QR de recuperación.');
        } finally {
            setIsGeneratingRecoveryQr(false);
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

    const handleCopyRecoveryUrl = async () => {
        if (!recoveryPortalUrl) return;
        try {
            await navigator.clipboard.writeText(recoveryPortalUrl);
            setCopiedRecoveryLink(true);
            setTimeout(() => setCopiedRecoveryLink(false), 2000);
        } catch {
            // Fallback silencioso
        }
    };

    const handleDownloadQrImage = (wrapEl: HTMLDivElement | null, tipo: 'Acceso' | 'Recuperacion') => {
        if (!wrapEl) return;
        const svgEl = wrapEl.querySelector('svg');
        if (!svgEl) return;

        try {
            const serializer = new XMLSerializer();
            const svgString = serializer.serializeToString(svgEl);
            const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
            const url = URL.createObjectURL(svgBlob);
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const size = 640;
                const padding = 48;
                canvas.width = size;
                canvas.height = size + 84;
                const ctx = canvas.getContext('2d');
                if (ctx) {
                    ctx.fillStyle = '#FFFFFF';
                    ctx.fillRect(0, 0, canvas.width, canvas.height);

                    ctx.fillStyle = tipo === 'Recuperacion' ? '#8F641B' : '#1B1F2A';
                    ctx.font = 'bold 20px sans-serif';
                    ctx.textAlign = 'center';
                    ctx.fillText(
                        tipo === 'Recuperacion'
                            ? 'CIELO · QR DE RECUPERACIÓN DE CLAVE'
                            : 'CIELO · QR DE ACCESO AL PORTAL',
                        canvas.width / 2,
                        36
                    );

                    ctx.drawImage(img, padding, 56, size - padding * 2, size - padding * 2);

                    ctx.fillStyle = '#1B1F2A';
                    ctx.font = 'bold 22px sans-serif';
                    ctx.fillText(`${est.nombre || ''} ${est.apellido || ''}`.trim(), canvas.width / 2, size + 24);

                    ctx.fillStyle = '#6B7280';
                    ctx.font = '16px sans-serif';
                    ctx.fillText(
                        tipo === 'Recuperacion'
                            ? 'Escanear para establecer una nueva clave (uso único)'
                            : `${curso?.grado || ''} ${curso?.seccion || ''}`.trim(),
                        canvas.width / 2,
                        size + 52
                    );

                    const pngUrl = canvas.toDataURL('image/png');
                    const a = document.createElement('a');
                    const safeName = `${est.nombre || 'Estudiante'}_${est.apellido || ''}`
                        .trim()
                        .replace(/\s+/g, '_')
                        .replace(/[^a-zA-Z0-9_-]/g, '');
                    a.href = pngUrl;
                    a.download = `QR_${tipo}_${safeName || 'Estudiante'}.png`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                }
                URL.revokeObjectURL(url);
            };
            img.src = url;
        } catch (e) {
            console.error('Error al descargar imagen QR:', e);
        }
    };

    const formatearFechaHoraCorta = (iso: string | null | undefined) => {
        if (!iso) return '—';
        try {
            const d = new Date(iso);
            if (Number.isNaN(d.getTime())) return '—';
            return d.toLocaleString('es-DO', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
            });
        } catch {
            return '—';
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
            const matchesRole = isTutor || !currentAsignatura || sonMismaAsignatura(actAsignatura, currentAsignatura) || normalizeArea(actAsignatura) === normalizeArea(currentAsignatura);
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
                                            className="w-full max-w-md sm:max-w-lg max-h-[92vh] overflow-y-auto bg-white rounded-2xl sm:rounded-3xl border border-(--border-unificado) shadow-lg px-5 py-6 sm:px-7 sm:py-7 text-center relative"
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

                                            {/* Selector visual entre QR de Acceso y QR de Recuperación */}
                                            <div className="mt-4 grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-(--linen)/50 border border-(--border-unificado)">
                                                <button
                                                    type="button"
                                                    onClick={() => setActiveQrTab('acceso')}
                                                    className={`py-2 px-3 rounded-lg text-[11px] font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                                                        activeQrTab === 'acceso'
                                                            ? 'bg-[#1B1F2A] text-white shadow-2xs'
                                                            : 'text-(--ink-soft) hover:text-(--ink)'
                                                    }`}
                                                >
                                                    <QrCode size={13} />
                                                    <span>QR de Acceso</span>
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setActiveQrTab('recuperacion')}
                                                    className={`py-2 px-3 rounded-lg text-[11px] font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                                                        activeQrTab === 'recuperacion'
                                                            ? 'bg-[#8F641B] text-white shadow-2xs'
                                                            : 'text-(--ink-soft) hover:text-(--ink)'
                                                    }`}
                                                >
                                                    <KeyRound size={13} />
                                                    <span>QR de Recuperación</span>
                                                </button>
                                            </div>

                                            {activeQrTab === 'acceso' ? (
                                                <>
                                                    <div className="mt-4 flex items-center justify-center gap-2">
                                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-(--ink)">
                                                            <ShieldCheck size={12} className="text-[#537BAC]" />
                                                            <span>QR de Acceso Permanente</span>
                                                        </span>
                                                        <span
                                                            className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                                                currentStudentHasPin
                                                                    ? 'bg-[#689C63]/15 text-[#4B7547]'
                                                                    : 'bg-amber-50 text-[#8F641B] border border-amber-200'
                                                            }`}
                                                        >
                                                            {currentStudentHasPin ? 'Clave configurada' : 'Primer acceso pendiente'}
                                                        </span>
                                                    </div>

                                                    <div className="mt-4 mb-4 flex flex-col items-center justify-center">
                                                        {isGeneratingQr && !portalUrl ? (
                                                            <div className="w-48 h-48 sm:w-52 sm:h-52 rounded-2xl bg-(--linen)/40 border border-(--border-unificado) flex flex-col items-center justify-center gap-2.5 p-4">
                                                                <Loader2 size={26} className="animate-spin text-(--ink-soft)" />
                                                                <span className="text-xs font-medium text-(--ink-soft)">
                                                                    Generando código QR...
                                                                </span>
                                                            </div>
                                                        ) : portalUrl ? (
                                                            <>
                                                                <div ref={qrSvgWrapRef} className="inline-flex flex-col items-center">
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
                                                                </div>

                                                                <div className="mt-3 flex items-center justify-center gap-2">
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleDownloadQrImage(qrSvgWrapRef.current, 'Acceso')}
                                                                        className="px-3 py-1.5 rounded-lg border border-(--border-unificado) bg-(--linen)/50 hover:bg-(--linen) text-(--ink) text-[11px] font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                                                                    >
                                                                        <Download size={12} />
                                                                        <span>Descargar QR</span>
                                                                    </button>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => setActiveQrTab('recuperacion')}
                                                                        className="px-3 py-1.5 rounded-lg border border-amber-300 bg-amber-50 hover:bg-amber-100/80 text-[#8F641B] text-[11px] font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                                                                    >
                                                                        <KeyRound size={12} />
                                                                        <span>Recuperar clave</span>
                                                                    </button>
                                                                </div>

                                                                <p className="text-xs text-(--ink-soft) mt-3 leading-relaxed max-w-xs">
                                                                    {currentStudentHasPin
                                                                        ? 'Este es el QR habitual del estudiante. Al escanearlo solicitará la clave de seguridad que el usuario configuró.'
                                                                        : 'En el primer acceso mediante este QR, el estudiante o su familia establecerá su propia clave de seguridad.'}
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
                                                </>
                                            ) : (
                                                <div className="mt-4 text-left">
                                                    {/* Encabezado diferencial del QR de recuperación */}
                                                    <div className="p-3.5 rounded-xl bg-amber-50/80 border border-amber-200 mb-4">
                                                        <div className="flex items-center justify-between gap-2 mb-1">
                                                            <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[#8F641B]">
                                                                <KeyRound size={13} />
                                                                <span>QR de Recuperación de Clave</span>
                                                            </span>

                                                            {activeRecoveryState && (
                                                                <span
                                                                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                                                        activeRecoveryState.estado === 'pendiente'
                                                                            ? 'bg-amber-200/80 text-[#7A5211]'
                                                                            : activeRecoveryState.estado === 'utilizado'
                                                                                ? 'bg-[#689C63]/20 text-[#4B7547]'
                                                                                : 'bg-rose-100 text-rose-700'
                                                                    }`}
                                                                >
                                                                    {activeRecoveryState.estado === 'pendiente'
                                                                        ? 'Pendiente'
                                                                        : activeRecoveryState.estado === 'utilizado'
                                                                            ? 'Utilizado'
                                                                            : 'Vencido'}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <p className="text-[11px] text-(--ink-soft) leading-relaxed">
                                                            Exclusivo para cuando el estudiante o su familia olvide su clave. Al escanearlo solicita crear una nueva clave y se desactiva tras un único uso (vigencia de 24 h).
                                                        </p>
                                                    </div>

                                                    {recoveryQrError && (
                                                        <div className="mb-3 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-700">
                                                            {recoveryQrError}
                                                        </div>
                                                    )}

                                                    {activeRecoveryState && (
                                                        <div className="mb-4 px-3.5 py-2.5 rounded-xl bg-(--linen)/35 border border-(--border-unificado) text-[11px] text-(--ink-soft) space-y-1">
                                                            <div className="flex items-center justify-between">
                                                                <span className="font-semibold text-(--ink)">Estado del QR:</span>
                                                                <span className="font-bold uppercase text-(--ink)">
                                                                    {activeRecoveryState.estado === 'pendiente'
                                                                        ? 'Pendiente de uso'
                                                                        : activeRecoveryState.estado === 'utilizado'
                                                                            ? 'Utilizado'
                                                                            : 'Vencido'}
                                                                </span>
                                                            </div>
                                                            <div className="flex items-center justify-between">
                                                                <span>Generado:</span>
                                                                <span className="font-medium text-(--ink)">
                                                                    {formatearFechaHoraCorta(activeRecoveryState.created_at)}
                                                                </span>
                                                            </div>
                                                            {activeRecoveryState.estado === 'pendiente' && (
                                                                <div className="flex items-center justify-between">
                                                                    <span>Vence:</span>
                                                                    <span className="font-medium text-(--ink)">
                                                                        {formatearFechaHoraCorta(activeRecoveryState.expires_at)}
                                                                    </span>
                                                                </div>
                                                            )}
                                                            {activeRecoveryState.used_at && (
                                                                <div className="flex items-center justify-between">
                                                                    <span>Utilizado el:</span>
                                                                    <span className="font-medium text-[#4B7547]">
                                                                        {formatearFechaHoraCorta(activeRecoveryState.used_at)}
                                                                    </span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}

                                                    {recoveryPortalUrl ? (
                                                        <div className="flex flex-col items-center text-center">
                                                            <div
                                                                ref={recoveryQrSvgWrapRef}
                                                                className="inline-flex flex-col items-center p-4 bg-amber-50/40 rounded-2xl border-2 border-dashed border-[#C58F2B]"
                                                            >
                                                                <span className="mb-2 px-2.5 py-0.5 rounded-full bg-[#8F641B] text-white text-[9px] font-bold uppercase tracking-widest">
                                                                    Solo restablecimiento · Uso único
                                                                </span>
                                                                <QRCodeSVG
                                                                    value={recoveryPortalUrl}
                                                                    size={180}
                                                                    level="M"
                                                                    marginSize={2}
                                                                    bgColor="#FFFFFF"
                                                                    fgColor="#1B1F2A"
                                                                    className="w-40 h-40 sm:w-44 sm:h-44 rounded-lg"
                                                                />
                                                            </div>

                                                            <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleDownloadQrImage(recoveryQrSvgWrapRef.current, 'Recuperacion')}
                                                                    className="px-3.5 py-1.5 rounded-lg bg-[#8F641B] hover:bg-[#7A5211] text-white text-[11px] font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                                                                >
                                                                    <Download size={12} />
                                                                    <span>Descargar QR de recuperación</span>
                                                                </button>

                                                                <button
                                                                    type="button"
                                                                    onClick={handleGenerateRecoveryQR}
                                                                    disabled={isGeneratingRecoveryQr}
                                                                    className="px-3 py-1.5 rounded-lg border border-(--border-unificado) bg-white hover:bg-(--linen)/60 text-(--ink) text-[11px] font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                                                                    title="Generar un nuevo QR e invalidar el anterior"
                                                                >
                                                                    {isGeneratingRecoveryQr ? (
                                                                        <Loader2 size={12} className="animate-spin" />
                                                                    ) : (
                                                                        <RefreshCw size={12} />
                                                                    )}
                                                                    <span>Generar nuevo QR</span>
                                                                </button>
                                                            </div>

                                                            <div className="w-full mt-4 pt-4 border-t border-(--border-unificado) text-left">
                                                                <label className="block text-[10px] font-bold text-[#8F641B] uppercase tracking-widest mb-1.5">
                                                                    Enlace de recuperación (un solo uso)
                                                                </label>
                                                                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                                                                    <input
                                                                        type="text"
                                                                        readOnly
                                                                        value={recoveryPortalUrl}
                                                                        onFocus={e => e.currentTarget.select()}
                                                                        className="text-xs px-3 py-2 border border-amber-300 rounded-xl bg-amber-50/40 w-full min-w-0 text-(--ink) font-mono focus:outline-none"
                                                                    />
                                                                    <button
                                                                        type="button"
                                                                        onClick={handleCopyRecoveryUrl}
                                                                        className="min-h-9 px-3.5 py-2 bg-(--linen) hover:bg-(--linen)/80 text-(--ink) text-xs font-semibold rounded-xl transition-colors flex items-center justify-center gap-1.5 shrink-0 cursor-pointer"
                                                                    >
                                                                        {copiedRecoveryLink ? (
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
                                                        </div>
                                                    ) : (
                                                        <div className="text-center py-4 px-3 rounded-2xl bg-(--linen)/30 border border-(--border-unificado)">
                                                            <p className="text-xs text-(--ink-soft) leading-relaxed mb-4 max-w-xs mx-auto">
                                                                {activeRecoveryState?.estado === 'utilizado'
                                                                    ? 'El último QR de recuperación ya fue utilizado para cambiar la clave. Si el usuario volvió a olvidarla, puedes generar uno nuevo.'
                                                                    : activeRecoveryState?.estado === 'vencido'
                                                                        ? 'El último QR de recuperación venció sin ser utilizado. Genera uno nuevo para entregárselo al estudiante o su familia.'
                                                                        : 'Genera un QR temporal de un solo uso para que el estudiante o su familia pueda establecer una nueva clave de seguridad.'}
                                                            </p>
                                                            <button
                                                                type="button"
                                                                onClick={handleGenerateRecoveryQR}
                                                                disabled={isGeneratingRecoveryQr}
                                                                className="px-4 py-2.5 bg-[#8F641B] hover:bg-[#7A5211] text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all inline-flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 shadow-2xs"
                                                            >
                                                                {isGeneratingRecoveryQr ? (
                                                                    <>
                                                                        <Loader2 size={14} className="animate-spin" />
                                                                        <span>Generando QR de recuperación...</span>
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        <KeyRound size={14} />
                                                                        <span>Generar QR de recuperación</span>
                                                                    </>
                                                                )}
                                                            </button>
                                                        </div>
                                                    )}
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
