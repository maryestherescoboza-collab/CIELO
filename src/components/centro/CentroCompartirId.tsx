import { useState } from 'react';
import { Check, Copy, Share2, Eye, EyeOff } from 'lucide-react';

interface Props {
    centroId: string;
}

export default function CentroCompartirId({ centroId }: Props) {
    const [mostrando, setMostrando] = useState(false);
    const [copiado, setCopiado] = useState(false);

    const idCentro = centroId || '';

    const copiarId = async () => {
        if (!idCentro) return;
        const fallback = () => {
            const textarea = document.createElement('textarea');
            textarea.value = idCentro;
            textarea.style.position = 'fixed';
            textarea.style.opacity = '0';
            document.body.appendChild(textarea);
            textarea.select();
            const ok = document.execCommand('copy');
            document.body.removeChild(textarea);
            return ok;
        };
        let ok = false;
        try {
            if (navigator.clipboard?.writeText) {
                await navigator.clipboard.writeText(idCentro);
                ok = true;
            } else if (fallback()) {
                ok = true;
            }
        } catch {
            ok = fallback();
        }
        if (ok) {
            setCopiado(true);
            setTimeout(() => setCopiado(false), 2000);
        }
    };

    const compartirId = async () => {
        if (!idCentro) return;
        if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
            try {
                await navigator.share({
                    title: 'ID del centro',
                    text: `Comparte este ID con los docentes que quieras vincular a este centro: ${idCentro}`,
                });
                return;
            } catch (err) {
                if ((err as { name?: string })?.name === 'AbortError') return;
            }
        }
        await copiarId();
    };

    return (
        <div className="rounded-xl bg-white border border-[#E6E1D8] p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <h3 className="text-[13px] font-semibold text-[#3F3C36]">ID del centro</h3>
                    <p className="mt-0.5 text-xs text-[#6B7280]">
                        Comparte este ID con los docentes que quieras vincular a este centro.
                    </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    <button
                        type="button"
                        onClick={() => setMostrando(v => !v)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-[#E6E1D8] bg-white px-2.5 py-1.5 text-xs font-semibold text-primary hover:border-primary transition-colors"
                        title={mostrando ? 'Ocultar ID' : 'Mostrar ID'}
                    >
                        {mostrando ? <EyeOff size={12} /> : <Eye size={12} />}
                        {mostrando ? 'Ocultar' : 'Mostrar'}
                    </button>
                    <button
                        type="button"
                        onClick={copiarId}
                        disabled={!idCentro}
                        className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                            copiado
                                ? 'bg-[#188038]/10 border-[#188038]/30 text-[#188038]'
                                : 'bg-white border-[#E6E1D8] text-primary hover:border-primary'
                        }`}
                        title="Copiar ID del centro"
                    >
                        {copiado ? <Check size={12} /> : <Copy size={12} />}
                        {copiado ? 'ID copiado' : 'Copiar'}
                    </button>
                    <button
                        type="button"
                        onClick={compartirId}
                        disabled={!idCentro}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-[#E6E1D8] bg-white px-2.5 py-1.5 text-xs font-semibold text-primary hover:border-primary transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                        title="Compartir ID del centro"
                    >
                        <Share2 size={12} />
                        Compartir
                    </button>
                </div>
            </div>
            <p className="mt-2.5 font-mono text-[14px] font-semibold tracking-[0.06em] text-[#3F3C36] break-all">
                {mostrando ? idCentro || '-' : '\u2022'.repeat(8)}
            </p>
        </div>
    );
}