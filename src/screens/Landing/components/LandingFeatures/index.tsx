import { motion } from 'framer-motion';

export function LandingFeatures() {
  const textAnimation = {
    initial: { opacity: 0, y: 40 },
    whileInView: { 
      opacity: 1, 
      y: 0, 
      transition: { duration: 0.8 } 
    }
  };

  const graphicAnimation = {
    initial: { opacity: 0, scale: 0.95, y: 20 },
    whileInView: { 
      opacity: 1, 
      scale: 1, 
      y: 0, 
      transition: { duration: 0.8, delay: 0.2 } 
    }
  };

  return (
    <div className="bg-[#F8F3ED] overflow-hidden">
      
      {/* SECCIÓN: EVALUAR */}
      <section className="min-h-screen py-24 flex items-center relative">
        <div className="absolute top-0 right-0 w-150 h-150 bg-[#dce8d1] rounded-full blur-[150px] opacity-40 -z-10" />
        <div className="max-w-7xl mx-auto px-6 w-full flex flex-col md:flex-row items-center gap-16 md:gap-24">
          <motion.div 
            className="flex-1 max-w-xl"
            initial={textAnimation.initial} whileInView={textAnimation.whileInView} viewport={{ once: true, margin: "-20%" }}
          >
            <div className="inline-flex items-center gap-2 bg-[#EAE4DA]/50 px-4 py-2 rounded-full border border-black/5 mb-6">
              <span className="w-2 h-2 rounded-full bg-[#BFC9A6]" />
              <span className="text-xs font-bold text-[#5F665E] uppercase tracking-widest">Evaluar</span>
            </div>
            <h2 className="text-4xl md:text-6xl font-black text-[#2E3330] tracking-tighter leading-[1.1] mb-6">
              El fin de las <br/><span className="text-[#7A8D69] italic font-serif font-light">hojas de cálculo.</span>
            </h2>
            <p className="text-lg text-[#4c5450] font-medium leading-relaxed">
              Diseña rúbricas con un par de clics, registra incidencias en tiempo real y evalúa evidencias sin salir del flujo de trabajo. Las decisiones se toman una sola vez; CIELO se encarga de que todo cuadre.
            </p>
          </motion.div>

          <motion.div 
            className="flex-1 relative w-full aspect-square max-w-lg mx-auto"
            initial={graphicAnimation.initial} whileInView={graphicAnimation.whileInView} viewport={{ once: true, margin: "-20%" }}
          >
            {/* Visual Abstract UI */}
            <div className="absolute inset-0 bg-white/40 border border-white/60 rounded-3xl backdrop-blur-xl shadow-[0_32px_80px_rgba(46,51,48,0.06)] p-8 flex flex-col justify-end group">
               <div className="absolute -top-6 -right-6 w-48 h-32 bg-white/80 border border-white rounded-2xl shadow-xl backdrop-blur-md p-4 group-hover:-translate-y-2 group-hover:rotate-3 transition-transform duration-500">
                  <div className="h-2 w-1/3 bg-[#BFC9A6] rounded mb-3" />
                  <div className="grid grid-cols-4 gap-2 mt-4">
                    <div className="h-8 bg-[#EAE4DA] rounded" />
                    <div className="h-8 bg-[#BFC9A6] rounded" />
                    <div className="h-8 bg-[#7A8D69] rounded" />
                    <div className="h-8 bg-[#2E3330] rounded" />
                  </div>
               </div>
               <div className="flex gap-2 items-end h-32 opacity-90">
                 <div className="w-1/5 bg-[#EAE4DA] rounded-t-lg h-[40%]" />
                 <div className="w-1/5 bg-[#BFC9A6] rounded-t-lg h-[70%]" />
                 <div className="w-1/5 bg-[#7A8D69] rounded-t-lg h-full" />
                 <div className="w-1/5 bg-[#6D8FB9] rounded-t-lg h-[60%]" />
                 <div className="w-1/5 bg-[#EB8847] rounded-t-lg h-[80%]" />
               </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* SECCIÓN: PLANIFICAR */}
      <section className="min-h-screen py-24 flex items-center relative">
        <div className="absolute bottom-0 left-0 w-125 h-125 bg-[#f1d8c5] rounded-full blur-[150px] opacity-30 -z-10" />
        <div className="max-w-7xl mx-auto px-6 w-full flex flex-col md:flex-row-reverse items-center gap-16 md:gap-24">
          <motion.div 
            className="flex-1 max-w-xl"
            initial={textAnimation.initial} whileInView={textAnimation.whileInView} viewport={{ once: true, margin: "-20%" }}
          >
            <div className="inline-flex items-center gap-2 bg-[#EAE4DA]/50 px-4 py-2 rounded-full border border-black/5 mb-6">
              <span className="w-2 h-2 rounded-full bg-[#EB8847]" />
              <span className="text-xs font-bold text-[#5F665E] uppercase tracking-widest">Planificar</span>
            </div>
            <h2 className="text-4xl md:text-6xl font-black text-[#2E3330] tracking-tighter leading-[1.1] mb-6">
              Dimensiones siempre <span className="text-[#EB8847] italic font-serif font-light">a la vista.</span>
            </h2>
            <p className="text-lg text-[#4c5450] font-medium leading-relaxed">
              Planifica secuencias de aprendizaje ancladas a las competencias. CIELO conecta lo que enseñas con lo que evalúas de forma invisible, asegurando que tu programa educativo tenga sentido de principio a fin.
            </p>
          </motion.div>

          <motion.div 
            className="flex-1 relative w-full aspect-square max-w-lg mx-auto"
            initial={graphicAnimation.initial} whileInView={graphicAnimation.whileInView} viewport={{ once: true, margin: "-20%" }}
          >
             <div className="absolute inset-0 bg-white/40 border border-white/60 rounded-3xl backdrop-blur-xl shadow-[0_32px_80px_rgba(46,51,48,0.06)] p-8 flex flex-col gap-4 group">
               <div className="w-full bg-white/80 border border-white/60 rounded-2xl p-5 shadow-sm group-hover:scale-105 transition-transform duration-500 origin-left">
                  <div className="flex justify-between items-center mb-3">
                    <div className="h-3 w-1/4 bg-[#EB8847] rounded" />
                    <div className="h-3 w-8 bg-[#EAE4DA] rounded" />
                  </div>
                  <div className="h-2 w-3/4 bg-[#EAE4DA] rounded mb-2" />
                  <div className="h-2 w-1/2 bg-[#EAE4DA] rounded" />
               </div>
               <div className="w-full bg-white/50 border border-white/40 rounded-2xl p-5 group-hover:translate-x-4 transition-transform duration-500 delay-75">
                  <div className="h-3 w-1/3 bg-[#6D8FB9] rounded mb-3" />
                  <div className="h-2 w-4/5 bg-[#EAE4DA] rounded mb-2" />
               </div>
               <div className="w-full bg-white/30 border border-white/20 rounded-2xl p-5 group-hover:translate-x-8 transition-transform duration-500 delay-150">
                  <div className="h-3 w-1/5 bg-[#7A8D69] rounded" />
               </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* SECCIÓN: ANALIZAR */}
      <section className="min-h-[80vh] py-24 flex items-center relative overflow-visible">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-175 h-175 bg-[#6D8FB9] rounded-full blur-[200px] opacity-15 -z-10" />
        <div className="max-w-5xl mx-auto px-6 w-full text-center">
          <motion.div 
            initial={textAnimation.initial} whileInView={textAnimation.whileInView} viewport={{ once: true, margin: "-20%" }}
          >
            <div className="inline-flex items-center gap-2 bg-[#EAE4DA]/50 px-4 py-2 rounded-full border border-black/5 mb-6">
              <span className="w-2 h-2 rounded-full bg-[#6D8FB9]" />
              <span className="text-xs font-bold text-[#5F665E] uppercase tracking-widest">Analizar</span>
            </div>
            <h2 className="text-4xl md:text-6xl font-black text-[#2E3330] tracking-tighter leading-[1.1] mb-6">
              De los datos a la <span className="text-[#6D8FB9] italic font-serif font-light">acción.</span>
            </h2>
            <p className="text-lg text-[#4c5450] font-medium leading-relaxed max-w-2xl mx-auto mb-16">
              Descubre patrones en el desempeño de tus clases. CIELO compila boletines automáticos e informes precisos para que la información esté lista exactamente cuando necesitas compartirla.
            </p>
          </motion.div>

          <div className="relative w-full max-w-5xl mx-auto mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
             {/* Gráfico 1: Evolución BC1-BC7 */}
             <motion.div 
               initial={{ opacity: 0, y: 30 }}
               whileInView={{ opacity: 1, y: 0 }}
               viewport={{ once: true, margin: "-100px" }}
               transition={{ duration: 0.6 }}
               className="md:col-span-2 bg-white/60 border border-white/80 rounded-3xl p-6 md:p-8 backdrop-blur-xl shadow-[0_16px_40px_rgba(46,51,48,0.05)] text-left flex flex-col"
             >
                <div className="mb-8 flex justify-between items-start">
                   <div>
                     <h4 className="text-xs font-bold text-[#5F665E] uppercase tracking-widest mb-1">Evolución de Aprendizaje</h4>
                     <p className="text-2xl md:text-3xl font-black text-[#2E3330] tracking-tighter">Boletines BC1 – BC7</p>
                   </div>
                   <motion.div 
                      initial={{ scale: 0.8, opacity: 0 }}
                      whileInView={{ scale: 1, opacity: 1 }}
                      transition={{ delay: 1, type: 'spring' }}
                      className="bg-[#EAE4DA] text-[#1d4431] px-3 py-1.5 rounded-lg text-xs font-bold border border-[#BFC9A6]"
                   >
                     +12% Progreso
                   </motion.div>
                </div>
                
                <div className="flex-1 h-48 flex items-end gap-2 md:gap-4 relative border-b border-black/5 pb-2">
                   <div className="absolute left-0 top-0 bottom-0 w-6 flex flex-col justify-between text-[10px] font-bold text-black/20 pb-2">
                     <span>10</span><span>8</span><span>6</span><span>4</span><span>2</span>
                   </div>
                   <div className="w-4 md:w-6" /> {/* spacer for y-axis */}
                   
                   {[
                     { label: 'BC1', val: 45, color: '#EAE4DA' },
                     { label: 'BC2', val: 52, color: '#EAE4DA' },
                     { label: 'BC3', val: 58, color: '#BFC9A6' },
                     { label: 'BC4', val: 65, color: '#BFC9A6' },
                     { label: 'BC5', val: 78, color: '#7A8D69' },
                     { label: 'BC6', val: 86, color: '#7A8D69' },
                     { label: 'BC7', val: 94, color: '#6D8FB9' },
                   ].map((bar, i) => (
                     <div key={bar.label} className="flex-1 flex flex-col items-center gap-2 relative group h-full justify-end">
                        <motion.div 
                          className="w-full rounded-t-lg relative cursor-pointer transition-colors duration-300 group-hover:brightness-95 flex justify-center"
                          style={{ backgroundColor: bar.color }}
                          initial={{ height: 0 }}
                          whileInView={{ height: `${bar.val}%` }}
                          viewport={{ once: true }}
                          transition={{ duration: 0.8, delay: 0.3 + (i * 0.1), type: 'spring', bounce: 0.2 }}
                        >
                          <div className="absolute -top-8 bg-white shadow-md border border-black/5 px-2 py-1 rounded text-[11px] font-bold text-[#1d4431] opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                            {(bar.val / 10).toFixed(1)}
                          </div>
                        </motion.div>
                        <span className="text-[10px] font-bold text-[#5F665E]">{bar.label}</span>
                     </div>
                   ))}
                </div>
             </motion.div>

             {/* Gráfico 2: Desempeño por competencias */}
             <motion.div 
               initial={{ opacity: 0, y: 30 }}
               whileInView={{ opacity: 1, y: 0 }}
               viewport={{ once: true, margin: "-100px" }}
               transition={{ duration: 0.6, delay: 0.2 }}
               className="bg-white/60 border border-white/80 rounded-3xl p-6 md:p-8 backdrop-blur-xl shadow-[0_16px_40px_rgba(46,51,48,0.05)] text-left flex flex-col"
             >
                <div className="mb-8">
                   <h4 className="text-xs font-bold text-[#5F665E] uppercase tracking-widest mb-1">Competencias</h4>
                   <p className="text-xl md:text-2xl font-black text-[#2E3330] tracking-tighter">Niveles de Logro</p>
                </div>
                
                <div className="flex-1 flex flex-col justify-center gap-6">
                   {[
                     { label: 'C. Comunicativa', val: 85, color: '#7A8D69' },
                     { label: 'C. Pensamiento L.', val: 65, color: '#EB8847' },
                     { label: 'C. Científica', val: 78, color: '#6D8FB9' },
                     { label: 'C. Ética y Ciud.', val: 90, color: '#BFC9A6' },
                   ].map((comp, i) => (
                     <div key={comp.label}>
                       <div className="flex justify-between text-xs font-bold mb-2">
                         <span className="text-[#2E3330]">{comp.label}</span>
                         <motion.span 
                            initial={{ opacity: 0 }}
                            whileInView={{ opacity: 1 }}
                            viewport={{ once: true }}
                            transition={{ delay: 0.9 + (i * 0.15) }}
                            className="text-[#1d4431]"
                         >
                            {comp.val}%
                         </motion.span>
                       </div>
                       <div className="h-2.5 w-full bg-black/5 rounded-full overflow-hidden">
                          <motion.div 
                            className="h-full rounded-full"
                            style={{ backgroundColor: comp.color }}
                            initial={{ width: 0 }}
                            whileInView={{ width: `${comp.val}%` }}
                            viewport={{ once: true }}
                            transition={{ duration: 1, delay: 0.5 + (i * 0.15), ease: "easeOut" }}
                          />
                       </div>
                     </div>
                   ))}
                </div>
             </motion.div>
          </div>
        </div>
      </section>

    </div>
  );
}
