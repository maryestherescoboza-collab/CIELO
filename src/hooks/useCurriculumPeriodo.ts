/**
 * Currículo vigente de una combinación curso + asignatura en un período concreto.
 *
 * Fuentes reales (mismas que usa el módulo Plan de Clases):
 *  - `pc_especificaciones` / `pc_especificacion_periodos` (lo que el docente ya seleccionó).
 *  - `curr_indicadores` y `curr_competencias_especificas` (catálogo para texto y color).
 *  - `curr_ce_indicadores` (relación real CE ↔ indicador, con respaldo en el catálogo).
 *
 * Nunca inventa Associations: si el docente no guardó nada para el período, la
 * respuesta es una lista vacía y el panel lo comunica.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAppStore } from '../store/appStore';
import { useEspecificacionesStore } from '../store/especificacionesStore';
import {
    bloqueDeCompetencia,
    claveGrado,
    filtrarCompetenciasEspecificas,
    filtrarContenidos,
    filtrarIndicadores,
    normalizarTexto,
} from '../lib/curriculo';
import type {
    BloqueCF,
    CombinacionCurricular,
    FilaCompetenciaEspecifica,
    FilaContenido,
    FilaIndicador,
    SeleccionContenido,
} from '../types/especificaciones';

export type CategoriaContenido = 'conceptual' | 'procedimental' | 'actitudinal' | 'unidad';

export interface ItemCurricular {
    /** Identificador estable del elemento (id de base de datos o código). */
    id: string;
    codigo: string;
    texto: string;
    /** Bloque CF del elemento (para el color); null si el catálogo no lo define. */
    bloque: BloqueCF | null;
    /** Código de la competencia específica a la que se relates (indicadores). */
    ceCodigo: string | null;
    /** Categoría del contenido curricular (conceptual, procedimental, actitudinal o unidad). */
    categoria?: CategoriaContenido;
    /** Nombre o título del contenido padre / unidad temática. */
    contenidoPadre?: string;
}

export interface CurriculoPeriodo {
    competencias: ItemCurricular[];
    indicadores: ItemCurricular[];
    contenidos: ItemCurricular[];
    conceptuales: ItemCurricular[];
    procedimentales: ItemCurricular[];
    actitudinales: ItemCurricular[];
    /** El docente tiene una especificación guardada para esta combinación. */
    tieneEspecificacion: boolean;
    /** El período concreto tiene selecciones guardadas. */
    tienePeriodo: boolean;
}

const CURRICULO_VACIO: CurriculoPeriodo = {
    competencias: [],
    indicadores: [],
    contenidos: [],
    conceptuales: [],
    procedimentales: [],
    actitudinales: [],
    tieneEspecificacion: false,
    tienePeriodo: false,
};

export function useCurriculumPeriodo(
    combo: CombinacionCurricular | null,
    periodo: string
): { datos: CurriculoPeriodo; cargando: boolean; error: string | null } {
    const session = useAppStore((s) => s.session);
    const especificaciones = useEspecificacionesStore((s) => s.especificaciones);
    const periodos = useEspecificacionesStore((s) => s.periodos);
    const fetchEspecificaciones = useEspecificacionesStore((s) => s.fetchEspecificaciones);
    const fetchPeriodo = useEspecificacionesStore((s) => s.fetchPeriodo);

    const [catalogo, setCatalogo] = useState<{
        indicadores: FilaIndicador[];
        ces: FilaCompetenciaEspecifica[];
        conts: FilaContenido[];
    }>({
        indicadores: [],
        ces: [],
        conts: [],
    });
    const [cargando, setCargando] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [cargadoCatalogo, setCargadoCatalogo] = useState<string | null>(null);
    const tokenRef = useRef(0);

    const usuarioId = session?.user?.id || '';

    // 1) Especificaciones del usuario (se carga una sola vez por usuario).
    useEffect(() => {
        if (!usuarioId) return;
        void fetchEspecificaciones(usuarioId);
    }, [usuarioId, fetchEspecificaciones]);

    const especificacion = useMemo(() => {
        if (!combo) return undefined;
        return especificaciones.find(
            (e) => e.curso_id === combo.cursoId && e.asignatura === combo.asignatura
        );
    }, [combo, especificaciones]);

    // 2) Período concreto de la especificación (con caché en el store).
    useEffect(() => {
        if (!especificacion || !periodo) return;
        const yaEsta = periodos.some((p) => p.especificacion_id === especificacion.id && p.periodo === periodo);
        if (yaEsta) return;
        void fetchPeriodo(especificacion.id, periodo);
    }, [especificacion, periodo, periodos, fetchPeriodo]);

    const periodoRow = useMemo(() => {
        if (!especificacion || !periodo) return undefined;
        return periodos.find((p) => p.especificacion_id === especificacion.id && p.periodo === periodo);
    }, [especificacion, periodo, periodos]);

    // 3) Catálogo real del grado + asignatura (texto de indicadores, color por bloque y contenidos con desglose).
    useEffect(() => {
        if (!combo) return;
        if (cargadoCatalogo === combo.key) return;
        const token = ++tokenRef.current;
        let cancelado = false;
        (async () => {
            setCargando(true);
            setError(null);
            try {
                const gradoStr = String(combo.grado || '');
                const gradoCanonico = claveGrado(combo.grado) || gradoStr;
                const [inds, ces, conts] = await Promise.all([
                    supabase
                        .from('curr_indicadores')
                        .select('id, grado, asignatura, competencia, codigo, descripcion, is_active')
                        .eq('grado', gradoCanonico),
                    supabase
                        .from('curr_competencias_especificas')
                        .select('id, nivel, grado, asignatura, bloque, competencia_fundamental, codigo, descriptor')
                        .eq('grado', gradoCanonico),
                    supabase
                        .from('curr_contenidos')
                        .select('id, grado, asignatura, contenido, contenido_json')
                        .eq('grado', gradoCanonico),
                ]);
                if (cancelado || token !== tokenRef.current) return;
                if (inds.error) {
                    console.error('[Curriculo] Error consultando curr_indicadores:', inds.error);
                }
                if (ces.error) {
                    console.error('[Curriculo] Error consultando curr_competencias_especificas:', ces.error);
                }
                if (conts.error) {
                    console.error('[Curriculo] Error consultando curr_contenidos:', conts.error);
                }

                let indsData: FilaIndicador[] = (inds.data as FilaIndicador[]) || [];
                if (indsData.length === 0) {
                    const fallbackInds = await supabase
                        .from('curr_indicadores')
                        .select('id, grado, asignatura, competencia, codigo, descripcion, is_active');
                    if (!cancelado && fallbackInds.data) {
                        indsData = fallbackInds.data as FilaIndicador[];
                    }
                }

                let cesData: FilaCompetenciaEspecifica[] = (ces.data as FilaCompetenciaEspecifica[]) || [];
                if (cesData.length === 0) {
                    const fallbackCes = await supabase
                        .from('curr_competencias_especificas')
                        .select('id, nivel, grado, asignatura, bloque, competencia_fundamental, codigo, descriptor');
                    if (!cancelado && fallbackCes.data) {
                        cesData = fallbackCes.data as FilaCompetenciaEspecifica[];
                    }
                }

                let contsData: FilaContenido[] = (conts.data as FilaContenido[]) || [];
                if (contsData.length === 0) {
                    const fallbackConts = await supabase
                        .from('curr_contenidos')
                        .select('id, grado, asignatura, contenido, contenido_json');
                    if (!cancelado && fallbackConts.data) {
                        contsData = fallbackConts.data as FilaContenido[];
                    }
                }

                setCatalogo({
                    indicadores: filtrarIndicadores(indsData, combo.grado, combo.asignatura),
                    ces: filtrarCompetenciasEspecificas(cesData, combo.grado, combo.asignatura),
                    conts: filtrarContenidos(contsData, combo.grado, combo.asignatura),
                });
                setCargadoCatalogo(combo.key);
            } catch (err) {
                if (!cancelado) {
                    console.error('[Curriculo] Error inesperado cargando el catálogo:', err);
                    setError(err instanceof Error ? err.message : String(err));
                    setCargadoCatalogo(combo.key);
                }
            } finally {
                if (!cancelado) setCargando(false);
            }
        })();
        return () => {
            cancelado = true;
        };
    }, [combo, cargadoCatalogo]);

    const datos = useMemo<CurriculoPeriodo>(() => {
        if (!combo) return CURRICULO_VACIO;

        const indicadoresCatalogo = new Map(catalogo.indicadores.map((f) => [f.id, f]));
        const ceCatalogo = new Map(catalogo.ces.map((f) => [f.codigo, f]));
        const contsCatalogo = new Map<string, FilaContenido>();
        for (const fc of catalogo.conts) {
            contsCatalogo.set(fc.id, fc);
            contsCatalogo.set(normalizarTexto(fc.contenido), fc);
        }

        /** Nombre de la competencia fundamental de cada CE (para el vínculo real). */
        const nombresCE = new Map<string, string>();

        const fila = periodoRow;
        const competencias: ItemCurricular[] = [];
        const indicadores: ItemCurricular[] = [];
        const contenidos: ItemCurricular[] = [];
        const conceptuales: ItemCurricular[] = [];
        const procedimentales: ItemCurricular[] = [];
        const actitudinales: ItemCurricular[] = [];

        if (fila) {
            const vistosCE = new Set<string>();
            for (const ce of fila.competencias_especificas || []) {
                if (!ce || typeof ce !== 'object' || !ce.codigo) continue;
                if (vistosCE.has(ce.codigo)) continue;
                vistosCE.add(ce.codigo);
                const cat = ceCatalogo.get(ce.codigo);
                competencias.push({
                    id: `ce-${ce.codigo}`,
                    codigo: ce.codigo,
                    texto: (ce.descriptor || cat?.descriptor || '').trim(),
                    bloque: ce.bloque ?? null,
                    ceCodigo: ce.codigo,
                });
                nombresCE.set(ce.codigo, (ce.nombre || cat?.competencia_fundamental || '').trim());
            }

            const vistosInd = new Set<string>();
            for (const ind of fila.indicadores || []) {
                if (!ind || typeof ind !== 'object' || !ind.curr_indicador_id) continue;
                if (vistosInd.has(ind.curr_indicador_id)) continue;
                vistosInd.add(ind.curr_indicador_id);
                const cat = indicadoresCatalogo.get(ind.curr_indicador_id);
                const codigo = (cat?.codigo || ind.codigo || '').trim();
                const descripcion = (cat?.descripcion || '').trim();
                if (!codigo && !descripcion) continue;
                indicadores.push({
                    id: `ind-${ind.curr_indicador_id}`,
                    codigo,
                    texto: descripcion,
                    bloque: bloqueDeCompetencia(cat?.competencia),
                    ceCodigo: null,
                });
            }

            const vistosCont = new Set<string>();
            for (const cont of (fila.contenidos || []) as SeleccionContenido[]) {
                if (!cont || typeof cont !== 'object') continue;
                const nombreUnidad = (cont.contenido || '').trim();
                const catRow =
                    (cont.contenido_id ? contsCatalogo.get(cont.contenido_id) : undefined) ||
                    contsCatalogo.get(normalizarTexto(nombreUnidad));

                // 1. Conceptos seleccionados o del catálogo
                const rawConceptos =
                    Array.isArray(cont.conceptos) && cont.conceptos.length > 0
                        ? cont.conceptos
                        : (catRow?.contenido_json?.conceptos as string[] | undefined) || [];

                // 2. Procedimientos seleccionados o del catálogo
                const rawProcedimientos =
                    Array.isArray(cont.procedimientos) && cont.procedimientos.length > 0
                        ? cont.procedimientos
                        : (catRow?.contenido_json?.procedimientos as string[] | undefined) || [];

                // 3. Actitudes y valores seleccionados o del catálogo
                const rawActitudes =
                    Array.isArray(cont.actitudes_valores) && cont.actitudes_valores.length > 0
                        ? cont.actitudes_valores
                        : ((catRow?.contenido_json?.actitudes_valores || catRow?.contenido_json?.actitudes) as
                              | string[]
                              | undefined) || [];

                const hayDesglose =
                    rawConceptos.length > 0 || rawProcedimientos.length > 0 || rawActitudes.length > 0;

                if (hayDesglose) {
                    rawConceptos.forEach((txt, idx) => {
                        const limpio = String(txt || '').trim();
                        if (!limpio) return;
                        const claveUnica = `conc-${limpio.toLowerCase()}`;
                        if (vistosCont.has(claveUnica)) return;
                        vistosCont.add(claveUnica);

                        const item: ItemCurricular = {
                            id: `cont-c-${cont.contenido_id || 'item'}-${idx}`,
                            codigo: '',
                            texto: limpio,
                            bloque: null,
                            ceCodigo: null,
                            categoria: 'conceptual',
                            contenidoPadre: nombreUnidad,
                        };
                        conceptuales.push(item);
                        contenidos.push(item);
                    });

                    rawProcedimientos.forEach((txt, idx) => {
                        const limpio = String(txt || '').trim();
                        if (!limpio) return;
                        const claveUnica = `proc-${limpio.toLowerCase()}`;
                        if (vistosCont.has(claveUnica)) return;
                        vistosCont.add(claveUnica);

                        const item: ItemCurricular = {
                            id: `cont-p-${cont.contenido_id || 'item'}-${idx}`,
                            codigo: '',
                            texto: limpio,
                            bloque: null,
                            ceCodigo: null,
                            categoria: 'procedimental',
                            contenidoPadre: nombreUnidad,
                        };
                        procedimentales.push(item);
                        contenidos.push(item);
                    });

                    rawActitudes.forEach((txt, idx) => {
                        const limpio = String(txt || '').trim();
                        if (!limpio) return;
                        const claveUnica = `act-${limpio.toLowerCase()}`;
                        if (vistosCont.has(claveUnica)) return;
                        vistosCont.add(claveUnica);

                        const item: ItemCurricular = {
                            id: `cont-a-${cont.contenido_id || 'item'}-${idx}`,
                            codigo: '',
                            texto: limpio,
                            bloque: null,
                            ceCodigo: null,
                            categoria: 'actitudinal',
                            contenidoPadre: nombreUnidad,
                        };
                        actitudinales.push(item);
                        contenidos.push(item);
                    });
                } else if (nombreUnidad) {
                    // Sin desglose: el título de la unidad se incluye como conceptual
                    const claveUnica = `unit-${nombreUnidad.toLowerCase()}`;
                    if (!vistosCont.has(claveUnica)) {
                        vistosCont.add(claveUnica);
                        const item: ItemCurricular = {
                            id: `cont-${cont.contenido_id || nombreUnidad}`,
                            codigo: '',
                            texto: nombreUnidad,
                            bloque: null,
                            ceCodigo: null,
                            categoria: 'conceptual',
                            contenidoPadre: nombreUnidad,
                        };
                        conceptuales.push(item);
                        contenidos.push(item);
                    }
                }
            }
        }

        // Relación real CE ↔ indicador: `curr_indicadores.competencia` se compara con el
        // bloque o con la competencia fundamental de la CE. No se inventa ninguna asociación.
        for (const ind of indicadores) {
            const cat = indicadoresCatalogo.get(ind.id.replace('ind-', ''));
            const rel = normalizarTexto(cat?.competencia);
            if (!rel) continue;
            const ce = competencias.find((c) => {
                const bloque = normalizarTexto(c.bloque);
                const nombre = normalizarTexto(nombresCE.get(c.codigo));
                return (!!bloque && rel === bloque) || (!!nombre && rel === nombre);
            });
            ind.ceCodigo = ce?.codigo ?? null;
        }

        return {
            competencias,
            indicadores,
            contenidos,
            conceptuales,
            procedimentales,
            actitudinales,
            tieneEspecificacion: !!especificacion,
            tienePeriodo: !!fila,
        };
    }, [combo, periodoRow, especificacion, catalogo]);

    return { datos, cargando, error };
}
