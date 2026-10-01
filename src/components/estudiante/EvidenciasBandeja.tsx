import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, ExternalLink, X, Inbox } from 'lucide-react';
import { evidenciasApiDocente, resolverUrls, mensajeDeExcepcion, type BandejaDocente } from '../../lib/evidenciasApi';
import { SELLOS_INFO, selloPorValor } from '../../constants/sellos';
import EvidenciaThumbnail from '../evidencias/EvidenciaThumbnail';
import type { CursoConEvidencias, EvidenciaDocente, FiltroBandeja, GrupoBandeja } from '../../types/evidencias';

/**
 * BANDEJA DE EVIDENCIAS del docente.
 *
 * Subseccion del modulo Estudiante. Va por curso, no por alumno: el docente que
 * entra aqui quiere ver "que entrego mi curso", no "todo de Maria". Abrir la
 * ficha de un estudiante para enterarse de que hay trabajo pendiente es
 * precisamente el rodeo que esta pantalla elimina.
 *
 * El recorrido es curso -> ficha -> actividad -> estudiante -> producto. Cada
 * grupo trae el nombre de la ficha y el de la actividad, y dentro viven las
 * entregas de cada estudiante, asi que el docente puede bajar de la ficha al
 * producto sin salir de la vista. El filtro de estado se aplica sobre el
 * conjunto, no sobre la actividad: si pides "Por revisar" y una actividad se
 * queda sin nada pendiente, desaparece en vez de mostrar un grupo vacio.
 *
 * El sello es el de CIELO: los 6 de `SELLOS_INFO`, los mismos que escribe
 * `Sellos.tsx` sobre `calificaciones`. Aqui no se califica la actividad, se
 * registra el juicio sobre un archivo concreto, y por eso va en `evidencias`.
 */

const PERIODOS = ['P1', 'P2', 'P3', 'P4'] as const;

/**
 * Ruta REAL de Plan de clases -> Fichas (`PlanClasesIndex`, el tablero "Mis
 * fichas"). Antes se apuntava a `/plan-de-clases/fichas`, que no esta
 * registrada en `AppRoutes` y caia en el 404.
 */
const RUTA_FICHAS = '/plan-de-clases/mis-notas';

const FILTROS: { k: FiltroBandeja; label: string }[] = [
    { k: 'todas', label: 'Todas' },
    { k: 'pendiente', label: 'Pendientes' },
    { k: 'revisada', label: 'Revisadas' },
];

const EvidenciasBandeja: React.FC = () => {
    const [cursos, setCursos] = useState<CursoConEvidencias[]>([]);
    const [cursoId, setCursoId] = useState<number | null>(null);
    const [asignatura, setAsignatura] = useState<string | null>(null);
    const [periodo, setPeriodo] = useState<string | null>(null);
    const [filtro, setFiltro] = useState<FiltroBandeja>('todas');

    const [bandeja, setBandeja] = useState<BandejaDocente | null>(null);
    const [urls, setUrls] = useState<Map<number, string>>(new Map());
    const [cargando, setCargando] = useState(true);
    const [cargandoBandeja, setCargandoBandeja] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [abierta, setAbierta] = useState<EvidenciaDocente | null>(null);
    const [selloElegido, setSelloElegido] = useState<number | null>(null);
    const [comentario, setComentario] = useState('');
    const [guardando, setGuardando] = useState(false);
    const [guardado, setGuardado] = useState(false);
    const [errorRevision, setErrorRevision] = useState<string | null>(null);

    /* ── Cursos ─────────────────────────────────────────────────────────── */
    useEffect(() => {
        let vivo = true;
        (async () => {
            try {
                const lista = await evidenciasApiDocente.cursos();
                if (!vivo) return;
                setCursos(lista);
                if (lista.length > 0) {
                    setCursoId(prev => prev ?? lista[0].curso_id);
                    setAsignatura(prev => prev ?? lista[0].asignaturas[0] ?? null);
                }
            } catch (e) {
                if (vivo) setError(mensajeDeExcepcion(e, 'No se pudieron cargar tus cursos'));
            } finally {
                if (vivo) setCargando(false);
            }
        })();
        return () => { vivo = false; };
    }, []);

    /* ── Bandeja ────────────────────────────────────────────────────────── */
    const cargarBandeja = useCallback(async () => {
        if (cursoId === null) {
            setBandeja(null);
            return;
        }
        setCargandoBandeja(true);
        setError(null);
        try {
            const b = await evidenciasApiDocente.bandeja(cursoId, asignatura, periodo);
            setBandeja(b);
            const planas = b.grupos.flatMap(g => g.evidencias);
            setUrls(await resolverUrls(planas));
        } catch (e) {
            setError(mensajeDeExcepcion(e, 'No se pudo cargar la bandeja'));
            setBandeja(null);
        } finally {
            setCargandoBandeja(false);
        }
    }, [cursoId, asignatura, periodo]);

    useEffect(() => {
        cargarBandeja();
    }, [cargarBandeja]);

    const curso = cursos.find(c => c.curso_id === cursoId) ?? null;

    const grupos: GrupoBandeja[] = useMemo(() => {
        if (!bandeja) return [];
        if (filtro === 'todas') return bandeja.grupos;
        return bandeja.grupos
            .map(g => ({ ...g, evidencias: g.evidencias.filter(e => e.estado === filtro) }))
            .filter(g => g.evidencias.length > 0);
    }, [bandeja, filtro]);

    const todas = useMemo(() => (bandeja ? bandeja.grupos.flatMap(g => g.evidencias) : []), [bandeja]);
    const totalPendientes = todas.filter(e => e.estado === 'pendiente').length;



    const abrir = (ev: EvidenciaDocente) => {
        setAbierta(ev);
        setSelloElegido(ev.sello);
        setComentario(ev.comentario ?? '');
        setGuardado(false);
        setErrorRevision(null);
    };

    const cerrar = () => {
        setAbierta(null);
        setGuardado(false);
        setErrorRevision(null);
    };

    const revisar = async (overrideSello?: number) => {
        const selloFinal = overrideSello !== undefined ? overrideSello : selloElegido;
        if (!abierta || selloFinal === null || guardando) return;
        setGuardando(true);
        setErrorRevision(null);
        try {
            await evidenciasApiDocente.revisar(abierta.id, selloFinal, comentario);
            setGuardado(true);
            // Reflejar el cambio en la fila sin volver a pedir la bandeja entera:
            // el docente sigue en la misma evidencia y ve el sello puesto.
            setBandeja(prev => {
                if (!prev) return prev;
                return {
                    ...prev,
                    grupos: prev.grupos.map(g =>
                        g.actividad_id === abierta.actividad_id
                            ? {
                                ...g,
                                pendientes: g.evidencias.filter(e => e.id !== abierta.id && e.estado === 'pendiente').length,
                                revisadas: g.evidencias.filter(e => e.id === abierta.id || e.estado === 'revisada').length,
                                evidencias: g.evidencias.map(e =>
                                    e.id === abierta.id
                                        ? { ...e, estado: 'revisada' as const, sello: selloFinal, comentario: comentario.trim() || null, revisado_at: new Date().toISOString() }
                                        : e
                                ),
                            }
                            : g
                    ),
                };
            });
        } catch (e) {
            setErrorRevision(mensajeDeExcepcion(e, 'No se pudo guardar la revision'));
        } finally {
            setGuardando(false);
        }
    };

    /* ── Estados vacios ─────────────────────────────────────────────────── */

    if (cargando) {
        return (
            <div className="w-full max-w-6xl mx-auto px-4 sm:px-8 py-16 flex justify-center">
                <Loader2 className="animate-spin text-[#1B1F2A]" size={26} />
            </div>
        );
    }

    if (cursos.length === 0) {
        return (
            <div className="w-full max-w-6xl mx-auto px-4 sm:px-8 py-16">
                <div className="text-center border border-dashed border-[#D8D7E0] rounded-2xl bg-white py-14 px-6">
                    <Inbox size={26} strokeWidth={1.5} className="mx-auto text-[#A8A9B0] mb-3" />
                    <p className="text-sm font-bold text-[#1B1F2A]">Aun no hay evidencias en tus cursos</p>
                    <p className="text-xs text-[#767a76] mt-1 max-w-sm mx-auto">
                        Crea una ficha donde solicitas subir evidencia de una actividad al estudiante.
                    </p>
                    <div className="mt-4">
                        {/* Ruta real de Plan de clases -> Fichas. */}
                        <Link to={RUTA_FICHAS} className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#1B1F2A] text-white text-xs font-bold rounded-full hover:bg-opacity-90 transition-colors">
                            Ir a Fichas
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full max-w-6xl mx-auto px-4 sm:px-8 py-6">
            {/* Encabezado + selectores */}
            <div className="flex flex-wrap items-end justify-between gap-4 mb-5">
                <div>
                    <h1 className="text-2xl font-black text-[#1B1F2A] tracking-tight font-['Space_Grotesk']">Evidencias</h1>
                    <p className="text-[12px] text-[#767a76] mt-1">
                        {totalPendientes > 0
                            ? `${totalPendientes} pendiente${totalPendientes === 1 ? '' : 's'} de revision`
                            : 'Todo revisado'}
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <select
                        value={cursoId ?? ''}
                        onChange={(e) => {
                            const v = Number(e.target.value);
                            setCursoId(v);
                            const c = cursos.find(x => x.curso_id === v);
                            setAsignatura(c?.asignaturas[0] ?? null);
                        }}
                        className="h-10 px-3 rounded-full border border-[#D8D7E0] bg-white text-xs font-bold text-[#1B1F2A] focus:border-[#1B1F2A] focus:outline-none"
                    >
                        {cursos.map(c => (
                            <option key={c.curso_id} value={c.curso_id}>
                                {c.grado} {c.seccion}
                            </option>
                        ))}
                    </select>

                    {curso && curso.asignaturas.length > 1 ? (
                        <select
                            value={asignatura ?? ''}
                            onChange={(e) => setAsignatura(e.target.value || null)}
                            className="h-10 px-3 rounded-full border border-[#D8D7E0] bg-white text-xs font-bold text-[#1B1F2A] focus:border-[#1B1F2A] focus:outline-none"
                        >
                            {curso.asignaturas.map(a => (
                                <option key={a} value={a}>{a}</option>
                            ))}
                        </select>
                    ) : null}

                    <div className="flex items-center gap-1">
                        {PERIODOS.map(p => (
                            <button
                                key={p}
                                onClick={() => setPeriodo(prev => (prev === p ? null : p))}
                                className={`px-2.5 py-1.5 rounded-full text-[11px] font-bold transition-colors ${
                                    periodo === p ? 'bg-[#1B1F2A] text-white' : 'text-[#4E5566] hover:bg-[#E4E3EC]'
                                }`}
                            >
                                {p}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Filtros de estado */}
            <div className="flex gap-2 mb-6">
                {FILTROS.map(f => (
                    <button
                        key={f.k}
                        onClick={() => setFiltro(f.k)}
                        className={`px-3.5 py-1.5 rounded-full border text-xs font-bold transition-colors ${
                            filtro === f.k
                                ? 'bg-[#1B1F2A] text-white border-[#1B1F2A]'
                                : 'bg-white text-[#4E5566] border-[#D8D7E0] hover:bg-[#F1F1EC]'
                        }`}
                    >
                        {f.label}
                    </button>
                ))}
            </div>

            {cargandoBandeja ? (
                <div className="flex justify-center py-16">
                    <Loader2 className="animate-spin text-[#1B1F2A]" size={24} />
                </div>
            ) : error ? (
                <div className="p-4 bg-[#FDECEA] border border-[#F5C6C0] rounded-2xl text-center">
                    <p className="text-[#C0392B] text-xs font-bold">{error}</p>
                </div>
            ) : grupos.length === 0 ? (
                <div className="text-center border border-dashed border-[#D8D7E0] rounded-2xl bg-white py-14 px-6">
                    <p className="text-sm font-bold text-[#1B1F2A]">No hay evidencias que mostrar</p>
                    <p className="text-xs text-[#767a76] mt-1">
                        {filtro === 'todas'
                            ? 'Crea una ficha donde solicitas subir evidencia de una actividad al estudiante.'
                            : 'No hay evidencias en ese estado.'}
                    </p>
            {filtro === 'todas' && (
            <div className="mt-4">
                {/* Ruta real de Plan de clases -> Fichas. */}
                <Link to={RUTA_FICHAS} className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#1B1F2A] text-white text-xs font-bold rounded-full hover:bg-opacity-90 transition-colors">
                    Ir a Fichas
                </Link>
            </div>
        )}
                </div>
            ) : (
                <div className="space-y-8">
                    {grupos.map(grupo => (
                        <section key={grupo.actividad_id}>
                            <div className="flex items-baseline justify-between gap-3 mb-3 pb-2 border-b border-[#E4E3EC]">
                                <div className="min-w-0">
                                    <h2 className="text-sm font-black text-[#1B1F2A] truncate">{grupo.actividad}</h2>
                                    <p className="text-[11px] text-[#767a76] truncate">
                                        {grupo.ficha ? `Ficha: ${grupo.ficha}` : 'Sin ficha asociada'}
                                        {grupo.fecha ? ` - ${new Date(grupo.fecha).toLocaleDateString('es')}` : ''}
                                    </p>
                                </div>
                                <div className="flex-none flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.08em]">
                                    <span className="px-2 py-0.5 rounded-full bg-white border border-[#E4E3EC] text-[#767a76]">
                                        {grupo.total} entrega{grupo.total === 1 ? '' : 's'}
                                    </span>
                                    {grupo.pendientes > 0 ? (
                                        <span className="px-2 py-0.5 rounded-full bg-[#FFF6E5] border border-[#F5D9A8] text-[#B26A00]">
                                            {grupo.pendientes} por revisar
                                        </span>
                                    ) : null}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                                {grupo.evidencias.map(ev => {
                                    const sello = selloPorValor(ev.sello);
                                    return (
                                        <button
                                            key={ev.id}
                                            onClick={() => abrir(ev)}
                                            className="text-left bg-white border border-[#E4E3EC] rounded-2xl overflow-hidden hover:border-[#1B1F2A] transition-colors"
                                        >
                                            <EvidenciaThumbnail
                                                url={urls.get(ev.id) ?? null}
                                                thumbnailUrl={ev.thumbnail_url}
                                                mimeType={ev.mime_type}
                                                nombre={ev.nombre}
                                                className="h-24 w-full border-0 border-b border-[#E4E3EC] rounded-none"
                                                etiqueta={ev.estado === 'revisada' ? sello?.etiqueta ?? 'Revisada' : 'Pendiente'}
                                            />
                                            <div className="p-2.5">
                                                {/* Nombre del estudiante DEBAJO de la
                                                    evidencia: es el dato que hace
                                                    falta para decidir sin abrir. */}
                                                <p className="text-[11px] font-black text-[#1B1F2A] truncate">
                                                    {ev.estudiante}
                                                </p>
                                                <p className="text-[10px] text-[#767a76] truncate mt-0.5">{ev.nombre}</p>
                                                {sello && ev.estado === 'revisada' ? (
                                                    <span
                                                        className="inline-flex items-center gap-1 mt-1.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                                                        style={{ backgroundColor: sello.bg, color: sello.color }}
                                                    >
                                                        <img src={sello.imagen} alt="" className="w-3 h-3 object-contain" />
                                                        {sello.valor}
                                                    </span>
                                                ) : null}
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </section>
                    ))}
                </div>
            )}

            {/* Revision individual. Panel lateral, no modal a pantalla completa:
                la lista queda visible y "Siguiente" avanza sin volver. */}
            {abierta ? (
                <div className="fixed inset-0 z-50 flex justify-end bg-black/40">
                    <aside className="w-full sm:max-w-md bg-white h-full overflow-y-auto border-l border-[#E4E3EC] flex flex-col">
                        <div className="flex items-start justify-between gap-3 p-5">
                            <div className="min-w-0">
                                <h2 className="text-base font-black text-[#1B1F2A] truncate">{abierta.estudiante}</h2>
                            </div>
                            <button
                                onClick={cerrar}
                                aria-label="Cerrar"
                                className="w-8 h-8 rounded-full border border-[#E4E3EC] flex items-center justify-center text-[#4E5566] hover:bg-[#F1F1EC] shrink-0"
                            >
                                <X size={16} />
                            </button>
                        </div>

                        <div className="p-5 flex-1 flex flex-col gap-5 pt-0">
                            {('descripcion' in abierta && (abierta as any).descripcion) ? (
                                <p className="text-sm text-[#4E5566]">
                                    {(abierta as any).descripcion}
                                </p>
                            ) : null}

                            {abierta.origen === 'drive' && abierta.drive_url ? (
                                <a
                                    href={abierta.drive_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="w-full h-11 rounded-full border border-[#D8D7E0] flex items-center justify-center gap-2 text-xs font-bold text-[#4E5566] hover:bg-[#F1F1EC]"
                                >
                                    <ExternalLink size={14} /> Abrir archivo
                                </a>
                            ) : urls.get(abierta.id) ? (
                                <a
                                    href={urls.get(abierta.id) as string}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="w-full h-11 rounded-full border border-[#D8D7E0] flex items-center justify-center gap-2 text-xs font-bold text-[#4E5566] hover:bg-[#F1F1EC]"
                                >
                                    <ExternalLink size={14} /> Abrir archivo
                                </a>
                            ) : null}

                            <div className="grid grid-cols-2 gap-x-4 gap-y-8 mt-6 pb-8">
                                {SELLOS_INFO.filter(s => [100, 85, 70, 55].includes(s.valor)).map(s => {
                                    const isSelected = selloElegido === s.valor;
                                    const isAnySelected = selloElegido !== null;
                                    
                                    return (
                                        <button
                                            key={s.valor}
                                            onClick={() => {
                                                setSelloElegido(s.valor);
                                                revisar(s.valor);
                                            }}
                                            title={s.etiqueta}
                                            disabled={guardando}
                                            className={`flex flex-col items-center justify-center gap-3 transition-all hover:scale-105 focus:outline-none disabled:opacity-50 ${
                                                isAnySelected && !isSelected ? 'opacity-40 hover:opacity-80' : 'opacity-100'
                                            }`}
                                        >
                                            <img src={s.imagen} alt={s.etiqueta} className="w-24 h-24 sm:w-28 sm:h-28 object-contain drop-shadow-sm" />
                                            <span className="text-sm font-bold text-[#1B1F2A] tracking-tight text-center leading-tight">
                                                {s.etiqueta}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                            
                            {errorRevision ? (
                                <p className="text-xs font-bold text-[#C0392B] bg-[#FDECEA] border border-[#F5C6C0] rounded-xl px-3 py-2.5 mt-2">
                                    {errorRevision}
                                </p>
                            ) : null}
                            {guardado && !errorRevision ? (
                                <p className="text-xs font-bold text-[#3F7A3C] bg-[#EDF7EC] border border-[#C6E3C4] rounded-xl px-3 py-2.5 mt-2">
                                    Sello guardado.
                                </p>
                            ) : null}
                        </div>
                    </aside>
                </div>
            ) : null}
        </div>
    );
};

export default EvidenciasBandeja;
