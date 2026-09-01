import React, { useEffect, useMemo, useState } from 'react';
import FloatingWorkWindow, { type WorkWindowPosition } from './FloatingWorkWindow';
import { useAppStore } from '../../../store/appStore';
import { getValidSecuencia, saveRawSecuencia } from '../../../cache/secuenciaCache';
import { supabase } from '../../../lib/supabase';
import type { Actividad, Secuencia } from '../../../types';

export interface WorkspaceRecursosProps {
    activity: Actividad;
    position: WorkWindowPosition;
    zIndex: number;
    onStartDrag: (id: string, e: React.PointerEvent) => void;
    onWindowFocus: (id: string) => void;
    onClose: () => void;
    onUpdateActividad?: (id: number, patch: Partial<Actividad>) => void;
    onAddSecuencia?: (s: Omit<Secuencia, 'id'>) => Promise<Secuencia | null>;
    onUpdateSecuencia?: (s: Secuencia) => Promise<void>;
}

interface RecursoItem {
    id: string;
    titulo: string;
    tipo?: string;
    url?: string;
    orden?: number;
}

const ROTATIONS = [-2.5, 1.5, -1, 2];

function parseRecursos(raw: unknown): RecursoItem[] {
    let arr: unknown[] = [];
    if (Array.isArray(raw)) arr = raw;
    else if (typeof raw === 'string') {
        try {
            arr = JSON.parse(raw);
        } catch {
            arr = [];
        }
    }
    return arr.map((r, i): RecursoItem => {
        if (typeof r === 'string') {
            return { id: `r-${i}`, titulo: 'Recurso', url: r };
        }
        if (r && typeof r === 'object') {
            const o = r as Record<string, unknown>;
            return {
                id: String(o.id ?? `r-${i}`),
                titulo: (typeof o.titulo === 'string' && o.titulo.trim()) ? o.titulo.trim() : (typeof o.categoria === 'string' ? o.categoria : 'Recurso'),
                tipo: typeof o.tipo === 'string' ? o.tipo : undefined,
                url: typeof o.url === 'string' ? o.url.trim() : undefined,
                orden: typeof o.orden === 'number' ? o.orden : i,
            };
        }
        return { id: `r-${i}`, titulo: 'Recurso' };
    }).sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0));
}

function isHttpUrl(value: string | undefined): boolean {
    if (!value) return false;
    try {
        const urlObj = new URL(value);
        return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
    } catch {
        return false;
    }
}

function detectResourceType(url: string): string {
    const lowerUrl = url.toLowerCase();
    if (lowerUrl.includes('youtube.com') || lowerUrl.includes('youtu.be') || lowerUrl.includes('vimeo.com')) return 'video';
    if (lowerUrl.includes('docs.google.com/document') || lowerUrl.includes('word') || lowerUrl.includes('drive.google.com')) return 'documento';
    if (lowerUrl.includes('docs.google.com/presentation') || lowerUrl.includes('slides')) return 'presentacion';
    if (lowerUrl.includes('canva.com')) return 'canva';
    if (lowerUrl.endsWith('.pdf') || lowerUrl.includes('pdf')) return 'pdf';
    return 'web';
}

function rowFromSecuencia(sec: Secuencia): Record<string, unknown> {
    return {
        id: sec.id,
        titulo: sec.titulo,
        curso_id: sec.cursoId,
        fecha_inicio: sec.fechaInicio,
        contenido_html: sec.contenidoHtml,
        estado: sec.estado,
        user_id: sec.userId,
        archivo_url: sec.archivoUrl,
        archivo_nombre: sec.archivoNombre,
        archivo_size: sec.archivoSize,
        archivo_tipo: sec.archivoTipo,
        archivo_fecha_carga: sec.archivoFechaCarga,
        recursos: sec.recursos || [],
    };
}

// Ventana "Recursos" (referencia: objetos/papeles flotantes). Lee ÚNICAMENTE los
// recursos reales de la actividad según la relación existente
// `actividades.secuencia_id -> secuencias.id` (los recursos viven en
// `secuencias.recursos` y en su archivo adjunto). La carga es contextual: se
// resuelve al pulsar VER, primero desde el estado ya cargado en memoria
// (state.secuencias) y la caché de secuencias; solo si falta, hace UNA consulta
// puntual por id. Nunca genera recursos ficticios.
const WorkspaceRecursos: React.FC<WorkspaceRecursosProps> = ({
    activity,
    position,
    zIndex,
    onStartDrag,
    onWindowFocus,
    onClose,
    onUpdateActividad,
    onAddSecuencia,
    onUpdateSecuencia,
}) => {
    const state = useAppStore((s) => s.state);
    const session = useAppStore((s) => s.session);
    const setGenericToast = useAppStore((s) => s.setGenericToast);
    const [secuencia, setSecuencia] = useState<Secuencia | null>(null);
    const [cargando, setCargando] = useState(false);
    const [modoAgregar, setModoAgregar] = useState(false);
    const [guardando, setGuardando] = useState(false);
    const [borradores, setBorradores] = useState<{ nombre: string; url: string }[]>([{ nombre: '', url: '' }]);

    const secuenciaId = activity.secuenciaId;
    const cursoId = activity.cursoId;

    useEffect(() => {
        let isMounted = true;
        if (!secuenciaId) {
            setSecuencia(null);
            setCargando(false);
            return;
        }
        setCargando(true);

        const desdeEstado =
            state.secuencias.find((s) => s.id === secuenciaId && s.cursoId === cursoId) ??
            state.secuencias.find((s) => s.id === secuenciaId) ??
            null;

        if (desdeEstado) {
            setSecuencia(desdeEstado);
            setCargando(false);
            return;
        }

        const desdeCache = getValidSecuencia(session?.user?.id, cursoId, secuenciaId);
        if (desdeCache) {
            setSecuencia(desdeCache);
            setCargando(false);
            return;
        }

        (async () => {
            try {
                const { data, error } = await supabase.from('secuencias').select('*').eq('id', secuenciaId).maybeSingle();
                if (error) {
                    console.error('[CursoDetalle·Recursos] Error obteniendo secuencia:', error);
                } else if (data && isMounted) {
                    if (session?.user?.id) saveRawSecuencia(session.user.id, data as Record<string, unknown>);
                    const row = data as Record<string, unknown>;
                    setSecuencia({
                        id: row.id as number,
                        titulo: row.titulo as string,
                        cursoId: row.curso_id as number,
                        fechaInicio: row.fecha_inicio as string,
                        contenidoHtml: row.contenido_html as string,
                        estado: row.estado as Secuencia['estado'],
                        userId: row.user_id as string | undefined,
                        archivoUrl: row.archivo_url as string | undefined,
                        archivoNombre: row.archivo_nombre as string | undefined,
                        archivoSize: row.archivo_size as number | undefined,
                        archivoTipo: row.archivo_tipo as string | undefined,
                        archivoFechaCarga: row.archivo_fecha_carga as string | undefined,
                        recursos: (row.recursos ?? []) as Secuencia['recursos'],
                    });
                }
            } catch (e) {
                console.error('[CursoDetalle·Recursos] Error al resolver recursos:', e);
            } finally {
                if (isMounted) setCargando(false);
            }
        })();

        return () => {
            isMounted = false;
        };
    }, [secuenciaId, cursoId, state.secuencias, session?.user?.id]);

    const recursos = useMemo<RecursoItem[]>(() => {
        const lista = parseRecursos(secuencia?.recursos);
        const archivo = secuencia?.archivoUrl
            ? {
                  id: 'archivo-adjunto',
                  titulo: secuencia.archivoNombre?.trim() || 'Archivo adjunto',
                  tipo: secuencia.archivoTipo || 'archivo',
                  url: secuencia.archivoUrl,
              }
            : null;
        const extras: RecursoItem[] = archivo ? [...lista, archivo] : lista;
        return extras;
    }, [secuencia]);

    const sinRecursos = !cargando && recursos.length === 0;
    const conRecursos = !cargando && recursos.length > 0;

    const existingUrls = useMemo(() => {
        const set = new Set<string>();
        for (const r of parseRecursos(secuencia?.recursos)) {
            if (r.url) set.add(r.url.replace(/\/+$/, '').toLowerCase());
        }
        return set;
    }, [secuencia]);

    const notify = (message: string, type: 'success' | 'error') => {
        setGenericToast({ message, type });
        setTimeout(() => setGenericToast(null), 3000);
    };

    const setBorrador = (index: number, field: 'nombre' | 'url', value: string) => {
        setBorradores((prev) => prev.map((b, i) => (i === index ? { ...b, [field]: value } : b)));
    };

    const seemsValid = (b: { nombre: string; url: string }) => b.url.trim() && isHttpUrl(b.url.trim());

    const resolveSecuencia = async (): Promise<Secuencia | null> => {
        if (!secuenciaId) return null;
        const { data, error } = await supabase
            .from('secuencias')
            .select('*')
            .eq('id', secuenciaId)
            .maybeSingle();
        if (error || !data) return null;
        const row = data as Record<string, unknown>;
        return {
            id: row.id as number,
            titulo: row.titulo as string,
            cursoId: row.curso_id as number,
            fechaInicio: row.fecha_inicio as string,
            contenidoHtml: row.contenido_html as string,
            estado: row.estado as Secuencia['estado'],
            userId: row.user_id as string | undefined,
            archivoUrl: row.archivo_url as string | undefined,
            archivoNombre: row.archivo_nombre as string | undefined,
            archivoSize: row.archivo_size as number | undefined,
            archivoTipo: row.archivo_tipo as string | undefined,
            archivoFechaCarga: row.archivo_fecha_carga as string | undefined,
            recursos: (row.recursos ?? []) as Secuencia['recursos'],
        };
    };

    const guardarSecuenciaDirecta = async (sec: Secuencia) => {
        const { error } = await supabase.from('secuencias').upsert({
            id: sec.id,
            titulo: sec.titulo,
            curso_id: sec.cursoId,
            fecha_inicio: sec.fechaInicio,
            contenido_html: sec.contenidoHtml,
            estado: sec.estado,
            user_id: session?.user?.id,
            recursos: sec.recursos || [],
        });
        if (error) throw error;
        const store = useAppStore.getState();
        store.setAppState?.((s) => ({ ...s, secuencias: s.secuencias.map((x: Secuencia) => (x.id === sec.id ? sec : x)) }));
        if (session?.user?.id) saveRawSecuencia(session.user.id, rowFromSecuencia(sec));
    };

    const handleGuardar = async () => {
        if (!session?.user?.id) return;
        const validos = borradores.filter(seemsValid);
        if (validos.length === 0) {
            notify('Introduce al menos un nombre y un enlace válido para guardar.', 'error');
            return;
        }

        // Detección de duplicados contra los recursos ya guardados en la secuencia.
        const nuevos: { id: string; titulo: string; url: string; tipo: string; orden: number }[] = [];
        const duplicados: string[] = [];
        for (const b of validos) {
            const norm = b.url.trim().replace(/\/+$/, '').toLowerCase();
            if (existingUrls.has(norm)) {
                duplicados.push(b.url.trim());
                continue;
            }
            nuevos.push({
                id: Date.now().toString() + Math.random().toString(36).slice(2, 8),
                titulo: b.nombre.trim(),
                url: b.url.trim(),
                tipo: detectResourceType(b.url.trim()),
                orden: (parseRecursos(secuencia?.recursos).length || 0) + nuevos.length + 1,
            });
        }

        if (duplicados.length > 0) {
            notify(
                `Ya existe${duplicados.length > 1 ? 'n' : ''} ${duplicados.length} recurso${duplicados.length > 1 ? 's' : ''} con el mismo enlace (no se añadió${duplicados.length > 1 ? 'n' : ''} de nuevo).`,
                'error'
            );
        }
        if (nuevos.length === 0) {
            setModoAgregar(false);
            setBorradores([{ nombre: '', url: '' }]);
            return;
        }

        setGuardando(true);
        try {
            if (secuenciaId) {
                // La actividad YA tiene secuencia: se añaden los recursos a la
                // existente, conservando los anteriores (no se crea duplicado).
                const base = secuencia ?? (await resolveSecuencia());
                if (!base) throw new Error('No se pudo recuperar la secuencia de la actividad.');
                const merged = [...(base.recursos || []), ...nuevos];
                const next: Secuencia = { ...base, recursos: merged };
                setSecuencia(next);
                if (onUpdateSecuencia) await onUpdateSecuencia(next);
                else await guardarSecuenciaDirecta(next);
                saveRawSecuencia(session.user.id, rowFromSecuencia(next));
                notify(`Recurso${nuevos.length > 1 ? 's' : ''} añadido${nuevos.length > 1 ? 's' : ''} a la secuencia de la actividad.`, 'success');
            } else {
                // La actividad NO tiene secuencia: se crea UNA sola secuencia con
                // todos los recursos introducidos y se asocia a la actividad.
                const creada = onAddSecuencia
                    ? await onAddSecuencia({
                          titulo: `Recursos — ${activity.nombre.trim() || 'Actividad'}`,
                          cursoId,
                          fechaInicio: new Date().toISOString().split('T')[0],
                          contenidoHtml: '',
                          estado: 'Pendiente',
                          recursos: nuevos,
                      })
                    : null;
                if (!creada) throw new Error('No se pudo crear la secuencia.');
                setSecuencia(creada);
                if (onUpdateActividad) await onUpdateActividad(activity.id, { secuenciaId: creada.id });
                notify(`Recurso${nuevos.length > 1 ? 's' : ''} guardado${nuevos.length > 1 ? 's' : ''} y vinculado a la actividad.`, 'success');
            }
            setModoAgregar(false);
            setBorradores([{ nombre: '', url: '' }]);
        } catch (e) {
            console.error('[CursoDetalle·Recursos] Error al guardar:', e);
            notify('No se pudo guardar el recurso. Inténtalo de nuevo.', 'error');
        } finally {
            setGuardando(false);
        }
    };

    return (
        <FloatingWorkWindow
            id="recursos"
            title="Recursos"
            barColor="#7FC1E0"
            position={position}
            zIndex={zIndex}
            width={320}
            onStartDrag={onStartDrag}
            onWindowFocus={onWindowFocus}
            onClose={onClose}
        >
            {cargando && (
                <div className="ws-empty">Cargando recursos...</div>
            )}

            {sinRecursos && (
                <div className="ws-empty">No hay recursos asociados a esta actividad.</div>
            )}

            {conRecursos && (
                <div className="ws-paper-wrap">
                    {recursos.map((recurso, i) => {
                        const abrible = isHttpUrl(recurso.url);
                        const rotate = `rotate(${ROTATIONS[i % ROTATIONS.length]}deg)`;
                        const inner = (
                            <>
                                <span className="ws-paper-title">{recurso.titulo}</span>
                                {recurso.tipo ? <span className="ws-paper-sub">{recurso.tipo}</span> : null}
                                {abrible && (
                                    <span className="ws-paper-open">
                                        Abrir
                                        <span aria-hidden="true">↗</span>
                                    </span>
                                )}
                            </>
                        );
                        return abrible ? (
                            <a
                                key={recurso.id}
                                className="ws-paper ws-paper-link"
                                style={{ transform: rotate }}
                                href={recurso.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                title={`Abrir ${recurso.titulo}`}
                            >
                                {inner}
                            </a>
                        ) : (
                            <div key={recurso.id} className="ws-paper" style={{ transform: rotate }}>
                                {inner}
                            </div>
                        );
                    })}
                </div>
            )}

            {!cargando && (
                <button
                    type="button"
                    className="ws-add-btn"
                    onClick={() => {
                        setModoAgregar(true);
                        setBorradores([{ nombre: '', url: '' }]);
                    }}
                >
                    <span aria-hidden="true">+</span> Agregar recurso
                </button>
            )}

            {modoAgregar && (
                <FloatingWorkWindow
                    id="recursos-agregar"
                    title={`Agregar recursos${secuenciaId ? '' : ' · ' + activity.nombre.trim()}`}
                    barColor="#F0C24E"
                    position={{ x: Math.max(6, position.x + 26), y: Math.max(6, position.y + 46) }}
                    zIndex={zIndex + 10}
                    width={300}
                    onStartDrag={onStartDrag}
                    onWindowFocus={onWindowFocus}
                    onClose={() => setModoAgregar(false)}
                >
                    {!secuenciaId && (
                        <div className="ws-add-note">
                            Se creará una nueva secuencia «Recursos — {activity.nombre.trim() || 'Actividad'}» y se
                            vinculará a esta actividad.
                        </div>
                    )}
                    {secuenciaId && (
                        <div className="ws-add-note">
                            Los recursos se añadirán a la secuencia actual de la actividad, conservando los existentes.
                        </div>
                    )}

                    {borradores.map((b, index) => (
                        <div className="ws-recurso-row" key={index}>
                            <div className="ws-recurso-head">
                                <span className="ws-recurso-num">Recurso {index + 1}</span>
                                {borradores.length > 1 && (
                                    <button
                                        type="button"
                                        className="ws-remove-recurso"
                                        onClick={() => setBorradores((prev) => prev.filter((_, i) => i !== index))}
                                        title="Quitar recurso"
                                        aria-label={`Quitar recurso ${index + 1}`}
                                    >
                                        ✕
                                    </button>
                                )}
                            </div>
                            <div>
                                <span className="ws-add-label">Nombre</span>
                                <input
                                    className="ws-field-input"
                                    type="text"
                                    placeholder="Guía de ejercicios"
                                    value={b.nombre}
                                    onChange={(e) => setBorrador(index, 'nombre', e.target.value)}
                                />
                            </div>
                            <div>
                                <span className="ws-add-label">URL / enlace</span>
                                <input
                                    className="ws-field-input"
                                    type="text"
                                    placeholder="https://..."
                                    value={b.url}
                                    onChange={(e) => setBorrador(index, 'url', e.target.value)}
                                />
                            </div>
                        </div>
                    ))}

                    <div className="ws-add-actions">
                        <button
                            type="button"
                            className="ws-btn-ghost"
                            onClick={() => setBorradores((prev) => [...prev, { nombre: '', url: '' }])}
                            disabled={guardando}
                        >
                            + Agregar otro
                        </button>
                        <button
                            type="button"
                            className="ws-add-btn"
                            onClick={handleGuardar}
                            disabled={guardando}
                        >
                            {guardando ? 'Guardando…' : 'Guardar'}
                        </button>
                        <button
                            type="button"
                            className="ws-btn-ghost"
                            onClick={() => setModoAgregar(false)}
                            disabled={guardando}
                        >
                            Cancelar
                        </button>
                    </div>
                </FloatingWorkWindow>
            )}
        </FloatingWorkWindow>
    );
};

export default React.memo(WorkspaceRecursos);