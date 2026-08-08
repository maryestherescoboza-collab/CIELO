import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

interface PodiumStudent {
  id: number;
  nombre: string;
  apellido: string;
  avatarColor?: string;
  computedAvg?: number | null;
  displayName?: string;
}

interface Props {
  students: PodiumStudent[];
}

/* ── Geometría del podio (arcos orgánicos, sin rejilla ni líneas rígidas) ── */
const W = 720;
const H = 178;
const CX = 360;
const BASE_Y = 148;
const STEP_X = 62;

// Elevación según la distancia al centro (más cerca del centro = más alto)
const UP: Record<number, number> = { 0: 56, 1: 38, 2: 20, 3: 14, 4: 10, 5: 7 };

// Lados: 0 = centro (#1), negativos a la izquierda, positivos a la derecha
const SIDES = [0, -1, 1, -2, 2, -3, 3, -4, 4, 5];

const bandFor = (avg: number) =>
  avg >= 85 ? '#7A8D69' : avg >= 70 ? '#E9934A' : '#A9B4C6';

// Anillo más vivo para los tres primeros lugares
const ACCENT: Record<number, string> = { 1: '#E6B64A', 2: '#C7D2DE', 3: '#D89161' };

const sizeFor = (rank: number, avg: number) => {
  const base = 13 + ((avg - 50) / 50) * 12; // 13 → 25 según rendimiento
  const boost = rank === 1 ? 1.55 : rank === 2 ? 1.35 : rank === 3 ? 1.2 : 1;
  return Math.max(18, Math.min(42, base * boost));
};

export default function PodiumTop10({ students }: Props) {
  const navigate = useNavigate();

  const ranking = useMemo(() => {
    return students
      .filter(s => s.computedAvg != null)
      .sort((a, b) => (b.computedAvg ?? 0) - (a.computedAvg ?? 0))
      .slice(0, 10);
  }, [students]);

  if (ranking.length === 0) return null;

  return (
    <section className="mb-4 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-100 fill-mode-both">
      {/* Cabecera */}
      <div className="mb-2">
        <h3 className="text-[10px] font-black text-[#2E3330] uppercase tracking-[0.25em]">
          Podium de excelencia
        </h3>
        <p className="text-[9px] font-bold text-[#5F665E] uppercase tracking-widest mt-0.5">
          Top 10 de estudiantes con mejor promedio general
        </p>
      </div>

      {/* Superficie clara con textura pictórica sutil */}
      <div
        className="relative overflow-hidden rounded-[22px] border border-[rgba(46,51,48,0.05)]"
        style={{
          height: H,
          background:
            'radial-gradient(120% 90% at 50% 0%, #FDFBF7 0%, #FAF6EF 55%, #F1EBDF 100%)',
        }}
      >
        {/* Arcos de progreso (ilustración suave) */}
        <svg
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="xMidYMid meet"
          className="absolute inset-0 w-full h-full"
          aria-hidden="true"
        >
          <defs>
            <linearGradient id="podium-hill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#7A8D69" stopOpacity="0.16" />
              <stop offset="100%" stopColor="#7A8D69" stopOpacity="0.02" />
            </linearGradient>
          </defs>

          {/* Colinas/podio detrás de los nodos */}
          {[0, 1.6, 3.2].map((g, i) => (
            <path
              key={i}
              d={`M 0 ${BASE_Y + g + i * 6} C ${W * 0.25} ${BASE_Y - 40 - i * 12}, ${W * 0.55} ${
                BASE_Y + 30 + i * 10
              }, ${W} ${BASE_Y + 8 + i * 4} L ${W} ${H + 20} L 0 ${H + 20} Z`}
              fill="url(#podium-hill)"
              stroke={i === 0 ? '#BFC9A6' : 'none'}
              strokeOpacity={i === 0 ? 0.5 : 0}
              strokeWidth={i === 0 ? 1.5 : 0}
              opacity={0.6 - i * 0.15}
            />
          ))}

          {/* Trazo de conexión orgánico entre los niveles */}
          <path
            d={`M ${CX - 5 * STEP_X} ${BASE_Y} C ${CX - 3 * STEP_X} ${
              BASE_Y - UP[3] - 18
            }, ${CX - STEP_X} ${BASE_Y - UP[1] - 20}, ${CX} ${
              BASE_Y - UP[0]
            } C ${CX + STEP_X} ${BASE_Y - UP[1] - 20}, ${CX + 3 * STEP_X} ${
              BASE_Y - UP[3] - 18
            }, ${CX + 5 * STEP_X} ${BASE_Y}`}
            fill="none"
            stroke="#7A8D69"
            strokeWidth={1.5}
            strokeOpacity={0.25}
            strokeLinecap="round"
          />
        </svg>

        {/* Nodos de estudiantes */}
        {ranking.map((est, r) => {
          const rank = r + 1;
          const d = Math.abs(SIDES[r]);
          const x = CX + SIDES[r] * STEP_X;
          const y = BASE_Y - (UP[d] ?? 20);
          const size = sizeFor(rank, est.computedAvg ?? 50);
          const avg = est.computedAvg ?? 0;
          const fill = ACCENT[rank] ?? bandFor(avg);
          const initials = `${est.nombre?.[0] ?? ''}${est.apellido?.[0] ?? ''}`.toUpperCase();
          const isMedal = rank <= 3;

          return (
            <div
              key={est.id}
              className="absolute flex flex-col items-center"
              style={{
                left: `${(x / W) * 100}%`,
                top: `${(y / H) * 100}%`,
                transform: 'translate(-50%, -50%)',
              }}
            >
              <button
                type="button"
                onClick={() => navigate(`/estudiante/${est.id}`)}
                className="relative flex flex-col items-center cursor-pointer group podium-node"
                title={`${est.displayName || `${est.nombre} ${est.apellido}`} · ${avg}%`}
              >
                {/* Aura del medallero */}
                {isMedal && (
                  <span
                    className="absolute rounded-full"
                    style={{
                      top: 0,
                      left: 0,
                      width: size,
                      height: size,
                      background: fill,
                      opacity: 0.22,
                      filter: 'blur(4px)',
                      transform: 'translateY(0)',
                    }}
                  />
                )}

                {/* Avatar circular */}
                <span
                  className="relative rounded-full flex items-center justify-center text-white font-black shadow-sm"
                  style={{
                    width: size,
                    height: size,
                    background: fill,
                    border: isMedal ? `2.5px solid ${fill}` : '2px solid rgba(255,255,255,0.7)',
                    boxShadow: isMedal
                      ? `0 6px 18px -6px ${fill}`
                      : '0 4px 12px -6px rgba(46,51,48,0.3)',
                  }}
                >
                  <span style={{ fontSize: Math.max(9, size * 0.34), fontWeight: 800 }}>
                    {initials || '?'}
                  </span>
                  {/* PDA posición */}
                  <span
                    className="absolute -top-2 -right-2 w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black text-white"
                    style={{ background: rank === 1 ? '#7A8D69' : rank === 2 ? '#BFC9A6' : rank === 3 ? '#E9934B' : '#D9DFE4' }}
                  >
                    {rank}
                  </span>
                </span>

                {/* Nombre + porcentaje */}
                <span
                  className="mt-1.5 text-[9px] font-bold text-[#2E3330] leading-tight truncate text-center max-w-14"
                  style={{ fontSize: Math.max(8, size * 0.26) }}
                >
                  {est.nombre}
                </span>
                <span className="text-[8.5px] font-black" style={{ color: fill }}>
                  {avg}%
                </span>
              </button>
            </div>
          );
        })}
      </div>

      {/* Leyenda de desempeño */}
      <div className="mt-2 flex items-center justify-end gap-3">
        <span className="inline-flex items-center gap-1.5 text-[9px] font-bold text-[#5F665E] uppercase tracking-widest">
          <span className="w-2 h-2 rounded-full bg-[#7A8D69]"></span>
          alto rendimiento
        </span>
        <span className="inline-flex items-center gap-1.5 text-[9px] font-bold text-[#5F665E] uppercase tracking-widest">
          <span className="w-2 h-2 rounded-full bg-[#E9934B]"></span>
          rendimiento medio
        </span>
      </div>

      <style>{`
        .podium-node { transition: transform 0.2s ease; }
        .podium-node:hover { transform: translateY(-3px) scale(1.06); }
      `}</style>
    </section>
  );
}