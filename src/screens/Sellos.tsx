import React, { useCallback, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Check, RotateCcw, AlertCircle } from 'lucide-react';
import type { AppState, CalificacionActividad, RecuperacionBC } from '../types';
import { PERIODOS_ACADEMICOS } from '../cache/academicCache';
import { NIVELES_DOMINIO } from '../constants/evaluacionNiveles';

type Paso = 'curso' | 'periodo' | 'actividad' | 'captura' | 'final';

interface SellosProps {
    state: AppState;
    userId?: string | null;
    onSaveCalificaciones: (califs: CalificacionActividad[], recs: RecuperacionBC[], cursoIdOverride?: number | null) => void | Promise<void>;
}

const SELLOS_INFO = [
    { valor: 100, etiqueta: NIVELES_DOMINIO[100].etiqueta, bg: '#DCF3E5', color: '#689C63', circleBg: '#E8F8EE', imagen: '/sellos/sello-excelente-100.png' },
    { valor: 85, etiqueta: NIVELES_DOMINIO[85].etiqueta, bg: '#E0F2FE', color: '#537BAC', circleBg: '#EFF9FF', imagen: '/sellos/sello-muybueno-85.png' },
    { valor: 70, etiqueta: NIVELES_DOMINIO[70].etiqueta, bg: '#DBEAFE', color: '#DEAE4D', circleBg: '#EEF4FF', imagen: '/sellos/sello-logrado-70.png' },
    { valor: 55, etiqueta: NIVELES_DOMINIO[55].etiqueta, bg: '#FEF3C7', color: '#EB8847', circleBg: '#FFFBEB', imagen: '/sellos/sello-porlograr-65.png' },
    { valor: 1, etiqueta: 'Se negó a realizar', bg: '#FDE8E8', color: '#DB5B48', circleBg: '#FDF2F2', imagen: '/sellos/sello-senego-1.png' },
    { valor: 0, etiqueta: 'Inasistencia', bg: '#E1EFFE', color: '#537BAC', circleBg: '#EBF5FF', imagen: '/sellos/sello-inasistencia-0.png' },
] as const;

const Sellos: React.FC<SellosProps> = ({ state, userId, onSaveCalificaciones }) => {
    const [paso, setPaso] = useState<Paso>('curso');
    const [cursoId, setCursoId] = useState<number | null>(null);
    const [periodo, setPeriodo] = useState<string | null>(null);
    const [actividadId, setActividadId] = useState<number | null>(null);
    const [indice, setIndice] = useState(0);
    const [guardando, setGuardando] = useState(false);
    const [guardados, setGuardados] = useState(0);
    
    // Navegación táctil
    const [touchStartX, setTouchStartX] = useState<number | null>(null);

    const cursos = state.cursos ?? [];
    const actividades = state.actividades ?? [];
    const estudiantes = state.estudiantes ?? [];
    const calificaciones = state.calificaciones ?? [];

    const curso = useMemo(
        () => cursos.find(c => c.id === cursoId) ?? null,
        [cursos, cursoId]
    );

    const estudiantesCurso = useMemo(
        () => estudiantes
            .filter(e => e.cursoId === cursoId)
            .sort((a, b) => (a.numeroLista || 0) - (b.numeroLista || 0)),
        [estudiantes, cursoId]
    );

    const actividadesCurso = useMemo(
        () => actividades
            .filter(a => a.cursoId === cursoId && a.periodo === periodo && (a.userId === userId || !a.userId))
            .sort((a, b) => b.id - a.id),
        [actividades, cursoId, periodo, userId]
    );

    const actividad = useMemo(
        () => actividadesCurso.find(a => a.id === actividadId) ?? null,
        [actividadesCurso, actividadId]
    );

    const estudiante = useMemo(
        () => estudiantesCurso[indice] ?? null,
        [estudiantesCurso, indice]
    );

    const califActual = useMemo(
        () => (estudiante && actividad
            ? calificaciones.find(c => c.estudianteId === estudiante.id && c.actividadId === actividad.id) ?? null
            : null),
        [calificaciones, estudiante, actividad]
    );

    const asignarSello = useCallback(async (valor: number) => {
        if (!estudiante || !actividad || !curso || !periodo || guardando) return;
        setGuardando(true);
        const calif: CalificacionActividad = {
            cursoId: curso.id,
            estudianteId: estudiante.id,
            actividadId: actividad.id,
            userId: userId ?? '',
            asignatura: actividad.asignatura || curso.asignatura || '',
            periodo,
            competencias: califActual?.competencias ?? [],
            descriptores: califActual?.descriptores ?? [],
            puntaje: valor,
            recuperacion: califActual?.recuperacion ?? null,
            sharedCourseId: estudiante.sharedCourseId || curso.sharedCourseId || String(curso.id),
        };
        
        const card = document.getElementById('student-container');
        if(card) {
            card.classList.add('animate-stamp');
            setTimeout(() => card.classList.remove('animate-stamp'), 400);
        }

        try {
            await onSaveCalificaciones([calif], [], curso.id);
            setGuardados(g => g + 1);
            
            if (indice + 1 < estudiantesCurso.length) {
                setTimeout(() => {
                    setIndice(i => i + 1);
                }, 500);
            }
        } finally {
            setGuardando(false);
        }
    }, [estudiante, actividad, curso, periodo, guardando, userId, califActual, onSaveCalificaciones, indice, estudiantesCurso.length]);

    const handleTouchStart = useCallback((e: React.TouchEvent) => {
        setTouchStartX(e.touches[0].clientX);
    }, []);

    const handleTouchEnd = useCallback((e: React.TouchEvent) => {
        if (touchStartX === null) return;
        const touchEndX = e.changedTouches[0].clientX;
        const deltaX = touchStartX - touchEndX;
        if (deltaX > 50 && indice + 1 < estudiantesCurso.length) {
            setIndice(i => i + 1);
        } else if (deltaX < -50 && indice > 0) {
            setIndice(i => i - 1);
        }
        setTouchStartX(null);
    }, [touchStartX, indice, estudiantesCurso.length]);

    const reiniciar = useCallback(() => {
        setPaso('curso');
        setCursoId(null);
        setPeriodo(null);
        setActividadId(null);
        setIndice(0);
        setGuardados(0);
    }, []);

    const iniciales = (nombre: string, apellido: string) =>
        `${(nombre || '?').charAt(0)}${(apellido || '').charAt(0)}`.toUpperCase();

    let contenido: React.ReactNode;

    if (paso === 'curso') {
        contenido = cursos.length === 0 ? (
            <div className="rounded-xl border border-[#1C2220] bg-white p-6 text-center shadow-sm">
                <p className="font-bold text-[#1C2220]">Aún no tienes cursos</p>
                <p className="text-sm font-medium text-gray-500 mt-1">Crea un curso desde «Cursos» para empezar a sellar.</p>
            </div>
        ) : (
            <ul className="flex flex-col gap-3">
                {cursos.map(c => {
                    const n = estudiantes.filter(e => e.cursoId === c.id).length;
                    return (
                        <li key={c.id}>
                            <button
                                onClick={() => { setCursoId(c.id); setPeriodo(null); setActividadId(null); setIndice(0); setPaso('periodo'); }}
                                className="w-full flex items-center gap-3 text-left rounded-xl border border-[#1C2220] bg-white p-3.5 sm:p-4 transition-all duration-200 hover:-translate-y-1 hover:shadow-sm active:scale-[0.98] group"
                            >
                                <span
                                    className="w-12 h-12 shrink-0 rounded-full border border-[#1C2220] flex items-center justify-center text-sm font-black shadow-sm transition-transform"
                                    style={{ backgroundColor: c.color || '#BFC9A6', color: '#1C2220' }}
                                >
                                    {iniciales(c.nombre, '')}
                                </span>
                                <span className="flex-1 min-w-0">
                                    <span className="block font-extrabold text-[#1C2220] truncate text-[15px]">{c.nombre}</span>
                                    <span className="block text-[11px] font-bold text-gray-500 truncate mt-0.5">
                                        {c.asignatura} • {c.grado} {c.seccion} • {n} estudiante{n === 1 ? '' : 's'}
                                    </span>
                                </span>
                                <ChevronRight size={20} className="shrink-0 text-[#1C2220]" strokeWidth={2.5} />
                            </button>
                        </li>
                    );
                })}
            </ul>
        );
    }

    if (paso === 'periodo' && curso) {
        contenido = (
            <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                <p className="text-[13px] font-bold text-gray-500 mb-3 uppercase tracking-wide">¿Qué período calificarás?</p>
                <div className="grid grid-cols-2 gap-3">
                    {PERIODOS_ACADEMICOS.map(p => {
                        const n = actividades.filter(a => a.cursoId === curso.id && a.periodo === p).length;
                        return (
                            <button
                                key={p}
                                onClick={() => { setPeriodo(p); setActividadId(null); setIndice(0); setPaso('actividad'); }}
                                className="flex flex-col items-start gap-1 rounded-xl border border-[#1C2220] bg-white p-4 sm:p-5 transition-all duration-200 hover:-translate-y-1 hover:shadow-sm active:scale-[0.98]"
                            >
                                <span className="text-2xl font-black text-[#689C63]">{p}</span>
                                <span className="text-[11px] font-bold text-gray-500">{n} actividad{n === 1 ? '' : 'es'}</span>
                            </button>
                        );
                    })}
                </div>
            </div>
        );
    }

    if (paso === 'actividad' && curso && periodo) {
        contenido = actividadesCurso.length === 0 ? (
            <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="rounded-xl border border-[#1C2220] bg-white p-6 text-center shadow-sm">
                    <p className="font-bold text-[#1C2220]">No hay actividades para {periodo}</p>
                    <p className="text-sm font-medium text-gray-500 mt-1">Crea una actividad desde el curso para poder calificar.</p>
                </div>
            </div>
        ) : (
            <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                <p className="text-[13px] font-bold text-gray-500 mb-3 uppercase tracking-wide">Elige la actividad a sellar</p>
                <ul className="flex flex-col gap-3">
                    {actividadesCurso.map(a => {
                        const evaluados = calificaciones.filter(c => c.actividadId === a.id && c.puntaje != null).length;
                        return (
                            <li key={a.id}>
                                <button
                                    onClick={() => { setActividadId(a.id); setIndice(0); setPaso('captura'); }}
                                    className="w-full flex items-center gap-3 text-left rounded-xl border border-[#1C2220] bg-white p-3.5 sm:p-4 transition-all duration-200 hover:-translate-y-1 hover:shadow-sm active:scale-[0.98]"
                                >
                                    <span className="flex-1 min-w-0">
                                        <span className="block font-extrabold text-[#1C2220] truncate text-[14px]">{a.nombre}</span>
                                        <span className="block text-[11px] font-bold text-gray-500 truncate mt-0.5">{a.fecha || 'Sin fecha'}</span>
                                    </span>
                                    <span className="shrink-0 rounded-full border border-[#1C2220] bg-[#EFF3F0] px-3 py-1 text-[11px] font-black text-[#1C2220]">
                                        {evaluados}/{estudiantesCurso.length}
                                    </span>
                                    <ChevronRight size={20} className="shrink-0 text-[#1C2220]" strokeWidth={2.5} />
                                </button>
                            </li>
                        );
                    })}
                </ul>
            </div>
        );
    }

    if (paso === 'captura' && curso && actividad && estudiante) {
        const evaluados = calificaciones.filter(c => c.actividadId === actividad.id && c.puntaje != null).length;
        const progreso = (evaluados / estudiantesCurso.length) * 100;
        
        let statusBadge = (
            <div className="px-2.5 py-1 rounded-xl border border-dashed border-gray-300 bg-gray-50 text-[11px] font-bold text-gray-400 flex items-center gap-1">
                <span>Sello vacío</span>
            </div>
        );
        let statusText = (
            <p className="text-xs font-medium text-amber-700 flex items-center gap-1">
                <AlertCircle size={12} strokeWidth={2.5} />
                <span className="text-amber-800 font-medium">Sin calificar aún</span>
            </p>
        );

        if (califActual?.puntaje != null) {
            const selloInfo = SELLOS_INFO.find(s => s.valor === califActual.puntaje);
            if (selloInfo) {
                statusText = (
                    <p className="text-xs font-medium text-emerald-700 flex items-center gap-1">
                        <Check size={14} strokeWidth={3} />
                        <span className="text-emerald-800 font-bold">Calificado: {selloInfo.etiqueta} ({califActual.puntaje} pts)</span>
                    </p>
                );
                statusBadge = (
                    <div className="px-2.5 py-1 rounded-xl border border-[#1C2220] bg-[#E8F8EE] text-[11px] font-bold text-[#147347] flex items-center gap-1.5 shadow-sketch-sm animate-stamp">
                        <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
                        <span className="font-extrabold text-[#1C2220]">{califActual.puntaje} - {selloInfo.etiqueta}</span>
                    </div>
                );
            }
        }

        contenido = (
            <div className="animate-in fade-in zoom-in-95 duration-300 flex flex-col w-full">
                {/* Header Section */}
                <header className="space-y-2.5 mb-4">
                    <div className="flex items-center justify-between">
                        <button onClick={() => setPaso('actividad')} className="group flex items-center space-x-2 text-xs font-bold text-gray-700 hover:text-black transition">
                            <span className="w-7 h-7 rounded-full bg-[#EFF3F0] border border-[#1C2220] flex items-center justify-center group-hover:bg-[#E2F0D9] transition">
                                <ChevronLeft size={16} strokeWidth={2.5} className="text-[#1C2220] -ml-0.5" />
                            </span>
                            <span className="tracking-wide uppercase text-[11px] text-gray-500 group-hover:text-gray-900">Actividades</span>
                        </button>
                    </div>
                    <div className="bg-[#EFF3F0] rounded-2xl border-[1.75px] border-[#1C2220] p-3 sm:p-3.5 shadow-sketch-sm">
                        <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs text-gray-500 font-medium">
                            <span>{curso.grado}</span>
                            <span>•</span>
                            <span className="text-[#1C2220] font-semibold">{curso.asignatura}</span>
                            <span>•</span>
                            <span className="bg-white px-2 py-0.5 rounded-full text-[11px] font-bold border border-gray-300">{curso.seccion}</span>
                        </div>
                        <h1 className="text-[17px] font-extrabold tracking-tight text-[#1C2220] mt-2 leading-snug">
                            {actividad.nombre}
                        </h1>
                        <p className="text-[11.5px] text-gray-600 mt-1 leading-normal font-medium">Toca el sello obtenido para registrarlo automáticamente en el acta oficial.</p>
                    </div>
                </header>

                {/* Student Active Card */}
                <section className="relative pt-1 mb-5">
                    <div 
                        id="student-container" 
                        className="relative rounded-2xl border border-[#1C2220] bg-white p-5 sm:p-6 shadow-sm transition-all duration-300"
                        onTouchStart={handleTouchStart}
                        onTouchMove={(e) => {
                            if (touchStartX) {
                                const diffX = Math.abs(e.touches[0].clientX - touchStartX);
                                if (diffX > 10) e.preventDefault();
                            }
                        }}
                        onTouchEnd={handleTouchEnd}
                    >
                        <div className="flex flex-col items-center text-center space-y-2">
                            <div className="relative">
                                <div 
                                    className="w-16 h-16 rounded-full border border-[#1C2220] flex items-center justify-center font-bold text-xl text-[#1C2220] mx-auto"
                                    style={{ backgroundColor: estudiante.avatarColor || '#BFC9A6' }}
                                >
                                    <span>{iniciales(estudiante.nombre, estudiante.apellido)}</span>
                                </div>
                                <span className="absolute -bottom-1 -right-1 bg-white border border-[#1C2220] text-[10px] font-black w-6 h-6 rounded-full flex items-center justify-center text-gray-800 shadow-sm">
                                    {String(estudiante.numeroLista || 0).padStart(2, '0')}
                                </span>
                            </div>
                            
                            <div>
                                <div className="flex items-center justify-center space-x-1.5">
                                    <h2 className="font-extrabold text-lg text-[#1C2220] leading-snug">{estudiante.nombre} {estudiante.apellido}</h2>
                                </div>
                                <div className="flex items-center justify-center gap-2 mt-1">
                                    {statusText}
                                    {statusBadge}
                                </div>
                            </div>
                            
                            {actividad.indicador && (
                                <div className="w-full mt-4 bg-gray-50 rounded-xl p-3 text-center border border-gray-200">
                                    <div className="flex items-center justify-center gap-1.5 text-[11px] font-bold text-[#689C63] uppercase tracking-wider mb-2">
                                        <Check size={14} strokeWidth={3} /> Indicador de Logro
                                    </div>
                                    <p className="text-[12px] text-gray-700 leading-relaxed font-medium px-2">
                                        {actividad.indicador}
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </section>

                {/* Stamp Selection Grid */}
                <section className="space-y-2.5 mb-5">
                    <div className="flex items-center justify-between px-1">
                        <span className="text-[11px] font-extrabold uppercase tracking-widest text-gray-500">Catálogo de Sellos</span>
                    </div>
                    <div className="grid grid-cols-4 gap-1.5 sm:gap-2">
                        {SELLOS_INFO.filter(s => s.valor > 1).map(s => {
                            const activo = califActual?.puntaje === s.valor;

                            return (
                                <button
                                    key={s.valor}
                                    onClick={() => asignarSello(s.valor)}
                                    disabled={guardando}
                                    className={`group flex flex-col items-center justify-between p-3 transition-all duration-200 
                                        rounded-xl border border-[#1C2220] bg-white
                                        hover:-translate-y-1 active:scale-[0.98] text-center 
                                        ${activo ? 'ring-1 ring-offset-2 ring-[#1C2220] shadow-sm bg-gray-50' : ''} 
                                        ${guardando ? 'opacity-50' : ''}`}
                                >
                                    <div 
                                        className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 rounded-full flex items-center justify-center relative transition-transform group-hover:scale-105 mb-2"
                                    >
                                        <img 
                                            src={s.imagen} 
                                            alt={s.etiqueta} 
                                            className="w-full h-full object-contain rounded-full"
                                        />
                                        {activo && (
                                            <div className="absolute top-0 right-0 w-6 h-6 sm:w-7 sm:h-7 bg-[#689C63] rounded-full flex items-center justify-center text-white border-[1.5px] border-white shadow-sm">
                                                <Check size={14} strokeWidth={3} />
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex flex-col items-center">
                                        <span 
                                            className="text-[10px] sm:text-xs font-bold tracking-tight uppercase leading-none"
                                            style={{ color: s.color }}
                                        >
                                            {s.etiqueta}
                                        </span>
                                        <span className="text-[10px] text-gray-500 font-medium leading-tight mt-1">
                                            {s.valor} pts
                                        </span>
                                    </div>
                                </button>
                            );
                        })}
                    </div>

                    <div className="mt-4">
                        <p className="text-[11px] font-bold text-gray-500 mb-2 uppercase tracking-wider text-center">
                            Actividad pendiente por:
                        </p>
                        <div className="grid grid-cols-2 gap-2">
                            {SELLOS_INFO.filter(s => s.valor <= 1).map(s => {
                                const activo = califActual?.puntaje === s.valor;
                                return (
                                    <button
                                        key={s.valor}
                                        onClick={() => asignarSello(s.valor)}
                                        disabled={guardando}
                                        className={`group flex items-center justify-center py-2.5 px-3 transition-all duration-200 
                                            rounded-lg border border-[#1C2220]
                                            hover:-translate-y-1 active:scale-[0.98] text-center 
                                            ${activo ? 'ring-1 ring-offset-1 ring-[#1C2220] shadow-sm' : 'opacity-90'} 
                                            ${guardando ? 'opacity-50' : ''}`}
                                        style={{ backgroundColor: s.bg }}
                                    >
                                        <span 
                                            className="text-[10px] sm:text-xs font-black tracking-tight uppercase leading-none"
                                            style={{ color: s.color }}
                                        >
                                            {s.etiqueta}
                                        </span>
                                        {activo && (
                                            <div className="ml-2 w-4 h-4 bg-white rounded-full flex items-center justify-center text-[#1C2220] border border-[#1C2220]">
                                                <Check size={10} strokeWidth={3} />
                                            </div>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </section>

                {/* Progress Section */}
                <section className="space-y-2 pt-1 mb-5">
                    <div className="flex items-center justify-between text-[11.5px] font-bold">
                        <span className="text-gray-600 flex items-center gap-1.5 uppercase tracking-wide">
                            <svg className="w-3.5 h-3.5 stroke-[#1C2220] stroke-2 fill-none" viewBox="0 0 24 24"><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round"></path></svg>
                            Progreso
                        </span>
                        <span className="font-black text-[#1C2220]">{evaluados} de {estudiantesCurso.length} evaluados</span>
                    </div>
                    <div className="w-full h-3.5 bg-gray-100 rounded-full border-[1.5px] border-[#1C2220] p-0.5 overflow-hidden">
                        <div className="h-full bg-[#96D1AB] rounded-full transition-all duration-300" style={{ width: `${progreso}%` }}></div>
                    </div>
                </section>

                {/* Action Controls */}
                <section className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                    <button 
                        onClick={() => {
                            if (indice > 0) setIndice(i => i - 1);
                        }}
                        disabled={indice === 0}
                        className="flex-1 py-3 px-3 bg-white hover:bg-gray-50 disabled:opacity-50 text-[#1C2220] font-bold text-xs rounded-xl border border-[#1C2220] shadow-sm transition active:scale-[0.98] flex items-center justify-center gap-2"
                    >
                        <ChevronLeft size={16} strokeWidth={2.5} />
                        <span>Anterior</span>
                    </button>
                    <button 
                        onClick={() => {
                            if (indice + 1 < estudiantesCurso.length) setIndice(i => i + 1);
                        }}
                        disabled={indice + 1 >= estudiantesCurso.length}
                        className="flex-1 py-3 px-3 bg-white hover:bg-gray-50 disabled:opacity-50 text-[#1C2220] font-bold text-xs rounded-xl border border-[#1C2220] shadow-sm transition active:scale-[0.98] flex items-center justify-center gap-2"
                    >
                        <span>Siguiente</span>
                        <ChevronRight size={16} strokeWidth={2.5} />
                    </button>
                    <button 
                        onClick={() => setPaso('final')}
                        className="flex-1 py-3 px-3 bg-[#1C2220] hover:bg-[#2E3330] text-white font-extrabold text-xs rounded-xl shadow-sm transition active:scale-[0.98] flex items-center justify-center gap-2"
                    >
                        <Check size={16} strokeWidth={3} />
                        <span>Finalizar</span>
                    </button>
                </section>
            </div>
        );
    }

    if (paso === 'final') {
        contenido = (
            <div className="flex flex-col items-center justify-center text-center py-10 animate-in zoom-in-95">
                <div className="w-20 h-20 rounded-full border border-[#1C2220] bg-white flex items-center justify-center text-[#689C63] shadow-sm mb-6">
                    <Check size={40} strokeWidth={2.5} />
                </div>
                <h2 className="text-[28px] font-black text-[#1C2220] leading-none mb-2">¡Todo Listo!</h2>
                <p className="text-sm font-bold text-gray-500 mb-8">
                    {guardados} {guardados === 1 ? 'estudiante calificado' : 'estudiantes calificados'} con éxito.
                </p>
                <div className="flex flex-col gap-3 w-full">
                    <button
                        onClick={reiniciar}
                        className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-[#1C2220] px-6 py-4 font-extrabold text-white shadow-md transition-all duration-200 active:scale-95"
                    >
                        <RotateCcw size={18} strokeWidth={2.5} /> Volver a Empezar
                    </button>
                    <button
                        onClick={() => { setIndice(0); setPaso('actividad'); }}
                        className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-white border-[1.75px] border-[#1C2220] px-6 py-3.5 font-bold text-[#1C2220] shadow-sketch-sm transition-all duration-200 active:scale-95"
                    >
                        <ChevronLeft size={18} strokeWidth={2.5} /> Sellar otra actividad
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div translate="no" className="h-[calc(100dvh-130px)] lg:h-auto lg:min-h-screen flex items-start justify-center p-1.5 sm:p-4 lg:p-6 text-[#1E2322] font-sans bg-canvas-pattern overflow-hidden lg:overflow-visible">
            <main className="w-full h-full lg:h-auto max-w-100 sm:max-w-120 lg:max-w-105 bg-white overflow-hidden flex flex-col relative rounded-2xl sm:rounded-[24px] lg:rounded-3xl border border-gray-200/70 lg:border-gray-200 shadow-xl lg:shadow-2xl mx-auto mt-1 sm:mt-2 lg:mt-0">
                <div className="px-3.5 sm:px-5 lg:px-5 pt-4 sm:pt-5 lg:pt-6 pb-4 sm:pb-5 lg:pb-6 overflow-y-auto flex-1 lg:min-h-125 w-full">
                    {paso !== 'captura' && paso !== 'final' && (
                        <div className="mb-6">
                            <div className="flex items-center gap-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                <span className={paso === 'curso' ? 'text-[#1C2220]' : ''}>1. Curso</span>
                                <span>/</span>
                                <span className={paso === 'periodo' ? 'text-[#1C2220]' : ''}>2. Período</span>
                                <span>/</span>
                                <span className={paso === 'actividad' ? 'text-[#1C2220]' : ''}>3. Actividad</span>
                            </div>
                            <h1 className="text-2xl font-black text-[#1C2220] mt-2">Sellos</h1>
                        </div>
                    )}
                    {contenido}
                </div>
            </main>
        </div>
    );
};

export default Sellos;