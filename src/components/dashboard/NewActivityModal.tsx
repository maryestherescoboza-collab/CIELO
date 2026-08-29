import { useState } from 'react';
import { MessageSquareText, Brain, Puzzle, Microscope } from 'lucide-react';
import type { AppState, Actividad, BCKey } from '../../types';
import { COMPETENCIAS_LABEL } from '../../types';
import { TC_Flux, TC_Genesis, TC_Archive, TC_Echo } from '../icons/TerraCognitaIcons';
import { CieloModal } from '../ui/CieloModal';
import { useAppStore } from '../../store/appStore';
import { getGeminiApiKey, saveGeminiApiKey, buildGeminiEndpoint } from '../../lib/aiConfig';

const BC_CIRCLE_CONFIG: Array<{ id: BCKey; label: string; icon: typeof MessageSquareText; bg: string; selectedBg: string; selectedText: string }> = [
  { id: 'BC1', label: COMPETENCIAS_LABEL.BC1, icon: MessageSquareText, bg: 'bg-blue-50', selectedBg: 'bg-blue-600', selectedText: 'text-white' },
  { id: 'BC2', label: COMPETENCIAS_LABEL.BC2, icon: Brain, bg: 'bg-violet-50', selectedBg: 'bg-violet-600', selectedText: 'text-white' },
  { id: 'BC3', label: COMPETENCIAS_LABEL.BC3, icon: Puzzle, bg: 'bg-amber-50', selectedBg: 'bg-amber-600', selectedText: 'text-white' },
  { id: 'BC4', label: COMPETENCIAS_LABEL.BC4, icon: Microscope, bg: 'bg-emerald-50', selectedBg: 'bg-emerald-600', selectedText: 'text-white' },
];

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
    selected: boolean;
}

const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
            const result = reader.result as string;
            const base64 = result.split(',')[1];
            resolve(base64);
        };
        reader.onerror = error => reject(error);
    });
};

export function NewActivityModal({ show, onClose, onAddActividad, cursos, onSuccess }: NewActivityModalProps) {
    const session = useAppStore(s => s.session);
    const state = useAppStore(s => s.state);
    const today = new Date().toISOString().split('T')[0];
    const [flowMode, setFlowMode] = useState<'choice' | 'manual' | 'pdf' | 'preview'>('choice');
    
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

    // PDF flow states
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [extractedActivities, setExtractedActivities] = useState<ExtractedActivity[]>([]);
    const [targetCursoId, setTargetCursoId] = useState<number>(0);
    const [targetPeriodo, setTargetPeriodo] = useState<string>('');
    const [targetFecha, setTargetFecha] = useState<string>(today);

    // API Key flow states
    const [showApiKeyPrompt, setShowApiKeyPrompt] = useState(false);
    const [tempApiKey, setTempApiKey] = useState('');

    // Reset all states
    const handleClose = () => {
        setFlowMode('choice');
        setSelectedFile(null);
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

    // PDF selection and validation handler (Fase 4)
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setErrorMsg(null);
        const file = e.target.files?.[0];
        if (!file) return;

        // 1. Validar que realmente sea PDF
        if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
            setErrorMsg('El archivo seleccionado no es válido. Debe ser un documento PDF.');
            setSelectedFile(null);
            return;
        }

        // 2. Validar que tenga un tamaño permitido (máximo 10 MB para no exceder límites de payload)
        const MAX_SIZE_MB = 10;
        if (file.size > MAX_SIZE_MB * 1024 * 1024) {
            setErrorMsg(`El archivo es demasiado grande. El tamaño máximo permitido es ${MAX_SIZE_MB} MB.`);
            setSelectedFile(null);
            return;
        }

        setSelectedFile(file);
    };

    // Save API Key
    const handleSaveApiKey = () => {
        if (!tempApiKey.trim() || !session?.user?.id) return;
        saveGeminiApiKey(session.user.id, tempApiKey);
        setShowApiKeyPrompt(false);
        setTempApiKey('');
        handleProcessPdf();
    };

    // Process PDF and query Gemini API
    const handleProcessPdf = async () => {
        if (!selectedFile || isProcessing) return;

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

        const savedApiKey = getGeminiApiKey(currentUserId);
        if (!savedApiKey) {
            setShowApiKeyPrompt(true);
            return;
        }

        setIsProcessing(true);
        setErrorMsg(null);

        try {
            // Usamos el modelo actualizado (Fase 3)
            const endpointUrl = buildGeminiEndpoint(savedApiKey as string);

            // Connection OK! Now convert PDF to Base64 and send it
            const base64Data = await fileToBase64(selectedFile);
            
            const targetCursoObj = cursos.find(c => c.id === targetCursoId);
            const cursoNombre = targetCursoObj ? `${targetCursoObj.grado} ${targetCursoObj.seccion} - ${targetCursoObj.nombre}` : '';

            const prompt = `Analiza el siguiente documento PDF que contiene planificaciones o descripciones de actividades académicas.
Extrae todas las actividades encontradas en el documento de forma exacta.

INFORMACIÓN DE CONTEXTO OBLIGATORIA (Úsala para interpretar y validar las actividades extraídas, pero no inventes competencias que no se declaren explícitamente):
- Asignatura: ${docenteAsignatura}
- Curso: ${cursoNombre}
- Período: ${targetPeriodo}

Para cada actividad, debes identificar:
1. "nombre": Nombre exacto de la actividad (no inventes un nombre, usa el del documento).
2. "competencias": Busca en el texto de la actividad o en secciones adyacentes (como 'Competencias', 'Propósito', 'Aprendizajes esperados') referencias a los nombres de las competencias oficiales. 
   NO busques las etiquetas internas "BC1", "BC2", "BC3" ni "BC4". Estos códigos normalmente no aparecen en el documento.
   Busca directamente expresiones o variantes comunes relacionadas con estas 4 competencias:
   - Comunicativa (BC1) -> Variantes: Comunicación, Competencia comunicativa, Comunicación oral, Habilidades comunicativas.
   - Científica y tecnológica; ambiental y de la salud (BC2) -> Variantes: Científica, Tecnológica, Competencia ambiental, Cuidado del ambiente y la salud.
   - Desarrollo personal y espiritual; ética y ciudadana (BC3) -> Variantes: Desarrollo personal, Espiritual, Ética, Ciudadana, Ciudadanía.
   - Pensamiento lógico, creativo y crítico; resolución de problemas (BC4) -> Variantes: Pensamiento lógico, Pensamiento creativo, Pensamiento crítico, Resolución de problemas.
   Si encuentras explícitamente alguna de estas referencias (el nombre o sus variantes contextuales asociadas a la actividad), mapea a su código interno correspondiente y devuelve un arreglo de objetos con el "codigo" (ej. "BC1") y su "nombre" oficial estricto. Si no encuentras referencias a competencias de forma explícita, devuelve un arreglo vacío [].
3. "indicador_logro": Construye un único indicador de logro pedagógicamente coherente a partir de la actividad.
   Debe combinar: VERBO DE ACCIÓN + CONTENIDO ESPECÍFICO + CONDICIÓN DE ÉXITO.
   Usa un verbo observable (ej. Resuelve, Analiza, Compara, Identifica).
   No intentes buscar literalmente el texto "Indicador de logro", constrúyelo deduciendo el desempeño principal que evalúa la tarea.
4. "producto": Identifica el producto o evidencia de aprendizaje de la actividad.
   Definición: el producto o evidencia de una actividad en clases es la prueba física o digital que muestra el trabajo, el aprendizaje y el logro del estudiante durante una tarea escolar. Representa la evidencia concreta que queda como resultado del trabajo del estudiante. NO debe confundirse con la actividad.
   Pregunta guía: ¿Qué evidencia concreta produce, presenta, entrega, construye, resuelve o registra el estudiante como resultado de esta actividad?
   Especificación de formato:
   - El Producto debe ser breve: máximo 5 palabras.
   - Además de identificar la evidencia, indica CUANDO CORRESPONDA el medio o lugar donde el estudiante realizará o presentará la actividad (ej.: en el cuaderno, en una hoja de trabajo, en Canva, en PowerPoint, en una plataforma digital).
   - Solo menciona el medio o lugar si el documento lo indica explícitamente; NUNCA lo inventes. Si la actividad no indica dónde se realiza, describe únicamente la evidencia.
   - El Producto debe describir de forma breve la evidencia final y su medio de realización, sin explicaciones adicionales y respetando siempre el máximo de 5 palabras.
   Ejemplos de formato correcto:
   - "Ejercicios resueltos en el cuaderno".
   - "Mapa mental en Canva".
   - "Glosario elaborado en el cuaderno".
   - "Célula dibujada en el cuaderno".
   - "Presentación creada en PowerPoint".
   Límite anti-invención: deriva el producto ÚNICAMENTE de lo que la actividad solicita producir, entregar, construir, resolver o registrar. NO inventes una evidencia que la actividad no pida (ej.: para "Resolver los ejercicios de ecuaciones lineales" el producto es "Ejercicios de ecuaciones lineales resueltos", NO "Presentación digital sobre ecuaciones"). Esto aplica también al medio o lugar: si el PDF no lo declara, omítelo. Si la actividad genuinamente no produce ninguna evidencia identificable, devuelve una cadena vacía "".

REGLAS CRÍTICAS DE EXTRACCIÓN:
- La IA debe extraer ÚNICAMENTE información que pueda identificar explícitamente en el documento.
- NO inferir competencias que no estén explícitamente nombradas en el documento con sus denominaciones oficiales o variantes claras. NO asumas la competencia sólo por el verbo de la actividad (ej. "Resolver problemas" no es BC4 si no lo declara como competencia que se está evaluando).
- NO agregar conceptos al indicador que no estén relacionados con la actividad original.
- NO inventar productos o evidencias que la actividad no solicite explícitamente; derívalo solo del contenido real de la tarea.
- Devuelve la respuesta en formato JSON estructurado, cumpliendo exactamente con el siguiente esquema JSON:
{
  "actividades": [
    {
      "nombre": "string",
      "competencias": [{"codigo": "string", "nombre": "string"}],
      "indicador_logro": "string",
      "producto": "string"
    }
  ]
}`;

            const response = await fetch(endpointUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    contents: [
                        {
                            parts: [
                                { text: prompt },
                                {
                                    inlineData: {
                                        mimeType: 'application/pdf',
                                        data: base64Data
                                    }
                                }
                            ]
                        }
                    ],
                    generationConfig: {
                        responseMimeType: 'application/json',
                        responseSchema: {
                            type: 'OBJECT',
                            properties: {
                                actividades: {
                                    type: 'ARRAY',
                                    items: {
                                        type: 'OBJECT',
                                        properties: {
                                            nombre: { type: 'STRING' },
                                            competencias: { 
                                                type: 'ARRAY', 
                                                items: { 
                                                    type: 'OBJECT',
                                                    properties: {
                                                        codigo: { type: 'STRING', enum: ['BC1', 'BC2', 'BC3', 'BC4'] },
                                                        nombre: { type: 'STRING' }
                                                    },
                                                    required: ['codigo', 'nombre']
                                                } 
                                            },
                                            indicador_logro: { type: 'STRING' },
                                            producto: { type: 'STRING' }
                                        },
                                        required: ['nombre', 'competencias', 'indicador_logro', 'producto']
                                    }
                                }
                            },
                            required: ['actividades']
                        }
                    }
                })
            });

            if (!response.ok) {
                const errText = await response.text();
                const cleanErrText = errText.replace(new RegExp(savedApiKey, 'g'), '***API_KEY***');
                console.error(`[Gemini API Technical Error] Code ${response.status}:`, cleanErrText);
                
                if (response.status === 400) {
                    throw new Error('Solicitud incorrecta: El PDF podría ser inválido, estar dañado, o exceder el tamaño soportado.');
                } else if (response.status === 401 || response.status === 403) {
                    throw new Error('API Key de Gemini no válida o sin permisos. Por favor, verifíquela.');
                } else if (response.status === 404) {
                    throw new Error('El modelo de IA no está disponible o el endpoint es incorrecto para esta API Key.');
                } else {
                    throw new Error(`Fallo en el servicio de Gemini (Código HTTP ${response.status}). Intente de nuevo más tarde.`);
                }
            }

            const resJson = await response.json();
            const textResponse = resJson.candidates?.[0]?.content?.parts?.[0]?.text;
            if (!textResponse) {
                console.error('[Gemini API Technical Error] No text parts in response:', resJson);
                throw new Error('No se recibieron actividades legibles en el análisis del documento.');
            }

            let data;
            try {
                data = JSON.parse(textResponse);
            } catch (e) {
                console.error('[Gemini API Technical Error] Malformed JSON payload:', textResponse);
                throw new Error('La IA devolvió una respuesta con formato JSON inválido. Intente procesar de nuevo.');
            }
            const extracted = (data.actividades || []).map((act: any) => {
                const mappedBcs = Array.isArray(act.competencias) 
                    ? act.competencias.map((c: any) => c.codigo).filter((c: any) => ['BC1', 'BC2', 'BC3', 'BC4'].includes(c))
                    : [];
                return {
                    nombre: act.nombre || 'Nueva Actividad',
                    competencias: mappedBcs,
                    indicador_logro: act.indicador_logro || '',
                    producto: act.producto || '',
                    selected: true
                };
            });

            if (extracted.length === 0) {
                setErrorMsg('No se encontraron actividades en el documento.');
            } else {
                setExtractedActivities(extracted);
                setFlowMode('preview');
            }
        } catch (error: any) {
            console.error('Error analyzing PDF:', error);
            setErrorMsg(error.message || 'Error inesperado al procesar el archivo. Intente de nuevo.');
        } finally {
            setIsProcessing(false);
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
        if (flowMode === 'pdf') {
            const isMissingContext = !selectedFile || isProcessing || !targetCursoId || !targetPeriodo;
            return (
                <div className="flex gap-4 w-full">
                    <button 
                        className="flex-1 h-10 rounded-full text-xs font-bold uppercase tracking-widest bg-white border border-slate-200 text-slate-500 hover:bg-slate-50 hover:border-slate-300 transition-all active:scale-95" 
                        onClick={() => setFlowMode('choice')}
                        disabled={isProcessing}
                    >
                        Volver
                    </button>
                    <button 
                        data-guide="btn-procesar-pdf"
                        className={`flex-1 h-10 rounded-full text-xs font-bold uppercase tracking-widest bg-primary text-[#2E3330] shadow-md shadow-primary/20 hover:bg-primary/90 transition-all active:scale-95 flex items-center justify-center gap-2 ${isMissingContext ? 'opacity-50 cursor-not-allowed' : ''}`} 
                        onClick={handleProcessPdf}
                        disabled={isMissingContext}
                    >
                        {isProcessing ? 'Procesando...' : (
                            <>
                                <span>Procesar PDF</span>
                                <TC_Flux size={14} />
                            </>
                        )}
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
                    onClick={() => setFlowMode('pdf')}
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
                            : flowMode === 'pdf'
                                ? 'Importar Actividades desde PDF'
                                : 'Actividades Detectadas en el Documento'
            }
            maxWidth={flowMode === 'preview' ? '7xl' : 'lg'}
            footer={getModalFooter()}
        >
            {showApiKeyPrompt ? (
                <div className="py-4 space-y-6">
                    <div className="text-center space-y-2">
                        <h3 className="text-sm font-bold text-slate-900">Necesitamos tu API Key de Google Gemini</h3>
                        <p className="text-xs text-slate-500 leading-relaxed font-medium">
                            La clave será utilizada para analizar los documentos y extraer las actividades pedagógicas de forma automática.
                        </p>
                    </div>

                    <div className="flex justify-center">
                        <a 
                            href="https://aistudio.google.com/app/api-keys?project=gen-lang-client-0626735374"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs font-bold text-primary hover:underline flex items-center gap-1.5"
                        >
                            Obtener API Key de Google AI Studio ↗
                        </a>
                    </div>

                    <div className="space-y-2">
                        <label className="notion-label">API Key</label>
                        <div className="search-container h-12! rounded-xl!">
                            <input 
                                type="password"
                                className="text-base font-medium w-full bg-transparent outline-none" 
                                placeholder="Ingresa tu clave de Gemini..." 
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
                                    onClick={() => setFlowMode('pdf')}
                                    className="p-6 rounded-2xl border border-slate-200 hover:border-primary hover:bg-[#EAE4DA]/20 transition-all flex flex-col items-center text-center group"
                                >
                                    <div className="w-12 h-12 rounded-xl bg-[#EAE4DA] flex items-center justify-center mb-4 text-[#2E3330] group-hover:bg-primary transition-colors">
                                        <TC_Archive size={24} />
                                    </div>
                                    <h3 className="text-sm font-bold text-slate-900 mb-2">Importar Inteligente desde PDF</h3>
                                    <p className="text-xs text-slate-500 font-medium leading-relaxed">
                                        Suba un documento PDF y use la IA para extraer y programar sus actividades de forma automática.
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
                                                    transition-all duration-200 pointer-events-none z-[9999]
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

                    {flowMode === 'pdf' && (
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

                            <div className="border-2 border-dashed border-slate-200 rounded-2xl p-8 flex flex-col items-center justify-center text-center bg-slate-50 hover:bg-slate-100/50 transition-all cursor-pointer relative group">
                                <input 
                                    type="file" 
                                    accept=".pdf" 
                                    data-guide="archivo-pdf"
                                    onChange={handleFileChange} 
                                    disabled={isProcessing}
                                    className="absolute inset-0 opacity-0 cursor-pointer" 
                                />
                                <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-primary group-hover:text-[#2E3330] transition-colors mb-4">
                                    <TC_Archive size={24} />
                                </div>
                                <h4 className="text-sm font-bold text-slate-900 mb-1">
                                    {selectedFile ? selectedFile.name : 'Seleccionar Documento PDF'}
                                </h4>
                                <p className="text-xs text-slate-400 font-medium">
                                    {selectedFile ? `${(selectedFile.size / (1024 * 1024)).toFixed(2)} MB` : 'Haga clic para buscar o arrastre su archivo PDF aquí'}
                                </p>
                            </div>

                            {isProcessing && (
                                <div className="flex flex-col items-center justify-center space-y-3 py-6">
                                    <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest animate-pulse">Analizando documento...</p>
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
                                                    <div className="flex flex-col gap-1.5">
                                                        {act.competencias.length > 0 ? (
                                                            act.competencias.map(bc => {
                                                                const bcNames: Record<string, string> = {
                                                                    'BC1': 'Comunicativa',
                                                                    'BC2': 'Científica y tecnológica; ambiental y de la salud',
                                                                    'BC3': 'Desarrollo personal y espiritual; ética y ciudadana',
                                                                    'BC4': 'Pensamiento lógico, creativo y crítico; resolución de problemas'
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
                        </div>
                    )}
                </>
            )}
        </CieloModal>
    );
}
