import { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../../../store/appStore';

export function LandingPricing() {
  const navigate = useNavigate();
  const { session } = useAppStore();

  const handlePlanSelection = (plan: 'individual' | 'institucional') => {
    if (session) {
      navigate(`/suscripcion?plan=${plan}`);
    } else {
      navigate(`/auth?plan=${plan}`);
    }
  };
  const [docentes, setDocentes] = useState<number>(25);

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
    <section id="planes" className="py-24 md:py-32 bg-[#F8F3ED] relative">
      <div className="w-[90%] max-w-250 mx-auto relative z-10">

        {/* Header Section */}
        <div className="text-center mb-8 max-w-2xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-light text-zinc-900 tracking-tight mb-2">
            Planes diseñados para tu realidad.
          </h2>
          <p className="text-zinc-500 text-xs">
            Empieza a evaluar por competencias hoy mismo, ya sea de forma individual o institucional.
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
                <h3 className="text-xs font-semibold uppercase tracking-wider text-primary mb-1">
                  {planDocente.name}
                </h3>
                <p className="text-xs text-zinc-400 mb-4 leading-normal">
                  {planDocente.subtitle}
                </p>
                <div className="flex flex-col">
                  <div className="text-4xl font-light text-zinc-900 tracking-tight">
                    {planDocente.price} <span className="text-lg font-normal text-zinc-400">USD</span>
                  </div>
                  <div className="text-xs text-zinc-400 uppercase tracking-wider mt-0.5 mb-1">
                    por mes
                  </div>
                  <div className="text-xs font-semibold text-[#689C63] uppercase tracking-wider">
                    ≈ RD$348 / mes
                  </div>
                </div>
              </div>

              {/* Middle part: Features (flex-1 forces same height across columns) */}
              <div className="p-6 md:p-8 flex-1 space-y-2.5 border-b border-dashed border-[rgba(120,135,110,0.25)] bg-[#FAFBF9]/20">
                {planDocente.features.map(feat => (
                  <div key={feat} className="flex items-start gap-2.5">
                    <span className="w-3.5 h-3.5 rounded-full bg-[#EBF1E9] border border-[#D5E1D2] text-[#5C7257] flex items-center justify-center shrink-0 text-xs font-extrabold mt-0.5">
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
                <p className="text-xs text-zinc-400 italic leading-relaxed mb-4">
                  {planDocente.secondary}
                </p>
                <button onClick={() => handlePlanSelection('individual')} className="w-full py-2.5 px-4 bg-white border border-dashed border-[rgba(120,135,110,0.45)] text-zinc-700 text-xs font-medium tracking-widest uppercase hover:bg-[#FAFBF9] hover:border-[rgba(120,135,110,0.7)] transition-all duration-200">
                  Comenzar ahora
                </button>
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
                <h3 className="text-xs font-semibold uppercase tracking-wider text-primary mb-1">
                  {planInst.name}
                </h3>
                <p className="text-xs text-zinc-400 mb-4 leading-normal">
                  {planInst.subtitle}
                </p>
                <div className="flex flex-col">
                  <div className="text-4xl font-light text-zinc-900 tracking-tight">
                    {planInst.price} <span className="text-lg font-normal text-zinc-400">USD</span>
                  </div>
                  <div className="text-xs text-zinc-400 uppercase tracking-wider mt-0.5 mb-1">
                    por docente al mes
                  </div>
                  <div className="text-xs font-semibold text-[#689C63] uppercase tracking-wider">
                    ≈ RD$290 / docente / mes
                  </div>
                </div>
              </div>

              {/* Middle part: Features */}
              <div className="p-6 md:p-8 flex-1 space-y-2.5 border-b border-dashed border-[rgba(120,135,110,0.25)] bg-[#FAFBF9]/20">
                {planInst.features.map(feat => (
                  <div key={feat} className="flex items-start gap-2.5">
                    <span className="w-3.5 h-3.5 rounded-full bg-[#EBF1E9] border border-[#D5E1D2] text-[#5C7257] flex items-center justify-center shrink-0 text-xs font-extrabold mt-0.5">
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

                {/* Calculadora Integrada */}
                <div className="border border-dashed border-[rgba(120,135,110,0.25)] bg-[#FAFBF9]/80 rounded p-3 mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-zinc-500">Número de docentes</span>
                    <input
                      type="number"
                      min="1"
                      value={docentes || ''}
                      onChange={(e) => setDocentes(parseInt(e.target.value) || 0)}
                      className="w-14 px-1.5 py-0.5 bg-white border border-dashed border-[rgba(120,135,110,0.3)] rounded text-right text-xs font-semibold text-zinc-800 focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-dashed border-[rgba(120,135,110,0.2)]">
                    <div>
                      <span className="text-xs text-zinc-400 uppercase tracking-wider block">Mensual</span>
                      <span className="text-xs font-semibold text-zinc-700">${mensual} <span className="text-xs font-normal text-zinc-400">USD</span></span>
                      <span className="text-[10px] font-semibold text-[#689C63] uppercase tracking-wider block mt-0.5">≈ RD${(mensual * 58).toLocaleString()}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-xs text-zinc-400 uppercase tracking-wider block">Anual</span>
                      <span className="text-xs font-semibold text-zinc-700">${anual} <span className="text-xs font-normal text-zinc-400">USD</span></span>
                      <span className="text-[10px] font-semibold text-[#689C63] uppercase tracking-wider block mt-0.5">≈ RD${(anual * 58).toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                <p className="text-xs text-zinc-400 italic leading-relaxed mb-4">
                  {planInst.secondary}
                </p>

                <button onClick={() => handlePlanSelection('institucional')} className="w-full py-2.5 px-4 bg-white border border-dashed border-[rgba(120,135,110,0.45)] text-zinc-700 text-xs font-medium tracking-widest uppercase hover:bg-[#FAFBF9] hover:border-[rgba(120,135,110,0.7)] transition-all duration-200">
                  Comenzar ahora
                </button>
              </div>
            </motion.div>

          </div>

          {/* Footer Area inside the grid */}
          <div className="border-t border-dashed border-[rgba(120,135,110,0.25)] p-6 bg-[#FCFAF7]/40 text-center">
            <span className="inline-block border border-dashed border-[rgba(120,135,110,0.35)] text-zinc-500 text-xs uppercase tracking-widest px-2.5 py-0.5 rounded-full mb-3">
              Precio de Lanzamiento
            </span>
            <p className="text-xs text-zinc-400 leading-relaxed mb-1.5 max-w-2xl mx-auto">
              Los precios actuales corresponden a la etapa inicial del proyecto. CIELO continuará evolucionando mediante actualizaciones constantes, nuevas funcionalidades y mejoras continuas.
            </p>
            <p className="text-xs text-zinc-400 leading-relaxed mb-2.5 max-w-2xl mx-auto">
              Los usuarios que se registren durante esta etapa conservarán permanentemente el precio vigente al momento de su suscripción.
            </p>
            <p className="text-xs font-medium text-zinc-600">
              El valor del servicio podría aumentar un 75 % si decides comprar en el futuro.
            </p>
          </div>

        </div>

      </div>
    </section>
  );
}
