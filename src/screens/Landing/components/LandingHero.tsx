import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { HeroCompetenciesArcade } from './HeroCompetenciesArcade';

interface LandingHeroProps {
  onExploreFunctions?: () => void;
}

export function LandingHero({ onExploreFunctions }: LandingHeroProps) {
  const navigate = useNavigate();
  // El mensaje principal permanece oculto hasta que concluya la animación original
  const [animationCompleted, setAnimationCompleted] = useState(false);

  const handleArcadeComplete = useCallback(() => {
    // Sincronización natural inmediata al término del recorrido de la animación
    setAnimationCompleted(true);
  }, []);

  return (
    <section className="relative flex min-h-[calc(100dvh-var(--landing-nav-h)-var(--landing-bottom-h))] w-full flex-col items-center justify-center overflow-hidden px-2 pb-2 pt-0.5 text-center sm:px-6 sm:pb-4 sm:pt-1">
      <div className="mx-auto flex w-full max-w-4xl flex-col items-center justify-center">
        {/* 1. Animación que inicia completamente centrada y se desplaza hacia arriba */}
        <div
          className={`w-full flex items-center justify-center transition-all duration-1000 ease-[cubic-bezier(0.16,1,0.3,1)] ${
            animationCompleted ? 'translate-y-0 scale-100' : 'translate-y-0 scale-105'
          }`}
        >
          <HeroCompetenciesArcade compact onComplete={handleArcadeComplete} />
        </div>

        {/* 2. Mensaje principal: aparece tras completarse la animación con transición fluida */}
        <div
          className={`w-full transition-all duration-1000 ease-[cubic-bezier(0.16,1,0.3,1)] ${
            animationCompleted
              ? 'opacity-100 translate-y-0 max-h-125 mt-1.5 sm:mt-4 md:mt-6 pointer-events-auto'
              : 'opacity-0 translate-y-8 max-h-0 overflow-hidden mt-0 pointer-events-none'
          }`}
        >
          <h1 className="font-cagliostro mx-auto mt-1 sm:mt-3 md:mt-5 max-w-4xl landing-hero-title font-normal text-[#2E3330] tracking-normal">
            Dedica tu tiempo a tus estudiantes.{' '}
            <span className="text-[#689C63]">
              CIELO se ocupa del proceso.
            </span>
          </h1>

          {/* 3. Acciones directas y sugerencia de navegación */}
          <div className="mt-2.5 sm:mt-5 md:mt-7 flex flex-wrap items-center justify-center gap-1.5 sm:gap-2.5 md:gap-3.5">
            <button
              type="button"
              onClick={() => navigate('/auth?plan=individual')}
              className="landing-btn-fluid inline-flex items-center justify-center rounded-full bg-[#DEAE4D] font-bold text-[#2E3330] shadow-[0_4px_0_rgba(46,51,48,0.12)] transition-transform duration-200 hover:-translate-y-0.5 hover:bg-[#D4A33F] active:translate-y-0 cursor-pointer"
            >
              Comenzar prueba gratis
            </button>
            <button
              type="button"
              onClick={() => navigate('/login')}
              className="landing-btn-fluid inline-flex items-center justify-center rounded-full border border-[#2E3330]/25 bg-white font-bold text-[#2E3330] transition-colors duration-200 hover:border-[#2E3330] hover:bg-[#E9E9DB] cursor-pointer"
            >
              Iniciar sesión
            </button>
            {onExploreFunctions && (
              <button
                type="button"
                onClick={onExploreFunctions}
                className="inline-flex items-center justify-center gap-1 rounded-full border border-transparent px-2.5 py-1 text-xs sm:px-4 sm:py-2 sm:text-sm font-bold text-[#537BAC] hover:bg-[#537BAC]/10 transition-colors cursor-pointer"
              >
                <span>Explorar funciones</span>
                <ArrowRight className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
