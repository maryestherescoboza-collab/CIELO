import { motion } from 'framer-motion';
import { HeroFloats } from './HeroFloats';

export function LandingHero() {
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
    <section className="relative pt-32 pb-20 md:pt-48 md:pb-32 overflow-hidden flex flex-col items-center justify-center min-h-[95vh] bg-[#F8F3ED]">
      {/* Background ambient glow / Orbs */}
      <div className="absolute w-150 h-150 bg-[#EAE4DA] -top-20 -right-12 rounded-full blur-[120px] opacity-70 pointer-events-none -z-10" />
      <div className="absolute w-125 h-125 bg-[#BFC9A6] bottom-8 left-[25%] rounded-full blur-[140px] opacity-20 pointer-events-none -z-10" />

      {/* Hero Grid Canvas style */}
      <div className="absolute inset-0 opacity-30 pointer-events-none -z-20 mask-[linear-gradient(to_bottom,black,transparent_90%)]" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(46,51,48,0.3) 1px, transparent 0)', backgroundSize: '32px 32px' }} />

      {/* Floating UI Cards */}
      <HeroFloats />

      <div className="max-w-7xl mx-auto px-6 text-center z-10 w-full relative">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="max-w-4xl mx-auto"
        >
          <motion.div variants={itemVariants} className="mb-6 flex justify-center">
            <div className="inline-flex items-center gap-2 bg-[#EAE4DA]/50 px-5 py-2.5 rounded-full border border-black/5 shadow-sm backdrop-blur-md">
              <span className="w-2 h-2 rounded-full bg-[#EB8847] animate-pulse" />
              <span className="text-xs font-bold text-[#5F665E] uppercase tracking-widest">
                Acceso prioritario para evaluar en fase beta
              </span>
            </div>
          </motion.div>

          <motion.h1
            variants={itemVariants}
            className="text-5xl sm:text-6xl md:text-7xl lg:text-[5.5rem] font-black text-[#2E3330] tracking-tighter leading-[1.05] mb-6 md:mb-8"
          >
            Donde la evaluación se vuelve <span className="text-[#7A8D69] italic font-serif font-light">significativa.</span>
          </motion.h1>

          <motion.p
            variants={itemVariants}
            className="text-[#4c5450] font-medium text-lg md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed"
          >
            La evaluación por competencias ya forma parte del modelo educativo, pero muchos docentes aún carecen de las herramientas necesarias para aplicarla correctamente. CIELO nació para cerrar esa brecha.
          </motion.p>

          <motion.div variants={itemVariants} className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={() => document.getElementById('descubrir')?.scrollIntoView({ behavior: 'smooth' })}
              className="px-8 py-4 rounded-full bg-[#BFC9A6] text-[#1d4431] text-sm font-black uppercase tracking-widest hover:bg-[#A9B492] hover:-translate-y-1 transition-all shadow-[0_12px_28px_rgba(191,201,166,0.4)] w-full sm:w-auto"
            >
              Comenzar a explorar
            </button>
            <button
              onClick={() => document.getElementById('planes')?.scrollIntoView({ behavior: 'smooth' })}
              className="px-8 py-4 rounded-full bg-white/80 backdrop-blur-md text-[#1d4431] text-sm font-black uppercase tracking-widest border border-[#BFC9A6]/50 hover:bg-white hover:-translate-y-1 transition-all shadow-lg w-full sm:w-auto"
            >
              Ver Planes
            </button>
          </motion.div>
        </motion.div>
      </div>

    </section>
  );
}
