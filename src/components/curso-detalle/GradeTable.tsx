import React from 'react';
import { Plus, EyeOff, Target, ClipboardList, BookOpen } from 'lucide-react';
import PegarListadoModal from './PegarListadoModal';
import StudentObservationModal from './StudentObservationModal';
import { useVirtualizer } from '@tanstack/react-virtual';
import GradeCell from './GradeCell';
import ActivityViewTab from './workspace/ActivityViewTab';
import type { BCKey, Actividad } from '../../types';
import { getCompetenciaDisplay } from '../../types';




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
    onSetFocusedCell: (cell: { estId: number, actId: number } | null) => void;
    onAddActividad: () => void;
    onUpdateActividad: (id: number, act: Partial<Actividad>) => void;
    onUpdateEstudiante: (id: number, est: any) => void;
    onDeleteActividad: (id: number) => void;
    onToggleBc: (actId: number, bc: BCKey) => void;
    onAddEstudiante: (nombre?: string, apellido?: string, numeroLista?: number) => Promise<any> | void;
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
    onSetFocusedCell,
    onAddActividad,
    onUpdateActividad,
    onUpdateEstudiante,
    onDeleteActividad,
    onToggleBc,
    onAddEstudiante,
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
    
    // Estado para modal de observación
    const [obsModalEstudianteId, setObsModalEstudianteId] = React.useState<number | null>(null);


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
    const onUpdateEstudianteRef = React.useRef(onUpdateEstudiante);
    onUpdateEstudianteRef.current = onUpdateEstudiante;
    const onAddEstudianteRef = React.useRef(onAddEstudiante);
    onAddEstudianteRef.current = onAddEstudiante;
    const realesPorNumeroRef = React.useRef(realesPorNumero);
    realesPorNumeroRef.current = realesPorNumero;
    const focusedRowIndexRef = React.useRef<number | null>(null);

    React.useEffect(() => {
        const handleStudentPaste = async (e: ClipboardEvent) => {
            const activeEl = document.activeElement;
            // Ignorar si el usuario está pegando explícitamente en otro campo de texto (ej. nombre de actividad)
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

    // [VISUAL] Número de actividades que evalúan cada competencia. Se usa solo
    // para mostrar el aporte relativo (100 / n) de cada actividad por competencia.
    const bcActivityCounts: Record<BCKey, number> = React.useMemo(() => {
        const counts: Record<BCKey, number> = { BC1: 0, BC2: 0, BC3: 0, BC4: 0 };
        actividades.forEach(act => {
            const selected = bcSel[act.id] ?? new Set(act.bcAsignados);
            (['BC1', 'BC2', 'BC3', 'BC4'] as BCKey[]).forEach(bc => {
                if (selected.has(bc)) counts[bc] += 1;
            });
        });
        return counts;
    }, [actividades, bcSel]);

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
                                                    <button onClick={() => onDeleteActividad(act.id)} title="Desactivar actividad" className="opacity-0 group-hover:opacity-100 w-6 h-6 flex items-center justify-center hover:bg-attention rounded-full transition-all text-[#5F665E] hover:text-white shrink-0"><EyeOff size={12} /></button>
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
                                                    const participa = ((bcSel[act.id] ?? new Set(act.bcAsignados)).has(bc)) && (bcActivityCounts[bc] > 0);
                                                    const aporte = participa ? 100 / bcActivityCounts[bc] : 0;
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
                                                    <div className="flex items-center gap-3 w-full">
                                                        <span className="text-xs font-black text-[#5F665E]/40 w-4 shrink-0">{eIdx + 1}</span>
                                                        <div className="flex flex-col overflow-hidden w-full">
                                                            <input 
                                                                key={`${est.id}-${est.displayName}`}
                                                                data-guide="celda-estudiante"
                                                                defaultValue={est.displayName}
                                                                placeholder={est.isPlaceholder ? 'Posición vacía…' : undefined}
                                                                onFocus={() => { focusedRowIndexRef.current = eIdx; }}
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
                                                        {/* Icono de Observación */}
                                                        {!est.isPlaceholder && (
                                                            <button
                                                                onClick={() => setObsModalEstudianteId(est.id)}
                                                                className={`p-1.5 rounded-md transition-colors shrink-0 ${est.observacion ? 'text-amber-500 hover:bg-amber-50' : 'text-[#5F665E]/30 hover:text-[#5F665E] hover:bg-gray-100'}`}
                                                                title="Observaciones del estudiante"
                                                            >
                                                                <BookOpen size={16} />
                                                            </button>
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
                                                        if (type === 'focus') {
                                                            focusedRowIndexRef.current = eIdx;
                                                            onSetFocusedCell({ estId: est.id, actId: act.id });
                                                        }
                                                        if (type === 'hover' && !isDragging) onSetFocusedCell(null);
                                                    }}
                                                    onSetGrade={(val) => onSetGrade(est.id, act.id, val)}
                                                    getGradeClass={getGradeClass}
                                                    hasLowBc={est.bcValues?.some((v: any) => v.avg !== null && v.avg < 70 && !v.rec) ?? false}
                                                    style={style}
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
                                            return (
                                                <div 
                                                    key={col.id}
                                                    onClick={() => needsRec && onSetRubricTarget({ estId: est.id, bc: bcNum, bcName: v.bc })} 
                                                    className={`border-r border-(--border-soft) transition-all flex items-center justify-center text-sm font-bold box-border ${needsRec ? 'cursor-pointer bg-white hover:bg-(--background)' : 'bg-base-creme opacity-40 cursor-default'}`}
                                                    style={style}
                                                >
                                                    {v?.rec !== null && v?.rec !== undefined ? <span className={`${v.rec >= 70 ? 'text-emerald-600' : 'text-slate-700'} font-bold`}>{v.rec}</span> : null}
                                                </div>
                                            );
                                        }
                                        return null;
                                    })}
                                </div>
                            );
                        })}
                    </div>
                    {estudiantes.length > 0 && onDeleteEstudiante && (
                        <div className="w-full flex justify-start py-3 px-6">
                            <button 
                                onClick={() => {
                                    const last = estudiantes[estudiantes.length - 1];
                                    if ((last.id ?? 0) <= 0) return;
                                    if (window.confirm(`¿Seguro que deseas eliminar al último estudiante (${last.displayName})?`)) {
                                        onDeleteEstudiante(last.id);
                                    }
                                }}
                                className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-50 border border-slate-200 text-slate-500 hover:text-danger hover:border-danger/40 hover:bg-danger/10 transition-all text-xl pb-0.5 shadow-sm"
                                title="Eliminar último estudiante"
                            >
                                ×
                            </button>
                        </div>
                    )}
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
        </div>
    );
};

export default React.memo(GradeTable);
