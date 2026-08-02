import { motion } from 'framer-motion';
import { Check } from 'lucide-react';

export function LandingPricing() {
  const plans = [
    {
      name: 'Plan Docente',
      price: 'Gratis',
      desc: 'Ideal para maestros individuales que desean revolucionar su aula.',
      features: [
        'Hasta 3 cursos activos',
        'Evaluación por rúbricas y cotejos',
        'Registro anecdótico básico',
        'Soporte comunitario'
      ],
      popular: false,
      cta: 'Empezar Gratis'
    },
    {
      name: 'Plan Institución',
      price: 'Personalizado',
      desc: 'El ecosistema completo para colegios y centros educativos vanguardistas.',
      features: [
        'Cursos y docentes ilimitados',
        'Boletines automatizados e imprimibles',
        'Panel administrativo de estadísticas',
        'Módulo de comunidad escolar (Red Social)',
        'Soporte técnico prioritario 24/7'
      ],
      popular: true,
      cta: 'Contactar Ventas'
    }
  ];

  return (
    <section className="py-24 bg-[#FDFBF7] relative">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16 max-w-3xl mx-auto">
          <h2 className="text-3xl md:text-5xl font-black text-[#2E3330] tracking-tighter mb-4">
            Planes diseñados para crecer contigo.
          </h2>
          <p className="text-slate-500 font-medium text-lg">
            Sin costos ocultos. Comienza gratis y escala cuando tu institución lo necesite.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          {plans.map((plan, idx) => (
            <motion.div 
              key={plan.name}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 * idx, type: 'spring', stiffness: 100 }}
              className={`relative rounded-[32px] p-8 md:p-12 border ${
                plan.popular 
                  ? 'bg-[#2E3330] border-slate-800 text-white shadow-2xl' 
                  : 'bg-white border-[rgba(46,51,48,0.08)] text-[#2E3330] shadow-sm'
              }`}
            >
              {plan.popular && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2">
                  <div className="bg-[#BFC9A6] text-[#2E3330] text-[10px] font-black uppercase tracking-widest px-4 py-1.5 rounded-full shadow-sm">
                    Recomendado
                  </div>
                </div>
              )}

              <h3 className="text-xl font-black mb-2">{plan.name}</h3>
              <div className="flex items-end gap-2 mb-4">
                <span className="text-5xl font-black tracking-tighter">{plan.price}</span>
              </div>
              <p className={`text-sm font-medium mb-8 ${plan.popular ? 'text-slate-400' : 'text-slate-500'}`}>
                {plan.desc}
              </p>

              <div className="space-y-4 mb-10">
                {plan.features.map(feat => (
                  <div key={feat} className="flex items-center gap-3">
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-none ${plan.popular ? 'bg-white/10 text-[#86A792]' : 'bg-[#EAE4DA] text-[#7A8D69]'}`}>
                      <Check size={12} strokeWidth={3} />
                    </div>
                    <span className={`text-sm font-bold ${plan.popular ? 'text-slate-300' : 'text-slate-600'}`}>{feat}</span>
                  </div>
                ))}
              </div>

              <button className={`w-full py-4 rounded-full text-sm font-black uppercase tracking-widest transition-all ${
                plan.popular 
                  ? 'bg-[#BFC9A6] text-[#2E3330] hover:bg-[#86A792] shadow-[0_0_20px_rgba(191,201,166,0.2)]' 
                  : 'bg-[#FDFBF7] border border-slate-200 text-[#2E3330] hover:border-[#7A8D69]'
              }`}>
                {plan.cta}
              </button>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
