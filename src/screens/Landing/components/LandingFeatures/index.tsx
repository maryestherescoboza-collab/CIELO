import { useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  BarChart3,
  CalendarCheck,
  ClipboardList,
  FolderSync,
  ListChecks,
  ShieldAlert,
  TableProperties,
} from 'lucide-react';

import cursoDetalle from '../../assets/features/curso-detalle.png';
import rubrica from '../../assets/features/rubrica.png';
import portafolioDocente from '../../assets/features/portafolio-docente.png';
import incidencias from '../../assets/features/incidencias.png';
import boletines from '../../assets/features/boletines.png';

type Module = {
  id: string;
  label: string;
  title: string;
  description: string;
  points: string[];
  color: string;
  icon: LucideIcon;
  image?: string;
  imageAlt?: string;
  visualTitle?: string;
};

const MODULES: Module[] = [
  {
    id: 'actividades',
    label: 'Actividades',
    title: 'Actividades que nacen del currículo',
    description:
      'Diseña actividades vinculadas a indicadores de logro y registra su avance por período.',
    points: [
      'Actividades por competencia y período',
      'Registro continuo de calificaciones',
      'Vínculo directo con secuencias didácticas',
    ],
    color: '#537BAC',
    icon: ClipboardList,
    image: cursoDetalle,
    imageAlt: 'Registro de actividades y calificaciones por competencia en CIELO',
  },
  {
    id: 'rubricas',
    label: 'Rúbricas',
    title: 'Rúbricas socioformativas',
    description:
      'Define descriptores por niveles de dominio (BC1–BC4), reutiliza instrumentos entre cursos y exporta el formato oficial.',
    points: [
      'Niveles de dominio taxonómicos',
      'Duplicación entre cursos y períodos',
      'Exportación oficial a Word (.docx)',
    ],
    color: '#689C63',
    icon: TableProperties,
    image: rubrica,
    imageAlt: 'Rúbrica socioformativa con niveles de dominio en CIELO',
  },
  {
    id: 'cotejo',
    label: 'Listas de cotejo',
    title: 'Criterios de logro verificables',
    description:
      'Verifica cada criterio con listas de cotejo y escalas claras, y genera las recuperaciones pedagógicas que correspondan.',
    points: [
      'Verificación directa de criterios',
      'Escalas y recuperación pedagógica',
      'Trazabilidad por estudiante y período',
    ],
    color: '#DEAE4D',
    icon: ListChecks,
    visualTitle: 'Criterios claros, decisiones pedagógicas oportunas.',
  },
  {
    id: 'asistencia',
    label: 'Asistencia',
    title: 'Asistencia con contexto',
    description:
      'Registra la asistencia por curso y período, y consulta reportes para acompañar a tiempo a quienes lo necesitan.',
    points: [
      'Registro por curso y período',
      'Reportes de asistencia',
      'Seguimiento junto al desempeño académico',
    ],
    color: '#EB8847',
    icon: CalendarCheck,
    visualTitle: 'La presencia también cuenta en la evaluación.',
  },
  {
    id: 'evidencias',
    label: 'Evidencias y portafolios',
    title: 'El aprendizaje, documentado',
    description:
      'Los estudiantes entregan evidencias desde su portal; el docente revisa, retroalimenta y conserva los productos de cada actividad.',
    points: [
      'Portal seguro para estudiantes',
      'Recepción de evidencias digitales',
      'Retroalimentación formativa oportuna',
    ],
    color: '#537BAC',
    icon: FolderSync,
    image: portafolioDocente,
    imageAlt: 'Portafolio y evidencias del docente en CIELO',
  },
  {
    id: 'incidencias',
    label: 'Incidencias y bitácora',
    title: 'Seguimiento que no se pierde',
    description:
      'Registra incidencias y da continuidad a cada caso con una bitácora clara, compartida con la coordinación del centro.',
    points: [
      'Registro de incidencias por estudiante',
      'Bitácora y seguimiento institucional',
      'Visibilidad para coordinación pedagógica',
    ],
    color: '#DB5B48',
    icon: ShieldAlert,
    image: incidencias,
    imageAlt: 'Registro de incidencias y bitácora en CIELO',
  },
  {
    id: 'reportes',
    label: 'Reportes de evaluación',
    title: 'Reportes listos para decidir',
    description:
      'Genera boletines de período y reportes por competencia con un solo clic, listos para la entrega familiar y la coordinación.',
    points: [
      'Boletines oficiales para impresión',
      'Progreso individual y grupal',
      'Historial curricular centralizado',
    ],
    color: '#2E3330',
    icon: BarChart3,
    image: boletines,
    imageAlt: 'Boletines de evaluación por período en CIELO',
  },
];

function GeometricPanel({ module }: { module: Module }) {
  const Icon = module.icon;
  return (
    <div className="relative aspect-[16/9] overflow-hidden bg-[#2E3330]">
      <svg
        viewBox="0 0 800 500"
        className="absolute inset-0 h-full w-full"
        preserveAspectRatio="xMidYMid slice"
        aria-hidden="true"
      >
        <polygon points="0,0 300,0 150,250 0,320" fill={module.color} opacity="0.9" />
        <polygon points="300,0 560,0 420,210 150,250" fill={module.color} opacity="0.45" />
        <polygon points="560,0 800,0 800,220 420,210" fill="#FCFCFA" opacity="0.08" />
        <polygon points="0,320 150,250 420,210 800,220 800,500 0,500" fill="#FCFCFA" opacity="0.04" />
        <polygon points="0,500 800,500 800,430 340,360" fill={module.color} opacity="0.25" />
      </svg>
      <div className="relative flex h-full flex-col justify-between p-6 sm:p-8">
        <Icon className="h-8 w-8 text-[#FCFCFA]/80" strokeWidth={1.8} />
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-[#FCFCFA]/45">
            Vista conceptual
          </p>
          <p className="mt-2 max-w-sm text-xl font-extrabold leading-tight tracking-[-0.02em] text-[#FCFCFA] sm:text-2xl">
            {module.visualTitle}
          </p>
        </div>
      </div>
    </div>
  );
}

export function LandingFeatures() {
  const [active, setActive] = useState(0);
  const module = MODULES[active];

  return (
    <section
      id="producto"
      className="scroll-mt-24 border-t border-[#2E3330]/10 bg-[#FCFCFA] py-16 sm:py-24 md:py-32"
    >
      <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
        <header className="max-w-3xl">
          <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-[#5F665E]">
            El producto
          </p>
          <h2 className="mt-4 text-3xl font-extrabold leading-[1.05] tracking-[-0.035em] text-[#2E3330] sm:text-4xl md:text-5xl">
            Herramientas reales para cada etapa de tu labor docente.
          </h2>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-[#5F665E] sm:text-lg">
            Sin hojas de cálculo dispersas ni cálculos manuales repetitivos. Una suite educativa
            integral pensada para resolver el flujo diario de los centros educativos.
          </p>
        </header>

        <div className="mt-12 grid gap-8 md:mt-16 lg:grid-cols-12 lg:gap-10">
          <div className="min-w-0 lg:col-span-4">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#5F665E]/70 lg:hidden">
              Desliza para ver los 7 módulos →
            </p>
            <div
              role="group"
              aria-label="Módulos del producto"
              className="landing-scroll-x flex gap-1 overflow-x-auto pb-2 lg:flex-col lg:gap-0 lg:overflow-visible lg:pb-0"
            >
              {MODULES.map((item, index) => {
                const isActive = index === active;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setActive(index)}
                    aria-pressed={isActive}
                    className={`group flex shrink-0 items-center gap-3 border-b border-[#2E3330]/10 px-4 py-3 text-left transition-colors duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2E3330] lg:shrink lg:border-b-0 lg:border-l-2 lg:px-5 lg:py-4 ${
                      isActive ? 'bg-[#E9E9DB]' : 'hover:bg-[#E9E9DB]/50'
                    }`}
                    style={{
                      borderLeftColor: isActive ? item.color : 'transparent',
                      borderBottomColor: isActive ? item.color : undefined,
                    }}
                  >
                    <span
                      className={`text-[10px] font-bold tabular-nums ${
                        isActive ? 'text-[#2E3330]' : 'text-[#5F665E]/70'
                      }`}
                    >
                      0{index + 1}
                    </span>
                    <span
                      className={`whitespace-nowrap text-sm font-bold lg:whitespace-normal ${
                        isActive ? 'text-[#2E3330]' : 'text-[#5F665E]'
                      }`}
                    >
                      {item.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="min-w-0 lg:col-span-8">
            <div key={module.id} className="landing-fade-up">
              {module.image ? (
                <figure className="overflow-hidden border border-[#2E3330]/15 bg-white">
                  <div className="flex items-center justify-between gap-4 border-b border-[#2E3330]/10 px-4 py-3">
                    <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#5F665E]">
                      {module.label}
                    </span>
                    <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#5F665E]/70">
                      Captura real de CIELO
                    </span>
                  </div>
                  <div className="flex aspect-[16/9] items-center justify-center bg-[#F8F3ED] p-2 sm:p-3">
                    <img
                      src={module.image}
                      alt={module.imageAlt}
                      loading="lazy"
                      decoding="async"
                      className="h-full w-full object-contain"
                    />
                  </div>
                </figure>
              ) : (
                <GeometricPanel module={module} />
              )}

              <div className="mt-8 border-t border-[#2E3330]/10 pt-6 md:grid md:grid-cols-2 md:gap-10">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-[#5F665E]">
                    Módulo 0{active + 1}
                  </p>
                  <h3 className="mt-2 text-2xl font-extrabold leading-tight tracking-[-0.025em] text-[#2E3330]">
                    {module.title}
                  </h3>
                  <p className="mt-3 text-sm leading-relaxed text-[#5F665E] sm:text-base">
                    {module.description}
                  </p>
                </div>
                <ul className="mt-5 space-y-2.5 md:mt-0">
                  {module.points.map((point) => (
                    <li key={point} className="flex gap-3 text-sm font-medium text-[#2E3330]">
                      <span
                        className="mt-1.5 h-1.5 w-1.5 shrink-0"
                        style={{ backgroundColor: module.color }}
                      />
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
