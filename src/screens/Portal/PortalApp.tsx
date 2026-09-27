import { useEffect, useState } from 'react';
import { Routes, Route, useNavigate, useParams, Navigate } from 'react-router-dom';
import PortalAuth from './PortalAuth';
import PortalEstudiante from './PortalEstudiante';
import PortalFichas from './PortalFichas';
import PortalFichaDetalle from './PortalFichaDetalle';
import PortalRuta from './PortalRuta';
import PortalRecuperaciones from './PortalRecuperaciones';
import { PORTAL_FAMILIA_ENABLED } from '../../config/features';
import { Loader2 } from 'lucide-react';

import PortalLayout from './PortalLayout';
import { rutaPortal } from './portalContext';
import './PortalStyles.css';

export default function PortalApp() {
  const navigate = useNavigate();
  const { token } = useParams<{ token: string }>();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    if (!PORTAL_FAMILIA_ENABLED) {
      navigate('/inicio');
      return;
    }

    const session = sessionStorage.getItem('portal_session');
    if (session) {
      setIsAuthenticated(true);
    } else {
      setIsAuthenticated(false);
    }
  }, [navigate]);

  // Antes esto devolvia `null` mientras se leia sessionStorage: un ciclo de
  // render sin pintar nada. Es una pantalla en blanco, no una carga.
  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6">
        <Loader2 className="animate-spin text-stone-900" size={32} />
        <p className="text-stone-600 text-sm font-semibold mt-4">Cargando...</p>
      </div>
    );
  }

  return (
    <Routes>
      {!isAuthenticated ? (
        <Route path="*" element={<PortalAuth onLogin={() => setIsAuthenticated(true)} />} />
      ) : (
        <Route element={<PortalLayout />}>
          <Route path="estudiante" element={<PortalEstudiante />} />
          <Route path="recuperaciones" element={<PortalRecuperaciones />} />
          <Route path="fichas" element={<PortalFichas />} />
          <Route path="fichas/:id" element={<PortalFichaDetalle />} />
          <Route path="fichas/:id/ruta/:rutaId" element={<PortalRuta />} />
          {/* ABSOLUTO a proposito. Este `*` cuelga de `/portal/:token/*`, y en
              react-router un `Navigate` relativo se resuelve contra el pathname
              COMPLETO del match con splat. Con `to="estudiante"` relativo cada
              redirect vuelve a caer en este mismo `*` y se encadena
              `/estudiante/estudiante/...` sin limite, pintando solo el
              `<Navigate>` (que devuelve null) en cada vuelta: pantalla en
              blanco con la URL creciendo. */}
          <Route path="*" element={<Navigate to={rutaPortal(token ?? '', 'estudiante')} replace />} />
        </Route>
      )}
    </Routes>
  );
}
