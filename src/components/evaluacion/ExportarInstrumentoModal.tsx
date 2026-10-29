import React, { useState, useEffect } from 'react';
import {
    FileDown,
    Cloud,
    Loader2,
    CheckCircle2,
    ExternalLink,
    AlertCircle,
    Info,
} from 'lucide-react';
import { CieloModal } from '../ui/CieloModal';
import type { Actividad, Curso, Estudiante, UserProfile } from '../../types';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    tipo: 'rubrica' | 'cotejo';
    curso: Curso | null | undefined;
    asignaturaNombre: string;
    periodo: string;
    actividades: Actividad[];
    selectedActividadId: number | null;
    userProfile?: UserProfile | null;
    estudiantes: Estudiante[];
    onExportarWord: (actividadId: number | null) => Promise<void>;
    onGuardarDrive: (actividadId: number | null) => Promise<{ fileId: string; viewUrl: string; fileName: string }>;
}

export const ExportarInstrumentoModal: React.FC<Props> = ({
    isOpen,
    onClose,
    tipo,
    curso,
    asignaturaNombre,
    periodo,
    actividades,
    selectedActividadId,
    estudiantes,
    onExportarWord,
    onGuardarDrive,
}) => {
    const [actividadId, setActividadId] = useState<number | null>(selectedActividadId);
    const [isExportingWord, setIsExportingWord] = useState(false);
    const [isSavingDrive, setIsSavingDrive] = useState(false);
    const [driveSuccess, setDriveSuccess] = useState<{ viewUrl: string; fileName: string } | null>(null);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) {
            setActividadId(selectedActividadId);
            setDriveSuccess(null);
            setErrorMsg(null);
        }
    }, [isOpen, selectedActividadId]);

    const actividadSeleccionada = actividades.find(a => a.id === actividadId) || null;
    const tituloTipo = tipo === 'rubrica' ? 'Rúbrica de Evaluación' : 'Lista de Cotejo';
    const totalEstudiantes = estudiantes.length;

    const handleDownloadWord = async () => {
        setIsExportingWord(true);
        setErrorMsg(null);
        try {
            await onExportarWord(actividadId);
        } catch (err: unknown) {
            const error = err as Error;
            setErrorMsg(error.message || 'Error al generar el documento Word');
        } finally {
            setIsExportingWord(false);
        }
    };

    const handleSaveDrive = async () => {
        setIsSavingDrive(true);
        setErrorMsg(null);
        setDriveSuccess(null);
        try {
            const res = await onGuardarDrive(actividadId);
            setDriveSuccess({ viewUrl: res.viewUrl, fileName: res.fileName });
        } catch (err: unknown) {
            const error = err as Error;
            setErrorMsg(error.message || 'No se pudo guardar en Google Drive. Verifique la autorización.');
        } finally {
            setIsSavingDrive(false);
        }
    };

    return (
        <CieloModal
            isOpen={isOpen}
            onClose={onClose}
            title={
                <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#689C63]/10 text-[#689C63]">
                        <FileDown size={18} />
                    </div>
                    <span className="text-[#2E3330] font-bold">Exportar {tituloTipo}</span>
                </div>
            }
            subtitle="Genera un documento Word (.docx) editable o guárdalo directamente en tu Google Drive"
            maxWidth="xl"
        >
            <div className="space-y-4 text-sm font-sans">
                {/* Selector de Actividad */}
                <div className="rounded-xl border border-[#E9E9DB] bg-[#FCFCFA] p-4 space-y-3">
                    <div className="flex items-center justify-between">
                        <label className="text-xs font-bold uppercase tracking-wider text-[#4F564C]">
                            Vincular con Actividad
                        </label>
                        {actividadSeleccionada ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#BFC9A6]/25 text-[#43663F] border border-[#BFC9A6]/60">
                                Actividad vinculada
                            </span>
                        ) : (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-[#E9E9DB] text-[#5E655B] border border-[#D8D8CE]">
                                En blanco / Sin evaluar
                            </span>
                        )}
                    </div>

                    <select
                        className="w-full rounded-lg border border-[#D8D8CE] bg-white px-3 py-2 text-sm text-[#2E3330] font-medium outline-none transition-colors focus:border-[#689C63] focus:ring-1 focus:ring-[#689C63] cursor-pointer"
                        value={actividadId ?? ''}
                        onChange={(e) => {
                            const val = e.target.value ? Number(e.target.value) : null;
                            setActividadId(val);
                            setDriveSuccess(null);
                        }}
                    >
                        <option value="">
                            — Sin actividad (Plantilla en blanco para completar o imprimir a mano) —
                        </option>
                        {actividades.map((act) => (
                            <option key={act.id} value={act.id}>
                                {act.nombre} ({act.periodo})
                            </option>
                        ))}
                    </select>

                    <div className="flex items-start gap-2 text-xs text-[#5E655B]">
                        <Info size={14} className="mt-0.5 shrink-0 text-[#537BAC]" />
                        {actividadSeleccionada ? (
                            <span>
                                El documento incluirá los <strong className="text-[#2E3330]">números reales</strong> de los {totalEstudiantes} estudiantes en las celdas correspondientes a su nivel de desempeño registrado.
                            </span>
                        ) : (
                            <span>
                                Se generará el instrumento con todos sus criterios y niveles, con casillas y líneas previstas para registrar los números de los estudiantes manualmente.
                            </span>
                        )}
                    </div>
                </div>

                {/* Resumen del instrumento */}
                <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="rounded-lg border border-[#E9E9DB] bg-[#FCFCFA] p-3 space-y-1">
                        <p className="font-bold text-[#7A8276] uppercase tracking-wider text-[10px]">Curso y Sección</p>
                        <p className="font-bold text-[#2E3330] text-sm">
                            {curso ? `${curso.grado} ${curso.seccion}` : '—'}
                        </p>
                        <p className="text-[#5E655B]">{asignaturaNombre}</p>
                    </div>

                    <div className="rounded-lg border border-[#E9E9DB] bg-[#FCFCFA] p-3 space-y-1">
                        <p className="font-bold text-[#7A8276] uppercase tracking-wider text-[10px]">Período y Nómina</p>
                        <p className="font-bold text-[#2E3330] text-sm">{periodo}</p>
                        <p className="text-[#5E655B]">{totalEstudiantes} estudiantes registrados</p>
                    </div>
                </div>

                {/* Mensaje de éxito en Drive */}
                {driveSuccess && (
                    <div className="rounded-xl border border-[#BFC9A6] bg-[#BFC9A6]/20 p-4 space-y-2 text-[#2E3330]">
                        <div className="flex items-center gap-2">
                            <CheckCircle2 size={18} className="text-[#689C63] shrink-0" />
                            <p className="font-bold text-sm text-[#3E5C3B]">¡Guardado con éxito en Google Drive!</p>
                        </div>
                        <p className="text-xs text-[#4F564C]">
                            Archivo: <code className="bg-[#FCFCFA] border border-[#BFC9A6]/50 text-[#3E5C3B] px-1.5 py-0.5 rounded font-mono text-[11px]">{driveSuccess.fileName}</code> en tu carpeta <span className="font-semibold text-[#2E3330]">CIELO / Instrumentos de evaluación</span>.
                        </p>
                        <div className="pt-1">
                            <a
                                href={driveSuccess.viewUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#689C63] hover:bg-[#588554] text-white font-semibold text-xs transition-colors"
                            >
                                <ExternalLink size={13} />
                                Abrir en Google Drive
                            </a>
                        </div>
                    </div>
                )}

                {/* Mensaje de Error */}
                {errorMsg && (
                    <div className="rounded-xl border border-[#EB8847]/40 bg-[#FCFCFA] p-3.5 text-xs text-[#5E2B1F] flex items-start gap-2.5">
                        <AlertCircle size={16} className="text-[#EB8847] shrink-0 mt-0.5" />
                        <div className="space-y-1">
                            <p className="font-bold text-[#8C3A1F]">Ocurrió un error</p>
                            <p>{errorMsg}</p>
                        </div>
                    </div>
                )}

                {/* Botones de Acción */}
                <div className="pt-2 flex flex-col sm:flex-row gap-3">
                    <button
                        type="button"
                        onClick={handleDownloadWord}
                        disabled={isExportingWord || isSavingDrive}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-[#537BAC] hover:bg-[#476B96] text-white font-bold text-xs uppercase tracking-wider transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    >
                        {isExportingWord ? (
                            <>
                                <Loader2 size={16} className="animate-spin text-white" />
                                Generando Word...
                            </>
                        ) : (
                            <>
                                <FileDown size={16} />
                                Descargar Word (.docx)
                            </>
                        )}
                    </button>

                    <button
                        type="button"
                        onClick={handleSaveDrive}
                        disabled={isExportingWord || isSavingDrive}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-[#689C63] hover:bg-[#588554] text-white font-bold text-xs uppercase tracking-wider transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    >
                        {isSavingDrive ? (
                            <>
                                <Loader2 size={16} className="animate-spin text-white" />
                                Guardando en Drive...
                            </>
                        ) : (
                            <>
                                <Cloud size={16} />
                                Guardar en Google Drive
                            </>
                        )}
                    </button>
                </div>
            </div>
        </CieloModal>
    );
};
export default ExportarInstrumentoModal;
