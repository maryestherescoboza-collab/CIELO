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
                const { data, error } = await supabase.rpc('procesar_vinculo_pendiente', {
                    p_vinculo: pendingVinculo
                });

                if (error) {
                    throw error;
                }

                if (data && typeof data === 'object' && 'ok' in data && data.ok === false) {
                    // Si ya estaba procesado, también devuelve ok: true con message.
                    // Si falla, devuelve ok: false con message.
                    throw new Error(String(data.message || 'Error desconocido procesando vínculo'));
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
                // Si falla, NO limpiamos la metadata para permitir reintentos (idempotencia).
                console.error('[useProcesarVinculo] Error al procesar vínculo pendiente:', err);
                // const errorMessage = err instanceof Error ? err.message : 'Ocurrió un problema inesperado.';
                // Optional: alert('No pudimos completar tu registro automáticamente. Por favor recarga la página o contacta a soporte: ' + errorMessage);
            }
        })();
    }, [session, onComplete]);
}
