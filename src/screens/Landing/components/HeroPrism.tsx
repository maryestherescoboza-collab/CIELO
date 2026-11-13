import { useState } from 'react';

type Facet = {
  id: string;
  points: string;
  fill: string;
};

const FACETS: Facet[] = [
  // Barra superior
  { id: 'top-1', points: '100,40 340,40 220,75', fill: '#537BAC' },
  { id: 'top-2', points: '340,40 300,110 220,75', fill: '#689C63' },
  { id: 'top-3', points: '300,110 120,110 220,75', fill: '#BFC9A6' },
  { id: 'top-4', points: '120,110 100,40 220,75', fill: '#DEAE4D' },
  // Barra izquierda
  { id: 'left-1', points: '100,40 120,110 110,200', fill: '#EB8847' },
  { id: 'left-2', points: '120,110 120,290 110,200', fill: '#DB5B48' },
  { id: 'left-3', points: '120,290 100,360 110,200', fill: '#537BAC' },
  { id: 'left-4', points: '100,360 100,40 110,200', fill: '#2E3330' },
  // Barra inferior
  { id: 'bottom-1', points: '100,360 340,360 220,325', fill: '#689C63' },
  { id: 'bottom-2', points: '340,360 300,290 220,325', fill: '#BFC9A6' },
  { id: 'bottom-3', points: '300,290 120,290 220,325', fill: '#DEAE4D' },
  { id: 'bottom-4', points: '120,290 100,360 220,325', fill: '#EB8847' },
];

function centroid(points: string) {
  const coords = points.split(' ').map((pair) => pair.split(',').map(Number));
  const sum = coords.reduce(
    (acc, [x, y]) => ({ x: acc.x + x, y: acc.y + y }),
    { x: 0, y: 0 }
  );
  return { x: sum.x / coords.length, y: sum.y / coords.length };
}

export function HeroPrism() {
  const [exploded, setExploded] = useState(false);

  return (
    <div className="relative mx-auto w-full max-w-[520px]">
      <div className="absolute inset-0 translate-x-3 translate-y-3 border border-[#2E3330]/15" />
      <div className="absolute -bottom-5 -left-5 h-20 w-20 bg-[#DEAE4D] sm:h-24 sm:w-24" />
      <div className="absolute -right-3 -top-3 h-12 w-12 bg-[#DB5B48] sm:h-14 sm:w-14" />

      <div className="relative bg-[#E9E9DB] p-4 sm:p-6">
        <svg
          viewBox="0 0 440 420"
          className="w-full cursor-pointer touch-manipulation select-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#2E3330]"
          role="button"
          tabIndex={0}
          aria-pressed={exploded}
          aria-label="Composición geométrica interactiva de CIELO. Actívala para recomponer sus piezas."
          onClick={() => setExploded((value) => !value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              setExploded((value) => !value);
            }
          }}
        >
          <g transform="translate(10 0)">
            {FACETS.map((facet) => {
              const center = centroid(facet.points);
              const offsetX = (center.x - 220) * 0.16;
              const offsetY = (center.y - 210) * 0.16;

              return (
                <g
                  key={facet.id}
                  className="landing-facet-group"
                  style={{
                    transform: exploded
                      ? `translate(${offsetX.toFixed(2)}px, ${offsetY.toFixed(2)}px)`
                      : 'translate(0px, 0px)',
                  }}
                >
                  <polygon
                    className="landing-facet hover:scale-105 focus-visible:scale-105"
                    points={facet.points}
                    fill={facet.fill}
                    stroke="#E9E9DB"
                    strokeWidth="3"
                    strokeLinejoin="round"
                  />
                </g>
              );
            })}
          </g>
        </svg>
      </div>
    </div>
  );
}
