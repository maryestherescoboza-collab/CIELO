import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Upload, X, FileUp, Loader2, Cloud, CloudOff } from 'lucide-react';
import { evidenciasApiPortal } from '../../lib/evidenciasApi';
import { descriptorEvidencia, tamanoLegible, mensajeDeExcepcion } from '../../lib/evidenciasApi';
import { buscarCarpeta, obtenerEstadoDrive, type EstadoDrive } from '../../lib/portalDriveApi';
import { rutaPortal } from './portalContext';
import type { ActividadParaEvidencia } from '../../types/evidencias';
import { useGooglePicker, type PickerResult } from '../../hooks/useGooglePicker';
import { requestGoogleAccessToken } from '../../lib/googleDrive';

/**
 * "Agregar evidencia" del Portal del estudiante.
 *
 * DOS ORIGENES, y la eleccion es del alumno:
 *
 *   · MI ARCHIVO  Sube una copia a CIELO Storage. Util cuando el trabajo aun no
 *                esta en Drive o cuando quiere adjuntar algo que no va a guardar.
 *   · GOOGLE DRIVE NO sube nada. Enlaza un archivo que YA esta en una carpeta
 *                `CIELO/<Asignatura>` del Drive del alumno y guarda la referencia.
 *                El archivo no se duplica ni se copia: sigue siendo suyo y lo
 *                sigue viendo en su Drive. Esta es la via recomendada, porque el
 *                Archivo no acaba en dos sitios.
 *
 * Google Drive no se ofrece si el alumno no lo ha conectado antes, y se explica
 * por que con un enlace a la configuracion en vez de dejar un boton que no hace
 * nada. Tampoco se listan archivos si el token no esta vivo en esta pestana: el
 * listado de una carpeta necesita autorizacion, y sin token no habria nada que
 * mostrar.
 *
 * La actividad se elige SIEMPRE de la lista que devuelve la RPC. No hay campo
 * libre: el estudiante no puede colgar su trabajo de una actividad de otro curso
 * ni inventar una que su docente no creo.
 */

const MAX_MB = 25;

type Origen = 'storage' | 'drive';

interface Props {
    sessionToken: string;
    /** Acceso del portal, solo para el enlace a la configuracion de Drive. */
    token: string;
    actividades: ActividadParaEvidencia[];
    actividadInicial?: number | null;
    onCerrar: () => void;
    onGuardada: () => void;
}

const PortalEvidenciaForm: React.FC<Props> = ({
    sessionToken,
    token,
    actividades,
    actividadInicial,
    onCerrar,
    onGuardada,
}) => {
    const [actividadId, setActividadId] = useState<number | null>(actividadInicial ?? null);
    const [origen, setOrigen] = useState<Origen>('storage');
    const [nombre, setNombre] = useState('');
    const [archivo, setArchivo] = useState<File | null>(null);
    const [arrastrando, setArrastrando] = useState(false);
    const [guardando, setGuardando] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // --- Estado de Drive dentro del formulario --------------------------------
    const [drive, setDrive] = useState<EstadoDrive | null>(null);
    const [carpetaElegida, setCarpetaElegida] = useState<string | null>(null);
    const [elegido, setElegido] = useState<PickerResult | null>(null);

    const { openPicker } = useGooglePicker();

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && !guardando) onCerrar();
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onCerrar, guardando]);

    useEffect(() => {
        obtenerEstadoDrive(sessionToken)
            .then(setDrive)
            .catch(() => setDrive(null));
    }, [sessionToken]);

    const carpeta = useMemo(
        () => (drive && carpetaElegida ? buscarCarpeta(drive, carpetaElegida) ?? null : null),
        [drive, carpetaElegida]
    );

    const actividad = actividades.find(a => a.actividad_id === actividadId) ?? null;

    useEffect(() => {
        if (actividad?.asignatura && drive?.carpetas) {
            const carpetaAuto = drive.carpetas.find(c => c.asignatura === actividad.asignatura || c.asignatura_nombre === actividad.asignatura);
            if (carpetaAuto) {
                setCarpetaElegida(carpetaAuto.asignatura);
            }
        }
    }, [actividad, drive]);

    /**
     * Lanzar el Google Picker
     */
    const abrirPicker = (asignatura: string) => {
        setError(null);
        setCarpetaElegida(asignatura);

        const destino = drive ? buscarCarpeta(drive, asignatura) : undefined;
        openPicker(
            destino?.drive_folder_id ?? null,
            (file) => {
                seleccionarDrive(file);
            },
            (err) => {
                setError(err);
            }
        );
    };

    const desc = descriptorEvidencia(archivo?.type ?? null, archivo?.name ?? null);
    const descDrive = descriptorEvidencia(elegido?.mimeType ?? null, elegido?.name ?? null);

    const seleccionar = (file: File | null) => {
        setError(null);
        setElegido(null);
        if (!file) return;
        if (file.size > MAX_MB * 1024 * 1024) {
            setError(`El archivo pesa mas de ${MAX_MB} MB.`);
            return;
        }
        setArchivo(file);
        if (!nombre.trim()) setNombre(file.name.replace(/\.[^.]+$/, ''));
    };

    const seleccionarDrive = (a: PickerResult) => {
        setError(null);
        setArchivo(null);
        setElegido(a);
        if (!nombre.trim()) setNombre(a.name.replace(/\.[^.]+$/, ''));
    };

    const puedeGuardar =
        Boolean(actividadId && nombre.trim() && (origen === 'storage' ? archivo : elegido)) && !guardando;

    const guardar = async () => {
        if (!puedeGuardar || !actividadId) return;
        setGuardando(true);
        setError(null);
        try {
            if (origen === 'storage' && archivo) {
                await evidenciasApiPortal.crear(sessionToken, {
                    actividadId,
                    nombre: nombre.trim(),
                    archivo,
                });
            } else if (origen === 'drive' && elegido) {
                await evidenciasApiPortal.crearDesdeDrive(sessionToken, {
                    actividadId,
                    nombre: nombre.trim(),
                    driveFileId: elegido.id,
                    driveUrl: elegido.url,
                    mimeType: elegido.mimeType,
                    tamanoBytes: null, // Picker usually doesn't return exact size bytes easily without another API call
                    thumbnailUrl: elegido.thumbnailUrl ?? null,
                    driveCarpetaId: carpeta?.id ?? null,
                });
            }
            onGuardada();
        } catch (e) {
            setError(mensajeDeExcepcion(e, 'No se pudo guardar la evidencia'));
            setGuardando(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 px-0 sm:px-6">
            <div className="w-full sm:max-w-lg bg-white rounded-t-3xl sm:rounded-3xl border border-[#E4E3EC] p-6 sm:p-7 max-h-[90vh] overflow-y-auto">
                <div className="flex items-start justify-between gap-4 mb-6">
                    <div>
                        <h2 className="text-lg font-black text-[#1B1F2A] tracking-tight">Agregar evidencia</h2>
                        <p className="text-xs text-[#767a76] mt-1">Tu trabajo se guarda en tu Portafolio.</p>
                    </div>
                    <button
                        onClick={onCerrar}
                        disabled={guardando}
                        aria-label="Cerrar"
                        className="w-8 h-8 rounded-full border border-[#E4E3EC] flex items-center justify-center text-[#4E5566] hover:bg-[#F1F1EC] disabled:opacity-40"
                    >
                        <X size={16} />
                    </button>
                </div>

                <label className="block mb-5">
                    <span className="block text-[11px] font-bold uppercase tracking-widest text-[#767a76] mb-2">
                        Actividad o ficha
                    </span>
                    <select
                        value={actividadId ?? ''}
                        onChange={(e) => setActividadId(e.target.value ? Number(e.target.value) : null)}
                        className="w-full h-11 px-3 rounded-xl border border-[#D8D7E0] bg-white text-sm text-[#1B1F2A] focus:border-[#1B1F2A] focus:outline-none"
                    >
                        <option value="">Selecciona una actividad...</option>
                        {actividades.map((a) => (
                            <option key={a.actividad_id} value={a.actividad_id}>
                                {a.actividad}
                                {a.ficha ? ` - ${a.ficha}` : ''}
                                {a.fecha ? ` (${new Date(a.fecha).toLocaleDateString('es')})` : ''}
                            </option>
                        ))}
                    </select>
                    {actividad?.asignatura ? (
                        <span className="block text-[11px] text-[#767a76] mt-1.5">
                            {actividad.asignatura}
                            {actividad.evidencias > 0
                                ? ` - ya tienes ${actividad.evidencias} evidencia${actividad.evidencias > 1 ? 's' : ''} aqui`
                                : ''}
                        </span>
                    ) : null}
                </label>

                <label className="block mb-5">
                    <span className="block text-[11px] font-bold uppercase tracking-widest text-[#767a76] mb-2">
                        Nombre de la evidencia
                    </span>
                    <input
                        value={nombre}
                        onChange={(e) => setNombre(e.target.value)}
                        maxLength={120}
                        placeholder="Por ejemplo: Mi maqueta del sistema solar"
                        className="w-full h-11 px-3 rounded-xl border border-[#D8D7E0] text-sm placeholder:text-[#A8A9B0] focus:border-[#1B1F2A] focus:outline-none"
                    />
                </label>

                {/* Origen. Solo se muestra Drive si hay una conexion en la base; la
                    conexion viva en la memoria se comprueba al listar, y si no esta
                    el propio selector lo explica. */}
                <div className="mb-5">
                    <span className="block text-[11px] font-bold uppercase tracking-widest text-[#767a76] mb-2">
                        De donde
                    </span>
                    <div className="flex gap-2">
                        {([
                            { k: 'storage' as const, label: 'Mi archivo', icono: Upload },
                            ...(drive?.conectado
                                ? [{ k: 'drive' as const, label: 'Google Drive', icono: Cloud }]
                                : []),
                        ]).map(o => {
                            const Icono = o.icono;
                            const activo = origen === o.k;
                            return (
                                <button
                                    key={o.k}
                                    type="button"
                                    onClick={() => setOrigen(o.k)}
                                    className={`flex-1 h-10 px-3 rounded-full border text-xs font-bold flex items-center justify-center gap-1.5 transition-colors ${
                                        activo
                                            ? 'bg-[#1B1F2A] text-white border-[#1B1F2A]'
                                            : 'bg-white text-[#4E5566] border-[#D8D7E0] hover:bg-[#F1F1EC]'
                                    }`}
                                >
                                    <Icono size={13} /> {o.label}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {origen === 'storage' ? (
                <div className="mb-5">
                    <span className="block text-[11px] font-bold uppercase tracking-widest text-[#767a76] mb-2">Archivo</span>
                    {!archivo ? (
                        <button
                            type="button"
                            onClick={() => inputRef.current?.click()}
                            onDragOver={(e) => { e.preventDefault(); setArrastrando(true); }}
                            onDragLeave={() => setArrastrando(false)}
                            onDrop={(e) => {
                                e.preventDefault();
                                setArrastrando(false);
                                seleccionar(e.dataTransfer.files?.[0] ?? null);
                            }}
                            className={`w-full rounded-2xl border-2 border-dashed py-8 flex flex-col items-center gap-2 transition-colors ${
                                arrastrando ? 'border-[#1B1F2A] bg-[#F1F1EC]' : 'border-[#D8D7E0] hover:bg-[#FAFAF7]'
                            }`}
                        >
                            <Upload size={22} strokeWidth={1.5} className="text-[#4E5566]" />
                            <span className="text-sm font-bold text-[#1B1F2A]">Elige o arrastra tu archivo</span>
                            <span className="text-[11px] text-[#767a76]">Hasta {MAX_MB} MB</span>
                        </button>
                    ) : null}
                    <input
                        ref={inputRef}
                        type="file"
                        className="hidden"
                        onChange={(e) => seleccionar(e.target.files?.[0] ?? null)}
                    />
                </div>
                ) : (
                /* Drive: se elige la carpeta y luego el archivo. La carpeta se elige
                   de las ya configuradas, que son las unicas que tienen un id real
                   guardado; no se escribe ningun nombre de carpeta a mano. */
                <div className="mb-5">
                    <label className="block mb-4">
                        <span className="block text-[11px] font-bold uppercase tracking-widest text-[#767a76] mb-2">
                            Carpeta de Drive
                        </span>
                        <select
                            value={carpetaElegida ?? ''}
                            onChange={(e) => setCarpetaElegida(e.target.value || null)}
                            className="w-full h-11 px-3 rounded-xl border border-[#D8D7E0] bg-white text-sm text-[#1B1F2A] focus:border-[#1B1F2A] focus:outline-none"
                        >
                            <option value="">Seleccionar de todo mi Drive...</option>
                            {(drive?.carpetas ?? []).map(c => (
                                <option key={c.id} value={c.asignatura}>
                                    CIELO/{c.asignatura_nombre}
                                </option>
                            ))}
                        </select>
                    </label>

                    <button
                        type="button"
                        onClick={() => abrirPicker(carpetaElegida ?? '')}
                        className="w-full flex items-center justify-center gap-2 h-11 rounded-xl bg-[#1B1F2A] text-white text-sm font-bold hover:bg-[#2A2F3D] transition-colors"
                    >
                        <Cloud size={16} /> Seleccionar archivo de Drive
                    </button>
                    <p className="mt-2 text-[11px] text-[#767a76] text-center">
                        Se abrirá una ventana segura de Google para elegir tu archivo.
                    </p>
                </div>
                )}

                {/* El resumen del archivo cambia segun el origen, pero el campo de
                    nombre es el mismo: el alumno siempre puede renombrarlo. */}
                {(origen === 'storage' ? archivo : elegido) ? (
                    <div className="flex items-center gap-3 rounded-2xl border border-[#E4E3EC] bg-[#FAFAF7] p-3 mb-5">
                        <div className="w-11 h-11 rounded-xl bg-white border border-[#E4E3EC] flex items-center justify-center text-[#4E5566] shrink-0">
                            {origen === 'drive' ? <Cloud size={18} strokeWidth={1.5} /> : <FileUp size={18} strokeWidth={1.5} />}
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="text-sm font-bold text-[#1B1F2A] truncate">
                                {origen === 'drive' ? elegido?.name : archivo?.name}
                            </p>
                            <p className="text-[11px] text-[#767a76]">
                                {origen === 'drive' ? (
                                    <>
                                        {descDrive.etiqueta} - en tu Drive
                                        {carpeta ? ` - CIELO/${carpeta.asignatura_nombre}` : ''}
                                    </>
                                ) : (
                                    <>
                                        {desc.etiqueta}
                                        {archivo && tamanoLegible(archivo.size) ? ` - ${tamanoLegible(archivo.size)}` : ''}
                                    </>
                                )}
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={() => {
                                setArchivo(null);
                                setElegido(null);
                            }}
                            disabled={guardando}
                            aria-label="Quitar archivo"
                            className="w-8 h-8 rounded-full border border-[#E4E3EC] bg-white flex items-center justify-center text-[#4E5566] hover:bg-[#F1F1EC] disabled:opacity-40"
                        >
                            <X size={14} />
                        </button>
                    </div>
                ) : null}

                {origen === 'drive' && !drive?.conectado ? (
                    <p className="text-[11px] text-[#767a76] mb-5 flex items-center gap-1.5">
                        <CloudOff size={12} />
                        Conecta Drive para elegir archivos.{' '}
                        <Link to={rutaPortal(token, 'drive')} className="font-bold text-[#1B1F2A] underline">
                            Ir a Google Drive
                        </Link>
                    </p>
                ) : null}

                {error === 'SESSION_EXPIRED' ? (
                    <div className="mb-5 text-center bg-[#FDECEA] border border-[#F5C6C0] rounded-xl px-4 py-4">
                        <p className="text-xs font-bold text-[#C0392B] mb-3">Tu sesión de Drive expiró al recargar la página.</p>
                        <button
                            type="button"
                            onClick={async () => {
                                setError(null);
                                try {
                                    await requestGoogleAccessToken();
                                    abrirPicker(carpetaElegida ?? '');
                                } catch (e: any) {
                                    setError(e.message || 'Error al autorizar.');
                                }
                            }}
                            className="inline-block px-4 py-2 bg-[#C0392B] text-white text-xs font-bold rounded-full hover:bg-opacity-90 transition-colors"
                        >
                            Volver a autorizar
                        </button>
                    </div>
                ) : error ? (
                    <p className="text-xs font-bold text-[#C0392B] bg-[#FDECEA] border border-[#F5C6C0] rounded-xl px-3 py-2.5 mb-5">
                        {error}
                    </p>
                ) : null}

                <div className="flex gap-3">
                    <button
                        type="button"
                        onClick={onCerrar}
                        disabled={guardando}
                        className="flex-1 h-11 rounded-full border border-[#D8D7E0] text-sm font-bold text-[#4E5566] hover:bg-[#F1F1EC] disabled:opacity-40"
                    >
                        Cancelar
                    </button>
                    <button
                        type="button"
                        onClick={guardar}
                        disabled={!puedeGuardar}
                        className="flex-1 h-11 rounded-full bg-[#1B1F2A] text-white text-sm font-bold hover:opacity-90 disabled:opacity-30 flex items-center justify-center gap-2"
                    >
                        {guardando ? <Loader2 size={15} className="animate-spin" /> : null}
                        {guardando ? 'Guardando' : 'Guardar evidencia'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PortalEvidenciaForm;
