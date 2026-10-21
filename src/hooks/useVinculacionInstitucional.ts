import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAppStore } from '../store/appStore';
import { saveCentroCache } from '../cache/centroCache';
import { savePerfilCache } from '../cache/perfilCache';
import type { Centro, UserProfile } from '../types';

export interface CentroNuevoInput {
    nombre: string;
    distritoEducativo?: string;
    codigoCentro?: string;
    telefono?: string;
    tanda?: string;
    tipoInstitucion?: 'publica' | 'privada';
    provincia?: string;
    municipio?: string;
}

const mapCentroRow = (row: Record<string, any>): Centro => ({
    id: row.id as string,
    nombre: row.nombre as string,
    codigoCentro: (row.codigo_centro as string) || '',
    tanda: (row.tanda as string) || 'Jornada Extendida',
    telefono: (row.telefono as string) || '',
    distritoEducativo: (row.distrito_educativo as string) || '',
    regionalEducacion: (row.regional_educacion as string) || '',
    provincia: (row.provincia as string) || '',
    municipio: (row.municipio as string) || '',
    createdBy: row.created_by as string,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
    estado: (row.estado as Centro['estado']) || 'activo',
    afiliado: (row.afiliado as boolean) || false
});

export function useVinculacionInstitucional() {
    const [buscando, setBuscando] = useState(false);
    const [procesando, setProcesando] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const buscarCentros = useCallback(async (termino: string): Promise<Centro[]> => {
        setBuscando(true);
        setError(null);
        try {
            const clean = termino.trim();
            let query = supabase
                .from('centros')
                .select('*')
                .neq('estado', 'cancelado')
                .neq('estado', 'suspendido')
                .order('nombre', { ascending: true })
                .limit(20);

            if (clean) {
                // Buscar por coincidencia parcial en nombre, código de centro o distrito educativo
                query = query.or(`nombre.ilike.%${clean}%,codigo_centro.ilike.%${clean}%,distrito_educativo.ilike.%${clean}%`);
            }

            const { data, error: err } = await query;
            if (err) throw err;
            return (data || []).map(mapCentroRow);
        } catch (err: any) {
            console.error('[useVinculacionInstitucional] Error buscando centros:', err);
            setError(err.message || 'Error al buscar centros educativos.');
            return [];
        } finally {
            setBuscando(false);
        }
    }, []);

    const sincronizarEstadoLocal = useCallback((userId: string, centro: Centro, tipoInstitucion?: 'publica' | 'privada') => {
        saveCentroCache(centro);

        useAppStore.getState().setAppState(prev => {
            let found = false;
            const updatedPerfiles: UserProfile[] = prev.perfiles.map(p => {
                if (p.userId === userId) {
                    found = true;
                    return {
                        ...p,
                        centro_id: centro.id,
                        centro,
                        instituto: centro.nombre,
                        institucion: centro.nombre
                    };
                }
                return p;
            });

            let finalProfile: UserProfile;
            if (!found) {
                finalProfile = {
                    userId,
                    nombreDocente: prev.nombreDocente || 'Docente',
                    bio: '',
                    avatarUrl: prev.perfilAvatarUrl || '',
                    asignatura: Array.isArray(prev.asignaturas) ? prev.asignaturas[0] : '',
                    asignaturas: prev.asignaturas || [],
                    centro_id: centro.id,
                    centro,
                    instituto: centro.nombre,
                    institucion: centro.nombre,
                    rol: 'docente'
                };
                updatedPerfiles.push(finalProfile);
            } else {
                finalProfile = updatedPerfiles.find(p => p.userId === userId)!;
            }

            savePerfilCache(userId, finalProfile);

            return {
                ...prev,
                instituto: centro.nombre,
                tipoInstitucion: tipoInstitucion || prev.tipoInstitucion || 'publica',
                perfiles: updatedPerfiles
            };
        });
    }, []);

    const vincularCentroExistente = useCallback(async (centroId: string, userId: string): Promise<{ ok: boolean; centro?: Centro; error?: string }> => {
        setProcesando(true);
        setError(null);
        try {
            if (!centroId) {
                throw new Error('Debes seleccionar un centro educativo válido.');
            }

            // 1. Ejecutar RPC segura aplicar_vinculo_usuario
            let centroAsignadoId: string | null = null;
            const { data: rpcRes, error: rpcErr } = await supabase.rpc('aplicar_vinculo_usuario', {
                p_modo: 'propia',
                p_centro_id: centroId,
                p_codigo: null,
                p_codigo_centro: null,
                p_nombre_centro: null,
                p_telefono: null
            });

            if (!rpcErr && rpcRes && rpcRes.ok) {
                centroAsignadoId = rpcRes.centro_id || centroId;
            } else {
                console.warn('[useVinculacionInstitucional] Fallback directo a perfiles:', rpcErr?.message || rpcRes?.message);
                // Fallback directo con control RLS
                const { error: updErr } = await supabase
                    .from('perfiles')
                    .update({ centro_id: centroId, rol: 'docente' })
                    .eq('user_id', userId);
                if (updErr) throw updErr;
                centroAsignadoId = centroId;
            }

            // 2. Obtener registro completo del centro desde Supabase
            const { data: centroRow, error: cErr } = await supabase
                .from('centros')
                .select('*')
                .eq('id', centroAsignadoId)
                .single();

            if (cErr || !centroRow) {
                throw new Error('No se pudo verificar el centro en la base de datos.');
            }

            const centro = mapCentroRow(centroRow);
            sincronizarEstadoLocal(userId, centro);

            return { ok: true, centro };
        } catch (err: any) {
            const msg = err.message || 'Error al vincular el centro educativo.';
            setError(msg);
            return { ok: false, error: msg };
        } finally {
            setProcesando(false);
        }
    }, [sincronizarEstadoLocal]);

    const registrarYVincularCentro = useCallback(async (datos: CentroNuevoInput, userId: string): Promise<{ ok: boolean; centro?: Centro; error?: string }> => {
        setProcesando(true);
        setError(null);
        try {
            const nombreClean = datos.nombre.trim();
            if (nombreClean.length < 3) {
                throw new Error('El nombre del centro educativo debe tener al menos 3 caracteres.');
            }

            // 1. Control de duplicados por código de centro si fue provisto
            const codigoClean = datos.codigoCentro?.trim() || null;
            if (codigoClean) {
                const { data: centrosConCodigo } = await supabase
                    .from('centros')
                    .select('id, nombre, codigo_centro')
                    .eq('codigo_centro', codigoClean)
                    .neq('estado', 'cancelado')
                    .limit(1);

                if (centrosConCodigo && centrosConCodigo.length > 0) {
                    throw new Error(`Ya existe un centro educativo registrado con el código \"${codigoClean}\" (${centrosConCodigo[0].nombre}). Por favor selecciónalo en la opción \"Seleccionar centro existente\".`);
                }
            }

            // 2. Crear y vincular vía RPC aplicar_vinculo_usuario (modo referencia)
            let nuevoCentroId: string | null = null;
            const { data: rpcRes, error: rpcErr } = await supabase.rpc('aplicar_vinculo_usuario', {
                p_modo: 'referencia',
                p_centro_id: null,
                p_codigo: null,
                p_codigo_centro: codigoClean,
                p_nombre_centro: nombreClean,
                p_telefono: datos.telefono?.trim() || null
            });

            if (!rpcErr && rpcRes && (rpcRes.ok || rpcRes.centro_id)) {
                nuevoCentroId = rpcRes.centro_id;
            } else {
                console.warn('[useVinculacionInstitucional] Fallback inserción directa de centro:', rpcErr?.message);
                const { data: newRow, error: insErr } = await supabase
                    .from('centros')
                    .insert({
                        nombre: nombreClean,
                        codigo_centro: codigoClean,
                        distrito_educativo: datos.distritoEducativo?.trim() || null,
                        telefono: datos.telefono?.trim() || null,
                        tanda: datos.tanda || 'Jornada Extendida',
                        provincia: datos.provincia?.trim() || null,
                        municipio: datos.municipio?.trim() || null,
                        estado: 'activo',
                        afiliado: false,
                        created_by: userId
                    })
                    .select('*')
                    .single();

                if (insErr) throw insErr;
                nuevoCentroId = newRow.id;

                const { error: perfErr } = await supabase
                    .from('perfiles')
                    .update({ centro_id: nuevoCentroId, rol: 'docente' })
                    .eq('user_id', userId);
                if (perfErr) throw perfErr;
            }

            if (!nuevoCentroId) {
                throw new Error('No se pudo obtener el identificador del centro creado.');
            }

            // 3. Completar campos extendidos del centro si fueron proporcionados
            const updatesExtra: any = {};
            if (datos.distritoEducativo?.trim()) updatesExtra.distrito_educativo = datos.distritoEducativo.trim();
            if (datos.tanda) updatesExtra.tanda = datos.tanda;
            if (datos.provincia?.trim()) updatesExtra.provincia = datos.provincia.trim();
            if (datos.municipio?.trim()) updatesExtra.municipio = datos.municipio.trim();

            if (Object.keys(updatesExtra).length > 0) {
                await supabase
                    .from('centros')
                    .update(updatesExtra)
                    .eq('id', nuevoCentroId);
            }

            // 4. Actualizar tipo de institución en el perfil del usuario si aplica
            if (datos.tipoInstitucion) {
                await supabase
                    .from('perfiles')
                    .update({ tipo_institucion: datos.tipoInstitucion })
                    .eq('user_id', userId);
            }

            // 5. Obtener centro actualizado
            const { data: centroFinalRow, error: errFinal } = await supabase
                .from('centros')
                .select('*')
                .eq('id', nuevoCentroId)
                .single();

            if (errFinal || !centroFinalRow) {
                throw new Error('Error al cargar los datos del centro creado.');
            }

            const centro = mapCentroRow(centroFinalRow);
            sincronizarEstadoLocal(userId, centro, datos.tipoInstitucion);

            return { ok: true, centro };
        } catch (err: any) {
            const msg = err.message || 'Error al registrar el centro educativo.';
            setError(msg);
            return { ok: false, error: msg };
        } finally {
            setProcesando(false);
        }
    }, [sincronizarEstadoLocal]);

    return {
        buscarCentros,
        vincularCentroExistente,
        registrarYVincularCentro,
        buscando,
        procesando,
        error,
        setError
    };
}
