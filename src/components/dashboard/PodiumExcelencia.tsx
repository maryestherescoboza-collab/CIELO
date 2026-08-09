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
          Top 3 de estudiantes destacados por periodo
        </p>
      </div>

      {/* Contenedor Ultra Compacto en Fila Horizontal */}
      <div className="w-full bg-[#FDFBF7]/70 rounded-[20px] border border-[rgba(46,51,48,0.05)] p-2">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
          {visible.map((podium, pIdx) => {
            const periodNum = podium.periodo.replace(/^\D+/g, '') || String(pIdx + 1);
            const top3 = podium.top10.slice(0, 3);
            if (top3.length === 0) return null;

            const p1 = top3[0];
            const p2 = top3[1];
            const p3 = top3[2];

            return (
              <div
                key={podium.periodo}
                className="relative bg-white/60 rounded-xl border border-[rgba(46,51,48,0.05)] pt-7 pb-1 px-1 flex flex-col justify-end min-h-[90px]"
              >
                {/* Etiqueta del periodo (Absoluta para ahorrar espacio) */}
                <div className="absolute top-2 left-2 px-2 py-0.5 bg-[#EAE4DA]/50 rounded-full text-[#2E3330] font-black text-[9px] tracking-widest z-10">
                  P{periodNum}
                </div>

                <div className="w-full relative mt-auto">
                  <svg
                    viewBox="0 0 240 100"
                    preserveAspectRatio="xMidYMid meet"
                    className="w-full h-auto drop-shadow-sm block"
                    role="img"
                    aria-label={`Top 3 del periodo ${periodNum}`}
                  >
                    <defs>
                      <linearGradient id={`grad-${periodNum}`} x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#BFC9A6" stopOpacity="0.3" />
                        <stop offset="50%" stopColor="#ADC762" stopOpacity="0.8" />
                        <stop offset="100%" stopColor="#BFC9A6" stopOpacity="0.3" />
                      </linearGradient>
                    </defs>

                    {/* Trayectoria curva suave (fondo) */}
                    <path
                      d="M 25 68 C 65 68 85 32 120 32 C 155 32 175 68 215 68"
                      fill="none"
                      stroke={`url(#grad-${periodNum})`}
                      strokeWidth="2"
                      strokeLinecap="round"
                    />

                    {/* Posiciones 2, 1, 3 */}
                    {[
                      { s: p2, cx: 55, cy: 52, r: 12.8, rank: 2, color: '#B8CADC' },
                      { s: p1, cx: 120, cy: 36, r: 16.8, rank: 1, color: '#F5BC5D' },
                      { s: p3, cx: 185, cy: 56, r: 12.8, rank: 3, color: '#EB8847' },
                    ].map((pos) => {
                      if (!pos.s) return null;
                      const initials = `${pos.s.nombre?.[0] ?? ''}${pos.s.apellido?.[0] ?? ''}`.toUpperCase();
                      const name = pos.s.nombre.split(' ')[0];
                      
                      return (
                        <g
                          key={pos.rank}
                          onClick={() => navigate(`/estudiante/${pos.s.id}`)}
                          className="cursor-pointer podium-student"
                        >
                          {/* Aura */}
                          <circle cx={pos.cx} cy={pos.cy} r={pos.r + 3} fill={pos.color} opacity="0.15" />
                          
                          {/* Avatar */}
                          <circle cx={pos.cx} cy={pos.cy} r={pos.r} fill={pos.s.avatarColor || '#ADC762'} />
                          <text
                            x={pos.cx}
                            y={pos.cy}
                            textAnchor="middle"
                            dominantBaseline="central"
                            fill="#FFFFFF"
                            fontSize={pos.rank === 1 ? 11.2 : 8.8}
                            fontWeight="800"
                            fontFamily="sans-serif"
                            letterSpacing="0.02em"
                          >
                            {initials || '?'}
                          </text>

                          {/* Coronas y Medallas sutiles */}
                          {pos.rank === 1 ? (
                            <path
                              d={`M ${pos.cx - 5.5} ${pos.cy - pos.r - 8} L ${pos.cx - 3} ${pos.cy - pos.r - 2} L ${pos.cx} ${pos.cy - pos.r - 9.5} L ${pos.cx + 3} ${pos.cy - pos.r - 2} L ${pos.cx + 5.5} ${pos.cy - pos.r - 8} L ${pos.cx + 4} ${pos.cy - pos.r - 1} L ${pos.cx - 4} ${pos.cy - pos.r - 1} Z`}
                              fill="#F5BC5D"
                            />
                          ) : (
                            <g>
                              <circle cx={pos.cx} cy={pos.cy - pos.r - 5} r="4.8" fill={pos.color} />
                              <text x={pos.cx} y={pos.cy - pos.r - 5} textAnchor="middle" dominantBaseline="central" fill="#FFF" fontSize="5.6" fontWeight="900" fontFamily="sans-serif">{pos.rank}</text>
                            </g>
                          )}

                          {/* Nombre */}
                          <text
                            x={pos.cx}
                            y={pos.cy + pos.r + 11.2}
                            textAnchor="middle"
                            fill="#5F665E"
                            fontSize="8.8"
                            fontWeight="800"
                            fontFamily="sans-serif"
                            letterSpacing="0.03em"
                          >
                            {name}
                          </text>

                          {/* Porcentaje */}
                          <text
                            x={pos.cx}
                            y={pos.cy + pos.r + 20.8}
                            textAnchor="middle"
                            fill="#ADC762"
                            fontSize="8.8"
                            fontWeight="900"
                            fontFamily="sans-serif"
                          >
                            {pos.s.periodAvg ?? 0}%
                          </text>
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

      <style>{`
        .podium-student { transition: transform 0.2s ease, opacity 0.2s ease; }
        .podium-student:hover { opacity: 0.85; }
      `}</style>
    </section>
  );
}