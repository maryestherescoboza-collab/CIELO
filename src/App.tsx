import { useMemo, useEffect } from 'react';
import { useNavigate, useLocation, Routes, Route } from 'react-router-dom';
import './index.css';
import Layout from './components/Layout';
import Auth from './screens/Auth';
import ResetPassword from './screens/ResetPassword';
import AppRoutes from './AppRoutes';
import Landing from './screens/Landing';
import ConfirmarCorreo from './screens/ConfirmarCorreo';
import { ErrorBoundary } from './components/ErrorBoundary';
import NotificationsOverlay from './components/NotificationsOverlay';
import InvitationModal from './components/courses/InvitationModal';
import { FloatingRubricManager } from './components/FloatingRubricManager';
import { PresentationProvider } from './contexts/PresentationContext';
import LoadingMessage from './components/LoadingMessage';
import { useSupabaseData } from './hooks/useSupabaseData';
import { useSupabaseAuth } from './hooks/useSupabaseAuth';
import { supabase } from './lib/supabase';
import logo from './assets/logo.png';
import { useCourseActions } from './hooks/useCourseActions';
import { useStudentActions } from './hooks/useStudentActions';
import { useProfileActions } from './hooks/useProfileActions';
import { useEvaluationActions } from './hooks/useEvaluationActions';
import { useNotificationActions } from './hooks/useNotificationActions';
import { useIncidenciaActions } from './hooks/useIncidenciaActions';
import { useSecuenciaActions } from './hooks/useSecuenciaActions';
import PortalApp from './screens/Portal/PortalApp';
import { usePostActions } from './hooks/usePostActions';
import { useTareaActions } from './hooks/useTareaActions';
import { useCentroActions } from './hooks/useCentroActions';
import CentroPanel from './screens/CentroPanel';
import { useAppStore } from './store/appStore';
import { useAppInitialization } from './hooks/useAppInitialization';
import { usePendingCentro } from './hooks/usePendingCentro';
import { usePendingVinculo } from './hooks/usePendingVinculo';
import { useShallow } from 'zustand/react/shallow';
import { analizarRolAcceso } from './utils/autorizacion';
import { PORTAL_FAMILIA_ENABLED } from './config/features';

export default function App() {
  useSupabaseAuth();

  const { 
    state, loading, session, authInitialized,
    selectedCursoId, setSelectedCursoId,
    selectedEstudianteId, setSelectedEstudianteId,
    setSearchQuery,
    genericToast
  } = useAppStore(useShallow(s => ({
    state: s.state,
    loading: s.loading,
    session: s.session,
    authInitialized: s.authInitialized,
    selectedCursoId: s.selectedCursoId,
    setSelectedCursoId: s.setSelectedCursoId,
    selectedEstudianteId: s.selectedEstudianteId,
    setSelectedEstudianteId: s.setSelectedEstudianteId,
    setSearchQuery: s.setSearchQuery,
    genericToast: s.genericToast
  })));

  const actions = {
    ...useCourseActions(),
    ...useStudentActions(),
    ...useProfileActions(),
    ...useEvaluationActions(),
    ...useIncidenciaActions(),
    ...useSecuenciaActions(),
    ...usePostActions(),
    ...useNotificationActions(),
    ...useTareaActions(),
    ...useCentroActions(),
    ...useSupabaseData()
  };

  const navigate = useNavigate();
  const { DOCENTE, currentUserProfile, onlineUsers } = useAppInitialization({ 
    state, session 
  });
  usePendingCentro(session, () => actions.refresh());
  usePendingVinculo(session, () => actions.refresh());

  const currentCourseRole = useMemo(() => {
    if (!selectedCursoId || !session?.user?.id) return null;
    const linked = state.cursoDocentes.find(cd => cd.cursoId === selectedCursoId && cd.userId === session.user.id);
    if (linked) return linked;
    const curso = state.cursos.find(c => c.id === selectedCursoId);
    if (curso && curso.userId === session.user.id) {
      return { id: -1, cursoId: selectedCursoId, userId: session.user.id, rol: 'tutor' as const, asignatura: curso.asignatura, createdAt: curso.createdAt };
    }
    return null;
  }, [selectedCursoId, session?.user?.id, state.cursoDocentes, state.cursos]);

  const visibleActividades = useMemo(() => {
    const isMine = (a: any) => a.userId === session?.user?.id || !a.userId;
    if (!selectedCursoId) return state.actividades.filter(isMine);
    const baseFilter = (a: any) => a.cursoId === selectedCursoId && isMine(a);
    if (!currentCourseRole || currentCourseRole.rol === 'tutor') return state.actividades.filter(baseFilter);
    return state.actividades.filter((a: any) => baseFilter(a) && a.asignatura === currentCourseRole.asignatura);
  }, [state.actividades, selectedCursoId, currentCourseRole, session?.user?.id]);

  const visibleCalificaciones = useMemo(() => {
    const baseFilter = (c: any) => c.cursoId === selectedCursoId;
    if (!currentCourseRole || currentCourseRole.rol === 'tutor') return state.calificaciones.filter(baseFilter);
    return state.calificaciones.filter((c: any) => baseFilter(c) && c.asignatura === currentCourseRole.asignatura);
  }, [state.calificaciones, selectedCursoId, currentCourseRole]);

  const activeInstituto = useMemo(() => {
    if (selectedCursoId) {
      const tutorRel = state.cursoDocentes.find(cd => cd.cursoId === selectedCursoId && cd.rol === 'tutor');
      const tutorId = tutorRel?.userId || state.cursos.find(c => c.id === selectedCursoId)?.userId;
      if (tutorId) {
        const tutorProfile = state.perfiles.find(p => p.userId === tutorId);
        if (tutorProfile?.centro?.nombre) {
          return tutorProfile.centro.nombre;
        }
      }
    }
    const inst = state.instituto || 'Instituto Central';
    return typeof inst === 'string' ? inst : 'Instituto Central';
  }, [selectedCursoId, state.cursoDocentes, state.cursos, state.perfiles, state.instituto]);

  const location = useLocation();
  const pathname = location.pathname;

  // Redirigir a inicio si el usuario está autenticado y sigue en /login o /auth
  useEffect(() => {
    if (session && authInitialized && (pathname === '/login' || pathname === '/auth')) {
      navigate('/', { replace: true });
    }
  }, [session, authInitialized, pathname, navigate]);

  if (!authInitialized) return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center bg-(--paper)">
      <img src={logo} alt="Logo" className="app-logo w-44 h-44 mb-8 animate-pulse" />
      <LoadingMessage />
    </div>
  );

  if (session && loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center bg-(--paper)">
      <img src={logo} alt="Logo" className="app-logo w-44 h-44 mb-8 animate-pulse" />
      <LoadingMessage />
    </div>
  );
  if (pathname === '/confirmar' || pathname === '/auth/confirm') {
    return <ConfirmarCorreo />;
  }

  if (!session) {
    if (pathname === '/') {
      return <Landing />;
    }
    if (pathname === '/reset-password') {
      return <ResetPassword />;
    }
    if (PORTAL_FAMILIA_ENABLED && pathname.startsWith('/portal/')) {
      return (
        <Routes>
          <Route path="/portal/:token/*" element={<PortalApp />} />
        </Routes>
      );
    }
    return <Auth onAuthSuccess={() => actions.refresh()} />;
  }

  const isPrintView = pathname.startsWith('/print-boletines');

  // Entorno independiente para usuarios con ROL administrativo ('administrador').
  // Modelo binario: la ÚNICA fuente de verdad es perfiles.rol. el rol se deduce
  // EXCLUSIVAMENTE de perfiles.rol === 'administrador'; NUNCA de la presencia
  // de centro_id y NUNCA de centro_roles. Un rol inválido o ausente se trata
  // como no administrativo (flujo docente por defecto).
  const esUsuarioCentro = analizarRolAcceso({ perfil: currentUserProfile })?.rol === 'administrador';

  if (esUsuarioCentro) {
    return (
      <ErrorBoundary>
        <CentroPanel onLogout={() => supabase.auth.signOut()} />
      </ErrorBoundary>
    );
  }

  if (isPrintView) {
    return (
      <ErrorBoundary>
        <AppRoutes 
          {...actions}
          state={{ ...state, instituto: activeInstituto }} 
          session={session} 
          docenteNombre={DOCENTE}
          selectedCursoId={selectedCursoId}
          selectedEstudianteId={selectedEstudianteId}
          setSelectedCursoId={setSelectedCursoId}
          setSelectedEstudianteId={setSelectedEstudianteId}
          currentCourseRole={currentCourseRole}
          visibleActividades={visibleActividades}
          visibleCalificaciones={visibleCalificaciones}
          onlineUsers={onlineUsers}
          currentUserProfile={currentUserProfile}
          onLogout={() => supabase.auth.signOut()}
        />
      </ErrorBoundary>
    );
  }

  return (
    <PresentationProvider>
      <Layout
      onResetSchoolYear={actions.resetSchoolYear}
      onLogout={() => supabase.auth.signOut()}
      onUpdateBio={actions.updateBio}
      onUploadAvatar={actions.uploadAvatar}
      onMarkNotifyRead={actions.markAsRead}
      onCompleteTarea={actions.completeTarea}
      onOpenSettings={() => navigate('/ajustes')}
      onSelectSearchResult={(type, id) => {
        setSearchQuery('');
        if (type === 'estudiante') { setSelectedEstudianteId(id); navigate('/estudiante'); }
        else if (type === 'curso') { setSelectedCursoId(id); navigate('/curso-detalle'); }
        else if (type === 'actividad') {
          const act = state.actividades.find(a => a.id === id);
          if (act) { setSelectedCursoId(act.cursoId); navigate('/curso-detalle'); }
        }
      }}
    >
      <ErrorBoundary>
        <AppRoutes 
          {...actions}
          state={{ ...state, instituto: activeInstituto }} 
          session={session} 
          docenteNombre={DOCENTE}
          selectedCursoId={selectedCursoId}
          selectedEstudianteId={selectedEstudianteId}
          setSelectedCursoId={setSelectedCursoId}
          setSelectedEstudianteId={setSelectedEstudianteId}
          currentCourseRole={currentCourseRole}
          visibleActividades={visibleActividades}
          visibleCalificaciones={visibleCalificaciones}
          onlineUsers={onlineUsers}
          currentUserProfile={currentUserProfile}
          onLogout={() => supabase.auth.signOut()}
        />
      </ErrorBoundary>

      <NotificationsOverlay 
        genericToast={genericToast} 
      />

      <FloatingRubricManager />

      <InvitationModal 
        session={session}
        currentUserProfile={currentUserProfile || null}
        onRefresh={() => actions.refresh()}
      />
    </Layout>
    </PresentationProvider>
  );
}
