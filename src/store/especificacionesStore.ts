import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import type {
  CombinacionCurricular,
  CompetenciaCurricular,
  EspecificacionDB,
  EspecificacionPeriodoDB,
} from '../types/especificaciones';

interface EspecificacionesState {
  especificaciones: EspecificacionDB[];
  periodos: EspecificacionPeriodoDB[];
  loading: boolean;
  error: string | null;

  fetchEspecificaciones: (usuarioId: string, forceReload?: boolean) => Promise<void>;
  getEspecificacion: (combinacion: CombinacionCurricular) => EspecificacionDB | undefined;
  guardarBase: (
    usuarioId: string,
    combinacion: CombinacionCurricular,
    competencias: CompetenciaCurricular[],
    paso: number,
    periodoActual: string | null
  ) => Promise<EspecificacionDB | null>;
  getPeriodo: (especificacionId: string, periodo: string) => EspecificacionPeriodoDB | undefined;
  fetchPeriodo: (especificacionId: string, periodo: string) => Promise<EspecificacionPeriodoDB | null>;
  guardarPeriodo: (
    especificacionId: string,
    periodo: string,
    datos: {
      competencias_especificas: CompetenciaCurricular[];
      contenidos: EspecificacionPeriodoDB['contenidos'];
      indicadores: EspecificacionPeriodoDB['indicadores'];
    }
  ) => Promise<EspecificacionPeriodoDB | null>;
}

let fetchPromise: Promise<void> | null = null;

const toDB = (row: Record<string, unknown>): EspecificacionDB => ({
  id: row.id as string,
  usuario_id: row.usuario_id as string,
  curso_id: row.curso_id as number,
  curso_docente_id: (row.curso_docente_id as number | null) ?? null,
  grado: row.grado as string,
  seccion: row.seccion as string,
  asignatura: row.asignatura as string,
  competencias: (row.competencias as CompetenciaCurricular[]) || [],
  periodo_actual: (row.periodo_actual as string | null) ?? null,
  paso_actual: Number(row.paso_actual) || 1,
  creado_en: row.creado_en as string,
  actualizado_en: row.actualizado_en as string,
});

const periodoToDB = (row: Record<string, unknown>): EspecificacionPeriodoDB => ({
  id: row.id as string,
  especificacion_id: row.especificacion_id as string,
  periodo: row.periodo as string,
  competencias_especificas: (row.competencias_especificas as CompetenciaCurricular[]) || [],
  contenidos: (row.contenidos as EspecificacionPeriodoDB['contenidos']) || [],
  indicadores: (row.indicadores as EspecificacionPeriodoDB['indicadores']) || [],
  actualizado_en: row.actualizado_en as string,
});

export const useEspecificacionesStore = create<EspecificacionesState>((set, get) => ({
  especificaciones: [],
  periodos: [],
  loading: false,
  error: null,

  fetchEspecificaciones: async (usuarioId, forceReload = false) => {
    if (!usuarioId) return;
    if (!forceReload && get().especificaciones.length > 0) return;
    if (fetchPromise) return fetchPromise;

    fetchPromise = (async () => {
      set({ loading: true, error: null });
      try {
        const { data, error } = await supabase
          .from('pc_especificaciones')
          .select('*')
          .eq('usuario_id', usuarioId)
          .order('creado_en', { ascending: true });
        if (error) throw error;
        set({ especificaciones: (data || []).map((r) => toDB(r as Record<string, unknown>)) });
      } catch (err) {
        set({ error: err instanceof Error ? err.message : String(err) });
      } finally {
        set({ loading: false });
      }
    })();

    try {
      await fetchPromise;
    } finally {
      fetchPromise = null;
    }
  },

  getEspecificacion: (combinacion) =>
    get().especificaciones.find(
      (e) => e.curso_id === combinacion.cursoId && e.asignatura === combinacion.asignatura
    ),

  guardarBase: async (usuarioId, combinacion, competencias, paso, periodoActual) => {
    try {
      const { data, error } = await supabase
        .from('pc_especificaciones')
        .upsert(
          {
            usuario_id: usuarioId,
            curso_id: combinacion.cursoId,
            curso_docente_id: combinacion.cursoDocenteId,
            grado: combinacion.grado,
            seccion: combinacion.seccion,
            asignatura: combinacion.asignatura,
            competencias,
            periodo_actual: periodoActual,
            paso_actual: paso,
            actualizado_en: new Date().toISOString(),
          },
          { onConflict: 'usuario_id,curso_id,asignatura' }
        )
        .select()
        .single();
      if (error) throw error;

      const guardada = toDB(data as unknown as Record<string, unknown>);
      set((s) => {
        const resto = s.especificaciones.filter(
          (e) => !(e.curso_id === guardada.curso_id && e.asignatura === guardada.asignatura)
        );
        return { especificaciones: [...resto, guardada] };
      });
      return guardada;
    } catch (err) {
      set({ error: err instanceof Error ? err.message : String(err) });
      return null;
    }
  },

  getPeriodo: (especificacionId, periodo) =>
    get().periodos.find((p) => p.especificacion_id === especificacionId && p.periodo === periodo),

  fetchPeriodo: async (especificacionId, periodo) => {
    try {
      const { data, error } = await supabase
        .from('pc_especificacion_periodos')
        .select('*')
        .eq('especificacion_id', especificacionId)
        .eq('periodo', periodo)
        .maybeSingle();
      if (error) throw error;

      const fila = data ? periodoToDB(data as unknown as Record<string, unknown>) : null;
      set((s) => {
        const resto = s.periodos.filter(
          (p) => !(p.especificacion_id === especificacionId && p.periodo === periodo)
        );
        return { periodos: fila ? [...resto, fila] : resto };
      });
      return fila;
    } catch (err) {
      set({ error: err instanceof Error ? err.message : String(err) });
      return null;
    }
  },

  guardarPeriodo: async (especificacionId, periodo, datos) => {
    try {
      const { data, error } = await supabase
        .from('pc_especificacion_periodos')
        .upsert(
          {
            especificacion_id: especificacionId,
            periodo,
            competencias_especificas: datos.competencias_especificas,
            contenidos: datos.contenidos,
            indicadores: datos.indicadores,
            actualizado_en: new Date().toISOString(),
          },
          { onConflict: 'especificacion_id,periodo' }
        )
        .select()
        .single();
      if (error) throw error;

      const guardada = periodoToDB(data as unknown as Record<string, unknown>);
      set((s) => {
        const resto = s.periodos.filter(
          (p) => !(p.especificacion_id === guardada.especificacion_id && p.periodo === guardada.periodo)
        );
        return { periodos: [...resto, guardada] };
      });
      return guardada;
    } catch (err) {
      set({ error: err instanceof Error ? err.message : String(err) });
      return null;
    }
  },
}));
