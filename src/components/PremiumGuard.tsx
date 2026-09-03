import { Navigate, Outlet } from 'react-router-dom';
import { usePremiumAccess } from '../hooks/usePremiumAccess';
import { useAppStore } from '../store/appStore';
import LoadingMessage from './LoadingMessage';

export default function PremiumGuard() {
  const loading = useAppStore((s) => s.loading);
  const authInitialized = useAppStore((s) => s.authInitialized);
  const { hasPremium } = usePremiumAccess();

  // Aún no terminó de cargar la información de suscripción: NO redirigir.
  if (loading || !authInitialized) {
    return (
      <div className="flex flex-col items-center justify-center p-20 text-center">
        <LoadingMessage />
      </div>
    );
  }

  // Carga terminada y confirmado que no existe una suscripción válida.
  if (!hasPremium) {
    return <Navigate to="/suscripcion" replace />;
  }

  return <Outlet />;
}
