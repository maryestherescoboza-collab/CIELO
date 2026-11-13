import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../../../store/appStore';

export function LandingPricing() {
  const navigate = useNavigate();
  const { session } = useAppStore();
  const [docentes, setDocentes] = useState<number>(25);
  const [mobilePlan, setMobilePlan] = useState<'mensual' | 'anual' | 'institucional'>('anual');

  const handlePlanSelection = (plan: 'individual' | 'institucional') => {
    if (session) {
      navigate(`/suscripcion?plan=${plan}`);
    } else {
      navigate(`/auth?plan=${plan}`);
    }
  };

  const TASA_CAMBIO_RD = 58.8;

  const featuresComunes = [
    'Evaluación por competencias y saberes.',
    'Rúbricas socioformativas y listas de cotejo.',
    'Registro académico y actas de recuperación.',
    'Boletines oficiales para impresión.',
    'Planificación y fichas de clase.',
    'Cursos y grupos de estudiantes ilimitados.',
    'Portal estudiantil para entrega de evidencias.',
    'Soporte docente continuo.',
  ];

  const planMensual = {
    name: 'Docente Mensual',
    price: 5,
    subtitle: 'El plan ideal para iniciar tu evaluación por competencias, sin compromisos a largo plazo.',
    features: featuresComunes,
  };

  const planAnual = {
    name: 'Docente Anual',
    price: 4,
    badge: 'Ahorra 20%',
    subtitle: 'Compromiso anual de 12 meses al precio más bajo para docentes independientes.',
    features: featuresComunes,
  };

  const planInst = {
    name: 'Institución Educativa',
    price: 5,
    subtitle: 'Diseñado para centros que buscan unificar la evaluación y optimizar el trabajo de su equipo.',
    features: [
      'Todas las herramientas docentes.',
      'Acceso para todo el personal.',
      'Gestión centralizada de usuarios.',
      'Acompañamiento en la implementación.',
      '+7 días extra de prueba para centros.',
    ],
  };

  const instMensualUSD = docentes > 0 ? docentes * 5 : 0;

  return (
    <section
      id="planes"
      className="scroll-mt-24 border-t border-[#2E3330]/10 bg-[#FCFCFA] py-16 sm:py-24 md:py-32"
    >
      <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
        <header className="max-w-3xl">
          <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-[#5F665E]">
            Planes
          </p>
          <h2 className="mt-4 text-3xl font-extrabold leading-[1.05] tracking-[-0.035em] text-[#2E3330] sm:text-4xl md:text-5xl">
            Planes claros para tu realidad.
          </h2>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-[#5F665E] sm:text-lg">
            Disfruta de 15 días de prueba gratis. Elige el plan que mejor se adapte a ti o a tu
            centro.
          </p>
        </header>

        <div
          className="mt-8 flex rounded-full border border-[#2E3330]/15 bg-[#FCFCFA] p-1 md:hidden"
          role="group"
          aria-label="Seleccionar plan"
        >
          {[
            { id: 'mensual' as const, label: 'Mensual' },
            { id: 'anual' as const, label: 'Anual' },
            { id: 'institucional' as const, label: 'Institución' },
          ].map((plan) => (
            <button
              key={plan.id}
              type="button"
              onClick={() => setMobilePlan(plan.id)}
              aria-pressed={mobilePlan === plan.id}
              className={`flex-1 rounded-full px-3 py-2 text-[11px] font-bold uppercase tracking-[0.12em] transition-colors ${
                mobilePlan === plan.id
                  ? 'bg-[#2E3330] text-[#FCFCFA]'
                  : 'text-[#5F665E] hover:bg-[#E9E9DB]'
              }`}
            >
              {plan.label}
            </button>
          ))}
        </div>

        <div className="mt-6 border border-[#2E3330]/15 md:mt-16">
          <div className="grid grid-cols-1 divide-y divide-[#2E3330]/10 max-md:divide-y-0 md:grid-cols-3 md:divide-x md:divide-y-0">
            <div
              className={`flex flex-col justify-between bg-[#FCFCFA] ${
                mobilePlan !== 'mensual' ? 'max-md:hidden' : ''
              }`}
            >
              <div className="border-b border-[#2E3330]/10 p-6 sm:p-8">
                <h3 className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#2E3330]">
                  {planMensual.name}
                </h3>
                <p className="mt-3 min-h-10 text-xs leading-relaxed text-[#5F665E]">
                  {planMensual.subtitle}
                </p>
                <div className="mt-6 flex items-baseline gap-1.5">
                  <span className="text-5xl font-extrabold tracking-[-0.04em] text-[#2E3330]">
                    {planMensual.price}
                  </span>
                  <span className="text-sm font-semibold text-[#5F665E]">USD</span>
                </div>
                <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#5F665E]">
                  por mes
                </p>
                <p className="mt-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#689C63]">
                  ≈ RD${Math.round(planMensual.price * TASA_CAMBIO_RD)} / mes
                </p>
              </div>

              <div className="flex-1 space-y-3 border-b border-[#2E3330]/10 p-6 sm:p-8">
                {planMensual.features.map((feature) => (
                  <div key={feature} className="flex items-start gap-2.5">
                    <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center border border-[#689C63]/40 text-[10px] font-extrabold text-[#689C63]">
                      ✓
                    </span>
                    <span className="text-xs leading-snug text-[#5F665E]">{feature}</span>
                  </div>
                ))}
              </div>

              <div className="p-6 sm:p-8">
                <button
                  type="button"
                  onClick={() => handlePlanSelection('individual')}
                  className="w-full rounded-full border border-[#DEAE4D] px-4 py-3 text-[11px] font-bold uppercase tracking-[0.18em] text-[#2E3330] transition-colors hover:bg-[#E9E9DB] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#2E3330]"
                >
                  Comenzar gratis
                </button>
              </div>
            </div>

            <div
              className={`flex flex-col justify-between bg-[#F3EFE4] ${
                mobilePlan !== 'anual' ? 'max-md:hidden' : ''
              }`}
            >
              <div className="border-b border-[#2E3330]/10 p-6 sm:p-8">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#2E3330]">
                    {planAnual.name}
                  </h3>
                  <span className="inline-flex bg-[#DEAE4D] px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.14em] text-[#2E3330]">
                    {planAnual.badge}
                  </span>
                </div>
                <p className="mt-3 min-h-10 text-xs leading-relaxed text-[#5F665E]">
                  {planAnual.subtitle}
                </p>
                <div className="mt-6 flex items-baseline gap-1.5">
                  <span className="text-5xl font-extrabold tracking-[-0.04em] text-[#2E3330]">
                    {planAnual.price}
                  </span>
                  <span className="text-sm font-semibold text-[#5F665E]">USD</span>
                </div>
                <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#5F665E]">
                  por mes (12 cuotas)
                </p>
                <p className="mt-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#689C63]">
                  ≈ RD${Math.round(planAnual.price * TASA_CAMBIO_RD)} / mes
                </p>
              </div>

              <div className="flex-1 space-y-3 border-b border-[#2E3330]/10 p-6 sm:p-8">
                {planAnual.features.map((feature) => (
                  <div key={feature} className="flex items-start gap-2.5">
                    <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center border border-[#689C63]/40 text-[10px] font-extrabold text-[#689C63]">
                      ✓
                    </span>
                    <span className="text-xs leading-snug text-[#5F665E]">{feature}</span>
                  </div>
                ))}
              </div>

              <div className="p-6 sm:p-8">
                <button
                  type="button"
                  onClick={() => handlePlanSelection('individual')}
                  className="w-full rounded-full bg-[#DEAE4D] px-4 py-3 text-[11px] font-bold uppercase tracking-[0.18em] text-[#2E3330] transition-colors hover:bg-[#D4A33F] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#2E3330]"
                >
                  Comenzar prueba gratis
                </button>
              </div>
            </div>

            <div
              className={`flex flex-col justify-between bg-[#FCFCFA] ${
                mobilePlan !== 'institucional' ? 'max-md:hidden' : ''
              }`}
            >
              <div className="border-b border-[#2E3330]/10 p-6 sm:p-8">
                <h3 className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#2E3330]">
                  {planInst.name}
                </h3>
                <p className="mt-3 min-h-10 text-xs leading-relaxed text-[#5F665E]">
                  {planInst.subtitle}
                </p>
                <div className="mt-6 flex items-baseline gap-1.5">
                  <span className="text-5xl font-extrabold tracking-[-0.04em] text-[#2E3330]">
                    {planInst.price}
                  </span>
                  <span className="text-sm font-semibold text-[#5F665E]">USD</span>
                </div>
                <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#5F665E]">
                  por docente al mes
                </p>
                <p className="mt-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#689C63]">
                  ≈ RD${Math.round(planInst.price * TASA_CAMBIO_RD)} / docente
                </p>
              </div>

              <div className="flex-1 space-y-3 border-b border-[#2E3330]/10 p-6 sm:p-8">
                {planInst.features.map((feature) => (
                  <div key={feature} className="flex items-start gap-2.5">
                    <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center border border-[#689C63]/40 text-[10px] font-extrabold text-[#689C63]">
                      ✓
                    </span>
                    <span className="text-xs leading-snug text-[#5F665E]">{feature}</span>
                  </div>
                ))}
              </div>

              <div className="p-6 sm:p-8">
                <div className="mb-5 border-t border-[#2E3330]/15 pt-4">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[11px] font-semibold text-[#5F665E]">Total docentes</span>
                    <input
                      type="number"
                      min="1"
                      aria-label="Cantidad de docentes"
                      value={docentes || ''}
                      onChange={(event) => setDocentes(parseInt(event.target.value) || 0)}
                      className="w-16 border border-[#2E3330]/20 bg-white px-2 py-1 text-right text-xs font-bold text-[#2E3330] focus:border-[#DEAE4D] focus:outline-none"
                    />
                  </div>
                  <div className="mt-3 flex items-baseline justify-between border-t border-[#2E3330]/10 pt-3">
                    <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#5F665E]">
                      Total mensual
                    </span>
                    <span className="text-xs font-bold text-[#2E3330]">
                      ${instMensualUSD} USD
                    </span>
                  </div>
                  <p className="mt-1 text-right text-[10px] font-semibold text-[#689C63]">
                    ≈ RD${Math.round(instMensualUSD * TASA_CAMBIO_RD).toLocaleString()}
                  </p>
                </div>
                <a
                  href="https://wa.link/vshsac"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full rounded-full border border-[#2E3330]/25 px-4 py-3 text-center text-[11px] font-bold uppercase tracking-[0.18em] text-[#2E3330] transition-colors hover:border-[#2E3330] hover:bg-[#E9E9DB]"
                >
                  Cotizar centro
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
