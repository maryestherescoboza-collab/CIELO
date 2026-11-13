import { useNavigate } from 'react-router-dom';

export function LandingCTA() {
  const navigate = useNavigate();

  return (
    <section className="relative overflow-hidden bg-[#537BAC] py-16 sm:py-24 md:py-28">
      <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8 md:grid md:grid-cols-12 md:items-center md:gap-12">
        <div className="md:col-span-7">
          <h2 className="max-w-2xl text-3xl font-extrabold leading-[1.08] tracking-[-0.035em] text-[#FCFCFA] sm:text-4xl md:text-5xl">
            Simplifica la corrección para una enseñanza basada en competencias en tu centro.
          </h2>

          <p className="mt-5 max-w-xl text-base leading-relaxed text-[#FCFCFA]/75 sm:text-lg">
            Únete a docentes e instituciones educativas que evalúan con orden, transparencia y
            total alineación curricular.
          </p>

          <div className="mt-9 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
            <button
              type="button"
              onClick={() => navigate('/auth?plan=individual')}
              className="inline-flex items-center justify-center rounded-full bg-[#FCFCFA] px-8 py-3.5 text-sm font-extrabold text-[#2E3330] transition-colors hover:bg-[#E9E9DB] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#FCFCFA] sm:text-base"
            >
              Comenzar prueba gratis
            </button>
            <button
              type="button"
              onClick={() => {
                document.getElementById('planes')?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="inline-flex items-center justify-center rounded-full border border-[#FCFCFA]/50 px-7 py-3.5 text-sm font-bold text-[#FCFCFA] transition-colors hover:border-[#FCFCFA] hover:bg-[#FCFCFA]/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#FCFCFA] sm:text-base"
            >
              Ver planes y precios
            </button>
          </div>

          <p className="mt-5 text-xs font-medium text-[#FCFCFA]/60">
            Sin tarjeta de crédito · 15 días de prueba completa
          </p>
        </div>

        <div className="mt-12 md:col-span-5 md:mt-0">
          <svg
            viewBox="0 0 400 400"
            className="mx-auto w-full max-w-[360px]"
            aria-hidden="true"
          >
            <polygon points="200,10 390,200 200,390 10,200" fill="#FCFCFA" opacity="0.08" />
            <polygon points="200,10 300,110 200,200 100,110" fill="#DEAE4D" />
            <polygon points="300,110 390,200 200,200" fill="#689C63" />
            <polygon points="390,200 300,290 200,200" fill="#FCFCFA" opacity="0.92" />
            <polygon points="300,290 200,390 200,200" fill="#EB8847" />
            <polygon points="200,390 100,290 200,200" fill="#DB5B48" />
            <polygon points="100,290 10,200 200,200" fill="#BFC9A6" />
            <polygon points="10,200 100,110 200,200" fill="#2E3330" />
          </svg>
        </div>
      </div>
    </section>
  );
}
