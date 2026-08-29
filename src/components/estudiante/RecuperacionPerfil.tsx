import React from 'react';
import { ClipboardCheck } from 'lucide-react';
import type { AppState, BCKey, Estudiante, Curso, RecuperacionBC } from '../../types';
import { INDICADORES_RECUPERACION, TITULOS_RECUPERACION } from '../../constants/recuperacionCotejo';
import { BC_COLOR_THEMES, BC_ICONS } from '../../constants/competencias';
import { actividadesParaRecuperacion } from '../../utils/recuperacion';

interface RecuperacionPerfilProps {
    est: Estudiante | null | undefined;
    curso: Curso | null | undefined;
    periodo: string;
    setPeriodo: (p: string) => void;
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

/**
 * Devuelve el índice del indicador definitivo al que corresponde un texto
 * de indicador almacenado en recuperaciones_cotejo. Primero intenta la
 * igualdad exacta; si no coincide (textos históricos guardados con otra
 * redacción), mapea por similitud de tokens normalizados al indicador
 * definitivo de la misma BC. -1 si no hay correspondencia.
 */
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
    setPeriodo,
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

        return {
            key,
            num,
            nombre: TITULOS_RECUPERACION[key],
            indicadores: definitivos,
            logradas: logradasPorIndicador,
            totalActividades: aplicables.length,
            resultados: recuperacion.puntaje,
        };
    }).filter((b): b is NonNullable<typeof b> => b !== null);

    return (
        <div className="w-full space-y-5 pt-2">
            <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                    <h2 className="text-[17px] font-extrabold tracking-widest text-(--navy) uppercase border-b-2 border-(--navy) pb-1.5 inline-block">
                        Recuperación
                    </h2>
                    <p className="text-[12px] font-bold text-(--muted) mt-1.5 flex items-center gap-1.5">
                        <ClipboardCheck size={13} />
                        Informe por competencia · Solo lectura · Período {periodo}
                    </p>
                </div>
                <div className="flex bg-slate-100 p-1.5 rounded-xl border border-slate-200 shadow-sm">
                    {['P1', 'P2', 'P3', 'P4'].map(p => (
                        <button
                            key={p}
                            type="button"
                            onClick={() => setPeriodo(p)}
                            className={`px-5 py-2 min-h-9 leading-none rounded-lg text-xs font-extrabold tracking-[0.08em] transition-all ${
                                periodo === p
                                    ? 'bg-(--navy) text-white shadow-sm scale-102 font-black'
                                    : 'text-slate-600 hover:text-(--navy-dark) hover:bg-slate-200/60'
                            }`}
                        >
                            {p}
                        </button>
                    ))}
                </div>
            </div>

            {bloques.length === 0 ? (
                <p className="text-[13px] font-bold text-(--muted) italic bg-white border border-slate-200 rounded-2xl px-4 py-6 shadow-sm">
                    No hay recuperaciones registradas para este estudiante en el período {periodo}.
                </p>
            ) : (
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
                    {bloques.map(({ key, nombre, indicadores, logradas, totalActividades, resultados }) => (
                        <div key={key} className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                            <div className="flex items-center gap-2.5 px-4 py-3 bg-slate-50/70 border-b border-slate-200">
                                <span className={`w-7 h-7 rounded-lg shrink-0 flex items-center justify-center ${BC_COLOR_THEMES[key].bg} ${BC_COLOR_THEMES[key].text}`}>
                                    {BC_ICONS[key]}
                                </span>
                                <span className="text-[13px] font-black uppercase tracking-wider text-(--ink) leading-snug">
                                    Competencia {nombre}
                                </span>
                            </div>
                            <div className="px-4 py-3 space-y-2.5">
                                {indicadores.map((indicador, i) => (
                                    <p key={indicador} className="text-[12.5px] font-bold text-(--text) leading-relaxed">
                                        {indicador}{' '}
                                        Logrado en{' '}
                                        <strong className="font-black text-(--navy)">
                                            {logradas[i]}/{totalActividades}
                                        </strong>{' '}
                                        de las actividades evaluadas.
                                    </p>
                                ))}
                            </div>
                            <div className="px-4 py-3 border-t border-slate-100 flex items-center gap-2">
                                <span className="text-[12px] font-bold text-(--text)">Resultado de recuperación:</span>
                                <strong className={`text-[13px] font-black ${(resultados ?? 0) >= 70 ? 'text-(--tag-emerald-text)' : 'text-(--tag-rose-text)'}`}>
                                    {resultados !== null && resultados !== undefined ? `${fmt(resultados)} puntos` : '—'}
                                </strong>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default React.memo(RecuperacionPerfil);