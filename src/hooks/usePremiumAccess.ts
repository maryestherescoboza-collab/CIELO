import { useAppStore } from '../store/appStore';
import { useShallow } from 'zustand/react/shallow';
import { esRolAdministrador } from '../utils/autorizacion';

export function usePremiumAccess() {
  const { suscripcionActual, centroRolActual, perfilActual, session, loading } = useAppStore(
    useShallow((s) => {
      const userId = s.session?.user?.id;
      return {
        suscripcionActual: s.state.suscripcionActual,
        centroRolActual: s.state.centroRolActual,
        perfilActual: userId ? s.state.perfiles.find(p => p.userId === userId) : null,
        session: s.session,
        loading: s.loading
      };
    })
  );

  let hasTrial = false;
  let trialDaysLeft = 0;
  
  // Validamos si es docente y tiene un createdAt
  if (perfilActual?.createdAt && (!centroRolActual || centroRolActual.rol === 'docente')) {
    const createdDate = new Date(perfilActual.createdAt);
    const now = new Date();
    
    if (perfilActual.trial_extension_activated_at) {
      const extensionDate = new Date(perfilActual.trial_extension_activated_at);
      const trialEndDate = new Date(extensionDate.getTime() + 7 * 24 * 60 * 60 * 1000);
      
      if (now < trialEndDate) {
        hasTrial = true;
        trialDaysLeft = Math.ceil((trialEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      }
    } else {
      const trialEndDate = new Date(createdDate.getTime() + 15 * 24 * 60 * 60 * 1000);
      if (now < trialEndDate) {
        hasTrial = true;
        trialDaysLeft = Math.ceil((trialEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      }
    }
  }

  let hasValidSubscription = false;
  if (suscripcionActual) {
    if (suscripcionActual.estado === 'activa' || suscripcionActual.tipo === 'promocional') {
      hasValidSubscription = true;
    } else if (suscripcionActual.estado === 'cancelada' && suscripcionActual.fecha_fin) {
      const fechaFin = new Date(suscripcionActual.fecha_fin);
      if (new Date() < fechaFin) {
        hasValidSubscription = true;
      }
    }
  }

  const hasPremium = hasValidSubscription || hasTrial;

  // Cualquiera de los 4 roles administrativos confiere gestión de centro.
  const isDirector = 
    !!centroRolActual &&
    esRolAdministrador(centroRolActual.rol);

  const isLoadingSuscripcion = !!session && !perfilActual && loading;

  return {
    hasPremium,
    isDirector,
    suscripcionActual,
    centroRolActual,
    hasTrial,
    trialDaysLeft,
    isLoadingSuscripcion
  };
}
