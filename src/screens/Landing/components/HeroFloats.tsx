import { motion } from 'framer-motion';

export function HeroFloats() {
  return (
    <div className="absolute inset-0 pointer-events-none hidden lg:block z-0 overflow-hidden">
      
      {/* TARJETA 1 (Superior Derecha): Registro de Competencia real */}
      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="absolute top-[14%] right-[5%] w-72 p-4 bg-white/95 border border-[rgba(46,51,48,0.1)] rounded-2xl shadow-[0_12px_32px_rgba(46,51,48,0.06)] z-10"
      >
        <div className="flex items-center justify-between text-[11px] font-bold text-[#5F665E] uppercase tracking-wider mb-2">
          <span>Pensamiento Lógico · P1</span>
          <span className="text-[#2E3330] font-black">BC2</span>
        </div>
        <p className="text-xs font-bold text-[#2E3330] mb-3 leading-snug">
          Resolución de problemas contextualizados
        </p>
        <div className="space-y-1.5">
          <div className="flex justify-between text-[10px] text-[#5F665E] font-medium">
            <span>Logro del grupo</span>
            <span className="font-bold text-[#2E3330]">88%</span>
          </div>
          <div className="h-1.5 rounded-full bg-[#EAE4DA] overflow-hidden">
            <div className="h-full rounded-full bg-[#2E3330]" style={{ width: '88%' }} />
          </div>
        </div>
      </motion.div>

      {/* TARJETA 2 (Inferior Izquierda): Verificación de instrumento socioformativo */}
      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.15, ease: "easeOut" }}
        className="absolute bottom-[16%] left-[4%] w-76 p-4 bg-white/95 border border-[rgba(46,51,48,0.1)] rounded-2xl shadow-[0_12px_32px_rgba(46,51,48,0.06)] z-10"
      >
        <div className="flex items-center justify-between text-[11px] font-bold text-[#5F665E] uppercase tracking-wider mb-2">
          <span>Lista de Cotejo Oficial</span>
          <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded text-[10px] font-bold">Activa</span>
        </div>
        <div className="space-y-2 mt-3">
          <div className="flex items-center justify-between p-2 rounded-lg bg-[#FAF7F2] border border-[rgba(46,51,48,0.05)] text-xs">
            <span className="font-medium text-[#2E3330]">1. Argumenta hipótesis</span>
            <span className="text-emerald-700 font-bold">✓ Logrado</span>
          </div>
          <div className="flex items-center justify-between p-2 rounded-lg bg-[#FAF7F2] border border-[rgba(46,51,48,0.05)] text-xs">
            <span className="font-medium text-[#2E3330]">2. Contrasta evidencias</span>
            <span className="text-emerald-700 font-bold">✓ Logrado</span>
          </div>
        </div>
      </motion.div>

      {/* TARJETA 3 (Lateral Derecha Centro): Acta y recuperación pedagógica */}
      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.3, ease: "easeOut" }}
        className="absolute top-[52%] right-[3%] w-68 p-4 bg-white/95 border border-[rgba(46,51,48,0.1)] rounded-2xl shadow-[0_12px_32px_rgba(46,51,48,0.06)] z-10"
      >
        <div className="flex items-center gap-2 text-xs font-bold text-[#2E3330] mb-2">
          <div className="w-2 h-2 rounded-full bg-[#DEAE4D]" />
          <span>Seguimiento Pedagógico</span>
        </div>
        <p className="text-xs text-[#5F665E] mb-3 leading-relaxed">
          Acta de recuperación lista para imprimir con formato oficial de registro.
        </p>
        <div className="flex items-center justify-between text-[11px] pt-2 border-t border-[rgba(46,51,48,0.08)]">
          <span className="font-mono text-[#5F665E]">P1 · 3 estudiantes</span>
          <span className="font-bold text-[#2E3330]">Descargar .docx</span>
        </div>
      </motion.div>

    </div>
  );
}
