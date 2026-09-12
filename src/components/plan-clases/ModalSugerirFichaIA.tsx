import { useEffect, useState } from 'react';
import { X, Sparkles, Loader2, FileText, ChevronRight, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAppStore } from '../../store/appStore';
import { getAIAIProvider, isProviderConfigured, providerDisplayName } from '../../lib/aiConfig';
import { sugerirFichaPedagogica } from '../../lib/aiFichas';
import type { NotaContenido } from '../../types/planClases';

interface ModalSugerirFichaIAProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: (contenido: NotaContenido) => void;
}

interface SecuenciaRow {
    id: number;
    titulo: string;
    contenido_html: string;
}

interface SeccionExtraida {
    index: number;
    titulo: string;
    htmlTexto: string;
}

type Paso = 'seleccionar_secuencia' | 'seleccionar_seccion' | 'completar_tema' | 'generando';

export function ModalSugerirFichaIA({ isOpen, onClose, onSuccess }: ModalSugerirFichaIAProps) {
    const session = useAppStore(s => s.session);
    const [paso, setPaso] = useState<Paso>('seleccionar_secuencia');
    
    const [secuencias, setSecuencias] = useState<SecuenciaRow[]>([]);
    const [loadingSecuencias, setLoadingSecuencias] = useState(false);
    
    const [secuenciaSeleccionada, setSecuenciaSeleccionada] = useState<SecuenciaRow | null>(null);
    const [secciones, setSecciones] = useState<SeccionExtraida[]>([]);
    const [seccionSeleccionada, setSeccionSeleccionada] = useState<SeccionExtraida | null>(null);
    
    const [temaInput, setTemaInput] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        if (isOpen && session?.user?.id) {
            cargarSecuencias(session.user.id);
            setPaso('seleccionar_secuencia');
            setSecuenciaSeleccionada(null);
            setSeccionSeleccionada(null);
            setTemaInput('');
            setError('');
        }
    }, [isOpen, session?.user?.id]);

    const cargarSecuencias = async (userId: string) => {
        setLoadingSecuencias(true);
        try {
            const { data, error } = await supabase
                .from('secuencias')
                .select('id, titulo, contenido_html')
                .eq('user_id', userId)
                .order('created_at', { ascending: false });
            
            if (error) throw error;
            setSecuencias(data || []);
        } catch (err: any) {
            console.error(err);
            setError('Error al cargar secuencias');
        } finally {
            setLoadingSecuencias(false);
        }
    };

    const handleSelectSecuencia = (seq: SecuenciaRow) => {
        setSecuenciaSeleccionada(seq);
        
        // Extraer secciones
        const parser = new DOMParser();
        const doc = parser.parseFromString(seq.contenido_html || '', 'text/html');
        const bloques = doc.querySelectorAll('.session-block');
        
        const extraidas: SeccionExtraida[] = [];
        bloques.forEach((bloque, index) => {
            const tituloEl = bloque.querySelector('.session-title');
            const titulo = tituloEl?.textContent || `Plan de clase ${index + 1}`;
            extraidas.push({
                index,
                titulo,
                htmlTexto: bloque.innerHTML
            });
        });

        if (extraidas.length === 0) {
            // Fallback si no hay bloques: usar todo el html
            extraidas.push({ index: 0, titulo: 'Contenido completo', htmlTexto: seq.contenido_html });
        }
        
        setSecciones(extraidas);
        setPaso('seleccionar_seccion');
    };

    const handleSelectSeccion = (sec: SeccionExtraida) => {
        setSeccionSeleccionada(sec);
        setPaso('completar_tema');
    };

    const handleGenerar = async () => {
        const userId = session?.user?.id;
        if (!userId) { setError('Sesión inválida'); return; }
        
        if (!isProviderConfigured(userId, getAIAIProvider(userId))) {
            setError(`Configura tu API de ${providerDisplayName(getAIAIProvider(userId))} para utilizar esta función.`);
            return;
        }

        if (!seccionSeleccionada) return;

        setPaso('generando');
        setError('');

        try {
            // El DOMParser limpia un poco y extrae el texto plano para que el prompt no sea tan pesado con tags,
            // pero para conservar la semántica pasamos el innerHTML limpio de etiquetas complejas
            const parser = new DOMParser();
            const tempDiv = parser.parseFromString(seccionSeleccionada.htmlTexto, 'text/html').body;
            const contextoLimpio = tempDiv.innerText.replace(/\\s+/g, ' ').trim();

            const resultado = await sugerirFichaPedagogica(userId, contextoLimpio, temaInput.trim());
            onSuccess(resultado);
            onClose();
        } catch (err: any) {
            console.error(err);
            setError(err.message || 'Error al generar la ficha');
            setPaso('completar_tema');
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-100 bg-black/40 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="px-6 py-4 border-b border-[#2E3330]/10 flex items-center justify-between bg-[#689C63]/5">
                    <div className="flex items-center gap-2 text-[#689C63]">
                        <Sparkles size={18} />
                        <h3 className="font-bold text-[15px] tracking-tight text-[#2E3330]">
                            Sugerir ficha con IA
                        </h3>
                    </div>
                    <button onClick={onClose} className="p-1 rounded-full text-[#2E3330]/40 hover:bg-[#2E3330]/5 hover:text-[#2E3330] transition-colors">
                        <X size={18} />
                    </button>
                </div>

                <div className="p-6">
                    {error && (
                        <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-[12px] font-bold flex items-center gap-2">
                            <AlertCircle size={14} /> {error}
                        </div>
                    )}

                    {paso === 'seleccionar_secuencia' && (
                        <div className="flex flex-col gap-3">
                            <p className="text-[13px] text-[#2E3330]/70 mb-2">Selecciona la planificación diaria que deseas utilizar como base para la ficha.</p>
                            
                            <div className="max-h-64 overflow-y-auto pr-1 flex flex-col gap-2">
                                {loadingSecuencias ? (
                                    <div className="py-8 flex justify-center"><Loader2 size={24} className="animate-spin text-[#689C63]" /></div>
                                ) : secuencias.length === 0 ? (
                                    <div className="text-center py-6 text-[#2E3330]/50 text-[12px] font-bold">No tienes planificaciones diarias creadas.</div>
                                ) : (
                                    secuencias.map(seq => (
                                        <button
                                            key={seq.id}
                                            onClick={() => handleSelectSecuencia(seq)}
                                            className="w-full text-left p-4 rounded-xl border border-[#2E3330]/10 hover:border-[#689C63] hover:bg-[#689C63]/5 transition-all flex items-center justify-between group"
                                        >
                                            <span className="font-bold text-[14px] text-[#2E3330]">{seq.titulo}</span>
                                            <ChevronRight size={16} className="text-[#2E3330]/30 group-hover:text-[#689C63]" />
                                        </button>
                                    ))
                                )}
                            </div>
                        </div>
                    )}

                    {paso === 'seleccionar_seccion' && secuenciaSeleccionada && (
                        <div className="flex flex-col gap-3 animate-in slide-in-from-right-4">
                            <div className="flex items-center gap-2 mb-2 text-[#2E3330]/50">
                                <button onClick={() => setPaso('seleccionar_secuencia')} className="hover:text-[#2E3330] text-[12px] font-bold">Volver</button>
                                <span>/</span>
                                <span className="text-[12px] truncate">{secuenciaSeleccionada.titulo}</span>
                            </div>
                            <p className="text-[13px] text-[#2E3330]/70">¿Qué plan de clase (sección) quieres usar para generar la ficha?</p>
                            
                            <div className="max-h-64 overflow-y-auto pr-1 flex flex-col gap-2">
                                {secciones.map(sec => (
                                    <button
                                        key={sec.index}
                                        onClick={() => handleSelectSeccion(sec)}
                                        className="w-full text-left p-4 rounded-xl border border-[#2E3330]/10 hover:border-[#689C63] hover:bg-[#689C63]/5 transition-all flex flex-col gap-1"
                                    >
                                        <div className="flex items-center justify-between">
                                            <span className="font-bold text-[14px] text-[#2E3330] flex items-center gap-2">
                                                <FileText size={14} className="text-[#689C63]" /> {sec.titulo}
                                            </span>
                                            <ChevronRight size={16} className="text-[#2E3330]/30" />
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {paso === 'completar_tema' && seccionSeleccionada && (
                        <div className="flex flex-col gap-4 animate-in slide-in-from-right-4">
                            <div className="flex items-center gap-2 text-[#2E3330]/50 mb-1">
                                <button onClick={() => setPaso('seleccionar_seccion')} className="hover:text-[#2E3330] text-[12px] font-bold">Volver</button>
                                <span>/</span>
                                <span className="text-[12px] truncate">{seccionSeleccionada.titulo}</span>
                            </div>
                            
                            <div className="bg-[#2E3330]/5 p-4 rounded-xl">
                                <label className="block text-[12px] font-bold text-[#2E3330]/70 mb-2 uppercase tracking-wide">Tema / Asignatura / Grado (Opcional)</label>
                                <p className="text-[12px] text-[#2E3330]/60 mb-3 leading-relaxed">
                                    Si la planificación original no incluye claramente la asignatura o el grado, escríbelo aquí para que la IA tenga contexto preciso.
                                </p>
                                <input
                                    type="text"
                                    value={temaInput}
                                    onChange={e => setTemaInput(e.target.value)}
                                    placeholder="Ej: Matemáticas, 3ro Primaria, Fracciones"
                                    className="w-full h-11 px-3 rounded-lg border border-[#2E3330]/10 outline-none focus:border-[#689C63] text-[13px]"
                                />
                            </div>

                            <button
                                onClick={handleGenerar}
                                className="w-full h-12 rounded-xl bg-[#689C63] text-white font-bold text-[14px] hover:bg-[#5a8755] active:scale-95 transition-all flex items-center justify-center gap-2 shadow-sm"
                            >
                                <Sparkles size={16} /> Generar Ficha Sugerida
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
                                <h4 className="font-bold text-[15px] text-[#2E3330]">Diseñando ficha pedagógica...</h4>
                                <p className="text-[13px] text-[#2E3330]/60 mt-1 max-w-62.5 mx-auto">La IA está estructurando la actividad con inicio, desarrollo y cierre.</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
