import React from 'react';
import type { AppState, BCKey, Estudiante, Curso, RecuperacionBC } from '../../types';
import { INDICADORES_RECUPERACION, TITULOS_RECUPERACION } from '../../constants/recuperacionCotejo';
import { actividadesParaRecuperacion } from '../../utils/recuperacion';

interface RecuperacionPerfilProps {
    est: Estudiante | null | undefined;
    curso: Curso | null | undefined;
    periodo: string;
    state: AppState;
    currentAsignatura?: string;
    isTutor?: boolean;
}

const fmt = (n: number): string => (Number.isInteger(n) ? String(n) : n.toFixed(2));

const BCS: Array<{ num: 1 | 2 | 3 | 4; key: BCKey }> = [
    { num: 1, key: 'BC1' },
    { num: 2, key: 'BC2' },
    { num: 3, key: 'BC3' },
    { num: 4, key: 'BC4' },
];

const normalizar = (t: string): string[] =>
    t
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9 ]/g, ' ')
        .split(/\s+/)
        .filter(Boolean);

function indiceIndicadorDefinitivo(bc: 1 | 2 | 3 | 4, textoAlmacenado: string): number {
    const definitivos = INDICADORES_RECUPERACION[bc];
    const exacto = definitivos.findIndex(d => d === textoAlmacenado);
    if (exacto >= 0) return exacto;

    const tokens = new Set(normalizar(textoAlmacenado));
    let mejor = -1;
    let mejorSim = 0;
    definitivos.forEach((d, i) => {
        const dtokens = new Set(normalizar(d));
        let inter = 0;
        for (const tok of dtokens) if (tokens.has(tok)) inter++;
        const union = dtokens.size + tokens.size - inter;
        const sim = union > 0 ? inter / union : 0;
        if (sim > mejorSim) {
            mejorSim = sim;
            mejor = i;
        }
    });
    return mejorSim >= 0.25 ? mejor : -1;
}

const RecuperacionPerfil: React.FC<RecuperacionPerfilProps> = ({
    est,
    curso,
    periodo,
    state,
    currentAsignatura,
    isTutor = false,
}) => {
    if (!est || !curso) return null;

    const asignatura = isTutor ? undefined : currentAsignatura;
    const cursoId = curso.id;

    const bloques = BCS.map(({ num, key }) => {
        const recuperacion = state.recuperaciones.find((r: RecuperacionBC) =>
            r.estudianteId === est.id &&
            r.cursoId === cursoId &&
            r.bc === num &&
            r.periodo === periodo &&
            (!asignatura || !r.asignatura || r.asignatura === asignatura),
        );
        if (!recuperacion) return null;

        const cotejo = state.recuperacionesCotejo.filter(r => r.recuperacionId === recuperacion.id);
        const aplicables = actividadesParaRecuperacion(
            state.actividades,
            state.calificaciones,
            est.id,
            num,
            periodo,
            cursoId,
            asignatura,
        );

        const definitivos = INDICADORES_RECUPERACION[num];
        const logradasPorIndicador = definitivos.map(
            (_d, i) => cotejo.filter(r => indiceIndicadorDefinitivo(num, r.indicador) === i).length,
        );

        const bcColors: Record<string, string> = {
            'BC1': '#537BAC', 'BC2': '#689C63', 'BC3': '#EB8847', 'BC4': '#DB5B48'
        };

        return {
            key,
            num,
            nombre: TITULOS_RECUPERACION[key],
            indicadores: definitivos,
            logradas: logradasPorIndicador,
            totalActividades: aplicables.length,
            resultados: recuperacion.puntaje,
            color: bcColors[key] || '#4E5566'
        };
    }).filter((b): b is NonNullable<typeof b> => b !== null);

    return (
        <div className="w-full font-sans">
            <div className="flex items-baseline gap-2">
                <span className="font-['Space_Grotesk'] font-bold text-[#DB5B48] text-[13px]">//</span>
                <h2 className="font-['Space_Grotesk'] text-[12px] font-bold tracking-[0.14em] uppercase text-[#1B1F2A]">Recuperación por competencia</h2>
            </div>
            <hr className="border-t border-[#E4E3EC] mt-2 mb-4" />

            {bloques.length === 0 ? (
                <div className="text-[11.5px] text-[#8A8FA0] italic">
                    Sin registros de recuperación para el período {periodo}.
                </div>
            ) : (
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-x-8 gap-y-5">
                    {bloques.map(({ key, nombre, indicadores, logradas, totalActividades, resultados, color }) => (
                        <div key={key} className="break-inside-avoid mb-5">
                            <div className="inline-block font-['Space_Grotesk'] text-[11px] font-bold tracking-[0.02em] leading-[1.35] text-white px-2.5 py-1 rounded mb-2.75" style={{ background: color }}>
                                Competencia {nombre.toLowerCase()}
                            </div>
                            
                            {indicadores.map((indicador, i) => (
                                <div key={indicador} className="text-[11px] text-[#4E5566] mb-2 leading-normal">
                                    {indicador} Logrado en <strong className="font-bold text-[#1B1F2A]">{logradas[i]}/{totalActividades}</strong> de las actividades evaluadas.
                                </div>
                            ))}

                            <div className="mt-2.5 pt-2 border-t border-[#EFEEF4] flex items-baseline justify-between">
                                <div className="text-[10.5px] text-[#8A8FA0]">Resultado de recuperación</div>
                                <div className="font-['Space_Grotesk'] text-[13.5px] font-bold" style={{ color: color }}>
                                    {resultados !== null && resultados !== undefined ? `${fmt(resultados)} puntos` : '—'}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default React.memo(RecuperacionPerfil);