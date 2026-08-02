import { motion } from 'framer-motion';
import { BookOpen, Users, ShieldAlert, BarChart3, BrainCircuit, FileCheck2 } from 'lucide-react';

import cursoDetalleImage from '../assets/features/curso-detalle.png';
import rubricaImage from '../assets/features/rubrica.png';
import incidenciasImage from '../assets/features/incidencias.png';
import comunidadImage from '../assets/features/comunidad.png';
import portafolioImage from '../assets/features/portafolio-docente.png';
import boletinesImage from '../assets/features/boletines.png';

const features = [
  {
    title: "Evaluación por Competencias",
    description: "Olvida las notas tradicionales. Evalúa utilizando rúbricas estandarizadas, listas de cotejo y descriptores alineados al currículo nacional, con cálculos automáticos que alimentan el boletín en tiempo real.",
    image: cursoDetalleImage,
    icon: BrainCircuit,
    colSpan: "md:col-span-2",
    theme: "bg-[#FDFBF7]",
    titleColor: "text-[#2E3330]",
    descColor: "text-slate-500",
    iconColor: "text-[#7A8D69]",
    glow: "bg-[#86A792]"
  },
  {
    title: "Registro Anecdótico",
    description: "Documenta incidencias, acuerdos y medidas pedagógicas en segundos. Un historial blindado del comportamiento escolar.",
    image: incidenciasImage,
    icon: ShieldAlert,
    colSpan: "md:col-span-1",
    theme: "bg-[#2E3330]",
    titleColor: "text-white",
    descColor: "text-slate-400",
    iconColor: "text-[#E88C6B]",
    glow: "bg-[#E88C6B]",
    dark: true
  },
  {
    title: "Rúbricas Inteligentes",
    description: "Diseña y aplica rúbricas de evaluación en tiempo real, adaptables a cualquier indicador y con retroalimentación inmediata.",
    image: rubricaImage,
    icon: FileCheck2,
    colSpan: "md:col-span-1",
    theme: "bg-white",
    titleColor: "text-[#2E3330]",
    descColor: "text-slate-500",
    iconColor: "text-[#2E3330]"
  },
  {
    title: "Comunidad Escolar",
    description: "Muro interactivo, anuncios y publicaciones con la estética visual más limpia del mercado.",
    image: comunidadImage,
    icon: Users,
    colSpan: "md:col-span-2",
    theme: "bg-white",
    titleColor: "text-[#2E3330]",
    descColor: "text-slate-500",
    iconColor: "text-[#2E3330]"
  },
  {
    title: "Portafolio Docente",
    description: "Centraliza tus planificaciones, secuencias didácticas y recursos en tu espacio personal seguro.",
    image: portafolioImage,
    icon: BookOpen,
    colSpan: "md:col-span-2",
    theme: "bg-[#FDFBF7]",
    titleColor: "text-[#2E3330]",
    descColor: "text-slate-500",
    iconColor: "text-[#2E3330]",
    glow: "bg-[#7A8D69]"
  },
  {
    title: "Boletines y Reportes",
    description: "Genera boletines listos para imprimir con un clic, cruzando datos de PC, RC y promedios finales.",
    image: boletinesImage,
    icon: BarChart3,
    colSpan: "md:col-span-1",
    theme: "bg-white",
    titleColor: "text-[#2E3330]",
    descColor: "text-slate-500",
    iconColor: "text-[#2E3330]"
  }
];

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
          {features.map((feature, idx) => (
            <motion.div 
              key={idx}
              variants={itemVariants} 
              className={`${feature.colSpan} ${feature.theme} rounded-[32px] p-8 md:p-10 border ${feature.dark ? 'border-slate-800' : 'border-[rgba(46,51,48,0.08)]'} relative overflow-hidden group hover:-translate-y-1 shadow-[0_8px_30px_rgb(0,0,0,0.04)] transition-all duration-500 flex flex-col`}
            >
              {feature.glow && (
                <div className={`absolute ${feature.dark ? 'bottom-0 left-0 w-48 h-48' : 'top-0 right-0 w-64 h-64'} ${feature.glow}/10 rounded-full blur-[80px] -z-10 group-hover:${feature.glow}/20 group-hover:scale-110 transition-all duration-700`} />
              )}
              
              <div className="flex flex-col flex-1 z-10 h-full">
                <div className={`w-12 h-12 ${feature.dark ? 'bg-white/10 border-white/5' : 'bg-white border-slate-100 shadow-sm'} rounded-2xl flex items-center justify-center border mb-6 ${feature.iconColor}`}>
                  <feature.icon size={24} />
                </div>
                
                <h3 className={`text-2xl font-black ${feature.titleColor} mb-3`}>{feature.title}</h3>
                
                <p className={`${feature.descColor} font-medium leading-relaxed mb-8 max-w-lg flex-1`}>
                  {feature.description}
                </p>

                {/* Contenedor de la captura PNG */}
                <div className="mt-auto w-full bg-slate-100 rounded-2xl overflow-hidden border border-black/5 shadow-inner relative aspect-[16/9] group-hover:shadow-lg transition-all duration-700">
                  <div className="absolute inset-0 bg-gradient-to-t from-black/5 to-transparent z-10 pointer-events-none" />
                  <img
                    src={feature.image}
                    alt={feature.title}
                    className="w-full h-full object-cover object-top transition-transform duration-700 group-hover:scale-[1.03]"
                  />
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
