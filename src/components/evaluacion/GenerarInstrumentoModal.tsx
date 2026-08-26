import { useEffect, useState } from 'react';
import { Loader2, Sparkles } from 'lucide-react';
import type { Actividad, CriterioCotejo } from '../../types';
import { CieloModal } from '../ui/CieloModal';
import { useAppStore } from '../../store/appStore';
import { getGeminiApiKey, saveGeminiApiKey } from '../../lib/aiConfig';
import {
    generarRubricaConIA,
    generarCotejoConIA,
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
    const session = useAppStore(s => s.session);
    const userId = session?.user?.id;

    const [actividadId, setActividadId] = useState<number | ''>('');
    const [notas, setNotas] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [showApiKeyPrompt, setShowApiKeyPrompt] = useState(false);
    const [tempApiKey, setTempApiKey] = useState('');

    useEffect(() => {
        if (isOpen) {
            setActividadId('');
            setNotas('');
            setIsLoading(false);
            setErrorMsg(null);
            setShowApiKeyPrompt(false);
            setTempApiKey('');
        }
    }, [isOpen]);

    const handleGuardarApiKey = () => {
        if (!tempApiKey.trim() || !userId) return;
        saveGeminiApiKey(userId, tempApiKey);
        setShowApiKeyPrompt(false);
        setTempApiKey('');
    };

    const handleGenerar = async () => {
        if (isLoading || !userId) return;

        const apiKey = getGeminiApiKey(userId);
        if (!apiKey) {
            setShowApiKeyPrompt(true);
            return;
        }

        const actividad = actividades.find(a => a.id === Number(actividadId)) || null;
        if (!actividad && !asignatura && !notas.trim()) {
            setErrorMsg('Selecciona una actividad o escribe indicaciones para la IA.');
            return;
        }

        setIsLoading(true);
        setErrorMsg(null);

        try {
            const contexto: ContextoInstrumento = {
                asignatura: asignatura || '',
                cursoNombre,
                periodo: actividad?.periodo || null,
                actividadNombre: actividad?.nombre || null,
                indicadorLogro: actividad?.indicador || null,
                bcAsignados: actividad?.bcAsignados || null,
                notas,
            };

            if (tipo === 'rubrica') {
                const descriptores = await generarRubricaConIA(apiKey, contexto);
                onAplicarRubrica?.(descriptores);
            } else {
                const criterios = await generarCotejoConIA(apiKey, contexto);
                onAplicarCotejo?.(criterios);
            }
            onClose();
        } catch (error) {
            console.error('Error generating instrument:', error);
            setErrorMsg(error instanceof Error ? error.message : 'Error inesperado al generar con IA. Intente de nuevo.');
        } finally {
            setIsLoading(false);
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
                <div className="flex items-center justify-end gap-3">
                    <button
                        onClick={onClose}
                        disabled={isLoading}
                        className="px-5 py-2.5 rounded-full text-xs font-black uppercase tracking-widest text-slate-500 hover:bg-slate-100 transition-all outline-none focus-visible:ring-2 focus-visible:ring-slate-300"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={() => (showApiKeyPrompt ? handleGuardarApiKey() : handleGenerar())}
                        disabled={isLoading || (showApiKeyPrompt && !tempApiKey.trim())}
                        className={`px-6 py-2.5 rounded-full text-xs font-black uppercase tracking-widest bg-primary text-[#2E3330] shadow-md shadow-primary/20 hover:bg-primary/90 transition-all active:scale-95 flex items-center justify-center gap-2 ${(isLoading || (showApiKeyPrompt && !tempApiKey.trim())) ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                        {isLoading ? (
                            <>
                                <Loader2 size={14} className="animate-spin" />
                                Generando...
                            </>
                        ) : showApiKeyPrompt ? (
                            'Guardar API Key'
                        ) : (
                            <>
                                <Sparkles size={14} />
                                Generar
                            </>
                        )}
                    </button>
                </div>
            }
        >
            {showApiKeyPrompt ? (
                <div className="py-4 space-y-6">
                    <div className="text-center space-y-2">
                        <h3 className="text-sm font-bold text-slate-900">Necesitamos tu API Key de Google Gemini</h3>
                        <p className="text-xs text-slate-500 leading-relaxed font-medium">
                            La clave será utilizada para generar los instrumentos de evaluación de forma automática.
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
                <div className="py-2 space-y-5">
                    <p className="text-xs text-slate-500 leading-relaxed font-medium">
                        La IA generará una propuesta de {tituloTipo.toLowerCase()} a partir del contexto del curso.
                        Podrás revisarla y editarla en el instrumento antes de guardar.
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
                        <label className="notion-label">Actividad (opcional)</label>
                        <select
                            className="w-full h-11 bg-base-creme border border-slate-350 rounded-xl px-4 text-sm font-medium text-[#2E3330] outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all cursor-pointer shadow-sm"
                            value={actividadId}
                            onChange={e => setActividadId(Number(e.target.value) || '')}
                        >
                            <option value="">Sin actividad específica...</option>
                            {actividades.map(a => (
                                <option key={a.id} value={a.id}>
                                    {a.nombre} ({a.periodo})
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="space-y-1.5">
                        <label className="notion-label">Indicaciones adicionales (opcional)</label>
                        <textarea
                            rows={3}
                            className="w-full bg-base-creme border border-slate-350 rounded-xl px-4 py-3 text-sm font-medium text-[#2E3330] outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all resize-none placeholder:text-slate-400 placeholder:font-normal"
                            placeholder="Ej.: Enfocarse en el trabajo colaborativo y la presentación de resultados..."
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
        </CieloModal>
    );
}
