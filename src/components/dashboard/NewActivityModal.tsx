import { useState, useEffect } from 'react';
import { MessageSquareText, Brain, Puzzle, Microscope, Sparkles, BookOpen, AlertCircle, Check, Loader2 } from 'lucide-react';
import type { AppState, Actividad, BCKey } from '../../types';
import { COMPETENCIAS_LABEL } from '../../types';
import { TC_Flux, TC_Genesis, TC_Archive, TC_Echo } from '../icons/TerraCognitaIcons';
import { CieloModal } from '../ui/CieloModal';
import { useAppStore } from '../../store/appStore';
import { getAIAIProvider, isProviderConfigured, providerDisplayName, saveAIKey, saveAIAIProvider } from '../../lib/aiConfig';
import { callAI, clearAICircuitBreakers } from '../../lib/aiProvider';
import { calculateHash, cleanTechnicalText } from '../../lib/aiPreprocessor';
import { getCurrentMonthAIUsage, type AIUsageStats } from '../../lib/aiUsage';
import { SelectorIndicadorFragmento } from '../curriculo/SelectorIndicadorFragmento';

const BC_CIRCLE_CONFIG: Array<{ id: BCKey; label: string; icon: typeof MessageSquareText; bg: string; selectedBg: string; selectedText: string }> = [
  { id: 'BC1', label: COMPETENCIAS_LABEL.BC1, icon: MessageSquareText, bg: 'bg-blue-50', selectedBg: 'bg-blue-600', selectedText: 'text-white' },
  { id: 'BC2', label: COMPETENCIAS_LABEL.BC2, icon: Brain, bg: 'bg-violet-50', selectedBg: 'bg-violet-600', selectedText: 'text-white' },
  { id: 'BC3', label: COMPETENCIAS_LABEL.BC3, icon: Puzzle, bg: 'bg-amber-50', selectedBg: 'bg-amber-600', selectedText: 'text-white' },
  { id: 'BC4', label: COMPETENCIAS_LABEL.BC4, icon: Microscope, bg: 'bg-emerald-50', selectedBg: 'bg-emerald-600', selectedText: 'text-white' },
];

// Límite de entrada del analizador de actividades. CIELO valida el tamaño del texto
// ANTES de llamar a la API (Gemini u OpenAI): si se supera, se bloquea localmente sin
// consumir tokens, sin recortar el texto del docente y sin enviar nada al proveedor.
// Este valor se ha incrementado significativamente para delegar el límite a los tokens del proveedor.
const MAX_ANALYSIS_CHARS = 1500000;

interface NewActivityModalProps {
    show: boolean;
    onClose: () => void;
    onAddActividad: (a: Omit<Actividad, 'id'>) => Promise<any>;
    cursos: AppState['cursos'];
    onSuccess: () => void;
    initialDate?: string | null;
}

interface ExtractedActivity {
    nombre: string;
    competencias: BCKey[];
    indicador_logro: string;
    producto: string;
    descripcion?: string;
    selected: boolean;
}

export function NewActivityModal({ show, onClose, onAddActividad, cursos, onSuccess, initialDate }: NewActivityModalProps) {
    const session = useAppStore(s => s.session);
    const state = useAppStore(s => s.state);
    const today = new Date().toISOString().split('T')[0];
    const [flowMode, setFlowMode] = useState<'choice' | 'manual' | 'text' | 'preview'>('choice');
    
    // Manual flow states
    const [isSaving, setIsSaving] = useState(false);
    const [form, setForm] = useState({
        nombre: '',
        fecha: initialDate || today,
        secuenciaId: '',
        bcs: ['BC1'] as BCKey[],
        cursoId: cursos[0]?.id ?? 0,
        indicador: ''
    });

    const [indicadoresJson, setIndicadoresJson] = useState<any[]>([]);

    // IA flow (texto pegado) states
    const [pastedText, setPastedText] = useState('');
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [extractedActivities, setExtractedActivities] = useState<ExtractedActivity[]>([]);
    const [targetCursoId, setTargetCursoId] = useState<number>(0);
    const [targetPeriodo, setTargetPeriodo] = useState<string>('');
    const [targetFecha, setTargetFecha] = useState<string>(today);
    const [isPromptCopied, setIsPromptCopied] = useState(false);

    // API Key flow states
    const [showApiKeyPrompt, setShowApiKeyPrompt] = useState(false);
    const [tempApiKey, setTempApiKey] = useState('');
    
    // AI Usage state
    const [aiUsage, setAiUsage] = useState<AIUsageStats | null>(null);
    const [fallbackNotice, setFallbackNotice] = useState<string | null>(null);

    // Fetch AI Usage when modal opens
    useEffect(() => {
        if (show && session?.user?.id) {
            getCurrentMonthAIUsage(session.user.id).then(setAiUsage);
        }
    }, [show, session?.user?.id]);

    useEffect(() => {
        if (show && initialDate) {
            setForm(f => ({ ...f, fecha: initialDate }));
            setTargetFecha(initialDate);
        } else if (show) {
            setForm(f => ({ ...f, fecha: today }));
            setTargetFecha(today);
        }
    }, [show, initialDate]);

    // Reset all states
    const handleClose = () => {
        setFlowMode('choice');
        setPastedText('');
        setErrorMsg(null);
        setFallbackNotice(null);
        setIsProcessing(false);
        setShowApiKeyPrompt(false);
        setTempApiKey('');
        setExtractedActivities([]);
        setTargetCursoId(0);
        setTargetPeriodo('');
        setTargetFecha(initialDate || today);
        setForm({
            nombre: '',
            fecha: initialDate || today,
            secuenciaId: '',
            bcs: ['BC1'] as BCKey[],
            cursoId: cursos[0]?.id ?? 0,
            indicador: ''
        });
        setIndicadoresJson([]);
        onClose();
    };

    // Manual creation handler
    async function handleCreateManual() {
        if (!form.nombre.trim() || !form.cursoId || form.bcs.length === 0 || !form.indicador.trim() || isSaving) return;
        
        const currentUserId = session?.user?.id;
        if (!currentUserId) {
            setErrorMsg('Sesión de usuario no válida.');
            return;
        }

        const cursoDocente = state.cursoDocentes.find(
            cd => cd.cursoId === form.cursoId && cd.userId === currentUserId
        );
        const docenteAsignatura = cursoDocente?.asignatura;

        if (!docenteAsignatura) {
            setErrorMsg('El docente no tiene una asignatura asignada para ese curso.');
            return;
        }

        setIsSaving(true);
        setErrorMsg(null);
        try {
            const curso = cursos.find(c => c.id === form.cursoId);
            const result = await onAddActividad({
                nombre: form.nombre,
                fecha: form.fecha,
                cursoId: form.cursoId,
                periodo: useAppStore.getState().selectedPeriodo || curso?.periodo || 'P2',
                bcAsignados: form.bcs,
                secuenciaId: form.secuenciaId ? parseInt(form.secuenciaId) : undefined,
                sharedCourseId: curso?.sharedCourseId,
                userId: currentUserId,
                asignatura: docenteAsignatura,
                indicador: form.indicador || undefined,
                indicadores_json: indicadoresJson.length > 0 ? indicadoresJson : undefined
            });

            if (result) {
                onSuccess();
                handleClose();
            }
        } catch (error) {
            console.error('Error in handleCreateManual:', error);
            setErrorMsg('No se pudo guardar la actividad. Inténtalo nuevamente.');
        } finally {
            setIsSaving(false);
        }
    }

    const handleSaveApiKey = () => {
        if (!tempApiKey.trim() || !session?.user?.id) return;
        clearAICircuitBreakers(session.user.id);
        saveAIKey(session.user.id, getAIAIProvider(session.user.id), tempApiKey);
        setShowApiKeyPrompt(false);
        setTempApiKey('');
        handleProcessText();
    };

    const handleCopyPrompt = async () => {
        if (!pastedText.trim()) {
            setErrorMsg("Debes pegar el texto de la secuencia o planificación antes de copiar el prompt.");
            return;
        }
        
        const cleanedText = cleanTechnicalText(pastedText);
        const prompt = `Analiza el texto completo y determina todas las actividades presentes por comprensión semántica.

Reglas:
- Conserva exactamente el nombre, título o numeración (ej. Actividad 1.1) cuando exista.
- Identifica actividades aunque se llamen "Ejercicio", "Tarea", "Parte I" o sean solo instrucciones.
- Infiere descripcion, indicador_logro, producto, y competencias.
- La "descripcion" debe ser breve y explicar claramente en qué consiste la actividad o qué acción principal realizará el estudiante.
- Utiliza ÚNICAMENTE estas competencias: "Comunicativa", "Pensamiento Lógico, Creativo y Crítico; y Resolución de Problemas", "Científica y Tecnológica; y Ambiental y de la Salud", "Ética y Ciudadana; y Desarrollo Personal y Espiritual".
- Devuelve ÚNICAMENTE el objeto JSON, sin explicaciones ni markdown.

Estructura obligatoria:
{
  "actividades": [
    {
      "nombre": "string",
      "descripcion": "string",
      "indicador_logro": "string",
      "competencias": ["string"],
      "producto": "string"
    }
  ]
}`;
        const finalPrompt = `${prompt}\n\nTEXTO A ANALIZAR:\n${cleanedText}`;
        
        try {
            await navigator.clipboard.writeText(finalPrompt);
            setIsPromptCopied(true);
            setTimeout(() => setIsPromptCopied(false), 2000);
        } catch (err) {
            setErrorMsg("No se pudo copiar el prompt al portapapeles.");
        }
    };

    const handlePasteJson = async () => {
        try {
            const text = await navigator.clipboard.readText();
            let parsed;
            try {
                parsed = JSON.parse(text);
            } catch(e) {
                const match = text.match(/```json\n([\s\S]*)\n```/) || text.match(/```\n([\s\S]*)\n```/);
                if (match) {
                    parsed = JSON.parse(match[1]);
                } else {
                    setErrorMsg('El contenido del portapapeles no es un JSON válido.');
                    return;
                }
            }
            const extracted = parsed.actividades || parsed.data?.actividades || parsed;
            if (!Array.isArray(extracted) || extracted.length === 0) {
                throw new Error('No se encontraron actividades en el JSON.');
            }
            
            const mapCompetenciaToCode = (nombre: string) => {
                if (!nombre) return null;
                const norm = nombre.trim().toLowerCase();
                if (norm.includes('comunicativa')) return 'BC1';
                if (norm.includes('lógico') || norm.includes('resolución')) return 'BC2';
                if (norm.includes('científica') || norm.includes('tecnológica') || norm.includes('salud')) return 'BC3';
                if (norm.includes('ética') || norm.includes('ciudadana') || norm.includes('espiritual') || norm.includes('personal')) return 'BC4';
                return null;
            };
            
            const formatted = extracted.map((act: any) => {
                const mappedBcs = Array.isArray(act.competencias) ? act.competencias.map(mapCompetenciaToCode).filter((c: any) => c !== null) : [];
                return {
                    nombre: act.nombre || 'Actividad',
                    descripcion: act.descripcion || '',
                    indicador_logro: act.indicador_logro || '',
                    competencias: mappedBcs,
                    producto: act.producto || '',
                    selected: true
                };
            });
            
            setExtractedActivities(formatted);
            setFlowMode('preview');
        } catch (error) {
            setErrorMsg('Error al procesar el JSON: ' + (error as Error).message);
        }
    };

    const handleProcessText = async () => {
        if (!pastedText.trim() || isProcessing) return;

        const currentUserId = session?.user?.id;
        if (!currentUserId) {
            setErrorMsg('Sesión de usuario no válida.');
            return;
        }
        if (!targetCursoId) {
            setErrorMsg('Selecciona un curso antes de procesar.');
            return;
        }
        if (!targetPeriodo) {
            setErrorMsg('Selecciona un período antes de procesar.');
            return;
        }

        const cursoDocente = state.cursoDocentes.find(
            cd => cd.cursoId === targetCursoId && cd.userId === currentUserId
        );
        const docenteAsignatura = cursoDocente?.asignatura;

        if (!docenteAsignatura) {
            setErrorMsg('El docente no tiene una asignatura asignada para ese curso.');
            return;
        }

        if (!isProviderConfigured(currentUserId, getAIAIProvider(currentUserId))) {
            setShowApiKeyPrompt(true);
            return;
        }

        // Validación previa local: si el texto excede el límite, se bloquea antes de
        // cualquier llamada a la API. No se recorta el texto ni se consume un token.
        if (pastedText.length > MAX_ANALYSIS_CHARS) {
            setErrorMsg('El texto es demasiado extenso para analizarlo de una vez. Divide el contenido en partes más pequeñas e inténtalo nuevamente.');
            return;
        }

        setIsProcessing(true);
        setErrorMsg(null);

        const MAX_RETRIES = 1;
        let attempt = 0;
        let success = false;
        
        while (attempt <= MAX_RETRIES && !success) {
            try {
                const cleanedText = cleanTechnicalText(pastedText);
                const hash = await calculateHash(cleanedText);

                const prompt = `Analiza el texto completo y determina todas las actividades presentes por comprensión semántica.

Reglas:
- Conserva exactamente el nombre, título o numeración (ej. Actividad 1.1) cuando exista.
- Identifica actividades aunque se llamen "Ejercicio", "Tarea", "Parte I" o sean solo instrucciones.
- Infiere descripcion, indicador_logro, producto, y competencias.
- La "descripcion" debe ser breve y explicar claramente en qué consiste la actividad o qué acción principal realizará el estudiante.
- Utiliza ÚNICAMENTE estas competencias: "Comunicativa", "Pensamiento Lógico, Creativo y Crítico; y Resolución de Problemas", "Científica y Tecnológica; y Ambiental y de la Salud", "Ética y Ciudadana; y Desarrollo Personal y Espiritual".
- Devuelve ÚNICAMENTE el objeto JSON, sin explicaciones ni markdown.

Estructura obligatoria:
{
  "actividades": [
    {
      "nombre": "string",
      "descripcion": "string",
      "indicador_logro": "string",
      "competencias": ["string"],
      "producto": "string"
    }
  ]
}`;

                const data = await callAI<{ actividades: any[] }>({
                    userId: currentUserId,
                    prompt: `${prompt}\n\nTEXTO A ANALIZAR:\n${cleanedText}`,
                    hash: hash,
                    originalText: pastedText,
                    operation: 'analyze_activities',
                    geminiResponseSchema: {
                        type: 'OBJECT',
                        properties: {
                            actividades: {
                                type: 'ARRAY',
                                items: {
                                    type: 'OBJECT',
                                    properties: {
                                        nombre: { type: 'STRING' },
                                        descripcion: { type: 'STRING' },
                                        indicador_logro: { type: 'STRING' },
                                        competencias: { 
                                            type: 'ARRAY', 
                                            items: { type: 'STRING' } 
                                        },
                                        producto: { type: 'STRING' }
                                    },
                                    required: ['nombre', 'descripcion', 'indicador_logro', 'competencias', 'producto']
                                }
                            }
                        },
                        required: ['actividades']
                    }
                });

                if (!data || typeof data !== 'object' || !Array.isArray((data as Record<string, unknown>).actividades)) {
                    throw new Error('Formato JSON inválido.');
                }

                // Parser tolerante: rescatar actividades válidas e ignorar las rotas
                const validActivities = data.actividades.filter(act => {
                    return act && typeof act.nombre === 'string' && typeof act.indicador_logro === 'string' && Array.isArray(act.competencias) && typeof act.producto === 'string';
                });

                if (validActivities.length === 0) {
                    throw new Error('No se encontraron actividades válidas en la respuesta.');
                }

                const extracted = validActivities.map((act: any) => {
                    const mapCompetenciaToCode = (nombre: string) => {
                        if (!nombre) return null;
                        const norm = nombre.trim().toLowerCase();
                        if (norm.includes('comunicativa')) return 'BC1';
                        if (norm.includes('lógico') || norm.includes('resolución')) return 'BC2';
                        if (norm.includes('científica') || norm.includes('tecnológica') || norm.includes('salud')) return 'BC3';
                        if (norm.includes('ética') || norm.includes('ciudadana') || norm.includes('espiritual') || norm.includes('personal')) return 'BC4';
                        return null;
                    };

                    const mappedBcs = act.competencias.map(mapCompetenciaToCode).filter((c: any) => c !== null);
                    return {
                        nombre: act.nombre || 'Actividad',
                        descripcion: act.descripcion || '',
                        competencias: mappedBcs,
                        indicador_logro: act.indicador_logro || '',
                        producto: act.producto || '',
                        selected: true
                    };
                });

                setFallbackNotice((data as any)._fallbackUsed ? ((data as any)._fallbackProvider || 'asistente de respaldo') : null);
                setExtractedActivities(extracted);
                setFlowMode('preview');
                success = true;
                // Refrescar uso de IA
                getCurrentMonthAIUsage(currentUserId).then(setAiUsage);

            } catch (error: any) {
                attempt++;
                console.error(`Error analyzing text (Intento ${attempt}):`, error);
                
                if (attempt > MAX_RETRIES) {
                    const errMsg = error.message || '';
                    if (errMsg.includes('límite temporal') || errMsg.includes('429')) {
                        setErrorMsg('El servicio de IA está saturado en este momento. Inténtalo nuevamente más tarde.');
                    } else if (errMsg.includes('demasiado extenso') || errMsg.includes('413') || errMsg.includes('400')) {
                        setErrorMsg('El texto es muy extenso para procesarlo de una sola vez. Acorta el contenido o divídelo en partes e inténtalo nuevamente.');
                    } else {
                        setErrorMsg('El servicio de IA no respondió correctamente. Inténtalo nuevamente.');
                    }
                }
            }
        }
        setIsProcessing(false);
    };

    // @ts-expect-error unused temporalmente
    const handleAnalizarNavegador = async () => {
        if (!pastedText.trim()) return;
        
        // Verificar si la extensión CIELO IA está instalada mediante la variable inyectada
        // @ts-ignore
        if (!window.__CIELO_IA_EXTENSION_INSTALLED__) {
            setErrorMsg("Extensión no detectada. Para usar el análisis en el panel lateral, instala la extensión 'CIELO IA' y recarga la página.");
            return;
        }

        const promptNavegador = `Analiza TODO el texto y extrae TODAS las actividades independientes.

Conserva cada actividad aunque esté identificada como Actividad 1, Actividad 1.1, 1, 1.1, Ejercicio 2, un título, tema, encabezado o cualquier otra forma. No elimines ni cambies sus índices, subíndices o nombres originales.

No fusiones actividades independientes.

Para cada actividad devuelve:

* nombre
* indicador_logro
* competencias
* producto

Si falta información, infiérela razonablemente. No descartes actividades por falta de información.

Utiliza únicamente estas competencias:

* Comunicativa
* Pensamiento Lógico, Creativo y Crítico; y Resolución de Problemas
* Científica y Tecnológica; y Ambiental y de la Salud
* Ética y Ciudadana; y Desarrollo Personal y Espiritual

Devuelve únicamente JSON válido con esta estructura:

{
"actividades": [
{
"nombre": "string",
"indicador_logro": "string",
"competencias": ["string"],
"producto": "string"
}
]
}

TEXTO A ANALIZAR:
${pastedText}`;

        try {
            await navigator.clipboard.writeText(promptNavegador);
            
            // Emitir evento a la extensión CIELO IA
            const event = new CustomEvent('CIELO_IA_ANALYZE', {
                detail: { text: pastedText, prompt: promptNavegador }
            });
            window.dispatchEvent(event);
            
        } catch (err) {
            console.error("Error al emitir evento a la extensión:", err);
            setErrorMsg("Ocurrió un error al intentar comunicarse con el panel lateral.");
        }
    };

    // Bulk save selected activities to Supabase
    const handleSaveExtracted = async () => {
        const selected = extractedActivities.filter(a => a.selected);
        
        // FASE 8: Validación estricta antes de guardar
        if (selected.length === 0) {
            setErrorMsg('Selecciona al menos una actividad.');
            return;
        }
        if (!targetCursoId) {
            setErrorMsg('Selecciona un curso antes de guardar.');
            return;
        }
        if (!targetPeriodo) {
            setErrorMsg('Selecciona un período antes de guardar.');
            return;
        }

        const currentUserId = session?.user?.id;
        if (!currentUserId) {
            setErrorMsg('Sesión de usuario no válida.');
            return;
        }

        const cursoDocente = state.cursoDocentes.find(
            cd => cd.cursoId === targetCursoId && cd.userId === currentUserId
        );
        const docenteAsignatura = cursoDocente?.asignatura;

        if (!docenteAsignatura) {
            setErrorMsg('El docente no tiene una asignatura asignada para ese curso.');
            return;
        }

        if (isSaving) return;

        setIsSaving(true);
        setErrorMsg(null);
        let savedCount = 0;
        let skippedCount = 0;

        try {
            const curso = cursos.find(c => c.id === targetCursoId);
            
            for (const act of selected) {
                // Prevention of duplicates check (Fase 9)
                const isDuplicate = state.actividades.some(existing => 
                    existing.cursoId === targetCursoId && 
                    existing.nombre.trim().toLowerCase() === act.nombre.trim().toLowerCase() &&
                    existing.fecha === targetFecha &&
                    existing.asignatura === docenteAsignatura
                );

                if (isDuplicate) {
                    skippedCount++;
                    continue;
                }

                const result = await onAddActividad({
                    nombre: act.nombre,
                    fecha: targetFecha,
                    cursoId: targetCursoId,
                    periodo: targetPeriodo,
                    bcAsignados: act.competencias,
                    sharedCourseId: curso?.sharedCourseId,
                    indicador: act.indicador_logro,
                    producto: act.producto || undefined,
                    descripcion: act.descripcion || null,
                    userId: currentUserId,
                    asignatura: docenteAsignatura
                });

                if (result) {
                    savedCount++;
                }
            }

            if (savedCount > 0 || skippedCount > 0) {
                let msg = `${savedCount} actividades programadas con éxito.`;
                if (skippedCount > 0) {
                    msg += ` Se omitieron ${skippedCount} duplicadas.`;
                }
                alert(msg);
                onSuccess();
                handleClose();
            }
        } catch (error) {
            console.error('Error saving activities:', error);
            setErrorMsg('No se pudieron guardar las actividades en el servidor. Inténtalo de nuevo.');
        } finally {
            setIsSaving(false);
        }
    };

    // Inline edit updates
    const updateActivityField = (index: number, field: keyof ExtractedActivity, value: any) => {
        const updated = [...extractedActivities];
        updated[index] = { ...updated[index], [field]: value };
        setExtractedActivities(updated);
    };

    const handleSelectAll = (checked: boolean) => {
        setExtractedActivities(prev => prev.map(act => ({ ...act, selected: checked })));
    };

    // Footer configuration based on flow mode
    const getModalFooter = () => {
        if (showApiKeyPrompt) {
            return (
                <div className="flex gap-3 w-full">
                    <button 
                        type="button"
                        className="h-11 px-6 rounded-full text-xs font-black uppercase tracking-wider bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 hover:border-slate-400 transition-all active:scale-95 cursor-pointer" 
                        onClick={() => { setShowApiKeyPrompt(false); setTempApiKey(''); }}
                    >
                        Cancelar
                    </button>
                    <button 
                        type="button"
                        className="flex-1 h-11 rounded-full text-xs font-black uppercase tracking-wider bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 transition-all active:scale-95 cursor-pointer" 
                        onClick={() => {
                            if (session?.user?.id) saveAIAIProvider(session.user.id, 'deepseek');
                            setShowApiKeyPrompt(false);
                            handleProcessText();
                        }}
                    >
                        Usar Asistente CIELO
                    </button>
                    <button 
                        type="button"
                        className={`flex-1 h-11 rounded-full text-xs font-black uppercase tracking-wider bg-[#689C63] text-white shadow-md shadow-[#689C63]/25 hover:bg-[#5a8a55] transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer ${!tempApiKey.trim() ? 'opacity-50 cursor-not-allowed' : ''}`} 
                        onClick={handleSaveApiKey}
                        disabled={!tempApiKey.trim()}
                    >
                        Guardar API Key
                    </button>
                </div>
            );
        }

        if (flowMode === 'choice') {
            return (
                <button 
                    type="button"
                    className="w-full sm:w-auto px-8 h-11 rounded-full text-xs font-black uppercase tracking-wider bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 hover:border-slate-400 transition-all active:scale-95 cursor-pointer ml-auto" 
                    onClick={handleClose}
                >
                    Cerrar
                </button>
            );
        }

        if (flowMode === 'manual') {
            const isManualReady = form.nombre.trim() && form.cursoId && form.bcs.length > 0 && form.indicador.trim() && !isSaving;
            return (
                <div className="flex items-center justify-between gap-4 w-full">
                    <button 
                        type="button"
                        className="px-6 h-11 rounded-full text-xs font-black uppercase tracking-wider bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 hover:border-slate-400 transition-all active:scale-95 cursor-pointer" 
                        onClick={() => setFlowMode('choice')}
                        disabled={isSaving}
                    >
                        Volver
                    </button>
                    <button 
                        type="button"
                        className={`px-8 h-11 rounded-full text-xs font-black uppercase tracking-wider bg-[#689C63] text-white shadow-md shadow-[#689C63]/25 hover:bg-[#5a8a55] transition-all active:scale-95 flex items-center justify-center gap-2.5 cursor-pointer ${
                            !isManualReady ? 'opacity-50 cursor-not-allowed' : ''
                        }`} 
                        onClick={handleCreateManual}
                        disabled={!isManualReady}
                    >
                        {isSaving ? (
                            <>
                                <Loader2 size={16} className="animate-spin" />
                                <span>Guardando…</span>
                            </>
                        ) : (
                            <>
                                <span>Programar Actividad</span>
                                <TC_Flux size={15} />
                            </>
                        )}
                    </button>
                </div>
            );
        }

        if (flowMode === 'text') {
            const isMissingContext = !pastedText.trim() || !targetCursoId || !targetPeriodo;
            return (
                <div className="flex items-center justify-between gap-3 w-full flex-wrap sm:flex-nowrap">
                    <button 
                        type="button"
                        className="px-6 h-11 rounded-full text-xs font-black uppercase tracking-wider bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 hover:border-slate-400 transition-all active:scale-95 cursor-pointer" 
                        onClick={() => setFlowMode('choice')}
                        disabled={isProcessing}
                    >
                        Volver
                    </button>
                    <div className="flex items-center gap-3 w-full sm:w-auto">
                        <button 
                            type="button"
                            className="flex-1 sm:flex-none px-5 h-11 rounded-full text-xs font-black uppercase tracking-wider bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 hover:border-slate-400 transition-all active:scale-95 cursor-pointer" 
                            onClick={handleCopyPrompt}
                        >
                            {isPromptCopied ? 'Prompt copiado' : 'Copiar prompt'}
                        </button>
                        <button 
                            type="button"
                            className={`flex-1 sm:flex-none px-6 h-11 rounded-full text-xs font-black uppercase tracking-wider bg-[#FAF7F2] border border-slate-300 text-[#2E3330] hover:bg-[#EAE4DA] transition-all active:scale-95 cursor-pointer ${isMissingContext ? 'opacity-50 cursor-not-allowed' : ''}`}
                            onClick={handlePasteJson}
                            disabled={isMissingContext}
                        >
                            Pegar JSON
                        </button>
                    </div>
                </div>
            );
        }

        // Preview mode footer
        const selectedCount = extractedActivities.filter(a => a.selected).length;
        return (
            <div className="flex items-center justify-between gap-4 w-full">
                <button 
                    type="button"
                    className="px-6 h-11 rounded-full text-xs font-black uppercase tracking-wider bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 hover:border-slate-400 transition-all active:scale-95 cursor-pointer" 
                    onClick={() => setFlowMode('text')}
                    disabled={isSaving}
                >
                    Volver
                </button>
                <button 
                    type="button"
                    data-guide="btn-guardar-actividades-ia"
                    className={`px-8 h-11 rounded-full text-xs font-black uppercase tracking-wider bg-[#689C63] text-white shadow-md shadow-[#689C63]/25 hover:bg-[#5a8a55] transition-all active:scale-95 flex items-center justify-center gap-2.5 cursor-pointer ${selectedCount === 0 || isSaving || !targetCursoId || !targetPeriodo ? 'opacity-50 cursor-not-allowed' : ''}`} 
                    onClick={handleSaveExtracted}
                    disabled={selectedCount === 0 || isSaving || !targetCursoId || !targetPeriodo}
                >
                    {isSaving ? (
                        <>
                            <Loader2 size={16} className="animate-spin" />
                            <span>Guardando…</span>
                        </>
                    ) : (
                        <>
                            <span>Guardar ({selectedCount}) Actividades</span>
                            <TC_Echo size={15} />
                        </>
                    )}
                </button>
            </div>
        );
    };

    return (
        <CieloModal
            isOpen={show}
            onClose={handleClose}
            title={
                showApiKeyPrompt 
                    ? 'Configurar API Key' 
                    : flowMode === 'choice' 
                        ? 'Nueva Actividad' 
                        : flowMode === 'manual' 
                            ? 'Programar Actividad' 
                            : flowMode === 'text'
                                ? 'Importar desde Planificación'
                                : 'Actividades Detectadas'
            }
            subtitle={
                flowMode === 'manual'
                    ? 'Completa los datos y selecciona los elementos curriculares a evaluar'
                    : flowMode === 'choice'
                        ? 'Elige cómo deseas crear tu actividad'
                        : undefined
            }
            maxWidth={
                flowMode === 'preview' 
                    ? '7xl' 
                    : flowMode === 'manual' 
                        ? '5xl' 
                        : flowMode === 'text' 
                            ? '3xl' 
                            : '2xl'
            }
            icon={<TC_Flux size={20} className="text-[#689C63]" />}
            footer={getModalFooter()}
        >
            {showApiKeyPrompt ? (
                <div className="py-4 space-y-6">
                    <div className="text-center space-y-2">
                        <h3 className="text-sm font-bold text-slate-900">Necesitamos tu API Key de {providerDisplayName(getAIAIProvider(session?.user?.id))}</h3>
                        <p className="text-xs text-slate-600 leading-relaxed font-medium">
                            La clave será utilizada para analizar el texto de las actividades y extraer los elementos pedagógicos de forma automática.
                        </p>
                    </div>

                    <div className="flex justify-center">
                        <a 
                            href={getAIAIProvider(session?.user?.id) === 'openai' ? 'https://platform.openai.com/api-keys' : 'https://aistudio.google.com/app/api-keys?project=gen-lang-client-0626735374'}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs font-bold text-[#689C63] hover:underline flex items-center gap-1.5"
                        >
                            {getAIAIProvider(session?.user?.id) === 'openai' ? 'Obtener API Key de OpenAI ↗' : 'Obtener API Key de Google AI Studio ↗'}
                        </a>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">API Key</label>
                        <div className="search-container h-12! rounded-xl!">
                            <input 
                                type="password"
                                className="text-base font-medium w-full bg-transparent outline-none text-[#1E2421]" 
                                placeholder={`Ingresa tu clave de ${providerDisplayName(getAIAIProvider(session?.user?.id))}...`} 
                                value={tempApiKey}
                                onChange={e => setTempApiKey(e.target.value)} 
                            />
                        </div>
                    </div>
                </div>
            ) : (
                <>
                    {/* Modo 1: Selección inicial de método */}
                    {flowMode === 'choice' && (
                        <div className="py-5 space-y-6">
                            <div className="text-center max-w-lg mx-auto space-y-1.5">
                                <h3 className="text-base sm:text-lg font-extrabold text-[#2E3330]">
                                    ¿Cómo deseas crear tu actividad?
                                </h3>
                                <p className="text-xs sm:text-sm text-slate-600 font-medium">
                                    Elige el método que mejor se adapte a tu planificación.
                                </p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 max-w-2xl mx-auto">
                                <button
                                    type="button"
                                    onClick={() => setFlowMode('manual')}
                                    className="p-6 rounded-2xl border-2 border-slate-200/90 hover:border-[#689C63] hover:bg-[#FAF7F2] transition-all flex flex-col items-center text-center group cursor-pointer shadow-xs"
                                >
                                    <div className="w-14 h-14 rounded-2xl bg-[#FAF7F2] border border-slate-200 flex items-center justify-center mb-4 text-[#2E3330] group-hover:bg-[#689C63] group-hover:text-white group-hover:border-[#689C63] transition-all">
                                        <TC_Genesis size={26} />
                                    </div>
                                    <h4 className="text-sm font-black text-[#2E3330] mb-1.5 uppercase tracking-wide">
                                        Creación Manual
                                    </h4>
                                    <p className="text-xs text-slate-600 font-medium leading-relaxed">
                                        Define el curso, fecha, competencias y selecciona los contenidos e indicadores curriculares.
                                    </p>
                                </button>

                                <button
                                    type="button"
                                    data-guide="opcion-importar-ia"
                                    onClick={() => setFlowMode('text')}
                                    className="p-6 rounded-2xl border-2 border-slate-200/90 hover:border-[#689C63] hover:bg-[#FAF7F2] transition-all flex flex-col items-center text-center group cursor-pointer shadow-xs"
                                >
                                    <div className="w-14 h-14 rounded-2xl bg-[#FAF7F2] border border-slate-200 flex items-center justify-center mb-4 text-[#2E3330] group-hover:bg-[#689C63] group-hover:text-white group-hover:border-[#689C63] transition-all">
                                        <TC_Archive size={26} />
                                    </div>
                                    <h4 className="text-sm font-black text-[#2E3330] mb-1.5 uppercase tracking-wide">
                                        Importar Planificación
                                    </h4>
                                    <p className="text-xs text-slate-600 font-medium leading-relaxed">
                                        Pega el texto de tu secuencia didáctica para extraer automáticamente las actividades con IA.
                                    </p>
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Modo 2: Creación manual amplia (Distribuida en 2 columnas en escritorio) */}
                    {flowMode === 'manual' && (() => {
                        const currentCurso = cursos.find(c => c.id === form.cursoId);
                        const currentCd = state.cursoDocentes.find(cd => cd.cursoId === form.cursoId && cd.userId === session?.user?.id);
                        const currentAsignatura = currentCd?.asignatura || currentCurso?.asignatura;

                        return (
                            <div className="space-y-6 py-2">
                                {errorMsg && (
                                    <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 text-xs sm:text-sm font-bold rounded-xl flex items-center gap-2.5">
                                        <AlertCircle size={17} className="text-rose-600 shrink-0" />
                                        <span>{errorMsg}</span>
                                    </div>
                                )}

                                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                                    {/* Columna Izquierda: Información básica y Competencias (5 de 12 columnas) */}
                                    <div className="lg:col-span-5 space-y-5">
                                        {/* Bloque 1: Datos de la actividad */}
                                        <div className="bg-[#FAF7F2]/70 border border-slate-300/80 rounded-2xl p-4.5 space-y-4">
                                            <div className="border-b border-slate-200 pb-2.5">
                                                <span className="text-[11px] font-black uppercase tracking-wider text-slate-600 block">
                                                    Paso 1
                                                </span>
                                                <h3 className="text-sm font-extrabold text-[#2E3330]">
                                                    Información de la actividad
                                                </h3>
                                            </div>

                                            {/* Curso destino */}
                                            <div className="space-y-1.5">
                                                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                                                    Curso destino *
                                                </label>
                                                <div className="relative">
                                                    <select 
                                                        className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm bg-white text-[#1E2421] outline-none focus:border-[#689C63] focus:ring-4 focus:ring-[#689C63]/10 font-bold appearance-none transition-all cursor-pointer pr-9"
                                                        value={form.cursoId} 
                                                        onChange={e => setForm(p => ({ ...p, cursoId: Number(e.target.value) }))}
                                                    >
                                                        <option value={0} disabled>Selecciona el curso…</option>
                                                        {cursos.map(c => (
                                                            <option key={c.id} value={c.id}>
                                                                {c.grado} {c.seccion} — {c.nombre}
                                                            </option>
                                                        ))}
                                                    </select>
                                                    <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                                                        <TC_Flux size={14} className="rotate-90" />
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Nombre de la actividad */}
                                            <div className="space-y-1.5">
                                                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                                                    Nombre de la actividad *
                                                </label>
                                                <input 
                                                    type="text"
                                                    className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm bg-white text-[#1E2421] placeholder:text-slate-500 outline-none focus:border-[#689C63] focus:ring-4 focus:ring-[#689C63]/10 font-semibold transition-all"
                                                    placeholder="Ej: Análisis Crítico de Textos" 
                                                    value={form.nombre} 
                                                    onChange={e => setForm(p => ({ ...p, nombre: e.target.value }))} 
                                                />
                                            </div>

                                            {/* Fecha programada */}
                                            <div className="space-y-1.5">
                                                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                                                    Fecha programada *
                                                </label>
                                                <input 
                                                    type="date" 
                                                    className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm bg-white text-[#1E2421] outline-none focus:border-[#689C63] focus:ring-4 focus:ring-[#689C63]/10 font-semibold transition-all"
                                                    value={form.fecha} 
                                                    onChange={e => setForm(p => ({ ...p, fecha: e.target.value }))} 
                                                />
                                            </div>
                                        </div>

                                        {/* Bloque 2: Competencias a evaluar */}
                                        <div className="bg-[#FAF7F2]/70 border border-slate-300/80 rounded-2xl p-4.5 space-y-3">
                                            <div className="border-b border-slate-200 pb-2.5 flex items-center justify-between">
                                                <div>
                                                    <span className="text-[11px] font-black uppercase tracking-wider text-slate-600 block">
                                                        Paso 2
                                                    </span>
                                                    <h3 className="text-sm font-extrabold text-[#2E3330]">
                                                        Competencias a evaluar *
                                                    </h3>
                                                </div>
                                                <span className="text-[11px] font-bold text-slate-700 bg-white border border-slate-300 px-2.5 py-0.5 rounded-md">
                                                    {form.bcs.length} seleccionada{form.bcs.length !== 1 ? 's' : ''}
                                                </span>
                                            </div>

                                            <div className="grid grid-cols-1 gap-2.5">
                                                {BC_CIRCLE_CONFIG.map(({ id, label, icon: Icon, bg, selectedBg, selectedText }) => {
                                                    const isSelected = form.bcs.includes(id);
                                                    return (
                                                        <button
                                                            key={id}
                                                            type="button"
                                                            onClick={() => {
                                                                setForm(p => ({
                                                                    ...p,
                                                                    bcs: isSelected
                                                                        ? p.bcs.filter(x => x !== id)
                                                                        : [...p.bcs, id]
                                                                }));
                                                            }}
                                                            className={`w-full p-2.5 rounded-xl border text-left flex items-center gap-3 transition-all cursor-pointer ${
                                                                isSelected
                                                                    ? 'bg-white border-[#689C63] shadow-xs ring-2 ring-[#689C63]/40'
                                                                    : 'bg-white/80 border-slate-200 hover:border-slate-300 hover:bg-white'
                                                            }`}
                                                        >
                                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                                                                isSelected ? `${selectedBg} ${selectedText}` : `${bg} text-slate-700`
                                                            }`}>
                                                                <Icon size={16} strokeWidth={2.4} />
                                                            </div>

                                                            <div className="flex-1 min-w-0">
                                                                <div className="flex items-center gap-1.5">
                                                                    <span className="text-[11px] font-black uppercase tracking-wider text-slate-800">
                                                                        {id}
                                                                    </span>
                                                                    {isSelected && (
                                                                        <span className="text-[10px] font-bold text-[#689C63] flex items-center gap-1">
                                                                            <Check size={12} strokeWidth={3} />
                                                                            Activa
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                <p className="text-xs font-bold text-[#2E3330] leading-snug truncate">
                                                                    {label}
                                                                </p>
                                                            </div>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Columna Derecha: Currículo e Indicadores (7 de 12 columnas) */}
                                    <div className="lg:col-span-7 bg-[#FAF7F2]/70 border border-slate-300/80 rounded-2xl p-4.5 space-y-4">
                                        <div className="border-b border-slate-200 pb-2.5 flex items-center justify-between">
                                            <div>
                                                <span className="text-[11px] font-black uppercase tracking-wider text-slate-600 block">
                                                    Paso 3
                                                </span>
                                                <h3 className="text-sm font-extrabold text-[#2E3330]">
                                                    Contenido e Indicador curricular
                                                </h3>
                                            </div>
                                            {currentCurso && (
                                                <span className="text-xs font-bold text-slate-700 bg-white border border-slate-300 px-2.5 py-1 rounded-lg">
                                                    {currentCurso.grado} · {currentAsignatura || currentCurso.asignatura}
                                                </span>
                                            )}
                                        </div>

                                        {!form.cursoId ? (
                                            <div className="p-8 text-center bg-white rounded-xl border border-dashed border-slate-300 space-y-2">
                                                <BookOpen size={26} className="mx-auto text-slate-400" />
                                                <p className="text-xs sm:text-sm font-bold text-slate-700">
                                                    Selecciona primero un curso destino
                                                </p>
                                                <p className="text-xs text-slate-600 font-medium">
                                                    Podrás explorar sus contenidos curriculares y seleccionar el indicador de logro.
                                                </p>
                                            </div>
                                        ) : (
                                            <SelectorIndicadorFragmento
                                                grado={currentCurso?.grado}
                                                asignatura={currentAsignatura}
                                                cursoId={form.cursoId ? Number(form.cursoId) : undefined}
                                                periodo={useAppStore.getState().selectedPeriodo || currentCurso?.periodo || 'P2'}
                                                initialIndicador={form.indicador}
                                                onChange={(data) => {
                                                    setForm(p => ({
                                                        ...p,
                                                        indicador: data.indicadorTexto,
                                                        bcs: data.bcSugerido ? [data.bcSugerido] : p.bcs
                                                    }));
                                                    setIndicadoresJson(data.indicadoresJson);
                                                }}
                                                disabled={isSaving}
                                            />
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })()}

                    {/* Modo 3: Importar texto con IA */}
                    {flowMode === 'text' && (
                        <div className="space-y-5 py-3">
                            {errorMsg && (
                                <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 text-xs sm:text-sm font-bold rounded-xl flex items-center gap-2.5">
                                    <AlertCircle size={16} className="text-rose-600 shrink-0" />
                                    <span>{errorMsg}</span>
                                </div>
                            )}

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                                        Curso destino *
                                    </label>
                                    <div className="relative">
                                        <select 
                                            data-guide="sel-curso-ia"
                                            className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm bg-white text-[#1E2421] outline-none focus:border-[#689C63] focus:ring-4 focus:ring-[#689C63]/10 font-bold appearance-none transition-all cursor-pointer pr-9"
                                            value={targetCursoId || 0} 
                                            onChange={e => setTargetCursoId(Number(e.target.value))}
                                        >
                                            <option value={0} disabled>Selecciona el curso…</option>
                                            {cursos.map(c => (
                                                <option key={c.id} value={c.id}>
                                                    {c.grado} {c.seccion} — {c.nombre}
                                                </option>
                                            ))}
                                        </select>
                                        <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                                            <TC_Flux size={14} className="rotate-90" />
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                                        Período *
                                    </label>
                                    <div className="relative">
                                        <select 
                                            data-guide="sel-periodo-ia"
                                            className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm bg-white text-[#1E2421] outline-none focus:border-[#689C63] focus:ring-4 focus:ring-[#689C63]/10 font-bold appearance-none transition-all cursor-pointer pr-9"
                                            value={targetPeriodo} 
                                            onChange={e => setTargetPeriodo(e.target.value)}
                                        >
                                            <option value="" disabled>Selecciona el período…</option>
                                            {['P1', 'P2', 'P3', 'P4'].map(p => (
                                                <option key={p} value={p}>{p}</option>
                                            ))}
                                        </select>
                                        <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                                            <TC_Flux size={14} className="rotate-90" />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                                    Texto de la secuencia o planificación *
                                </label>
                                <textarea
                                    data-guide="texto-actividad"
                                    className="w-full border border-slate-300 rounded-xl px-4 py-3 text-xs sm:text-sm text-[#1E2421] placeholder:text-slate-500 bg-white outline-none focus:border-[#689C63] focus:ring-4 focus:ring-[#689C63]/10 font-medium transition-all resize-y leading-relaxed min-h-40"
                                    rows={8}
                                    placeholder="Pega aquí el texto copiado de la planificación o PDF..."
                                    value={pastedText}
                                    onChange={e => setPastedText(e.target.value)}
                                    disabled={isProcessing}
                                />
                                <p className="text-xs text-slate-600 font-medium leading-relaxed">
                                    CIELO analizará el texto para extraer automáticamente las actividades y sus competencias asociadas.
                                </p>
                            </div>

                            {isProcessing && (
                                <div className="flex flex-col items-center justify-center space-y-2.5 py-6">
                                    <div className="w-8 h-8 border-3 border-[#689C63] border-t-transparent rounded-full animate-spin" />
                                    <p className="text-xs font-bold text-slate-700 uppercase tracking-wider animate-pulse">
                                        Analizando texto con IA…
                                    </p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Modo 4: Vista previa de actividades detectadas */}
                    {flowMode === 'preview' && (
                        <div className="space-y-5 py-2">
                            {errorMsg && (
                                <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 text-xs sm:text-sm font-bold rounded-xl flex items-center gap-2.5">
                                    <AlertCircle size={16} className="text-rose-600 shrink-0" />
                                    <span>{errorMsg}</span>
                                </div>
                            )}

                            <div className="flex items-center justify-between bg-emerald-50 text-emerald-900 p-4 rounded-xl border border-emerald-300">
                                <p className="text-xs sm:text-sm font-bold uppercase tracking-wider">
                                    Se detectaron {extractedActivities.length} actividades
                                </p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-[#FAF7F2] p-4 rounded-2xl border border-slate-300">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold uppercase tracking-wider text-slate-700">Curso Destino *</label>
                                    <select 
                                        className="w-full border border-slate-300 rounded-xl px-3.5 py-2 text-xs sm:text-sm bg-slate-100 text-[#1E2421] outline-none font-bold cursor-not-allowed"
                                        value={targetCursoId || ''} 
                                        disabled
                                    >
                                        <option value="" disabled>Seleccionar...</option>
                                        {cursos.map(c => <option key={c.id} value={c.id}>{c.grado} {c.seccion} - {c.nombre}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold uppercase tracking-wider text-slate-700">Período *</label>
                                    <select 
                                        className="w-full border border-slate-300 rounded-xl px-3.5 py-2 text-xs sm:text-sm bg-slate-100 text-[#1E2421] outline-none font-bold cursor-not-allowed"
                                        value={targetPeriodo} 
                                        disabled
                                    >
                                        <option value="" disabled>Seleccionar...</option>
                                        {['P1', 'P2', 'P3', 'P4'].map(p => <option key={p} value={p}>{p}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold uppercase tracking-wider text-slate-700">Fecha Programada</label>
                                    <input 
                                        type="date" 
                                        className="w-full border border-slate-300 rounded-xl px-3.5 py-2 text-xs sm:text-sm bg-white text-[#1E2421] outline-none focus:border-[#689C63] font-bold"
                                        value={targetFecha} 
                                        onChange={e => setTargetFecha(e.target.value)} 
                                    />
                                </div>
                            </div>

                            {fallbackNotice && (
                                <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 text-xs font-medium">
                                    <Sparkles size={15} className="text-amber-700 shrink-0" />
                                    <span>Actividades generadas con el asistente de respaldo</span>
                                </div>
                            )}

                            <div className="overflow-x-auto border border-slate-300 rounded-2xl shadow-xs">
                                <table className="w-full text-left border-collapse bg-white">
                                    <thead>
                                        <tr className="bg-slate-100 border-b border-slate-300 text-xs font-black uppercase tracking-wider text-slate-700">
                                            <th className="p-3.5 w-12 text-center">
                                                <input 
                                                    type="checkbox" 
                                                    className="w-4 h-4 rounded border-slate-400 cursor-pointer accent-[#689C63]"
                                                    checked={extractedActivities.length > 0 && extractedActivities.every(a => a.selected)}
                                                    onChange={e => handleSelectAll(e.target.checked)}
                                                />
                                            </th>
                                            <th className="p-3.5 min-w-56">Actividad</th>
                                            <th className="p-3.5 min-w-64">Descripción</th>
                                            <th className="p-3.5 min-w-64">Competencias</th>
                                            <th className="p-3.5 min-w-72">Indicador de logro</th>
                                            <th className="p-3.5 min-w-72">Producto</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-200 text-xs sm:text-sm">
                                        {extractedActivities.map((act, idx) => (
                                            <tr key={idx} className={`hover:bg-slate-50/80 transition-colors ${act.selected ? 'bg-[#689C63]/5' : ''}`}>
                                                <td className="p-3.5 text-center">
                                                    <input 
                                                        type="checkbox" 
                                                        data-guide="celda-actividad-ia"
                                                        className="w-4 h-4 rounded border-slate-400 cursor-pointer accent-[#689C63]"
                                                        checked={act.selected}
                                                        onChange={e => updateActivityField(idx, 'selected', e.target.checked)}
                                                    />
                                                </td>
                                                <td className="p-3.5">
                                                    <input 
                                                        type="text" 
                                                        className="w-full bg-transparent border-b border-transparent hover:border-slate-300 focus:border-[#689C63] py-1 font-bold text-slate-800 outline-none transition-colors"
                                                        value={act.nombre}
                                                        onChange={e => updateActivityField(idx, 'nombre', e.target.value)}
                                                    />
                                                </td>
                                                <td className="p-3.5">
                                                    <div className="relative group">
                                                        <textarea
                                                            rows={2}
                                                            className="w-full bg-transparent border-b border-transparent hover:border-slate-300 focus:border-[#689C63] py-1 font-medium text-slate-700 outline-none transition-colors resize-none leading-relaxed scrollbar-hide line-clamp-2"
                                                            value={act.descripcion || ''}
                                                            placeholder="No especificada"
                                                            onChange={e => updateActivityField(idx, 'descripcion', e.target.value)}
                                                            title={act.descripcion || ''}
                                                        />
                                                    </div>
                                                </td>
                                                <td className="p-3.5">
                                                    <div className="flex flex-col gap-1.5">
                                                        {act.competencias.length > 0 ? (
                                                            act.competencias.map(bc => {
                                                                const bcNames: Record<string, string> = {
                                                                    'BC1': 'Comunicativa',
                                                                    'BC2': 'Pensamiento Lógico, Creativo y Crítico; y Resolución de Problemas',
                                                                    'BC3': 'Científica y Tecnológica; y Ambiental y de la Salud',
                                                                    'BC4': 'Ética y Ciudadana; y Desarrollo Personal y Espiritual'
                                                                };
                                                                return (
                                                                    <span
                                                                        key={bc}
                                                                        className="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border bg-white border-slate-300 text-slate-800"
                                                                    >
                                                                        {bcNames[bc] || bc}
                                                                    </span>
                                                                );
                                                            })
                                                        ) : (
                                                            <span className="text-xs text-slate-500 italic">No especificada</span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="p-3.5">
                                                    <textarea 
                                                        rows={3}
                                                        className="w-full bg-transparent border-b border-transparent hover:border-slate-300 focus:border-[#689C63] py-1 font-medium text-slate-700 outline-none transition-colors resize-none leading-relaxed scrollbar-hide"
                                                        value={act.indicador_logro}
                                                        placeholder="No especificado"
                                                        onChange={e => updateActivityField(idx, 'indicador_logro', e.target.value)}
                                                    />
                                                </td>
                                                <td className="p-3.5">
                                                    <textarea 
                                                        rows={3}
                                                        className="w-full bg-transparent border-b border-transparent hover:border-slate-300 focus:border-[#689C63] py-1 font-medium text-slate-700 outline-none transition-colors resize-none leading-relaxed scrollbar-hide"
                                                        value={act.producto}
                                                        placeholder="No especificado"
                                                        onChange={e => updateActivityField(idx, 'producto', e.target.value)}
                                                    />
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            {aiUsage && (
                                <div className="mt-4 p-3 bg-slate-50 rounded-xl text-xs text-slate-700 border border-slate-200 flex justify-between items-center font-medium">
                                    <span>Uso de IA este mes: <strong>{aiUsage.tokensEsteMes.toLocaleString()} tokens</strong></span>
                                    <span>Disponible: <strong>US${aiUsage.disponible.toFixed(2)}</strong></span>
                                </div>
                            )}
                        </div>
                    )}
                </>
            )}
        </CieloModal>
    );
}
