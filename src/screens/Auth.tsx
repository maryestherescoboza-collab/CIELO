import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { Mail, Lock, Loader2, User, ArrowRight, Building2, ChevronLeft, Check } from 'lucide-react';
import logo from '../assets/logo.png';

interface AuthProps {
  onAuthSuccess: () => void;
}

const PENDING_CENTRO_KEY = 'pendingCentroCIELO';
const PENDING_VINCULO_KEY = 'pendingVinculoCIELO';

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
  const [nombre, setNombre] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Registro (flujo único)
  const [regStep, setRegStep] = useState<1 | 2 | 3 | 4 | 5 | 6 | 7>(1);
  const [crearCentro, setCrearCentro] = useState<boolean | null>(null);
  const [centroForm, setCentroForm] = useState<CentroFormData>({ nombre: '', codigoCentro: '', telefono: '' });

  // Opciones del flujo "No, continuar como usuario" (buscador de centros)
  const [centrosList, setCentrosList] = useState<{ id: string; nombre: string }[]>([]);
  const [centroSel, setCentroSel] = useState('');
  const [codigoAcceso, setCodigoAcceso] = useState('');
  const [codigoValidando, setCodigoValidando] = useState(false);
  const [codigoInfo, setCodigoInfo] = useState<{ valido: boolean; centro: string } | null>(null);

  // Buscador único de centros (flujo "No, continuar como usuario")
  const [busquedaCentro, setBusquedaCentro] = useState('');
  const [detectandoSuscripcion, setDetectandoSuscripcion] = useState(false);

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
    setNombre('');
    setEmail('');
    setPassword('');
    setRegStep(1);
    setCrearCentro(null);
    setCentroForm({ nombre: '', codigoCentro: '', telefono: '' });
    setCentrosList([]);
    setCentroSel('');
    setCodigoAcceso('');
    setCodigoInfo(null);
    setBusquedaCentro('');
    setDetectandoSuscripcion(false);
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
  //   Paso 4: (No) buscador único de centros
  //   Paso 5: (No) centro con suscripción institucional → código de acceso
  //   Paso 6: (No) centro sin suscripción institucional → vincular sin código
  //   Paso 7: (No) el centro no aparece → registrar centro como referencia
  // ─────────────────────────────────────────────────────────────────

  const goToPaso2 = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!nombre.trim()) { setError('Por favor ingresa tu nombre completo.'); return; }
    if (!email.trim() || !email.includes('@')) { setError('Por favor ingresa un correo electrónico válido.'); return; }
    if (!password || password.length < 6) { setError('La contraseña debe tener al menos 6 caracteres.'); return; }
    setRegStep(2);
  };

  const loadCentros = async () => {
    if (centrosList.length > 0) return;
    const { data, error } = await supabase
      .from('centros')
      .select('id, nombre')
      .order('nombre');
    if (!error && data) {
      setCentrosList(data.map((c: any) => ({ id: c.id as string, nombre: c.nombre as string })));
    }
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

  const handleRegistro = async (modo: 'director' | 'codigo' | 'propia' | 'referencia') => {
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
            nombre_docente: nombre.trim()
          }
        }
      });

      if (signUpError) throw signUpError;
      if (!authData.user) throw new Error('No se pudo crear el usuario.');

      // Insertar el perfil inicial
      const { error: profileError } = await supabase.from('perfiles').upsert({
        user_id: authData.user.id,
        nombre: nombre.trim(),
        nombre_docente: nombre.trim(),
        avatar_color: '#3b82f6'
      }, { onConflict: 'user_id' });
      if (profileError) console.error('Error profile:', profileError);

      if (modo === 'director') {
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
      } else {
        // Modalidades del usuario que NO crea un centro (paso 4).
        // "Centro asociado" y "quién paga" son conceptos separados:
        //   codigo     → centro + código: cubierto por la suscripción institucional
        //   propia     → centro existente: suscripción individual del usuario
        //   referencia → registrar centro como referencia: suscripción individual
        if (authData.session) {
          await aplicarVinculoRegistro(modo);
          setIsSignUp(false);
          resetRegistro();
          onAuthSuccess();
          return;
        }
        localStorage.setItem(PENDING_VINCULO_KEY, JSON.stringify({
          modo,
          centroId: centroSel || null,
          codigo: codigoAcceso.trim() || null,
          centro: centroForm.nombre.trim() ? centroForm : null
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

  const aplicarVinculoRegistro = async (modo: 'codigo' | 'propia' | 'referencia') => {
    const { data, error } = await supabase.rpc('aplicar_vinculo_usuario', {
      p_modo: modo,
      p_centro_id: modo === 'propia' ? centroSel || null : null,
      p_codigo: modo === 'codigo' ? codigoAcceso.trim() || null : null,
      p_nombre_centro: modo === 'referencia' ? centroForm.nombre.trim() || null : null,
      p_codigo_centro: modo === 'referencia' ? (centroForm.codigoCentro.trim() || null) : null,
      p_telefono: modo === 'referencia' ? (centroForm.telefono.trim() || null) : null
    });
    if (error) throw error;
    if (data && typeof data === 'object' && 'ok' in (data as any) && (data as any).ok === false) {
      throw new Error(String((data as any).message || 'No se pudo completar la vinculación.'));
    }
  };

  const validarCodigo = async () => {
    const cod = codigoAcceso.trim();
    if (!cod) { setError('Ingresa el código de acceso.'); return; }
    if (!centroSel) { setError('Selecciona tu centro educativo.'); return; }

    setCodigoValidando(true);
    setError(null);
    setCodigoInfo(null);
    try {
      const { data, error } = await supabase.rpc('validar_codigo_usuario', {
        p_centro_id: centroSel,
        p_codigo: cod
      });
      if (error) throw error;
      const r = (data as any) || {};
      if (r.ok) {
        setCodigoInfo({ valido: true, centro: r.centro_nombre || 'tu centro' });
      } else {
        setCodigoInfo({ valido: false, centro: '' });
        setError(r.message || 'El código no es válido para este centro.');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'No se pudo validar el código.';
      setError(msg);
    } finally {
      setCodigoValidando(false);
    }
  };

  // Comprueba si el centro seleccionado posee una suscripción institucional.
  // Se apoya únicamente en la tabla `suscripciones` (tipo='institucional',
  // estado='activa') mediante la función SQL centro_tiene_suscripcion_institucional.
  // Si la función aún no existe (migración pendiente), degrada al caso
  // "sin suscripción" para no bloquear el registro.
  const seleccionarCentroBuscador = async (centroId: string) => {
    setCentroSel(centroId);
    setCodigoAcceso('');
    setCodigoInfo(null);
    setDetectandoSuscripcion(true);
    setError(null);
    try {
      const { data, error } = await supabase.rpc('centro_tiene_suscripcion_institucional', {
        p_centro_id: centroId
      });
      const esInstitucional = !error && data === true;
      setRegStep(esInstitucional ? 5 : 6);
    } catch {
      setRegStep(6);
    } finally {
      setDetectandoSuscripcion(false);
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

    try {
      const redirectUrl = window.location.hostname === "localhost"
        ? "http://localhost:5173/reset-password"
        : "https://evaluacielo.com/reset-password";

      const { error: resetError } = await supabase.auth.resetPasswordForEmail(forgotEmail.trim(), {
        redirectTo: redirectUrl
      });

      if (resetError) {
        console.error("[Auth.tsx] Error en resetPasswordForEmail:", resetError);
        throw resetError;
      }

      setForgotSuccess('Si existe una cuenta asociada a este correo electrónico, recibirás instrucciones para restablecer tu contraseña.');
    } catch (err: any) {
      console.error("[Auth.tsx] Error capturado en handleForgotPassword:", err);
      setError(err.message || 'No se pudo enviar la solicitud de recuperación.');
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "w-full pl-10 pr-3.5 py-2.5 bg-white border border-slate-200 rounded-xl focus:border-[#689C63] focus:ring-2 focus:ring-[#689C63]/10 outline-none text-xs font-semibold text-[#3E3838] transition-all";

  const centrosFiltrados = useMemo(() => {
    const q = busquedaCentro.trim().toLowerCase();
    if (!q) return centrosList;
    return centrosList.filter(c => c.nombre.toLowerCase().includes(q));
  }, [busquedaCentro, centrosList]);

  const centroSelNombre = centrosList.find(c => c.id === centroSel)?.nombre || '';

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-white font-sans text-[#3E3838]">
      {/* Panel Izquierdo: Formulario */}
      <div className="flex-1 flex flex-col justify-center items-center px-6 py-8 md:py-12">
        <main className="w-full max-w-sm flex flex-col gap-6">
        {/* Brand Identity */}
        <div className="flex flex-col items-center">
          <div className="w-56 h-56 md:w-64 md:h-64 flex items-center justify-center mb-2">
            <img alt="Brand Logo" className="app-logo w-full h-full object-contain" src={logo} />
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
                <p className="text-xs font-bold text-[#3E3838]/60 uppercase tracking-wider mt-1">
                  Ingresa tu correo para recibir instrucciones.
                </p>
              </div>

              {error && (
                <div className="p-3 bg-[#D45050]/5 border border-[#D45050]/15 rounded-xl text-xs font-bold text-[#D45050] flex items-center gap-2">
                  <span className="w-1 h-1 bg-[#D45050] rounded-full"></span>
                  {error}
                </div>
              )}

              {forgotSuccess && (
                <div className="p-3 bg-[#689C63]/5 border border-[#689C63]/15 rounded-xl text-xs font-bold text-[#689C63] flex items-center gap-2">
                  <span className="w-1 h-1 bg-[#689C63] rounded-full"></span>
                  {forgotSuccess}
                </div>
              )}

              {!forgotSuccess && (
                <>
                  <div className="space-y-1">
                    <label className="text-xs font-black text-[#3E3838]/60 uppercase tracking-widest">Email</label>
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
                    className="w-full py-3 bg-[#689C63] hover:bg-[#689C63]/90 text-white rounded-xl font-black text-xs tracking-widest shadow-sm transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2 uppercase"
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
                className="w-full text-center text-xs font-black text-[#3E3838]/50 hover:text-[#689C63] transition-colors uppercase tracking-widest pt-1"
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
                  className={`flex-1 pb-2 text-xs font-black tracking-widest transition-all ${!isSignUp ? 'border-b-2 border-[#689C63] text-[#689C63]' : 'text-[#3E3838]/40 hover:text-[#3E3838]'}`}
                >
                  INICIAR SESIÓN
                </button>
                <button
                  type="button"
                  onClick={() => { setIsSignUp(true); resetRegistro(); }}
                  className={`flex-1 pb-2 text-xs font-black tracking-widest transition-all ${isSignUp ? 'border-b-2 border-[#689C63] text-[#689C63]' : 'text-[#3E3838]/40 hover:text-[#3E3838]'}`}
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
                    <div className="p-3 bg-[#D45050]/5 border border-[#D45050]/15 rounded-xl text-xs font-bold text-[#D45050] flex items-center gap-2 mb-4">
                      <span className="w-1 h-1 bg-[#D45050] rounded-full"></span>
                      {error}
                    </div>
                  )}

                  {resendSuccess && (
                    <div className="p-3 bg-[#689C63]/5 border border-[#689C63]/15 rounded-xl text-xs font-bold text-[#689C63] flex items-center gap-2 mb-4">
                      <span className="w-1 h-1 bg-[#689C63] rounded-full"></span>
                      {resendSuccess}
                    </div>
                  )}

                  {registeredWithCentro ? (
                    <div className="text-center space-y-4 py-2">
                      <div className="p-6 bg-[#689C63]/5 rounded-2xl border border-[#689C63]/15">
                        <Check className="w-10 h-10 text-[#689C63] mx-auto mb-3" />
                        <h3 className="text-sm font-black text-[#3E3838] mb-1">¡Centro educativo creado!</h3>
                        <p className="text-xs font-bold text-[#3E3838]/60">
                          Tu cuenta y tu centro se crearon correctamente. Ya puedes ingresar.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => { setIsSignUp(false); resetRegistro(); onAuthSuccess(); }}
                        className="w-full py-3 bg-[#689C63] hover:bg-[#689C63]/90 text-white rounded-xl font-black text-xs tracking-widest shadow-sm transition-all active:scale-[0.98] uppercase"
                      >
                        Ir a mi panel
                      </button>
                    </div>
                  ) : needsEmailConfirmation ? (
                    <div className="text-center space-y-4 py-2">
                      <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100">
                        <Mail className="w-10 h-10 text-[#689C63] mx-auto mb-3" />
                        <h3 className="text-sm font-black text-[#3E3838] mb-1">Revisa tu correo electrónico</h3>
                        <p className="text-xs font-bold text-[#3E3838]/60">
                          Enviamos un enlace de confirmación a <span className="text-[#689C63]">{email}</span>. Confirma tu cuenta para poder iniciar sesión.
                        </p>
                        {crearCentro && (
                          <p className="text-xs font-bold text-[#3E3838]/50 mt-2">
                            Al confirmar tu correo y entrar, tu centro educativo se creará automáticamente y quedarás como administrador.
                          </p>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={handleResendEmail}
                        disabled={resendLoading || resendCooldown > 0}
                        className="w-full py-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-[#3E3838] rounded-xl font-black text-xs tracking-widest transition-all disabled:opacity-50 flex items-center justify-center uppercase shadow-sm active:scale-[0.98]"
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
                        <label className="text-xs font-black text-[#3E3838]/60 uppercase tracking-widest">Nombre Completo</label>
                        <div className="relative">
                          <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#689C63]" />
                          <input
                            type="text" required value={nombre} onChange={(e) => setNombre(e.target.value)}
                            className={inputClass}
                            placeholder="Ej. María Elena"
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-black text-[#3E3838]/60 uppercase tracking-widest">Email</label>
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
                        <label className="text-xs font-black text-[#3E3838]/60 uppercase tracking-widest">Contraseña</label>
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
                        className="w-full py-3 bg-[#689C63] hover:bg-[#689C63]/90 text-white rounded-xl font-black text-xs tracking-widest shadow-sm transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2 uppercase"
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
                        <p className="text-xs font-bold text-[#3E3838]/60">
                          Si eres la persona responsable de una institución, podrás crear tu centro y administrarlo.
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => { setCrearCentro(true); setRegStep(3); }}
                        disabled={loading}
                        className="w-full py-3 bg-[#3E3838] hover:bg-[#3E3838]/90 text-white rounded-xl font-black text-xs tracking-widest shadow-sm transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2 uppercase"
                      >
                        <Building2 size={14} />
                        Sí, crear un centro educativo
                      </button>

<button
                        type="button"
                        onClick={() => { setCrearCentro(false); setBusquedaCentro(''); loadCentros(); setRegStep(4); }}
                        disabled={loading}
                        className="w-full py-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-[#3E3838] rounded-xl font-black text-xs tracking-widest transition-all disabled:opacity-50 flex items-center justify-center gap-2 uppercase shadow-sm active:scale-[0.98]"
                      >
                        No, continuar como usuario
                      </button>

                      <button
                        type="button"
                        onClick={() => setRegStep(1)}
                        disabled={loading}
                        className="w-full text-center text-xs font-black text-[#3E3838]/40 hover:text-[#689C63] transition-colors uppercase tracking-widest"
                      >
                        <ChevronLeft className="inline w-3 h-3" /> Volver
                      </button>
                    </div>
) : regStep === 3 ? (
                    /* PASO 3: Sí — crear un centro educativo (director) */
                    <form
                      onSubmit={(e) => { e.preventDefault(); handleRegistro('director'); }}
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
                        <h3 className="text-xs font-black uppercase tracking-widest text-[#3E3838]">Datos del centro educativo</h3>
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-black text-[#3E3838]/60 uppercase tracking-widest">Nombre del Centro</label>
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
                          <label className="text-xs font-black text-[#3E3838]/60 uppercase tracking-widest">Código (Opcional)</label>
                          <input
                            type="text" value={centroForm.codigoCentro}
                            onChange={(e) => setCentroForm({ ...centroForm, codigoCentro: e.target.value.toUpperCase() })}
                            className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl focus:border-[#689C63] focus:ring-2 focus:ring-[#689C63]/10 outline-none text-xs font-semibold text-[#3E3838] transition-all uppercase"
                            placeholder="CÓDIGO-001"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-black text-[#3E3838]/60 uppercase tracking-widest">Teléfono (Opcional)</label>
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
                        className="w-full py-3 bg-[#689C63] hover:bg-[#689C63]/90 text-white rounded-xl font-black text-xs tracking-widest shadow-sm transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2 uppercase"
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
                  ) : regStep === 4 ? (
                    /* PASO 4: buscador único de centros (No, continuar como usuario) */
                    <div className="animate-fade-in">
                      <div className="flex items-center gap-1 mb-2">
                        <button
                          type="button"
                          onClick={() => { setBusquedaCentro(''); setRegStep(2); }}
                          className="text-[#3E3838]/40 hover:text-[#689C63] transition-colors"
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </button>
                        <h3 className="text-xs font-black uppercase tracking-widest text-[#3E3838]">Busca tu centro educativo</h3>
                      </div>

                      <p className="text-xs font-bold text-[#3E3838]/60 mb-3">
                        Escribe el nombre de tu centro y elígelo de la lista. Tu selección determinará automáticamente cómo te vinculas.
                      </p>

                      <div className="space-y-1 mb-3">
                        <label className="text-xs font-black text-[#3E3838]/60 uppercase tracking-widest">Centro educativo</label>
                        <div className="relative">
                          <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#689C63]" />
                          <input
                            type="text" value={busquedaCentro}
                            onChange={(e) => setBusquedaCentro(e.target.value)}
                            className={inputClass}
                            placeholder="Ej. Instituto Politécnico"
                          />
                        </div>
                      </div>

                      <div className="max-h-52 overflow-y-auto border border-slate-200 rounded-2xl divide-y divide-slate-100 mb-3 bg-white">
                        {centrosFiltrados.length === 0 ? (
                          <p className="p-3 text-center text-xs font-bold text-[#3E3838]/50">
                            No hay centros que coincidan. Si tu centro no aparece, regístralo abajo.
                          </p>
                        ) : centrosFiltrados.map((c) => (
                          <button
                            key={c.id} type="button"
                            onClick={() => seleccionarCentroBuscador(c.id)}
                            disabled={detectandoSuscripcion}
                            className="w-full text-left px-4 py-3 hover:bg-[#689C63]/5 transition-colors disabled:opacity-50 flex items-center gap-2"
                          >
                            <Building2 className="w-3.5 h-3.5 text-[#689C63] shrink-0" />
                            <span className="text-xs font-bold text-[#3E3838]">{c.nombre}</span>
                          </button>
                        ))}
                      </div>

                      {detectandoSuscripcion && (
                        <div className="p-3 bg-[#689C63]/5 border border-[#689C63]/15 rounded-xl text-xs font-bold text-[#689C63] flex items-center gap-2 mb-3">
                          <Loader2 className="w-3.5 h-3.5 animate-spin" /> Verificando la suscripción del centro...
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={() => setRegStep(7)}
                        className="w-full text-center text-xs font-black text-[#689C63] hover:text-[#689C63]/90 transition-colors uppercase tracking-widest pt-1"
                      >
                        Mi centro educativo no aparece en la lista
                      </button>
                    </div>
                  ) : regStep === 5 ? (
                    /* PASO 5: código — seleccionar centro + código */
                    <div className="animate-fade-in">
                      <div className="flex items-center gap-1 mb-3">
                        <button
                          type="button"
                          onClick={() => setRegStep(4)}
                          className="text-[#3E3838]/40 hover:text-[#689C63] transition-colors"
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </button>
                        <h3 className="text-xs font-black uppercase tracking-widest text-[#3E3838]">Tu centro paga tu acceso</h3>
                      </div>

                      <div className="p-3 bg-[#EAE4DA]/40 border border-[#EAE4DA] rounded-xl flex items-center gap-2 mb-3">
                        <Building2 className="w-4 h-4 text-[#689C63] shrink-0" />
                        <span className="text-xs font-bold text-[#3E3838]">{centroSelNombre}</span>
                      </div>

                      <div className="space-y-1 mb-3">
                        <label className="text-xs font-black text-[#3E3838]/60 uppercase tracking-widest">Código de acceso</label>
                        <input
                          type="text" value={codigoAcceso}
                          onChange={(e) => { setCodigoAcceso(e.target.value.toUpperCase()); setCodigoInfo(null); }}
                          className={inputClass}
                          placeholder="CÓDIGO-001"
                        />
                      </div>

                      <button
                        type="button" onClick={validarCodigo}
                        disabled={codigoValidando || loading}
                        className="w-full py-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-[#3E3838] rounded-xl font-black text-xs tracking-widest transition-all disabled:opacity-50 flex items-center justify-center gap-2 uppercase shadow-sm active:scale-[0.98] mb-3"
                      >
                        {codigoValidando ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Validar código'}
                      </button>

                      {codigoInfo && codigoInfo.valido && (
                        <div className="p-3 bg-[#689C63]/5 border border-[#689C63]/15 rounded-xl text-xs font-bold text-[#689C63] flex items-center gap-2 mb-3">
                          <Check className="w-3.5 h-3.5" /> Código válido. Quedarás cubierto por la suscripción institucional.
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={() => handleRegistro('codigo')}
                        disabled={loading || codigoValidando || !codigoInfo?.valido}
                        className="w-full py-3 bg-[#5F665E] hover:bg-[#5F665E]/90 text-white rounded-xl font-black text-xs tracking-widest shadow-sm transition-all active:scale-[0.98] disabled:opacity-50 flex items-center gap-2 uppercase"
                      >
                        {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Crear mi cuenta y acceder'}
                      </button>
                    </div>
                  ) : regStep === 6 ? (
                    /* PASO 6: propia — vincularte a un centro existente */
                    <div className="animate-fade-in">
                      <div className="flex items-center gap-1 mb-3">
                        <button
                          type="button"
                          onClick={() => setRegStep(4)}
                          className="text-[#3E3838]/40 hover:text-[#689C63] transition-colors"
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </button>
                        <h3 className="text-xs font-black uppercase tracking-widest text-[#3E3838]">Me vinculo a un centro existente</h3>
                      </div>

                      <p className="text-xs font-bold text-[#3E3838]/60 mb-3">
                        Tu cuenta quedará asociada a este centro. Tu suscripción es independiente: pagas tu propio plan.
                      </p>

                      <div className="p-3 bg-[#EAE4DA]/40 border border-[#EAE4DA] rounded-xl flex items-center gap-2 mb-3">
                        <Building2 className="w-4 h-4 text-[#689C63] shrink-0" />
                        <span className="text-xs font-bold text-[#3E3838]">{centroSelNombre}</span>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRegistro('propia')}
                        disabled={loading || !centroSel}
                        className="w-full py-3 bg-[#689C63] hover:bg-[#689C63]/90 text-white rounded-xl font-black text-xs tracking-widest shadow-sm transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2 uppercase"
                      >
                        {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Crear mi cuenta y vincularme a este centro'}
                      </button>
                    </div>
                  ) : (
                    /* PASO 7: referencia — mi centro no aparece */
                    <div className="animate-fade-in">
                      <div className="flex items-center gap-1 mb-3">
                        <button
                          type="button"
                          onClick={() => setRegStep(4)}
                          className="text-[#3E3838]/40 hover:text-[#689C63] transition-colors"
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </button>
                        <h3 className="text-xs font-black uppercase tracking-widest text-[#3E3838]">Mi centro educativo no aparece</h3>
                      </div>

                      <p className="text-xs font-bold text-[#3E3838]/60 mb-3">
                        Registra la información de tu centro. Quedará asociado como referencia y pagarás tu propia suscripción.
                      </p>

                      <div className="space-y-1 mb-3">
                        <label className="text-xs font-black text-[#3E3838]/60 uppercase tracking-widest">Nombre del centro educativo</label>
                        <input
                          type="text" required value={centroForm.nombre}
                          onChange={(e) => setCentroForm({ ...centroForm, nombre: e.target.value })}
                          className={inputClass}
                          placeholder="Ej. Escuela Primaria Los Robles"
                        />
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRegistro('referencia')}
                        disabled={loading || centroForm.nombre.trim().length < 3}
                        className="w-full py-3 bg-[#689C63] hover:bg-[#689C63]/90 text-white rounded-xl font-black text-xs tracking-widest shadow-sm transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2 uppercase"
                      >
                        {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Crear mi cuenta y vincularme'}
                      </button>
                    </div>
                  )}
                </div>
                ) : (
                /* ────────────────────────────
                   INICIO DE SESIÓN (único formulario)
                   ──────────────────────────── */
                <form onSubmit={handleAuth} className="space-y-4">
                  {error && (
                    <div className="p-3 bg-[#D45050]/5 border border-[#D45050]/15 rounded-xl text-xs font-bold text-[#D45050] flex items-center gap-2">
                      <span className="w-1 h-1 bg-[#D45050] rounded-full"></span>
                      {error}
                    </div>
                  )}

                  {resendSuccess && (
                    <div className="p-3 bg-[#689C63]/5 border border-[#689C63]/15 rounded-xl text-xs font-bold text-[#689C63] flex items-center gap-2">
                      <span className="w-1 h-1 bg-[#689C63] rounded-full"></span>
                      {resendSuccess}
                    </div>
                  )}

                  <div className="space-y-1">
                    <label className="text-xs font-black text-[#3E3838]/60 uppercase tracking-widest">Email</label>
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
                      <label className="text-xs font-black text-[#3E3838]/60 uppercase tracking-widest">Contraseña</label>
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
                    className="w-full py-3 bg-[#689C63] hover:bg-[#689C63]/90 text-white rounded-xl font-black text-xs tracking-widest shadow-sm transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2 uppercase"
                  >
                    {loading ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <>
                          ACCEDER AL SISTEMA
                          <ArrowRight size={12} />
                        </>
                      )}
                    </button>

                  {needsEmailConfirmation && (
                    <button
                      type="button"
                      onClick={handleResendEmail}
                      disabled={resendLoading || resendCooldown > 0}
                      className="w-full mt-2 py-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-[#3E3838] rounded-xl font-black text-xs tracking-widest transition-all disabled:opacity-50 flex items-center justify-center uppercase shadow-sm active:scale-[0.98]"
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
                    className="text-xs font-black text-[#689C63] hover:text-[#689C63]/90 transition-colors tracking-widest uppercase"
                  >
                    ¿Olvidaste tu contraseña?
                  </button>
                  <button className="text-xs font-black text-[#3E3838]/40 hover:text-[#3E3838] transition-colors tracking-widest uppercase">
                    ¿Necesitas soporte?
                  </button>
                </footer>
              )}
            </>
          )}
        </div>

          {/* Brand Meta */}
          <p className="text-center text-xs font-black text-[#3E3838]/30 uppercase tracking-[0.25em]">CIELO • 2026</p>
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
