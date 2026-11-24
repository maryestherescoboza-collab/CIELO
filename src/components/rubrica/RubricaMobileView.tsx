import React, { useRef } from 'react';
import {
    ChevronLeft,
    ChevronRight,
    Check,
    CheckCircle,
    Target,
    Loader2,
    SlidersHorizontal,
    FileDown,
    Sparkles,
    Users,
    X,
} from 'lucide-react';
import type {
    DescriptorRubrica,
    Nivel,
    NivelPuntaje,
    Estudiante,
    Curso,
    Actividad,
} from '../../types';
import { NIVEL_FIELDS, COMPETENCIAS } from '../RubricaRow';
import { getAsignaturaNombre } from '../../constants/asignaturas';

type Selection = Record<string, Nivel>;

interface RubricaMobileViewProps {
    curso: Curso | undefined;
    selectedAsignatura: string;
    selectedPeriodo: string;
    selectedAct: Actividad | null;
    sortedEsts: Estudiante[];
    selectedEstId: number | null;
    activeCell: { id: string; nivel: Nivel } | null;
    onSelectCell: (descId: string, nivel: Nivel) => void;
    onAvatarClick: (estId: number) => void;
    onCancelActiveCell: () => void;
    localDescriptors: DescriptorRubrica[];
    localNiveles: NivelPuntaje[];
    selection: Selection;
    multiEvaluations: Record<number, Selection>;
    onOpenConfigModal: () => void;
    onOpenExportModal?: () => void;
    onOpenGenerarIA?: () => void;
    onSave: () => void;
    isSaving: boolean;
    savedFlash: boolean;
    calcPuntajeTotal: () => number;
    readOnly?: boolean;
}

export const RubricaMobileView: React.FC<RubricaMobileViewProps> = ({
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
    localDescriptors,
    localNiveles,
    selection,
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

    // Filter descriptors for Primaria (3 BCs) vs Secundaria (4 BCs)
    const descriptorsToShow = localDescriptors.slice(
        0,
        curso?.nivelEducativo === 'primaria' ? 3 : 4
    );

    const activeEstIdx = sortedEsts.findIndex((e) => e.id === selectedEstId);

    const handlePrevEst = () => {
        if (sortedEsts.length === 0) return;
        const prevIdx = activeEstIdx > 0 ? activeEstIdx - 1 : sortedEsts.length - 1;
        const target = sortedEsts[prevIdx];
        onAvatarClick(target.id);
        scrollStudentIntoView(target.id);
    };

    const handleNextEst = () => {
        if (sortedEsts.length === 0) return;
        const nextIdx = activeEstIdx < sortedEsts.length - 1 ? activeEstIdx + 1 : 0;
        const target = sortedEsts[nextIdx];
        onAvatarClick(target.id);
        scrollStudentIntoView(target.id);
    };

    const scrollStudentIntoView = (estId: number) => {
        const el = document.getElementById(`mobile-est-${estId}`);
        if (el && studentsScrollRef.current) {
            el.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
        }
    };

    // Active indicator details for the guidance banner
    const activeDescriptor = activeCell ? localDescriptors.find((d) => d.id === activeCell.id) : null;
    const activeLevelField = activeCell ? NIVEL_FIELDS.find((f) => f.nivel === activeCell.nivel) : null;
    const activeNivelPuntaje = activeCell ? localNiveles.find((n) => n.nivel === activeCell.nivel) : null;
    const activeLevelLabel = activeNivelPuntaje?.nombre || activeLevelField?.label || '';

    // Total distinct students evaluated in multiEvaluations
    const totalStudentsInMulti = Object.keys(multiEvaluations).filter((idStr) => {
        const ev = multiEvaluations[Number(idStr)];
        return ev && Object.keys(ev).length > 0;
    }).length;

    const currentScore = calcPuntajeTotal();

    return (
        <div className="flex flex-col h-full bg-[#EFF3F2] overflow-hidden select-none">
            {/* 1. Header Táctil Editorial */}
            <header className="px-4 pt-3 pb-2 bg-white/90 backdrop-blur-md border-b border-slate-200/80 shrink-0">
                <div className="flex items-center justify-between">
                    {/* Indicadores decorativos del mockup */}
                    <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-[#FF7A45]/40" />
                        <span className="w-2.5 h-2.5 rounded-full bg-[#FF7A45]/80" />
                    </div>

                    {/* Título Central */}
                    <h1 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight font-notion-title">
                        Rubrica
                    </h1>

                    {/* Acciones de exportación / IA */}
                    <div className="flex items-center gap-1">
                        {onOpenGenerarIA && (
                            <button
                                type="button"
                                onClick={onOpenGenerarIA}
                                className="p-1.5 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                                title="Generar con IA"
                            >
                                <Sparkles size={17} className="text-amber-500" />
                            </button>
                        )}
                        {onOpenExportModal && (
                            <button
                                type="button"
                                onClick={onOpenExportModal}
                                className="p-1.5 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                                title="Exportar rúbrica"
                            >
                                <FileDown size={17} />
                            </button>
                        )}
                    </div>
                </div>

                {/* 2. Barra de Selección de Contexto (Abre Modal de Configuración) */}
                <div className="mt-2">
                    <button
                        type="button"
                        onClick={onOpenConfigModal}
                        className="w-full flex items-center justify-between p-2 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-left transition-all shadow-2xs cursor-pointer group"
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

            {/* 3. Banner Informativo de Evaluación por Indicador (Lógica de PC) */}
            {activeCell && activeDescriptor && (
                <div className="bg-amber-50 border-b border-amber-200/80 px-4 py-2 flex items-center justify-between text-xs text-amber-900 shrink-0 animate-in slide-in-from-top-2 duration-150">
                    <div className="min-w-0 flex-1 pr-2">
                        <span className="font-black text-[10px] uppercase tracking-wider text-amber-700 block">
                            Indicador Activo: {activeDescriptor.bc} · {activeLevelLabel}
                        </span>
                        <p className="text-[11px] text-amber-850 font-medium truncate">
                            👉 Toca los estudiantes en los círculos naranja para asignarlos o desmarcarlos.
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onCancelActiveCell}
                        className="p-1 rounded-lg bg-amber-200/70 hover:bg-amber-300 text-amber-900 transition-colors cursor-pointer shrink-0"
                        title="Cancelar asignación de este indicador"
                    >
                        <X size={14} />
                    </button>
                </div>
            )}

            {/* 4. Fila de Estudiantes (Círculos Naranja del Mockup) */}
            <div className="py-2.5 bg-white/70 border-b border-slate-200/60 shrink-0">
                <div
                    ref={studentsScrollRef}
                    className="flex items-center gap-3 overflow-x-auto px-4 scrollbar-hide py-1"
                >
                    {sortedEsts.map((est, idx) => {
                        const isSelected = selectedEstId === est.id;
                        const studentMulti = multiEvaluations[est.id];

                        // Si hay un activeCell, verificamos si este estudiante tiene asignado ESE indicador exacto
                        const hasActiveIndicator = activeCell
                            ? studentMulti?.[activeCell.id] === activeCell.nivel
                            : false;

                        // Total de criterios evaluados para este estudiante
                        const countEvaluated = studentMulti
                            ? Object.keys(studentMulti).length
                            : isSelected
                                ? Object.keys(selection).length
                                : 0;

                        const isFullyEvaluated = countEvaluated >= descriptorsToShow.length && descriptorsToShow.length > 0;
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
                                className="flex flex-col items-center gap-1 shrink-0 outline-none transition-transform active:scale-95 cursor-pointer relative"
                            >
                                {/* Círculo Naranja Prominente */}
                                <div
                                    className={`relative flex items-center justify-center rounded-full text-white font-black transition-all ${hasActiveIndicator
                                        ? 'w-12 h-12 text-base bg-[#FF7A45] ring-4 ring-emerald-500 shadow-md scale-105'
                                        : isSelected
                                            ? 'w-12 h-12 text-base bg-[#FF7A45] ring-4 ring-[#FF7A45]/40 shadow-md scale-105'
                                            : 'w-11 h-11 text-sm bg-[#FF7A45]/85 hover:bg-[#FF7A45] opacity-85 hover:opacity-100'
                                        }`}
                                >
                                    {/* Si el estudiante cumple con el indicador activo, mostramos un Check grande */}
                                    {hasActiveIndicator ? (
                                        <Check size={22} strokeWidth={3.5} className="text-white drop-shadow-xs" />
                                    ) : (
                                        <span>{numDisplay}</span>
                                    )}

                                    {/* Badge numérico de progreso o check verde de completado */}
                                    {isFullyEvaluated ? (
                                        <div className="absolute -top-1 -right-1 bg-emerald-600 text-white w-4 h-4 rounded-full flex items-center justify-center border-2 border-white shadow-2xs">
                                            <Check size={9} strokeWidth={3} />
                                        </div>
                                    ) : countEvaluated > 0 && !hasActiveIndicator ? (
                                        <div className="absolute -top-1 -right-1 bg-amber-500 text-white text-[8px] font-black px-1 h-3.5 rounded-full flex items-center justify-center border border-white">
                                            {countEvaluated}
                                        </div>
                                    ) : null}
                                </div>

                                {/* Nombre del estudiante */}
                                <span
                                    className={`text-[10px] sm:text-xs font-bold truncate max-w-16 leading-tight text-center ${hasActiveIndicator || isSelected ? 'text-slate-900 font-black' : 'text-slate-500'
                                        }`}
                                >
                                    {firstName}
                                </span>
                            </button>
                        );
                    })}

                    {sortedEsts.length === 0 && (
                        <div className="py-2 text-xs text-slate-400 font-medium italic">
                            No hay estudiantes en este curso.
                        </div>
                    )}
                </div>
            </div>

            {/* 5. Carrusel Horizontal de Niveles y Descriptores (Mockup de Rúbrica) */}
            <div className="flex-1 overflow-hidden flex flex-col p-2 sm:p-4">
                {/* Pestañas de Nivel */}
                <div className="grid grid-cols-4 gap-1.5 mb-2 shrink-0">
                    {NIVEL_FIELDS.map((field) => {
                        const nivelPuntaje = localNiveles.find((n) => n.nivel === field.nivel);
                        const labelText = nivelPuntaje?.nombre || field.label;

                        return (
                            <button
                                key={field.key}
                                type="button"
                                onClick={() => {
                                    const col = document.getElementById(`rubrica-col-${field.key}`);
                                    if (col) {
                                        col.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
                                    }
                                }}
                                style={{ backgroundColor: field.headerBg }}
                                className={`py-1.5 px-1 rounded-lg text-center text-[10px] sm:text-xs font-black truncate shadow-2xs transition-all active:scale-95 cursor-pointer ${field.headerTextColor || 'text-white'
                                    }`}
                            >
                                <span className="block truncate">{labelText}</span>
                            </button>
                        );
                    })}
                </div>

                {/* Contenedor Horizontal Desplazable de Columnas de Nivel */}
                <div
                    ref={carouselRef}
                    className="flex-1 overflow-x-auto overflow-y-auto snap-x snap-mandatory flex gap-3 pb-3 scrollbar-hide px-1"
                >
                    {NIVEL_FIELDS.map((field) => {
                        const nivelPuntaje = localNiveles.find((n) => n.nivel === field.nivel);
                        const labelText = nivelPuntaje?.nombre || field.label;
                        const pts = nivelPuntaje?.puntaje ?? (field.nivel === 4 ? 100 : field.nivel === 3 ? 85 : field.nivel === 2 ? 70 : 60);

                        return (
                            <div
                                key={field.key}
                                id={`rubrica-col-${field.key}`}
                                className="w-[78vw] sm:w-[48vw] md:w-77.5 shrink-0 snap-center flex flex-col gap-2.5"
                            >
                                {/* Píldora de Cabecera del Nivel */}
                                <div
                                    style={{ backgroundColor: field.headerBg }}
                                    className={`py-2 px-3 rounded-xl text-center shadow-xs flex items-center justify-between ${field.headerTextColor || 'text-white'
                                        }`}
                                >
                                    <span className="font-black text-xs sm:text-sm uppercase tracking-wider truncate">
                                        {labelText}
                                    </span>
                                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-black/15">
                                        {pts} pts
                                    </span>
                                </div>

                                {/* Tarjetas de Descriptores para cada Criterio / Competencia */}
                                <div className="space-y-2.5 flex-1">
                                    {descriptorsToShow.map((desc, idx) => {
                                        const comp = COMPETENCIAS.find((c) => c.bc === desc.bc) || {
                                            nombre: desc.bc,
                                            bc: desc.bc,
                                        };

                                        // Estado activo según lógica de PC
                                        const isCellActive = activeCell?.id === desc.id && activeCell?.nivel === field.nivel;

                                        // Estudiantes asignados a este descriptor y nivel
                                        const studentsInCell = sortedEsts.filter(
                                            (s) => multiEvaluations[s.id]?.[desc.id] === field.nivel
                                        );

                                        // Si un estudiante individual está seleccionado y no hay activeCell
                                        const isSelectedForSingleStudent = !activeCell && selectedEstId
                                            ? multiEvaluations[selectedEstId]?.[desc.id] === field.nivel || selection[desc.id] === field.nivel
                                            : false;

                                        const descriptorHtml = (desc[field.key as keyof DescriptorRubrica] as string) || '';

                                        return (
                                            <button
                                                key={`${desc.id}-${field.key}`}
                                                type="button"
                                                disabled={readOnly || !selectedAct}
                                                onClick={() => onSelectCell(desc.id, field.nivel)}
                                                className={`w-full text-left p-3.5 rounded-2xl transition-all duration-150 border cursor-pointer relative flex flex-col justify-between min-h-32 shadow-xs active:scale-[0.98] ${isCellActive
                                                    ? 'bg-white ring-4 shadow-lg z-10'
                                                    : isSelectedForSingleStudent
                                                        ? 'bg-white ring-2 shadow-md'
                                                        : 'bg-white hover:bg-slate-50 border-slate-200'
                                                    }`}
                                                style={{
                                                    borderColor: isCellActive || isSelectedForSingleStudent ? field.headerBg : undefined,
                                                    boxShadow: isCellActive ? `0 6px 20px ${field.cellBg}` : undefined,
                                                }}
                                            >
                                                {/* Encabezado de la Tarjeta: Competencia y Badge */}
                                                <div className="flex items-center justify-between gap-2 mb-2">
                                                    <span className="text-[11px] font-black text-slate-700 uppercase tracking-wider bg-slate-100 px-2 py-0.5 rounded-md truncate">
                                                        {comp.nombre}
                                                    </span>

                                                    {isCellActive ? (
                                                        <span
                                                            style={{ backgroundColor: field.headerBg }}
                                                            className="flex items-center gap-1 text-[10px] font-black text-white px-2 py-0.5 rounded-full shadow-2xs shrink-0 animate-pulse"
                                                        >
                                                            <Target size={11} />
                                                            <span>Asignando...</span>
                                                        </span>
                                                    ) : studentsInCell.length > 0 ? (
                                                        <span className="flex items-center gap-1 text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full shrink-0">
                                                            <Users size={10} className="text-slate-500" />
                                                            <span>{studentsInCell.length}</span>
                                                        </span>
                                                    ) : null}
                                                </div>

                                                {/* Cuerpo de la Tarjeta: Descripción del Indicador */}
                                                <div className="flex-1 text-xs text-slate-700 font-medium leading-relaxed overflow-hidden">
                                                    {descriptorHtml ? (
                                                        <div
                                                            dangerouslySetInnerHTML={{ __html: descriptorHtml }}
                                                            className="wrap-break-word line-clamp-6 text-[11px] sm:text-xs text-slate-800"
                                                        />
                                                    ) : (
                                                        <span className="text-slate-400 italic text-[11px]">
                                                            Aquí debe ir la descripción del indicador de logro para este nivel.
                                                        </span>
                                                    )}
                                                </div>

                                                {/* Fila de avatares/chips de estudiantes asignados */}
                                                {studentsInCell.length > 0 && (
                                                    <div className="mt-2 pt-2 border-t border-slate-100 flex items-center gap-1 flex-wrap">
                                                        {studentsInCell.slice(0, 6).map((st) => (
                                                            <span
                                                                key={st.id}
                                                                className="inline-flex items-center justify-center w-5 h-5 rounded-full text-[9px] font-bold text-white bg-[#FF7A45]"
                                                                title={`${st.nombre} ${st.apellido}`}
                                                            >
                                                                {st.numeroLista || st.nombre[0]}
                                                            </span>
                                                        ))}
                                                        {studentsInCell.length > 6 && (
                                                            <span className="text-[9px] font-bold text-slate-400">
                                                                +{studentsInCell.length - 6}
                                                            </span>
                                                        )}
                                                    </div>
                                                )}

                                                {/* Pie de Tarjeta */}
                                                <div className="mt-2 pt-1.5 flex items-center justify-between text-[10px] text-slate-400 font-semibold">
                                                    <span>Criterio {idx + 1} de {descriptorsToShow.length}</span>
                                                    <span className="font-bold">{pts} pts</span>
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* 6. Barra Inferior Fija de Evaluación (Thumb Zone) */}
            {!readOnly && (
                <footer className="p-3 sm:p-4 bg-white/95 backdrop-blur-md border-t border-slate-200 shrink-0 flex items-center justify-between gap-2 shadow-lg">
                    {/* Botones de Navegación entre Estudiantes */}
                    <div className="flex items-center gap-1.5 shrink-0">
                        <button
                            type="button"
                            onClick={handlePrevEst}
                            disabled={sortedEsts.length <= 1}
                            className="p-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 disabled:opacity-40 transition-colors cursor-pointer"
                            title="Estudiante anterior"
                        >
                            <ChevronLeft size={16} />
                        </button>

                        {/* Indicador de Puntaje del Estudiante Actual */}
                        <div className="px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-200 text-center min-w-20">
                            <span className="text-[9px] font-black uppercase text-slate-500 block leading-none">
                                Puntaje
                            </span>
                            <span className="text-sm font-black text-slate-900 leading-tight">
                                {currentScore}
                                <span className="text-[10px] font-bold text-slate-400">/100</span>
                            </span>
                        </div>

                        <button
                            type="button"
                            onClick={handleNextEst}
                            disabled={sortedEsts.length <= 1}
                            className="p-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 disabled:opacity-40 transition-colors cursor-pointer"
                            title="Siguiente estudiante"
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
                                    : 'Guardar Rúbrica'}
                        </span>
                    </button>
                </footer>
            )}
        </div>
    );
};
