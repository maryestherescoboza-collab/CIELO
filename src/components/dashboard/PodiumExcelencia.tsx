import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

interface PodiumStudent {
  id: number;
  nombre: string;
  apellido: string;
  avatarColor?: string;
  periodAvg?: number | null;
  displayName?: string;
}

interface PodiumPeriod {
  periodo: string;
  top10: PodiumStudent[];
}

interface Props {
  periods: PodiumPeriod[];
}

/* Trayectoria curva (cúbica de Bézier) por periodo.
   El bandaje vertical queda centrado con amplios márgenes internos para
   ningún círculo toque los bordes del área. */
const VIEW_W = 764;
const VIEW_H = 58;

const curveDef = () => ({
  p0: { x: 26, y: 28 },
  c1: { x: 225, y: 20 },
  c2: { x: 540, y: 40 },
  p1: { x: 738, y: 28 },
});

const pathDFor = () => {
  const { p0, c1, c2, p1 } = curveDef();
  return `M ${p0.x} ${p0.y} C ${c1.x} ${c1.y}, ${c2.x} ${c2.y}, ${p1.x} ${p1.y}`;
};

const pointAt = (cur: ReturnType<typeof curveDef>, t: number) => {
  const { p0, c1, c2, p1 } = cur;
  const u = 1 - t;
  const tt = t * t;
  const uu = u * u;
  return {
    x: uu * u * p0.x + 3 * uu * t * c1.x + 3 * u * tt * c2.x + tt * t * p1.x,
    y: uu * u * p0.y + 3 * uu * t * c1.y + 3 * u * tt * c2.y + tt * t * p1.y,
  };
};

// Distribución ligeramente irregular (sensación orgánica, no de cuadrícula)
const OFFSETS = [0.0, 0.1, 0.2, 0.31, 0.42, 0.52, 0.62, 0.73, 0.85, 0.96];

// Tamaño sutil según rendimiento: mayor promedio = ligera mayor presencia
const radiusFor = (avg?: number | null) => {
  const clamped = Math.max(50, Math.min(100, avg ?? 50));
  return 8 + ((clamped - 50) / 50) * 4; // 8 → 12 (diferencias elegantes y compactas)
};

const RANK_STYLE: Record<number, { stroke: string; width: number }> = {
  1: { stroke: '#F5BC5D', width: 2.5 },
  2: { stroke: '#B8CADC', width: 2 },
  3: { stroke: '#EB8847', width: 2 },
};

export default function PodiumExcelencia({ periods }: Props) {
  const navigate = useNavigate();
  const visible = useMemo(() => periods.filter(p => p.top10.length > 0), [periods]);

  if (visible.length === 0) return null;

  return (
    <section className="mb-4 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-100 fill-mode-both">
      {/* Cabecera de sección */}
      <div className="mb-2">
        <h3 className="text-[10px] font-black text-[#2E3330] uppercase tracking-[0.25em]">
          Podium de excelencia
        </h3>
        <p className="text-[9px] font-bold text-[#5F665E] uppercase tracking-widest mt-0.5">
          La trayectoria de progreso de tus estudiantes, periodo a periodo
        </p>
      </div>

      {/* Única superficie continua para toda la sección (sin cards por periodo) */}
      <div className="bg-[#FDFBF7]/70 rounded-[20px] border border-[rgba(46,51,48,0.05)] pt-2 pb-1 pr-1 pl-4">
        <div className="flex flex-col gap-1">
          {visible.map((podium, pIdx) => {
            const periodNum = podium.periodo.replace(/^\D+/g, '') || String(pIdx + 1);
            const cur = curveDef();
            const pathD = pathDFor();
            return (
              <div key={podium.periodo} className="flex items-center gap-3 sm:gap-5">
                {/* Etiqueta cápsula del periodo */}
                <span className="shrink-0 inline-flex items-center justify-center min-w-11 h-6 px-3 rounded-full bg-[#EAE4DA]/70 border border-[rgba(46,51,48,0.10)] text-[#2E3330] font-black text-[10px] tracking-wide">
                  P{periodNum}
                </span>

                {/* Trayectoria curva con avatares */}
                <div className="flex-1 min-w-0">
                  <svg
                    viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
                    preserveAspectRatio="xMidYMid meet"
                    className="w-full h-auto block"
                    role="img"
                    aria-label={`Ranking de estudiantes del periodo ${periodNum}`}
                  >
                    <defs>
                      <linearGradient id={`podium-${periodNum}-grad`} x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#BFC9A6" stopOpacity="0.9" />
                        <stop offset="55%" stopColor="#7A8D69" stopOpacity="0.7" />
                        <stop offset="100%" stopColor="#BFC9A6" stopOpacity="0.9" />
                      </linearGradient>
                    </defs>

                    {/* Camino de progreso sutil */}
                    <path
                      d={pathD}
                      fill="none"
                      stroke={`url(#podium-${periodNum}-grad)`}
                      strokeWidth={2}
                      strokeLinecap="round"
                    />

                    {podium.top10.map((est, index) => {
                      const rank = index + 1;
                      const t = OFFSETS[index] ?? index / Math.max(1, podium.top10.length - 1);
                      const pt = pointAt(cur, t);
                      const r = radiusFor(est.periodAvg);
                      const initials = `${est.nombre?.[0] ?? ''}${est.apellido?.[0] ?? ''}`.toUpperCase();
                      const ring = RANK_STYLE[rank];

                      return (
                        <g
                          key={est.id}
                          onClick={() => navigate(`/estudiante/${est.id}`)}
                          className="cursor-pointer podium-student"
                        >
                          {/* Halo suave para el liderazgo */}
                          {ring && <circle cx={pt.x} cy={pt.y} r={r + 4} fill={ring.stroke} opacity={0.13} />}

                          <circle
                            cx={pt.x}
                            cy={pt.y}
                            r={r}
                            fill={est.avatarColor || '#7A8D69'}
                            stroke={ring ? ring.stroke : 'rgba(255,255,255,0.7)'}
                            strokeWidth={ring ? ring.width : 1.25}
                          />
                          <text
                            x={pt.x}
                            y={pt.y}
                            textAnchor="middle"
                            dominantBaseline="central"
                            fill="#FFFFFF"
                            fontSize={r * 0.82}
                            fontWeight={800}
                            letterSpacing="0.02em"
                          >
                            {initials || '?'}
                          </text>

                          {/* Posición (arriba, con resguardo del borde superior) */}
                          <text
                            x={pt.x}
                            y={pt.y - r - 3}
                            textAnchor="middle"
                            fill="#A9B2AA"
                            fontSize={7.5}
                            fontWeight={700}
                          >
                            {rank}
                          </text>

                          {/* Porcentaje (debajo, respetando el borde inferior) */}
                          <text
                            x={pt.x}
                            y={pt.y + r + 3}
                            textAnchor="middle"
                            fill="#5F665E"
                            fontSize={8}
                            fontWeight={700}
                          >
                            {est.periodAvg ?? 0}%
                          </text>

                          <title>{`${est.displayName || `${est.nombre} ${est.apellido}`} · ${est.periodAvg ?? 0}%`}</title>
                        </g>
                      );
                    })}
                  </svg>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Leyenda: lectura del camino */}
      <div className="mt-1.5 flex items-center justify-end gap-3">
        <span className="inline-flex items-center gap-1.5 text-[9px] font-bold text-[#5F665E] uppercase tracking-widest">
          <span className="w-2 h-2 rounded-full bg-[#BFC9A6]"></span>
          promedio
        </span>
        <span className="inline-flex items-center gap-1.5 text-[9px] font-bold text-[#5F665E] uppercase tracking-widest">
          <span className="w-2 h-2 rounded-full bg-[#F5BC5D]"></span>
          liderazgo
        </span>
      </div>

      <style>{`
        .podium-student { transition: transform 0.2s ease; }
        .podium-student:hover { cursor: pointer; transform: translateY(-2px) scale(1.05); }
      `}</style>
    </section>
  );
}