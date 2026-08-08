import { useAppStore } from '../store/appStore';
import { useShallow } from 'zustand/react/shallow';
import { esRolAdministrador } from '../utils/autorizacion';

export function usePremiumAccess() {
  const { suscripcionActual, centroRolActual } = useAppStore(
    useShallow((s) => ({
      suscripcionActual: s.state.suscripcionActual,
      centroRolActual: s.state.centroRolActual,
    }))
  );

  const hasPremium = 
    suscripcionActual && 
    (suscripcionActual.estado === 'activa' || suscripcionActual.tipo === 'promocional');

  // Cualquiera de los 4 roles administrativos confiere gestión de centro.
  const isDirector = 
    !!centroRolActual &&
    esRolAdministrador(centroRolActual.rol);

  return {
    hasPremium,
    isDirector,
    suscripcionActual,
    centroRolActual
  };
}
