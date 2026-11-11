import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { HeroFloats } from './HeroFloats';

export function LandingHero() {
  const navigate = useNavigate();
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { type: 'spring' as const, stiffness: 100, damping: 20 },
    },
  };

  return (
    <section className="relative pt-32 pb-20 md:pt-44 md:pb-28 overflow-hidden flex flex-col items-center justify-center min-h-[85vh] bg-[#F8F3ED]">
      {/* Background ambient glow / Orbs */}
      <div className="absolute w-150 h-150 bg-[#EAE4DA] -top-20 -right-12 rounded-full blur-[120px] opacity-70 pointer-events-none -z-10" />
      <div className="absolute w-125 h-125 bg-[#BFC9A6] bottom-8 left-[25%] rounded-full blur-[140px] opacity-20 pointer-events-none -z-10" />

      {/* Hero Grid Canvas style */}
      <div className="absolute inset-0 opacity-30 pointer-events-none -z-20 mask-[linear-gradient(to_bottom,black,transparent_90%)]" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(46,51,48,0.3) 1px, transparent 0)', backgroundSize: '32px 32px' }} />

      {/* Floating UI Cards */}
      <HeroFloats />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 text-center z-10 w-full relative">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="max-w-5xl mx-auto flex flex-col items-center"
        >
          {/* Nombre / Marca superior sutil y elegante */}
          <motion.span
            variants={itemVariants}
            className="text-xs sm:text-sm font-bold uppercase tracking-widest text-[#5F665E] mb-3 block"
          >
            Cielo
          </motion.span>

          <motion.h1
            variants={itemVariants}
            className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-extrabold text-[#2E3330] tracking-tight leading-snug mb-8 w-full"
          >
            <span className="block md:whitespace-nowrap">
              La única plataforma de{' '}
              <span className="inline-block whitespace-nowrap font-extrabold">
                <span className="text-[#355B85]">R</span>
                <span className="text-[#C54134]">D</span>
              </span>
            </span>
            <span className="block md:whitespace-nowrap mt-1 sm:mt-1.5">
              especializada en evaluación por competencias.
            </span>
          </motion.h1>

          <motion.div variants={itemVariants} className="flex flex-col items-center justify-center w-full sm:w-auto">
            {/* Único botón principal dorado */}
            <button
              onClick={() => navigate('/auth?plan=individual')}
              className="px-8 py-3.5 rounded-full bg-[#DEAE4D] text-[#2E3330] text-sm sm:text-base font-bold hover:bg-[#C99C44] hover:-translate-y-0.5 active:translate-y-0 transition-all shadow-[0_6px_18px_rgba(222,174,77,0.35)] w-full sm:w-auto cursor-pointer"
            >
              Comenzar prueba gratis
            </button>

            {/* Microlínea reductora de fricción */}
            <p className="text-xs sm:text-sm text-[#5F665E] font-medium mt-3 tracking-normal">
              Sin tarjeta de crédito · Cancela cuando quieras
            </p>

            {/* Iniciar sesión como enlace sutil */}
            <button
              onClick={() => navigate('/login')}
              className="mt-4 text-xs sm:text-sm font-semibold text-[#2E3330]/75 hover:text-[#2E3330] transition-colors inline-flex items-center gap-1.5 cursor-pointer hover:underline"
            >
              ¿Ya tienes una cuenta? Iniciar sesión
            </button>
          </motion.div>
        </motion.div>
      </div>

    </section>
  );
}
