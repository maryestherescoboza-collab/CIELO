import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

export function LandingCTA() {
  const navigate = useNavigate();

  return (
    <section className="py-24 md:py-32 relative bg-[#F8F3ED] border-t border-[rgba(46,51,48,0.08)]">
      <div className="max-w-4xl mx-auto px-6 text-center relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
        >
          <span className="text-xs font-bold text-[#5F665E] uppercase tracking-widest block mb-4">
            Comienza hoy
          </span>
          <h2 className="text-3xl md:text-5xl font-extrabold text-[#2E3330] tracking-tight leading-tight mb-6">
            Lleva la evaluación por competencias al siguiente nivel.
          </h2>
          <p className="text-base md:text-lg text-[#5F665E] max-w-2xl mx-auto leading-relaxed mb-8">
            Únete a cientos de docentes que han dejado atrás las hojas de cálculo para evaluar con rigor, orden y tranquilidad.
          </p>
          <div className="flex flex-col items-center justify-center">
            <button 
              onClick={() => navigate('/auth?plan=individual')}
              className="px-8 py-3.5 rounded-full bg-[#DEAE4D] text-[#2E3330] text-sm sm:text-base font-bold hover:bg-[#C99C44] hover:-translate-y-0.5 active:translate-y-0 transition-all shadow-[0_6px_18px_rgba(222,174,77,0.35)] cursor-pointer"
            >
              Comenzar prueba gratis de 15 días
            </button>
            <p className="text-xs text-[#5F665E] font-medium mt-3">
              Sin tarjeta de crédito · Configuración inmediata
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
