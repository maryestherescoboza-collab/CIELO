import React from 'react';
import { Routes, Route, useNavigate, useParams } from 'react-router-dom';
import type { 
  Actividad, Screen, NavExtra, 
  CalificacionActividad
} from './types';

import Inicio from './screens/Inicio';
import Dashboard from './screens/Dashboard';
import Cursos from './screens/Cursos';
import CursoDetalle from './screens/CursoDetalle';
import Incidencias from './screens/Incidencias';
import Planificacion from './screens/Planificacion';
import Comunidad from './screens/Comunidad';
import Rubrica from './screens/Rubrica';
import Cotejo from './screens/Cotejo';
import Estudiante from './screens/Estudiante';
import CalificacionesAnuales from './screens/CalificacionesAnuales';
import ProfileSettings from './screens/ProfileSettings';
import ResetPassword from './screens/ResetPassword';
import PrintBoletines from './screens/PrintBoletines';
import Suscripcion from './screens/Suscripcion';
import { BookOpen } from 'lucide-react';

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
  addCurso: any;
  deleteCurso: any;
  saveCurso: any;
  toggleDocenteCurso: any;
  addEstudiante: any;
  updateEstudiante: any;
  deleteEstudiante: any;
  addIncidencia: any;
  deleteIncidencia: any;
  addSecuencia: any;
  updateSecuencia: any;
  deleteSecuencia: any;
  addPost: any;
  togglePostLike: any;
  importResource: any;
  reportPost: any;
  deletePost: any;
  refresh: any;
  syncDelete: any;
  sendNotification: any;
  uploadAvatar: any;
  updateProfessionalProfile: any;
  updateFullProfile: any;
  updateAvatarColor: any;
  updateInstitutoName: any;
  resetSchoolYear: any;
  saveRubrica: any;
  updateDescriptor: any;
  updateNivelesPuntaje: any;
  saveCotejo: any;
  updateCriterios: any;
  savePlantilla: any;
  deletePlantilla: any;
}

const AppRoutes: React.FC<AppRoutesProps> = ({
  state, session, docenteNombre, 
  selectedCursoId, selectedEstudianteId,
  setSelectedCursoId, setSelectedEstudianteId,
  currentCourseRole, visibleActividades, visibleCalificaciones,
  onlineUsers, currentUserProfile,
  addActividad, updateActividad, deleteActividad, saveCalificaciones,
  addCurso, deleteCurso, saveCurso, toggleDocenteCurso,
  addEstudiante, updateEstudiante, deleteEstudiante,
  addIncidencia, deleteIncidencia,
  addSecuencia, updateSecuencia, deleteSecuencia,
  addPost, togglePostLike, reportPost, importResource, deletePost,
  refresh, syncDelete, sendNotification,
  uploadAvatar, updateProfessionalProfile, updateFullProfile, updateAvatarColor,
  updateInstitutoName, resetSchoolYear,
  saveRubrica, updateDescriptor, updateNivelesPuntaje,
  saveCotejo, updateCriterios, savePlantilla, deletePlantilla
}) => {
  const navigate = useNavigate();

  const handleNavigate = (s: Screen, extra?: NavExtra) => {
    if (extra?.cursoId !== undefined) setSelectedCursoId(extra.cursoId as number);
    if (extra?.estudianteId !== undefined) setSelectedEstudianteId(extra.estudianteId as number);
    navigate(s === 'inicio' ? '/' : `/${s}`);
  };

  const handleViewProfile = (e: React.MouseEvent, userId?: string) => {
    e.preventDefault();
    e.stopPropagation();
    window.dispatchEvent(new CustomEvent('show-profile', { 
      detail: { userId } 
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
        onToggleDocenteCurso={(cId, tUid, r, a) => toggleDocenteCurso(cId, tUid, r, a, sendNotification, syncDelete)}
      />
    );
  };

  return (
    <Routes>
      <Route path="/" element={<Inicio onAddActividad={addActividad} docenteNombre={docenteNombre} onUpdateInstituto={updateInstitutoName} currentCourseRole={currentCourseRole} />} />
      <Route path="/dashboard" element={<Dashboard docenteNombre={docenteNombre} />} />
      <Route path="/cursos" element={
        <Cursos 
          onAddCurso={addCurso} 
          onDeleteCurso={deleteCurso} 
          selectedCursoId={selectedCursoId}
          onSelectCurso={setSelectedCursoId}
          onSaveCurso={saveCurso}
          onToggleDocenteCurso={(cId, tUid, r, a) => toggleDocenteCurso(cId, tUid, r, a, sendNotification, syncDelete)}
        />
      } />
      <Route path="/curso-detalle" element={renderCourseDetail()} />
      <Route path="/curso-detalle/:id" element={<CourseDetailRouteWrapper setSelectedCursoId={setSelectedCursoId} renderCourseDetail={renderCourseDetail} />} />
      <Route path="/print-boletines/:cursoId" element={<PrintBoletines state={state} docenteNombre={docenteNombre} />} />
      <Route path="/incidencias" element={<Incidencias state={state} onAddIncidencia={addIncidencia} onDeleteIncidencia={deleteIncidencia} />} />
      <Route path="/planificacion" element={<Planificacion onAddSecuencia={addSecuencia} onUpdateSecuencia={updateSecuencia} onDeleteSecuencia={deleteSecuencia} />} />
      <Route path="/comunidad" element={
        <Comunidad
          onAddPost={addPost}
          onToggleLike={togglePostLike}
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
        />
      } />
      <Route path="/cotejo" element={
        <Cotejo 
          state={{ ...state, actividades: visibleActividades, calificaciones: visibleCalificaciones }} 
          currentCourseRole={currentCourseRole || undefined}
          onSaveCotejo={saveCotejo}
          onUpdateCriterios={updateCriterios}
          onSavePlantilla={savePlantilla}
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
          perfilBio={currentUserProfile?.bio || ''}
          perfilAvatarUrl={currentUserProfile?.avatarUrl || ''}
          perfilAvatarColor={currentUserProfile?.avatarColor || ''}
          instituto={state.instituto || ''}
          tipoInstitucion={state.tipoInstitucion || 'publica'}
          asignaturas={state.asignaturas || []}
          onUploadAvatar={uploadAvatar}
          onUpdateProfessionalProfile={updateProfessionalProfile}
          onUpdateFullProfile={updateFullProfile}
          onUpdateAvatarColor={updateAvatarColor}
          onResetSchoolYear={resetSchoolYear}
          onClose={() => navigate('/')}
          centro={currentUserProfile?.centro}
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
  );
};

export default AppRoutes;
