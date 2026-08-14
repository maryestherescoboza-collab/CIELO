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
        <h3 className="text-xs font-black text-[#2E3330] uppercase tracking-[0.25em]">
          Podium de excelencia
        </h3>
        <p className="text-xs font-bold text-[#5F665E] uppercase tracking-widest mt-0.5">
          Top 3 de estudiantes destacados por periodo
        </p>
      </div>

      {/* Contenedor Ultra Compacto en Fila Horizontal */}
      <div className="w-full bg-base-creme/70 rounded-[20px] border border-[rgba(46,51,48,0.05)] p-2">
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
                className="relative rounded-xl border border-[#E8C166]/20 pt-8 pb-3 px-3 flex flex-col justify-between min-h-35"
                style={{ backgroundColor: 'rgba(232, 193, 102, 0.15)' }}
              >
                {/* Etiqueta del periodo (Absoluta para ahorrar espacio) */}
                <div className="absolute top-2 left-2 px-2 py-0.5 bg-[#EAE4DA]/50 rounded-full text-[#2E3330] font-black text-[10px] tracking-widest z-10">
                  P{periodNum}
                </div>

                <div className="flex flex-col items-center justify-between w-full h-full pt-2">
                  {/* TOP 1 - Centrado y Elevado */}
                  <div 
                    onClick={() => navigate(`/estudiante/${p1.id}`)}
                    className="text-center cursor-pointer hover:opacity-85 transition-opacity mb-3"
                  >
                    <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">TOP 1</p>
                    <p className="text-xs font-black text-[#2E3330] leading-tight mt-0.5">{p1.nombre} {p1.apellido.charAt(0)}.</p>
                    <p className="text-xs font-black text-primary mt-0.5">{p1.periodAvg}%</p>
                  </div>

                  {/* Fila Inferior (TOP 2 y TOP 3) */}
                  <div className="w-full grid grid-cols-2 gap-1 pt-2">
                    {/* TOP 2 */}
                    {p2 ? (
                      <div 
                        onClick={() => navigate(`/estudiante/${p2.id}`)}
                        className="text-center cursor-pointer hover:opacity-85 transition-opacity"
                      >
                        <p className="text-[8px] font-black uppercase tracking-wider text-slate-400">TOP 2</p>
                        <p className="text-[11px] font-bold text-[#5F665E] truncate px-1 mt-0.5">{p2.nombre} {p2.apellido.charAt(0)}.</p>
                        <p className="text-[11px] font-bold text-slate-500 mt-0.5">{p2.periodAvg}%</p>
                      </div>
                    ) : (
                      <div className="text-center opacity-0">--</div>
                    )}

                    {/* TOP 3 */}
                    {p3 ? (
                      <div 
                        onClick={() => navigate(`/estudiante/${p3.id}`)}
                        className="text-center cursor-pointer hover:opacity-85 transition-opacity"
                      >
                        <p className="text-[8px] font-black uppercase tracking-wider text-slate-400">TOP 3</p>
                        <p className="text-[11px] font-bold text-[#5F665E] truncate px-1 mt-0.5">{p3.nombre} {p3.apellido.charAt(0)}.</p>
                        <p className="text-[11px] font-bold text-slate-500 mt-0.5">{p3.periodAvg}%</p>
                      </div>
                    ) : (
                      <div className="text-center opacity-0">--</div>
                    )}
                  </div>
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