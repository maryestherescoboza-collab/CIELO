import React from 'react';
import { Plus, Trash2, Target, ClipboardList, BookOpen, UserPlus, AlertTriangle, ArrowUpDown } from 'lucide-react';
import PegarListadoModal from './PegarListadoModal';
import StudentObservationModal from './StudentObservationModal';
import { useVirtualizer } from '@tanstack/react-virtual';
import GradeCell from './GradeCell';
import InsertarEstudianteModal from './InsertarEstudianteModal';
import MoverEstudianteModal from './MoverEstudianteModal';
import ActivityViewTab from './workspace/ActivityViewTab';
import type { BCKey, Actividad } from '../../types';
import { getCompetenciaDisplay } from '../../types';
import { getActivityBcPoints, getProductoFinalMaxPoints, hasProductoFinalCustomPoints } from '../../utils/academic';
import { CieloModal } from '../ui/CieloModal';
interface GradeTableProps {
    actividades: Actividad[];
    estudiantes: any[];
    estudiantesRealesCurso: any[];
    bcSel: Record<number, Set<BCKey>>;
    isDragging: boolean;
    evalMode: string;
    activePaintColor: number;
    focusedCell: { estId: number, actId: number } | null;
    gradeAnimations: any[];
    onSetGrade: (estId: number, actId: number, val: number | null) => void;
    onSetGradesBatch?: (updates: Array<{ estId: number, actId: number, val: number | null }>) => void;
    onSetFocusedCell: (cell: { estId: number, actId: number } | null) => void;
    onAddActividad: () => void;
    onUpdateActividad: (id: number, act: Partial<Actividad>) => void;
    onUpdateEstudiante: (id: number, est: any) => void;
    onDeleteActividad: (id: number) => void;
    onToggleBc: (actId: number, bc: BCKey) => void;
    onAddEstudiante: (nombre?: string, apellido?: string, numeroLista?: number) => Promise<any> | void;
    onAddEstudianteEnPosicion?: (nombre: string, apellido: string, posicion: number) => Promise<any>;
    onReordenarEstudiante?: (id: number, posicionDestino: number) => Promise<any>;
    onDeleteEstudiante?: (id: number) => void;
    onSetRubricTarget: (target: any) => void;
    getGradeClass: (score: number | null) => string;
    BC_COLOR_THEMES: Record<BCKey, { bg: string, text: string, active: string }>;
    BC_ICONS: Record<BCKey, React.ReactNode>;
    openActivityId?: number | null;
    onOpenActivityView?: (actId: number) => void;
}

const GradeTable: React.FC<GradeTableProps> = ({
    actividades,
    estudiantes,
    estudiantesRealesCurso,
    bcSel,
    isDragging,
    evalMode,
    activePaintColor,
    focusedCell,
    gradeAnimations,
    onSetGrade,
    onSetGradesBatch,
    onSetFocusedCell,
    onAddActividad,
    onUpdateActividad,
    onUpdateEstudiante,
    onDeleteActividad,
    onToggleBc,
    onAddEstudiante,
    onAddEstudianteEnPosicion,
    onReordenarEstudiante,
    onDeleteEstudiante,
    onSetRubricTarget,
    getGradeClass,
    BC_COLOR_THEMES,
    BC_ICONS,
    openActivityId = null,
    onOpenActivityView
}) => {
    void onAddActividad;
    const parentRef = React.useRef<HTMLDivElement>(null);

    // Estado para el modal de "Pegar listado" (solo edita nombre/apellido)
    const [showPegarListado, setShowPegarListado] = React.useState(false);
    
    // Estado para modal de insertar estudiante en posición
    const [showInsertar, setShowInsertar] = React.useState(false);

    // Estado para modal de mover estudiante de posición
    const [estudianteAMover, setEstudianteAMover] = React.useState<{ id: number; displayName: string; numeroLista: number } | null>(null);

    // Estado para modal de observación
    const [obsModalEstudianteId, setObsModalEstudianteId] = React.useState<number | null>(null);

    // Estado para confirmación de eliminación de actividad
    const [actividadAEliminar, setActividadAEliminar] = React.useState<number | null>(null);

    // Estado para confirmación de eliminación de estudiante
    const [estudianteAEliminar, setEstudianteAEliminar] = React.useState<{ id: number, displayName: string } | null>(null);

    // Fuente de verdad para saber si una posición tiene estudiante REAL activo:
    // curso actual + numero_lista. Los arrays visuales (con IDs negativos /
    // isPlaceholder) NUNCA deciden si existe un estudiante.
    const realesPorNumero = React.useMemo(() => {
        const m = new Map<number, any>();
        for (const e of estudiantesRealesCurso) {
            if ((e.id ?? 0) > 0 && typeof e.numeroLista === 'number' && !m.has(e.numeroLista)) {
                m.set(e.numeroLista, e);
            }
        }
        return m;
    }, [estudiantesRealesCurso]);

    // Refs "frescos" para el handler global de pegado: el listener se registra una
    // sola vez y aquí se leen SIEMPRE los valores más recientes (lista, callbacks
    // de persistencia y fila enfocada) sin depender de cierres obsoletos.
    const displayEstudiantesRef = React.useRef(estudiantes);
    displayEstudiantesRef.current = estudiantes;
    const actividadesRef = React.useRef(actividades);
    actividadesRef.current = actividades;
    const bcSelRef = React.useRef(bcSel);
    bcSelRef.current = bcSel;
    const onUpdateEstudianteRef = React.useRef(onUpdateEstudiante);
    onUpdateEstudianteRef.current = onUpdateEstudiante;
    const onAddEstudianteRef = React.useRef(onAddEstudiante);
    onAddEstudianteRef.current = onAddEstudiante;
    const onSetGradeRef = React.useRef(onSetGrade);
    onSetGradeRef.current = onSetGrade;
    const onSetGradesBatchRef = React.useRef(onSetGradesBatch);
    onSetGradesBatchRef.current = onSetGradesBatch;
    const realesPorNumeroRef = React.useRef(realesPorNumero);
    realesPorNumeroRef.current = realesPorNumero;
    const focusedRowIndexRef = React.useRef<number | null>(null);
    const focusedGradeCellRef = React.useRef<{ estId: number; actId: number } | null>(null);
    focusedGradeCellRef.current = focusedCell;

    React.useEffect(() => {
        const handleStudentPaste = async (e: ClipboardEvent) => {
            // Si el usuario tiene una celda de evaluación seleccionada, este evento corresponde a calificaciones
            if (focusedGradeCellRef.current !== null) {
                return;
            }

            const activeEl = document.activeElement;
            // Ignorar si el usuario está pegando explícitamente en otro campo de texto (ej. nombre de actividad o calificación)
            if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA')) {
                if (activeEl.getAttribute('data-guide') !== 'celda-estudiante') {
                    return;
                }
            }

            const text = e.clipboardData?.getData('text/plain') || e.clipboardData?.getData('text');
            if (!text) return;

            // Permite pegar aunque sea una sola línea ("Ana Pérez")
            e.preventDefault();

            // Cada línea (tolerando \n y \r\n) es una fila. Solo se recortan los
            // espacios del inicio/final; el contenido interno del nombre no se altera.
            const rows = text.split(/\r?\n/).map(r => r.trim()).filter(r => r.length > 0);
            if (rows.length === 0) return;

            // Si la primera fila parece cabecera, se omite solo cuando hay más filas
            let rowsOffset = 0;
            const firstLower = rows[0].toLowerCase();
            if (rows.length > 1 && (firstLower.includes('nombre') || firstLower.includes('apellido') || firstLower.includes('estudiante'))) {
                rowsOffset = 1;
            }
            const names = rows.slice(rowsOffset);
            if (names.length === 0) return;

            // El portapapeles es la fuente de verdad: se conserva el orden exacto.
            // La fila inicial es la que estaba enfocada; si no hay ninguna, desde la 1.
            // Las posiciones son numero_lista reales: si la posición ya tiene un
            // estudiante real se actualiza nombre/apellido; si está vacía se crea.
            const currentList = displayEstudiantesRef.current;
            const startIdx = Math.max(0, focusedRowIndexRef.current ?? 0);
            const startRow = currentList[startIdx]?.numeroLista ?? 1;
            const reales = realesPorNumeroRef.current;
            let applied = 0;

            for (let i = 0; i < names.length; i++) {
                // Solo el primer campo (tolera tabulaciones) y se eliminan prefijos
                // de numeración del portapapeles ("1. Ana Pérez" → "Ana Pérez").
                const cell = names[i].split('\t')[0].replace(/^\s*(?:\d{1,3})\s*[.)]\s*/, '').trim();
                if (!cell) continue;

                const parts = cell.split(' ');
                const nombre = parts[0] || '';
                const apellido = parts.slice(1).join(' ') || '';

                const targetNumero = startRow + i;
                const real = reales.get(targetNumero);

                if (real) {
                    // Estudiante REAL en la posición → editar SOLO nombre/apellido
                    // usando su id real (nunca numero_lista como clave).
                    onUpdateEstudianteRef.current(real.id, { nombre, apellido });
                    applied++;
                } else {
                    // Posición vacía (hueco legacy / liberada) → crear estudiante REAL
                    // en ese numero_lista con el flujo oficial.
                    const creado = await onAddEstudianteRef.current(nombre, apellido, targetNumero);
                    if (creado) applied++;
                }
            }
        };

        document.addEventListener('paste', handleStudentPaste);
        return () => document.removeEventListener('paste', handleStudentPaste);
        // El listener se registra una vez; los valores frescos se leen vía refs.
    }, []);

    // Handler global de pegado masivo de calificaciones desde Excel / Hojas de cálculo
    React.useEffect(() => {
        const handleGradePaste = async (e: ClipboardEvent) => {
            const activeEl = document.activeElement;

            // 1. Verificar si el usuario está enfocado en otro campo que no sea de evaluación
            if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA')) {
                const guide = activeEl.getAttribute('data-guide');
                // Si está en el nombre de un estudiante, lo procesa handleStudentPaste
                if (guide === 'celda-estudiante') return;
                // Si es cualquier otro input que no sea celda de calificación, no intervenir
                if (guide !== 'celda-evaluacion-input') return;
            }

            // 2. Determinar la celda de evaluación inicial
            let startEstId: number | null = null;
            let startActId: number | null = null;

            if (activeEl?.getAttribute('data-guide') === 'celda-evaluacion-input') {
                const estAttr = activeEl.getAttribute('data-est-id');
                const actAttr = activeEl.getAttribute('data-act-id');
                if (estAttr && actAttr) {
                    startEstId = Number(estAttr);
                    startActId = Number(actAttr);
                }
            }

            if (!startEstId || !startActId) {
                const cell = focusedGradeCellRef.current;
                if (cell) {
                    startEstId = cell.estId;
                    startActId = cell.actId;
                }
            }

            // Si no hay celda de evaluación seleccionada, este evento no nos corresponde
            if (!startEstId || !startActId) return;

            const text = e.clipboardData?.getData('text/plain') || e.clipboardData?.getData('text');
            if (!text) return;

            e.preventDefault();
            if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA')) {
                (activeEl as HTMLElement).blur();
            }

            // Normalizar texto eliminando saltos finales y separando filas
            const cleanText = text.replace(/[\r\n]+$/, '');
            const rawLines = cleanText.split(/\r?\n/).map(l => l.trimEnd());
            if (rawLines.length === 0) return;

            // Detección de fila de cabecera si el docente copió títulos de actividades o encabezados de Excel
            let linesOffset = 0;
            const firstRowCells = rawLines[0].split('\t').map(c => c.trim().toLowerCase());
            const hasHeaderKeyword = firstRowCells.some(c => 
                /(?:actividad|calificaci[oó]n|nota|puntaje|puntos|score|evaluaci[oó]n)/i.test(c)
            );
            if (hasHeaderKeyword && rawLines.length > 1) {
                const secondRowCells = rawLines[1].split('\t');
                const secondRowHasNumber = secondRowCells.some(c => {
                    const norm = c.trim().replace(',', '.');
                    return !isNaN(Number(norm)) && norm !== '';
                });
                if (secondRowHasNumber) {
                    linesOffset = 1;
                }
            }

            const dataLines = rawLines.slice(linesOffset);
            if (dataLines.length === 0) return;

            const currentStudents = displayEstudiantesRef.current;
            const currentActs = actividadesRef.current;
            const currentBcSel = bcSelRef.current;

            // Encontrar índice de fila y columna inicial
            const startRowIdx = currentStudents.findIndex(est => est.id === startEstId);
            const startColIdx = currentActs.findIndex(act => act.id === startActId);

            if (startRowIdx === -1 || startColIdx === -1) return;

            const validUpdates: Array<{ estId: number; actId: number; val: number | null }> = [];
            const errores: Array<{ estudiante: string; actividad: string; valor: string; motivo: string }> = [];

            for (let r = 0; r < dataLines.length; r++) {
                const targetEstIndex = startRowIdx + r;
                if (targetEstIndex >= currentStudents.length) break; // Excede la lista disponible

                const targetEst = currentStudents[targetEstIndex];
                // Si la posición está vacía (placeholder), se omite sin alterar
                if (targetEst.isPlaceholder || targetEst.id <= 0) continue;

                const cells = dataLines[r].split('\t');

                for (let c = 0; c < cells.length; c++) {
                    const targetActIndex = startColIdx + c;
                    if (targetActIndex >= currentActs.length) break; // Excede las actividades disponibles

                    const targetAct = currentActs[targetActIndex];
                    if (targetAct.nombre === 'Recuperación') continue;

                    const cellRaw = cells[c]?.trim() ?? '';
                    const estNombre = targetEst.displayName || `Estudiante ${targetEst.numeroLista || targetEstIndex + 1}`;
                    const actNombre = targetAct.nombre;

                    // Celda vacía o guión: borrar calificación (null)
                    if (cellRaw === '' || cellRaw === '-') {
                        validUpdates.push({
                            estId: targetEst.id,
                            actId: targetAct.id,
                            val: null,
                        });
                        continue;
                    }

                    const normalized = cellRaw.replace(',', '.');
                    const num = Number(normalized);

                    if (isNaN(num)) {
                        errores.push({
                            estudiante: estNombre,
                            actividad: actNombre,
                            valor: cellRaw,
                            motivo: 'No es un número válido',
                        });
                        continue;
                    }

                    const isProductoFinal = !!targetAct.isProductoFinal;
                    const hasCustomPFPoints = isProductoFinal && hasProductoFinalCustomPoints(targetAct, currentBcSel);
                    const maxPoints = hasCustomPFPoints 
                        ? getProductoFinalMaxPoints(targetAct, currentActs, currentBcSel) 
                        : 100;
                    const limit = (maxPoints && maxPoints > 0) ? maxPoints : 100;

                    if (num < 0 || num > limit) {
                        errores.push({
                            estudiante: estNombre,
                            actividad: actNombre,
                            valor: cellRaw,
                            motivo: `Fuera del rango permitido (0 a ${limit}${hasCustomPFPoints ? ' pts' : ''})`,
                        });
                        continue;
                    }

                    // En Producto Final con puntos personalizados, convertir a escala 100
                    const scoreToSave = hasCustomPFPoints ? (num / limit) * 100 : num;

                    validUpdates.push({
                        estId: targetEst.id,
                        actId: targetAct.id,
                        val: scoreToSave,
                    });
                }
            }

            // Aplicar actualizaciones válidas en bloque
            if (validUpdates.length > 0) {
                if (onSetGradesBatchRef.current) {
                    onSetGradesBatchRef.current(validUpdates);
                } else {
                    validUpdates.forEach(u => onSetGradeRef.current(u.estId, u.actId, u.val));
                }
            }

            // Informar claramente si hubo celdas que no se pudieron aplicar
            if (errores.length > 0) {
                const maxMostrar = 10;
                const detalle = errores.slice(0, maxMostrar)
                    .map(err => `• ${err.estudiante} en "${err.actividad}": "${err.valor}" (${err.motivo})`)
                    .join('\n');
                const masErrores = errores.length > maxMostrar 
                    ? `\n... y ${errores.length - maxMostrar} celda(s) adicional(es) con error.` 
                    : '';

                if (validUpdates.length > 0) {
                    alert(`Pegado parcial completado:\n\nSe aplicaron correctamente ${validUpdates.length} calificación(es).\n\nLas siguientes ${errores.length} celda(s) no se pudieron aplicar y conservaron su valor anterior:\n${detalle}${masErrores}`);
                } else {
                    alert(`No se pudo aplicar ninguna calificación debido a valores inválidos:\n\n${detalle}${masErrores}`);
                }
            }
        };

        document.addEventListener('paste', handleGradePaste);
        return () => document.removeEventListener('paste', handleGradePaste);
    }, []);


    const rowVirtualizer = useVirtualizer({
        count: estudiantes.length,
        getScrollElement: () => parentRef.current,
        estimateSize: () => 64,
        overscan: 10,
    });

    const totalHeight = rowVirtualizer.getTotalSize();
    const items = rowVirtualizer.getVirtualItems();

    const COLUMNS = React.useMemo(() => {
        const cols: any[] = [];
        cols.push({ id: 'estudiantes', type: 'estudiantes', width: 320 });
        
        actividades.forEach(act => {
            cols.push({ id: `act-${act.id}`, type: 'actividad', width: 140, act });
        });
        
        cols.push({ id: 'destaca', type: 'destaca', width: 80 });
        
        (['BC1', 'BC2', 'BC3', 'BC4'] as const).forEach((bc, idx) => {
            cols.push({ id: `bc-${bc}-avg`, type: 'bc-avg', width: 180, bc, idx });
            cols.push({ id: `bc-${bc}-rec`, type: 'bc-rec', width: 60, bc, idx });
        });
        
        return cols;
    }, [actividades]);

    return (
        <div ref={parentRef} className="flex-1 overflow-auto bg-transparent">
            <div className="min-w-max p-6">
                <div className="bg-white rounded-4xl shadow-sm border border-(--border-soft) min-w-max w-max">
                    {/* Header */}
                    <div className="sticky top-0 z-40 bg-(--background) text-[#2E3330] border-b border-(--border-soft) flex min-w-max w-max rounded-t-4xl">
                        {COLUMNS.map(col => {
                            const style: React.CSSProperties = { width: col.width, minWidth: col.width, maxWidth: col.width, flexShrink: 0 };
                            
                            if (col.type === 'estudiantes') {
                                return (
                                    <div key={col.id} className="sticky left-0 z-50 bg-(--background) px-6 py-5 text-left border-r border-(--border-soft) flex flex-col items-start justify-center gap-3 box-border" style={style}>
                                        <span className="text-sm font-black uppercase tracking-[0.2em] italic text-[#2E3330]">Estudiantes</span>
                                        <div className="flex flex-col items-start gap-1.5">
                                            <button data-guide="btn-agregar-estudiante" onClick={() => onAddEstudiante()} className="flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-black uppercase tracking-wider text-[#5F665E] hover:text-[#2E3330] hover:bg-base-creme border border-transparent hover:border-(--border-soft) transition-all"><Plus size={14} strokeWidth={2.6} />Agregar estudiante</button>
                                            <button onClick={() => setShowInsertar(true)} className="flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-black uppercase tracking-wider text-[#5F665E] hover:text-[#2E3330] hover:bg-base-creme border border-transparent hover:border-(--border-soft) transition-all"><UserPlus size={14} strokeWidth={2.6} />Agregar en posición</button>
                                            <button data-guide="btn-pegar-listado" onClick={() => setShowPegarListado(true)} className="flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-black uppercase tracking-wider text-[#5F665E] hover:text-[#2E3330] hover:bg-base-creme border border-transparent hover:border-(--border-soft) transition-all"><ClipboardList size={14} strokeWidth={2.6} />Pegar listado</button>
                                        </div>
                                    </div>
                                );
                            }
                            if (col.type === 'actividad') {
                                const act = col.act;
                                const isProductoFinal = !!act.isProductoFinal;
                                return (
                                    <div key={col.id} className="px-2 py-4 border-r border-(--border-soft) relative group flex flex-col items-center justify-center box-border" style={style}>
                                        {onOpenActivityView && (
                                            <ActivityViewTab
                                                activityId={act.id}
                                                isOpen={openActivityId === act.id}
                                                onOpen={() => onOpenActivityView(act.id)}
                                            />
                                        )}
                                        <div className="flex flex-col items-center gap-3 w-full">
                                            <div className="flex items-center gap-2 w-full justify-center px-1">
                                                {!isProductoFinal && (
                                                    <button onClick={() => setActividadAEliminar(act.id)} title="Eliminar actividad" className="opacity-0 group-hover:opacity-100 w-6 h-6 flex items-center justify-center hover:bg-danger rounded-full transition-all text-[#5F665E] hover:text-white shrink-0"><Trash2 size={12} /></button>
                                                )}
                                                <input 
                                                    data-guide="celda-actividad"
                                                    defaultValue={act.nombre.replace(/^Actividad\s+/i, 'ACTIV. ')}
                                                    onFocus={(e) => { e.target.value = act.nombre; }}
                                                    onBlur={(e) => {
                                                        const val = e.target.value.trim();
                                                        if (val && val !== act.nombre) {
                                                            onUpdateActividad(act.id, { nombre: val });
                                                        } else {
                                                            e.target.value = act.nombre.replace(/^Actividad\s+/i, 'ACTIV. ');
                                                        }
                                                    }}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') e.currentTarget.blur();
                                                        if (e.key === 'Escape') {
                                                            e.currentTarget.value = act.nombre.replace(/^Actividad\s+/i, 'ACTIV. ');
                                                            e.currentTarget.blur();
                                                        }
                                                    }}
                                                    className="text-sm font-black uppercase tracking-wider text-[#5F665E] hover:text-[#2E3330] focus:text-[#2E3330] bg-transparent outline-none text-center w-full max-w-30 truncate focus:border-b focus:border-primary/30 transition-all placeholder:text-[#5F665E]/40"
                                                    placeholder="NOMBRE"
                                                />
                                            </div>
                                            <div className="flex items-center gap-1 bg-base-creme p-1 rounded-full border border-(--border-soft)">
                                                {(['BC1', 'BC2', 'BC3', 'BC4'] as BCKey[]).map(bc => {
                                                    const isSel = (bcSel[act.id] ?? new Set(act.bcAsignados)).has(bc);
                                                    return (
                                                        <button 
                                                            key={bc}
                                                            data-guide="bloque-competencia"
                                                            onClick={() => onToggleBc(act.id, bc)}
                                                            className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ${isSel ? BC_COLOR_THEMES[bc].active : 'text-[#5F665E]/40 hover:text-[#5F665E]'}`}
                                                        >
                                                            {BC_ICONS[bc]}
                                                        </button>
                                                    );
                                                 })}
                                            </div>
                                            <div className="flex justify-center gap-1">
                                                {(['BC1', 'BC2', 'BC3', 'BC4'] as BCKey[]).map(bc => {
                                                    const participa = (bcSel[act.id] ?? new Set(act.bcAsignados)).has(bc);
                                                    const aporte = getActivityBcPoints({ actividad: act, bc, actividades, bcSel });
                                                    const txt = String(Math.round(aporte));
                                                    return (
                                                        <span key={bc} className="w-7 flex items-baseline justify-center gap-0.5 leading-none">
                                                            <span className={`text-[11px] font-black ${participa ? 'text-[#2E3330]' : 'text-[#5F665E]/35'}`}>{txt}</span>
                                                            <span className="text-[7px] font-semibold text-[#5F665E]/45">pts</span>
                                                        </span>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </div>
                                );
                            }
                            if (col.type === 'destaca') {
                                return (
                                    <div key={col.id} className="px-4 py-4 border-r border-(--border-soft) bg-warning/10 flex flex-col items-center justify-center box-border" style={style}>
                                        <Target size={18} className="text-danger" />
                                        <span className="text-xs font-black uppercase tracking-widest text-danger/70 mt-1">Destaca</span>
                                    </div>
                                );
                            }
                            if (col.type === 'bc-avg') {
                                const fullName = getCompetenciaDisplay(col.bc);
                                return (
                                     <div key={col.id} className={`px-2 pb-2 pt-4 border-r border-(--border-soft) flex flex-col items-center justify-end box-border relative ${col.idx === 0 ? 'border-l-2 border-l-[rgba(46,51,48,0.08)]' : ''}`} style={style}>
                                         <span className="text-xs font-bold uppercase tracking-wider text-[#5F665E] text-center leading-[1.2] whitespace-normal w-full">{fullName}</span>
                                     </div>
                                 );
                            }
                            if (col.type === 'bc-rec') {
                                return (
                                    <div key={col.id} className="px-4 py-4 border-r border-(--border-soft) bg-primary/5 flex flex-col items-center justify-center box-border" style={style}>
                                        <span className="text-xs font-black uppercase tracking-widest text-primary/70">Rec.</span>
                                    </div>
                                );
                            }
                            return null;
                        })}
                    </div>

                    {/* Body */}
                    <div className="relative" style={{ height: `${totalHeight}px`, minWidth: '100%' }}>
                        {items.map((virtualItem) => {
                            const est = estudiantes[virtualItem.index];
                            const eIdx = virtualItem.index;
                            return (
                                <div 
                                    key={virtualItem.key} 
                                    data-index={virtualItem.index}
                                    ref={rowVirtualizer.measureElement}
                                    className={`group hover:bg-(--background) transition-colors flex min-w-max w-max border-b border-[rgba(46,51,48,0.04)] ${eIdx % 2 === 0 ? 'bg-white' : 'bg-base-creme'}`}
                                    style={{
                                        position: 'absolute',
                                        top: 0,
                                        left: 0,
                                        transform: `translateY(${virtualItem.start}px)`,
                                        height: `${virtualItem.size}px`
                                    }}
                                >
                                    {COLUMNS.map(col => {
                                        const style: React.CSSProperties = { width: col.width, minWidth: col.width, maxWidth: col.width, flexShrink: 0 };
                                        
                                        if (col.type === 'estudiantes') {
                                            return (
                                                <div key={col.id} className="sticky left-0 z-20 bg-inherit px-6 py-3 border-r border-(--border-soft) font-semibold text-[#2E3330] flex items-center box-border" style={style}>
                                                    <div className="flex items-center gap-2 w-full">
                                                        {!est.isPlaceholder && onDeleteEstudiante && (
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setEstudianteAEliminar({ id: est.id, displayName: est.displayName });
                                                                }}
                                                                className="w-5 h-5 flex items-center justify-center rounded-full bg-slate-50 border border-slate-200 text-slate-400 hover:text-danger hover:border-danger/40 hover:bg-danger/10 transition-all text-sm pb-0.5 shadow-sm shrink-0 opacity-0 group-hover:opacity-100 focus:opacity-100"
                                                                title="Eliminar estudiante"
                                                            >
                                                                ×
                                                            </button>
                                                        )}
                                                        <span className={`text-xs font-black text-[#5F665E]/40 w-4 shrink-0 text-right ${!(!est.isPlaceholder && onDeleteEstudiante) ? 'ml-7' : ''}`}>{eIdx + 1}</span>
                                                        <div className="flex flex-col overflow-hidden w-full">
                                                            <input 
                                                                key={`${est.id}-${est.displayName}`}
                                                                data-guide="celda-estudiante"
                                                                defaultValue={est.displayName}
                                                                placeholder={est.isPlaceholder ? 'Posición vacía…' : undefined}
                                                                onFocus={() => { 
                                                                    focusedRowIndexRef.current = eIdx; 
                                                                    focusedGradeCellRef.current = null;
                                                                    onSetFocusedCell(null);
                                                                }}
                                                                onBlur={(e) => {
                                                                    const val = e.target.value.trim();
                                                                    if (val && val !== est.displayName) {
                                                                        const parts = val.split(' ');
                                                                        const nombre = parts[0] || '';
                                                                        const apellido = parts.slice(1).join(' ') || '';
                                                                        if (est.isPlaceholder) {
                                                                            // Posición vacía (hueco legacy / liberada). Si por algún filtro de
                                                                            // búsqueda un estudiante real fuera invisible pero ocupara este
                                                                            // numero_lista, se actualiza su nombre; si no, se crea REAL aquí.
                                                                            const real = realesPorNumeroRef.current.get(est.numeroLista);
                                                                            if (real) {
                                                                                onUpdateEstudianteRef.current(real.id, { nombre, apellido });
                                                                            } else {
                                                                                onAddEstudianteRef.current(nombre, apellido, est.numeroLista);
                                                                            }
                                                                            // El valor se limpia: al crearse, la fila se remonta con el nombre
                                                                            // real; si falla, la posición queda igualmente vacía.
                                                                            e.target.value = '';
                                                                        } else {
                                                                            onUpdateEstudianteRef.current(est.id, { nombre, apellido });
                                                                        }
                                                                    } else {
                                                                        e.target.value = est.displayName;
                                                                    }
                                                                }}
                                                                onKeyDown={(e) => {
                                                                    if (e.key === 'Enter') e.currentTarget.blur();
                                                                    if (e.key === 'Escape') {
                                                                        e.currentTarget.value = est.displayName;
                                                                        e.currentTarget.blur();
                                                                    }
                                                                }}
                                                                className="text-sm font-black uppercase tracking-tight truncate bg-transparent outline-none w-full hover:bg-(--background) focus:bg-white focus:ring-1 focus:ring-[rgba(46,51,48,0.15)] rounded px-1 transition-all placeholder:text-[#5F665E]/40 placeholder:font-semibold"
                                                            />
                                                            {est.isPlaceholder ? (
                                                                <span className="text-xs font-bold text-[#5F665E]/50 uppercase tracking-widest truncate px-1">N.º {est.numeroLista} · libre</span>
                                                            ) : (
                                                                <span className="text-xs font-bold text-[#5F665E] uppercase tracking-widest truncate px-1">ID: {est.id.toString().slice(-6)}</span>
                                                            )}
                                                        </div>
                                                        {/* Acciones del estudiante: Reordenar y Observaciones */}
                                                        {!est.isPlaceholder && (
                                                            <div className="flex items-center gap-0.5 shrink-0">
                                                                {onReordenarEstudiante && (
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            setEstudianteAMover({
                                                                                id: est.id,
                                                                                displayName: est.displayName,
                                                                                numeroLista: est.numeroLista || (eIdx + 1)
                                                                            });
                                                                        }}
                                                                        className="p-1 rounded-md text-[#5F665E]/30 hover:text-[#689C63] hover:bg-[#689C63]/10 transition-colors shrink-0"
                                                                        title="Mover de posición en la lista"
                                                                    >
                                                                        <ArrowUpDown size={15} />
                                                                    </button>
                                                                )}
                                                                <button
                                                                    onClick={() => setObsModalEstudianteId(est.id)}
                                                                    className={`p-1 rounded-md transition-colors shrink-0 ${est.observacion ? 'text-amber-500 hover:bg-amber-50' : 'text-[#5F665E]/30 hover:text-[#5F665E] hover:bg-gray-100'}`}
                                                                    title="Observaciones del estudiante"
                                                                >
                                                                    <BookOpen size={16} />
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        }
                                        if (col.type === 'actividad') {
                                            if (est.isPlaceholder) {
                                                // Posición vacía: sin estudiante → sin notas posibles. No se
                                                // renderiza GradeCell (evita enviar IDs negativos a setCalif).
                                                return (
                                                    <div key={col.id} className="px-3 py-3 border-r border-(--border-soft) flex items-center justify-center box-border bg-base-creme/40" style={style}>
                                                        <span className="text-xs font-bold text-[#5F665E]/30">—</span>
                                                    </div>
                                                );
                                            }
                                            const act = col.act;
                                            const isProductoFinal = !!act.isProductoFinal;
                                            const hasCustomPFPoints = isProductoFinal && hasProductoFinalCustomPoints(act, bcSel);
                                            const maxPoints = hasCustomPFPoints ? getProductoFinalMaxPoints(act, actividades, bcSel) : 100;
                                            return (
                                                <GradeCell 
                                                    key={col.id}
                                                    estId={est.id}
                                                    actId={act.id}
                                                    score={est.calificaciones?.[act.id] ?? null}
                                                    isRecoveryAct={act.nombre === 'Recuperación'}
                                                    evalMode={evalMode}
                                                    isDragging={isDragging}
                                                    isFocused={focusedCell?.estId === est.id && focusedCell?.actId === act.id}
                                                    activePaintColor={activePaintColor}
                                                    animations={gradeAnimations.filter(a => a.estId === est.id && a.actId === act.id)}
                                                    onInteraction={(type) => {
                                                        if (type === 'focus' || type === 'click') {
                                                            focusedRowIndexRef.current = eIdx;
                                                            const cell = { estId: est.id, actId: act.id };
                                                            focusedGradeCellRef.current = cell;
                                                            onSetFocusedCell(cell);
                                                        }
                                                    }}
                                                    onSetGrade={(val) => onSetGrade(est.id, act.id, val)}
                                                    getGradeClass={getGradeClass}
                                                    hasLowBc={est.bcValues?.some((v: any) => v.avg !== null && v.avg < 70 && !v.rec) ?? false}
                                                    style={style}
                                                    isProductoFinal={hasCustomPFPoints}
                                                    maxPoints={maxPoints}
                                                />
                                            );
                                        }
                                        if (col.type === 'destaca') {
                                            return (
                                                <div key={col.id} className="px-3 py-3 border-r border-(--border-soft) flex items-center justify-center box-border bg-base-creme" style={style}>
                                                    {est.destaca && (
                                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white shadow-sm transition-transform hover:scale-110 ${BC_COLOR_THEMES[est.destaca as BCKey]?.active}`}>
                                                            {BC_ICONS[est.destaca as BCKey]}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        }
                                        if (col.type === 'bc-avg') {
                                            const v = est.bcValues?.[col.idx];
                                            return (
                                                <div key={col.id} className={`px-3 py-3 border-r border-(--border-soft) flex items-center justify-center box-border ${col.idx === 0 ? 'border-l-2 border-l-[rgba(46,51,48,0.08)]' : ''}`} style={style}>
                                                    <span className={`text-base font-semibold px-2.5 py-1 rounded ${v?.avg !== null ? getGradeClass(v.avg) : ''}`}>{v?.avg !== null && v?.avg !== undefined ? Math.round(v.avg) : '-'}</span>
                                                </div>
                                            );
                                        }
                                        if (col.type === 'bc-rec') {
                                            const v = est.bcValues?.[col.idx];
                                            const needsRec = v && v.avg !== null && v.avg < 70;
                                            const bcNum = (col.idx + 1) as 1 | 2 | 3 | 4;
                                            const hasEvaluated = v?.rec !== null && v?.rec !== undefined;
                                            return (
                                                <div 
                                                    key={col.id}
                                                    onClick={() => needsRec && onSetRubricTarget({ estId: est.id, bc: bcNum, bcName: v.bc })} 
                                                    className={`border-r border-(--border-soft) transition-all flex items-center justify-center text-sm font-bold box-border ${needsRec ? 'cursor-pointer bg-white hover:bg-(--background)' : 'bg-base-creme opacity-40 cursor-default'}`}
                                                    style={style}
                                                    title={needsRec && !hasEvaluated ? 'Pendiente de evaluación de recuperación' : undefined}
                                                >
                                                    {hasEvaluated ? (
                                                        <span className={`${v.rec >= 70 ? 'text-emerald-600' : 'text-slate-700'} font-bold`}>{v.rec}</span>
                                                    ) : needsRec ? (
                                                        <img 
                                                            src="https://img.icons8.com/stickers/100/error.png" 
                                                            alt="error" 
                                                            className="w-5 h-5 object-contain select-none transition-transform hover:scale-110" 
                                                        />
                                                    ) : null}
                                                </div>
                                            );
                                        }
                                        return null;
                                    })}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
            <PegarListadoModal
                show={showPegarListado}
                onClose={() => setShowPegarListado(false)}
                estudiantes={estudiantes}
                estudiantesRealesCurso={estudiantesRealesCurso}
                onUpdateEstudiante={onUpdateEstudiante}
                onAddEstudiante={onAddEstudiante}
            />
            {onAddEstudianteEnPosicion && (
                <InsertarEstudianteModal
                    show={showInsertar}
                    onClose={() => setShowInsertar(false)}
                    maxPosicion={Math.max(0, ...estudiantesRealesCurso.map(e => e.numeroLista || 0))}
                    onInsertar={async (n, a, p) => {
                        return onAddEstudianteEnPosicion(n, a, p);
                    }}
                />
            )}
            <StudentObservationModal
                show={obsModalEstudianteId !== null}
                estudiante={estudiantesRealesCurso.find(e => e.id === obsModalEstudianteId)}
                actividades={actividades}
                onClose={() => setObsModalEstudianteId(null)}
                onSave={(obs) => {
                    if (obsModalEstudianteId) {
                        onUpdateEstudiante(obsModalEstudianteId, { observacion: obs });
                    }
                }}
            />

            <CieloModal
                isOpen={actividadAEliminar !== null}
                onClose={() => setActividadAEliminar(null)}
                title="¿Eliminar actividad?"
                icon={<AlertTriangle className="text-danger w-5 h-5" />}
                maxWidth="md"
                footer={
                    <div className="flex items-center justify-end gap-3 w-full">
                        <button
                            onClick={() => setActividadAEliminar(null)}
                            className="px-5 py-2.5 rounded-full text-sm font-bold text-(--ink-soft) hover:bg-slate-100 transition-colors uppercase tracking-widest"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={() => {
                                if (actividadAEliminar !== null) {
                                    onDeleteActividad(actividadAEliminar);
                                    setActividadAEliminar(null);
                                }
                            }}
                            className="px-5 py-2.5 rounded-full text-sm font-bold text-white bg-danger hover:bg-red-700 transition-colors shadow-md shadow-danger/20 uppercase tracking-widest"
                        >
                            Eliminar permanentemente
                        </button>
                    </div>
                }
            >
                <div className="py-4">
                    <p className="text-sm text-(--ink-soft) leading-relaxed">
                        Esta acción eliminará permanentemente la actividad y los datos asociados a ella, incluyendo las evaluaciones y calificaciones registradas.
                    </p>
                    <p className="text-sm font-bold text-danger mt-4">
                        Esta acción no se puede deshacer.
                    </p>
                </div>
            </CieloModal>

            <CieloModal
                isOpen={estudianteAEliminar !== null}
                onClose={() => setEstudianteAEliminar(null)}
                title={`¿Eliminar definitivamente a ${estudianteAEliminar?.displayName}?`}
                icon={<AlertTriangle className="text-danger w-5 h-5" />}
                maxWidth="md"
                footer={
                    <div className="flex items-center justify-end gap-3 w-full">
                        <button
                            onClick={() => setEstudianteAEliminar(null)}
                            className="px-5 py-2.5 rounded-full text-sm font-bold text-(--ink-soft) hover:bg-slate-100 transition-colors uppercase tracking-widest"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={() => {
                                if (estudianteAEliminar !== null && onDeleteEstudiante) {
                                    onDeleteEstudiante(estudianteAEliminar.id);
                                    setEstudianteAEliminar(null);
                                }
                            }}
                            className="px-5 py-2.5 rounded-full text-sm font-bold text-white bg-danger hover:bg-red-700 transition-colors shadow-md shadow-danger/20 uppercase tracking-widest"
                        >
                            Eliminar definitivamente
                        </button>
                    </div>
                }
            >
                <div className="py-4">
                    <p className="text-sm text-(--ink-soft) leading-relaxed">
                        Esta acción eliminará al estudiante y no podrás recuperar su información.
                    </p>
                    <p className="text-sm text-(--ink-soft) leading-relaxed mt-4">
                        Además, los estudiantes que le siguen en el número de lista cambiarán automáticamente de número para rellenar el espacio disponible.
                    </p>
                </div>
            </CieloModal>

            <MoverEstudianteModal
                show={!!estudianteAMover}
                onClose={() => setEstudianteAMover(null)}
                estudiante={estudianteAMover}
                totalEstudiantes={estudiantesRealesCurso.length}
                onMover={async (id, pos) => {
                    if (onReordenarEstudiante) {
                        return await onReordenarEstudiante(id, pos);
                    }
                    return false;
                }}
            />
        </div>
    );
};

export default React.memo(GradeTable);
