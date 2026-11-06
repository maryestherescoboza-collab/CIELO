import { useEffect, useState, useCallback, memo } from 'react';
import { motion } from 'framer-motion';
import { usePremiumAccess } from '../hooks/usePremiumAccess';
import { CieloPill } from '../components/ui/CieloPill';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { PayPalScriptProvider, PayPalButtons } from '@paypal/react-paypal-js';
import { useAppStore } from '../store/appStore';
import { AlertCircle, X } from 'lucide-react';

const PAYPAL_CLIENT_ID = "BAALGDYDZVHKbF-LAgkLOESd5uPYHjrnsQlUySvjMkkeA--XHzJYpfwyhzz-PkUUiYEQTiNi4zDYf2udJ4";

const paypalScriptOptions = {
  clientId: PAYPAL_CLIENT_ID,
  vault: true,
  intent: "subscription",
  currency: "USD",
  "enable-funding": "card"
} as const;

const STATIC_FORCE_RERENDER: any[] = [];

const BUTTON_STYLE = {
  layout: "vertical" as const,
  color: "silver" as const,
  shape: "rect" as const,
  label: "subscribe" as const
};

interface PayPalSubscriptionButtonProps {
  planType: 'mensual' | 'anual';
  onApprove: (subscriptionId: string) => void;
  onError: (err: any) => void;
  onCancel: () => void;
}

const PayPalSubscriptionButton = memo(function PayPalSubscriptionButton({
  planType,
  onApprove,
  onError,
  onCancel
}: PayPalSubscriptionButtonProps) {
  // Diagnóstico seguro de ciclo de vida del componente
  useEffect(() => {
    console.log(`[PayPal Diagnostic] Botón [${planType}] MONTADO en el DOM.`);
    return () => {
      console.warn(`[PayPal Diagnostic] Botón [${planType}] DESMONTADO del DOM.`);
    };
  }, [planType]);

  const handleInit = useCallback((_data: any, _actions: any) => {
    console.log(`[PayPal Diagnostic] [${planType}] onInit: SDK de PayPal inicializado y listo.`);
  }, [planType]);

  const handleClick = useCallback((data: any, actions: any) => {
    console.log(`[PayPal Diagnostic] [${planType}] onClick: Usuario abrió el flujo. Fuente:`, data?.fundingSource || 'standard');
    return actions.resolve();
  }, [planType]);

  const handleCreateSubscription = useCallback(async () => {
    console.log(`[PayPal Diagnostic] [${planType}] createSubscription iniciado.`);
    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      
      if (userError || !userId) {
        console.error(`[PayPal Diagnostic] [${planType}] Usuario no autenticado para crear suscripción.`);
        throw new Error("Usuario no autenticado");
      }

      console.log(`[PayPal Diagnostic] [${planType}] Solicitando creación de suscripción en servidor.`);
      const { data, error } = await supabase.functions.invoke('paypal-create-subscription', {
        body: { planType }
      });

      if (error) {
        console.error(`[PayPal Diagnostic] [${planType}] Error en Edge Function paypal-create-subscription:`, error.message || error);
        throw error;
      }

      if (data?.error) {
        console.error(`[PayPal Diagnostic] [${planType}] Error devuelto por paypal-create-subscription:`, data.error);
        throw new Error(data.error);
      }

      if (!data?.subscriptionId) {
        console.error(`[PayPal Diagnostic] [${planType}] subscriptionId no recibido en la respuesta.`);
        throw new Error('No se recibió el ID de suscripción de PayPal');
      }

      console.log(`[PayPal Diagnostic] [${planType}] Suscripción creada en PayPal. ID recibido: ${data.subscriptionId}`);
      return data.subscriptionId;
    } catch (err: any) {
      console.error(`[PayPal Diagnostic] [${planType}] Fallo en createSubscription:`, err?.message || err);
      throw err;
    }
  }, [planType]);

  const handleApproveCallback = useCallback(async (data: { subscriptionID?: string | null }) => {
    console.log(`[PayPal Diagnostic] [${planType}] onApprove recibido de PayPal. ID: ${data.subscriptionID}`);
    if (data.subscriptionID) {
      onApprove(data.subscriptionID);
    }
  }, [planType, onApprove]);

  const handleCancelCallback = useCallback((data: any) => {
    console.log(`[PayPal Diagnostic] [${planType}] onCancel disparado por PayPal. Detalle sanitizado:`, {
      orderID: data?.orderID || null,
      timestamp: new Date().toISOString()
    });
    onCancel();
  }, [planType, onCancel]);

  const handleErrorCallback = useCallback((err: any) => {
    console.error(`[PayPal Diagnostic] [${planType}] onError disparado por PayPal SDK. Detalle sanitizado:`, {
      message: err?.message || String(err),
      timestamp: new Date().toISOString()
    });
    onError(err);
  }, [planType, onError]);

  return (
    <PayPalButtons
      style={BUTTON_STYLE}
      forceReRender={STATIC_FORCE_RERENDER}
      onInit={handleInit}
      onClick={handleClick}
      createSubscription={handleCreateSubscription}
      onApprove={handleApproveCallback}
      onCancel={handleCancelCallback}
      onError={handleErrorCallback}
    />
  );
});

function SuscripcionContent() {
  const navigate = useNavigate();
  const { hasPremium, suscripcionActual } = usePremiumAccess();
  const setState = useAppStore(s => s.setState);

  const [isExtending, setIsExtending] = useState(false);
  const [extensionGranted, setExtensionGranted] = useState(false);
  const [checkoutMessage, setCheckoutMessage] = useState<{ type: 'error' | 'info'; text: string } | null>(null);

  const handleInstitutionalTrial = async () => {
    if (isExtending || extensionGranted) return;
    setIsExtending(true);
    try {
      const { data: activatedAt, error } = await supabase.rpc('activar_extension_institucional');
      
      if (error) throw error;
      
      if (activatedAt) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user?.id) {
           setState(prev => ({
             ...prev,
             perfiles: prev.perfiles.map(p => 
               p.userId === session.user.id 
                 ? { ...p, trial_extension_activated_at: activatedAt } 
                 : p
             )
           }));
        }
        setExtensionGranted(true);
      } else {
        alert('Ya has utilizado tus 7 días de prueba institucionales.');
      }
    } catch (e) {
      console.error(e);
      alert('Ha ocurrido un error al activar la extensión.');
    } finally {
      setIsExtending(false);
    }
  };

  // Solo redirigir si el docente ya tiene una suscripción pagada activa en base de datos.
  // Los usuarios con prueba activa o vencida deben permanecer para contratar cualquier plan.
  useEffect(() => {
    if (suscripcionActual && suscripcionActual.estado === 'activa') {
      console.log("[PayPal Diagnostic] Usuario con suscripción activa confirmado. Redirigiendo a /inicio");
      navigate('/inicio', { replace: true });
    }
  }, [suscripcionActual, navigate]);

  const handleApprove = useCallback((subscriptionId: string) => {
    console.log(`[PayPal Diagnostic] Aprobación completada. Redirigiendo a retorno con ID: ${subscriptionId}`);
    navigate(`/suscripcion/paypal/retorno?subscription_id=${subscriptionId}`);
  }, [navigate]);

  const handleCancel = useCallback(() => {
    console.log("[PayPal Diagnostic] Flujo cancelado en ventana PayPal. Notificando al usuario.");
    setCheckoutMessage({
      type: 'info',
      text: 'El proceso en PayPal fue cancelado. Tus datos no fueron modificados y puedes reintentar cuando gustes.'
    });
  }, []);

  const handleError = useCallback((err: any) => {
    console.error("[PayPal Diagnostic] Error capturado en el flujo de pago:", err?.message || err);
    setCheckoutMessage({
      type: 'error',
      text: 'No se pudo completar la operación con PayPal. Por favor verifica los datos o intenta nuevamente.'
    });
  }, []);

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
    secondary: (
      <span className="block text-xs not-italic text-zinc-500">
        <strong className="text-zinc-800 font-bold">Compromiso de 12 meses.</strong> Pagarás una cuota cada mes durante 12 meses. PayPal hará los cobros automáticamente.
      </span>
    ),
    features: featuresComunes
  };

  return (
    <div className="min-h-screen bg-[#F8F3ED] pt-6 pb-12 px-4 md:px-8 font-sans flex flex-col">
      <div className="w-full max-w-6xl mx-auto flex justify-end mb-4">
        <button onClick={() => navigate('/inicio')} className="px-5 py-2 bg-white border border-dashed border-[rgba(120,135,110,0.45)] text-zinc-700 hover:bg-[#F3F6F2] transition-colors shadow-[0_1px_2px_rgba(0,0,0,0.01)] text-[10px] font-bold tracking-widest uppercase cursor-pointer rounded-full">
          Volver a CIELO
        </button>
      </div>

      {checkoutMessage && (
        <div className={`w-full max-w-6xl mx-auto mb-4 p-4 rounded-lg flex items-center justify-between border ${
          checkoutMessage.type === 'error'
            ? 'bg-rose-50 border-rose-200 text-rose-800'
            : 'bg-amber-50 border-amber-200 text-amber-800'
        }`}>
          <div className="flex items-center gap-2 text-sm">
            <AlertCircle size={18} />
            <span>{checkoutMessage.text}</span>
          </div>
          <button
            onClick={() => setCheckoutMessage(null)}
            className="text-zinc-400 hover:text-zinc-700 p-1 cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {hasPremium && suscripcionActual && suscripcionActual.estado === 'activa' ? (
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
              <CieloPill
                as="button"
                variant="primary"
                onClick={() => navigate('/ajustes?tab=plan')}
                className="px-4 bg-white border border-dashed border-[rgba(120,135,110,0.45)] text-zinc-700 hover:bg-[#FAFBF9] shadow-sm cursor-pointer text-xs uppercase tracking-widest"
              >
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
              Suscripción pendiente de confirmación
            </h3>
            <p className="text-zinc-600 text-sm">
              Tienes un intento de suscripción previo con PayPal. Puedes reintentar o elegir cualquiera de los planes disponibles a continuación.
            </p>
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
                
                <div className="relative z-0 min-h-[44px]">
                  {hasPremium && suscripcionActual?.tipo === 'individual' && suscripcionActual.estado === 'activa' ? (
                    <button disabled className="w-full py-2 px-4 bg-white border border-dashed border-[rgba(120,135,110,0.2)] text-zinc-400 text-[10px] font-medium tracking-widest uppercase rounded-sm">
                      Plan Actual
                    </button>
                  ) : (
                    <PayPalSubscriptionButton
                      key="paypal-sub-btn-mensual"
                      planType="mensual"
                      onApprove={handleApprove}
                      onCancel={handleCancel}
                      onError={handleError}
                    />
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
                
                <div className="relative z-0 min-h-[44px]">
                  {hasPremium && suscripcionActual?.tipo === 'individual' && suscripcionActual.estado === 'activa' ? (
                    <button disabled className="w-full py-2 px-4 bg-white border border-dashed border-[rgba(120,135,110,0.2)] text-zinc-400 text-[10px] font-medium tracking-widest uppercase rounded-sm">
                      Plan Actual
                    </button>
                  ) : (
                    <PayPalSubscriptionButton
                      key="paypal-sub-btn-anual"
                      planType="anual"
                      onApprove={handleApprove}
                      onCancel={handleCancel}
                      onError={handleError}
                    />
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

export default function Suscripcion() {
  return (
    <PayPalScriptProvider options={paypalScriptOptions}>
      <SuscripcionContent />
    </PayPalScriptProvider>
  );
}
