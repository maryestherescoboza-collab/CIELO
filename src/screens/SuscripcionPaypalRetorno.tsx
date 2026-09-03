import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Loader2, CheckCircle, Clock } from 'lucide-react';
import { useAppStore } from '../store/appStore';

export default function SuscripcionPaypalRetorno() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const session = useAppStore(state => state.session);
  
  const subscriptionId = searchParams.get('subscription_id');
  const [status, setStatus] = useState<'polling' | 'success' | 'timeout' | 'error'>('polling');
  
  useEffect(() => {
    if (!subscriptionId || !session?.user?.id) {
      if (!subscriptionId) {
        console.error("Missing subscription_id in URL");
        setStatus('error');
      }
      return;
    }

    let isMounted = true;
    let pollCount = 0;
    const maxPolls = 15; // 30 seconds max (2s interval)

    const pollSubscriptionStatus = async () => {
      try {
        const { data, error } = await supabase
          .from('suscripciones')
          .select('estado')
          .eq('paypal_subscription_id', subscriptionId)
          .eq('user_id', session.user.id)
          .single();

        if (error) throw error;

        if (data.estado === 'activa') {
          if (isMounted) setStatus('success');
        } else {
          pollCount++;
          if (pollCount >= maxPolls) {
            if (isMounted) setStatus('timeout');
          } else {
            if (isMounted) setTimeout(pollSubscriptionStatus, 2000);
          }
        }
      } catch (error) {
        console.error("Error polling subscription status:", error);
        // Retry anyway in case of transient network error
        pollCount++;
        if (pollCount >= maxPolls) {
          if (isMounted) setStatus('timeout');
        } else {
          if (isMounted) setTimeout(pollSubscriptionStatus, 2000);
        }
      }
    };

    pollSubscriptionStatus();

    return () => {
      isMounted = false;
    };
  }, [subscriptionId, session]);

  return (
    <div className="min-h-screen bg-(--background) flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-sm border border-(--border-soft) text-center">
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
              onClick={() => navigate('/inicio')}
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
              PayPal puede tardar unos minutos adicionales en enviarnos la confirmación. Puedes continuar usando CIELO y revisaremos automáticamente el estado de tu suscripción en segundo plano.
            </p>
            <button 
              onClick={() => navigate('/inicio')}
              className="px-6 py-2 bg-(--ink) text-white font-semibold rounded-lg hover:opacity-90 cursor-pointer"
            >
              Ir al inicio
            </button>
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
