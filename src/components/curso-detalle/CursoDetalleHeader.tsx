import React from 'react';
import {
    ChevronLeft,
    Save,
    Maximize2,
    Minimize2,
    Search,
    Loader2,
    Check,
    AlertCircle,
    FileSpreadsheet,
    FileText,
    Plus,
    X
} from 'lucide-react';
import type { Curso } from '../../types';
import { CieloPill } from '../ui/CieloPill';
import { NIVELES_DOMINIO } from '../../constants/evaluacionNiveles';
import { getAsignaturaNombre, sonMismaAsignatura } from '../../constants/asignaturas';

interface CursoDetalleHeaderProps {
    curso: Curso | undefined;
    buscar: string;
    setBuscar: (val: string) => void;
    isDirty: boolean;
    isSaving: boolean;
    saveStatus?: 'idle' | 'unsaved' | 'saving' | 'verifying' | 'saved' | 'error';
    saveError?: string | null;
    onRetrySave?: () => void;
    onSave: () => void;
    isFullScreen: boolean;
    onToggleFullScreen: () => void;
    onBack: () => void;
    showRecoveryOnly: boolean;
    setShowRecoveryOnly: (val: boolean) => void;
    evalMode: 'pincel' | 'numerico' | 'libre';
    setEvalMode: (val: 'pincel' | 'numerico' | 'libre') => void;
    activePaintColor: number;
    setActivePaintColor: (val: number) => void;
    onShowVincular: () => void;
    onShowEliminarEstudiantes: () => void;
    selectedPeriodo: string;
    onPeriodoChange: (p: string) => void;
    onAddActividad: () => void;
    isTutor?: boolean;
    periodLoading?: boolean;
    periodError?: string | null;
    academicWarningsCount?: number;
    onShowWarnings?: () => void;
    onExportExcel?: () => void;
    isExporting?: boolean;
    onExportInstrumento?: () => void;
    isExportingInstrumento?: boolean;
    availableAsignaturas?: string[];
    selectedAsignatura?: string;
    onAsignaturaChange?: (asig: string) => void;
}

const CursoDetalleHeader: React.FC<CursoDetalleHeaderProps> = ({
    curso,
    buscar,
    setBuscar,
    isDirty,
    isSaving,
    saveStatus = 'idle',
    saveError,
    onRetrySave,
    onSave,
    isFullScreen,
    onToggleFullScreen,
    onBack,
    showRecoveryOnly,
    setShowRecoveryOnly,
    evalMode,
    setEvalMode,
    activePaintColor,
    setActivePaintColor,
    onShowVincular,
    selectedPeriodo,
    onPeriodoChange,
    onAddActividad,
    isTutor = true,
    periodLoading = false,
    periodError = null,
    academicWarningsCount: _academicWarningsCount = 0,
    onShowWarnings: _onShowWarnings,
    onExportExcel,
    isExporting = false,
    onExportInstrumento,
    isExportingInstrumento = false,
    availableAsignaturas = [],
    selectedAsignatura,
    onAsignaturaChange
}) => {
    const [showMobileSearch, setShowMobileSearch] = React.useState(false);

    return (
        <div className="flex flex-col gap-1.5 md:gap-2 px-3 py-2 sm:px-4 sm:py-2.5 md:px-5 md:py-2.5 xl:px-6 xl:py-2 bg-white border-b border-(--border-soft) shadow-2xs relative z-20">
            {/* VISTA MÓVIL (< md) */}
            <div className="flex md:hidden flex-col gap-2">
                {/* Fila 1: Volver, Curso, Guardar, Selector de períodos, Búsqueda */}
                <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                        <button
                            onClick={onBack}
                            aria-label="Volver"
                            className="p-1.5 hover:bg-(--background) text-[#5F665E] hover:text-[#2E3330] transition-all rounded-full border border-transparent hover:border-(--border-soft) shrink-0"
                        >
                            <ChevronLeft size={20} />
                        </button>
                        <h1 className="text-sm sm:text-base font-black text-[#2E3330] tracking-tight uppercase italic truncate">
                            {curso?.grado} {curso?.seccion}
                        </h1>

                        {/* Botón de guardado móvil */}
                        <button
                            onClick={saveStatus === 'error' ? (onRetrySave || onSave) : onSave}
                            disabled={isSaving || saveStatus === 'saving' || saveStatus === 'verifying' || (saveStatus === 'saved' && !isDirty)}
                            title={saveStatus === 'error' ? (saveError || 'Error al guardar. Toca para reintentar.') : undefined}
                            className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border transition-all shrink-0 ${
                                saveStatus === 'error'
                                    ? 'bg-rose-600 border-rose-700 text-white cursor-pointer'
                                    : (isSaving || saveStatus === 'saving' || saveStatus === 'verifying')
                                    ? 'bg-attention border-attention text-white'
                                    : isDirty
                                    ? 'bg-primary border-primary text-white cursor-pointer active:scale-95'
                                    : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            }`}
                        >
                            {isSaving || saveStatus === 'saving' || saveStatus === 'verifying' ? (
                                <Loader2 size={12} className="animate-spin" />
                            ) : saveStatus === 'error' ? (
                                <AlertCircle size={12} />
                            ) : isDirty ? (
                                <Save size={12} />
                            ) : (
                                <Check size={12} className="text-emerald-600 font-bold" />
                            )}
                            <span>{isDirty ? 'GUARDAR' : 'OK'}</span>
                        </button>
                    </div>

                    {/* Selector de Período y Botón de Búsqueda */}
                    <div className="flex items-center gap-1.5 shrink-0">
                        <div className="flex items-center gap-0.5 bg-(--background) p-0.5 rounded-full border border-[rgba(46,51,48,0.06)]">
                            {['P1', 'P2', 'P3', 'P4'].map(p => (
                                <button
                                    key={p}
                                    onClick={() => onPeriodoChange(p)}
                                    disabled={periodLoading}
                                    className={`px-2 py-0.5 text-[11px] font-black rounded-full transition-all ${
                                        selectedPeriodo === p
                                            ? 'bg-white text-[#2E3330] shadow-xs'
                                            : 'text-[#5F665E]/70 hover:text-[#2E3330]'
                                    }`}
                                >
                                    {p}
                                </button>
                            ))}
                        </div>

                        <button
                            type="button"
                            onClick={() => setShowMobileSearch(!showMobileSearch)}
                            className={`w-7 h-7 flex items-center justify-center rounded-full border transition-all ${
                                showMobileSearch || buscar
                                ? 'bg-primary text-white border-primary'
                                    : 'bg-white border-(--border-soft) text-[#5F665E] hover:text-[#2E3330]'
                            }`}
                            title="Buscar estudiante"
                        >
                            <Search size={13} />
                        </button>
                    </div>
                </div>

                {/* Selector de asignatura en móvil si el curso tiene múltiples asignaturas */}
                {availableAsignaturas && availableAsignaturas.length > 1 && (
                    <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5 -mt-0.5">
                        {availableAsignaturas.map(asig => {
                            const isSel = sonMismaAsignatura(asig, selectedAsignatura || curso?.asignatura || '');
                            return (
                                <button
                                    key={asig}
                                    type="button"
                                    onClick={() => onAsignaturaChange?.(asig)}
                                    className={`px-2.5 py-0.5 text-[10px] font-bold rounded-full whitespace-nowrap transition-all cursor-pointer ${
                                        isSel
                                            ? 'bg-primary text-white shadow-xs'
                                            : 'bg-(--background) text-[#5F665E] border border-(--border-soft) hover:text-[#2E3330]'
                                    }`}
                                >
                                    {getAsignaturaNombre(asig)}
                                </button>
                            );
                        })}
                    </div>
                )}

                {/* Campo de búsqueda expandible en móvil */}
                {(showMobileSearch || buscar) && (
                    <div className="relative w-full">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#5F665E]" size={14} />
                        <input
                            type="text"
                            placeholder="BUSCAR ESTUDIANTE..."
                            className="w-full pl-9 pr-8 py-1.5 bg-base-creme border border-(--border-soft) rounded-full text-xs font-semibold focus:outline-none focus:bg-white focus:border-primary/40 uppercase tracking-wider text-[#2E3330]"
                            value={buscar}
                            onChange={(e) => setBuscar(e.target.value)}
                            autoFocus
                        />
                        {buscar && (
                            <button
                                onClick={() => { setBuscar(''); setShowMobileSearch(false); }}
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#5F665E] hover:text-[#2E3330] p-0.5"
                            >
                                <X size={14} />
                            </button>
                        )}
                    </div>
                )}

                {/* Fila 2: Sellos rápidos a la izquierda (Inasistencia / No trabajó), 3 puntos y + Agregar Actividad a la derecha (según diseño mockup) */}
                <div className="flex items-center justify-between gap-2 pt-1 border-t border-[rgba(46,51,48,0.06)]">
                    {/* Sellos de evaluación rápida apilados verticalmente a la izquierda */}
                    <div className="flex flex-col gap-1 items-start shrink-0">
                        <button
                            type="button"
                            onClick={() => { setActivePaintColor(activePaintColor === 0 ? -1 : 0); if (evalMode === 'libre') setEvalMode('numerico'); }}
                            title="Inasistencia (0 pts)"
                            className={`px-3 py-0.5 rounded-full text-[10px] font-bold transition-all border ${
                                activePaintColor === 0
                                    ? 'bg-[#537BAC] text-white border-[#537BAC] shadow-xs'
                                    : 'bg-white text-[#537BAC] border-dashed border-[#537BAC]/60 hover:bg-[#537BAC]/5'
                            }`}
                        >
                            Inasistencia
                        </button>
                        <button
                            type="button"
                            onClick={() => { setActivePaintColor(activePaintColor === 1 ? -1 : 1); if (evalMode === 'libre') setEvalMode('numerico'); }}
                            title="No trabajó (1 pt)"
                            className={`px-3 py-0.5 rounded-full text-[10px] font-bold transition-all border ${
                                activePaintColor === 1
                                    ? 'bg-[#EB8847] text-white border-[#EB8847] shadow-xs'
                                    : 'bg-white text-[#EB8847] border-dashed border-[#EB8847]/60 hover:bg-[#EB8847]/5'
                            }`}
                        >
                            No trabajó
                        </button>
                    </div>

                    {/* Lado derecho: 3 círculos de color/nivel arriba y botón + Agregar Actividad abajo */}
                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                        {/* 3 puntos en tonos cálidos/naranjas según el mockup */}
                        <div className="flex items-center gap-2" data-guide="barra-niveles-dominio">
                            {[
                                { val: 100, bg: 'bg-[#EA580C]', label: '100', modeGuide: 'modo-eval-pincel' },
                                { val: 85, bg: 'bg-[#F97316]', label: '85', modeGuide: 'modo-eval-numerico' },
                                { val: 70, bg: 'bg-[#FDBA74]', label: '70', modeGuide: 'modo-eval-libre' }
                            ].map(item => {
                                const isActive = activePaintColor === item.val;
                                return (
                                    <button
                                        key={item.val}
                                        type="button"
                                        data-guide={item.modeGuide}
                                        onClick={() => setActivePaintColor(isActive ? -1 : item.val)}
                                        title={`Nivel de logro ${item.val}`}
                                        className={`w-5 h-5 rounded-full transition-transform active:scale-90 ${item.bg} ${
                                            isActive ? 'ring-2 ring-offset-1 ring-[#EA580C] scale-110 shadow-xs' : 'opacity-90 hover:opacity-100'
                                        }`}
                                    />
                                );
                            })}
                        </div>

                        {/* Botón Agregar Actividad */}
                        <button
                            type="button"
                            onClick={onAddActividad}
                            data-guide="btn-agregar-actividad-mobile"
                            className="flex items-center gap-1 px-3 py-0.5 rounded-full bg-white border border-(--border-soft) hover:bg-(--background) text-[#2E3330] text-[10px] font-black uppercase tracking-wider shadow-xs transition-all active:scale-95"
                        >
                            <Plus size={11} strokeWidth={2.8} />
                            <span>Agregar Actividad</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* VISTA TABLET (md: a xl: / 768px a 1199px) */}
            <div className="hidden md:flex xl:hidden flex-col gap-2">
                {/* Fila 1 Tablet: Volver, Curso, Periodos, Búsqueda compacta, Excel, Guardar, Fullscreen */}
                <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                        <button
                            onClick={onBack}
                            aria-label="Volver"
                            className="p-2 hover:bg-(--background) text-[#5F665E] hover:text-[#2E3330] transition-all rounded-full border border-transparent hover:border-(--border-soft) shrink-0"
                        >
                            <ChevronLeft size={22} />
                        </button>
                        <div className="flex items-center gap-2.5 min-w-0">
                            <span className="text-base lg:text-lg font-black text-[#2E3330] tracking-tight uppercase italic truncate">
                                {curso?.grado} {curso?.seccion}
                            </span>
                            {availableAsignaturas && availableAsignaturas.length > 1 && (
                                <div className="flex items-center gap-1 bg-(--background) p-0.5 rounded-full border border-[rgba(46,51,48,0.06)] shrink-0">
                                    {availableAsignaturas.map(asig => {
                                        const isSel = sonMismaAsignatura(asig, selectedAsignatura || curso?.asignatura || '');
                                        return (
                                            <button
                                                key={asig}
                                                type="button"
                                                onClick={() => onAsignaturaChange?.(asig)}
                                                className={`px-2 py-0.5 text-[10px] font-bold rounded-full transition-all cursor-pointer ${
                                                    isSel
                                                        ? 'bg-white text-[#2E3330] shadow-xs'
                                                        : 'text-[#5F665E]/70 hover:text-[#2E3330]'
                                                }`}
                                                title={getAsignaturaNombre(asig)}
                                            >
                                                {getAsignaturaNombre(asig)}
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                            <div className="flex items-center gap-0.5 bg-(--background) p-0.5 rounded-full border border-[rgba(46,51,48,0.06)] shrink-0">
                                {['P1', 'P2', 'P3', 'P4'].map(p => (
                                    <button
                                        key={p}
                                        onClick={() => onPeriodoChange(p)}
                                        disabled={periodLoading}
                                        className={`px-2.5 py-1 text-xs font-black rounded-full transition-all ${
                                            selectedPeriodo === p
                                                ? 'bg-white text-[#2E3330] shadow-xs'
                                                : 'text-[#5F665E]/70 hover:text-[#2E3330]'
                                        }`}
                                    >
                                        {p}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                        <div className="relative group">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#5F665E]" size={15} />
                            <input
                                type="text"
                                placeholder="BUSCAR..."
                                className="pl-8 pr-4 py-1.5 min-h-8 bg-base-creme border border-(--border-soft) rounded-full text-xs font-semibold focus:outline-none focus:bg-white focus:border-primary/40 w-36 lg:w-48 uppercase tracking-wider text-[#2E3330]"
                                value={buscar}
                                onChange={(e) => setBuscar(e.target.value)}
                            />
                        </div>

                        {onExportExcel && (
                            <CieloPill
                                as="button"
                                variant="ghost"
                                onClick={onExportExcel}
                                disabled={periodLoading || isExporting}
                                title="Exportar a Excel"
                                className="px-3 min-h-8 text-xs font-bold gap-1.5 bg-white border border-(--border-soft) text-emerald-800"
                            >
                                {isExporting ? <Loader2 size={14} className="animate-spin text-emerald-700" /> : <FileSpreadsheet size={14} className="text-emerald-700" />}
                                <span className="hidden lg:inline">EXCEL</span>
                            </CieloPill>
                        )}

                        <button
                            onClick={saveStatus === 'error' ? (onRetrySave || onSave) : onSave}
                            disabled={isSaving || saveStatus === 'saving' || saveStatus === 'verifying' || (saveStatus === 'saved' && !isDirty)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 min-h-8 rounded-full text-xs font-black uppercase tracking-wider border transition-all ${
                                saveStatus === 'error'
                                    ? 'bg-rose-600 border-rose-700 text-white cursor-pointer'
                                    : (isSaving || saveStatus === 'saving' || saveStatus === 'verifying')
                                    ? 'bg-attention border-attention text-white'
                                    : isDirty
                                    ? 'bg-primary border-primary text-white cursor-pointer active:scale-95'
                                    : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            }`}
                        >
                            {isSaving || saveStatus === 'saving' || saveStatus === 'verifying' ? (
                                <Loader2 size={13} className="animate-spin" />
                            ) : saveStatus === 'error' ? (
                                <AlertCircle size={13} />
                            ) : isDirty ? (
                                <Save size={13} />
                            ) : (
                                <Check size={13} className="text-emerald-600 font-bold" />
                            )}
                            <span>{isDirty ? 'GUARDAR' : 'GUARDADO'}</span>
                        </button>

                        <button
                            onClick={onToggleFullScreen}
                            className="w-8 h-8 flex items-center justify-center bg-white border border-(--border-soft) text-[#5F665E] hover:text-[#2E3330] rounded-full shadow-2xs active:scale-95"
                            title="Pantalla completa"
                        >
                            {isFullScreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                        </button>
                    </div>
                </div>

                {/* Fila 2 Tablet: Sellos, Modos, Niveles de dominio, + Actividad, Riesgo */}
                <div className="flex items-center justify-between gap-2 pt-1 border-t border-[rgba(46,51,48,0.06)]">
                    <div className="flex items-center gap-2">
                        {/* Sellos de evaluación */}
                        <div className="flex items-center gap-1.5">
                            <button
                                type="button"
                                onClick={() => { setActivePaintColor(0); if (evalMode === 'libre') setEvalMode('numerico'); }}
                                title="Inasistencia (0 pts)"
                                className={`min-h-7 px-2.5 rounded-full text-[11px] font-bold transition-all border ${
                                    activePaintColor === 0
                                        ? 'bg-[#537BAC] text-white border-[#537BAC] shadow-xs'
                                        : 'bg-white text-[#537BAC] border-dashed border-[#537BAC]/60 hover:bg-[#537BAC]/5'
                                }`}
                            >
                                Inasistencia
                            </button>
                            <button
                                type="button"
                                onClick={() => { setActivePaintColor(1); if (evalMode === 'libre') setEvalMode('numerico'); }}
                                title="No trabajó / Se negó a realizar (1 pt)"
                                className={`min-h-7 px-2.5 rounded-full text-[11px] font-bold transition-all border ${
                                    activePaintColor === 1
                                        ? 'bg-[#EB8847] text-white border-[#EB8847] shadow-xs'
                                        : 'bg-white text-[#EB8847] border-dashed border-[#EB8847]/60 hover:bg-[#EB8847]/5'
                                }`}
                            >
                                No trabajó
                            </button>
                        </div>

                        {/* Modos de evaluación pincel/numérico/libre en tablet */}
                        <div className="flex items-center bg-(--background) p-0.5 rounded-full border border-[rgba(46,51,48,0.06)] ml-1">
                            <button
                                type="button"
                                data-guide="modo-eval-pincel"
                                onClick={() => setEvalMode('pincel')}
                                className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase transition-all ${evalMode === 'pincel' ? 'bg-[#2E3330] text-white' : 'text-[#5F665E]'}`}
                            >
                                Pincel
                            </button>
                            <button
                                type="button"
                                data-guide="modo-eval-numerico"
                                onClick={() => setEvalMode('numerico')}
                                className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase transition-all ${evalMode === 'numerico' ? 'bg-[#2E3330] text-white' : 'text-[#5F665E]'}`}
                            >
                                Numérico
                            </button>
                            <button
                                type="button"
                                data-guide="modo-eval-libre"
                                onClick={() => setEvalMode('libre')}
                                className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase transition-all ${evalMode === 'libre' ? 'bg-[#2E3330] text-white' : 'text-[#5F665E]'}`}
                            >
                                Libre
                            </button>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {/* Niveles de dominio */}
                        <div
                            data-guide="barra-niveles-dominio"
                            className="flex items-center gap-1 bg-(--background) p-0.5 rounded-full border border-[rgba(46,51,48,0.06)]"
                        >
                            {(evalMode === 'pincel' || evalMode === 'numerico') ? [100, 85, 70, 55].map(val => {
                                const isActive = activePaintColor === val;
                                const colors: Record<number, string> = {
                                    100: 'bg-primary text-white',
                                    85: 'bg-attention text-white',
                                    70: 'bg-danger text-white',
                                    55: 'bg-[#2E3330] text-white'
                                };
                                return (
                                    <button
                                        key={val}
                                        type="button"
                                        data-guide={evalMode === 'pincel' ? 'nivel-pincel' : 'nivel-num'}
                                        onClick={() => setActivePaintColor(val)}
                                        className={`w-7 h-7 rounded-full text-xs font-black transition-all flex items-center justify-center ${
                                            isActive ? `${colors[val]} ring-2 ring-black/15 shadow-xs scale-105` : 'bg-white text-[#5F665E] hover:text-[#2E3330]'
                                        }`}
                                    >
                                        {val}
                                    </button>
                                );
                            }) : [100, 85, 70, 55].map(val => (
                                <button
                                    key={val}
                                    type="button"
                                    onClick={() => { setEvalMode('numerico'); setActivePaintColor(val); }}
                                    className="w-7 h-7 rounded-full text-xs font-black transition-all flex items-center justify-center bg-white text-[#5F665E] hover:text-[#2E3330]"
                                >
                                    {val}
                                </button>
                            ))}
                        </div>

                        <CieloPill
                            as="button"
                            variant="ghost"
                            onClick={onAddActividad}
                            data-guide="btn-agregar-actividad"
                            className="gap-1.5 px-3 min-h-7 bg-white text-[#2E3330] border border-(--border-soft) hover:bg-(--background) text-xs font-black"
                        >
                            <Plus size={13} strokeWidth={2.6} />
                            ACTIVIDAD
                        </CieloPill>

                        <CieloPill
                            as="button"
                            variant={showRecoveryOnly ? 'danger' : 'ghost'}
                            onClick={() => setShowRecoveryOnly(!showRecoveryOnly)}
                            className={`px-2.5 min-h-7 text-xs font-bold transition-all border ${showRecoveryOnly ? 'bg-attention/10 text-attention border-attention/30' : 'bg-white text-[#5F665E] border-(--border-soft)'}`}
                        >
                            {showRecoveryOnly ? 'TODOS' : 'RIESGO'}
                        </CieloPill>
                    </div>
                </div>
            </div>

            {/* VISTA ESCRITORIO (xl: >= 1200px) - ULTRA COMPACTA, ALTA DENSIDAD Y ESPACIO MAXIMIZADO */}
            <div className="hidden xl:flex flex-col gap-2">
                {/* Fila 1: Navegación, Curso, Selector P1-P4, Búsqueda, Exportaciones, Guardar y Pantalla completa */}
                <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                        <button
                            onClick={onBack}
                            aria-label="Volver"
                            title="Volver"
                            className="p-1.5 hover:bg-(--background) text-[#5F665E] hover:text-[#2E3330] transition-all rounded-full border border-transparent hover:border-(--border-soft) group shrink-0 cursor-pointer"
                        >
                            <ChevronLeft size={20} className="group-hover:-translate-x-0.5 transition-transform" />
                        </button>

                        <div className="flex items-center gap-2 min-w-0">
                            <span className="text-base font-black text-[#2E3330] tracking-tight uppercase italic shrink-0">
                                {curso?.grado} {curso?.seccion}
                            </span>

                            {availableAsignaturas && availableAsignaturas.length > 1 ? (
                                <div className="flex items-center gap-1 bg-(--background) p-0.5 rounded-full border border-[rgba(46,51,48,0.06)] shrink-0">
                                    {availableAsignaturas.map(asig => {
                                        const isSel = sonMismaAsignatura(asig, selectedAsignatura || curso?.asignatura || '');
                                        return (
                                            <button
                                                key={asig}
                                                type="button"
                                                onClick={() => onAsignaturaChange?.(asig)}
                                                className={`px-2.5 py-0.5 text-[11px] font-bold rounded-full transition-all cursor-pointer ${
                                                    isSel
                                                        ? 'bg-white text-[#2E3330] shadow-xs border border-(--border-soft)'
                                                        : 'text-[#5F665E]/70 hover:text-[#2E3330]'
                                                }`}
                                                title={getAsignaturaNombre(asig)}
                                            >
                                                {getAsignaturaNombre(asig)}
                                            </button>
                                        );
                                    })}
                                </div>
                            ) : (
                                (selectedAsignatura || curso?.asignatura) && (
                                    <span className="text-[11px] font-bold text-[#5F665E] bg-(--background) px-2.5 py-0.5 rounded-full border border-(--border-soft) truncate max-w-44 shrink-0" title={getAsignaturaNombre(selectedAsignatura || curso?.asignatura || '')}>
                                        {getAsignaturaNombre(selectedAsignatura || curso?.asignatura || '')}
                                    </span>
                                )
                            )}

                            {/* Selector de periodo P1 - P4 */}
                            <div className="flex items-center gap-0.5 bg-(--background) p-0.5 rounded-full border border-[rgba(46,51,48,0.06)] shrink-0">
                                {['P1', 'P2', 'P3', 'P4'].map(p => (
                                    <button
                                        key={p}
                                        onClick={() => onPeriodoChange(p)}
                                        disabled={periodLoading}
                                        className={`px-3 py-1 text-xs font-black rounded-full transition-all cursor-pointer ${
                                            selectedPeriodo === p
                                                ? 'bg-white text-[#2E3330] shadow-xs'
                                                : 'text-[#5F665E]/70 hover:text-[#2E3330]'
                                        }`}
                                    >
                                        {p}
                                    </button>
                                ))}
                            </div>

                            {periodLoading && (
                                <span className="flex items-center gap-1.5 text-xs text-[#5F665E] font-medium animate-pulse shrink-0">
                                    <Loader2 size={13} className="animate-spin text-primary" /> Cargando {selectedPeriodo}...
                                </span>
                            )}
                            {periodError && (
                                <span className="flex items-center gap-1 text-xs text-rose-600 font-medium shrink-0">
                                    <AlertCircle size={13} /> {periodError}
                                </span>
                            )}
                        </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                        {/* Búsqueda compacta */}
                        <div className="relative group">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#5F665E] group-focus-within:text-[#2E3330] transition-colors" size={13} />
                            <input
                                type="text"
                                placeholder="BUSCAR ESTUDIANTE..."
                                className="pl-8 pr-3 py-1 min-h-7.5 bg-base-creme border border-(--border-soft) rounded-full text-[11px] font-semibold focus:outline-none focus:ring-2 focus:ring-primary/10 focus:bg-white focus:border-primary/30 transition-all w-48 uppercase tracking-wider text-[#2E3330] placeholder:text-[#5F665E]/60 shadow-2xs"
                                value={buscar}
                                onChange={(e) => setBuscar(e.target.value)}
                            />
                        </div>

                        {onExportExcel && (
                            <CieloPill
                                as="button"
                                variant="ghost"
                                onClick={onExportExcel}
                                disabled={periodLoading || isExporting}
                                title={`Exportar Registro Académico (${selectedPeriodo}) a Excel`}
                                className={`gap-1.5 px-2.5 min-h-7.5 transition-all border text-xs font-bold ${
                                    periodLoading || isExporting
                                        ? 'bg-base-creme border-(--border-soft) text-[#5F665E]/40 cursor-not-allowed opacity-60'
                                        : 'bg-white border-(--border-soft) text-emerald-800 hover:bg-emerald-50 hover:border-emerald-300 hover:text-emerald-900 shadow-2xs cursor-pointer'
                                }`}
                            >
                                {isExporting ? <Loader2 size={13} className="animate-spin text-emerald-700" /> : <FileSpreadsheet size={13} className="text-emerald-700" />}
                                <span>EXCEL</span>
                            </CieloPill>
                        )}

                        {onExportInstrumento && (
                            <CieloPill
                                as="button"
                                variant="ghost"
                                onClick={onExportInstrumento}
                                disabled={periodLoading || isExportingInstrumento}
                                title={`Descargar Instrumento de Evaluación (${selectedPeriodo}) en Word (.docx)`}
                                className={`gap-1.5 px-2.5 min-h-7.5 transition-all border text-xs font-bold ${
                                    periodLoading || isExportingInstrumento
                                        ? 'bg-base-creme border-(--border-soft) text-[#5F665E]/40 cursor-not-allowed opacity-60'
                                        : 'bg-white border-(--border-soft) text-[#537BAC] hover:bg-[#537BAC]/10 hover:border-[#537BAC]/40 hover:text-[#476B96] shadow-2xs cursor-pointer'
                                }`}
                            >
                                {isExportingInstrumento ? <Loader2 size={13} className="animate-spin text-[#537BAC]" /> : <FileText size={13} className="text-[#537BAC]" />}
                                <span>INSTRUMENTO</span>
                            </CieloPill>
                        )}

                        {/* Botón Guardar */}
                        <div className="flex items-center">
                            <CieloPill
                                as="button"
                                onClick={saveStatus === 'error' ? (onRetrySave || onSave) : onSave}
                                disabled={isSaving || saveStatus === 'saving' || saveStatus === 'verifying' || (saveStatus === 'saved' && !isDirty)}
                                title={saveStatus === 'error' ? (saveError || 'Error al guardar. Clic para reintentar.') : undefined}
                                variant={saveStatus === 'error' ? 'danger' : isSaving || saveStatus === 'saving' || saveStatus === 'verifying' ? 'disabled' : isDirty ? 'primary' : 'disabled'}
                                className={`gap-1.5 px-3 min-h-7.5 border transition-all text-xs font-black ${
                                    saveStatus === 'error'
                                        ? 'bg-rose-600 border-rose-700 text-white cursor-pointer hover:bg-rose-700 shadow-2xs'
                                        : (isSaving || saveStatus === 'saving' || saveStatus === 'verifying')
                                        ? 'bg-attention border-attention text-white cursor-wait'
                                        : isDirty
                                        ? 'bg-primary border-primary text-white cursor-pointer hover:bg-primary/90'
                                        : 'bg-white text-emerald-700 border-emerald-200 cursor-default'
                                }`}
                            >
                                {isSaving || saveStatus === 'saving' || saveStatus === 'verifying' ? (
                                    <Loader2 size={13} className="animate-spin" />
                                ) : saveStatus === 'error' ? (
                                    <AlertCircle size={13} />
                                ) : isDirty ? (
                                    <Save size={13} />
                                ) : (
                                    <Check size={13} className="text-emerald-600 font-bold" />
                                )}
                                <span>
                                    {isSaving || saveStatus === 'saving' || saveStatus === 'verifying'
                                        ? 'GUARDANDO…'
                                        : saveStatus === 'error'
                                        ? 'REINTENTAR'
                                        : isDirty
                                        ? 'GUARDAR'
                                        : 'GUARDADO'}
                                </span>
                            </CieloPill>
                        </div>

                        {/* Pantalla completa */}
                        <button
                            type="button"
                            onClick={onToggleFullScreen}
                            title={isFullScreen ? 'Salir de pantalla completa' : 'Pantalla completa'}
                            className="w-7.5 h-7.5 flex items-center justify-center bg-white border border-(--border-soft) text-[#5F665E] hover:text-[#2E3330] hover:border-[rgba(46,51,48,0.15)] transition-all rounded-full shadow-2xs active:scale-95 cursor-pointer shrink-0"
                        >
                            {isFullScreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
                        </button>
                    </div>
                </div>

                {/* Fila 2 Desktop: Diseño idéntico a referencia visual */}
                <div className="flex items-center gap-5 sm:gap-6 pt-1.5 pb-0.5 border-t border-[rgba(46,51,48,0.06)] overflow-x-auto scrollbar-hide">
                    {/* 1. + AGREGAR ACTIVIDAD */}
                    <button
                        type="button"
                        data-guide="btn-agregar-actividad"
                        onClick={onAddActividad}
                        className="flex items-center gap-1.5 text-xs font-black tracking-wider text-[#2E3330] hover:text-black transition-colors cursor-pointer select-none shrink-0"
                    >
                        <span className="text-sm font-black leading-none">+</span>
                        <span>AGREGAR ACTIVIDAD</span>
                    </button>

                    {/* 2. VER RIESGO */}
                    <button
                        type="button"
                        onClick={() => setShowRecoveryOnly(!showRecoveryOnly)}
                        className={`text-xs font-black tracking-wider transition-colors cursor-pointer select-none shrink-0 ${
                            showRecoveryOnly
                                ? 'text-attention hover:text-attention/80'
                                : 'text-[#5F665E] hover:text-[#2E3330]'
                        }`}
                    >
                        {showRecoveryOnly ? 'VER TODOS' : 'VER RIESGO'}
                    </button>

                    {/* 3. Selector de modo (Pincel, Numérico, Libre) con pista de 3 nodos conectados */}
                    <div className="flex flex-col items-center shrink-0">
                        <span className="text-[10px] font-bold text-[#2E3330] tracking-tight leading-none mb-1 text-center select-none">
                            {evalMode === 'pincel' ? 'Modo pincel' : evalMode === 'numerico' ? 'Modo numérico' : 'Modo libre'}
                        </span>
                        <div
                            role="radiogroup"
                            aria-label="Modo de evaluación"
                            className="relative flex items-center justify-between rounded-full border border-neutral-200/90 bg-white px-1.5 py-1 w-18 h-6 shadow-2xs"
                        >
                            {/* Línea horizontal que conecta los 3 nodos */}
                            <div className="absolute left-3 right-3 top-1/2 -translate-y-1/2 h-[1.5px] bg-neutral-200 z-0 pointer-events-none" />

                            {/* Nodo 1: Pincel */}
                            <button
                                type="button"
                                role="radio"
                                data-guide="modo-eval-pincel"
                                aria-checked={evalMode === 'pincel'}
                                onClick={() => setEvalMode('pincel')}
                                title="Modo Pincel (un clic asigna el nivel seleccionado)"
                                className="relative z-10 w-4 h-4 rounded-full flex items-center justify-center transition-all cursor-pointer"
                            >
                                {evalMode === 'pincel' ? (
                                    <span className="w-4 h-4 rounded-full bg-[#2E3330] flex items-center justify-center shadow-xs">
                                        <span className="w-1.5 h-1.5 rounded-full bg-white" />
                                    </span>
                                ) : (
                                    <span className="w-3.5 h-3.5 rounded-full bg-white border border-neutral-300 hover:border-neutral-400" />
                                )}
                            </button>

                            {/* Nodo 2: Numérico */}
                            <button
                                type="button"
                                role="radio"
                                data-guide="modo-eval-numerico"
                                aria-checked={evalMode === 'numerico'}
                                onClick={() => setEvalMode('numerico')}
                                title="Modo Numérico"
                                className="relative z-10 w-4 h-4 rounded-full flex items-center justify-center transition-all cursor-pointer"
                            >
                                {evalMode === 'numerico' ? (
                                    <span className="w-4 h-4 rounded-full bg-[#2E3330] flex items-center justify-center shadow-xs">
                                        <span className="w-1.5 h-1.5 rounded-full bg-white" />
                                    </span>
                                ) : (
                                    <span className="w-3.5 h-3.5 rounded-full bg-white border border-neutral-300 hover:border-neutral-400" />
                                )}
                            </button>

                            {/* Nodo 3: Libre */}
                            <button
                                type="button"
                                role="radio"
                                data-guide="modo-eval-libre"
                                aria-checked={evalMode === 'libre'}
                                onClick={() => setEvalMode('libre')}
                                title="Modo Valor Libre"
                                className="relative z-10 w-4 h-4 rounded-full flex items-center justify-center transition-all cursor-pointer"
                            >
                                {evalMode === 'libre' ? (
                                    <span className="w-4 h-4 rounded-full bg-[#2E3330] flex items-center justify-center shadow-xs">
                                        <span className="w-1.5 h-1.5 rounded-full bg-white" />
                                    </span>
                                ) : (
                                    <span className="w-3.5 h-3.5 rounded-full bg-white border border-neutral-300 hover:border-neutral-400" />
                                )}
                            </button>
                        </div>
                    </div>

                    {/* 4. Divisor vertical sutil */}
                    <div className="h-6 w-px bg-neutral-200/80 mx-0.5 shrink-0" />

                    {/* 5. Círculos de niveles [100, 85, 70, 55] con "ESCALA ESTIMATIVA" arriba y nombre del nivel de logro a la derecha al pulsarlos */}
                    <div className="flex flex-col items-start shrink-0">
                        <span className="text-[9px] font-black uppercase tracking-wider text-[#8A9089] text-left leading-none mb-1 select-none">
                            ESCALA ESTIMATIVA
                        </span>
                        <div
                            data-guide="barra-niveles-dominio"
                            className="flex items-center gap-1.5 rounded-full border border-neutral-200/90 bg-white p-1 shadow-2xs shrink-0"
                        >
                            {[
                                {
                                    val: 100 as const,
                                    label: 'Logro destacado',
                                    bg: 'bg-[#BDCFB6]',
                                    text: 'text-[#1E2421]',
                                    textColor: 'text-[#2D4A2A]',
                                    ring: 'ring-2 ring-[#689C63]'
                                },
                                {
                                    val: 85 as const,
                                    label: 'Logro esperado',
                                    bg: 'bg-[#FCEAD8]',
                                    text: 'text-[#D96B27]',
                                    textColor: 'text-[#9C4410]',
                                    ring: 'ring-2 ring-[#EB8847]'
                                },
                                {
                                    val: 70 as const,
                                    label: 'En proceso',
                                    bg: 'bg-[#FCE3DF]',
                                    text: 'text-[#D9534F]',
                                    textColor: 'text-[#9E2825]',
                                    ring: 'ring-2 ring-[#D9534F]'
                                },
                                {
                                    val: 55 as const,
                                    label: 'Inicio',
                                    bg: 'bg-[#F3F4F3]',
                                    text: 'text-[#4A504B]',
                                    textColor: 'text-[#2E3330]',
                                    ring: 'ring-2 ring-black/25'
                                },
                            ].map(({ val, label, bg, text, textColor, ring }) => {
                                const isActive = activePaintColor === val;
                                const desc = NIVELES_DOMINIO[val]?.descriptor || label;
                                return (
                                    <button
                                        key={val}
                                        type="button"
                                        data-guide={evalMode === 'pincel' ? `nivel-pincel nivel-pincel-${val}` : `nivel-num nivel-num-${val}`}
                                        onClick={() => setActivePaintColor(activePaintColor === val ? -1 : val)}
                                        title={`${val} — ${label}: ${desc}`}
                                        className={`rounded-full transition-all flex items-center cursor-pointer select-none ${
                                            isActive
                                                ? 'bg-neutral-100/80 pr-2.5 shadow-2xs'
                                                : 'hover:opacity-90'
                                        }`}
                                    >
                                        <span
                                            className={`w-7 h-7 rounded-full text-xs font-black transition-all flex items-center justify-center shrink-0 ${bg} ${text} ${
                                                isActive ? `${ring} shadow-xs scale-105` : ''
                                            }`}
                                        >
                                            {val}
                                        </span>
                                        {isActive && (
                                            <span className={`text-[10px] font-black tracking-tight whitespace-nowrap pl-1.5 select-none animate-in fade-in zoom-in-95 duration-150 ${textColor}`}>
                                                {label}
                                            </span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* 6. Actividad pendiente por: INASISTENCIA, SE NEGÓ A REALIZAR */}
                    <div className="flex flex-col items-start shrink-0">
                        <span className="text-[9px] font-black uppercase tracking-wider text-[#8A9089] text-left leading-none mb-1 select-none">
                            ACTIVIDAD PENDIENTE POR:
                        </span>
                        <div className="flex items-center gap-1.5">
                            <button
                                type="button"
                                onClick={() => { setActivePaintColor(activePaintColor === 0 ? -1 : 0); if (evalMode === 'libre') setEvalMode('numerico'); }}
                                title="Inasistencia — aplica 0 pts"
                                className={`rounded-full border px-3.5 py-1 text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer shadow-2xs ${
                                    activePaintColor === 0
                                        ? 'bg-[#2E3330] text-white border-transparent shadow-xs'
                                        : 'bg-white text-[#5F665E] border-neutral-200/90 hover:bg-neutral-50 hover:text-[#2E3330]'
                                }`}
                            >
                                INASISTENCIA
                            </button>
                            <button
                                type="button"
                                onClick={() => { setActivePaintColor(activePaintColor === 1 ? -1 : 1); if (evalMode === 'libre') setEvalMode('numerico'); }}
                                title="Se negó a realizar — aplica 1 pt"
                                className={`rounded-full border px-3.5 py-1 text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer shadow-2xs ${
                                    activePaintColor === 1
                                        ? 'bg-[#EB8847] text-white border-transparent shadow-xs'
                                        : 'bg-white text-[#5F665E] border-neutral-200/90 hover:bg-neutral-50 hover:text-[#2E3330]'
                                }`}
                            >
                                SE NEGÓ A REALIZAR
                            </button>
                        </div>
                    </div>

                    {/* 7. CARGA (Tutor tools) */}
                    {isTutor && onShowVincular && (
                        <button
                            type="button"
                            onClick={onShowVincular}
                            className="text-xs font-black uppercase tracking-wider text-[#5F665E] hover:text-[#2E3330] transition-colors cursor-pointer select-none shrink-0 px-2 py-1"
                            title="Carga de estudiantes / Vincular"
                        >
                            CARGA
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default React.memo(CursoDetalleHeader);
