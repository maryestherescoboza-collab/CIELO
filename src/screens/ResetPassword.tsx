import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Lock, Loader2, Check, X, ShieldCheck, ArrowLeft } from 'lucide-react';
import logo from '../assets/logo.png';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  const [isValidating, setIsValidating] = useState(true);
  const [tokenError, setTokenError] = useState<string | null>(null);
  const [docenteNombre, setDocenteNombre] = useState('Docente');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Requisitos de complejidad de contraseña
  const matchesLength = password.length >= 8;
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const isStrong = matchesLength && hasUppercase && hasLowercase && hasNumber;
  const matchesConfirm = password === confirmPassword && confirmPassword !== '';

  const API_URL = import.meta.env.VITE_AUTH_API_URL || 'http://localhost:3001';

  useEffect(() => {
    if (!token) {
      setTokenError('El enlace de recuperación es inválido porque falta el token de seguridad.');
      setIsValidating(false);
      return;
    }

    const validateToken = async () => {
      console.log(`[ResetPassword.tsx] Validando token con el backend en: ${API_URL}/api/auth/validate-token`);
      try {
        const response = await fetch(`${API_URL}/api/auth/validate-token`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token })
        });
        
        console.log(`[ResetPassword.tsx] Respuesta de validación de token recibida. Status: ${response.status}`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'El token no es válido o ha expirado.');
        }

        if (data.valid) {
          setDocenteNombre(data.nombreDocente);
        } else {
          setTokenError('El enlace de recuperación ha expirado, ya fue utilizado o es inválido.');
        }
      } catch (err: any) {
        console.error("[ResetPassword.tsx] Error en validateToken:", err);
        if (err.name === 'TypeError' || err.message?.toLowerCase().includes('failed to fetch') || err.message?.toLowerCase().includes('fetch failed')) {
          setTokenError(`Error de Conexión: No se pudo conectar al servidor de autenticación en ${API_URL}. Verifique que el backend esté ejecutándose en el puerto 3001.`);
        } else {
          setTokenError(err.message || 'Error al validar el enlace de recuperación.');
        }
      } finally {
        setIsValidating(false);
      }
    };

    validateToken();
  }, [token, API_URL]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isStrong) {
      setError('La contraseña debe cumplir con todos los requisitos de seguridad.');
      return;
    }
    if (!matchesConfirm) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      console.log(`[ResetPassword.tsx] Enviando solicitud de cambio de contraseña a: ${API_URL}/api/auth/reset-password`);
      const response = await fetch(`${API_URL}/api/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password, confirmPassword })
      });
      
      console.log(`[ResetPassword.tsx] Respuesta de restablecimiento de contraseña recibida. Status: ${response.status}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Ocurrió un error al restablecer la contraseña.');
      }

      setSuccess(true);
      setTimeout(() => {
        navigate('/');
      }, 5000);
    } catch (err: any) {
      console.error("[ResetPassword.tsx] Error en handleSubmit (restablecimiento de contraseña):", err);
      if (err.name === 'TypeError' || err.message?.toLowerCase().includes('failed to fetch') || err.message?.toLowerCase().includes('fetch failed')) {
        setError(`Error de Conexión: No se pudo conectar al servidor de autenticación en ${API_URL}. Compruebe que el backend esté en línea.`);
      } else {
        setError(err.message || 'No se pudo restablecer la contraseña.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen relative flex flex-col justify-center items-center px-6 overflow-hidden bg-(--paper) font-body">
      {/* Background blobs for premium feel */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-20 -left-20 w-80 h-80 bg-emerald-600/5 rounded-full blur-[100px] animate-blob"></div>
        <div className="absolute top-1/2 -right-20 w-96 h-96 bg-emerald-700/5 rounded-full blur-[100px] animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-20 left-1/4 w-72 h-72 bg-emerald-500/5 rounded-full blur-[80px] animate-blob animation-delay-4000"></div>
      </div>

      <main className="w-full max-w-md relative z-10 py-12">
        {/* Brand Identity */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-36 h-36 md:w-44 md:h-44 p-4 bg-white rounded-3xl shadow-paper border border-(--line) flex items-center justify-center mb-4">
            <img alt="Brand Logo" className="app-logo w-full h-full" src={logo} />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-black text-(--ink) tracking-tighter mb-1">Portfolio Pro</h1>
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-(--ink-soft) opacity-40">Restablecer Contraseña</p>
          </div>
        </div>

        {/* Card Container */}
        <div className="bg-white/80 backdrop-blur-xl rounded-[2.5rem] p-8 shadow-2xl border border-white relative overflow-hidden">
          
          {isValidating ? (
            <div className="py-12 flex flex-col items-center justify-center space-y-4">
              <Loader2 className="w-12 h-12 text-emerald-600 animate-spin" />
              <p className="text-sm font-semibold text-(--ink-soft)">Verificando enlace de seguridad...</p>
            </div>
          ) : tokenError ? (
            <div className="space-y-6 text-center py-4">
              <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto text-red-500 border border-red-100">
                <X size={28} />
              </div>
              <div>
                <h2 className="text-lg font-black text-(--ink) mb-2">Enlace inválido o expirado</h2>
                <p className="text-xs text-(--ink-soft) leading-relaxed">{tokenError}</p>
              </div>
              <button
                onClick={() => navigate('/')}
                className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black text-[10px] tracking-[0.2em] shadow-xl shadow-emerald-900/10 transition-all active:scale-[0.98] uppercase flex items-center justify-center gap-2"
              >
                <ArrowLeft size={12} />
                Volver al inicio de sesión
              </button>
            </div>
          ) : success ? (
            <div className="space-y-6 text-center py-4">
              <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto text-emerald-600 border border-emerald-100 animate-bounce">
                <ShieldCheck size={28} />
              </div>
              <div>
                <h2 className="text-lg font-black text-(--ink) mb-2">¡Contraseña restablecida!</h2>
                <p className="text-xs text-(--ink-soft) leading-relaxed">
                  Tu contraseña se ha cambiado correctamente. En unos segundos serás redirigido a la pantalla de inicio de sesión para que ingreses con tus nuevas credenciales.
                </p>
              </div>
              <button
                onClick={() => navigate('/')}
                className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black text-[10px] tracking-[0.2em] shadow-xl shadow-emerald-900/10 transition-all active:scale-[0.98] uppercase"
              >
                Ir a Iniciar Sesión ahora
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5 animate-fade-in">
              <div className="mb-4">
                <h2 className="text-base font-black text-(--ink)">Establece tu nueva contraseña</h2>
                <p className="text-[11px] font-bold text-(--ink-soft) opacity-40 uppercase tracking-wider mt-1">
                  Hola {docenteNombre}, ingresa tus nuevas credenciales
                </p>
              </div>

              {error && (
                <div className="p-4 bg-red-50/50 border border-red-100 rounded-2xl text-[11px] font-bold text-red-600 flex items-center gap-2">
                  <span className="w-1 h-1 bg-red-600 rounded-full animate-pulse"></span>
                  {error}
                </div>
              )}

              {/* Password field */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-(--ink-soft) uppercase tracking-widest ml-1 opacity-40">Nueva Contraseña</label>
                <div className="relative group">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-600 group-focus-within:text-(--accent-orange) transition-colors" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-11 pr-4 py-3.5 bg-white border border-(--line) rounded-2xl focus:ring-4 focus:ring-emerald-600/5 focus:border-emerald-600/20 outline-none transition-all text-sm font-semibold"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              {/* Confirm Password field */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-(--ink-soft) uppercase tracking-widest ml-1 opacity-40">Confirmar Nueva Contraseña</label>
                <div className="relative group">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-(--ink-soft) opacity-20 group-focus-within:text-emerald-600 transition-colors" />
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full pl-11 pr-4 py-3.5 bg-white border border-(--line) rounded-2xl focus:ring-4 focus:ring-emerald-600/5 focus:border-emerald-600/20 outline-none transition-all text-sm font-semibold"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              {/* Password strength checklist */}
              <div className="p-4 bg-slate-50/50 rounded-2xl border border-slate-100 space-y-2.5">
                <p className="text-[9px] font-black uppercase tracking-widest text-(--ink-soft) opacity-40">Requisitos de Seguridad</p>
                <div className="grid grid-cols-2 gap-2">
                  <div className={`flex items-center gap-2 text-[10px] font-bold ${matchesLength ? 'text-emerald-600' : 'text-slate-400'}`}>
                    {matchesLength ? <Check size={12} /> : <span className="w-1.5 h-1.5 bg-slate-300 rounded-full ml-1"></span>}
                    Mínimo 8 caracteres
                  </div>
                  <div className={`flex items-center gap-2 text-[10px] font-bold ${hasUppercase ? 'text-emerald-600' : 'text-slate-400'}`}>
                    {hasUppercase ? <Check size={12} /> : <span className="w-1.5 h-1.5 bg-slate-300 rounded-full ml-1"></span>}
                    Una letra mayúscula
                  </div>
                  <div className={`flex items-center gap-2 text-[10px] font-bold ${hasLowercase ? 'text-emerald-600' : 'text-slate-400'}`}>
                    {hasLowercase ? <Check size={12} /> : <span className="w-1.5 h-1.5 bg-slate-300 rounded-full ml-1"></span>}
                    Una letra minúscula
                  </div>
                  <div className={`flex items-center gap-2 text-[10px] font-bold ${hasNumber ? 'text-emerald-600' : 'text-slate-400'}`}>
                    {hasNumber ? <Check size={12} /> : <span className="w-1.5 h-1.5 bg-slate-300 rounded-full ml-1"></span>}
                    Al menos un número
                  </div>
                </div>
                {confirmPassword && (
                  <div className={`pt-2 border-t border-slate-100 flex items-center gap-2 text-[10px] font-bold ${matchesConfirm ? 'text-emerald-600' : 'text-red-500'}`}>
                    {matchesConfirm ? <Check size={12} /> : <X size={12} />}
                    {matchesConfirm ? 'Las contraseñas coinciden' : 'Las contraseñas no coinciden'}
                  </div>
                )}
              </div>

              {/* Submit button */}
              <button
                type="submit"
                disabled={submitting || !isStrong || !matchesConfirm}
                className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black text-[10px] tracking-[0.2em] shadow-xl shadow-emerald-900/10 transition-all active:scale-[0.98] disabled:opacity-40 flex items-center justify-center gap-3 uppercase"
              >
                {submitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    Restablecer Contraseña
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => navigate('/')}
                className="w-full text-center text-[10px] font-black text-(--ink-soft) opacity-40 hover:opacity-100 hover:text-emerald-600 transition-all uppercase tracking-widest pt-2"
              >
                Cancelar y regresar
              </button>
            </form>
          )}
        </div>

        {/* Brand Meta */}
        <p className="mt-8 text-center text-[10px] font-bold text-(--ink-soft) opacity-20 uppercase tracking-[0.3em]">Noether v2.4.0 • 2026 Edition</p>
      </main>
    </div>
  );
}
