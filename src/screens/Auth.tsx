import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Mail, Lock, Loader2, User, ArrowRight } from 'lucide-react';
import logo from '../assets/logo.png';

interface AuthProps {
  onAuthSuccess: () => void;
}

// Lista removida, se usa ASIGNATURAS_CATALOGO importado

const Auth = ({ onAuthSuccess }: AuthProps) => {
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nombreDocente, setNombreDocente] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Password recovery states
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSuccess, setForgotSuccess] = useState<string | null>(null);

  // Email verification states
  const [needsEmailConfirmation, setNeedsEmailConfirmation] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendSuccess, setResendSuccess] = useState<string | null>(null);

  useEffect(() => {
    let interval: any;
    if (resendCooldown > 0) {
      interval = setInterval(() => {
        setResendCooldown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [resendCooldown]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const plan = params.get('plan');
    if (plan) {
      setIsSignUp(true);
      // Guardar el plan en localStorage temporalmente para recogerlo tras registrarse
      localStorage.setItem('onboardingPlan', plan);
    }
  }, []);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResendSuccess(null);
    setNeedsEmailConfirmation(false);

    try {
      if (isSignUp) {
        if (!nombreDocente.trim()) throw new Error('Por favor ingresa tu nombre completo.');

        const redirectUrl = window.location.hostname === "localhost" 
          ? "http://localhost:5173" // Vite default local port
          : "https://evaluacielo.com";

        const { data: authData, error: signUpError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            emailRedirectTo: redirectUrl,
            data: {
              nombre_docente: nombreDocente.trim()
            }
          }
        });

        if (signUpError) throw signUpError;
        if (!authData.user) throw new Error('No se pudo crear el usuario.');

        // Insertar el Perfil inicial sin centro_id
        const { error: profileError } = await supabase.from('perfiles').upsert({
          user_id: authData.user.id,
          nombre: nombreDocente.trim(),
          nombre_docente: nombreDocente.trim(),
          avatar_color: '#3b82f6'
        }, { onConflict: 'user_id' });

        if (profileError) {
          console.error("Error profile:", profileError);
          // Ignoramos el error si el trigger handle_new_user ya lo creó
        }

        alert('¡Registro exitoso! Por favor, revisa tu correo electrónico para confirmar tu cuenta.');
        setNeedsEmailConfirmation(true);
        setIsSignUp(false);
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) throw error;
        onAuthSuccess();
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        if (err.message.includes('already registered')) {
          setError('El correo electrónico ya se encuentra registrado.');
        } else if (err.message.toLowerCase().includes('email not confirmed') || err.message.includes('Email not confirmed')) {
          setError('Debes confirmar tu correo electrónico antes de iniciar sesión.');
          setNeedsEmailConfirmation(true);
        } else {
          setError(err.message);
        }
      } else if (typeof err === 'object' && err !== null && 'message' in err) {
        const msg = String((err as any).message);
        if (msg.includes('already registered')) {
          setError('El correo electrónico ya se encuentra registrado.');
        } else if (msg.toLowerCase().includes('email not confirmed') || msg.includes('Email not confirmed')) {
          setError('Debes confirmar tu correo electrónico antes de iniciar sesión.');
          setNeedsEmailConfirmation(true);
        } else {
          setError(msg);
        }
      } else {
        setError('Ocurrió un error inesperado durante el proceso.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResendEmail = async () => {
    if (resendCooldown > 0 || !email.trim()) return;
    
    setResendLoading(true);
    setError(null);
    setResendSuccess(null);
    
    try {
      const redirectUrl = window.location.hostname === "localhost" 
        ? "http://localhost:5173" 
        : "https://evaluacielo.com";
        
      const { error: resendErr } = await supabase.auth.resend({
        type: 'signup',
        email: email.trim(),
        options: {
          emailRedirectTo: redirectUrl,
        }
      });
      
      if (resendErr) throw resendErr;
      
      setResendSuccess('Se ha reenviado el correo de verificación. Revisa tu bandeja de entrada o spam.');
      setResendCooldown(60);
    } catch (err: any) {
      setError(err.message || 'No se pudo reenviar el correo.');
    } finally {
      setResendLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail || !forgotEmail.includes('@')) {
      setError('Por favor ingresa un correo electrónico válido.');
      return;
    }
    setLoading(true);
    setError(null);
    setForgotSuccess(null);

    const API_URL = import.meta.env.VITE_AUTH_API_URL || (window.location.hostname === "localhost" ? 'http://localhost:3001' : 'https://evaluacielo.com');
    console.log(`[Auth.tsx] Intentando enviar solicitud de recuperación a: ${API_URL}/api/auth/forgot-password`);

    try {
      const response = await fetch(`${API_URL}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail })
      });

      console.log(`[Auth.tsx] Respuesta del servidor recibida. Status: ${response.status}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Ocurrió un error al procesar tu solicitud.');
      }

      setForgotSuccess(data.message || 'Si existe una cuenta asociada a este correo electrónico, recibirás instrucciones para restablecer tu contraseña.');
    } catch (err: any) {
      console.error("[Auth.tsx] Error capturado en handleForgotPassword:", err);
      if (err.name === 'TypeError' || err.message?.toLowerCase().includes('failed to fetch') || err.message?.toLowerCase().includes('fetch failed')) {
        setError(`Error de Conexión: No se pudo establecer conexión con el servidor de autenticación en ${API_URL}. Asegúrese de que el backend esté corriendo en el puerto 3001.`);
      } else {
        setError(err.message || 'No se pudo enviar la solicitud de recuperación.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-white font-sans text-[#3E3838]">
      {/* Panel Izquierdo: Formulario */}
      <div className="flex-1 flex flex-col justify-center items-center px-6 py-8 md:py-12">
        <main className="w-full max-w-sm flex flex-col gap-6">
        {/* Brand Identity */}
        <div className="flex flex-col items-center">
          <div className="w-40 h-40 md:w-48 md:h-48 flex items-center justify-center mb-1">
            <img alt="Brand Logo" className="app-logo w-full h-full" src={logo} />
          </div>
          <div className="text-center">
            <p className="text-xs font-bold tracking-tight text-[#716868] max-w-70 mx-auto">
              Portafolio docente enfocado en la evaluación por competencias
            </p>
          </div>
        </div>

        {/* Unified Auth Card */}
        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm relative">
          {isForgotPassword ? (
            <form onSubmit={handleForgotPassword} className="space-y-4 animate-fade-in">
              <div className="mb-1">
                <h2 className="text-xs font-black uppercase tracking-widest text-[#3E3838]">Recuperar Contraseña</h2>
                <p className="text-[9px] font-bold text-[#3E3838]/60 uppercase tracking-wider mt-1">
                  Ingresa tu correo para recibir instrucciones.
                </p>
              </div>

              {error && (
                <div className="p-3 bg-[#D45050]/5 border border-[#D45050]/15 rounded-xl text-[10px] font-bold text-[#D45050] flex items-center gap-2">
                  <span className="w-1 h-1 bg-[#D45050] rounded-full"></span>
                  {error}
                </div>
              )}

              {forgotSuccess && (
                <div className="p-3 bg-[#689C63]/5 border border-[#689C63]/15 rounded-xl text-[10px] font-bold text-[#689C63] flex items-center gap-2">
                  <span className="w-1 h-1 bg-[#689C63] rounded-full"></span>
                  {forgotSuccess}
                </div>
              )}

              {!forgotSuccess && (
                <>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-[#3E3838]/60 uppercase tracking-widest">Email</label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#689C63]" />
                      <input
                        type="email" required value={forgotEmail} onChange={(e) => setForgotEmail(e.target.value)}
                        className="w-full pl-10 pr-3.5 py-2.5 bg-white border border-slate-200 rounded-xl focus:border-[#689C63] focus:ring-2 focus:ring-[#689C63]/10 outline-none text-xs font-semibold text-[#3E3838] transition-all"
                        placeholder="nombre@ejemplo.com"
                      />
                    </div>
                  </div>

                  <button
                    disabled={loading}
                    className="w-full py-3 bg-[#689C63] hover:bg-[#689C63]/90 text-white rounded-xl font-black text-[9px] tracking-widest shadow-sm transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2 uppercase"
                  >
                    {loading ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <>
                        Enviar Instrucciones
                        <ArrowRight size={12} />
                      </>
                    )}
                  </button>
                </>
              )}

              <button
                type="button"
                onClick={() => { setIsForgotPassword(false); setError(null); setForgotSuccess(null); }}
                className="w-full text-center text-[9px] font-black text-[#3E3838]/50 hover:text-[#689C63] transition-colors uppercase tracking-widest pt-1"
              >
                Volver al inicio de sesión
              </button>
            </form>
          ) : (
            <>
              {/* Card Header Logic Toggle */}
              <div className="flex border-b border-slate-100 mb-5 pb-1">
                <button
                  type="button"
                  onClick={() => { setIsSignUp(false); setError(null); }}
                  className={`flex-1 pb-2 text-[9px] font-black tracking-widest transition-all ${!isSignUp ? 'border-b-2 border-[#689C63] text-[#689C63]' : 'text-[#3E3838]/40 hover:text-[#3E3838]'}`}
                >
                  INICIAR SESIÓN
                </button>
                <button
                  type="button"
                  onClick={() => { setIsSignUp(true); setError(null); }}
                  className={`flex-1 pb-2 text-[9px] font-black tracking-widest transition-all ${isSignUp ? 'border-b-2 border-[#689C63] text-[#689C63]' : 'text-[#3E3838]/40 hover:text-[#3E3838]'}`}
                >
                  REGISTRARSE
                </button>
              </div>

              <form onSubmit={handleAuth} className="space-y-4">
                {error && (
                  <div className="p-3 bg-[#D45050]/5 border border-[#D45050]/15 rounded-xl text-[10px] font-bold text-[#D45050] flex items-center gap-2">
                    <span className="w-1 h-1 bg-[#D45050] rounded-full"></span>
                    {error}
                  </div>
                )}
                
                {resendSuccess && (
                  <div className="p-3 bg-[#689C63]/5 border border-[#689C63]/15 rounded-xl text-[10px] font-bold text-[#689C63] flex items-center gap-2">
                    <span className="w-1 h-1 bg-[#689C63] rounded-full"></span>
                    {resendSuccess}
                  </div>
                )}

                {isSignUp && (
                  <div className="space-y-3.5 animate-fade-in">
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-[#3E3838]/60 uppercase tracking-widest">Nombre Completo</label>
                      <div className="relative">
                        <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#689C63]" />
                        <input
                          type="text" required value={nombreDocente} onChange={(e) => setNombreDocente(e.target.value)}
                          className="w-full pl-10 pr-3.5 py-2.5 bg-white border border-slate-200 rounded-xl focus:border-[#689C63] focus:ring-2 focus:ring-[#689C63]/10 outline-none text-xs font-semibold text-[#3E3838] transition-all"
                          placeholder="Ej. María Elena"
                        />
                      </div>
                    </div>


                  </div>
                )}

                <div className="space-y-1">
                  <label className="text-[9px] font-black text-[#3E3838]/60 uppercase tracking-widest">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#689C63]" />
                    <input
                      type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-10 pr-3.5 py-2.5 bg-white border border-slate-200 rounded-xl focus:border-[#689C63] focus:ring-2 focus:ring-[#689C63]/10 outline-none text-xs font-semibold text-[#3E3838] transition-all"
                      placeholder="nombre@ejemplo.com"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between items-baseline">
                    <label className="text-[9px] font-black text-[#3E3838]/60 uppercase tracking-widest">Contraseña</label>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#3E3838]/40" />
                    <input
                      type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-10 pr-3.5 py-2.5 bg-white border border-slate-200 rounded-xl focus:border-[#689C63] focus:ring-2 focus:ring-[#689C63]/10 outline-none text-xs font-semibold text-[#3E3838] transition-all"
                      placeholder="••••••••"
                    />
                  </div>
                </div>

                <button
                  disabled={loading}
                  className="w-full py-3 bg-[#689C63] hover:bg-[#689C63]/90 text-white rounded-xl font-black text-[9px] tracking-widest shadow-sm transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2 uppercase"
                >
                  {loading ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <>
                        {isSignUp ? 'CREAR MI CUENTA' : 'ENTRAR AL ESPACIO DOCENTE'}
                        <ArrowRight size={12} />
                      </>
                    )}
                  </button>

                  {needsEmailConfirmation && (
                    <button
                      type="button"
                      onClick={handleResendEmail}
                      disabled={resendLoading || resendCooldown > 0}
                      className="w-full mt-2 py-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-[#3E3838] rounded-xl font-black text-[9px] tracking-widest transition-all disabled:opacity-50 flex items-center justify-center uppercase shadow-sm active:scale-[0.98]"
                    >
                      {resendLoading ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : resendCooldown > 0 ? (
                        `Esperar ${resendCooldown}s para reenviar`
                      ) : (
                        'Reenviar enlace de verificación'
                      )}
                    </button>
                  )}
                </form>

              <footer className="mt-5 pt-4 border-t border-slate-100 text-center flex flex-col gap-2">
                {!isSignUp && (
                  <button
                    type="button"
                    onClick={() => { setIsForgotPassword(true); setError(null); }}
                    className="text-[9px] font-black text-[#689C63] hover:text-[#689C63]/90 transition-colors tracking-widest uppercase"
                  >
                    ¿Olvidaste tu contraseña?
                  </button>
                )}
                <button className="text-[9px] font-black text-[#3E3838]/40 hover:text-[#3E3838] transition-colors tracking-widest uppercase">
                  ¿Necesitas soporte?
                </button>
              </footer>
            </>
          )}
        </div>

          {/* Brand Meta */}
          <p className="text-center text-[8px] font-black text-[#3E3838]/30 uppercase tracking-[0.25em]">CIELO • 2026</p>
        </main>
      </div>

      {/* Panel Derecho: Fondo Decorativo */}
      <div 
        className="hidden md:block md:w-1/2 min-h-screen border-l border-slate-100 bg-[#EAE4DA] opacity-40 hover:opacity-50"
      />
    </div>
  );
};

export default Auth;
