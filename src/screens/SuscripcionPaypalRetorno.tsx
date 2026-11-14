import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Loader2, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { useAppStore } from '../store/appStore';

export default function SuscripcionPaypalRetorno() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const session = useAppStore(state => state.session);
  
  const subscriptionId = searchParams.get('subscription_id') || sessionStorage.getItem('cielo_pending_sub_id');
  const [status, setStatus] = useState<'polling' | 'success' | 'timeout' | 'error' | 'unauthenticated'>(
    !session?.user?.id ? 'unauthenticated' : 'polling'
  );
  const [pollAttempt, setPollAttempt] = useState(0);

  const checkStatus = useCallback(async () => {
    if (!subscriptionId) {
      console.error("Missing subscription_id in URL/storage");
      setStatus('error');
      return;
    }

    if (!session?.user?.id) {
      sessionStorage.setItem('cielo_pending_paypal_return', window.location.pathname + window.location.search);
      sessionStorage.setItem('cielo_pending_sub_id', subscriptionId);
      setStatus('unauthenticated');
      return;
    }

    setStatus('polling');
    let pollCount = 0;
    const maxPolls = 15; // 30 segundos (2s intervalo)

    const poll = async () => {
      try {
        const { data, error } = await supabase
          .from('suscripciones')
          .select('estado')
          .eq('paypal_subscription_id', subscriptionId)
          .eq('user_id', session.user.id)
          .maybeSingle();

        if (error) throw error;

        if (data && data.estado === 'activa') {
          sessionStorage.removeItem('cielo_pending_paypal_return');
          sessionStorage.removeItem('cielo_pending_sub_id');
          setStatus('success');
          return;
        }

        pollCount++;

        // Verificación activa directa con la Edge Function ante retrasos del Webhook
        if (pollCount === 2 || pollCount === 6 || pollCount === 12) {
          try {
            const { data: verifyData } = await supabase.functions.invoke('paypal-verify-subscription', {
              body: { subscriptionId }
            });
            if (verifyData?.estado === 'activa') {
              sessionStorage.removeItem('cielo_pending_paypal_return');
              sessionStorage.removeItem('cielo_pending_sub_id');
              setStatus('success');
              return;
            }
          } catch (vErr) {
            console.warn("Direct verification fallback:", vErr);
          }
        }

        if (pollCount >= maxPolls) {
          setStatus('timeout');
        } else {
          setTimeout(poll, 2000);
        }
      } catch (err) {
        console.error("Error polling subscription status:", err);
        pollCount++;
        if (pollCount >= maxPolls) {
          setStatus('timeout');
        } else {
          setTimeout(poll, 2000);
        }
      }
    };

    poll();
  }, [subscriptionId, session]);

  useEffect(() => {
    if (session?.user?.id && subscriptionId) {
      checkStatus();
    } else if (!session?.user?.id) {
      setStatus('unauthenticated');
    }
  }, [session, subscriptionId, pollAttempt, checkStatus]);

  const handleGoHome = () => {
    window.location.href = '/inicio';
  };

  const handleGoLogin = () => {
    if (subscriptionId) {
      sessionStorage.setItem('cielo_pending_paypal_return', window.location.pathname + window.location.search);
      sessionStorage.setItem('cielo_pending_sub_id', subscriptionId);
    }
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-(--background) flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-sm border border-(--border-soft) text-center">
        {status === 'unauthenticated' && (
          <div className="flex flex-col items-center">
            <AlertCircle size={48} className="text-amber-500 mb-6" />
            <h2 className="text-xl font-bold text-(--ink) mb-2">Inicia sesión para vincular tu suscripción</h2>
            <p className="text-(--ink-soft) text-sm mb-6">
              Tu proceso en PayPal ha finalizado. Para confirmar y activar tu acceso Premium en tu cuenta de CIELO de forma segura, por favor inicia sesión.
            </p>
            <button 
              onClick={handleGoLogin}
              className="px-6 py-2 bg-(--primary) text-white font-semibold rounded-lg hover:opacity-90 cursor-pointer"
            >
              Iniciar sesión para activar
            </button>
          </div>
        )}

        {status === 'polling' && (
          <div className="flex flex-col items-center">
            <Loader2 size={48} className="text-(--primary) animate-spin mb-6" />
            <h2 className="text-xl font-bold text-(--ink) mb-2">Estamos confirmando tu suscripción...</h2>
            <p className="text-(--ink-soft) text-sm">
              Por favor espera un momento mientras validamos el pago con PayPal. No cierres esta ventana.
            </p>
          </div>
        )}

        {status === 'success' && (
          <div className="flex flex-col items-center">
            <CheckCircle size={48} className="text-green-500 mb-6" />
            <h2 className="text-xl font-bold text-(--ink) mb-2">¡Suscripción activa!</h2>
            <p className="text-(--ink-soft) text-sm mb-6">
              Tu pago ha sido procesado correctamente y ya tienes acceso a todas las funcionalidades premium de CIELO.
            </p>
            <button 
              onClick={handleGoHome}
              className="px-6 py-2 bg-(--primary) text-white font-semibold rounded-lg hover:opacity-90 cursor-pointer"
            >
              Ir a mi cuenta
            </button>
          </div>
        )}

        {status === 'timeout' && (
          <div className="flex flex-col items-center">
            <Clock size={48} className="text-orange-500 mb-6" />
            <h2 className="text-xl font-bold text-(--ink) mb-2">Estamos terminando de confirmar tu pago</h2>
            <p className="text-(--ink-soft) text-sm mb-6">
              PayPal puede tardar unos momentos adicionales en consolidar la transacción con tu banco. Puedes reintentar la comprobación ahora o continuar a tu cuenta.
            </p>
            <div className="flex flex-col sm:flex-row gap-2 justify-center w-full">
              <button 
                onClick={() => setPollAttempt(p => p + 1)}
                className="px-5 py-2 bg-(--primary) text-white font-semibold rounded-lg hover:opacity-90 cursor-pointer text-xs"
              >
                Reintentar validación
              </button>
              <button 
                onClick={handleGoHome}
                className="px-5 py-2 bg-(--ink) text-white font-semibold rounded-lg hover:opacity-90 cursor-pointer text-xs"
              >
                Ir al inicio
              </button>
            </div>
          </div>
        )}

        {status === 'error' && (
          <div className="flex flex-col items-center">
            <h2 className="text-xl font-bold text-rose-600 mb-2">Error de validación</h2>
            <p className="text-(--ink-soft) text-sm mb-6">
              No se encontró información válida sobre la suscripción. Si realizaste el pago, por favor revisa el estado en la sección de Suscripciones.
            </p>
            <button 
              onClick={() => navigate('/suscripcion')}
              className="px-6 py-2 bg-(--ink) text-white font-semibold rounded-lg hover:opacity-90 cursor-pointer"
            >
              Volver a planes
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
