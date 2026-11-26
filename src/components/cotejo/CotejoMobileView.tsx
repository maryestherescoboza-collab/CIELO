import React, { useRef, useState, useEffect } from 'react';
import {
    ChevronLeft,
    ChevronRight,
    Check,
    X as CloseIcon,
    CheckCircle,
    Target,
    Loader2,
    SlidersHorizontal,
    FileDown,
    Sparkles,
} from 'lucide-react';
import type {
    CriterioCotejo,
    Estudiante,
    Curso,
    Actividad,
} from '../../types';
import { getAsignaturaNombre } from '../../constants/asignaturas';

interface CotejoMobileViewProps {
    curso: Curso | undefined;
    selectedAsignatura: string;
    selectedPeriodo: string;
    selectedAct: Actividad | null;
    sortedEsts: Estudiante[];
    selectedEstId: number | null;
    activeCell: { critId: number; val: number } | null;
    onSelectCell: (critId: number, val: number) => void;
    onAvatarClick: (estId: number) => void;
    onCancelActiveCell: () => void;
    localCriterios: CriterioCotejo[];
    respuestas: Record<number, number | null>;
    multiEvaluations: Record<number, Record<number, number | null>>;
    onOpenConfigModal: () => void;
    onOpenExportModal?: () => void;
    onOpenGenerarIA?: () => void;
    onSave: () => void;
    isSaving: boolean;
    savedFlash: boolean;
    calcPuntajeTotal: () => number;
    readOnly?: boolean;
}

export const CotejoMobileView: React.FC<CotejoMobileViewProps> = ({
    curso,
    selectedAsignatura,
    selectedPeriodo,
    selectedAct,
    sortedEsts,
    selectedEstId,
    activeCell,
    onSelectCell,
    onAvatarClick,
    onCancelActiveCell,
    localCriterios,
    respuestas,
    multiEvaluations,
    onOpenConfigModal,
    onOpenExportModal,
    onOpenGenerarIA,
    onSave,
    isSaving,
    savedFlash,
    calcPuntajeTotal,
    readOnly = false,
}) => {
    const carouselRef = useRef<HTMLDivElement>(null);
    const studentsScrollRef = useRef<HTMLDivElement>(null);

    // Active criterion in carousel view
    const [focusedCritIdx, setFocusedCritIdx] = useState(0);

    // Keep focusedCritIdx synchronized with activeCell if changed externally
    useEffect(() => {
        if (activeCell) {
            const idx = localCriterios.findIndex((c) => c.id === activeCell.critId);
            if (idx >= 0 && idx !== focusedCritIdx) {
                setFocusedCritIdx(idx);
                scrollToCrit(idx);
            }
        }
    }, [activeCell, localCriterios]);

    const scrollToCrit = (idx: number) => {
        const el = document.getElementById(`cotejo-card-${idx}`);
        if (el && carouselRef.current) {
            el.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
        }
    };

    const currentCrit = localCriterios[focusedCritIdx] || localCriterios[0];

    const handlePrevCrit = () => {
        if (localCriterios.length === 0) return;
        const nextIdx = focusedCritIdx > 0 ? focusedCritIdx - 1 : localCriterios.length - 1;
        setFocusedCritIdx(nextIdx);
        scrollToCrit(nextIdx);
    };

    const handleNextCrit = () => {
        if (localCriterios.length === 0) return;
        const nextIdx = focusedCritIdx < localCriterios.length - 1 ? focusedCritIdx + 1 : 0;
        setFocusedCritIdx(nextIdx);
        scrollToCrit(nextIdx);
    };

    const scrollStudentIntoView = (estId: number) => {
        const el = document.getElementById(`mobile-est-${estId}`);
        if (el && studentsScrollRef.current) {
            el.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
        }
    };

    // Total distinct students evaluated in multiEvaluations
    const totalStudentsInMulti = Object.keys(multiEvaluations).filter((idStr) => {
        const ev = multiEvaluations[Number(idStr)];
        return ev && Object.keys(ev).length > 0;
    }).length;

    const currentScore = calcPuntajeTotal();

    // Check if Cumple (100) or No Cumple (0) is active for currentCrit
    const isCumpleActive = activeCell?.critId === currentCrit?.id && activeCell?.val === 100;
    const isNoCumpleActive = activeCell?.critId === currentCrit?.id && activeCell?.val === 0;

    return (
        <div className="flex flex-col h-full bg-[#EFF3F2] overflow-hidden select-none">
            {/* 1. Header Táctil Fiel a la Maqueta */}
            <header className="px-4 pt-4 pb-2 bg-transparent shrink-0">
                <div className="flex items-center justify-between">
                    {/* Indicadores circulares decorativos del mockup en la esquina superior izquierda */}
                    <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-[#FFB598]" />
                        <span className="w-2.5 h-2.5 rounded-full bg-[#FF7A45]" />
                    </div>

                    {/* Título Central del Mockup */}
                    <h1 className="text-2xl sm:text-3xl font-black text-slate-800 tracking-tight font-notion-title uppercase text-center flex-1 pr-6">
                        Lista de Cotejo
                    </h1>

                    {/* Acciones de exportación / IA */}
                    <div className="flex items-center gap-1">
                        {onOpenGenerarIA && (
                            <button
                                type="button"
                                onClick={onOpenGenerarIA}
                                className="p-1.5 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-white/60 transition-colors cursor-pointer"
                                title="Generar con IA"
                            >
                                <Sparkles size={18} className="text-amber-500" />
                            </button>
                        )}
                        {onOpenExportModal && (
                            <button
                                type="button"
                                onClick={onOpenExportModal}
                                className="p-1.5 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-white/60 transition-colors cursor-pointer"
                                title="Exportar lista de cotejo"
                            >
                                <FileDown size={18} />
                            </button>
                        )}
                    </div>
                </div>

                {/* 2. Barra de Selección de Contexto (Píldora Compacta) */}
                <div className="mt-2.5">
                    <button
                        type="button"
                        onClick={onOpenConfigModal}
                        className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-white/80 hover:bg-white border border-slate-200/70 text-left transition-all shadow-2xs cursor-pointer group backdrop-blur-xs"
                    >
                        <div className="min-w-0 flex-1 pr-2">
                            <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-black text-xs text-slate-800 truncate">
                                    {curso ? `${curso.grado} ${curso.seccion}` : 'Seleccionar curso'}
                                </span>
                                <span className="text-[10px] text-slate-400">·</span>
                                <span className="text-xs font-semibold text-slate-600 truncate">
                                    {getAsignaturaNombre(selectedAsignatura) || 'Asignatura'}
                                </span>
                                <span className="ml-auto inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-black bg-slate-200 text-slate-700">
                                    {selectedPeriodo}
                                </span>
                            </div>
                            <div className="text-[11px] text-slate-500 truncate mt-0.5 font-medium">
                                {selectedAct ? selectedAct.nombre : '⚠️ Toca para seleccionar actividad...'}
                            </div>
                        </div>

                        <div className="flex items-center gap-1 text-slate-400 group-hover:text-slate-700 shrink-0">
                            <SlidersHorizontal size={15} />
                        </div>
                    </button>
                </div>
            </header>

            {/* 3. Banner Informativo de Asignación si hay celda activa */}
            {activeCell && currentCrit && (
                <div className="bg-amber-50 border-b border-amber-200/80 px-4 py-2 flex items-center justify-between text-xs text-amber-900 shrink-0 animate-in slide-in-from-top-2 duration-150">
                    <div className="min-w-0 flex-1 pr-2">
                        <span className="font-black text-[10px] uppercase tracking-wider text-amber-700 block">
                            Asignando: {activeCell.val === 100 ? 'Cumple (100 pts)' : 'No cumple (0 pts)'}
                        </span>
                        <p className="text-[11px] text-amber-850 font-medium truncate">
                            👉 Toca los estudiantes en los círculos naranja para marcarlos.
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onCancelActiveCell}
                        className="p-1 rounded-lg bg-amber-200/70 hover:bg-amber-300 text-amber-900 transition-colors cursor-pointer shrink-0"
                        title="Cancelar asignación activa"
                    >
                        <CloseIcon size={14} />
                    </button>
                </div>
            )}

            {/* 4. Carrusel Horizontal de Tarjetas de Indicadores de Logro */}
            <div className="pt-3 pb-2 px-2 shrink-0">
                <div
                    ref={carouselRef}
                    className="flex items-center gap-3 overflow-x-auto snap-x snap-mandatory scrollbar-hide px-3 py-1"
                >
                    {localCriterios.map((crit, idx) => {
                        const isFocused = idx === focusedCritIdx;

                        return (
                            <div
                                key={crit.id}
                                id={`cotejo-card-${idx}`}
                                onClick={() => setFocusedCritIdx(idx)}
                                className={`w-[78vw] sm:w-[48vw] md:w-77.5 shrink-0 snap-center rounded-2xl p-4 transition-all duration-200 cursor-pointer flex flex-col justify-between min-h-36 ${isFocused
                                    ? 'bg-white ring-3 ring-(--primary)/40 shadow-md scale-100 border border-(--primary)/30'
                                    : 'bg-white/80 hover:bg-white border border-slate-200/80 opacity-75 hover:opacity-100 scale-95 shadow-2xs'
                                    }`}
                            >
                                {/* Cabecera de la tarjeta */}
                                <div className="flex items-center justify-between text-[11px] font-black text-slate-500 uppercase tracking-wider mb-2">
                                    <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md">
                                        Criterio {idx + 1} de {localCriterios.length}
                                    </span>
                                    {isFocused && (
                                        <span className="text-[10px] font-bold text-(--primary) bg-(--primary)/10 px-2 py-0.5 rounded-full">
                                            Activo
                                        </span>
                                    )}
                                </div>

                                {/* Descripción del indicador de logro */}
                                <div className="flex-1 text-center flex items-center justify-center py-2">
                                    <p className="text-xs sm:text-sm font-semibold text-slate-800 leading-snug line-clamp-4">
                                        {crit.descripcion || 'Aquí debe ir la descripción del indicador de logro de la lista de cotejo'}
                                    </p>
                                </div>

                                {/* Pie de la tarjeta */}
                                <div className="text-[10px] text-slate-400 font-semibold text-center pt-2 border-t border-slate-100">
                                    Desliza para cambiar de criterio
                                </div>
                            </div>
                        );
                    })}

                    {localCriterios.length === 0 && (
                        <div className="w-full text-center py-8 text-xs text-slate-400 font-medium">
                            No hay criterios registrados en esta lista de cotejo.
                        </div>
                    )}
                </div>
            </div>

            {/* 5. Botones de Cumplimiento: Cumple (Verde) / No cumple (Rojo) */}
            {currentCrit && !readOnly && (
                <div className="px-4 py-2 flex items-center justify-center gap-3 shrink-0">
                    {/* Botón CUMPLE */}
                    <button
                        type="button"
                        onClick={() => onSelectCell(currentCrit.id, 100)}
                        className={`flex-1 max-w-40 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-black transition-all flex items-center justify-center gap-1.5 shadow-xs cursor-pointer active:scale-95 ${isCumpleActive
                            ? 'bg-[#8EBC64] text-slate-900 ring-4 ring-[#8EBC64]/40 shadow-md scale-105'
                            : 'bg-[#95C46B] hover:bg-[#8EBC64] text-slate-800'
                            }`}
                    >
                        <Check size={16} strokeWidth={3} />
                        <span>Cumple</span>
                    </button>

                    {/* Botón NO CUMPLE */}
                    <button
                        type="button"
                        onClick={() => onSelectCell(currentCrit.id, 0)}
                        className={`flex-1 max-w-40 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-black transition-all flex items-center justify-center gap-1.5 shadow-xs cursor-pointer active:scale-95 ${isNoCumpleActive
                            ? 'bg-[#BF503E] text-white ring-4 ring-[#BF503E]/40 shadow-md scale-105'
                            : 'bg-[#C85A42] hover:bg-[#BF503E] text-white'
                            }`}
                    >
                        <CloseIcon size={16} strokeWidth={3} />
                        <span>No cumple</span>
                    </button>
                </div>
            )}

            {/* 6. Fila de Estudiantes (Círculos Naranja del Mockup) */}
            <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col justify-center">
                <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2 text-center">
                    Estudiantes ({sortedEsts.length})
                </div>

                <div
                    ref={studentsScrollRef}
                    className="flex items-center gap-3.5 overflow-x-auto px-2 py-2 scrollbar-hide justify-start sm:justify-center"
                >
                    {sortedEsts.map((est, idx) => {
                        const studentMulti = multiEvaluations[est.id];

                        // Evaluación del criterio activo
                        const valForCurrentCrit = currentCrit
                            ? studentMulti?.[currentCrit.id] ?? (est.id === selectedEstId ? respuestas[currentCrit.id] : undefined)
                            : undefined;

                        const isCumple = valForCurrentCrit === 100;
                        const isNoCumple = valForCurrentCrit === 0;

                        const numDisplay = est.numeroLista != null ? est.numeroLista : idx + 1;
                        const firstName = (est.nombre || '').trim().split(' ')[0] || 'Est.';

                        return (
                            <button
                                key={est.id}
                                id={`mobile-est-${est.id}`}
                                type="button"
                                onClick={() => {
                                    onAvatarClick(est.id);
                                    scrollStudentIntoView(est.id);
                                }}
                                className="flex flex-col items-center gap-1.5 shrink-0 outline-none transition-transform active:scale-95 cursor-pointer relative"
                            >
                                {/* Círculo Naranja Prominente */}
                                <div
                                    className={`relative flex items-center justify-center rounded-full text-white font-black transition-all ${isCumple
                                        ? 'w-13 h-13 text-base bg-[#FF7A45] ring-4 ring-[#8EBC64] shadow-md scale-105'
                                        : isNoCumple
                                            ? 'w-13 h-13 text-base bg-[#FF7A45] ring-4 ring-[#BF503E] shadow-md scale-105'
                                            : est.id === selectedEstId
                                                ? 'w-13 h-13 text-base bg-[#FF7A45] ring-4 ring-[#FF7A45]/40 shadow-md scale-105'
                                                : 'w-12 h-12 text-sm bg-[#FF7A45] shadow-xs hover:scale-102'
                                        }`}
                                >
                                    {isCumple ? (
                                        <Check size={24} strokeWidth={3.5} className="text-white drop-shadow-xs" />
                                    ) : isNoCumple ? (
                                        <CloseIcon size={24} strokeWidth={3.5} className="text-white drop-shadow-xs" />
                                    ) : (
                                        <span>{numDisplay}</span>
                                    )}
                                </div>

                                {/* Nombre del estudiante */}
                                <span
                                    className={`text-[10px] sm:text-xs font-bold truncate max-w-16 leading-tight text-center ${isCumple || isNoCumple || est.id === selectedEstId ? 'text-slate-900 font-black' : 'text-slate-500'
                                        }`}
                                >
                                    {firstName}
                                </span>
                            </button>
                        );
                    })}

                    {sortedEsts.length === 0 && (
                        <div className="py-4 text-xs text-slate-400 font-medium italic text-center w-full">
                            No hay estudiantes registrados en este curso.
                        </div>
                    )}
                </div>
            </div>

            {/* 7. Barra Inferior Fija de Evaluación (Thumb Zone) */}
            {!readOnly && (
                <footer className="p-3 sm:p-4 bg-white/95 backdrop-blur-md border-t border-slate-200 shrink-0 flex items-center justify-between gap-2 shadow-lg">
                    {/* Botones de Navegación entre Criterios */}
                    <div className="flex items-center gap-1.5 shrink-0">
                        <button
                            type="button"
                            onClick={handlePrevCrit}
                            disabled={localCriterios.length <= 1}
                            className="p-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 disabled:opacity-40 transition-colors cursor-pointer"
                            title="Criterio anterior"
                        >
                            <ChevronLeft size={16} />
                        </button>

                        {/* Indicador de Puntaje */}
                        <div className="px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-200 text-center min-w-20">
                            <span className="text-[9px] font-black uppercase text-slate-500 block leading-none">
                                Logrado
                            </span>
                            <span className="text-sm font-black text-slate-900 leading-tight">
                                {currentScore}
                                <span className="text-[10px] font-bold text-slate-400">%</span>
                            </span>
                        </div>

                        <button
                            type="button"
                            onClick={handleNextCrit}
                            disabled={localCriterios.length <= 1}
                            className="p-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 disabled:opacity-40 transition-colors cursor-pointer"
                            title="Siguiente criterio"
                        >
                            <ChevronRight size={16} />
                        </button>
                    </div>

                    {/* Botón Principal de Guardar / Finalizar */}
                    <button
                        type="button"
                        onClick={onSave}
                        disabled={!selectedAct || (totalStudentsInMulti === 0 && !selectedEstId) || isSaving}
                        className="flex-1 h-11 px-4 rounded-xl font-bold text-xs uppercase tracking-wider text-white bg-[#2e5d32] hover:bg-[#254c28] disabled:opacity-50 transition-colors flex items-center justify-center gap-2 shadow-sm cursor-pointer ml-1"
                    >
                        {isSaving ? (
                            <Loader2 size={16} className="animate-spin" />
                        ) : savedFlash ? (
                            <CheckCircle size={17} className="text-emerald-300" />
                        ) : (
                            <Target size={17} />
                        )}
                        <span className="truncate">
                            {savedFlash
                                ? '¡Guardado!'
                                : totalStudentsInMulti > 1
                                    ? `Evaluar ${totalStudentsInMulti} Alumnos`
                                    : 'Guardar Cotejo'}
                        </span>
                    </button>
                </footer>
            )}
        </div>
    );
};
