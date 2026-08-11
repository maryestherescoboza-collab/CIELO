import { useCallback, useEffect, useState } from 'react';
import { Check, Copy, KeyRound } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useCentroActions } from '../../hooks/useCentroActions';
import { ESTADO_CODIGO_COLORS, ESTADO_CODIGO_LABELS, formatFechaCorta } from './centroUi';
import type { CodigoAccesoCentro } from '../../types';

interface Props {
    centroId: string;
}

export default function CentroCodigos({ centroId }: Props) {
    const { loadCodigosAcceso } = useCentroActions();

    const [codigosAcceso, setCodigosAcceso] = useState<CodigoAccesoCentro[]>([]);
    const [cargandoCodigos, setCargandoCodigos] = useState(true);
    const [errorCodigos, setErrorCodigos] = useState<string | null>(null);
    const [copiadoId, setCopiadoId] = useState<string | null>(null);

    useEffect(() => {
        if (!centroId) return;
        let activo = true;
        setCargandoCodigos(true);
        setErrorCodigos(null);
        loadCodigosAcceso(centroId).then(({ codigos, error }) => {
            if (!activo) return;
            setCodigosAcceso(codigos);
            if (error) setErrorCodigos(error);
            setCargandoCodigos(false);
        });
        return () => { activo = false; };
    }, [centroId, loadCodigosAcceso]);

    // Realtime: actualiza automáticamente la lista cuando cambian los códigos
    useEffect(() => {
        if (!centroId) return;
        const channel = supabase
            .channel(`codigos-acceso-${centroId}`)
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'codigos_acceso_centro',
                filter: `centro_id=eq.${centroId}`
            }, () => {
                loadCodigosAcceso(centroId).then(({ codigos, error }) => {
                    setCodigosAcceso(codigos);
                    if (error) setErrorCodigos(error);
                });
            })
            .subscribe();
        return () => { supabase.removeChannel(channel); };
    }, [centroId, loadCodigosAcceso]);

    const copiarCodigo = useCallback(async (codigo: string, id: string) => {
        const fallback = () => {
            const textarea = document.createElement('textarea');
            textarea.value = codigo;
            textarea.style.position = 'fixed';
            textarea.style.opacity = '0';
            document.body.appendChild(textarea);
            textarea.select();
            const ok = document.execCommand('copy');
            document.body.removeChild(textarea);
            return ok;
        };
        try {
            if (navigator.clipboard?.writeText) {
                await navigator.clipboard.writeText(codigo);
            } else if (!fallback()) {
                throw new Error('Clipboard no disponible');
            }
            setCopiadoId(id);
            setTimeout(() => setCopiadoId(null), 2000);
        } catch (err) {
            console.error('[CentroCodigos] Error al copiar el código:', err);
        }
    }, []);

    return (
        <section className="bg-[#F9F8F6] border border-[#E6E1D8] rounded-2xl shadow-[0_1px_2px_rgba(0,0,0,0.04),0_12px_32px_rgba(0,0,0,0.05)] overflow-hidden">
            <header className="px-5 py-3.5 border-b border-[#E6E1D8] flex items-center gap-3">
                <span className="w-9 h-9 rounded-xl bg-white border border-[#E6E1D8] flex items-center justify-center text-primary shrink-0">
                    <KeyRound size={16} />
                </span>
                <div className="min-w-0">
                    <h2 className="text-[15px] font-semibold text-[#3F3C36]">Códigos de acceso</h2>
                    <p className="text-[12px] text-[#6B7280] mt-0.5">Comparte estos códigos con los docentes para vincularse al centro</p>
                </div>
            </header>

            <div className="px-5 py-3.5">
                {cargandoCodigos ? (
                    <div className="flex items-center justify-center gap-3 py-10 text-[12px] font-medium text-[#6B7280]">
                        <span className="h-4 w-4 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                        Cargando códigos de acceso…
                    </div>
                ) : errorCodigos ? (
                    <div className="py-10 text-center text-[12px] font-medium text-[#D93025]">
                        {errorCodigos}
                    </div>
                ) : codigosAcceso.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-[#E6E1D8] bg-white/60 px-5 py-10 text-center">
                        <p className="text-[13px] text-[#6B7280]">No hay códigos de acceso para este centro</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                        {codigosAcceso.map(cod => {
                            const esCopiado = copiadoId === cod.id;
                            const estadoVisual = cod.estado === 'activo' && cod.valido_hasta
                                ? (new Date(cod.valido_hasta).getTime() < Date.now() ? 'expirado' : cod.estado)
                                : (cod.estado || 'activo');
                            return (
                                <article key={cod.id} className="bg-white border border-[#E6E1D8] rounded-xl p-4 shadow-sm flex flex-col gap-3">
                                    <div className="flex items-start justify-between gap-2">
                                        <span className="font-mono text-[17px] font-bold tracking-[0.08em] text-[#3F3C36]">
                                            {cod.codigo}
                                        </span>
                                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${ESTADO_CODIGO_COLORS[estadoVisual]}`}>
                                            {ESTADO_CODIGO_LABELS[estadoVisual]}
                                        </span>
                                    </div>

                                    <dl className="flex flex-col gap-2 text-[12px]">
                                        <div className="flex items-center justify-between gap-2">
                                            <dt className="text-[#6B7280]">Creado</dt>
                                            <dd className="font-medium text-[#3F3C36]">{formatFechaCorta(cod.created_at)}</dd>
                                        </div>
                                        <div className="flex items-center justify-between gap-2">
                                            <dt className="text-[#6B7280]">Válido hasta</dt>
                                            <dd className="font-medium text-[#3F3C36]">{formatFechaCorta(cod.valido_hasta)}</dd>
                                        </div>
                                    </dl>

                                    <button
                                        onClick={() => copiarCodigo(cod.codigo, cod.id)}
                                        className={`mt-auto inline-flex items-center justify-center gap-1.5 rounded-xl border px-3 py-2 text-[12px] font-semibold transition-colors ${
                                            esCopiado
                                                ? 'bg-[#188038]/10 border-[#188038]/30 text-[#188038]'
                                                : 'bg-white border-[#E6E1D8] text-primary hover:border-primary'
                                        }`}
                                        title="Copiar código"
                                    >
                                        {esCopiado ? <Check size={14} /> : <Copy size={14} />}
                                        {esCopiado ? 'Copiado' : 'Copiar'}
                                    </button>
                                </article>
                            );
                        })}
                    </div>
                )}
            </div>
        </section>
    );
}
