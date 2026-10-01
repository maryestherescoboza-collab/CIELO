import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
    ArrowLeft,
    Cloud,
    ExternalLink,
    FolderPlus,
    Loader2,
    LogOut,
} from 'lucide-react';
import { usePortal, rutaPortal } from './portalContext';
import { ASIGNATURAS_CATALOGO, type Asignatura } from '../../constants/asignaturas';
import {
    SCOPE_LECTURA_ESTUDIANTE,
    abrirCarpetaEnDrive,
    buscarCarpetaHija,
    crearCarpetaHija,
    requestGoogleAccessToken,
    getDriveUserEmail,
    getStoredToken,
    clearStoredToken,
} from '../../lib/googleDrive';
import {
    buscarCarpeta,
    desconectarDrive,
    obtenerEstadoDrive,
    registrarCarpetaDrive,
    registrarConexionDrive,
    registrarRaizDrive,
    type EstadoDrive,
} from '../../lib/portalDriveApi';
import { mensajeDeExcepcion } from '../../lib/evidenciasApi';

/**
 * GOOGLE DRIVE del estudiante.
 *
 * Estructura objetivo, tal y como la describio el colegio:
 *
 *     Drive/
 *       CIELO/                       <- creada por CIELO la primera vez
 *         Matemática/                <- creada cuando el alumno la confirma
 *           <los archivos de sus trabajos>
 *
 * Las TRES reglas que gobiernan esta pantalla, y el motivo de cada una:
 *
 * 1. CONECTAR NO CREA NADA. Al pulsar "Conectar" solo se pide autorizacion y se
 *    guarda el email. No se toca el Drive del alumno. Crear la raiz CIELO
 *    happens en el primer "Configurar", y solo si el alumno confirmo una
 *    asignatura. Un alumno que entra a mirar y se va no encuentra un arbol de
 *    carpetas vacias en su Drive.
 *
 * 2. NADA SE IDENTIFICA POR NOMBRE. Cada carpeta se guarda con el `id` real que
 *    devuelve Google. El nombre "CIELO" solo se usa UNICA vez: en el primer
 *    arranque, para no crear una segunda carpeta raiz si el alumno ya tenia una.
 *    A partir de ahi manda el id. Si el alumno renombra, borra o duplica una
 *    carpeta, CIELO no se confunde.
 *
 * 3. EL ARCHIVO SIGUE SIENDO DEL ALUMNO. Drive es el dueno, Supabase es el
 *    indice. Conectar y configurar no da acceso a CIELO sobre nada mas.
 *
 * La lista de asignaturas sale del catalogo completo de CIELO, no de las
 * actividades del curso: el alumno organiza su Drive una vez y lo mantiene, en
 * vez de tener que rehacerlo cada periodo.
 */

const NOMBRE_CARPETA_RAIZ = 'CIELO';

type Fase = 'conectando' | 'creando' | null;

const PortalDrive: React.FC = () => {
    const { sessionToken, token } = usePortal();

    const [estado, setEstado] = useState<EstadoDrive | null>(null);
    const [cargando, setCargando] = useState(true);
    const [fase, setFase] = useState<Fase>(null);
    const [error, setError] = useState<string | null>(null);
    const [aviso, setAviso] = useState<string | null>(null);

    const cargar = useCallback(async () => {
        if (!sessionToken) return;
        setCargando(true);
        setError(null);
        try {
            setEstado(await obtenerEstadoDrive(sessionToken));
        } catch (e) {
            setError(mensajeDeExcepcion(e, 'No se pudo leer tu conexión con Drive'));
        } finally {
            setCargando(false);
        }
    }, [sessionToken]);

    useEffect(() => {
        cargar();
    }, [cargar]);

    /**
     * `conectado` en la base de datos y el token en memoria son DOS hechos
     * distintos. La fila dice "este alumno uso Drive"; la memoria dice "y el token
     * sigue vivo en esta pestana". Si la fila existe pero la memoria esta vacia
     * (recarga, pestana nueva, otro dispositivo) hay que volver a autorizar, y no
     * se puede ni leer ni crear nada hasta entonces.
     *
     * Se evalua en cada render en vez de en un useMemo: `getStoredToken()` lee
     * una variable de modulo, no un estado de React, asi que no hay dependencia
     * que declarar y un memo con `estado` como unica dependencia seria una
     * dependencias falsa. Es una lectura de un string.
     */
    const tokenEnMemoria = Boolean(getStoredToken());
    const conectadoVivo = Boolean(estado?.conectado) && tokenEnMemoria;
    const necesitaReconectar = Boolean(estado?.conectado) && !tokenEnMemoria;

    const conectar = async () => {
        setFase('conectando');
        setError(null);
        setAviso(null);
        try {
            // El MISMO cliente GIS que usa el docente, con el scope del estudiante.
            // No hay una integracion de Drive paralela en el proyecto.
            const accessToken = await requestGoogleAccessToken(SCOPE_LECTURA_ESTUDIANTE);
            const email = await getDriveUserEmail(accessToken);

            if (!sessionToken) throw new Error('Tu sesión del Portal expiró. Vuelve a entrar.');

            // p_cielo_root_id va NULL a proposito: conectar no crea la carpeta CIELO.
            // Si ya habia una raiz de una sesion anterior, se conserva.
            await registrarConexionDrive(sessionToken, email, estado?.cielo_root_id ?? null);
            await cargar();
            setAviso('Drive conectado. Ahora elige las asignaturas que quieres organizar.');
        } catch (e) {
            setError(mensajeDeExcepcion(e, 'No se pudo conectar Google Drive'));
        } finally {
            setFase(null);
        }
    };

    /**
     * Configurar una asignatura. Es el UNICO punto donde se crea estructura, y solo
     * porque el alumno pulso este boton.
     */
    const configurar = async (asignatura: Asignatura) => {
        if (!sessionToken) return;
        setFase('creando');
        setError(null);
        setAviso(null);

        try {
            const accessToken = getStoredToken();
            if (!accessToken) throw new Error('Vuelve a conectar Drive para continuar.');

            // --- La raiz CIELO, solo la primera vez ------------------------------
            // Si ya tenemos su id guardado, se usa y punto: no se vuelve a buscar
            // por nombre ni a crear nada.
            let rootId = estado?.cielo_root_id ?? null;

            if (!rootId) {
                // primera vez: buscar por nombre para no duplicar la que el alumno
                // pueda tener, y crearla si de verdad no existe.
                const existente = await buscarCarpetaHija(accessToken, 'root', NOMBRE_CARPETA_RAIZ);
                if (existente) {
                    rootId = existente;
                } else {
                    rootId = await crearCarpetaHija(accessToken, 'root', NOMBRE_CARPETA_RAIZ);
                }
                await registrarRaizDrive(sessionToken, rootId);
            }

            // --- La carpeta de la asignatura ------------------------------------
            // Idempotente por construccion: si ya estaba configurada, se enlaza la
            // que el alumno acaba de confirmar y no se crea una segunda.
            const yaConfigurada = estado ? buscarCarpeta(estado, asignatura.id) : undefined;
            if (yaConfigurada) {
                await registrarCarpetaDrive(
                    sessionToken,
                    asignatura.id,
                    asignatura.nombre,
                    yaConfigurada.drive_folder_id,
                    yaConfigurada.creado_en_drive,
                );
                setAviso(`${asignatura.nombre} ya estaba configurada.`);
                await cargar();
                return;
            }

            const carpetaId = await crearCarpetaHija(accessToken, rootId, asignatura.nombre);
            await registrarCarpetaDrive(sessionToken, asignatura.id, asignatura.nombre, carpetaId, true);
            await cargar();
            setAviso(`Carpeta ${NOMBRE_CARPETA_RAIZ}/${asignatura.nombre} lista en tu Drive.`);
        } catch (e) {
            setError(mensajeDeExcepcion(e, `No se pudo configurar ${asignatura.nombre}`));
        } finally {
            setFase(null);
        }
    };

    const desconectar = async () => {
        if (!sessionToken) return;
        setFase('conectando');
        try {
            // Suelta la referencia del Portal. No se borra ni una carpeta del Drive:
            // el arbol es del alumno.
            await desconectarDrive(sessionToken);
            clearStoredToken();
            setEstado({ conectado: false, email: null, cielo_root_id: null, carpetas: [] });
            setAviso('Desconectado. Tus carpetas siguen intactas en tu Drive.');
        } catch (e) {
            setError(mensajeDeExcepcion(e, 'No se pudo desconectar Drive'));
        } finally {
            setFase(null);
        }
    };

    const pendientes = useMemo(
        () => (estado ? ASIGNATURAS_CATALOGO.filter(a => !buscarCarpeta(estado, a.id)) : []),
        [estado]
    );
    const configuradas = estado?.carpetas ?? [];

    return (
        <div className="pt-2 px-5 pb-10">
            <div className="flex items-start gap-3 mb-5">
                <Link
                    to={rutaPortal(token, 'portafolio')}
                    aria-label="Volver al Portafolio"
                    className="flex-none w-9 h-9 rounded-full border border-[#D8D7E0] flex items-center justify-center text-[#4E5566] hover:bg-[#F1F1EC]"
                >
                    <ArrowLeft size={15} />
                </Link>
                <div className="min-w-0 flex-1">
                    <h1 className="text-xl font-black text-[#1B1F2A] tracking-tight">Google Drive</h1>
                    <p className="text-xs text-[#767a76] mt-1">
                        Tus trabajos se guardan en tu Drive. CIELO solo guarda la referencia.
                    </p>
                </div>
            </div>

            {cargando ? (
                <div className="flex justify-center py-16">
                    <Loader2 className="animate-spin text-[#1B1F2A]" size={26} />
                </div>
            ) : !estado?.conectado ? (
                <section className="border border-[#E4E3EC] rounded-2xl p-5">
                    <Cloud size={22} strokeWidth={1.5} className="text-[#1B1F2A] mb-3" />
                    <h2 className="text-sm font-black text-[#1B1F2A]">Conecta tu Google Drive</h2>
                    <p className="text-xs text-[#4E5566] mt-2 leading-relaxed">
                        Vas a autorizar a CIELO para ver y organizar los archivos de tu Drive. Al conectar
                        no se crea nada: las carpetas se crean cuando elijas una asignatura.
                    </p>
                    <button
                        onClick={conectar}
                        disabled={fase !== null}
                        className="mt-4 w-full h-11 rounded-full bg-[#1B1F2A] text-white text-xs font-bold hover:opacity-90 active:scale-[0.99] transition-all disabled:opacity-50"
                    >
                        {fase === 'conectando' ? (
                            <span className="flex items-center justify-center gap-2">
                                <Loader2 size={14} className="animate-spin" /> Conectando...
                            </span>
                        ) : (
                            'Conectar Google Drive'
                        )}
                    </button>
                    <p className="text-[10px] text-[#767a76] mt-3 leading-relaxed">
                        CIELO no guarda tu contraseña ni tu token. Solo los mantenemos mientras esta
                        pestaña esté abierta.
                    </p>
                </section>
            ) : (
                <>
                    <section className="flex items-center justify-between gap-3 border border-[#E4E3EC] rounded-2xl px-4 py-3">
                        <div className="min-w-0">
                            <p className="text-xs font-black text-[#1B1F2A] truncate">{estado.email}</p>
                            <p className="text-[10px] text-[#767a76] mt-0.5">
                                {conectadoVivo
                                    ? `${configuradas.length} asignatura${configuradas.length === 1 ? '' : 's'} configurada${configuradas.length === 1 ? '' : 's'}`
                                    : 'Reconecta para continuar'}
                            </p>
                        </div>
                        <button
                            onClick={desconectar}
                            disabled={fase !== null}
                            aria-label="Desconectar Google Drive"
                            className="flex-none w-8 h-8 rounded-full border border-[#D8D7E0] flex items-center justify-center text-[#4E5566] hover:bg-[#FDECEA] hover:text-[#C0392B] disabled:opacity-40"
                        >
                            <LogOut size={13} />
                        </button>
                    </section>

                    {necesitaReconectar ? (
                        <section className="mt-3 p-4 bg-[#FDF6E3] border border-[#EBD9A6] rounded-2xl">
                            <p className="text-xs font-bold text-[#8A6D1F]">
                                Tu sesion de Drive expiro al recargar la pagina.
                            </p>
                            <button
                                onClick={conectar}
                                disabled={fase !== null}
                                className="mt-3 h-9 px-4 rounded-full bg-[#1B1F2A] text-white text-[11px] font-bold hover:opacity-90 disabled:opacity-50"
                            >
                                Volver a autorizar
                            </button>
                        </section>
                    ) : null}

                    {configuradas.length > 0 ? (
                        <section className="mt-5">
                            <h2 className="text-xs font-black text-[#767a76] uppercase tracking-wide mb-2.5">
                                Tus carpetas
                            </h2>
                            <div className="space-y-2">
                                {configuradas.map(c => (
                                    <div
                                        key={c.id}
                                        className="flex items-center gap-3 border border-[#E4E3EC] rounded-2xl px-4 py-3"
                                    >
                                        <div className="min-w-0 flex-1">
                                            <p className="text-xs font-bold text-[#1B1F2A] truncate">
                                                {c.asignatura_nombre}
                                            </p>
                                            <p className="text-[10px] text-[#767a76] mt-0.5">
                                                {NOMBRE_CARPETA_RAIZ}/{c.asignatura_nombre}
                                                {c.creado_en_drive ? '' : ' - ya existia'}
                                            </p>
                                        </div>
                                        <a
                                            href={abrirCarpetaEnDrive(c.drive_folder_id)}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            aria-label={`Abrir ${c.asignatura_nombre} en Drive`}
                                            className="flex-none w-8 h-8 rounded-full border border-[#D8D7E0] flex items-center justify-center text-[#4E5566] hover:bg-[#F1F1EC]"
                                        >
                                            <ExternalLink size={12} />
                                        </a>
                                    </div>
                                ))}
                            </div>
                        </section>
                    ) : null}

                    <section className="mt-6">
                        <h2 className="text-xs font-black text-[#767a76] uppercase tracking-wide mb-1">
                            Asignaturas
                        </h2>
                        <p className="text-[11px] text-[#767a76] mb-3 leading-relaxed">
                            {conectadoVivo
                                ? 'Elige las que quieres organizar. Al hacerlo se crea la carpeta en tu Drive.'
                                : 'Necesitas volver a autorizar antes de crear carpetas.'}
                        </p>

                        <div className="space-y-1.5">
                            {ASIGNATURAS_CATALOGO.map(a => {
                                const carpeta = buscarCarpeta(estado, a.id);
                                return (
                                    <div
                                        key={a.id}
                                        className="flex items-center gap-3 border border-[#E4E3EC] rounded-2xl px-4 py-2.5"
                                    >
                                        <div className="min-w-0 flex-1">
                                            <p className="text-xs font-bold text-[#1B1F2A] truncate">
                                                {a.nombre}
                                            </p>
                                        </div>
                                        {carpeta ? (
                                            <span className="text-[10px] font-bold text-[#4E5566] flex-none">
                                                Lista
                                            </span>
                                        ) : (
                                            <button
                                                onClick={() => configurar(a)}
                                                disabled={!conectadoVivo || fase !== null}
                                                aria-label={`Configurar ${a.nombre}`}
                                                className="flex-none h-8 px-3 rounded-full border border-[#D8D7E0] flex items-center gap-1 text-[10px] font-bold text-[#4E5566] hover:bg-[#F1F1EC] disabled:opacity-40"
                                            >
                                                {fase === 'creando' ? (
                                                    <Loader2 size={11} className="animate-spin" />
                                                ) : (
                                                    <>
                                                        <FolderPlus size={11} /> Crear
                                                    </>
                                                )}
                                            </button>
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        {pendientes.length === 0 ? (
                            <p className="text-[11px] text-[#767a76] mt-3 text-center">
                            Todas las asignaturas del catalogo estan configuradas.
                            </p>
                        ) : null}
                    </section>
                </>
            )}

            {aviso ? (
                <p className="mt-4 text-[11px] font-bold text-[#4E5566] bg-[#F1F1EC] rounded-xl px-3 py-2">
                    {aviso}
                </p>
            ) : null}
            {error ? (
                <p className="mt-4 text-[11px] font-bold text-[#C0392B] bg-[#FDECEA] border border-[#F5C6C0] rounded-xl px-3 py-2">
                    {error}
                </p>
            ) : null}
        </div>
    );
};

export default PortalDrive;
