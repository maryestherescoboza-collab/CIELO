import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import './index.css';
import Layout from './components/Layout';
import Auth from './screens/Auth';
import ResetPassword from './screens/ResetPassword';
import RegistroCentro from './screens/Registration/RegistroCentro';
import RegistroDocente from './screens/Registration/RegistroDocente';
import AppRoutes from './AppRoutes';
import Landing from './screens/Landing';
import { ErrorBoundary } from './components/ErrorBoundary';
import NotificationsOverlay from './components/NotificationsOverlay';
import InvitationModal from './components/courses/InvitationModal';
import { FloatingRubricManager } from './components/FloatingRubricManager';
import { useSupabaseData } from './hooks/useSupabaseData';
import { supabase } from './lib/supabase';
import logo from './assets/logo.png';
import { useCourseActions } from './hooks/useCourseActions';
import { useStudentActions } from './hooks/useStudentActions';
import { useProfileActions } from './hooks/useProfileActions';
import { useEvaluationActions } from './hooks/useEvaluationActions';
import { useNotificationActions } from './hooks/useNotificationActions';
import { useIncidenciaActions } from './hooks/useIncidenciaActions';
import { useSecuenciaActions } from './hooks/useSecuenciaActions';
import { usePostActions } from './hooks/usePostActions';
import { useTareaActions } from './hooks/useTareaActions';
import CentroPanel from './screens/CentroPanel';
import { useAppStore } from './store/appStore';
import { useAppInitialization } from './hooks/useAppInitialization';
import { useShallow } from 'zustand/react/shallow';

export default function App() {
  const { 
    state, loading, session, 
    selectedCursoId, setSelectedCursoId,
    selectedEstudianteId, setSelectedEstudianteId,
    setSearchQuery,
    genericToast
  } = useAppStore(useShallow(s => ({
    state: s.state,
    loading: s.loading,
    session: s.session,
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
    ...useSupabaseData()
  };

  const navigate = useNavigate();
  const { DOCENTE, currentUserProfile, onlineUsers } = useAppInitialization({ 
    state, session 
  });

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
    if (!selectedCursoId) return state.actividades;
    const baseFilter = (a: any) => a.cursoId === selectedCursoId;
    if (!currentCourseRole || currentCourseRole.rol === 'tutor') return state.actividades.filter(baseFilter);
    return state.actividades.filter((a: any) => baseFilter(a) && a.asignatura === currentCourseRole.asignatura);
  }, [state.actividades, selectedCursoId, currentCourseRole]);

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
    return state.instituto || 'Instituto Central';
  }, [selectedCursoId, state.cursoDocentes, state.cursos, state.perfiles, state.instituto]);

  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center bg-(--paper)">
      <img src={logo} alt="Logo" className="app-logo w-44 h-44 mb-8 animate-pulse" />
      <h2 className="text-2xl font-black text-(--ink)">Preparando tu espacio de trabajo</h2>
    </div>
  );

  const pathname = window.location.pathname;
  const isRegistroPath = pathname.startsWith('/registro/');
  const onboardingPlan = localStorage.getItem('onboardingPlan');

  if (isRegistroPath) {
    if (pathname === '/registro/centro' || onboardingPlan === 'institucional') {
      return <RegistroCentro onAuthSuccess={() => actions.refresh()} />;
    }
    return <RegistroDocente onAuthSuccess={() => actions.refresh()} />;
  }

  if (!session) {
    if (pathname === '/') {
      return <Landing />;
    }
    if (pathname === '/reset-password') {
      return <ResetPassword />;
    }
    return <Auth onAuthSuccess={() => actions.refresh()} />;
  }

  const isPrintView = window.location.pathname.startsWith('/print-boletines');

  // Entorno independiente para usuarios con ROL: CENTRO (director/administrador)
  const esUsuarioCentro = !!state.centroRolActual &&
    ['director', 'administrador'].includes(state.centroRolActual.rol) &&
    !!currentUserProfile?.centro_id;

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
        />
      </ErrorBoundary>
    );
  }

  return (
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
  );
}
