import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, RotateCcw, Clock } from 'lucide-react';

export interface IntervaloHorario {
    id: string;
    inicio: string; // HH:MM (24h format e.g. "08:00")
    fin: string; // HH:MM (24h format e.g. "08:15")
    tipo?: 'clase' | 'acto_patrio' | 'almuerzo' | 'recreo' | string;
    nombre?: string;
}

export function formatHora12h(time24: string): string {
    if (!time24) return '';
    const [hStr, mStr] = time24.split(':');
    let h = parseInt(hStr, 10);
    const m = mStr || '00';
    if (isNaN(h)) return time24;
    const displayH = h % 12 === 0 ? 12 : h % 12;
    return `${String(displayH).padStart(2, '0')}:${m}`;
}

export function formatIntervaloRango(inicio24: string, fin24: string): string {
    return `${formatHora12h(inicio24)} – ${formatHora12h(fin24)}`;
}

export const DEFAULT_INTERVALOS_SEMANA: IntervaloHorario[] = [
    { id: '1', inicio: '08:00', fin: '08:15', tipo: 'acto_patrio', nombre: 'Acto patrio' },
    { id: '2', inicio: '08:15', fin: '09:00', tipo: 'clase', nombre: 'Primera clase' },
    { id: '3', inicio: '09:00', fin: '09:45', tipo: 'clase', nombre: 'Segunda clase' },
    { id: '4', inicio: '09:45', fin: '10:30', tipo: 'clase', nombre: 'Tercera clase' },
    { id: '5', inicio: '10:30', fin: '11:15', tipo: 'clase', nombre: 'Cuarta clase' },
    { id: '6', inicio: '11:15', fin: '12:00', tipo: 'clase', nombre: 'Quinta clase' },
    { id: '7', inicio: '12:00', fin: '12:45', tipo: 'clase', nombre: 'Sexta clase' },
    { id: '8', inicio: '12:45', fin: '13:45', tipo: 'almuerzo', nombre: 'Almuerzo' },
    { id: '9', inicio: '13:45', fin: '14:30', tipo: 'clase', nombre: 'Séptima clase' },
    { id: '10', inicio: '14:30', fin: '15:15', tipo: 'clase', nombre: 'Octava clase' },
    { id: '11', inicio: '15:15', fin: '16:00', tipo: 'clase', nombre: 'Novena clase' },
];

// Compatibilidad para legacy array de horas
export const DEFAULT_HORAS_SEMANA = DEFAULT_INTERVALOS_SEMANA.map(i => i.inicio);

interface ModalConfigurarHorariosProps {
    show: boolean;
    onClose: () => void;
    intervalosActuales: IntervaloHorario[];
    onSave: (nuevosIntervalos: IntervaloHorario[]) => void;
}

export const ModalConfigurarHorarios: React.FC<ModalConfigurarHorariosProps> = ({
    show,
    onClose,
    intervalosActuales,
    onSave,
}) => {
    const [intervalos, setIntervalos] = useState<IntervaloHorario[]>(intervalosActuales);
    const [nuevoInicio, setNuevoInicio] = useState('08:00');
    const [nuevoFin, setNuevoFin] = useState('08:45');
    const [nuevoNombre, setNuevoNombre] = useState('');
    const [nuevoTipo, setNuevoTipo] = useState<string>('clase');
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (show) {
            const ordenados = [...intervalosActuales].sort((a, b) => a.inicio.localeCompare(b.inicio));
            setIntervalos(ordenados);
            setError(null);
        }
    }, [show, intervalosActuales]);

    if (!show) return null;

    const handleAdd = () => {
        if (!nuevoInicio || !nuevoFin) {
            setError('Especifica la hora de inicio y fin');
            return;
        }
        if (nuevoInicio >= nuevoFin) {
            setError('La hora de inicio debe ser anterior a la de fin');
            return;
        }
        setError(null);

        const nuevo: IntervaloHorario = {
            id: `intervalo-${Date.now()}`,
            inicio: nuevoInicio,
            fin: nuevoFin,
            tipo: nuevoTipo,
            nombre: nuevoNombre.trim() || (nuevoTipo === 'acto_patrio' ? 'Acto patrio' : nuevoTipo === 'almuerzo' ? 'Almuerzo' : 'Clase'),
        };

        const ordenados = [...intervalos, nuevo].sort((a, b) => a.inicio.localeCompare(b.inicio));
        setIntervalos(ordenados);
        setNuevoNombre('');
    };

    const handleDelete = (id: string) => {
        setIntervalos(intervalos.filter(i => i.id !== id));
    };

    const handleReset = () => {
        setIntervalos([...DEFAULT_INTERVALOS_SEMANA]);
        setError(null);
    };

    const handleSave = () => {
        const ordenados = [...intervalos].sort((a, b) => a.inicio.localeCompare(b.inicio));
        onSave(ordenados);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden border border-slate-200">
                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                    <div>
                        <h3 className="text-base font-extrabold text-slate-800">Organización del Horario Escolar</h3>
                        <p className="text-xs text-slate-500">Configura los intervalos y franjas horarias del centro</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-5">
                    {error && (
                        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold rounded-xl">
                            {error}
                        </div>
                    )}

                    {/* Form para agregar nuevo intervalo */}
                    <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                        <div className="text-xs font-extrabold text-slate-700 uppercase tracking-wider">Agregar nuevo intervalo</div>
                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Hora Inicio</label>
                                <input
                                    type="time"
                                    value={nuevoInicio}
                                    onChange={(e) => setNuevoInicio(e.target.value)}
                                    className="w-full px-2.5 py-1.5 text-xs font-bold text-slate-800 bg-white border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-[#689c63]"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Hora Fin</label>
                                <input
                                    type="time"
                                    value={nuevoFin}
                                    onChange={(e) => setNuevoFin(e.target.value)}
                                    className="w-full px-2.5 py-1.5 text-xs font-bold text-slate-800 bg-white border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-[#689c63]"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Tipo</label>
                                <select
                                    value={nuevoTipo}
                                    onChange={(e) => setNuevoTipo(e.target.value)}
                                    className="w-full px-2.5 py-1.5 text-xs font-bold text-slate-800 bg-white border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-[#689c63]"
                                >
                                    <option value="clase">Clase regular</option>
                                    <option value="acto_patrio">Acto patrio</option>
                                    <option value="almuerzo">Almuerzo</option>
                                    <option value="recreo">Recreo</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Nombre (Opcional)</label>
                                <input
                                    type="text"
                                    placeholder="Ej. Primera clase"
                                    value={nuevoNombre}
                                    onChange={(e) => setNuevoNombre(e.target.value)}
                                    className="w-full px-2.5 py-1.5 text-xs font-semibold text-slate-800 bg-white border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-[#689c63]"
                                />
                            </div>
                        </div>

                        <button
                            type="button"
                            onClick={handleAdd}
                            className="w-full py-2 bg-[#689c63] hover:bg-[#578952] text-white text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 shadow-xs"
                        >
                            <Plus className="w-4 h-4" />
                            Agregar Franja Horaria
                        </button>
                    </div>

                    {/* Lista de Intervalos */}
                    <div>
                        <div className="text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-2">
                            Intervalos Configurados ({intervalos.length})
                        </div>
                        <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1 scrollbar-thin">
                            {intervalos.map((item) => {
                                const isActo = item.tipo === 'acto_patrio' || item.nombre === 'Acto patrio';
                                const isAlmuerzo = item.tipo === 'almuerzo' || item.nombre === 'Almuerzo';
                                return (
                                    <div
                                        key={item.id}
                                        className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl border text-xs font-bold transition-colors ${
                                            isActo
                                                ? 'bg-amber-50 border-amber-200 text-amber-900'
                                                : isAlmuerzo
                                                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                                                : 'bg-slate-50 border-slate-200 text-slate-800'
                                        }`}
                                    >
                                        <div className="flex items-center gap-2.5">
                                            <Clock className="w-3.5 h-3.5 opacity-60" />
                                            <span className="tabular-nums font-black text-sm tracking-tight">
                                                {formatIntervaloRango(item.inicio, item.fin)}
                                            </span>
                                            {item.nombre && (
                                                <span className="text-[11px] font-semibold opacity-75">
                                                    · {item.nombre}
                                                </span>
                                            )}
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => handleDelete(item.id)}
                                            className="text-slate-400 hover:text-rose-600 transition-colors p-1"
                                            title="Eliminar franja"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                );
                            })}
                            {intervalos.length === 0 && (
                                <p className="text-center text-xs text-slate-400 py-4">No hay intervalos configurados.</p>
                            )}
                        </div>
                    </div>

                    {/* Reset button */}
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                        <button
                            type="button"
                            onClick={handleReset}
                            className="text-xs font-bold text-slate-500 hover:text-slate-800 flex items-center gap-1.5 transition-colors"
                        >
                            <RotateCcw className="w-3.5 h-3.5" />
                            Restablecer estructura inicial
                        </button>
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-100 flex justify-end gap-2">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 rounded-xl transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        type="button"
                        onClick={handleSave}
                        className="px-5 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl shadow-xs transition-all"
                    >
                        Guardar cambios
                    </button>
                </div>
            </div>
        </div>
    );
};
