import { useState } from 'react';
import { CF_BASE } from '../../../lib/curriculo';

type Detail = {
  short: string;
  description: string;
  color: string;
  textColor: string;
  clip: string;
};

const DETAILS: Detail[] = [
  {
    short: 'Comunicativa',
    description:
      'Comprender, producir y comunicar mensajes con distintos lenguajes en contextos reales.',
    color: '#537BAC',
    textColor: '#FCFCFA',
    clip: 'polygon(0 0, 100% 0, 100% 78%, 78% 100%, 0 100%)',
  },
  {
    short: 'Pensamiento crítico',
    description:
      'Analizar, argumentar y generar ideas propias con criterio, lógica y creatividad.',
    color: '#689C63',
    textColor: '#2E3330',
    clip: 'polygon(0 0, 100% 0, 100% 100%, 22% 100%, 0 78%)',
  },
  {
    short: 'Resolución de problemas',
    description:
      'Aplicar estrategias y conocimientos para afrontar situaciones nuevas de la vida cotidiana.',
    color: '#2E3330',
    textColor: '#FCFCFA',
    clip: 'polygon(0 14%, 100% 0, 100% 86%, 14% 100%)',
  },
  {
    short: 'Científica y tecnológica',
    description:
      'Comprender y usar el conocimiento científico y tecnológico para transformar el entorno.',
    color: '#DEAE4D',
    textColor: '#2E3330',
    clip: 'polygon(0 0, 86% 0, 100% 22%, 100% 100%, 0 100%)',
  },
  {
    short: 'Ambiental y salud',
    description:
      'Cuidar el entorno y la salud desde hábitos y decisiones responsables y sostenibles.',
    color: '#BFC9A6',
    textColor: '#2E3330',
    clip: 'polygon(0 0, 100% 12%, 88% 100%, 0 100%)',
  },
  {
    short: 'Ética y ciudadana',
    description:
      'Actuar con valores, derechos y deberes en una sociedad democrática y diversa.',
    color: '#EB8847',
    textColor: '#2E3330',
    clip: 'polygon(0 0, 100% 0, 100% 100%, 0 88%)',
  },
  {
    short: 'Desarrollo personal',
    description:
      'Conocerse, valorarse y cultivar el bienestar personal y espiritual a lo largo de la vida.',
    color: '#DB5B48',
    textColor: '#FCFCFA',
    clip: 'polygon(0 0, 100% 0, 78% 100%, 0 100%)',
  },
];

const COMPETENCIAS = CF_BASE.map((competencia, index) => ({
  ...competencia,
  ...DETAILS[index],
}));

export function CompetencyExplorer() {
  const [active, setActive] = useState(0);
  const selected = COMPETENCIAS[active];

  return (
    <section
      id="competencias"
      className="scroll-mt-24 border-t border-[#2E3330]/10 bg-[#E9E9DB] py-16 sm:py-24 md:py-32"
    >
      <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
        <header className="max-w-3xl">
          <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-[#5F665E]">
            Currículo dominicano
          </p>
          <h2 className="mt-4 text-3xl font-extrabold leading-[1.05] tracking-[-0.035em] text-[#2E3330] sm:text-4xl md:text-5xl">
            Siete competencias.
            <br />
            Una misma forma de mirar el aprendizaje.
          </h2>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-[#5F665E] sm:text-lg">
            Las Competencias Fundamentales del currículo dominicano están integradas en cada
            actividad, evidencia e indicador. Toca una pieza para explorar cómo se conectan.
          </p>
        </header>

        <div
          className="mt-12 grid grid-cols-2 gap-2 md:mt-14 md:grid-cols-4 md:gap-3"
          role="group"
          aria-label="Competencias fundamentales"
        >
          {COMPETENCIAS.map((competencia, index) => {
            const isActive = index === active;
            const isLead = index === 0;
            return (
              <button
                key={competencia.codigoPorDefecto}
                type="button"
                onClick={() => setActive(index)}
                aria-pressed={isActive}
                className={`landing-shape group relative p-[3px] text-left transition-transform duration-300 focus-visible:scale-[1.02] focus-visible:bg-[#2E3330] ${
                  isLead ? 'col-span-2 aspect-[4/3] md:aspect-[8/3]' : 'aspect-[4/3]'
                } ${isActive ? 'scale-[1.01]' : 'hover:-translate-y-0.5'}`}
                style={{
                  clipPath: competencia.clip,
                  backgroundColor: isActive ? '#2E3330' : 'transparent',
                }}
              >
                <span
                  className="relative flex h-full w-full flex-col justify-between p-4 sm:p-5"
                  style={{
                    clipPath: competencia.clip,
                    backgroundColor: competencia.color,
                    color: competencia.textColor,
                  }}
                >
                  <span className="flex items-center justify-between text-[10px] font-bold uppercase tracking-[0.18em] opacity-90">
                    <span>{competencia.codigoPorDefecto}</span>
                    <span>{competencia.bloque}</span>
                  </span>
                  <span
                    className={`block font-extrabold leading-tight tracking-[-0.02em] ${
                      isLead ? 'text-xl sm:text-2xl' : 'text-base sm:text-lg'
                    }`}
                  >
                    {competencia.short}
                  </span>
                </span>
              </button>
            );
          })}
        </div>

        <div
          className="mt-10 border-l-4 bg-[#2E3330] p-6 sm:p-8 md:mt-12 md:grid md:grid-cols-12 md:gap-8"
          style={{ borderColor: selected.color }}
          aria-live="polite"
        >
          <div key={selected.codigoPorDefecto} className="landing-fade-up md:col-span-5">
            <p
              className="text-[11px] font-bold uppercase tracking-[0.24em]"
              style={{ color: selected.color }}
            >
              Competencia Fundamental · {selected.codigoPorDefecto}
            </p>
            <h3 className="mt-3 text-2xl font-extrabold leading-tight tracking-[-0.02em] text-[#FCFCFA] sm:text-3xl">
              {selected.nombre}
            </h3>
            <p className="mt-3 text-xs font-semibold uppercase tracking-[0.16em] text-[#FCFCFA]/45">
              Bloque {selected.bloque} · Currículo dominicano
            </p>
          </div>
          <div className="mt-5 md:col-span-7 md:mt-0">
            <p className="text-base leading-relaxed text-[#FCFCFA]/75 sm:text-lg">
              {selected.description}
            </p>
            <p className="mt-5 text-sm font-semibold text-[#BFC9A6]">
              En CIELO se evalúa mediante indicadores de logro, evidencias y niveles de dominio.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
