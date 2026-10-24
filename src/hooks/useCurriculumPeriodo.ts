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
    filtrarCompetenciasEspecificas,
    filtrarIndicadores,
    normalizarTexto,
} from '../lib/curriculo';
import type {
    BloqueCF,
    CombinacionCurricular,
    FilaCompetenciaEspecifica,
    FilaIndicador,
} from '../types/especificaciones';

export interface ItemCurricular {
    /** Identificador estable del elemento (id de base de datos o código). */
    id: string;
    codigo: string;
    texto: string;
    /** Bloque CF del elemento (para el color); null si el catálogo no lo define. */
    bloque: BloqueCF | null;
    /** Código de la competencia específica a la que se relates (indicadores). */
    ceCodigo: string | null;
}

export interface CurriculoPeriodo {
    competencias: ItemCurricular[];
    indicadores: ItemCurricular[];
    contenidos: ItemCurricular[];
    /** El docente tiene una especificación guardada para esta combinación. */
    tieneEspecificacion: boolean;
    /** El período concreto tiene selecciones guardadas. */
    tienePeriodo: boolean;
}

const CURRICULO_VACIO: CurriculoPeriodo = {
    competencias: [],
    indicadores: [],
    contenidos: [],
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

    const [catalogo, setCatalogo] = useState<{ indicadores: FilaIndicador[]; ces: FilaCompetenciaEspecifica[] }>({
        indicadores: [],
        ces: [],
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

    // 3) Catálogo real del grado + asignatura (texto de indicadores y color por bloque).
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
                const [inds, ces] = await Promise.all([
                    supabase
                        .from('curr_indicadores')
                        .select('id, grado, asignatura, competencia, codigo, descripcion, is_active')
                        .eq('grado', gradoStr),
                    supabase
                        .from('curr_competencias_especificas')
                        .select('id, nivel, grado, asignatura, bloque, competencia_fundamental, codigo, descriptor')
                        .eq('grado', gradoStr),
                ]);
                if (cancelado || token !== tokenRef.current) return;
                if (inds.error) {
                    console.error('[Curriculo] Error consultando curr_indicadores:', inds.error);
                }
                if (ces.error) {
                    console.error('[Curriculo] Error consultando curr_competencias_especificas:', ces.error);
                }
                setCatalogo({
                    indicadores: filtrarIndicadores((inds.data as FilaIndicador[]) || [], combo.grado, combo.asignatura),
                    ces: filtrarCompetenciasEspecificas(
                        (ces.data as FilaCompetenciaEspecifica[]) || [],
                        combo.grado,
                        combo.asignatura
                    ),
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
        /** Nombre de la competencia fundamental de cada CE (para el vínculo real). */
        const nombresCE = new Map<string, string>();

        const fila = periodoRow;
        const competencias: ItemCurricular[] = [];
        const indicadores: ItemCurricular[] = [];
        const contenidos: ItemCurricular[] = [];

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
            for (const cont of fila.contenidos || []) {
                if (!cont || typeof cont !== 'object') continue;
                const texto = (cont.contenido || '').trim();
                if (!texto || vistosCont.has(texto)) continue;
                vistosCont.add(texto);
                contenidos.push({
                    id: `cont-${cont.contenido_id || texto}`,
                    codigo: '',
                    texto,
                    bloque: null,
                    ceCodigo: null,
                });
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
            tieneEspecificacion: !!especificacion,
            tienePeriodo: !!fila,
        };
    }, [combo, periodoRow, especificacion, catalogo]);

    return { datos, cargando, error };
}
