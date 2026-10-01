import React from 'react';

/**
 * Navegacion secundaria del modulo Estudiante.
 *
 * `Estudiante` es el modulo. `Fichas` y `Evidencias` son subsecciones suyas, y
 * por eso esto NO es un item mas de la `BottomNav`: la barra principal sigue
 * llevando a Estudiante y aqui se alterna entre las dos vistas.
 *
 * Se mantiene el lenguaje visual de la cabecera del modulo (mismo tamano de
 * texto, mismo color de tinta, mismo hover) para que se lea como parte de la
 * misma pantalla y no como una pantalla pegada dentro.
 *
 * `Fichas` conserva exactamente el comportamiento anterior: la ficha individual
 * del estudiante seleccionado. `Evidencias` es la bandeja del curso, que no
 * depende de que haya un estudiante abierto.
 */

export type SubseccionEstudiante = 'fichas' | 'evidencias';

const SUBECCIONES: { k: SubseccionEstudiante; label: string }[] = [
    { k: 'fichas', label: 'Fichas' },
    { k: 'evidencias', label: 'Evidencias' },
];

interface Props {
    activa: SubseccionEstudiante;
    onCambiar: (s: SubseccionEstudiante) => void;
}

const EstudianteSubnav: React.FC<Props> = ({ activa, onCambiar }) => (
    <div className="w-full max-w-280 mx-auto px-4 sm:px-8 pt-1">
        <div className="flex items-center gap-1 border-b border-[#E4E3EC]">
            {SUBECCIONES.map(s => (
                <button
                    key={s.k}
                    onClick={() => onCambiar(s.k)}
                    aria-current={activa === s.k ? 'page' : undefined}
                    className={`px-3 py-2 text-[11.5px] transition-colors border-b-2 -mb-px ${
                        activa === s.k
                            ? 'border-[#1B1F2A] text-[#1B1F2A] font-bold'
                            : 'border-transparent text-[#767a76] hover:text-[#1B1F2A]'
                    }`}
                >
                    {s.label}
                </button>
            ))}
        </div>
    </div>
);

export default EstudianteSubnav;
