import React, { useState, useMemo, useEffect } from 'react';
import { X, Search, Play, Compass } from 'lucide-react';
import { startGuide } from '../../guides/driverGuides';

export interface TutorialItem {
  id: string;
  guideId: string;
  eyebrow: string;
  title: string;
  category: 'gestion' | 'evaluacion' | 'ia';
  duration: string;
  isNew?: boolean;
  sticker: 
    | 'iniciacion'
    | 'brick' 
    | 'students' 
    | 'calendar' 
    | 'recovery' 
    | 'grade' 
    | 'rubric' 
    | 'checklist' 
    | 'rubric-template' 
    | 'checklist-template' 
    | 'robot-activity' 
    | 'robot-rubric' 
    | 'robot-checklist';
  description?: string;
}

export const TUTORIALES_DATA: TutorialItem[] = [
  // SECCIÓN 1: GESTIÓN Y CURSOS
  {
    id: 't-iniciacion',
    guideId: 'iniciacion',
    eyebrow: 'Microlecciones CIELO',
    title: 'Guía de iniciación (5 Etapas)',
    category: 'gestion',
    duration: '2:30',
    isNew: true,
    sticker: 'iniciacion',
    description: 'Recorrido interactivo y narrado por las 5 etapas fundamentales de CIELO.'
  },
  {
    id: 't-crear-curso',
    guideId: 'crear-curso',
    eyebrow: 'Microlecciones CIELO',
    title: 'Crear un curso nuevo',
    category: 'gestion',
    duration: '0:45',
    isNew: true,
    sticker: 'brick',
    description: 'Aprende a configurar tu primer curso con grado, sección y asignaturas oficiales.'
  },
  {
    id: 't-actividades-alumnos',
    guideId: 'crear-actividades-alumnos',
    eyebrow: 'Microlecciones CIELO',
    title: 'Agregar actividades y alumnos',
    category: 'gestion',
    duration: '1:10',
    sticker: 'students',
    description: 'Inscribe a tus estudiantes e inicializa tus primeras actividades pedagógicas.'
  },
  {
    id: 't-pase-lista',
    guideId: 'pase-de-lista',
    eyebrow: 'Microlecciones CIELO',
    title: 'Cómo hacer el pase de lista',
    category: 'gestion',
    duration: '0:50',
    isNew: true,
    sticker: 'calendar',
    description: 'Registra asistencias, ausencias justificadas y retardos con un solo toque.'
  },
  {
    id: 't-recuperacion-p1',
    guideId: 'plan-recuperacion-p1',
    eyebrow: 'Microlecciones CIELO',
    title: 'Plan de recuperación pedagógica',
    category: 'gestion',
    duration: '1:30',
    sticker: 'recovery',
    description: 'Consulta los estudiantes que requieren nivelación y genera su plan adaptativo.'
  },

  // SECCIÓN 2: EVALUACIÓN E INSTRUMENTOS
  {
    id: 't-evaluar-actividad',
    guideId: 'evaluar-actividad',
    eyebrow: 'Microlecciones CIELO',
    title: 'Evaluar una actividad por indicador',
    category: 'evaluacion',
    duration: '0:40',
    sticker: 'grade',
    description: 'Asigna puntuaciones directas alineadas a las competencias curriculares.'
  },
  {
    id: 't-evaluar-rubrica',
    guideId: 'evaluar-rubrica',
    eyebrow: 'Microlecciones CIELO',
    title: 'Cómo evaluar con rúbrica analítica',
    category: 'evaluacion',
    duration: '1:20',
    isNew: true,
    sticker: 'rubric',
    description: 'Valora cada criterio con escala de cuatro niveles y retroalimentación inmediata.'
  },
  {
    id: 't-evaluar-cotejo',
    guideId: 'evaluar-cotejo',
    eyebrow: 'Microlecciones CIELO',
    title: 'Cómo evaluar con lista de cotejo',
    category: 'evaluacion',
    duration: '0:55',
    sticker: 'checklist',
    description: 'Aplica instrumentos dicotómicos de verificación rápida de evidencias.'
  },
  {
    id: 't-plantilla-rubrica',
    guideId: 'crear-plantilla-rubrica',
    eyebrow: 'Microlecciones CIELO',
    title: 'Crear una plantilla de rúbrica',
    category: 'evaluacion',
    duration: '1:15',
    sticker: 'rubric-template',
    description: 'Diseña matrices reutilizables para cualquier período escolar.'
  },
  {
    id: 't-plantilla-cotejo',
    guideId: 'crear-plantilla-cotejo',
    eyebrow: 'Microlecciones CIELO',
    title: 'Crear una plantilla de cotejo',
    category: 'evaluacion',
    duration: '1:00',
    sticker: 'checklist-template',
    description: 'Estructura indicadores y descriptores para listas de observación.'
  },

  // SECCIÓN 3: INTELIGENCIA ARTIFICIAL
  {
    id: 't-actividades-ia',
    guideId: 'crear-actividades-ia',
    eyebrow: 'Microlecciones CIELO',
    title: 'Generar actividades con IA',
    category: 'ia',
    duration: '1:15',
    isNew: true,
    sticker: 'robot-activity',
    description: 'Crea secuencias didácticas completas alineadas al currículo oficial MINERD.'
  },
  {
    id: 't-rubrica-ia',
    guideId: 'crear-rubrica-ia',
    eyebrow: 'Microlecciones CIELO',
    title: 'Crear rúbricas inteligentes con IA',
    category: 'ia',
    duration: '1:05',
    isNew: true,
    sticker: 'robot-rubric',
    description: 'Redacta criterios e indicadores de logro pedagógicos en segundos.'
  },
  {
    id: 't-cotejo-ia',
    guideId: 'crear-cotejo-ia',
    eyebrow: 'Microlecciones CIELO',
    title: 'Crear lista de cotejo con IA',
    category: 'ia',
    duration: '0:50',
    sticker: 'robot-checklist',
    description: 'Produce ítems de verificación automáticos a partir de tus temas de clase.'
  }
];

// ── COMPONENTE DE TARJETA MINIMALISTA MONOCROMÁTICA ──
interface CardProps {
  item: TutorialItem;
  onSelect: (item: TutorialItem) => void;
}

export const TutorialCard: React.FC<CardProps> = ({ item, onSelect }) => {
  return (
    <div
      onClick={() => onSelect(item)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect(item);
        }
      }}
      className="group relative bg-white hover:bg-neutral-50/70 border border-neutral-200 hover:border-black rounded-2xl p-5 sm:p-6 transition-all duration-200 cursor-pointer flex items-center justify-between gap-4 min-h-[96px] sm:min-h-[104px]"
    >
      {/* LADO IZQUIERDO: Nombre del tutorial */}
      <div className="flex-1 min-w-0 pr-2">
        <h4 className="text-sm sm:text-base font-bold text-black tracking-tight leading-snug line-clamp-2">
          {item.title}
        </h4>
      </div>

      {/* LADO DERECHO: Icono de reproducción protagonista dentro de círculo negro */}
      <div className="shrink-0 w-12 h-12 sm:w-14 sm:h-14 rounded-full border-2 border-black flex items-center justify-center transition-transform duration-200 group-hover:scale-105 bg-white">
        <Play size={18} fill="currentColor" className="text-black translate-x-0.5" />
      </div>
    </div>
  );
};

// ── VISTA PRINCIPAL DEL CENTRO DE MICROLECCIONES ──
interface CentroTutorialesViewProps {
  onSelectTutorial: (item: TutorialItem) => void;
  onClose?: () => void;
  isModal?: boolean;
}

export const CentroTutorialesView: React.FC<CentroTutorialesViewProps> = ({
  onSelectTutorial,
  onClose,
  isModal = true
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'gestion' | 'evaluacion' | 'ia'>('all');

  // Filtrado reactivo de tutoriales
  const filteredItems = useMemo(() => {
    return TUTORIALES_DATA.filter((item) => {
      const matchCategory = selectedCategory === 'all' || item.category === selectedCategory;
      const matchSearch =
        searchQuery.trim() === '' ||
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase()));
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
    <div className={`w-full flex flex-col bg-white ${isModal ? 'max-h-[92vh] rounded-3xl border border-neutral-200 shadow-xl overflow-hidden' : 'min-h-[80vh] rounded-3xl border border-neutral-200'}`}>
      {/* 2. ENCABEZADO MONOCROMÁTICO */}
      <div className="px-6 sm:px-8 py-6 border-b border-neutral-200 flex flex-col md:flex-row md:items-center justify-between gap-5 bg-white">
        <div className="flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl border border-neutral-200 flex items-center justify-center text-black bg-white shrink-0">
            <Compass size={22} strokeWidth={2} />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-black tracking-tight leading-tight">
              Centro de Microlecciones y Tutoriales
            </h2>
            <p className="text-xs sm:text-sm text-neutral-500 font-normal mt-0.5">
              Guías interactivas guiadas en la plataforma para dominar la evaluación por competencias
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          {/* Buscador minimalista monocromático */}
          <div className="relative w-full md:w-64">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar tutorial..."
              className="w-full pl-9 pr-8 py-2 bg-white rounded-full border border-neutral-200 text-xs font-medium text-black placeholder:text-neutral-400 focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-black cursor-pointer"
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
              className="p-2 text-neutral-400 hover:text-black hover:bg-neutral-100 rounded-full transition-colors cursor-pointer shrink-0"
              aria-label="Cerrar modal"
            >
              <X size={20} />
            </button>
          )}
        </div>
      </div>

      {/* 3. BARRA DE FILTROS Y CATEGORÍAS */}
      <div className="px-6 sm:px-8 py-3.5 border-b border-neutral-200 bg-white flex items-center gap-2 overflow-x-auto scrollbar-none">
        {[
          { id: 'all', label: 'Todos los tutoriales', count: TUTORIALES_DATA.length },
          { id: 'gestion', label: 'Gestión y Cursos', count: TUTORIALES_DATA.filter(t => t.category === 'gestion').length },
          { id: 'evaluacion', label: 'Evaluación e Instrumentos', count: TUTORIALES_DATA.filter(t => t.category === 'evaluacion').length },
          { id: 'ia', label: 'Inteligencia Artificial', count: TUTORIALES_DATA.filter(t => t.category === 'ia').length }
        ].map((cat) => {
          const active = selectedCategory === cat.id;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelectedCategory(cat.id as any)}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all shrink-0 cursor-pointer flex items-center gap-2 ${
                active
                  ? 'bg-black text-white border border-black'
                  : 'bg-white text-neutral-600 border border-neutral-200 hover:border-neutral-400 hover:text-black'
              }`}
            >
              <span>{cat.label}</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                  active ? 'bg-neutral-800 text-neutral-200' : 'bg-neutral-100 text-neutral-500'
                }`}
              >
                {cat.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* 4. CUERPO DE TARJETAS Y CONTENIDO */}
      <div className={`flex-1 overflow-y-auto px-6 sm:px-8 py-8 space-y-9 ${isModal ? 'max-h-[66vh]' : ''}`}>
        {filteredItems.length === 0 ? (
          <div className="text-center py-16 text-neutral-400">
            <Compass size={36} className="mx-auto mb-3 opacity-40 text-black" />
            <p className="text-sm font-bold text-black">No se encontraron tutoriales</p>
            <p className="text-xs text-neutral-500 mt-1">Prueba con otra palabra clave en el buscador.</p>
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('all');
              }}
              className="mt-4 px-4 py-2 rounded-full bg-white border border-neutral-200 text-xs font-semibold text-black hover:border-black cursor-pointer transition-colors"
            >
              Restablecer filtros
            </button>
          </div>
        ) : (
          <>
            {/* SECCIÓN 1: GESTIÓN Y CURSOS */}
            {gestionItems.length > 0 && (
              <div>
                <div className="flex items-baseline justify-between mb-4">
                  <div className="flex items-baseline gap-2.5">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-black">
                      Gestión y Cursos
                    </h3>
                    <span className="text-xs text-neutral-400 font-medium">
                      {gestionItems.length} {gestionItems.length === 1 ? 'tutorial' : 'tutoriales'}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
                  {gestionItems.map((item) => (
                    <TutorialCard key={item.id} item={item} onSelect={onSelectTutorial} />
                  ))}
                </div>
              </div>
            )}

            {/* SECCIÓN 2: EVALUACIÓN E INSTRUMENTOS */}
            {evaluacionItems.length > 0 && (
              <div>
                <div className="flex items-baseline justify-between mb-4">
                  <div className="flex items-baseline gap-2.5">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-black">
                      Evaluación e Instrumentos
                    </h3>
                    <span className="text-xs text-neutral-400 font-medium">
                      {evaluacionItems.length} tutoriales
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
                  {evaluacionItems.map((item) => (
                    <TutorialCard key={item.id} item={item} onSelect={onSelectTutorial} />
                  ))}
                </div>
              </div>
            )}

            {/* SECCIÓN 3: INTELIGENCIA ARTIFICIAL */}
            {iaItems.length > 0 && (
              <div>
                <div className="flex items-baseline justify-between mb-4">
                  <div className="flex items-baseline gap-2.5">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-black">
                      Inteligencia Artificial
                    </h3>
                    <span className="text-xs text-neutral-400 font-medium">
                      {iaItems.length} {iaItems.length === 1 ? 'tutorial' : 'tutoriales'}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
                  {iaItems.map((item) => (
                    <TutorialCard key={item.id} item={item} onSelect={onSelectTutorial} />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* PIE DE PÁGINA MONOCROMÁTICO */}
      <div className="px-6 sm:px-8 py-3.5 border-t border-neutral-200 bg-white text-xs flex flex-col sm:flex-row items-center justify-between gap-2">
        <span className="text-neutral-500 font-medium">
          Selecciona cualquier microlección para activar el recorrido interactivo guiado en CIELO.
        </span>
        <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-widest shrink-0">
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

export const CentroTutorialesModal: React.FC<CentroTutorialesModalProps> = ({ isOpen, onClose }) => {
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

  const handleSelectTutorial = (item: TutorialItem) => {
    onClose();
    setTimeout(() => {
      startGuide(item.guideId);
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
