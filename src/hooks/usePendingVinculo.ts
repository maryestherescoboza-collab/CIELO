import { useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import type { Session } from '@supabase/supabase-js';

const PENDING_VINCULO_KEY = 'pendingVinculoCIELO';

export function usePendingVinculo(session: Session | null, onComplete: () => void) {
    const doneRef = useRef(false);

    useEffect(() => {
        if (!session?.user?.id) return;
        if (doneRef.current) return;

        const raw = localStorage.getItem(PENDING_VINCULO_KEY);
        if (!raw) {
            doneRef.current = true;
            return;
        }

        let data: any;
        try {
            data = JSON.parse(raw);
        } catch {
            localStorage.removeItem(PENDING_VINCULO_KEY);
            doneRef.current = true;
            return;
        }

        doneRef.current = true;
        (async () => {
            try {
                const modo = data.modo;
                
                if (modo === 'institucional_id') {
                    const { data: result, error } = await supabase.rpc('validar_ingreso_centro_institucional', {
                        p_centro_id_seleccionado: data.centroId,
                        p_id_introducida: data.id_introducida ? data.id_introducida.trim() : null
                    });
                    
                    if (error) throw error;
                    if (result && typeof result === 'object' && 'ok' in (result as any) && (result as any).ok === false) {
                        throw new Error(String((result as any).message || 'La ID no corresponde al centro seleccionado.'));
                    }
                } else {
                    const { data: result, error } = await supabase.rpc('aplicar_vinculo_usuario', {
                        p_modo: modo,
                        p_centro_id: modo === 'propia' || modo === 'codigo' ? data.centroId || null : null,
                        p_codigo: modo === 'codigo' ? data.codigo || null : null,
                        p_nombre_centro: modo === 'referencia' && data.centro ? data.centro.nombre || null : null,
                        p_codigo_centro: modo === 'referencia' && data.centro ? data.centro.codigoCentro || null : null,
                        p_telefono: modo === 'referencia' && data.centro ? data.centro.telefono || null : null
                    });

                    if (error) throw error;
                    if (result && typeof result === 'object' && 'ok' in (result as any) && (result as any).ok === false) {
                        throw new Error(String((result as any).message || 'Error al aplicar el vínculo.'));
                    }
                }

                localStorage.removeItem(PENDING_VINCULO_KEY);
                onComplete();
            } catch (err) {
                const errorMessage = err instanceof Error ? err.message : 'Error al vincular el centro.';
                alert('Hubo un problema al finalizar tu registro: ' + errorMessage);
                console.error('[usePendingVinculo] Error aplicando el vinculo pendiente:', err);
                localStorage.removeItem(PENDING_VINCULO_KEY);
                // NO se ejecuta onComplete() aquí. La aplicación no debe continuar como si el vínculo hubiera sido exitoso.
            }
        })();
    }, [session, onComplete]);
}
