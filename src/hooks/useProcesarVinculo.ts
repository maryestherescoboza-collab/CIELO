import { useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import type { Session } from '@supabase/supabase-js';

export function useProcesarVinculo(session: Session | null, onComplete: () => void) {
    const doneRef = useRef(false);

    useEffect(() => {
        if (!session?.user?.id) return;
        if (doneRef.current) return;

        const metadata = session.user.user_metadata;
        const pendingVinculo = metadata?.pending_vinculo;

        if (!pendingVinculo) {
            doneRef.current = true;
            return;
        }

        doneRef.current = true;
        (async () => {
            try {
                let result: any = null;

                if (pendingVinculo.tipo === 'referencia') {
                    // Flujo docente que agregó un centro nuevo por referencia
                    const nombreCentro = pendingVinculo.centro?.nombre?.trim();
                    if (!nombreCentro) {
                        throw new Error('Nombre de centro requerido');
                    }
                    const { data, error } = await supabase.rpc('aplicar_vinculo_usuario', {
                        p_modo: 'referencia',
                        p_centro_id: null,
                        p_codigo: null,
                        p_codigo_centro: pendingVinculo.centro?.codigoCentro?.trim() || null,
                        p_nombre_centro: nombreCentro,
                        p_telefono: pendingVinculo.centro?.telefono?.trim() || null
                    });
                    if (error) {
                        console.warn('[useProcesarVinculo] Fallback directo para referencia:', error.message);
                        const { data: cExistente } = await supabase.from('centros').select('id').ilike('nombre', nombreCentro).maybeSingle();
                        let targetCentroId = cExistente?.id;
                        if (!targetCentroId) {
                            const { data: newC, error: newErr } = await supabase.from('centros').insert({
                                nombre: nombreCentro,
                                telefono: pendingVinculo.centro?.telefono?.trim() || null,
                                distrito_educativo: pendingVinculo.centro?.distritoEducativo?.trim() || pendingVinculo.centro?.distrito_educativo?.trim() || null,
                                estado: 'activo',
                                afiliado: false,
                                created_by: session.user.id
                            }).select('id').single();
                            if (newErr) throw newErr;
                            targetCentroId = newC.id;
                        }
                        await supabase.from('perfiles').upsert({
                            user_id: session.user.id,
                            centro_id: targetCentroId,
                            rol: 'docente'
                        });
                        result = { ok: true, centro_id: targetCentroId };
                    } else {
                        result = data;
                    }
                } else if (pendingVinculo.tipo === 'unirse') {
                    // Si el payload antiguo viene con centro_id nulo, descartar de forma segura
                    if (!pendingVinculo.centro_id) {
                        console.warn('[useProcesarVinculo] Payload de vínculo corrupto (centro_id es null). Limpiando metadata pendiente.');
                        await supabase.auth.updateUser({ data: { pending_vinculo: null } });
                        onComplete();
                        return;
                    }
                    const { data, error } = await supabase.rpc('procesar_vinculo_pendiente', {
                        p_vinculo: pendingVinculo
                    });
                    if (error) throw error;
                    result = data;
                } else {
                    const { data, error } = await supabase.rpc('procesar_vinculo_pendiente', {
                        p_vinculo: pendingVinculo
                    });
                    if (error) throw error;
                    result = data;
                }

                if (result && typeof result === 'object' && 'ok' in result && result.ok === false) {
                    throw new Error(String(result.message || 'Error desconocido procesando vínculo'));
                }

                // Operación exitosa o ya estaba procesada. Limpiamos la metadata de forma segura.
                const { error: updateError } = await supabase.auth.updateUser({
                    data: { pending_vinculo: null }
                });

                if (updateError) {
                    console.error('[useProcesarVinculo] Vínculo procesado pero falló la limpieza de metadata:', updateError);
                }

                onComplete();
            } catch (err) {
                console.error('[useProcesarVinculo] Error al procesar vínculo pendiente:', err);
                const msg = err instanceof Error ? err.message : String(err);
                if (msg.includes('UUID de centro requerido') || msg.includes('Payload inválido')) {
                    console.warn('[useProcesarVinculo] Metadata corrupta detectada, limpiando para evitar bucle.');
                    await supabase.auth.updateUser({ data: { pending_vinculo: null } });
                }
            }
        })();
    }, [session, onComplete]);
}
