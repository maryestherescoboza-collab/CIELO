import React, { useState, useMemo, useEffect } from 'react';
import { X, Search, Sparkles, Play, Compass } from 'lucide-react';
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

// ── ILUSTRACIONES TIPO STICKER VECTORIAL (ESTILO EDITORIAL PADLET) ──
export const StickerIllustration: React.FC<{ type: TutorialItem['sticker'] }> = ({ type }) => {
  switch (type) {
    case 'iniciacion':
      // Estrella dorada brillante con birrete y destellos
      return (
        <svg viewBox="0 0 100 100" className="w-full h-full select-none" fill="none">
          <ellipse cx="50" cy="50" rx="36" ry="36" fill="#FEF3C7" stroke="#2E2A40" strokeWidth="2.5" />
          {/* Birrete / Graduación */}
          <polygon points="50,22 84,34 50,46 16,34" fill="#3B82F6" stroke="#2E2A40" strokeWidth="2.5" strokeLinejoin="round" />
          <path d="M28 38 L28 54 Q50 64 72 54 L72 38" fill="#1D4ED8" stroke="#2E2A40" strokeWidth="2.5" />
          {/* Borla */}
          <path d="M50 34 L78 48 L78 60" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" />
          <circle cx="78" cy="62" r="3.5" fill="#F59E0B" />
          {/* Estrella brillante */}
          <polygon points="50,60 53,67 61,68 55,73 57,80 50,76 43,80 45,73 39,68 47,67" fill="#FBBF24" stroke="#2E2A40" strokeWidth="1.5" />
          {/* Destellos */}
          <path d="M20 20 L22 24 L26 26 L22 28 L20 32 L18 28 L14 26 L18 24 Z" fill="#F43F5E" />
          <path d="M80 16 L81 19 L84 20 L81 21 L80 24 L79 21 L76 20 L79 19 Z" fill="#10B981" />
        </svg>
      );

    case 'brick':
      // Muro de ladrillos con espátula/palustre y regla
      return (
        <svg viewBox="0 0 100 100" className="w-full h-full select-none" fill="none">
          <rect x="10" y="32" width="76" height="54" rx="6" fill="#FDE2D2" stroke="#2E2A40" strokeWidth="2.5" />
          <line x1="10" y1="50" x2="86" y2="50" stroke="#2E2A40" strokeWidth="2" />
          <line x1="10" y1="68" x2="86" y2="68" stroke="#2E2A40" strokeWidth="2" />
          <line x1="32" y1="32" x2="32" y2="50" stroke="#2E2A40" strokeWidth="2" />
          <line x1="60" y1="32" x2="60" y2="50" stroke="#2E2A40" strokeWidth="2" />
          <line x1="22" y1="50" x2="22" y2="68" stroke="#2E2A40" strokeWidth="2" />
          <line x1="48" y1="50" x2="48" y2="68" stroke="#2E2A40" strokeWidth="2" />
          <line x1="72" y1="50" x2="72" y2="68" stroke="#2E2A40" strokeWidth="2" />
          <path d="M72 16 L88 32 L78 42 L62 26 Z" fill="#FBBF24" stroke="#2E2A40" strokeWidth="2.5" strokeLinejoin="round" />
          <path d="M84 20 L94 10" stroke="#8B5CF6" strokeWidth="4" strokeLinecap="round" />
          <circle cx="22" cy="18" r="3" fill="#A78BFA" />
          <path d="M15 14 L19 14 M17 12 L17 16" stroke="#2E2A40" strokeWidth="1.5" />
          <circle cx="88" cy="62" r="2.5" fill="#34D399" />
        </svg>
      );

    case 'students':
      // Estudiantes, pupitre y libreta
      return (
        <svg viewBox="0 0 100 100" className="w-full h-full select-none" fill="none">
          <ellipse cx="50" cy="54" rx="38" ry="32" fill="#E0E7FF" stroke="#2E2A40" strokeWidth="2" strokeDasharray="3 3" />
          <circle cx="36" cy="36" r="14" fill="#FED7AA" stroke="#2E2A40" strokeWidth="2.5" />
          <path d="M26 34 Q36 24 46 34" stroke="#2E2A40" strokeWidth="3" fill="none" strokeLinecap="round" />
          <circle cx="64" cy="40" r="13" fill="#BBF7D0" stroke="#2E2A40" strokeWidth="2.5" />
          <path d="M54 38 Q64 28 74 38" stroke="#2E2A40" strokeWidth="3" fill="none" strokeLinecap="round" />
          <rect x="24" y="58" width="52" height="26" rx="4" fill="#FEF08A" stroke="#2E2A40" strokeWidth="2.5" />
          <line x1="32" y1="68" x2="68" y2="68" stroke="#2E2A40" strokeWidth="2" strokeLinecap="round" />
          <line x1="32" y1="74" x2="56" y2="74" stroke="#2E2A40" strokeWidth="2" strokeLinecap="round" />
          <path d="M72 52 L84 40 L88 44 L76 56 Z" fill="#F472B6" stroke="#2E2A40" strokeWidth="2" />
        </svg>
      );

    case 'calendar':
      // Calendario de asistencia con gran checkmark
      return (
        <svg viewBox="0 0 100 100" className="w-full h-full select-none" fill="none">
          <rect x="14" y="20" width="70" height="66" rx="8" fill="#FFFFFF" stroke="#2E2A40" strokeWidth="2.5" />
          <path d="M14 20 Q14 20 84 20 L84 36 L14 36 Z" fill="#F43F5E" stroke="#2E2A40" strokeWidth="2.5" />
          <rect x="28" y="12" width="6" height="14" rx="3" fill="#2E2A40" />
          <rect x="64" y="12" width="6" height="14" rx="3" fill="#2E2A40" />
          <circle cx="30" cy="50" r="4" fill="#CBD5E1" />
          <circle cx="48" cy="50" r="4" fill="#CBD5E1" />
          <circle cx="66" cy="50" r="4" fill="#CBD5E1" />
          <circle cx="30" cy="68" r="4" fill="#CBD5E1" />
          <circle cx="56" cy="66" r="14" fill="#22C55E" stroke="#2E2A40" strokeWidth="2.5" />
          <path d="M50 66 L55 71 L64 61" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );

    case 'recovery':
      // Diana de logro con flecha y cinta de medalla
      return (
        <svg viewBox="0 0 100 100" className="w-full h-full select-none" fill="none">
          <path d="M38 14 L28 46 L44 42 Z" fill="#6366F1" stroke="#2E2A40" strokeWidth="2" />
          <path d="M60 14 L70 46 L54 42 Z" fill="#EC4899" stroke="#2E2A40" strokeWidth="2" />
          <circle cx="48" cy="54" r="32" fill="#FEF08A" stroke="#2E2A40" strokeWidth="2.5" />
          <circle cx="48" cy="54" r="22" fill="#FED7AA" stroke="#2E2A40" strokeWidth="2" />
          <circle cx="48" cy="54" r="12" fill="#F43F5E" stroke="#2E2A40" strokeWidth="2" />
          <circle cx="48" cy="54" r="4" fill="#FFFFFF" />
          <path d="M72 30 L52 50" stroke="#2E2A40" strokeWidth="3.5" strokeLinecap="round" />
          <path d="M74 24 L78 32 L70 36 Z" fill="#22C55E" stroke="#2E2A40" strokeWidth="2" />
        </svg>
      );

    case 'grade':
      // Balanza / escala de notas con medalla A+
      return (
        <svg viewBox="0 0 100 100" className="w-full h-full select-none" fill="none">
          <ellipse cx="50" cy="78" rx="34" ry="10" fill="#E2E8F0" stroke="#2E2A40" strokeWidth="2" />
          <rect x="22" y="24" width="48" height="54" rx="6" fill="#F8FAFC" stroke="#2E2A40" strokeWidth="2.5" />
          <line x1="30" y1="36" x2="62" y2="36" stroke="#2E2A40" strokeWidth="2" strokeLinecap="round" />
          <line x1="30" y1="46" x2="54" y2="46" stroke="#2E2A40" strokeWidth="2" strokeLinecap="round" />
          <line x1="30" y1="56" x2="62" y2="56" stroke="#2E2A40" strokeWidth="2" strokeLinecap="round" />
          <circle cx="64" cy="46" r="15" fill="#FDE047" stroke="#2E2A40" strokeWidth="2.5" />
          <text x="64" y="51" textAnchor="middle" fontSize="12" fontWeight="900" fill="#1E293B">A+</text>
        </svg>
      );

    case 'rubric':
      // Matriz de rúbrica 4 niveles con estrellas
      return (
        <svg viewBox="0 0 100 100" className="w-full h-full select-none" fill="none">
          <rect x="14" y="22" width="72" height="60" rx="6" fill="#EDE9FE" stroke="#2E2A40" strokeWidth="2.5" />
          <line x1="14" y1="42" x2="86" y2="42" stroke="#2E2A40" strokeWidth="2" />
          <line x1="14" y1="62" x2="86" y2="62" stroke="#2E2A40" strokeWidth="2" />
          <line x1="38" y1="22" x2="38" y2="82" stroke="#2E2A40" strokeWidth="2" />
          <line x1="62" y1="22" x2="62" y2="82" stroke="#2E2A40" strokeWidth="2" />
          <polygon points="26,30 28,34 32,34 29,37 30,41 26,38 22,41 23,37 20,34 24,34" fill="#FBBF24" />
          <polygon points="50,30 52,34 56,34 53,37 54,41 50,38 46,41 47,37 44,34 48,34" fill="#FBBF24" />
          <polygon points="74,30 76,34 80,34 77,37 78,41 74,38 70,41 71,37 68,34 72,34" fill="#FBBF24" />
          <rect x="42" y="46" width="16" height="12" rx="2" fill="#8B5CF6" />
        </svg>
      );

    case 'checklist':
      // Tabla con lista de verificación y tildes verdes
      return (
        <svg viewBox="0 0 100 100" className="w-full h-full select-none" fill="none">
          <rect x="18" y="18" width="60" height="68" rx="6" fill="#F0FDF4" stroke="#2E2A40" strokeWidth="2.5" />
          <rect x="36" y="12" width="24" height="10" rx="3" fill="#2E2A40" />
          <rect x="26" y="32" width="12" height="12" rx="2" fill="#22C55E" stroke="#2E2A40" strokeWidth="1.5" />
          <path d="M29 38 L32 41 L36 35" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" />
          <line x1="44" y1="38" x2="68" y2="38" stroke="#2E2A40" strokeWidth="2" strokeLinecap="round" />

          <rect x="26" y="50" width="12" height="12" rx="2" fill="#22C55E" stroke="#2E2A40" strokeWidth="1.5" />
          <path d="M29 56 L32 59 L36 53" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" />
          <line x1="44" y1="56" x2="68" y2="56" stroke="#2E2A40" strokeWidth="2" strokeLinecap="round" />

          <rect x="26" y="68" width="12" height="12" rx="2" fill="#FFFFFF" stroke="#2E2A40" strokeWidth="1.5" />
          <line x1="44" y1="74" x2="60" y2="74" stroke="#CBD5E1" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );

    case 'rubric-template':
      // Carpeta de plantillas con matriz adentro
      return (
        <svg viewBox="0 0 100 100" className="w-full h-full select-none" fill="none">
          <path d="M16 28 L38 28 L46 36 L84 36 L84 78 L16 78 Z" fill="#FEF08A" stroke="#2E2A40" strokeWidth="2.5" />
          <rect x="24" y="42" width="56" height="38" rx="4" fill="#FFFFFF" stroke="#2E2A40" strokeWidth="2" />
          <line x1="24" y1="54" x2="80" y2="54" stroke="#2E2A40" strokeWidth="1.5" />
          <line x1="48" y1="42" x2="48" y2="80" stroke="#2E2A40" strokeWidth="1.5" />
          <path d="M78 20 L80 26 L86 28 L80 30 L78 36 L76 30 L70 28 L76 26 Z" fill="#F59E0B" />
        </svg>
      );

    case 'checklist-template':
      // Cuaderno espiral de listas
      return (
        <svg viewBox="0 0 100 100" className="w-full h-full select-none" fill="none">
          <rect x="24" y="20" width="58" height="66" rx="6" fill="#FCE7F3" stroke="#2E2A40" strokeWidth="2.5" />
          {[28, 40, 52, 64, 76].map((y) => (
            <ellipse key={y} cx="24" cy={y} rx="6" ry="3" fill="#2E2A40" />
          ))}
          <circle cx="40" cy="38" r="5" fill="#EC4899" />
          <line x1="52" y1="38" x2="72" y2="38" stroke="#2E2A40" strokeWidth="2" strokeLinecap="round" />
          <circle cx="40" cy="56" r="5" fill="#EC4899" />
          <line x1="52" y1="56" x2="72" y2="56" stroke="#2E2A40" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );

    case 'robot-activity':
      // Brazo robótico cibernético tocando bloque didáctico (estilo Padlet bot)
      return (
        <svg viewBox="0 0 100 100" className="w-full h-full select-none" fill="none">
          <rect x="20" y="58" width="58" height="26" rx="6" fill="#DDD6FE" stroke="#2E2A40" strokeWidth="2.5" />
          <circle cx="36" cy="71" r="5" fill="#7C3AED" />
          <circle cx="52" cy="71" r="5" fill="#F43F5E" />
          <circle cx="68" cy="71" r="5" fill="#10B981" />
          <path d="M88 10 L72 30 L54 36 L44 54" stroke="#2E2A40" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="72" cy="30" r="5" fill="#60A5FA" stroke="#2E2A40" strokeWidth="2" />
          <circle cx="54" cy="36" r="4.5" fill="#F472B6" stroke="#2E2A40" strokeWidth="2" />
          <circle cx="44" cy="54" r="3.5" fill="#FBBF24" stroke="#2E2A40" strokeWidth="1.5" />
          <path d="M40 48 L44 42 L48 48 L44 52 Z" fill="#FBBF24" />
        </svg>
      );

    case 'robot-rubric':
      // Cabeza de robot simpático proyectando matriz holográfica
      return (
        <svg viewBox="0 0 100 100" className="w-full h-full select-none" fill="none">
          <line x1="50" y1="12" x2="50" y2="24" stroke="#2E2A40" strokeWidth="2.5" />
          <circle cx="50" cy="12" r="4" fill="#EF4444" stroke="#2E2A40" strokeWidth="1.5" />
          <rect x="28" y="24" width="44" height="34" rx="8" fill="#E2E8F0" stroke="#2E2A40" strokeWidth="2.5" />
          <rect x="22" y="34" width="6" height="14" rx="2" fill="#94A3B8" stroke="#2E2A40" strokeWidth="1.5" />
          <rect x="72" y="34" width="6" height="14" rx="2" fill="#94A3B8" stroke="#2E2A40" strokeWidth="1.5" />
          <rect x="34" y="32" width="32" height="12" rx="4" fill="#0F172A" />
          <circle cx="42" cy="38" r="3" fill="#38BDF8" />
          <circle cx="58" cy="38" r="3" fill="#38BDF8" />
          <path d="M42 50 Q50 54 58 50" stroke="#2E2A40" strokeWidth="2" strokeLinecap="round" />
          <rect x="20" y="66" width="60" height="22" rx="4" fill="#FEF3C7" stroke="#2E2A40" strokeWidth="2" />
          <line x1="20" y1="76" x2="80" y2="76" stroke="#2E2A40" strokeWidth="1.5" />
          <line x1="50" y1="66" x2="50" y2="88" stroke="#2E2A40" strokeWidth="1.5" />
        </svg>
      );

    case 'robot-checklist':
      // Escáner láser IA con checklist
      return (
        <svg viewBox="0 0 100 100" className="w-full h-full select-none" fill="none">
          <rect x="24" y="22" width="52" height="64" rx="6" fill="#F1F5F9" stroke="#2E2A40" strokeWidth="2.5" />
          <line x1="16" y1="46" x2="84" y2="46" stroke="#EC4899" strokeWidth="2.5" strokeDasharray="3 2" />
          <circle cx="36" cy="36" r="4" fill="#10B981" />
          <line x1="46" y1="36" x2="66" y2="36" stroke="#2E2A40" strokeWidth="2" strokeLinecap="round" />
          <circle cx="36" cy="58" r="4" fill="#10B981" />
          <line x1="46" y1="58" x2="66" y2="58" stroke="#2E2A40" strokeWidth="2" strokeLinecap="round" />
          <circle cx="36" cy="74" r="4" fill="#F59E0B" />
          <line x1="46" y1="74" x2="60" y2="74" stroke="#CBD5E1" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );

    default:
      return null;
  }
};

// ── COMPONENTE TARJETA ESTILO PADLET ──
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
      className="group relative rounded-3xl bg-[#F2EDFD] hover:bg-[#EBE2FC] active:scale-[0.98] border border-[#E3D9FB] p-4 transition-all duration-200 cursor-pointer shadow-xs hover:shadow-md flex flex-row items-stretch justify-between gap-3 min-h-[136px]"
    >
      {/* Columna Izquierda: Información */}
      <div className="flex-1 flex flex-col justify-between min-w-0 pr-1">
        <div>
          <span className="block text-[10px] font-bold uppercase tracking-wider text-[#7C3AED] mb-1">
            {item.eyebrow}
          </span>
          <h4 className="text-[14px] sm:text-[15px] font-extrabold text-[#1E1E2F] leading-snug tracking-tight group-hover:text-[#5B21B6] transition-colors line-clamp-3">
            {item.title}
          </h4>
        </div>

        <div className="pt-2 flex items-center gap-2">
          {item.isNew && (
            <span className="inline-flex items-center px-2 py-0.5 text-[9px] font-black uppercase tracking-wider bg-[#22C55E] text-white rounded-full shadow-2xs">
              Nuevo
            </span>
          )}
          <span className="text-[10px] font-bold text-[#6B7280] flex items-center gap-1 group-hover:text-[#7C3AED] transition-colors">
            <span>Iniciar guía</span>
            <span className="text-xs transition-transform group-hover:translate-x-0.5">→</span>
          </span>
        </div>
      </div>

      {/* Columna Derecha: Ilustración sticker con duración sobrepuesta */}
      <div className="relative w-22 h-22 sm:w-24 sm:h-24 shrink-0 flex items-center justify-center p-1 rounded-2xl bg-white/40 border border-white/60">
        <StickerIllustration type={item.sticker} />

        {/* Píldora de duración en negro translúcido abajo a la derecha */}
        <div className="absolute bottom-1 right-1 bg-black/85 backdrop-blur-xs text-white text-[9px] font-extrabold px-1.5 py-0.5 rounded-full flex items-center gap-1 shadow-sm select-none">
          <Play size={8} fill="currentColor" className="text-white" />
          <span>{item.duration}</span>
        </div>
      </div>
    </div>
  );
};

// ── VISTA PRINCIPAL REUTILIZABLE (PANTALLA O MODAL) ──
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
  const [showAllEvaluacion, setShowAllEvaluacion] = useState(false);

  // Filtrado reactivo
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
    <div className={`w-full flex flex-col bg-white ${isModal ? 'max-h-[92vh] rounded-3xl shadow-2xl border border-slate-200/80 overflow-hidden' : 'min-h-[80vh] rounded-3xl border border-slate-200/80 shadow-xs'}`}>
      {/* ENCABEZADO SUPERIOR */}
      <div className="px-6 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#EDE7F6] text-[#7C3AED] flex items-center justify-center font-bold shadow-xs">
            <Compass size={22} />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-black text-[#1E1E2F] tracking-tight">
              Centro de Microlecciones y Tutoriales
            </h2>
            <p className="text-xs text-slate-500 font-medium">
              Guías interactivas guiadas en la plataforma para dominar la evaluación por competencias
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Buscador de tutoriales */}
          <div className="relative w-full sm:w-64">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar tutorial..."
              className="w-full pl-9 pr-4 py-2 bg-white rounded-full border border-slate-200 text-xs font-semibold placeholder:text-slate-400 focus:outline-none focus:border-[#7C3AED] focus:ring-2 focus:ring-[#7C3AED]/20 transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X size={12} />
              </button>
            )}
          </div>

          {/* Botón cerrar si es modal */}
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors cursor-pointer shrink-0"
              aria-label="Cerrar modal"
            >
              <X size={20} />
            </button>
          )}
        </div>
      </div>

      {/* BARRA DE FILTROS TIPO PÍLDORA */}
      <div className="px-6 py-2.5 border-b border-slate-100 bg-white flex items-center gap-1.5 overflow-x-auto scrollbar-none">
        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1 hidden sm:inline-block">
          Filtrar:
        </span>
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
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1.5 ${
                active
                  ? 'bg-[#1E1E2F] text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200/70 hover:text-slate-900'
              }`}
            >
              <span>{cat.label}</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                  active ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-600'
                }`}
              >
                {cat.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* CUERPO DEL CONTENIDO SCROLLABLE */}
      <div className={`flex-1 overflow-y-auto px-6 py-6 space-y-8 ${isModal ? 'max-h-[68vh]' : ''}`}>
        {filteredItems.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <Compass size={40} className="mx-auto mb-3 opacity-40 text-[#7C3AED]" />
            <p className="text-sm font-bold text-slate-700">No se encontraron tutoriales</p>
            <p className="text-xs text-slate-500 mt-1">Prueba con otra palabra clave en el buscador.</p>
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('all');
              }}
              className="mt-4 px-4 py-2 rounded-full bg-slate-100 text-xs font-bold text-slate-700 hover:bg-slate-200 cursor-pointer"
            >
              Restablecer filtros
            </button>
          </div>
        ) : (
          <>
            {/* SECCIÓN 1: GESTIÓN Y CURSOS */}
            {gestionItems.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-3.5">
                  <div className="flex items-baseline gap-2">
                    <h3 className="text-base sm:text-lg font-black text-[#1E1E2F] tracking-tight">
                      Ejemplos de uso y Gestión
                    </h3>
                    <span className="text-xs font-bold text-slate-400">
                      {gestionItems.length} {gestionItems.length === 1 ? 'tutorial' : 'tutoriales'}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {gestionItems.map((item) => (
                    <TutorialCard key={item.id} item={item} onSelect={onSelectTutorial} />
                  ))}
                </div>
              </div>
            )}

            {/* SECCIÓN 2: EVALUACIÓN E INSTRUMENTOS */}
            {evaluacionItems.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-3.5">
                  <div className="flex items-baseline gap-2">
                    <h3 className="text-base sm:text-lg font-black text-[#1E1E2F] tracking-tight">
                      Evaluación e Instrumentos
                    </h3>
                    <span className="text-xs font-bold text-slate-400">
                      {evaluacionItems.length} tutoriales
                    </span>
                  </div>

                  {evaluacionItems.length > 4 && (
                    <button
                      type="button"
                      onClick={() => setShowAllEvaluacion((prev) => !prev)}
                      className="text-xs font-bold text-slate-500 hover:text-[#7C3AED] transition-colors cursor-pointer"
                    >
                      {showAllEvaluacion ? 'Ver menos' : 'Mostrar todo'}
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {(showAllEvaluacion ? evaluacionItems : evaluacionItems.slice(0, 4)).map((item) => (
                    <TutorialCard key={item.id} item={item} onSelect={onSelectTutorial} />
                  ))}
                </div>
              </div>
            )}

            {/* SECCIÓN 3: INTELIGENCIA ARTIFICIAL */}
            {iaItems.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-3.5">
                  <div className="flex items-baseline gap-2">
                    <h3 className="text-base sm:text-lg font-black text-[#1E1E2F] tracking-tight flex items-center gap-1.5">
                      <span>Inteligencia Artificial Docente</span>
                      <Sparkles size={16} className="text-[#7C3AED]" />
                    </h3>
                    <span className="text-xs font-bold text-slate-400">
                      {iaItems.length} {iaItems.length === 1 ? 'tutorial' : 'tutoriales'}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {iaItems.map((item) => (
                    <TutorialCard key={item.id} item={item} onSelect={onSelectTutorial} />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* PIE DE PÁGINA INFORMATIVO */}
      <div className="px-6 py-3 border-t border-slate-100 bg-slate-50 text-slate-500 text-xs flex flex-col sm:flex-row items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#22C55E]" />
          <span className="font-semibold text-slate-700">
            Haz clic en cualquier microlección para activar el recorrido interactivo guiado en CIELO.
          </span>
        </div>
        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
          CIELO Learning v2.5
        </span>
      </div>
    </div>
  );
};

// ── MODAL PRINCIPAL: CENTRO DE TUTORIALES PADLET ──
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
      className="fixed inset-0 z-100 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-3 sm:p-6 animate-in fade-in duration-200"
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
