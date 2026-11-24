import { getBloquesCF, COLORES_BLOQUE_CF } from '../../lib/curriculo';

/**
 * Leyenda simple de los colores de acento de los indicadores de logro:
 * una entrada por Competencia Fundamental, con su nombre y su color CIELO.
 */
export default function LeyendaCompetenciasCF({ className = '', nivel }: { className?: string; nivel?: string }) {
  const bloques = getBloquesCF(nivel);
  return (
    <ul className={`flex flex-wrap items-center gap-x-4 gap-y-1.5 ${className}`}>
      {bloques.map(({ bloque, competencias }) => (
        <li
          key={bloque}
          className="flex items-center gap-1.5 text-[11px] font-bold text-[#2E3330]/65"
        >
          <span
            className="w-2.5 h-2.5 shrink-0 rounded-full"
            style={{ backgroundColor: COLORES_BLOQUE_CF[bloque] }}
          />
          <span>{competencias.join(' · ')}</span>
        </li>
      ))}
    </ul>
  );
}
