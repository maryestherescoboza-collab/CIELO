import { motion } from 'framer-motion';

export function LandingStats() {
  const stats = [
    { label: 'Organiza experiencias de aprendizaje.', value: 'Planificación', suffix: '' },
    { label: 'Aplica rúbricas y cotejos.', value: 'Evaluación', suffix: '' },
    { label: 'Registra avances y evidencias.', value: 'Seguimiento', suffix: '' },
    { label: 'Convierte datos en decisiones pedagógicas.', value: 'Análisis', suffix: '' },
  ];

  return (
    <section className="py-24 bg-[#1a1c1a] relative overflow-hidden text-white">
      {/* Background decoration */}
      <div className="absolute top-0 left-0 w-full h-px bg-linear-to-r from-transparent via-white/20 to-transparent" />
      <div className="absolute bottom-0 right-0 w-125 h-125 bg-primary/20 rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-6 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-16 items-center">
          <div>
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-4xl md:text-5xl font-black tracking-tighter mb-6 leading-tight"
            >
              CIELO conecta cada etapa <br />
              <span className="text-transparent bg-clip-text bg-linear-to-r from-(--primary) to-(--primary)">del proceso educativo.</span>
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="text-slate-400 font-medium text-lg leading-relaxed max-w-md"
            >
              Ayudamos a los docentes a organizar, evaluar y dar seguimiento al aprendizaje desde un solo lugar.
            </motion.p>
          </div>

          <div className="grid grid-cols-2 gap-6 md:gap-10">
            {stats.map((stat, idx) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.1 * idx, type: 'spring', stiffness: 100 }}
                className="border-l border-white/10 pl-6"
              >
                <div className="flex items-baseline gap-1 mb-2">
                  <span className="text-4xl md:text-5xl font-black text-white tracking-tighter">
                    {stat.value}
                  </span>
                  <span className="text-xl font-bold text-primary">{stat.suffix}</span>
                </div>
                <p className="text-xs font-bold uppercase tracking-widest text-slate-500">
                  {stat.label}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
