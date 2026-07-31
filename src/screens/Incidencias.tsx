import { useState, useMemo, type ElementType } from 'react';
import {
    Search, AlertCircle, Bookmark, FileText,
    ShieldAlert, Trash2, CheckCircle
} from 'lucide-react';
import type { AppState, Incidencia } from '../types';

interface Props {
    state: AppState;
    onAddIncidencia: (i: Omit<Incidencia, 'id'>) => void;
    onDeleteIncidencia?: (id: number) => void;
}

const CATEGORIAS: { key: Incidencia['categoria']; icon: ElementType; label: string; bgColor: string; textColor: string; iconColor: string }[] = [
    { key: 'Conducta', icon: ShieldAlert, label: 'Conducta e Interacción', bgColor: 'bg-[rgba(232,140,107,0.1)]', textColor: 'text-[#E88C6B]', iconColor: 'text-[#E88C6B]' },
    { key: 'Académico', icon: Bookmark, label: 'Rendimiento Académico', bgColor: 'bg-[rgba(134,167,146,0.1)]', textColor: 'text-[#86A792]', iconColor: 'text-[#86A792]' },
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

export default function Incidencias({ state, onAddIncidencia, onDeleteIncidencia }: Props) {
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
            <div className="flex-1 overflow-y-auto px-6 py-10 md:px-12 scroll-smooth scrollbar-hide">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 mb-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div>
                        <h1 className="text-4xl font-black text-[#1E293B] tracking-tight mb-3 font-notion-title">
                            Registro Anecdótico
                        </h1>
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2.5 bg-slate-200/50 px-4 py-2 rounded-xl border border-slate-200">
                                <span className="text-[11px] font-black text-slate-600 uppercase tracking-widest">
                                    Seguimiento Disciplinario
                                </span>
                            </div>
                            <div className="h-1.5 w-1.5 rounded-full bg-slate-400"></div>
                            <span className="text-[11px] font-black text-slate-500 uppercase tracking-[0.2em]">Bitácora Escolar</span>
                        </div>
                    </div>
                    <div className="h-14 px-6 rounded-[10px] border border-slate-200 bg-white flex items-center gap-3 shadow-lg shadow-slate-200/40 shrink-0">
                        <div className="h-2.5 w-2.5 rounded-full bg-turf-green-base shadow-[0_0_8px_rgba(15,117,61,0.5)] animate-pulse" />
                        <span className="text-xs font-bold uppercase tracking-widest text-slate-500">
                            Sistema Activo · {new Date().toLocaleDateString('es-ES')}
                        </span>
                    </div>
                </div>

                <div className="max-w-350 mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 delay-100 fill-mode-both space-y-10">
                    <div className="grid grid-cols-12 gap-8">
                    <div className="col-span-12 space-y-6 lg:col-span-4">
                        <div className="bg-white border border-slate-200 rounded-[10px] p-8 shadow-xl shadow-slate-200/50 space-y-6">
                            <div>
                                <h3 className="text-[11px] font-black uppercase tracking-[0.25em] text-slate-600 mb-4">1. Estudiantes Vinculados</h3>
                                <div className="h-14 flex items-center gap-3 px-5 rounded-[10px] bg-slate-50 border border-slate-200 focus-within:border-turf-green-base focus-within:ring-2 focus-within:ring-turf-green-base/20 transition-all">
                                    <Search size={18} className="text-slate-400" />
                                    <input
                                        type="text"
                                        placeholder="Buscar estudiante..."
                                        className="bg-transparent border-none outline-none font-bold text-slate-700 text-sm w-full"
                                        value={buscarEst}
                                        onChange={(e) => setBuscarEst(e.target.value)}
                                    />
                                </div>
                                {buscarEst.trim() !== '' && (
                                    <div className="mt-2 max-h-48 overflow-y-auto border border-slate-200 rounded-[10px] bg-white shadow-lg p-1.5 flex flex-col gap-1">
                                        {estudiantesFilt.map(e => (
                                            <button
                                                key={e.id}
                                                onClick={() => toggleEstudiante(e.id)}
                                                className={`w-full text-left p-3 hover:bg-slate-50 rounded-[10px] flex items-center justify-between group transition-all ${estIds.includes(e.id) ? 'bg-slate-50' : ''}`}
                                            >
                                                <span className="text-sm font-bold text-slate-700 group-hover:text-turf-green-base">{e.nombre} {e.apellido}</span>
                                                {estIds.includes(e.id) && <span className="text-xs font-black text-turf-green-base uppercase tracking-widest">Seleccionado</span>}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {estudiantesSeleccionados.length > 0 && (
                                <div className="space-y-2 border-t border-slate-100 pt-4 animate-in fade-in duration-300">
                                    <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-400">Estudiantes Vinculados a este Registro:</h4>
                                    <div className="flex flex-wrap gap-2">
                                        {estudiantesSeleccionados.map(e => (
                                            <div key={e.id} className="flex items-center gap-2 bg-slate-100 pl-3.5 pr-2.5 py-1.5 rounded-full border border-slate-200">
                                                <span className="text-xs font-bold text-slate-700">{e.nombre} {e.apellido}</span>
                                                <button onClick={() => toggleEstudiante(e.id)} className="text-slate-400 hover:text-red-500 font-bold transition-all text-sm w-4 h-4 flex items-center justify-center rounded-full hover:bg-white">&times;</button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="border-t border-slate-100 pt-6">
                                <h3 className="text-[11px] font-black uppercase tracking-[0.25em] text-slate-600 mb-4">2. Categoría y Gravedad</h3>
                                <div className="grid grid-cols-2 gap-4 mb-4">
                                    {CATEGORIAS.map(cat => {
                                        const Icon = cat.icon;
                                        const isSel = categoria === cat.key;
                                        return (
                                            <button
                                                key={cat.key}
                                                onClick={() => setCategoria(cat.key)}
                                                className={`p-4 rounded-[10px] border text-left transition-all ${isSel ? 'bg-slate-900 border-slate-900 text-white shadow-lg' : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'}`}
                                            >
                                                <Icon size={20} className={isSel ? 'text-white' : cat.iconColor} />
                                                <p className="text-xs font-black uppercase tracking-wider mt-3 leading-tight">{cat.label}</p>
                                            </button>
                                        );
                                    })}
                                </div>
                                <div className="flex bg-slate-100 p-1.5 rounded-[10px] border border-slate-200">
                                    {(['leve', 'moderada', 'grave'] as const).map((g) => (
                                        <button
                                            key={g}
                                            onClick={() => setGravedad(g)}
                                            className={`flex-1 py-2 text-center text-[10px] font-black uppercase tracking-widest rounded-[10px] transition-all ${
                                                gravedad === g 
                                                    ? 'bg-white text-slate-800 shadow-sm border border-slate-200/50' 
                                                    : 'text-slate-400 hover:text-slate-600'
                                            }`}
                                        >
                                            {GRAVEDAD_LABELS[g]}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="border-t border-slate-100 pt-6 space-y-4">
                                <h3 className="text-[11px] font-black uppercase tracking-[0.25em] text-slate-600">3. Detalles del Acontecimiento</h3>
                                <div>
                                    <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Descripción de los Hechos</label>
                                    <textarea
                                        rows={4}
                                        placeholder="Describe de forma objetiva lo sucedido..."
                                        className="w-full p-4 rounded-[10px] border border-slate-200 bg-slate-50/50 text-slate-700 text-sm font-medium outline-none focus:border-turf-green-base focus:ring-2 focus:ring-turf-green-base/15 transition-all resize-none"
                                        value={descripcion}
                                        onChange={(e) => setDescripcion(e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Acuerdos y Compromisos</label>
                                    <textarea
                                        rows={2}
                                        placeholder="Medidas adoptadas o compromisos del estudiante..."
                                        className="w-full p-4 rounded-[10px] border border-slate-200 bg-slate-50/50 text-slate-700 text-sm font-medium outline-none focus:border-turf-green-base focus:ring-2 focus:ring-turf-green-base/15 transition-all resize-none"
                                        value={acuerdos}
                                        onChange={(e) => setAcuerdos(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="border-t border-slate-100 pt-6">
                                <h3 className="text-[11px] font-black uppercase tracking-[0.25em] text-slate-600 mb-3">4. Acciones Pedagógicas</h3>
                                <div className="flex flex-wrap gap-2 mb-6">
                                    {ACCIONES.map(accion => {
                                        const active = accionesTomadas.includes(accion);
                                        return (
                                            <button
                                                key={accion}
                                                onClick={() => toggleAccion(accion)}
                                                className={`px-4 py-2 rounded-[10px] text-xs font-bold transition-all border ${
                                                    active
                                                        ? 'bg-slate-900 border-slate-900 text-white'
                                                        : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
                                                }`}
                                            >
                                                {accion}
                                            </button>
                                        );
                                    })}
                                </div>
                                <button
                                    onClick={handleSubmit}
                                    disabled={!estIds.length || !descripcion.trim()}
                                    className="w-full py-4 rounded-[10px] bg-turf-green-base text-white text-xs font-black uppercase tracking-widest hover:bg-[#0c5c30] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-turf-green-base/20"
                                >
                                    Guardar en Bitácora
                                </button>
                                {saved && (
                                    <div className="flex items-center justify-center gap-2 text-turf-green-base text-xs font-black uppercase tracking-wider mt-3 animate-in fade-in">
                                        <CheckCircle size={14} /> Registro Guardado Correctamente
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="col-span-12 lg:col-span-8 space-y-6">
                        <div className="bg-white border border-slate-200 rounded-[10px] p-6 sm:p-8 shadow-xl shadow-slate-200/50 flex flex-col gap-6">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
                                <div>
                                    <h2 className="text-xl font-black text-slate-800">Bitácora de Acontecimientos</h2>
                                    <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mt-1">Historial del Año Escolar en Curso</p>
                                </div>
                                <div className="h-12 w-full sm:w-64 bg-slate-50 border border-slate-200 rounded-[10px] px-4 flex items-center gap-2.5">
                                    <Search size={16} className="text-slate-400" />
                                    <input
                                        type="text"
                                        placeholder="Buscar por estudiante..."
                                        className="bg-transparent border-none outline-none font-bold text-slate-700 text-xs w-full"
                                        value={buscarHist}
                                        onChange={(e) => setBuscarHist(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="overflow-x-auto -mx-6 sm:mx-0">
                                <table className="w-full border-collapse text-left text-sm text-slate-500">
                                    <thead className="bg-slate-50 text-[10px] font-black uppercase tracking-wider text-slate-400 border-b border-slate-200">
                                        <tr>
                                            <th scope="col" className="px-6 py-4">Estudiante</th>
                                            <th scope="col" className="px-6 py-4">Categoría</th>
                                            <th scope="col" className="px-6 py-4">Gravedad</th>
                                            <th scope="col" className="px-6 py-4">Descripción</th>
                                            <th scope="col" className="px-6 py-4">Acuerdos</th>
                                            <th scope="col" className="px-6 py-4">Acciones</th>
                                            <th scope="col" className="px-6 py-4 text-center">Fecha</th>
                                            <th scope="col" className="px-4 py-4"></th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {histFiltrado.length === 0 ? (
                                            <tr>
                                                <td colSpan={8} className="px-6 py-12 text-center text-slate-400 text-xs font-bold uppercase tracking-wider">
                                                    No se han registrado acontecimientos en esta categoría
                                                </td>
                                            </tr>
                                        ) : (
                                            histFiltrado.map((incidencia) => {
                                                const est = state.estudiantes.find(e => e.id === incidencia.estudianteId);
                                                const cat = CATEGORIAS.find(c => c.key === incidencia.categoria);
                                                if (!est) return null;
                                                return (
                                                    <tr key={incidencia.id} className="hover:bg-slate-50/50 transition-colors">
                                                        <td className="px-6 py-4">
                                                            <p className="text-sm font-black text-slate-800 leading-tight">{est.nombre} {est.apellido}</p>
                                                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter mt-0.5">Expediente #0{est.id}</p>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${cat?.bgColor || 'bg-slate-100'} ${cat?.textColor || 'text-slate-600'}`}>
                                                                <span className="w-1.5 h-1.5 rounded-full bg-current" />
                                                                {incidencia.categoria}
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                             <span className={`text-[10px] font-black uppercase tracking-widest ${
                                                                 incidencia.gravedad === 'grave' 
                                                                     ? 'text-[#E88C6B]' 
                                                                     : incidencia.gravedad === 'moderada' 
                                                                         ? 'text-[#A3792E]' 
                                                                         : 'text-slate-400'
                                                             }`}>
                                                                {GRAVEDAD_LABELS[incidencia.gravedad]}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <p className="max-w-xs line-clamp-2 text-[13px] font-semibold text-slate-700 leading-relaxed">
                                                                {incidencia.descripcion}
                                                            </p>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <p className="max-w-xs line-clamp-2 text-[14px] font-normal italic leading-relaxed text-slate-400">
                                                                {incidencia.acuerdos || 'Ninguno registrado'}
                                                            </p>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <p className="whitespace-nowrap text-[13px] font-medium text-slate-600">
                                                                {incidencia.accionesTomadas.join(', ') || 'Sin acciones'}
                                                            </p>
                                                        </td>
                                                        <td className="px-6 py-4 text-center">
                                                            <span className="whitespace-nowrap text-[12px] font-medium text-slate-400">
                                                                {incidencia.fecha}
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-3 text-right">
                                                            <button
                                                                onClick={() => {
                                                                    if (onDeleteIncidencia && window.confirm('¿Eliminar esta incidencia?')) {
                                                                        onDeleteIncidencia(incidencia.id);
                                                                    }
                                                                }}
                                                                className="text-slate-300 transition-colors hover:text-[#E88C6B]"
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
                    </div>
                </div>
            </div>
        </div>
        </div>
    );
}