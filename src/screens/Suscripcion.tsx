import { useState } from 'react';
import { motion } from 'framer-motion';
import { usePremiumAccess } from '../hooks/usePremiumAccess';
import { Loader2 } from 'lucide-react';

export default function Suscripcion() {
  const { hasPremium, isDirector, suscripcionActual } = usePremiumAccess();
  const [docentes, setDocentes] = useState<number>(25);
  const [loadingPlan, setLoadingPlan] = useState<'docente' | 'institucion' | null>(null);

  const handleSubscribe = async (plan: 'docente' | 'institucion') => {
    setLoadingPlan(plan);
    try {
      // Aquí se integraría la llamada real a la API de Tilopay para generar el link de pago
      // Tilopay devuelve un URL, al cual redirigimos al usuario.
      
      // Simulando llamada a API...
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      alert(`Redirigiendo a pasarela de pago Tilopay para el plan ${plan.toUpperCase()}...`);
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
    subtitle: 'Para docentes que desean implementar la evaluación por competencias desde su propia práctica.',
    secondary: 'Ideal para docentes que desean modernizar su práctica educativa y disponer de un entorno de trabajo integral, diseñado específicamente para la evaluación por competencias.',
    features: [
      'Evaluación por competencias.',
      'Rúbricas y listas de cotejo.',
      'Registro anecdótico.',
      'Planificación académica.',
      'Seguimiento del progreso estudiantil.',
      'Gestión de cursos y estudiantes.',
      'Portafolio docente.',
      'Comunidad CIELO.',
      'Todas las herramientas disponibles.'
    ]
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
    <div className="min-h-screen bg-[#FCFBFA] pt-6 pb-20 px-4 md:px-8">
      {hasPremium && suscripcionActual ? (
        <div className="max-w-4xl mx-auto mb-8 bg-green-50 border border-green-200 rounded-2xl p-6 flex items-start gap-4">
          <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center shrink-0">
            <span className="text-green-600 font-bold text-xl">✓</span>
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-bold text-green-900 mb-1">
              Acceso Premium Activo ({suscripcionActual.tipo === 'institucional' ? 'Institucional' : 'Individual'})
            </h3>
            {suscripcionActual.tipo === 'institucional' ? (
              <p className="text-green-700 text-sm">
                Tienes acceso completo provisto por tu centro educativo.
              </p>
            ) : (
              <p className="text-green-700 text-sm">
                Tu plan de Docente Independiente está activo. Disfrutas de todas las herramientas avanzadas.
              </p>
            )}
            <div className="mt-4 flex gap-3">
              <button className="px-4 py-2 bg-white border border-green-200 text-green-700 rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-green-50">
                Gestionar Suscripción
              </button>
            </div>
          </div>
        </div>
      ) : suscripcionActual && suscripcionActual.estado === 'pendiente' ? (
        <div className="max-w-4xl mx-auto mb-8 bg-yellow-50 border border-yellow-200 rounded-2xl p-6 flex items-start gap-4">
          <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center shrink-0">
            <span className="text-yellow-600 font-bold text-xl">!</span>
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-bold text-yellow-900 mb-1">
              Suscripción Pendiente de Pago
            </h3>
            <p className="text-yellow-700 text-sm">
              Tienes una suscripción {suscripcionActual.tipo} iniciada. Completa el pago para activar tu cuenta premium.
            </p>
            <div className="mt-4 flex gap-3">
              <button 
                onClick={() => handleSubscribe(suscripcionActual.tipo === 'institucional' ? 'institucion' : 'docente')}
                disabled={loadingPlan !== null}
                className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-2"
              >
                {loadingPlan !== null ? <Loader2 size={14} className="animate-spin" /> : 'Pagar Ahora (Tilopay)'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <div className="w-full max-w-5xl mx-auto relative z-10">
        {/* Header Section */}
        <div className="text-center mb-8 max-w-2xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-light text-zinc-900 tracking-tight mb-2">
            Planes diseñados para tu realidad.
          </h2>
          <p className="text-zinc-500 text-sm">
            Elige el plan ideal para continuar utilizando todas las funcionalidades avanzadas de evaluación por competencias.
          </p>
        </div>

        {/* Blueprint Grid Container */}
        <div className="border border-dashed border-[rgba(120,135,110,0.25)] bg-white rounded-lg overflow-hidden shadow-[0_1px_2px_rgba(0,0,0,0.01)]">
          <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-dashed divide-[rgba(120,135,110,0.25)]">

            {/* Column 1: Plan Docente */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ type: 'spring', stiffness: 100 }}
              className="flex flex-col justify-between h-full"
            >
              {/* Top part: Header & Price */}
              <div className="p-6 md:p-8 border-b border-dashed border-[rgba(120,135,110,0.25)]">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-[#7A8D69] mb-1">
                  {planDocente.name}
                </h3>
                <p className="text-xs text-zinc-400 mb-4 leading-normal">
                  {planDocente.subtitle}
                </p>
                <div className="flex flex-col">
                  <div className="text-4xl font-light text-zinc-900 tracking-tight">
                    {planDocente.price} <span className="text-lg font-normal text-zinc-400">USD</span>
                  </div>
                  <div className="text-[10px] text-zinc-400 uppercase tracking-wider mt-0.5">
                    por mes
                  </div>
                </div>
              </div>

              {/* Middle part: Features (flex-1 forces same height across columns) */}
              <div className="p-6 md:p-8 flex-1 space-y-2.5 border-b border-dashed border-[rgba(120,135,110,0.25)] bg-[#FAFBF9]/20">
                {planDocente.features.map(feat => (
                  <div key={feat} className="flex items-start gap-2.5">
                    <span className="w-3.5 h-3.5 rounded-full bg-[#EBF1E9] border border-[#D5E1D2] text-[#5C7257] flex items-center justify-center shrink-0 text-[8px] font-extrabold mt-0.5">
                      ✓
                    </span>
                    <span className="text-xs text-zinc-600 leading-tight">
                      {feat}
                    </span>
                  </div>
                ))}
              </div>

              {/* Bottom part: Secondary & Button */}
              <div className="p-6 md:p-8 flex flex-col justify-end bg-white">
                <p className="text-[10px] text-zinc-400 italic leading-relaxed mb-4">
                  {planDocente.secondary}
                </p>
                {hasPremium && suscripcionActual?.tipo === 'individual' ? (
                  <button disabled className="w-full py-2.5 px-4 bg-green-50 border border-green-200 text-green-600 text-xs font-medium tracking-widest uppercase">
                    Plan Actual
                  </button>
                ) : (
                  <button 
                    onClick={() => handleSubscribe('docente')}
                    disabled={loadingPlan !== null || hasPremium}
                    className="w-full py-2.5 px-4 bg-white border border-dashed border-[rgba(120,135,110,0.45)] text-zinc-700 text-xs font-medium tracking-widest uppercase hover:bg-[#FAFBF9] hover:border-[rgba(120,135,110,0.7)] transition-all duration-200 flex justify-center items-center gap-2 disabled:opacity-50"
                  >
                    {loadingPlan === 'docente' ? <Loader2 size={16} className="animate-spin" /> : 'Comprar Plan'}
                  </button>
                )}
              </div>
            </motion.div>

            {/* Column 2: Plan Institución */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1, type: 'spring', stiffness: 100 }}
              className="flex flex-col justify-between h-full"
            >
              {/* Top part: Header & Price */}
              <div className="p-6 md:p-8 border-b border-dashed border-[rgba(120,135,110,0.25)]">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-[#7A8D69] mb-1">
                  {planInst.name}
                </h3>
                <p className="text-xs text-zinc-400 mb-4 leading-normal">
                  {planInst.subtitle}
                </p>
                <div className="flex flex-col">
                  <div className="text-4xl font-light text-zinc-900 tracking-tight">
                    {planInst.price} <span className="text-lg font-normal text-zinc-400">USD</span>
                  </div>
                  <div className="text-[10px] text-zinc-400 uppercase tracking-wider mt-0.5">
                    por docente al mes
                  </div>
                </div>
              </div>

              {/* Middle part: Features */}
              <div className="p-6 md:p-8 flex-1 space-y-2.5 border-b border-dashed border-[rgba(120,135,110,0.25)] bg-[#FAFBF9]/20">
                {planInst.features.map(feat => (
                  <div key={feat} className="flex items-start gap-2.5">
                    <span className="w-3.5 h-3.5 rounded-full bg-[#EBF1E9] border border-[#D5E1D2] text-[#5C7257] flex items-center justify-center shrink-0 text-[8px] font-extrabold mt-0.5">
                      ✓
                    </span>
                    <span className="text-xs text-zinc-600 leading-tight">
                      {feat}
                    </span>
                  </div>
                ))}
              </div>

              {/* Bottom part: Calculator, Secondary & Button */}
              <div className="p-6 md:p-8 flex flex-col justify-end bg-white">
                <div className="border border-dashed border-[rgba(120,135,110,0.25)] bg-[#FAFBF9]/80 rounded p-3 mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-medium text-zinc-500">Número de docentes</span>
                    <input
                      type="number"
                      min="1"
                      value={docentes || ''}
                      onChange={(e) => setDocentes(parseInt(e.target.value) || 0)}
                      className="w-14 px-1.5 py-0.5 bg-white border border-dashed border-[rgba(120,135,110,0.3)] rounded text-right text-[11px] font-semibold text-zinc-800 focus:outline-none"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-dashed border-[rgba(120,135,110,0.2)]">
                    <div>
                      <span className="text-[9px] text-zinc-400 uppercase tracking-wider block">Mensual</span>
                      <span className="text-xs font-semibold text-zinc-700">${mensual} <span className="text-[9px] font-normal text-zinc-400">USD</span></span>
                    </div>
                    <div className="text-right">
                      <span className="text-[9px] text-zinc-400 uppercase tracking-wider block">Anual</span>
                      <span className="text-xs font-semibold text-zinc-700">${anual} <span className="text-[9px] font-normal text-zinc-400">USD</span></span>
                    </div>
                  </div>
                </div>

                <p className="text-[10px] text-zinc-400 italic leading-relaxed mb-4">
                  {planInst.secondary}
                </p>

                {hasPremium && suscripcionActual?.tipo === 'institucional' ? (
                  <button disabled className="w-full py-2.5 px-4 bg-green-50 border border-green-200 text-green-600 text-xs font-medium tracking-widest uppercase">
                    Plan Actual
                  </button>
                ) : isDirector ? (
                  <button 
                    onClick={() => handleSubscribe('institucion')}
                    disabled={loadingPlan !== null}
                    className="w-full py-2.5 px-4 bg-white border border-dashed border-[rgba(120,135,110,0.45)] text-zinc-700 text-xs font-medium tracking-widest uppercase hover:bg-[#FAFBF9] hover:border-[rgba(120,135,110,0.7)] transition-all duration-200 flex justify-center items-center gap-2"
                  >
                    {loadingPlan === 'institucion' ? <Loader2 size={16} className="animate-spin" /> : 'Pagar Institucional'}
                  </button>
                ) : (
                  <button disabled className="w-full py-2.5 px-4 bg-slate-50 border border-dashed border-slate-200 text-slate-400 text-xs font-medium tracking-widest uppercase">
                    Solo para Directores
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
