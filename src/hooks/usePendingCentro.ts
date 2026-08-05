import { useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import type { Session } from '@supabase/supabase-js';

const PENDING_CENTRO_KEY = 'pendingCentroCIELO';

interface PendingCentroData {
    nombre: string;
    codigo_centro?: string;
    telefono?: string;
}

/**
 * Completa la creación del centro educativo cuando el registro fue iniciado
 * con la opción "Sí, crear un centro educativo" pero la cuenta aún requería
 * confirmar el correo. En ese caso Auth guarda los datos del centro pendientes
 * en localStorage y, al primer inicio de sesión (sesión ya confirmada), este
 * hook crea el centro, asigna el rol de director y asocia el perfil.
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
                const { data: centroData, error: centroError } = await supabase
                    .from('centros')
                    .insert({
                        nombre: (data.nombre || '').trim(),
                        codigo_centro: (data.codigo_centro || '').trim() || null,
                        telefono: (data.telefono || '').trim() || null,
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

                if (data.codigo_centro) {
                    await supabase
                        .from('codigos_acceso_centro')
                        .insert({
                            centro_id: centroData.id,
                            codigo: String(data.codigo_centro).trim().toUpperCase(),
                            estado: 'activo',
                            created_by: session.user.id
                        })
                        .then(({ error: codError }) => {
                            if (codError) console.error('Error al crear el código de acceso del centro:', codError);
                        });
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
