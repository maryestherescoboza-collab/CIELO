import React, { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    PlusCircle,
    Cloud,
    ExternalLink,
    MoreVertical,
    Trash2,
    X,
    Loader2,
    Image as ImageIcon,
    FolderOpen,
    Stamp
} from 'lucide-react';
import { usePortal, rutaPortal } from './portalContext';
import { evidenciasApiPortal, resolverUrls, mensajeDeExcepcion } from '../../lib/evidenciasApi';
import { obtenerEstadoDrive, type EstadoDrive } from '../../lib/portalDriveApi';
import { selloPorValor } from '../../constants/sellos';
import { sonMismaAsignatura, getAsignaturaNombre } from '../../constants/asignaturas';
import PortalEvidenciaForm from './PortalEvidenciaForm';
import type { ActividadParaEvidencia, EvidenciaPortafolio } from '../../types/evidencias';

type Filtro = 'todas' | 'pendiente' | 'revisada';

const formatearFecha = (fechaStr: string | null | undefined): string => {
    if (!fechaStr) return '';
    try {
        const d = new Date(fechaStr);
        if (isNaN(d.getTime())) return '';
        return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
    } catch {
        return '';
    }
};

const MiniaturaEvidencia: React.FC<{ ev: EvidenciaPortafolio; url: string | null }> = ({ ev, url }) => {
    const [imgError, setImgError] = useState(false);
    const esImagen = ev.mime_type?.startsWith('image/') || /\.(jpg|jpeg|png|webp|gif)$/i.test(ev.nombre);

    if (url && esImagen && !imgError) {
        return (
            <img
                src={url}
                alt={ev.nombre}
                loading="lazy"
                onError={() => setImgError(true)}
                className="w-full h-full object-cover rounded-xl"
            />
        );
    }

    return (
        <div className="w-full h-full flex items-center justify-center text-[#537BAC]">
            <ImageIcon size={26} strokeWidth={1.6} />
        </div>
    );
};

const PortalPortafolio: React.FC = () => {
    const { sessionToken, token, selectedAsignatura } = usePortal();
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

    // Menú de 3 puntos y modal de confirmación de eliminación
    const [menuAbiertoId, setMenuAbiertoId] = useState<number | null>(null);
    const [evidenciaAEliminar, setEvidenciaAEliminar] = useState<EvidenciaPortafolio | null>(null);
    const menuRef = useRef<HTMLDivElement>(null);
    const reqIdRef = useRef(0);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent | TouchEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setMenuAbiertoId(null);
            }
        };
        if (menuAbiertoId !== null) {
            document.addEventListener('mousedown', handleClickOutside);
            document.addEventListener('touchstart', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('touchstart', handleClickOutside);
        };
    }, [menuAbiertoId]);

    const cargar = useCallback(async () => {
        if (!sessionToken) return;
        const currentReqId = ++reqIdRef.current;
        setLoading(true);
        setError(null);
        // Limpiar inmediatamente para que no queden datos de la materia anterior visibles
        setEvidencias([]);
        setActividades([]);
        setUrls(new Map());

        try {
            const [evs, acts, estadoDrive] = await Promise.all([
                evidenciasApiPortal.listar(sessionToken, { asignatura: selectedAsignatura || undefined }),
                evidenciasApiPortal.listarActividades(sessionToken, { asignatura: selectedAsignatura || undefined }),
                obtenerEstadoDrive(sessionToken).catch(() => null),
            ]);

            if (currentReqId !== reqIdRef.current) return;

            setEvidencias(evs);
            setActividades(acts);
            setDrive(estadoDrive);
            const resolved = await resolverUrls(evs);
            if (currentReqId !== reqIdRef.current) return;
            setUrls(resolved);
        } catch (e) {
            if (currentReqId !== reqIdRef.current) return;
            setError(mensajeDeExcepcion(e, 'No se pudo cargar tu portafolio'));
        } finally {
            if (currentReqId === reqIdRef.current) {
                setLoading(false);
            }
        }
    }, [sessionToken, selectedAsignatura]);

    useEffect(() => {
        cargar();
    }, [cargar]);

    const evidenciasMateria = useMemo(() => {
        if (!selectedAsignatura) return evidencias;
        return evidencias.filter(e => Boolean(e.asignatura && sonMismaAsignatura(e.asignatura, selectedAsignatura)));
    }, [evidencias, selectedAsignatura]);

    const actividadesMateria = useMemo(() => {
        if (!selectedAsignatura) return actividades;
        return actividades.filter(a => Boolean(a.asignatura && sonMismaAsignatura(a.asignatura, selectedAsignatura)));
    }, [actividades, selectedAsignatura]);

    const visibles = useMemo(
        () => (filtro === 'todas' ? evidenciasMateria : evidenciasMateria.filter(e => e.estado === filtro)),
        [evidenciasMateria, filtro]
    );

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
                    actividadesMateria.find(a => a.actividad_id === actividadId) ??
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
    }, [visibles, actividadesMateria]);

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
            setEvidenciaAEliminar(null);
        } catch (e) {
            setError(mensajeDeExcepcion(e, 'No se pudo retirar la evidencia'));
        } finally {
            setBorrando(null);
        }
    };

    const totalCount = evidenciasMateria.length;
    const pendientesCount = useMemo(() => evidenciasMateria.filter(e => e.estado === 'pendiente').length, [evidenciasMateria]);
    const revisadasCount = useMemo(() => evidenciasMateria.filter(e => e.estado === 'revisada').length, [evidenciasMateria]);

    const FILTROS = [
        { k: 'todas', label: 'Todas', count: totalCount },
        { k: 'pendiente', label: 'Por revisar', count: pendientesCount },
        { k: 'revisada', label: 'Revisadas', count: revisadasCount },
    ] as const;

    return (
        <div className="p-3.5 sm:p-5 pb-24 max-w-xl mx-auto">
            {/* Contenedor principal con estética idéntica al mockup */}
            <div className="bg-white rounded-3xl border border-[#E5E7EB] p-4.5 sm:p-5 shadow-xs">

                {/* 1. Encabezado: Título "Evidencias", subtítulo y botón (+) azul */}
                <div className="flex items-start justify-between gap-4 mb-4">
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-[22px] font-bold text-[#1B1F2A] tracking-tight leading-tight">
                                Evidencias
                            </h1>
                            {selectedAsignatura && (
                                <span className="inline-flex items-center justify-center px-3 py-0.5 rounded-full border border-[#537BAC]/30 bg-[#537BAC]/12 text-[11px] font-bold text-[#1B1F2A]">
                                    <span>{getAsignaturaNombre(selectedAsignatura)}</span>
                                </span>
                            )}
                        </div>
                        <p className="text-sm text-[#767A76] mt-1 leading-snug">
                            {selectedAsignatura ? `Actividades y archivos de ${getAsignaturaNombre(selectedAsignatura)}` : 'Actividades y archivos del curso'}
                        </p>
                    </div>

                    <button
                        onClick={() => abrirForm()}
                        aria-label="Agregar evidencia"
                        title="Agregar evidencia"
                        className="w-9 h-9 rounded-full bg-[#537BAC]/12 border border-[#537BAC]/30 text-[#537BAC] hover:bg-[#537BAC] hover:text-white active:scale-95 transition-all flex items-center justify-center mt-0.5 shrink-0"
                    >
                        <PlusCircle size={20} strokeWidth={2} />
                    </button>
                </div>

                {/* 2. Bloque Google Drive conectado */}
                {drive ? (
                    <button
                        onClick={() => navigate(rutaPortal(token, 'drive'))}
                        className="w-full flex items-center justify-between border border-[#537BAC]/25 rounded-2xl p-4 mb-4 bg-[#FCFCFA] hover:bg-[#537BAC]/8 active:scale-[0.995] transition-all text-left group"
                    >
                        <div className="flex items-center gap-3.5 min-w-0">
                            <Cloud size={22} strokeWidth={1.6} className="text-[#537BAC] shrink-0" />
                            <div className="min-w-0">
                                <p className="text-sm font-bold text-[#1B1F2A] leading-tight">
                                    {drive.conectado ? 'Google Drive conectado' : 'Conectar Google Drive'}
                                </p>
                                <p className="text-xs text-[#767A76] mt-1 leading-tight">
                                    {drive.conectado
                                        ? drive.carpetas.length === 0
                                            ? 'Organiza tus carpetas por asignatura'
                                            : `${drive.carpetas.length} carpeta${drive.carpetas.length === 1 ? '' : 's'} lista${drive.carpetas.length === 1 ? '' : 's'}`
                                        : 'Guarda tus trabajos en tu Drive'}
                                </p>
                            </div>
                        </div>
                        <ExternalLink size={16} strokeWidth={1.8} className="text-[#537BAC] shrink-0 ml-2 group-hover:text-[#1B1F2A] transition-colors" />
                    </button>
                ) : null}

                {/* 3. Filtros: "Todas" / "Por revisar" / "Revisadas" */}
                <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
                    {FILTROS.map(f => {
                        const activo = filtro === f.k;
                        return (
                            <button
                                key={f.k}
                                onClick={() => setFiltro(f.k)}
                                className={`shrink-0 text-xs font-bold transition-all px-3.5 py-1.5 rounded-full border ${activo
                                        ? 'bg-[#537BAC] text-white border-[#537BAC]'
                                        : 'bg-[#FCFCFA] text-[#1B1F2A] border-[#BFC9A6]/50 hover:bg-[#BFC9A6]/25'
                                    }`}
                            >
                                {f.label} {f.count}
                            </button>
                        );
                    })}
                </div>

                {/* Línea divisoria tenue */}
                <div className="h-px bg-[#F0F0F2] my-4.5" />

                {/* 4. Lista de actividades y evidencias */}
                {loading ? (
                    <div className="flex justify-center py-16">
                        <Loader2 className="animate-spin text-[#1B1F2A]" size={26} />
                    </div>
                ) : error && evidencias.length === 0 ? (
                    <div className="p-4 bg-[#FDECEA] border border-[#F5C6C0] rounded-2xl text-center my-4">
                        <p className="text-[#C0392B] text-xs font-bold">{error}</p>
                    </div>
                ) : grupos.length === 0 ? (
                    <div className="text-center py-14 border border-dashed border-[#BFC9A6] rounded-2xl bg-[#FCFCFA] my-3">
                        <FolderOpen size={26} strokeWidth={1.5} className="mx-auto text-[#537BAC]/60 mb-3" />
                        <p className="text-sm font-bold text-[#1B1F2A]">No hay evidencias aquí</p>
                        <p className="text-xs text-[#767A76] mt-1">
                            {filtro === 'todas'
                                ? 'Agrega tu primera evidencia para empezar tu Portafolio.'
                                : 'Prueba con otro filtro.'}
                        </p>
                    </div>
                ) : (
                    <div>
                        {grupos.map(({ meta, items }, index) => (
                            <section key={meta.actividad_id} className={index > 0 ? 'mt-5' : ''}>
                                {/* Encabezado de la actividad: Nombre a la izquierda, fecha a la derecha */}
                                <div className="flex items-center justify-between gap-3 mb-2.5">
                                    <div className="min-w-0 flex-1">
                                        <h2 className="text-base font-bold text-[#1B1F2A] truncate">
                                            {meta.actividad}
                                        </h2>
                                        {meta.ficha ? (
                                            meta.ficha_id ? (
                                                <button
                                                    onClick={() => navigate(rutaPortal(token, 'fichas', meta.ficha_id as string))}
                                                    className="text-[11px] text-[#767A76] hover:text-[#1B1F2A] hover:underline truncate block text-left mt-0.5"
                                                >
                                                    Ficha: {meta.ficha}
                                                </button>
                                            ) : (
                                                <p className="text-[11px] text-[#767A76] truncate mt-0.5">Ficha: {meta.ficha}</p>
                                            )
                                        ) : null}
                                    </div>
                                    <span className="text-xs text-[#767A76] shrink-0 font-normal">
                                        {formatearFecha(meta.fecha)}
                                    </span>
                                </div>

                                {/* Tarjetas en filas horizontales */}
                                <div className="space-y-3">
                                    {items.map(ev => {
                                        const url = urls.get(ev.id) ?? null;
                                        const menuAbierto = menuAbiertoId === ev.id;

                                        return (
                                            <article
                                                key={ev.id}
                                                onClick={() => {
                                                    if (url) window.open(url, '_blank', 'noopener,noreferrer');
                                                }}
                                                className={`relative border border-[#E5E7EB] rounded-2xl p-3.5 flex items-center gap-4 bg-white transition-all ${url ? 'cursor-pointer hover:border-[#D1D5DB] active:scale-[0.995]' : ''
                                                    }`}
                                            >
                                                {/* Miniatura 64-68px uniforme con ícono de imagen azul */}
                                                <div className="w-16 h-16 shrink-0 rounded-xl overflow-hidden flex items-center justify-center">
                                                    <MiniaturaEvidencia ev={ev} url={url} />
                                                </div>

                                                {/* Centro: Título, fecha y etiqueta "Por revisar" / "Revisada" */}
                                                <div className="min-w-0 flex-1 py-0.5">
                                                    <p className="text-base font-bold text-[#1B1F2A] leading-tight truncate">
                                                        {ev.nombre}
                                                    </p>
                                                    <p className="text-xs text-[#767A76] mt-1 leading-tight">
                                                        {formatearFecha(ev.created_at)}
                                                    </p>

                                                    <div className="mt-2 flex items-center gap-2 flex-wrap">
                                                        {ev.estado === 'pendiente' ? (
                                                            <span className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-[#DEAE4D]/20 text-[#8C6415]">
                                                                Por revisar
                                                            </span>
                                                        ) : (
                                                            <span className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-[#689C63]/18 text-[#4a7a46]">
                                                                Revisada
                                                            </span>
                                                        )}

                                                        {ev.estado === 'revisada' && selloPorValor(ev.sello) ? (
                                                            <div className="inline-flex items-center gap-1 text-[11px] font-bold text-[#4E5566]">
                                                                <Stamp size={12} style={{ color: selloPorValor(ev.sello)?.color }} />
                                                                <span className="truncate">{selloPorValor(ev.sello)?.etiqueta}</span>
                                                            </div>
                                                        ) : null}
                                                    </div>

                                                    {ev.comentario ? (
                                                        <p className="text-xs text-[#4E5566] italic truncate mt-1.5">
                                                            "{ev.comentario}"
                                                        </p>
                                                    ) : null}
                                                </div>

                                                {/* Menú de 3 puntos vertical a la derecha */}
                                                <div className="shrink-0 relative" onClick={e => e.stopPropagation()}>
                                                    <button
                                                        type="button"
                                                        onClick={() => setMenuAbiertoId(menuAbierto ? null : ev.id)}
                                                        aria-label="Opciones de evidencia"
                                                        className="w-10 h-10 rounded-full flex items-center justify-center text-[#6B7280] hover:text-[#1B1F2A] hover:bg-[#F1F1EC] active:scale-95 transition-all"
                                                    >
                                                        <MoreVertical size={18} />
                                                    </button>

                                                    {/* Desplegable contextual */}
                                                    {menuAbierto && (
                                                        <div
                                                            ref={menuRef}
                                                            className="absolute right-0 top-11 z-30 w-44 bg-white rounded-2xl shadow-lg border border-[#E5E7EB] p-1.5 animate-in fade-in zoom-in-95 duration-100"
                                                        >
                                                            {url ? (
                                                                <a
                                                                    href={url}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    onClick={() => setMenuAbiertoId(null)}
                                                                    className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold text-[#1B1F2A] hover:bg-[#F1F1EC] transition-colors"
                                                                >
                                                                    <ExternalLink size={13} className="text-[#767A76]" />
                                                                    Abrir archivo
                                                                </a>
                                                            ) : null}

                                                            {ev.estado === 'pendiente' ? (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        setMenuAbiertoId(null);
                                                                        setEvidenciaAEliminar(ev);
                                                                    }}
                                                                    className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold text-[#DB5B48] hover:bg-[#DB5B48]/12 transition-colors text-left"
                                                                >
                                                                    <Trash2 size={13} />
                                                                    Retirar evidencia
                                                                </button>
                                                            ) : null}
                                                        </div>
                                                    )}
                                                </div>
                                            </article>
                                        );
                                    })}
                                </div>

                                {/* Divisor tenue entre actividades */}
                                {index < grupos.length - 1 && (
                                    <div className="h-px bg-[#F0F0F2] my-5" />
                                )}
                            </section>
                        ))}
                    </div>
                )}
            </div>

            {error && evidencias.length > 0 ? (
                <p className="text-xs font-bold text-[#DB5B48] mt-4 text-center">{error}</p>
            ) : null}

            {/* Modal de confirmación para retirar evidencia */}
            {evidenciaAEliminar ? (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150"
                    onClick={() => setEvidenciaAEliminar(null)}
                >
                    <div
                        className="w-full max-w-sm bg-[#FCFCFA] rounded-2xl p-5 border border-[#BFC9A6]/60 shadow-xl animate-in zoom-in-95 duration-150"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between gap-3 mb-3">
                            <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-full bg-[#DB5B48]/15 flex items-center justify-center text-[#DB5B48]">
                                    <Trash2 size={16} />
                                </div>
                                <h3 className="text-sm font-black text-[#1B1F2A]">Retirar evidencia</h3>
                            </div>
                            <button
                                type="button"
                                onClick={() => setEvidenciaAEliminar(null)}
                                className="w-7 h-7 rounded-full flex items-center justify-center text-[#767A76] hover:bg-[#BFC9A6]/25"
                            >
                                <X size={15} />
                            </button>
                        </div>

                        <p className="text-xs text-[#4E5566] leading-relaxed mb-5">
                            ¿Estás seguro de que deseas retirar <strong className="text-[#1B1F2A]">"{evidenciaAEliminar.nombre}"</strong>? Esta acción no se puede deshacer.
                        </p>

                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() => setEvidenciaAEliminar(null)}
                                disabled={borrando !== null}
                                className="flex-1 h-10 rounded-full border border-[#BFC9A6]/60 bg-[#BFC9A6]/20 text-xs font-bold text-[#1B1F2A] hover:bg-[#BFC9A6]/35 active:scale-95 transition-all"
                            >
                                Cancelar
                            </button>
                            <button
                                type="button"
                                onClick={() => retirar(evidenciaAEliminar.id)}
                                disabled={borrando !== null}
                                className="flex-1 h-10 rounded-full bg-[#DB5B48] text-white text-xs font-bold hover:bg-[#c74e3c] active:scale-95 transition-all flex items-center justify-center gap-1.5"
                            >
                                {borrando === evidenciaAEliminar.id ? (
                                    <Loader2 size={14} className="animate-spin" />
                                ) : (
                                    'Sí, retirar'
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            ) : null}

            {/* Modal de formulario para subir o agregar evidencia */}
            {formAbierto && sessionToken ? (
                <PortalEvidenciaForm
                    sessionToken={sessionToken}
                    token={token}
                    actividades={actividadesMateria}
                    actividadInicial={actividadInicial}
                    selectedAsignatura={selectedAsignatura}
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
