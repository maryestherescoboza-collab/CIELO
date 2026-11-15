import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { startGuide } from '../guides/driverGuides';
import { useAppStore } from '../store/appStore';
import { 
  loadIniciacionProgress, 
  resetIniciacionProgress, 
  syncIniciacionProgressWithCloud 
} from '../guides/iniciacionState';

export type StageCategory = 
  | 'Todas'
  | 'Iniciación'
  | 'Cursos'
  | 'Asignaturas'
  | 'Estudiantes'
  | 'Contenido'
  | 'Evaluación'
  | 'Seguimiento'
  | 'Cuenta';

export interface GuiaItem {
  numero: string; // "00", "01", "02", etc.
  id: string; // "iniciacion", "guia-01", etc.
  etapa: Exclude<StageCategory, 'Todas'>;
  titulo: string;
  descripcion: string;
  pasos: number;
  minutos: number;
}

export const GUIAS_OFICIALES: GuiaItem[] = [
  // Guía de iniciación (recorrido fundamental)
  {
    numero: '00',
    id: 'iniciacion',
    etapa: 'Iniciación',
    titulo: 'Guía de iniciación',
    descripcion: 'Recorrido guiado de 5 etapas para dominar CIELO: cursos, estudiantes, actividades, evaluación y niveles de logro.',
    pasos: 23,
    minutos: 5
  },

  // Cursos (01 a 03)
  {
    numero: '01',
    id: 'guia-01',
    etapa: 'Cursos',
    titulo: 'Crear un curso',
    descripcion: 'Aprende a configurar un nuevo curso o sección escolar para comenzar a registrar estudiantes.',
    pasos: 3,
    minutos: 2
  },
  {
    numero: '02',
    id: 'guia-02',
    etapa: 'Cursos',
    titulo: 'Editar o archivar un curso',
    descripcion: 'Modifica el grado escolar, la sección o archiva cursos de períodos académicos anteriores.',
    pasos: 3,
    minutos: 2
  },
  {
    numero: '03',
    id: 'guia-03',
    etapa: 'Cursos',
    titulo: 'Duplicar un curso',
    descripcion: 'Copia la estructura completa de un curso para reutilizar asignaturas y actividades en otra sección.',
    pasos: 3,
    minutos: 2
  },

  // Asignaturas (04 a 06)
  {
    numero: '04',
    id: 'guia-04',
    etapa: 'Asignaturas',
    titulo: 'Agregar asignaturas',
    descripcion: 'Registra las materias del currículo oficial que impartirás durante el período escolar.',
    pasos: 3,
    minutos: 2
  },
  {
    numero: '05',
    id: 'guia-05',
    etapa: 'Asignaturas',
    titulo: 'Asignar docentes',
    descripcion: 'Asocia maestros a cada asignatura o grupo de clases para coordinar el trabajo en equipo.',
    pasos: 3,
    minutos: 2
  },
  {
    numero: '06',
    id: 'guia-06',
    etapa: 'Asignaturas',
    titulo: 'Configurar horarios',
    descripcion: 'Organiza las jornadas semanales y los bloques de tiempo de cada una de tus asignaturas.',
    pasos: 3,
    minutos: 2
  },

  // Estudiantes (07 a 10)
  {
    numero: '07',
    id: 'guia-07',
    etapa: 'Estudiantes',
    titulo: 'Inscribir estudiantes',
    descripcion: 'Agrega estudiantes a tu lista con su nombre, apellido y número de identificación.',
    pasos: 3,
    minutos: 2
  },
  {
    numero: '08',
    id: 'guia-08',
    etapa: 'Estudiantes',
    titulo: 'Importar desde Excel',
    descripcion: 'Carga masivamente tu lista de estudiantes desde una hoja de cálculo en cuestión de segundos.',
    pasos: 3,
    minutos: 2
  },
  {
    numero: '09',
    id: 'guia-09',
    etapa: 'Estudiantes',
    titulo: 'Gestionar grupos',
    descripcion: 'Divide tu clase en equipos de trabajo colaborativo para proyectos y tareas específicas.',
    pasos: 3,
    minutos: 2
  },
  {
    numero: '10',
    id: 'guia-10',
    etapa: 'Estudiantes',
    titulo: 'Invitar por enlace',
    descripcion: 'Comparte un enlace directo con las familias o alumnos para facilitar el acceso a la plataforma.',
    pasos: 3,
    minutos: 2
  },

  // Contenido (11 a 13)
  {
    numero: '11',
    id: 'guia-11',
    etapa: 'Contenido',
    titulo: 'Subir materiales',
    descripcion: 'Comparte documentos, guías de estudio, lecturas y recursos digitales con tus cursos.',
    pasos: 3,
    minutos: 2
  },
  {
    numero: '12',
    id: 'guia-12',
    etapa: 'Contenido',
    titulo: 'Crear una actividad',
    descripcion: 'Planifica tareas y evidencias de aprendizaje vinculadas a indicadores de logro curriculares.',
    pasos: 3,
    minutos: 2
  },
  {
    numero: '13',
    id: 'guia-13',
    etapa: 'Contenido',
    titulo: 'Programar publicaciones',
    descripcion: 'Define fechas y horas de entrega para que los materiales y actividades se publiquen automáticamente.',
    pasos: 3,
    minutos: 2
  },

  // Evaluación (14 a 17)
  {
    numero: '14',
    id: 'guia-14',
    etapa: 'Evaluación',
    titulo: 'Crear una evaluación',
    descripcion: 'Diseña rúbricas, escalas de valoración y listas de cotejo basadas en competencias.',
    pasos: 4,
    minutos: 3
  },
  {
    numero: '15',
    id: 'guia-15',
    etapa: 'Evaluación',
    titulo: 'Calificar entregas',
    descripcion: 'Revisa las evidencias de tus estudiantes y asigna niveles de dominio con el modo pincel o numérico.',
    pasos: 4,
    minutos: 3
  },
  {
    numero: '16',
    id: 'guia-16',
    etapa: 'Evaluación',
    titulo: 'Dar retroalimentación',
    descripcion: 'Escribe comentarios pedagógicos y sugerencias de mejora constructivas para cada estudiante.',
    pasos: 3,
    minutos: 2
  },
  {
    numero: '17',
    id: 'guia-17',
    etapa: 'Evaluación',
    titulo: 'Libro de calificaciones',
    descripcion: 'Consulta el registro consolidado de calificaciones por período, asignatura e indicador de logro.',
    pasos: 3,
    minutos: 2
  },

  // Seguimiento (18 a 20)
  {
    numero: '18',
    id: 'guia-18',
    etapa: 'Seguimiento',
    titulo: 'Tomar asistencia',
    descripcion: 'Registra el pase de lista diario indicando presencia, tardanza, excusa o ausencia.',
    pasos: 4,
    minutos: 2
  },
  {
    numero: '19',
    id: 'guia-19',
    etapa: 'Seguimiento',
    titulo: 'Reportes de progreso',
    descripcion: 'Genera informes detallados del avance académico y las competencias alcanzadas por cada alumno.',
    pasos: 3,
    minutos: 2
  },
  {
    numero: '20',
    id: 'guia-20',
    etapa: 'Seguimiento',
    titulo: 'Comunicarte con las familias',
    descripcion: 'Envía avisos, notificaciones de seguimiento y boletines de desempeño a los tutores.',
    pasos: 3,
    minutos: 2
  },

  // Cuenta (21 a 23)
  {
    numero: '21',
    id: 'guia-21',
    etapa: 'Cuenta',
    titulo: 'Perfil y notificaciones',
    descripcion: 'Personaliza tus datos personales, foto de perfil y configura tus alertas por correo o sistema.',
    pasos: 3,
    minutos: 2
  },
  {
    numero: '22',
    id: 'guia-22',
    etapa: 'Cuenta',
    titulo: 'Roles y permisos',
    descripcion: 'Administra los niveles de acceso de coordinadores, docentes titulares y auxiliares de tu centro.',
    pasos: 3,
    minutos: 2
  },
  {
    numero: '23',
    id: 'guia-23',
    etapa: 'Cuenta',
    titulo: 'Guardar y salir',
    descripcion: 'Aprende a cerrar tus sesiones de forma segura y guardar cualquier cambio antes de salir.',
    pasos: 2,
    minutos: 1
  }
];

const ETAPAS_FILTRO: StageCategory[] = [
  'Todas',
  'Iniciación',
  'Cursos',
  'Asignaturas',
  'Estudiantes',
  'Contenido',
  'Evaluación',
  'Seguimiento',
  'Cuenta'
];

function normalizarTexto(str: string): string {
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

export default function Guias() {
  const navigate = useNavigate();
  const [busqueda, setBusqueda] = useState('');
  const [etapaSeleccionada, setEtapaSeleccionada] = useState<StageCategory>('Todas');
  const [progresoIniciacion, setProgresoIniciacion] = useState(() => loadIniciacionProgress());

  useEffect(() => {
    syncIniciacionProgressWithCloud().then((p) => {
      if (p) setProgresoIniciacion(p);
    });

    const handleUpdated = (e: any) => {
      if (e.detail) setProgresoIniciacion(e.detail);
    };
    window.addEventListener('cielo-iniciacion-updated', handleUpdated);
    return () => window.removeEventListener('cielo-iniciacion-updated', handleUpdated);
  }, []);

  const guiasFiltradas = useMemo(() => {
    const q = normalizarTexto(busqueda.trim());
    return GUIAS_OFICIALES.filter(guia => {
      const matchEtapa = etapaSeleccionada === 'Todas' || guia.etapa === etapaSeleccionada;
      if (!matchEtapa) return false;

      if (!q) return true;
      return (
        normalizarTexto(guia.numero).includes(q) ||
        normalizarTexto(guia.titulo).includes(q) ||
        normalizarTexto(guia.descripcion).includes(q) ||
        normalizarTexto(guia.etapa).includes(q)
      );
    });
  }, [busqueda, etapaSeleccionada]);

  const handleComenzarGuia = (guia: GuiaItem) => {
    if (guia.id === 'guia-12' || guia.id === 'agregar-actividad') {
      const existingModal = document.querySelector('[data-guide="modal-actividad-selector-contenidos"]');
      if (existingModal) {
        startGuide('agregar-actividad');
        return;
      }

      const cursos = useAppStore.getState().state.cursos;
      const primerCurso = cursos && cursos.length > 0 ? cursos[0] : null;

      if (primerCurso) {
        navigate(`/curso-detalle/${primerCurso.id}`);
      } else {
        navigate('/cursos');
      }

      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('cielo:abrir-modal-actividad'));
        setTimeout(() => {
          startGuide('agregar-actividad');
        }, 300);
      }, 350);
      return;
    }

    if (guia.id === 'iniciacion') {
      navigate('/inicio');
      setTimeout(() => {
        startGuide('iniciacion');
      }, 220);
      return;
    }

    navigate('/inicio');
    setTimeout(() => {
      startGuide(guia.id);
    }, 220);
  };

  const handleComenzarDesdeCero = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('¿Deseas reiniciar la guía de iniciación desde el paso 1?')) {
      resetIniciacionProgress(null);
      navigate('/inicio');
      setTimeout(() => {
        startGuide('iniciacion', 0, undefined, true);
      }, 220);
    }
  };

  const handleLimpiarFiltros = () => {
    setBusqueda('');
    setEtapaSeleccionada('Todas');
  };

  return (
    <div className="min-h-screen bg-(--background) p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Encabezado Principal */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 border-b border-(--border-soft) pb-6">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-(--ink-soft)">
              Aprendizaje guiado
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-(--ink) tracking-tight mt-1">
              Guías
            </h1>
            <p className="text-sm text-(--ink-soft) mt-1 max-w-2xl">
              Guía de iniciación y tutoriales paso a paso para dominar CIELO, optimizar tu gestión académica y evaluar con confianza.
            </p>
          </div>

          <div className="text-right self-start sm:self-auto">
            <span className="text-xs font-semibold text-(--ink-soft)">
              {guiasFiltradas.length} de {GUIAS_OFICIALES.length} guías
            </span>
          </div>
        </div>

        {/* Barra de Búsqueda y Filtros */}
        <div className="space-y-3.5">
          {/* Buscador */}
          <div className="w-full">
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar guía por título, contenido o etapa..."
              className="w-full px-4 py-2.5 text-xs font-medium text-(--ink) placeholder:text-(--ink-soft) bg-white border border-(--border-soft) rounded-[10px] outline-none focus:border-(--ink) transition-all"
            />
          </div>

          {/* Filtros por etapa (chips) */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
            {ETAPAS_FILTRO.map((etapa) => {
              const activa = etapaSeleccionada === etapa;
              return (
                <button
                  key={etapa}
                  type="button"
                  onClick={() => setEtapaSeleccionada(etapa)}
                  className={`px-3.5 py-1.5 rounded-[10px] text-xs font-semibold whitespace-nowrap transition-all border cursor-pointer ${
                    activa
                      ? 'bg-(--ink) text-white border-(--ink)'
                      : 'bg-white text-(--ink-soft) border-(--border-soft) hover:text-(--ink) hover:bg-(--linen)/30'
                  }`}
                >
                  {etapa}
                </button>
              );
            })}
          </div>
        </div>

        {/* Cuadrícula de Tarjetas o Estado Vacío */}
        {guiasFiltradas.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {guiasFiltradas.map((guia) => (
              <div
                key={guia.id}
                className="bg-white border border-(--border-soft) rounded-[14px] p-5 sm:p-6 flex flex-col justify-between hover:border-(--ink-soft)/40 hover:shadow-md transition-all duration-200 group"
              >
                {/* Parte Superior: Número grande tipográfico + Etapa */}
                <div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-3xl sm:text-4xl font-extrabold text-(--ink) tracking-tight select-none">
                      {guia.numero}
                    </span>
                    <span className={`text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-[10px] border select-none ${
                      guia.id === 'iniciacion'
                        ? 'bg-(--ink) text-white border-(--ink)'
                        : 'text-(--ink-soft) bg-(--linen)/60 border-(--border-soft)'
                    }`}>
                      {guia.etapa}
                    </span>
                  </div>

                  {/* Título y Descripción */}
                  <h3 className="text-base font-bold text-(--ink) mt-4 mb-2 leading-snug">
                    {guia.titulo}
                  </h3>
                  <p className="text-xs text-(--ink-soft) leading-relaxed line-clamp-2">
                    {guia.descripcion}
                  </p>
                </div>

                {/* Parte Inferior: Pasos, Minutos y Botón Comenzar */}
                <div className="pt-4 mt-2 border-t border-(--border-soft)">
                  <div className="text-[11px] font-medium text-(--ink-soft) mb-3 select-none">
                    {guia.id === 'iniciacion' ? (
                      progresoIniciacion.completed ? (
                        '5 etapas · 23 pasos completados'
                      ) : progresoIniciacion.currentStepIndex > 0 ? (
                        `Paso ${progresoIniciacion.currentStepIndex + 1} de 23 pendiente (Etapa ${progresoIniciacion.currentStage})`
                      ) : (
                        '5 etapas · 23 pasos · 5 min'
                      )
                    ) : (
                      `${guia.pasos} pasos · ${guia.minutos} min`
                    )}
                  </div>

                  {guia.id === 'iniciacion' && progresoIniciacion.currentStepIndex > 0 && !progresoIniciacion.completed ? (
                    <div className="space-y-1.5">
                      <button
                        type="button"
                        onClick={() => handleComenzarGuia(guia)}
                        className="w-full py-2.5 px-4 rounded-[10px] bg-(--ink) text-white hover:bg-(--ink)/90 active:scale-[0.99] text-xs font-bold transition-all text-center cursor-pointer select-none"
                      >
                        Continuar guía
                      </button>
                      <button
                        type="button"
                        onClick={handleComenzarDesdeCero}
                        className="text-[11px] text-(--ink-soft) hover:text-(--ink) underline font-medium cursor-pointer transition-colors block mx-auto text-center pt-1 select-none"
                        title="Reiniciar voluntariamente todo el recorrido desde el paso 1"
                      >
                        Comenzar desde cero
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        if (guia.id === 'iniciacion' && progresoIniciacion.completed) {
                          handleComenzarDesdeCero({ stopPropagation: () => {} } as any);
                        } else {
                          handleComenzarGuia(guia);
                        }
                      }}
                      className="w-full py-2.5 px-4 rounded-[10px] bg-(--ink) text-white hover:bg-(--ink)/90 active:scale-[0.99] text-xs font-bold transition-all text-center cursor-pointer select-none"
                    >
                      {guia.id === 'iniciacion' && progresoIniciacion.completed
                        ? 'Comenzar desde cero'
                        : 'Comenzar guía'
                      }
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Estado Vacío */
          <div className="p-12 text-center bg-white border border-(--border-soft) rounded-[14px] my-6 space-y-3">
            <h2 className="text-base font-bold text-(--ink)">
              No se encontraron guías
            </h2>
            <p className="text-xs text-(--ink-soft) max-w-sm mx-auto">
              No hay guías que coincidan con «{busqueda}» en la etapa {etapaSeleccionada}. Intenta con otro término o limpia los filtros.
            </p>
            <div className="pt-2">
              <button
                type="button"
                onClick={handleLimpiarFiltros}
                className="px-4 py-2 rounded-[10px] bg-white border border-(--border-soft) text-xs font-bold text-(--ink) hover:bg-(--linen)/30 transition-all cursor-pointer"
              >
                Limpiar búsqueda y filtros
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

