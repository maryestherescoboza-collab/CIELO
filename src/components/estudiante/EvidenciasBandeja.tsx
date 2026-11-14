import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    Loader2, 
    ExternalLink, 
    Inbox, 
    AlertCircle 
} from 'lucide-react';
import { useAppStore } from '../../store/appStore';
import { evidenciasApiDocente, resolverUrls, mensajeDeExcepcion, type BandejaDocente } from '../../lib/evidenciasApi';
import { getAsignaturaNombre } from '../../constants/asignaturas';
import EvidenciaThumbnail from '../evidencias/EvidenciaThumbnail';
import type { CursoConEvidencias, EvidenciaDocente, FiltroBandeja, GrupoBandeja } from '../../types/evidencias';

const PERIODOS = ['P1', 'P2', 'P3', 'P4'] as const;
const RUTA_FICHAS = '/plan-de-clases/mis-notas';

const FILTROS: { k: FiltroBandeja; label: string }[] = [
    { k: 'todas', label: 'Todas' },
    { k: 'pendiente', label: 'Pendientes' },
    { k: 'revisada', label: 'Revisadas' },
];

/**
 * Niveles pedagógicos oficiales de CIELO (de mayor a menor nivel)
 * utilizando los PNG originales de la plataforma.
 */
const SELLOS_NIVEL = [
    { 
        nivel: 4,
        valor: 100, 
        etiqueta: 'Destacado', 
        nivelDominio: 'DESTACADO', 
        descriptor: 'El estudiante entrega la actividad en la fecha y hora establecidas. El trabajo cumple con todos los requisitos de formato solicitados.',
        bgCard: '#DCF3E5', 
        textColor: '#166534', 
        borderColor: '#BBF7D0', 
        activeBg: '#1B6E3F',
        imagen: '/sellos/sello-excelente-100.png' 
    },
    { 
        nivel: 3,
        valor: 85, 
        etiqueta: 'Satisfactorio', 
        nivelDominio: 'SATISFACTORIO', 
        descriptor: 'El estudiante entrega la actividad dentro del plazo establecido. El trabajo cumple con la mayoría de los requisitos de formato, presentando detalles menores por corregir.',
        bgCard: '#E0F2FE', 
        textColor: '#0369A1', 
        borderColor: '#BAE6FD', 
        activeBg: '#1D4ED8',
        imagen: '/sellos/sello-muybueno-85.png' 
    },
    { 
        nivel: 2,
        valor: 70, 
        etiqueta: 'En desarrollo', 
        nivelDominio: 'EN DESARROLLO', 
        descriptor: 'El estudiante entrega la actividad fuera de plazo con un retraso leve. El trabajo omite elementos importantes del formato establecido en las instrucciones.',
        bgCard: '#FEF0C7', 
        textColor: '#B45309', 
        borderColor: '#FDE68A', 
        activeBg: '#B45309',
        imagen: '/sellos/sello-logrado-70.png' 
    },
    { 
        nivel: 1,
        valor: 55, 
        etiqueta: 'Inicial', 
        nivelDominio: 'INICIAL', 
        descriptor: 'El estudiante entrega la actividad de forma tardía sin justificación previa. El trabajo incumple las instrucciones básicas de formato requeridas para la evaluación.',
        bgCard: '#FEE2E2', 
        textColor: '#B91C1C', 
        borderColor: '#FECACA', 
        activeBg: '#B91C1C',
        imagen: '/sellos/sello-porlograr-65.png' 
    },
] as const;

function selloPorPuntaje(puntaje: number | null | undefined) {
    if (puntaje === null || puntaje === undefined) return null;
    return SELLOS_NIVEL.find(s => s.valor === puntaje) ?? null;
}

const AVATAR_PALETA = [
    { bg: '#FCE7F3', text: '#BE185D' }, // Rosa
    { bg: '#E0E7FF', text: '#4338CA' }, // Indigo
    { bg: '#DCFCE7', text: '#15803D' }, // Verde
    { bg: '#FEF3C7', text: '#B45309' }, // Ámbar
    { bg: '#F3E8FF', text: '#7E22CE' }, // Púrpura
    { bg: '#CCFBF1', text: '#0F766E' }, // Turquesa
    { bg: '#FFEDD5', text: '#C2410C' }, // Naranja
    { bg: '#E0F2FE', text: '#0369A1' }, // Celeste
];

function colorAvatarEstudiante(nombre: string): { bg: string; text: string } {
    let hash = 0;
    for (let i = 0; i < nombre.length; i++) {
        hash = (hash * 31 + nombre.charCodeAt(i)) >>> 0;
    }
    return AVATAR_PALETA[hash % AVATAR_PALETA.length];
}

interface EvidenciasBandejaProps {
    onCambiarSubseccion?: (s: 'fichas' | 'evidencias') => void;
}

export const EvidenciasBandeja: React.FC<EvidenciasBandejaProps> = ({ onCambiarSubseccion }) => {
    const navigate = useNavigate();
    const actividadesState = useAppStore(s => s.state.actividades);

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

    // Entrega seleccionada para calificar mediante el selector sticky de la derecha
    const [seleccionadaId, setSeleccionadaId] = useState<number | null>(null);
    const [guardandoSello, setGuardandoSello] = useState(false);

    /* ── Carga inicial de cursos ────────────────────────────────────────── */
    useEffect(() => {
        let activo = true;
        (async () => {
            try {
                const lista = await evidenciasApiDocente.cursos();
                if (!activo) return;
                setCursos(lista);
                if (lista.length > 0) {
                    setCursoId(prev => prev ?? lista[0].curso_id);
                    setAsignatura(prev => prev ?? lista[0].asignaturas[0] ?? null);
                }
            } catch (e) {
                if (activo) setError(mensajeDeExcepcion(e, 'No se pudieron cargar los cursos'));
            } finally {
                if (activo) setCargando(false);
            }
        })();
        return () => { activo = false; };
    }, []);

    /* ── Carga de bandeja de evidencias ─────────────────────────────────── */
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
            // Agrupar firmas de URLs por lote (AGUA)
            const mapaFirmadas = await resolverUrls(planas);
            setUrls(mapaFirmadas);

            if (seleccionadaId && !planas.some(e => e.id === seleccionadaId)) {
                setSeleccionadaId(null);
            }
        } catch (e) {
            setError(mensajeDeExcepcion(e, 'No se pudo cargar la bandeja de evidencias'));
            setBandeja(null);
        } finally {
            setCargandoBandeja(false);
        }
    }, [cursoId, asignatura, periodo, seleccionadaId]);

    useEffect(() => {
        cargarBandeja();
    }, [cargarBandeja]);

    const cursoActual = cursos.find(c => c.curso_id === cursoId) ?? null;

    const gruposFiltrados: GrupoBandeja[] = useMemo(() => {
        if (!bandeja) return [];
        if (filtro === 'todas') return bandeja.grupos;
        return bandeja.grupos
            .map(g => ({ ...g, evidencias: g.evidencias.filter(e => e.estado === filtro) }))
            .filter(g => g.evidencias.length > 0);
    }, [bandeja, filtro]);

    const todasEvidencias = useMemo(() => (bandeja ? bandeja.grupos.flatMap(g => g.evidencias) : []), [bandeja]);
    const totalPendientes = todasEvidencias.filter(e => e.estado === 'pendiente').length;

    const entregaSeleccionada = useMemo(
        () => todasEvidencias.find(e => e.id === seleccionadaId) ?? null,
        [todasEvidencias, seleccionadaId]
    );

    /* ── Aplicar sello a la entrega seleccionada ────────────────────────── */
    const aplicarSello = async (valorSello: number) => {
        if (!entregaSeleccionada || guardandoSello) return;

        const evidenciaId = entregaSeleccionada.id;
        const actividadId = entregaSeleccionada.actividad_id;
        const comentario = entregaSeleccionada.comentario;
        const prevSello = entregaSeleccionada.sello;
        const prevEstado = entregaSeleccionada.estado;

        // 1. Actualización optimista inmediata (0ms de latencia): el nivel se ve seleccionado al instante
        setBandeja(prev => {
            if (!prev) return prev;
            return {
                ...prev,
                grupos: prev.grupos.map(g =>
                    g.actividad_id === actividadId
                        ? {
                            ...g,
                            pendientes: g.evidencias.filter(e => e.id !== evidenciaId && e.estado === 'pendiente').length,
                            revisadas: g.evidencias.filter(e => e.id === evidenciaId || e.estado === 'revisada').length,
                            evidencias: g.evidencias.map(e =>
                                e.id === evidenciaId
                                    ? { 
                                        ...e, 
                                        estado: 'revisada' as const, 
                                        sello: valorSello, 
                                        revisado_at: new Date().toISOString() 
                                      }
                                    : e
                            ),
                        }
                        : g
                ),
            };
        });

        setGuardandoSello(true);
        try {
            await evidenciasApiDocente.revisar(evidenciaId, valorSello, comentario);
        } catch (e) {
            // Revertir si falló la persistencia
            setBandeja(prev => {
                if (!prev) return prev;
                return {
                    ...prev,
                    grupos: prev.grupos.map(g =>
                        g.actividad_id === actividadId
                            ? {
                                ...g,
                                evidencias: g.evidencias.map(e =>
                                    e.id === evidenciaId
                                        ? { ...e, estado: prevEstado, sello: prevSello }
                                        : e
                                ),
                            }
                            : g
                    ),
                };
            });
            setError(mensajeDeExcepcion(e, 'No se pudo guardar la calificación'));
        } finally {
            setGuardandoSello(false);
        }
    };

    /* ── Abrir archivo original con URL firmada vigente ─────────────────── */
    const abrirArchivo = (ev: EvidenciaDocente, e: React.MouseEvent) => {
        e.stopPropagation();
        const urlOriginal = urls.get(ev.id) || ev.drive_url;
        if (urlOriginal) {
            window.open(urlOriginal, '_blank', 'noopener,noreferrer');
        } else {
            alert('El archivo no está disponible temporalmente.');
        }
    };

    /* ── Ir a la pestaña de Fichas ──────────────────────────────────────── */
    const irAFichas = () => {
        if (onCambiarSubseccion) {
            onCambiarSubseccion('fichas');
        } else {
            navigate(RUTA_FICHAS);
        }
    };

    return (
        /* FONDO GENERAL: Azul pastel sólido, limpio sin puntos */
        <div 
            className="w-full min-h-screen py-3 px-2 sm:px-6 flex flex-col font-['Inter',sans-serif]"
            style={{ 
                backgroundColor: '#DCE6F5' 
            }}
        >
            {/* ── BARRA SUPERIOR COMPACTA (En una sola línea limpia) ── */}
            <header className="w-full bg-white rounded-[16px] px-3.5 py-2 shadow-xs mb-3 flex flex-wrap items-center justify-between gap-2.5 border border-[#CBD5E1]/60">
                
                {/* Título + Indicador de estado */}
                <div className="flex items-center gap-2.5 shrink-0">
                    <h1 className="text-[17px] font-black text-[#353A36] tracking-tight">Evidencias</h1>
                    <span 
                        className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                            totalPendientes > 0
                                ? 'text-[#B45309] bg-[#FEF3C7]'
                                : 'text-[#686D68]'
                        }`}
                    >
                        {totalPendientes > 0 ? `${totalPendientes} pendientes` : 'Todo revisado'}
                    </span>
                </div>

                {/* Controles de navegación y filtros */}
                <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
                    
                    {/* Pestañas: Fichas | Evidencias */}
                    <div className="inline-flex items-center bg-[#F1F5F9] p-0.5 rounded-[8px]">
                        <button
                            type="button"
                            onClick={irAFichas}
                            className="px-3 py-1.5 rounded-[6px] text-xs font-semibold text-[#686D68] hover:text-[#353A36] hover:bg-white/80 transition-all min-h-8"
                        >
                            Fichas
                        </button>
                        <button
                            type="button"
                            className="px-3 py-1.5 rounded-[6px] text-xs font-bold bg-[#353A36] text-white shadow-xs transition-all min-h-8"
                            aria-current="page"
                        >
                            Evidencias
                        </button>
                    </div>

                    {/* Filtro de estado: Todas | Pendientes | Revisadas */}
                    <div className="inline-flex items-center gap-1">
                        {FILTROS.map(f => (
                            <button
                                key={f.k}
                                type="button"
                                onClick={() => setFiltro(f.k)}
                                className={`px-2.5 py-1.5 rounded-[8px] text-xs font-bold transition-all min-h-8 ${
                                    filtro === f.k
                                        ? 'bg-[#353A36] text-white shadow-xs'
                                        : 'bg-white text-[#686D68] hover:bg-[#F1F5F9] hover:text-[#353A36]'
                                }`}
                            >
                                {f.label}
                            </button>
                        ))}
                    </div>

                    {/* Selector de Curso */}
                    {cursos.length > 0 && (
                        <select
                            value={cursoId ?? ''}
                            onChange={(e) => {
                                const v = Number(e.target.value);
                                setCursoId(v);
                                const c = cursos.find(x => x.curso_id === v);
                                setAsignatura(c?.asignaturas[0] ?? null);
                            }}
                            aria-label="Seleccionar curso"
                            className="h-8 px-2.5 rounded-[8px] border border-[#CBD5E1] bg-white text-xs font-bold text-[#353A36] outline-none focus:border-[#353A36] transition-colors"
                        >
                            {cursos.map(c => (
                                <option key={c.curso_id} value={c.curso_id}>
                                    {c.grado} {c.seccion}
                                </option>
                            ))}
                        </select>
                    )}

                    {/* Selector de Asignatura */}
                    {cursoActual && cursoActual.asignaturas.length > 0 && (
                        <select
                            value={asignatura ?? ''}
                            onChange={(e) => setAsignatura(e.target.value || null)}
                            aria-label="Seleccionar asignatura"
                            className="h-8 px-2.5 rounded-[8px] border border-[#CBD5E1] bg-white text-xs font-bold text-[#353A36] outline-none focus:border-[#353A36] transition-colors max-w-42.5 truncate"
                        >
                            {cursoActual.asignaturas.map(a => (
                                <option key={a} value={a}>{getAsignaturaNombre(a)}</option>
                            ))}
                        </select>
                    )}

                    {/* Selector de Período (P1..P4) */}
                    <div className="inline-flex items-center gap-0.5 bg-[#F1F5F9] p-0.5 rounded-[8px]">
                        {PERIODOS.map(p => (
                            <button
                                key={p}
                                type="button"
                                onClick={() => setPeriodo(prev => (prev === p ? null : p))}
                                aria-pressed={periodo === p}
                                className={`h-7 px-2 rounded-[6px] text-[11px] font-extrabold transition-all ${
                                    periodo === p 
                                        ? 'bg-[#353A36] text-white shadow-xs' 
                                        : 'text-[#686D68] hover:bg-white/80 hover:text-[#353A36]'
                                }`}
                            >
                                {p}
                            </button>
                        ))}
                    </div>
                </div>
            </header>

            {/* ── CUERPO PRINCIPAL: LIENZO MURAL + SELECTOR STICKY ── */}
            <div className="flex-1 w-full flex items-start gap-3 sm:gap-3.5">
                
                {/* ── FONDO DONDE SE REÚNEN LAS IMÁGENES (Lienzo interior con patrón de puntos sutil) ── */}
                <main 
                    className="flex-1 min-w-0 rounded-[20px] border border-[#CBD5E1] p-4 sm:p-5 shadow-xs overflow-hidden flex flex-col gap-6"
                    style={{
                        backgroundColor: '#EAF1FB',
                        backgroundImage: 'radial-gradient(#94A3B8 1.15px, transparent 1.15px)',
                        backgroundSize: '16px 16px',
                    }}
                >
                    {cargando || cargandoBandeja ? (
                        <div className="w-full bg-white/70 border border-[#CBD5E1]/60 rounded-[12px] p-8 flex flex-col items-center justify-center gap-3">
                            <Loader2 size={28} className="animate-spin text-[#353A36]" />
                            <p className="text-xs font-bold text-[#686D68]">Cargando evidencias y miniaturas…</p>
                        </div>
                    ) : error ? (
                        <div className="w-full bg-[#FEF2F2] border border-[#FCA5A5] rounded-[12px] p-4 text-center">
                            <p className="text-xs font-bold text-[#B91C1C] flex items-center justify-center gap-1.5">
                                <AlertCircle size={15} /> {error}
                            </p>
                        </div>
                    ) : gruposFiltrados.length === 0 ? (
                        <div className="w-full bg-white border border-dashed border-[#CBD5E1] rounded-[14px] py-16 px-6 text-center flex flex-col items-center">
                            <div className="w-12 h-12 rounded-full bg-[#F1F5F9] flex items-center justify-center text-[#686D68] mb-3">
                                <Inbox size={22} strokeWidth={1.75} />
                            </div>
                            <h2 className="text-sm font-bold text-[#353A36]">No hay evidencias en este filtro</h2>
                            <p className="text-xs text-[#686D68] mt-1 max-w-sm">
                                {filtro === 'todas'
                                    ? 'Crea una ficha solicitando entrega de evidencias o selecciona otro período.'
                                    : 'No existen entregas en este estado para la combinación elegida.'}
                            </p>
                            <button
                                type="button"
                                onClick={irAFichas}
                                className="mt-4 px-4 py-2 rounded-[8px] bg-[#353A36] text-white text-xs font-bold hover:bg-[#252926] transition-colors"
                            >
                                Ir a Fichas
                            </button>
                        </div>
                    ) : (
                        gruposFiltrados.map((grupo) => {
                            const esActividadActiva = entregaSeleccionada?.actividad_id === grupo.actividad_id;
                            const actFromState = actividadesState.find(a => a.id === grupo.actividad_id);
                            const descripcionActividad = actFromState?.descripcion?.trim() 
                                || actFromState?.indicador?.trim() 
                                || actFromState?.producto?.trim() 
                                || grupo.actividad;

                            return (
                                <section key={grupo.actividad_id} className="flex flex-col gap-2.5">
                                    
                                    {/* Encabezado de la actividad con conexión visual interactiva */}
                                    <div 
                                        className={`flex items-center justify-between gap-3 pb-1 border-b transition-colors ${
                                            esActividadActiva 
                                                ? 'border-[#353A36] border-b-2' 
                                                : 'border-[#CBD5E1]'
                                        }`}
                                    >
                                        <div className="flex items-baseline gap-2 min-w-0">
                                            <h2 className="text-[15px] font-black text-[#353A36] truncate">
                                                {grupo.actividad}
                                            </h2>
                                            <p className="text-[11.5px] text-[#686D68] font-medium truncate">
                                                {grupo.ficha ? `Ficha: ${grupo.ficha}` : 'Sin ficha asociada'}
                                                {grupo.fecha ? ` · ${new Date(grupo.fecha).toLocaleDateString('es-DO')}` : ''}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-1.5 shrink-0">
                                            {esActividadActiva && (
                                                <span className="text-[9.5px] font-bold text-[#353A36] bg-white border border-[#353A36] px-2 py-0.5 rounded-[5px]">
                                                    Activa
                                                </span>
                                            )}
                                            <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#686D68] bg-white border border-[#CBD5E1] px-2.5 py-0.5 rounded-[6px]">
                                                {grupo.total} ENTREGA{grupo.total !== 1 ? 'S' : ''}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Cuadrícula densa responsiva (auto-fill, mínimo 168px) */}
                                    <div className="grid grid-cols-[repeat(auto-fill,minmax(168px,1fr))] gap-2.5 sm:gap-3">
                                        {grupo.evidencias.map((ev) => {
                                            const sello = selloPorPuntaje(ev.sello);
                                            const estaSeleccionada = ev.id === seleccionadaId;
                                            const inicial = (ev.estudiante || 'E').trim().charAt(0).toUpperCase();
                                            const avatarColors = colorAvatarEstudiante(ev.estudiante);

                                            const tintBg = sello ? sello.bgCard : '#F1F5F9';
                                            const tintIconColor = sello ? sello.textColor : '#686D68';

                                            return (
                                                <article
                                                    key={ev.id}
                                                    onClick={() => setSeleccionadaId(ev.id)}
                                                    tabIndex={0}
                                                    role="button"
                                                    aria-label={`Entrega de ${ev.estudiante}: ${ev.nombre}`}
                                                    className={`group relative bg-white rounded-[12px] border p-2 flex flex-col justify-between transition-all duration-150 cursor-pointer ${
                                                        estaSeleccionada
                                                            ? 'ring-2 ring-[#353A36] border-[#353A36] shadow-md -translate-y-0.5'
                                                            : 'border-[#CBD5E1] shadow-2xs hover:border-[#686D68] hover:shadow-xs'
                                                    }`}
                                                >
                                                    {/* Contenedor Superior Teñido: Etiqueta + Miniatura/Icono */}
                                                    <div 
                                                        className="relative w-full h-26 sm:h-28 rounded-[8px] overflow-hidden mb-2 p-1.5 flex flex-col justify-between"
                                                        style={{ backgroundColor: tintBg }}
                                                    >
                                                        {/* Píldora de Nivel de Logro flotante arriba a la izquierda */}
                                                        <div className="z-10 self-start">
                                                            <span
                                                                className="px-2 py-0.5 rounded-[5px] bg-white/95 text-[9px] font-black uppercase tracking-wider shadow-2xs"
                                                                style={{ color: tintIconColor }}
                                                            >
                                                                {sello ? sello.nivelDominio : 'PENDIENTE'}
                                                            </span>
                                                        </div>

                                                        {/* Miniatura Real / Icono */}
                                                        <div className="absolute inset-0">
                                                            <EvidenciaThumbnail
                                                                url={urls.get(ev.id) ?? null}
                                                                thumbnailUrl={ev.thumbnail_url}
                                                                mimeType={ev.mime_type}
                                                                nombre={ev.nombre}
                                                                tintBg={tintBg}
                                                                tintIconColor={tintIconColor}
                                                                className="w-full h-full"
                                                                rounded="rounded-none"
                                                            />
                                                        </div>
                                                    </div>

                                                    {/* Fila del Estudiante y su evaluación */}
                                                    <div className="flex flex-col gap-0.5 mb-2 px-0.5">
                                                        <div className="flex items-center justify-between gap-1.5 min-w-0">
                                                            <div className="flex items-center gap-1.5 min-w-0">
                                                                <span
                                                                    className="w-5 h-5 rounded-[5px] flex items-center justify-center text-[10px] font-black shrink-0 shadow-2xs"
                                                                    style={{ 
                                                                        backgroundColor: avatarColors.bg, 
                                                                        color: avatarColors.text 
                                                                    }}
                                                                >
                                                                    {inicial}
                                                                </span>
                                                                <span className="text-[12px] font-bold text-[#353A36] truncate">
                                                                    {ev.estudiante}
                                                                </span>
                                                            </div>

                                                            {sello && (
                                                                <div 
                                                                    className="flex items-center gap-1 px-1.5 py-0.5 rounded-[4px] shrink-0"
                                                                    style={{ backgroundColor: sello.bgCard }}
                                                                    title={`Nivel ${sello.nivel} (${sello.etiqueta}): ${sello.valor} pts`}
                                                                >
                                                                    <img 
                                                                        src={sello.imagen} 
                                                                        alt={sello.etiqueta} 
                                                                        className="w-3.5 h-3.5 object-contain shrink-0" 
                                                                    />
                                                                    <span 
                                                                        className="text-[10px] font-black"
                                                                        style={{ color: sello.textColor }}
                                                                    >
                                                                        {sello.valor}
                                                                    </span>
                                                                </div>
                                                            )}
                                                        </div>

                                                        {/* Descripción de la actividad inmediatamente debajo del nombre del estudiante */}
                                                        <p 
                                                            className="text-[10.5px] font-medium text-[#686D68] truncate leading-tight mt-0.5" 
                                                            title={descripcionActividad}
                                                        >
                                                            {descripcionActividad}
                                                        </p>
                                                    </div>

                                                    {/* Botón "Abrir archivo" */}
                                                    <button
                                                        type="button"
                                                        onClick={(e) => abrirArchivo(ev, e)}
                                                        title={`Abrir ${ev.nombre}`}
                                                        aria-label={`Abrir archivo de ${ev.estudiante}`}
                                                        className="w-full min-h-9 h-9 rounded-[8px] bg-[#353A36] hover:bg-[#252926] text-white text-[11.5px] font-bold flex items-center justify-center gap-1.5 transition-all shadow-xs active:scale-[0.98]"
                                                    >
                                                        <ExternalLink size={13} className="shrink-0" />
                                                        <span>Abrir archivo</span>
                                                    </button>
                                                </article>
                                            );
                                        })}
                                    </div>
                                </section>
                            );
                        })
                    )}
                </main>

                {/* ── SELECTOR VERTICAL DE SELLOS "NIVEL" (Diseño minimalista) ── */}
                <aside 
                    aria-label="Selector de nivel de sellos"
                    className="sticky top-3 self-start shrink-0 flex flex-col items-center bg-white rounded-[20px] border border-[#CBD5E1]/80 shadow-xs py-3 px-1.5 sm:px-2 min-w-24 sm:min-w-26 select-none z-30"
                >
                    <span className="text-[10px] font-black uppercase tracking-widest text-[#686D68] mb-2 text-center">
                        NIVEL
                    </span>

                    <div className="flex flex-col items-center gap-1 w-full">
                        {SELLOS_NIVEL.map((s, index) => {
                            const estaActivo = entregaSeleccionada?.sello === s.valor;
                            const tooltipId = `descriptor-nivel-${s.nivel}`;

                            return (
                                <div key={s.valor} className="relative group w-full flex flex-col items-center">
                                    {index > 0 && (
                                        <div className="h-2 w-px bg-[#E2E8F0] my-0.5" />
                                    )}

                                    {/* ── MENSAJE EMERGENTE LEGIBLE A LA IZQUIERDA DEL BOTÓN ── */}
                                    <div 
                                        id={tooltipId}
                                        role="tooltip"
                                        className="absolute right-full top-1/2 -translate-y-1/2 mr-3.5 w-72 sm:w-80 p-3.5 bg-[#252926] text-white rounded-[12px] shadow-2xl border border-[#3E4540] pointer-events-none opacity-0 invisible group-hover:opacity-100 group-hover:visible group-focus-within:opacity-100 group-focus-within:visible transition-all duration-150 z-50 text-left"
                                    >
                                        <div className="flex items-center justify-between gap-2 pb-2 mb-2 border-b border-[#3E4540]">
                                            <span className="text-[13px] font-black tracking-tight text-white">
                                                Nivel {s.nivel} ({s.etiqueta})
                                            </span>
                                            <span className="text-[10px] font-extrabold text-[#E2E8F0]">
                                                {s.valor} pts
                                            </span>
                                        </div>
                                        <p className="text-[12px] leading-relaxed text-[#CBD5E1] font-normal">
                                            {s.descriptor}
                                        </p>
                                        {/* Flecha indicadora hacia el botón */}
                                        <div 
                                            className="absolute top-1/2 -right-1.5 -translate-y-1/2 w-3 h-3 bg-[#252926] border-t border-r border-[#3E4540] rotate-45" 
                                            aria-hidden="true"
                                        />
                                    </div>

                                    {/* Botón Minimalista: Al seleccionar, la imagen PNG se agrande el doble */}
                                    <button
                                        type="button"
                                        onClick={() => aplicarSello(s.valor)}
                                        disabled={guardandoSello || !entregaSeleccionada}
                                        aria-label={`Asignar Nivel ${s.nivel} (${s.etiqueta}) - ${s.valor} puntos`}
                                        aria-describedby={tooltipId}
                                        className={`w-full flex flex-col items-center justify-center py-2 px-1 rounded-xl transition-all duration-200 bg-transparent ${
                                            estaActivo 
                                                ? 'min-h-24' 
                                                : 'min-h-14.5 hover:bg-black/3'
                                        } ${
                                            !entregaSeleccionada ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'
                                        }`}
                                    >
                                        <img 
                                            src={s.imagen} 
                                            alt={s.etiqueta} 
                                            className={`object-contain shrink-0 transition-all duration-200 ease-out ${
                                                estaActivo 
                                                    ? 'w-18 h-18 drop-shadow-md' 
                                                    : 'w-9 h-9 opacity-65 hover:opacity-100 hover:scale-105'
                                            }`}
                                        />
                                        <span 
                                            className={`text-center leading-tight transition-all duration-200 ${
                                                estaActivo 
                                                    ? 'text-[11px] font-black text-[#353A36] mt-1.5' 
                                                    : 'text-[9.5px] font-bold text-[#686D68] mt-1'
                                            }`}
                                        >
                                            {s.etiqueta}
                                        </span>
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                </aside>
            </div>
        </div>
    );
};

export default EvidenciasBandeja;
