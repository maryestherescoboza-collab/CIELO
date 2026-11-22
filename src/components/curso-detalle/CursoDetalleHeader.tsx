import React from 'react';
import {
    ChevronLeft,
    Save,
    Maximize2,
    Minimize2,
    Search,
    UserMinus,
    Layout,
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
    onShowEliminarEstudiantes,
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
    isExportingInstrumento = false
}) => {
    const [showMobileSearch, setShowMobileSearch] = React.useState(false);

    return (
        <div className="flex flex-col gap-2 md:gap-4 p-2.5 sm:p-3 md:p-6 bg-white border-b border-(--border-soft) shadow-sm relative z-20">
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
                        <div className="flex items-center gap-2">
                            {[
                                { val: 100, bg: 'bg-[#EA580C]', label: '100' },
                                { val: 85, bg: 'bg-[#F97316]', label: '85' },
                                { val: 70, bg: 'bg-[#FDBA74]', label: '70' }
                            ].map(item => {
                                const isActive = activePaintColor === item.val;
                                return (
                                    <button
                                        key={item.val}
                                        type="button"
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
                                onClick={() => setEvalMode('pincel')}
                                className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase transition-all ${evalMode === 'pincel' ? 'bg-[#2E3330] text-white' : 'text-[#5F665E]'}`}
                            >
                                Pincel
                            </button>
                            <button
                                type="button"
                                onClick={() => setEvalMode('numerico')}
                                className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase transition-all ${evalMode === 'numerico' ? 'bg-[#2E3330] text-white' : 'text-[#5F665E]'}`}
                            >
                                Numérico
                            </button>
                            <button
                                type="button"
                                onClick={() => setEvalMode('libre')}
                                className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase transition-all ${evalMode === 'libre' ? 'bg-[#2E3330] text-white' : 'text-[#5F665E]'}`}
                            >
                                Libre
                            </button>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {/* Niveles de dominio */}
                        {(evalMode === 'pincel' || evalMode === 'numerico') && (
                            <div className="flex items-center gap-1 bg-(--background) p-0.5 rounded-full border border-[rgba(46,51,48,0.06)]">
                                {[100, 85, 70, 55].map(val => {
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
                                            onClick={() => setActivePaintColor(val)}
                                            className={`w-7 h-7 rounded-full text-xs font-black transition-all flex items-center justify-center ${
                                                isActive ? `${colors[val]} ring-2 ring-black/15 shadow-xs scale-105` : 'bg-white text-[#5F665E] hover:text-[#2E3330]'
                                            }`}
                                        >
                                            {val}
                                        </button>
                                    );
                                })}
                            </div>
                        )}

                        <CieloPill
                            as="button"
                            variant="ghost"
                            onClick={onAddActividad}
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

            {/* VISTA ESCRITORIO (xl: >= 1200px) - INTACTA */}
            <div className="hidden xl:flex flex-col gap-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-center gap-6">
                    <button
                        onClick={onBack}
                        className="p-3 hover:bg-(--background) text-[#5F665E] hover:text-[#2E3330] transition-all rounded-full border border-transparent hover:border-(--border-soft) group"
                    >
                        <ChevronLeft size={24} className="group-hover:-translate-x-1 transition-transform" />
                    </button>
                    <div>
                        <div className="flex items-center gap-3 mb-1">
                            <CieloPill variant="primary" uppercase className="px-3.5 h-6">CURSO ACTIVO</CieloPill>
                            <h1 className="text-2xl font-black text-[#2E3330] tracking-tighter uppercase italic">{curso?.grado} {curso?.seccion}</h1>
                        </div>
                        <p className="text-[#5F665E] font-semibold text-sm uppercase tracking-widest flex items-center gap-2">
                            <Layout size={14} /> GESTION DEL PERIODO / {curso?.periodo}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className="relative group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#5F665E] group-focus-within:text-[#2E3330] transition-colors" size={18} />
                        <input
                            type="text"
                            placeholder="BUSCAR ESTUDIANTE..."
                            className="pl-12 pr-6 py-2.5 min-h-10 bg-base-creme border border-(--border-soft) rounded-full text-xs font-semibold focus:outline-none focus:ring-4 focus:ring-primary/10 focus:bg-white focus:border-primary/30 transition-all w-64 uppercase tracking-[0.08em] text-[#2E3330] placeholder:text-[#5F665E]/60 shadow-sm"
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
                            className={`gap-2 px-3.5 min-h-10 transition-all border ${
                                periodLoading || isExporting
                                    ? 'bg-base-creme border-(--border-soft) text-[#5F665E]/40 cursor-not-allowed opacity-60'
                                    : 'bg-white border-(--border-soft) text-emerald-800 hover:bg-emerald-50 hover:border-emerald-300 hover:text-emerald-900 shadow-sm cursor-pointer'
                            }`}
                        >
                            {isExporting ? (
                                <Loader2 size={16} className="animate-spin text-emerald-700" />
                            ) : (
                                <FileSpreadsheet size={16} className="text-emerald-700" />
                            )}
                            <span className="font-bold text-xs tracking-wider">EXCEL</span>
                        </CieloPill>
                    )}

                    {onExportInstrumento && (
                        <CieloPill
                            as="button"
                            variant="ghost"
                            onClick={onExportInstrumento}
                            disabled={periodLoading || isExportingInstrumento}
                            title={`Descargar Instrumento de Evaluación (${selectedPeriodo}) en Word (.docx)`}
                            className={`gap-2 px-3.5 min-h-10 transition-all border ${
                                periodLoading || isExportingInstrumento
                                    ? 'bg-base-creme border-(--border-soft) text-[#5F665E]/40 cursor-not-allowed opacity-60'
                                    : 'bg-white border-(--border-soft) text-[#537BAC] hover:bg-[#537BAC]/10 hover:border-[#537BAC]/40 hover:text-[#476B96] shadow-sm cursor-pointer'
                            }`}
                        >
                            {isExportingInstrumento ? (
                                <Loader2 size={16} className="animate-spin text-[#537BAC]" />
                            ) : (
                                <FileText size={16} className="text-[#537BAC]" />
                            )}
                            <span className="font-bold text-xs tracking-wider">INSTRUMENTO</span>
                        </CieloPill>
                    )}

                    <div className="flex flex-col items-end">
                        <CieloPill
                            as="button"
                            onClick={saveStatus === 'error' ? (onRetrySave || onSave) : onSave}
                            disabled={isSaving || saveStatus === 'saving' || saveStatus === 'verifying' || (saveStatus === 'saved' && !isDirty)}
                            variant={saveStatus === 'error' ? 'danger' : isSaving || saveStatus === 'saving' || saveStatus === 'verifying' ? 'disabled' : isDirty ? 'primary' : 'disabled'}
                            className={`gap-3 px-4.5 min-h-10 border transition-all ${
                                saveStatus === 'error'
                                    ? 'bg-rose-600 border-rose-700 text-white cursor-pointer hover:bg-rose-700 shadow-sm'
                                    : (isSaving || saveStatus === 'saving' || saveStatus === 'verifying')
                                    ? 'bg-attention border-attention text-white cursor-wait'
                                    : isDirty
                                    ? 'bg-primary border-primary text-white cursor-pointer hover:bg-primary/90'
                                    : 'bg-white text-emerald-700 border-emerald-200 cursor-default'
                            }`}
                        >
                            {isSaving || saveStatus === 'saving' || saveStatus === 'verifying' ? (
                                <Loader2 size={16} className="animate-spin" />
                            ) : saveStatus === 'error' ? (
                                <AlertCircle size={16} />
                            ) : isDirty ? (
                                <Save size={16} />
                            ) : (
                                <Check size={16} className="text-emerald-600 font-bold" />
                            )}
                            {isSaving || saveStatus === 'saving' || saveStatus === 'verifying'
                                ? 'GUARDANDO...'
                                : saveStatus === 'error'
                                ? 'ERROR AL GUARDAR (REINTENTAR)'
                                : isDirty
                                ? 'GUARDAR AHORA'
                                : 'GUARDADO'}
                        </CieloPill>
                        {saveError && (
                            <span className="text-[10px] text-rose-600 font-medium mt-1 truncate max-w-50" title={saveError}>
                                {saveError}
                            </span>
                        )}
                    </div>

                    <button
                        onClick={onToggleFullScreen}
                        className="w-10 h-10 flex items-center justify-center bg-white border border-(--border-soft) text-[#5F665E] hover:text-[#2E3330] hover:border-[rgba(46,51,48,0.15)] transition-all rounded-full shadow-sm active:scale-95"
                    >
                        {isFullScreen ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
                    </button>
                </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-transparent">
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1 bg-(--background) p-1.5 rounded-full border border-[rgba(46,51,48,0.04)]">
                        {['P1', 'P2', 'P3', 'P4'].map(p => (
                            <CieloPill
                                as="button"
                                key={p}
                                variant={selectedPeriodo === p ? 'neutral' : 'ghost'}
                                onClick={() => onPeriodoChange(p)}
                                disabled={periodLoading}
                                className={`px-4.5 min-h-9 transition-all border ${selectedPeriodo === p ? 'bg-white text-[#2E3330] border-[rgba(46,51,48,0.04)]' : 'text-[#5F665E] hover:text-[#2E3330] border-transparent'}`}
                            >
                                {p}
                            </CieloPill>
                        ))}
                    </div>
                    {periodLoading && (
                        <span className="flex items-center gap-1.5 text-xs text-[#5F665E] font-medium animate-pulse">
                            <Loader2 size={14} className="animate-spin text-primary" /> Cargando {selectedPeriodo}...
                        </span>
                    )}
                    {periodError && (
                        <span className="flex items-center gap-1 text-xs text-rose-600 font-medium">
                            <AlertCircle size={14} /> {periodError}
                        </span>
                    )}
                </div>

                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 border-r border-(--border-soft) pr-4 mr-2">
                        <CieloPill
                            as="button"
                            data-guide="btn-agregar-actividad"
                            variant="ghost"
                            onClick={onAddActividad}
                            className="gap-2 px-4.5 min-h-9 bg-white text-[#5F665E] border border-(--border-soft) hover:bg-(--background) hover:text-[#2E3330]"
                        >
                            + AGREGAR ACTIVIDAD
                        </CieloPill>
                        <CieloPill
                            as="button"
                            variant={showRecoveryOnly ? 'danger' : 'ghost'}
                            onClick={() => setShowRecoveryOnly(!showRecoveryOnly)}
                            className={`gap-2 px-4.5 min-h-9 transition-all border ${showRecoveryOnly ? 'bg-attention/10 text-attention border-attention/30 hover:bg-attention/20 hover:text-attention' : 'bg-white text-[#5F665E] border-(--border-soft) hover:bg-(--background) hover:text-[#2E3330]'}`}
                        >
                            {showRecoveryOnly ? 'VER TODOS' : 'VER RIESGO'}
                        </CieloPill>
                        <div className="flex items-center bg-(--background) p-1.5 rounded-full border border-[rgba(46,51,48,0.04)]" role="radiogroup" aria-label="Modo de evaluación">
                            <div className="relative flex items-center justify-center">
                                {evalMode === 'pincel' && (
                                    <span className="absolute -top-5 text-[9px] font-bold text-[#2E3330] whitespace-nowrap">Modo pincel</span>
                                )}
                                <button
                                    type="button"
                                    role="radio"
                                    data-guide="modo-eval-pincel"
                                    aria-checked={evalMode === 'pincel'}
                                    aria-label="Modo Pincel"
                                    title="Modo Pincel"
                                    onClick={() => setEvalMode('pincel')}
                                    className={`w-6 h-6 rounded-full transition-all flex items-center justify-center shrink-0 ${evalMode === 'pincel' ? 'bg-[#2E3330] shadow-sm' : 'bg-white border border-(--border-soft) hover:bg-(--background)'}`}
                                >
                                    <div className={`w-1.5 h-1.5 rounded-full transition-all ${evalMode === 'pincel' ? 'bg-white' : 'bg-transparent'}`} />
                                </button>
                            </div>
                            <div className="w-4 h-px bg-[rgba(46,51,48,0.2)] shrink-0" />
                            <div className="relative flex items-center justify-center">
                                {evalMode === 'numerico' && (
                                    <span className="absolute -top-5 text-[9px] font-bold text-[#2E3330] whitespace-nowrap">Numérico</span>
                                )}
                                <button
                                    type="button"
                                    role="radio"
                                    data-guide="modo-eval-numerico"
                                    aria-checked={evalMode === 'numerico'}
                                    aria-label="Modo Numérico"
                                    title="Modo Numérico"
                                    onClick={() => setEvalMode('numerico')}
                                    className={`w-6 h-6 rounded-full transition-all flex items-center justify-center shrink-0 ${evalMode === 'numerico' ? 'bg-[#2E3330] shadow-sm' : 'bg-white border border-(--border-soft) hover:bg-(--background)'}`}
                                >
                                    <div className={`w-1.5 h-1.5 rounded-full transition-all ${evalMode === 'numerico' ? 'bg-white' : 'bg-transparent'}`} />
                                </button>
                            </div>
                            <div className="w-4 h-px bg-[rgba(46,51,48,0.2)] shrink-0" />
                            <div className="relative flex items-center justify-center">
                                {evalMode === 'libre' && (
                                    <span className="absolute -top-5 text-[9px] font-bold text-[#2E3330] whitespace-nowrap">Valor libre</span>
                                )}
                                <button
                                    type="button"
                                    role="radio"
                                    data-guide="modo-eval-libre"
                                    aria-checked={evalMode === 'libre'}
                                    aria-label="Valor libre"
                                    title="Valor libre"
                                    onClick={() => setEvalMode('libre')}
                                    className={`w-6 h-6 rounded-full transition-all flex items-center justify-center shrink-0 ${evalMode === 'libre' ? 'bg-[#2E3330] shadow-sm' : 'bg-white border border-(--border-soft) hover:bg-(--background)'}`}
                                >
                                    <div className={`w-1.5 h-1.5 rounded-full transition-all ${evalMode === 'libre' ? 'bg-white' : 'bg-transparent'}`} />
                                </button>
                            </div>
                        </div>
                    </div>

                    {(evalMode === 'pincel' || evalMode === 'numerico') && (
                    <div data-guide="barra-niveles-dominio" className="flex items-center gap-1.5 bg-(--background) p-1.5 rounded-full border border-[rgba(46,51,48,0.04)]">
                        {[100, 85, 70, 55].map(val => {
                            const isActive = activePaintColor === val;
                            let colorClasses = '';
                            if (evalMode === 'pincel') {
                                if (val === 100) {
                                    colorClasses = isActive
                                        ? 'bg-primary text-white border-2 border-transparent'
                                         : 'bg-primary/10 text-primary border border-transparent hover:bg-primary/20';
                                } else if (val === 85) {
                                    colorClasses = isActive
                                        ? 'bg-attention text-white border-2 border-transparent'
                                        : 'bg-attention/10 text-attention border border-transparent hover:bg-attention/20';
                                } else if (val === 70) {
                                    colorClasses = isActive
                                        ? 'bg-danger text-white border-2 border-transparent'
                                        : 'bg-danger/10 text-danger border border-transparent hover:bg-danger/20';
                                } else {
                                    colorClasses = isActive
                                        ? 'bg-[#2E3330] text-white border-2 border-transparent'
                                        : 'bg-white text-[#5F665E] border border-(--border-soft) hover:bg-base-creme hover:text-[#2E3330]';
                                }
                            } else {
                                colorClasses = isActive
                                    ? 'bg-[#2E3330] text-white border-2 border-transparent'
                                    : 'bg-white text-[#5F665E] border border-(--border-soft) hover:bg-(--background) hover:text-[#2E3330]';
                            }

                            const tooltips: Record<number, { title: string; desc: string }> = {
                                100: { title: `100 — ${NIVELES_DOMINIO[100].etiqueta}`, desc: NIVELES_DOMINIO[100].descriptor },
                                85: { title: `85 — ${NIVELES_DOMINIO[85].etiqueta}`, desc: NIVELES_DOMINIO[85].descriptor },
                                70: { title: `70 — ${NIVELES_DOMINIO[70].etiqueta}`, desc: NIVELES_DOMINIO[70].descriptor },
                                55: { title: `55 — ${NIVELES_DOMINIO[55].etiqueta}`, desc: NIVELES_DOMINIO[55].descriptor },
                            };
                            const tt = tooltips[val];

                            const guideAttr = evalMode === 'pincel'
                                ? `nivel-pincel nivel-pincel-${val}`
                                : `nivel-num nivel-num-${val}`;

                            return (
                                <div key={val} className="relative group flex items-center justify-center">
                                    <button
                                        data-guide={guideAttr}
                                        onClick={() => setActivePaintColor(val)}
                                        className={`w-9 h-9 rounded-full transition-all flex items-center justify-center font-bold text-xs ${isActive ? 'scale-105 shadow-sm ring-2 ring-white/50' : 'hover:scale-105'} ${colorClasses}`}
                                    >
                                        {val}
                                    </button>
                                    
                                    <div className="pointer-events-none absolute bottom-full mb-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-50 flex flex-col items-center">
                                        <div className="bg-[#2E3330] text-white text-[11px] leading-tight px-3 py-2 rounded-lg shadow-lg w-44 text-center">
                                            <div className="font-bold mb-0.5">{tt.title}</div>
                                            <div className="text-white/80">{tt.desc}</div>
                                        </div>
                                        <div className="w-0 h-0 border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-t-[5px] border-t-[#2E3330]"></div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                    )}

                    <div className="flex flex-col items-start gap-1">
                        <span className="text-[9px] font-bold uppercase tracking-[0.14em] text-[#5F665E]/55 whitespace-nowrap leading-none">Actividad pendiente por:</span>
                        <div className="flex items-center gap-1.5">
                            <button
                                type="button"
                                onClick={() => { setActivePaintColor(0); if (evalMode === 'libre') setEvalMode('numerico'); }}
                                title="Inasistencia — aplica 0 pts a la celda"
                                className={`min-h-7 px-2.5 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all border ${activePaintColor === 0 ? 'bg-[#2E3330] border-transparent text-white shadow-sm' : 'bg-white text-[#5F665E] border-(--border-soft) hover:bg-(--background) hover:text-[#2E3330]'}`}
                            >
                                Inasistencia
                            </button>
                            <button
                                type="button"
                                onClick={() => { setActivePaintColor(1); if (evalMode === 'libre') setEvalMode('numerico'); }}
                                title="Se negó a realizar — aplica 1 pt a la celda"
                                className={`min-h-7 px-2.5 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all border ${activePaintColor === 1 ? 'bg-attention border-transparent text-white shadow-sm' : 'bg-white text-[#5F665E] border-(--border-soft) hover:bg-(--background) hover:text-[#2E3330]'}`}
                            >
                                Se negó a realizar
                            </button>
                        </div>
                    </div>

                    {isTutor && (
                        <div className="flex items-center gap-3">
                            <CieloPill as="button" variant="ghost" onClick={onShowVincular} className="gap-2 px-4.5 min-h-9 bg-white border border-(--border-soft) text-[#5F665E] hover:border-[rgba(46,51,48,0.15)] hover:text-[#2E3330]">
                                CARGA
                            </CieloPill>
                            <CieloPill as="button" variant="danger" onClick={onShowEliminarEstudiantes} className="gap-2 px-4.5 min-h-9 bg-white border border-(--border-soft) text-attention hover:border-attention/30 hover:bg-attention/10">
                                <UserMinus size={14} /> LIMPIAR
                            </CieloPill>
                        </div>
                    )}
                </div>
            </div>
            </div>
        </div>
    );
};

export default React.memo(CursoDetalleHeader);
