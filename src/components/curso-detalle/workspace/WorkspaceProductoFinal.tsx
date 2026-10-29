import React, { useState, useEffect, useMemo, useCallback } from 'react';
import FloatingWorkWindow, { type WorkWindowPosition } from './FloatingWorkWindow';
import type { Actividad, BCKey } from '../../../types';
import { getCompetenciaDisplay } from '../../../types';
import { SUGERENCIAS_POR_COMPETENCIA } from '../../../constants/productoFinal';
import { parsePuntosCompetencias } from '../../../utils/academic';

export interface WorkspaceProductoFinalProps {
    activity: Actividad;
    position: WorkWindowPosition;
    zIndex: number;
    onStartDrag: (id: string, e: React.PointerEvent) => void;
    onWindowFocus: (id: string) => void;
    onClose: () => void;
    onUpdateActividad: (id: number, patch: Partial<Actividad>) => void;
    bcSel?: Record<number, Set<BCKey>>;
    actividades?: Actividad[];
}

const ALL_BCS: BCKey[] = ['BC1', 'BC2', 'BC3', 'BC4'];

function serializePuntosCompetencias(descripcion: string | null | undefined, bc: BCKey, valor: number | null): string {
    let existing: Record<string, any> = {};
    if (descripcion) {
        try {
            const parsed = JSON.parse(descripcion);
            if (parsed && typeof parsed === 'object') {
                existing = { ...parsed };
            }
        } catch {
            existing = { texto: descripcion };
        }
    }

    const currentPuntos: Record<string, any> = (existing.puntos && typeof existing.puntos === 'object')
        ? { ...existing.puntos }
        : {};

    delete currentPuntos.texto;
    delete currentPuntos.puntos;

    if (valor === null || isNaN(valor)) {
        delete currentPuntos[bc];
    } else {
        currentPuntos[bc] = valor;
    }

    return JSON.stringify({
        ...existing,
        puntos: currentPuntos
    });
}

const WorkspaceProductoFinal: React.FC<WorkspaceProductoFinalProps> = ({
    activity,
    position,
    zIndex,
    onStartDrag,
    onWindowFocus,
    onClose,
    onUpdateActividad,
    bcSel,
    actividades,
}) => {
    const [openSugerencias, setOpenSugerencias] = useState<BCKey | null>(null);

    const assigned = useMemo(() => bcSel?.[activity.id] ?? new Set(activity.bcAsignados || []), [bcSel, activity.id, activity.bcAsignados]);
    const activeBcs = useMemo(() => ALL_BCS.filter(bc => assigned.has(bc)), [assigned]);

    const puntosGuardados = useMemo(() => parsePuntosCompetencias(activity.descripcion), [activity.descripcion]);
    const [localPuntos, setLocalPuntos] = useState<Record<string, string>>({});

    useEffect(() => {
        const initial: Record<string, string> = {};
        for (const [k, v] of Object.entries(puntosGuardados)) {
            if (v !== undefined && v !== null) {
                initial[k] = String(v);
            }
        }
        setLocalPuntos(initial);
    }, [activity.id, puntosGuardados]);

    const commitProducto = useCallback((value: string) => {
        const trimmed = value.trim();
        if (trimmed !== (activity.producto || '').trim()) {
            onUpdateActividad(activity.id, { producto: trimmed });
        }
    }, [activity.id, activity.producto, onUpdateActividad]);

    const commitPuntos = useCallback((bc: BCKey, valueStr: string) => {
        const trimmed = valueStr.trim().replace('%', '').trim();
        const num = trimmed === '' ? null : Number(trimmed);
        const validNum = num !== null && !isNaN(num) && num >= 0 ? Math.min(100, Math.max(0, num)) : null;

        const currentVal = puntosGuardados[bc] ?? null;
        if (validNum !== currentVal) {
            const newDescripcion = serializePuntosCompetencias(activity.descripcion, bc, validNum);
            onUpdateActividad(activity.id, { descripcion: newDescripcion });
        }
    }, [activity.id, activity.descripcion, puntosGuardados, onUpdateActividad]);

    return (
        <FloatingWorkWindow
            id="producto-final"
            title="Producto Final"
            barColor="#8FD9B6"
            position={position}
            zIndex={zIndex}
            width={420}
            onStartDrag={onStartDrag}
            onWindowFocus={onWindowFocus}
            onClose={onClose}
        >
            <div className="ws-pf-table">
                <div className="ws-pf-header">
                    <span className="ws-pf-col ws-pf-col-competencia">Competencia</span>
                    <span className="ws-pf-col ws-pf-col-puntos">Puntos</span>
                    <span className="ws-pf-col ws-pf-col-producto">Producto</span>
                </div>
                {activeBcs.length === 0 ? (
                    <div className="ws-pf-empty">
                        Selecciona competencias en la ventana "Competencias a evaluar" para configurar el Producto Final.
                    </div>
                ) : (
                    activeBcs.map(bc => {
                        const count = actividades
                            ? actividades.filter(a => (bcSel?.[a.id] ?? new Set(a.bcAsignados)).has(bc)).length
                            : 0;
                        const defaultAporte = count > 0
                            ? String(Math.round(100 / count))
                            : (activeBcs.length > 0 ? String(Math.round(100 / activeBcs.length)) : '—');
                        return (
                            <div key={bc} className="ws-pf-row">
                                <div className="ws-pf-col ws-pf-col-competencia">
                                    <span className="ws-pf-bc-name">{getCompetenciaDisplay(bc)}</span>
                                    <button
                                        type="button"
                                        className="ws-pf-sug-toggle"
                                        onClick={() => setOpenSugerencias(openSugerencias === bc ? null : bc)}
                                        title="Ver sugerencias"
                                    >
                                        ?
                                    </button>
                                    {openSugerencias === bc && (
                                        <div className="ws-pf-sugerencias">
                                            {SUGERENCIAS_POR_COMPETENCIA[bc].map(sug => (
                                                <button
                                                    key={sug.id}
                                                    type="button"
                                                    className="ws-pf-sug-item"
                                                    onClick={() => {
                                                        const current = (activity.producto || '').trim();
                                                        const newValue = current ? `${current}\n• ${sug.titulo}` : `• ${sug.titulo}`;
                                                        commitProducto(newValue);
                                                        setOpenSugerencias(null);
                                                    }}
                                                >
                                                    {sug.titulo}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                <div className="ws-pf-col ws-pf-col-puntos">
                                    <input
                                        type="number"
                                        min={0}
                                        max={100}
                                        className="ws-pf-puntos-input"
                                        value={localPuntos[bc] ?? ''}
                                        placeholder={defaultAporte}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            setLocalPuntos(prev => ({ ...prev, [bc]: val }));
                                        }}
                                        onBlur={(e) => commitPuntos(bc, e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') e.currentTarget.blur();
                                        }}
                                        title={`Puntos para ${getCompetenciaDisplay(bc)}`}
                                    />
                                </div>
                                <div className="ws-pf-col ws-pf-col-producto">
                                    <textarea
                                        className="ws-pf-producto-input"
                                        rows={1}
                                        defaultValue={activity.producto || ''}
                                        placeholder="Evidencia..."
                                        onBlur={(e) => commitProducto(e.currentTarget.value)}
                                    />
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </FloatingWorkWindow>
    );
};

export default React.memo(WorkspaceProductoFinal);
