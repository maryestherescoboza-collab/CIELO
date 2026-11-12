import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

export function LandingCTA() {
  const navigate = useNavigate();

  return (
    <section className="relative py-28 md:py-36 overflow-hidden bg-[#249B7E] text-white">
      {/* Fondo vectorial astronómico/orbital estilizado (inspirado en la referencia) */}
      <div className="absolute inset-0 pointer-events-none opacity-40 overflow-hidden select-none">
        {/* Curvas topográficas de fondo */}
        <svg 
          viewBox="0 0 1440 600" 
          className="absolute inset-0 w-full h-full object-cover" 
          preserveAspectRatio="none"
          fill="none"
        >
          <path 
            d="M-100,500 C300,550 500,200 900,320 C1200,400 1350,150 1600,100 L1600,600 L-100,600 Z" 
            fill="#1F8B70" 
            opacity="0.5" 
          />
          <path 
            d="M-50,200 C200,80 600,350 1000,180 C1300,50 1450,250 1600,300 L1600,600 L-50,600 Z" 
            fill="#2CB291" 
            opacity="0.3" 
          />
        </svg>

        {/* Órbitas elípticas concéntricas */}
        <svg 
          viewBox="0 0 1000 600" 
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[160%] sm:w-[120%] md:w-full h-full"
          fill="none" 
          stroke="rgba(255, 255, 255, 0.28)" 
          strokeWidth="1.5"
        >
          {/* Planeta/Núcleo central sutil */}
          <circle cx="500" cy="300" r="160" fill="rgba(255, 255, 255, 0.05)" stroke="none" />
          
          {/* Elipse 1 (inclinada) */}
          <ellipse 
            cx="500" 
            cy="300" 
            rx="460" 
            ry="190" 
            transform="rotate(-15 500 300)" 
          />
          {/* Pequeños planetas/nodos en la órbita 1 */}
          <circle cx="210" cy="220" r="18" fill="#1F8B70" stroke="rgba(255, 255, 255, 0.4)" strokeWidth="1.5" />
          <circle cx="760" cy="390" r="24" fill="#2CB291" stroke="rgba(255, 255, 255, 0.35)" strokeWidth="1.5" />
          <circle cx="890" cy="280" r="12" fill="#1F8B70" stroke="rgba(255, 255, 255, 0.4)" strokeWidth="1.5" />

          {/* Elipse 2 (inclinada contra-ángulo) */}
          <ellipse 
            cx="500" 
            cy="300" 
            rx="420" 
            ry="140" 
            transform="rotate(25 500 300)" 
            stroke="rgba(255, 255, 255, 0.18)" 
            strokeDasharray="6 6"
          />
          <circle cx="680" cy="180" r="10" fill="#2CB291" stroke="rgba(255, 255, 255, 0.4)" strokeWidth="1" />
          <circle cx="340" cy="440" r="14" fill="#1F8B70" stroke="rgba(255, 255, 255, 0.3)" strokeWidth="1.5" />

          {/* Puntos / estrellas flotantes discretas */}
          <circle cx="150" cy="120" r="4" fill="rgba(255, 255, 255, 0.25)" />
          <circle cx="870" cy="110" r="5" fill="rgba(255, 255, 255, 0.2)" />
          <circle cx="820" cy="490" r="4" fill="rgba(255, 255, 255, 0.25)" />
          <circle cx="120" cy="460" r="6" fill="rgba(255, 255, 255, 0.2)" />
        </svg>
      </div>

      <div className="max-w-4xl mx-auto px-6 text-center relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-[44px] font-extrabold text-white tracking-tight leading-[1.2] mb-6 max-w-3xl mx-auto">
            Simplifica la corrección para una enseñanza basada en competencias en tu centro.
          </h2>

          <p className="text-base sm:text-lg text-emerald-50/90 max-w-2xl mx-auto leading-relaxed mb-9 font-medium">
            Únete a docentes e instituciones educativas que evalúan con orden, transparencia y total alineación curricular.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button 
              onClick={() => navigate('/auth?plan=individual')}
              className="px-8 py-3.5 rounded-full bg-white text-[#1B6D57] text-sm sm:text-base font-extrabold hover:bg-emerald-50 hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 transition-all cursor-pointer shadow-md"
            >
              Comenzar prueba gratis
            </button>
            <button 
              onClick={() => {
                document.getElementById('planes')?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="px-7 py-3 rounded-full border border-white/60 text-white text-sm sm:text-base font-bold hover:bg-white/10 hover:border-white transition-all cursor-pointer"
            >
              Ver planes y precios
            </button>
          </div>

          <p className="text-xs text-emerald-100/75 font-medium mt-5">
            Sin tarjeta de crédito · 15 días de prueba completa
          </p>
        </motion.div>
      </div>
    </section>
  );
}
