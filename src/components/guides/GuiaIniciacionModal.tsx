import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, CheckCircle2, Award, Volume2, ArrowRight } from 'lucide-react';
import { CieloModal } from '../ui/CieloModal';
import { useAppStore } from '../../store/appStore';
import {
  loadIniciacionProgress,
  dismissIniciacionWelcome,
  resetIniciacionProgress,
  getResolvedUserId,
  isNewUserAccount,
  type IniciacionProgress
} from '../../guides/iniciacionState';
import { startGuide, isGuideActive } from '../../guides/driverGuides';
import { voiceNarrator } from '../../guides/voiceNarrator';
import { resolveAudioUrl } from '../../guides/audioRegistry';

interface Props {
  userId?: string;
  user?: {
    id?: string;
    created_at?: string;
    user_metadata?: Record<string, any>;
  } | null;
}

export const GuiaIniciacionModal: React.FC<Props> = ({ userId, user: propUser }) => {
  const navigate = useNavigate();
  const session = useAppStore((s) => s.session);
  const authInitialized = useAppStore((s) => s.authInitialized);
  const loading = useAppStore((s) => s.loading);

  const currentUser = propUser || session?.user;
  const effectiveUserId = getResolvedUserId(userId || currentUser?.id);

  const [showWelcome, setShowWelcome] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [progress, setProgress] = useState<IniciacionProgress>(() =>
    loadIniciacionProgress(effectiveUserId, currentUser?.user_metadata)
  );

  const refreshProgress = useCallback(() => {
    const p = loadIniciacionProgress(effectiveUserId, currentUser?.user_metadata);
    setProgress(p);
  }, [effectiveUserId, currentUser?.user_metadata]);

  // Sincronizar progreso y manejar apertura de bienvenida ÚNICAMENTE para usuarios NUEVOS
  useEffect(() => {
    // 1. Esperar a que la autenticación y la carga del perfil hayan finalizado completamente
    if (!authInitialized || loading || !currentUser) {
      return;
    }

    // 2. IDENTIFICACIÓN SEGURA: Verificar antigüedad de la cuenta con created_at
    // Cuentas existentes o cuya antigüedad no pueda determinarse con certeza NUNCA reciben bienvenida automática
    if (!isNewUserAccount(currentUser)) {
      return;
    }

    refreshProgress();
    const p = loadIniciacionProgress(effectiveUserId, currentUser.user_metadata);

    // 3. Si la guía está activa o ya fue completada al 100%, no mostrar
    if (p.completed || isGuideActive()) {
      return;
    }

    // Si el usuario descartó el modal y no tiene pasos pendientes guardados
    if (p.dismissedWelcome && (p.currentStepIndex === 0 || !p.currentStepIndex)) {
      return;
    }

    // 4. Guard de sesión: presentarlo una sola vez sin repetirlo al cambiar de módulo o actualizar página
    const sessionKey = `cielo_iniciacion_welcome_prompted_${effectiveUserId}`;
    if (sessionStorage.getItem(sessionKey)) {
      return;
    }

    // Programar la aparición suave tras completar el acceso
    const timer = setTimeout(() => {
      if (!isGuideActive()) {
        sessionStorage.setItem(sessionKey, '1');
        setShowWelcome(true);
        const isResuming = p.currentStepIndex > 0;
        const audioUrl = resolveAudioUrl(undefined, undefined, 'iniciacion_welcome');
        const textToSpeak = isResuming
          ? `Tienes tu recorrido interactivo guardado en la Etapa ${p.currentStage || 1}. ¿Deseas continuar donde lo dejaste?`
          : 'Te acompañaremos paso a paso en una experiencia interactiva para que aprendas a utilizar las funciones fundamentales de CIELO.';
        voiceNarrator.speak(
          textToSpeak,
          audioUrl,
          { stepKey: isResuming ? 'modal_resume' : 'modal_welcome' }
        );
      }
    }, 1500);

    return () => clearTimeout(timer);
  }, [authInitialized, loading, currentUser, effectiveUserId, refreshProgress]);

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
    dismissIniciacionWelcome(effectiveUserId);
    refreshProgress();
    const stepToStart = progress.completed ? 0 : (progress.currentStepIndex || 0);
    
    // Navegación contextual según el paso guardado
    if (stepToStart === 0) {
      navigate('/inicio');
    } else if (stepToStart >= 1 && stepToStart <= 3) {
      navigate('/cursos');
    }
    setTimeout(() => {
      startGuide('iniciacion', stepToStart, effectiveUserId);
    }, 220);
  };

  const handleDismissWelcome = () => {
    setShowWelcome(false);
    voiceNarrator.stop();
    dismissIniciacionWelcome(effectiveUserId);
    refreshProgress();
  };

  const handleCloseCelebration = () => {
    setShowCelebration(false);
    voiceNarrator.stop();
  };

  // Bloquear scroll de fondo y soportar tecla Escape en el modal de bienvenida
  useEffect(() => {
    if (!showWelcome) return;

    document.body.style.overflow = 'hidden';
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleDismissWelcome();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [showWelcome, handleDismissWelcome]);

  const handleRestartTour = () => {
    setShowCelebration(false);
    voiceNarrator.stop();
    resetIniciacionProgress(effectiveUserId);
    navigate('/inicio');
    setTimeout(() => {
      startGuide('iniciacion', 0, effectiveUserId, true);
    }, 220);
  };

  return (
    <>
      {/* Modal de Bienvenida e Invitación (Minimalista, sin tarjetas anidadas) */}
      {showWelcome && (
        <div
          className="fixed inset-0 z-100 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 sm:p-6 animate-in fade-in duration-200"
          onClick={handleDismissWelcome}
        >
          <div
            className="relative w-full max-w-xl bg-white border border-(--border-soft) rounded-[20px] shadow-xl p-6 sm:p-8 animate-in zoom-in-95 duration-200 flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Botón cerrar en esquina superior derecha */}
            <button
              type="button"
              onClick={handleDismissWelcome}
              className="absolute top-4 right-4 sm:top-5 sm:right-5 p-2 rounded-full text-[#5F665E] hover:text-[#2E3330] hover:bg-[#F2EFE9] transition-colors cursor-pointer"
              aria-label="Cerrar bienvenida"
            >
              <X size={18} />
            </button>

            {/* Mensaje de bienvenida directo sobre fondo blanco, sin tarjetas anidadas */}
            <div className="pt-1 pb-6 pr-6">
              {progress.currentStepIndex > 0 ? (
                <>
                  <h3 className="text-lg font-black text-[#2E3330] font-notion-title mb-1.5">
                    Continuar guía de iniciación
                  </h3>
                  <p className="text-base sm:text-[15.5px] font-medium text-[#2E3330] leading-relaxed">
                    Tienes tu recorrido interactivo guardado en la Etapa {progress.currentStage || 1}. ¿Deseas continuar donde lo dejaste?
                  </p>
                </>
              ) : (
                <p className="text-base sm:text-[17px] font-medium text-[#2E3330] leading-relaxed">
                  Te acompañaremos paso a paso en una experiencia interactiva para que aprendas a utilizar las funciones fundamentales de CIELO.
                </p>
              )}
            </div>

            {/* Botones de acción */}
            <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
              <button
                type="button"
                onClick={handleStartTour}
                className="w-full sm:flex-1 h-11 rounded-full text-xs font-bold uppercase tracking-wider bg-[#2E3330] text-white hover:bg-black transition-all flex items-center justify-center gap-2 shadow-xs cursor-pointer select-none"
              >
                <Volume2 size={16} />
                <span>{progress.currentStepIndex > 0 ? 'Continuar recorrido' : 'Comenzar recorrido'}</span>
                <ArrowRight size={15} />
              </button>
              <button
                type="button"
                onClick={handleDismissWelcome}
                className="w-full sm:w-auto px-6 h-11 rounded-full text-xs font-bold uppercase tracking-wider text-[#5F665E] hover:bg-[#F2EFE9] border border-[rgba(46,51,48,0.12)] transition-all cursor-pointer select-none"
              >
                Hacerlo más tarde
              </button>
            </div>
          </div>
        </div>
      )}

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
