import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Loader2, Shield, Lock, AlertCircle } from 'lucide-react';
import { PORTAL_FAMILIA_ENABLED } from '../../config/features';

export default function PortalAuth({ onLogin }: { onLogin: () => void }) {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [context, setContext] = useState<{ nombre: string; requiereSetup: boolean } | null>(null);

  // Form states
  const [pin, setPin] = useState(['', '', '', '']);
  const [confirmPin, setConfirmPin] = useState(['', '', '', '']);
  const [step, setStep] = useState<'verify' | 'setup_pin' | 'setup_confirm' | 'login'>('verify');
  
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (!PORTAL_FAMILIA_ENABLED) {
      navigate('/');
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

  const handlePinInput = (index: number, value: string, isConfirm = false) => {
    if (!/^\d*$/.test(value)) return;
    
    const newArr = [...(isConfirm ? confirmPin : pin)];
    newArr[index] = value;
    
    if (isConfirm) setConfirmPin(newArr);
    else setPin(newArr);

    // Auto focus next
    if (value && index < 3) {
      const nextId = isConfirm ? `c-pin-${index + 1}` : `pin-${index + 1}`;
      document.getElementById(nextId)?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent, isConfirm = false) => {
    if (e.key === 'Backspace' && !e.currentTarget.nodeValue) {
      if (index > 0) {
        const prevId = isConfirm ? `c-pin-${index - 1}` : `pin-${index - 1}`;
        document.getElementById(prevId)?.focus();
      }
    }
  };

  const submitSetup = async () => {
    const finalPin = pin.join('');
    const finalConfirm = confirmPin.join('');
    
    if (finalPin.length !== 4 || finalConfirm.length !== 4) return;
    
    if (finalPin !== finalConfirm) {
      setError('Los PINs no coinciden.');
      setConfirmPin(['', '', '', '']);
      setStep('setup_pin');
      return;
    }

    setProcessing(true);
    setError(null);
    try {
      const { data, error: setupError } = await supabase.rpc('portal_setup_pin', { p_token: token, p_pin: finalPin });
      if (setupError) throw setupError;
      
      if (!data.success) {
        setError(data.error || 'Error al configurar el PIN');
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
    if (finalPin.length !== 4) return;
    
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
        setPin(['', '', '', '']);
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
          <p className="text-sm text-(--ink-soft)">{error}</p>
        </div>
      </div>
    );
  }

  const renderPinInputs = (isConfirm = false) => {
    const arr = isConfirm ? confirmPin : pin;
    return (
      <div className="flex justify-center gap-3 mb-6">
        {arr.map((val, i) => (
          <input
            key={i}
            id={isConfirm ? `c-pin-${i}` : `pin-${i}`}
            type="password"
            maxLength={1}
            inputMode="numeric"
            value={val}
            onChange={e => handlePinInput(i, e.target.value, isConfirm)}
            onKeyDown={e => handleKeyDown(i, e, isConfirm)}
            className="w-14 h-16 text-center text-2xl font-black rounded-xl border border-(--border-soft) bg-(--background) focus:bg-white focus:border-(--primary) outline-none transition-all shadow-sm"
          />
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-(--background) flex flex-col items-center justify-center p-6 bg-[radial-gradient(circle,#00000010_1.5px,transparent_1.5px)]" style={{ backgroundSize: '22px 22px' }}>
      
      <div className="bg-white p-8 md:p-10 rounded-2xl shadow-sm border-3 border-(--ink) max-w-md w-full relative" style={{ boxShadow: '5px 5px 0 var(--ink)' }}>
        
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 rounded-2xl bg-(--french-blue) bg-opacity-10 border-2 border-(--french-blue) flex items-center justify-center">
            {step === 'login' ? <Lock className="text-(--french-blue)" size={32} /> : <Shield className="text-(--french-blue)" size={32} />}
          </div>
        </div>

        <div className="text-center mb-8">
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
            <h2 className="text-center text-sm font-black text-(--ink) uppercase tracking-widest mb-6">
              {step === 'setup_pin' ? 'Configura tu PIN de 4 dígitos' : 'Confirma tu PIN'}
            </h2>
            
            {renderPinInputs(step === 'setup_confirm')}

            <div className="flex gap-3">
              {step === 'setup_confirm' && (
                <button 
                  onClick={() => { setStep('setup_pin'); setConfirmPin(['','','','']); setError(null); }}
                  className="w-1/3 py-3 rounded-xl border border-(--border-soft) bg-(--background) text-(--ink) font-bold text-sm"
                  disabled={processing}
                >
                  Volver
                </button>
              )}
              <button
                onClick={() => {
                  if (step === 'setup_pin' && pin.join('').length === 4) {
                    setStep('setup_confirm');
                    setError(null);
                  } else if (step === 'setup_confirm') {
                    submitSetup();
                  }
                }}
                disabled={processing || (step === 'setup_pin' ? pin.join('').length < 4 : confirmPin.join('').length < 4)}
                className="flex-1 py-3 bg-(--primary) text-white rounded-xl font-bold text-sm uppercase tracking-widest disabled:opacity-50 flex items-center justify-center gap-2 transition-all"
              >
                {processing ? <Loader2 className="animate-spin" size={16} /> : 'Continuar'}
              </button>
            </div>
          </div>
        )}

        {step === 'login' && (
          <div className="animate-in fade-in slide-in-from-bottom-2">
             <h2 className="text-center text-sm font-black text-(--ink) uppercase tracking-widest mb-6">
              Introduce tu PIN
            </h2>
            
            {renderPinInputs(false)}

            <button
                onClick={submitLogin}
                disabled={processing || pin.join('').length < 4}
                className="w-full py-3 bg-(--primary) text-white rounded-xl font-bold text-sm uppercase tracking-widest disabled:opacity-50 flex items-center justify-center gap-2 transition-all"
              >
                {processing ? <Loader2 className="animate-spin" size={16} /> : 'Ingresar al Portal'}
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
