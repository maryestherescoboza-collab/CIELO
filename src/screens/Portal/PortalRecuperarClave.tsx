import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Loader2, KeyRound, CheckCircle2, AlertCircle, ShieldAlert } from 'lucide-react';
import { PORTAL_FAMILIA_ENABLED } from '../../config/features';
import './PortalStyles.css';

export default function PortalRecuperarClave() {
  const { recoveryToken } = useParams<{ recoveryToken: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusErrorType, setStatusErrorType] = useState<string | null>(null);
  const [estudianteNombre, setEstudianteNombre] = useState<string>('');
  const [expiresAt, setExpiresAt] = useState<string | null>(null);

  const [pin, setPin] = useState(['', '', '', '', '', '']);
  const [confirmPin, setConfirmPin] = useState(['', '', '', '', '', '']);
  const [step, setStep] = useState<'verify' | 'new_pin' | 'confirm_pin' | 'completed'>('verify');
  const [processing, setProcessing] = useState(false);
  const [resolvedAccessToken, setResolvedAccessToken] = useState<string | null>(null);

  useEffect(() => {
    if (!PORTAL_FAMILIA_ENABLED) {
      navigate('/inicio', { replace: true });
      return;
    }

    if (!recoveryToken) {
      setError('El enlace de recuperación no es válido.');
      setStatusErrorType('invalido');
      setLoading(false);
      return;
    }

    let active = true;

    const verifyRecoveryToken = async () => {
      try {
        const { data, error: rpcError } = await supabase.rpc('portal_verificar_qr_recuperacion', {
          p_recovery_token: recoveryToken
        });
        if (rpcError) throw rpcError;
        if (!active) return;

        if (!data || !data.valid) {
          setStatusErrorType(data?.status || 'invalido');
          setError(data?.error || 'El código QR de recuperación no es válido o ha expirado.');
          setLoading(false);
          return;
        }

        setEstudianteNombre(data.estudiante_nombre || 'Estudiante');
        setExpiresAt(data.expires_at || null);
        setStep('new_pin');
      } catch (err) {
        console.error(err);
        if (!active) return;
        setError('Ocurrió un error al verificar el código QR de recuperación.');
      } finally {
        if (active) setLoading(false);
      }
    };

    verifyRecoveryToken();

    return () => {
      active = false;
    };
  }, [recoveryToken, navigate]);

  const handlePinInput = (index: number, rawValue: string, isConfirm = false) => {
    const cleaned = rawValue.replace(/\D/g, '');
    if (!cleaned && rawValue !== '') return;

    const digit = cleaned.slice(-1);
    const newArr = [...(isConfirm ? confirmPin : pin)];
    newArr[index] = digit;

    if (isConfirm) setConfirmPin(newArr);
    else setPin(newArr);

    if (digit && index < 5) {
      const nextId = isConfirm ? `rec-c-pin-${index + 1}` : `rec-pin-${index + 1}`;
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
    const targetId = isConfirm ? `rec-c-pin-${focusIndex}` : `rec-pin-${focusIndex}`;
    document.getElementById(targetId)?.focus();
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>, isConfirm = false) => {
    if (e.key === 'Backspace' && !e.currentTarget.value) {
      if (index > 0) {
        const prevId = isConfirm ? `rec-c-pin-${index - 1}` : `rec-pin-${index - 1}`;
        document.getElementById(prevId)?.focus();
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (step === 'new_pin' && pin.join('').length === 6) {
        setStep('confirm_pin');
        setError(null);
      } else if (step === 'confirm_pin' && confirmPin.join('').length === 6) {
        submitNewPin();
      }
    }
  };

  const submitNewPin = async () => {
    const finalPin = pin.join('');
    const finalConfirm = confirmPin.join('');

    if (finalPin.length !== 6 || !/^\d{6}$/.test(finalPin)) {
      setError('La nueva clave debe contener exactamente 6 dígitos numéricos.');
      return;
    }

    if (finalConfirm.length !== 6 || !/^\d{6}$/.test(finalConfirm)) {
      setError('Debes confirmar los 6 dígitos numéricos de tu nueva clave.');
      return;
    }

    if (finalPin !== finalConfirm) {
      setError('Las claves no coinciden. Vuelve a intentarlo.');
      setConfirmPin(['', '', '', '', '', '']);
      setStep('new_pin');
      return;
    }

    setProcessing(true);
    setError(null);

    try {
      const { data, error: rpcError } = await supabase.rpc('portal_completar_recuperacion_clave', {
        p_recovery_token: recoveryToken,
        p_new_pin: finalPin
      });

      if (rpcError) throw rpcError;

      if (!data || !data.success) {
        setError(data?.error || 'No se pudo restablecer la clave. Es posible que el código QR haya vencido o ya haya sido utilizado.');
        setProcessing(false);
        return;
      }

      // Cerrar cualquier sesión local previa para obligar a autenticarse con la nueva clave
      sessionStorage.removeItem('portal_session');
      setResolvedAccessToken(data.access_token || null);
      setStep('completed');
    } catch (err) {
      console.error(err);
      setError('Ocurrió un error al guardar la nueva clave de seguridad.');
    } finally {
      setProcessing(false);
    }
  };

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
            id={isConfirm ? `rec-c-pin-${i}` : `rec-pin-${i}`}
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

  if (loading) {
    return (
      <div className="min-h-screen bg-(--background) flex flex-col items-center justify-center p-6">
        <Loader2 className="animate-spin text-(--primary) mb-4" size={32} />
        <p className="text-(--ink-soft) text-sm font-semibold">Verificando QR de recuperación...</p>
      </div>
    );
  }

  if (step === 'verify' && error) {
    const statusTitle =
      statusErrorType === 'utilizado'
        ? 'QR de Recuperación Ya Utilizado'
        : statusErrorType === 'vencido'
          ? 'QR de Recuperación Vencido'
          : statusErrorType === 'reemplazado'
            ? 'QR de Recuperación Reemplazado'
            : 'QR de Recuperación Inválido';

    return (
      <div className="min-h-screen bg-(--background) flex items-center justify-center p-6 bg-[radial-gradient(circle,#00000010_1.5px,transparent_1.5px)]" style={{ backgroundSize: '22px 22px' }}>
        <div className="relative max-w-sm w-full">
          <div aria-hidden="true" className="absolute top-1.5 left-1.5 -right-2 -bottom-2 rounded-2xl pointer-events-none portal-hatched-shadow" />
          <div className="relative z-10 bg-white p-7 sm:p-8 rounded-2xl border-[2.5px] border-[#1E1E24] w-full text-center">
            <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-amber-50 border-2 border-amber-500 flex items-center justify-center">
              <ShieldAlert className="text-amber-700" size={30} />
            </div>
            <h2 className="text-lg sm:text-xl font-black text-(--ink) mb-2 uppercase tracking-tight">
              {statusTitle}
            </h2>
            <p className="text-xs sm:text-sm text-(--ink-soft) leading-relaxed mb-6">
              {error}
            </p>
            <Link
              to="/portal"
              className="inline-flex items-center justify-center w-full px-5 py-3 rounded-xl bg-[#1E1E24] hover:bg-[#343541] text-white text-xs font-black uppercase tracking-wider transition-all"
            >
              Ir al Portal del Estudiante
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-(--background) flex flex-col items-center justify-center p-6 bg-[radial-gradient(circle,#00000010_1.5px,transparent_1.5px)]" style={{ backgroundSize: '22px 22px' }}>
      <div className="relative max-w-md w-full">
        <div aria-hidden="true" className="absolute top-1.5 left-1.5 -right-2 -bottom-2 rounded-2xl pointer-events-none portal-hatched-shadow" />
        <div className="relative z-10 bg-white p-6 sm:p-8 md:p-10 rounded-2xl border-[2.5px] border-[#1E1E24] w-full">
          
          {step === 'completed' ? (
            <div className="text-center animate-in fade-in slide-in-from-bottom-2">
              <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-[#689C63]/15 border-2 border-[#689C63] flex items-center justify-center">
                <CheckCircle2 className="text-[#4B7547]" size={34} />
              </div>

              <span className="inline-block text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full bg-[#689C63]/15 text-[#4B7547] mb-2">
                Clave Actualizada
              </span>

              <h1 className="text-xl sm:text-2xl font-black text-(--ink) mb-2 uppercase tracking-tight">
                Nueva Clave Establecida
              </h1>

              <p className="text-xs sm:text-sm text-(--ink-soft) leading-relaxed mb-6">
                La clave de seguridad de <strong className="text-(--ink)">{estudianteNombre}</strong> fue restablecida correctamente y este código QR de recuperación ha quedado desactivado. Ahora puedes ingresar al portal utilizando tu nueva clave.
              </p>

              <button
                type="button"
                onClick={() => {
                  if (resolvedAccessToken) {
                    navigate(`/portal/${resolvedAccessToken}`, { replace: true });
                  } else {
                    navigate('/portal', { replace: true });
                  }
                }}
                className="w-full py-3.5 bg-[#1E1E24] hover:bg-[#343541] text-white rounded-xl font-black text-xs uppercase tracking-widest transition-all cursor-pointer"
              >
                Ir a Iniciar Sesión con mi Nueva Clave
              </button>
            </div>
          ) : (
            <>
              <div className="flex justify-center mb-5">
                <div className="w-16 h-16 rounded-2xl bg-[#DEAE4D]/20 border-2 border-[#C58F2B] flex items-center justify-center">
                  <KeyRound className="text-[#8F641B]" size={32} />
                </div>
              </div>

              <div className="text-center mb-6">
                <span className="inline-block text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full bg-amber-50 text-[#8F641B] border border-amber-200 mb-2">
                  Recuperación de Clave · Uso Único
                </span>
                <h1 className="text-xl sm:text-2xl font-black text-(--ink) mb-1.5 uppercase tracking-tight">
                  Restablecer Clave de Seguridad
                </h1>
                <p className="text-xs sm:text-sm font-semibold text-(--ink-soft)">
                  Estudiante: <span className="text-(--ink) font-bold">{estudianteNombre}</span>
                </p>
                {expiresAt && (
                  <p className="text-[11px] text-(--ink-soft) mt-1">
                    Este código es válido para un único cambio de clave.
                  </p>
                )}
              </div>

              {error && (
                <div className="mb-6 p-4 rounded-xl bg-danger/10 border border-danger/30 flex items-start gap-3">
                  <AlertCircle className="text-danger shrink-0 mt-0.5" size={18} />
                  <p className="text-xs font-bold text-danger">{error}</p>
                </div>
              )}

              <div className="animate-in fade-in slide-in-from-bottom-2">
                <h2 className="text-center text-xs sm:text-sm font-black text-(--ink) uppercase tracking-widest mb-1.5">
                  {step === 'new_pin' ? 'Nueva clave de 6 dígitos' : 'Confirma tu nueva clave'}
                </h2>
                <p className="text-center text-xs text-(--ink-soft) mb-6">
                  {step === 'new_pin'
                    ? 'Crea una nueva clave numérica de 6 dígitos que puedas recordar fácilmente.'
                    : 'Escribe nuevamente los 6 dígitos para confirmar el cambio de clave.'}
                </p>

                {renderPinInputs(step === 'confirm_pin')}

                <div className="flex gap-3">
                  {step === 'confirm_pin' && (
                    <button
                      type="button"
                      onClick={() => {
                        setStep('new_pin');
                        setConfirmPin(['', '', '', '', '', '']);
                        setError(null);
                      }}
                      className="w-1/3 py-3 rounded-xl border border-(--border-soft) bg-(--background) text-(--ink) font-bold text-sm cursor-pointer hover:bg-slate-100 transition-colors"
                      disabled={processing}
                    >
                      Volver
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      if (step === 'new_pin' && pin.join('').length === 6) {
                        setStep('confirm_pin');
                        setError(null);
                      } else if (step === 'confirm_pin') {
                        submitNewPin();
                      }
                    }}
                    disabled={
                      processing ||
                      (step === 'new_pin'
                        ? pin.join('').length !== 6 || !/^\d{6}$/.test(pin.join(''))
                        : confirmPin.join('').length !== 6 || !/^\d{6}$/.test(confirmPin.join('')))
                    }
                    className="flex-1 py-3 bg-[#1E1E24] hover:bg-[#343541] text-white rounded-xl font-bold text-xs sm:text-sm uppercase tracking-widest disabled:opacity-50 flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    {processing ? (
                      <Loader2 className="animate-spin" size={16} />
                    ) : step === 'new_pin' ? (
                      'Continuar'
                    ) : (
                      'Guardar Nueva Clave'
                    )}
                  </button>
                </div>
              </div>
            </>
          )}

        </div>
      </div>
    </div>
  );
}

