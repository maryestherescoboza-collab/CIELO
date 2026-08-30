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
        text: 'text-(--herb-garden)',
        pointsColor: 'text-(--ink-soft)',
        activeBorder: 'border-(--herb-garden)',
        activeBg: 'bg-(--herb-garden)/10',
        headerBg: 'var(--herb-garden)',
        headerTextColor: 'text-white',
        cellBg: 'rgba(104, 156, 99, 0.1)',
    },
    {
        key: 'autonomo' as keyof DescriptorRubrica,
        nivel: 3 as Nivel,
        label: 'AUTÓNOMO',
        text: 'text-(--calendula)',
        pointsColor: 'text-(--ink-soft)',
        activeBorder: 'border-(--calendula)',
        activeBg: 'bg-(--calendula)/15',
        headerBg: 'var(--calendula)',
        headerTextColor: 'text-[#1E293B]',
        cellBg: 'rgba(222, 174, 77, 0.15)',
    },
    {
        key: 'resolutivo' as keyof DescriptorRubrica,
        nivel: 2 as Nivel,
        label: 'RESOLUTIVO',
        text: 'text-(--terra-cotta)',
        pointsColor: 'text-(--ink-soft)',
        activeBorder: 'border-(--terra-cotta)',
        activeBg: 'bg-(--terra-cotta)/10',
        headerBg: 'var(--terra-cotta)',
        headerTextColor: 'text-white',
        cellBg: 'rgba(219, 91, 72, 0.1)',
    },
    {
        key: 'receptivo' as keyof DescriptorRubrica,
        nivel: 1 as Nivel,
        label: 'RECEPTIVO',
        text: 'text-(--ink-soft)',
        pointsColor: 'text-(--ink-soft)',
        activeBorder: 'border-(--ink-soft)',
        activeBg: 'bg-(--ink-soft)/12',
        headerBg: 'var(--ink-soft)',
        headerTextColor: 'text-white',
        cellBg: 'rgba(95, 102, 94, 0.12)',
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
    isAssociated?: boolean;
    hasSelectedActivity?: boolean;
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
    isAssociated = false,
    hasSelectedActivity = false,
}) => {
    const [editingField, setEditingField] = React.useState<RichFieldKey | null>(null);

    function getCellRefKey(descriptorId: string, key: RichFieldKey): string {
        return `${descriptorId}:${String(key)}`;
    }

    function startCellEditing(descriptorId: string, key: RichFieldKey, clientX: number, clientY: number) {
        setEditingField(key);

        requestAnimationFrame(() => {
            const editor = richCellRefs?.current[getCellRefKey(descriptorId, key)];
            if (!editor) return;
            editor.focus();

            const caret = document.caretPositionFromPoint
                ? document.caretPositionFromPoint(clientX, clientY)
                : null;
            if (caret && editor.contains(caret.offsetNode)) {
                const range = document.createRange();
                range.setStart(caret.offsetNode, caret.offset);
                range.collapse(true);
                const selection = window.getSelection();
                if (selection) {
                    selection.removeAllRanges();
                    selection.addRange(range);
                }
            }
        });
    }

    const rowClass = hasSelectedActivity
        ? isAssociated
            ? "bg-primary/5 shadow-xs transition-all duration-300 ease-in-out font-medium"
            : "opacity-40 hover:opacity-85 transition-all duration-300 ease-in-out"
        : "group hover:bg-(--linen)/10 transition-colors duration-300 ease-in-out";

    return (
        <tr className={rowClass} onContextMenu={onContextMenu}>
            <td className={`w-[30%] border-r border-(--border-soft) px-2 py-2 align-middle text-center relative transition-all duration-300 ease-in-out
                ${hasSelectedActivity && isAssociated ? 'before:absolute before:left-0 before:top-0 before:bottom-0 before:w-1 before:bg-primary' : ''}`}>
                <div className="flex min-h-26 items-center justify-center gap-2">
                    {(() => {
                        const CompetenciaIcon = COMPETENCIAS[index % COMPETENCIAS.length].icon;
                        return <CompetenciaIcon size={16} className="text-(--ink)" />;
                    })()}
                    <span className="text-[12px] leading-tight text-(--ink) font-bold">
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
                            className="absolute right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-(--linen)/20 rounded text-(--ink-soft) cursor-pointer"
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
                        className={`w-[17.5%] p-2 align-middle text-center transition-all border-r border-(--border-soft) last:border-r-0 ${readOnly ? 'cursor-default' : 'cursor-pointer'} relative group-cell group/cell 
                            ${isSelected ? 'after:absolute after:inset-0 after:border-2 after:border-(--ink)' : ''}
                            ${isActive ? 'ring-2 ring-inset ring-(--primary) shadow-inner z-10' : ''}`}
                        style={{ backgroundColor: field.cellBg }}
                        onClick={(e) => {
                            if (readOnly) return;
                            if (e.detail > 1) return;
                            e.stopPropagation();
                            onSelect(desc.id, field.nivel);
                        }}
                        onDoubleClick={(e) => {
                            if (readOnly) return;
                            if (!richCellRefs || !setDescriptorField || !syncInlineToolbar || !setActiveFormatCell) return;
                            e.preventDefault();
                            startCellEditing(desc.id, field.key, e.clientX, e.clientY);
                        }}
                    >
                        <div className="flex flex-col items-center justify-center h-full min-h-26 gap-2">
                            {!readOnly && editingField !== field.key && (
                                <div className="absolute top-1.5 left-1/2 -translate-x-1/2 opacity-0 group-hover/cell:opacity-100 transition-opacity duration-300 pointer-events-none z-10 flex items-center justify-center">
                                    <span className="text-[9px] uppercase tracking-wider font-bold bg-(--linen)/95 text-(--ink-soft) px-2 py-0.5 rounded-full border border-(--border-soft) shadow-sm whitespace-nowrap">
                                        Doble clic para editar
                                    </span>
                                </div>
                            )}
                            {!readOnly && isFormattingCell && applyInlineFormat && (
                                <div className="absolute top-1 right-1 z-20 flex items-center gap-1 rounded-md border border-(--border-soft) bg-white px-1.5 py-1 shadow-sm">
                                    <button
                                        type="button"
                                        className="h-5 w-5 rounded border border-(--border-soft) text-xs font-bold text-(--ink) hover:bg-(--linen)/20 cursor-pointer"
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
                                        className="h-5 w-5 rounded border border-(--border-soft) text-xs italic text-(--ink) hover:bg-(--linen)/20 cursor-pointer"
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
                                            className="h-4 w-4 rounded-full border border-(--border-soft) cursor-pointer"
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
                                <div className={`absolute top-2.5 right-2.5 z-10 ${isActive ? 'text-(--primary)' : 'text-(--ink)'}`}>
                                    <CheckCircle size={14} />
                                </div>
                            )}

                            {studentsInCell.length > 0 && (
                                <div className="flex flex-wrap justify-center gap-0.5 mb-1">
                                    {studentsInCell.map(({ s, i }) => (
                                        <div
                                            key={s.id}
                                            title={`${s.nombre} ${s.apellido}`}
                                            className="w-4 h-4 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-sm"
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
                                    data-guide="editor-descriptor"
                                    contentEditable={!readOnly && editingField === field.key}
                                    suppressContentEditableWarning
                                    className={`w-full min-h-17.5 rounded-md border border-transparent px-2 py-1 text-[12px] leading-[1.3] text-center outline-none transition-all ${isSelected ? 'text-[#1E293B]' : 'text-slate-500 group-cell-hover:text-[#1E293B]'}`}
                                    onMouseDown={(event) => {
                                        if (editingField === field.key) event.stopPropagation();
                                    }}
                                    onClick={(event) => {
                                        if (editingField === field.key) event.stopPropagation();
                                    }}
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
                                        setEditingField(null);
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
