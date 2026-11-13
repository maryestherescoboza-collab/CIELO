import { useState, useEffect, useRef } from 'react';
import { Sparkles, CheckCircle2 } from 'lucide-react';
import planClaseImg from '../assets/features/plan-clase.jpg';
import planRecuperacionImg from '../assets/features/plan-recuperacion.png';

interface AnimatedPlanningShowcaseProps {
  isActive?: boolean;
}

export function AnimatedPlanningShowcase({ isActive = true }: AnimatedPlanningShowcaseProps) {
  const [progress, setProgress] = useState(0); // 0 a 100%
  const [isCompleted, setIsCompleted] = useState(false);
  const isMountedRef = useRef(true);
  const animFrameRef = useRef<number | null>(null);
  const loopTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    isMountedRef.current = true;

    // Si la diapositiva no está activa, cancelar y pausar
    if (!isActive) {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (loopTimeoutRef.current) clearTimeout(loopTimeoutRef.current);
      return;
    }

    const duration = 3600; // 3.6 segundos para el llenado progresivo
    const holdCompletedTime = 2200; // 2.2 segundos para apreciar el documento completo antes del reinicio

    const runLoop = () => {
      if (!isMountedRef.current) return;
      setProgress(0);
      setIsCompleted(false);

      const startTime = performance.now();

      const step = (currentTime: number) => {
        if (!isMountedRef.current) return;

        const elapsed = currentTime - startTime;
        const t = Math.min(elapsed / duration, 1);
        // Easing suave cuadrático
        const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
        const currentProgress = Math.round(eased * 100);

        setProgress(currentProgress);

        if (t < 1) {
          animFrameRef.current = requestAnimationFrame(step);
        } else {
          setIsCompleted(true);
          // Pausa con el documento completado y reinicia el ciclo indefinidamente
          loopTimeoutRef.current = setTimeout(() => {
            if (isMountedRef.current) {
              runLoop();
            }
          }, holdCompletedTime);
        }
      };

      animFrameRef.current = requestAnimationFrame(step);
    };

    // Pequeño retardo al entrar a la sección para comenzar suavemente
    const startTimeout = setTimeout(() => {
      runLoop();
    }, 300);

    return () => {
      isMountedRef.current = false;
      clearTimeout(startTimeout);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (loopTimeoutRef.current) clearTimeout(loopTimeoutRef.current);
    };
  }, [isActive]);

  return (
    <div className="w-full">
      {/* Barra superior discreta con indicador dinámico de llenado */}
      <div className="mb-1.5 sm:mb-2 flex items-center justify-between">
        <span className="flex items-center gap-1 sm:gap-1.5 text-[10px] sm:text-xs font-bold text-[#1E3A5F]">
          <Sparkles className="h-3 w-3 sm:h-3.5 sm:w-3.5 animate-spin text-[#DEAE4D]" />
          {!isCompleted ? `Llenando documentos oficiales (${progress}%)` : 'Llenado completado (100%)'}
        </span>

        <span className="text-[9.5px] sm:text-[11px] font-semibold text-[#5F665E]">
          {isCompleted ? 'Sincronizado con MINERD' : 'Generación en vivo'}
        </span>
      </div>

      {/* 2 DOCUMENTOS DIRECTOS LADO A LADO CON BORDES COMPLETAMENTE RECTOS (SIN TARJETAS DENTRO DE TARJETAS) */}
      <div className="grid grid-cols-1 gap-2 md:grid-cols-2 md:gap-4">
        {/* ========================================================= */}
        {/* DOCUMENTO 1: PLAN DE CLASE DIARIO                         */}
        {/* ========================================================= */}
        <div className="border border-[#2E3330]/20 bg-white p-1.5 sm:p-2 rounded-none flex flex-col justify-between shadow-xs">
          <div>
            <div className="mb-1 flex items-center justify-between border-b border-[#2E3330]/10 pb-1 px-0.5 sm:px-1">
              <span className="text-[10px] sm:text-[11px] font-bold text-[#1E3A5F] uppercase tracking-wider">
                Plan de Clase Diario
              </span>
              <span className="text-[9px] sm:text-[10px] font-semibold text-[#5F665E]">
                MINERD Oficial
              </span>
            </div>

            {/* Contenedor plano con animación de llenado */}
            <div className="relative overflow-hidden bg-slate-50 rounded-none">
              {/* Plantilla base atenuada mientras se llena */}
              <img
                src={planClaseImg}
                alt="Plantilla base Plan de Clase"
                className="w-full max-h-[26vh] sm:max-h-[44vh] md:max-h-[48vh] object-contain opacity-25 filter grayscale rounded-none mx-auto block"
              />

              {/* Imagen real revelándose gradualmente hacia abajo */}
              <div
                className="absolute inset-0 overflow-hidden transition-all duration-75 rounded-none"
                style={{
                  clipPath: `inset(0 0 ${100 - progress}% 0)`,
                }}
              >
                <img
                  src={planClaseImg}
                  alt="Plan de Clase Diario de CIELO llenándose"
                  className="w-full max-h-[26vh] sm:max-h-[44vh] md:max-h-[48vh] object-contain rounded-none mx-auto block"
                />
              </div>

              {/* Línea de escaneo / escritura activa durante el llenado */}
              {!isCompleted && progress > 0 && progress < 100 && (
                <div
                  className="absolute inset-x-0 pointer-events-none transition-all duration-75"
                  style={{ top: `${progress}%` }}
                >
                  <div className="h-0.5 w-full bg-linear-to-r from-transparent via-[#DEAE4D] to-transparent shadow-[0_0_10px_#DEAE4D]" />
                  <div className="absolute right-2 -top-2.5 bg-[#1E3A5F] px-1.5 py-0.5 text-[8px] font-bold text-white shadow-xs">
                    Escribiendo...
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="mt-1.5 flex items-center justify-between px-0.5 sm:px-1 text-[9px] sm:text-[10px] text-[#5F665E] border-t border-[#2E3330]/10 pt-1">
            <span className="flex items-center gap-1 font-semibold text-[#689C63]">
              <CheckCircle2 className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
              {progress === 100 ? 'Secuencia completa' : `Completando (${progress}%)`}
            </span>
            <span>1ro A · Lengua Española</span>
          </div>
        </div>

        {/* ========================================================= */}
        {/* DOCUMENTO 2: PLAN DE RECUPERACIÓN PEDAGÓGICA              */}
        {/* ========================================================= */}
        <div className="border border-[#2E3330]/20 bg-white p-1.5 sm:p-2 rounded-none flex flex-col justify-between shadow-xs">
          <div>
            <div className="mb-1 flex items-center justify-between border-b border-[#2E3330]/10 pb-1 px-0.5 sm:px-1">
              <span className="text-[10px] sm:text-[11px] font-bold text-[#1E3A5F] uppercase tracking-wider">
                Plan de Recuperación Pedagógica
              </span>
              <span className="text-[9px] sm:text-[10px] font-semibold text-[#EB8847]">
                Seguimiento Individual
              </span>
            </div>

            {/* Contenedor plano con animación de llenado */}
            <div className="relative overflow-hidden bg-slate-50 rounded-none">
              {/* Plantilla base atenuada mientras se llena */}
              <img
                src={planRecuperacionImg}
                alt="Plantilla base Plan de Recuperación"
                className="w-full max-h-[26vh] sm:max-h-[44vh] md:max-h-[48vh] object-contain opacity-25 filter grayscale rounded-none mx-auto block"
              />

              {/* Imagen real revelándose gradualmente hacia abajo */}
              <div
                className="absolute inset-0 overflow-hidden transition-all duration-75 rounded-none"
                style={{
                  clipPath: `inset(0 0 ${100 - progress}% 0)`,
                }}
              >
                <img
                  src={planRecuperacionImg}
                  alt="Plan de Recuperación Pedagógica de CIELO llenándose"
                  className="w-full max-h-[26vh] sm:max-h-[44vh] md:max-h-[48vh] object-contain rounded-none mx-auto block"
                />
              </div>

              {/* Línea de escaneo / escritura activa durante el llenado */}
              {!isCompleted && progress > 0 && progress < 100 && (
                <div
                  className="absolute inset-x-0 pointer-events-none transition-all duration-75"
                  style={{ top: `${progress}%` }}
                >
                  <div className="h-0.5 w-full bg-linear-to-r from-transparent via-[#537BAC] to-transparent shadow-[0_0_10px_#537BAC]" />
                  <div className="absolute right-2 -top-2.5 bg-[#1E3A5F] px-1.5 py-0.5 text-[8px] font-bold text-white shadow-xs">
                    Generando acta...
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="mt-1.5 flex items-center justify-between px-0.5 sm:px-1 text-[9px] sm:text-[10px] text-[#5F665E] border-t border-[#2E3330]/10 pt-1">
            <span className="flex items-center gap-1 font-semibold text-[#689C63]">
              <CheckCircle2 className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
              {progress === 100 ? 'Acta generada' : `Completando (${progress}%)`}
            </span>
            <span>1ro &quot;Z&quot; · Ciencias Sociales</span>
          </div>
        </div>
      </div>
    </div>
  );
}
