import React from 'react';
import { Routes, Route, useNavigate, useParams } from 'react-router-dom';
import type { 
  Actividad, Screen, NavExtra, 
  CalificacionActividad,
  AppState,
  Secuencia
} from './types';

const Inicio = React.lazy(() => import('./screens/Inicio'));
const Dashboard = React.lazy(() => import('./screens/Dashboard'));
const Cursos = React.lazy(() => import('./screens/Cursos'));
const CursoDetalle = React.lazy(() => import('./screens/CursoDetalle'));
const Incidencias = React.lazy(() => import('./screens/Incidencias'));
const Planificacion = React.lazy(() => import('./screens/Planificacion'));
const PlanificacionDiariaEditor = React.lazy(() => import('./screens/PlanificacionDiariaEditor'));
const Comunidad = React.lazy(() => import('./screens/Comunidad'));
const Rubrica = React.lazy(() => import('./screens/Rubrica'));
const Cotejo = React.lazy(() => import('./screens/Cotejo'));
const Estudiante = React.lazy(() => import('./screens/Estudiante'));
const CalificacionesAnuales = React.lazy(() => import('./screens/CalificacionesAnuales'));
const ProfileSettings = React.lazy(() => import('./screens/ProfileSettings'));
const ResetPassword = React.lazy(() => import('./screens/ResetPassword'));
const PrintBoletines = React.lazy(() => import('./screens/PrintBoletines'));
const Suscripcion = React.lazy(() => import('./screens/Suscripcion'));
import LoadingMessage from './components/LoadingMessage';
import { BookOpen } from 'lucide-react';
import { esRolAdministrador } from './utils/autorizacion';
import { useSupabaseData } from './hooks/useSupabaseData';

const CourseDetailRouteWrapper: React.FC<{
  setSelectedCursoId: (id: number | null) => void;
  renderCourseDetail: () => React.ReactElement;
}> = ({ setSelectedCursoId, renderCourseDetail }) => {
  const { id } = useParams<{ id: string }>();

  React.useEffect(() => {
    if (id) {
      const numId = Number(id);
      if (!isNaN(numId)) {
        setSelectedCursoId(numId);
      }
    }
  }, [id, setSelectedCursoId]);

  return renderCourseDetail();
};

const CalificacionesAnualesRouteWrapper: React.FC<{
  setSelectedCursoId: (id: number | null) => void;
  renderCalificacionesAnuales: (id: number) => React.ReactElement;
}> = ({ setSelectedCursoId, renderCalificacionesAnuales }) => {
  const { id } = useParams<{ id: string }>();
  const numId = Number(id);

  React.useEffect(() => {
    if (id && !isNaN(numId)) {
      setSelectedCursoId(numId);
    }
  }, [id, numId, setSelectedCursoId]);

  if (!id || isNaN(numId)) {
    return (
      <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 mt-4">
        <p className="text-slate-500">Selecciona un curso para ver el reporte anual.</p>
      </div>
    );
  }

  return renderCalificacionesAnuales(numId);
};

// Asegura que las secuencias del usuario estén cargadas antes de renderizar el editor
// de una planificación EXISTENTE (ruta /planificacion-diaria/:id). El editor conserva su
// lógica original; esta carga lazy es aislada y no afecta la ruta /planificacion-diaria/plantilla.
const PlanificacionDiariaExistenteWrapper: React.FC<{
  state: AppState;
  onUpdateSecuencia?: (seq: Secuencia) => Promise<void> | void;
  onAddSecuencia?: (seq: Omit<Secuencia, 'id'>) => Promise<Secuencia | null>;
}> = ({ state, onUpdateSecuencia, onAddSecuencia }) => {
  const { id } = useParams<{ id: string }>();
  const { loadPlanificacionData } = useSupabaseData(true);

  React.useEffect(() => {
    if (id && id !== 'plantilla') {
      loadPlanificacionData();
    }
  }, [id, loadPlanificacionData]);

  return (
    <PlanificacionDiariaEditor
      state={state}
      onUpdateSecuencia={onUpdateSecuencia}
      onAddSecuencia={onAddSecuencia}
    />
  );
};

interface AppRoutesProps {
  state: any;
  session: any;
  docenteNombre: string;
  selectedCursoId: number | null;
  selectedEstudianteId: number | null;
  setSelectedCursoId: (id: number | null) => void;
  setSelectedEstudianteId: (id: number | null) => void;
  currentCourseRole: any;
  visibleActividades: Actividad[];
  visibleCalificaciones: CalificacionActividad[];
  onlineUsers: any[];
  currentUserProfile: any;
  
  // Actions
  addActividad: any;
  updateActividad: any;
  deleteActividad: any;
  saveCalificaciones: any;
  saveRecuperacionCotejo: any;
  addCurso: any;
  deleteCurso: any;
  saveCurso: any;
  toggleDocenteCurso: any;
  updateDocenteAsignatura: any;
  updateDocenteDias: any;
  addEstudiante: any;
  updateEstudiante: any;
  deleteEstudiante: any;
  addIncidencia: any;
  deleteIncidencia: any;
  addSecuencia: any;
  updateSecuencia: any;
  deleteSecuencia: any;
  addPost: any;
  importResource: any;
  reportPost: any;
  deletePost: any;
  refresh: any;
  syncDelete: any;
  sendNotification: any;
  uploadAvatar: any;
  updateFullProfile: any;
  updateAvatarColor: any;
  updatePerfilProfesional: any;
  updateCentro: any;
  createCentro: any;
  cambiarCentro: any;
  updateInstitutoName: any;
  resetSchoolYear: any;
  saveRubrica: any;
  updateDescriptor: any;
  updateNivelesPuntaje: any;
  saveCotejo: any;
  updateCriterios: any;
    savePlantilla: any;
    updatePlantilla: any;
    deletePlantilla: any;
  onLogout: () => void;
}

const AppRoutes: React.FC<AppRoutesProps> = ({
  state, session, docenteNombre, 
  selectedCursoId, selectedEstudianteId,
  setSelectedCursoId, setSelectedEstudianteId,
  currentCourseRole, visibleActividades, visibleCalificaciones,
  onlineUsers, currentUserProfile,
  addActividad, updateActividad, deleteActividad, saveCalificaciones, saveRecuperacionCotejo,
  addCurso, deleteCurso, saveCurso, toggleDocenteCurso, updateDocenteAsignatura, updateDocenteDias,
  addEstudiante, updateEstudiante, deleteEstudiante,
  addIncidencia, deleteIncidencia,
  addSecuencia, updateSecuencia, deleteSecuencia,
  addPost, reportPost, importResource, deletePost,
  refresh, syncDelete, sendNotification,
  uploadAvatar, updateFullProfile, updateAvatarColor, updatePerfilProfesional,
  updateCentro, createCentro, cambiarCentro, updateInstitutoName, resetSchoolYear,
  saveRubrica, updateDescriptor, updateNivelesPuntaje,
    saveCotejo, updateCriterios, savePlantilla, updatePlantilla, deletePlantilla,
  onLogout
}) => {
  const navigate = useNavigate();

  // Defensa en profundidad: un rol administrativo nunca debe renderizar el
  // entorno docente, aunque se acceda por URL directa. App.tsx ya redirige a
  // CentroPanel; esto evita cualquier ruta que se abra saltando el Layout.
  // Modelo binario: SOLO 'administrador' en perfiles.rol confiere rol; el
  // resto (docente, roles legados, ausente) se trata como docente.
  const esAdministrador = esRolAdministrador(currentUserProfile?.rol);
  if (esAdministrador) {
    return (
      <div className="p-12 text-center bg-white rounded-3xl border-2 border-dashed border-rose-200 max-w-md mx-auto mt-10">
        <h2 className="text-xl font-bold text-rose-800">Acceso restringido</h2>
        <p className="text-slate-600 mt-2">
          Tu perfil tiene un rol administrativo del centro. Los módulos docentes 
          no están disponibles; gestiona el centro desde Centro Panel.
        </p>
      </div>
    );
  }

  const handleNavigate = (s: Screen, extra?: NavExtra) => {
    if (extra?.cursoId !== undefined) setSelectedCursoId(extra.cursoId as number);
    if (extra?.estudianteId !== undefined) setSelectedEstudianteId(extra.estudianteId as number);
    navigate(s === 'inicio' ? '/' : `/${s}`);
  };

  const handleViewProfile = (e: React.MouseEvent, userId?: string) => {
    e.preventDefault();
    e.stopPropagation();
    window.dispatchEvent(new CustomEvent('show-profile', { 
      detail: { userId, from: 'comunidad' } 
    }));
  };

  const renderCourseDetail = () => {
    if (selectedCursoId === null) {
      return (
        <div className="flex flex-col items-center justify-center p-12 text-center bg-white rounded-3xl border-2 border-dashed border-slate-200">
          <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4 text-slate-300">
             <BookOpen size={32} />
          </div>
          <h2 className="text-xl font-bold text-slate-800">Curso no seleccionado</h2>
          <p className="text-slate-500 max-w-md mt-2">Por favor, selecciona uno desde la lista de cursos.</p>
          <button onClick={() => navigate('/cursos')} className="mt-6 px-6 py-2 bg-slate-900 text-white rounded-xl font-bold">
            Ir a Cursos
          </button>
        </div>
      );
    }
    const cursoExistente = state.cursos.find((c: any) => c.id === selectedCursoId);
    if (!cursoExistente) return (
       <div className="p-12 text-center bg-rose-50 rounded-3xl border-2 border-dashed border-rose-200">
          <h2 className="text-xl font-bold text-rose-800">Curso no encontrado</h2>
          <button onClick={() => navigate('/cursos')} className="mt-4 text-rose-600 font-bold underline">Volver a Cursos</button>
       </div>
    );
    return (
      <CursoDetalle
        currentCourseRole={currentCourseRole || undefined}
        cursoId={selectedCursoId}
        currentUserId={session?.user?.id}
        onSaveCurso={saveCurso}
        onAddEstudiante={addEstudiante}
        onUpdateEstudiante={updateEstudiante}
        onDeleteEstudiante={deleteEstudiante}
        onAddActividad={addActividad}
        onUpdateActividad={updateActividad}
        onDeleteActividad={deleteActividad}
        onSaveCalificaciones={saveCalificaciones}
        onSaveRecuperacionCotejo={saveRecuperacionCotejo}
        onToggleDocenteCurso={(cId, tUid, r, a) => toggleDocenteCurso(cId, tUid, r, a, sendNotification, syncDelete)}
      />
    );
  };

  return (
    <React.Suspense fallback={
      <div className="flex flex-col items-center justify-center p-20 text-center">
        <LoadingMessage />
      </div>
    }>
      <Routes>
      <Route path="/" element={<Inicio onAddActividad={addActividad} docenteNombre={docenteNombre} onUpdateInstituto={updateInstitutoName} currentCourseRole={currentCourseRole} />} />
      <Route path="/dashboard" element={<Dashboard docenteNombre={docenteNombre} />} />
      <Route path="/cursos" element={
        <Cursos 
          onAddCurso={addCurso} 
          onDeleteCurso={deleteCurso} 
          selectedCursoId={selectedCursoId}
          onSelectCurso={setSelectedCursoId}
          onSaveAsignatura={updateDocenteAsignatura}
          onSaveDias={updateDocenteDias}
          onToggleDocenteCurso={(cId, tUid, r, a) => toggleDocenteCurso(cId, tUid, r, a, sendNotification, syncDelete)}
        />
      } />
      <Route path="/curso-detalle" element={renderCourseDetail()} />
      <Route path="/curso-detalle/:id" element={<CourseDetailRouteWrapper setSelectedCursoId={setSelectedCursoId} renderCourseDetail={renderCourseDetail} />} />
      <Route path="/print-boletines/:cursoId" element={<PrintBoletines state={state} docenteNombre={docenteNombre} />} />
      <Route path="/incidencias" element={<Incidencias state={state} onAddIncidencia={addIncidencia} onDeleteIncidencia={deleteIncidencia} />} />
      <Route path="/planificacion" element={<Planificacion onAddSecuencia={addSecuencia} onUpdateSecuencia={updateSecuencia} onDeleteSecuencia={deleteSecuencia} />} />
      <Route path="/planificacion-diaria/plantilla" element={<PlanificacionDiariaEditor state={state} onUpdateSecuencia={updateSecuencia} onAddSecuencia={addSecuencia} />} />
      <Route path="/planificacion-diaria/:id" element={<PlanificacionDiariaExistenteWrapper state={state} onUpdateSecuencia={updateSecuencia} onAddSecuencia={addSecuencia} />} />
      <Route path="/comunidad" element={
        <Comunidad
          onAddPost={addPost}
          onReportPost={reportPost}
          onDeletePost={deletePost}
          onRefresh={refresh}
          onImportResource={importResource}
          onViewProfile={handleViewProfile}
          onlineUsers={onlineUsers}
        />
      } />
      <Route path="/rubrica" element={
        <Rubrica 
          currentCourseRole={currentCourseRole || undefined}
          onSaveRubrica={saveRubrica}
          onUpdateDescriptor={updateDescriptor}
          onUpdateNivelesPuntaje={updateNivelesPuntaje}
          onSavePlantilla={savePlantilla}
          onUpdatePlantilla={updatePlantilla}
          onDeletePlantilla={deletePlantilla}
        />
      } />
      <Route path="/cotejo" element={
        <Cotejo 
          state={{ ...state, actividades: visibleActividades, calificaciones: visibleCalificaciones }} 
          currentCourseRole={currentCourseRole || undefined}
          onSaveCotejo={saveCotejo}
          onUpdateCriterios={updateCriterios}
          onSavePlantilla={savePlantilla}
          onUpdatePlantilla={updatePlantilla}
          onDeletePlantilla={deletePlantilla}
        />
      } />
      <Route path="/estudiante" element={
        selectedEstudianteId ? (
          <Estudiante key={selectedEstudianteId} />
        ) : (
          <div className="p-12 text-center bg-white rounded-3xl border-2 border-dashed border-slate-200">
             <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">
               <span className="material-symbols-outlined text-3xl">person_search</span>
             </div>
             <h3 className="text-lg font-bold text-slate-800">No has seleccionado un estudiante</h3>
             <p className="text-slate-500 mt-2 max-w-sm mx-auto">Selecciona uno desde un curso o usa el buscador para ver su perfil detallado.</p>
             <button onClick={() => navigate('/cursos')} className="mt-6 px-6 py-2 bg-slate-900 text-white rounded-xl font-bold">
               Ir a Cursos
             </button>
          </div>
        )
      } />
      <Route path="/estudiante/:id" element={<Estudiante />} />
      <Route path="/calificaciones-anuales" element={
        selectedCursoId !== null ? (
          <CalificacionesAnuales 
            state={{ ...state, actividades: visibleActividades, calificaciones: visibleCalificaciones }} 
            currentCourseRole={currentCourseRole || undefined}
            cursoId={selectedCursoId} 
            onNavigate={handleNavigate} 
          />
        ) : (
          <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 mt-4">
            <p className="text-slate-500">Selecciona un curso para ver el reporte anual.</p>
          </div>
        )
      } />
      <Route path="/calificaciones-anuales/:id" element={
        <CalificacionesAnualesRouteWrapper 
          setSelectedCursoId={setSelectedCursoId} 
          renderCalificacionesAnuales={(numId) => (
            <CalificacionesAnuales 
              state={{ ...state, actividades: visibleActividades, calificaciones: visibleCalificaciones }} 
              currentCourseRole={currentCourseRole || undefined}
              cursoId={numId} 
              onNavigate={handleNavigate} 
            />
          )}
        />
      } />
      <Route path="/ajustes" element={
            <ProfileSettings 
              session={session} 
              docenteNombre={docenteNombre} 
              perfilBio={currentUserProfile?.bio || currentUserProfile?.perfilBio || ''} 
              perfilAvatarUrl={currentUserProfile?.avatarUrl || ''} 
              instituto={state.instituto} 
              tipoInstitucion={state.tipoInstitucion} 
              asignaturas={state.asignaturas} 
              onUploadAvatar={uploadAvatar} 
              onUpdatePerfilProfesional={updatePerfilProfesional}
              onUpdateCentro={updateCentro}
              onCreateCentro={createCentro}
              onChangeCentro={cambiarCentro}
              onUpdateFullProfile={updateFullProfile} 
              onUpdateAvatarColor={updateAvatarColor} 
              perfilAvatarColor={currentUserProfile?.avatarColor || '#2D3436'} 
              onResetSchoolYear={resetSchoolYear} 
              onClose={() => navigate(-1)} 
              onLogout={onLogout}
              centro={currentUserProfile?.centro}
              centroId={currentUserProfile?.centro_id}
              centroNombre={currentUserProfile?.centro?.nombre}
            />
      } />
      <Route path="/suscripcion" element={<Suscripcion />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="*" element={
        <div className="p-8 text-center bg-amber-50 border border-amber-200 rounded-3xl text-amber-800">
          <p className="font-bold">La pantalla a la que intentas acceder no existe.</p> 
          <button onClick={() => navigate('/')} className="mt-4 text-amber-600 font-bold underline">Volver al inicio</button>
        </div>
      } />
      </Routes>
    </React.Suspense>
  );
};

export default AppRoutes;
