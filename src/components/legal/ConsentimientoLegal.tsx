import { Link } from 'react-router-dom';
import { FileText, Shield } from 'lucide-react';

interface ConsentimientoLegalProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  variant?: 'compact' | 'full';
}

export function ConsentimientoLegal({ checked, onChange, variant = 'full' }: ConsentimientoLegalProps) {
  if (variant === 'compact') {
    return (
      <div className="w-full mt-4 mb-4 border-t border-slate-100 pt-4">
        <label className="flex items-start gap-3 cursor-pointer group">
          <div className="relative flex items-center justify-center mt-0.5 shrink-0">
            <input
              type="checkbox"
              className="peer sr-only"
              checked={checked}
              onChange={(e) => onChange(e.target.checked)}
            />
            <div className="w-5 h-5 border-2 rounded flex items-center justify-center transition-all bg-white border-slate-300 peer-checked:bg-[#689C63] peer-checked:border-[#689C63] group-hover:border-[#689C63]/50 peer-focus-visible:ring-2 peer-focus-visible:ring-[#689C63] peer-focus-visible:ring-offset-1">
              <svg
                className={`w-3.5 h-3.5 text-white transition-transform ${checked ? 'scale-100' : 'scale-0'}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={3}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-[11px] font-bold text-[#3E3838]/80 leading-snug select-none group-hover:text-[#3E3838] transition-colors">
              He leído y acepto los Términos y Condiciones y el Aviso de Privacidad de CIELO.
            </span>
            <div className="flex items-center gap-2 text-[10px] font-bold">
              <Link to="/terminos" target="_blank" className="text-[#689C63] hover:underline hover:text-[#689C63]/80">
                Términos y Condiciones
              </Link>
              <span className="text-slate-300">•</span>
              <Link to="/privacidad" target="_blank" className="text-[#689C63] hover:underline hover:text-[#689C63]/80">
                Aviso de Privacidad
              </Link>
            </div>
          </div>
        </label>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto mb-8 bg-white border border-(--border-soft) rounded-2xl p-6 shadow-[0_2px_8px_rgba(0,0,0,0.04)] relative z-10">
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 bg-(--linen)/50 rounded-2xl flex items-center justify-center shrink-0 border border-(--border-soft)">
          <Shield className="text-(--primary)" size={20} />
        </div>
        
        <div className="flex-1">
          <h3 className="text-sm font-bold text-(--ink) mb-1 flex items-center gap-2">
            Antes de contratar
          </h3>
          <p className="text-xs text-(--ink-soft) leading-relaxed mb-4">
            Te recomendamos leer nuestros documentos legales. Al contratar un plan de CIELO, 
            debes aceptar nuestros{' '}
            <Link to="/terminos" target="_blank" className="font-semibold text-(--primary) hover:underline inline-flex items-center gap-1">
              <FileText size={12} /> Términos y Condiciones
            </Link>{' '}
            y nuestro{' '}
            <Link to="/privacidad" target="_blank" className="font-semibold text-(--primary) hover:underline inline-flex items-center gap-1">
              <Shield size={12} /> Aviso de Privacidad
            </Link>.
          </p>
          
          <label className="flex items-start gap-3 cursor-pointer group">
            <div className="relative flex items-center justify-center mt-0.5">
              <input
                type="checkbox"
                className="peer sr-only"
                checked={checked}
                onChange={(e) => onChange(e.target.checked)}
              />
              <div className="w-5 h-5 border-2 rounded flex items-center justify-center transition-all bg-white border-slate-300 peer-checked:bg-(--primary) peer-checked:border-(--primary) group-hover:border-(--primary)/50 peer-focus-visible:ring-2 peer-focus-visible:ring-(--primary) peer-focus-visible:ring-offset-2">
                <svg
                  className={`w-3.5 h-3.5 text-white transition-transform ${checked ? 'scale-100' : 'scale-0'}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={3}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </div>
            <span className="text-xs font-medium text-(--ink) leading-snug select-none group-hover:text-(--ink) transition-colors">
              Declaro que he leído y acepto los Términos y Condiciones y el Aviso de Privacidad de CIELO.
            </span>
          </label>
        </div>
      </div>
    </div>
  );
}
