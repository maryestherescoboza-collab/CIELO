import React from 'react';
import { CieloModal } from '../ui/CieloModal';
import { getAsignaturaNombre } from '../../constants/asignaturas';
import type { Curso, Actividad, Plantilla } from '../../types';
import { Calendar, BookOpen, Layers, Check, Sparkles } from 'lucide-react';

interface RubricaConfigModalProps {
    isOpen: boolean;
    onClose: () => void;
    cursos: Curso[];
    selectedCursoId: number;
    selectedAsignatura: string;
    onSelectCurso: (cursoId: number, asignatura: string) => void;
    selectedPeriodo: string;
    onSelectPeriodo: (periodo: string) => void;
    actividades: Actividad[];
    selectedActId: number | null;
    onSelectActividad: (actId: number | null) => void;
    plantillas: Plantilla[];
    selectedPlantillaId: number | null;
    onSelectPlantilla: (plantillaId: number | null) => void;
    onOpenGenerarIA?: () => void;
}

export const RubricaConfigModal: React.FC<RubricaConfigModalProps> = ({
    isOpen,
    onClose,
    cursos,
    selectedCursoId,
    selectedAsignatura,
    onSelectCurso,
    selectedPeriodo,
    onSelectPeriodo,
    actividades,
    selectedActId,
    onSelectActividad,
    plantillas,
    selectedPlantillaId,
    onSelectPlantilla,
    onOpenGenerarIA,
}) => {
    const periodos = ['P1', 'P2', 'P3', 'P4'];

    const handleConfirm = () => {
        onClose();
    };

    return (
        <CieloModal
            isOpen={isOpen}
            onClose={onClose}
            maxWidth="lg"
            title={
                <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-(--primary)/15 text-(--ink)">
                        <Layers size={18} />
                    </div>
                    <div>
                        <h2 className="text-base font-black text-slate-900 tracking-tight">
                            Configuración de Rúbrica
                        </h2>
                        <p className="text-[11px] font-medium text-slate-500">
                            Selecciona curso, período y actividad a evaluar
                        </p>
                    </div>
                </div>
            }
            footer={
                <div className="flex items-center justify-between w-full gap-2">
                    {onOpenGenerarIA && (
                        <button
                            type="button"
                            onClick={() => {
                                onClose();
                                onOpenGenerarIA();
                            }}
                            className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
                        >
                            <Sparkles size={13} className="text-amber-500" />
                            <span>Generar con IA</span>
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={handleConfirm}
                        className="ml-auto h-10 px-5 rounded-xl font-bold text-xs uppercase tracking-wider text-white bg-[#2e5d32] hover:bg-[#254c28] transition-colors flex items-center justify-center gap-2 shadow-sm cursor-pointer"
                    >
                        <Check size={16} />
                        <span>Confirmar selección</span>
                    </button>
                </div>
            }
        >
            <div className="space-y-4 py-1 text-slate-800">
                {/* 1. Selector de Curso y Asignatura */}
                <div>
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5 mb-1.5">
                        <BookOpen size={13} className="text-(--primary)" />
                        <span>Curso y Asignatura</span>
                    </label>
                    <div className="relative">
                        <select
                            value={`${selectedCursoId}|${selectedAsignatura}`}
                            onChange={(e) => {
                                const [idStr, asig] = e.target.value.split('|');
                                onSelectCurso(Number(idStr), asig || '');
                            }}
                            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-800 outline-none transition-all cursor-pointer hover:border-slate-300 focus:border-[#689c63] focus:ring-1 focus:ring-[#689c63] shadow-2xs appearance-none truncate"
                        >
                            {cursos.map((c) => (
                                <option key={`${c.id}|${c.asignatura}`} value={`${c.id}|${c.asignatura}`}>
                                    {c.grado} {c.seccion} · {getAsignaturaNombre(c.asignatura)} ({c.nivelEducativo === 'primaria' ? 'Primaria' : 'Secundaria'})
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* 2. Selector de Período Académico */}
                <div>
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5 mb-1.5">
                        <Calendar size={13} className="text-(--primary)" />
                        <span>Período Académico</span>
                    </label>
                    <div className="grid grid-cols-4 gap-2 bg-slate-100/80 p-1 rounded-xl">
                        {periodos.map((p) => {
                            const isSelected = selectedPeriodo === p;
                            return (
                                <button
                                    key={p}
                                    type="button"
                                    onClick={() => onSelectPeriodo(p)}
                                    className={`py-2 text-xs font-black rounded-lg transition-all cursor-pointer ${isSelected
                                        ? 'bg-white text-slate-900 shadow-xs border border-slate-200'
                                        : 'text-slate-600 hover:text-slate-900 hover:bg-white/40'
                                        }`}
                                >
                                    {p}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* 3. Selector de Actividad */}
                <div>
                    <div className="flex items-center justify-between mb-1.5">
                        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                            <Layers size={13} className="text-(--primary)" />
                            <span>Actividad a Evaluar</span>
                        </label>
                        <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                            {actividades.length} en {selectedPeriodo}
                        </span>
                    </div>

                    {actividades.length === 0 ? (
                        <div className="p-3.5 bg-amber-50/60 border border-amber-200/60 rounded-xl text-center text-xs text-amber-800">
                            No hay actividades registradas en <span className="font-bold">{selectedPeriodo}</span> para este curso y asignatura.
                        </div>
                    ) : (
                        <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                            {actividades.map((act) => {
                                const isSelected = selectedActId === act.id;
                                return (
                                    <button
                                        key={act.id}
                                        type="button"
                                        onClick={() => onSelectActividad(act.id)}
                                        className={`w-full text-left p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-2 ${isSelected
                                            ? 'bg-emerald-50/80 border-[#689c63] text-emerald-950 ring-1 ring-[#689c63]'
                                            : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700'
                                            }`}
                                    >
                                        <div className="min-w-0 flex-1">
                                            <div className="text-xs font-bold truncate leading-tight">
                                                {act.nombre}
                                            </div>
                                            <div className="text-[10px] text-slate-500 mt-0.5 flex items-center gap-1.5">
                                                <span>{act.periodo}</span>
                                                {act.bcAsignados && act.bcAsignados.length > 0 && (
                                                    <span>· {act.bcAsignados.join(', ')}</span>
                                                )}
                                            </div>
                                        </div>
                                        {isSelected && (
                                            <div className="h-5 w-5 rounded-full bg-[#2e5d32] text-white flex items-center justify-center shrink-0">
                                                <Check size={12} strokeWidth={3} />
                                            </div>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* 4. Selector de Plantilla (Opcional) */}
                {plantillas.length > 0 && (
                    <div className="pt-2 border-t border-slate-100">
                        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                            Plantilla de Rúbrica
                        </label>
                        <select
                            value={selectedPlantillaId ?? ''}
                            onChange={(e) => {
                                const val = e.target.value;
                                onSelectPlantilla(val ? Number(val) : null);
                            }}
                            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 outline-none cursor-pointer hover:border-slate-300 focus:border-[#689c63] shadow-2xs appearance-none truncate"
                        >
                            <option value="">Evaluación Base</option>
                            {plantillas.map((p) => (
                                <option key={p.id} value={p.id}>
                                    {p.nombre}
                                </option>
                            ))}
                        </select>
                    </div>
                )}
            </div>
        </CieloModal>
    );
};
