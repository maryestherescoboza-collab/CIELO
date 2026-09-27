import { useEffect, useState, useRef } from 'react';
import { X, Sparkles, Loader2, AlertCircle, Check } from 'lucide-react';
import { useAppStore } from '../../store/appStore';
import { getAIAIProvider, isProviderConfigured, providerDisplayName } from '../../lib/aiConfig';
import { sugerirFichaPedagogica, type ContextoFichaIA } from '../../lib/aiFichas';
import type { NotaContenido } from '../../types/planClases';
import { NotaEditor } from './NotaEditor';

interface ModalSugerirFichaIAProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: (contenido: NotaContenido) => void;
    contextoFicha?: ContextoFichaIA;
    fichaExistente?: boolean;
}

export function ModalSugerirFichaIA({ isOpen, onClose, onSuccess, contextoFicha, fichaExistente }: ModalSugerirFichaIAProps) {
    const session = useAppStore(s => s.session);
    const [paso, setPaso] = useState<'config' | 'generando' | 'preview'>('config');
    const [error, setError] = useState('');

    const [temaInput, setTemaInput] = useState('');
    const [duracionInput, setDuracionInput] = useState<number>(45);
    const [instruccionesInput, setInstruccionesInput] = useState('');

    const [propuestaGenerada, setPropuestaGenerada] = useState<NotaContenido | null>(null);
    const contenidoEditadoRef = useRef<NotaContenido | null>(null);

    useEffect(() => {
        if (isOpen) {
            setPaso('config');
            setError('');
            setTemaInput('');
            setDuracionInput(45);
            setInstruccionesInput('');
            setPropuestaGenerada(null);
            contenidoEditadoRef.current = null;
        }
    }, [isOpen]);

    const handleGenerar = async () => {
        const userId = session?.user?.id;
        if (!userId) { setError('Sesión inválida'); return; }
        
        if (!isProviderConfigured(userId, getAIAIProvider(userId))) {
            setError(`Configura tu API de ${providerDisplayName(getAIAIProvider(userId))} para utilizar esta función.`);
            return;
        }

        const temaLimpio = temaInput.trim() || undefined;
        const instLimpias = instruccionesInput.trim() || undefined;

        const contextoAEnviar: ContextoFichaIA = {
            curso: contextoFicha?.curso || { grado: 'No especificado', asignatura: 'No especificada' },
            actividad: contextoFicha?.actividad,
            contextoClase: {
                duracionMinutos: duracionInput,
                tema: temaLimpio,
                instrucciones: instLimpias,
            }
        };

        const tieneTema = !!contextoAEnviar.contextoClase.tema;
        const tieneTituloActividad = !!contextoAEnviar.actividad?.titulo;

        if (!tieneTema && !tieneTituloActividad) {
            setError('Falta el contexto de la actividad para generar la ficha. Debes indicar un tema o iniciar desde una actividad.');
            return;
        }

        setPaso('generando');
        setError('');

        try {

            const resultado = await sugerirFichaPedagogica(userId, contextoAEnviar);
            setPropuestaGenerada(resultado);
            contenidoEditadoRef.current = resultado;
            setPaso('preview');
        } catch (err: any) {
            console.error(err);
            setError(err.message || 'Error al generar la ficha');
            setPaso('config');
        }
    };

    const handleConfirmar = () => {
        if (contenidoEditadoRef.current) {
            onSuccess(contenidoEditadoRef.current);
            onClose();
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-100 bg-black/40 flex items-center justify-center p-4">
            <div className={`bg-white rounded-3xl shadow-2xl w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200 ${paso === 'preview' ? 'max-w-4xl h-[90vh] flex flex-col' : 'max-w-lg'}`}>
                {/* Header */}
                <div className="px-6 py-4 border-b border-[#2E3330]/10 flex items-center justify-between bg-[#689C63]/5">
                    <div className="flex items-center gap-2 text-[#689C63]">
                        <Sparkles size={18} />
                        <h3 className="font-bold text-[15px] tracking-tight text-[#2E3330]">
                            {fichaExistente ? 'Regenerar ficha con IA' : 'Generar ficha con IA'}
                        </h3>
                    </div>
                    <button onClick={onClose} disabled={paso === 'generando'} className="p-1 rounded-full text-[#2E3330]/40 hover:bg-[#2E3330]/5 hover:text-[#2E3330] transition-colors disabled:opacity-50">
                        <X size={18} />
                    </button>
                </div>

                <div className={`p-6 ${paso === 'preview' ? 'flex-1 overflow-y-auto' : ''}`}>
                    {error && (
                        <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-[12px] font-bold flex items-center gap-2">
                            <AlertCircle size={14} /> {error}
                        </div>
                    )}

                    {paso === 'config' && (
                        <div className="flex flex-col gap-4">
                            {fichaExistente && (
                                <div className="p-3 bg-amber-50 text-amber-700 rounded-xl text-[12px] font-bold">
                                    Nota: Esta acción generará una nueva propuesta. Podrás revisarla antes de sobrescribir el contenido actual.
                                </div>
                            )}
                            
                            <div className="bg-[#2E3330]/5 p-4 rounded-xl space-y-4">
                                <div>
                                    <label className="block text-[12px] font-bold text-[#2E3330]/70 mb-2 uppercase tracking-wide">Tema Específico (Opcional)</label>
                                    <input
                                        type="text"
                                        value={temaInput}
                                        onChange={e => setTemaInput(e.target.value)}
                                        placeholder="Ej: Suma de fracciones con mismo denominador"
                                        className="w-full h-10 px-3 rounded-lg border border-[#2E3330]/10 outline-none focus:border-[#689C63] text-[13px]"
                                    />
                                </div>

                                <div>
                                    <label className="block text-[12px] font-bold text-[#2E3330]/70 mb-2 uppercase tracking-wide">Duración estimada</label>
                                    <select
                                        value={duracionInput}
                                        onChange={e => setDuracionInput(Number(e.target.value))}
                                        className="w-full h-10 px-3 rounded-lg border border-[#2E3330]/10 outline-none focus:border-[#689C63] text-[13px] bg-white"
                                    >
                                        <option value={30}>30 minutos</option>
                                        <option value={45}>45 minutos</option>
                                        <option value={60}>60 minutos (1 hora)</option>
                                        <option value={90}>90 minutos (2 horas pedagógicas)</option>
                                        <option value={120}>120 minutos</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-[12px] font-bold text-[#2E3330]/70 mb-2 uppercase tracking-wide">Instrucciones Adicionales (Opcional)</label>
                                    <textarea
                                        value={instruccionesInput}
                                        onChange={e => setInstruccionesInput(e.target.value)}
                                        placeholder="Ej: Quiero que los estudiantes trabajen en grupos de 4 y utilicen papelógrafo."
                                        className="w-full p-3 rounded-lg border border-[#2E3330]/10 outline-none focus:border-[#689C63] text-[13px] resize-none h-20"
                                    />
                                </div>
                            </div>

                            <button
                                onClick={handleGenerar}
                                className="w-full h-12 rounded-xl bg-[#689C63] text-white font-bold text-[14px] hover:bg-[#5a8755] active:scale-95 transition-all flex items-center justify-center gap-2 shadow-sm"
                            >
                                <Sparkles size={16} /> {fichaExistente ? 'Regenerar Propuesta' : 'Generar Propuesta'}
                            </button>
                        </div>
                    )}

                    {paso === 'generando' && (
                        <div className="py-12 flex flex-col items-center justify-center gap-4 text-center">
                            <div className="relative">
                                <div className="absolute inset-0 bg-[#689C63]/20 rounded-full blur-xl animate-pulse"></div>
                                <Loader2 size={40} className="animate-spin text-[#689C63] relative z-10" />
                            </div>
                            <div>
                                <h4 className="font-bold text-[15px] text-[#2E3330]">Diseñando ficha de aprendizaje...</h4>
                                <p className="text-[13px] text-[#2E3330]/60 mt-1 max-w-62.5 mx-auto">Conectando la competencia y el indicador para generar las actividades de inicio, desarrollo y cierre.</p>
                            </div>
                        </div>
                    )}

                    {paso === 'preview' && propuestaGenerada && (
                        <div className="flex flex-col h-full animate-in slide-in-from-right-4">
                            <div className="mb-4">
                                <h4 className="font-bold text-[15px] text-[#2E3330]">Revisa la propuesta de ficha</h4>
                                <p className="text-[13px] text-[#2E3330]/60 mt-1">Puedes hacer ajustes directamente en el texto antes de guardarla permanentemente.</p>
                                {(propuestaGenerada as any)._fallbackUsed && (
                                    <div className="mt-2 text-[11px] font-bold text-[#689C63] bg-[#689C63]/10 px-2 py-1 rounded-md inline-block">
                                        Se utilizó el proveedor de respaldo.
                                    </div>
                                )}
                            </div>
                            <div className="flex-1 overflow-y-auto mb-4 bg-gray-50 rounded-xl">
                                <NotaEditor
                                    initialDataOverride={propuestaGenerada}
                                    disableAutoSave={true}
                                    onChangeContent={(data) => {
                                        contenidoEditadoRef.current = data;
                                    }}
                                />
                            </div>
                            <div className="flex gap-3 justify-end pt-4 border-t border-[#2E3330]/10">
                                <button
                                    onClick={() => setPaso('config')}
                                    className="px-6 h-11 rounded-xl text-[#2E3330] font-bold text-[13px] hover:bg-[#2E3330]/5 transition-colors"
                                >
                                    Volver atrás
                                </button>
                                <button
                                    onClick={handleConfirmar}
                                    className="px-6 h-11 rounded-xl bg-[#689C63] text-white font-bold text-[13px] hover:bg-[#5a8755] active:scale-95 transition-all flex items-center justify-center gap-2 shadow-sm"
                                >
                                    <Check size={16} /> Guardar Ficha
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
