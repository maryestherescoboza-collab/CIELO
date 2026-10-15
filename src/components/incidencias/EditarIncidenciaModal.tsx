import React, { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle, Save, Loader2, ShieldAlert, Bookmark, FileText } from 'lucide-react';
import { CieloModal } from '../ui/CieloModal';
import { CieloPill } from '../ui/CieloPill';
import { FechaPickerCompact } from './FechaPickerCompact';
import type { Incidencia } from '../../types';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    incidencia: Incidencia | null;
    estudianteNombre?: string;
    expediente?: string;
    onSave: (id: number, updates: Partial<Omit<Incidencia, 'id'>>) => Promise<{ success: boolean; error?: string }>;
}

const CATEGORIAS: { key: Incidencia['categoria']; icon: React.ElementType; label: string }[] = [
    { key: 'Conducta', icon: ShieldAlert, label: 'Conducta e Interacción' },
    { key: 'Académico', icon: Bookmark, label: 'Rendimiento Académico' },
    { key: 'Salud', icon: AlertCircle, label: 'Bienestar y Salud' },
    { key: 'Otro', icon: FileText, label: 'Otros Eventos' },
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

export const EditarIncidenciaModal: React.FC<Props> = ({
    isOpen,
    onClose,
    incidencia,
    estudianteNombre,
    expediente,
    onSave,
}) => {
    const [fecha, setFecha] = useState('');
    const [categoria, setCategoria] = useState<Incidencia['categoria']>('Conducta');
    const [gravedad, setGravedad] = useState<'leve' | 'moderada' | 'grave'>('leve');
    const [descripcion, setDescripcion] = useState('');
    const [acuerdos, setAcuerdos] = useState('');
    const [accionesTomadas, setAccionesTomadas] = useState<string[]>([]);

    const [isSaving, setIsSaving] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    useEffect(() => {
        if (incidencia) {
            setFecha(incidencia.fecha || '');
            setCategoria(incidencia.categoria || 'Conducta');
            setGravedad(incidencia.gravedad || 'leve');
            setDescripcion(incidencia.descripcion || '');
            setAcuerdos(incidencia.acuerdos || '');
            setAccionesTomadas(incidencia.accionesTomadas || []);
            setErrorMessage(null);
            setSuccessMessage(null);
            setIsSaving(false);
        }
    }, [incidencia, isOpen]);

    if (!incidencia) return null;

    const toggleAccion = (accion: string) => {
        setAccionesTomadas(prev =>
            prev.includes(accion) ? prev.filter(a => a !== accion) : [...prev, accion]
        );
    };

    const handleGuardar = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!fecha.trim()) {
            setErrorMessage('Por favor, selecciona una fecha válida.');
            return;
        }
        if (!descripcion.trim()) {
            setErrorMessage('Por favor, introduce una descripción de los hechos.');
            return;
        }

        setIsSaving(true);
        setErrorMessage(null);
        setSuccessMessage(null);

        try {
            const updates: Partial<Omit<Incidencia, 'id'>> = {
                fecha: fecha.trim(),
                categoria,
                gravedad,
                descripcion: descripcion.trim(),
                acuerdos: acuerdos.trim(),
                accionesTomadas,
            };

            const result = await onSave(incidencia.id, updates);

            if (result && result.success) {
                setSuccessMessage('Incidencia actualizada correctamente.');
                setTimeout(() => {
                    onClose();
                }, 900);
            } else {
                setErrorMessage(result?.error || 'No se pudo actualizar la incidencia en Supabase.');
            }
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Error inesperado al guardar';
            setErrorMessage(msg);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <CieloModal
            isOpen={isOpen}
            onClose={() => {
                if (!isSaving) onClose();
            }}
            title="Editar Incidencia"
            subtitle={estudianteNombre ? `${estudianteNombre} ${expediente ? `· ${expediente}` : ''}` : 'Modificación de registro anecdótico'}
            icon={<FileText size={18} className="text-(--primary)" />}
            maxWidth="2xl"
            footer={
                <div className="flex items-center justify-between w-full">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isSaving}
                        className="px-5 py-2.5 rounded-full text-xs font-bold uppercase tracking-wider text-(--ink-soft) hover:text-(--ink) hover:bg-white border border-(--border-soft) transition-all cursor-pointer disabled:opacity-50"
                    >
                        Cancelar
                    </button>
                    <button
                        type="button"
                        onClick={() => handleGuardar()}
                        disabled={isSaving || !fecha.trim() || !descripcion.trim()}
                        className="px-6 py-2.5 rounded-full text-xs font-black uppercase tracking-widest bg-(--primary) text-white hover:bg-(--primary-hover) shadow-sm flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed hover:-translate-y-0.5 active:scale-95"
                    >
                        {isSaving ? (
                            <>
                                <Loader2 size={14} className="animate-spin" />
                                <span>Guardando...</span>
                            </>
                        ) : (
                            <>
                                <Save size={14} />
                                <span>Guardar Cambios</span>
                            </>
                        )}
                    </button>
                </div>
            }
        >
            <form onSubmit={handleGuardar} className="flex flex-col gap-5">
                {/* Feedback Messages */}
                {errorMessage && (
                    <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 flex items-center gap-2.5 text-red-700 animate-in fade-in">
                        <AlertCircle size={16} className="shrink-0" />
                        <span className="text-xs font-bold leading-relaxed">{errorMessage}</span>
                    </div>
                )}
                {successMessage && (
                    <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center gap-2.5 text-emerald-800 animate-in fade-in">
                        <CheckCircle size={16} className="shrink-0 text-emerald-600" />
                        <span className="text-xs font-bold leading-relaxed">{successMessage}</span>
                    </div>
                )}

                {/* Categoría, Gravedad y Fecha (Metadatos) */}
                <div className="flex flex-col gap-3">
                    <div className="flex items-center justify-between gap-2">
                        <h3 className="text-xs font-black uppercase tracking-[0.12em] text-(--ink-soft)">
                            Categoría y Gravedad
                        </h3>
                        <FechaPickerCompact
                            value={fecha}
                            onChange={setFecha}
                            disabled={isSaving}
                        />
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                        {CATEGORIAS.map(cat => {
                            const Icon = cat.icon;
                            const isSel = categoria === cat.key;
                            return (
                                <CieloPill
                                    as="button"
                                    type="button"
                                    key={cat.key}
                                    onClick={() => setCategoria(cat.key)}
                                    variant={isSel ? 'neutral' : 'ghost'}
                                    className={`px-3 py-1.5 gap-1.5 w-fit h-auto min-h-8 cursor-pointer ${isSel ? 'text-white' : 'bg-white border-(--border-soft) text-(--ink-soft) hover:bg-(--linen)/20'}`}
                                    style={isSel ? { backgroundColor: 'var(--primary)', color: '#FFFFFF', borderColor: 'var(--primary)' } : {}}
                                >
                                    <Icon size={12} className={isSel ? 'text-white' : 'text-(--primary)'} />
                                    <span className="text-[10px] font-bold uppercase tracking-wider leading-tight">{cat.label}</span>
                                </CieloPill>
                            );
                        })}
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                        {(['leve', 'moderada', 'grave'] as const).map((g) => {
                            const isSel = gravedad === g;
                            return (
                                <button
                                    type="button"
                                    key={g}
                                    onClick={() => setGravedad(g)}
                                    className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border transition-colors cursor-pointer ${isSel ? 'bg-(--linen) text-(--ink) border-(--border-soft) shadow-sm' : 'bg-white text-(--ink-soft) border-(--border-soft) hover:bg-(--linen)/20'}`}
                                >
                                    {GRAVEDAD_LABELS[g]}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* 3. DESCRIPCIÓN Y ACUERDOS */}
                <div className="flex flex-col gap-3">
                    <div>
                        <label className="block text-xs font-black uppercase tracking-[0.12em] text-(--ink-soft) mb-1.5">
                            Descripción de los hechos
                        </label>
                        <textarea
                            rows={3}
                            value={descripcion}
                            onChange={(e) => setDescripcion(e.target.value)}
                            disabled={isSaving}
                            placeholder="Descripción de la incidencia o acontecimiento..."
                            className="w-full p-3 rounded-xl border border-(--border-soft) focus:border-(--primary) focus:ring-1 focus:ring-(--primary)/50 text-xs font-medium text-(--ink) placeholder:text-(--ink-soft) transition-all outline-none bg-white resize-none"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-black uppercase tracking-[0.12em] text-(--ink-soft) mb-1.5">
                            Acuerdos y compromisos
                        </label>
                        <textarea
                            rows={2}
                            value={acuerdos}
                            onChange={(e) => setAcuerdos(e.target.value)}
                            disabled={isSaving}
                            placeholder="Acuerdos o compromisos establecidos..."
                            className="w-full p-3 rounded-xl border border-(--border-soft) focus:border-(--primary) focus:ring-1 focus:ring-(--primary)/50 text-xs font-medium text-(--ink) placeholder:text-(--ink-soft) transition-all outline-none bg-white resize-none"
                        />
                    </div>
                </div>

                {/* 4. ACCIONES PEDAGÓGICAS */}
                <div className="flex flex-col gap-2">
                    <h3 className="text-xs font-black uppercase tracking-[0.12em] text-(--ink-soft)">
                        Acciones Pedagógicas Realizadas
                    </h3>
                    <div className="flex flex-wrap gap-1.5">
                        {ACCIONES.map(accion => {
                            const active = accionesTomadas.includes(accion);
                            return (
                                <button
                                    type="button"
                                    key={accion}
                                    onClick={() => toggleAccion(accion)}
                                    className={`px-2.5 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider border transition-colors cursor-pointer ${active ? 'bg-(--primary) border-(--primary) text-white shadow-sm' : 'bg-white text-(--ink-soft) border-(--border-soft) hover:bg-(--linen)/20'}`}
                                >
                                    {accion}
                                </button>
                            );
                        })}
                    </div>
                </div>
            </form>
        </CieloModal>
    );
};
