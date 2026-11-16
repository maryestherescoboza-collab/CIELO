import React, { useEffect, useState, useCallback } from 'react';
import { CheckCircle2, Award, Volume2, ArrowRight } from 'lucide-react';
import { CieloModal } from '../ui/CieloModal';
import {
  loadIniciacionProgress,
  dismissIniciacionWelcome,
  resetIniciacionProgress,
  type IniciacionProgress
} from '../../guides/iniciacionState';
import { startGuide, isGuideActive } from '../../guides/driverGuides';
import { voiceNarrator } from '../../guides/voiceNarrator';
import { resolveAudioUrl } from '../../guides/audioRegistry';

interface Props {
  userId?: string;
}

export const GuiaIniciacionModal: React.FC<Props> = ({ userId }) => {
  const [showWelcome, setShowWelcome] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [progress, setProgress] = useState<IniciacionProgress>(() => loadIniciacionProgress(userId));

  const refreshProgress = useCallback(() => {
    if (!userId) return;
    const p = loadIniciacionProgress(userId);
    setProgress(p);
  }, [userId]);

  // Sincronizar progreso y manejar apertura de bienvenida para usuarios
  useEffect(() => {
    if (!userId) return;
    refreshProgress();

    const p = loadIniciacionProgress(userId);
    if (!p.completed && !p.dismissedWelcome && !isGuideActive()) {
      const timer = setTimeout(() => {
        if (!isGuideActive()) {
          setShowWelcome(true);
          const audioUrl = resolveAudioUrl(undefined, undefined, 'iniciacion_welcome');
          voiceNarrator.speak(
            'Te acompañaremos paso a paso en una experiencia interactiva para que aprendas a utilizar las funciones fundamentales de CIELO.',
            audioUrl,
            { stepKey: 'modal_welcome' }
          );
        }
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [userId, refreshProgress]);

  // Escuchar eventos globales del ciclo de vida de la guía
  useEffect(() => {
    const handleUpdated = (e: Event) => {
      const custom = e as CustomEvent<IniciacionProgress>;
      if (custom.detail) {
        setProgress(custom.detail);
      } else {
        refreshProgress();
      }
    };

    const handleCelebration = () => {
      setShowWelcome(false);
      setShowCelebration(true);
      const audioUrl = resolveAudioUrl(undefined, undefined, 'iniciacion_celebration');
      voiceNarrator.speak(
        '¡Felicidades! Has completado tu guía de iniciación. Ya conoces los primeros pasos para trabajar con CIELO. Ahora estás listo para evaluar por competencias.',
        audioUrl,
        { stepKey: 'modal_celebration' }
      );
    };

    window.addEventListener('cielo-iniciacion-updated', handleUpdated);
    window.addEventListener('cielo-iniciacion-celebration', handleCelebration);

    return () => {
      window.removeEventListener('cielo-iniciacion-updated', handleUpdated);
      window.removeEventListener('cielo-iniciacion-celebration', handleCelebration);
    };
  }, [refreshProgress]);

  const handleStartTour = () => {
    setShowWelcome(false);
    voiceNarrator.stop();
    if (!userId) return;
    const stepToStart = progress.completed ? 0 : (progress.currentStepIndex || 0);
    startGuide('iniciacion', stepToStart, userId);
  };

  const handleDismissWelcome = () => {
    setShowWelcome(false);
    voiceNarrator.stop();
    if (userId) {
      dismissIniciacionWelcome(userId);
      refreshProgress();
    }
  };

  const handleCloseCelebration = () => {
    setShowCelebration(false);
    voiceNarrator.stop();
  };

  const handleRestartTour = () => {
    setShowCelebration(false);
    voiceNarrator.stop();
    if (!userId) return;
    resetIniciacionProgress(userId);
    startGuide('iniciacion', 0, userId);
  };

  return (
    <>
      {/* Modal de Bienvenida e Invitación */}
      <CieloModal
        isOpen={showWelcome}
        onClose={handleDismissWelcome}
        maxWidth="xl"
      >
        <div className="space-y-6 py-2">
          <div className="bg-[#F8F9F7] border border-[rgba(46,51,48,0.08)] rounded-2xl p-4.5">
            <p className="text-sm font-medium text-[#2E3330] leading-relaxed">
              Te acompañaremos paso a paso en una experiencia interactiva para que aprendas a utilizar las funciones fundamentales de CIELO.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
            <button
              type="button"
              onClick={handleStartTour}
              className="w-full sm:flex-1 h-11 rounded-full text-xs font-bold uppercase tracking-wider bg-[#2E3330] text-white hover:bg-black transition-all flex items-center justify-center gap-2 shadow-sm cursor-pointer"
            >
              <Volume2 size={16} />
              <span>Comenzar recorrido</span>
              <ArrowRight size={15} />
            </button>
            <button
              type="button"
              onClick={handleDismissWelcome}
              className="w-full sm:w-auto px-6 h-11 rounded-full text-xs font-bold uppercase tracking-wider text-[#5F665E] hover:bg-[#F2EFE9] border border-[rgba(46,51,48,0.12)] transition-all cursor-pointer"
            >
              Hacerlo más tarde
            </button>
          </div>
        </div>
      </CieloModal>

      {/* Modal de Finalización y Felicitaciones */}
      <CieloModal
        isOpen={showCelebration}
        onClose={handleCloseCelebration}
        title="¡Iniciación completada!"
        subtitle="Has dominado las funciones esenciales de CIELO"
        icon={<CheckCircle2 size={22} className="text-[#689C63]" />}
        maxWidth="md"
      >
        <div className="space-y-6 py-2 text-center">
          <div className="w-16 h-16 mx-auto rounded-full bg-[#EBF5EE] border-2 border-[#689C63]/30 flex items-center justify-center shadow-inner">
            <Award size={34} className="text-[#689C63]" />
          </div>

          <div className="space-y-2">
            <h3 className="text-lg font-black text-[#2E3330] font-notion-title">
              ¡Felicidades! Has completado tu guía de iniciación
            </h3>
            <p className="text-xs text-[#5F665E] leading-relaxed max-w-sm mx-auto font-medium">
              Ya conoces los primeros pasos para trabajar con CIELO. Ahora estás listo para evaluar por competencias con total seguridad y rapidez.
            </p>
          </div>

          <div className="bg-[#F8F9F7] border border-[rgba(46,51,48,0.08)] rounded-2xl p-4 text-left space-y-2">
            <div className="text-[11px] font-black uppercase tracking-wider text-[#5F665E] mb-1">
              Etapas completadas con éxito:
            </div>
            {[
              '1. Creación de aula y asignatura',
              '2. Registro de estudiantes',
              '3. Creación de actividad e indicador',
              '4. Práctica de modos: pincel, libre y numérico',
              '5. Comprensión de los 4 niveles de logro',
            ].map((item, idx) => (
              <div key={idx} className="flex items-center gap-2 text-xs font-semibold text-[#2E3330]">
                <CheckCircle2 size={14} className="text-[#689C63] shrink-0" />
                <span>{item}</span>
              </div>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-2 pt-2">
            <button
              type="button"
              onClick={handleCloseCelebration}
              className="w-full sm:flex-1 h-11 rounded-full text-xs font-bold uppercase tracking-wider bg-[#2E3330] text-white hover:bg-black transition-all shadow-sm cursor-pointer"
            >
              Ir a mi registro académico
            </button>
            <button
              type="button"
              onClick={handleRestartTour}
              className="w-full sm:w-auto px-5 h-11 rounded-full text-xs font-bold uppercase tracking-wider text-[#5F665E] hover:bg-[#F2EFE9] border border-[rgba(46,51,48,0.12)] transition-all cursor-pointer"
            >
              Repetir guía
            </button>
          </div>
        </div>
      </CieloModal>
    </>
  );
};
