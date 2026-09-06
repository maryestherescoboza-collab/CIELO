import React, { useEffect, useMemo, useState } from 'react';
import FloatingWorkWindow, { type WorkWindowPosition } from './FloatingWorkWindow';
import { useAppStore } from '../../../store/appStore';
import { usePlanClasesStore } from '../../../store/planClasesStore';
import type { Actividad } from '../../../types';
import type { NotaDB, NotaContenido } from '../../../types/planClases';

export interface WorkspaceFichaProps {
    activity: Actividad;
    position: WorkWindowPosition;
    zIndex: number;
    onStartDrag: (id: string, e: React.PointerEvent) => void;
    onWindowFocus: (id: string) => void;
    onClose: () => void;
    onUpdateActividad: (id: number, patch: Partial<Actividad>) => void;
}

// Ventana "Ficha de clase": vista previa tipo nota de la ficha vinculada a la
// actividad. Reutiliza los mismos mecanismos de carga (usePlanClasesStore) y de
// persistencia (onUpdateActividad) que la tarjeta interior anterior; no edita pc_notas.
const WorkspaceFicha: React.FC<WorkspaceFichaProps> = ({
    activity,
    position,
    zIndex,
    onStartDrag,
    onWindowFocus,
    onClose,
    onUpdateActividad,
}) => {
    const sessionUserId = useAppStore((s) => s.session?.user?.id) ?? null;
    const planSecuencias = usePlanClasesStore((s) => s.secuencias);
    const planNotas = usePlanClasesStore((s) => s.notas);
    const loadingNotas = usePlanClasesStore((s) => s.loadingNotas);
    const loadingSecuencias = usePlanClasesStore((s) => s.loadingSecuencias);
    const fetchAllNotas = usePlanClasesStore((s) => s.fetchAllNotas);
    const fetchSecuencias = usePlanClasesStore((s) => s.fetchSecuencias);
    const getNota = usePlanClasesStore((s) => s.getNota);
    const [fichaAsignada, setFichaAsignada] = useState<NotaDB | null>(null);

    useEffect(() => {
        if (!sessionUserId) return;
        if (!loadingNotas && planNotas.length === 0) fetchAllNotas(sessionUserId);
        if (!loadingSecuencias && planSecuencias.length === 0) fetchSecuencias(sessionUserId);
    }, [sessionUserId, loadingNotas, loadingSecuencias, planNotas.length, planSecuencias.length, fetchAllNotas, fetchSecuencias]);

    const fichaAsignadaId = activity.planFichaId ?? null;

    useEffect(() => {
        setFichaAsignada(null);
        if (!fichaAsignadaId) return;
        let activo = true;
        getNota(fichaAsignadaId).then((n) => {
            if (activo && n) setFichaAsignada(n);
        });
        return () => {
            activo = false;
        };
    }, [fichaAsignadaId, getNota]);

    const listaFichas = useMemo(() => {
        const base = [...planNotas];
        if (fichaAsignada && !planNotas.some((n) => n.id === fichaAsignada.id)) base.push(fichaAsignada);
        const mapa = new Map<string, NotaDB[]>();
        for (const n of base) {
            const arr = mapa.get(n.secuencia_id) ?? [];
            arr.push(n);
            mapa.set(n.secuencia_id, arr);
        }
        const tituloSecuencia = new Map<string, string>();
        for (const s of planSecuencias) tituloSecuencia.set(s.id, s.titulo);
        return Array.from(mapa.entries())
            .map(([secuenciaId, fichas]) => ({
                secuenciaId,
                secuenciaTitulo: tituloSecuencia.get(secuenciaId) ?? 'Sin secuencia',
                fichas: fichas.sort((a, b) => a.titulo.localeCompare(b.titulo, 'es')),
            }))
            .sort((a, b) => a.secuenciaTitulo.localeCompare(b.secuenciaTitulo, 'es'));
    }, [planNotas, fichaAsignada, planSecuencias]);

    const extractoFicha = useMemo(() => {
        const contenido = fichaAsignada?.contenido_json as NotaContenido | null | undefined;
        if (!contenido || !Array.isArray(contenido.blocks)) return null;
        const textos: string[] = [];
        for (const bloque of contenido.blocks) {
            const texto = bloque?.data?.text;
            if (typeof texto === 'string' && texto.trim()) textos.push(texto.trim());
            if (textos.join(' ').length >= 220) break;
        }
        const crudo = textos.join(' ').replace(/\s+/g, ' ').trim();
        if (!crudo) return null;
        return crudo.length > 170 ? crudo.slice(0, 170).trimEnd() + '…' : crudo;
    }, [fichaAsignada]);

    const commitFicha = (raw: string) => {
        const next: string | null = raw === '' ? null : raw;
        const current: string | null = activity.planFichaId ?? null;
        if (next === current) return;
        onUpdateActividad(activity.id, { planFichaId: next } as unknown as Partial<Actividad>);
    };

    return (
        <FloatingWorkWindow
            id="ficha"
            title="Ficha de clase"
            barColor="#7FC1E0"
            position={position}
            zIndex={zIndex}
            width={300}
            onStartDrag={onStartDrag}
            onWindowFocus={onWindowFocus}
            onClose={onClose}
        >
            <div className="ws-note-pane">
                <div className="ws-card-head">
                    <span className="ws-dot ws-dot-blue" />
                    <span className="ws-card-kicker">Ficha</span>
                </div>
                <div className={fichaAsignadaId ? 'ws-note-title' : 'ws-note-title ws-note-title-empty'}>
                    {fichaAsignadaId
                        ? (fichaAsignada?.titulo ?? planNotas.find((n) => n.id === fichaAsignadaId)?.titulo ?? 'Ficha asociada')
                        : 'Sin ficha asociada'}
                </div>
                {fichaAsignadaId && <div className="ws-note-divider" />}
                {fichaAsignadaId ? (
                    extractoFicha
                        ? <div className="ws-note-excerpt">{extractoFicha}</div>
                        : <div className="ws-note-empty">Esta ficha no contiene contenido previo.</div>
                ) : (
                    <div className="ws-note-empty">Elige una ficha de tu plan de clases para vincularla a esta actividad.</div>
                )}
                <div className="ws-note-action-row">
                    <span className="ws-note-action-label">Cambiar ficha</span>
                    <select
                        className="ws-card-select ws-note-action"
                        value={activity.planFichaId ?? ''}
                        onChange={(e) => commitFicha(e.target.value)}
                        title="Ficha de clase asociada a la actividad (opcional)"
                        aria-label="Ficha de clase asociada a la actividad"
                    >
                        <option value="">Sin ficha</option>
                        {listaFichas.map((grupo) => (
                            <optgroup key={grupo.secuenciaId} label={grupo.secuenciaTitulo}>
                                {grupo.fichas.map((n) => (
                                    <option key={n.id} value={n.id}>{n.titulo}</option>
                                ))}
                            </optgroup>
                        ))}
                    </select>
                </div>
            </div>
        </FloatingWorkWindow>
    );
};

export default React.memo(WorkspaceFicha);