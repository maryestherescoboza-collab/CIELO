import React from 'react';
import { Plus, Trash2, Target, ClipboardList, BookOpen, UserPlus, AlertTriangle, ArrowUpDown, Edit3 } from 'lucide-react';
import PegarListadoModal from './PegarListadoModal';
import StudentObservationModal from './StudentObservationModal';
import { useVirtualizer } from '@tanstack/react-virtual';
import GradeCell from './GradeCell';
import InsertarEstudianteModal from './InsertarEstudianteModal';
import MoverEstudianteModal from './MoverEstudianteModal';
import ActivityViewTab from './workspace/ActivityViewTab';
import type { BCKey, Actividad, NivelEducativo } from '../../types';
import { getCompetenciasKeys, getCompetenciasLabels } from '../../types';
import { getActivityBcPoints, getProductoFinalMaxPoints, hasProductoFinalCustomPoints } from '../../utils/academic';
import { CieloModal } from '../ui/CieloModal';
import { notifyGuideOperationSuccess } from '../../guides/guideConfirmation';
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
    nivelEducativo?: NivelEducativo;
}

const COMPETENCIAS_OFICIALES: Record<BCKey, string> = {
    BC1: 'Comunicativa',
    BC2: 'Pensamiento Lógico, Creativo y Crítico; Resolución de Problemas',
    BC3: 'Científica y Tecnológica; Ambiental y de la Salud',
    BC4: 'Ética y Ciudadana; Desarrollo Personal y Espiritual',
};

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
    nivelEducativo,
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

    // Estado para menú táctil compacto de estudiante (móvil y tablet)
    const [menuEstudiante, setMenuEstudiante] = React.useState<{
        id: number;
        displayName: string;
        nombre: string;
        apellido: string;
        numeroLista?: number;
        isPlaceholder?: boolean;
    } | null>(null);

    // Estado para edición directa de nombre de estudiante (móvil y tablet)
    const [editingEstudiante, setEditingEstudiante] = React.useState<{
        id: number;
        nombre: string;
        apellido: string;
        numeroLista?: number;
        isPlaceholder?: boolean;
    } | null>(null);

    // Detección de categoría de dispositivo: móvil (< 768px), tablet (768px - 1199px) y desktop (>= 1200px)
    const [device, setDevice] = React.useState<'mobile' | 'tablet' | 'desktop'>(() => {
        if (typeof window === 'undefined') return 'desktop';
        const w = window.innerWidth;
        return w < 768 ? 'mobile' : w < 1200 ? 'tablet' : 'desktop';
    });
    React.useEffect(() => {
        const handleResize = () => {
            const w = window.innerWidth;
            setDevice(w < 768 ? 'mobile' : w < 1200 ? 'tablet' : 'desktop');
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

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
                    if (!targetAct || !targetAct.id || targetAct.id <= 0) continue;
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
        estimateSize: () => device === 'mobile' ? 38 : device === 'tablet' ? 40 : 42,
        overscan: 15,
        paddingEnd: 24,
    });

    const totalHeight = rowVirtualizer.getTotalSize();
    const items = rowVirtualizer.getVirtualItems();

    const COLUMNS = React.useMemo(() => {
        const isMob = device === 'mobile';
        const isTab = device === 'tablet';

        const studentWidth = isMob ? 175 : isTab ? 210 : 225;
        const actWidth = isMob ? 130 : isTab ? 132 : 136;
        const destacaWidth = isMob ? 46 : isTab ? 50 : 54;
        const bcAvgWidth = isMob ? 90 : isTab ? 96 : 175;
        const bcRecWidth = isMob ? 44 : isTab ? 46 : 48;

        const cols: any[] = [];
        cols.push({ id: 'estudiantes', type: 'estudiantes', width: studentWidth });

        actividades.forEach(act => {
            cols.push({ id: `act-${act.id}`, type: 'actividad', width: actWidth, act });
        });

        cols.push({ id: 'destaca', type: 'destaca', width: destacaWidth });

        const activeBcs = getCompetenciasKeys(nivelEducativo);
        activeBcs.forEach((bc, idx) => {
            cols.push({ id: `bc-${bc}-avg`, type: 'bc-avg', width: bcAvgWidth, bc, idx });
            cols.push({ id: `bc-${bc}-rec`, type: 'bc-rec', width: bcRecWidth, bc, idx });
        });

        return cols;
    }, [actividades, device, nivelEducativo]);

    return (
        <div 
            ref={parentRef} 
            className="flex-1 min-h-0 overflow-auto bg-transparent touch-auto overscroll-contain scroll-smooth"
            style={{ scrollPaddingBottom: '160px', WebkitOverflowScrolling: 'touch' }}
        >
            <div className="min-w-max px-0 md:px-1.5 xl:px-2 pt-0 md:pt-1.5 xl:pt-2 pb-36 md:pb-40 xl:pb-44">
                <div className="bg-white rounded-none md:rounded-xl xl:rounded-xl shadow-none md:shadow-xs border-0 md:border md:border-(--border-soft) min-w-max w-max">
                    {/* Header */}
                    <div className="sticky top-0 z-40 bg-[#FAF8F5] xl:bg-(--background) text-[#2E3330] border-b border-[#2E3330]/15 md:border-(--border-soft) flex min-w-max w-max rounded-none md:rounded-t-xl xl:rounded-t-xl">
                        {COLUMNS.map(col => {
                            const style: React.CSSProperties = { width: col.width, minWidth: col.width, maxWidth: col.width, flexShrink: 0 };

                            if (col.type === 'estudiantes') {
                                return (
                                    <div key={col.id} className="sticky left-0 z-50 bg-[#DDE3EA] md:bg-[#FAF8F5] xl:bg-(--background) rounded-tl-xl md:rounded-none px-2 md:px-3 xl:px-3 py-1.5 md:py-2 xl:py-2 text-left border-r border-[#2E3330]/20 xl:border-(--border-soft) flex flex-col items-start justify-between box-border shadow-[2px_0_4px_rgba(0,0,0,0.03)]" style={style}>
                                        <div className="flex items-center justify-between w-full">
                                            <span className="text-xs md:text-sm font-black uppercase tracking-wider italic text-[#2E3330]">Estudiantes</span>
                                            <button
                                                data-guide="btn-agregar-estudiante-compact"
                                                onClick={() => onAddEstudiante()}
                                                className="xl:hidden w-6 h-6 rounded-full bg-white border border-[#2E3330]/20 flex items-center justify-center text-[#2E3330] hover:bg-slate-50 transition-colors shadow-2xs"
                                                title="Agregar estudiante"
                                            >
                                                <Plus size={13} strokeWidth={2.8} />
                                            </button>
                                        </div>
                                        {/* Controles verticales en escritorio: uno debajo del otro sin ensanchar la tabla */}
                                        <div className="hidden xl:flex flex-col gap-1 w-full pt-1.5">
                                            <button
                                                data-guide="btn-agregar-estudiante"
                                                onClick={() => onAddEstudiante()}
                                                className="flex items-center gap-1.5 w-full rounded-md px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-[#5F665E] hover:text-[#2E3330] hover:bg-base-creme border border-transparent hover:border-(--border-soft) transition-all cursor-pointer"
                                                title="Agregar estudiante al final"
                                            >
                                                <Plus size={11} strokeWidth={2.6} className="text-primary shrink-0" />
                                                <span className="truncate">Agregar estudiante</span>
                                            </button>
                                            <button
                                                onClick={() => setShowInsertar(true)}
                                                className="flex items-center gap-1.5 w-full rounded-md px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-[#5F665E] hover:text-[#2E3330] hover:bg-base-creme border border-transparent hover:border-(--border-soft) transition-all cursor-pointer"
                                                title="Agregar en posición específica"
                                            >
                                                <UserPlus size={11} strokeWidth={2.6} className="text-[#5F665E] shrink-0" />
                                                <span className="truncate">Agregar en posición</span>
                                            </button>
                                            <button
                                                data-guide="btn-pegar-listado"
                                                onClick={() => setShowPegarListado(true)}
                                                className="flex items-center gap-1.5 w-full rounded-md px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-[#5F665E] hover:text-[#2E3330] hover:bg-base-creme border border-transparent hover:border-(--border-soft) transition-all cursor-pointer"
                                                title="Pegar listado de estudiantes"
                                            >
                                                <ClipboardList size={11} strokeWidth={2.6} className="text-[#5F665E] shrink-0" />
                                                <span className="truncate">Pegar listado</span>
                                            </button>
                                        </div>
                                    </div>
                                );
                            }
                            if (col.type === 'actividad') {
                                const act = col.act;
                                const isProductoFinal = !!act.isProductoFinal;

                                return (
                                    <div key={col.id} className="px-1.5 md:px-2 py-1.5 md:py-2 xl:py-2.5 border-r border-[#2E3330]/15 xl:border-(--border-soft) relative group flex flex-col items-center justify-between box-border bg-[#FAF8F5]/80 xl:bg-transparent" style={style}>
                                        {/* Vista Móvil y Tablet: botón exclusivamente «VER» y controles compactos sin texto de indicador */}
                                        <div className="flex xl:hidden flex-col items-center w-full gap-1.5">
                                            {onOpenActivityView && (
                                                <ActivityViewTab
                                                    activityId={act.id}
                                                    isOpen={openActivityId === act.id}
                                                    onOpen={() => onOpenActivityView(openActivityId === act.id ? null : act.id)}
                                                />
                                            )}

                                            <div className="flex items-center gap-1 w-full justify-center px-1">
                                                {!isProductoFinal && (
                                                    <button
                                                        onClick={() => setActividadAEliminar(act.id)}
                                                        title="Eliminar actividad"
                                                        className="opacity-0 group-hover:opacity-100 w-4 h-4 md:w-5 md:h-5 flex items-center justify-center hover:bg-danger rounded-full transition-all text-[#5F665E] hover:text-white shrink-0"
                                                    >
                                                        <Trash2 size={11} />
                                                    </button>
                                                )}
                                                <input
                                                    data-guide="celda-actividad"
                                                    defaultValue={act.nombre.replace(/^Actividad\s+/i, 'Actividad ')}
                                                    onFocus={(e) => { e.target.value = act.nombre; }}
                                                    onBlur={(e) => {
                                                        const val = e.target.value.trim();
                                                        if (val && val !== act.nombre) {
                                                            onUpdateActividad(act.id, { nombre: val });
                                                        } else {
                                                            e.target.value = act.nombre.replace(/^Actividad\s+/i, 'Actividad ');
                                                        }
                                                    }}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') e.currentTarget.blur();
                                                        if (e.key === 'Escape') {
                                                            e.currentTarget.value = act.nombre.replace(/^Actividad\s+/i, 'Actividad ');
                                                            e.currentTarget.blur();
                                                        }
                                                    }}
                                                    className="text-[11px] md:text-xs font-black uppercase tracking-tight text-[#2E3330] bg-transparent outline-none text-center w-full truncate focus:border-b focus:border-primary/40"
                                                    placeholder="Actividad"
                                                />
                                            </div>

                                            {/* Botones circulares de competencias con iconos oficiales CIELO */}
                                            <div className="flex items-center gap-0.5 md:gap-1 bg-base-creme p-0.5 md:p-1 rounded-full border border-(--border-soft)">
                                                {getCompetenciasKeys(nivelEducativo).map(bc => {
                                                    const isSel = (bcSel[act.id] ?? new Set(act.bcAsignados)).has(bc);
                                                    return (
                                                        <button
                                                            key={bc}
                                                            type="button"
                                                            data-guide="bloque-competencia"
                                                            onClick={() => onToggleBc(act.id, bc)}
                                                            title={`${bc}: ${isSel ? 'Asignada (clic para alternar)' : 'No asignada (clic para alternar)'}`}
                                                            className={`w-5.5 h-5.5 md:w-6 md:h-6 rounded-full flex items-center justify-center transition-all cursor-pointer active:scale-90 ${
                                                                isSel ? BC_COLOR_THEMES[bc].active : 'text-[#5F665E]/40 hover:text-[#5F665E]'
                                                            }`}
                                                        >
                                                            {BC_ICONS[bc]}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>

                                        {/* Vista Escritorio (xl:): Compacta y equilibrada */}
                                        <div className="hidden xl:flex flex-col items-center justify-between w-full h-full gap-1.5">
                                            {onOpenActivityView && (
                                                <ActivityViewTab
                                                    activityId={act.id}
                                                    isOpen={openActivityId === act.id}
                                                    onOpen={() => onOpenActivityView(openActivityId === act.id ? null : act.id)}
                                                />
                                            )}

                                            <div className="flex flex-col items-center gap-1.5 w-full">
                                                <div className="flex items-center gap-1 w-full justify-center px-1">
                                                    {!isProductoFinal && (
                                                        <button
                                                            onClick={() => setActividadAEliminar(act.id)}
                                                            title="Eliminar actividad"
                                                            className="opacity-0 group-hover:opacity-100 w-4 h-4 flex items-center justify-center hover:bg-danger rounded-full transition-all text-[#5F665E] hover:text-white shrink-0"
                                                        >
                                                            <Trash2 size={11} />
                                                        </button>
                                                    )}
                                                    <input
                                                        data-guide="celda-actividad"
                                                        defaultValue={act.nombre.replace(/^Actividad\s+/i, 'ACT. ')}
                                                        onFocus={(e) => { e.target.value = act.nombre; }}
                                                        onBlur={(e) => {
                                                            const val = e.target.value.trim();
                                                            if (val && val !== act.nombre) {
                                                                onUpdateActividad(act.id, { nombre: val });
                                                            } else {
                                                                e.target.value = act.nombre.replace(/^Actividad\s+/i, 'ACT. ');
                                                            }
                                                        }}
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter') e.currentTarget.blur();
                                                            if (e.key === 'Escape') {
                                                                e.currentTarget.value = act.nombre.replace(/^Actividad\s+/i, 'ACT. ');
                                                                e.currentTarget.blur();
                                                            }
                                                        }}
                                                        className="text-xs font-black uppercase tracking-wider text-[#5F665E] hover:text-[#2E3330] focus:text-[#2E3330] bg-transparent outline-none text-center w-full max-w-28 truncate focus:border-b focus:border-primary/30 transition-all placeholder:text-[#5F665E]/40"
                                                        placeholder="NOMBRE"
                                                    />
                                                </div>

                                                {/* Iconos de competencias con funcionalidad completa en todas las resoluciones */}
                                                <div className="flex items-center gap-0.5 bg-base-creme p-0.5 rounded-full border border-(--border-soft)">
                                                    {getCompetenciasKeys(nivelEducativo).map(bc => {
                                                        const isSel = (bcSel[act.id] ?? new Set(act.bcAsignados)).has(bc);
                                                        return (
                                                            <button
                                                                key={bc}
                                                                data-guide="bloque-competencia"
                                                                onClick={() => onToggleBc(act.id, bc)}
                                                                title={`${COMPETENCIAS_OFICIALES[bc]}: ${isSel ? 'Asignada (clic para alternar)' : 'No asignada (clic para alternar)'}`}
                                                                className={`w-6 h-6 rounded-full flex items-center justify-center transition-all ${isSel ? BC_COLOR_THEMES[bc].active : 'text-[#5F665E]/40 hover:text-[#5F665E]'}`}
                                                            >
                                                                {BC_ICONS[bc]}
                                                            </button>
                                                        );
                                                    })}
                                                </div>

                                                {/* Puntos de competencias calculados */}
                                                <div className="flex justify-center gap-0.5">
                                                    {getCompetenciasKeys(nivelEducativo).map(bc => {
                                                        const participa = (bcSel[act.id] ?? new Set(act.bcAsignados)).has(bc);
                                                        const aporte = getActivityBcPoints({ actividad: act, bc, actividades, bcSel });
                                                        const txt = String(Math.round(aporte));
                                                        return (
                                                            <span key={bc} className="w-6 flex items-baseline justify-center gap-0.5 leading-none">
                                                                <span className={`text-[10px] font-black ${participa ? 'text-[#2E3330]' : 'text-[#5F665E]/35'}`}>{txt}</span>
                                                                <span className="text-[6.5px] font-semibold text-[#5F665E]/45">pts</span>
                                                            </span>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            }
                            if (col.type === 'destaca') {
                                return (
                                    <div key={col.id} className="px-1 md:px-2 py-1.5 md:py-2.5 border-r border-[#2E3330]/15 md:border-(--border-soft) bg-warning/10 flex flex-col items-center justify-center box-border" style={style}>
                                        <Target size={device === 'mobile' ? 14 : 16} className="text-danger" />
                                        <span className="text-[8.5px] md:text-[9.5px] font-black uppercase tracking-widest text-danger/70 mt-0.5">Destaca</span>
                                    </div>
                                );
                            }
                            if (col.type === 'bc-avg') {
                                const bcKey = col.bc as BCKey;
                                const labels = getCompetenciasLabels(nivelEducativo);
                                const nombreOficial = (labels as Record<string, string>)[bcKey] || COMPETENCIAS_OFICIALES[bcKey] || col.bc;
                                return (
                                    <div
                                        key={col.id}
                                        title={nombreOficial}
                                        className={`px-1 py-1.5 md:py-2 border-r border-[#2E3330]/15 md:border-(--border-soft) flex flex-col items-center justify-between box-border relative ${col.idx === 0 ? 'border-l-2 border-l-[rgba(46,51,48,0.08)]' : ''}`}
                                        style={style}
                                    >
                                        <div className={`w-5.5 h-5.5 rounded-full flex items-center justify-center shrink-0 ${BC_COLOR_THEMES[bcKey]?.active || ''}`}>
                                            {BC_ICONS[bcKey]}
                                        </div>

                                        {/* Móvil y Tablet (xl:hidden) */}
                                        <div className="flex xl:hidden flex-col items-center text-center w-full">
                                            <span className="text-[11px] font-black uppercase text-[#2E3330] tracking-wider">{col.bc}</span>
                                            <span className="text-[8.5px] font-bold text-[#5F665E] uppercase truncate w-full px-0.5">
                                                PROM.
                                            </span>
                                        </div>

                                        {/* Escritorio (hidden xl:flex): Nombres oficiales completos */}
                                        <div className="hidden xl:flex flex-col items-center text-center w-full px-1">
                                            <span className="text-[10px] xl:text-[10.5px] font-bold text-[#2E3330] leading-tight text-center line-clamp-3">
                                                {nombreOficial}
                                            </span>
                                            <span className="text-[8px] font-bold text-[#5F665E]/70 uppercase tracking-wider mt-0.5">
                                                PROMEDIO
                                            </span>
                                        </div>
                                    </div>
                                );
                            }
                            if (col.type === 'bc-rec') {
                                return (
                                    <div key={col.id} className="px-1 md:px-2 py-1.5 md:py-2.5 border-r border-[#2E3330]/15 md:border-(--border-soft) bg-primary/5 flex flex-col items-center justify-center box-border" style={style}>
                                        <span className="text-[9.5px] md:text-[10px] font-black uppercase tracking-widest text-primary/70">Rec.</span>
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
                                                <div key={col.id} className="sticky left-0 z-20 bg-inherit px-2 md:px-3 xl:px-2.5 py-0.5 md:py-1 xl:py-0.5 border-r border-[#2E3330]/15 md:border-(--border-soft) font-semibold text-[#2E3330] flex items-center box-border shadow-[2px_0_4px_rgba(0,0,0,0.03)]" style={style}>
                                                    {/* VISTA MÓVIL Y TABLET (xl:hidden) - Prioridad absoluta al nombre */}
                                                    <div className="flex xl:hidden items-center gap-1.5 w-full min-w-0">
                                                        <span className="text-[10px] md:text-xs font-black text-[#5F665E]/40 w-4 shrink-0 text-left">
                                                            {eIdx + 1}
                                                        </span>

                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                const parts = (est.displayName || '').split(' ');
                                                                const nombre = est.nombre || parts[0] || '';
                                                                const apellido = est.apellido || parts.slice(1).join(' ') || '';
                                                                if (est.isPlaceholder) {
                                                                    setEditingEstudiante({
                                                                        id: 0,
                                                                        nombre: '',
                                                                        apellido: '',
                                                                        numeroLista: est.numeroLista,
                                                                        isPlaceholder: true,
                                                                    });
                                                                } else {
                                                                    setMenuEstudiante({
                                                                        id: est.id,
                                                                        displayName: est.displayName,
                                                                        nombre,
                                                                        apellido,
                                                                        numeroLista: est.numeroLista || (eIdx + 1),
                                                                        isPlaceholder: false,
                                                                    });
                                                                }
                                                            }}
                                                            className="flex-1 min-w-0 text-left py-0.5 px-1 rounded-md active:bg-black/5 hover:bg-black/5 transition-colors cursor-pointer flex items-center justify-between gap-1"
                                                            title="Toca para ver opciones"
                                                        >
                                                            <span className={`text-[11px] md:text-xs font-black uppercase tracking-tight truncate ${est.isPlaceholder ? 'text-[#5F665E]/40 italic' : 'text-[#2E3330]'
                                                                }`}>
                                                                {est.isPlaceholder ? `N.º ${est.numeroLista} · Vacío` : est.displayName}
                                                            </span>
                                                            {est.observacion && (
                                                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" title="Tiene observación" />
                                                            )}
                                                        </button>
                                                    </div>

                                                    {/* VISTA ESCRITORIO (hidden xl:flex) - Compacta y de alta densidad */}
                                                    <div className="hidden xl:flex items-center gap-1.5 w-full">
                                                        {!est.isPlaceholder && onDeleteEstudiante && (
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setEstudianteAEliminar({ id: est.id, displayName: est.displayName });
                                                                }}
                                                                className="w-4.5 h-4.5 flex items-center justify-center rounded-full bg-slate-50 border border-slate-200 text-slate-400 hover:text-danger hover:border-danger/40 hover:bg-danger/10 transition-all text-xs pb-0.5 shadow-2xs shrink-0 opacity-0 group-hover:opacity-100 focus:opacity-100"
                                                                title="Eliminar estudiante"
                                                            >
                                                                ×
                                                            </button>
                                                        )}
                                                        <span className={`text-[11px] font-black text-[#5F665E]/40 w-4 shrink-0 text-right ${!(!est.isPlaceholder && onDeleteEstudiante) ? 'ml-6' : ''}`}>{eIdx + 1}</span>
                                                        <div className="flex flex-col overflow-hidden w-full leading-tight">
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
                                                                        notifyGuideOperationSuccess('estudiante_guardar', '¡Muy bien! Ya tienes estudiantes para trabajar.');
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
                                                                className="text-xs font-black uppercase tracking-tight truncate bg-transparent outline-none w-full hover:bg-(--background) focus:bg-white focus:ring-1 focus:ring-[rgba(46,51,48,0.15)] rounded px-1 transition-all placeholder:text-[#5F665E]/40 placeholder:font-semibold"
                                                            />
                                                            {est.isPlaceholder ? (
                                                                <span className="text-[9.5px] font-bold text-[#5F665E]/50 uppercase tracking-widest truncate px-1">N.º {est.numeroLista} · libre</span>
                                                            ) : (
                                                                <span className="text-[9.5px] font-bold text-[#5F665E]/60 uppercase tracking-widest truncate px-1">ID: {est.id.toString().slice(-6)}</span>
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
                                                                        className="p-0.5 rounded-md text-[#5F665E]/30 hover:text-[#689C63] hover:bg-[#689C63]/10 transition-colors shrink-0"
                                                                        title="Mover de posición en la lista"
                                                                    >
                                                                        <ArrowUpDown size={13} />
                                                                    </button>
                                                                )}
                                                                <button
                                                                    onClick={() => setObsModalEstudianteId(est.id)}
                                                                    className={`p-0.5 rounded-md transition-colors shrink-0 ${est.observacion ? 'text-amber-500 hover:bg-amber-50' : 'text-[#5F665E]/30 hover:text-[#5F665E] hover:bg-gray-100'}`}
                                                                    title="Observaciones del estudiante"
                                                                >
                                                                    <BookOpen size={14} />
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
                                            const isActValid = Boolean(act && typeof act.id === 'number' && act.id > 0);
                                            if (!isActValid) {
                                                // Actividad en proceso de creación o sin ID confirmado por Supabase
                                                return (
                                                    <div key={col.id} className="px-3 py-3 border-r border-(--border-soft) flex items-center justify-center box-border bg-base-creme/40" style={style}>
                                                        <span className="text-xs font-bold text-[#5F665E]/30" title="Actividad en confirmación con el servidor...">—</span>
                                                    </div>
                                                );
                                            }
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
                                                <div key={col.id} className="px-0.5 md:px-1.5 py-0.5 md:py-1 border-r border-[#2E3330]/15 md:border-(--border-soft) flex items-center justify-center box-border bg-base-creme" style={style}>
                                                    {est.destaca && (
                                                        <div className={`w-5 h-5 md:w-6 md:h-6 xl:w-6.5 xl:h-6.5 rounded-md md:rounded-lg flex items-center justify-center text-white shadow-xs transition-transform hover:scale-110 ${BC_COLOR_THEMES[est.destaca as BCKey]?.active}`}>
                                                            {BC_ICONS[est.destaca as BCKey]}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        }
                                        if (col.type === 'bc-avg') {
                                            const v = est.bcValues?.[col.idx];
                                            return (
                                                <div key={col.id} className={`px-0.5 md:px-1 py-0.5 md:py-1 border-r border-[#2E3330]/15 md:border-(--border-soft) flex items-center justify-center box-border ${col.idx === 0 ? 'border-l-2 border-l-[rgba(46,51,48,0.08)]' : ''}`} style={style}>
                                                    <span className={`text-xs md:text-sm font-bold md:font-black px-1 md:px-2 py-0.5 rounded ${v?.avg !== null ? getGradeClass(v.avg) : ''}`}>{v?.avg !== null && v?.avg !== undefined ? Math.round(v.avg) : '-'}</span>
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
                                                    className={`border-r border-[#2E3330]/15 md:border-(--border-soft) transition-all flex items-center justify-center text-xs md:text-sm font-bold box-border ${needsRec ? 'cursor-pointer bg-white hover:bg-(--background)' : 'bg-base-creme opacity-40 cursor-default'}`}
                                                    style={style}
                                                    title={needsRec && !hasEvaluated ? 'Pendiente de evaluación de recuperación' : undefined}
                                                >
                                                    {hasEvaluated ? (
                                                        <span className={`${v.rec >= 70 ? 'text-emerald-600' : 'text-slate-700'} font-bold`}>{v.rec}</span>
                                                    ) : needsRec ? (
                                                        <img
                                                            src="https://img.icons8.com/stickers/100/error.png"
                                                            alt="error"
                                                            className="w-4 h-4 md:w-5 md:h-5 object-contain select-none transition-transform hover:scale-110"
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

                    {/* Barra de cierre y pie de tabla para garantizar visibilidad del último estudiante */}
                    <div className="sticky left-0 flex items-center justify-between px-3 md:px-4 py-2 bg-[#FAF8F5] xl:bg-(--background) border-t border-[#2E3330]/10 text-xs font-semibold text-[#5F665E] rounded-b-none md:rounded-b-xl xl:rounded-b-xl z-20 shadow-2xs">
                        <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                            <span className="font-bold text-[#2E3330]">
                                Total estudiantes: {estudiantes.filter(e => !e.isPlaceholder).length}
                            </span>
                            <span className="text-[11px] text-[#5F665E]/70 hidden sm:inline">
                                · Lista completa visible
                            </span>
                        </div>
                        {estudiantes.length > 0 && (
                            <span className="text-[10px] font-bold uppercase tracking-wider text-[#5F665E]/60">
                                Fin del listado
                            </span>
                        )}
                    </div>
                </div>

                {/* Espaciador físico de holgura para vista móvil y tablet: garantiza visibilidad total del último registro y evita solapamientos */}
                <div className="h-32 sm:h-36 md:h-40 xl:h-28 w-full shrink-0 pointer-events-none" aria-hidden="true" />
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

            {/* Menú compacto al tocar el nombre del estudiante (móvil y tablet) */}
            <CieloModal
                isOpen={menuEstudiante !== null}
                onClose={() => setMenuEstudiante(null)}
                title={menuEstudiante?.displayName || 'Opciones del estudiante'}
                subtitle={menuEstudiante?.numeroLista ? `Estudiante N.º ${menuEstudiante.numeroLista}` : undefined}
                maxWidth="sm"
            >
                <div className="flex flex-col gap-2.5 py-2">
                    <button
                        type="button"
                        onClick={() => {
                            if (menuEstudiante) {
                                const target = menuEstudiante;
                                setMenuEstudiante(null);
                                setEditingEstudiante({
                                    id: target.id,
                                    nombre: target.nombre,
                                    apellido: target.apellido,
                                    numeroLista: target.numeroLista,
                                    isPlaceholder: target.isPlaceholder,
                                });
                            }
                        }}
                        className="flex items-center gap-3 w-full p-3 rounded-xl hover:bg-slate-50 active:bg-slate-100 border border-(--border-soft) text-left transition-colors cursor-pointer"
                    >
                        <div className="w-9 h-9 rounded-full bg-[#689C63]/10 text-[#689C63] flex items-center justify-center shrink-0">
                            <Edit3 size={18} />
                        </div>
                        <div>
                            <p className="text-sm font-black text-[#2E3330]">Editar nombre</p>
                            <p className="text-xs text-[#5F665E]">Modificar nombre y apellido</p>
                        </div>
                    </button>

                    <button
                        type="button"
                        onClick={() => {
                            if (menuEstudiante) {
                                const targetId = menuEstudiante.id;
                                setMenuEstudiante(null);
                                setObsModalEstudianteId(targetId);
                            }
                        }}
                        className="flex items-center gap-3 w-full p-3 rounded-xl hover:bg-slate-50 active:bg-slate-100 border border-(--border-soft) text-left transition-colors cursor-pointer"
                    >
                        <div className="w-9 h-9 rounded-full bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
                            <BookOpen size={18} />
                        </div>
                        <div>
                            <p className="text-sm font-black text-[#2E3330]">Escribir o editar observación</p>
                            <p className="text-xs text-[#5F665E]">Registrar notas o comentarios pedagógicos</p>
                        </div>
                    </button>
                </div>
            </CieloModal>

            {/* Modal para editar nombre de estudiante en móvil/tablet */}
            <CieloModal
                isOpen={editingEstudiante !== null}
                onClose={() => setEditingEstudiante(null)}
                title={editingEstudiante?.isPlaceholder ? 'Asignar estudiante' : 'Editar nombre'}
                subtitle={editingEstudiante?.numeroLista ? `Posición N.º ${editingEstudiante.numeroLista}` : undefined}
                maxWidth="sm"
                footer={
                    <div className="flex items-center justify-end gap-2 w-full">
                        <button
                            type="button"
                            onClick={() => setEditingEstudiante(null)}
                            className="px-4 py-2 rounded-full text-xs font-bold text-[#5F665E] hover:bg-slate-100 transition-colors uppercase tracking-wider"
                        >
                            Cancelar
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                if (!editingEstudiante) return;
                                const nom = editingEstudiante.nombre.trim();
                                const ape = editingEstudiante.apellido.trim();
                                if (!nom && !ape) return;

                                if (editingEstudiante.isPlaceholder && typeof editingEstudiante.numeroLista === 'number') {
                                    const real = realesPorNumeroRef.current.get(editingEstudiante.numeroLista);
                                    if (real) {
                                        onUpdateEstudianteRef.current(real.id, { nombre: nom, apellido: ape });
                                    } else {
                                        onAddEstudianteRef.current(nom, ape, editingEstudiante.numeroLista);
                                    }
                                } else if (!editingEstudiante.isPlaceholder) {
                                    onUpdateEstudianteRef.current(editingEstudiante.id, { nombre: nom, apellido: ape });
                                }
                                notifyGuideOperationSuccess('estudiante_guardar', '¡Muy bien! Se guardó el estudiante.');
                                setEditingEstudiante(null);
                            }}
                            className="px-5 py-2 rounded-full text-xs font-bold text-white bg-[#689C63] hover:bg-[#588554] transition-colors shadow-xs uppercase tracking-wider cursor-pointer"
                        >
                            Guardar nombre
                        </button>
                    </div>
                }
            >
                <div className="flex flex-col gap-3 py-2">
                    <div>
                        <label className="block text-xs font-bold text-[#5F665E] uppercase tracking-wider mb-1">Nombre</label>
                        <input
                            type="text"
                            autoFocus
                            value={editingEstudiante?.nombre || ''}
                            onChange={(e) => setEditingEstudiante(prev => prev ? { ...prev, nombre: e.target.value } : null)}
                            placeholder="Nombre del estudiante"
                            className="w-full px-3 py-2 rounded-xl border border-(--border-soft) bg-white text-sm font-semibold text-[#2E3330] focus:ring-2 focus:ring-[#689C63]/30 focus:outline-none"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-[#5F665E] uppercase tracking-wider mb-1">Apellido</label>
                        <input
                            type="text"
                            value={editingEstudiante?.apellido || ''}
                            onChange={(e) => setEditingEstudiante(prev => prev ? { ...prev, apellido: e.target.value } : null)}
                            placeholder="Apellido del estudiante"
                            className="w-full px-3 py-2 rounded-xl border border-(--border-soft) bg-white text-sm font-semibold text-[#2E3330] focus:ring-2 focus:ring-[#689C63]/30 focus:outline-none"
                        />
                    </div>
                </div>
            </CieloModal>

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
