import { useEffect, useState } from 'react';
import { Sparkles, Copy, Check, ClipboardPaste, ArrowRight } from 'lucide-react';
import type { Actividad, CriterioCotejo } from '../../types';
import { CieloModal } from '../ui/CieloModal';
import {
    generarPromptRubrica,
    generarPromptCotejo,
    type ContextoInstrumento,
    type DescriptorGenerado,
} from '../../lib/aiInstrumentos';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    tipo: 'rubrica' | 'cotejo';
    actividades: Actividad[];
    cursoNombre: string;
    asignatura: string | null;
    onAplicarRubrica?: (descriptores: DescriptorGenerado[]) => void;
    onAplicarCotejo?: (criterios: CriterioCotejo[]) => void;
}

export default function GenerarInstrumentoModal({
    isOpen,
    onClose,
    tipo,
    actividades,
    cursoNombre,
    asignatura,
    onAplicarRubrica,
    onAplicarCotejo,
}: Props) {
    const [selectedActivities, setSelectedActivities] = useState<number[]>([]);
    const [notas, setNotas] = useState('');
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [flowMode, setFlowMode] = useState<'select' | 'actions'>('select');
    const [isPromptCopied, setIsPromptCopied] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setSelectedActivities([]);
            setNotas('');
            setErrorMsg(null);
            setFlowMode('select');
            setIsPromptCopied(false);
        }
    }, [isOpen]);

    const handleContinuar = () => {
        if (selectedActivities.length === 0) {
            setErrorMsg(`Debes seleccionar al menos una actividad para generar la ${tituloTipo.toLowerCase()}.`);
            return;
        }
        setErrorMsg(null);
        setFlowMode('actions');
    };

    const handleCopyPrompt = async () => {
        let actividadesSeleccionadas = actividades.filter(a => selectedActivities.includes(a.id));
        
        try {
            const actividadBase = actividadesSeleccionadas.length > 0 ? actividadesSeleccionadas[0] : null;
            
            const contexto: ContextoInstrumento = {
                asignatura: asignatura || '',
                cursoNombre,
                periodo: actividadBase?.periodo || null,
                actividadNombre: tipo === 'cotejo' ? actividadBase?.nombre || null : null,
                indicadorLogro: tipo === 'cotejo' ? actividadBase?.indicador || null : null,
                bcAsignados: tipo === 'cotejo' ? actividadBase?.bcAsignados || null : null,
                notas,
                actividadesSeleccionadas: actividadesSeleccionadas.length > 0 
                    ? actividadesSeleccionadas.map(a => ({
                        nombre: a.nombre,
                        indicador: a.indicador || null,
                        bcAsignados: a.bcAsignados || null
                    }))
                    : undefined
            };

            const prompt = tipo === 'rubrica' 
                ? generarPromptRubrica(contexto)
                : generarPromptCotejo(contexto);

            await navigator.clipboard.writeText(prompt);
            setIsPromptCopied(true);
            setTimeout(() => setIsPromptCopied(false), 2500);
            setErrorMsg(null);
        } catch (error) {
            setErrorMsg(error instanceof Error ? error.message : 'Error al generar el prompt.');
        }
    };

    const handlePasteResponse = async () => {
        try {
            const text = await navigator.clipboard.readText();
            let parsed;
            
            const match = text.match(/```(?:json)?\n([\s\S]*?)\n```/);
            if (match) {
                try {
                    parsed = JSON.parse(match[1]);
                } catch(e) {
                    throw new Error('El JSON devuelto por la IA tiene un formato inválido.');
                }
            } else {
                try {
                    parsed = JSON.parse(text);
                } catch(e) {
                    throw new Error('No se encontró un bloque JSON válido en la respuesta. Recuerda copiar toda la respuesta de la IA que incluya el bloque ```json.');
                }
            }

            if (tipo === 'rubrica') {
                const descriptores = parsed.descriptores || parsed;
                if (!Array.isArray(descriptores)) throw new Error('El JSON no contiene el array "descriptores".');
                
                const validos = descriptores.filter((d: any) =>
                    d.bc && ['BC1', 'BC2', 'BC3', 'BC4'].includes(d.bc) && d.estrategico
                );
                if (validos.length === 0) throw new Error('No se encontraron descriptores válidos en la respuesta.');
                
                onAplicarRubrica?.(validos);
            } else {
                const criteriosRaw = parsed.criterios || parsed;
                if (!Array.isArray(criteriosRaw)) throw new Error('El JSON no contiene el array "criterios".');
                
                const base = Date.now();
                const criterios = criteriosRaw
                    .filter((c: any) => c.titulo?.trim())
                    .map((c: any, i: number) => ({
                        id: base + i,
                        titulo: c.titulo.trim(),
                        descripcion: c.descripcion?.trim() || ''
                    }));
                
                if (criterios.length === 0) throw new Error('No se encontraron criterios válidos en la respuesta.');
                
                onAplicarCotejo?.(criterios);
            }
            
            onClose();
        } catch (error) {
            setErrorMsg((error as Error).message);
        }
    };

    const tituloTipo = tipo === 'rubrica' ? 'Rúbrica' : 'Lista de Cotejo';

    return (
        <CieloModal
            isOpen={isOpen}
            onClose={onClose}
            title={`Generar ${tituloTipo} con IA`}
            subtitle="Asistente Inteligente de Evaluación"
            icon={<Sparkles size={20} />}
            maxWidth="lg"
            footer={
                <div className="flex items-center justify-between w-full">
                    {flowMode === 'actions' ? (
                        <button
                            onClick={() => setFlowMode('select')}
                            className="px-5 py-2.5 rounded-full text-xs font-black uppercase tracking-widest text-slate-500 hover:bg-slate-100 transition-all outline-none focus-visible:ring-2 focus-visible:ring-slate-300"
                        >
                            Volver
                        </button>
                    ) : (
                        <button
                            onClick={onClose}
                            className="px-5 py-2.5 rounded-full text-xs font-black uppercase tracking-widest text-slate-500 hover:bg-slate-100 transition-all outline-none focus-visible:ring-2 focus-visible:ring-slate-300"
                        >
                            Cancelar
                        </button>
                    )}
                    
                    {flowMode === 'select' && (
                        <button
                            onClick={handleContinuar}
                            className={`px-6 py-2.5 rounded-full text-xs font-black uppercase tracking-widest bg-primary text-[#2E3330] shadow-md shadow-primary/20 hover:bg-primary/90 transition-all active:scale-95 flex items-center justify-center gap-2`}
                        >
                            Continuar <ArrowRight size={14} />
                        </button>
                    )}
                </div>
            }
        >
            {flowMode === 'select' && (
                <div className="py-2 space-y-5">
                    <p className="text-xs text-slate-500 leading-relaxed font-medium">
                        Selecciona el contexto curricular. Luego podrás copiar un prompt optimizado para que tu IA preferida te asista construyendo la {tituloTipo.toLowerCase()}.
                    </p>

                    <div className="space-y-1.5">
                        <label className="notion-label">Curso</label>
                        <div className="search-container h-11! rounded-xl! opacity-70 pointer-events-none">
                            <input
                                readOnly
                                className="text-sm font-medium w-full bg-transparent outline-none"
                                value={cursoNombre || 'Sin curso seleccionado'}
                            />
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                            <label className="notion-label">Actividad</label>
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest bg-slate-100 px-2 py-0.5 rounded-md">
                                Seleccionadas: {selectedActivities.length}/5
                            </span>
                        </div>
                        <p className="text-[11px] text-slate-500 font-medium leading-tight">
                            Selecciona de 1 a 5 actividades. La IA analizará los indicadores para proponer un instrumento coherente.
                        </p>
                        <div className="flex flex-col gap-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar mt-2">
                            {actividades.map(a => {
                                const isSelected = selectedActivities.includes(a.id);
                                const isDisabled = !isSelected && selectedActivities.length >= 5;
                                return (
                                    <button
                                        key={a.id}
                                        onClick={() => {
                                            if (isSelected) {
                                                setSelectedActivities(prev => prev.filter(id => id !== a.id));
                                            } else if (!isDisabled) {
                                                setSelectedActivities(prev => [...prev, a.id]);
                                            }
                                        }}
                                        disabled={isDisabled}
                                        className={`text-left w-full px-3 py-2 rounded-xl border text-xs font-medium transition-all flex items-center justify-between gap-3 ${
                                            isSelected 
                                                ? 'bg-primary/10 border-primary text-[#2E3330] shadow-sm shadow-primary/5'
                                                : isDisabled
                                                    ? 'bg-slate-50 border-slate-200 text-slate-400 opacity-50 cursor-not-allowed'
                                                    : 'bg-white border-slate-200 text-slate-600 hover:border-primary/50 hover:bg-slate-50'
                                        }`}
                                    >
                                        <div className="flex flex-col overflow-hidden">
                                            <span className="font-bold truncate">{a.nombre}</span>
                                            <span className="text-[10px] opacity-70 truncate">{a.indicador || 'Sin indicador'}</span>
                                        </div>
                                        <div className={`shrink-0 w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                                            isSelected ? 'border-primary bg-primary text-white' : 'border-slate-300'
                                        }`}>
                                            {isSelected && <Check size={10} strokeWidth={3} />}
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label className="notion-label">Indicaciones adicionales (opcional)</label>
                        <textarea
                            rows={3}
                            className="w-full bg-base-creme border border-slate-350 rounded-xl px-4 py-3 text-sm font-medium text-[#2E3330] outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all resize-none placeholder:text-slate-400 placeholder:font-normal"
                            placeholder="Ej.: Enfocarse en el trabajo colaborativo..."
                            value={notas}
                            onChange={e => setNotas(e.target.value)}
                        />
                    </div>

                    {errorMsg && (
                        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-bold text-red-600 leading-relaxed">
                            {errorMsg}
                        </div>
                    )}
                </div>
            )}

            {flowMode === 'actions' && (
                <div className="py-2 space-y-6">
                    {errorMsg && (
                        <div className="p-4 bg-red-50 border border-red-200 text-red-700 text-xs font-bold uppercase tracking-wider rounded-xl">
                            {errorMsg}
                        </div>
                    )}
                    
                    <div className="space-y-4">
                        <div className="p-5 bg-slate-50 border border-slate-200 rounded-2xl relative">
                            <div className="absolute -top-3 -left-3 w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-400 font-bold text-xs shadow-sm">1</div>
                            <h4 className="text-sm font-bold text-slate-800 mb-1.5">Generar Instrucción</h4>
                            <p className="text-xs text-slate-500 font-medium mb-4">
                                Copia el prompt preparado por CIELO con el contexto de las actividades seleccionadas y pégalo en tu IA preferida.
                            </p>
                            <button 
                                className="w-full h-11 rounded-full text-xs font-bold uppercase tracking-widest bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 hover:border-slate-300 transition-all active:scale-95 flex items-center justify-center gap-2 shadow-sm"
                                onClick={handleCopyPrompt}
                            >
                                {isPromptCopied ? (
                                    <><Check size={16} className="text-emerald-500" /> Prompt copiado</>
                                ) : (
                                    <><Copy size={16} className="text-slate-400" /> Copiar prompt</>
                                )}
                            </button>
                        </div>
                        
                        <div className="p-5 bg-slate-50 border border-slate-200 rounded-2xl relative">
                            <div className="absolute -top-3 -left-3 w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-400 font-bold text-xs shadow-sm">2</div>
                            <h4 className="text-sm font-bold text-slate-800 mb-1.5">Importar Resultado</h4>
                            <p className="text-xs text-slate-500 font-medium mb-4">
                                Copia toda la respuesta que te devuelva la IA y pégala aquí para incorporarla a CIELO.
                            </p>
                            <button 
                                className="w-full h-11 rounded-full text-xs font-bold uppercase tracking-widest bg-primary text-[#2E3330] shadow-md shadow-primary/20 hover:bg-primary/90 transition-all active:scale-95 flex items-center justify-center gap-2"
                                onClick={handlePasteResponse}
                            >
                                <ClipboardPaste size={16} /> Pegar respuesta de IA
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </CieloModal>
    );
}
