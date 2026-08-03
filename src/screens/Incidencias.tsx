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
            <div className="flex-1 overflow-y-auto px-2 py-2 md:px-4 scroll-smooth scrollbar-hide">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5 mb-3.5 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div>
                        <h1 className="text-3xl font-black text-[#2E3330] tracking-tight mb-2 font-notion-title">
                            Registro Anecdótico
                        </h1>
                        <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2 bg-[#EAE4DA] px-3 py-1 rounded-full border border-[rgba(46,51,48,0.08)]">
                                <span className="text-[9px] font-bold text-[#2E3330] uppercase tracking-[0.08em]">
                                    Seguimiento Disciplinario
                                </span>
                            </div>
                            <div className="h-1.5 w-1.5 rounded-full bg-slate-350"></div>
                            <span className="text-[9px] font-bold text-[#5F665E] uppercase tracking-[0.08em]">Bitácora Escolar</span>
                        </div>
                    </div>
                    <div className="h-10 px-5 rounded-full border border-[rgba(46,51,48,0.08)] bg-[#FDFBF7] flex items-center gap-2.5 shadow-sm shrink-0">
                        <div className="h-2 w-2 rounded-full bg-[#7A8D69] animate-pulse" />
                        <span className="text-[9px] font-bold uppercase tracking-widest text-[#5F665E]">
                            Sistema Activo · {new Date().toLocaleDateString('es-ES')}
                        </span>
                    </div>
                </div>

                <div className="max-w-full mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 delay-100 fill-mode-both space-y-3">
                    <div className="grid grid-cols-12 gap-3">
                    <div className="col-span-12 space-y-3 xl:col-span-4">
                        <div className="bg-white border border-[rgba(46,51,48,0.08)] rounded-[20px] p-4 shadow-sm space-y-4.5">
                            <div>
                                <h3 className="text-[10px] font-black uppercase tracking-[0.15em] text-[#2E3330] mb-3">1. Estudiantes Vinculados</h3>
                                <div className="flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-white border border-[#7A8D69]/35 focus-within:border-[#7A8D69] transition-all artisan-pill">
                                    <Search size={14} className="text-[#7D847A]" />
                                    <input
                                        type="text"
                                        placeholder="Buscar estudiante..."
                                        className="bg-transparent border-none outline-none font-bold text-[#2E3330] placeholder:text-[#7D847A] text-xs w-full"
                                        value={buscarEst}
                                        onChange={(e) => setBuscarEst(e.target.value)}
                                    />
                                </div>
                                {buscarEst.trim() !== '' && (
                                    <div className="mt-2 max-h-48 overflow-y-auto border border-slate-300 rounded-[20px] bg-[#FDFBF7] shadow-lg p-2 flex flex-col gap-1">
                                        {estudiantesFilt.map(e => (
                                            <button
                                                key={e.id}
                                                onClick={() => toggleEstudiante(e.id)}
                                                className={`w-full text-left p-3 hover:bg-[#FAF6F0] rounded-xl flex items-center justify-between group transition-all ${estIds.includes(e.id) ? 'bg-[#FAF6F0]' : ''}`}
                                            >
                                                <span className="text-xs font-bold text-[#2E3330] group-hover:text-[#7A8D69]">{e.nombre} {e.apellido}</span>
                                                {estIds.includes(e.id) && <span className="text-[9px] font-black text-[#7A8D69] uppercase tracking-widest">Seleccionado</span>}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {estudiantesSeleccionados.length > 0 && (
                                <div className="space-y-2 border-t border-slate-100 pt-4 animate-in fade-in duration-300">
                                    <h4 className="text-[9px] font-black uppercase tracking-wider text-slate-400">Estudiantes Vinculados:</h4>
                                    <div className="flex flex-wrap gap-1.5">
                                        {estudiantesSeleccionados.map(e => (
                                            <div key={e.id} className="flex items-center gap-1.5 bg-[#EAE4DA]/50 pl-3 pr-2 py-1 rounded-full border border-[rgba(46,51,48,0.08)]">
                                                <span className="text-[10px] font-bold text-[#2E3330]">{e.nombre} {e.apellido}</span>
                                                <button onClick={() => toggleEstudiante(e.id)} className="text-slate-400 hover:text-red-500 font-bold transition-all text-xs w-4 h-4 flex items-center justify-center rounded-full hover:bg-white">&times;</button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="border-t border-slate-100 pt-3.5">
                                <h3 className="text-[10px] font-black uppercase tracking-[0.15em] text-[#2E3330] mb-2.5">2. Categoría y Gravedad</h3>
                                <div className="flex flex-wrap gap-1.5 mb-2.5">
                                    {CATEGORIAS.map(cat => {
                                        const Icon = cat.icon;
                                        const isSel = categoria === cat.key;
                                        return (
                                            <button
                                                key={cat.key}
                                                onClick={() => setCategoria(cat.key)}
                                                className={`px-3 py-1 rounded-full border flex items-center gap-1.5 transition-all w-fit artisan-pill ${isSel ? 'bg-[#BFC9A6] border-[#7A8D69] text-[#2E3330] shadow-sm' : 'bg-white border-[#7A8D69]/35 text-[#5F665E] hover:bg-[#F9F8F6] hover:border-[#7A8D69]'}`}
                                            >
                                                <Icon size={13} className={isSel ? 'text-[#2E3330]' : cat.iconColor} />
                                                <span className="text-[9px] font-bold uppercase tracking-wider leading-tight">{cat.label}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                                <div className="w-fit flex bg-[#EAE4DA]/30 p-0.5 rounded-full border border-[rgba(46,51,48,0.08)] gap-1">
                                    {(['leve', 'moderada', 'grave'] as const).map((g) => (
                                        <button
                                            key={g}
                                            onClick={() => setGravedad(g)}
                                            className={`px-3 py-0.5 text-center text-[9px] font-black uppercase tracking-widest rounded-full transition-all w-fit flex-none ${
                                                gravedad === g 
                                                    ? 'bg-[#FDFBF7] text-[#2E3330] shadow-sm border border-[rgba(46,51,48,0.08)]' 
                                                    : 'text-[#5F665E] hover:text-[#2E3330]'
                                            }`}
                                        >
                                            {GRAVEDAD_LABELS[g]}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="border-t border-slate-100 pt-3.5 space-y-3">
                                <h3 className="text-[10px] font-black uppercase tracking-[0.15em] text-[#2E3330]">3. Detalles del Acontecimiento</h3>
                                <div>
                                    <label className="block text-[9px] font-bold uppercase tracking-widest text-slate-400 mb-1">Descripción de los Hechos</label>
                                    <textarea
                                        rows={3}
                                        placeholder="Describe de forma objetiva lo sucedido..."
                                        className="w-full px-3.5 py-2.5 rounded-[12px] border border-[#7A8D69]/35 bg-white text-[#2E3330] placeholder:text-[#7D847A] text-xs font-medium outline-none focus:border-[#7A8D69] transition-all resize-none"
                                        value={descripcion}
                                        onChange={(e) => setDescripcion(e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label className="block text-[9px] font-bold uppercase tracking-widest text-slate-400 mb-1">Acuerdos y Compromisos</label>
                                    <textarea
                                        rows={2}
                                        placeholder="Medidas adoptadas o compromisos del estudiante..."
                                        className="w-full px-3.5 py-2.5 rounded-[12px] border border-[#7A8D69]/35 bg-white text-[#2E3330] placeholder:text-[#7D847A] text-xs font-medium outline-none focus:border-[#7A8D69] transition-all resize-none"
                                        value={acuerdos}
                                        onChange={(e) => setAcuerdos(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="border-t border-slate-100 pt-3.5">
                                <h3 className="text-[10px] font-black uppercase tracking-[0.15em] text-[#2E3330] mb-2">4. Acciones Pedagógicas</h3>
                                <div className="flex flex-wrap gap-1 mb-3.5">
                                    {ACCIONES.map(accion => {
                                        const active = accionesTomadas.includes(accion);
                                        return (
                                            <button
                                                key={accion}
                                                onClick={() => toggleAccion(accion)}
                                                className={`px-3 py-1 rounded-full text-[10px] font-bold transition-all border artisan-pill ${
                                                    active
                                                        ? 'bg-[#BFC9A6] border-[#7A8D69] text-[#2E3330]'
                                                        : 'bg-white border-[#7A8D69]/35 text-[#5F665E] hover:bg-[#F9F8F6] hover:border-[#7A8D69]'
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
                                    className="w-full rounded-full bg-[#7A8D69] text-white text-xs font-black uppercase tracking-widest hover:bg-[#6C7E5C] hover:-translate-y-0.5 active:translate-y-0 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm flex items-center justify-center"
                                    style={{ height: '32px' }}
                                >
                                    Guardar en Bitácora
                                </button>
                                {saved && (
                                    <div className="flex items-center justify-center gap-2 text-[#7A8D69] text-[10px] font-black uppercase tracking-wider mt-2.5 animate-in fade-in">
                                        <CheckCircle size={14} /> Registro Guardado Correctamente
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                    <div className="col-span-12 xl:col-span-8 space-y-3">
                        <div className="bg-white border border-[rgba(46,51,48,0.08)] rounded-[20px] p-4 shadow-sm flex flex-col gap-3">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                                <div>
                                    <h2 className="text-base font-black text-[#2E3330]">Bitácora de Acontecimientos</h2>
                                    <p className="text-[9px] text-[#5F665E] font-bold uppercase tracking-wider mt-0.5">Historial del Año Escolar en Curso</p>
                                </div>
                                <div className="w-full sm:w-64 bg-white border border-[#7A8D69]/35 focus-within:border-[#7A8D69] rounded-full px-3.5 flex items-center gap-2 transition-all artisan-pill" style={{ height: '32px' }}>
                                    <Search size={14} className="text-[#7D847A]" />
                                    <input
                                        type="text"
                                        placeholder="Buscar por estudiante..."
                                        className="bg-transparent border-none outline-none font-bold text-[#2E3330] placeholder:text-[#7D847A] text-[10px] w-full uppercase tracking-[0.08em]"
                                        value={buscarHist}
                                        onChange={(e) => setBuscarHist(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="overflow-x-auto -mx-6 sm:mx-0">
                                <table className="w-full border-collapse text-left text-xs text-[#2E3330]">
                                    <thead className="bg-[#FAF6F0]/50 text-[9px] font-bold uppercase tracking-wider text-[#2E3330] border-b border-[rgba(46,51,48,0.08)]">
                                        <tr>
                                            <th scope="col" className="px-3.5 py-2">Estudiante</th>
                                            <th scope="col" className="px-3.5 py-2">Categoría</th>
                                            <th scope="col" className="px-3.5 py-2">Gravedad</th>
                                            <th scope="col" className="px-3.5 py-2">Descripción</th>
                                            <th scope="col" className="px-3.5 py-2">Acuerdos</th>
                                            <th scope="col" className="px-3.5 py-2">Acciones</th>
                                            <th scope="col" className="px-3.5 py-2 text-center">Fecha</th>
                                            <th scope="col" className="px-2 py-2"></th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[rgba(46,51,48,0.08)]">
                                        {histFiltrado.length === 0 ? (
                                            <tr>
                                                <td colSpan={8} className="px-3.5 py-6 text-center text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                                                    No se han registrado acontecimientos en esta categoría
                                                </td>
                                            </tr>
                                        ) : (
                                            histFiltrado.map((incidencia) => {
                                                const est = state.estudiantes.find(e => e.id === incidencia.estudianteId);
                                                let catBg = 'bg-[#EAE4DA]';
                                                if (incidencia.categoria === 'Conducta') catBg = 'bg-[#B8CADC]/40';
                                                else if (incidencia.categoria === 'Académico') catBg = 'bg-[#6D8FB9]/35';
                                                else if (incidencia.categoria === 'Salud') catBg = 'bg-[#EB8847]/30';

                                                if (!est) return null;
                                                return (
                                                    <tr key={incidencia.id} className="hover:bg-[#FAF6F0]/40 transition-colors">
                                                        <td className="px-3.5 py-2">
                                                            <p className="text-xs font-bold text-[#2E3330] leading-tight">{est.nombre} {est.apellido}</p>
                                                            <p className="text-[9px] text-[#5F665E] font-medium tracking-tight mt-0.5">Expediente #0{est.id}</p>
                                                        </td>
                                                        <td className="px-3.5 py-2">
                                                            <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${catBg} text-[#2E3330] border border-[rgba(46,51,48,0.08)]`}>
                                                                {incidencia.categoria}
                                                            </div>
                                                        </td>
                                                        <td className="px-3.5 py-2">
                                                             <span className={`text-[9px] font-bold uppercase tracking-widest ${
                                                                 incidencia.gravedad === 'grave' 
                                                                     ? 'text-[#EB8847]' 
                                                                     : incidencia.gravedad === 'moderada' 
                                                                         ? 'text-[#F5BC5D]' 
                                                                         : 'text-[#BFC9A6]'
                                                             }`}>
                                                                {GRAVEDAD_LABELS[incidencia.gravedad]}
                                                             </span>
                                                        </td>
                                                        <td className="px-3.5 py-2">
                                                            <p className="max-w-[200px] line-clamp-2 text-[11px] font-medium text-[#2E3330] leading-normal">
                                                                {incidencia.descripcion}
                                                            </p>
                                                        </td>
                                                        <td className="px-3.5 py-2">
                                                            <p className="max-w-[150px] line-clamp-2 text-[11px] font-normal italic leading-normal text-[#5F665E]">
                                                                {incidencia.acuerdos || 'Ninguno registrado'}
                                                            </p>
                                                        </td>
                                                        <td className="px-3.5 py-2">
                                                            <p className="whitespace-nowrap text-[11px] font-medium text-[#5F665E]">
                                                                {incidencia.accionesTomadas.join(', ') || 'Sin acciones'}
                                                            </p>
                                                        </td>
                                                        <td className="px-3.5 py-2 text-center">
                                                            <span className="whitespace-nowrap text-[10px] font-medium text-slate-400">
                                                                {incidencia.fecha}
                                                            </span>
                                                        </td>
                                                        <td className="px-2 py-2 text-right">
                                                            <button
                                                                onClick={() => {
                                                                    if (onDeleteIncidencia && window.confirm('¿Eliminar esta incidencia?')) {
                                                                        onDeleteIncidencia(incidencia.id);
                                                                    }
                                                                }}
                                                                className="text-slate-300 transition-colors hover:text-[#EB8847]"
                                                            >
                                                                <Trash2 size={14} />
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