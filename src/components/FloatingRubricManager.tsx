import React from 'react';
import { useAppStore } from '../store/appStore';
import { useShallow } from 'zustand/react/shallow';
import { useEvaluationActions } from '../hooks/useEvaluationActions';
import { RubricaRow, NIVEL_FIELDS } from './RubricaRow';
import { X, CheckCircle } from 'lucide-react';
import type { DescriptorRubrica, Nivel, NivelPuntaje } from '../types';

type Selection = Record<string, Nivel>;

export const FloatingRubricManager: React.FC = () => {
    const floatingRubrics = useAppStore((s) => s.floatingRubrics);
    const removeFloatingRubric = useAppStore((s) => s.removeFloatingRubric);
    const updateFloatingRubric = useAppStore((s) => s.updateFloatingRubric);

    // Zustand-connected states
    const selection = useAppStore((s) => s.activeRubricSelection as Selection);
    const setSelection = (updater: Selection | ((prev: Selection) => Selection)) => useAppStore.setState((s) => ({
        activeRubricSelection: typeof updater === 'function' ? updater(s.activeRubricSelection as Selection) : updater
    }));

    const multiEvaluations = useAppStore((s) => s.activeRubricMultiEvaluations as Record<number, Selection>);
    const setMultiEvaluations = (updater: Record<number, Selection> | ((prev: Record<number, Selection>) => Record<number, Selection>)) => useAppStore.setState((s) => ({
        activeRubricMultiEvaluations: typeof updater === 'function' ? updater(s.activeRubricMultiEvaluations as Record<number, Selection>) : updater
    }));

    const activeCell = useAppStore((s) => s.activeRubricActiveCell);
    const setActiveCell = (updater: { id: string; nivel: Nivel } | null | ((prev: { id: string; nivel: Nivel } | null) => { id: string; nivel: Nivel } | null)) => useAppStore.setState((s) => ({
        activeRubricActiveCell: typeof updater === 'function' ? updater(s.activeRubricActiveCell) : updater
    }));

    const localDescriptors = useAppStore(
        useShallow((s) =>
            s.activeRubricDescriptors && s.activeRubricDescriptors.length > 0
                ? s.activeRubricDescriptors
                : s.state.descriptoresRubrica.slice(0, 4)
        )
    ) as DescriptorRubrica[];

    const localNiveles = useAppStore(
        useShallow((s) =>
            s.activeRubricNiveles && s.activeRubricNiveles.length > 0
                ? s.activeRubricNiveles
                : s.state.nivelesPuntaje
        )
    ) as NivelPuntaje[];

    // Global application data state
    const cursos = useAppStore(useShallow((s) => s.state.cursos));
    const stateEstudiantes = useAppStore(useShallow((s) => s.state.estudiantes));
    const selectedEstId = useAppStore((s) => s.selectedEstudianteId);
    const setSelectedEstId = useAppStore((s) => s.setSelectedEstudianteId);

    const { saveRubrica } = useEvaluationActions();

    if (floatingRubrics.length === 0) return null;

    const handleMouseDown = (winId: string, e: React.MouseEvent) => {
        const win = floatingRubrics.find((w) => w.id === winId);
        if (!win) return;

        e.preventDefault();
        const startX = e.clientX - win.position.x;
        const startY = e.clientY - win.position.y;

        const handleMouseMove = (moveEvent: MouseEvent) => {
            const newX = moveEvent.clientX - startX;
            const newY = moveEvent.clientY - startY;
            updateFloatingRubric(winId, {
                position: { x: newX, y: newY },
            });
        };

        const handleMouseUp = () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
    };

    return (
        <div className="fixed inset-0 pointer-events-none z-150">
            {/* Inject global keyframe styles for highlighting/flashing focused PiP windows */}
            <style dangerouslySetInnerHTML={{ __html: `
                @keyframes pip-focus-flash {
                    0%, 100% { border-color: rgba(226, 232, 240, 1); box-shadow: 0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1); }
                    50% { border-color: #8FBCC7; box-shadow: 0 0 0 4px rgba(143, 188, 199, 0.5); }
                }
                .pip-window-animate {
                    animation: pip-focus-flash 0.8s ease-in-out 1;
                }
            `}} />

            {floatingRubrics.map((win) => {
                const descriptor = localDescriptors.find((d) => d.id === win.descriptorId);
                if (!descriptor) return null;

                const selectedCurso = cursos.find((c) => c.id === win.cursoId);
                const estudiantes = stateEstudiantes.filter((est) => est.sharedCourseId === selectedCurso?.sharedCourseId);
                const sortedEsts = [...estudiantes].sort((a, b) =>
                    (a.apellido + a.nombre).localeCompare(b.apellido + b.nombre)
                );

                const descIndex = localDescriptors.indexOf(descriptor);

                const handleSelect = (id: string, nivel: Nivel) => {
                    if (activeCell?.id === id && activeCell?.nivel === nivel) {
                        setActiveCell(null);
                    } else {
                        setActiveCell({ id, nivel });
                    }
                };

                const triggerSave = async (updatedSelection: Selection) => {
                    try {
                        const globalSelectedActId = useAppStore.getState().selectedActividadId;
                        await saveRubrica({
                            estudianteId: selectedEstId || sortedEsts[0]?.id || 0,
                            actividadId: globalSelectedActId || win.actividadId,
                            cursoId: win.cursoId,
                            fecha: new Date().toISOString().split('T')[0],
                            selecciones: updatedSelection,
                            observaciones: undefined,
                            puntajeTotal: 0,
                        });
                    } catch (err) {
                        console.error('Error saving floating rubric evaluation:', err);
                    }
                };

                const handleAvatarClick = async (estId: number) => {
                    setSelectedEstId(estId);

                    if (activeCell) {
                        setMultiEvaluations((prev) => {
                            const currentSelection = prev[estId] || {};
                            const isAlreadyInThisLevel = currentSelection[activeCell.id] === activeCell.nivel;

                            const next = {
                                ...currentSelection,
                                [activeCell.id]: isAlreadyInThisLevel ? undefined : activeCell.nivel,
                            };

                            const cleaned: Selection = {};
                            Object.entries(next).forEach(([k, v]) => {
                                if (v !== undefined) cleaned[k] = v;
                            });

                            return { ...prev, [estId]: cleaned };
                        });

                        if (estId === (selectedEstId || sortedEsts[0]?.id)) {
                            setSelection((prev) => {
                                const isAlreadyInThisLevel = prev[activeCell.id] === activeCell.nivel;
                                const next = {
                                    ...prev,
                                    [activeCell.id]: isAlreadyInThisLevel ? undefined : activeCell.nivel,
                                };
                                const cleaned: Selection = {};
                                Object.entries(next).forEach(([k, v]) => {
                                    if (v !== undefined) cleaned[k] = v;
                                });
                                triggerSave(cleaned);
                                return cleaned;
                            });
                        }
                    } else {
                        const existingEval = multiEvaluations[estId];
                        if (existingEval) {
                            setSelection(existingEval);
                        }
                    }
                };

                return (
                    <div
                        key={win.id}
                        style={{
                            top: win.position.y,
                            left: win.position.x,
                        }}
                        className="absolute w-150 sm:w-175 md:w-212.5 bg-white border border-slate-200 rounded-2xl flex flex-col pointer-events-auto transition-shadow z-150 shadow-2xl hover:shadow-slate-300 pip-window-animate"
                    >
                        {/* Header block */}
                        <div
                            onMouseDown={(e) => handleMouseDown(win.id, e)}
                            className="flex items-center justify-between px-4 py-2.5 bg-[#1E293B] text-white rounded-t-2xl cursor-move"
                        >
                            <div className="flex items-center gap-2">
                                <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                                <span className="text-xs font-black uppercase tracking-widest text-slate-300">
                                    Evaluación PiP: {descriptor.bc}
                                </span>
                            </div>

                            {/* Window controls */}
                            <div className="flex items-center gap-1.5">
                                <button
                                    onClick={() => removeFloatingRubric(win.id)}
                                    className="p-1 hover:bg-red-500/20 rounded transition-colors text-slate-400 hover:text-red-400"
                                    title="Cerrar"
                                >
                                    <X size={13} />
                                </button>
                            </div>
                        </div>

                        {/* Body content */}
                        <div className="p-4 space-y-3">
                            {/* Student selection bar */}
                            <div className="bg-slate-50 border border-slate-200/60 rounded-xl p-1.5">
                                <div className="flex gap-2.5 overflow-x-auto scrollbar-hide py-0.5 px-1">
                                    {sortedEsts.map((estudiante, idx) => {
                                        const isViewing = (selectedEstId || sortedEsts[0]?.id) === estudiante.id;
                                        const studentEval = multiEvaluations[estudiante.id];
                                        const numInvolved = studentEval ? Object.keys(studentEval).length : 0;
                                        const isInActiveCell = activeCell ? studentEval?.[activeCell.id] === activeCell.nivel : false;

                                        return (
                                            <button
                                                key={estudiante.id}
                                                onClick={() => handleAvatarClick(estudiante.id)}
                                                className="flex min-w-10 flex-col items-center gap-1 outline-none group relative"
                                            >
                                                <div
                                                    className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-black text-white transition-all ring-offset-2 ${
                                                        isViewing
                                                            ? 'scale-105 ring-2 ring-primary shadow-md'
                                                            : 'opacity-60 grayscale hover:scale-105 hover:opacity-100 hover:grayscale-0'
                                                    } ${isInActiveCell ? 'ring-2 ring-primary opacity-100 grayscale-0 ring-offset-2 scale-105' : ''}`}
                                                    style={{ background: estudiante.avatarColor }}
                                                >
                                                    {estudiante.nombre[0]}
                                                    {numInvolved > 0 && (
                                                        <div className="absolute -top-1 -right-1 bg-green-500 text-white text-[7px] h-3 w-3 rounded-full flex items-center justify-center font-black border border-white">
                                                            {numInvolved}
                                                        </div>
                                                    )}
                                                    {isInActiveCell && (
                                                        <div className="absolute -bottom-1 -right-1 bg-primary text-white h-3.5 w-3.5 rounded-full flex items-center justify-center border border-white shadow-sm">
                                                            <CheckCircle size={7} />
                                                        </div>
                                                    )}
                                                </div>
                                                <span
                                                    className={`text-center text-[7px] font-black uppercase tracking-[0.12em] truncate w-12 transition-colors ${
                                                        isViewing || isInActiveCell ? 'text-[#1E293B]' : 'text-slate-400'
                                                    }`}
                                                >
                                                    {idx + 1}. {estudiante.nombre.split(' ')[0]}
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Single Row Table */}
                            <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
                                <table className="w-full border-collapse font-sans text-xs table-fixed">
                                    <thead>
                                        <tr className="border-b border-slate-200 bg-slate-900 text-white">
                                            <th className="w-[30%] border-r border-white/20 px-2 py-1.5 text-center text-xs font-bold">
                                                Competencia
                                            </th>
                                            {NIVEL_FIELDS.map((field) => {
                                                const nivelActual = localNiveles.find((n) => n.nivel === field.nivel);
                                                return (
                                                    <th
                                                        key={field.key}
                                                        className={`w-[17.5%] border-r border-white/20 px-2 py-1.5 text-center text-xs font-bold last:border-r-0 ${field.headerTextColor || 'text-white'}`}
                                                        style={{ backgroundColor: field.headerBg }}
                                                    >
                                                        <div className="flex flex-col items-center justify-center">
                                                            <span>{nivelActual?.nombre || field.label}</span>
                                                            <span className="text-xs opacity-60">({nivelActual?.puntaje ?? 0} pts)</span>
                                                        </div>
                                                    </th>
                                                );
                                            })}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        <RubricaRow
                                            desc={descriptor}
                                            index={descIndex}
                                            selection={selection}
                                            activeCell={activeCell}
                                            activeFormatCell={null}
                                            sortedEsts={sortedEsts}
                                            multiEvaluations={multiEvaluations}
                                            readOnly={false}
                                            onSelect={handleSelect}
                                            isFloatingMode={true}
                                        />
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};
