import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import type { SecuenciaDB, NotaDB, NotaContenido } from '../types/planClases';

interface PlanClasesState {
  secuencias: SecuenciaDB[];
  notas: NotaDB[];
  loadingSecuencias: boolean;
  loadingNotas: boolean;
  error: string | null;
  
  fetchSecuencias: (usuarioId: string) => Promise<void>;
  createSecuencia: (usuarioId: string, titulo: string) => Promise<SecuenciaDB | null>;
  updateSecuencia: (secuenciaId: string, updates: Partial<SecuenciaDB>) => Promise<void>;
  
  fetchNotas: (secuenciaId: string) => Promise<void>;
  fetchAllNotas: (usuarioId: string) => Promise<void>;
  createNota: (secuenciaId: string, usuarioId: string, titulo: string) => Promise<NotaDB | null>;
  getNota: (notaId: string) => Promise<NotaDB | null>;
  updateNotaContenido: (notaId: string, contenido?: NotaContenido, titulo?: string) => Promise<void>;
}

export const usePlanClasesStore = create<PlanClasesState>((set, get) => ({
  secuencias: [],
  notas: [],
  loadingSecuencias: false,
  loadingNotas: false,
  error: null,

  fetchSecuencias: async (usuarioId: string) => {
    set({ loadingSecuencias: true, error: null });
    try {
      const { data, error } = await supabase
        .from('pc_secuencias')
        .select('*')
        .eq('usuario_id', usuarioId)
        .order('creado_en', { ascending: false });
        
      if (error) throw error;
      set({ secuencias: data as SecuenciaDB[] });
    } catch (err: any) {
      set({ error: err.message });
    } finally {
      set({ loadingSecuencias: false });
    }
  },

  createSecuencia: async (usuarioId, titulo) => {
    try {
      const { data, error } = await supabase
        .from('pc_secuencias')
        .insert({ usuario_id: usuarioId, titulo })
        .select()
        .single();
        
      if (error) throw error;
      set((state) => ({ secuencias: [data as SecuenciaDB, ...state.secuencias] }));
      return data as SecuenciaDB;
    } catch (err: any) {
      set({ error: err.message });
      return null;
    }
  },

  updateSecuencia: async (secuenciaId: string, updates: Partial<SecuenciaDB>) => {
    try {
      const updateData = { ...updates, actualizado_en: new Date().toISOString() };
      const { error } = await supabase
        .from('pc_secuencias')
        .update(updateData)
        .eq('id', secuenciaId);
        
      if (error) throw error;
      set((state) => ({
        secuencias: state.secuencias.map(s => s.id === secuenciaId ? { ...s, ...updateData } : s)
      }));
    } catch (err: any) {
      console.error('Error actualizando secuencia:', err.message);
    }
  },

  fetchNotas: async (secuenciaId: string) => {
    set({ loadingNotas: true, error: null });
    try {
      const { data, error } = await supabase
        .from('pc_notas')
        .select('id, secuencia_id, usuario_id, titulo, orden, creado_en, actualizado_en')
        .eq('secuencia_id', secuenciaId)
        .order('orden', { ascending: true });
        
      if (error) throw error;
      set({ notas: data as unknown as NotaDB[] });
    } catch (err: any) {
      set({ error: err.message });
    } finally {
      set({ loadingNotas: false });
    }
  },

  fetchAllNotas: async (usuarioId: string) => {
    set({ loadingNotas: true, error: null });
    try {
      const { data, error } = await supabase
        .from('pc_notas')
        .select('id, secuencia_id, usuario_id, titulo, orden, creado_en, actualizado_en')
        .eq('usuario_id', usuarioId)
        .order('actualizado_en', { ascending: false });
        
      if (error) throw error;
      set({ notas: data as unknown as NotaDB[] });
    } catch (err: any) {
      set({ error: err.message });
    } finally {
      set({ loadingNotas: false });
    }
  },

  createNota: async (secuenciaId, usuarioId, titulo) => {
    try {
      const currentNotas = get().notas;
      const nextOrden = currentNotas.length > 0 ? Math.max(...currentNotas.map(n => n.orden)) + 1 : 0;
      
      const { data, error } = await supabase
        .from('pc_notas')
        .insert({
          secuencia_id: secuenciaId,
          usuario_id: usuarioId,
          titulo,
          orden: nextOrden,
          contenido_json: {
            time: Date.now(),
            blocks: [
              {
                type: 'paragraph',
                data: { text: 'Empieza a escribir tu nota de clase...' }
              }
            ]
          }
        })
        .select()
        .single();
        
      if (error) throw error;
      
      const newNota = data as NotaDB;
      // Añadimos a la lista local quitando el JSON para coherencia con fetchNotas
      const notaForList = { ...newNota, contenido_json: null };
      set((state) => ({ notas: [...state.notas, notaForList] }));
      return newNota;
    } catch (err: any) {
      set({ error: err.message });
      return null;
    }
  },

  getNota: async (notaId: string) => {
    try {
      const { data, error } = await supabase
        .from('pc_notas')
        .select('*')
        .eq('id', notaId)
        .single();
        
      if (error) throw error;
      return data as NotaDB;
    } catch (err: any) {
      set({ error: err.message });
      return null;
    }
  },

  updateNotaContenido: async (notaId, contenido, titulo) => {
    try {
      const updateData: any = { 
        actualizado_en: new Date().toISOString()
      };
      if (contenido !== undefined) updateData.contenido_json = contenido;
      if (titulo !== undefined) updateData.titulo = titulo;
      
      const { error } = await supabase
        .from('pc_notas')
        .update(updateData)
        .eq('id', notaId);
        
      if (error) throw error;
      
      if (titulo !== undefined) {
        set((state) => ({
          notas: state.notas.map(n => n.id === notaId ? { ...n, titulo, actualizado_en: updateData.actualizado_en } : n)
        }));
      }
    } catch (err: any) {
      console.error('Error al autoguardar nota:', err.message);
    }
  },
}));
