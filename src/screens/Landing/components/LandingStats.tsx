import { motion } from 'framer-motion';

export function LandingStats() {
  const stats = [
    { label: 'Centros Educativos', value: '45+', suffix: '' },
    { label: 'Docentes Activos', value: '1,200', suffix: '+' },
    { label: 'Estudiantes Evaluados', value: '30', suffix: 'k' },
    { label: 'Horas Administrativas Ahorradas', value: '98', suffix: '%' },
  ];

  return (
    <section className="py-24 bg-[#1a1c1a] relative overflow-hidden text-white">
      {/* Background decoration */}
      <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
      <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-[#7A8D69]/20 rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-6 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-16 items-center">
          <div>
            <motion.h2 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-4xl md:text-5xl font-black tracking-tighter mb-6 leading-tight"
            >
              El impacto real de enseñar <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#86A792] to-[#BFC9A6]">sin burocracia.</span>
            </motion.h2>
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="text-slate-400 font-medium text-lg leading-relaxed max-w-md"
            >
              CIELO no es solo un software, es una transformación institucional. 
              Liberamos a los educadores de la carga operativa para que dediquen su energía a lo que realmente importa: sus estudiantes.
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
                  <span className="text-xl font-bold text-[#86A792]">{stat.suffix}</span>
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
