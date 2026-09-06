import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { FolderOpen } from 'lucide-react';
import { useAppStore } from '../../../store/appStore';
import type { Actividad, Secuencia } from '../../../types';
import type { SeccionSecuencia } from '../../../lib/seccionesSecuencia';
import { extraerSeccionesSecuencia } from '../../../lib/seccionesSecuencia';
import { ensureSecuenciasSeleccion, getSecuenciasSeleccion } from './WorkspaceDatos';
import './workspace.css';

interface FolderSequenceLauncherProps {
    activity: Actividad;
    onUpdateActividad: (id: number, patch: Partial<Actividad>) => void;
    seccionActiva?: SeccionSecuencia | null;
    onSeccionChange?: (s: SeccionSecuencia | null) => void;
}

// Herramienta nativa y permanente del espacio de trabajo: navegador de
// secuencias y sus secciones. Se monta DENTRO de la capa del workspace (hermana
// de la ventana "Datos de la actividad", nunca dentro de ella) y usa la MISMA
// fuente de secuencias que WorkspaceDatos: store del curso + respaldo por curso.
// No crea queries, stores ni una segunda fuente de verdad: la secuencia elegida
// se aplica con la selección existente (onUpdateActividad) y las secciones se
// derivan (solo lectura) del contenidoHtml real de la secuencia.
const FolderSequenceLauncher: React.FC<FolderSequenceLauncherProps> = ({
    activity,
    onUpdateActividad,
    seccionActiva = null,
    onSeccionChange,
}) => {
    const cursoId = activity.cursoId;
    const stateSecuencias = useAppStore((s) => s.state.secuencias);
    const [abierta, setAbierta] = useState(false);
    const [busqueda, setBusqueda] = useState('');
    const [forzarLista, setForzarLista] = useState(false);

    useEffect(() => {
        ensureSecuenciasSeleccion(cursoId, stateSecuencias);
    }, [cursoId, stateSecuencias]);

    const secuenciasDisponibles = useMemo<Secuencia[]>(
        () => getSecuenciasSeleccion(cursoId, activity.secuenciaId, stateSecuencias),
        [cursoId, activity.secuenciaId, stateSecuencias]
    );

    const secuenciaActual = useMemo<Secuencia | null>(
        () => secuenciasDisponibles.find((s) => s.id === activity.secuenciaId) ?? null,
        [secuenciasDisponibles, activity.secuenciaId]
    );

    const secciones = useMemo<SeccionSecuencia[]>(
        () => (secuenciaActual ? extraerSeccionesSecuencia(secuenciaActual.contenidoHtml) : []),
        [secuenciaActual]
    );

    const secuenciasFiltradas = useMemo<Secuencia[]>(() => {
        const q = busqueda.trim().toLocaleLowerCase();
        return q ? secuenciasDisponibles.filter((s) => s.titulo.toLocaleLowerCase().includes(q)) : secuenciasDisponibles;
    }, [secuenciasDisponibles, busqueda]);

    const seleccionarSecuencia = useCallback(
        (id: number) => {
            onUpdateActividad(activity.id, { secuenciaId: id } as unknown as Partial<Actividad>);
            onSeccionChange?.(null);
            setAbierta(false);
            setBusqueda('');
            setForzarLista(false);
        },
        [activity, onUpdateActividad, onSeccionChange]
    );

    const seleccionarSeccion = useCallback(
        (s: SeccionSecuencia) => {
            onSeccionChange?.(s);
        },
        [onSeccionChange]
    );

    const verLista = secuenciasDisponibles.length === 0 || forzarLista || busqueda.trim() !== '' || !secuenciaActual;

    return (
        <div className="ws-folder-exterior">
            <button
                type="button"
                className={abierta ? 'ws-folder-btn ws-folder-btn-open' : 'ws-folder-btn'}
                onClick={() => setAbierta((v) => !v)}
                aria-label="Abrir selector de secuencias"
                title="Abrir selector de secuencias"
                aria-expanded={abierta}
                aria-haspopup="true"
            >
                <FolderOpen size={40} strokeWidth={1.75} />
            </button>

            {abierta && (
                <div className="ws-folder-pop">
                    <input
                        type="text"
                        className="ws-folder-search"
                        value={busqueda}
                        onChange={(e) => {
                            setBusqueda(e.target.value);
                            setForzarLista(e.target.value.trim() !== '');
                        }}
                        placeholder="Buscar secuencia por nombre..."
                        aria-label="Filtrar secuencias por nombre"
                        title="Filtrar secuencias por nombre"
                        autoFocus
                    />

                    {verLista ? (
                        secuenciasFiltradas.length > 0 ? (
                            <ul className="ws-folder-list">
                                {secuenciasFiltradas.map((s) => (
                                    <li key={s.id}>
                                        <button
                                            type="button"
                                            className="ws-folder-item"
                                            onClick={() => seleccionarSecuencia(s.id)}
                                            title={s.titulo}
                                        >
                                            {s.titulo}
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="ws-folder-empty">
                                {secuenciasDisponibles.length === 0 ? 'Sin secuencias disponibles' : 'Sin coincidencias'}
                            </p>
                        )
                    ) : (
                        secuenciaActual && (
                            <div className="ws-folder-sec">
                                <div className="ws-folder-sec-head">
                                    <span className="ws-folder-sec-title" title={secuenciaActual.titulo}>
                                        Secuencia: {secuenciaActual.titulo}
                                    </span>
                                    <button
                                        type="button"
                                        className="ws-folder-cambiar"
                                        onClick={() => setForzarLista(true)}
                                        aria-label="Cambiar la secuencia seleccionada"
                                        title="Cambiar la secuencia seleccionada"
                                    >
                                        Cambiar
                                    </button>
                                </div>

                                <span className="ws-folder-sec-sel">
                                    Sección: {seccionActiva ? seccionActiva.titulo : 'Sin sección'}
                                </span>

                                {secciones.length > 0 ? (
                                    <ul className="ws-folder-sec-items">
                                        {secciones.map((s) => (
                                            <li key={s.id}>
                                                <button
                                                    type="button"
                                                    className={
                                                        seccionActiva && seccionActiva.id === s.id
                                                            ? 'ws-folder-sec-item on'
                                                            : 'ws-folder-sec-item'
                                                    }
                                                    onClick={() => seleccionarSeccion(s)}
                                                    aria-label={`Seleccionar sección ${s.titulo}`}
                                                    title={`Seleccionar sección ${s.titulo}`}
                                                    aria-pressed={!!seccionActiva && seccionActiva.id === s.id}
                                                >
                                                    <span className="ws-folder-sec-dot" aria-hidden="true" />
                                                    {s.titulo}
                                                </button>
                                            </li>
                                        ))}
                                    </ul>
                                ) : (
                                    <p className="ws-folder-empty">Sin secciones planificadas</p>
                                )}
                            </div>
                        )
                    )}
                </div>
            )}
        </div>
    );
};

export default React.memo(FolderSequenceLauncher);