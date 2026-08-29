import React, { useMemo } from 'react';
import { Check, FileText } from 'lucide-react';
import type { BCKey, RecuperacionCotejo, Estudiante, Actividad, CalificacionActividad, ContextoRecuperacion } from '../../types';
import { INDICADORES_RECUPERACION, TITULOS_RECUPERACION } from '../../constants/recuperacionCotejo';
import { actividadesParaRecuperacion, calcularResultadoRecuperacion, puntajeActualBC } from '../../utils/recuperacion';
import { CieloModal } from '../ui/CieloModal';

interface RecuperacionCotejoModalProps {
    targetEst?: Estudiante | null;
    target: { estId: number, bc: number, bcName: BCKey } | null;
    onClose: () => void;
    onSetCelda: (estId: number, bc: 1 | 2 | 3 | 4, indicador: string, actividadId: number, logrado: boolean) => void;
    onSave: (contextos: ContextoRecuperacion[]) => Promise<void>;
    isSaving?: boolean;
    isDirty?: boolean;
    selectedPeriodo: string;
    BC_COLOR_THEMES: Record<BCKey, { bg: string, text: string, active: string }>;
    BC_ICONS: Record<BCKey, React.ReactNode>;
    celdas: RecuperacionCotejo[];
    actividades: Actividad[];
    calificaciones: CalificacionActividad[];
}

const RecuperacionCotejoModal: React.FC<RecuperacionCotejoModalProps> = ({
    targetEst,
    target,
    onClose,
    onSetCelda,
    onSave,
    isSaving = false,
    selectedPeriodo,
    BC_COLOR_THEMES,
    BC_ICONS,
    celdas,
    actividades,
    calificaciones,
}) => {
    const bcNum = (target?.bc ?? 1) as 1 | 2 | 3 | 4;
    const bcKey = (target?.bcName || (`BC${target?.bc ?? 1}`)) as BCKey;
    const indicadores = INDICADORES_RECUPERACION[bcNum] || [];

    const columnas: Actividad[] = useMemo(
        () => {
            if (!target || !targetEst) return [];
            return actividadesParaRecuperacion(actividades, calificaciones, targetEst.id, bcNum, selectedPeriodo);
        },
        [actividades, calificaciones, targetEst, target, bcNum, selectedPeriodo],
    );

    if (!target || !targetEst) return null;

    const totalEvidencias = indicadores.length * columnas.length;
    const celdasBC = celdas.filter(c =>
        c.estudianteId === targetEst.id &&
        c.bc === bcNum &&
        c.periodo === selectedPeriodo,
    );

    // RESULTADO DE RECUPERACIÓN: puntaje_actual + puntos recuperados (entero).
    const puntajeActual = puntajeActualBC(actividades, calificaciones, targetEst.id, bcNum, selectedPeriodo);
    const resultadoFinal = calcularResultadoRecuperacion(puntajeActual, celdasBC.length, totalEvidencias);

    const celdaBtn = (indicador: string, act: Actividad) => {
        const logrado = celdasBC.some(c => c.indicador === indicador && c.actividadId === act.id);
        const base = 'w-full h-12 flex items-center justify-center transition-all mx-auto';
        if (logrado) {
            return (
                <button onClick={() => onSetCelda(targetEst.id, bcNum, indicador, act.id, false)} title="✓ Logrado — clic para desmarcar (queda vacío = NO LOGRO)" className={`${base} bg-(--success)/15 text-(--success) hover:bg-(--success)/25`}>
                    <span className="flex items-center gap-1.5"><Check size={16} strokeWidth={3} /><span className="text-[10px] font-black uppercase tracking-widest">Logrado</span></span>
                </button>
            );
        }
        return (
            <button onClick={() => onSetCelda(targetEst.id, bcNum, indicador, act.id, true)} title="Vacío = NO LOGRO — clic para marcar ✓ Logrado" className={`${base} text-slate-300 border border-dashed border-slate-200 hover:bg-slate-50 hover:text-slate-400`}>
                <span className="text-slate-300 font-black">–</span>
            </button>
        );
    };

    const fmt = (n: number): string => (Number.isInteger(n) ? String(n) : n.toFixed(2));

const modalFooter = (
        <div className="flex flex-wrap items-center justify-between w-full gap-3">
            <div className="text-left">
                <span className="block text-[10px] font-black uppercase tracking-widest text-slate-400">Resultado de recuperación</span>
                <span className={`text-2xl font-black leading-none ${resultadoFinal === null ? 'text-slate-300' : resultadoFinal >= 70 ? 'text-emerald-600' : 'text-(--danger)'}`}>
                    {resultadoFinal === null ? '—' : `${fmt(resultadoFinal)} pts`}
                </span>
            </div>
            <div className="flex items-center gap-3">
                <button
                    type="button"
                    onClick={onClose}
                className="rounded-full px-6 py-2.5 text-xs font-black uppercase tracking-widest text-slate-500 hover:bg-slate-100 border border-slate-200 transition-all duration-200"
            >
                Cancelar
            </button>
            <button
                type="button"
                disabled={isSaving}
                onClick={async () => {
                    if (isSaving) return;
                    try {
                        await onSave([{ estudianteId: targetEst.id, bc: bcNum, periodo: selectedPeriodo }]);
                        onClose();
                    } catch { /* error ya logueado en saveCotejo */ }
                }}
                className="rounded-full px-8 py-2.5 text-xs font-black uppercase tracking-widest text-[#2E3330] bg-[#689C63]/15 border border-[#689C63]/40 hover:bg-[#689C63]/25 hover:border-[#689C63]/60 shadow-sm transition-all duration-200 disabled:bg-[#689C63]/8 disabled:border-[#689C63]/15 disabled:text-[#2E3330]/60 disabled:cursor-not-allowed"
            >
                {isSaving ? 'Guardando…' : 'Guardar recuperación'}
            </button>
            </div>
        </div>
    );

    return (
        <CieloModal
            isOpen={true}
            onClose={onClose}
            title="Lista de Cotejo de Recuperación"
            subtitle={`Estudiante: ${targetEst.nombre ?? ''} ${targetEst.apellido ?? ''} · ${selectedPeriodo}`}
            icon={<FileText size={20} />}
            maxWidth="5xl"
            footer={modalFooter}
        >
            <div className="mb-3">
                <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded shrink-0 flex items-center justify-center ${BC_COLOR_THEMES[bcKey].bg} ${BC_COLOR_THEMES[bcKey].text}`}>
                        {BC_ICONS[bcKey]}
                    </div>
                    <span className="block text-sm font-black uppercase tracking-widest text-slate-800">{bcKey} — {TITULOS_RECUPERACION[bcKey]}</span>
                </div>
            </div>

            {columnas.length === 0 ? (
                <div className="py-12 text-center">
                    <span className="text-slate-300 block mb-2"><FileText size={40} className="mx-auto" /></span>
                    <p className="text-sm font-black text-slate-500 uppercase tracking-widest">Sin actividades para evaluar</p>
                    <p className="text-xs font-bold text-slate-400 mt-1 max-w-md mx-auto">No hay actividades de {TITULOS_RECUPERACION[bcKey]} con puntaje menor a 70 en {selectedPeriodo}. Esta competencia no tiene evidencias de recuperación.</p>
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full border-collapse border border-slate-200">
                        <thead>
                            <tr className="bg-slate-50 text-xs font-black uppercase text-slate-500 tracking-wider">
                                <th className="border border-slate-200 p-3 text-left w-1/4">Indicador de Logro</th>
                                {columnas.map(act => (
                                    <th key={act.id} className="border border-slate-200 p-3 text-center min-w-[150px]">
                                        <span className="block text-xs font-black text-slate-700 leading-snug">{act.nombre}</span>
                                        <span className="inline-block mt-1 px-2 py-0.5 rounded-full bg-(--danger)/10 text-(--danger) text-[10px] font-black uppercase tracking-widest">puntaje &lt; 70</span>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {indicadores.map(indicador => (
                                <tr key={indicador} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="border border-slate-200 p-3">
                                        <span className="text-xs font-bold text-slate-700 leading-snug">{indicador}</span>
                                    </td>
                                    {columnas.map(act => (
                                        <td key={act.id} className="border border-slate-200 p-1.5 text-center">
                                            {celdaBtn(indicador, act)}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </CieloModal>
    );
};

export default React.memo(RecuperacionCotejoModal);