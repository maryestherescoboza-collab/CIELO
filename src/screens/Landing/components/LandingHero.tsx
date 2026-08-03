import { motion } from 'framer-motion';

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
    <section className="relative pt-32 pb-20 md:pt-48 md:pb-32 overflow-hidden flex flex-col items-center justify-center min-h-[90vh]">
      {/* Background ambient glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-150 h-150 bg-[#E88C6B]/10 rounded-full blur-[120px] pointer-events-none -z-10" />
      <div className="absolute top-0 right-0 w-100 h-100 bg-[#86A792]/10 rounded-full blur-[100px] pointer-events-none -z-10" />

      <div className="max-w-7xl mx-auto px-6 text-center z-10 w-full relative">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="max-w-4xl mx-auto"
        >
          <motion.div variants={itemVariants} className="mb-6 flex justify-center">
            <div className="inline-flex items-center gap-2 bg-[#EAE4DA]/50 px-4 py-2 rounded-full border border-[rgba(46,51,48,0.08)] backdrop-blur-md">
              <span className="w-2 h-2 rounded-full bg-[#7A8D69] animate-pulse" />
              <span className="text-[10px] font-black text-[#5F665E] uppercase tracking-widest">
                Si algo merece hacerse, merece hacerse bien
              </span>
            </div>
          </motion.div>

          <motion.h1
            variants={itemVariants}
            className="text-4xl sm:text-5xl md:text-7xl lg:text-[5rem] font-black text-[#2E3330] tracking-tighter leading-[1.1] mb-6 md:mb-8"
          >
            Evalua competencias para{' '}
            <span className="text-transparent bg-clip-text bg-linear-to-r from-[#7A8D69] to-[#6C7E5C]">
              instituciones de vanguardia.
            </span>
          </motion.h1>

          <motion.p
            variants={itemVariants}
            className="text-slate-500 font-medium text-lg md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed"
          >
            La evaluación por competencias ya forma parte del modelo educativo, pero muchos docentes aún carecen de las herramientas necesarias para aplicarla correctamente. CIELO nació para cerrar esa brecha.
          </motion.p>

          <motion.div variants={itemVariants} className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button className="px-8 py-4 rounded-full bg-[#2E3330] text-white text-sm font-black uppercase tracking-widest hover:bg-[#1a1c1a] hover:-translate-y-0.5 transition-all shadow-xl shadow-black/10 w-full sm:w-auto">
              Explorar Demostración
            </button>
            <button className="px-8 py-4 rounded-full bg-white text-[#2E3330] text-sm font-black uppercase tracking-widest border border-slate-200 hover:border-[#7A8D69] hover:bg-[#FDFBF7] hover:-translate-y-0.5 transition-all w-full sm:w-auto">
              Conocer Características
            </button>
          </motion.div>
        </motion.div>
      </div>

      {/* Grid Pattern Overlay */}
      <div
        className="absolute inset-0 pointer-events-none opacity-20 -z-20"
        style={{
          backgroundImage: `linear-gradient(rgba(46,51,48,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(46,51,48,0.1) 1px, transparent 1px)`,
          backgroundSize: '40px 40px'
        }}
      />
    </section>
  );
}
