/**
 * Actividades reales del curso para un período concreto.
 *
 * 1) Si el store ya tiene actividades de ese curso/período (caché académica en
 *    memoria), se usan tal cual: no hay consulta extra.
 * 2) Si no, se consulta `actividades` con un filtro estricto por curso + período
 *    (RLS sigue aplicando) y se cachea el resultado en el store.
 *
 * Nunca mezcla actividades de otros cursos ni de otros períodos.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAppStore } from '../store/appStore';
import type { Actividad } from '../types';

interface Estado {
    actividades: Actividad[];
    cargando: boolean;
    error: string | null;
}

const mapFila = (a: Record<string, unknown>): Actividad => ({
    id: Number(a.id),
    nombre: (a.nombre as string) || '',
    cursoId: Number(a.curso_id),
    fecha: (a.fecha as string) || '',
    periodo: (a.periodo as string) || '',
    bcAsignados: (a.bc_asignados as Actividad['bcAsignados']) || ['BC1'],
    secuenciaId: a.secuencia_id as number | undefined,
    isRec: a.is_rec as boolean | undefined,
    userId: a.user_id as string | undefined,
    asignatura: a.asignatura as string | undefined,
    indicador: a.indicador as string | undefined,
    producto: a.producto as string | undefined,
    requiereProducto: a.requiere_producto as boolean | undefined,
    descripcion: (a.descripcion as string | null) ?? null,
    isProductoFinal: a.is_producto_final as boolean | undefined,
    hora_inicio: a.hora_inicio as string | undefined,
    duracion_minutos: a.duracion_minutos as number | undefined,
});

export function useActividadesPeriodo(cursoId: number, periodo: string, activo: boolean) {
    const actividadesStore = useAppStore((s) => s.state.actividades);
    const setState = useAppStore((s) => s.setState);

    const [estado, setEstado] = useState<Estado>({ actividades: [], cargando: false, error: null });
    const tokenRef = useRef(0);
    const claveCargadaRef = useRef<string | null>(null);

    const desdeStore = useMemo(
        () => actividadesStore.filter(a => a.cursoId === cursoId && (a.periodo === periodo || !a.periodo)),
        [actividadesStore, cursoId, periodo]
    );

    const cargar = useCallback(async () => {
        if (!cursoId || !periodo) {
            setEstado({ actividades: [], cargando: false, error: null });
            return;
        }
        const token = ++tokenRef.current;
        const clave = `${cursoId}|${periodo}`;
        setEstado(prev => ({ ...prev, cargando: true, error: null }));
        try {
            const { data, error } = await supabase
                .from('actividades')
                .select('*')
                .eq('activo', true)
                .eq('curso_id', cursoId)
                .or(`periodo.eq.${periodo},periodo.is.null`);

            if (token !== tokenRef.current) return;
            if (error) throw error;

            const mapeadas = ((data || []) as Record<string, unknown>[]).map(mapFila);
            claveCargadaRef.current = clave;

            // Se mergea en el store para no repetir la descarga en otros módulos.
            if (mapeadas.length > 0) {
                setState(s => {
                    const existentes = new Set(s.actividades.map(a => `${a.cursoId}|${a.periodo}|${a.id}`));
                    const nuevas = mapeadas.filter(a => !existentes.has(`${a.cursoId}|${a.periodo}|${a.id}`));
                    if (nuevas.length === 0) return s;
                    return { ...s, actividades: [...s.actividades, ...nuevas] };
                });
            }

            setEstado({ actividades: mapeadas, cargando: false, error: null });
        } catch (err) {
            if (token !== tokenRef.current) return;
            setEstado({
                actividades: [],
                cargando: false,
                error: err instanceof Error ? err.message : 'No se pudieron cargar las actividades del período.',
            });
        }
    }, [cursoId, periodo, setState]);

    useEffect(() => {
        if (!activo) return;
        const clave = `${cursoId}|${periodo}`;
        // El store ya tiene el slice exacto: no se vuelve a consultar.
        if (desdeStore.length > 0) {
            claveCargadaRef.current = clave;
            setEstado({ actividades: desdeStore, cargando: false, error: null });
            return;
        }
        if (claveCargadaRef.current === clave) return;
        void cargar();
    }, [activo, cursoId, periodo, desdeStore, cargar]);

    return estado;
}
