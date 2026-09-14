import { useEffect, useState } from 'react';
import { Routes, Route, useNavigate, Navigate } from 'react-router-dom';
import PortalAuth from './PortalAuth';
import PortalEstudiante from './PortalEstudiante';
import PortalFichas from './PortalFichas';
import { PORTAL_FAMILIA_ENABLED } from '../../config/features';

import PortalLayout from './PortalLayout';
import './PortalStyles.css';

export default function PortalApp() {
  const navigate = useNavigate();
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

  if (isAuthenticated === null) return null;

  return (
    <Routes>
      {!isAuthenticated ? (
        <Route path="*" element={<PortalAuth onLogin={() => setIsAuthenticated(true)} />} />
      ) : (
        <Route element={<PortalLayout />}>
          <Route path="estudiante" element={<PortalEstudiante />} />
          <Route path="fichas" element={<PortalFichas />} />
          <Route path="*" element={<Navigate to="estudiante" replace />} />
        </Route>
      )}
    </Routes>
  );
}
