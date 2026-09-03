import { useState } from 'react';
import { motion } from 'framer-motion';
import { usePremiumAccess } from '../hooks/usePremiumAccess';
import { Loader2 } from 'lucide-react';
import { CieloPill } from '../components/ui/CieloPill';

export default function SuscripcionInstitucional() {
  const { hasPremium, isDirector, suscripcionActual } = usePremiumAccess();
  const [docentes, setDocentes] = useState<number>(25);
  const [loadingPlan, setLoadingPlan] = useState<'docente_mensual' | 'docente_anual' | 'institucion' | null>(null);

  const handleSubscribe = async (plan: 'institucion') => {
    setLoadingPlan(plan);
    try {

      // Tilopay Legacy fallback
      await new Promise(resolve => setTimeout(resolve, 1500));
      alert(`Redirigiendo a pasarela de pago Tilopay para el plan INSTITUCION...`);
      return;
    } catch (error) {
      console.error(error);
      alert('Hubo un error al procesar la solicitud.');
    } finally {
      setLoadingPlan(null);
    }
  };

  const planInst = {
    name: 'Institución Educativa',
    price: '5',
    subtitle: 'El mismo CIELO, con un precio preferencial para centros educativos.',
    secondary: 'Diseñado para instituciones que buscan unificar criterios de evaluación, optimizar el trabajo docente y disponer de una visión integral del proceso educativo.',
    features: [
      'Todas las funcionalidades del plan docente.',
      'Acceso para todos los docentes de la institución.',
      'Tarifa reducida por volumen.',
      'Gestión centralizada de usuarios.'
    ]
  };

  const mensual = docentes > 0 ? docentes * 5 : 0;
  const anual = mensual * 12;

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
                onClick={() => handleSubscribe('institucion')}
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

      <div className="w-full max-w-xl mx-auto relative z-10">
        {/* Header Section */}
        <div className="text-center mb-6 max-w-2xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-light text-(--ink) tracking-tight mb-2">
            Plan Institucional
          </h2>
          <p className="text-(--ink-soft) text-sm">
            Diseñado para instituciones que buscan unificar criterios de evaluación.
          </p>
        </div>

        {/* Blueprint Grid Container */}
        <div className="border border-dashed border-(--border-soft) bg-white rounded-lg overflow-hidden shadow-[0_1px_2px_rgba(0,0,0,0.01)]">
          <div className="flex flex-col">
            {/* Plan Institución */}
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
                  {planInst.name}
                </h3>
                <p className="text-xs text-(--ink-soft) mb-4 leading-normal">
                  {planInst.subtitle}
                </p>
                <div className="flex flex-col">
                  <div className="text-4xl font-light text-(--ink) tracking-tight">
                    {planInst.price} <span className="text-lg font-normal text-(--ink-soft)">USD</span>
                  </div>
                  <div className="text-xs text-(--ink-soft) uppercase tracking-wider mt-0.5 mb-1">
                    por docente al mes
                  </div>
                  <div className="text-xs font-semibold text-[#689C63] uppercase tracking-wider">
                    ≈ RD$290 / docente / mes
                  </div>
                </div>
              </div>

              {/* Middle part: Features */}
              <div className="p-6 md:p-8 flex-1 space-y-2.5 border-b border-dashed border-(--border-soft) bg-(--linen)/5">
                {planInst.features.map(feat => (
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
                <div className="border border-dashed border-(--border-soft) bg-(--background) rounded p-3 mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-(--ink-soft)">Número de docentes</span>
                    <input
                      type="number"
                      min="1"
                      value={docentes || ''}
                      onChange={(e) => setDocentes(parseInt(e.target.value) || 0)}
                      className="w-14 px-1.5 py-0.5 bg-white border border-dashed border-(--border-soft) rounded text-right text-xs font-semibold text-(--ink) focus:outline-none"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-dashed border-(--border-soft)/50">
                    <div>
                      <span className="text-xs text-(--ink-soft) uppercase tracking-wider block">Mensual</span>
                      <span className="text-xs font-semibold text-(--ink)">${mensual} <span className="text-xs font-normal text-(--ink-soft)">USD</span></span>
                      <span className="text-[10px] font-semibold text-[#689C63] uppercase tracking-wider block mt-0.5">≈ RD${(mensual * 58).toLocaleString()}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-xs text-(--ink-soft) uppercase tracking-wider block">Anual</span>
                      <span className="text-xs font-semibold text-(--ink)">${anual} <span className="text-xs font-normal text-(--ink-soft)">USD</span></span>
                      <span className="text-[10px] font-semibold text-[#689C63] uppercase tracking-wider block mt-0.5">≈ RD${(anual * 58).toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                <p className="text-xs text-(--ink-soft) italic leading-relaxed mb-4">
                  {planInst.secondary}
                </p>

                {hasPremium && suscripcionActual?.tipo === 'institucional' ? (
                  <CieloPill as="button" disabled variant="disabled" className="w-full px-4 bg-(--linen) border border-(--border-soft) text-(--primary) shadow-sm">
                    Plan Actual
                  </CieloPill>
                ) : isDirector ? (
                  <CieloPill 
                    as="button"
                    onClick={() => handleSubscribe('institucion')}
                    disabled={loadingPlan !== null}
                    variant={loadingPlan !== null ? 'disabled' : 'ghost'}
                    className="w-full px-4 bg-white border border-dashed border-(--border-soft) text-(--ink) hover:bg-(--linen)/10 hover:border-(--primary) gap-2 flex justify-center shadow-sm h-10 cursor-pointer"
                  >
                    {loadingPlan === 'institucion' ? <Loader2 size={16} className="animate-spin" /> : 'Pagar Institucional'}
                  </CieloPill>
                ) : (
                  <CieloPill as="button" disabled variant="disabled" className="w-full px-4 bg-slate-50 border border-dashed border-slate-200 text-slate-400 shadow-sm">
                    Solo para Directores
                  </CieloPill>
                )}
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
