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
    const trialEndDate = new Date(createdDate.getTime() + 15 * 24 * 60 * 60 * 1000);
    const now = new Date();
    
    if (now < trialEndDate) {
      hasTrial = true;
      trialDaysLeft = Math.ceil((trialEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    }
  }

  const hasPremium = 
    (suscripcionActual && (suscripcionActual.estado === 'activa' || suscripcionActual.tipo === 'promocional')) ||
    hasTrial;

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
