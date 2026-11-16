import { useState, useMemo, useEffect } from 'react';
import { X, Search } from 'lucide-react';
import { startGuide } from '../../guides/driverGuides';
import { loadIniciacionProgress, resetIniciacionProgress } from '../../guides/iniciacionState';

export interface TutorialItem {
  id: string;
  guideId: string;
  numero: string;
  eyebrow: string;
  title: string;
  category: 'gestion' | 'evaluacion' | 'ia';
  etapa: string;
  duration: string;
  pasos: number;
  isNew?: boolean;
  description: string;
}

export const TUTORIALES_DATA: TutorialItem[] = [
  // SECCIÓN 1: GESTIÓN Y CURSOS
  {
    id: 't-iniciacion',
    guideId: 'iniciacion',
    numero: '00',
    eyebrow: 'Microlecciones CIELO',
    title: 'Guía de iniciación',
    category: 'gestion',
    etapa: 'Iniciación',
    duration: '5 min',
    pasos: 23,
    isNew: true,
    description: 'Recorrido guiado de 5 etapas para dominar CIELO: cursos, estudiantes, actividades, evaluación y niveles de logro.'
  },
  {
    id: 't-crear-curso',
    guideId: 'crear-curso',
    numero: '01',
    eyebrow: 'Microlecciones CIELO',
    title: 'Crear un curso nuevo',
    category: 'gestion',
    etapa: 'Cursos',
    duration: '2 min',
    pasos: 3,
    isNew: true,
    description: 'Aprende a configurar tu primer curso con grado, sección y asignaturas oficiales.'
  },
  {
    id: 't-actividades-alumnos',
    guideId: 'crear-actividades-alumnos',
    numero: '02',
    eyebrow: 'Microlecciones CIELO',
    title: 'Agregar actividades y alumnos',
    category: 'gestion',
    etapa: 'Estudiantes',
    duration: '2 min',
    pasos: 3,
    description: 'Inscribe a tus estudiantes e inicializa tus primeras actividades pedagógicas.'
  },
  {
    id: 't-pase-lista',
    guideId: 'pase-de-lista',
    numero: '03',
    eyebrow: 'Microlecciones CIELO',
    title: 'Cómo hacer el pase de lista',
    category: 'gestion',
    etapa: 'Asistencia',
    duration: '2 min',
    pasos: 3,
    isNew: true,
    description: 'Registra asistencias, ausencias justificadas y tardanzas con un solo toque.'
  },
  {
    id: 't-recuperacion-p1',
    guideId: 'plan-recuperacion-p1',
    numero: '04',
    eyebrow: 'Microlecciones CIELO',
    title: 'Plan de recuperación pedagógica',
    category: 'gestion',
    etapa: 'Seguimiento',
    duration: '2 min',
    pasos: 3,
    description: 'Consulta los estudiantes que requieren nivelación y genera su plan adaptativo.'
  },

  // SECCIÓN 2: EVALUACIÓN E INSTRUMENTOS
  {
    id: 't-evaluar-actividad',
    guideId: 'evaluar-actividad',
    numero: '05',
    eyebrow: 'Microlecciones CIELO',
    title: 'Evaluar una actividad por indicador',
    category: 'evaluacion',
    etapa: 'Evaluación',
    duration: '2 min',
    pasos: 3,
    description: 'Asigna puntuaciones directas alineadas a las competencias curriculares.'
  },
  {
    id: 't-evaluar-rubrica',
    guideId: 'evaluar-rubrica',
    numero: '06',
    eyebrow: 'Microlecciones CIELO',
    title: 'Cómo evaluar con rúbrica analítica',
    category: 'evaluacion',
    etapa: 'Rúbrica',
    duration: '2 min',
    pasos: 3,
    isNew: true,
    description: 'Valora cada criterio con escala de cuatro niveles y retroalimentación inmediata.'
  },
  {
    id: 't-evaluar-cotejo',
    guideId: 'evaluar-cotejo',
    numero: '07',
    eyebrow: 'Microlecciones CIELO',
    title: 'Cómo evaluar con lista de cotejo',
    category: 'evaluacion',
    etapa: 'Cotejo',
    duration: '2 min',
    pasos: 3,
    description: 'Aplica instrumentos dicotómicos de verificación rápida de evidencias.'
  },
  {
    id: 't-plantilla-rubrica',
    guideId: 'crear-plantilla-rubrica',
    numero: '08',
    eyebrow: 'Microlecciones CIELO',
    title: 'Crear una plantilla de rúbrica',
    category: 'evaluacion',
    etapa: 'Plantillas',
    duration: '2 min',
    pasos: 3,
    description: 'Diseña matrices reutilizables para cualquier período escolar.'
  },
  {
    id: 't-plantilla-cotejo',
    guideId: 'crear-plantilla-cotejo',
    numero: '09',
    eyebrow: 'Microlecciones CIELO',
    title: 'Crear una plantilla de cotejo',
    category: 'evaluacion',
    etapa: 'Plantillas',
    duration: '2 min',
    pasos: 3,
    description: 'Estructura indicadores y descriptores para listas de observación.'
  },

  // SECCIÓN 3: INTELIGENCIA ARTIFICIAL
  {
    id: 't-actividades-ia',
    guideId: 'crear-actividades-ia',
    numero: '10',
    eyebrow: 'Microlecciones CIELO',
    title: 'Generar actividades con IA',
    category: 'ia',
    etapa: 'IA Pedagógica',
    duration: '2 min',
    pasos: 3,
    isNew: true,
    description: 'Crea secuencias didácticas completas alineadas al currículo oficial MINERD.'
  },
  {
    id: 't-rubrica-ia',
    guideId: 'crear-rubrica-ia',
    numero: '11',
    eyebrow: 'Microlecciones CIELO',
    title: 'Crear rúbricas inteligentes con IA',
    category: 'ia',
    etapa: 'IA Pedagógica',
    duration: '2 min',
    pasos: 3,
    isNew: true,
    description: 'Redacta criterios e indicadores de logro pedagógicos en segundos.'
  },
  {
    id: 't-cotejo-ia',
    guideId: 'crear-cotejo-ia',
    numero: '12',
    eyebrow: 'Microlecciones CIELO',
    title: 'Crear lista de cotejo con IA',
    category: 'ia',
    etapa: 'IA Pedagógica',
    duration: '2 min',
    pasos: 3,
    description: 'Produce ítems de verificación automáticos a partir de tus temas de clase.'
  }
];

// ── COMPONENTE DE TARJETA CON DISEÑO IDÉNTICO A GUÍAS ──
// Tarjeta: rounded-[14px], border border-(--border-soft), sin iconos ni emojis.
// Elemento visual hero: número grande tipográfico "00", "01"...
// Botones y chips: rounded-[10px].
interface CardProps {
  item: TutorialItem;
  onSelect: (item: TutorialItem, reset?: boolean) => void;
  progresoIniciacion?: {
    currentStepIndex: number;
    currentStage: number;
    completed: boolean;
  };
}

export const TutorialCard = ({
  item,
  onSelect,
  progresoIniciacion = { currentStepIndex: 0, currentStage: 1, completed: false }
}: CardProps) => {
  const isIniciacion = item.guideId === 'iniciacion';
  const hasIniciacionProgress = isIniciacion && progresoIniciacion.currentStepIndex > 0 && !progresoIniciacion.completed;
  const isCompleted = isIniciacion && progresoIniciacion.completed;

  const handleComenzarDesdeCero = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('¿Deseas reiniciar la guía de iniciación desde el paso 1?')) {
      resetIniciacionProgress(null);
      onSelect(item, true);
    }
  };

  return (
    <div className="bg-white border border-(--border-soft) rounded-[14px] p-5 sm:p-6 flex flex-col justify-between hover:border-(--ink-soft)/40 hover:shadow-md transition-all duration-200 group">
      {/* Parte Superior: Número grande tipográfico + Etapa */}
      <div>
        <div className="flex items-center justify-between gap-3">
          <span className="text-3xl sm:text-4xl font-extrabold text-(--ink) tracking-tight select-none">
            {item.numero}
          </span>
          <span
            className={`text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-[10px] border select-none ${
              isIniciacion
                ? 'bg-(--ink) text-white border-(--ink)'
                : 'text-(--ink-soft) bg-(--linen)/60 border-(--border-soft)'
            }`}
          >
            {item.etapa}
          </span>
        </div>

        {/* Título y Descripción */}
        <h3 className="text-base font-bold text-(--ink) mt-4 mb-2 leading-snug">
          {item.title}
        </h3>
        <p className="text-xs text-(--ink-soft) leading-relaxed line-clamp-2">
          {item.description}
        </p>
      </div>

      {/* Parte Inferior: Pasos, Minutos y Botón Comenzar */}
      <div className="pt-4 mt-4 border-t border-(--border-soft)">
        <div className="text-[11px] font-medium text-(--ink-soft) mb-3 select-none">
          {isIniciacion ? (
            isCompleted ? (
              '5 etapas · 23 pasos completados'
            ) : hasIniciacionProgress ? (
              `Paso ${progresoIniciacion.currentStepIndex + 1} de 23 pendiente (Etapa ${progresoIniciacion.currentStage})`
            ) : (
              '5 etapas · 23 pasos · 5 min'
            )
          ) : (
            `${item.pasos} pasos · ${item.duration}`
          )}
        </div>

        {hasIniciacionProgress ? (
          <div className="space-y-1.5">
            <button
              type="button"
              onClick={() => onSelect(item, false)}
              className="w-full py-2.5 px-4 rounded-[10px] bg-(--ink) text-white hover:bg-(--ink)/90 active:scale-[0.99] text-xs font-bold transition-all text-center cursor-pointer select-none"
            >
              Continuar tutorial
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
              if (isCompleted) {
                handleComenzarDesdeCero({ stopPropagation: () => {} } as any);
              } else {
                onSelect(item, false);
              }
            }}
            className="w-full py-2.5 px-4 rounded-[10px] bg-(--ink) text-white hover:bg-(--ink)/90 active:scale-[0.99] text-xs font-bold transition-all text-center cursor-pointer select-none"
          >
            {isCompleted ? 'Comenzar desde cero' : 'Comenzar tutorial'}
          </button>
        )}
      </div>
    </div>
  );
};

// ── VISTA PRINCIPAL DEL CENTRO DE MICROLECCIONES ──
interface CentroTutorialesViewProps {
  onSelectTutorial: (item: TutorialItem, reset?: boolean) => void;
  onClose?: () => void;
  isModal?: boolean;
}

export const CentroTutorialesView = ({
  onSelectTutorial,
  onClose,
  isModal = true
}: CentroTutorialesViewProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'gestion' | 'evaluacion' | 'ia'>('all');
  const [progresoIniciacion, setProgresoIniciacion] = useState(() => loadIniciacionProgress());

  // Escuchar cambios de progreso de la guía de iniciación
  useEffect(() => {
    const handler = () => {
      setProgresoIniciacion(loadIniciacionProgress());
    };
    window.addEventListener('storage', handler);
    window.addEventListener('cielo:iniciacion_updated', handler);
    return () => {
      window.removeEventListener('storage', handler);
      window.removeEventListener('cielo:iniciacion_updated', handler);
    };
  }, []);

  // Filtrado reactivo de tutoriales
  const filteredItems = useMemo(() => {
    return TUTORIALES_DATA.filter((item) => {
      const matchCategory = selectedCategory === 'all' || item.category === selectedCategory;
      const matchSearch =
        searchQuery.trim() === '' ||
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.etapa.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.numero.includes(searchQuery.trim());
      return matchCategory && matchSearch;
    });
  }, [searchQuery, selectedCategory]);

  const gestionItems = useMemo(() => {
    return filteredItems.filter((i) => i.category === 'gestion');
  }, [filteredItems]);

  const evaluacionItems = useMemo(() => {
    return filteredItems.filter((i) => i.category === 'evaluacion');
  }, [filteredItems]);

  const iaItems = useMemo(() => {
    return filteredItems.filter((i) => i.category === 'ia');
  }, [filteredItems]);

  return (
    <div
      className={`w-full flex flex-col bg-white ${
        isModal
          ? 'max-h-[92vh] rounded-[16px] border border-(--border-soft) shadow-xl overflow-hidden'
          : 'min-h-[80vh] rounded-[16px] border border-(--border-soft)'
      }`}
    >
      {/* ENCABEZADO */}
      <div className="px-6 sm:px-8 py-6 border-b border-(--border-soft) flex flex-col md:flex-row md:items-center justify-between gap-5 bg-white">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-(--ink-soft)">
            Aprendizaje guiado
          </span>
          <h2 className="text-xl sm:text-2xl font-extrabold text-(--ink) tracking-tight leading-tight mt-0.5">
            Centro de Microlecciones y Tutoriales
          </h2>
          <p className="text-xs sm:text-sm text-(--ink-soft) font-normal mt-1">
            Tutoriales paso a paso narrados en la plataforma para dominar la evaluación por competencias.
          </p>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          {/* Buscador con tokens CIELO */}
          <div className="relative w-full md:w-72">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-(--ink-soft)" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar tutorial..."
              className="w-full pl-9 pr-8 py-2 bg-white rounded-[10px] border border-(--border-soft) text-xs font-medium text-(--ink) placeholder:text-(--ink-soft) focus:outline-none focus:border-(--ink) transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-(--ink-soft) hover:text-(--ink) cursor-pointer"
                aria-label="Limpiar búsqueda"
              >
                <X size={13} />
              </button>
            )}
          </div>

          {/* Botón cerrar si es modal */}
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-(--ink-soft) hover:text-(--ink) hover:bg-(--linen)/30 rounded-[10px] transition-colors cursor-pointer shrink-0 border border-transparent hover:border-(--border-soft)"
              aria-label="Cerrar modal"
            >
              <X size={18} />
            </button>
          )}
        </div>
      </div>

      {/* BARRA DE FILTROS POR CATEGORÍA (CHIPS CON 10PX) */}
      <div className="px-6 sm:px-8 py-3.5 border-b border-(--border-soft) bg-white flex items-center gap-2 overflow-x-auto no-scrollbar">
        {[
          { id: 'all', label: 'Todos los tutoriales', count: TUTORIALES_DATA.length },
          { id: 'gestion', label: 'Gestión y Cursos', count: TUTORIALES_DATA.filter((t) => t.category === 'gestion').length },
          { id: 'evaluacion', label: 'Evaluación e Instrumentos', count: TUTORIALES_DATA.filter((t) => t.category === 'evaluacion').length },
          { id: 'ia', label: 'Inteligencia Artificial', count: TUTORIALES_DATA.filter((t) => t.category === 'ia').length }
        ].map((cat) => {
          const active = selectedCategory === cat.id;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelectedCategory(cat.id as any)}
              className={`px-3.5 py-1.5 rounded-[10px] text-xs font-semibold whitespace-nowrap transition-all border cursor-pointer flex items-center gap-2 ${
                active
                  ? 'bg-(--ink) text-white border-(--ink)'
                  : 'bg-white text-(--ink-soft) border-(--border-soft) hover:text-(--ink) hover:bg-(--linen)/30'
              }`}
            >
              <span>{cat.label}</span>
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded-[10px] font-bold ${
                  active ? 'bg-white/20 text-white' : 'bg-(--linen) text-(--ink-soft)'
                }`}
              >
                {cat.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* CUERPO DE TARJETAS Y CONTENIDO */}
      <div className={`flex-1 overflow-y-auto px-6 sm:px-8 py-8 space-y-8 ${isModal ? 'max-h-[66vh]' : ''}`}>
        {filteredItems.length === 0 ? (
          <div className="p-12 text-center bg-white border border-(--border-soft) rounded-[14px] my-6 space-y-3">
            <h3 className="text-base font-bold text-(--ink)">
              No se encontraron tutoriales
            </h3>
            <p className="text-xs text-(--ink-soft) max-w-sm mx-auto">
              No hay tutoriales que coincidan con «{searchQuery}». Intenta con otro término o limpia los filtros.
            </p>
            <div className="pt-2">
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('all');
                }}
                className="px-4 py-2 rounded-[10px] bg-white border border-(--border-soft) text-xs font-bold text-(--ink) hover:bg-(--linen)/30 transition-all cursor-pointer"
              >
                Limpiar búsqueda y filtros
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* SECCIÓN 1: GESTIÓN Y CURSOS */}
            {gestionItems.length > 0 && (
              <div>
                <div className="flex items-baseline justify-between mb-4">
                  <div className="flex items-baseline gap-2.5">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-(--ink)">
                      Gestión y Cursos
                    </h3>
                    <span className="text-xs text-(--ink-soft) font-medium">
                      {gestionItems.length} {gestionItems.length === 1 ? 'tutorial' : 'tutoriales'}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {gestionItems.map((item) => (
                    <TutorialCard
                      key={item.id}
                      item={item}
                      onSelect={onSelectTutorial}
                      progresoIniciacion={progresoIniciacion}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* SECCIÓN 2: EVALUACIÓN E INSTRUMENTOS */}
            {evaluacionItems.length > 0 && (
              <div>
                <div className="flex items-baseline justify-between mb-4">
                  <div className="flex items-baseline gap-2.5">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-(--ink)">
                      Evaluación e Instrumentos
                    </h3>
                    <span className="text-xs text-(--ink-soft) font-medium">
                      {evaluacionItems.length} tutoriales
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {evaluacionItems.map((item) => (
                    <TutorialCard
                      key={item.id}
                      item={item}
                      onSelect={onSelectTutorial}
                      progresoIniciacion={progresoIniciacion}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* SECCIÓN 3: INTELIGENCIA ARTIFICIAL */}
            {iaItems.length > 0 && (
              <div>
                <div className="flex items-baseline justify-between mb-4">
                  <div className="flex items-baseline gap-2.5">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-(--ink)">
                      Inteligencia Artificial
                    </h3>
                    <span className="text-xs text-(--ink-soft) font-medium">
                      {iaItems.length} {iaItems.length === 1 ? 'tutorial' : 'tutoriales'}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {iaItems.map((item) => (
                    <TutorialCard
                      key={item.id}
                      item={item}
                      onSelect={onSelectTutorial}
                      progresoIniciacion={progresoIniciacion}
                    />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* PIE DE PÁGINA */}
      <div className="px-6 sm:px-8 py-3.5 border-t border-(--border-soft) bg-white text-xs flex flex-col sm:flex-row items-center justify-between gap-2">
        <span className="text-(--ink-soft) font-medium">
          Selecciona cualquier microlección para activar el recorrido interactivo guiado en CIELO.
        </span>
        <span className="text-[11px] font-bold text-(--ink-soft) uppercase tracking-widest shrink-0">
          CIELO Learning
        </span>
      </div>
    </div>
  );
};

// ── MODAL PRINCIPAL: CENTRO DE TUTORIALES ──
interface CentroTutorialesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CentroTutorialesModal = ({ isOpen, onClose }: CentroTutorialesModalProps) => {
  // Cerrar con Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Bloquear scroll de fondo
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const handleSelectTutorial = (item: TutorialItem, reset = false) => {
    onClose();
    setTimeout(() => {
      if (reset && item.guideId === 'iniciacion') {
        startGuide('iniciacion', 0, undefined, true);
      } else {
        startGuide(item.guideId);
      }
    }, 150);
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-100 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-6 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-6xl animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <CentroTutorialesView
          onSelectTutorial={handleSelectTutorial}
          onClose={onClose}
          isModal={true}
        />
      </div>
    </div>
  );
};
