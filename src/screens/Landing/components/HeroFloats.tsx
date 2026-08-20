import { motion } from 'framer-motion';

export function HeroFloats() {
  return (
    <div className="absolute inset-0 pointer-events-none hidden md:block z-0 overflow-hidden perspective-[1000px]">
      
      {/* BACKGROUND LAYER (Blurred, smaller) */}
      <motion.div 
        animate={{ y: [0, -10, 0], rotate: [-2, -1, -2] }}
        transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-[20%] left-[10%] w-45 p-2 bg-white/40 shadow-sm backdrop-blur-sm rounded-xl opacity-40 blur-[2px] -z-10"
      >
        <div className="rounded-lg bg-[#EAE4DA]/50 p-3">
          <div className="h-2 w-1/2 bg-[#BFC9A6] rounded mb-2" />
          <div className="h-1.5 w-full bg-[#EAE4DA] rounded mb-1" />
          <div className="h-1.5 w-4/5 bg-[#EAE4DA] rounded" />
        </div>
      </motion.div>

      <motion.div 
        animate={{ y: [0, 15, 0], rotate: [3, 4, 3] }}
        transition={{ duration: 11, delay: 1, repeat: Infinity, ease: "easeInOut" }}
        className="absolute bottom-[25%] right-[15%] w-37.5 p-2 bg-white/40 shadow-sm backdrop-blur-sm rounded-xl opacity-40 blur-[3px] -z-10"
      >
        <div className="rounded-lg bg-[#EAE4DA]/50 p-3 flex gap-1">
           <div className="w-full h-8 bg-[#6D8FB9]/30 rounded-sm" />
           <div className="w-full h-8 bg-[#EB8847]/30 rounded-sm" />
        </div>
      </motion.div>

      {/* MID LAYER (Sharper, larger) */}
      <motion.div 
        animate={{ y: [0, -15, 0], x: [0, 5, 0], rotate: [6, 7, 6] }}
        transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-[12%] right-[7%] w-67.5 p-3 border border-white/80 bg-white/70 shadow-[0_24px_60px_rgba(33,65,42,0.12)] backdrop-blur-md rounded-2xl opacity-90 z-10"
      >
        <div className="rounded-xl overflow-hidden bg-[#FDFBF7] p-4">
          <div className="flex justify-between text-[10px] uppercase tracking-widest text-[#7A8D69]">
            <span>BC2 · Ciencias</span>
            <span className="font-bold">92%</span>
          </div>
          <div className="mt-4 h-1.75 rounded-full bg-[#EAE4DA] overflow-hidden">
            <div className="h-full rounded-full bg-[#BFC9A6]" style={{ width: '92%' }} />
          </div>
          <div className="mt-4 flex gap-2">
            <span className="w-7 h-7 rounded-full bg-[#BFC9A6]" />
            <span className="w-7 h-7 rounded-full bg-[#F5BC5D]" />
            <span className="w-7 h-7 rounded-full bg-[#7A8D69]" />
          </div>
        </div>
      </motion.div>

      <motion.div 
        animate={{ y: [0, -18, 0], x: [0, -5, 0], rotate: [5, 4, 5] }}
        transition={{ duration: 8, delay: 2, repeat: Infinity, ease: "easeInOut" }}
        className="absolute bottom-[15%] left-[8%] w-60 p-3 border border-white/80 bg-white/70 shadow-[0_24px_60px_rgba(33,65,42,0.12)] backdrop-blur-md rounded-2xl opacity-85 z-10"
      >
        <div className="rounded-xl overflow-hidden bg-[#FDFBF7] p-4">
          <div className="text-[10px] tracking-widest uppercase text-[#7A8D69] font-bold">
            Rúbrica · Ensayo final
          </div>
          <div className="grid grid-cols-4 gap-1.5 mt-4">
            <div className="h-8 bg-[#EAE4DA] rounded" />
            <div className="h-8 bg-[#BFC9A6] rounded" />
            <div className="h-8 bg-[#7A8D69] rounded" />
            <div className="h-8 bg-[#2E3330] rounded" />
          </div>
        </div>
      </motion.div>

      {/* FOREGROUND LAYER (Largest, fastest moving, overlapping) */}
      <motion.div 
        animate={{ y: [0, -25, 0], rotate: [-4, -2, -4] }}
        transition={{ duration: 6, delay: 1, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-[45%] right-[2%] w-55 p-3 border border-white/90 bg-white/90 shadow-[0_32px_80px_rgba(33,65,42,0.15)] backdrop-blur-lg rounded-2xl opacity-100 z-20 scale-110"
      >
        <div className="rounded-xl overflow-hidden bg-[#FDFBF7] p-4">
          <div className="flex items-center gap-2 text-xs font-bold text-[#2E3330]">
            <span className="w-2.5 h-2.5 rounded-full bg-[#EB8847] shadow-[0_0_0_4px_rgba(235,136,71,0.15)] animate-pulse" />
            Alerta de progreso
          </div>
          <div className="mt-5 flex gap-1.5 items-end h-12">
            <div className="w-4 h-5 bg-[#EAE4DA] rounded-t-sm" />
            <div className="w-4 h-9 bg-[#BFC9A6] rounded-t-sm" />
            <div className="w-4 h-7 bg-[#7A8D69] rounded-t-sm" />
            <div className="w-4 h-11 bg-[#2E3330] rounded-t-sm" />
          </div>
        </div>
      </motion.div>

      <motion.div 
        animate={{ y: [0, 20, 0], x: [0, 10, 0], rotate: [-10, -8, -10] }}
        transition={{ duration: 8.5, delay: 0.5, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-[60%] left-[2%] w-40 p-2 border border-white/90 bg-white/90 shadow-[0_32px_80px_rgba(33,65,42,0.15)] backdrop-blur-lg rounded-2xl opacity-100 z-30 scale-125"
      >
        <div className="rounded-lg bg-[#FDFBF7] p-3 flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-[#6D8FB9] flex items-center justify-center text-white text-xs font-bold">CA</div>
          <div>
            <div className="h-2 w-16 bg-[#2E3330] rounded mb-1" />
            <div className="h-1.5 w-10 bg-[#7A8D69] rounded" />
          </div>
        </div>
      </motion.div>

    </div>
  );
}
