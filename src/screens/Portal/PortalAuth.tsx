import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Loader2, Shield, Lock, AlertCircle } from 'lucide-react';
import { PORTAL_FAMILIA_ENABLED } from '../../config/features';

export default function PortalAuth({ onLogin }: { onLogin: () => void }) {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [context, setContext] = useState<{ nombre: string; requiereSetup: boolean } | null>(null);

  // Form states - Clave numérica de 6 dígitos (compatible con claves existentes de 4 dígitos)
  const [pin, setPin] = useState(['', '', '', '', '', '']);
  const [confirmPin, setConfirmPin] = useState(['', '', '', '', '', '']);
  const [step, setStep] = useState<'verify' | 'setup_pin' | 'setup_confirm' | 'login'>('verify');
  
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (!PORTAL_FAMILIA_ENABLED) {
      navigate('/inicio');
      return;
    }

    if (!token) {
      setError('Enlace inválido');
      setLoading(false);
      return;
    }

    // Verify token
    const verifyToken = async () => {
      try {
        const { data, error: rpcError } = await supabase.rpc('portal_verify_token', { p_token: token });
        if (rpcError) throw rpcError;
        
        if (!data.valid) {
          setError(data.error || 'El acceso no es válido o está inactivo.');
          setLoading(false);
          return;
        }

        setContext({
          nombre: data.estudiante_nombre,
          requiereSetup: data.requires_pin_setup
        });
        setStep(data.requires_pin_setup ? 'setup_pin' : 'login');
      } catch (err) {
        console.error(err);
        setError('Ocurrió un error al verificar el acceso.');
      } finally {
        setLoading(false);
      }
    };

    verifyToken();
  }, [token, navigate]);

  const handlePinInput = (index: number, rawValue: string, isConfirm = false) => {
    // Solo permitir dígitos numéricos exactos (sin letras, símbolos ni espacios)
    const cleaned = rawValue.replace(/\D/g, '');
    if (!cleaned && rawValue !== '') return;
    
    const digit = cleaned.slice(-1);
    const newArr = [...(isConfirm ? confirmPin : pin)];
    newArr[index] = digit;
    
    if (isConfirm) setConfirmPin(newArr);
    else setPin(newArr);

    // Autoenfoque al siguiente campo
    if (digit && index < 5) {
      const nextId = isConfirm ? `c-pin-${index + 1}` : `pin-${index + 1}`;
      document.getElementById(nextId)?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent, isConfirm = false) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasted) return;

    const digits = pasted.split('');
    const newArr = [...(isConfirm ? confirmPin : pin)];
    for (let i = 0; i < 6; i++) {
      newArr[i] = digits[i] || '';
    }

    if (isConfirm) setConfirmPin(newArr);
    else setPin(newArr);

    const focusIndex = Math.min(digits.length, 5);
    const targetId = isConfirm ? `c-pin-${focusIndex}` : `pin-${focusIndex}`;
    document.getElementById(targetId)?.focus();
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>, isConfirm = false) => {
    if (e.key === 'Backspace' && !e.currentTarget.value) {
      if (index > 0) {
        const prevId = isConfirm ? `c-pin-${index - 1}` : `pin-${index - 1}`;
        document.getElementById(prevId)?.focus();
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (step === 'setup_pin' && pin.join('').length === 6) {
        setStep('setup_confirm');
        setError(null);
      } else if (step === 'setup_confirm' && confirmPin.join('').length === 6) {
        submitSetup();
      } else if (step === 'login') {
        submitLogin();
      }
    }
  };

  const submitSetup = async () => {
    const finalPin = pin.join('');
    const finalConfirm = confirmPin.join('');
    
    // Nueva clave debe ser estrictamente de 6 dígitos numéricos
    if (finalPin.length !== 6 || !/^\d{6}$/.test(finalPin)) {
      setError('La clave debe contener exactamente 6 dígitos numéricos.');
      return;
    }

    if (finalConfirm.length !== 6 || !/^\d{6}$/.test(finalConfirm)) {
      setError('Debes confirmar los 6 dígitos numéricos de tu clave.');
      return;
    }
    
    if (finalPin !== finalConfirm) {
      setError('Las claves no coinciden.');
      setConfirmPin(['', '', '', '', '', '']);
      setStep('setup_pin');
      return;
    }

    setProcessing(true);
    setError(null);
    try {
      const { data, error: setupError } = await supabase.rpc('portal_setup_pin', { p_token: token, p_pin: finalPin });
      if (setupError) throw setupError;
      
      if (!data.success) {
        setError(data.error || 'Error al configurar la clave');
        setProcessing(false);
        return;
      }
      
      // Auto login after setup
      await executeLogin(finalPin);
    } catch (err) {
      console.error(err);
      setError('Error al configurar el acceso.');
      setProcessing(false);
    }
  };

  const submitLogin = async () => {
    const finalPin = pin.join('');
    // Soporta 6 dígitos (nuevas claves) y 4 dígitos (compatibilidad con cuentas anteriores)
    if (!/^\d{4}$|^\d{6}$/.test(finalPin)) {
      setError('Introduce tu clave numérica (6 dígitos, o 4 dígitos para cuentas anteriores).');
      return;
    }
    
    setProcessing(true);
    setError(null);
    await executeLogin(finalPin);
  };

  const executeLogin = async (finalPin: string) => {
    try {
      const { data, error: loginError } = await supabase.rpc('portal_login', { p_token: token, p_pin: finalPin });
      if (loginError) throw loginError;
      
      if (!data.success) {
        setError(data.error || 'Acceso denegado');
        setPin(['', '', '', '', '', '']);
        document.getElementById('pin-0')?.focus();
        setProcessing(false);
        return;
      }

      sessionStorage.setItem('portal_session', data.session_token);
      onLogin();
    } catch (err) {
      console.error(err);
      setError('Error al iniciar sesión.');
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-(--background) flex flex-col items-center justify-center p-6">
        <Loader2 className="animate-spin text-(--primary) mb-4" size={32} />
        <p className="text-(--ink-soft) text-sm font-semibold">Validando acceso...</p>
      </div>
    );
  }

  if (error && step === 'verify') {
    return (
      <div className="min-h-screen bg-(--background) flex items-center justify-center p-6">
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-(--border-soft) max-w-sm w-full text-center">
          <AlertCircle className="mx-auto text-danger mb-4" size={48} />
          <h2 className="text-xl font-black text-(--ink) mb-2">Acceso Inválido</h2>
          <p className="text-sm text-(--ink-soft) mb-6">{error}</p>
          <Link
            to="/portal"
            className="inline-flex items-center justify-center px-5 py-2.5 rounded-xl bg-[#1E1E24] hover:bg-[#343541] text-white text-xs font-black uppercase tracking-wider transition-all"
          >
            Ir al Portal de Estudiantes
          </Link>
        </div>
      </div>
    );
  }

  const renderPinInputs = (isConfirm = false) => {
    const arr = isConfirm ? confirmPin : pin;
    return (
      <div 
        className="flex justify-center gap-2 sm:gap-2.5 mb-6"
        onPaste={e => handlePaste(e, isConfirm)}
      >
        {arr.map((val, i) => (
          <input
            key={i}
            id={isConfirm ? `c-pin-${i}` : `pin-${i}`}
            type="password"
            maxLength={1}
            inputMode="numeric"
            pattern="[0-9]*"
            autoComplete="off"
            value={val}
            onChange={e => handlePinInput(i, e.target.value, isConfirm)}
            onKeyDown={e => handleKeyDown(i, e, isConfirm)}
            className="w-10 sm:w-12 h-14 sm:h-16 text-center text-xl sm:text-2xl font-black rounded-xl border border-(--border-soft) bg-(--background) focus:bg-white focus:border-(--primary) outline-none transition-all shadow-sm"
          />
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-(--background) flex flex-col items-center justify-center p-6 bg-[radial-gradient(circle,#00000010_1.5px,transparent_1.5px)]" style={{ backgroundSize: '22px 22px' }}>
      
      <div className="relative max-w-md w-full">
        {/* Sombra rayada diagonal artesanal tipo grabado */}
        <div aria-hidden="true" className="absolute top-1.5 left-1.5 -right-2 -bottom-2 rounded-2xl pointer-events-none portal-hatched-shadow" />
        <div className="relative z-10 bg-white p-6 sm:p-8 md:p-10 rounded-2xl border-[2.5px] border-[#1E1E24] w-full">
        
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 rounded-2xl bg-(--french-blue) bg-opacity-10 border-2 border-(--french-blue) flex items-center justify-center">
            {step === 'login' ? <Lock className="text-(--french-blue)" size={32} /> : <Shield className="text-(--french-blue)" size={32} />}
          </div>
        </div>

        <div className="text-center mb-6">
          <h1 className="text-2xl font-black text-(--ink) mb-2 uppercase tracking-tight">Portal CIELO</h1>
          <p className="text-sm font-semibold text-(--ink-soft)">
            Estudiante: <span className="text-(--ink) font-bold">{context?.nombre}</span>
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-danger/10 border border-danger/30 flex items-start gap-3">
            <AlertCircle className="text-danger shrink-0 mt-0.5" size={18} />
            <p className="text-xs font-bold text-danger">{error}</p>
          </div>
        )}

        {(step === 'setup_pin' || step === 'setup_confirm') && (
          <div className="animate-in fade-in slide-in-from-bottom-2">
            <h2 className="text-center text-sm font-black text-(--ink) uppercase tracking-widest mb-1.5">
              {step === 'setup_pin' ? 'Configura tu clave de 6 dígitos' : 'Confirma tu clave de 6 dígitos'}
            </h2>
            <p className="text-center text-xs text-(--ink-soft) mb-6">
              {step === 'setup_pin' 
                ? 'Ingresa una clave numérica de exactamente 6 dígitos para proteger tu acceso.' 
                : 'Vuelve a ingresar la clave de 6 dígitos para confirmarla.'}
            </p>
            
            {renderPinInputs(step === 'setup_confirm')}

            <div className="flex gap-3">
              {step === 'setup_confirm' && (
                <button 
                  onClick={() => { setStep('setup_pin'); setConfirmPin(['','','','','','']); setError(null); }}
                  className="w-1/3 py-3 rounded-xl border border-(--border-soft) bg-(--background) text-(--ink) font-bold text-sm cursor-pointer hover:bg-slate-100 transition-colors"
                  disabled={processing}
                >
                  Volver
                </button>
              )}
              <button
                onClick={() => {
                  if (step === 'setup_pin' && pin.join('').length === 6) {
                    setStep('setup_confirm');
                    setError(null);
                  } else if (step === 'setup_confirm') {
                    submitSetup();
                  }
                }}
                disabled={processing || (step === 'setup_pin' ? pin.join('').length !== 6 || !/^\d{6}$/.test(pin.join('')) : confirmPin.join('').length !== 6 || !/^\d{6}$/.test(confirmPin.join('')))}
                className="flex-1 py-3 bg-(--primary) text-white rounded-xl font-bold text-sm uppercase tracking-widest disabled:opacity-50 flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                {processing ? <Loader2 className="animate-spin" size={16} /> : 'Continuar'}
              </button>
            </div>
          </div>
        )}

        {step === 'login' && (
          <div className="animate-in fade-in slide-in-from-bottom-2">
            <h2 className="text-center text-sm font-black text-(--ink) uppercase tracking-widest mb-1.5">
              Introduce tu clave de acceso
            </h2>
            <p className="text-center text-xs text-(--ink-soft) mb-6">
              Ingresa tu clave numérica (6 dígitos, o 4 dígitos para cuentas anteriores).
            </p>
            
            {renderPinInputs(false)}

            <button
              onClick={submitLogin}
              disabled={processing || (pin.join('').length !== 4 && pin.join('').length !== 6)}
              className="w-full py-3 bg-(--primary) text-white rounded-xl font-bold text-sm uppercase tracking-widest disabled:opacity-50 flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              {processing ? <Loader2 className="animate-spin" size={16} /> : 'Ingresar al Portal'}
            </button>
          </div>
        )}

      </div>
      </div>
    </div>
  );
}
