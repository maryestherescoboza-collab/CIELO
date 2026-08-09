import React from 'react';
import { CheckCircle, MessageSquareText, Brain, Puzzle, Microscope } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { DescriptorRubrica, Nivel, Estudiante, BCKey } from '../types';
import { COMPETENCIAS_LABEL } from '../types';

export const COMPETENCIAS: Array<{ nombre: string; bc: BCKey; icon: LucideIcon }> = [
    { nombre: 'BC1', bc: 'BC1', icon: MessageSquareText },
    { nombre: 'BC2', bc: 'BC2', icon: Brain },
    { nombre: 'BC3', bc: 'BC3', icon: Puzzle },
    { nombre: 'BC4', bc: 'BC4', icon: Microscope },
];

export const NIVEL_FIELDS = [
    {
        key: 'estrategico' as keyof DescriptorRubrica,
        nivel: 4 as Nivel,
        label: 'ESTRATÉGICO',
        text: 'text-[#7C9672]',
        pointsColor: 'text-slate-400',
        activeBorder: 'border-[#7C9672]',
        activeBg: 'bg-[#F2F5F1]',
        headerBg: '#7C9672',
        headerTextColor: 'text-white',
        cellBg: '#F2F5F1',
    },
    {
        key: 'autonomo' as keyof DescriptorRubrica,
        nivel: 3 as Nivel,
        label: 'AUTÓNOMO',
        text: 'text-[#D8B55A]',
        pointsColor: 'text-slate-400',
        activeBorder: 'border-[#D8B55A]',
        activeBg: 'bg-[#FAF6ED]',
        headerBg: '#D8B55A',
        headerTextColor: 'text-[#1E293B]',
        cellBg: '#FAF6ED',
    },
    {
        key: 'resolutivo' as keyof DescriptorRubrica,
        nivel: 2 as Nivel,
        label: 'RESOLUTIVO',
        text: 'text-[#CB4834]',
        pointsColor: 'text-slate-400',
        activeBorder: 'border-[#CB4834]',
        activeBg: 'bg-[#FDF1EF]',
        headerBg: '#CB4834',
        headerTextColor: 'text-white',
        cellBg: '#FDF1EF',
    },
    {
        key: 'receptivo' as keyof DescriptorRubrica,
        nivel: 1 as Nivel,
        label: 'RECEPTIVO',
        text: 'text-[#3F3C36]',
        pointsColor: 'text-slate-400',
        activeBorder: 'border-[#3F3C36]',
        activeBg: 'bg-[#F3F3F2]',
        headerBg: '#3F3C36',
        headerTextColor: 'text-white',
        cellBg: '#F3F3F2',
    },
];

type RichFieldKey = (typeof NIVEL_FIELDS)[number]['key'];

function escapeHtml(value: string): string {
    return value
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');
}

export function toRichHtml(value: string): string {
    if (!value) return '';
    if (/<\/?[a-z][\s\S]*>/i.test(value)) return value;
    return escapeHtml(value).replace(/\n/g, '<br/>');
}

interface Selection {
    [key: string]: Nivel;
}

interface RubricaRowProps {
    desc: DescriptorRubrica;
    index: number;
    selection: Selection;
    activeCell: { id: string; nivel: Nivel } | null;
    activeFormatCell: { id: string; key: RichFieldKey } | null;
    sortedEsts: Estudiante[];
    multiEvaluations: Record<number, Selection>;
    readOnly: boolean;
    onSelect: (descId: string, nivel: Nivel) => void;
    
    // Optional props for editing text inside cells (used by main Rubrica screen)
    richCellRefs?: React.MutableRefObject<Record<string, HTMLDivElement | null>>;
    setActiveFormatCell?: React.Dispatch<React.SetStateAction<{ id: string; key: RichFieldKey } | null>>;
    setDescriptorField?: (descriptorId: string, key: RichFieldKey, value: string) => void;
    syncInlineToolbar?: (descriptorId: string, key: RichFieldKey) => void;
    applyInlineFormat?: (command: 'bold' | 'italic' | 'foreColor', value?: string) => void;

    // Optional decouple/context-menu handlers
    onDecouple?: () => void;
    isFloatingMode?: boolean;
    onContextMenu?: (e: React.MouseEvent) => void;
}

export const RubricaRow: React.FC<RubricaRowProps> = ({
    desc,
    index,
    selection,
    activeCell,
    activeFormatCell,
    sortedEsts,
    multiEvaluations,
    readOnly,
    onSelect,
    richCellRefs,
    setActiveFormatCell,
    setDescriptorField,
    syncInlineToolbar,
    applyInlineFormat,
    onDecouple,
    isFloatingMode = false,
    onContextMenu,
}) => {
    function getCellRefKey(descriptorId: string, key: RichFieldKey): string {
        return `${descriptorId}:${String(key)}`;
    }

    return (
        <tr className="group hover:bg-slate-50/50 transition-colors" onContextMenu={onContextMenu}>
            <td className="w-[30%] border-r border-slate-100 px-2 py-2 align-middle text-center relative">
                <div className="flex min-h-26 items-center justify-center gap-2">
                    {(() => {
                        const CompetenciaIcon = COMPETENCIAS[index % COMPETENCIAS.length].icon;
                        return <CompetenciaIcon size={16} className="text-[#111827]" />;
                    })()}
                    <span className="text-[12px] leading-tight text-[#111827] font-bold">
                        {COMPETENCIAS_LABEL[COMPETENCIAS[index % COMPETENCIAS.length].bc]}
                    </span>

                    {/* Decouple icon on hover */}
                    {onDecouple && !isFloatingMode && (
                        <button
                            onClick={(e) => {
                                  e.stopPropagation();
                                  onDecouple();
                            }}
                            title="Desacoplar competencia"
                            className="absolute right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-slate-200 rounded text-slate-500"
                        >
                            <span className="material-symbols-outlined text-[16px]">open_in_new</span>
                        </button>
                    )}
                </div>
            </td>

            {NIVEL_FIELDS.map((field) => {
                const isSelected = selection[desc.id] === field.nivel;
                const isActive = activeCell?.id === desc.id && activeCell.nivel === field.nivel;
                const isFormattingCell = activeFormatCell?.id === desc.id && activeFormatCell.key === field.key;
                
                const studentsInCell = sortedEsts
                    .map((s, i) => ({ s, i: i + 1 }))
                    .filter(({ s }) => multiEvaluations[s.id]?.[desc.id] === field.nivel);
                
                const cellRefKey = getCellRefKey(desc.id, field.key);
                const richValue = toRichHtml((desc[field.key] as string) || '');

                return (
                    <td
                        key={field.key}
                        data-guide="celda-rubrica"
                        className={`w-[17.5%] p-2 align-middle text-center transition-all border-r border-slate-100 last:border-r-0 ${readOnly ? 'cursor-default' : 'cursor-pointer'} relative group-cell 
                            ${isSelected ? 'after:absolute after:inset-0 after:border-2 after:border-[#1E293B]' : ''}
                            ${isActive ? 'ring-2 ring-inset ring-turf-green-base shadow-inner z-10' : ''}`}
                        style={{ backgroundColor: field.cellBg }}
                        onClick={(e) => {
                            if (readOnly) return;
                            e.stopPropagation();
                            onSelect(desc.id, field.nivel);
                        }}
                    >
                        <div className="flex flex-col items-center justify-center h-full min-h-26 gap-2">
                            {!readOnly && isFormattingCell && applyInlineFormat && (
                                <div className="absolute top-1 right-1 z-20 flex items-center gap-1 rounded-md border border-slate-300 bg-white px-1.5 py-1 shadow-sm">
                                    <button
                                        type="button"
                                        className="h-5 w-5 rounded border border-slate-300 text-[11px] font-bold text-slate-800 hover:bg-slate-100"
                                        onMouseDown={(event) => {
                                            event.preventDefault();
                                            event.stopPropagation();
                                            applyInlineFormat('bold');
                                        }}
                                    >
                                        B
                                    </button>
                                    <button
                                        type="button"
                                        className="h-5 w-5 rounded border border-slate-300 text-[11px] italic text-slate-800 hover:bg-slate-100"
                                        onMouseDown={(event) => {
                                            event.preventDefault();
                                            event.stopPropagation();
                                            applyInlineFormat('italic');
                                        }}
                                    >
                                        I
                                    </button>
                                    {['#111827', '#1D4ED8', '#B91C1C'].map((color) => (
                                        <button
                                            key={color}
                                            type="button"
                                            className="h-4 w-4 rounded-full border border-slate-300"
                                            style={{ backgroundColor: color }}
                                            onMouseDown={(event) => {
                                                event.preventDefault();
                                                event.stopPropagation();
                                                applyInlineFormat('foreColor', color);
                                            }}
                                            aria-label={`Color ${color}`}
                                        />
                                    ))}
                                </div>
                            )}
                            {(isSelected || isActive) && (
                                <div className={`absolute top-2.5 right-2.5 z-10 ${isActive ? 'text-turf-green-base' : 'text-[#1E293B]'}`}>
                                    <CheckCircle size={14} />
                                </div>
                            )}

                            {studentsInCell.length > 0 && (
                                <div className="flex flex-wrap justify-center gap-0.5 mb-1">
                                    {studentsInCell.map(({ s, i }) => (
                                        <div
                                            key={s.id}
                                            title={`${s.nombre} ${s.apellido}`}
                                            className="w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold text-white shadow-sm"
                                            style={{ background: s.avatarColor }}
                                        >
                                            {i}
                                        </div>
                                    ))}
                                </div>
                            )}

                            {readOnly || !richCellRefs || !setDescriptorField || !syncInlineToolbar || !setActiveFormatCell ? (
                                <div
                                    className={`w-full min-h-17.5 px-2 py-1 text-[12px] leading-[1.3] text-center ${isSelected ? 'text-[#1E293B]' : 'text-slate-500'}`}
                                    dangerouslySetInnerHTML={{ __html: richValue }}
                                />
                            ) : (
                                <div
                                    ref={(node) => {
                                        richCellRefs.current[cellRefKey] = node;
                                        if (node && document.activeElement !== node && node.innerHTML !== richValue) {
                                            node.innerHTML = richValue;
                                        }
                                    }}
                                    contentEditable={!readOnly}
                                    suppressContentEditableWarning
                                    className={`w-full min-h-17.5 rounded-md border border-transparent px-2 py-1 text-[12px] leading-[1.3] text-center outline-none transition-all ${isSelected ? 'text-[#1E293B]' : 'text-slate-500 group-cell-hover:text-[#1E293B]'}`}
                                    onMouseDown={(event) => event.stopPropagation()}
                                    onClick={(event) => event.stopPropagation()}
                                    onInput={(event) => {
                                        setDescriptorField(desc.id, field.key, event.currentTarget.innerHTML);
                                    }}
                                    onMouseUp={() => syncInlineToolbar(desc.id, field.key)}
                                    onKeyUp={() => syncInlineToolbar(desc.id, field.key)}
                                    onBlur={(event) => {
                                        setDescriptorField(desc.id, field.key, event.currentTarget.innerHTML);
                                        setTimeout(() => {
                                            const selection = window.getSelection();
                                            if (!selection || selection.isCollapsed) {
                                                setActiveFormatCell((prev) =>
                                                    prev && prev.id === desc.id && prev.key === field.key ? null : prev
                                                );
                                            }
                                        }, 0);
                                    }}
                                />
                            )}
                        </div>
                    </td>
                );
            })}
        </tr>
    );
};
