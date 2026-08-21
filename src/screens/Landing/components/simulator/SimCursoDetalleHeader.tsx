import React from 'react';
import {
    Save,
    Search,
    UserMinus,
    Layout,
    Loader2,
    Check
} from 'lucide-react';
import type { Curso } from '../../../../types';

interface CursoDetalleHeaderProps {
    curso: Curso | undefined;
    buscar: string;
    setBuscar: (val: string) => void;
    isDirty: boolean;
    isSaving: boolean;
    onSave: () => void;
    // removed props
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
}

const CursoDetalleHeader: React.FC<CursoDetalleHeaderProps> = ({
    curso,
    buscar,
    setBuscar,
    isDirty,
    isSaving,
    onSave,
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
    onAddActividad
}) => {
    return (
        <div className="flex flex-col gap-1 p-2 md:p-3 bg-white border-b border-[rgba(46,51,48,0.08)] shadow-sm relative z-20">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-1">
                <div className="flex items-center gap-1">
                    <div>
                        <div className="flex items-center gap-1 mb-1">
                            <span className="px-1.5 py-0.5 min-h-6 leading-none bg-primary text-white text-xs font-semibold uppercase tracking-[0.08em] rounded-full flex items-center justify-center">CURSO ACTIVO</span>
                            <h1 className="text-lg font-black text-[#2E3330] tracking-tighter uppercase italic">{curso?.grado} {curso?.seccion}</h1>
                        </div>
                        <p className="text-[#5F665E] font-semibold text-xs uppercase tracking-widest flex items-center gap-1">
                            <Layout size={10} /> GESTION DEL PERIODO / {curso?.periodo}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-1">
                    <div className="relative group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#5F665E] group-focus-within:text-[#2E3330] transition-colors" size={10} />
                        <input
                            type="text"
                            placeholder="BUSCAR ESTUDIANTE..."
                            className="pl-12 pr-6 py-2.5 min-h-6 bg-[#FDFBF7] border border-[rgba(46,51,48,0.08)] rounded-full text-xs font-semibold focus:outline-none focus:ring-4 focus:ring-primary/10 focus:bg-white focus:border-primary/30 transition-all w-48 uppercase tracking-[0.08em] text-[#2E3330] placeholder:text-[#5F665E]/60 shadow-sm"
                            value={buscar}
                            onChange={(e) => setBuscar(e.target.value)}
                        />
                    </div>

                    <button
                        onClick={onSave}
                        disabled={!isDirty || isSaving}
                        className={`flex items-center gap-1 px-1.5 py-0.5 min-h-6 leading-none rounded-full text-xs font-semibold uppercase tracking-[0.08em] transition-all border ${isSaving
                                ? 'bg-attention border-attention text-white cursor-wait shadow-sm'
                                : isDirty
                                    ? 'bg-primary border-primary text-white hover:bg-[#6C7E5C] shadow-sm'
                                    : 'bg-white text-primary border-[rgba(46,51,48,0.08)] cursor-default'
                            }`}
                    >
                        {isSaving ? (
                            <Loader2 size={10} className="animate-spin" />
                        ) : isDirty ? (
                            <Save size={10} />
                        ) : (
                            <Check size={10} className="text-primary font-bold" />
                        )}
                        {isSaving ? 'GUARDANDO...' : isDirty ? 'GUARDAR AHORA' : 'GUARDADO'}
                    </button>

                </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-1 pt-2 border-t border-transparent">
                <div className="flex items-center gap-1 bg-[#F8F3ED] p-1.5 rounded-full border border-[rgba(46,51,48,0.04)]">
                    {['P1', 'P2', 'P3', 'P4'].map(p => (
                        <button
                            key={p}
                            onClick={() => onPeriodoChange(p)}
                            className={`px-1.5 py-0.5 min-h-5 leading-none rounded-full text-xs font-semibold uppercase tracking-[0.08em] transition-all ${selectedPeriodo === p ? 'bg-white text-[#2E3330] shadow-sm border border-[rgba(46,51,48,0.04)]' : 'text-[#5F665E] hover:text-[#2E3330] border border-transparent'}`}
                        >
                            {p}
                        </button>
                    ))}
                </div>

                <div className="flex items-center gap-1">
                    <div className="flex items-center gap-1 border-r border-[rgba(46,51,48,0.08)] pr-4 mr-2">
                        <button onClick={onAddActividad} className="flex items-center gap-1 px-1.5 py-0.5 min-h-5 leading-none bg-white text-[#5F665E] border border-[rgba(46,51,48,0.08)] rounded-full text-xs font-semibold uppercase tracking-[0.08em] hover:bg-[#F8F3ED] hover:text-[#2E3330] transition-all">
                            + AGREGAR ACTIVIDAD
                        </button>
                        <button
                            onClick={() => setShowRecoveryOnly(!showRecoveryOnly)}
                            className={`flex items-center gap-1 px-1.5 py-0.5 min-h-5 leading-none rounded-full text-xs font-semibold uppercase tracking-[0.08em] transition-all border ${showRecoveryOnly ? 'bg-attention/10 text-attention border-attention/30' : 'bg-white text-[#5F665E] border-[rgba(46,51,48,0.08)] hover:bg-[#F8F3ED] hover:text-[#2E3330]'}`}
                        >
                            {showRecoveryOnly ? 'VER TODOS' : 'VER RIESGO'}
                        </button>
                        <button
                            onClick={() => setIsPointMode(!isPointMode)}
                            className={`flex items-center gap-1 px-1.5 py-0.5 min-h-5 leading-none rounded-full text-xs font-semibold uppercase tracking-[0.08em] transition-all border ${isPointMode ? 'bg-[#2E3330] text-white border-[#2E3330]' : 'bg-white text-[#5F665E] border-[rgba(46,51,48,0.08)] hover:bg-[#F8F3ED] hover:text-[#2E3330]'}`}
                        >
                            MODO PINCEL
                        </button>
                    </div>

                    <div className="flex items-center gap-1 bg-[#F8F3ED] p-1.5 rounded-full border border-[rgba(46,51,48,0.04)]">
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
                                    : 'bg-white text-[#5F665E] border border-[rgba(46,51,48,0.08)] hover:bg-[#FDFBF7] hover:text-[#2E3330]';
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

                    <div className="flex items-center gap-1">
                        <button onClick={onShowVincular} className="flex items-center gap-1 px-1.5 py-0.5 min-h-5 leading-none bg-white border border-[rgba(46,51,48,0.08)] rounded-full text-xs font-semibold uppercase tracking-[0.08em] text-[#5F665E] hover:border-[rgba(46,51,48,0.15)] hover:text-[#2E3330] transition-all shadow-sm active:scale-95">
                            CARGA
                        </button>
                        <button onClick={onShowEliminarEstudiantes} className="flex items-center gap-1 px-1.5 py-0.5 min-h-5 leading-none bg-white border border-[rgba(46,51,48,0.08)] rounded-full text-xs font-semibold uppercase tracking-[0.08em] text-attention hover:border-attention/30 hover:bg-attention/10 transition-all shadow-sm active:scale-95">
                            <UserMinus size={10} /> LIMPIAR
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default React.memo(CursoDetalleHeader);
