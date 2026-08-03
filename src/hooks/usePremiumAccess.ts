import { useAppStore } from '../store/appStore';
import { useShallow } from 'zustand/react/shallow';

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

  const isDirector = 
    centroRolActual && 
    (centroRolActual.rol === 'director' || centroRolActual.rol === 'administrador');

  return {
    hasPremium,
    isDirector,
    suscripcionActual,
    centroRolActual
  };
}
