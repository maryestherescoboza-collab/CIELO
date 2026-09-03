import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { usePremiumAccess } from '../hooks/usePremiumAccess';
import { Loader2 } from 'lucide-react';
import { CieloPill } from '../components/ui/CieloPill';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { PayPalScriptProvider, PayPalButtons } from '@paypal/react-paypal-js';

export default function Suscripcion() {
  const navigate = useNavigate();
  const { hasPremium, suscripcionActual } = usePremiumAccess();
  const [loadingPlan, setLoadingPlan] = useState<'docente_mensual' | 'docente_anual' | null>(null);

  useEffect(() => {
    if ((suscripcionActual as any)?.provider === 'manual' && suscripcionActual?.estado === 'activa') {
      navigate('/inicio', { replace: true });
    }
  }, [suscripcionActual, navigate]);

  const PayPalSubscriptionButton = ({ planType }: { planType: 'mensual' | 'anual' }) => {
    return (
      <PayPalScriptProvider options={{ 
        clientId: "Af-mNy8fqCu4n5dP2W3m2LJ55jeeuUzp7Dfzq9SLtVXpBookh4wYuG7hrCtefhv2EQheWLCRLW6f6iv-", 
        vault: true, 
        intent: "subscription" 
      }}>
        <PayPalButtons 
          style={{ layout: "vertical", color: "silver", shape: "rect", label: "subscribe" }}
          createSubscription={async () => {
            const { data: userData } = await supabase.auth.getUser();
            const userId = userData.user?.id;
            
            if (!userId) {
              throw new Error("Usuario no autenticado");
            }

            const { data, error } = await supabase.functions.invoke('paypal-create-subscription', {
              body: { plan_type: planType }
            });

            if (error) {
              console.error("Supabase edge function error:", error);
              throw error;
            }

            if (data?.error) {
              throw new Error(data.error);
            }

            if (!data?.subscriptionId) {
              throw new Error('No se recibió el ID de suscripción de PayPal');
            }

            return data.subscriptionId;
          }}
          onApprove={async (data) => {
            if (data.subscriptionID) {
              navigate(`/suscripcion/paypal/retorno?subscription_id=${data.subscriptionID}`);
            }
          }}
          onError={(err) => {
            console.error("PayPal button error:", err);
            alert("Error al procesar el pago. Por favor intenta nuevamente.");
          }}
        />
      </PayPalScriptProvider>
    );
  };

  const handleSubscribe = async (plan: 'docente_mensual' | 'docente_anual') => {
    setLoadingPlan(plan);
    try {
      // Nueva integración PayPal
      const planType = plan === 'docente_mensual' ? 'mensual' : 'anual';
      const { data, error } = await supabase.functions.invoke('paypal-create-subscription', {
        body: { plan_type: planType }
      });

      if (error) {
        console.error("Supabase edge function error:", error);
        throw error;
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      if (data?.approval_url) {
        window.location.href = data.approval_url;
      } else {
        throw new Error('No se recibió URL de aprobación de PayPal');
      }

    } catch (error) {
      console.error(error);
      alert('Hubo un error al procesar la solicitud.');
    } finally {
      setLoadingPlan(null);
    }
  };

  const planDocente = {
    name: 'Docente Independiente',
    price: '6',
    subtitle: 'Suscripción mensual, renovación automática.',
    secondary: 'Ideal para docentes que desean modernizar su práctica educativa y disponer de un entorno de trabajo integral, diseñado específicamente para la evaluación por competencias.',
    features: [
      'Evaluación por competencias.',
      'Rúbricas y listas de cotejo.',
      'Registro anecdótico.',
      'Planificación académica.',
      'Seguimiento del progreso estudiantil.',
      'Gestión de cursos y estudiantes.',
      'Portafolio docente.',
      'Comunidad CIELO.'
    ]
  };

  const planAnual = {
    name: 'Plan Anual',
    price: '4.50',
    subtitle: '12 ciclos de acceso ininterrumpido.',
    secondary: 'Asegura un año completo de herramientas avanzadas con un ahorro significativo a largo plazo.',
    features: [
      'Todas las funcionalidades del plan mensual.',
      'Ahorro del 25% comparado al plan mensual.',
      'Facturación anual simplificada.',
      'Soporte prioritario.'
    ]
  };



  return (
    <div className="min-h-screen bg-(--background) pt-5 pb-16 px-4 md:px-8">
      {hasPremium && suscripcionActual ? (
        <div className="max-w-4xl mx-auto mb-8 bg-(--linen)/50 border border-(--border-soft) rounded-2xl p-6 flex items-start gap-4">
          <div className="w-12 h-12 bg-(--linen) rounded-full flex items-center justify-center shrink-0">
            <span className="text-(--primary) font-bold text-xl">✓</span>
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-bold text-(--ink) mb-1">
              Acceso Premium Activo ({suscripcionActual.tipo === 'institucional' ? 'Institucional' : 'Individual'})
            </h3>
            {suscripcionActual.tipo === 'institucional' ? (
              <p className="text-(--ink) text-sm">
                Tienes acceso completo provisto por tu centro educativo.
              </p>
            ) : (
              <p className="text-(--ink) text-sm">
                Tu plan de Docente Independiente está activo. Disfrutas de todas las herramientas avanzadas.
              </p>
            )}
            <div className="mt-4 flex gap-3">
              <CieloPill as="button" variant="primary" className="px-4 bg-white border border-(--border-soft) text-(--ink) hover:bg-(--linen)/20 shadow-sm cursor-pointer">
                Gestionar Suscripción
              </CieloPill>
            </div>
          </div>
        </div>
      ) : suscripcionActual && suscripcionActual.estado === 'pendiente' ? (
        <div className="max-w-4xl mx-auto mb-8 bg-(--linen)/50 border border-(--border-soft) rounded-2xl p-6 flex items-start gap-4">
          <div className="w-12 h-12 bg-(--linen) rounded-full flex items-center justify-center shrink-0">
            <span className="text-(--primary) font-bold text-xl">!</span>
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-bold text-(--ink) mb-1">
              Suscripción Pendiente de Pago
            </h3>
            <p className="text-(--ink-soft) text-sm">
              Tienes una suscripción {suscripcionActual.tipo} iniciada. Completa el pago para activar tu cuenta premium.
            </p>
            <div className="mt-4 flex gap-3">
              <CieloPill 
                as="button"
                onClick={() => handleSubscribe('docente_mensual')}
                disabled={loadingPlan !== null}
                variant={loadingPlan !== null ? 'disabled' : 'primary'}
                className="px-4 bg-(--primary) hover:opacity-90 text-white gap-2 shadow-sm cursor-pointer"
              >
                {loadingPlan !== null ? <Loader2 size={14} className="animate-spin" /> : 'Reanudar Pago'}
              </CieloPill>
            </div>
          </div>
        </div>
      ) : null}

      <div className="w-full max-w-4xl mx-auto relative z-10">
        {/* Header Section */}
        <div className="text-center mb-6 max-w-2xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-light text-(--ink) tracking-tight mb-2">
            Planes diseñados para tu realidad.
          </h2>
          <p className="text-(--ink-soft) text-sm">
            Elige el plan ideal para continuar utilizando todas las funcionalidades avanzadas de evaluación por competencias.
          </p>
        </div>

        {/* Blueprint Grid Container */}
        <div className="border border-dashed border-(--border-soft) bg-white rounded-lg overflow-hidden shadow-[0_1px_2px_rgba(0,0,0,0.01)]">
          <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-dashed divide-(--border-soft)">

            {/* Column 1: Plan Docente */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ type: 'spring', stiffness: 100 }}
              className="flex flex-col justify-between h-full"
            >
              {/* Top part: Header & Price */}
              <div className="p-6 md:p-8 border-b border-dashed border-(--border-soft)">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-(--primary) mb-1">
                  {planDocente.name}
                </h3>
                <p className="text-xs text-(--ink-soft) mb-4 leading-normal">
                  {planDocente.subtitle}
                </p>
                <div className="flex flex-col">
                  <div className="text-4xl font-light text-(--ink) tracking-tight">
                    {planDocente.price} <span className="text-lg font-normal text-(--ink-soft)">USD</span>
                  </div>
                  <div className="text-xs text-(--ink-soft) uppercase tracking-wider mt-0.5 mb-1">
                    por mes
                  </div>
                  <div className="text-xs font-semibold text-[#689C63] uppercase tracking-wider">
                    ≈ RD$348 / mes
                  </div>
                </div>
              </div>

              {/* Middle part: Features (flex-1 forces same height across columns) */}
              <div className="p-6 md:p-8 flex-1 space-y-2.5 border-b border-dashed border-(--border-soft) bg-(--linen)/5">
                {planDocente.features.map(feat => (
                  <div key={feat} className="flex items-start gap-2.5">
                    <span className="w-3.5 h-3.5 rounded-full bg-(--linen) border border-(--border-soft) text-(--primary) flex items-center justify-center shrink-0 text-xs font-extrabold mt-0.5">
                      ✓
                    </span>
                    <span className="text-xs text-(--ink) leading-tight">
                      {feat}
                    </span>
                  </div>
                ))}
              </div>

              {/* Bottom part: Secondary & Button */}
              <div className="p-6 md:p-8 flex flex-col justify-end bg-white">
                <p className="text-xs text-(--ink-soft) italic leading-relaxed mb-4">
                  {planDocente.secondary}
                </p>
                {hasPremium && suscripcionActual?.tipo === 'individual' ? (
                  <CieloPill as="button" disabled variant="disabled" className="w-full px-4 bg-(--linen) border border-(--border-soft) text-(--primary) shadow-sm">
                    Plan Actual
                  </CieloPill>
                ) : (
                  <div className="space-y-3 relative z-0">
                    <PayPalSubscriptionButton planType="mensual" />
                  </div>
                )}
              </div>
            </motion.div>

            {/* Column 2: Plan Anual */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1, type: 'spring', stiffness: 100 }}
              className="flex flex-col justify-between h-full"
            >
              {/* Top part: Header & Price */}
              <div className="p-6 md:p-8 border-b border-dashed border-(--border-soft)">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-(--primary) mb-1">
                  {planAnual.name}
                </h3>
                <p className="text-xs text-(--ink-soft) mb-4 leading-normal">
                  {planAnual.subtitle}
                </p>
                <div className="flex flex-col">
                  <div className="text-4xl font-light text-(--ink) tracking-tight">
                    {planAnual.price} <span className="text-lg font-normal text-(--ink-soft)">USD</span>
                  </div>
                  <div className="text-xs text-(--ink-soft) uppercase tracking-wider mt-0.5 mb-1">
                    por mes (facturado anualmente)
                  </div>
                  <div className="text-xs font-semibold text-[#689C63] uppercase tracking-wider flex flex-col gap-0.5">
                    <span>≈ RD$261 / mes</span>
                    <span className="opacity-80">≈ RD$3,132 / año</span>
                  </div>
                </div>
              </div>

              {/* Middle part: Features */}
              <div className="p-6 md:p-8 flex-1 space-y-2.5 border-b border-dashed border-(--border-soft) bg-(--linen)/5">
                {planAnual.features.map(feat => (
                  <div key={feat} className="flex items-start gap-2.5">
                    <span className="w-3.5 h-3.5 rounded-full bg-(--linen) border border-(--border-soft) text-(--primary) flex items-center justify-center shrink-0 text-xs font-extrabold mt-0.5">
                      ✓
                    </span>
                    <span className="text-xs text-(--ink) leading-tight">
                      {feat}
                    </span>
                  </div>
                ))}
              </div>

              {/* Bottom part: Calculator, Secondary & Button */}
              <div className="p-6 md:p-8 flex flex-col justify-end bg-white">
                <p className="text-xs text-(--ink-soft) italic leading-relaxed mb-4">
                  {planAnual.secondary}
                </p>
                {hasPremium && suscripcionActual?.tipo === 'individual' ? (
                  <CieloPill as="button" disabled variant="disabled" className="w-full px-4 bg-(--linen) border border-(--border-soft) text-(--primary) shadow-sm">
                    Plan Actual
                  </CieloPill>
                ) : (
                  <div className="space-y-3 relative z-0">
                    <PayPalSubscriptionButton planType="anual" />
                  </div>
                )}
              </div>
            </motion.div>

          </div>
        </div>
      </div>
    </div>
  );
}
