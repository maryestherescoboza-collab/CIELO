import { useState, useEffect } from 'react';
import { MessageSquareText, Brain, Puzzle, Microscope } from 'lucide-react';
import type { AppState, Actividad, BCKey } from '../../types';
import { COMPETENCIAS_LABEL } from '../../types';
import { TC_Flux, TC_Genesis, TC_Archive, TC_Echo } from '../icons/TerraCognitaIcons';
import { CieloModal } from '../ui/CieloModal';
import { useAppStore } from '../../store/appStore';
import { getAIAIProvider, isProviderConfigured, providerDisplayName, saveAIKey } from '../../lib/aiConfig';
import { callAI } from '../../lib/aiProvider';
import { calculateHash, cleanTechnicalText } from '../../lib/aiPreprocessor';
import { getCurrentMonthAIUsage, type AIUsageStats } from '../../lib/aiUsage';

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
}

interface ExtractedActivity {
    nombre: string;
    competencias: BCKey[];
    indicador_logro: string;
    producto: string;
    descripcion?: string;
    selected: boolean;
}

export function NewActivityModal({ show, onClose, onAddActividad, cursos, onSuccess }: NewActivityModalProps) {
    const session = useAppStore(s => s.session);
    const state = useAppStore(s => s.state);
    const today = new Date().toISOString().split('T')[0];
    const [flowMode, setFlowMode] = useState<'choice' | 'manual' | 'text' | 'preview'>('choice');
    
    // Manual flow states
    const [isSaving, setIsSaving] = useState(false);
    const [form, setForm] = useState({
        nombre: '',
        fecha: today,
        secuenciaId: '',
        bcs: ['BC1'] as BCKey[],
        cursoId: cursos[0]?.id ?? 0,
        indicador: ''
    });

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

    // Fetch AI Usage when modal opens
    useEffect(() => {
        if (show && session?.user?.id) {
            getCurrentMonthAIUsage(session.user.id).then(setAiUsage);
        }
    }, [show, session?.user?.id]);

    // Reset all states
    const handleClose = () => {
        setFlowMode('choice');
        setPastedText('');
        setErrorMsg(null);
        setIsProcessing(false);
        setShowApiKeyPrompt(false);
        setTempApiKey('');
        setExtractedActivities([]);
        setTargetCursoId(0);
        setTargetPeriodo('');
        setTargetFecha(today);
        setForm({
            nombre: '',
            fecha: today,
            secuenciaId: '',
            bcs: ['BC1'] as BCKey[],
            cursoId: cursos[0]?.id ?? 0,
            indicador: ''
        });
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
                periodo: curso?.periodo ?? 'P1',
                bcAsignados: form.bcs,
                secuenciaId: form.secuenciaId ? parseInt(form.secuenciaId) : undefined,
                sharedCourseId: curso?.sharedCourseId,
                userId: currentUserId,
                asignatura: docenteAsignatura,
                indicador: form.indicador || undefined
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
        saveAIKey(session.user.id, getAIAIProvider(session.user.id), tempApiKey);
        setShowApiKeyPrompt(false);
        setTempApiKey('');
        // handleProcessText(); // Deshabilitado temporalmente
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

    // @ts-expect-error unused temporalmente
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
                <div className="flex gap-4 w-full">
                    <button 
                        className="flex-1 h-10 rounded-full text-xs font-bold uppercase tracking-widest bg-white border border-slate-200 text-slate-500 hover:bg-slate-50 hover:border-slate-300 transition-all active:scale-95" 
                        onClick={() => { setShowApiKeyPrompt(false); setTempApiKey(''); }}
                    >
                        Cancelar
                    </button>
                    <button 
                        className={`flex-1 h-10 rounded-full text-xs font-bold uppercase tracking-widest bg-primary text-[#2E3330] shadow-md shadow-primary/20 hover:bg-primary/90 transition-all active:scale-95 flex items-center justify-center gap-2 ${!tempApiKey.trim() ? 'opacity-50 cursor-not-allowed' : ''}`} 
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
                    className="w-full h-10 rounded-full text-xs font-bold uppercase tracking-widest bg-white border border-slate-200 text-slate-500 hover:bg-slate-50 hover:border-slate-300 transition-all active:scale-95" 
                    onClick={handleClose}
                >
                    Cerrar
                </button>
            );
        }
        if (flowMode === 'manual') {
            return (
                <div className="flex gap-4 w-full">
                    <button className="flex-1 h-10 rounded-full text-xs font-bold uppercase tracking-widest bg-white border border-slate-200 text-slate-500 hover:bg-slate-50 hover:border-slate-300 transition-all active:scale-95" onClick={() => setFlowMode('choice')}>Volver</button>
                    <button 
                        className={`flex-1 h-10 rounded-full text-xs font-bold uppercase tracking-widest bg-primary text-[#2E3330] shadow-md shadow-primary/20 hover:bg-primary/90 transition-all active:scale-95 flex items-center justify-center gap-2 ${isSaving ? 'opacity-50 cursor-not-allowed' : ''}`} 
                        onClick={handleCreateManual}
                        disabled={isSaving}
                    >
                        {isSaving ? 'Guardando...' : (
                            <>
                                <span>Programar Actividad</span>
                                <TC_Flux size={14} />
                            </>
                        )}
                    </button>
                </div>
            );
        }
        if (flowMode === 'text') {
            const isMissingContext = !pastedText.trim() || !targetCursoId || !targetPeriodo;
            return (
                <div className="flex gap-4 w-full">
                    <button 
                        className="flex-1 h-10 rounded-full text-xs font-bold uppercase tracking-widest bg-white border border-slate-200 text-slate-500 hover:bg-slate-50 hover:border-slate-300 transition-all active:scale-95" 
                        onClick={() => setFlowMode('choice')}
                    >
                        Volver
                    </button>
                    <button 
                        className={`flex-1 h-10 rounded-full text-xs font-bold uppercase tracking-widest bg-white border border-slate-200 text-slate-500 hover:bg-slate-50 hover:border-slate-300 transition-all active:scale-95`}
                        onClick={handleCopyPrompt}
                    >
                        {isPromptCopied ? 'Prompt copiado' : 'Copiar prompt'}
                    </button>
                    <button 
                        className={`flex-1 h-10 rounded-full text-xs font-bold uppercase tracking-widest bg-[#EAE4DA] text-[#2E3330] shadow-sm hover:bg-[#EAE4DA]/80 transition-all active:scale-95 ${isMissingContext ? 'opacity-50 cursor-not-allowed' : ''}`}
                        onClick={handlePasteJson}
                        disabled={isMissingContext}
                    >
                        Pegar JSON
                    </button>
                </div>
            );
        }
        // Preview mode footer
        const selectedCount = extractedActivities.filter(a => a.selected).length;
        return (
            <div className="flex gap-4 w-full">
                <button 
                    className="flex-1 h-10 rounded-full text-xs font-bold uppercase tracking-widest bg-white border border-slate-200 text-slate-500 hover:bg-slate-50 hover:border-slate-300 transition-all active:scale-95" 
                    onClick={() => setFlowMode('text')}
                    disabled={isSaving}
                >
                    Volver
                </button>
                <button 
                    data-guide="btn-guardar-actividades-ia"
                    className={`flex-1 h-10 rounded-full text-xs font-bold uppercase tracking-widest bg-primary text-[#2E3330] shadow-md shadow-primary/20 hover:bg-primary/90 transition-all active:scale-95 flex items-center justify-center gap-2 ${selectedCount === 0 || isSaving || !targetCursoId || !targetPeriodo ? 'opacity-50 cursor-not-allowed' : ''}`} 
                    onClick={handleSaveExtracted}
                    disabled={selectedCount === 0 || isSaving || !targetCursoId || !targetPeriodo}
                >
                    {isSaving ? 'Guardando...' : (
                        <>
                            <span>Guardar ({selectedCount}) Actividades</span>
                            <TC_Echo size={14} />
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
                                ? 'Importar Actividades desde Secuencia'
                                : 'Actividades Detectadas en el Documento'
            }
            maxWidth={flowMode === 'preview' ? '7xl' : 'lg'}
            footer={getModalFooter()}
        >
            {showApiKeyPrompt ? (
                <div className="py-4 space-y-6">
                    <div className="text-center space-y-2">
                        <h3 className="text-sm font-bold text-slate-900">Necesitamos tu API Key de {providerDisplayName(getAIAIProvider(session?.user?.id))}</h3>
                        <p className="text-xs text-slate-500 leading-relaxed font-medium">
                            La clave será utilizada para analizar el texto de las actividades y extraer los elementos pedagógicos de forma automática.
                        </p>
                    </div>

                    <div className="flex justify-center">
                        <a 
                            href={getAIAIProvider(session?.user?.id) === 'openai' ? 'https://platform.openai.com/api-keys' : 'https://aistudio.google.com/app/api-keys?project=gen-lang-client-0626735374'}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs font-bold text-primary hover:underline flex items-center gap-1.5"
                        >
                            {getAIAIProvider(session?.user?.id) === 'openai' ? 'Obtener API Key de OpenAI ↗' : 'Obtener API Key de Google AI Studio ↗'}
                        </a>
                    </div>

                    <div className="space-y-2">
                        <label className="notion-label">API Key</label>
                        <div className="search-container h-12! rounded-xl!">
                            <input 
                                type="password"
                                className="text-base font-medium w-full bg-transparent outline-none" 
                                placeholder={`Ingresa tu clave de ${providerDisplayName(getAIAIProvider(session?.user?.id))}...`} 
                                value={tempApiKey}
                                onChange={e => setTempApiKey(e.target.value)} 
                            />
                        </div>
                    </div>
                </div>
            ) : (
                <>
                    {flowMode === 'choice' && (
                        <div className="py-6 space-y-6">
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest text-center">
                                Seleccione el método para crear su actividad
                            </p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <button
                                    onClick={() => setFlowMode('manual')}
                                    className="p-6 rounded-2xl border border-slate-200 hover:border-primary hover:bg-[#EAE4DA]/20 transition-all flex flex-col items-center text-center group"
                                >
                                    <div className="w-12 h-12 rounded-xl bg-[#EAE4DA] flex items-center justify-center mb-4 text-[#2E3330] group-hover:bg-primary transition-colors">
                                        <TC_Genesis size={24} />
                                    </div>
                                    <h3 className="text-sm font-bold text-slate-900 mb-2">Creación Manual</h3>
                                    <p className="text-xs text-slate-500 font-medium leading-relaxed">
                                        Complete los campos manualmente definiendo el nombre, fecha y competencias.
                                    </p>
                                </button>

                                <button
                                    data-guide="opcion-importar-ia"
                                    onClick={() => setFlowMode('text')}
                                    className="p-6 rounded-2xl border border-slate-200 hover:border-primary hover:bg-[#EAE4DA]/20 transition-all flex flex-col items-center text-center group"
                                >
                                    <div className="w-12 h-12 rounded-xl bg-[#EAE4DA] flex items-center justify-center mb-4 text-[#2E3330] group-hover:bg-primary transition-colors">
                                        <TC_Archive size={24} />
                                    </div>
                                    <h3 className="text-sm font-bold text-slate-900 mb-2">Importar una Secuencia o planificación</h3>
                                    <p className="text-xs text-slate-500 font-medium leading-relaxed">
                                        Pega el texto y la IA extrae lo necesario para crear las actividades que debes evaluar.
                                    </p>
                                </button>
                            </div>
                        </div>
                    )}

                    {flowMode === 'manual' && (
                        <div className="space-y-6">
                            <div className="space-y-2.5">
                                <label className="notion-label">Nombre de la actividad</label>
                                <div className="search-container h-12! rounded-xl!">
                                    <input className="text-base font-medium w-full bg-transparent outline-none" placeholder="Ej: Análisis Crítico de Textos" value={form.nombre} onChange={e => setForm(p => ({ ...p, nombre: e.target.value }))} />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-2.5">
                                    <label className="notion-label">Fecha programada</label>
                                    <input type="date" className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm bg-white outline-none focus:border-primary focus:ring-4 focus:ring-primary/5 font-medium transition-all"
                                        value={form.fecha} onChange={e => setForm(p => ({ ...p, fecha: e.target.value }))} />
                                </div>
                                <div className="space-y-2.5">
                                    <label className="notion-label">Curso destino</label>
                                    <div className="relative">
                                        <select className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm bg-white outline-none focus:border-primary focus:ring-4 focus:ring-primary/5 font-medium appearance-none transition-all cursor-pointer"
                                            value={form.cursoId} onChange={e => setForm(p => ({ ...p, cursoId: Number(e.target.value) }))}>
                                            <option value={0} disabled>Seleccione curso...</option>
                                            {cursos.map(c => <option key={c.id} value={c.id}>{c.grado} {c.seccion} - {c.nombre}</option>)}
                                        </select>
                                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                                            <TC_Flux size={14} className="rotate-90" />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <label className="notion-label">Competencias a evaluar</label>
                                <div className="flex items-center gap-3">
                                    {BC_CIRCLE_CONFIG.map(({ id, label, icon: Icon, bg, selectedBg, selectedText }) => {
                                        const isSelected = form.bcs.includes(id);
                                        return (
                                            <div key={id} className="relative group">
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setForm(p => ({
                                                            ...p,
                                                            bcs: isSelected
                                                                ? p.bcs.filter(x => x !== id)
                                                                : [...p.bcs, id]
                                                        }));
                                                    }}
                                                    className={`
                                                        w-12 h-12 rounded-full flex items-center justify-center transition-all cursor-pointer
                                                        ${isSelected
                                                            ? `${selectedBg} ${selectedText} shadow-md ring-2 ring-offset-1 ring-current/30`
                                                            : `${bg} text-slate-500 hover:shadow-md hover:scale-105`
                                                        }
                                                    `}
                                                >
                                                    <Icon size={20} strokeWidth={2.2} />
                                                </button>
                                                <div className="
                                                    absolute bottom-full left-1/2 -translate-x-1/2 mb-2.5
                                                    w-64 p-3 rounded-xl text-left
                                                    bg-slate-900 text-white shadow-2xl
                                                    opacity-0 invisible group-hover:opacity-100 group-hover:visible
                                                    transition-all duration-200 pointer-events-none z-9999
                                                ">
                                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{id}</span>
                                                    <p className="text-xs font-bold mt-0.5 leading-snug">{label}</p>
                                                    <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-[5px] border-r-[5px] border-t-[5px] border-l-transparent border-r-transparent border-t-slate-900"></div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                                {form.bcs.length > 0 && (
                                    <div className="mt-2">
                                        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">Indicador de logro *</label>
                                        <textarea
                                            className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm bg-white outline-none focus:border-primary focus:ring-4 focus:ring-primary/5 font-medium transition-all resize-none"
                                            rows={2}
                                            placeholder="Ej: El estudiante será capaz de aplicar técnicas de comprensión lectora para analizar textos argumentativos..."
                                            value={form.indicador}
                                            onChange={e => setForm(p => ({ ...p, indicador: e.target.value }))}
                                        />
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {flowMode === 'text' && (
                        <div className="space-y-6 py-4">
                            {errorMsg && (
                                <div className="p-4 bg-red-50 border border-red-200 text-red-700 text-xs font-bold uppercase tracking-wider rounded-xl">
                                    {errorMsg}
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-2.5">
                                    <label className="notion-label">Curso destino *</label>
                                    <div className="relative">
                                        <select 
                                            data-guide="sel-curso-ia"
                                            className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm bg-white outline-none focus:border-primary focus:ring-4 focus:ring-primary/5 font-medium appearance-none transition-all cursor-pointer"
                                            value={targetCursoId || 0} 
                                            onChange={e => setTargetCursoId(Number(e.target.value))}
                                        >
                                            <option value={0} disabled>Seleccione curso...</option>
                                            {cursos.map(c => <option key={c.id} value={c.id}>{c.grado} {c.seccion} - {c.nombre}</option>)}
                                        </select>
                                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                                            <TC_Flux size={14} className="rotate-90" />
                                        </div>
                                    </div>
                                </div>
                                <div className="space-y-2.5">
                                    <label className="notion-label">Período *</label>
                                    <div className="relative">
                                        <select 
                                            data-guide="sel-periodo-ia"
                                            className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm bg-white outline-none focus:border-primary focus:ring-4 focus:ring-primary/5 font-medium appearance-none transition-all cursor-pointer"
                                            value={targetPeriodo} 
                                            onChange={e => setTargetPeriodo(e.target.value)}
                                        >
                                            <option value="" disabled>Seleccione período...</option>
                                            {['P1', 'P2', 'P3', 'P4'].map(p => <option key={p} value={p}>{p}</option>)}
                                        </select>
                                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                                            <TC_Flux size={14} className="rotate-90" />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2.5">
                                <label className="notion-label">Texto de la secuencia</label>
                                <textarea
                                    data-guide="texto-actividad"
                                    className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm bg-white outline-none focus:border-primary focus:ring-4 focus:ring-primary/5 font-medium transition-all resize-y leading-relaxed min-h-40"
                                    rows={10}
                                    placeholder="Pega aquí el texto copiado del PDF..."
                                    value={pastedText}
                                    onChange={e => setPastedText(e.target.value)}
                                    disabled={isProcessing}
                                />
                                <p className="text-xs text-slate-400 font-medium leading-relaxed">
                                    Abre la secuencia, copia el texto y pégalo aquí. CIELO analizará el contenido para identificar los elementos de la actividad.
                                </p>
                            </div>

                            {isProcessing && (
                                <div className="flex flex-col items-center justify-center space-y-3 py-6">
                                    <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest animate-pulse">Analizando texto...</p>
                                </div>
                            )}
                        </div>
                    )}

                    {flowMode === 'preview' && (
                        <div className="space-y-6">
                            {errorMsg && (
                                <div className="p-4 bg-red-50 border border-red-200 text-red-700 text-xs font-bold uppercase tracking-wider rounded-xl">
                                    {errorMsg}
                                </div>
                            )}

                            <div className="flex items-center justify-between bg-emerald-50 text-emerald-800 p-4 rounded-xl border border-emerald-200/60">
                                <p className="text-xs font-bold uppercase tracking-widest">
                                    Se encontraron {extractedActivities.length} actividades
                                </p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200/60">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Curso Destino *</label>
                                    <select 
                                        className="w-full border border-slate-200 rounded-xl px-4 py-2 text-xs bg-slate-100 outline-none font-bold cursor-not-allowed"
                                        value={targetCursoId || ''} 
                                        disabled
                                    >
                                        <option value="" disabled>Seleccionar...</option>
                                        {cursos.map(c => <option key={c.id} value={c.id}>{c.grado} {c.seccion} - {c.nombre}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Período *</label>
                                    <select 
                                        className="w-full border border-slate-200 rounded-xl px-4 py-2 text-xs bg-slate-100 outline-none font-bold cursor-not-allowed"
                                        value={targetPeriodo} 
                                        disabled
                                    >
                                        <option value="" disabled>Seleccionar...</option>
                                        {['P1', 'P2', 'P3', 'P4'].map(p => <option key={p} value={p}>{p}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Fecha Programada</label>
                                    <input 
                                        type="date" 
                                        className="w-full border border-slate-200 rounded-xl px-4 py-2 text-xs bg-white outline-none focus:border-primary font-bold"
                                        value={targetFecha} 
                                        onChange={e => setTargetFecha(e.target.value)} 
                                    />
                                </div>
                            </div>

                            <div className="overflow-x-auto border border-slate-200 rounded-2xl shadow-sm">
                                <table className="w-full text-left border-collapse bg-white">
                                    <thead>
                                        <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-black uppercase tracking-wider text-slate-500">
                                            <th className="p-4 w-12 text-center">
                                                <input 
                                                    type="checkbox" 
                                                    className="w-4 h-4 rounded border-slate-350 cursor-pointer accent-primary"
                                                    checked={extractedActivities.length > 0 && extractedActivities.every(a => a.selected)}
                                                    onChange={e => handleSelectAll(e.target.checked)}
                                                />
                                            </th>
                                            <th className="p-4 min-w-56">Actividad</th>
                                            <th className="p-4 min-w-64">Descripción</th>
                                            <th className="p-4 min-w-64">Competencias</th>
                                            <th className="p-4 min-w-72">Indicador de logro</th>
                                            <th className="p-4 min-w-72">Producto</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 text-xs">
                                        {extractedActivities.map((act, idx) => (
                                            <tr key={idx} className={`hover:bg-slate-50/50 transition-colors ${act.selected ? 'bg-primary/5' : ''}`}>
                                                <td className="p-4 text-center">
                                                    <input 
                                                        type="checkbox"
                                                        data-guide="celda-actividad-ia"
                                                        className="w-4 h-4 rounded border-slate-350 cursor-pointer accent-primary"
                                                        checked={act.selected}
                                                        onChange={e => updateActivityField(idx, 'selected', e.target.checked)}
                                                    />
                                                </td>
                                                <td className="p-4">
                                                    <input 
                                                        type="text" 
                                                        className="w-full bg-transparent border-b border-transparent hover:border-slate-200 focus:border-primary py-1 font-bold text-slate-800 outline-none transition-colors"
                                                        value={act.nombre}
                                                        onChange={e => updateActivityField(idx, 'nombre', e.target.value)}
                                                    />
                                                </td>
                                                <td className="p-4">
                                                    <div className="relative group">
                                                        <textarea 
                                                            rows={2}
                                                            className="w-full bg-transparent border-b border-transparent hover:border-slate-200 focus:border-primary py-1 font-medium text-slate-500 outline-none transition-colors resize-none leading-relaxed scrollbar-hide line-clamp-2"
                                                            value={act.descripcion || ''}
                                                            placeholder="No especificada"
                                                            onChange={e => updateActivityField(idx, 'descripcion', e.target.value)}
                                                            title={act.descripcion || ''}
                                                        />
                                                    </div>
                                                </td>
                                                <td className="p-4">
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
                                                                        className="px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider border bg-primary/10 border-primary text-[#2E3330]"
                                                                    >
                                                                        {bcNames[bc] || bc}
                                                                    </span>
                                                                );
                                                            })
                                                        ) : (
                                                            <span className="text-xs text-slate-400 italic">No especificada</span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="p-4">
                                                    <textarea 
                                                        rows={3}
                                                        className="w-full bg-transparent border-b border-transparent hover:border-slate-200 focus:border-primary py-1 font-medium text-slate-500 outline-none transition-colors resize-none leading-relaxed scrollbar-hide"
                                                        value={act.indicador_logro}
                                                        placeholder="No especificado"
                                                        onChange={e => updateActivityField(idx, 'indicador_logro', e.target.value)}
                                                    />
                                                </td>
                                                <td className="p-4">
                                                    <textarea 
                                                        rows={3}
                                                        className="w-full bg-transparent border-b border-transparent hover:border-slate-200 focus:border-primary py-1 font-medium text-slate-500 outline-none transition-colors resize-none leading-relaxed scrollbar-hide"
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
                                <div className="mt-4 p-3 bg-gray-50 rounded-lg text-xs text-gray-500 border border-gray-100 flex justify-between items-center">
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
