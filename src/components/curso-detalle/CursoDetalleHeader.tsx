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
    onAddActividad
}) => {
    return (
        <div className="flex flex-col gap-6 p-6 md:p-8 bg-white border-b border-slate-100 shadow-sm relative z-20">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-center gap-6">
                    <button
                        onClick={onBack}
                        className="p-3 hover:bg-slate-50 text-slate-400 hover:text-slate-900 transition-all rounded-2xl border border-transparent hover:border-slate-100 group"
                    >
                        <ChevronLeft size={24} className="group-hover:-translate-x-1 transition-transform" />
                    </button>
                    <div>
                        <div className="flex items-center gap-3 mb-1">
                            <span className="px-3 py-1 bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest rounded-full">CURSO ACTIVO</span>
                            <h1 className="text-3xl font-black text-slate-900 tracking-tighter uppercase italic">{curso?.grado} {curso?.seccion}</h1>
                        </div>
                        <p className="text-slate-400 font-bold text-sm uppercase tracking-widest flex items-center gap-2">
                            <Layout size={14} /> GESTION DEL PERIODO / {curso?.periodo}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className="relative group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-slate-900 transition-colors" size={18} />
                        <input
                            type="text"
                            placeholder="BUSCAR ESTUDIANTE..."
                            className="pl-12 pr-6 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold focus:outline-none focus:ring-4 focus:ring-slate-900/5 focus:bg-white focus:border-slate-200 transition-all w-64 uppercase tracking-wider"
                            value={buscar}
                            onChange={(e) => setBuscar(e.target.value)}
                        />
                    </div>

                    <button
                        onClick={onSave}
                        disabled={!isDirty || isSaving}
                        className={`flex items-center gap-3 px-8 py-3.5 rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-xl hover:shadow-2xl active:scale-95 ${isSaving
                                ? 'bg-amber-500 text-white cursor-wait'
                                : isDirty
                                    ? 'bg-slate-900 text-white hover:bg-black'
                                    : 'bg-[#86A792]/10 text-[#86A792] border border-[#86A792]/30 cursor-default shadow-none hover:shadow-none active:scale-100'
                            }`}
                    >
                        {isSaving ? (
                            <Loader2 size={18} className="animate-spin" />
                        ) : isDirty ? (
                            <Save size={18} />
                        ) : (
                            <Check size={18} className="text-[#86A792] font-bold" />
                        )}
                        {isSaving ? 'GUARDANDO...' : isDirty ? 'GUARDAR AHORA' : 'GUARDADO'}
                    </button>

                    <button
                        onClick={onToggleFullScreen}
                        className="p-3.5 bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:border-slate-900 transition-all rounded-2xl shadow-sm hover:shadow-md active:scale-95"
                    >
                        {isFullScreen ? <Minimize2 size={22} /> : <Maximize2 size={22} />}
                    </button>
                </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-slate-50">
                <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-2xl border border-slate-100">
                    {['P1', 'P2', 'P3', 'P4'].map(p => (
                        <button
                            key={p}
                            onClick={() => onPeriodoChange(p)}
                            className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-tighter transition-all ${selectedPeriodo === p ? 'bg-white text-slate-900 shadow-md border border-slate-100' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            {p}
                        </button>
                    ))}
                </div>

                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 border-r border-slate-100 pr-4 mr-2">
                        <button onClick={onAddActividad} className="flex items-center gap-2 px-4 py-2 bg-white text-slate-400 border border-slate-100 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 hover:text-slate-600 transition-all">
                            + AGREGAR ACTIVIDAD
                        </button>
                        <button
                            onClick={() => setShowRecoveryOnly(!showRecoveryOnly)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${showRecoveryOnly ? 'bg-amber-50 text-amber-600 border-amber-200' : 'bg-white text-slate-400 border-slate-100 hover:bg-slate-50'}`}
                        >
                            {showRecoveryOnly ? 'VER TODOS' : 'VER RIESGO'}
                        </button>
                        <button
                            onClick={() => setIsPointMode(!isPointMode)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${isPointMode ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-400 border-slate-100 hover:bg-slate-50'}`}
                        >
                            MODO PINCEL
                        </button>
                    </div>

                    <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-2xl border border-slate-100">
                        {[100, 85, 70, 55].map(val => {
                            const isActive = activePaintColor === val;
                            let colorClasses = '';
                            if (val === 100) {
                                colorClasses = isActive
                                    ? 'bg-emerald-600 text-white border-2 border-emerald-600'
                                    : 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 hover:text-emerald-800';
                            } else if (val === 85) {
                                colorClasses = isActive
                                    ? 'bg-amber-500 text-white border-2 border-amber-500'
                                    : 'bg-amber-50 text-amber-750 border border-amber-200 hover:bg-amber-100 hover:text-amber-850';
                            } else if (val === 70) {
                                colorClasses = isActive
                                    ? 'bg-rose-600 text-white border-2 border-rose-600'
                                    : 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 hover:text-rose-800';
                            } else {
                                colorClasses = isActive
                                    ? 'bg-slate-800 text-white border-2 border-slate-800'
                                    : 'bg-slate-100 text-slate-700 border border-slate-300 hover:bg-slate-200 hover:text-slate-900';
                            }

                            return (
                                <button
                                    key={val}
                                    onClick={() => setActivePaintColor(val)}
                                    className={`w-10 h-10 rounded-xl transition-all flex items-center justify-center font-black text-xs ${isActive ? 'scale-110 shadow-md ring-2 ring-white' : 'hover:scale-105'} ${colorClasses}`}
                                >
                                    {val}
                                </button>
                            );
                        })}
                    </div>

                    <div className="flex items-center gap-3">
                        <button onClick={onShowVincular} className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-500 hover:border-slate-900 hover:text-slate-900 transition-all shadow-sm active:scale-95">
                            CARGA
                        </button>
                        <button onClick={onShowEliminarEstudiantes} className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest text-rose-500 hover:border-rose-200 hover:bg-rose-50 transition-all shadow-sm active:scale-95">
                            <UserMinus size={14} /> LIMPIAR
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default React.memo(CursoDetalleHeader);
