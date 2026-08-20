import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

export function LandingCTA() {
  const navigate = useNavigate();

  return (
    <section className="py-32 relative overflow-hidden bg-[#F8F3ED]">
      {/* Massive centered orb */}
      <div className="absolute w-162.5 h-162.5 bg-[#EAE4DA] -top-20 left-1/2 -translate-x-1/2 rounded-full blur-[140px] opacity-70 pointer-events-none" />
      
      <div className="max-w-4xl mx-auto px-6 text-center relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8 }}
        >
          <p className="text-xs font-bold text-[#5B7D58] uppercase tracking-[0.12em] mb-5">
            El siguiente capítulo
          </p>
          <h2 className="text-5xl md:text-7xl font-black text-[#1d4431] tracking-tighter leading-[0.95] mb-7">
            Tu trabajo docente merece mejores herramientas.
          </h2>
          <p className="text-lg md:text-xl text-[#59705a] font-medium max-w-2xl mx-auto leading-relaxed mb-10">
            Más calma para planificar. Más claridad para evaluar. Más tiempo para acompañar a cada estudiante.
          </p>
          <button 
            onClick={() => navigate('/auth')}
            className="px-10 py-5 rounded-full bg-[#BFC9A6] text-[#1d4431] text-base font-bold uppercase tracking-widest hover:bg-[#A9B492] hover:-translate-y-1 transition-all duration-300 shadow-[0_12px_28px_rgba(191,201,166,0.4)]"
          >
            Comenzar con CIELO
          </button>
        </motion.div>
      </div>
    </section>
  );
}
