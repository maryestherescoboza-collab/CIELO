import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Loader2, FolderOpen, Trash2, ExternalLink, Stamp, Cloud } from 'lucide-react';
import { usePortal, rutaPortal } from './portalContext';
import { evidenciasApiPortal, resolverUrls, tamanoLegible, mensajeDeExcepcion } from '../../lib/evidenciasApi';
import { obtenerEstadoDrive, type EstadoDrive } from '../../lib/portalDriveApi';
import { selloPorValor } from '../../constants/sellos';
import EvidenciaThumbnail from '../../components/evidencias/EvidenciaThumbnail';
import PortalEvidenciaForm from './PortalEvidenciaForm';
import type { ActividadParaEvidencia, EvidenciaPortafolio } from '../../types/evidencias';

/**
 * PORTAFOLIO del estudiante.
 *
 * Unico lugar del Portal donde el alumno entrega su trabajo. Responde a "quiero
 * mostrar y entregar lo que hice", asi que se organiza por donde esta el trabajo
 * (actividad/ficha) y no por la materia ni por el periodo: el alumno no razona
 * en asignaturas, razona en tareas.
 *
 * La agrupacion es la misma que la de la bandeja docente invertida: alli se ve
 * una actividad con todos los alumnos, aqui se ve una actividad con todos los
 * archivos del alumno. Se apoya en `actividad_id` + `plan_ficha_id`, que ya
 * existen en `actividades`.
 */

type Filtro = 'todas' | 'pendiente' | 'revisada';

const PortalPortafolio: React.FC = () => {
    const { sessionToken, token } = usePortal();
    const navigate = useNavigate();

    const [evidencias, setEvidencias] = useState<EvidenciaPortafolio[]>([]);
    const [actividades, setActividades] = useState<ActividadParaEvidencia[]>([]);
    const [urls, setUrls] = useState<Map<number, string>>(new Map());
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [filtro, setFiltro] = useState<Filtro>('todas');
    const [formAbierto, setFormAbierto] = useState(false);
    const [actividadInicial, setActividadInicial] = useState<number | null>(null);
    const [borrando, setBorrando] = useState<number | null>(null);
    const [drive, setDrive] = useState<EstadoDrive | null>(null);

    const cargar = useCallback(async () => {
        if (!sessionToken) return;
        setLoading(true);
        setError(null);
        try {
            const [evs, acts, estadoDrive] = await Promise.all([
                evidenciasApiPortal.listar(sessionToken),
                evidenciasApiPortal.listarActividades(sessionToken),
                // La tarjeta de Drive es informativa: si esta RPC falla (por
                // ejemplo, porque la migracion de Drive todavia no esta aplicada)
                // no debe tumbar el Portafolio entero, que ya tiene su contenido.
                obtenerEstadoDrive(sessionToken).catch(() => null),
            ]);
            setEvidencias(evs);
            setActividades(acts);
            setDrive(estadoDrive);
            setUrls(await resolverUrls(evs));
        } catch (e) {
            setError(mensajeDeExcepcion(e, 'No se pudo cargar tu portafolio'));
        } finally {
            setLoading(false);
        }
    }, [sessionToken]);

    useEffect(() => {
        cargar();
    }, [cargar]);

    const visibles = useMemo(
        () => (filtro === 'todas' ? evidencias : evidencias.filter(e => e.estado === filtro)),
        [evidencias, filtro]
    );

    /**
     * Una fila por actividad. Si la actividad quedo borrada del lado del docente
     * la evidencia sigue existiendo, asi que el grupo cae al id de actividad y
     * no se pierde el archivo del alumno.
     */
    const grupos = useMemo(() => {
        const porActividad = new Map<number, EvidenciaPortafolio[]>();
        for (const ev of visibles) {
            const lista = porActividad.get(ev.actividad_id) ?? [];
            lista.push(ev);
            porActividad.set(ev.actividad_id, lista);
        }
        return Array.from(porActividad.entries())
            .map(([actividadId, items]) => {
                const meta =
                    actividades.find(a => a.actividad_id === actividadId) ??
                    ({
                        actividad_id: actividadId,
                        actividad: items[0].actividad,
                        ficha: items[0].ficha,
                        fecha: items[0].actividad_fecha,
                        asignatura: items[0].asignatura,
                        periodo: items[0].periodo,
                        evidencias: items.length,
                    } as ActividadParaEvidencia);
                return { meta, items };
            })
            .sort((a, b) => {
                const fa = a.meta.fecha ? new Date(a.meta.fecha).getTime() : 0;
                const fb = b.meta.fecha ? new Date(b.meta.fecha).getTime() : 0;
                return fb - fa;
            });
    }, [visibles, actividades]);

    const abrirForm = (actividadId?: number) => {
        setActividadInicial(actividadId ?? null);
        setFormAbierto(true);
    };

    const retirar = async (id: number) => {
        if (!sessionToken) return;
        setBorrando(id);
        try {
            await evidenciasApiPortal.eliminar(sessionToken, id);
            await cargar();
        } catch (e) {
            setError(mensajeDeExcepcion(e, 'No se pudo retirar la evidencia'));
        } finally {
            setBorrando(null);
        }
    };

    const pendientes = evidencias.filter(e => e.estado === 'pendiente').length;

    return (
        <div className="pt-2 px-5 pb-10 max-w-5xl mx-auto">
            <div className="flex items-start justify-between gap-4 mb-5">
                <div>
                    <h1 className="text-xl font-black text-[#1B1F2A] tracking-tight">Portafolio</h1>
                    <p className="text-xs text-[#767a76] mt-1">
                        {evidencias.length === 0
                            ? 'Aun no has entregado evidencias.'
                            : `${evidencias.length} evidencia${evidencias.length === 1 ? '' : 's'}${pendientes > 0 ? ` - ${pendientes} por revisar` : ''}`}
                    </p>
                </div>
                <button
                    onClick={() => abrirForm()}
                    className="flex-none flex items-center gap-1.5 h-10 px-4 rounded-full bg-[#1B1F2A] text-white text-xs font-bold hover:opacity-90 active:scale-95 transition-all"
                >
                    <Plus size={15} /> Agregar evidencia
                </button>
            </div>

            {/*
              Tarjeta de Drive. Es la unica puerta a la configuracion de Drive y
              su unica razon de estar en el Portafolio: el Portafolio es donde vive
              el trabajo del alumno, y Drive es donde esta guardado. Deliberadamente
              NO es un quinto boton de la barra inferior, que ya tiene cuatro.
            */}
            {drive ? (
                <button
                    onClick={() => navigate(rutaPortal(token, 'drive'))}
                    className="w-full flex items-center gap-3 text-left border border-[#E4E3EC] rounded-2xl px-4 py-3 mb-4 hover:bg-[#FAFAF7] active:scale-[0.995] transition-all"
                >
                    <Cloud size={18} strokeWidth={1.6} className="flex-none text-[#1B1F2A]" />
                    <div className="min-w-0 flex-1">
                        <p className="text-xs font-black text-[#1B1F2A]">
                            {drive.conectado ? 'Google Drive conectado' : 'Conectar Google Drive'}
                        </p>
                        <p className="text-[10px] text-[#767a76] mt-0.5 truncate">
                            {drive.conectado
                                ? drive.carpetas.length === 0
                                    ? 'Organiza tus carpetas por asignatura'
                                    : `${drive.carpetas.length} carpeta${drive.carpetas.length === 1 ? '' : 's'} lista${drive.carpetas.length === 1 ? '' : 's'}`
                                : 'Guarda tus trabajos en tu Drive'}
                        </p>
                    </div>
                    <ExternalLink size={13} className="flex-none text-[#A8A9B0]" />
                </button>
            ) : null}

            <div className="flex gap-2 overflow-x-auto custom-scrollbar -mx-1 px-1 py-1 mb-5">
                {([
                    { k: 'todas', label: 'Todas' },
                    { k: 'pendiente', label: 'Por revisar' },
                    { k: 'revisada', label: 'Revisadas' },
                ] as const).map(f => (
                    <button
                        key={f.k}
                        onClick={() => setFiltro(f.k)}
                        className={`flex-none px-3.5 py-1.5 rounded-full border text-xs font-bold transition-colors ${
                            filtro === f.k
                                ? 'bg-[#1B1F2A] text-white border-[#1B1F2A]'
                                : 'bg-white text-[#4E5566] border-[#D8D7E0] hover:bg-[#F1F1EC]'
                        }`}
                    >
                        {f.label}
                    </button>
                ))}
            </div>

            {loading ? (
                <div className="flex justify-center py-16">
                    <Loader2 className="animate-spin text-[#1B1F2A]" size={26} />
                </div>
            ) : error && evidencias.length === 0 ? (
                <div className="p-4 bg-[#FDECEA] border border-[#F5C6C0] rounded-2xl text-center">
                    <p className="text-[#C0392B] text-xs font-bold">{error}</p>
                </div>
            ) : grupos.length === 0 ? (
                <div className="text-center py-14 border border-dashed border-[#D8D7E0] rounded-2xl bg-white">
                    <FolderOpen size={26} strokeWidth={1.5} className="mx-auto text-[#A8A9B0] mb-3" />
                    <p className="text-sm font-bold text-[#1B1F2A]">No hay evidencias aqui</p>
                    <p className="text-xs text-[#767a76] mt-1">
                        {filtro === 'todas'
                            ? 'Agrega tu primera evidencia para empezar tu Portafolio.'
                            : 'Prueba con otro filtro.'}
                    </p>
                </div>
            ) : (
                <div className="space-y-6">
                    {grupos.map(({ meta, items }) => (
                        <section key={meta.actividad_id}>
                            <div className="flex items-baseline justify-between gap-3 mb-3">
                                <div className="min-w-0">
                                    <h2 className="text-sm font-black text-[#1B1F2A] truncate">{meta.actividad}</h2>
                                    {meta.ficha ? (
                                        meta.ficha_id ? (
                                            <button
                                                onClick={() => navigate(rutaPortal(token, 'fichas', meta.ficha_id as string))}
                                                className="text-[11px] text-[#767a76] hover:text-[#1B1F2A] hover:underline truncate block text-left"
                                            >
                                                Ficha: {meta.ficha}
                                            </button>
                                        ) : (
                                            <p className="text-[11px] text-[#767a76] truncate">Ficha: {meta.ficha}</p>
                                        )
                                    ) : null}
                                </div>
                                <div className="flex-none flex items-center gap-2">
                                    <span className="text-[11px] font-bold text-[#767a76]">
                                        {meta.fecha ? new Date(meta.fecha).toLocaleDateString('es') : ''}
                                    </span>
                                    <button
                                        onClick={() => abrirForm(meta.actividad_id)}
                                        aria-label="Agregar otra evidencia"
                                        className="w-7 h-7 rounded-full border border-[#D8D7E0] flex items-center justify-center text-[#4E5566] hover:bg-[#F1F1EC]"
                                    >
                                        <Plus size={13} />
                                    </button>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                {items.map(ev => (
                                    <article key={ev.id} className="bg-white border border-[#E4E3EC] rounded-2xl overflow-hidden">
                                            <EvidenciaThumbnail
                                                url={urls.get(ev.id) ?? null}
                                                mimeType={ev.mime_type}
                                                nombre={ev.nombre}
                                                className="h-36 sm:h-28 w-full border-0 border-b border-[#E4E3EC] rounded-none"
                                                etiqueta={ev.estado === 'revisada' ? 'Revisada' : 'Por revisar'}
                                            />
                                        <div className="p-3">
                                            <p className="text-xs font-bold text-[#1B1F2A] leading-snug line-clamp-2">{ev.nombre}</p>
                                            <p className="text-[10px] text-[#767a76] mt-1">
                                                {new Date(ev.created_at).toLocaleDateString('es')}
                                                {tamanoLegible(ev.tamano_bytes) ? ` - ${tamanoLegible(ev.tamano_bytes)}` : ''}
                                            </p>

                                            {ev.estado === 'revisada' && selloPorValor(ev.sello) ? (
                                                <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-[#F1F1EC]">
                                                    <Stamp size={12} style={{ color: selloPorValor(ev.sello)?.color }} />
                                                    <span className="text-[10px] font-bold text-[#4E5566]">
                                                        {selloPorValor(ev.sello)?.etiqueta}
                                                    </span>
                                                </div>
                                            ) : null}

                                            {ev.comentario ? (
                                                <p className="text-[10px] text-[#4E5566] mt-2 italic line-clamp-2">{ev.comentario}</p>
                                            ) : null}

                                            <div className="flex items-center gap-2 mt-4">
                                                {urls.get(ev.id) ? (
                                                    <a
                                                        href={urls.get(ev.id) as string}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="flex-1 h-10 sm:h-8 rounded-full border border-[#D8D7E0] flex items-center justify-center gap-1 text-[11px] sm:text-[10px] font-bold text-[#4E5566] hover:bg-[#F1F1EC]"
                                                    >
                                                        <ExternalLink size={12} className="sm:w-3 sm:h-3 w-3.5 h-3.5" /> Abrir
                                                    </a>
                                                ) : null}
                                                {ev.estado === 'pendiente' ? (
                                                    <button
                                                        onClick={() => retirar(ev.id)}
                                                        disabled={borrando === ev.id}
                                                        aria-label="Retirar evidencia"
                                                        className="w-10 h-10 sm:w-8 sm:h-8 rounded-full border border-[#D8D7E0] flex items-center justify-center text-[#4E5566] hover:bg-[#FDECEA] hover:text-[#C0392B] disabled:opacity-40"
                                                    >
                                                        {borrando === ev.id ? (
                                                            <Loader2 size={14} className="animate-spin sm:w-3 sm:h-3 w-3.5 h-3.5" />
                                                        ) : (
                                                            <Trash2 size={14} className="sm:w-3 sm:h-3 w-3.5 h-3.5" />
                                                        )}
                                                    </button>
                                                ) : null}
                                            </div>
                                        </div>
                                    </article>
                                ))}
                            </div>
                        </section>
                    ))}
                </div>
            )}

            {error && evidencias.length > 0 ? (
                <p className="text-xs font-bold text-[#C0392B] mt-4">{error}</p>
            ) : null}

            {formAbierto && sessionToken ? (
                <PortalEvidenciaForm
                    sessionToken={sessionToken}
                    token={token}
                    actividades={actividades}
                    actividadInicial={actividadInicial}
                    onCerrar={() => setFormAbierto(false)}
                    onGuardada={() => {
                        setFormAbierto(false);
                        cargar();
                    }}
                />
            ) : null}
        </div>
    );
};

export default PortalPortafolio;
