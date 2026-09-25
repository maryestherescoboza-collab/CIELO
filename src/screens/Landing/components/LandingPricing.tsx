import { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../../../store/appStore';

export function LandingPricing() {
  const navigate = useNavigate();
  const { session } = useAppStore();
  const [docentes, setDocentes] = useState<number>(25);

  const handlePlanSelection = (plan: 'individual' | 'institucional') => {
    if (session) {
      navigate(`/suscripcion?plan=${plan}`);
    } else {
      navigate(`/auth?plan=${plan}`);
    }
  };

  // Tasa de cambio aproximada
  const TASA_CAMBIO_RD = 58.8;

  const featuresComunes = [
    'Evaluación por competencias.',
    'Rúbricas y listas de cotejo.',
    'Registro anecdótico.',
    'Planificación con IA.',
    'Seguimiento del progreso.',
    'Cursos ilimitados.',
    'Portafolio docente.',
    'Soporte y Comunidad CIELO.'
  ];

  const planMensual = {
    name: 'Docente Mensual',
    price: 5,
    subtitle: 'El plan ideal para iniciar tu evaluación por competencias, sin compromisos a largo plazo.',
    features: featuresComunes
  };

  const planAnual = {
    name: 'Docente Anual',
    price: 4,
    badge: 'Ahorra 20%',
    subtitle: 'Compromiso anual de 12 meses al precio más bajo para docentes independientes.',
    features: featuresComunes
  };

  const planInst = {
    name: 'Institución Educativa',
    price: 5,
    subtitle: 'Diseñado para centros que buscan unificar la evaluación y optimizar el trabajo de su equipo.',
    features: [
      'Todas las herramientas docentes.',
      'Acceso para todo el personal.',
      'Gestión centralizada de usuarios.',
      'Acompañamiento en la implementación.',
      '+7 días extra de prueba para centros.'
    ]
  };

  const instMensualUSD = docentes > 0 ? docentes * 5 : 0;

  return (
    <section id="planes" className="py-24 md:py-32 bg-[#F8F3ED] relative">
      <div className="w-[90%] max-w-6xl mx-auto relative z-10">

        {/* Header Section */}
        <div className="text-center mb-10 max-w-2xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-light text-zinc-900 tracking-tight mb-3">
            Planes diseñados para tu realidad.
          </h2>
          <p className="text-zinc-500 text-sm">
            Disfruta de 15 días de prueba gratis. Elige el plan que mejor se adapte a ti o a tu centro.
          </p>
        </div>

        {/* Blueprint Grid Container */}
        <div className="border border-dashed border-[rgba(120,135,110,0.3)] bg-white rounded-lg overflow-hidden shadow-[0_4px_12px_rgba(0,0,0,0.02)]">
          <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-dashed divide-[rgba(120,135,110,0.25)]">

            {/* Column 1: Plan Mensual */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ type: 'spring', stiffness: 100 }}
              className="flex flex-col justify-between h-full bg-white"
            >
              {/* Top part: Header & Price */}
              <div className="p-6 md:p-8 border-b border-dashed border-[rgba(120,135,110,0.25)]">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-[#2E3330] mb-2">
                  {planMensual.name}
                </h3>
                <p className="text-xs text-zinc-500 mb-5 leading-relaxed min-h-10">
                  {planMensual.subtitle}
                </p>
                <div className="flex flex-col">
                  <div className="text-5xl font-light text-zinc-900 tracking-tight">
                    {planMensual.price} <span className="text-lg font-normal text-zinc-400">USD</span>
                  </div>
                  <div className="text-xs text-zinc-400 uppercase tracking-wider mt-1 mb-1">
                    por mes
                  </div>
                  <div className="text-[11px] font-semibold text-[#689C63] uppercase tracking-wider">
                    ≈ RD${Math.round(planMensual.price * TASA_CAMBIO_RD)} / mes
                  </div>
                </div>
              </div>

              {/* Middle part: Features */}
              <div className="p-6 md:p-8 flex-1 space-y-3 bg-[#FAFBF9]/40 border-b border-dashed border-[rgba(120,135,110,0.25)]">
                {planMensual.features.map(feat => (
                  <div key={feat} className="flex items-start gap-2.5">
                    <span className="w-4 h-4 rounded-full bg-[#EBF1E9] border border-[#D5E1D2] text-[#5C7257] flex items-center justify-center shrink-0 text-[10px] font-extrabold mt-0.5">
                      ✓
                    </span>
                    <span className="text-xs text-zinc-600 leading-snug">
                      {feat}
                    </span>
                  </div>
                ))}
              </div>

              {/* Bottom part: CTA */}
              <div className="p-6 md:p-8 flex flex-col justify-end bg-white">
                <button onClick={() => handlePlanSelection('individual')} className="w-full py-3 px-4 bg-white border border-[#DEAE4D] text-[#2E3330] text-[11px] font-bold tracking-widest uppercase rounded-full hover:bg-[#FFFDF7] transition-all duration-300">
                  Comenzar gratis
                </button>
              </div>
            </motion.div>

            {/* Column 2: Plan Anual */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1, type: 'spring', stiffness: 100 }}
              className="flex flex-col justify-between h-full bg-[#FCF9F2]"
            >
              <div className="p-6 md:p-8 border-b border-dashed border-[rgba(120,135,110,0.25)] relative">
                {/* Yellow accent bar at top */}
                <div className="absolute top-0 left-0 w-full h-1 bg-[#DEAE4D]" />
                
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-[#2E3330]">
                    {planAnual.name}
                  </h3>
                  <span className="inline-block text-[9px] font-bold uppercase tracking-wider text-[#1d4431] bg-[#BFC9A6]/40 px-2 py-0.5 rounded-full">
                    {planAnual.badge}
                  </span>
                </div>
                <p className="text-xs text-zinc-500 mb-5 leading-relaxed min-h-10">
                  {planAnual.subtitle}
                </p>
                <div className="flex flex-col">
                  <div className="text-5xl font-light text-zinc-900 tracking-tight">
                    {planAnual.price} <span className="text-lg font-normal text-zinc-400">USD</span>
                  </div>
                  <div className="text-xs text-zinc-400 uppercase tracking-wider mt-1 mb-1">
                    por mes (12 cuotas)
                  </div>
                  <div className="text-[11px] font-semibold text-[#689C63] uppercase tracking-wider">
                    ≈ RD${Math.round(planAnual.price * TASA_CAMBIO_RD)} / mes
                  </div>
                </div>
              </div>

              <div className="p-6 md:p-8 flex-1 space-y-3 bg-white border-b border-dashed border-[rgba(120,135,110,0.25)]">
                {planAnual.features.map(feat => (
                  <div key={feat} className="flex items-start gap-2.5">
                    <span className="w-4 h-4 rounded-full bg-[#EBF1E9] border border-[#D5E1D2] text-[#5C7257] flex items-center justify-center shrink-0 text-[10px] font-extrabold mt-0.5">
                      ✓
                    </span>
                    <span className="text-xs text-zinc-600 leading-snug">
                      {feat}
                    </span>
                  </div>
                ))}
              </div>

              <div className="p-6 md:p-8 flex flex-col justify-end bg-white">
                <button onClick={() => handlePlanSelection('individual')} className="w-full py-3 px-4 bg-[#DEAE4D] text-[#2E3330] text-[11px] font-bold tracking-widest uppercase rounded-full hover:bg-[#C99C44] transition-all duration-300 shadow-[0_4px_12px_rgba(222,174,77,0.2)]">
                  Comenzar prueba gratis
                </button>
              </div>
            </motion.div>

            {/* Column 3: Institucional */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 100 }}
              className="flex flex-col justify-between h-full bg-white"
            >
              <div className="p-6 md:p-8 border-b border-dashed border-[rgba(120,135,110,0.25)]">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-[#2E3330] mb-2">
                  {planInst.name}
                </h3>
                <p className="text-xs text-zinc-500 mb-5 leading-relaxed min-h-10">
                  {planInst.subtitle}
                </p>
                <div className="flex flex-col">
                  <div className="text-5xl font-light text-zinc-900 tracking-tight">
                    {planInst.price} <span className="text-lg font-normal text-zinc-400">USD</span>
                  </div>
                  <div className="text-xs text-zinc-400 uppercase tracking-wider mt-1 mb-1">
                    por docente al mes
                  </div>
                  <div className="text-[11px] font-semibold text-[#689C63] uppercase tracking-wider">
                    ≈ RD${Math.round(planInst.price * TASA_CAMBIO_RD)} / docente
                  </div>
                </div>
              </div>

              <div className="p-6 md:p-8 flex-1 space-y-3 bg-[#FAFBF9]/40 border-b border-dashed border-[rgba(120,135,110,0.25)]">
                {planInst.features.map(feat => (
                  <div key={feat} className="flex items-start gap-2.5">
                    <span className="w-4 h-4 rounded-full bg-[#EBF1E9] border border-[#D5E1D2] text-[#5C7257] flex items-center justify-center shrink-0 text-[10px] font-extrabold mt-0.5">
                      ✓
                    </span>
                    <span className="text-xs text-zinc-600 leading-snug">
                      {feat}
                    </span>
                  </div>
                ))}
              </div>

              <div className="p-6 md:p-8 flex flex-col justify-end bg-white">
                <div className="border border-dashed border-[rgba(120,135,110,0.3)] bg-[#FAFBF9] rounded p-4 mb-5">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[11px] font-medium text-zinc-600">Total docentes</span>
                    <input
                      type="number"
                      min="1"
                      value={docentes || ''}
                      onChange={(e) => setDocentes(parseInt(e.target.value) || 0)}
                      className="w-16 px-2 py-1 bg-white border border-dashed border-[rgba(120,135,110,0.4)] rounded text-right text-xs font-bold text-zinc-800 focus:outline-none focus:border-[#DEAE4D]"
                    />
                  </div>
                  <div className="flex justify-between pt-3 border-t border-dashed border-[rgba(120,135,110,0.2)]">
                    <div>
                      <span className="text-[10px] text-zinc-400 uppercase tracking-wider block mb-0.5">Total Mensual</span>
                      <span className="text-xs font-bold text-zinc-800">${instMensualUSD} USD</span>
                      <span className="text-[9px] font-semibold text-[#689C63] block mt-0.5">≈ RD${Math.round(instMensualUSD * TASA_CAMBIO_RD).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
                <a href="https://wa.link/vshsac" target="_blank" rel="noopener noreferrer" className="block text-center w-full py-3 px-4 bg-white border border-dashed border-[rgba(120,135,110,0.5)] text-zinc-700 text-[11px] font-bold tracking-widest uppercase rounded-full hover:bg-[#FAFBF9] hover:border-[rgba(120,135,110,0.8)] transition-all duration-300">
                  Cotizar centro
                </a>
              </div>
            </motion.div>

          </div>
        </div>
      </div>
    </section>
  );
}
