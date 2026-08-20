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
    Check
} from 'lucide-react';
import type { Curso } from '../../types';
import { CieloPill } from '../ui/CieloPill';

interface CursoDetalleHeaderProps {
    curso: Curso | undefined;
    buscar: string;
    setBuscar: (val: string) => void;
    isDirty: boolean;
    isSaving: boolean;
    onSave: () => void;
    isFullScreen: boolean;
    onToggleFullScreen: () => void;
    onBack: () => void;
    showRecoveryOnly: boolean;
    setShowRecoveryOnly: (val: boolean) => void;
    isPointMode: boolean;
    setIsPointMode: (val: boolean) => void;
    activePaintColor: number;
    setActivePaintColor: (val: number) => void;
    onShowVincular: () => void;
    onShowEliminarEstudiantes: () => void;
    selectedPeriodo: string;
    onPeriodoChange: (p: string) => void;
    onAddActividad: () => void;
    isTutor?: boolean;
}

const CursoDetalleHeader: React.FC<CursoDetalleHeaderProps> = ({
    curso,
    buscar,
    setBuscar,
    isDirty,
    isSaving,
    onSave,
    isFullScreen,
    onToggleFullScreen,
    onBack,
    showRecoveryOnly,
    setShowRecoveryOnly,
    isPointMode,
    setIsPointMode,
    activePaintColor,
    setActivePaintColor,
    onShowVincular,
    onShowEliminarEstudiantes,
    selectedPeriodo,
    onPeriodoChange,
    onAddActividad,
    isTutor = true
}) => {
    return (
        <div className="flex flex-col gap-6 p-6 md:p-8 bg-white border-b border-(--border-soft) shadow-sm relative z-20">
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
                            <h1 className="text-3xl font-black text-[#2E3330] tracking-tighter uppercase italic">{curso?.grado} {curso?.seccion}</h1>
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

                    <CieloPill
                        as="button"
                        onClick={onSave}
                        disabled={!isDirty || isSaving}
                        variant={isSaving || !isDirty ? 'disabled' : 'primary'}
                        className={`gap-3 px-4.5 min-h-10 border ${isSaving ? 'bg-attention border-attention text-white cursor-wait' : isDirty ? 'bg-primary border-primary' : 'bg-white text-primary border-(--border-soft) cursor-default'}`}
                    >
                        {isSaving ? (
                            <Loader2 size={16} className="animate-spin" />
                        ) : isDirty ? (
                            <Save size={16} />
                        ) : (
                            <Check size={16} className="text-primary font-bold" />
                        )}
                        {isSaving ? 'GUARDANDO...' : isDirty ? 'GUARDAR AHORA' : 'GUARDADO'}
                    </CieloPill>

                    <button
                        onClick={onToggleFullScreen}
                        className="w-10 h-10 flex items-center justify-center bg-white border border-(--border-soft) text-[#5F665E] hover:text-[#2E3330] hover:border-[rgba(46,51,48,0.15)] transition-all rounded-full shadow-sm active:scale-95"
                    >
                        {isFullScreen ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
                    </button>
                </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-transparent">
                <div className="flex items-center gap-1 bg-(--background) p-1.5 rounded-full border border-[rgba(46,51,48,0.04)]">
                    {['P1', 'P2', 'P3', 'P4'].map(p => (
                        <CieloPill
                            as="button"
                            key={p}
                            variant={selectedPeriodo === p ? 'neutral' : 'ghost'}
                            onClick={() => onPeriodoChange(p)}
                            className={`px-4.5 min-h-9 transition-all border ${selectedPeriodo === p ? 'bg-white text-[#2E3330] border-[rgba(46,51,48,0.04)]' : 'text-[#5F665E] hover:text-[#2E3330] border-transparent'}`}
                        >
                            {p}
                        </CieloPill>
                    ))}
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
                        <CieloPill
                            as="button"
                            variant={isPointMode ? 'primary' : 'ghost'}
                            onClick={() => setIsPointMode(!isPointMode)}
                            className={`gap-2 px-4.5 min-h-9 transition-all border ${isPointMode ? 'bg-[#2E3330] text-white border-[#2E3330]' : 'bg-white text-[#5F665E] border-(--border-soft) hover:bg-(--background) hover:text-[#2E3330]'}`}
                        >
                            MODO PINCEL
                        </CieloPill>
                    </div>

                    <div className="flex items-center gap-1.5 bg-(--background) p-1.5 rounded-full border border-[rgba(46,51,48,0.04)]">
                        {[100, 85, 70, 55].map(val => {
                            const isActive = activePaintColor === val;
                            let colorClasses = '';
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

                            const tooltips: Record<number, { title: string; desc: string }> = {
                                100: { title: '100 — Dominio completo', desc: 'Domina el indicador con autonomía.' },
                                85: { title: '85 — Logro esperado', desc: 'Alcanza lo esperado con algunas dificultades.' },
                                70: { title: '70 — Logro parcial', desc: 'Demuestra parcialmente el indicador.' },
                                55: { title: '55 — Inicio', desc: 'Evidencia limitada; necesita apoyo.' },
                            };
                            const tt = tooltips[val];

                            return (
                                <div key={val} className="relative group flex items-center justify-center">
                                    <button
                                        data-guide="puntuacion"
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
    );
};

export default React.memo(CursoDetalleHeader);
