import { useState } from 'react';

type Step = {
  id: string;
  label: string;
  title: string;
  description: string;
  micro: string;
  color: string;
  points: string;
};

const STEPS: Step[] = [
  {
    id: 'actividad',
    label: 'ACTIVIDAD',
    title: 'El punto de partida',
    description:
      'El docente diseña una actividad contextualizada y la vincula a los indicadores de logro del currículo.',
    micro: 'Se planifica en Actividades, Secuencias y Fichas de clase.',
    color: '#DEAE4D',
    points: '50,8 92,88 8,88',
  },
  {
    id: 'evidencia',
    label: 'EVIDENCIA',
    title: 'La prueba del aprendizaje',
    description:
      'El estudiante entrega un producto o desempeño que demuestra lo que ha aprendido.',
    micro: 'Se recibe desde el Portal del Estudiante y el portafolio.',
    color: '#EB8847',
    points: '12,22 88,8 78,92 22,80',
  },
  {
    id: 'indicador',
    label: 'INDICADOR',
    title: 'El criterio que orienta',
    description:
      'La evidencia se contrasta con criterios y niveles de dominio (BC1–BC4) definidos por el docente.',
    micro: 'Se registra con Rúbricas y Listas de cotejo.',
    color: '#BFC9A6',
    points: '50,6 94,38 78,92 22,92 6,38',
  },
  {
    id: 'competencia',
    label: 'COMPETENCIA',
    title: 'El aprendizaje que queda',
    description:
      'El logro se integra en el perfil competencial del estudiante y en sus reportes de evaluación.',
    micro: 'Se refleja en Boletines y Reportes de evaluación.',
    color: '#689C63',
    points: '50,4 94,28 94,72 50,96 6,72 6,28',
  },
];

function StepGlyph({
  points,
  color,
  active,
  compact = false,
}: {
  points: string;
  color: string;
  active: boolean;
  compact?: boolean;
}) {
  return (
    <svg
      viewBox="0 0 100 100"
      aria-hidden="true"
      className={`landing-shape ${compact ? 'h-8 w-8' : 'h-12 w-12'}`}
      style={{
        transform: active ? 'scale(1.08)' : 'scale(1)',
        opacity: active ? 1 : 0.55,
      }}
    >
      <polygon
        points={points}
        fill={active ? color : 'transparent'}
        stroke={active ? color : '#FCFCFA'}
        strokeWidth="4"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function EvaluationFlow() {
  const [active, setActive] = useState(0);
  const step = STEPS[active];
  const progress = (active / (STEPS.length - 1)) * 100;

  return (
    <section
      id="como-funciona"
      className="relative scroll-mt-24 overflow-hidden border-t border-[#2E3330] bg-[#2E3330] py-16 text-[#FCFCFA] sm:py-24 md:py-32"
    >
      <div className="pointer-events-none absolute -right-24 top-16 hidden h-[420px] w-[420px] opacity-[0.06] lg:block">
        <svg viewBox="0 0 420 420" fill="none" aria-hidden="true">
          <polygon
            points="210,10 400,120 400,310 210,410 20,310 20,120"
            stroke="#FCFCFA"
            strokeWidth="2"
          />
          <polygon
            points="210,70 340,145 340,285 210,350 80,285 80,145"
            stroke="#FCFCFA"
            strokeWidth="2"
          />
        </svg>
      </div>

      <div className="relative mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
        <header className="max-w-3xl">
          <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-[#BFC9A6]">
            Cómo entiende CIELO la evaluación
          </p>
          <h2 className="mt-4 text-3xl font-extrabold leading-[1.05] tracking-[-0.035em] text-[#FCFCFA] sm:text-4xl md:text-5xl">
            De la actividad a la competencia.
          </h2>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-[#FCFCFA]/65 sm:text-lg">
            La evaluación no termina en una nota. Cada actividad genera una evidencia, cada
            evidencia se lee con indicadores y cada indicador alimenta una competencia.
          </p>
        </header>

        <div className="mt-14 hidden md:block">
          <div className="relative">
            <div className="absolute left-[12.5%] right-[12.5%] top-12 h-px bg-[#FCFCFA]/15" />
            <div
              className="landing-line absolute left-[12.5%] top-12 h-px bg-[#DEAE4D]"
              style={{ width: `${(progress * 0.75).toFixed(2)}%` }}
            />

            <div className="grid grid-cols-4" role="group" aria-label="Etapas de la evaluación">
              {STEPS.map((item, index) => {
                const isActive = index === active;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setActive(index)}
                    aria-pressed={isActive}
                    className="group relative flex flex-col items-center px-3 text-center focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#DEAE4D]"
                  >
                    <span
                      className={`relative z-10 flex h-24 w-24 items-center justify-center bg-[#2E3330] transition-transform duration-300 ${
                        isActive ? 'scale-110' : 'scale-100'
                      }`}
                    >
                      <StepGlyph points={item.points} color={item.color} active={isActive} />
                    </span>
                    <span
                      className={`mt-5 text-[11px] font-bold tracking-[0.24em] transition-colors ${
                        isActive ? 'text-[#DEAE4D]' : 'text-[#FCFCFA]/45'
                      }`}
                    >
                      {item.label}
                    </span>
                    <span
                      className={`mt-2 text-sm font-semibold transition-colors ${
                        isActive ? 'text-[#FCFCFA]' : 'text-[#FCFCFA]/45'
                      }`}
                    >
                      {item.title}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="mt-10 md:hidden">
          <div className="relative">
            <div className="absolute bottom-6 left-6 top-6 w-px bg-[#FCFCFA]/15" />
            <div
              className="landing-line absolute left-6 top-6 w-px bg-[#DEAE4D]"
              style={{ height: `calc(${progress}% - ${(progress * 0.48).toFixed(2)}px)` }}
            />
            <div className="space-y-2" role="group" aria-label="Etapas de la evaluación">
              {STEPS.map((item, index) => {
                const isActive = index === active;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setActive(index)}
                    aria-pressed={isActive}
                    className="relative flex w-full items-center gap-4 py-2 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#DEAE4D]"
                  >
                    <span
                      className={`relative z-10 flex h-12 w-12 shrink-0 items-center justify-center bg-[#2E3330] transition-transform duration-300 ${
                        isActive ? 'scale-110' : 'scale-100'
                      }`}
                    >
                      <StepGlyph
                        points={item.points}
                        color={item.color}
                        active={isActive}
                        compact
                      />
                    </span>
                    <span>
                      <span
                        className={`block text-[10px] font-bold tracking-[0.22em] ${
                          isActive ? 'text-[#DEAE4D]' : 'text-[#FCFCFA]/40'
                        }`}
                      >
                        0{index + 1} · {item.label}
                      </span>
                      <span
                        className={`mt-1 block text-sm font-semibold ${
                          isActive ? 'text-[#FCFCFA]' : 'text-[#FCFCFA]/50'
                        }`}
                      >
                        {item.title}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="mt-12 border-t border-[#FCFCFA]/15 pt-8 md:mt-16 md:grid md:grid-cols-12 md:gap-8">
          <div key={step.id} className="landing-fade-up md:col-span-4">
            <p
              className="text-[11px] font-bold uppercase tracking-[0.28em]"
              style={{ color: step.color }}
            >
              {step.label}
            </p>
            <h3 className="mt-3 text-2xl font-extrabold tracking-[-0.02em] text-[#FCFCFA] sm:text-3xl">
              {step.title}
            </h3>
          </div>
          <div className="mt-4 md:col-span-8 md:mt-0">
            <p className="max-w-2xl text-base leading-relaxed text-[#FCFCFA]/70 sm:text-lg">
              {step.description}
            </p>
            <p className="mt-4 text-sm font-semibold text-[#BFC9A6]">{step.micro}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
