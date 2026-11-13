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
    <section className="relative flex min-h-[calc(100svh-3.25rem)] sm:min-h-[calc(100svh-5rem)] w-full flex-col items-center justify-center overflow-hidden px-3.5 pb-4 pt-1 text-center sm:px-8 sm:pb-6 sm:pt-2">
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
              ? 'opacity-100 translate-y-0 max-h-125 mt-3 sm:mt-6 pointer-events-auto'
              : 'opacity-0 translate-y-8 max-h-0 overflow-hidden mt-0 pointer-events-none'
          }`}
        >
          <h1 className="font-cagliostro mx-auto mt-2 sm:mt-6 max-w-4xl text-2xl font-normal leading-[1.18] text-[#2E3330] sm:text-4xl md:text-5xl lg:text-[3.75rem] tracking-normal">
            Dedica tu tiempo a tus estudiantes.{' '}
            <span className="text-[#689C63]">
              CIELO se ocupa del proceso.
            </span>
          </h1>

          {/* 3. Acciones directas y sugerencia de navegación */}
          <div className="mt-4 sm:mt-8 flex flex-col items-stretch justify-center gap-2 sm:flex-row sm:items-center sm:gap-3">
            <button
              type="button"
              onClick={() => navigate('/auth?plan=individual')}
              className="inline-flex items-center justify-center rounded-full bg-[#DEAE4D] px-5 py-2.5 text-xs font-bold text-[#2E3330] shadow-[0_4px_0_rgba(46,51,48,0.12)] sm:shadow-[0_6px_0_rgba(46,51,48,0.12)] transition-transform duration-200 hover:-translate-y-0.5 hover:bg-[#D4A33F] active:translate-y-0 cursor-pointer sm:px-8 sm:py-3 sm:text-base"
            >
              Comenzar prueba gratis
            </button>
            <button
              type="button"
              onClick={() => navigate('/login')}
              className="inline-flex items-center justify-center rounded-full border border-[#2E3330]/25 bg-white px-5 py-2.5 text-xs font-bold text-[#2E3330] transition-colors duration-200 hover:border-[#2E3330] hover:bg-[#E9E9DB] cursor-pointer sm:px-7 sm:py-3 sm:text-base"
            >
              Iniciar sesión
            </button>
            {onExploreFunctions && (
              <button
                type="button"
                onClick={onExploreFunctions}
                className="inline-flex items-center justify-center gap-1 rounded-full border border-transparent px-3 py-2 text-xs font-bold text-[#537BAC] hover:bg-[#537BAC]/10 transition-colors cursor-pointer sm:gap-1.5 sm:px-5 sm:py-3 sm:text-sm"
              >
                <span>Explorar funciones</span>
                <ArrowRight className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
