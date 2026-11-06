import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  GraduationCap, 
  QrCode, 
  KeyRound, 
  ArrowRight, 
  AlertCircle, 
  ArrowLeft,
  School,
  CheckCircle2
} from 'lucide-react';
import './PortalStyles.css';

// Regex para validar formato UUID estándar
const UUID_REGEX = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

export default function PortalGeneral() {
  const navigate = useNavigate();
  const [inputVal, setInputVal] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmed = inputVal.trim();
    if (!trimmed) {
      setError('Por favor introduce tu código de acceso o el enlace que te compartió tu docente.');
      return;
    }

    // Si el usuario pegó la URL completa o directamente el código UUID
    const match = trimmed.match(UUID_REGEX);
    if (match && match[0]) {
      const token = match[0].toLowerCase();
      navigate(`/portal/${token}`);
    } else {
      setError('El código o enlace ingresado no tiene un formato válido. Revisa el enlace o escanea el código QR de tu boletín.');
    }
  };

  return (
    <div className="portal-root min-h-screen bg-(--background) flex flex-col items-center justify-between p-4 sm:p-6 bg-[radial-gradient(circle,#00000010_1.5px,transparent_1.5px)]" style={{ backgroundSize: '22px 22px' }}>
      
      {/* Top Navbar Header */}
      <header className="w-full max-w-4xl flex items-center justify-between py-3 mb-4">
        <Link 
          to="/" 
          className="inline-flex items-center gap-2 text-xs font-bold text-(--ink-soft) hover:text-(--ink) transition-colors bg-white/80 backdrop-blur-sm px-3.5 py-2 rounded-full border border-(--border-soft) shadow-2xs"
        >
          <ArrowLeft size={14} />
          <span>Volver al inicio</span>
        </Link>

        <span className="text-[10px] font-bold text-(--ink-soft) uppercase tracking-widest bg-(--linen)/50 px-3 py-1 rounded-full border border-(--border-soft)">
          Portal Estudiantes & Familias
        </span>
      </header>

      {/* Main Container */}
      <main className="w-full max-w-xl my-auto">
        <div className="relative">
          {/* Sombra rayada diagonal artesanal tipo grabado */}
          <div aria-hidden="true" className="absolute top-2 left-2 -right-2 -bottom-2 rounded-2xl pointer-events-none portal-hatched-shadow" />
          
          <div className="relative z-10 bg-white p-6 sm:p-10 rounded-2xl border-[2.5px] border-[#1E1E24]">
            
            {/* Header Icon & Title */}
            <div className="text-center mb-8">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-[#537BAC]/15 border-2 border-[#537BAC] flex items-center justify-center">
                <GraduationCap className="text-[#2C4F7C]" size={34} />
              </div>

              <h1 className="text-2xl sm:text-3xl font-black text-(--ink) mb-2 uppercase tracking-tight">
                Portal del Estudiante
              </h1>
              <p className="text-xs sm:text-sm text-(--ink-soft) max-w-md mx-auto leading-relaxed">
                Espacio oficial para consultar avances curriculares, portafolios de evidencias, actividades y retroalimentación pedagógica.
              </p>
            </div>

            {/* Formulario de Código o Enlace */}
            <form onSubmit={handleSubmit} className="mb-8">
              <label 
                htmlFor="portal-code-input" 
                className="block text-xs font-black uppercase tracking-wider text-(--ink) mb-2"
              >
                Ingresa tu código o enlace de acceso
              </label>

              <div className="flex flex-col sm:flex-row gap-2.5">
                <div className="relative flex-1">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <KeyRound size={16} />
                  </div>
                  <input
                    id="portal-code-input"
                    type="text"
                    value={inputVal}
                    onChange={(e) => {
                      setInputVal(e.target.value);
                      if (error) setError(null);
                    }}
                    placeholder="Pega tu enlace o código aquí..."
                    className="w-full pl-10 pr-4 py-3 text-xs sm:text-sm font-medium rounded-xl border border-(--border-soft) bg-(--background) focus:bg-white focus:border-[#537BAC] focus:ring-2 focus:ring-[#537BAC]/15 outline-none transition-all"
                  />
                </div>

                <button
                  type="submit"
                  className="px-6 py-3 bg-[#1E1E24] hover:bg-[#343541] active:scale-98 text-white rounded-xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all cursor-pointer shrink-0 shadow-sm"
                >
                  <span>Ingresar</span>
                  <ArrowRight size={14} />
                </button>
              </div>

              {error && (
                <div className="mt-3 p-3 rounded-xl bg-danger/10 border border-danger/30 flex items-start gap-2.5 animate-in fade-in">
                  <AlertCircle className="text-danger shrink-0 mt-0.5" size={16} />
                  <p className="text-xs font-bold text-danger">{error}</p>
                </div>
              )}
            </form>

            {/* Guía de Acceso para Estudiantes y Familias */}
            <div className="border-t border-(--border-soft) pt-6 space-y-4">
              <p className="text-[11px] font-black uppercase tracking-widest text-(--ink-soft)">
                ¿Cómo obtener tu acceso?
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Opción 1: Código QR en Boletín */}
                <div className="p-4 rounded-xl bg-(--linen)/25 border border-(--border-soft) flex flex-col justify-between">
                  <div>
                    <div className="w-8 h-8 rounded-lg bg-[#DEAE4D]/20 text-[#8F641B] flex items-center justify-center mb-2.5">
                      <QrCode size={18} />
                    </div>
                    <h3 className="text-xs font-bold text-(--ink) mb-1">
                      Código QR en tu boletín
                    </h3>
                    <p className="text-[11px] text-(--ink-soft) leading-snug">
                      Escanea con la cámara de tu teléfono el código QR impreso en la parte superior de tu informe curricular.
                    </p>
                  </div>
                  <div className="mt-3 inline-flex items-center gap-1 text-[10px] font-bold text-[#8F641B]">
                    <CheckCircle2 size={12} />
                    <span>Acceso directo sin escribir</span>
                  </div>
                </div>

                {/* Opción 2: Enlace del Docente */}
                <div className="p-4 rounded-xl bg-(--linen)/25 border border-(--border-soft) flex flex-col justify-between">
                  <div>
                    <div className="w-8 h-8 rounded-lg bg-[#689C63]/20 text-[#4B7547] flex items-center justify-center mb-2.5">
                      <School size={18} />
                    </div>
                    <h3 className="text-xs font-bold text-(--ink) mb-1">
                      Enlace de tu profesor
                    </h3>
                    <p className="text-[11px] text-(--ink-soft) leading-snug">
                      Tu docente puede generar tu enlace o código en cualquier momento desde su perfil de CIELO.
                    </p>
                  </div>
                  <div className="mt-3 inline-flex items-center gap-1 text-[10px] font-bold text-[#4B7547]">
                    <CheckCircle2 size={12} />
                    <span>Solicítalo a tu docente</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Pie de la tarjeta */}
            <div className="mt-8 pt-5 border-t border-(--border-soft) flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
              <span className="text-[11px] text-(--ink-soft)">
                ¿Eres docente o directivo de un centro?
              </span>
              <Link
                to="/login"
                className="text-[11px] font-bold text-(--ink) underline hover:text-[#537BAC] transition-colors"
              >
                Iniciar sesión docente
              </Link>
            </div>

          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full max-w-xl text-center py-4">
        <p className="text-[11px] text-(--ink-soft)">
          Plataforma Educativa CIELO · Evaluación por competencias y acompañamiento pedagógico
        </p>
      </footer>

    </div>
  );
}

