import { motion } from 'framer-motion';

export function LandingStats() {
  const experiences = [
    {
      title: 'Tiempo para lo humano',
      desc: 'Automatizamos el cálculo y la tabulación para que puedas dedicar ese tiempo a retroalimentar y acompañar a tus estudiantes.',
      color: '#BFC9A6'
    },
    {
      title: 'Claridad sin esfuerzo',
      desc: 'Un diseño centrado en reducir la fricción. Encuentra lo que buscas instantáneamente, sin perderte en menús infinitos.',
      color: '#EAE4DA'
    },
    {
      title: 'Coherencia pedagógica',
      desc: 'Desde la planificación anual hasta la boleta final, todo fluye bajo la misma lógica competencial. Cero desajustes.',
      color: '#EB8847'
    }
  ];

  return (
    <section className="py-32 bg-[#F8F3ED] relative overflow-hidden">
      {/* Background ambient */}
      <div className="absolute top-1/2 right-0 -translate-y-1/2 w-200 h-200 bg-[#EAE4DA] rounded-full blur-[150px] opacity-40 pointer-events-none -z-10" />

      <div className="max-w-7xl mx-auto px-6 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8 }}
          className="text-center max-w-3xl mx-auto mb-20"
        >
          <div className="inline-flex items-center gap-2 bg-white/50 px-4 py-2 rounded-full border border-black/5 shadow-sm mb-6">
            <span className="text-xs font-bold text-[#5F665E] uppercase tracking-widest">
              Por qué elegir CIELO
            </span>
          </div>
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-black text-[#2E3330] tracking-tighter leading-tight">
            Diseñado para devolverte <span className="text-[#EB8847] italic font-serif font-light">el tiempo.</span>
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-10">
          {experiences.map((exp, idx) => (
            <motion.div
              key={exp.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.6, delay: idx * 0.15 }}
              className="group bg-white/60 backdrop-blur-md rounded-3xl p-10 border border-white/80 shadow-[0_8px_30px_rgba(46,51,48,0.03)] hover:bg-white hover:-translate-y-2 hover:shadow-[0_20px_40px_rgba(46,51,48,0.08)] transition-all duration-500 flex flex-col"
            >
              <div 
                className="w-12 h-12 rounded-2xl mb-8 transition-transform duration-500 group-hover:scale-110 group-hover:rotate-3 shadow-inner"
                style={{ backgroundColor: exp.color }}
              />
              <h3 className="text-2xl font-black text-[#2E3330] tracking-tighter mb-4">
                {exp.title}
              </h3>
              <p className="text-[#59705a] font-medium leading-relaxed">
                {exp.desc}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
