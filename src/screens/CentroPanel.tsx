import { useMemo, useState } from 'react';
import {
    BookOpen, AlertTriangle, ClipboardList, LogOut, Search,
    Download, Plus, CheckCircle2, XCircle, ChevronDown, Calendar,
    Users, Building2, FileDown, Clock
} from 'lucide-react';
import { useAppStore } from '../store/appStore';
import { useTareaActions } from '../hooks/useTareaActions';
import { buildIncidenciaReport } from '../templates/incidenciaReport';
import { getAsignaturaNombre } from '../constants/asignaturas';
import BoletinesPrintOverlay from '../components/centro/BoletinesPrintOverlay';
import logo from '../assets/logo.png';
import type { Incidencia, Tarea } from '../types';

interface Props {
    onLogout: () => void;
}

const normalize = (str: string) =>
    str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

const GRAVEDAD_LABELS: Record<string, string> = {
    leve: 'Primera Vez',
    moderada: 'Recurrente',
    grave: 'Persistente',
};

export default function CentroPanel({ onLogout }: Props) {
    const state = useAppStore(s => s.state);
    const session = useAppStore(s => s.session);
    const { addTarea, cancelTarea } = useTareaActions();

    const currentUserProfile = useMemo(
        () => state.perfiles.find(p => p.userId === session?.user?.id),
        [state.perfiles, session]
    );
    const centroId = currentUserProfile?.centro_id;
    const centro = currentUserProfile?.centro;

    // ── Sección Boletines ────────────────────────────────────────────
    const cursosCentro = useMemo(() => {
        const seen = new Set<string>();
        return (state.cursos || [])
            .filter(c => c.centroId === centroId)
            .filter(c => {
                const key = c.sharedCourseId || String(c.id);
                if (seen.has(key)) return false;
                seen.add(key);
                return true;
            })
            .sort((a, b) => (a.grado || '').localeCompare(b.grado || '', 'es') || (a.seccion || '').localeCompare(b.seccion || ''));
    }, [state.cursos, centroId]);

    const [selectedCursoId, setSelectedCursoId] = useState<number | null>(null);
    const [printCurso, setPrintCurso] = useState<typeof cursosCentro[number] | null>(null);

    const selectedCurso = useMemo(
        () => cursosCentro.find(c => c.id === selectedCursoId) || null,
        [cursosCentro, selectedCursoId]
    );

    const estudiantesCurso = useMemo(() =>
        selectedCurso
            ? state.estudiantes.filter(e =>
                e.cursoId === selectedCurso.id ||
                (selectedCurso.sharedCourseId && e.sharedCourseId === selectedCurso.sharedCourseId)
            )
            : [],
        [state.estudiantes, selectedCurso]
    );

    const docenteBoletin = useMemo(() => {
        if (!selectedCurso) return 'Docente Titular';
        const ownerProfile = selectedCurso.userId
            ? state.perfiles.find(p => p.userId === selectedCurso.userId)
            : null;
        return ownerProfile?.nombreDocente || 'Docente Titular';
    }, [selectedCurso, state.perfiles]);

    // ── Sección Incidencias ──────────────────────────────────────────
    const centroSharedIds = useMemo(() => {
        const set = new Set<string>();
        (state.cursos || [])
            .filter(c => c.centroId === centroId)
            .forEach(c => { if (c.sharedCourseId) set.add(c.sharedCourseId); });
        return set;
    }, [state.cursos, centroId]);

    const incidenciasCentro = useMemo(() =>
        (state.incidencias || []).filter(i => centroSharedIds.has(i.sharedCourseId || '')),
        [state.incidencias, centroSharedIds]
    );

    const [buscarDocente, setBuscarDocente] = useState('');
    const [buscarEstudiante, setBuscarEstudiante] = useState('');
    const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());

    const incidenciasFiltradas = useMemo(() => {
        return incidenciasCentro.filter(i => {
            const estudiante = state.estudiantes.find(e => e.id === i.estudianteId);
            const docente = state.perfiles.find(p => p.userId === i.userId);
            const nombreEst = estudiante ? `${estudiante.nombre} ${estudiante.apellido}` : '';
            const nombreDoc = docente?.nombreDocente || '';
            const okDocente = buscarDocente.trim() === '' || normalize(nombreDoc).includes(normalize(buscarDocente));
            const okEstudiante = buscarEstudiante.trim() === '' || normalize(nombreEst).includes(normalize(buscarEstudiante));
            return okDocente && okEstudiante;
        }).sort((a, b) => (b.fecha || '').localeCompare(a.fecha || ''));
    }, [incidenciasCentro, state.estudiantes, state.perfiles, buscarDocente, buscarEstudiante]);

    const toggleExpand = (id: number) => {
        setExpandedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const descargarInforme = (incidencia: Incidencia) => {
        const estudiante = state.estudiantes.find(e => e.id === incidencia.estudianteId);
        const docente = state.perfiles.find(p => p.userId === incidencia.userId);
        const curso = state.cursos.find(c => c.sharedCourseId === incidencia.sharedCourseId);
        const html = buildIncidenciaReport({
            incidencia,
            estudiante,
            docente,
            curso,
            centroNombre: centro?.nombre,
            centroCodigo: centro?.codigoCentro,
        });
        const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        const nombreEst = estudiante ? `${estudiante.nombre}_${estudiante.apellido}` : 'estudiante';
        a.href = url;
        a.download = `informe-incidencia-${nombreEst}-${incidencia.id}.html`;
        a.click();
        URL.revokeObjectURL(url);
    };

    // ── Sección Tareas ───────────────────────────────────────────────
    const docentesCentro = useMemo(
        () => (state.perfiles || []).filter(p => p.centro_id === centroId),
        [state.perfiles, centroId]
    );

    const tareasCentro = useMemo(
        () => (state.tareas || [])
            .filter(t => t.centroId === centroId)
            .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || '')),
        [state.tareas, centroId]
    );

    const [titulo, setTitulo] = useState('');
    const [descripcion, setDescripcion] = useState('');
    const [fechaLimite, setFechaLimite] = useState('');
    const [asignacionTodos, setAsignacionTodos] = useState(true);
    const [seleccionados, setSeleccionados] = useState<Set<string>>(new Set());
    const [creando, setCreando] = useState(false);
    const [mensajeTarea, setMensajeTarea] = useState<string | null>(null);

    const toggleDocente = (uid: string) => {
        setSeleccionados(prev => {
            const next = new Set(prev);
            if (next.has(uid)) next.delete(uid);
            else next.add(uid);
            return next;
        });
    };

    const handleCrearTarea = async () => {
        if (!titulo.trim() || !centroId) return;
        const docenteIds = asignacionTodos
            ? docentesCentro.map(d => d.userId)
            : Array.from(seleccionados);
        setCreando(true);
        const tarea = await addTarea({
            centroId,
            titulo: titulo.trim(),
            descripcion: descripcion.trim(),
            fechaLimite,
            docenteIds,
        });
        setCreando(false);
        if (tarea) {
            setTitulo('');
            setDescripcion('');
            setFechaLimite('');
            setSeleccionados(new Set());
            setMensajeTarea('Tarea creada y notificada a los docentes');
            setTimeout(() => setMensajeTarea(null), 3000);
        }
    };

    const getTareaEstado = (tarea: Tarea): { label: string; color: string; bg: string } => {
        if (tarea.estado === 'cancelada') {
            return { label: 'Cancelada', color: 'text-[#5F665E]', bg: 'bg-[#EAE4DA]/60' };
        }
        const asignaciones = tarea.asignaciones || [];
        if (asignaciones.length > 0 && asignaciones.every(a => a.estado === 'completada')) {
            return { label: 'Completada', color: 'text-[#7A8D69]', bg: 'bg-[#BFC9A6]/40' };
        }
        return { label: 'Pendiente', color: 'text-[#A3792E]', bg: 'bg-[#F5BC5D]/25' };
    };

    const nombreDocente = (uid: string) =>
        state.perfiles.find(p => p.userId === uid)?.nombreDocente || 'Docente';

    if (!centroId || !centro) {
        return (
            <div className="min-h-screen bg-[#FDFBF7] flex items-center justify-center p-6">
                <div className="bg-white border border-[rgba(46,51,48,0.08)] rounded-3xl p-10 text-center shadow-sm max-w-md">
                    <Building2 size={40} className="mx-auto text-[#7A8D69] mb-4" />
                    <h2 className="text-lg font-black text-[#2E3330] mb-2">Panel no disponible</h2>
                    <p className="text-sm text-[#5F665E]">
                        No estás vinculado a un centro educativo. Contacta al administrador.
                    </p>
                    <button
                        onClick={onLogout}
                        className="mt-6 inline-flex items-center gap-2 bg-[#7A8D69] text-white text-xs font-black uppercase tracking-widest px-5 py-2.5 rounded-full hover:bg-[#6C7E5C] transition-colors"
                    >
                        <LogOut size={14} /> Cerrar sesión
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col min-h-screen bg-[#FDFBF7]">
            {/* ── Cabecera del entorno independiente ─────────────────── */}
            <header className="sticky top-0 z-40 bg-[#FDFBF7] border-b border-[rgba(46,51,48,0.08)] px-4 md:px-8 py-3">
                <div className="max-w-5xl mx-auto flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                        <img src={logo} alt="CIELO" className="w-9 h-9 object-contain shrink-0" />
                        <div className="min-w-0">
                            <p className="text-[9px] font-black uppercase tracking-[0.14em] text-[#5F665E]">
                                Panel de Dirección
                            </p>
                            <h1 className="text-sm font-black text-[#2E3330] leading-tight truncate">
                                {centro.nombre}
                            </h1>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                        <div className="hidden sm:flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white border border-[rgba(46,51,48,0.08)]">
                            <span className="h-2 w-2 rounded-full bg-[#7A8D69] animate-pulse" />
                            <span className="text-[9px] font-bold uppercase tracking-widest text-[#5F665E]">
                                Sistema Activo
                            </span>
                        </div>
                        <button
                            onClick={onLogout}
                            className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-white border border-[rgba(46,51,48,0.08)] text-[#2E3330] text-[10px] font-black uppercase tracking-widest hover:bg-[#F9F8F6] transition-colors"
                        >
                            <LogOut size={14} /> <span className="hidden sm:inline">Salir</span>
                        </button>
                    </div>
                </div>
            </header>

            {/* ── Contenido: una sola ventana, tres secciones ─────────── */}
            <main className="flex-1 overflow-y-auto px-4 md:px-8 py-5 md:py-7">
                <div className="max-w-5xl mx-auto space-y-5">
                    {/* ═══════════ 1 · BOLETINES ═══════════ */}
                    <section className="bg-white border border-[rgba(46,51,48,0.08)] rounded-[20px] p-5 md:p-6 shadow-sm">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 rounded-xl bg-[#7A8D69]/15 flex items-center justify-center text-[#7A8D69]">
                                <BookOpen size={19} />
                            </div>
                            <div>
                                <h2 className="text-base font-black text-[#2E3330] leading-tight">Boletines</h2>
                                <p className="text-[10px] font-semibold text-[#5F665E] uppercase tracking-wider mt-0.5">
                                    Cursos de la institución
                                </p>
                            </div>
                        </div>

                        <div className="grid md:grid-cols-[1fr_auto] gap-4 items-end">
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-widest text-[#5F665E] mb-1.5">
                                    Seleccionar curso
                                </label>
                                <div className="relative">
                                    <select
                                        value={selectedCursoId ?? ''}
                                        onChange={(e) => setSelectedCursoId(e.target.value ? Number(e.target.value) : null)}
                                        className="w-full appearance-none bg-[#FDFBF7] border border-[rgba(46,51,48,0.12)] rounded-2xl px-4 py-3 pr-10 text-sm font-bold text-[#2E3330] outline-none focus:border-[#7A8D69] transition-colors"
                                    >
                                        <option value="">Elegir un curso…</option>
                                        {cursosCentro.map(c => (
                                            <option key={c.id} value={c.id}>
                                                {c.grado} {c.seccion} · {getAsignaturaNombre(c.asignatura)}
                                            </option>
                                        ))}
                                    </select>
                                    <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-[#5F665E] pointer-events-none" />
                                </div>
                                {selectedCurso && (
                                    <p className="mt-2 text-[10px] font-semibold text-[#5F665E]">
                                        {estudiantesCurso.length} estudiantes matriculados
                                    </p>
                                )}
                            </div>
                            <button
                                disabled={!selectedCurso}
                                onClick={() => selectedCurso && setPrintCurso(selectedCurso)}
                                className="flex items-center justify-center gap-2 rounded-full bg-[#7A8D69] text-white text-xs font-black uppercase tracking-widest px-6 py-3 hover:bg-[#6C7E5C] hover:-translate-y-0.5 active:translate-y-0 transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:translate-y-0"
                            >
                                <Download size={15} />
                                Descargar boletines
                            </button>
                        </div>

                        {cursosCentro.length === 0 && (
                            <p className="mt-4 text-xs text-slate-400">
                                Aún no hay cursos registrados en esta institución.
                            </p>
                        )}
                    </section>

                    {/* ═══════════ 2 · INCIDENCIAS ═══════════ */}
                    <section className="bg-white border border-[rgba(46,51,48,0.08)] rounded-[20px] p-5 md:p-6 shadow-sm">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 rounded-xl bg-[#EB8847]/15 flex items-center justify-center text-[#EB8847]">
                                <AlertTriangle size={19} />
                            </div>
                            <div>
                                <h2 className="text-base font-black text-[#2E3330] leading-tight">Incidencias</h2>
                                <p className="text-[10px] font-semibold text-[#5F665E] uppercase tracking-wider mt-0.5">
                                    Registro anecdótico del centro
                                </p>
                            </div>
                        </div>

                        <div className="grid sm:grid-cols-2 gap-3 mb-4">
                            <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-full bg-[#FDFBF7] border border-[rgba(46,51,48,0.12)] focus-within:border-[#7A8D69] transition-colors">
                                <Search size={14} className="text-[#7D847A] shrink-0" />
                                <input
                                    type="text"
                                    placeholder="Buscar por docente…"
                                    value={buscarDocente}
                                    onChange={(e) => setBuscarDocente(e.target.value)}
                                    className="bg-transparent border-none outline-none text-xs font-bold text-[#2E3330] placeholder:text-[#7D847A] w-full"
                                />
                            </div>
                            <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-full bg-[#FDFBF7] border border-[rgba(46,51,48,0.12)] focus-within:border-[#7A8D69] transition-colors">
                                <Search size={14} className="text-[#7D847A] shrink-0" />
                                <input
                                    type="text"
                                    placeholder="Buscar por estudiante…"
                                    value={buscarEstudiante}
                                    onChange={(e) => setBuscarEstudiante(e.target.value)}
                                    className="bg-transparent border-none outline-none text-xs font-bold text-[#2E3330] placeholder:text-[#7D847A] w-full"
                                />
                            </div>
                        </div>

                        {incidenciasFiltradas.length === 0 ? (
                            <p className="py-8 text-center text-xs font-bold uppercase tracking-wider text-slate-400">
                                No se encontraron incidencias
                            </p>
                        ) : (
                            <ul className="divide-y divide-[rgba(46,51,48,0.06)]">
                                {incidenciasFiltradas.map(inc => {
                                    const estudiante = state.estudiantes.find(e => e.id === inc.estudianteId);
                                    const docente = state.perfiles.find(p => p.userId === inc.userId);
                                    const expanded = expandedIds.has(inc.id);
                                    const catBg =
                                        inc.categoria === 'Conducta' ? 'bg-[#EB8847]/15 text-[#A34B22]'
                                        : inc.categoria === 'Académico' ? 'bg-[#BFC9A6]/40 text-[#4F5F44]'
                                        : inc.categoria === 'Salud' ? 'bg-[#F5BC5D]/30 text-[#8A651F]'
                                        : 'bg-[#6E8CA0]/15 text-[#3E5A6B]';
                                    return (
                                        <li key={inc.id} className="py-3.5">
                                            <button
                                                onClick={() => toggleExpand(inc.id)}
                                                className="w-full flex flex-col sm:flex-row sm:items-center gap-2 text-left"
                                            >
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <p className="text-sm font-black text-[#2E3330]">
                                                            {estudiante?.nombre} {estudiante?.apellido}
                                                        </p>
                                                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${catBg}`}>
                                                            {inc.categoria}
                                                        </span>
                                                        <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                                                            {GRAVEDAD_LABELS[inc.gravedad] || inc.gravedad}
                                                        </span>
                                                    </div>
                                                    <p className="text-[11px] font-semibold text-[#5F665E] mt-1">
                                                        Docente: {docente?.nombreDocente || 'Docente'} · {inc.fecha}
                                                    </p>
                                                </div>
                                                <ChevronDown
                                                    size={16}
                                                    className={`text-[#7D847A] shrink-0 transition-transform ${expanded ? 'rotate-180' : ''}`}
                                                />
                                            </button>

                                            {expanded && (
                                                <div className="mt-3 ml-1 pl-4 border-l-2 border-[#BFC9A6] space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-200">
                                                    <div>
                                                        <p className="text-[9px] font-black uppercase tracking-widest text-[#7D847A] mb-1">
                                                            Descripción
                                                        </p>
                                                        <p className="text-[13px] text-[#2E3330] leading-relaxed whitespace-pre-wrap">
                                                            {inc.descripcion}
                                                        </p>
                                                    </div>
                                                    <div className="grid sm:grid-cols-2 gap-3">
                                                        <div>
                                                            <p className="text-[9px] font-black uppercase tracking-widest text-[#7D847A] mb-1">
                                                                Acciones pedagógicas
                                                            </p>
                                                            <p className="text-[12px] font-medium text-[#2E3330]">
                                                                {inc.accionesTomadas?.length ? inc.accionesTomadas.join(' · ') : 'Sin acciones registradas'}
                                                            </p>
                                                        </div>
                                                        <div>
                                                            <p className="text-[9px] font-black uppercase tracking-widest text-[#7D847A] mb-1">
                                                                Acuerdos y compromisos
                                                            </p>
                                                            <p className="text-[12px] font-medium text-[#2E3330]">
                                                                {inc.acuerdos || 'Sin acuerdos registrados'}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); descargarInforme(inc); }}
                                                        className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-[#7A8D69]/40 text-[#7A8D69] text-[10px] font-black uppercase tracking-widest hover:bg-[#F9F8F6] transition-colors"
                                                    >
                                                        <FileDown size={14} />
                                                        Descargar informe
                                                    </button>
                                                </div>
                                            )}
                                        </li>
                                    );
                                })}
                            </ul>
                        )}
                    </section>

                    {/* ═══════════ 3 · TAREAS ═══════════ */}
                    <section className="bg-white border border-[rgba(46,51,48,0.08)] rounded-[20px] p-5 md:p-6 shadow-sm">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 rounded-xl bg-[#6D8FB9]/15 flex items-center justify-center text-[#6D8FB9]">
                                <ClipboardList size={19} />
                            </div>
                            <div>
                                <h2 className="text-base font-black text-[#2E3330] leading-tight">Tareas</h2>
                                <p className="text-[10px] font-semibold text-[#5F665E] uppercase tracking-wider mt-0.5">
                                    Comunicados y asignaciones para docentes
                                </p>
                            </div>
                        </div>

                        {/* Formulario de nueva tarea */}
                        <div className="bg-[#FDFBF7] border border-[rgba(46,51,48,0.08)] rounded-2xl p-4 space-y-3">
                            <div className="grid md:grid-cols-[1fr_200px] gap-3">
                                <input
                                    type="text"
                                    placeholder="Título de la tarea"
                                    value={titulo}
                                    onChange={(e) => setTitulo(e.target.value)}
                                    className="bg-white border border-[rgba(46,51,48,0.12)] rounded-xl px-4 py-2.5 text-sm font-bold text-[#2E3330] placeholder:text-[#7D847A] outline-none focus:border-[#7A8D69] transition-colors"
                                />
                                <div className="flex items-center gap-2 bg-white border border-[rgba(46,51,48,0.12)] rounded-xl px-3.5 py-2.5 focus-within:border-[#7A8D69] transition-colors">
                                    <Calendar size={14} className="text-[#7D847A] shrink-0" />
                                    <input
                                        type="date"
                                        value={fechaLimite}
                                        onChange={(e) => setFechaLimite(e.target.value)}
                                        className="bg-transparent border-none outline-none text-xs font-bold text-[#2E3330] w-full"
                                    />
                                </div>
                            </div>
                            <textarea
                                rows={2}
                                placeholder="Descripción de la tarea…"
                                value={descripcion}
                                onChange={(e) => setDescripcion(e.target.value)}
                                className="w-full bg-white border border-[rgba(46,51,48,0.12)] rounded-xl px-4 py-2.5 text-sm font-medium text-[#2E3330] placeholder:text-[#7D847A] outline-none focus:border-[#7A8D69] transition-colors resize-none"
                            />

                            <div>
                                <div className="flex flex-wrap items-center gap-2">
                                    <button
                                        onClick={() => setAsignacionTodos(true)}
                                        className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest border transition-all ${
                                            asignacionTodos
                                                ? 'bg-[#7A8D69] border-[#7A8D69] text-white'
                                                : 'bg-white border-[rgba(46,51,48,0.12)] text-[#5F665E] hover:border-[#7A8D69]'
                                        }`}
                                    >
                                        <Users size={13} /> Todos los docentes
                                    </button>
                                    <button
                                        onClick={() => setAsignacionTodos(false)}
                                        className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest border transition-all ${
                                            !asignacionTodos
                                                ? 'bg-[#7A8D69] border-[#7A8D69] text-white'
                                                : 'bg-white border-[rgba(46,51,48,0.12)] text-[#5F665E] hover:border-[#7A8D69]'
                                        }`}
                                    >
                                        <ClipboardList size={13} /> Seleccionar docentes
                                    </button>
                                </div>

                                {!asignacionTodos && (
                                    <div className="mt-3 flex flex-wrap gap-1.5 animate-in fade-in duration-200">
                                        {docentesCentro.map(d => {
                                            const sel = seleccionados.has(d.userId);
                                            return (
                                                <button
                                                    key={d.userId}
                                                    onClick={() => toggleDocente(d.userId)}
                                                    className={`px-3 py-1.5 rounded-full text-[11px] font-bold border transition-all ${
                                                        sel
                                                            ? 'bg-[#BFC9A6] border-[#7A8D69] text-[#2E3330]'
                                                            : 'bg-white border-[rgba(46,51,48,0.12)] text-[#5F665E] hover:border-[#7A8D69]'
                                                    }`}
                                                >
                                                    {d.nombreDocente}
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            <div className="flex items-center gap-3">
                                <button
                                    onClick={handleCrearTarea}
                                    disabled={creando || !titulo.trim()}
                                    className="flex items-center justify-center gap-2 rounded-full bg-[#6D8FB9] text-white text-xs font-black uppercase tracking-widest px-6 py-2.5 hover:bg-[#5E7FA6] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                                >
                                    <Plus size={15} />
                                    {creando ? 'Creando…' : 'Crear tarea'}
                                </button>
                                {mensajeTarea && (
                                    <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-[#7A8D69] animate-in fade-in">
                                        <CheckCircle2 size={13} /> {mensajeTarea}
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Listado de tareas */}
                        {tareasCentro.length === 0 ? (
                            <p className="py-6 text-center text-xs font-bold uppercase tracking-wider text-slate-400">
                                Aún no hay tareas asignadas
                            </p>
                        ) : (
                            <ul className="mt-4 divide-y divide-[rgba(46,51,48,0.06)]">
                                {tareasCentro.map(tarea => {
                                    const estado = getTareaEstado(tarea);
                                    const asignaciones = tarea.asignaciones || [];
                                    return (
                                        <li key={tarea.id} className="py-3.5">
                                            <div className="flex flex-col md:flex-row md:items-center gap-2">
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <p className="text-sm font-black text-[#2E3330]">{tarea.titulo}</p>
                                                        <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest ${estado.bg} ${estado.color}`}>
                                                            {estado.label}
                                                        </span>
                                                    </div>
                                                    {tarea.descripcion && (
                                                        <p className="text-[12px] text-[#5F665E] mt-1 line-clamp-2">{tarea.descripcion}</p>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-3 shrink-0">
                                                    {tarea.fechaLimite && (
                                                        <span className="flex items-center gap-1.5 text-[10px] font-bold text-[#5F665E]">
                                                            <Clock size={13} /> {new Date(`${tarea.fechaLimite}T00:00:00`).toLocaleDateString('es-ES')}
                                                        </span>
                                                    )}
                                                    {tarea.estado !== 'cancelada' && (
                                                        <button
                                                            onClick={() => cancelTarea(tarea.id)}
                                                            className="text-[#9AA09A] hover:text-[#EB8847] transition-colors p-1"
                                                            title="Cancelar tarea"
                                                        >
                                                            <XCircle size={16} />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>

                                            {asignaciones.length > 0 && (
                                                <div className="mt-2.5 flex flex-wrap gap-1.5">
                                                    {asignaciones.map(a => {
                                                        const done = a.estado === 'completada';
                                                        return (
                                                            <span
                                                                key={a.id}
                                                                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold border ${
                                                                    done
                                                                        ? 'bg-[#BFC9A6]/35 border-[#7A8D69]/40 text-[#4F5F44]'
                                                                        : 'bg-[#EAE4DA]/40 border-[rgba(46,51,48,0.08)] text-[#5F665E]'
                                                                }`}
                                                            >
                                                                {done
                                                                    ? <CheckCircle2 size={12} className="text-[#7A8D69]" />
                                                                    : <XCircle size={12} className="text-[#9AA09A]" />}
                                                                {nombreDocente(a.userId)}
                                                            </span>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </li>
                                    );
                                })}
                            </ul>
                        )}
                    </section>

                    <p className="text-center text-[10px] font-semibold text-[#9AA09A] pb-4">
                        CIELO · Panel de Dirección · {new Date().getFullYear()}
                    </p>
                </div>
            </main>

            {printCurso && (
                <BoletinesPrintOverlay
                    curso={printCurso}
                    state={{ ...state, instituto: centro.nombre }}
                    docenteNombre={docenteBoletin}
                    onClose={() => setPrintCurso(null)}
                />
            )}
        </div>
    );
}
