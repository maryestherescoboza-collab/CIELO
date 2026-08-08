import { useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAppStore } from '../store/appStore';
import type { Centro, CodigoAccesoCentro } from '../types';

export interface CentroEditable {
    nombre: string;
    codigo_centro?: string;
    tanda?: string;
    telefono?: string;
    distrito_educativo?: string;
    regional_educacion?: string;
    provincia?: string;
    municipio?: string;
    estado?: 'pendiente' | 'activo' | 'suspendido' | 'cancelado';
}

const mapCentro = (row: Record<string, unknown>): Centro => ({
    id: row.id as string,
    nombre: row.nombre as string,
    codigoCentro: row.codigo_centro as string || '',
    tanda: row.tanda as string || '',
    telefono: row.telefono as string || '',
    distritoEducativo: row.distrito_educativo as string || '',
    regionalEducacion: row.regional_educacion as string || '',
    provincia: row.provincia as string || '',
    municipio: row.municipio as string || '',
    createdBy: row.created_by as string,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
    estado: (row.estado as Centro['estado']) || 'activo',
    afiliado: row.afiliado as boolean || false
});

export function useCentroActions() {
    const session = useAppStore(s => s.session);
    const setState = useAppStore(s => s.setAppState);

    const syncCentroEnPerfil = useCallback((centro: Centro) => {
        if (!session?.user?.id) return;
        setState(prev => ({
            ...prev,
            perfiles: prev.perfiles.map(p =>
                p.userId === session.user.id
                    ? { ...p, centro, institucion: centro.nombre, instituto: centro.nombre, centro_id: centro.id }
                    : p
            )
        }));
    }, [session, setState]);

    const loadCentro = useCallback(async (centroId: string): Promise<Centro | null> => {
        const { data, error } = await supabase
            .from('centros')
            .select('*')
            .eq('id', centroId)
            .maybeSingle();
        if (error || !data) {
            console.error('[useCentroActions] Error al cargar el centro:', error);
            return null;
        }
        const centro = mapCentro(data);
        syncCentroEnPerfil(centro);
        return centro;
    }, [syncCentroEnPerfil]);

    const updateCentro = useCallback(async (centroId: string, input: CentroEditable): Promise<Centro | null> => {
        const { data, error } = await supabase
            .from('centros')
            .update({
                nombre: input.nombre,
                codigo_centro: input.codigo_centro || null,
                tanda: input.tanda || null,
                telefono: input.telefono || null,
                distrito_educativo: input.distrito_educativo || null,
                regional_educacion: input.regional_educacion || null,
                provincia: input.provincia || null,
                municipio: input.municipio || null,
                estado: input.estado ?? 'activo',
                updated_at: new Date().toISOString()
            })
            .eq('id', centroId)
            .select('*')
            .maybeSingle();
        if (error || !data) {
            console.error('[useCentroActions] Error al actualizar el centro:', error);
            return null;
        }
        const centro = mapCentro(data);
        syncCentroEnPerfil(centro);
        return centro;
    }, [syncCentroEnPerfil]);

    const createCentro = useCallback(async (input: CentroEditable): Promise<Centro | null> => {
        if (!session?.user?.id) return null;
        const { data, error } = await supabase
            .from('centros')
            .insert({
                nombre: input.nombre,
                codigo_centro: input.codigo_centro || null,
                tanda: input.tanda || null,
                telefono: input.telefono || null,
                distrito_educativo: input.distrito_educativo || null,
                regional_educacion: input.regional_educacion || null,
                provincia: input.provincia || null,
                municipio: input.municipio || null,
                estado: input.estado ?? 'activo',
                created_by: session.user.id
            })
            .select('*')
            .maybeSingle();
        if (error || !data) {
            console.error('[useCentroActions] Error al crear el centro:', error);
            throw new Error(error?.message || 'Error al crear el centro educativo');
        }
        const centro = mapCentro(data);
        syncCentroEnPerfil(centro);
        return centro;
    }, [session?.user?.id, syncCentroEnPerfil]);

    const updateInstitutoName = useCallback(async (nombre: string): Promise<Centro | null> => {
        if (!session?.user?.id) return null;
        const normalizedInput = nombre.trim().replace(/\s+/g, ' ');
        
        const stateObj = useAppStore.getState().state;
        const currentProfile = stateObj.perfiles.find(p => p.userId === session.user.id);
        const currentCentroId = stateObj.centroRolActual?.centro_id || currentProfile?.centro_id;

        if (currentCentroId) {
            return await updateCentro(currentCentroId, { nombre: normalizedInput });
        } else {
            const { data: existingCentros } = await supabase.from('centros').select('id, nombre');
            const matchedCentro = existingCentros?.find(
              c => c.nombre.trim().replace(/\s+/g, ' ').toLowerCase() === normalizedInput.toLowerCase()
            );

            let centroResult: Centro | null = null;
            if (matchedCentro) {
                centroResult = await updateCentro(matchedCentro.id, { nombre: matchedCentro.nombre });
                if (centroResult) {
                    await supabase.from('perfiles').upsert({ user_id: session.user.id, centro_id: centroResult.id });
                }
            } else {
                centroResult = await createCentro({ nombre: normalizedInput });
                if (centroResult) {
                    await supabase.from('perfiles').upsert({ user_id: session.user.id, centro_id: centroResult.id });
                }
            }
            return centroResult;
        }
    }, [session?.user?.id, updateCentro, createCentro]);

    const loadCodigosAcceso = useCallback(async (centroId: string): Promise<{ codigos: CodigoAccesoCentro[]; error: string | null }> => {
        const { data, error } = await supabase
            .from('codigos_acceso_centro')
            .select('*')
            .eq('centro_id', centroId)
            .order('created_at', { ascending: false });
        if (error) {
            console.error('[useCentroActions] Error al cargar códigos de acceso:', error);
            return { codigos: [], error: 'No se pudieron cargar los códigos de acceso.' };
        }
        return { codigos: (data || []) as CodigoAccesoCentro[], error: null };
    }, []);

    /**
     * Cambia el centro educativo al que el docente está vinculado.
     * La validación y la persistencia ocurren en Supabase a través de la
     * función RPC `cambiar_centro_vinculado` (SECURITY DEFINER): valida la
     * sesión, la existencia del centro y su disponibilidad para docentes,
     * actualiza `perfiles.centro_id`, registra el rol 'docente' en
     * `centro_roles` (sin permisos administrativos) y desvincula los cursos
     * del centro anterior. NUNCA otorga 'director'/'administrador' en el
     * centro de destino.
     */
    const mapCambioCentroError = (rawMessage?: string | null): string => {
        const msg = (rawMessage || '').toLowerCase();
        if (msg.includes('invalid input') || msg.includes('invalid_text_representation') || msg.includes('22p02')) {
            return 'El ID ingresado no tiene un formato válido de centro educativo.';
        }
        if (msg.includes('permission') || msg.includes('row level security') || msg.includes('42501')) {
            return 'No tienes permisos para cambiar la vinculación a ese centro.';
        }
        if (msg.includes('failed to fetch') || msg.includes('network') || msg.includes('fetch')) {
            return 'Error de conexión. Revisa tu internet e inténtalo de nuevo.';
        }
        return rawMessage || 'Error inesperado al cambiar de centro.';
    };

    const cambiarCentro = useCallback(async (nuevoCentroId: string): Promise<{ ok: boolean; error?: string; message?: string }> => {
        if (!session?.user?.id) {
            return { ok: false, error: 'Tu sesión expiró. Cierra sesión y vuelve a entrar.' };
        }

        const { data, error } = await supabase.rpc('cambiar_centro_vinculado', {
            p_centro_id: nuevoCentroId
        });

        if (error) {
            console.error('[useCentroActions] Error al cambiar de centro:', error);
            return { ok: false, error: mapCambioCentroError(error.message) };
        }

        const r = (data || {}) as { ok?: boolean; message?: string; error?: string; centro_id?: string; centro_nombre?: string };
        if (!r.ok) {
            if (r.error === 'ya_vinculado') {
                return { ok: false, error: 'Ya estás vinculado a este centro educativo.' };
            }
            return { ok: false, error: r.message || 'No se pudo completar el cambio de centro.' };
        }

        // Refrescar el perfil en memoria con el nuevo centro antes de
        // que el entorno se recargue por completo.
        if (r.centro_id) {
            try {
                await loadCentro(r.centro_id);
            } catch (e) {
                console.error('[useCentroActions] No se pudo precargar el nuevo centro:', e);
            }
        }

        return { ok: true, message: r.message || 'Centro educativo actualizado correctamente.' };
    }, [session?.user?.id, loadCentro]);

    return { loadCentro, updateCentro, createCentro, cambiarCentro, updateInstitutoName, loadCodigosAcceso, syncCentroEnPerfil };
}
