import { useState, useEffect } from 'react';
import { MessageSquareText, Brain, Puzzle, Microscope, Sparkles, AlertCircle, Check, Loader2 } from 'lucide-react';
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
import { esAsignaturaOptativa, getAsignaturaNombre, sonMismaAsignatura } from '../../constants/asignaturas';

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
    const cursoDocentes = useAppStore(s => s.state.cursoDocentes);
    const actividades = useAppStore(s => s.state.actividades);
    const today = new Date().toISOString().split('T')[0];
    const [flowMode, setFlowMode] = useState<'choice' | 'manual' | 'text' | 'preview'>('choice');
    const [manualStep, setManualStep] = useState<1 | 2 | 3>(1);

    // Manual flow states
    const [isSaving, setIsSaving] = useState(false);
    const [form, setForm] = useState({
        nombre: '',
        fecha: initialDate || today,
        secuenciaId: '',
        bcs: ['BC1'] as BCKey[],
        cursoId: cursos[0]?.id ?? 0,
        asignatura: cursos[0]?.asignatura ?? '',
        indicador: '',
        descripcion: '',
        tipo: 'formativa',
        puntuacion: 100,
        producto: '',
    });

    const [indicadoresJson, setIndicadoresJson] = useState<any[]>([]);

    // IA flow (texto pegado) states
    const [pastedText, setPastedText] = useState('');
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [extractedActivities, setExtractedActivities] = useState<ExtractedActivity[]>([]);
    const [targetCursoId, setTargetCursoId] = useState<number>(0);
    const [targetAsignatura, setTargetAsignatura] = useState<string>('');
    const [targetPeriodo, setTargetPeriodo] = useState<string>('');
    const [targetFecha, setTargetFecha] = useState<string>(today);
    const [isPromptCopied, setIsPromptCopied] = useState(false);

    // API Key flow states
    const [showApiKeyPrompt, setShowApiKeyPrompt] = useState(false);
    const [tempApiKey, setTempApiKey] = useState('');

    // AI Usage state
    const [aiUsage, setAiUsage] = useState<AIUsageStats | null>(null);
    const [fallbackNotice, setFallbackNotice] = useState<string | null>(null);

    // Fetch AI Usage under demand when entering text/AI flow (lazy)
    useEffect(() => {
        if (show && flowMode === 'text' && session?.user?.id && !aiUsage) {
            getCurrentMonthAIUsage(session.user.id).then(setAiUsage);
        }
    }, [show, flowMode, session?.user?.id, aiUsage]);

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
        setManualStep(1);
        setPastedText('');
        setErrorMsg(null);
        setFallbackNotice(null);
        setIsProcessing(false);
        setShowApiKeyPrompt(false);
        setTempApiKey('');
        setExtractedActivities([]);
        setTargetCursoId(0);
        setTargetAsignatura('');
        setTargetPeriodo('');
        setTargetFecha(initialDate || today);
        setForm({
            nombre: '',
            fecha: initialDate || today,
            secuenciaId: '',
            bcs: ['BC1'] as BCKey[],
            cursoId: cursos[0]?.id ?? 0,
            asignatura: cursos[0]?.asignatura ?? '',
            indicador: '',
            descripcion: '',
            tipo: 'formativa',
            puntuacion: 100,
            producto: '',
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

        const cursoSeleccionado = cursos.find(
            c => c.id === form.cursoId && (!form.asignatura || sonMismaAsignatura(c.asignatura, form.asignatura))
        ) || cursos.find(c => c.id === form.cursoId);

        const cursoDocente = cursoDocentes.find(
            cd =>
                cd.cursoId === form.cursoId &&
                cd.userId === currentUserId &&
                (!form.asignatura || sonMismaAsignatura(cd.asignatura, form.asignatura))
        ) || cursoDocentes.find(
            cd => cd.cursoId === form.cursoId && cd.userId === currentUserId
        );
        const docenteAsignatura = form.asignatura || cursoDocente?.asignatura || cursoSeleccionado?.asignatura;

        if (!docenteAsignatura) {
            setErrorMsg('El docente no tiene una asignatura asignada para ese curso.');
            return;
        }

        setIsSaving(true);
        setErrorMsg(null);
        try {
            const curso = cursoSeleccionado;
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
                indicadores_json: indicadoresJson.length > 0 ? indicadoresJson : undefined,
                descripcion: form.descripcion.trim() || undefined,
                producto: form.producto.trim() || undefined,
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
            } catch (e) {
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

        const cursoDocente = cursoDocentes.find(
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

        const cursoSeleccionado = cursos.find(
            c => c.id === targetCursoId && (!targetAsignatura || sonMismaAsignatura(c.asignatura, targetAsignatura))
        ) || cursos.find(c => c.id === targetCursoId);

        const cursoDocente = cursoDocentes.find(
            cd =>
                cd.cursoId === targetCursoId &&
                cd.userId === currentUserId &&
                (!targetAsignatura || sonMismaAsignatura(cd.asignatura, targetAsignatura))
        ) || cursoDocentes.find(
            cd => cd.cursoId === targetCursoId && cd.userId === currentUserId
        );
        const docenteAsignatura = targetAsignatura || cursoDocente?.asignatura || cursoSeleccionado?.asignatura;

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
            const curso = cursoSeleccionado;
            const toSave: ExtractedActivity[] = [];
            const seenBatch = new Set<string>();

            for (const act of selected) {
                const actKey = `${act.nombre.trim().toLowerCase()}__${targetFecha}`;
                // Prevention of duplicates check (Fase 9)
                const isDuplicate = actividades.some(existing =>
                    existing.cursoId === targetCursoId &&
                    existing.nombre.trim().toLowerCase() === act.nombre.trim().toLowerCase() &&
                    existing.fecha === targetFecha &&
                    existing.asignatura === docenteAsignatura
                );

                if (isDuplicate || seenBatch.has(actKey)) {
                    skippedCount++;
                } else {
                    seenBatch.add(actKey);
                    toSave.push(act);
                }
            }

            if (toSave.length > 0) {
                const results = await Promise.all(
                    toSave.map(act => onAddActividad({
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
                    }))
                );
                savedCount = results.filter(Boolean).length;
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
            const isPaso1Valido = form.nombre.trim() && form.cursoId;
            const isPaso2Valido = form.bcs.length > 0 && form.indicador.trim();
            const isManualReady = isPaso1Valido && isPaso2Valido && !isSaving;

            return (
                <div className="flex items-center justify-between gap-4 w-full">
                    {manualStep > 1 ? (
                        <button
                            type="button"
                            className="px-6 h-11 rounded-full text-xs font-black uppercase tracking-wider bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 hover:border-slate-400 transition-all active:scale-95 cursor-pointer flex items-center gap-1.5"
                            onClick={() => setManualStep(s => (s - 1) as 1 | 2 | 3)}
                            disabled={isSaving}
                        >
                            Anterior
                        </button>
                    ) : (
                        <button
                            type="button"
                            className="px-6 h-11 rounded-full text-xs font-black uppercase tracking-wider bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 hover:border-slate-400 transition-all active:scale-95 cursor-pointer"
                            onClick={() => setFlowMode('choice')}
                            disabled={isSaving}
                        >
                            Volver
                        </button>
                    )}

                    <div className="flex items-center gap-2">
                        {manualStep < 3 ? (
                            <button
                                type="button"
                                className={`px-8 h-11 rounded-full text-xs font-black uppercase tracking-wider bg-[#689C63] text-white shadow-md shadow-[#689C63]/25 hover:bg-[#5a8a55] transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer ${(manualStep === 1 && !isPaso1Valido) || (manualStep === 2 && !isPaso2Valido)
                                    ? 'opacity-50 cursor-not-allowed'
                                    : ''
                                    }`}
                                onClick={() => {
                                    if (manualStep === 1 && !isPaso1Valido) {
                                        setErrorMsg('Por favor indica el curso y el nombre de la actividad.');
                                        return;
                                    }
                                    if (manualStep === 2 && !isPaso2Valido) {
                                        setErrorMsg('Por favor selecciona la competencia y el indicador de logro.');
                                        return;
                                    }
                                    setErrorMsg(null);
                                    setManualStep(s => (s + 1) as 1 | 2 | 3);
                                }}
                                disabled={(manualStep === 1 && !isPaso1Valido) || (manualStep === 2 && !isPaso2Valido)}
                            >
                                <span>Continuar</span>
                            </button>
                        ) : (
                            <button
                                type="button"
                                className={`px-8 h-11 rounded-full text-xs font-black uppercase tracking-wider bg-[#689C63] text-white shadow-md shadow-[#689C63]/25 hover:bg-[#5a8a55] transition-all active:scale-95 flex items-center justify-center gap-2.5 cursor-pointer ${!isManualReady ? 'opacity-50 cursor-not-allowed' : ''
                                    }`}
                                onClick={handleCreateManual}
                                disabled={!isManualReady}
                            >
                                {isSaving ? (
                                    <>
                                        <Loader2 size={16} className="animate-spin" />
                                        <span>Creando…</span>
                                    </>
                                ) : (
                                    <>
                                        <Check size={16} strokeWidth={3} />
                                        <span>Crear actividad</span>
                                    </>
                                )}
                            </button>
                        )}
                    </div>
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

                    {/* Modo 2: Creación manual en 3 pasos limpios, rápidos e intuitivos */}
                    {flowMode === 'manual' && (() => {
                        const currentCurso = cursos.find(
                            c => c.id === form.cursoId && (!form.asignatura || sonMismaAsignatura(c.asignatura, form.asignatura))
                        ) || cursos.find(c => c.id === form.cursoId);
                        const currentCd = cursoDocentes.find(
                            cd =>
                                cd.cursoId === form.cursoId &&
                                cd.userId === session?.user?.id &&
                                (!form.asignatura || sonMismaAsignatura(cd.asignatura, form.asignatura))
                        ) || cursoDocentes.find(cd => cd.cursoId === form.cursoId && cd.userId === session?.user?.id);
                        const currentAsignatura = form.asignatura || currentCd?.asignatura || currentCurso?.asignatura;
                        const selectedCourseComposite = form.cursoId
                            ? `${form.cursoId}::${currentAsignatura || ''}`
                            : '0::';

                        return (
                            <div className="space-y-4 py-2">
                                {/* Indicador de 3 pasos */}
                                <div className="w-full bg-slate-50 border border-slate-200/80 rounded-2xl p-2.5 sm:p-3 mb-2">
                                    <div className="flex items-center justify-between gap-1 max-w-xl mx-auto">
                                        <button
                                            type="button"
                                            onClick={() => setManualStep(1)}
                                            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${manualStep === 1
                                                ? 'bg-white text-[#2E3330] shadow-sm border border-slate-200 ring-2 ring-[#689C63]/30'
                                                : 'text-slate-500 hover:text-slate-800'
                                                }`}
                                        >
                                            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${manualStep === 1 ? 'bg-[#689C63] text-white' : manualStep > 1 ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
                                                }`}>
                                                {manualStep > 1 ? <Check size={11} strokeWidth={3} /> : '1'}
                                            </span>
                                            <span className="hidden sm:inline">1. Actividad</span>
                                        </button>

                                        <div className={`h-0.5 flex-1 mx-1.5 transition-all ${manualStep >= 2 ? 'bg-[#689C63]' : 'bg-slate-200'}`} />

                                        <button
                                            type="button"
                                            onClick={() => {
                                                if (form.nombre.trim() && form.cursoId) setManualStep(2);
                                            }}
                                            disabled={!form.nombre.trim() || !form.cursoId}
                                            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${manualStep === 2
                                                ? 'bg-white text-[#2E3330] shadow-sm border border-slate-200 ring-2 ring-[#689C63]/30'
                                                : 'text-slate-500 hover:text-slate-800'
                                                }`}
                                        >
                                            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${manualStep === 2 ? 'bg-[#689C63] text-white' : manualStep > 2 ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
                                                }`}>
                                                {manualStep > 2 ? <Check size={11} strokeWidth={3} /> : '2'}
                                            </span>
                                            <span className="hidden sm:inline">2. Evaluación</span>
                                        </button>

                                        <div className={`h-0.5 flex-1 mx-1.5 transition-all ${manualStep === 3 ? 'bg-[#689C63]' : 'bg-slate-200'}`} />

                                        <button
                                            type="button"
                                            onClick={() => {
                                                if (form.nombre.trim() && form.cursoId && form.bcs.length > 0 && form.indicador.trim()) setManualStep(3);
                                            }}
                                            disabled={!form.nombre.trim() || !form.cursoId || form.bcs.length === 0 || !form.indicador.trim()}
                                            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${manualStep === 3
                                                ? 'bg-white text-[#2E3330] shadow-sm border border-slate-200 ring-2 ring-[#689C63]/30'
                                                : 'text-slate-500 hover:text-slate-800'
                                                }`}
                                        >
                                            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${manualStep === 3 ? 'bg-[#689C63] text-white' : 'bg-slate-200 text-slate-600'
                                                }`}>
                                                3
                                            </span>
                                            <span className="hidden sm:inline">3. Confirmar</span>
                                        </button>
                                    </div>
                                </div>

                                {errorMsg && (
                                    <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 text-xs sm:text-sm font-bold rounded-xl flex items-center gap-2.5">
                                        <AlertCircle size={17} className="text-rose-600 shrink-0" />
                                        <span>{errorMsg}</span>
                                    </div>
                                )}

                                {/* PASO 1: INFORMACIÓN DE LA ACTIVIDAD */}
                                {manualStep === 1 && (
                                    <div className="space-y-4 max-w-2xl mx-auto py-2">
                                        {/* Curso destino */}
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                                                Curso y Asignatura *
                                            </label>
                                            <div className="relative">
                                                <select
                                                    className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm bg-white text-[#1E2421] outline-none focus:border-[#689C63] focus:ring-4 focus:ring-[#689C63]/10 font-bold appearance-none transition-all cursor-pointer pr-9"
                                                    value={selectedCourseComposite}
                                                    onChange={e => {
                                                        const [idStr, ...asigParts] = e.target.value.split('::');
                                                        const nextId = Number(idStr);
                                                        const nextAsig = asigParts.join('::');
                                                        setForm(p => ({ ...p, cursoId: nextId, asignatura: nextAsig }));
                                                    }}
                                                >
                                                    <option value="0::" disabled>Selecciona el curso…</option>
                                                    {cursos.map(c => {
                                                        const asigNombre = getAsignaturaNombre(c.asignatura);
                                                        const esOpt = esAsignaturaOptativa(c.asignatura);
                                                        return (
                                                            <option key={`${c.id}-${c.asignatura}`} value={`${c.id}::${c.asignatura || ''}`}>
                                                                {c.grado} {c.seccion} — {asigNombre}{esOpt ? ' (Optativa)' : ''}
                                                            </option>
                                                        );
                                                    })}
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
                                                autoFocus
                                                type="text"
                                                className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-xs sm:text-sm bg-white text-[#1E2421] placeholder:text-slate-400 outline-none focus:border-[#689C63] focus:ring-4 focus:ring-[#689C63]/10 font-bold transition-all shadow-xs"
                                                placeholder="Ej: Análisis Crítico de Textos"
                                                value={form.nombre}
                                                onChange={e => setForm(p => ({ ...p, nombre: e.target.value }))}
                                                onKeyDown={e => {
                                                    if (e.key === 'Enter') {
                                                        e.preventDefault();
                                                        if (form.nombre.trim() && form.cursoId) setManualStep(2);
                                                    }
                                                }}
                                            />
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div className="space-y-1.5">
                                                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                                                    Tipo de actividad
                                                </label>
                                                <select
                                                    className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm bg-white text-[#1E2421] font-bold outline-none focus:border-[#689C63] focus:ring-4 focus:ring-[#689C63]/10 transition-all cursor-pointer"
                                                    value={form.tipo}
                                                    onChange={e => setForm(p => ({ ...p, tipo: e.target.value }))}
                                                >
                                                    <option value="formativa">Formativa (Práctica o Taller)</option>
                                                    <option value="sumativa">Sumativa (Evaluación calificada)</option>
                                                    <option value="diagnostica">Diagnóstica (Conocimientos previos)</option>
                                                    <option value="producto_final">Producto Final / Proyecto</option>
                                                </select>
                                            </div>

                                            <div className="space-y-1.5">
                                                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                                                    Fecha programada *
                                                </label>
                                                <input
                                                    type="date"
                                                    className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm bg-white text-[#1E2421] font-bold outline-none focus:border-[#689C63] focus:ring-4 focus:ring-[#689C63]/10 transition-all"
                                                    value={form.fecha}
                                                    onChange={e => setForm(p => ({ ...p, fecha: e.target.value }))}
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-1.5 pt-1">
                                            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center justify-between">
                                                <span>Descripción o instrucciones (opcional)</span>
                                                <span className="text-[11px] font-medium text-slate-500 normal-case tracking-normal">No obligatorio</span>
                                            </label>
                                            <textarea
                                                rows={3}
                                                className="w-full border border-slate-300 rounded-xl p-3.5 text-xs sm:text-sm bg-white text-[#1E2421] placeholder:text-slate-400 outline-none focus:border-[#689C63] focus:ring-4 focus:ring-[#689C63]/10 font-medium transition-all resize-none"
                                                placeholder="Instrucciones o contexto breve para los estudiantes..."
                                                value={form.descripcion}
                                                onChange={e => setForm(p => ({ ...p, descripcion: e.target.value }))}
                                            />
                                        </div>
                                    </div>
                                )}

                                {/* PASO 2: CONFIGURACIÓN DE LA EVALUACIÓN */}
                                {manualStep === 2 && (
                                    <div className="space-y-5 py-1">
                                        <div className="bg-[#FAF7F2]/70 border border-slate-300/80 rounded-2xl p-4.5 space-y-3">
                                            <div className="border-b border-slate-200 pb-2.5 flex items-center justify-between">
                                                <div>
                                                    <span className="text-[11px] font-black uppercase tracking-wider text-slate-600 block">
                                                        Competencias Fundamentales a evaluar *
                                                    </span>
                                                    <h3 className="text-sm font-extrabold text-[#2E3330]">
                                                        {currentCurso?.nivelEducativo === 'primaria' ? '3 Bloques de Primaria' : '4 Bloques de Secundaria'}
                                                    </h3>
                                                </div>
                                                <span className="text-[11px] font-bold text-slate-700 bg-white border border-slate-300 px-2.5 py-0.5 rounded-md">
                                                    {form.bcs.length} seleccionada{form.bcs.length !== 1 ? 's' : ''}
                                                </span>
                                            </div>

                                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                                                {BC_CIRCLE_CONFIG.slice(0, currentCurso?.nivelEducativo === 'primaria' ? 3 : 4).map(({ id, label, icon: Icon, bg, selectedBg, selectedText }) => {
                                                    const isSelected = form.bcs.includes(id);
                                                    return (
                                                        <button
                                                            key={id}
                                                            type="button"
                                                            onClick={() => {
                                                                setForm(p => ({
                                                                    ...p,
                                                                    bcs: isSelected
                                                                        ? (p.bcs.length > 1 ? p.bcs.filter(x => x !== id) : p.bcs)
                                                                        : [...p.bcs, id]
                                                                }));
                                                            }}
                                                            className={`p-2.5 rounded-xl border text-left flex items-center gap-3 transition-all cursor-pointer ${isSelected
                                                                ? 'bg-white border-[#689C63] shadow-xs ring-2 ring-[#689C63]/40'
                                                                : 'bg-white/80 border-slate-200 hover:border-slate-300 hover:bg-white'
                                                                }`}
                                                        >
                                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${isSelected ? `${selectedBg} ${selectedText}` : `${bg} text-slate-700`
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
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                <p className="text-xs font-bold text-[#2E3330] leading-snug truncate" title={label}>
                                                                    {label}
                                                                </p>
                                                            </div>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>

                                        {/* Selector de Contenido e Indicador */}
                                        <div className="bg-[#FAF7F2]/70 border border-slate-300/80 rounded-2xl p-4.5 space-y-4">
                                            <div className="border-b border-slate-200 pb-2.5 flex items-center justify-between">
                                                <h3 className="text-sm font-extrabold text-[#2E3330]">
                                                    Contenido e Indicador curricular
                                                </h3>
                                                {currentCurso && (
                                                    <span className="text-xs font-bold text-slate-700 bg-white border border-slate-300 px-2.5 py-1 rounded-lg">
                                                        {currentCurso.grado} · {getAsignaturaNombre(currentAsignatura || currentCurso.asignatura)}
                                                    </span>
                                                )}
                                            </div>

                                            <SelectorIndicadorFragmento
                                                grado={currentCurso?.grado}
                                                asignatura={currentAsignatura}
                                                cursoId={form.cursoId ? Number(form.cursoId) : undefined}
                                                nivelEducativo={currentCurso?.nivelEducativo}
                                                periodo={useAppStore.getState().selectedPeriodo || currentCurso?.periodo || 'P2'}
                                                initialIndicador={form.indicador}
                                                onChange={(data) => {
                                                    setForm(p => ({
                                                        ...p,
                                                        indicador: data.indicadorTexto,
                                                        bcs: data.bcSugerido ? [data.bcSugerido] : p.bcs,
                                                        producto: data.contenido ? (p.producto || data.contenido) : p.producto
                                                    }));
                                                    setIndicadoresJson(data.indicadoresJson);
                                                }}
                                                disabled={isSaving}
                                            />
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 bg-[#FAF7F2]/60 p-4 rounded-2xl border border-slate-200">
                                            <div className="sm:col-span-8 space-y-1.5">
                                                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                                                    Producto / Evidencia de aprendizaje (opcional)
                                                </label>
                                                <input
                                                    className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-xs sm:text-sm bg-white text-[#1E2421] placeholder:text-slate-400 outline-none focus:border-[#689C63] focus:ring-4 focus:ring-[#689C63]/10 font-bold transition-all"
                                                    placeholder="Ej: Cuaderno de trabajo, Ensayo, Exposición, Mapa mental…"
                                                    value={form.producto}
                                                    onChange={e => setForm(p => ({ ...p, producto: e.target.value }))}
                                                />
                                            </div>

                                            <div className="sm:col-span-4 space-y-1.5">
                                                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                                                    Puntuación máxima
                                                </label>
                                                <input
                                                    type="number"
                                                    min={1}
                                                    max={100}
                                                    className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-xs sm:text-sm bg-white text-[#1E2421] font-bold outline-none focus:border-[#689C63] focus:ring-4 focus:ring-[#689C63]/10 transition-all"
                                                    value={form.puntuacion}
                                                    onChange={e => setForm(p => ({ ...p, puntuacion: Number(e.target.value) || 100 }))}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* PASO 3: REVISIÓN Y CONFIRMACIÓN */}
                                {manualStep === 3 && (
                                    <div className="max-w-2xl mx-auto py-2 space-y-4">
                                        <div className="bg-[#FAF7F2] border border-slate-200/90 rounded-2xl p-5 space-y-4 shadow-xs">
                                            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                                                <div>
                                                    <span className="text-[11px] font-black uppercase tracking-wider text-slate-500 block">
                                                        Resumen de la actividad
                                                    </span>
                                                    <h4 className="text-base font-extrabold text-[#2E3330]">
                                                        {form.nombre || 'Sin nombre'}
                                                    </h4>
                                                </div>
                                                <span className="px-3 py-1 bg-white border border-slate-300 rounded-full text-xs font-bold text-slate-700 uppercase tracking-wider">
                                                    {form.tipo.replace('_', ' ')}
                                                </span>
                                            </div>

                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                                                <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-1">
                                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Curso y Asignatura</span>
                                                    <div className="font-bold text-slate-800">
                                                        {currentCurso ? `${currentCurso.grado} ${currentCurso.seccion} · ${getAsignaturaNombre(currentAsignatura)}` : 'No especificado'}
                                                    </div>
                                                </div>

                                                <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-1">
                                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Fecha y Puntuación</span>
                                                    <div className="font-bold text-slate-800">
                                                        {form.fecha} · {form.puntuacion} pts
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="p-3.5 bg-white rounded-xl border border-slate-200 space-y-2">
                                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Competencias asignadas</span>
                                                <div className="flex flex-wrap gap-1.5">
                                                    {form.bcs.map(bc => (
                                                        <span key={bc} className="px-2.5 py-1 rounded-lg text-xs font-black uppercase tracking-wider bg-slate-100 text-slate-800 border border-slate-200">
                                                            {bc}: {COMPETENCIAS_LABEL[bc] || bc}
                                                        </span>
                                                    ))}
                                                </div>

                                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block pt-2">Indicador de logro</span>
                                                <p className="text-xs text-slate-800 font-semibold leading-relaxed">
                                                    {form.indicador || 'No seleccionado'}
                                                </p>
                                            </div>

                                            {form.producto && (
                                                <div className="p-3.5 bg-white rounded-xl border border-slate-200 space-y-1">
                                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Producto / Evidencia</span>
                                                    <p className="text-xs font-bold text-[#2E3330]">
                                                        {form.producto}
                                                    </p>
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex items-center justify-between px-2 text-xs text-slate-500 font-medium">
                                            <span>¿Deseas modificar algún dato antes de crear?</span>
                                            <div className="flex items-center gap-3">
                                                <button
                                                    type="button"
                                                    onClick={() => setManualStep(1)}
                                                    className="font-bold text-[#689C63] hover:underline cursor-pointer"
                                                >
                                                    Paso 1 (Datos)
                                                </button>
                                                <span>·</span>
                                                <button
                                                    type="button"
                                                    onClick={() => setManualStep(2)}
                                                    className="font-bold text-[#689C63] hover:underline cursor-pointer"
                                                >
                                                    Paso 2 (Evaluación)
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}
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
                                            value={targetCursoId ? `${targetCursoId}::${targetAsignatura}` : '0::'}
                                            onChange={e => {
                                                const [idStr, ...asigParts] = e.target.value.split('::');
                                                setTargetCursoId(Number(idStr));
                                                setTargetAsignatura(asigParts.join('::'));
                                            }}
                                        >
                                            <option value="0::" disabled>Selecciona el curso…</option>
                                            {cursos.map(c => {
                                                const asigNombre = getAsignaturaNombre(c.asignatura);
                                                const esOpt = esAsignaturaOptativa(c.asignatura);
                                                return (
                                                    <option key={`${c.id}-${c.asignatura}`} value={`${c.id}::${c.asignatura || ''}`}>
                                                        {c.grado} {c.seccion} — {asigNombre}{esOpt ? ' (Optativa)' : ''}
                                                    </option>
                                                );
                                            })}
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
                                        value={targetCursoId ? `${targetCursoId}::${targetAsignatura}` : ''}
                                        disabled
                                    >
                                        <option value="" disabled>Seleccionar...</option>
                                        {cursos.map(c => {
                                            const asigNombre = getAsignaturaNombre(c.asignatura);
                                            const esOpt = esAsignaturaOptativa(c.asignatura);
                                            return (
                                                <option key={`${c.id}-${c.asignatura}`} value={`${c.id}::${c.asignatura || ''}`}>
                                                    {c.grado} {c.seccion} — {asigNombre}{esOpt ? ' (Optativa)' : ''}
                                                </option>
                                            );
                                        })}
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
