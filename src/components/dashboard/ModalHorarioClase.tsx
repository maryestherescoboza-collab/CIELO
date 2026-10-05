import React, { useState, useEffect } from 'react';
import { X, Clock } from 'lucide-react';
import { useAppStore } from '../../store/appStore';
import { cdImparteEnDia, diaDeSemana, normalizarHora } from '../../utils/diasSemana';

interface ModalHorarioClaseProps {
    show: boolean;
    onClose: () => void;
    initialDate: string; // ISO date format YYYY-MM-DD
    initialTime?: string; // HH:MM
    cursos: any[];
    onSave: (cursoDocenteId: number, dia: string, inicio: string, fin: string) => Promise<void>;
}

export const ModalHorarioClase: React.FC<ModalHorarioClaseProps> = ({ show, onClose, initialDate, initialTime, cursos, onSave }) => {
    const { state } = useAppStore();
    const [cursoDocenteId, setCursoDocenteId] = useState<number | ''>('');
    const [inicio, setInicio] = useState(initialTime || '10:00');
    const [fin, setFin] = useState('11:00'); // Default to 1 hour
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (show) {
            setInicio(initialTime || '10:00');
            // Calcula 1 hora después
            const [h, m] = (initialTime || '10:00').split(':').map(Number);
            const finH = String((h + 1) % 24).padStart(2, '0');
            const finM = String(m).padStart(2, '0');
            setFin(`${finH}:${finM}`);
            setCursoDocenteId('');
            setError(null);
        }
    }, [show, initialTime, initialDate]);

    if (!show) return null;

    // Calcular el día de la semana correspondiente (clave canónica)
    const dateObj = new Date(initialDate + 'T00:00:00');
    const dayName = diaDeSemana(dateObj);

    // Mostrar SOLO los curso_docente que tienen ese día dentro de dias_semana.
    const validCursoDocentes = (state.cursoDocentes || []).filter(cd => cdImparteEnDia(cd, dayName));

    const handleSave = async () => {
        if (!cursoDocenteId) {
            setError('Selecciona una asignatura');
            return;
        }
        if (inicio >= fin) {
            setError('La hora de inicio debe ser menor a la hora de fin');
            return;
        }

        setLoading(true);
        setError(null);
        try {
            await onSave(Number(cursoDocenteId), dayName, normalizarHora(inicio) || inicio, normalizarHora(fin) || fin);
            onClose();
        } catch (err: any) {
            setError(err.message || 'Error al guardar el horario');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-100 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-[16px] w-full max-w-md shadow-2xl overflow-hidden animate-slide-up">
                <div className="px-6 py-5 border-b border-[#e6e8e2] flex justify-between items-center bg-[#fafbf8]">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
                            <Clock className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="text-[17px] font-bold text-[#1f2937]">Organizar Horario</h3>
                            <p className="text-[13px] text-[#6b7280]">Asigna una clase para el {dayName}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 text-[#9ca3af] hover:text-[#4b5563] hover:bg-[#f3f4f6] rounded-full transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6 space-y-5">
                    {error && (
                        <div className="px-4 py-3 text-[13px] font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg">
                            {error}
                        </div>
                    )}

                    <div className="space-y-4">
                        <div>
                            <label className="block text-[13px] font-bold text-[#374151] mb-1.5">
                                Asignatura
                            </label>
                            <select
                                value={cursoDocenteId}
                                onChange={(e) => setCursoDocenteId(e.target.value === '' ? '' : Number(e.target.value))}
                                className="w-full px-3 py-2 text-[14px] bg-white border border-[#d1d5db] rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none"
                            >
                                <option value="">Seleccione una asignatura...</option>
                                {validCursoDocentes.map(cd => {
                                    const curso = cursos.find(c => c.id === cd.cursoId);
                                    return (
                                        <option key={cd.id} value={cd.id}>
                                            {curso ? `${curso.grado} ${curso.seccion}` : ''} - {cd.asignatura}
                                        </option>
                                    );
                                })}
                            </select>
                            {validCursoDocentes.length === 0 && (
                                <p className="text-[12px] text-amber-600 mt-1 font-medium">
                                    No tienes asignaturas configuradas para impartir los días {dayName}.
                                </p>
                            )}
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-[13px] font-bold text-[#374151] mb-1.5">Hora inicio</label>
                                <input
                                    type="time"
                                    value={inicio}
                                    onChange={(e) => setInicio(e.target.value)}
                                    className="w-full px-3 py-2 text-[14px] font-medium bg-white border border-[#d1d5db] rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-[13px] font-bold text-[#374151] mb-1.5">Hora fin</label>
                                <input
                                    type="time"
                                    value={fin}
                                    onChange={(e) => setFin(e.target.value)}
                                    className="w-full px-3 py-2 text-[14px] font-medium bg-white border border-[#d1d5db] rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="px-6 py-4 bg-[#fafbf8] border-t border-[#e6e8e2] flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-[13.5px] font-bold text-[#4b5563] bg-white border border-[#d1d5db] rounded-lg hover:bg-[#f9fafb] transition-colors"
                        disabled={loading}
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={loading || !cursoDocenteId}
                        className="px-5 py-2 text-[13.5px] font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
                    >
                        {loading ? 'Guardando...' : 'Guardar Horario'}
                    </button>
                </div>
            </div>
        </div>
    );
};
