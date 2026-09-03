import { useEffect, useState } from 'react';
import { Routes, Route, useNavigate, Navigate } from 'react-router-dom';
import PortalAuth from './PortalAuth';
import PortalDashboard from './PortalDashboard';
import PortalAsignatura from './PortalAsignatura';
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
          <Route path="dashboard" element={<PortalDashboard />} />
          <Route path="asignatura/:asignaturaId" element={<PortalAsignatura />} />
          <Route path="*" element={<Navigate to="dashboard" replace />} />
        </Route>
      )}
    </Routes>
  );
}
