import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { usePremiumAccess } from '../hooks/usePremiumAccess';
// Loader2 import removed since it's unused
import { CieloPill } from '../components/ui/CieloPill';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { PayPalScriptProvider, PayPalButtons } from '@paypal/react-paypal-js';

export default function Suscripcion() {
  const navigate = useNavigate();
  const { hasPremium, suscripcionActual } = usePremiumAccess();
  // El ID oficial de Sandbox de PayPal
  const PAYPAL_CLIENT_ID = "Af-mNy8fqCu4n5dP2W3m2LJ55jeeuUzp7Dfzq9SLtVXpBookh4wYuG7hrCtefhv2EQheWLCRLW6f6iv-";

  const [isExtending, setIsExtending] = useState(false);
  const [extensionGranted, setExtensionGranted] = useState(false);

  const handleInstitutionalTrial = async () => {
    if (isExtending || extensionGranted) return;
    setIsExtending(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.user_metadata?.trial_extension_requested) {
        await supabase.auth.updateUser({
          data: { trial_extension_requested: true }
        });
      }
      setExtensionGranted(true);
    } catch (e) {
      console.error(e);
    } finally {
      setIsExtending(false);
    }
  };

  useEffect(() => {
    if ((suscripcionActual as any)?.provider === 'manual' && suscripcionActual?.estado === 'activa') {
      navigate('/inicio', { replace: true });
    }
  }, [suscripcionActual, navigate]);

  const PayPalSubscriptionButton = ({ planType }: { planType: 'mensual' | 'anual' }) => {
    return (
      <PayPalScriptProvider options={{ 
        clientId: PAYPAL_CLIENT_ID, 
        vault: true, 
        intent: "subscription",
        "enable-funding": "card"
      }}>
        <PayPalButtons 
          style={{ layout: "vertical", color: "silver", shape: "rect", label: "subscribe" }}
          createSubscription={async () => {
            const { data: userData } = await supabase.auth.getUser();
            const userId = userData.user?.id;
            
            if (!userId) {
              throw new Error("Usuario no autenticado");
            }

            // Llamamos a la Edge Function pasando el tipo de plan
            const { data, error } = await supabase.functions.invoke('paypal-create-subscription', {
              body: { planType }
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

  const TASA_CAMBIO_RD = 58.8; // Valor configurable de tasa de cambio (USD a RD$)
  const precioMensualUSD = 5;
  const precioAnualUSD = 4;
  const precioMensualRD = Math.round(precioMensualUSD * TASA_CAMBIO_RD);
  const precioAnualRD = Math.round(precioAnualUSD * TASA_CAMBIO_RD);

  const featuresComunes = [
    'Evalúa por competencias de forma completa',
    'Crea rúbricas y listas de cotejo en minutos',
    'Lleva tu registro anecdótico y visual al día',
    'Planifica tus clases con ayuda de la IA',
    'Haz seguimiento del progreso de cada estudiante',
    'Gestiona todos los cursos que quieras',
    'Construye tu portafolio docente',
    'Únete a la Comunidad CIELO'
  ];

  const planMensual = {
    name: 'CIELO Docente Mensual',
    subtitle: 'Empieza con 15 días gratis. Después, solo 5 USD al mes.',
    secondary: 'El cobro lo administra PayPal mes a mes. Tu primer pago se realiza recién 15 días después de comenzar.',
    features: featuresComunes
  };

  const planAnual = {
    name: 'CIELO Docente Anual',
    badge: 'Ahorra 20%',
    subtitle: 'Mismo acceso premium con 15 días gratis, pero a un menor costo.',
    secondary: 'Compromiso de 12 meses. El cobro lo administra PayPal de forma mensual.',
    features: featuresComunes
  };

  return (
    <div className="min-h-screen bg-[#F8F3ED] pt-6 pb-12 px-4 md:px-8 font-sans flex flex-col">
      <div className="w-full max-w-6xl mx-auto flex justify-end mb-4">
        <button onClick={() => navigate('/inicio')} className="px-5 py-2 bg-white border border-dashed border-[rgba(120,135,110,0.45)] text-zinc-700 hover:bg-[#F3F6F2] transition-colors shadow-[0_1px_2px_rgba(0,0,0,0.01)] text-[10px] font-bold tracking-widest uppercase cursor-pointer rounded-full">
          Volver a CIELO
        </button>
      </div>

      {hasPremium && suscripcionActual ? (
        <div className="w-full max-w-6xl mx-auto mb-6 bg-white border border-dashed border-[rgba(120,135,110,0.25)] rounded-lg p-5 flex items-start gap-4 shadow-[0_1px_2px_rgba(0,0,0,0.01)]">
          <div className="w-12 h-12 bg-[#EBF1E9] border border-[#D5E1D2] rounded-full flex items-center justify-center shrink-0">
            <span className="text-[#5C7257] font-bold text-xl">✓</span>
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-bold text-zinc-900 mb-1">
              Acceso Premium Activo ({suscripcionActual.tipo === 'institucional' ? 'Institucional' : 'Individual'})
            </h3>
            {suscripcionActual.tipo === 'institucional' ? (
              <p className="text-zinc-600 text-sm mb-4">
                Tienes acceso completo provisto por tu centro educativo.
              </p>
            ) : (
              <p className="text-zinc-600 text-sm mb-4">
                Tu plan CIELO Docente está activo. Disfrutas de todas las herramientas avanzadas.
              </p>
            )}
            <div className="mt-4 flex gap-3">
              <CieloPill as="button" variant="primary" className="px-4 bg-white border border-dashed border-[rgba(120,135,110,0.45)] text-zinc-700 hover:bg-[#FAFBF9] shadow-sm cursor-pointer text-xs uppercase tracking-widest">
                Gestionar Suscripción
              </CieloPill>
            </div>
          </div>
        </div>
      ) : suscripcionActual && suscripcionActual.estado === 'pendiente' ? (
        <div className="w-full max-w-6xl mx-auto mb-6 bg-white border border-dashed border-[#D97706]/40 rounded-lg p-5 flex items-start gap-4 shadow-[0_1px_2px_rgba(0,0,0,0.01)]">
          <div className="w-12 h-12 bg-[#FFFBEB] border border-[#FDE68A] rounded-full flex items-center justify-center shrink-0">
            <span className="text-[#D97706] font-bold text-xl">!</span>
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-bold text-zinc-900 mb-1">
              Suscripción Pendiente
            </h3>
            <p className="text-zinc-600 text-sm mb-4">
              Tienes una suscripción iniciada. Finaliza el proceso con PayPal.
            </p>
            <div className="max-w-xs relative z-0">
               <PayPalSubscriptionButton planType="mensual" />
            </div>
          </div>
        </div>
      ) : null}

      <div className="w-full max-w-6xl mx-auto relative z-10 mt-2 flex-1">
        {/* Header Section */}
        <div className="text-center mb-6 max-w-2xl mx-auto">
          <h2 className="text-2xl font-light text-zinc-900 tracking-tight mb-1">
            Lleva tu enseñanza al siguiente nivel.
          </h2>
          <p className="text-zinc-500 text-xs">
            Elige el plan que mejor se adapte a ti. Ambos incluyen todas las herramientas.
          </p>
        </div>

        {/* Blueprint Grid Container */}
        <div className="border border-dashed border-[rgba(120,135,110,0.25)] bg-white rounded-lg overflow-hidden shadow-[0_1px_2px_rgba(0,0,0,0.01)]">
          <div className="grid grid-cols-1 lg:grid-cols-3 divide-y lg:divide-y-0 lg:divide-x divide-dashed divide-[rgba(120,135,110,0.25)]">
            
            {/* Column 1: Plan Mensual */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ type: 'spring', stiffness: 100 }}
              className="flex flex-col h-full"
            >
              {/* Top part: Header & Price */}
              <div className="p-4 lg:p-5 border-b border-dashed border-[rgba(120,135,110,0.25)]">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-primary mb-1">
                  {planMensual.name}
                </h3>
                <p className="text-[11px] text-zinc-400 mb-3 leading-normal">
                  {planMensual.subtitle}
                </p>
                <div className="flex flex-col">
                  <div className="text-3xl font-light text-zinc-900 tracking-tight">
                    {precioMensualUSD} <span className="text-sm font-normal text-zinc-400">USD</span>
                  </div>
                  <div className="text-[10px] text-zinc-400 uppercase tracking-wider mt-0.5 mb-1">
                    por mes
                  </div>
                  <div className="text-[10px] font-semibold text-[#689C63] uppercase tracking-wider">
                    ≈ RD${precioMensualRD} / mes
                  </div>
                </div>
              </div>

              {/* Middle part: Features */}
              <div className="p-4 lg:p-5 flex-1 space-y-2 border-b border-dashed border-[rgba(120,135,110,0.25)] bg-[#FAFBF9]/20">
                {planMensual.features.map(feat => (
                  <div key={feat} className="flex items-start gap-2">
                    <span className="w-3.5 h-3.5 rounded-full bg-[#EBF1E9] border border-[#D5E1D2] text-[#5C7257] flex items-center justify-center shrink-0 text-[10px] font-extrabold mt-0.5">
                      ✓
                    </span>
                    <span className="text-[11px] text-zinc-600 leading-tight">
                      {feat}
                    </span>
                  </div>
                ))}
              </div>

              {/* Bottom part: Secondary & Button */}
              <div className="p-4 lg:p-5 flex flex-col justify-end bg-white">
                <p className="text-[10px] text-zinc-400 italic leading-relaxed mb-3">
                  {planMensual.secondary}
                </p>
                
                <div className="relative z-0">
                  {hasPremium && suscripcionActual?.tipo === 'individual' ? (
                    <button disabled className="w-full py-2 px-4 bg-white border border-dashed border-[rgba(120,135,110,0.2)] text-zinc-400 text-[10px] font-medium tracking-widest uppercase rounded-sm">
                      Plan Actual
                    </button>
                  ) : (
                    <PayPalSubscriptionButton planType="mensual" />
                  )}
                </div>
              </div>
            </motion.div>

            {/* Column 2: Plan Anual */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1, type: 'spring', stiffness: 100 }}
              className="flex flex-col h-full bg-[#F7FAF5]/60"
            >
              {/* Top part: Header & Price */}
              <div className="p-4 lg:p-5 border-b border-dashed border-[rgba(120,135,110,0.25)]">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-primary">
                    {planAnual.name}
                  </h3>
                  <span className="inline-block text-[8px] font-bold uppercase tracking-wider text-[#5C7257] bg-[#EBF1E9] border border-[#D5E1D2] px-1.5 py-0.5 rounded-full leading-none">
                    {planAnual.badge}
                  </span>
                </div>
                <p className="text-[11px] text-zinc-400 mb-3 leading-normal">
                  {planAnual.subtitle}
                </p>
                <div className="flex flex-col">
                  <div className="text-3xl font-light text-zinc-900 tracking-tight">
                    {precioAnualUSD} <span className="text-sm font-normal text-zinc-400">USD</span>
                  </div>
                  <div className="text-[10px] text-zinc-400 uppercase tracking-wider mt-0.5 mb-1">
                    por mes (12 cuotas)
                  </div>
                  <div className="text-[10px] font-semibold text-[#689C63] uppercase tracking-wider">
                    ≈ RD${precioAnualRD} / mes
                  </div>
                </div>
              </div>

              {/* Middle part: Features */}
              <div className="p-4 lg:p-5 flex-1 space-y-2 border-b border-dashed border-[rgba(120,135,110,0.25)] bg-white">
                {planAnual.features.map(feat => (
                  <div key={feat} className="flex items-start gap-2">
                    <span className="w-3.5 h-3.5 rounded-full bg-[#EBF1E9] border border-[#D5E1D2] text-[#5C7257] flex items-center justify-center shrink-0 text-[10px] font-extrabold mt-0.5">
                      ✓
                    </span>
                    <span className="text-[11px] text-zinc-600 leading-tight">
                      {feat}
                    </span>
                  </div>
                ))}
              </div>

              {/* Bottom part: Secondary & Button */}
              <div className="p-4 lg:p-5 flex flex-col justify-end bg-[#F7FAF5]/60">
                <p className="text-[10px] text-zinc-400 italic leading-relaxed mb-3">
                  {planAnual.secondary}
                </p>
                
                <div className="relative z-0">
                  {hasPremium && suscripcionActual?.tipo === 'individual' ? (
                    <button disabled className="w-full py-2 px-4 bg-white border border-dashed border-[rgba(120,135,110,0.2)] text-zinc-400 text-[10px] font-medium tracking-widest uppercase rounded-sm">
                      Plan Actual
                    </button>
                  ) : (
                    <PayPalSubscriptionButton planType="anual" />
                  )}
                </div>
              </div>
            </motion.div>

            {/* Column 3: Institucional Proposal */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 100 }}
              className={`flex flex-col h-full bg-[#FAFBF9]/20 transition-all ${extensionGranted ? 'opacity-95' : ''}`}
            >
              {/* Top part: Header */}
              <div className="p-4 lg:p-5 border-b border-dashed border-[rgba(120,135,110,0.25)] flex-1 flex flex-col items-center justify-center text-center">
                <h3 className="text-[13px] font-bold uppercase tracking-wider text-primary mb-2">
                  Lleva CIELO a tu institución educativa
                </h3>
                <p className="text-xs text-zinc-500 mb-3 leading-relaxed max-w-[90%]">
                  La mayoría de los usuarios sigue evaluando con el método tradicional de acumulación de puntos porque no cuenta con directrices claras para aplicar la evaluación por competencias.
                </p>
                <p className="text-xs text-zinc-700 font-bold mb-0 leading-relaxed">
                  Con CIELO, tu institución puede dar ese paso.
                </p>
              </div>

              {/* Middle part: Feature/Promo & Button */}
              <div className="p-4 lg:p-5 bg-white flex flex-col justify-end">
                 <div className="flex items-start gap-2 mb-3">
                    <span className="w-4 h-4 rounded-full bg-[#EBF1E9] border border-[#D5E1D2] text-[#5C7257] flex items-center justify-center shrink-0 text-[10px] font-extrabold mt-0.5">+</span>
                    <h4 className="text-[12px] font-bold text-zinc-900 tracking-tight leading-snug">
                       +7 días de prueba para presentar la propuesta en tu centro.
                    </h4>
                 </div>
                 
                 {extensionGranted ? (
                    <div className="flex flex-col w-full">
                      <button disabled className="w-full py-1.5 px-3 bg-[#EBF1E9]/40 border border-dashed border-[#D5E1D2] text-[#5C7257] text-[10px] font-bold tracking-widest uppercase cursor-not-allowed rounded-sm">
                        Extensión activada
                      </button>
                      <p className="text-[10px] text-zinc-500 text-center font-medium mt-1.5">
                        Vuelve a CIELO para continuar.
                      </p>
                    </div>
                  ) : (
                    <button 
                      onClick={handleInstitutionalTrial}
                      disabled={isExtending}
                      className="w-full py-1.5 px-3 bg-white border border-dashed border-[rgba(120,135,110,0.45)] text-zinc-700 hover:bg-[#F3F6F2] transition-colors shadow-[0_1px_2px_rgba(0,0,0,0.01)] text-[10px] font-bold tracking-widest uppercase rounded-sm cursor-pointer disabled:opacity-50 disabled:cursor-wait"
                    >
                      {isExtending ? 'Activando...' : 'Obtener 7 días adicionales'}
                    </button>
                  )}
              </div>
            </motion.div>

          </div>
        </div>
      </div>
    </div>
  );
}
