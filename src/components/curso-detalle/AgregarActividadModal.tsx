import React, { useEffect, useState, useMemo } from 'react';
import {
    Search,
    Check,
    ChevronLeft,
    ChevronRight,
    X,
    Loader2,
    PenLine,
} from 'lucide-react';
import { CieloModal } from '../ui/CieloModal';
import { supabase } from '../../lib/supabase';
import {
    claveGrado,
    filtrarContenidos,
    filtrarIndicadores,
    bloqueDeCompetencia,
    COLORES_BLOQUE_CF,
    normalizarTexto,
} from '../../lib/curriculo';
import { getAsignaturaNombre } from '../../constants/asignaturas';
import type { Curso, BCKey, IndicadorJsonItem } from '../../types';
import type { FilaContenido, FilaIndicador, ContenidoJson } from '../../types/especificaciones';
import {
    notifyGuideOperationStarted,
    notifyGuideOperationSuccess,
    notifyGuideOperationError,
} from '../../guides/guideConfirmation';

interface AgregarActividadModalProps {
    show: boolean;
    onClose: () => void;
    onConfirm: (
        indicador: string,
        producto: string,
        extra?: {
            indicadores_json?: IndicadorJsonItem[];
            bcAsignados?: BCKey[];
            nombre?: string;
            descripcion?: string | null;
            fecha?: string;
            puntuacion?: number;
            tipo?: string;
        }
    ) => Promise<boolean>;
    curso?: Curso | null;
    asignatura?: string | null;
}

const OPCIONES_PRODUCTO = [
    'Cuaderno de trabajo',
    'Informe de lectura',
    'Ensayo',
    'Mapa conceptual',
    'Infografía',
    'Exposición oral',
    'Guía de ejercicios',
    'Maqueta / Prototipo',
    'Debate',
    'Portafolio',
    'Diario reflexivo',
    'Dramatización',
];

const STOP_WORDS = new Set([
    'la', 'el', 'los', 'las', 'un', 'una', 'unos', 'unas',
    'de', 'del', 'al', 'en', 'con', 'por', 'para', 'sobre', 'entre', 'sin', 'tras', 'hacia', 'desde', 'hasta',
    'como', 'sus', 'su', 'que', 'cual', 'cuales', 'quien', 'quienes',
    'este', 'esta', 'estos', 'estas', 'ese', 'esa', 'esos', 'esas', 'aquel', 'aquella',
    'y', 'e', 'o', 'u', 'pero', 'mas', 'sino', 'segun',
    'tipo', 'tipos', 'uso', 'usos', 'caso', 'casos', 'parte', 'partes',
    'forma', 'formas', 'manera', 'maneras', 'modo', 'modos',
    'general', 'generales', 'basico', 'basicos', 'basica', 'basicas'
]);

function extraerPalabrasClave(texto: string): string[] {
    const palabras = normalizarTexto(texto).split(/[\s,.:;()/-]+/);
    return palabras
        .map((p) => p.replace(/[^a-z0-9]/g, ''))
        .filter((p) => p.length >= 4 && !STOP_WORDS.has(p));
}

const cacheContenidos = new Map<string, FilaContenido[]>();
const cacheIndicadores = new Map<string, FilaIndicador[]>();

export const AgregarActividadModal: React.FC<AgregarActividadModalProps> = ({
    show,
    onClose,
    onConfirm,
    curso,
    asignatura,
}) => {
    const [step, setStep] = useState<1 | 2 | 3>(1);
    const [isManual, setIsManual] = useState(false);

    const [contenidosCatalogo, setContenidosCatalogo] = useState<FilaContenido[]>([]);
    const [indicadoresCatalogo, setIndicadoresCatalogo] = useState<FilaIndicador[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    // Paso 1: Contenidos
    const [selectedContenidoIds, setSelectedContenidoIds] = useState<string[]>([]);
    const [searchContenido, setSearchContenido] = useState('');
    const [manualContenido, setManualContenido] = useState('');

    // Paso 2: Indicadores
    const [selectedIndicadorIds, setSelectedIndicadorIds] = useState<string[]>([]);
    const [searchIndicador, setSearchIndicador] = useState('');
    const [manualIndicador, setManualIndicador] = useState('');
    const [manualBC, setManualBC] = useState<BCKey>('BC1');

    // Paso 3: Producto
    const [selectedProducto, setSelectedProducto] = useState('');
    const [customProducto, setCustomProducto] = useState('');
    const [nombreActividad, setNombreActividad] = useState('');
    const [fecha, setFecha] = useState<string>(() => new Date().toISOString().split('T')[0]);

    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const activeAsignatura = asignatura || curso?.asignatura || '';
    const activeGrado = curso?.grado || '';
    const activeNivel = curso?.nivelEducativo || 'secundaria';

    useEffect(() => {
        if (!show || !activeGrado || !activeAsignatura) return;

        let isMounted = true;
        const cacheKey = `${activeGrado}__${activeAsignatura}__${activeNivel}`.toLowerCase();

        const cargarCurriculo = async () => {
            setIsLoading(true);
            try {
                const gradoCanonico = claveGrado(activeGrado) || activeGrado;
                const nivelFiltro = normalizarTexto(activeNivel) === 'primaria' ? 'Primaria' : 'Secundaria';

                let conts: FilaContenido[] = [];
                if (cacheContenidos.has(cacheKey)) {
                    conts = cacheContenidos.get(cacheKey)!;
                } else {
                    const { data: rawConts } = await supabase
                        .from('curr_contenidos')
                        .select('id, nivel, grado, asignatura, contenido, contenido_json')
                        .eq('nivel', nivelFiltro)
                        .eq('grado', gradoCanonico);

                    conts = filtrarContenidos(rawConts || [], activeGrado, activeAsignatura, activeNivel);
                    cacheContenidos.set(cacheKey, conts);
                }

                let inds: FilaIndicador[] = [];
                if (cacheIndicadores.has(cacheKey)) {
                    inds = cacheIndicadores.get(cacheKey)!;
                } else {
                    const { data: rawInds } = await supabase
                        .from('curr_indicadores')
                        .select('id, nivel, grado, asignatura, competencia, codigo, descripcion, is_active')
                        .eq('nivel', nivelFiltro)
                        .eq('grado', gradoCanonico)
                        .eq('is_active', true);

                    inds = filtrarIndicadores(rawInds || [], activeGrado, activeAsignatura, activeNivel);
                    cacheIndicadores.set(cacheKey, inds);
                }

                if (isMounted) {
                    setContenidosCatalogo(conts);
                    setIndicadoresCatalogo(inds);
                }
            } catch (err) {
                console.warn('[AgregarActividadModal] Error cargando currículo:', err);
            } finally {
                if (isMounted) setIsLoading(false);
            }
        };

        cargarCurriculo();

        return () => {
            isMounted = false;
        };
    }, [show, activeGrado, activeAsignatura, activeNivel]);

    useEffect(() => {
        if (show) {
            setStep(1);
            setIsManual(false);
            setSelectedContenidoIds([]);
            setSearchContenido('');
            setManualContenido('');
            setSelectedIndicadorIds([]);
            setSearchIndicador('');
            setManualIndicador('');
            setManualBC('BC1');
            setSelectedProducto('');
            setCustomProducto('');
            setNombreActividad('');
            setFecha(new Date().toISOString().split('T')[0]);
            setIsSaving(false);
            setError(null);
        }
    }, [show]);

    const selectedContenidos = useMemo(() => {
        return contenidosCatalogo.filter((c) => selectedContenidoIds.includes(c.id));
    }, [contenidosCatalogo, selectedContenidoIds]);

    const indicadoresRelacionados = useMemo(() => {
        if (selectedContenidos.length === 0) {
            return indicadoresCatalogo;
        }

        const codigosVinculados = new Set<string>();
        selectedContenidos.forEach((c) => {
            const cJson = c.contenido_json as (ContenidoJson & { indicadores_relacionados?: string[] }) | null;
            if (cJson && Array.isArray(cJson.indicadores_relacionados)) {
                cJson.indicadores_relacionados.forEach((code: string) => {
                    codigosVinculados.add(normalizarTexto(code));
                });
            }
        });

        const kws = new Set<string>();
        selectedContenidos.forEach((c) => {
            extraerPalabrasClave(c.contenido).forEach((kw) => kws.add(kw));
            const cJson = c.contenido_json as ContenidoJson | null;
            if (cJson) {
                if (Array.isArray(cJson.conceptos)) {
                    cJson.conceptos.forEach((concepto: string) => {
                        if (typeof concepto === 'string') {
                            extraerPalabrasClave(concepto).forEach((kw) => kws.add(kw));
                        }
                    });
                }
                if (Array.isArray(cJson.procedimientos)) {
                    cJson.procedimientos.forEach((proc: string) => {
                        if (typeof proc === 'string') {
                            extraerPalabrasClave(proc).forEach((kw) => kws.add(kw));
                        }
                    });
                }
            }
        });

        const vinculados = indicadoresCatalogo.filter((ind) => {
            if (ind.codigo && codigosVinculados.has(normalizarTexto(ind.codigo))) return true;
            if (codigosVinculados.has(normalizarTexto(ind.id))) return true;

            const descNorm = normalizarTexto(ind.descripcion);
            for (const kw of kws) {
                if (descNorm.includes(kw)) return true;
            }
            return false;
        });

        return vinculados.length > 0 ? vinculados : indicadoresCatalogo;
    }, [selectedContenidos, indicadoresCatalogo]);

    const selectedIndicadores = useMemo(() => {
        return indicadoresCatalogo.filter((i) => selectedIndicadorIds.includes(i.id));
    }, [indicadoresCatalogo, selectedIndicadorIds]);

    const toggleContenido = (id: string) => {
        setError(null);
        setSelectedContenidoIds((prev) =>
            prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
        );
    };

    const toggleIndicador = (id: string) => {
        setError(null);
        setSelectedIndicadorIds((prev) =>
            prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
        );
    };

    const filteredContenidos = useMemo(() => {
        if (!searchContenido.trim()) return contenidosCatalogo;
        const q = normalizarTexto(searchContenido);
        return contenidosCatalogo.filter((c) => {
            const inTitulo = normalizarTexto(c.contenido).includes(q);
            const inEje = c.contenido_json && normalizarTexto((c.contenido_json as ContenidoJson).bloque || (c.contenido_json as { eje?: string }).eje || '').includes(q);
            return inTitulo || inEje;
        });
    }, [contenidosCatalogo, searchContenido]);

    const filteredIndicadores = useMemo(() => {
        if (!searchIndicador.trim()) return indicadoresRelacionados;
        const q = normalizarTexto(searchIndicador);
        return indicadoresRelacionados.filter((i) => {
            const inDesc = normalizarTexto(i.descripcion).includes(q);
            const inCodigo = i.codigo && normalizarTexto(i.codigo).includes(q);
            return inDesc || inCodigo;
        });
    }, [indicadoresRelacionados, searchIndicador]);

    const handleNext = () => {
        setError(null);
        if (step === 1) {
            if (isManual) {
                if (!manualContenido.trim()) {
                    setError('Escribe al menos un contenido.');
                    return;
                }
            } else if (selectedContenidoIds.length === 0) {
                setError('Selecciona al menos un contenido.');
                return;
            }
            setStep(2);
        } else if (step === 2) {
            if (isManual) {
                if (!manualIndicador.trim()) {
                    setError('Escribe al menos un indicador.');
                    return;
                }
            } else if (selectedIndicadorIds.length === 0) {
                setError('Selecciona al menos un indicador.');
                return;
            }
            setStep(3);
        }
    };

    const handlePrev = () => {
        setError(null);
        if (step > 1) {
            setStep((s) => (s - 1) as 1 | 2 | 3);
        }
    };

    const handleConfirm = async () => {
        const prodFinal = (customProducto.trim() || selectedProducto.trim()).trim();
        if (!prodFinal) {
            setError('Selecciona o escribe el producto que entregarán los estudiantes.');
            return;
        }

        if (isSaving) return;
        setIsSaving(true);
        setError(null);
        notifyGuideOperationStarted('actividad_guardar');

        try {
            let indicadorTexto = '';
            let indicadoresJson: IndicadorJsonItem[] = [];
            let bcsAsignados: BCKey[] = ['BC1'];
            const primerContenido = isManual
                ? manualContenido.trim()
                : selectedContenidos[0]?.contenido || '';

            if (isManual) {
                indicadorTexto = manualIndicador.trim();
                bcsAsignados = [manualBC];
                indicadoresJson = [
                    {
                        descripcion: indicadorTexto,
                        texto: indicadorTexto,
                        competencia: manualBC,
                        contenido: primerContenido,
                    },
                ];
            } else {
                indicadorTexto = selectedIndicadores.map((i) => i.descripcion).join(' // ');
                const bcsSet = new Set<BCKey>();
                indicadoresJson = selectedIndicadores.map((ind) => {
                    const bc = (bloqueDeCompetencia(ind.competencia, activeNivel) || 'BC1') as BCKey;
                    bcsSet.add(bc);
                    return {
                        id: ind.id,
                        codigo: ind.codigo,
                        descripcion: ind.descripcion,
                        texto: ind.descripcion,
                        competencia: ind.competencia,
                        contenido: primerContenido,
                        contenidoId: selectedContenidos[0]?.id,
                    };
                });
                bcsAsignados = bcsSet.size > 0 ? Array.from(bcsSet) : ['BC1'];
            }

            const nombreFinal =
                nombreActividad.trim() ||
                `Actividad: ${prodFinal.split('/')[0].trim()}${primerContenido ? ` - ${primerContenido.slice(0, 30)}` : ''}`;

            const ok = await onConfirm(indicadorTexto, prodFinal, {
                indicadores_json: indicadoresJson,
                bcAsignados: bcsAsignados,
                nombre: nombreFinal,
                descripcion: primerContenido ? `Contenidos: ${primerContenido}` : null,
                fecha: fecha || new Date().toISOString().split('T')[0],
                puntuacion: 100,
                tipo: 'formativa',
            });

            if (ok) {
                onClose();
                notifyGuideOperationSuccess('actividad_guardar', 'Actividad creada.');
            } else {
                setError('No se pudo guardar la actividad.');
                notifyGuideOperationError('actividad_guardar', 'No se pudo guardar la actividad.');
            }
        } catch {
            setError('Error al guardar la actividad.');
            notifyGuideOperationError('actividad_guardar', 'Error al guardar la actividad.');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <CieloModal
            isOpen={show}
            onClose={onClose}
            maxWidth="2xl"
            className="bg-[#FCFCFA]!"
            title={
                <div className="flex items-center justify-between w-full pr-4 select-none">
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm sm:text-base font-bold text-[#2E3330]">
                            Nueva actividad
                        </span>
                        {curso && (
                            <span className="inline-flex items-center text-[11px] font-semibold text-[#5F665E] bg-[#689C63]/10 px-2.5 py-0.5 rounded-full border border-[#689C63]/20">
                                {curso.grado} {curso.seccion} · {getAsignaturaNombre(activeAsignatura)}
                            </span>
                        )}
                    </div>

                    <button
                        type="button"
                        onClick={() => {
                            setIsManual((prev) => !prev);
                            setError(null);
                        }}
                        className={`text-xs font-semibold px-3 py-1 rounded-full transition-all cursor-pointer flex items-center gap-1.5 ${
                            isManual
                                ? 'bg-[#689C63] text-white shadow-xs'
                                : 'bg-slate-100 hover:bg-slate-200 text-[#5F665E] hover:text-[#2E3330]'
                        }`}
                    >
                        <PenLine size={12} />
                        <span>{isManual ? 'Modo catálogo' : 'Escribir manual'}</span>
                    </button>
                </div>
            }
            footer={
                <div className="flex items-center justify-between w-full select-none">
                    {step > 1 ? (
                        <button
                            type="button"
                            onClick={handlePrev}
                            disabled={isSaving}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-[#5F665E] hover:text-[#2E3330] px-4 py-2 rounded-full hover:bg-slate-100 transition-colors cursor-pointer"
                        >
                            <ChevronLeft size={15} />
                            <span>Anterior</span>
                        </button>
                    ) : (
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isSaving}
                            className="text-xs font-semibold text-[#5F665E] hover:text-[#2E3330] px-4 py-2 rounded-full hover:bg-slate-100 transition-colors cursor-pointer"
                        >
                            Cancelar
                        </button>
                    )}

                    {step < 3 ? (
                        <button
                            type="button"
                            onClick={handleNext}
                            data-guide="modal-actividad-continuar"
                            className="inline-flex items-center gap-1.5 bg-[#689C63] hover:bg-[#588654] text-white text-xs font-bold px-5 py-2 rounded-full shadow-xs transition-all cursor-pointer ml-auto"
                        >
                            <span>Continuar</span>
                            <ChevronRight size={15} />
                        </button>
                    ) : (
                        <button
                            type="button"
                            onClick={handleConfirm}
                            data-guide="modal-actividad-guardar"
                            disabled={isSaving}
                            className="inline-flex items-center gap-1.5 bg-[#689C63] hover:bg-[#588654] disabled:opacity-50 text-white text-xs font-bold px-5 py-2 rounded-full shadow-xs transition-all cursor-pointer ml-auto"
                        >
                            {isSaving ? (
                                <Loader2 size={14} className="animate-spin" />
                            ) : (
                                <Check size={14} strokeWidth={2.5} />
                            )}
                            <span>Crear actividad</span>
                        </button>
                    )}
                </div>
            }
        >
            <div className="space-y-3.5">
                {/* 1. Navegación por pasos compacta y elegante (Píldoras CIELO) */}
                <div className="flex items-center justify-between p-1 bg-slate-100/80 rounded-full border border-slate-200/60 max-w-sm sm:max-w-md mx-auto select-none">
                    {[
                        { id: 1 as const, label: '1. Contenidos' },
                        { id: 2 as const, label: '2. Indicadores' },
                        { id: 3 as const, label: '3. Producto' },
                    ].map((item) => {
                        const isActive = step === item.id;
                        const isPast = step > item.id;
                        const canJump =
                            item.id === 1 ||
                            (item.id === 2 && (selectedContenidoIds.length > 0 || manualContenido.trim())) ||
                            (item.id === 3 &&
                                (selectedContenidoIds.length > 0 || manualContenido.trim()) &&
                                (selectedIndicadorIds.length > 0 || manualIndicador.trim()));

                        return (
                            <button
                                key={item.id}
                                type="button"
                                disabled={!canJump}
                                onClick={() => {
                                    if (canJump) {
                                        setError(null);
                                        setStep(item.id);
                                    }
                                }}
                                className={`flex-1 py-1 px-2.5 sm:px-3 rounded-full text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${
                                    isActive
                                        ? 'bg-white text-[#2E3330] font-bold shadow-xs border border-slate-200/70'
                                        : isPast
                                        ? 'text-[#689C63] hover:text-[#588654] cursor-pointer'
                                        : canJump
                                        ? 'text-[#5F665E] hover:text-[#2E3330] cursor-pointer'
                                        : 'text-slate-400 cursor-default'
                                }`}
                            >
                                {isPast && (
                                    <Check size={12} strokeWidth={2.8} className="text-[#689C63] shrink-0" />
                                )}
                                <span className="truncate">{item.label}</span>
                            </button>
                        );
                    })}
                </div>

                {/* Mensaje de error discreto */}
                {error && (
                    <div className="text-xs font-medium text-[#DB5B48] bg-rose-50/80 px-3.5 py-2 rounded-xl border border-rose-200/80">
                        {error}
                    </div>
                )}

                {/* ============================================================== */}
                {/* PASO 1: CONTENIDOS */}
                {/* ============================================================== */}
                {step === 1 && (
                    <div className="space-y-2.5">
                        {isManual ? (
                            <textarea
                                rows={5}
                                value={manualContenido}
                                onChange={(e) => {
                                    setManualContenido(e.target.value);
                                    if (error) setError(null);
                                }}
                                placeholder="Escribe los contenidos curriculares..."
                                data-guide="modal-actividad-selector-contenidos"
                                className="w-full p-3 rounded-xl border border-slate-200/90 bg-white text-xs sm:text-sm text-[#2E3330] placeholder:text-slate-400 focus:border-[#689C63] focus:ring-2 focus:ring-[#689C63]/10 outline-none resize-none leading-relaxed transition-all"
                            />
                        ) : (
                            <>
                                <div className="relative">
                                    <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                    <input
                                        type="text"
                                        value={searchContenido}
                                        onChange={(e) => setSearchContenido(e.target.value)}
                                        placeholder="Buscar por palabra clave o eje..."
                                        className="w-full pl-9 pr-9 py-2 rounded-full border border-slate-200/90 bg-white text-xs sm:text-sm text-[#2E3330] placeholder:text-slate-400 focus:border-[#689C63] focus:ring-2 focus:ring-[#689C63]/10 outline-none transition-all"
                                    />
                                    {searchContenido && (
                                        <button
                                            type="button"
                                            onClick={() => setSearchContenido('')}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                                        >
                                            <X size={13} />
                                        </button>
                                    )}
                                </div>

                                {isLoading ? (
                                    <div className="flex items-center justify-center py-8 gap-2 text-slate-400 text-xs">
                                        <Loader2 size={14} className="animate-spin text-[#689C63]" />
                                        <span>Cargando contenidos...</span>
                                    </div>
                                ) : filteredContenidos.length === 0 ? (
                                    <div className="py-8 text-center text-slate-400 text-xs font-medium">
                                        No se encontraron contenidos con este criterio.
                                    </div>
                                ) : (
                                    <div data-guide="modal-actividad-selector-contenidos" className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
                                        {filteredContenidos.map((item) => {
                                            const isSelected = selectedContenidoIds.includes(item.id);
                                            const eje = item.contenido_json && ((item.contenido_json as ContenidoJson).bloque || (item.contenido_json as { eje?: string }).eje);

                                            return (
                                                <div
                                                    key={item.id}
                                                    data-guide="item-contenido"
                                                    onClick={() => {
                                                        toggleContenido(item.id);
                                                        if (document.body.classList.contains('cielo-guide-active') && !isSelected) {
                                                            window.setTimeout(() => setStep(2), 180);
                                                        }
                                                    }}
                                                    className={`px-3 py-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 select-none ${
                                                        isSelected
                                                            ? 'bg-[#689C63]/8 border-[#689C63]'
                                                            : 'bg-white hover:bg-slate-50/80 border-slate-200/80'
                                                    }`}
                                                >
                                                    <div className="min-w-0 flex-1">
                                                        {eje && (
                                                            <span className="inline-block text-[10px] font-bold uppercase tracking-wider text-[#6B7280] bg-slate-100 px-2 py-0.5 rounded-full mb-1">
                                                                {eje}
                                                            </span>
                                                        )}
                                                        <p className="text-xs sm:text-[13px] font-medium text-[#2E3330] leading-snug">
                                                            {item.contenido}
                                                        </p>
                                                    </div>

                                                    <div
                                                        className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 border transition-all ${
                                                            isSelected
                                                                ? 'bg-[#689C63] border-[#689C63] text-white'
                                                                : 'border-slate-300 bg-white'
                                                        }`}
                                                    >
                                                        {isSelected && <Check size={11} strokeWidth={3} />}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                )}

                {/* ============================================================== */}
                {/* PASO 2: INDICADORES */}
                {/* ============================================================== */}
                {step === 2 && (
                    <div className="space-y-2.5">
                        {isManual ? (
                            <div data-guide="modal-actividad-selector-indicadores" className="space-y-2.5">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                    {(['BC1', 'BC2', 'BC3', 'BC4'] as BCKey[]).map((bc) => {
                                        const colorBC = COLORES_BLOQUE_CF[bc] || '#689C63';
                                        const isSelected = manualBC === bc;
                                        return (
                                            <button
                                                key={bc}
                                                type="button"
                                                onClick={() => setManualBC(bc)}
                                                className={`text-xs font-bold px-3.5 py-1 rounded-full border transition-all cursor-pointer ${
                                                    isSelected
                                                        ? 'text-white border-transparent shadow-xs'
                                                        : 'bg-white text-[#6B7280] border-slate-200 hover:text-[#2E3330]'
                                                }`}
                                                style={isSelected ? { backgroundColor: colorBC } : undefined}
                                            >
                                                {bc}
                                            </button>
                                        );
                                    })}
                                </div>
                                <textarea
                                    rows={5}
                                    value={manualIndicador}
                                    onChange={(e) => {
                                        setManualIndicador(e.target.value);
                                        if (error) setError(null);
                                    }}
                                    placeholder="Escribe el indicador de logro..."
                                    className="w-full p-3 rounded-xl border border-slate-200/90 bg-white text-xs sm:text-sm text-[#2E3330] placeholder:text-slate-400 focus:border-[#689C63] focus:ring-2 focus:ring-[#689C63]/10 outline-none resize-none leading-relaxed transition-all"
                                />
                            </div>
                        ) : (
                            <>
                                <div className="relative">
                                    <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                    <input
                                        type="text"
                                        value={searchIndicador}
                                        onChange={(e) => setSearchIndicador(e.target.value)}
                                        placeholder="Buscar por palabra clave o código..."
                                        className="w-full pl-9 pr-9 py-2 rounded-full border border-slate-200/90 bg-white text-xs sm:text-sm text-[#2E3330] placeholder:text-slate-400 focus:border-[#689C63] focus:ring-2 focus:ring-[#689C63]/10 outline-none transition-all"
                                    />
                                    {searchIndicador && (
                                        <button
                                            type="button"
                                            onClick={() => setSearchIndicador('')}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                                        >
                                            <X size={13} />
                                        </button>
                                    )}
                                </div>

                                {filteredIndicadores.length === 0 ? (
                                    <div className="py-8 text-center text-slate-400 text-xs font-medium">
                                        No se encontraron indicadores para los contenidos seleccionados.
                                    </div>
                                ) : (
                                    <div data-guide="modal-actividad-selector-indicadores" className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
                                        {filteredIndicadores.map((ind) => {
                                            const isSelected = selectedIndicadorIds.includes(ind.id);
                                            const bc = (bloqueDeCompetencia(ind.competencia, activeNivel) || 'BC1') as BCKey;
                                            const colorBC = COLORES_BLOQUE_CF[bc] || '#689C63';

                                            return (
                                                <div
                                                    key={ind.id}
                                                    data-guide="item-indicador"
                                                    onClick={() => {
                                                        toggleIndicador(ind.id);
                                                        if (document.body.classList.contains('cielo-guide-active') && !isSelected) {
                                                            window.setTimeout(() => setStep(3), 180);
                                                        }
                                                    }}
                                                    className={`px-3 py-2.5 rounded-xl border transition-all cursor-pointer flex items-start justify-between gap-3 select-none ${
                                                        isSelected
                                                            ? 'bg-[#689C63]/8 border-[#689C63]'
                                                            : 'bg-white hover:bg-slate-50/80 border-slate-200/80'
                                                    }`}
                                                >
                                                    <div className="min-w-0 flex-1">
                                                        <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                                                            <span
                                                                className="text-[10px] font-bold px-2 py-0.5 rounded-full text-white leading-none tracking-wide"
                                                                style={{ backgroundColor: colorBC }}
                                                            >
                                                                {bc}
                                                            </span>
                                                            {ind.codigo && (
                                                                <span className="text-[10px] font-semibold text-[#6B7280]">
                                                                    {ind.codigo}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <p className="text-xs sm:text-[13px] font-medium text-[#2E3330] leading-snug">
                                                            {ind.descripcion}
                                                        </p>
                                                    </div>

                                                    <div
                                                        className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 border mt-0.5 transition-all ${
                                                            isSelected
                                                                ? 'bg-[#689C63] border-[#689C63] text-white'
                                                                : 'border-slate-300 bg-white'
                                                        }`}
                                                    >
                                                        {isSelected && <Check size={11} strokeWidth={3} />}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                )}

                {/* ============================================================== */}
                {/* PASO 3: PRODUCTO */}
                {/* ============================================================== */}
                {step === 3 && (
                    <div data-guide="modal-actividad-producto" className="space-y-3">
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-1.5">
                            {OPCIONES_PRODUCTO.map((opcion) => {
                                const isSelected = selectedProducto === opcion && !customProducto.trim();
                                return (
                                    <button
                                        key={opcion}
                                        type="button"
                                        data-guide="item-producto"
                                        onClick={() => {
                                            setSelectedProducto(opcion);
                                            setCustomProducto('');
                                            if (error) setError(null);
                                        }}
                                        className={`px-3 py-2 rounded-full text-xs font-semibold border transition-all cursor-pointer flex items-center justify-between gap-1 text-left ${
                                            isSelected
                                                ? 'bg-[#689C63] text-white border-[#689C63] shadow-xs'
                                                : 'bg-white hover:bg-slate-50 text-[#2E3330] border-slate-200/80'
                                        }`}
                                    >
                                        <span className="truncate">{opcion}</span>
                                        {isSelected && <Check size={12} strokeWidth={2.8} className="shrink-0" />}
                                    </button>
                                );
                            })}
                        </div>

                        <div>
                            <input
                                type="text"
                                value={customProducto}
                                data-guide="modal-actividad-producto-input"
                                onChange={(e) => {
                                    setCustomProducto(e.target.value);
                                    if (e.target.value) setSelectedProducto('');
                                    if (error) setError(null);
                                }}
                                placeholder="O escribe un producto personalizado..."
                                className="w-full px-3.5 py-2 rounded-xl border border-slate-200/90 bg-white text-xs sm:text-sm text-[#2E3330] placeholder:text-slate-400 focus:border-[#689C63] focus:ring-2 focus:ring-[#689C63]/10 outline-none transition-all"
                            />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-100">
                            <div>
                                <label className="text-[11px] font-bold text-[#6B7280] uppercase tracking-wider block mb-1">
                                    Fecha programada
                                </label>
                                <input
                                    type="date"
                                    value={fecha}
                                    onChange={(e) => setFecha(e.target.value)}
                                    className="w-full px-3 py-2 rounded-xl border border-slate-200/90 bg-white text-xs sm:text-sm text-[#2E3330] font-medium focus:border-[#689C63] focus:ring-2 focus:ring-[#689C63]/10 outline-none transition-all"
                                />
                            </div>

                            <div>
                                <label className="text-[11px] font-bold text-[#6B7280] uppercase tracking-wider block mb-1">
                                    Nombre de la actividad (opcional)
                                </label>
                                <input
                                    type="text"
                                    value={nombreActividad}
                                    onChange={(e) => setNombreActividad(e.target.value)}
                                    placeholder="Ej: Actividad 1 - Lectura guiada"
                                    className="w-full px-3 py-2 rounded-xl border border-slate-200/90 bg-white text-xs sm:text-sm text-[#2E3330] placeholder:text-slate-400 focus:border-[#689C63] focus:ring-2 focus:ring-[#689C63]/10 outline-none transition-all"
                                />
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </CieloModal>
    );
};

export default AgregarActividadModal;
