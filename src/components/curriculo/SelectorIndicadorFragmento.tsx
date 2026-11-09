import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
    Highlighter,
    Check,
    RotateCcw,
    BookOpen,
    AlertCircle,
    Loader2,
    ChevronDown,
    Search,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import {
    claveGrado,
    filtrarIndicadores,
    filtrarContenidos,
    bloqueDeCompetencia,
    COLORES_BLOQUE_CF,
    mismaAsignatura,
    normalizarTexto,
} from '../../lib/curriculo';
import { esAsignaturaOptativa, getAsignaturaNombre } from '../../constants/asignaturas';
import type { FilaIndicador, FilaContenido, BloqueCF } from '../../types/especificaciones';
import type { BCKey } from '../../types';
import { CieloPill } from '../ui/CieloPill';

export interface IndicadorJsonItem {
    id?: string;
    codigo?: string | null;
    descripcion: string;
    texto?: string;
    fragmento?: string | null;
    competencia?: string;
    contenido?: string;
    contenidoId?: string;
}

export interface SelectorIndicadorData {
    indicadorTexto: string;
    fragmento: string | null;
    indicadoresJson: IndicadorJsonItem[];
    bcSugerido?: BCKey | null;
    contenido?: string | null;
    contenidoId?: string | null;
}

export interface SelectorIndicadorFragmentoProps {
    grado?: string | null;
    asignatura?: string | null;
    cursoId?: number | null;
    periodo?: string | null;
    initialIndicador?: string;
    initialFragmento?: string | null;
    onChange: (data: SelectorIndicadorData) => void;
    disabled?: boolean;
}

// Palabras vacías en español a ignorar en afinidad curricular
const STOP_WORDS = new Set([
    'la', 'el', 'los', 'las', 'un', 'una', 'unos', 'unas',
    'de', 'del', 'al', 'en', 'con', 'por', 'para', 'sobre', 'entre', 'sin', 'tras', 'hacia', 'desde', 'hasta',
    'como', 'sus', 'su', 'que', 'cual', 'cuales', 'quien', 'quienes',
    'este', 'esta', 'estos', 'estas', 'ese', 'esa', 'esos', 'esas', 'aquel', 'aquella',
    'y', 'e', 'o', 'u', 'pero', 'mas', 'sino', 'segun',
    'tipo', 'tipos', 'uso', 'usos', 'caso', 'casos', 'parte', 'partes',
    'forma', 'formas', 'manera', 'maneras', 'modo', 'modos',
    'diversos', 'diversas', 'diferentes', 'distintos', 'distintas',
    'general', 'generales', 'basico', 'basicos', 'basica', 'basicas'
]);

// Palabras genéricas pedagógicas que no confieren alta afinidad por sí solas
const PALABRAS_GENERICAS = new Set([
    'funcion', 'estructura', 'concepto', 'conceptos', 'definicion', 'elementos',
    'clasificacion', 'caracteristicas', 'importancia', 'desarrollo', 'proceso'
]);

interface PalabraClave {
    termino: string;
    raiz: string;
    peso: number;
}

interface AfinidadResultado {
    score: number;
    esPlanificado: boolean;
    periodoPlanificado?: string | null;
    esRecomendado: boolean;
    etiquetaAfinidad?: string;
}

function extraerPalabrasClaveContenido(contenido: FilaContenido): PalabraClave[] {
    const kws: PalabraClave[] = [];
    const vistos = new Set<string>();

    const agregarPalabra = (palabra: string, pesoBase: number) => {
        const norm = normalizarTexto(palabra).replace(/[^a-z0-9]/g, '');
        if (norm.length < 4 || STOP_WORDS.has(norm) || vistos.has(norm)) return;
        vistos.add(norm);

        const peso = PALABRAS_GENERICAS.has(norm) ? Math.min(pesoBase, 8) : pesoBase;
        const raiz = norm.replace(/(?:es|as|os|s)$/, '');
        kws.push({
            termino: norm,
            raiz: raiz.length >= 4 ? raiz : norm,
            peso,
        });
    };

    // 1. Título principal del contenido (peso 35)
    if (contenido.contenido) {
        const palabras = normalizarTexto(contenido.contenido).split(/[\s,.:;()/-]+/);
        for (const p of palabras) {
            agregarPalabra(p, 35);
        }
    }

    // 2. Conceptos en contenido_json (peso 15)
    if (contenido.contenido_json && typeof contenido.contenido_json === 'object') {
        const cJson = contenido.contenido_json as { conceptos?: string[]; procedimientos?: string[] };
        if (Array.isArray(cJson.conceptos)) {
            for (const c of cJson.conceptos) {
                if (typeof c === 'string') {
                    const palabras = normalizarTexto(c).split(/[\s,.:;()/-]+/);
                    for (const p of palabras) {
                        agregarPalabra(p, 15);
                    }
                }
            }
        }
        // 3. Procedimientos en contenido_json (peso 10)
        if (Array.isArray(cJson.procedimientos)) {
            for (const proc of cJson.procedimientos) {
                if (typeof proc === 'string') {
                    const palabras = normalizarTexto(proc).split(/[\s,.:;()/-]+/);
                    for (const p of palabras) {
                        agregarPalabra(p, 10);
                    }
                }
            }
        }
    }

    return kws;
}

function calcularAfinidadIndicador(
    indicador: FilaIndicador,
    contenido: FilaContenido | null,
    periodoPlan: {
        contenidos: Array<{ contenido_id?: string; contenido?: string }>;
        indicadores: Array<{ curr_indicador_id?: string; codigo?: string | null }>;
        periodo?: string;
    } | null,
    periodoActivo?: string | null,
    palabrasClavePrecalculadas?: PalabraClave[]
): AfinidadResultado {
    if (!contenido) {
        return { score: 0, esPlanificado: false, esRecomendado: false };
    }

    let score = 0;
    let esPlanificado = false;
    let esRecomendado = false;
    let periodoLabel: string | null = null;
    let etiquetaAfinidad: string | undefined;

    // Nivel 1: Planificación operativa del período (pc_especificacion_periodos)
    if (periodoPlan) {
        const contNorm = normalizarTexto(contenido.contenido);
        const contEstaEnPlan = (periodoPlan.contenidos || []).some(
            (c) =>
                c.contenido_id === contenido.id ||
                normalizarTexto(c.contenido) === contNorm
        );

        if (contEstaEnPlan) {
            const indEstaEnPlan = (periodoPlan.indicadores || []).some(
                (i) =>
                    i.curr_indicador_id === indicador.id ||
                    (i.codigo &&
                        indicador.codigo &&
                        normalizarTexto(i.codigo) === normalizarTexto(indicador.codigo))
            );

            if (indEstaEnPlan) {
                score += 100;
                esPlanificado = true;
                periodoLabel = periodoPlan.periodo || periodoActivo || 'P2';
                etiquetaAfinidad = `Planificado en ${periodoLabel}`;
            }
        }
    }

    // Nivel 2: Afinidad Semántica y Curricular MINERD
    const palabrasClave = palabrasClavePrecalculadas || extraerPalabrasClaveContenido(contenido);
    const descNorm = normalizarTexto(indicador.descripcion);

    let coincidencias = 0;
    for (const kw of palabrasClave) {
        if (descNorm.includes(kw.termino)) {
            coincidencias += kw.peso;
        } else if (kw.raiz && descNorm.includes(kw.raiz)) {
            coincidencias += Math.round(kw.peso * 0.8);
        }
    }

    if (coincidencias >= 25) {
        score += coincidencias;
        esRecomendado = true;
        if (!etiquetaAfinidad) {
            etiquetaAfinidad = 'Recomendado';
        }
    }

    return {
        score,
        esPlanificado,
        periodoPlanificado: periodoLabel,
        esRecomendado: esPlanificado || esRecomendado,
        etiquetaAfinidad,
    };
}

// Cachés en memoria para consultas rápidas
const cacheIndicadores = new Map<string, FilaIndicador[]>();
const cacheContenidos = new Map<string, FilaContenido[]>();
const cacheEspecificaciones = new Map<string, any>();

export const SelectorIndicadorFragmento: React.FC<SelectorIndicadorFragmentoProps> = ({
    grado,
    asignatura,
    cursoId,
    periodo,
    initialIndicador = '',
    initialFragmento = null,
    onChange,
    disabled = false,
}) => {
    const [indicadores, setIndicadores] = useState<FilaIndicador[]>([]);
    const [contenidos, setContenidos] = useState<FilaContenido[]>([]);
    const [periodoPlan, setPeriodoPlan] = useState<{
        contenidos: Array<{ contenido_id?: string; contenido?: string }>;
        indicadores: Array<{ curr_indicador_id?: string; codigo?: string | null }>;
        periodo?: string;
    } | null>(null);

    const [cargando, setCargando] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Selección de contenido en la cuadrícula horizontal compacta
    const [selectedContenidoId, setSelectedContenidoId] = useState<string | null>(null);

    // Indicador activo seleccionado y su contenido asociado
    const [selectedIndicadorId, setSelectedIndicadorId] = useState<string>('');
    const [activeContenido, setActiveContenido] = useState<{ id: string; titulo: string } | null>(null);

    // Fragmento interactivo
    const [fragmento, setFragmento] = useState<string | null>(initialFragmento);
    const [pendingSelection, setPendingSelection] = useState<string>('');

    // Control de acordeón secundario y búsqueda
    const [showOtherIndicators, setShowOtherIndicators] = useState<boolean>(false);
    const [filtro, setFiltro] = useState<string>('');

    // Modo manual
    const [isManual, setIsManual] = useState<boolean>(false);
    const [manualText, setManualText] = useState<string>(initialIndicador);

    const textContainerRef = useRef<HTMLDivElement>(null);

    // 1. Cargar curr_indicadores, curr_contenidos y plan operativo
    useEffect(() => {
        if (!grado || !asignatura) {
            setIndicadores([]);
            setContenidos([]);
            setPeriodoPlan(null);
            return;
        }

        const cacheKey = `${grado}__${asignatura}`.toLowerCase();
        let isMounted = true;

        const cargarDatos = async () => {
            setCargando(true);
            setError(null);
            try {
                const gradoCanonico = claveGrado(grado) || grado;
                const espCacheKey = `${cursoId}__${asignatura}__${periodo || ''}`.toLowerCase();
                const isOptativa = esAsignaturaOptativa(asignatura);

                // 1. Tarea concurrente: curr_indicadores (se omite en asignaturas optativas para no realizar peticiones innecesarias al catálogo oficial)
                const fetchIndicadoresPromise = (async (): Promise<FilaIndicador[]> => {
                    if (isOptativa) return [];
                    if (cacheIndicadores.has(cacheKey)) {
                        return cacheIndicadores.get(cacheKey)!;
                    }
                    let qInds = supabase
                        .from('curr_indicadores')
                        .select('id, grado, asignatura, competencia, codigo, descripcion, is_active')
                        .eq('is_active', true);

                    if (gradoCanonico) {
                        qInds = qInds.eq('grado', gradoCanonico);
                    }
                    const resInds = await qInds;
                    if (resInds.error) throw resInds.error;

                    let rawInds = (resInds.data as FilaIndicador[]) || [];
                    if (rawInds.length === 0 && grado && grado !== gradoCanonico) {
                        const retryInds = await supabase
                            .from('curr_indicadores')
                            .select('id, grado, asignatura, competencia, codigo, descripcion, is_active')
                            .eq('grado', grado)
                            .eq('is_active', true)
                            .limit(100);
                        if (retryInds.data && retryInds.data.length > 0) {
                            rawInds = retryInds.data as FilaIndicador[];
                        }
                    }
                    const inds = filtrarIndicadores(rawInds, grado, asignatura);
                    cacheIndicadores.set(cacheKey, inds);
                    return inds;
                })();

                // 2. Tarea concurrente: curr_contenidos (se omite en asignaturas optativas)
                const fetchContenidosPromise = (async (): Promise<FilaContenido[]> => {
                    if (isOptativa) return [];
                    if (cacheContenidos.has(cacheKey)) {
                        return cacheContenidos.get(cacheKey)!;
                    }
                    let qConts = supabase
                        .from('curr_contenidos')
                        .select('id, grado, asignatura, contenido, contenido_json');

                    if (gradoCanonico) {
                        qConts = qConts.eq('grado', gradoCanonico);
                    }
                    const resConts = await qConts;
                    if (resConts.error) {
                        console.warn('[SelectorIndicadorFragmento] Advertencia al consultar curr_contenidos:', resConts.error);
                    }

                    let rawConts = (resConts.data as FilaContenido[]) || [];
                    if (rawConts.length === 0 && grado && grado !== gradoCanonico) {
                        const retryConts = await supabase
                            .from('curr_contenidos')
                            .select('id, grado, asignatura, contenido, contenido_json')
                            .eq('grado', grado)
                            .limit(60);
                        if (retryConts.data && retryConts.data.length > 0) {
                            rawConts = retryConts.data as FilaContenido[];
                        }
                    }
                    const conts = filtrarContenidos(rawConts, grado, asignatura);
                    cacheContenidos.set(cacheKey, conts);
                    return conts;
                })();

                // 3. Tarea concurrente: pc_especificaciones + pc_especificacion_periodos
                const fetchEspecificacionesPromise = (async (): Promise<{
                    contenidos: Array<{ contenido_id?: string; contenido?: string }>;
                    indicadores: Array<{ curr_indicador_id?: string; codigo?: string | null }>;
                    periodo?: string;
                } | null> => {
                    if (cacheEspecificaciones.has(espCacheKey)) {
                        return cacheEspecificaciones.get(espCacheKey);
                    }
                    if (!cursoId) return null;
                    try {
                        const { data: espData } = await supabase
                            .from('pc_especificaciones')
                            .select('id, grado, asignatura, pc_especificacion_periodos(id, periodo, contenidos, indicadores)')
                            .eq('curso_id', cursoId);

                        const esp = espData?.find((e: any) => mismaAsignatura(e.asignatura, asignatura));
                        let planPeriodo: any = null;
                        if (esp) {
                            let perData: any[] = [];
                            if (Array.isArray((esp as any).pc_especificacion_periodos)) {
                                perData = (esp as any).pc_especificacion_periodos;
                            } else if (esp.id) {
                                // Fallback seguro
                                const { data: fbPer } = await supabase
                                    .from('pc_especificacion_periodos')
                                    .select('id, periodo, contenidos, indicadores')
                                    .eq('especificacion_id', esp.id);
                                if (fbPer) perData = fbPer;
                            }

                            if (perData.length > 0) {
                                const pTarget = periodo
                                    ? perData.find((p) => p.periodo === periodo) || perData[0]
                                    : perData[0];
                                if (pTarget) {
                                    planPeriodo = {
                                        contenidos: (pTarget.contenidos as any[]) || [],
                                        indicadores: (pTarget.indicadores as any[]) || [],
                                        periodo: pTarget.periodo,
                                    };
                                }
                            }
                        }
                        cacheEspecificaciones.set(espCacheKey, planPeriodo);
                        return planPeriodo;
                    } catch (planErr) {
                        console.warn('[SelectorIndicadorFragmento] No se pudo cargar pc_especificaciones:', planErr);
                        return null;
                    }
                })();

                // Ejecución 100% paralela de las tres fuentes
                const [indsFiltrados, contsFiltrados, planPeriodoEncontrado] = await Promise.all([
                    fetchIndicadoresPromise,
                    fetchContenidosPromise,
                    fetchEspecificacionesPromise
                ]);

                if (isMounted) {
                    setIndicadores(indsFiltrados);
                    setContenidos(contsFiltrados);
                    setPeriodoPlan(planPeriodoEncontrado);

                    if (isOptativa && indsFiltrados.length === 0) {
                        setIsManual(true);
                    } else if (!isOptativa && indsFiltrados.length > 0) {
                        setIsManual(false);
                    }

                    // Seleccionar por defecto el primer contenido o el planificado en este período
                    if (contsFiltrados.length > 0 && !selectedContenidoId) {
                        const contPlanificado = planPeriodoEncontrado?.contenidos?.[0];
                        const matchPlan = contPlanificado
                            ? contsFiltrados.find(
                                  (c) =>
                                      c.id === contPlanificado.contenido_id ||
                                      normalizarTexto(c.contenido) === normalizarTexto(contPlanificado.contenido)
                              )
                            : null;

                        const elegido = matchPlan || contsFiltrados[0];
                        setSelectedContenidoId(elegido.id);
                        if (!activeContenido) {
                            setActiveContenido({ id: elegido.id, titulo: elegido.contenido });
                        }
                    }

                    // Si hay un initialIndicador, vincularlo
                    if (initialIndicador && !selectedIndicadorId) {
                        const matchInd = indsFiltrados.find(
                            (i) =>
                                normalizarTexto(i.descripcion) === normalizarTexto(initialIndicador) ||
                                (i.codigo && normalizarTexto(i.codigo) === normalizarTexto(initialIndicador))
                        );
                        if (matchInd) {
                            setSelectedIndicadorId(matchInd.id);
                        }
                    }
                }
            } catch (err: any) {
                console.error('[SelectorIndicadorFragmento] Error consultando catálogo curricular:', err);
                if (isMounted) {
                    setError('No se pudieron consultar los contenidos e indicadores curriculares.');
                }
            } finally {
                if (isMounted) {
                    setCargando(false);
                }
            }
        };

        cargarDatos();

        return () => {
            isMounted = false;
        };
    }, [grado, asignatura, cursoId, periodo]);

    // Objeto de contenido actualmente enfocado en la cuadrícula
    const selectedContenidoObj = useMemo<FilaContenido | null>(() => {
        if (!selectedContenidoId) return contenidos[0] || null;
        return contenidos.find((c) => c.id === selectedContenidoId) || contenidos[0] || null;
    }, [contenidos, selectedContenidoId]);

    // Indicador activo seleccionado
    const selectedIndicador = useMemo(
        () => indicadores.find((i) => i.id === selectedIndicadorId) || null,
        [indicadores, selectedIndicadorId]
    );

    // Palabras clave extraídas del contenido enfocado
    const palabrasClaveContenido = useMemo(() => {
        if (!selectedContenidoObj) return [];
        return extraerPalabrasClaveContenido(selectedContenidoObj);
    }, [selectedContenidoObj]);

    // Emisión hacia el componente padre
    const emitChange = useCallback(
        (
            ind: FilaIndicador | null,
            frag: string | null,
            customText?: string,
            contObj?: { id: string; titulo: string } | null
        ) => {
            const currentCont = contObj !== undefined ? contObj : activeContenido;
            if (ind) {
                const bcBloque = bloqueDeCompetencia(ind.competencia) as BCKey | null;
                const textoFinal = frag && frag.trim() ? frag.trim() : ind.descripcion;
                onChange({
                    indicadorTexto: textoFinal,
                    fragmento: frag && frag.trim() ? frag.trim() : null,
                    indicadoresJson: [
                        {
                            id: ind.id,
                            codigo: ind.codigo,
                            descripcion: ind.descripcion,
                            texto: ind.descripcion,
                            fragmento: frag && frag.trim() ? frag.trim() : null,
                            competencia: ind.competencia,
                            contenido: currentCont?.titulo,
                            contenidoId: currentCont?.id,
                        },
                    ],
                    bcSugerido: bcBloque,
                    contenido: currentCont?.titulo || null,
                    contenidoId: currentCont?.id || null,
                });
            } else {
                const txt = (customText ?? manualText).trim();
                onChange({
                    indicadorTexto: txt,
                    fragmento: null,
                    indicadoresJson: txt
                        ? [
                              {
                                  descripcion: txt,
                                  texto: txt,
                                  fragmento: null,
                                  contenido: currentCont?.titulo,
                                  contenidoId: currentCont?.id,
                              },
                          ]
                        : [],
                    bcSugerido: null,
                    contenido: currentCont?.titulo || null,
                    contenidoId: currentCont?.id || null,
                });
            }
        },
        [onChange, manualText, activeContenido]
    );

    // Selección de contenido en la cuadrícula compacta
    const handleSelectContenido = (cont: FilaContenido) => {
        setSelectedContenidoId(cont.id);
        // Si aún no hay indicador seleccionado, establecer este contenido como el activo
        if (!selectedIndicadorId) {
            setActiveContenido({ id: cont.id, titulo: cont.contenido });
        }
    };

    // Selección de un indicador de logro
    const handleSelectIndicador = (ind: FilaIndicador) => {
        setIsManual(false);
        setSelectedIndicadorId(ind.id);
        const contActual = selectedContenidoObj
            ? { id: selectedContenidoObj.id, titulo: selectedContenidoObj.contenido }
            : activeContenido;
        setActiveContenido(contActual);
        setFragmento(null);
        setPendingSelection('');
        emitChange(ind, null, undefined, contActual);
    };

    // Selección de texto con ratón / touch para fragmento
    const handleMouseUp = () => {
        if (!selectedIndicador || isManual) return;
        const sel = window.getSelection();
        if (!sel || sel.isCollapsed) {
            setPendingSelection('');
            return;
        }

        const text = sel.toString().trim();
        if (text && selectedIndicador.descripcion.includes(text)) {
            setPendingSelection(text);
        } else {
            setPendingSelection('');
        }
    };

    // Aplicar fragmento resaltado
    const handleApplyFragmento = (textToApply?: string) => {
        const target = (textToApply || pendingSelection).trim();
        if (!target || !selectedIndicador) return;

        setFragmento(target);
        setPendingSelection('');
        if (window.getSelection) {
            window.getSelection()?.removeAllRanges();
        }
        emitChange(selectedIndicador, target);
    };

    // Quitar fragmento
    const handleRemoveFragmento = () => {
        setFragmento(null);
        setPendingSelection('');
        if (selectedIndicador) {
            emitChange(selectedIndicador, null);
        }
    };

    // Modo manual
    const handleManualChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const val = e.target.value;
        setManualText(val);
        emitChange(null, null, val);
    };

    // Cálculo reactivo de afinidad para todos los indicadores según el contenido actualmente seleccionado
    const { indicadoresAfines, indicadoresSecundarios } = useMemo(() => {
        const afines: Array<{ indicador: FilaIndicador; afinidad: AfinidadResultado }> = [];
        const secundarios: Array<{ indicador: FilaIndicador; afinidad: AfinidadResultado }> = [];
        const query = normalizarTexto(filtro);

        for (const ind of indicadores) {
            // Filtro por buscador
            if (
                query &&
                !normalizarTexto(ind.codigo).includes(query) &&
                !normalizarTexto(ind.descripcion).includes(query) &&
                !normalizarTexto(ind.competencia).includes(query)
            ) {
                continue;
            }

            const afinidad = calcularAfinidadIndicador(
                ind,
                selectedContenidoObj,
                periodoPlan,
                periodo,
                palabrasClaveContenido
            );

            if (afinidad.esRecomendado || afinidad.esPlanificado) {
                afines.push({ indicador: ind, afinidad });
            } else {
                secundarios.push({ indicador: ind, afinidad });
            }
        }

        // Ordenar afines: planificados primero, luego por score de afinidad, luego por código
        afines.sort((a, b) => {
            if (a.afinidad.esPlanificado && !b.afinidad.esPlanificado) return -1;
            if (!a.afinidad.esPlanificado && b.afinidad.esPlanificado) return 1;
            if (b.afinidad.score !== a.afinidad.score) {
                return b.afinidad.score - a.afinidad.score;
            }
            const numA = parseInt((a.indicador.codigo || '').replace(/\D/g, ''), 10) || 999;
            const numB = parseInt((b.indicador.codigo || '').replace(/\D/g, ''), 10) || 999;
            return numA - numB;
        });

        // Ordenar secundarios por código numérico
        secundarios.sort((a, b) => {
            const numA = parseInt((a.indicador.codigo || '').replace(/\D/g, ''), 10) || 999;
            const numB = parseInt((b.indicador.codigo || '').replace(/\D/g, ''), 10) || 999;
            return numA - numB;
        });

        return { indicadoresAfines: afines, indicadoresSecundarios: secundarios };
    }, [indicadores, selectedContenidoObj, periodoPlan, periodo, palabrasClaveContenido, filtro]);

    // Pre-cálculo de palabras clave por contenido (evita re-extraer regex en cada pulsación del filtro)
    const mapaPalabrasClaveContenidos = useMemo(() => {
        const mapa = new Map<string, PalabraClave[]>();
        for (const c of contenidos) {
            mapa.set(c.id, extraerPalabrasClaveContenido(c));
        }
        return mapa;
    }, [contenidos]);

    // Contenidos filtrados por el buscador
    const contenidosFiltrados = useMemo(() => {
        const query = normalizarTexto(filtro);
        if (!query) return contenidos;

        return contenidos.filter((c) => {
            const coincideTitulo = normalizarTexto(c.contenido).includes(query);
            const kws = mapaPalabrasClaveContenidos.get(c.id) || [];
            const coincideKw = kws.some((k) => k.termino.includes(query) || query.includes(k.termino));
            return coincideTitulo || coincideKw;
        });
    }, [contenidos, filtro, mapaPalabrasClaveContenidos]);

    // Renderizado del texto con fragmento resaltado en el indicador activo
    const renderHighlightedText = () => {
        if (!selectedIndicador) return null;
        const full = selectedIndicador.descripcion;

        if (!fragmento) {
            return (
                <p className="text-xs sm:text-[13px] text-[#2E3330] leading-relaxed select-text font-normal">
                    {full}
                </p>
            );
        }

        const idx = full.indexOf(fragmento);
        if (idx === -1) {
            return (
                <p className="text-xs sm:text-[13px] text-[#2E3330] leading-relaxed select-text font-normal">
                    {full}
                </p>
            );
        }

        const before = full.slice(0, idx);
        const match = full.slice(idx, idx + fragmento.length);
        const after = full.slice(idx + fragmento.length);

        return (
            <p className="text-xs sm:text-[13px] text-[#2E3330] leading-relaxed select-text font-normal">
                {before}
                <mark
                    title="Fragmento que se evaluará con esta actividad"
                    className="bg-[#BFC9A6]/50 text-[#1E2421] font-semibold px-1 py-0.5 rounded border border-[#9CAE7E]/50 underline decoration-[#7D935E] decoration-2 mx-0.5"
                >
                    {match}
                </mark>
                {after}
            </p>
        );
    };

    const bcBloque = selectedIndicador
        ? (bloqueDeCompetencia(selectedIndicador.competencia) as BloqueCF | null)
        : null;
    const colorBc = bcBloque ? COLORES_BLOQUE_CF[bcBloque] : undefined;

    return (
        <div className="space-y-3.5">
            {cargando ? (
                <div className="flex items-center gap-2.5 p-3.5 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-700 font-medium">
                    <Loader2 size={16} className="animate-spin text-[#689C63]" />
                    <span>Cargando contenidos e indicadores de {grado || 'curso'}…</span>
                </div>
            ) : error ? (
                <div className="flex items-center gap-2.5 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs sm:text-sm text-rose-800 font-medium">
                    <AlertCircle size={16} className="shrink-0 text-rose-600" />
                    <span>{error}</span>
                </div>
            ) : !isManual ? (
                <div className="space-y-3">
                    {/* Ficha interactiva del indicador seleccionado (permanece visible al explorar) */}
                    {selectedIndicador && (
                        <div className="bg-[#FAF7F2] border border-[#689C63]/50 rounded-xl p-3.5 space-y-2.5 shadow-xs transition-all">
                            {/* Cabecera del indicador activo */}
                            <div className="flex items-center justify-between gap-2 border-b border-black/10 pb-2 flex-wrap">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                                        <Check size={13} className="text-[#689C63]" strokeWidth={3} /> Indicador activo:
                                    </span>
                                    {selectedIndicador.codigo && (
                                        <span className="text-[11px] font-black uppercase tracking-wider bg-slate-800 text-white px-2 py-0.5 rounded-md">
                                            {selectedIndicador.codigo}
                                        </span>
                                    )}
                                    {bcBloque && (
                                        <span
                                            style={{ borderColor: colorBc, color: colorBc }}
                                            className="text-[11px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md border-2 bg-white"
                                        >
                                            {bcBloque}
                                        </span>
                                    )}
                                    {activeContenido && (
                                        <span className="text-[11px] font-bold text-slate-700 bg-white border border-slate-300 px-2.5 py-0.5 rounded-md flex items-center gap-1.5 truncate max-w-70">
                                            <BookOpen size={12} className="text-[#689C63] shrink-0" />
                                            <span className="truncate">{activeContenido.titulo}</span>
                                        </span>
                                    )}
                                </div>

                                {fragmento && (
                                    <CieloPill
                                        as="button"
                                        type="button"
                                        variant="ghost"
                                        onClick={handleRemoveFragmento}
                                        className="h-7 px-2.5 text-xs font-bold text-slate-700 hover:text-rose-600 gap-1.5 border-slate-300 cursor-pointer"
                                        title="Evaluar el indicador completo"
                                    >
                                        <RotateCcw size={12} /> Quitar fragmento
                                    </CieloPill>
                                )}
                            </div>

                            {/* Contenedor de texto con selección activa de fragmento */}
                            <div
                                ref={textContainerRef}
                                onMouseUp={handleMouseUp}
                                onTouchEnd={handleMouseUp}
                                className="bg-white border border-slate-300 rounded-xl p-3 cursor-text relative transition-all"
                            >
                                {renderHighlightedText()}
                            </div>

                            {/* Botón para confirmar fragmento seleccionado con cursor */}
                            {pendingSelection && (
                                <div className="flex items-center justify-between gap-3 p-2 bg-[#689C63]/15 border border-[#689C63]/30 rounded-xl animate-fadeIn">
                                    <div className="text-xs text-[#2E3330] font-medium truncate">
                                        Fragmento: <span className="font-bold">«{pendingSelection}»</span>
                                    </div>
                                    <CieloPill
                                        as="button"
                                        type="button"
                                        variant="primary"
                                        onClick={() => handleApplyFragmento()}
                                        className="h-7 px-3 text-xs font-bold uppercase tracking-wider gap-1.5 shrink-0 cursor-pointer"
                                    >
                                        <Highlighter size={12} strokeWidth={2.6} /> Resaltar fragmento
                                    </CieloPill>
                                </div>
                            )}

                            {/* Estado del fragmento */}
                            {fragmento ? (
                                <div className="p-2 bg-emerald-50 border border-emerald-300/80 rounded-xl flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-2 min-w-0">
                                        <span className="inline-flex items-center gap-1 text-[11px] font-black uppercase tracking-wider text-emerald-900 bg-emerald-200/80 px-2 py-0.5 rounded shrink-0">
                                            <Check size={12} strokeWidth={3} /> Evaluando fragmento
                                        </span>
                                        <p className="text-xs sm:text-[13px] text-[#2E3330] font-semibold italic truncate">
                                            «{fragmento}»
                                        </p>
                                    </div>
                                    <span className="text-[11px] text-slate-600 font-semibold shrink-0">
                                        (Selecciona otra frase para cambiar)
                                    </span>
                                </div>
                            ) : (
                                <p className="text-xs text-slate-500 font-medium">
                                    Tip: Arrastra el cursor sobre una frase para evaluar un fragmento específico.
                                </p>
                            )}
                        </div>
                    )}

                    {/* Barra de búsqueda integrada y acción manual en una sola fila compacta */}
                    <div className="flex items-center gap-3">
                        <div className="relative flex-1">
                            <Search
                                size={14}
                                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                            />
                            <input
                                type="text"
                                value={filtro}
                                onChange={(e) => setFiltro(e.target.value)}
                                placeholder="Buscar contenido o indicador..."
                                className="w-full bg-white border border-slate-300 rounded-xl pl-8 pr-3 py-2 text-xs text-[#1E2421] placeholder:text-slate-400 outline-none focus:border-[#689C63] focus:ring-2 focus:ring-[#689C63]/10 font-medium transition-all"
                            />
                        </div>
                        <button
                            type="button"
                            onClick={() => {
                                setIsManual(true);
                                emitChange(null, null, manualText);
                            }}
                            disabled={disabled}
                            className="text-xs font-bold uppercase tracking-wider text-[#689C63] hover:text-[#527e4e] transition-colors cursor-pointer shrink-0 px-1 py-1"
                        >
                            Escribir manualmente
                        </button>
                    </div>

                    {/* CONTENIDOS CURRICULARES: Presentación compacta, minimalista y visual en cuadrícula */}
                    {contenidos.length > 0 && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                            {contenidosFiltrados.map((cont) => {
                                const isSelectedContenido = selectedContenidoId === cont.id;
                                const isContenidoOfActiveIndicator =
                                    activeContenido?.id === cont.id && !!selectedIndicador;

                                const planContenidosIds = new Set(
                                    (periodoPlan?.contenidos || []).map((c) => c.contenido_id).filter(Boolean)
                                );
                                const planContenidosNombres = new Set(
                                    (periodoPlan?.contenidos || [])
                                        .map((c) => normalizarTexto(c.contenido))
                                        .filter(Boolean)
                                );
                                const esPlanificado =
                                    planContenidosIds.has(cont.id) ||
                                    planContenidosNombres.has(normalizarTexto(cont.contenido));
                                const periodoPlanificado = esPlanificado
                                    ? periodoPlan?.periodo || periodo || 'P2'
                                    : null;

                                return (
                                    <button
                                        key={cont.id}
                                        type="button"
                                        disabled={disabled}
                                        onClick={() => handleSelectContenido(cont)}
                                        title={cont.contenido}
                                        className={`px-3 py-2 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between gap-2 group ${
                                            isSelectedContenido
                                                ? 'bg-[#FAF7F2] border-[#689C63] ring-1.5 ring-[#689C63]/40 shadow-xs'
                                                : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/70'
                                        }`}
                                    >
                                        <div className="flex items-center gap-2 min-w-0 flex-1">
                                            <div
                                                className={`w-3.5 h-3.5 rounded-full shrink-0 flex items-center justify-center border transition-all ${
                                                    isSelectedContenido
                                                        ? 'bg-[#689C63] border-[#689C63] text-white'
                                                        : 'border-slate-300 bg-white group-hover:border-slate-400'
                                                }`}
                                            >
                                                {isSelectedContenido && <Check size={9} strokeWidth={3} />}
                                            </div>
                                            <span className="text-xs font-bold text-[#2E3330] truncate group-hover:text-black">
                                                {cont.contenido}
                                            </span>
                                        </div>

                                        <div className="flex items-center gap-1.5 shrink-0">
                                            {periodoPlanificado && (
                                                <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-[#FEF9E7] text-[#7A5E1A] border border-[#DEAE4D]/35">
                                                    {periodoPlanificado}
                                                </span>
                                            )}
                                            {isContenidoOfActiveIndicator && (
                                                <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-[#689C63] text-white flex items-center gap-0.5 shadow-xs">
                                                    <Check size={8} strokeWidth={3} />
                                                    {selectedIndicador?.codigo || 'Asignado'}
                                                </span>
                                            )}
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    )}

                    {/* SECCIÓN DE INDICADORES DE LOGRO */}
                    <div className="bg-[#FAF7F2]/80 border border-slate-300 rounded-xl p-3.5 space-y-3 shadow-xs transition-all">
                        {/* Caso: No hay ningún indicador en el catálogo para este grado/asignatura */}
                        {indicadores.length === 0 ? (
                            <p className="text-xs text-slate-600 italic p-2 text-center">
                                No se encontraron indicadores registrados para este grado y asignatura. Puedes escribir el indicador manualmente.
                            </p>
                        ) : (
                            <div className="space-y-3">
                                {/* INDICADORES AFINES Y RECOMENDADOS (RESALTADOS) */}
                                {indicadoresAfines.length > 0 ? (
                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-2.5 max-h-72 overflow-y-auto pr-1">
                                        {indicadoresAfines.map(({ indicador: ind, afinidad }) => {
                                            const isSelected = selectedIndicadorId === ind.id;
                                            const bcf = bloqueDeCompetencia(ind.competencia) as BloqueCF | null;
                                            const color = bcf ? COLORES_BLOQUE_CF[bcf] : undefined;

                                            return (
                                                <div
                                                    key={`afin-${ind.id}`}
                                                    onClick={() => handleSelectIndicador(ind)}
                                                    className={`p-3 rounded-xl border text-left cursor-pointer transition-all flex items-start gap-2.5 ${
                                                        isSelected
                                                            ? 'bg-[#FAF7F2] border-[#689C63] ring-1.5 ring-[#689C63] shadow-xs'
                                                            : 'bg-white border-[#689C63]/50 hover:border-[#689C63] hover:bg-[#F4F8F4]/60'
                                                    }`}
                                                >
                                                    {/* Checkbox circular */}
                                                    <div
                                                        className={`w-4 h-4 rounded-full mt-0.5 shrink-0 flex items-center justify-center border transition-all ${
                                                            isSelected
                                                                ? 'bg-[#689C63] border-[#689C63] text-white'
                                                                : 'border-[#689C63]/50 bg-white'
                                                        }`}
                                                    >
                                                        {isSelected && <Check size={10} strokeWidth={3} />}
                                                    </div>

                                                    {/* Contenido del indicador */}
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-1.5 flex-wrap mb-1">
                                                            {ind.codigo && (
                                                                <span className="text-[10px] font-black uppercase tracking-wider bg-slate-800 text-white px-2 py-0.5 rounded">
                                                                    {ind.codigo}
                                                                </span>
                                                            )}
                                                            {bcf && (
                                                                <span
                                                                    style={{
                                                                        borderColor: color,
                                                                        color: color,
                                                                    }}
                                                                    className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded border-2 bg-white"
                                                                >
                                                                    {bcf}
                                                                </span>
                                                            )}
                                                            {afinidad.esPlanificado ? (
                                                                <span className="text-[10px] font-bold uppercase tracking-wider bg-[#FEF9E7] text-[#7A5E1A] border border-[#DEAE4D]/35 px-2 py-0.5 rounded">
                                                                    {afinidad.etiquetaAfinidad || 'Planificado'}
                                                                </span>
                                                            ) : (
                                                                <span className="text-[10px] font-bold uppercase tracking-wider bg-[#689C63]/12 text-[#355A32] px-2 py-0.5 rounded border border-[#689C63]/30">
                                                                    Recomendado
                                                                </span>
                                                            )}
                                                        </div>

                                                        <p className="text-xs sm:text-[13px] text-[#2E3330] leading-snug font-medium">
                                                            {ind.descripcion}
                                                        </p>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    /* Si ningún indicador tuvo palabras clave coincidentes específicas */
                                    <div className="p-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-600 font-medium text-center">
                                        Mostrando los indicadores curriculares disponibles para este grado. Puedes seleccionar cualquiera de ellos para tu actividad.
                                    </div>
                                )}

                                {/* OTROS INDICADORES DE LA ASIGNATURA (SECUNDARIOS, EXPANDIBLES) */}
                                {indicadoresSecundarios.length > 0 && (
                                    <div className="space-y-2 pt-1 border-t border-black/10">
                                        <button
                                            type="button"
                                            onClick={() => setShowOtherIndicators((prev) => !prev)}
                                            className="w-full flex items-center justify-between p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 transition-all text-left cursor-pointer"
                                        >
                                            <span className="text-xs font-bold text-slate-700">
                                                Otros indicadores ({indicadoresSecundarios.length})
                                            </span>
                                            <div className="flex items-center gap-1 text-xs font-bold text-slate-600">
                                                <span>{showOtherIndicators ? 'Ocultar' : 'Ver todos'}</span>
                                                <ChevronDown
                                                    size={14}
                                                    className={`transition-transform duration-200 ${
                                                        showOtherIndicators ? 'rotate-180 text-[#689C63]' : ''
                                                    }`}
                                                />
                                            </div>
                                        </button>

                                        {showOtherIndicators && (
                                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-2.5 max-h-72 overflow-y-auto pr-1 animate-in fade-in duration-150 pt-1">
                                                {indicadoresSecundarios.map(({ indicador: ind }) => {
                                                    const isSelected = selectedIndicadorId === ind.id;
                                                    const bcf = bloqueDeCompetencia(ind.competencia) as BloqueCF | null;
                                                    const color = bcf ? COLORES_BLOQUE_CF[bcf] : undefined;

                                                    return (
                                                        <div
                                                            key={`sec-${ind.id}`}
                                                            onClick={() => handleSelectIndicador(ind)}
                                                            className={`p-3 rounded-xl border text-left cursor-pointer transition-all flex items-start gap-2.5 ${
                                                                isSelected
                                                                    ? 'bg-[#FAF7F2] border-[#689C63] ring-1.5 ring-[#689C63] shadow-xs'
                                                                    : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/70'
                                                            }`}
                                                        >
                                                            {/* Checkbox circular */}
                                                            <div
                                                                className={`w-4 h-4 rounded-full mt-0.5 shrink-0 flex items-center justify-center border transition-all ${
                                                                    isSelected
                                                                        ? 'bg-[#689C63] border-[#689C63] text-white'
                                                                        : 'border-slate-300 bg-white'
                                                                }`}
                                                            >
                                                                {isSelected && <Check size={10} strokeWidth={3} />}
                                                            </div>

                                                            {/* Contenido del indicador */}
                                                            <div className="flex-1 min-w-0">
                                                                <div className="flex items-center gap-1.5 flex-wrap mb-1">
                                                                    {ind.codigo && (
                                                                        <span className="text-[10px] font-black uppercase tracking-wider bg-slate-800 text-white px-2 py-0.5 rounded">
                                                                            {ind.codigo}
                                                                        </span>
                                                                    )}
                                                                    {bcf && (
                                                                        <span
                                                                            style={{
                                                                                borderColor: color,
                                                                                color: color,
                                                                            }}
                                                                            className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded border-2 bg-white"
                                                                        >
                                                                            {bcf}
                                                                        </span>
                                                                    )}
                                                                </div>

                                                                <p className="text-xs sm:text-[13px] text-[#2E3330] leading-snug font-medium">
                                                                    {ind.descripcion}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            ) : (
                /* Modo manual */
                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-700">Redacción manual del indicador</span>
                            {esAsignaturaOptativa(asignatura) && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-200/80">
                                    {getAsignaturaNombre(asignatura)} · Optativa
                                </span>
                            )}
                        </div>
                        {indicadores.length > 0 && (
                            <button
                                type="button"
                                onClick={() => setIsManual(false)}
                                className="text-xs font-bold uppercase tracking-wider text-[#689C63] hover:text-[#527e4e] transition-colors cursor-pointer"
                            >
                                Ver catálogo curricular
                            </button>
                        )}
                    </div>
                    <textarea
                        rows={3}
                        disabled={disabled}
                        className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-xs sm:text-sm bg-white text-[#1E2421] outline-none focus:border-[#689C63] focus:ring-4 focus:ring-[#689C63]/10 font-medium transition-all resize-none"
                        placeholder="Ej: El estudiante identifica las ideas principales de un texto argumentativo..."
                        value={manualText}
                        onChange={handleManualChange}
                    />
                    {indicadores.length === 0 && !cargando && (
                        <p className="text-[11px] text-slate-500">
                            {esAsignaturaOptativa(asignatura)
                                ? `Esta asignatura optativa (${getAsignaturaNombre(asignatura)}) permite redactar libremente el indicador de logro a evaluar.`
                                : `No se encontraron indicadores curriculares para ${grado || 'este grado'}. Puedes escribir el indicador manualmente.`}
                        </p>
                    )}
                </div>
            )}
        </div>
    );
};

export default SelectorIndicadorFragmento;
