import React, { useState, useEffect } from 'react';
import { Building2, Search, PlusCircle, CheckCircle, AlertCircle, Loader2, LogOut, Check } from 'lucide-react';
import { useVinculacionInstitucional, type CentroNuevoInput } from '../../hooks/useVinculacionInstitucional';
import type { Centro, UserProfile } from '../../types';

interface VinculacionCentroModalProps {
    userId: string;
    currentUserProfile?: UserProfile;
    onComplete: () => void;
    onLogout: () => void;
}

export function VinculacionCentroModal({
    userId,
    currentUserProfile,
    onComplete,
    onLogout
}: VinculacionCentroModalProps) {
    const [modo, setModo] = useState<'existente' | 'nuevo'>('existente');
    const { buscarCentros, vincularCentroExistente, registrarYVincularCentro, buscando, procesando, error, setError } = useVinculacionInstitucional();

    // Estado modo existente
    const [busqueda, setBusqueda] = useState('');
    const [centrosEncontrados, setCentrosEncontrados] = useState<Centro[]>([]);
    const [centroSeleccionadoId, setCentroSeleccionadoId] = useState<string | null>(null);

    // Estado modo nuevo
    const [nuevoCentro, setNuevoCentro] = useState<CentroNuevoInput>({
        nombre: '',
        distritoEducativo: '',
        codigoCentro: '',
        telefono: '',
        tanda: 'Jornada Extendida',
        tipoInstitucion: 'publica',
        provincia: '',
        municipio: ''
    });

    const [exito, setExito] = useState(false);

    // Búsqueda inicial de centros sugeridos
    useEffect(() => {
        let isMounted = true;
        (async () => {
            const list = await buscarCentros('');
            if (isMounted) {
                setCentrosEncontrados(list);
            }
        })();
        return () => {
            isMounted = false;
        };
    }, [buscarCentros]);

    // Búsqueda con debounce
    useEffect(() => {
        if (!busqueda.trim()) {
            buscarCentros('').then(setCentrosEncontrados);
            return;
        }

        const timer = setTimeout(async () => {
            const list = await buscarCentros(busqueda);
            setCentrosEncontrados(list);
        }, 300);

        return () => clearTimeout(timer);
    }, [busqueda, buscarCentros]);

    const handleConfirmarExistente = async () => {
        if (!centroSeleccionadoId) {
            setError('Por favor selecciona un centro educativo de la lista.');
            return;
        }

        const res = await vincularCentroExistente(centroSeleccionadoId, userId);
        if (res.ok) {
            setExito(true);
            setTimeout(() => {
                onComplete();
            }, 800);
        }
    };

    const handleRegistrarNuevo = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!nuevoCentro.nombre.trim() || nuevoCentro.nombre.trim().length < 3) {
            setError('El nombre del centro educativo es obligatorio (mínimo 3 caracteres).');
            return;
        }

        const res = await registrarYVincularCentro(nuevoCentro, userId);
        if (res.ok) {
            setExito(true);
            setTimeout(() => {
                onComplete();
            }, 800);
        }
    };

    return (
        <div 
            className="fixed inset-0 z-999 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-200"
            role="dialog"
            aria-modal="true"
        >
            <div 
                className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="px-6 pt-6 pb-4 border-b border-slate-100 flex items-start justify-between gap-4 bg-[#FBFBFA]">
                    <div className="flex items-start gap-3.5">
                        <div className="w-11 h-11 rounded-2xl bg-(--primary)/10 text-(--primary) flex items-center justify-center shrink-0 border border-(--primary)/20 mt-0.5">
                            <Building2 size={22} />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-slate-900 tracking-tight">
                                Vinculación Institucional Requerida
                            </h2>
                            <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                                {currentUserProfile?.nombreDocente ? `Hola ${currentUserProfile.nombreDocente.split(' ')[0]}, para` : 'Para'} acceder a tus planificaciones, cursos y herramientas docentes en CIELO, debes asociar tu cuenta a tu centro educativo.
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onLogout}
                        className="shrink-0 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                        title="Cerrar sesión"
                        aria-label="Cerrar sesión"
                    >
                        <LogOut size={18} />
                    </button>
                </div>

                {/* Tabs de selección de modo */}
                <div className="px-6 pt-4 pb-2 flex gap-2 bg-[#FBFBFA]/60 border-b border-slate-100">
                    <button
                        type="button"
                        onClick={() => { setModo('existente'); setError(null); }}
                        className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold tracking-wide transition-all flex items-center justify-center gap-2 cursor-pointer ${
                            modo === 'existente'
                                ? 'bg-white text-slate-900 shadow-xs border border-slate-200'
                                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100/60'
                        }`}
                    >
                        <Search size={15} />
                        <span>Seleccionar centro existente</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => { setModo('nuevo'); setError(null); }}
                        className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold tracking-wide transition-all flex items-center justify-center gap-2 cursor-pointer ${
                            modo === 'nuevo'
                                ? 'bg-white text-slate-900 shadow-xs border border-slate-200'
                                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100/60'
                        }`}
                    >
                        <PlusCircle size={15} />
                        <span>Registrar mi centro</span>
                    </button>
                </div>

                {/* Alert Messages */}
                {error && (
                    <div className="mx-6 mt-4 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2.5 animate-in fade-in">
                        <AlertCircle size={16} className="text-rose-600 shrink-0" />
                        <span className="flex-1">{error}</span>
                    </div>
                )}

                {exito && (
                    <div className="mx-6 mt-4 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2.5 animate-in fade-in">
                        <CheckCircle size={16} className="text-emerald-600 shrink-0" />
                        <span>¡Vinculación completada con éxito! Redirigiendo a tu espacio docente...</span>
                    </div>
                )}

                {/* Body Content */}
                <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                    {modo === 'existente' ? (
                        <div className="space-y-4">
                            <div className="relative">
                                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input
                                    type="text"
                                    value={busqueda}
                                    onChange={e => setBusqueda(e.target.value)}
                                    placeholder="Buscar por nombre, código de centro o distrito..."
                                    className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm border border-slate-200 bg-slate-50/50 focus:bg-white focus:border-(--primary) outline-none transition-all placeholder:text-slate-400 font-medium"
                                />
                                {buscando && (
                                    <Loader2 size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-primary animate-spin" />
                                )}
                            </div>

                            <div className="space-y-2">
                                <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 uppercase tracking-wider px-1">
                                    <span>Centros educativos disponibles</span>
                                    <span>{centrosEncontrados.length} resultados</span>
                                </div>

                                <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                                    {centrosEncontrados.length === 0 ? (
                                        <div className="p-8 text-center border-2 border-dashed border-slate-200 rounded-2xl">
                                            <Building2 size={32} className="mx-auto text-slate-300 mb-2" />
                                            <p className="text-xs font-bold text-slate-700">No encontramos coincidencias</p>
                                            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                                                Si tu centro aún no está registrado en CIELO, puedes darlo de alta en la pestaña «Registrar mi centro».
                                            </p>
                                        </div>
                                    ) : (
                                        centrosEncontrados.map(c => {
                                            const isSelected = centroSeleccionadoId === c.id;
                                            return (
                                                <div
                                                    key={c.id}
                                                    onClick={() => setCentroSeleccionadoId(c.id)}
                                                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                                                        isSelected
                                                            ? 'border-(--primary) bg-(--primary)/5 shadow-xs'
                                                            : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50'
                                                    }`}
                                                >
                                                    <div className="min-w-0 flex-1">
                                                        <div className="flex items-center gap-2">
                                                            <h4 className="text-sm font-bold text-slate-900 truncate">
                                                                {c.nombre}
                                                            </h4>
                                                            {c.afiliado && (
                                                                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold uppercase tracking-wider">
                                                                    Afiliado
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-slate-500 font-medium">
                                                            {c.codigoCentro && (
                                                                <span>Cód: <span className="font-semibold text-slate-700">{c.codigoCentro}</span></span>
                                                            )}
                                                            {c.distritoEducativo && (
                                                                <span>Distrito: <span className="font-semibold text-slate-700">{c.distritoEducativo}</span></span>
                                                            )}
                                                            {c.tanda && (
                                                                <span>{c.tanda}</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 transition-all ${
                                                        isSelected
                                                            ? 'border-(--primary) bg-(--primary) text-white'
                                                            : 'border-slate-300 bg-white'
                                                    }`}>
                                                        {isSelected && <Check size={12} strokeWidth={3} />}
                                                    </div>
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <form id="form-nuevo-centro" onSubmit={handleRegistrarNuevo} className="space-y-4">
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                                    Nombre del centro educativo *
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={nuevoCentro.nombre}
                                    onChange={e => setNuevoCentro(p => ({ ...p, nombre: e.target.value }))}
                                    placeholder="Ej. Escuela Primaria República Dominicana"
                                    className="w-full px-3.5 py-2.5 rounded-xl text-sm border border-slate-200 bg-slate-50/50 focus:bg-white focus:border-(--primary) outline-none transition-all font-medium"
                                />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                                        Distrito educativo
                                    </label>
                                    <input
                                        type="text"
                                        value={nuevoCentro.distritoEducativo}
                                        onChange={e => setNuevoCentro(p => ({ ...p, distritoEducativo: e.target.value }))}
                                        placeholder="Ej. 10-01"
                                        className="w-full px-3.5 py-2.5 rounded-xl text-sm border border-slate-200 bg-slate-50/50 focus:bg-white focus:border-(--primary) outline-none transition-all font-medium"
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                                        Código de centro
                                    </label>
                                    <input
                                        type="text"
                                        value={nuevoCentro.codigoCentro}
                                        onChange={e => setNuevoCentro(p => ({ ...p, codigoCentro: e.target.value }))}
                                        placeholder="Ej. 04123"
                                        className="w-full px-3.5 py-2.5 rounded-xl text-sm border border-slate-200 bg-slate-50/50 focus:bg-white focus:border-(--primary) outline-none transition-all font-medium"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                                        Teléfono institucional
                                    </label>
                                    <input
                                        type="tel"
                                        value={nuevoCentro.telefono}
                                        onChange={e => setNuevoCentro(p => ({ ...p, telefono: e.target.value }))}
                                        placeholder="Ej. (809) 555-0123"
                                        className="w-full px-3.5 py-2.5 rounded-xl text-sm border border-slate-200 bg-slate-50/50 focus:bg-white focus:border-(--primary) outline-none transition-all font-medium"
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                                        Tanda
                                    </label>
                                    <select
                                        value={nuevoCentro.tanda}
                                        onChange={e => setNuevoCentro(p => ({ ...p, tanda: e.target.value }))}
                                        className="w-full px-3.5 py-2.5 rounded-xl text-sm border border-slate-200 bg-slate-50/50 focus:bg-white focus:border-(--primary) outline-none transition-all font-medium"
                                    >
                                        <option value="Jornada Extendida">Jornada Extendida</option>
                                        <option value="Matutina">Matutina</option>
                                        <option value="Vespertina">Vespertina</option>
                                        <option value="Nocturna">Nocturna</option>
                                    </select>
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                                    Tipo de institución
                                </label>
                                <div className="flex gap-3">
                                    {(['publica', 'privada'] as const).map(t => (
                                        <button
                                            type="button"
                                            key={t}
                                            onClick={() => setNuevoCentro(p => ({ ...p, tipoInstitucion: t }))}
                                            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold tracking-wide border transition-all cursor-pointer ${
                                                nuevoCentro.tipoInstitucion === t
                                                    ? 'bg-(--primary) text-white border-transparent shadow-xs'
                                                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                                            }`}
                                        >
                                            {t === 'publica' ? 'Pública' : 'Privada'}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </form>
                    )}
                </div>

                {/* Footer Controls */}
                <div className="p-4 px-6 border-t border-slate-100 bg-[#FBFBFA] flex items-center justify-between gap-4">
                    <button
                        type="button"
                        onClick={onLogout}
                        disabled={procesando}
                        className="py-2.5 px-4 rounded-xl text-xs font-bold text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                        <LogOut size={14} />
                        <span>Cerrar sesión</span>
                    </button>

                    {modo === 'existente' ? (
                        <button
                            type="button"
                            onClick={handleConfirmarExistente}
                            disabled={!centroSeleccionadoId || procesando || exito}
                            className="py-2.5 px-6 rounded-xl bg-(--primary) text-white text-xs font-black uppercase tracking-wider hover:opacity-90 active:scale-98 transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {procesando ? (
                                <>
                                    <Loader2 size={14} className="animate-spin" />
                                    <span>Vinculando...</span>
                                </>
                            ) : (
                                <span>Confirmar vinculación</span>
                            )}
                        </button>
                    ) : (
                        <button
                            type="submit"
                            form="form-nuevo-centro"
                            disabled={!nuevoCentro.nombre.trim() || procesando || exito}
                            className="py-2.5 px-6 rounded-xl bg-(--primary) text-white text-xs font-black uppercase tracking-wider hover:opacity-90 active:scale-98 transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {procesando ? (
                                <>
                                    <Loader2 size={14} className="animate-spin" />
                                    <span>Registrando...</span>
                                </>
                            ) : (
                                <span>Registrar y vincular centro</span>
                            )}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
