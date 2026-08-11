import { useState, useMemo, type ElementType } from 'react';
import {
    Search, AlertCircle, Bookmark, FileText,
    ShieldAlert, Trash2, CheckCircle
} from 'lucide-react';
import type { AppState, Incidencia } from '../types';
import { CieloPill } from '../components/ui/CieloPill';
interface Props {
    state: AppState;
    onAddIncidencia: (i: Omit<Incidencia, 'id'>) => void;
    onDeleteIncidencia?: (id: number) => void;
}

const CATEGORIAS: { key: Incidencia['categoria']; icon: ElementType; label: string; bgColor: string; textColor: string; iconColor: string }[] = [
    { key: 'Conducta', icon: ShieldAlert, label: 'Conducta e Interacción', bgColor: 'bg-[rgba(232,140,107,0.1)]', textColor: 'text-attention', iconColor: 'text-attention' },
    { key: 'Académico', icon: Bookmark, label: 'Rendimiento Académico', bgColor: 'bg-[rgba(134,167,146,0.1)]', textColor: 'text-primary', iconColor: 'text-primary' },
    { key: 'Salud', icon: AlertCircle, label: 'Bienestar y Salud', bgColor: 'bg-[rgba(242,214,162,0.15)]', textColor: 'text-[#A3792E]', iconColor: 'text-[#A3792E]' },
    { key: 'Otro', icon: FileText, label: 'Otros Eventos', bgColor: 'bg-[rgba(110,140,160,0.1)]', textColor: 'text-[#6E8CA0]', iconColor: 'text-[#6E8CA0]' },
];

const ACCIONES = [
    'Llamado verbal', 'Nota a padres', 'Orientación',
    'Compromiso', 'Reconocimiento', 'Servicio', 'Dirección'
];

const GRAVEDAD_LABELS: Record<'leve' | 'moderada' | 'grave', string> = {
    leve: 'Primera Vez',
    moderada: 'Recurrente',
    grave: 'Persistente',
};

import { useAppStore } from '../store/appStore';

export default function Incidencias({ state, onAddIncidencia, onDeleteIncidencia }: Props) {
    const session = useAppStore((s) => s.session);
    const currentUserId = session?.user?.id;
    const [buscarEst, setBuscarEst] = useState('');
    const [estIds, setEstIds] = useState<number[]>([]);
    const [categoria, setCategoria] = useState<Incidencia['categoria']>('Conducta');
    const [descripcion, setDescripcion] = useState('');
    const [acuerdos, setAcuerdos] = useState('');
    const [accionesTomadas, setAcciones] = useState<string[]>([]);
    const [gravedad, setGravedad] = useState<'leve' | 'moderada' | 'grave'>('leve');
    const [filtro] = useState('Todas');
    const [buscarHist, setBuscarHist] = useState('');
    const [saved, setSaved] = useState(false);
    const sharedCourseIds = useMemo(() => new Set(state.cursos.map(c => c.sharedCourseId).filter(Boolean)), [state.cursos]);

    const estudiantesSeleccionados = state.estudiantes.filter((estudiante) => estIds.includes(estudiante.id));
    const estudiantesFilt = useMemo(() => {
        console.log(`[Incidencias] Estudiantes antes del filtro: ${state.estudiantes.length}`);
        const res = state.estudiantes.filter((estudiante) =>
            (sharedCourseIds.has(estudiante.sharedCourseId) || state.cursos.some(c => c.id === estudiante.cursoId)) &&
            (buscarEst === '' || `${estudiante.nombre} ${estudiante.apellido}`.toLowerCase().includes(buscarEst.toLowerCase()))
        );
        console.log(`[Incidencias] Estudiantes después del filtro: ${res.length}`);
        return res;
    }, [state.estudiantes, sharedCourseIds, state.cursos, buscarEst]);

    function toggleAccion(accion: string) {
        setAcciones((prev) => prev.includes(accion) ? prev.filter((item) => item !== accion) : [...prev, accion]);
    }

    function toggleEstudiante(estudianteId: number) {
        setEstIds((prev) =>
            prev.includes(estudianteId)
                ? prev.filter((item) => item !== estudianteId)
                : [...prev, estudianteId]
        );
        setBuscarEst('');
    }

    function handleSubmit() {
        if (!estudiantesSeleccionados.length || !descripcion.trim()) return;

        estudiantesSeleccionados.forEach((estudiante) => {
            onAddIncidencia({
                estudianteId: estudiante.id,
                categoria,
                descripcion,
                accionesTomadas,
                acuerdos,
                gravedad,
                fecha: new Date().toISOString().split('T')[0],
            });
        });

        setDescripcion('');
        setAcuerdos('');
        setAcciones([]);
        setEstIds([]);
        setSaved(true);
        setTimeout(() => setSaved(false), 2500);
    }

    const histFiltrado = state.incidencias
        .filter((incidencia) => filtro === 'Todas' || incidencia.categoria === filtro)
        .filter((incidencia) => incidencia.userId === currentUserId || !incidencia.userId)
        .filter((incidencia) => {
            const isRelated = sharedCourseIds.has(incidencia.sharedCourseId || '');
            if (!isRelated) return false;
            const est = state.estudiantes.find(e => e.id === incidencia.estudianteId);
            if (!est) return false;
            const normalize = (str: string) => str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
            const nombre = `${est.nombre} ${est.apellido}`;
            return normalize(nombre).includes(normalize(buscarHist));
        });

    return (
        <div className="flex flex-col flex-1 h-full overflow-hidden bg-[#FDFBF7]">
            <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 flex flex-col gap-6 scroll-smooth scrollbar-hide">
                {/* Main Header */}
                <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-2 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div>
                        <h1 className="text-3xl font-black tracking-tight mb-4 text-[#2E3330] font-notion-title">Registro Anecdótico</h1>
                        <nav className="flex flex-wrap gap-2 text-sm font-semibold">
                            <span className="px-5 py-2.5 bg-[#EAE4DA] rounded-full text-[#2E3330] shadow-sm uppercase tracking-widest text-xs font-black">
                                SEGUIMIENTO DISCIPLINARIO
                            </span>
                            <span className="px-5 py-2.5 text-[#7D847A] rounded-full uppercase tracking-widest text-xs font-black">
                                BITÁCORA ESCOLAR
                            </span>
                        </nav>
                    </div>
                    <div className="flex items-center gap-3">
                        <CieloPill variant="neutral" className="h-10 px-5 gap-2.5 shadow-sm shrink-0 bg-white">
                            <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                            <span className="text-xs font-bold uppercase tracking-widest text-[#5F665E]">
                                Sistema Activo · {new Date().toLocaleDateString('es-ES')}
                            </span>
                        </CieloPill>
                    </div>
                </header>

                <main className="flex flex-col gap-6 items-start w-full">
                    {/* HORIZONTAL FORM BANNER */}
                    <div className="w-full flex flex-col xl:flex-row gap-6 bg-white rounded-[24px] p-6 shadow-sm border border-[rgba(46,51,48,0.08)] items-start xl:items-stretch animate-in fade-in slide-in-from-bottom-4 duration-500 delay-100">
                        {/* Section 1: Estudiantes Vinculados */}
                        <section className="flex flex-col gap-2 flex-1 xl:max-w-62.5 relative">
                            <h2 className="text-xs font-black uppercase tracking-[0.15em] text-[#7D847A] flex items-center gap-1">
                                <span className="text-[10px]">1.</span> ESTUDIANTES
                            </h2>
                            <div className="relative">
                                <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#7D847A]">
                                    <Search size={16} />
                                </span>
                                <input
                                    type="text"
                                    placeholder="Buscar..."
                                    className="w-full pl-9 pr-4 py-2 rounded-full border border-[rgba(46,51,48,0.1)] focus:border-[#D68253] focus:ring-1 focus:ring-[#D68253] text-sm font-bold text-[#2E3330] placeholder:text-[#7D847A] transition-shadow outline-none"
                                    style={{ backgroundColor: '#FFFFFF' }}
                                    value={buscarEst}
                                    onChange={(e) => setBuscarEst(e.target.value)}
                                />
                                {buscarEst.trim() !== '' && (
                                    <div className="absolute top-full mt-2 w-full z-10 max-h-48 overflow-y-auto border border-slate-300 rounded-[20px] bg-[#FDFBF7] shadow-lg p-2 flex flex-col gap-1">
                                        {estudiantesFilt.map(e => (
                                            <button
                                                key={e.id}
                                                onClick={() => toggleEstudiante(e.id)}
                                                className={`w-full text-left p-3 hover:bg-[#FAF6F0] rounded-xl flex items-center justify-between group transition-all ${estIds.includes(e.id) ? 'bg-[#FAF6F0]' : ''}`}
                                            >
                                                <span className="text-xs font-bold text-[#2E3330] group-hover:text-primary">{e.nombre} {e.apellido}</span>
                                                {estIds.includes(e.id) && <span className="text-xs font-black text-primary uppercase tracking-widest">Sel.</span>}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                            
                            {/* Selected students */}
                            {estudiantesSeleccionados.length > 0 && (
                                <div className="mt-2 flex flex-wrap gap-1.5 animate-in fade-in duration-300 max-h-30 overflow-y-auto scrollbar-hide">
                                    {estudiantesSeleccionados.map(e => (
                                        <div key={e.id} className="flex items-center justify-between gap-1.5 bg-[#EAE4DA]/50 pl-3 pr-2 py-1.5 rounded-full border border-[rgba(46,51,48,0.08)] w-full">
                                            <span className="text-xs font-bold text-[#2E3330] truncate">{e.nombre} {e.apellido}</span>
                                            <button onClick={() => toggleEstudiante(e.id)} className="text-[#7D847A] hover:text-red-500 font-bold transition-all text-xs flex items-center justify-center shrink-0 w-5 h-5 rounded-full hover:bg-white">
                                                &times;
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </section>

                        <div className="hidden xl:block w-px bg-[rgba(46,51,48,0.08)]"></div>

                        {/* Section 2: Categoría & Gravedad */}
                        <section className="flex flex-col gap-3 flex-[1.5]">
                            <h2 className="text-xs font-black uppercase tracking-[0.15em] text-[#7D847A] flex items-center gap-1">
                                <span className="text-[10px]">2.</span> CATEGORÍA Y GRAVEDAD
                            </h2>
                            <div className="flex flex-col gap-2">
                                <div className="flex flex-wrap gap-1.5">
                                    {CATEGORIAS.map(cat => {
                                        const Icon = cat.icon;
                                        const isSel = categoria === cat.key;
                                        return (
                                            <CieloPill
                                                as="button"
                                                key={cat.key}
                                                onClick={() => setCategoria(cat.key)}
                                                variant={isSel ? 'neutral' : 'ghost'}
                                                className={`px-3 py-1.5 gap-1.5 w-fit h-auto min-h-8 ${isSel ? 'text-white' : 'bg-white border-[rgba(46,51,48,0.1)] text-[#5F665E] hover:bg-[#FAF6F0]'}`}
                                                style={isSel ? { backgroundColor: '#D68253', color: '#FFFFFF', borderColor: '#D68253' } : {}}
                                            >
                                                <Icon size={12} className={isSel ? 'text-white' : cat.iconColor} />
                                                <span className="text-[10px] font-bold uppercase tracking-wider leading-tight">{cat.label}</span>
                                            </CieloPill>
                                        );
                                    })}
                                </div>
                                <div className="flex flex-wrap gap-1.5 mt-1">
                                    {(['leve', 'moderada', 'grave'] as const).map((g) => {
                                        const isSel = gravedad === g;
                                        return (
                                            <button
                                                key={g}
                                                onClick={() => setGravedad(g)}
                                                className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border transition-colors ${isSel ? 'bg-[#E8C166] text-[#2E3330] border-[#E8C166]/20 shadow-sm' : 'bg-white text-[#5F665E] border-[rgba(46,51,48,0.1)] hover:bg-[#FAF6F0]'}`}
                                            >
                                                {GRAVEDAD_LABELS[g]}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </section>

                        <div className="hidden xl:block w-px bg-[rgba(46,51,48,0.08)]"></div>

                        {/* Section 3: Detalles del Acontecimiento */}
                        <section className="flex flex-col gap-2 flex-[1.5]">
                            <h2 className="text-xs font-black uppercase tracking-[0.15em] text-[#7D847A] flex items-center gap-1">
                                <span className="text-[10px]">3.</span> DETALLES
                            </h2>
                            <div className="flex flex-col gap-2 h-full">
                                <input
                                    className="w-full px-3.5 py-2.5 rounded-xl border border-[rgba(46,51,48,0.1)] focus:border-[#D68253] focus:ring-1 focus:ring-[#D68253] text-xs font-bold text-[#2E3330] placeholder:text-[#7D847A] transition-shadow outline-none flex-1"
                                    style={{ backgroundColor: '#FFFFFF' }}
                                    placeholder="Descripción de los hechos..."
                                    type="text"
                                    value={descripcion}
                                    onChange={(e) => setDescripcion(e.target.value)}
                                />
                                <input
                                    className="w-full px-3.5 py-2.5 rounded-xl border border-[rgba(46,51,48,0.1)] focus:border-[#D68253] focus:ring-1 focus:ring-[#D68253] text-xs font-bold text-[#2E3330] placeholder:text-[#7D847A] transition-shadow outline-none flex-1"
                                    style={{ backgroundColor: '#FFFFFF' }}
                                    placeholder="Acuerdos y compromisos..."
                                    type="text"
                                    value={acuerdos}
                                    onChange={(e) => setAcuerdos(e.target.value)}
                                />
                            </div>
                        </section>

                        <div className="hidden xl:block w-px bg-[rgba(46,51,48,0.08)]"></div>

                        {/* Section 4: Acciones Pedagógicas */}
                        <section className="flex flex-col gap-2 flex-1">
                            <h2 className="text-xs font-black uppercase tracking-[0.15em] text-[#7D847A] flex items-center gap-1">
                                <span className="text-[10px]">4.</span> ACCIONES
                            </h2>
                            <div className="flex flex-wrap gap-1.5">
                                {ACCIONES.map(accion => {
                                    const active = accionesTomadas.includes(accion);
                                    return (
                                        <button
                                            key={accion}
                                            onClick={() => toggleAccion(accion)}
                                            className={`px-2.5 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider border transition-colors ${active ? 'bg-[#D68253] border-[#D68253] text-white shadow-sm' : 'bg-transparent text-[#5F665E] border-[rgba(46,51,48,0.15)] hover:bg-[#FAF6F0]'}`}
                                        >
                                            {accion}
                                        </button>
                                    );
                                })}
                            </div>
                        </section>

                        {/* Final Action Button */}
                        <div className="flex items-center xl:items-end justify-center w-full xl:w-auto h-full mt-4 xl:mt-0 xl:ml-auto">
                            <div className="flex flex-col items-center gap-2 w-full xl:w-auto">
                                <button
                                    onClick={handleSubmit}
                                    disabled={!estIds.length || !descripcion.trim()}
                                    className={`w-full xl:w-auto px-8 py-3 xl:h-22.5 xl:rounded-3xl rounded-full bg-[#2E3330] text-white text-xs font-black uppercase tracking-widest transition-all flex justify-center items-center gap-2 whitespace-nowrap ${(!estIds.length || !descripcion.trim()) ? 'opacity-50 cursor-not-allowed' : 'hover:bg-[#D68253] hover:text-white shadow-md hover:-translate-y-0.5 active:scale-95'}`}
                                >
                                    Guardar <br className="hidden xl:block" /> Registro
                                </button>
                                {saved && (
                                    <span className="text-primary text-[10px] font-black uppercase tracking-wider animate-in fade-in flex items-center gap-1 absolute -bottom-6">
                                        <CheckCircle size={12} /> Guardado
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* BOTTOM AREA: History Table Container */}
                    <div className="w-full flex flex-col bg-white rounded-[24px] shadow-sm border border-[rgba(46,51,48,0.08)] overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500 delay-200">
                        {/* Table Header Area */}
                        <div className="p-6 border-b border-[rgba(46,51,48,0.08)] flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-l-4 border-[#E8C166]" style={{ backgroundColor: 'rgba(214, 130, 83, 0.08)' }}>
                            <div>
                                <h2 className="text-lg font-black text-[#2E3330]">Bitácora de Acontecimientos</h2>
                                <p className="text-xs font-black text-[#7D847A] uppercase tracking-widest mt-1">HISTORIAL DEL AÑO ESCOLAR EN CURSO</p>
                            </div>
                            <div className="relative w-full md:w-72">
                                <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#7D847A]">
                                    <Search size={16} />
                                </span>
                                <input
                                    type="text"
                                    placeholder="BUSCAR POR ESTUDIANTE..."
                                    className="w-full pl-9 pr-4 py-2.5 rounded-full border border-[rgba(46,51,48,0.1)] focus:border-[#D68253] focus:ring-1 focus:ring-[#D68253] text-xs font-bold uppercase tracking-wider text-[#2E3330] placeholder:text-[#7D847A] transition-shadow outline-none"
                                    style={{ backgroundColor: '#FFFFFF' }}
                                    value={buscarHist}
                                    onChange={(e) => setBuscarHist(e.target.value)}
                                />
                            </div>
                        </div>

                        {/* Table Wrapper with overflow for scrolling */}
                        <div className="overflow-x-auto p-0 scrollbar-hide">
                            <table className="w-full text-left border-collapse min-w-225">
                                <thead>
                                    <tr className="bg-[#D68253]/5 border-b border-[rgba(46,51,48,0.08)]">
                                        <th className="p-4 text-[10px] font-black text-[#7D847A] uppercase tracking-widest w-55">Estudiante</th>
                                        <th className="p-4 text-[10px] font-black text-[#7D847A] uppercase tracking-widest">Categoría</th>
                                        <th className="p-4 text-[10px] font-black text-[#7D847A] uppercase tracking-widest">Gravedad</th>
                                        <th className="p-4 text-[10px] font-black text-[#7D847A] uppercase tracking-widest max-w-55">Descripción</th>
                                        <th className="p-4 text-[10px] font-black text-[#7D847A] uppercase tracking-widest max-w-37.5">Acuerdos</th>
                                        <th className="p-4 text-[10px] font-black text-[#7D847A] uppercase tracking-widest">Acciones</th>
                                        <th className="p-4 text-[10px] font-black text-[#7D847A] uppercase tracking-widest w-25">Fecha</th>
                                        <th className="p-4 w-12 text-center"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[rgba(46,51,48,0.08)] bg-white">
                                    {histFiltrado.length === 0 ? (
                                        <tr>
                                            <td colSpan={8} className="p-8 text-center text-[#7D847A] text-xs font-bold uppercase tracking-widest py-20">
                                                No se han registrado acontecimientos
                                            </td>
                                        </tr>
                                    ) : (
                                        histFiltrado.map((incidencia) => {
                                            const est = state.estudiantes.find(e => e.id === incidencia.estudianteId);
                                            if (!est) return null;
                                            return (
                                                <tr key={incidencia.id} className="hover:bg-[#FAF6F0] transition-colors group">
                                                    <td className="p-4">
                                                        <div className="text-xs font-bold text-[#2E3330] leading-tight truncate">{est.nombre} {est.apellido}</div>
                                                        <div className="text-[10px] font-bold text-[#7D847A] mt-1 uppercase tracking-widest">Expediente #0{est.id}</div>
                                                    </td>
                                                    <td className="p-4">
                                                        <span className="px-2.5 py-1.5 text-[10px] font-black rounded-full uppercase tracking-widest border" style={{ backgroundColor: 'rgba(198, 61, 61, 0.08)', color: '#C63D3D', borderColor: 'rgba(198, 61, 61, 0.15)' }}>
                                                            {incidencia.categoria}
                                                        </span>
                                                    </td>
                                                    <td className="p-4">
                                                        <span className={`text-[10px] font-black uppercase tracking-widest ${
                                                            incidencia.gravedad === 'grave' 
                                                                ? 'text-attention' 
                                                                : incidencia.gravedad === 'moderada' 
                                                                    ? 'text-warning' 
                                                                    : 'text-primary'
                                                        }`}>
                                                            {GRAVEDAD_LABELS[incidencia.gravedad]}
                                                        </span>
                                                    </td>
                                                    <td className="p-4">
                                                        <p className="max-w-55 line-clamp-2 text-xs font-medium text-[#5F665E] leading-relaxed">
                                                            {incidencia.descripcion}
                                                        </p>
                                                    </td>
                                                    <td className="p-4">
                                                        <p className="max-w-37.5 line-clamp-2 text-xs font-medium italic leading-relaxed text-[#7D847A]">
                                                            {incidencia.acuerdos || 'Ninguno registrado'}
                                                        </p>
                                                    </td>
                                                    <td className="p-4">
                                                        <p className="text-xs font-medium text-[#5F665E] line-clamp-2 max-w-37.5">
                                                            {incidencia.accionesTomadas.join(', ') || 'Sin acciones'}
                                                        </p>
                                                    </td>
                                                    <td className="p-4">
                                                        <span className="text-xs font-bold text-[#7D847A]">
                                                            {incidencia.fecha}
                                                        </span>
                                                    </td>
                                                    <td className="p-4 text-center">
                                                        <button
                                                            onClick={() => {
                                                                if (onDeleteIncidencia && window.confirm('¿Eliminar esta incidencia?')) {
                                                                    onDeleteIncidencia(incidencia.id);
                                                                }
                                                            }}
                                                            className="text-[#7D847A] hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100 p-1 rounded-full hover:bg-white border border-transparent hover:border-red-200"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </td>
                                                </tr>
                                            )
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
}