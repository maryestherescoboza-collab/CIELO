import React, { useState, useEffect } from 'react';
import { Building2, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { savePerfilCache } from '../../cache/perfilCache';
import type { UserProfile } from '../../types';
import logo from '../../assets/logo.png';

interface ConfirmarVinculacionScreenProps {
    currentUserProfile: UserProfile;
    onConfirmed: () => void;
    onLogout: () => void;
}

export const ConfirmarVinculacionScreen: React.FC<ConfirmarVinculacionScreenProps> = ({
    currentUserProfile,
    onConfirmed,
    onLogout
}) => {
    const [centroNombre, setCentroNombre] = useState<string>(
        currentUserProfile.centro?.nombre || currentUserProfile.institucion || ''
    );
    const [cargandoCentro, setCargandoCentro] = useState(!centroNombre && !!currentUserProfile.centro_id);
    const [confirmando, setConfirmando] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const centroId = currentUserProfile.centro_id;

    // Si el nombre no vino en el perfil inicial, resolverlo directamente por centro_id
    useEffect(() => {
        let isMounted = true;
        if (!centroNombre && centroId) {
            setCargandoCentro(true);
            supabase
                .from('centros')
                .select('id, nombre')
                .eq('id', centroId)
                .single()
                .then(({ data, error: err }) => {
                    if (!isMounted) return;
                    if (data?.nombre) {
                        setCentroNombre(data.nombre);
                    } else if (err) {
                        console.error('[ConfirmarVinculacion] Error al consultar centro:', err);
                        setError('No se pudo cargar la información del centro educativo.');
                    }
                    setCargandoCentro(false);
                });
        }
        return () => {
            isMounted = false;
        };
    }, [centroId, centroNombre]);

    const handleConfirmar = async () => {
        if (!centroId) {
            setError('No hay un identificador de centro asociado para confirmar.');
            return;
        }

        setConfirmando(true);
        setError(null);

        try {
            // Confirmación atómica y segura mediante RPC
            const { data, error: rpcErr } = await supabase.rpc('confirmar_vinculacion_centro', {
                p_centro_id: centroId
            });

            if (rpcErr) throw rpcErr;

            const res = data as { ok?: boolean; message?: string } | null;
            if (res && res.ok === false) {
                throw new Error(res.message || 'No se pudo confirmar la vinculación.');
            }

            // Persistir de inmediato en el caché local del perfil
            savePerfilCache(currentUserProfile.userId, {
                ...currentUserProfile,
                vinculo_confirmado: true
            });

            onConfirmed();
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Error al confirmar la vinculación.';
            setError(msg);
        } finally {
            setConfirmando(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#FBFBFA] flex flex-col items-center justify-center p-6 text-center select-none">
            <div className="w-full max-w-md mx-auto flex flex-col items-center animate-fade-in">
                {/* Logo CIELO sutil */}
                <div className="mb-8">
                    <img src={logo} alt="CIELO" className="h-10 w-auto opacity-90 mx-auto" />
                </div>

                {/* Pregunta directa */}
                <h1 className="text-xl sm:text-2xl font-black text-[#2E3330] tracking-tight mb-6">
                    ¿Este es el centro al que te quieres vincular?
                </h1>

                {/* Tarjeta del nombre del centro educativo */}
                <div className="w-full bg-[#FAF7F2] border border-[#EAE4DA] rounded-2xl p-5 mb-8 flex items-center justify-center gap-3 shadow-xs min-h-18">
                    {cargandoCentro ? (
                        <div className="flex items-center gap-2 text-xs font-bold text-[#689C63]">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>Cargando centro educativo…</span>
                        </div>
                    ) : (
                        <>
                            <Building2 className="w-5 h-5 text-[#689C63] shrink-0" />
                            <span className="text-base sm:text-lg font-bold text-[#1E2421] text-center leading-snug">
                                {centroNombre || 'Centro Educativo'}
                            </span>
                        </>
                    )}
                </div>

                {error && (
                    <div className="w-full mb-6 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-bold text-rose-700">
                        {error}
                    </div>
                )}

                {/* Botón principal */}
                <button
                    type="button"
                    onClick={handleConfirmar}
                    disabled={confirmando || cargandoCentro || !centroId}
                    className="w-full py-4 bg-[#689C63] hover:bg-[#5a8a55] text-white rounded-2xl font-black text-xs sm:text-sm tracking-wider uppercase shadow-md shadow-[#689C63]/25 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                >
                    {confirmando ? (
                        <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>Confirmando…</span>
                        </>
                    ) : (
                        'Confirmar mi cuenta'
                    )}
                </button>

                {/* Salida sutil */}
                <button
                    type="button"
                    onClick={onLogout}
                    disabled={confirmando}
                    className="mt-6 text-xs font-bold text-slate-400 hover:text-slate-600 transition-colors uppercase tracking-widest cursor-pointer"
                >
                    Cerrar sesión
                </button>
            </div>
        </div>
    );
};
