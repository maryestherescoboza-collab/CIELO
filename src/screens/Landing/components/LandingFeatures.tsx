import { motion } from 'framer-motion';
import { BookOpen, Users, ShieldAlert, BarChart3, BrainCircuit } from 'lucide-react';

export function LandingFeatures() {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1, delayChildren: 0.2 },
    },
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1, transition: { type: 'spring' as const, stiffness: 100 } },
  };

  return (
    <section className="py-24 bg-white relative">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16 max-w-3xl mx-auto">
          <h2 className="text-3xl md:text-5xl font-black text-[#2E3330] tracking-tighter mb-6">
            Todo lo que necesitas en un solo ecosistema.
          </h2>
          <p className="text-slate-500 font-medium text-lg leading-relaxed">
            Diseñamos módulos hiperespecializados que se comunican entre sí para reducir la carga administrativa y maximizar el tiempo de enseñanza real.
          </p>
        </div>

        <motion.div 
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6"
        >
          {/* Bento Box 1: Large */}
          <motion.div variants={itemVariants} className="md:col-span-2 bg-[#FDFBF7] rounded-[32px] p-8 md:p-12 border border-[rgba(46,51,48,0.08)] relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-64 h-64 bg-[#86A792]/10 rounded-full blur-[80px] -z-10 group-hover:bg-[#86A792]/20 transition-colors duration-700" />
            <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center shadow-sm border border-slate-100 mb-8 text-[#7A8D69]">
              <BrainCircuit size={28} />
            </div>
            <h3 className="text-2xl font-black text-[#2E3330] mb-4">Evaluación por Competencias Pura</h3>
            <p className="text-slate-500 font-medium leading-relaxed max-w-md">
              Olvida las notas tradicionales. Evalúa utilizando rúbricas estandarizadas, listas de cotejo y descriptores alineados al currículo nacional, con cálculos automáticos que alimentan el boletín en tiempo real.
            </p>
          </motion.div>

          {/* Bento Box 2: Tall */}
          <motion.div variants={itemVariants} className="bg-[#2E3330] rounded-[32px] p-8 md:p-12 border border-slate-800 relative overflow-hidden group">
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-[#E88C6B]/20 rounded-full blur-[60px] -z-10 group-hover:scale-150 transition-transform duration-700" />
            <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center border border-white/5 mb-8 text-[#E88C6B]">
              <ShieldAlert size={28} />
            </div>
            <h3 className="text-2xl font-black text-white mb-4">Registro Anecdótico</h3>
            <p className="text-slate-400 font-medium leading-relaxed">
              Documenta incidencias, acuerdos y medidas pedagógicas en segundos. Un historial blindado del comportamiento escolar.
            </p>
          </motion.div>

          {/* Bento Box 3: Standard */}
          <motion.div variants={itemVariants} className="bg-white rounded-[32px] p-8 border border-[rgba(46,51,48,0.08)] shadow-[0_8px_30px_rgb(0,0,0,0.04)] group hover:-translate-y-1 transition-transform duration-500">
            <div className="w-12 h-12 bg-[#FDFBF7] rounded-2xl flex items-center justify-center border border-slate-100 mb-6 text-[#2E3330]">
              <Users size={24} />
            </div>
            <h3 className="text-xl font-black text-[#2E3330] mb-3">Comunidad Escolar</h3>
            <p className="text-slate-500 text-sm font-medium leading-relaxed">
              Muro interactivo, anuncios y publicaciones con la estética visual más limpia del mercado.
            </p>
          </motion.div>

          {/* Bento Box 4: Standard */}
          <motion.div variants={itemVariants} className="bg-white rounded-[32px] p-8 border border-[rgba(46,51,48,0.08)] shadow-[0_8px_30px_rgb(0,0,0,0.04)] group hover:-translate-y-1 transition-transform duration-500">
            <div className="w-12 h-12 bg-[#FDFBF7] rounded-2xl flex items-center justify-center border border-slate-100 mb-6 text-[#2E3330]">
              <BookOpen size={24} />
            </div>
            <h3 className="text-xl font-black text-[#2E3330] mb-3">Portafolio Docente</h3>
            <p className="text-slate-500 text-sm font-medium leading-relaxed">
              Centraliza tus planificaciones, secuencias didácticas y recursos en tu espacio personal seguro.
            </p>
          </motion.div>

          {/* Bento Box 5: Standard */}
          <motion.div variants={itemVariants} className="bg-white rounded-[32px] p-8 border border-[rgba(46,51,48,0.08)] shadow-[0_8px_30px_rgb(0,0,0,0.04)] group hover:-translate-y-1 transition-transform duration-500">
            <div className="w-12 h-12 bg-[#FDFBF7] rounded-2xl flex items-center justify-center border border-slate-100 mb-6 text-[#2E3330]">
              <BarChart3 size={24} />
            </div>
            <h3 className="text-xl font-black text-[#2E3330] mb-3">Boletines y Reportes</h3>
            <p className="text-slate-500 text-sm font-medium leading-relaxed">
              Genera boletines listos para imprimir con un clic, cruzando datos de PC, RC y promedios finales.
            </p>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
