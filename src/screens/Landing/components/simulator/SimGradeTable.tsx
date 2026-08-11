import React from 'react';
import { Plus, Trash2, Target } from 'lucide-react';
import GradeCell from './SimGradeCell';
import type { BCKey, Actividad } from '../../../../types';
import { getCompetenciaDisplay } from '../../../../types';



interface GradeTableProps {
    actividades: Actividad[];
    estudiantes: any[];
    bcSel: Record<number, Set<BCKey>>;
    isDragging: boolean;
    isPointMode: boolean;
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
    onAddEstudiante: () => void;
    onSetRubricTarget: (target: any) => void;
    getGradeClass: (score: number | null) => string;
    BC_COLOR_THEMES: Record<BCKey, { bg: string, text: string, active: string }>;
    BC_ICONS: Record<BCKey, React.ReactNode>;
}

const GradeTable: React.FC<GradeTableProps> = ({
    actividades,
    estudiantes,
    bcSel,
    isDragging,
    isPointMode,
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
    onSetRubricTarget,
    getGradeClass,
    BC_COLOR_THEMES,
    BC_ICONS
}) => {
    void onAddActividad;
    const gridTemplateColumns = `240px repeat(${actividades.length}, minmax(90px, 1fr)) 40px repeat(4, minmax(120px, 1fr) 40px)`;

    const COLUMNS = React.useMemo(() => {
        const cols: any[] = [];
        cols.push({ id: 'estudiantes', type: 'estudiantes', width: 220 });
        
        actividades.forEach(act => {
            cols.push({ id: `act-${act.id}`, type: 'actividad', width: 70, act });
        });
        
        cols.push({ id: 'destaca', type: 'destaca', width: 30 });
        
        (['BC1', 'BC2', 'BC3', 'BC4'] as const).forEach((bc, idx) => {
            cols.push({ id: `bc-${bc}-avg`, type: 'bc-avg', width: 85, bc, idx });
            cols.push({ id: `bc-${bc}-rec`, type: 'bc-rec', width: 30, bc, idx });
        });
        
        return cols;
    }, [actividades]);

    return (
        <div className="flex-1 w-full bg-transparent">
            <div className="p-6">
                <div className="bg-white rounded-[2rem] shadow-sm border border-[rgba(46,51,48,0.08)] overflow-hidden w-full">
                    {/* Header */}
                    <div className="sticky top-0 z-40 bg-[#F8F3ED] text-[#2E3330] border-b border-[rgba(46,51,48,0.08)] grid w-full" style={{ gridTemplateColumns }}>
                        {COLUMNS.map(col => {
                            const style: React.CSSProperties = {};
                            
                            if (col.type === 'estudiantes') {
                                return (
                                    <div key={col.id} className="sticky left-0 z-50 bg-[#F8F3ED] px-2 py-2 text-left border-r border-[rgba(46,51,48,0.08)] flex items-center justify-between box-border" style={style}>
                                        <span className="text-xs font-black uppercase tracking-[0.2em] italic text-[#2E3330]">Estudiantes</span>
                                        <button onClick={onAddEstudiante} className="w-4 h-4 flex items-center justify-center hover:bg-[#FDFBF7] rounded-full transition-all text-[#5F665E] hover:text-[#2E3330] border border-transparent hover:border-[rgba(46,51,48,0.08)]"><Plus size={14} /></button>
                                    </div>
                                );
                            }
                            if (col.type === 'actividad') {
                                const act = col.act;
                                return (
                                    <div key={col.id} className="px-1 py-2 border-r border-[rgba(46,51,48,0.08)] relative group flex flex-col items-center justify-center box-border" style={style}>
                                        <div className="flex flex-col items-center gap-1 w-full">
                                            <div className="flex items-center gap-1 w-full justify-center px-1">
                                                <button onClick={() => onDeleteActividad(act.id)} className="opacity-0 group-hover:opacity-100 w-4 h-4 flex items-center justify-center hover:bg-attention rounded-full transition-all text-[#5F665E] hover:text-white shrink-0"><Trash2 size={10} /></button>
                                                <input 
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
                                                    className="text-xs font-black uppercase tracking-wider text-[#5F665E] hover:text-[#2E3330] focus:text-[#2E3330] bg-transparent outline-none text-center w-full max-w-30 truncate focus:border-b focus:border-primary/30 transition-all placeholder:text-[#5F665E]/40"
                                                    placeholder="NOMBRE"
                                                />
                                            </div>
                                            <div className="flex items-center gap-1 bg-[#FDFBF7] p-1 rounded-full border border-[rgba(46,51,48,0.08)]">
                                                {(['BC1', 'BC2', 'BC3', 'BC4'] as BCKey[]).map(bc => {
                                                    const isSel = (bcSel[act.id] ?? new Set(act.bcAsignados)).has(bc);
                                                    return (
                                                        <button 
                                                            key={bc}
                                                            onClick={() => onToggleBc(act.id, bc)}
                                                            className={`w-5 h-5 rounded-full flex items-center justify-center transition-all ${isSel ? BC_COLOR_THEMES[bc].active : 'text-[#5F665E]/40 hover:text-[#5F665E]'}`}
                                                        >
                                                            {BC_ICONS[bc]}
                                                        </button>
                                                    );
                                                 })}
                                            </div>
                                        </div>
                                    </div>
                                );
                            }
                            if (col.type === 'destaca') {
                                return (
                                    <div key={col.id} className="px-1 py-2 border-r border-[rgba(46,51,48,0.08)] bg-warning/10 flex flex-col items-center justify-center box-border" style={style}>
                                        <Target size={14} className="text-danger" />
                                        <span className="text-xs font-black uppercase tracking-widest text-danger/70 mt-2">Destaca</span>
                                    </div>
                                );
                            }
                            if (col.type === 'bc-avg') {
                                const fullName = getCompetenciaDisplay(col.bc);
                                return (
                                     <div key={col.id} className={`px-1 pb-2 pt-4 border-r border-[rgba(46,51,48,0.08)] flex flex-col items-center justify-end box-border relative ${col.idx === 0 ? 'border-l-2 border-l-[rgba(46,51,48,0.08)]' : ''}`} style={style}>
                                         <span className="text-[8.5px] font-bold uppercase tracking-wider text-[#5F665E] text-center leading-[1.1] whitespace-normal w-full">{fullName}</span>
                                     </div>
                                );
                            }
                            if (col.type === 'bc-rec') {
                                return (
                                    <div key={col.id} className="px-1 py-4 border-r border-[rgba(46,51,48,0.08)] bg-primary/5 flex flex-col items-center justify-center box-border" style={style}>
                                        <span className="text-xs font-black uppercase tracking-widest text-primary/70">Rec.</span>
                                    </div>
                                );
                            }
                            return null;
                        })}
                    </div>

                    {/* Body */}
                    <div className="flex flex-col w-full">
                        {estudiantes.map((est, eIdx) => {
                            return (
                                <div 
                                    key={est.id} 
                                    className={`group hover:bg-[#F8F3ED] transition-colors grid w-full border-b border-[rgba(46,51,48,0.04)] ${eIdx % 2 === 0 ? 'bg-white' : 'bg-[#FDFBF7]'}`}
                                    style={{ gridTemplateColumns }}
                                >
                                    {COLUMNS.map(col => {
                                        const style: React.CSSProperties = {};
                                        
                                        if (col.type === 'estudiantes') {
                                            return (
                                                <div key={col.id} className="sticky left-0 z-20 bg-inherit px-3 py-2 border-r border-[rgba(46,51,48,0.08)] font-semibold text-[#2E3330] flex items-center box-border" style={style}>
                                                    <div className="flex items-center gap-1 w-full">
                                                        <span className="text-xs font-black text-[#5F665E]/40 w-4 shrink-0">{est.numeroLista || eIdx + 1}</span>
                                                        <div className="flex flex-col overflow-hidden w-full">
                                                            <input 
                                                                defaultValue={est.displayName}
                                                                onBlur={(e) => {
                                                                    const val = e.target.value.trim();
                                                                    if (val && val !== est.displayName) {
                                                                        const parts = val.split(' ');
                                                                        const nombre = parts[0] || '';
                                                                        const apellido = parts.slice(1).join(' ') || '';
                                                                        onUpdateEstudiante(est.id, { nombre, apellido });
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
                                                                className="text-xs font-black uppercase tracking-tight truncate bg-transparent outline-none w-full hover:bg-[#F8F3ED] focus:bg-white focus:ring-1 focus:ring-[rgba(46,51,48,0.15)] rounded px-1 transition-all"
                                                            />
                                                            <span className="text-xs font-bold text-[#5F665E] uppercase tracking-widest truncate px-1">ID: {est.id.toString().slice(-6)}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        }
                                        if (col.type === 'actividad') {
                                            const act = col.act;
                                            return (
                                                <GradeCell 
                                                    key={col.id}
                                                    estId={est.id}
                                                    actId={act.id}
                                                    score={est.calificaciones?.[act.id] ?? null}
                                                    isRecoveryAct={act.nombre === 'Recuperación'}
                                                    isPointMode={isPointMode}
                                                    isDragging={isDragging}
                                                    isFocused={focusedCell?.estId === est.id && focusedCell?.actId === act.id}
                                                    activePaintColor={activePaintColor}
                                                    animations={gradeAnimations.filter(a => a.estId === est.id && a.actId === act.id)}
                                                    onInteraction={(type) => {
                                                        if (type === 'focus') onSetFocusedCell({ estId: est.id, actId: act.id });
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
                                                <div key={col.id} className="px-1 py-1 border-r border-[rgba(46,51,48,0.08)] flex items-center justify-center box-border bg-[#FDFBF7]" style={style}>
                                                    {est.destaca && (
                                                        <div className={`w-4 h-4 rounded-lg flex items-center justify-center text-white shadow-sm transition-transform hover:scale-110 ${BC_COLOR_THEMES[est.destaca as BCKey]?.active}`}>
                                                            {BC_ICONS[est.destaca as BCKey]}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        }
                                        if (col.type === 'bc-avg') {
                                            const v = est.bcValues?.[col.idx];
                                            return (
                                                <div key={col.id} className={`px-1 py-1 border-r border-[rgba(46,51,48,0.08)] flex items-center justify-center box-border ${col.idx === 0 ? 'border-l-2 border-l-[rgba(46,51,48,0.08)]' : ''}`} style={style}>
                                                    <span className={`text-base font-semibold px-1 py-0.5 rounded ${v?.avg !== null ? getGradeClass(v.avg) : ''}`}>{v?.avg ?? '-'}</span>
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
                                                    className={`border-r border-[rgba(46,51,48,0.08)] transition-all flex items-center justify-center text-sm font-bold box-border ${needsRec ? 'cursor-pointer bg-white hover:bg-[#F8F3ED]' : 'bg-[#FDFBF7] opacity-40 cursor-default'}`}
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
                </div>
            </div>
        </div>
    );
};

export default React.memo(GradeTable);
