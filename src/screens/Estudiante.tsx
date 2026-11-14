import { useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { School } from 'lucide-react';
import { useAppStore } from '../store/appStore';
import { useEstudianteData } from '../hooks/useEstudianteData';
import { useSupabaseData } from '../hooks/useSupabaseData';
import EstudianteHeader from '../components/estudiante/EstudianteHeader';
import EstudianteSubnav, { type SubseccionEstudiante } from '../components/estudiante/EstudianteSubnav';
import EvidenciasBandeja from '../components/estudiante/EvidenciasBandeja';
import PerfilTab from '../components/estudiante/PerfilTab';
import type { CursoDocente, Estudiante as EstudianteType } from '../types';
import { sonMismaAsignatura } from '../constants/asignaturas';

export default function Estudiante() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const {
        state,
        session,
        selectedEstudianteId,
        setSelectedEstudianteId,
        selectedCursoDocenteId,
        selectedAsignatura
    } = useAppStore();
    const { loadCursoData, contextReady } = useSupabaseData(true);

    const tabParam = searchParams.get('tab') || searchParams.get('subseccion');
    const subseccion: SubseccionEstudiante = tabParam === 'evidencias' ? 'evidencias' : 'fichas';

    const handleCambiarSubseccion = (nueva: SubseccionEstudiante) => {
        if (nueva === 'evidencias') {
            setSearchParams({ tab: 'evidencias' });
        } else {
            setSearchParams({});
        }
    };

    const selectedId = Number(id) || selectedEstudianteId || (state.estudiantes && state.estudiantes.length > 0 ? state.estudiantes[0].id : 0);

    const estBase = state.estudiantes.find(e => e.id === selectedId);
    const currentCourseRole = (selectedCursoDocenteId
        ? state.cursoDocentes.find((cd: CursoDocente) => cd.id === selectedCursoDocenteId && (!estBase || cd.cursoId === estBase.cursoId))
        : undefined
    ) || (selectedAsignatura && estBase
        ? state.cursoDocentes.find((cd: CursoDocente) => cd.cursoId === estBase.cursoId && cd.userId === session?.user?.id && sonMismaAsignatura(cd.asignatura, selectedAsignatura))
        : undefined
        ) || state.cursoDocentes.find((cd: CursoDocente) => cd.cursoId === estBase?.cursoId && cd.userId === session?.user?.id);
    const preferredAsignatura = currentCourseRole?.asignatura || selectedAsignatura;
    const cursoBase = estBase
        ? (state.cursos.find(c => c.id === estBase.cursoId && (!preferredAsignatura || sonMismaAsignatura(c.asignatura, preferredAsignatura)))
            || state.cursos.find(c => c.id === estBase.cursoId))
        : null;
    const isTutor = !currentCourseRole || currentCourseRole.rol === 'tutor' || currentCourseRole.esTutor;

    useEffect(() => {
        if (!contextReady || !session?.user?.id) return;
        if (cursoBase?.id) {
            loadCursoData(cursoBase.id);
        } else if (state.cursos.length > 0 && state.estudiantes.length === 0) {
            // Si aún no hay estudiante seleccionado o la lista está vacía, asegurar la carga/hidratación de los cursos del docente
            const uniqueIds = Array.from(new Set(state.cursos.map(c => Number(c.id)).filter(id => id > 0)));
            uniqueIds.forEach(cId => { void loadCursoData(cId); });
        }
    }, [contextReady, session?.user?.id, cursoBase?.id, state.cursos, state.estudiantes.length, loadCursoData]);

    const {
        periodo,
        setPeriodo,
        est,
        curso,
        studentHabilidades,
        promedioPeriodo,
        rankingPeriodo,
        actividadesPeriodo,
        incidenciasEstudiante
    } = useEstudianteData({
        state,
        selectedId,
        currentCourseRole,
        currentUserId: session?.user?.id
    });

    if (subseccion === 'evidencias') {
        return (
            <div className="flex flex-col items-center w-full min-h-screen bg-[#DCE6F5] text-[#1B1F2A] font-sans estudiante-root-wrapper">
                <EvidenciasBandeja onCambiarSubseccion={handleCambiarSubseccion} />
            </div>
        );
    }

    if (!est) {
        return (
            <div className="flex flex-col items-center justify-start p-4 sm:p-8 w-full min-h-screen bg-[#EFEFEC]">
                <div className="w-full max-w-4xl">
                    <EstudianteSubnav activa="fichas" onCambiar={handleCambiarSubseccion} />
                    <div className="bg-white p-5 sm:p-8 rounded-2xl shadow-sm border border-slate-200 mt-4">
                        <h2 className="text-xl sm:text-2xl font-black text-(--ink) mb-2 font-['Space_Grotesk']">Módulo Estudiante</h2>
                        <p className="text-(--ink-soft) mb-6 sm:mb-8 font-medium">Selecciona un estudiante para acceder a su perfil, calificaciones y portal familiar.</p>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                            {state.estudiantes?.map((e: EstudianteType) => {
                                const c = state.cursos?.find(c => c.id === e.cursoId);
                                return (
                                    <button
                                        key={e.id}
                                        onClick={() => {
                                            setSelectedEstudianteId(e.id);
                                            navigate(`/estudiante/${e.id}`);
                                        }}
                                        className="flex flex-col items-start justify-center min-h-16 p-4 bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100 hover:border-slate-300 active:scale-[0.99] transition-all text-left group cursor-pointer"
                                    >
                                        <span className="font-bold text-slate-800 group-hover:text-primary transition-colors text-sm wrap-break-word">
                                            {e.nombre} {e.apellido}
                                        </span>
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                                            {c ? `${c.grado} ${c.seccion}` : 'Sin curso'}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center w-full min-h-screen bg-[#EFEFEC] text-[#1B1F2A] pb-16 font-sans estudiante-root-wrapper">
            <div className="w-full no-print">
                <EstudianteHeader
                    periodo={periodo}
                    setPeriodo={setPeriodo}
                    onBack={() => navigate('/cursos')}
                />
                <EstudianteSubnav activa="fichas" onCambiar={handleCambiarSubseccion} />
            </div>

            <div className="w-full px-4 sm:px-8 relative mx-auto flex justify-center overflow-x-auto pb-10 workspace-print-wrapper">
                <style dangerouslySetInnerHTML={{
                    __html: `
                    @media print {
                        header, nav, aside, footer {
                            display: none !important;
                        }
                        .no-print {
                            display: none !important;
                        }
                        body, #root, .app-shell, .app-main, .estudiante-root-wrapper {
                            display: block !important;
                            margin: 0 !important;
                            padding: 0 !important;
                            width: 100% !important;
                            height: auto !important;
                            overflow: visible !important;
                            background: white !important;
                            position: static !important;
                        }
                        .workspace-print-wrapper {
                            display: block !important;
                            padding: 0 !important;
                            margin: 0 !important;
                            max-width: none !important;
                            overflow: visible !important;
                        }
                        .a4-page {
                            box-shadow: none !important;
                            width: 210mm !important;
                            min-height: 297mm !important;
                            height: max-content !important;
                            margin: 0 !important;
                            page-break-after: always;
                            padding: 20mm 21mm !important;
                            border: none !important;
                        }
                        .a4-page:last-child {
                            page-break-after: auto;
                        }
                        @page {
                            size: A4;
                            margin: 0;
                        }
                    }
                ` }} />

                <div className="estudiante-sheet-row flex flex-row gap-6 items-start justify-center min-w-max">
                    <PerfilTab
                        est={est}
                        curso={curso}
                        periodo={periodo}
                        promedioPeriodo={promedioPeriodo}
                        rankingPeriodo={rankingPeriodo}
                        studentHabilidades={studentHabilidades}
                        actividadesPeriodo={actividadesPeriodo}
                        incidenciasEstudiante={incidenciasEstudiante}
                        state={state}
                        currentAsignatura={currentCourseRole?.asignatura || curso?.asignatura}
                        isTutor={isTutor}
                        currentUserId={session?.user?.id}
                    />
                </div>
            </div>

            <footer className="w-[92%] max-w-7xl mt-auto text-center py-8 opacity-40 select-none">
                <p className="text-[#4E5566] text-[14px] font-bold uppercase tracking-[0.5em] mb-2">Plataforma Educativa CIELO</p>
                <div className="flex items-center justify-center gap-2 text-xs font-black uppercase tracking-widest text-[#4E5566]/70">
                    <School size={14} />
                    <span>Registro Oficial Validado</span>
                </div>
            </footer>
        </div>
    );
}
