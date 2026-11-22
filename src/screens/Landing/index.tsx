import { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, ChevronUp, ChevronDown } from 'lucide-react';
import { LandingNavbar } from './components/LandingNavbar';
import { LandingHero } from './components/LandingHero';
import { AnimatedPlanningShowcase } from './components/AnimatedPlanningShowcase';
import { InteractiveGradebookDemo } from './components/InteractiveGradebookDemo';
import { AnimatedIncidenciasShowcase } from './components/AnimatedIncidenciasShowcase';
import { AligeraTrabajoShowcase } from './components/AligeraTrabajoShowcase';
import './landing.css';

interface DiapositivaInfo {
  tipo: 'portada' | 'funcionalidad';
  id: string;
  numero: string;
  etiqueta: string;
  titulo: string;
  subtitulo: string;
  color: string;
  bgFondo: string;
  puntosClave: string[];
  captura?: string;
  capturaAlt?: string;
  capturaPie?: string;
}

const DIAPOSITIVAS: DiapositivaInfo[] = [
  {
    tipo: 'portada',
    id: 'portada',
    numero: '01',
    etiqueta: 'Bienvenida',
    titulo: 'CIELO',
    subtitulo: 'Dedica tu tiempo a tus estudiantes. CIELO se ocupa del proceso.',
    color: '#537BAC',
    bgFondo: '#FCFCFA', // Lino editorial cálido y luminoso de CIELO
    puntosClave: [],
  },
  {
    tipo: 'funcionalidad',
    id: 'planificacion',
    numero: '02',
    etiqueta: 'Planificación',
    titulo: 'Planificación Didáctica',
    subtitulo: 'Del diseño curricular al aula en una sola secuencia.',
    color: '#537BAC',
    bgFondo: '#F0F4F8', // Azul etéreo / celeste suave CIELO
    puntosClave: [
      'Plan de clase diario con inicio, desarrollo y cierre articulados.',
      'Plan de recuperación pedagógica individualizado por estudiante.',
      'Contenidos conceptuales, procedimentales y actitudinales oficiales.',
      'Indicadores del MINERD vinculados directamente sin redacción manual.',
    ],
  },
  {
    tipo: 'funcionalidad',
    id: 'evaluacion',
    numero: '03',
    etiqueta: 'Evaluación',
    titulo: 'Evaluación por Competencias',
    subtitulo: 'Instrumentos donde cada calificación responde a una evidencia.',
    color: '#689C63',
    bgFondo: '#FBF8F1', // Arena / Crema cálido dorado CIELO
    puntosClave: [
      'Registro interactivo con cálculo ponderado en vivo.',
      'Asignación directa de competencias (BC1–BC4) por actividad.',
      'Detección automática de estudiantes que requieren recuperación.',
      'Rúbricas analíticas, listas de cotejo y escalas integradas.',
    ],
  },
  {
    tipo: 'funcionalidad',
    id: 'gestion-curso',
    numero: '04',
    etiqueta: 'Bitácora y Disciplina',
    titulo: 'Gestión del Curso y Bitácora',
    subtitulo: 'Seguimiento disciplinario y derivación a Orientación en un clic.',
    color: '#DEAE4D',
    bgFondo: '#FDF4ED', // Melocotón / Terracota suave editorial CIELO
    puntosClave: [
      'Bitácora escolar con registro de acuerdos y firmas de seguimiento.',
      'Generación inmediata de la Ficha de Referencia a Orientación y Psicología.',
      'Pase de lista diario con cálculo automático de asistencia.',
      'Aislamiento estricto de expedientes y novedades por estudiante.',
    ],
  },
  {
    tipo: 'funcionalidad',
    id: 'aligera-docente',
    numero: '05',
    etiqueta: 'Automatización Docente',
    titulo: 'El trabajo que CIELO aligera a los docentes',
    subtitulo: 'Menos carga administrativa, más tiempo para enseñar.',
    color: '#689C63',
    bgFondo: '#F0F6EE', // Verde salvia / Menta suave de serenidad CIELO
    puntosClave: [
      'Realiza el pase de lista con cálculo automático de asistencia.',
      'Crea portafolios de evidencia y producciones por estudiante.',
      'Envía quiz a tus estudiantes para evaluaciones automatizadas.',
      'Crea instrumentos de evaluación (rúbricas y listas de cotejo).',
    ],
  },
];

export default function Landing() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const totalSlides = DIAPOSITIVAS.length;

  // Sincronización con el Hash de la URL (#evaluacion, #planificacion, #planes)
  const syncSlideFromHash = useCallback(() => {
    const hash = window.location.hash.replace('#', '');
    if (hash) {
      const idx = DIAPOSITIVAS.findIndex(
        (s) => s.id === hash || s.id.startsWith(hash) || (hash === 'adecuacion' && s.id === 'planificacion')
      );
      if (idx !== -1) {
        setCurrentSlide(idx);
      }
    }
  }, []);

  useEffect(() => {
    syncSlideFromHash();
    window.addEventListener('hashchange', syncSlideFromHash);
    return () => window.removeEventListener('hashchange', syncSlideFromHash);
  }, [syncSlideFromHash]);

  const goToSlide = useCallback(
    (index: number) => {
      if (index >= 0 && index < totalSlides) {
        setCurrentSlide(index);
        const slideId = DIAPOSITIVAS[index].id;
        if (index === 0) {
          window.history.replaceState(null, '', window.location.pathname);
        } else {
          window.history.replaceState(null, '', `#${slideId}`);
        }
      }
    },
    [totalSlides]
  );

  const nextSlide = useCallback(() => {
    goToSlide(currentSlide < totalSlides - 1 ? currentSlide + 1 : currentSlide);
  }, [currentSlide, totalSlides, goToSlide]);

  const prevSlide = useCallback(() => {
    goToSlide(currentSlide > 0 ? currentSlide - 1 : currentSlide);
  }, [currentSlide, goToSlide]);

  // Gestos táctiles en pantallas táctiles
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.targetTouches[0].clientX;
    touchEndX.current = null;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.targetTouches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (touchStartX.current === null || touchEndX.current === null) return;
    const diff = touchStartX.current - touchEndX.current;
    const minSwipeDistance = 40;

    if (diff > minSwipeDistance) {
      nextSlide();
    } else if (diff < -minSwipeDistance) {
      prevSlide();
    }

    touchStartX.current = null;
    touchEndX.current = null;
  };

  // Navegación por teclado (← / → / Inicio / Fin)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }

      if (e.key === 'ArrowRight' || e.key === 'PageDown') {
        e.preventDefault();
        nextSlide();
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault();
        prevSlide();
      } else if (e.key === 'Home') {
        e.preventDefault();
        goToSlide(0);
      } else if (e.key === 'End') {
        e.preventDefault();
        goToSlide(totalSlides - 1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [nextSlide, prevSlide, goToSlide, totalSlides]);

  const currentData = DIAPOSITIVAS[currentSlide];

  return (
    <div
      className="cielo-landing relative flex h-dvh max-h-dvh w-screen flex-col overflow-hidden font-sans selection:bg-[#DEAE4D] selection:text-[#2E3330] transition-colors duration-700 ease-in-out"
      style={{ backgroundColor: currentData.bgFondo }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* 1. Menú superior limpio y equilibrado (sin botón de prueba gratis) */}
      <LandingNavbar />

      {/* 2. Contenedor interactivo con transiciones fluidas estilo diapositiva */}
      <div className="relative flex-1 overflow-hidden pt-(--landing-nav-h) pb-(--landing-bottom-h)">
        <div
          className="flex h-full w-full transition-transform duration-600 ease-[cubic-bezier(0.22,1,0.36,1)]"
          style={{ transform: `translateX(-${currentSlide * 100}%)` }}
        >
          {DIAPOSITIVAS.map((slide, index) => {
            const isActive = index === currentSlide;

            if (slide.tipo === 'portada') {
              return (
                <div
                  key={slide.id}
                  className="flex h-full w-full shrink-0 flex-col justify-center overflow-y-auto px-2 pb-1 pt-0.5 sm:px-6 sm:pb-2 sm:pt-1 lg:px-10 pr-9 sm:pr-14 md:pr-18 lg:pr-22 transition-colors duration-700"
                  style={{ backgroundColor: slide.bgFondo }}
                  aria-hidden={!isActive}
                >
                  <LandingHero onExploreFunctions={nextSlide} />
                </div>
              );
            }

            if (slide.id === 'evaluacion') {
              return (
                <div
                  key={slide.id}
                  className="flex h-full w-full shrink-0 flex-col justify-center overflow-y-auto px-2 pb-1 pt-0.5 sm:px-6 sm:pb-3 sm:pt-1 lg:px-10 pr-9 sm:pr-14 md:pr-18 lg:pr-22 transition-colors duration-700"
                  style={{ backgroundColor: slide.bgFondo }}
                  aria-hidden={!isActive}
                >
                  <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col justify-center landing-fade-scale">
                    <InteractiveGradebookDemo />
                  </div>
                </div>
              );
            }

            // Diapositivas de áreas funcionales con textos breves y directos
            return (
              <div
                key={slide.id}
                className="flex h-full w-full shrink-0 flex-col justify-center overflow-y-auto px-2 pb-1 pt-0.5 sm:px-6 sm:pb-3 sm:pt-1 lg:px-10 pr-9 sm:pr-14 md:pr-18 lg:pr-22 transition-colors duration-700"
                style={{ backgroundColor: slide.bgFondo }}
                aria-hidden={!isActive}
              >
                <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col justify-center">
                  <div className="grid items-center gap-2.5 sm:gap-4 lg:grid-cols-12 lg:gap-6 xl:gap-10">
                    {/* Columna editorial concisa */}
                    <div className={`${slide.id === 'planificacion' || slide.id === 'aligera-docente' ? 'lg:col-span-4' : 'lg:col-span-5'} landing-fade-up`}>
                      <div className="flex items-center gap-1.5 sm:gap-2">
                        <span
                          className="inline-flex h-4.5 w-4.5 sm:h-5.5 sm:w-5.5 md:h-6 md:w-6 items-center justify-center rounded-none text-[9px] sm:text-[10.5px] md:text-xs font-black text-white shadow-xs"
                          style={{ backgroundColor: slide.color }}
                        >
                          {slide.numero}
                        </span>
                        <span
                          className="landing-slide-micro font-bold uppercase tracking-[0.16em]"
                          style={{ color: slide.color }}
                        >
                          {slide.etiqueta}
                        </span>
                      </div>

                      <h2 className="font-cagliostro landing-slide-title mt-1 sm:mt-1.5 font-normal tracking-normal text-[#2E3330]">
                        {slide.titulo}
                      </h2>

                      <p className="landing-slide-subtitle mt-0.5 sm:mt-1 font-semibold text-[#537BAC]">
                        {slide.subtitulo}
                      </p>

                      {/* Capacidades destacadas breves */}
                      <div className="mt-1.5 sm:mt-3 border-t border-[#2E3330]/10 pt-1.5 sm:pt-2.5">
                        <ul className="space-y-0.5 sm:space-y-1 md:space-y-1.5">
                          {slide.puntosClave.map((punto, pIdx) => (
                            <li key={pIdx} className="flex items-start gap-1.5 sm:gap-2 landing-slide-body text-[#2E3330]">
                              <span
                                className="mt-1 h-1 w-1 sm:h-1.5 sm:w-1.5 shrink-0 rounded-full"
                                style={{ backgroundColor: slide.color }}
                              />
                              <span className="leading-snug">{punto}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="mt-2 sm:mt-4 flex items-center gap-2 sm:gap-3">
                        <Link
                          to="/auth?plan=individual"
                          className="landing-btn-fluid inline-flex items-center justify-center rounded-full bg-[#DEAE4D] font-bold text-[#2E3330] transition-colors hover:bg-[#D4A33F]"
                        >
                          Probar este módulo
                        </Link>
                        <span className="landing-slide-micro text-[#5F665E]">
                          Diapositiva {slide.numero} / 0{totalSlides}
                        </span>
                      </div>
                    </div>

                    {/* Columna de Captura Real o Simulación Interactiva */}
                    <div className={`${slide.id === 'planificacion' || slide.id === 'aligera-docente' ? 'lg:col-span-8' : 'lg:col-span-7'} landing-fade-scale`}>
                      {slide.id === 'planificacion' ? (
                        <AnimatedPlanningShowcase isActive={isActive} />
                      ) : slide.id === 'gestion-curso' ? (
                        <AnimatedIncidenciasShowcase isActive={isActive} />
                      ) : slide.id === 'aligera-docente' ? (
                        <AligeraTrabajoShowcase isActive={isActive} />
                      ) : (
                        <div className="relative mx-auto w-full max-w-2xl">
                          {/* Acento geométrico sutil */}
                          <div className="absolute inset-0 translate-x-2 translate-y-2 border border-[#2E3330]/15 rounded-none" />
                          <div
                            className="absolute -top-2 -right-2 h-5 w-5 sm:h-6 sm:w-6 shadow-xs rounded-none"
                            style={{ backgroundColor: slide.color }}
                          />

                          <div className="relative overflow-hidden border border-[#2E3330]/15 bg-white p-1.5 sm:p-2 shadow-xs rounded-none">
                            {slide.captura && (
                              <img
                                src={slide.captura}
                                alt={slide.capturaAlt}
                                className="max-h-[38vh] sm:max-h-[46vh] lg:max-h-[50vh] w-full object-contain bg-slate-50 rounded-none"
                                loading="lazy"
                              />
                            )}
                            {slide.capturaPie && (
                              <p className="mt-1 text-center landing-slide-micro font-medium text-[#5F665E]">
                                {slide.capturaPie}
                              </p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Controlador de navegación vertical grueso (estilo idéntico a la referencia, fluido y adaptable) */}
      <div className="fixed right-1 sm:right-2.5 md:right-4 lg:right-6 top-1/2 z-40 -translate-y-1/2 flex flex-col items-center gap-1 sm:gap-2.5 md:gap-3.5 select-none pointer-events-auto">
        {/* Botón arriba: anillo oscuro grueso con chevron blanco grueso */}
        <button
          type="button"
          onClick={prevSlide}
          disabled={currentSlide === 0}
          aria-label="Diapositiva anterior"
          title="Diapositiva anterior"
          className="group relative flex items-center justify-center rounded-full border-2 sm:border-3 md:border-4 border-[#38433C] bg-[#2E3330]/90 text-white shadow-[0_3px_10px_rgba(0,0,0,0.25)] transition-all duration-200 hover:scale-105 active:scale-95 disabled:opacity-20 disabled:pointer-events-none cursor-pointer"
          style={{ width: 'var(--ctrl-btn-size)', height: 'var(--ctrl-btn-size)' }}
        >
          <ChevronUp
            className="stroke-3 sm:stroke-4 text-white transition-transform group-hover:-translate-y-0.5"
            style={{ width: 'var(--ctrl-icon-size)', height: 'var(--ctrl-icon-size)' }}
          />
        </button>

        {/* Insignia central: disco blanco grueso estampado con texto en mayúsculas */}
        <button
          type="button"
          onClick={currentSlide < totalSlides - 1 ? nextSlide : () => goToSlide(0)}
          aria-label={`Sección actual: ${currentData.etiqueta}. Clic para avanzar`}
          title={`Sección actual: ${currentData.etiqueta}. Clic para avanzar`}
          className="group relative flex flex-col items-center justify-center rounded-full border-2 sm:border-3 md:border-4 border-[#2E3330] bg-white p-0.5 sm:p-1 text-center shadow-[0_4px_16px_rgba(0,0,0,0.22)] transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer"
          style={{ width: 'var(--ctrl-badge-size)', height: 'var(--ctrl-badge-size)' }}
        >
          <span
            className="font-mono font-bold tracking-wider text-[#5F665E]"
            style={{ fontSize: 'var(--ctrl-badge-text-top)' }}
          >
            0{currentSlide + 1} / 0{totalSlides}
          </span>
          <span
            className="mt-0.5 font-black uppercase tracking-tight text-[#2E3330] leading-none line-clamp-2 max-w-[85%]"
            style={{ fontSize: 'var(--ctrl-badge-text-main)' }}
          >
            {currentData.etiqueta}
          </span>
        </button>

        {/* Botón abajo: anillo oscuro grueso con chevron blanco grueso */}
        <button
          type="button"
          onClick={nextSlide}
          disabled={currentSlide === totalSlides - 1}
          aria-label="Siguiente diapositiva"
          title="Siguiente diapositiva"
          className="group relative flex items-center justify-center rounded-full border-2 sm:border-3 md:border-4 border-[#38433C] bg-[#2E3330]/90 text-white shadow-[0_3px_10px_rgba(0,0,0,0.25)] transition-all duration-200 hover:scale-105 active:scale-95 disabled:opacity-20 disabled:pointer-events-none cursor-pointer"
          style={{ width: 'var(--ctrl-btn-size)', height: 'var(--ctrl-btn-size)' }}
        >
          <ChevronDown
            className="stroke-3 sm:stroke-4 text-white transition-transform group-hover:translate-y-0.5"
            style={{ width: 'var(--ctrl-icon-size)', height: 'var(--ctrl-icon-size)' }}
          />
        </button>
      </div>

      {/* Barra de control inferior fija y compacta */}
      <div
        className="fixed inset-x-0 bottom-0 z-40 border-t border-[#2E3330]/10 bg-white/85 px-2 sm:px-6 backdrop-blur-md transition-colors duration-500 flex items-center"
        style={{ height: 'var(--landing-bottom-h)' }}
      >
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-1.5 sm:gap-3">
          {/* Nombre de la diapositiva activa */}
          <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
            <span
              className="inline-block h-1.5 w-1.5 sm:h-2 sm:w-2 shrink-0 rounded-full transition-colors duration-300"
              style={{ backgroundColor: currentData.color }}
            />
            <span className="landing-slide-micro sm:landing-slide-caption font-bold text-[#2E3330] truncate">
              {currentData.numero}. {currentData.etiqueta}
            </span>
            <span className="hidden text-xs text-[#5F665E] md:inline truncate">
              — {currentData.subtitulo}
            </span>
          </div>

          {/* Navegador de puntos / diapositivas */}
          <div className="flex items-center gap-0.5 sm:gap-1.5">
            {DIAPOSITIVAS.map((slide, sIdx) => {
              const isSelected = sIdx === currentSlide;
              return (
                <button
                  key={slide.id}
                  type="button"
                  onClick={() => goToSlide(sIdx)}
                  aria-label={`Ir a diapositiva ${slide.numero}: ${slide.etiqueta}`}
                  className="group relative flex h-5 sm:h-6 items-center justify-center px-0.5 sm:px-1 transition-all cursor-pointer"
                >
                  <span
                    className={`h-1.5 sm:h-2 rounded-full transition-all duration-300 ${
                      isSelected
                        ? 'w-4 sm:w-6 bg-[#2E3330]'
                        : 'w-1.5 sm:w-2 bg-[#2E3330]/25 group-hover:bg-[#2E3330]/50'
                    }`}
                    style={isSelected ? { backgroundColor: slide.color } : {}}
                  />
                </button>
              );
            })}
          </div>

          {/* Indicador numérico de diapositivas y controles compactos */}
          <div className="flex items-center gap-1 sm:gap-2">
            <span className="font-mono font-bold text-[#2E3330] landing-slide-micro sm:landing-slide-caption">
              {currentSlide + 1} / 0{totalSlides}
            </span>
            <div className="flex items-center gap-0.5 sm:gap-1">
              <button
                type="button"
                onClick={prevSlide}
                disabled={currentSlide === 0}
                aria-label="Anterior"
                className="flex h-5.5 w-5.5 sm:h-7 sm:w-7 items-center justify-center rounded-full border-1.5 sm:border-2 border-[#2E3330] bg-white text-[#2E3330] disabled:opacity-20 disabled:pointer-events-none hover:bg-[#E9E9DB] cursor-pointer transition-colors"
              >
                <ChevronLeft className="h-3 w-3 sm:h-4 sm:w-4 stroke-3" />
              </button>
              <button
                type="button"
                onClick={nextSlide}
                disabled={currentSlide === totalSlides - 1}
                aria-label="Siguiente"
                className="flex h-5.5 w-5.5 sm:h-7 sm:w-7 items-center justify-center rounded-full border-1.5 sm:border-2 border-[#2E3330] bg-white text-[#2E3330] disabled:opacity-20 disabled:pointer-events-none hover:bg-[#E9E9DB] cursor-pointer transition-colors"
              >
                <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4 stroke-3" />
              </button>
            </div>
          </div>
        </div>

        {/* Barra de progreso milimétrica superior */}
        <div className="absolute inset-x-0 top-0 h-0.5 bg-[#2E3330]/10">
          <div
            className="h-full transition-all duration-400 ease-out"
            style={{
              width: `${((currentSlide + 1) / totalSlides) * 100}%`,
              backgroundColor: currentData.color,
            }}
          />
        </div>
      </div>
    </div>
  );
}
