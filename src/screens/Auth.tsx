import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Mail, Lock, Loader2, User, ArrowRight, Building2, ChevronLeft, Check } from 'lucide-react';
import logo from '../assets/logo.png';

interface AuthProps {
  onAuthSuccess: () => void;
}

const PENDING_CENTRO_KEY = 'pendingCentroCIELO';

interface CentroFormData {
  nombre: string;
  codigoCentro: string;
  telefono: string;
}

const Auth = ({ onAuthSuccess }: AuthProps) => {
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nombreDocente, setNombreDocente] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Registro (flujo único)
  const [regStep, setRegStep] = useState<1 | 2 | 3>(1);
  const [crearCentro, setCrearCentro] = useState<boolean | null>(null);
  const [centroForm, setCentroForm] = useState<CentroFormData>({ nombre: '', codigoCentro: '', telefono: '' });

  // Password recovery states
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSuccess, setForgotSuccess] = useState<string | null>(null);

  // Email verification states
  const [needsEmailConfirmation, setNeedsEmailConfirmation] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendSuccess, setResendSuccess] = useState<string | null>(null);

  // Registro completado (cuenta + centro) — pantalla de éxito
  const [registeredWithCentro, setRegisteredWithCentro] = useState(false);

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
    if (params.get('plan')) {
      setIsSignUp(true);
    }
  }, []);

  const resetRegistro = () => {
    setNombreDocente('');
    setEmail('');
    setPassword('');
    setRegStep(1);
    setCrearCentro(null);
    setCentroForm({ nombre: '', codigoCentro: '', telefono: '' });
    setNeedsEmailConfirmation(false);
    setRegisteredWithCentro(false);
    setError(null);
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResendSuccess(null);
    setNeedsEmailConfirmation(false);

    try {
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error) throw error;
      onAuthSuccess();
    } catch (err: unknown) {
      if (err instanceof Error) {
        if (err.message.toLowerCase().includes('email not confirmed') || err.message.includes('Email not confirmed')) {
          setError('Debes confirmar tu correo electrónico antes de iniciar sesión.');
          setNeedsEmailConfirmation(true);
        } else {
          setError(err.message);
        }
      } else if (typeof err === 'object' && err !== null && 'message' in err) {
        const msg = String((err as any).message);
        if (msg.toLowerCase().includes('email not confirmed') || msg.includes('Email not confirmed')) {
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

  // ─────────────────────────────────────────────────────────────────
  // REGISTRO (único proceso)
  //   Paso 1: Nombre, Correo, Contraseña
  //   Paso 2: ¿Deseas registrar un centro educativo? (Sí / No)
  //   Paso 3 (solo si Sí): información del centro educativo
  // ─────────────────────────────────────────────────────────────────

  const goToPaso2 = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!nombreDocente.trim()) { setError('Por favor ingresa tu nombre completo.'); return; }
    if (!email.trim() || !email.includes('@')) { setError('Por favor ingresa un correo electrónico válido.'); return; }
    if (!password || password.length < 6) { setError('La contraseña debe tener al menos 6 caracteres.'); return; }
    setRegStep(2);
  };

  const createCentro = async (userId: string, data: CentroFormData) => {
    const { data: centroData, error: centroError } = await supabase
      .from('centros')
      .insert({
        nombre: data.nombre.trim(),
        codigo_centro: data.codigoCentro.trim() || null,
        telefono: data.telefono.trim() || null,
        estado: 'activo',
        afiliado: true,
        created_by: userId
      })
      .select('id')
      .single();
    if (centroError) throw centroError;

    const { error: rolError } = await supabase
      .from('centro_roles')
      .insert({ centro_id: centroData.id, user_id: userId, rol: 'director' });
    if (rolError) throw rolError;

    const { error: perfilError } = await supabase
      .from('perfiles')
      .upsert({ user_id: userId, centro_id: centroData.id });
    if (perfilError) console.error('Error al asociar el perfil con el centro:', perfilError);

    if (data.codigoCentro.trim()) {
      const { error: codError } = await supabase
        .from('codigos_acceso_centro')
        .insert({
          centro_id: centroData.id,
          codigo: data.codigoCentro.trim().toUpperCase(),
          estado: 'activo',
          created_by: userId
        });
      if (codError) console.error('Error al crear el código de acceso del centro:', codError);
    }

    return centroData.id;
  };

  const handleRegistro = async (withCentro: boolean) => {
    setLoading(true);
    setError(null);
    setResendSuccess(null);
    setNeedsEmailConfirmation(false);

    try {
      const redirectUrl = window.location.hostname === "localhost"
        ? "http://localhost:5173"
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

      // Insertar el perfil inicial
      const { error: profileError } = await supabase.from('perfiles').upsert({
        user_id: authData.user.id,
        nombre: nombreDocente.trim(),
        nombre_docente: nombreDocente.trim(),
        avatar_color: '#3b82f6'
      }, { onConflict: 'user_id' });
      if (profileError) console.error('Error profile:', profileError);

      if (withCentro) {
        if (authData.session) {
          // El correo ya está confirmado: crear el centro de inmediato
          await createCentro(authData.user.id, centroForm);
          setRegisteredWithCentro(true);
          setIsSignUp(false);
          resetRegistro();
          onAuthSuccess();
          return;
        }
        // Requiere confirmación de correo: guardar los datos pendientes.
        // Se crearán la cuenta, el centro y el rol de director automáticamente
        // al primer inicio de sesión (ver usePendingCentro en App).
        localStorage.setItem(PENDING_CENTRO_KEY, JSON.stringify({
          nombre: centroForm.nombre,
          codigo_centro: centroForm.codigoCentro,
          telefono: centroForm.telefono
        }));
      }

      setNeedsEmailConfirmation(true);
      setRegStep(1);
    } catch (err: unknown) {
      if (err instanceof Error) {
        if (err.message.includes('already registered')) {
          setError('El correo electrónico ya se encuentra registrado.');
        } else {
          setError(err.message);
        }
      } else if (typeof err === 'object' && err !== null && 'message' in err) {
        const msg = String((err as any).message);
        if (msg.includes('already registered')) {
          setError('El correo electrónico ya se encuentra registrado.');
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

  const inputClass = "w-full pl-10 pr-3.5 py-2.5 bg-white border border-slate-200 rounded-xl focus:border-[#689C63] focus:ring-2 focus:ring-[#689C63]/10 outline-none text-xs font-semibold text-[#3E3838] transition-all";

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
                        className={inputClass}
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
                  onClick={() => { setIsSignUp(false); resetRegistro(); }}
                  className={`flex-1 pb-2 text-[9px] font-black tracking-widest transition-all ${!isSignUp ? 'border-b-2 border-[#689C63] text-[#689C63]' : 'text-[#3E3838]/40 hover:text-[#3E3838]'}`}
                >
                  INICIAR SESIÓN
                </button>
                <button
                  type="button"
                  onClick={() => { setIsSignUp(true); resetRegistro(); }}
                  className={`flex-1 pb-2 text-[9px] font-black tracking-widest transition-all ${isSignUp ? 'border-b-2 border-[#689C63] text-[#689C63]' : 'text-[#3E3838]/40 hover:text-[#3E3838]'}`}
                >
                  REGISTRARSE
                </button>
              </div>

              {isSignUp ? (
                /* ────────────────────────────
                   REGISTRO (único proceso)
                   ──────────────────────────── */
                <div className="animate-fade-in">
                  {error && (
                    <div className="p-3 bg-[#D45050]/5 border border-[#D45050]/15 rounded-xl text-[10px] font-bold text-[#D45050] flex items-center gap-2 mb-4">
                      <span className="w-1 h-1 bg-[#D45050] rounded-full"></span>
                      {error}
                    </div>
                  )}

                  {resendSuccess && (
                    <div className="p-3 bg-[#689C63]/5 border border-[#689C63]/15 rounded-xl text-[10px] font-bold text-[#689C63] flex items-center gap-2 mb-4">
                      <span className="w-1 h-1 bg-[#689C63] rounded-full"></span>
                      {resendSuccess}
                    </div>
                  )}

                  {registeredWithCentro ? (
                    <div className="text-center space-y-4 py-2">
                      <div className="p-6 bg-[#689C63]/5 rounded-2xl border border-[#689C63]/15">
                        <Check className="w-10 h-10 text-[#689C63] mx-auto mb-3" />
                        <h3 className="text-sm font-black text-[#3E3838] mb-1">¡Centro educativo creado!</h3>
                        <p className="text-[10px] font-bold text-[#3E3838]/60">
                          Tu cuenta y tu centro se crearon correctamente. Ya puedes ingresar.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => { setIsSignUp(false); resetRegistro(); onAuthSuccess(); }}
                        className="w-full py-3 bg-[#689C63] hover:bg-[#689C63]/90 text-white rounded-xl font-black text-[9px] tracking-widest shadow-sm transition-all active:scale-[0.98] uppercase"
                      >
                        Ir a mi panel
                      </button>
                    </div>
                  ) : needsEmailConfirmation ? (
                    <div className="text-center space-y-4 py-2">
                      <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100">
                        <Mail className="w-10 h-10 text-[#689C63] mx-auto mb-3" />
                        <h3 className="text-sm font-black text-[#3E3838] mb-1">Revisa tu correo electrónico</h3>
                        <p className="text-[10px] font-bold text-[#3E3838]/60">
                          Enviamos un enlace de confirmación a <span className="text-[#689C63]">{email}</span>. Confirma tu cuenta para poder iniciar sesión.
                        </p>
                        {crearCentro && (
                          <p className="text-[9px] font-bold text-[#3E3838]/50 mt-2">
                            Al confirmar tu correo y entrar, tu centro educativo se creará automáticamente y quedarás como administrador.
                          </p>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={handleResendEmail}
                        disabled={resendLoading || resendCooldown > 0}
                        className="w-full py-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-[#3E3838] rounded-xl font-black text-[9px] tracking-widest transition-all disabled:opacity-50 flex items-center justify-center uppercase shadow-sm active:scale-[0.98]"
                      >
                        {resendLoading ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : resendCooldown > 0 ? (
                          `Esperar ${resendCooldown}s para reenviar`
                        ) : (
                          'Reenviar enlace de verificación'
                        )}
                      </button>
                    </div>
                  ) : regStep === 1 ? (
                    /* PASO 1: datos básicos */
                    <form onSubmit={goToPaso2} className="space-y-4">
                      <div className="space-y-1">
                        <label className="text-[9px] font-black text-[#3E3838]/60 uppercase tracking-widest">Nombre Completo</label>
                        <div className="relative">
                          <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#689C63]" />
                          <input
                            type="text" required value={nombreDocente} onChange={(e) => setNombreDocente(e.target.value)}
                            className={inputClass}
                            placeholder="Ej. María Elena"
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[9px] font-black text-[#3E3838]/60 uppercase tracking-widest">Email</label>
                        <div className="relative">
                          <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#689C63]" />
                          <input
                            type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                            className={inputClass}
                            placeholder="nombre@ejemplo.com"
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[9px] font-black text-[#3E3838]/60 uppercase tracking-widest">Contraseña</label>
                        <div className="relative">
                          <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#3E3838]/40" />
                          <input
                            type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
                            className={inputClass}
                            placeholder="Mínimo 6 caracteres"
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
                            Continuar
                            <ArrowRight size={12} />
                          </>
                        )}
                      </button>
                    </form>
                  ) : regStep === 2 ? (
                    /* PASO 2: ¿Deseas registrar un centro educativo? */
                    <div className="space-y-4">
                      <div className="p-4 bg-[#EAE4DA]/40 border border-[#EAE4DA] rounded-2xl">
                        <h3 className="text-xs font-black text-[#3E3838] mb-1">¿Deseas registrar un centro educativo?</h3>
                        <p className="text-[10px] font-bold text-[#3E3838]/60">
                          Si eres la persona responsable de una institución, podrás crear tu centro y administrarlo.
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => { setCrearCentro(true); setRegStep(3); }}
                        disabled={loading}
                        className="w-full py-3 bg-[#3E3838] hover:bg-[#3E3838]/90 text-white rounded-xl font-black text-[9px] tracking-widest shadow-sm transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2 uppercase"
                      >
                        <Building2 size={14} />
                        Sí, crear un centro educativo
                      </button>

                      <button
                        type="button"
                        onClick={() => { setCrearCentro(false); handleRegistro(false); }}
                        disabled={loading}
                        className="w-full py-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-[#3E3838] rounded-xl font-black text-[9px] tracking-widest transition-all disabled:opacity-50 flex items-center justify-center gap-2 uppercase shadow-sm active:scale-[0.98]"
                      >
                        {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'No, continuar como usuario'}
                      </button>

                      <button
                        type="button"
                        onClick={() => setRegStep(1)}
                        disabled={loading}
                        className="w-full text-center text-[9px] font-black text-[#3E3838]/40 hover:text-[#689C63] transition-colors uppercase tracking-widest"
                      >
                        <ChevronLeft className="inline w-3 h-3" /> Volver
                      </button>
                    </div>
                  ) : (
                    /* PASO 3: información del centro educativo */
                    <form
                      onSubmit={(e) => { e.preventDefault(); handleRegistro(true); }}
                      className="space-y-4"
                    >
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setRegStep(2)}
                          className="text-[#3E3838]/40 hover:text-[#689C63] transition-colors"
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </button>
                        <h3 className="text-[10px] font-black uppercase tracking-widest text-[#3E3838]">Datos del centro educativo</h3>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[9px] font-black text-[#3E3838]/60 uppercase tracking-widest">Nombre del Centro</label>
                        <div className="relative">
                          <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#689C63]" />
                          <input
                            type="text" required value={centroForm.nombre}
                            onChange={(e) => setCentroForm({ ...centroForm, nombre: e.target.value })}
                            className={inputClass}
                            placeholder="Ej. Instituto Politécnico"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-[9px] font-black text-[#3E3838]/60 uppercase tracking-widest">Código (Opcional)</label>
                          <input
                            type="text" value={centroForm.codigoCentro}
                            onChange={(e) => setCentroForm({ ...centroForm, codigoCentro: e.target.value.toUpperCase() })}
                            className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl focus:border-[#689C63] focus:ring-2 focus:ring-[#689C63]/10 outline-none text-xs font-semibold text-[#3E3838] transition-all uppercase"
                            placeholder="CÓDIGO-001"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] font-black text-[#3E3838]/60 uppercase tracking-widest">Teléfono (Opcional)</label>
                          <input
                            type="text" value={centroForm.telefono}
                            onChange={(e) => setCentroForm({ ...centroForm, telefono: e.target.value })}
                            className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl focus:border-[#689C63] focus:ring-2 focus:ring-[#689C63]/10 outline-none text-xs font-semibold text-[#3E3838] transition-all"
                            placeholder="Opcional"
                          />
                        </div>
                      </div>

                      <button
                        disabled={loading || centroForm.nombre.trim().length < 3}
                        className="w-full py-3 bg-[#689C63] hover:bg-[#689C63]/90 text-white rounded-xl font-black text-[9px] tracking-widest shadow-sm transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2 uppercase"
                      >
                        {loading ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <>
                            Crear cuenta y centro educativo
                            <ArrowRight size={12} />
                          </>
                        )}
                      </button>
                    </form>
                  )}
                </div>
              ) : (
                /* ────────────────────────────
                   INICIO DE SESIÓN (único formulario)
                   ──────────────────────────── */
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

                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-[#3E3838]/60 uppercase tracking-widest">Email</label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#689C63]" />
                      <input
                        type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                        className={inputClass}
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
                        className={inputClass}
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
                          ENTRAR AL ESPACIO DOCENTE
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
              )}

              {!isSignUp && !isForgotPassword && (
                <footer className="mt-5 pt-4 border-t border-slate-100 text-center flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => { setIsForgotPassword(true); setError(null); }}
                    className="text-[9px] font-black text-[#689C63] hover:text-[#689C63]/90 transition-colors tracking-widest uppercase"
                  >
                    ¿Olvidaste tu contraseña?
                  </button>
                  <button className="text-[9px] font-black text-[#3E3838]/40 hover:text-[#3E3838] transition-colors tracking-widest uppercase">
                    ¿Necesitas soporte?
                  </button>
                </footer>
              )}
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
