import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ClipboardList, Loader2, CheckCircle2 } from 'lucide-react';
import { CieloModal } from '../ui/CieloModal';
import { useAppStore } from '../../store/appStore';

interface PegarListadoModalProps {
    show: boolean;
    estudiantes: any[];
    estudiantesRealesCurso: any[];
    onClose: () => void;
    onUpdateEstudiante: (id: number, est: any) => void;
    onAddEstudiante: (nombre?: string, apellido?: string, numeroLista?: number) => Promise<any> | void;
}

interface FilaError {
    fila: number;
    motivo: string;
}

interface ResumenListado {
    actualizados: number;
    creados: number;
    errores: FilaError[];
}

const BATCH_SIZE = 5;

// Cada línea es un nombre completo. Se divide con la misma lógica que usa el
// proyecto: la primera palabra es el nombre y el resto es el apellido.
const parseFullName = (full: string): { nombre: string; apellido: string } => {
    const parts = full.split(' ');
    return {
        nombre: parts[0] || '',
        apellido: parts.slice(1).join(' ') || ''
    };
};

// Elimina prefijos de numeración del listado externo (1. / 1) / 01. / 1 ).
// El número escrito por el usuario es SOLO formato; la posición dentro del
// listado es la que determina la fila/numero_lista de destino.
const stripNumbering = (line: string): string =>
    line.replace(/^\s*\d{1,4}\s*(?:[.)-]\s*)?/, '').trim();

const PegarListadoModal: React.FC<PegarListadoModalProps> = ({ show, estudiantes, estudiantesRealesCurso, onClose, onUpdateEstudiante, onAddEstudiante }) => {
    const setGenericToast = useAppStore(s => s.setGenericToast);
    const [value, setValue] = useState('');
    const [startPos, setStartPos] = useState(1);
    const [isProcessing, setIsProcessing] = useState(false);
    const [progreso, setProgreso] = useState(0);
    const [resumen, setResumen] = useState<ResumenListado | null>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        if (show) {
            setValue('');
            setStartPos(1);
            setIsProcessing(false);
            setProgreso(0);
            setResumen(null);
            setTimeout(() => textareaRef.current?.focus(), 30);
        }
    }, [show]);

    const names = useMemo(() =>
        value
            .split(/\r?\n/)
            .map(l => l.trim())
            .filter(l => l.length > 0)
            .map(stripNumbering)
            .filter(n => n.length > 0),
        [value]
    );

    const totalPositions = Math.max(1, estudiantes.length);
    const totalNombres = names.length;

    const cerrar = () => {
        if (isProcessing) return;
        onClose();
    };

    const handleApply = async () => {
        if (names.length === 0 || isProcessing) return;

        setIsProcessing(true);
        setProgreso(0);
        setResumen(null);

        const summary: ResumenListado = { actualizados: 0, creados: 0, errores: [] };
        const total = totalNombres;

        // La fuente de verdad es: estudiante REAL + curso actual + numero_lista.
        // displayEstudiantes, placeholders, IDs negativos e isPlaceholder son
        // SOLO visuales y NO se usan para decidir si existe un estudiante.
        const realesPorNumero = new Map<number, any>();
        for (const e of estudiantesRealesCurso) {
            if ((e.id ?? 0) > 0 && typeof e.numeroLista === 'number' && !realesPorNumero.has(e.numeroLista)) {
                realesPorNumero.set(e.numeroLista, e);
            }
        }

        // Procesamiento por lotes: se preparan todas las posiciones y se procesan
        // de a BATCH_SIZE. Cada operación espera a la anterior (secuencial) para
        // no duplicar numero_lista ni saturar Supabase. Un error en una fila NO
        // detiene el listado.
        for (let fila = startPos; fila < startPos + total; fila += BATCH_SIZE) {
            const finLote = Math.min(fila + BATCH_SIZE, startPos + total);

            for (let f = fila; f < finLote; f++) {
                const idx = f - startPos;
                const { nombre, apellido } = parseFullName(names[idx]);

                const real = realesPorNumero.get(f);

                if (real) {
                    // Existe estudiante REAL con este numero_lista → actualizar
                    // SOLO nombre/apellido usando el id real. Se conserva id,
                    // numero_lista, curso, calificaciones y todo lo demás.
                    try {
                        await onUpdateEstudiante(real.id, { nombre, apellido });
                        summary.actualizados++;
                    } catch (err: any) {
                        summary.errores.push({ fila: f, motivo: err?.message || 'No se pudo actualizar el estudiante.' });
                    }
                } else {
                    // No existe estudiante real con este numero_lista → crear uno
                    // nuevo con la posición calculada, usando la lógica oficial.
                    try {
                        const creado = await onAddEstudiante(nombre, apellido, f);
                        if (creado) {
                            summary.creados++;
                        } else {
                            summary.errores.push({ fila: f, motivo: 'No se pudo crear el estudiante en esta fila.' });
                        }
                    } catch (err: any) {
                        summary.errores.push({ fila: f, motivo: err?.message || 'Error al crear el estudiante.' });
                    }
                }

                setProgreso(idx + 1);
            }
        }

        setIsProcessing(false);
        setResumen(summary);

        const totalOk = summary.actualizados + summary.creados;
        const errorTxt = summary.errores.length === 1
            ? `${summary.errores.length} fila con problema`
            : `${summary.errores.length} filas con problema`;

        if (summary.errores.length === 0) {
            setGenericToast({ message: `Listado aplicado correctamente. ${totalOk} estudiantes procesados.`, type: 'success' });
        } else {
            setGenericToast({ message: `Listado aplicado parcialmente. ${totalOk} procesados, ${errorTxt}.`, type: 'warning' });
        }
        setTimeout(() => setGenericToast(null), 3500);
    };

    const puedeAplicar = names.length > 0 && !isProcessing;

    const modalFooter = (
        <div className="flex items-center justify-end gap-3">
            {resumen === null && (
                <>
                    <button
                        type="button"
                        onClick={cerrar}
                        disabled={isProcessing}
                        className="rounded-full px-6 py-2.5 text-xs font-black uppercase tracking-widest text-slate-500 hover:bg-slate-100 border border-slate-200 transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                        Cancelar
                    </button>
                    <button
                        type="button"
                        onClick={handleApply}
                        disabled={!puedeAplicar}
                        className="rounded-full px-6 py-2.5 text-xs font-black uppercase tracking-widest bg-primary text-[#2E3330] shadow-md shadow-primary/20 hover:bg-primary/90 transition-all duration-200 flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed min-w-[170px] justify-center"
                    >
                        {isProcessing ? (
                            <>
                                <Loader2 size={15} strokeWidth={2.6} className="animate-spin" />
                                Procesando...
                            </>
                        ) : (
                            <>
                                <ClipboardList size={15} strokeWidth={2.6} />
                                Aplicar listado
                            </>
                        )}
                    </button>
                </>
            )}
            {resumen !== null && (
                <button
                    type="button"
                    onClick={cerrar}
                    className="rounded-full px-6 py-2.5 text-xs font-black uppercase tracking-widest bg-primary text-[#2E3330] shadow-md shadow-primary/20 hover:bg-primary/90 transition-all duration-200 flex items-center gap-2"
                >
                    <CheckCircle2 size={15} strokeWidth={2.6} />
                    Cerrar
                </button>
            )}
        </div>
    );

    return (
        <CieloModal
            isOpen={show}
            onClose={cerrar}
            title="Pegar listado"
            subtitle="Actualizar o crear estudiantes por fila"
            maxWidth="lg"
            icon={<ClipboardList size={20} strokeWidth={2.4} />}
            footer={modalFooter}
        >
            {isProcessing ? (
                <div className="flex flex-col items-center justify-center gap-4 py-10">
                    <Loader2 size={32} strokeWidth={2.4} className="animate-spin text-primary" />
                    <p className="text-sm font-black text-slate-700 uppercase tracking-widest">Esto demorará unos segundos, no cierres la pestaña.</p>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                        {totalNombres === 0 ? 'Procesando...' : `Procesando ${Math.min(progreso, totalNombres)} de ${totalNombres}...`}
                    </p>
                </div>
            ) : resumen !== null ? (
                <div className="space-y-4 py-1">
                    <div className="flex items-center gap-3">
                        <CheckCircle2 size={24} strokeWidth={2.4} className={resumen.errores.length === 0 ? 'text-emerald-500' : 'text-attention'} />
                        <p className="text-sm font-black text-slate-700 uppercase tracking-widest">
                            {resumen.errores.length === 0 ? 'Listado aplicado correctamente.' : 'Listado aplicado parcialmente.'}
                        </p>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                        <div className="rounded-xl border border-(--border-soft) bg-(--linen)/40 px-4 py-3 text-center">
                            <p className="text-2xl font-black text-slate-700">{resumen.actualizados}</p>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5">Actualizados</p>
                        </div>
                        <div className="rounded-xl border border-(--border-soft) bg-(--linen)/40 px-4 py-3 text-center">
                            <p className="text-2xl font-black text-slate-700">{resumen.creados}</p>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5">Creados</p>
                        </div>
                        <div className="rounded-xl border border-(--border-soft) bg-(--linen)/40 px-4 py-3 text-center">
                            <p className="text-2xl font-black text-slate-700">{resumen.errores.length}</p>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5">Con problema</p>
                        </div>
                    </div>
                    {resumen.errores.length > 0 && (
                        <div className="rounded-xl border border-attention/30 bg-attention/5 px-4 py-3 space-y-1.5">
                            {resumen.errores.map((e, idx) => (
                                <p key={idx} className="text-xs font-bold text-slate-600">
                                    Fila {e.fila}: {e.motivo}
                                </p>
                            ))}
                        </div>
                    )}
                </div>
            ) : (
                <div className="space-y-5 py-1">
                    <div className="space-y-2">
                        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">
                            Lista de nombres
                        </label>
                        <textarea
                            ref={textareaRef}
                            rows={8}
                            value={value}
                            onChange={e => setValue(e.target.value)}
                            placeholder="Pega aquí los nombres, uno por línea..."
                            className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm bg-white outline-none focus:border-primary focus:ring-4 focus:ring-primary/5 font-medium transition-all resize-y"
                        />
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                            {names.length === 1 ? '1 nombre detectado' : `${names.length} nombres detectados`}
                        </p>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">
                            Comenzar desde
                        </label>
                        <select
                            value={startPos}
                            onChange={e => setStartPos(Number(e.target.value))}
                            className="w-28 border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-white outline-none focus:border-primary focus:ring-4 focus:ring-primary/5 font-medium transition-all"
                        >
                            {Array.from({ length: totalPositions }, (_, i) => i + 1).map(pos => (
                                <option key={pos} value={pos}>Fila {pos}</option>
                            ))}
                        </select>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                            Cada nombre ocupa la fila correspondiente. Si la fila ya tiene un estudiante, solo cambia su nombre; si está vacía, se crea uno nuevo.
                        </p>
                    </div>
                </div>
            )}
        </CieloModal>
    );
};

export default PegarListadoModal;