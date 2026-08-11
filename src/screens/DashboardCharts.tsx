import { useState, useMemo } from 'react';

/**
 * DashboardCharts — SVG chart components for the SaaS Dashboard
 * Pure SVG, no external chart libraries.
 */

/* ── Donut Chart ── */
export function DonutChart({ segments, size = 130, strokeWidth = 14 }: {
  segments: { value: number; color: string; label: string; range?: string }[];
  size?: number;
  strokeWidth?: number;
}) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const total = segments.reduce((s, seg) => s + seg.value, 0);
  let accumulated = 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', position: 'relative' }}>
      <div className="dash-donut-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '2rem', flexWrap: 'wrap', width: '100%' }}>
        <div style={{ position: 'relative', width: size, height: size }}>
          <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ overflow: 'visible' }}>
            <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="rgba(46, 51, 48, 0.08)" strokeWidth={strokeWidth} />
            {segments.map((seg, i) => {
              if (seg.value === 0) return null;
              const pct = seg.value / (total || 1);
              const dashLen = pct * circumference;
              const dashOffset = -(accumulated / (total || 1)) * circumference;
              accumulated += seg.value;
              
              const isHovered = hoveredIndex === i;

              return (
                <circle
                  key={i}
                  cx={size / 2} cy={size / 2} r={radius}
                  fill="none" stroke={seg.color} strokeWidth={isHovered ? strokeWidth + 2 : strokeWidth}
                  strokeDasharray={`${dashLen} ${circumference - dashLen}`}
                  strokeDashoffset={dashOffset}
                  strokeLinecap="round"
                  transform={`rotate(-90 ${size / 2} ${size / 2})`}
                  style={{
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    cursor: 'pointer'
                  }}
                  onMouseEnter={() => setHoveredIndex(i)}
                  onMouseLeave={() => setHoveredIndex(null)}
                />
              );
            })}
            <text x={size / 2} y={size / 2 - 4} textAnchor="middle" fill="#2E3330" fontSize="18" fontWeight="800">{total}</text>
            <text x={size / 2} y={size / 2 + 10} textAnchor="middle" fill="#5F665E" fontSize="8" fontWeight="700" style={{ textTransform: 'uppercase' }} letterSpacing="0.08em">Total</text>
          </svg>

          {/* Tooltip */}
          {hoveredIndex !== null && segments[hoveredIndex] && segments[hoveredIndex].value > 0 && (
            <div style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -130%)',
              background: '#FDFBF7',
              padding: '10px 12px',
              borderRadius: '12px',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
              border: '1px solid rgba(46, 51, 48, 0.08)',
              minWidth: '180px',
              zIndex: 20,
              pointerEvents: 'none',
              animation: 'dash-fade-in 0.2s ease-out'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6, borderBottom: '1px solid rgba(46, 51, 48, 0.08)', paddingBottom: 6 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: segments[hoveredIndex].color }} />
                <span style={{ fontWeight: 950, color: '#2E3330', fontSize: 11 }}>
                  {segments[hoveredIndex].label} {segments[hoveredIndex].range ? `(${segments[hoveredIndex].range})` : ''}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, marginBottom: 4 }}>
                <span style={{ color: '#5F665E', fontWeight: 600 }}>Actividades:</span>
                <span style={{ fontWeight: 800, color: '#2E3330' }}>{segments[hoveredIndex].value}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10 }}>
                <span style={{ color: '#5F665E', fontWeight: 600 }}>Porcentaje:</span>
                <span style={{ fontWeight: 800, color: '#2E3330' }}>
                  {Math.round((segments[hoveredIndex].value / (total || 1)) * 100)}%
                </span>
              </div>
            </div>
          )}
        </div>

        <div className="dash-donut-legend" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', minWidth: '160px' }}>
          {segments.map((seg, i) => (
            <div
              key={i}
              className="dash-donut-legend__item"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                fontSize: 12,
                fontWeight: 500,
                color: '#5F665E',
                cursor: 'pointer',
                opacity: hoveredIndex !== null && hoveredIndex !== i ? 0.5 : 1,
                transition: 'opacity 0.2s ease'
              }}
              onMouseEnter={() => setHoveredIndex(i)}
              onMouseLeave={() => setHoveredIndex(null)}
            >
              <span className="dash-donut-legend__dot" style={{ background: seg.color, width: 8, height: 8, borderRadius: '50%', flexShrink: 0 }} />
              <span style={{ flex: 1 }}>{seg.label}</span>
              <span style={{ fontWeight: 800, color: '#2E3330' }}>
                {total > 0 ? Math.round((seg.value / total) * 100) : 0}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Area Chart ── */
export function AreaChart({ data, color = 'var(--primary)', height = 180, label }: {
  data: number[];
  color?: string;
  height?: number;
  label?: string;
}) {
  if (!data.length) return null;
  const max = Math.max(...data) * 1.15 || 1;
  const w = 100;
  const h = 60;
  const step = w / (data.length - 1 || 1);

  const points = data.map((v, i) => `${i * step},${h - (v / max) * h}`);
  const linePath = `M${points.join(' L')}`;
  const areaPath = `${linePath} L${(data.length - 1) * step},${h} L0,${h} Z`;

  const days = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sa', 'Do'];

  return (
    <div style={{ height }}>
      <svg width="100%" height="100%" viewBox={`0 0 ${w} ${h + 14}`} preserveAspectRatio="none">
        <defs>
          <linearGradient id={`areaGrad-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.2" />
            <stop offset="100%" stopColor={color} stopOpacity="0.01" />
          </linearGradient>
        </defs>
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map(pct => (
          <line key={pct} x1="0" y1={h - pct * h} x2={w} y2={h - pct * h} stroke="#f1f5f9" strokeWidth="0.3" />
        ))}
        <path d={areaPath} fill={`url(#areaGrad-${color.replace('#', '')})`} />
        <path d={linePath} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        {/* Data points */}
        {data.map((v, i) => (
          <circle key={i} cx={i * step} cy={h - (v / max) * h} r="1.8" fill="#fff" stroke={color} strokeWidth="1" />
        ))}
        {/* X labels */}
        {data.map((_v, i) => (
          <text key={i} x={i * step} y={h + 10} textAnchor="middle" fill="#94a3b8" fontSize="3.5" fontWeight="600">{days[i % 7]}</text>
        ))}
      </svg>
      {label && <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600, marginTop: 4, textAlign: 'center' }}>{label}</div>}
    </div>
  );
}

/* ── Bar Chart ── */
export function BarChart({ data, height = 180, colors }: {
  data: { label: string; value: number; color?: string; labelText?: string }[];
  height?: number;
  colors?: string[];
}) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  
  if (!data.length) return null;
  const max = Math.max(100, Math.max(...data.map(d => d.value)) * 1.15);
  const defaultColors = ['var(--primary)', 'var(--warning)', 'var(--attention)', '#6E8CA0'];
  const w = 100;
  const h = 55;
  const barW = Math.min(12, (w - 10) / data.length - 2);

  return (
    <div style={{ height, position: 'relative' }}>
      <svg width="100%" height="100%" viewBox={`0 0 ${w} ${h + 14}`} preserveAspectRatio="none" style={{ overflow: 'visible' }}>
        {[0, 0.5, 1].map(pct => (
          <line key={pct} x1="0" y1={h - pct * h} x2={w} y2={h - pct * h} stroke="rgba(46,51,48,0.08)" strokeWidth="0.3" />
        ))}
        {data.map((d, i) => {
          const barH = (d.value / max) * h;
          const x = 5 + i * ((w - 10) / data.length) + ((w - 10) / data.length - barW) / 2;
          const c = d.color || colors?.[i % (colors?.length || 4)] || defaultColors[i % defaultColors.length];
          const isHovered = hoveredIndex === i;
          return (
            <g 
              key={i} 
              onMouseEnter={() => setHoveredIndex(i)} 
              onMouseLeave={() => setHoveredIndex(null)}
              style={{ cursor: 'pointer', transition: 'all 0.2s ease' }}
            >
              <rect
                x={x} y={h - barH} width={barW} height={barH}
                fill={c} rx="2" className="dash-bar"
                style={{ animationDelay: `${i * 0.08}s`, opacity: hoveredIndex !== null && !isHovered ? 0.3 : 1, transition: 'opacity 0.2s ease' }}
              />
              <text x={x + barW / 2} y={h + 8} textAnchor="middle" fill={isHovered ? '#2E3330' : '#5F665E'} fontSize="3.5" fontWeight="800" style={{ transition: 'fill 0.2s ease' }}>{d.label}</text>
              <text x={x + barW / 2} y={h - barH - 2} textAnchor="middle" fill="#2E3330" fontSize="3" fontWeight="800" opacity={isHovered ? 1 : 0.7}>{d.value}</text>
            </g>
          );
        })}
      </svg>

      {hoveredIndex !== null && (
        <div style={{
          position: 'absolute',
          left: `calc(${((5 + hoveredIndex * ((w - 10) / data.length) + ((w - 10) / data.length) / 2) / w) * 100}%)`,
          top: `calc(${((h - ((data[hoveredIndex].value / max) * h)) / (h + 14)) * 100}%)`,
          transform: 'translate(-50%, -120%)',
          background: '#FDFBF7',
          padding: '10px 12px',
          borderRadius: '10px',
          boxShadow: '0 12px 28px -6px rgba(0,0,0,0.12), 0 6px 12px -6px rgba(0,0,0,0.08)',
          border: '1px solid rgba(46,51,48,0.08)',
          minWidth: '150px',
          zIndex: 10,
          pointerEvents: 'none',
          animation: 'dash-fade-in 0.2s ease-out'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6, borderBottom: '1px solid rgba(46,51,48,0.08)', paddingBottom: 6 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: data[hoveredIndex].color || defaultColors[hoveredIndex % defaultColors.length] }} />
            <span style={{ fontWeight: 900, color: '#2E3330', fontSize: 12 }}>
              {data[hoveredIndex].labelText || data[hoveredIndex].label}
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
            <span style={{ color: '#5F665E', fontWeight: 600 }}>Promedio:</span>
            <span style={{ fontWeight: 900, color: '#2E3330' }}>
              {data[hoveredIndex].value}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Horizontal Progress Bar ── */
export function ProgressBar({ value, max = 100, color = 'var(--primary)', label, sublabel }: {
  value: number; max?: number; color?: string; label?: string; sublabel?: string;
}) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
        {label && <span style={{ fontSize: 13, fontWeight: 600, color: '#334155' }}>{label}</span>}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {sublabel && <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 500 }}>{sublabel}</span>}
          <span style={{ fontSize: 12, fontWeight: 700, color: '#1e293b' }}>{value}%</span>
        </div>
      </div>
      <div className="dash-progress-track">
        <div className="dash-progress-fill" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}

/* ── Mini Sparkline ── */
export function Sparkline({ data, color = 'var(--primary)', width = 80, height = 24 }: {
  data: number[]; color?: string; width?: number; height?: number;
}) {
  if (!data.length) return null;
  const max = Math.max(...data) * 1.1 || 1;
  const min = Math.min(...data) * 0.9;
  const range = max - min || 1;
  const step = width / (data.length - 1 || 1);
  const pts = data.map((v, i) => `${i * step},${height - ((v - min) / range) * height}`);
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <polyline points={pts.join(' ')} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* ── Circular Progress ── */
export function CircularProgress({ value, size = 64, color = 'var(--primary)', label }: {
  value: number; size?: number; color?: string; label?: string;
}) {
  const sw = 5;
  const r = (size - sw) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.min(100, Math.max(0, value));
  const dashLen = (pct / 100) * c;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#f1f5f9" strokeWidth={sw} />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={sw}
          strokeDasharray={`${dashLen} ${c - dashLen}`} strokeDashoffset={c * 0.25}
          strokeLinecap="round"
          style={{ transition: 'stroke-dasharray 1s ease' }}
        />
        <text x={size / 2} y={size / 2 + 1} textAnchor="middle" dominantBaseline="middle" fill="#0f172a" fontSize="14" fontWeight="800" fontFamily="Manrope">{pct}%</text>
      </svg>
      {label && <span style={{ fontSize: 11, fontWeight: 600, color: '#64748b', textAlign: 'center' }}>{label}</span>}
    </div>
  );
}

/* ── Stacked Area Chart ── */
export function StackedAreaChart({ datasets, labels, height = 300 }: {
  datasets: { label: string; color: string; data: number[] }[];
  labels: string[];
  height?: number;
}) {
  if (!datasets.length || !labels.length) return null;
  const numPoints = labels.length;
  
  const stackedData: number[][] = [];
  for (let i = 0; i < numPoints; i++) {
    let sum = 0;
    const pointStack = [];
    for (let j = 0; j < datasets.length; j++) {
      sum += datasets[j].data[i] || 0;
      pointStack.push(sum);
    }
    stackedData.push(pointStack);
  }

  const maxVal = Math.max(...stackedData.map(stack => stack[stack.length - 1])) * 1.1 || 1;
  const w = 1000;
  const h = Math.max(200, height - 80);
  const step = w / (numPoints - 1 || 1);

  function smoothPath(points: {x: number, y: number}[]) {
    if (points.length === 0) return '';
    let path = `M ${points[0].x},${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const curr = points[i];
      const next = points[i + 1];
      const cp1x = curr.x + (next.x - curr.x) / 2;
      const cp1y = curr.y;
      const cp2x = curr.x + (next.x - curr.x) / 2;
      const cp2y = next.y;
      path += ` C ${cp1x},${cp1y} ${cp2x},${cp2y} ${next.x},${next.y}`;
    }
    return path;
  }

  return (
    <div style={{ height, width: '100%', position: 'relative', display: 'flex', flexDirection: 'column' }}>
      {/* Legend */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 24, flexWrap: 'wrap', marginBottom: 20 }}>
        {datasets.map((ds, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 40, height: 16, backgroundColor: ds.color, borderRadius: 4 }} />
            <span style={{ fontSize: 13, fontWeight: 700, color: '#475569' }}>{ds.label}</span>
          </div>
        ))}
      </div>
      <div style={{ flex: 1, position: 'relative' }}>
        <svg width="100%" height="100%" viewBox={`0 0 ${w} ${h + 40}`} preserveAspectRatio="none" style={{ overflow: 'visible' }}>
          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map(pct => (
            <g key={pct}>
              <line x1="0" y1={h - pct * h} x2={w} y2={h - pct * h} stroke="#f1f5f9" strokeWidth="1" />
              <text x="-10" y={h - pct * h + 4} fill="#94a3b8" fontSize="12" textAnchor="end">{Math.round(pct * maxVal)}</text>
            </g>
          ))}

          {/* Areas */}
          {datasets.map((dataset, dsIndex) => {
            const topPts = [];
            const bottomPts = [];
            for (let i = 0; i < numPoints; i++) {
              const x = i * step;
              const yTop = h - (stackedData[i][dsIndex] / maxVal) * h;
              const yBottom = dsIndex === 0 ? h : h - (stackedData[i][dsIndex - 1] / maxVal) * h;
              topPts.push({ x, y: yTop });
              bottomPts.push({ x, y: yBottom });
            }
            
            const topPath = smoothPath(topPts);
            const bottomPath = smoothPath(bottomPts.reverse());
            const areaPath = `${topPath} L ${bottomPts[0].x},${bottomPts[0].y} ${bottomPath.replace('M ', 'L ')} Z`;
            
            return (
              <path key={dsIndex} d={areaPath} fill={dataset.color} opacity={0.9} />
            );
          }).reverse()}

          {/* Data points */}
          {datasets.map((dataset, dsIndex) => {
            return stackedData.map((stack, i) => {
              const x = i * step;
              const y = h - (stack[dsIndex] / maxVal) * h;
              return (
                <circle key={`${dsIndex}-${i}`} cx={x} cy={y} r="3" fill={dataset.color} stroke="#fff" strokeWidth="1.5" />
              );
            });
          })}

          {/* X labels */}
          {labels.map((label, i) => {
            if (numPoints > 20 && i % Math.ceil(numPoints / 10) !== 0 && i !== numPoints - 1 && i !== 0) return null;
            return (
              <text key={i} x={i * step} y={h + 24} textAnchor="middle" fill="#94a3b8" fontSize="12" fontWeight="700">{label}</text>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

// ── Student Population Grid (Waffle) ──

export interface PopulationCategory {
  id: string;
  label: string;
  color: string;
  count: number;
  percentage: number;
  avgScore: number | null;
}

export function StudentPopulationChart({ categories }: { categories: PopulationCategory[] }) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const icons = useMemo(() => {
    const list: PopulationCategory[] = [];
    categories.forEach(cat => {
      for (let i = 0; i < cat.count; i++) {
        list.push(cat);
      }
    });
    return list;
  }, [categories]);

  return (
    <div style={{ position: 'relative' }}>
      <div 
        style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fill, minmax(16px, 1fr))', 
          gap: '4px', 
          padding: '8px 0' 
        }}
        onMouseLeave={() => setHoveredId(null)}
      >
        {icons.map((cat, idx) => {
          const isHovered = hoveredId === cat.id;
          const isFaded = hoveredId !== null && hoveredId !== cat.id;
          return (
            <div 
              key={idx}
              onMouseEnter={() => setHoveredId(cat.id)}
              style={{
                width: '100%',
                aspectRatio: '1/2',
                opacity: isFaded ? 0.2 : 1,
                transform: isHovered ? 'scale(1.15) translateY(-2px)' : 'scale(1)',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                filter: isHovered ? `drop-shadow(0 4px 6px ${cat.color}60)` : 'none',
                cursor: 'pointer'
              }}
            >
              <svg viewBox="0 0 24 24" width="100%" height="100%" fill={cat.color}>
                <path d="M12 2a3 3 0 1 0 0 6 3 3 0 0 0 0-6zm-5 8a2 2 0 0 0-2 2v4a1 1 0 0 0 1 1h2v7a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1v-7h2a1 1 0 0 0 1-1v-4a2 2 0 0 0-2-2H7z" />
              </svg>
            </div>
          );
        })}
      </div>

      {hoveredId && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          pointerEvents: 'none',
          background: '#fff',
          padding: '12px',
          borderRadius: '12px',
          boxShadow: '0 12px 28px -6px rgba(0,0,0,0.12), 0 6px 12px -6px rgba(0,0,0,0.08)',
          border: '1px solid #f1f5f9',
          minWidth: '180px',
          zIndex: 10,
          animation: 'dash-fade-in 0.2s ease-out'
        }}>
          {(() => {
            const cat = categories.find(c => c.id === hoveredId);
            if (!cat) return null;
            return (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: cat.color }} />
                  <span style={{ fontWeight: 900, color: '#0f172a', fontSize: 12, letterSpacing: '-0.01em' }}>{cat.label}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 4 }}>
                  <span style={{ color: '#64748b', fontWeight: 600 }}>Estudiantes:</span>
                  <span style={{ fontWeight: 900, color: '#0f172a' }}>{cat.count} ({cat.percentage}%)</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
                  <span style={{ color: '#64748b', fontWeight: 600 }}>Promedio Académico:</span>
                  <span style={{ fontWeight: 900, color: '#0f172a' }}>
                    {cat.avgScore !== null ? `${cat.avgScore}%` : 'N/A'}
                  </span>
                </div>
              </>
            );
          })()}
        </div>
      )}
    </div>
  );
}

// ── Smooth Line Chart (Multi-Serie) ──

export function SmoothLineChart({ data, height = 350 }: { data: any[], height?: number }) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // Ancho dinámico basado en la cantidad de estudiantes para permitir scroll si son muchos
  const width = Math.max(1000, data.length * 35);
  const padding = { top: 24, right: 36, bottom: 36, left: 36 };
  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;

  const xScale = (index: number) => padding.left + (index / Math.max(1, data.length - 1)) * innerWidth;
  const yScale = (val: number) => padding.top + innerHeight - (val / 100) * innerHeight;

  const series = [
    { key: 'bc1', color: 'var(--primary)', label: 'BC1' },
    { key: 'bc2', color: 'var(--warning)', label: 'BC2' },
    { key: 'bc3', color: 'var(--attention)', label: 'BC3' },
    { key: 'bc4', color: '#6E8CA0', label: 'BC4' },
  ];
  
  const createSmoothPath = (pts: number[][]) => {
    if (pts.length === 0) return '';
    if (pts.length === 1) return `M ${pts[0][0]},${pts[0][1]}`;
    let path = `M ${pts[0][0]},${pts[0][1]}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const x0 = pts[i][0];
      const y0 = pts[i][1];
      const x1 = pts[i + 1][0];
      const y1 = pts[i + 1][1];
      const cx = (x0 + x1) / 2;
      path += ` C ${cx},${y0} ${cx},${y1} ${x1},${y1}`;
    }
    return path;
  };

  if (data.length === 0) {
    return <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>Sin datos suficientes</div>;
  }

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', overflowX: 'auto', overflowY: 'hidden' }}>
      <div style={{ minWidth: width, height: '100%', position: 'relative' }}>
        <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" style={{ width: '100%', height: '100%', overflow: 'visible' }}>
          {/* Y Axis Grid lines */}
          {[0, 20, 40, 60, 80, 100].map(val => (
            <g key={val}>
              <line x1={padding.left} y1={yScale(val)} x2={width - padding.right} y2={yScale(val)} stroke="rgba(46,51,48,0.08)" strokeWidth="1" />
              <text x={padding.left - 12} y={yScale(val) + 4} textAnchor="end" fill="#7D847A" fontSize="14" fontWeight="600">{val}</text>
            </g>
          ))}

          {/* Goal Line 70 */}
          <line 
            x1={padding.left} y1={yScale(70)} x2={width - padding.right} y2={yScale(70)} 
            stroke="#7D847A" strokeWidth="2" strokeDasharray="6 6" opacity="0.6" 
          />
          
          {/* X Axis Student Names */}
          {data.map((d, i) => (
            <text 
              key={i} 
              x={xScale(i)} 
              y={height - 8} 
              textAnchor="middle" 
              fill="#7D847A" 
              fontSize="10" 
              fontWeight="600"
              transform={`rotate(-25, ${xScale(i)}, ${height - 8})`}
            >
              {d.label}
            </text>
          ))}

          {/* Lines */}
          {series.map(s => {
            const validPoints = data.map((d, i) => ({ x: xScale(i), y: d[s.key] !== null ? yScale(d[s.key]) : null, val: d[s.key] }));
            const pts = validPoints.filter(p => p.val !== null).map(p => [p.x, p.y as number]);
            return (
              <path key={s.key} d={createSmoothPath(pts)} fill="none" stroke={s.color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            );
          })}
  
          {/* Interactive Points (invisible overlay) */}
          {data.map((d, i) => (
            <g 
              key={i}
              onMouseEnter={() => setHoveredIndex(i)}
              onMouseLeave={() => setHoveredIndex(null)}
              style={{ cursor: 'pointer' }}
            >
              <rect x={xScale(i) - (innerWidth / Math.max(2, data.length)) / 2} y={0} width={innerWidth / Math.max(1, data.length)} height={height} fill="transparent" />
              
              {hoveredIndex === i && series.map(s => d[s.key] !== null && (
                <circle 
                  key={s.key}
                  cx={xScale(i)} 
                  cy={yScale(d[s.key])} 
                  r={4} 
                  fill={s.color} 
                  stroke="#FDFBF7" 
                  strokeWidth={1.5} 
                  style={{ filter: 'drop-shadow(0 3px 4px rgba(0,0,0,0.15))' }}
                />
              ))}
            </g>
          ))}
        </svg>
  
        {/* Tooltip */}
        {hoveredIndex !== null && (
          <div style={{
            position: 'absolute',
            left: `calc(${(xScale(hoveredIndex) / width) * 100}%)`,
            top: '30px',
            transform: 'translateX(-50%)',
            background: '#FDFBF7',
            padding: '10px 12px',
            borderRadius: '10px',
            boxShadow: '0 12px 28px -6px rgba(0,0,0,0.12), 0 6px 12px -6px rgba(0,0,0,0.08)',
            border: '1px solid rgba(46,51,48,0.08)',
            minWidth: '160px',
            zIndex: 10,
            pointerEvents: 'none',
            animation: 'dash-fade-in 0.2s ease-out'
          }}>
            <div style={{ fontWeight: 900, color: '#2E3330', fontSize: 12, marginBottom: 6, borderBottom: '1px solid rgba(46,51,48,0.08)', paddingBottom: 6 }}>
              {data[hoveredIndex].fullName}
            </div>
            {series.map(s => data[hoveredIndex][s.key] !== null && (
              <div key={s.key} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 4, alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: s.color }} />
                  <span style={{ color: '#5F665E', fontWeight: 600 }}>{s.label}:</span>
                </div>
                <span style={{ fontWeight: 900, color: s.color }}>
                  {data[hoveredIndex][s.key]}%
                </span>
              </div>
            ))}
          </div>
        )}
        
        {/* Legend */}
        <div style={{ position: 'absolute', top: 0, right: 10, display: 'flex', gap: 12 }}>
          {series.map(s => (
              <div key={s.key} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: s.color }} />
                  <span style={{ fontSize: 10, fontWeight: 700, color: '#5F665E' }}>{s.label}</span>
              </div>
          ))}
        </div>
      </div>
    </div>
  );
}
