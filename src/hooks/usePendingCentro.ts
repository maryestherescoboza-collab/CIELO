import { useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import type { Session } from '@supabase/supabase-js';

const PENDING_CENTRO_KEY = 'pendingCentroCIELO';

interface PendingCentroData {
    modo?: 'nuevo' | 'existente';
    nombre?: string;
    distrito_educativo?: string;
    telefono?: string;
    centro_id?: string;
}

/**
 * Completa la creación del centro educativo cuando el registro fue iniciado
 * con la opción "Crear centro educativo" pero la cuenta aún requería
 * confirmar el correo. En ese caso Auth guarda los datos pendientes en
 * localStorage y, al primer inicio de sesión (sesión ya confirmada), este
 * hook ejecuta la acción correspondiente:
 *
 *   - modo 'nuevo' (valor por defecto): crea el centro, asigna el rol de
 *     director/administrador y asocia el perfil (flujo original).
 *   - modo 'existente': vincula al usuario como administrador del centro que
 *     ya existía en CIELO (guardando perfiles.nombre con el nombre completo
 *     del registro) mediante la función asignar_centro_administrador.
 */
export function usePendingCentro(session: Session | null, onComplete: () => void) {
    const doneRef = useRef(false);

    useEffect(() => {
        if (!session?.user?.id) return;
        if (doneRef.current) return;

        const raw = localStorage.getItem(PENDING_CENTRO_KEY);
        if (!raw) {
            doneRef.current = true;
            return;
        }

        let data: PendingCentroData;
        try {
            data = JSON.parse(raw);
        } catch {
            localStorage.removeItem(PENDING_CENTRO_KEY);
            doneRef.current = true;
            return;
        }

        doneRef.current = true;
        (async () => {
            try {
                if (data.modo === 'existente') {
                    // Centro YA existente: el usuario confirmó el ID durante el
                    // registro. Se crea la cuenta como administrador del centro
                    // y se conserva el nombre completo en perfiles.nombre.
                    if (!data.centro_id) throw new Error('No se identificó el centro educativo.');
                    const { data: result, error } = await supabase.rpc('asignar_centro_administrador', {
                        p_centro_id: data.centro_id,
                        p_nombre: data.nombre || '',
                        p_nombre_docente: data.nombre || ''
                    });
                    if (error) throw error;
                    const r = result as { ok?: boolean; message?: string } | null;
                    if (r && r.ok === false) {
                        throw new Error(r.message || 'No se pudo completar la vinculación.');
                    }
                } else {
                    const { data: centroData, error: centroError } = await supabase
                        .from('centros')
                        .insert({
                            nombre: (data.nombre || '').trim(),
                            distrito_educativo: (data.distrito_educativo || '').trim() || null,
                            telefono: (data.telefono || '').trim(),
                            estado: 'activo',
                            afiliado: true,
                            created_by: session.user.id
                        })
                        .select('id')
                        .single();
                    if (centroError) throw centroError;

                    const { error: rolError } = await supabase
                        .from('centro_roles')
                        .insert({ centro_id: centroData.id, user_id: session.user.id, rol: 'director' });
                    if (rolError) throw rolError;

                    const { error: perfilError } = await supabase
                        .from('perfiles')
                        .upsert({ user_id: session.user.id, centro_id: centroData.id });
                    if (perfilError) console.error('Error al asociar el perfil con el centro:', perfilError);
                }

                localStorage.removeItem(PENDING_CENTRO_KEY);
                onComplete();
            } catch (err) {
                console.error('[usePendingCentro] Error creando el centro pendiente:', err);
                localStorage.removeItem(PENDING_CENTRO_KEY);
            }
        })();
    }, [session, onComplete]);
}
