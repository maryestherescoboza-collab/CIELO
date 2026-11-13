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
      className="relative flex h-screen w-screen flex-col overflow-hidden font-sans selection:bg-[#DEAE4D] selection:text-[#2E3330] transition-colors duration-700 ease-in-out"
      style={{ backgroundColor: currentData.bgFondo }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* 1. Menú superior limpio y equilibrado (sin botón de prueba gratis) */}
      <LandingNavbar />

      {/* 2. Contenedor interactivo con transiciones fluidas estilo diapositiva */}
      <div className="relative flex-1 overflow-hidden pt-13 sm:pt-20 pb-9 sm:pb-14">
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
                  className="flex h-full w-full shrink-0 flex-col justify-center overflow-y-auto px-2.5 pb-2 pt-1 sm:px-8 sm:pb-2 sm:pt-2 transition-colors duration-700"
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
                  className="flex h-full w-full shrink-0 flex-col justify-center overflow-y-auto px-2 pb-2 pt-1 sm:px-8 sm:pb-4 sm:pt-2 lg:px-14 transition-colors duration-700"
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
                className="flex h-full w-full shrink-0 flex-col justify-center overflow-y-auto px-2 pb-2 pt-1 sm:px-8 sm:pb-4 sm:pt-2 lg:px-14 transition-colors duration-700"
                style={{ backgroundColor: slide.bgFondo }}
                aria-hidden={!isActive}
              >
                <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col justify-center">
                  <div className="grid items-center gap-3 lg:grid-cols-12 lg:gap-8 xl:gap-12">
                    {/* Columna editorial concisa */}
                    <div className={`${slide.id === 'planificacion' || slide.id === 'gestion-curso' || slide.id === 'aligera-docente' ? 'lg:col-span-4' : 'lg:col-span-5'} landing-fade-up`}>
                      <div className="flex items-center gap-1.5 sm:gap-2">
                        <span
                          className="inline-flex h-5 w-5 sm:h-6 sm:w-6 items-center justify-center rounded-none text-[10px] sm:text-xs font-black text-white shadow-xs"
                          style={{ backgroundColor: slide.color }}
                        >
                          {slide.numero}
                        </span>
                        <span
                          className="text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.16em]"
                          style={{ color: slide.color }}
                        >
                          {slide.etiqueta}
                        </span>
                      </div>

                      <h2 className="font-cagliostro mt-1.5 sm:mt-2 text-xl font-normal tracking-normal text-[#2E3330] sm:text-3xl lg:text-4xl">
                        {slide.titulo}
                      </h2>

                      <p className="mt-0.5 sm:mt-1 text-[11px] font-semibold text-[#537BAC] sm:text-sm">
                        {slide.subtitulo}
                      </p>

                      {/* Capacidades destacadas breves */}
                      <div className="mt-2.5 sm:mt-3.5 border-t border-[#2E3330]/10 pt-2 sm:pt-3">
                        <ul className="space-y-1 sm:space-y-1.5">
                          {slide.puntosClave.map((punto, pIdx) => (
                            <li key={pIdx} className="flex items-start gap-1.5 sm:gap-2 text-[11px] sm:text-[13px] text-[#2E3330]">
                              <span
                                className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full"
                                style={{ backgroundColor: slide.color }}
                              />
                              <span className="leading-snug">{punto}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="mt-3 sm:mt-5 flex items-center gap-2.5 sm:gap-3">
                        <Link
                          to="/auth?plan=individual"
                          className="inline-flex items-center justify-center rounded-full bg-[#DEAE4D] px-3 py-1 sm:px-4 sm:py-1.5 text-[11px] sm:text-xs font-bold text-[#2E3330] transition-colors hover:bg-[#D4A33F]"
                        >
                          Probar este módulo
                        </Link>
                        <span className="text-[10px] sm:text-[11px] text-[#5F665E]">
                          Diapositiva {slide.numero} / 0{totalSlides}
                        </span>
                      </div>
                    </div>

                    {/* Columna de Captura Real o Simulación Interactiva */}
                    <div className={`${slide.id === 'planificacion' || slide.id === 'gestion-curso' || slide.id === 'aligera-docente' ? 'lg:col-span-8' : 'lg:col-span-7'} landing-fade-scale`}>
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
                            className="absolute -top-2 -right-2 h-6 w-6 shadow-xs rounded-none"
                            style={{ backgroundColor: slide.color }}
                          />

                          <div className="relative overflow-hidden border border-[#2E3330]/15 bg-white p-2 shadow-xs rounded-none">
                            {slide.captura && (
                              <img
                                src={slide.captura}
                                alt={slide.capturaAlt}
                                className="max-h-[46vh] w-full object-contain bg-slate-50 lg:max-h-[52vh] rounded-none"
                                loading="lazy"
                              />
                            )}
                            {slide.capturaPie && (
                              <p className="mt-1.5 text-center text-[10px] font-medium text-[#5F665E] sm:text-[11px]">
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

      {/* Controlador de navegación vertical grueso (estilo idéntico a la referencia) */}
      <div className="fixed right-2 sm:right-6 top-1/2 z-40 -translate-y-1/2 flex flex-col items-center gap-2 sm:gap-4 select-none">
        {/* Botón arriba: anillo oscuro grueso con chevron blanco grueso */}
        <button
          type="button"
          onClick={prevSlide}
          disabled={currentSlide === 0}
          aria-label="Diapositiva anterior"
          title="Diapositiva anterior"
          className="group relative flex h-8.5 w-8.5 sm:h-13 sm:w-13 items-center justify-center rounded-full border-2 sm:border-4 border-[#38433C] bg-[#2E3330]/90 text-white shadow-[0_3px_10px_rgba(0,0,0,0.25)] transition-all duration-200 hover:scale-105 active:scale-95 disabled:opacity-20 disabled:pointer-events-none cursor-pointer"
        >
          <ChevronUp className="h-4 w-4 sm:h-6 sm:w-6 stroke-3 sm:stroke-4 text-white transition-transform group-hover:-translate-y-0.5" />
        </button>

        {/* Insignia central: disco blanco grueso estampado con texto en mayúsculas */}
        <button
          type="button"
          onClick={currentSlide < totalSlides - 1 ? nextSlide : () => goToSlide(0)}
          aria-label={`Sección actual: ${currentData.etiqueta}. Clic para avanzar`}
          title={`Sección actual: ${currentData.etiqueta}. Clic para avanzar`}
          className="group relative flex h-15 w-15 sm:h-24 sm:w-24 flex-col items-center justify-center rounded-full border-2 sm:border-4 border-[#2E3330] bg-white p-1 text-center shadow-[0_4px_16px_rgba(0,0,0,0.22)] transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer"
        >
          <span className="text-[7.5px] sm:text-[9.5px] font-mono font-bold tracking-wider text-[#5F665E]">
            0{currentSlide + 1} / 0{totalSlides}
          </span>
          <span className="mt-0.5 text-[8.5px] sm:text-[11.5px] font-black uppercase tracking-tight text-[#2E3330] leading-none line-clamp-2 max-w-12 sm:max-w-18.5">
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
          className="group relative flex h-8.5 w-8.5 sm:h-13 sm:w-13 items-center justify-center rounded-full border-2 sm:border-4 border-[#38433C] bg-[#2E3330]/90 text-white shadow-[0_3px_10px_rgba(0,0,0,0.25)] transition-all duration-200 hover:scale-105 active:scale-95 disabled:opacity-20 disabled:pointer-events-none cursor-pointer"
        >
          <ChevronDown className="h-4 w-4 sm:h-6 sm:w-6 stroke-3 sm:stroke-4 text-white transition-transform group-hover:translate-y-0.5" />
        </button>
      </div>

      {/* Barra de control inferior fija y compacta */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-[#2E3330]/10 bg-white/80 px-2.5 py-1.5 backdrop-blur-md sm:px-8 sm:py-2 transition-colors duration-500">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-2 sm:gap-3">
          {/* Nombre de la diapositiva activa */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            <span
              className="inline-block h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full transition-colors duration-300"
              style={{ backgroundColor: currentData.color }}
            />
            <span className="text-[11px] sm:text-xs font-bold text-[#2E3330]">
              {currentData.numero}. {currentData.etiqueta}
            </span>
            <span className="hidden text-xs text-[#5F665E] md:inline">
              — {currentData.subtitulo}
            </span>
          </div>

          {/* Navegador de puntos / diapositivas */}
          <div className="flex items-center gap-1 sm:gap-2">
            {DIAPOSITIVAS.map((slide, sIdx) => {
              const isSelected = sIdx === currentSlide;
              return (
                <button
                  key={slide.id}
                  type="button"
                  onClick={() => goToSlide(sIdx)}
                  aria-label={`Ir a diapositiva ${slide.numero}: ${slide.etiqueta}`}
                  className="group relative flex h-6 items-center justify-center px-1 transition-all cursor-pointer"
                >
                  <span
                    className={`h-2 rounded-full transition-all duration-300 ${
                      isSelected
                        ? 'w-6 bg-[#2E3330]'
                        : 'w-2 bg-[#2E3330]/25 group-hover:bg-[#2E3330]/50'
                    }`}
                    style={isSelected ? { backgroundColor: slide.color } : {}}
                  />
                </button>
              );
            })}
          </div>

          {/* Indicador numérico de diapositivas y controles compactos */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold text-[#2E3330]">
              {currentSlide + 1} / 0{totalSlides}
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={prevSlide}
                disabled={currentSlide === 0}
                aria-label="Anterior"
                className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-[#2E3330] bg-white text-[#2E3330] disabled:opacity-20 disabled:pointer-events-none hover:bg-[#E9E9DB] cursor-pointer transition-colors"
              >
                <ChevronLeft className="h-4 w-4 stroke-3" />
              </button>
              <button
                type="button"
                onClick={nextSlide}
                disabled={currentSlide === totalSlides - 1}
                aria-label="Siguiente"
                className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-[#2E3330] bg-white text-[#2E3330] disabled:opacity-20 disabled:pointer-events-none hover:bg-[#E9E9DB] cursor-pointer transition-colors"
              >
                <ChevronRight className="h-4 w-4 stroke-3" />
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
