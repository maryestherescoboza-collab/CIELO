/**
 * Selector de actividades que YA existen en CIELO.
 *
 * Reutilizar una actividad no es copiarla: la RPC ruta_vincular_actividad crea
 * una fila de ruta_actividad que APUNTA a la fila original de public.actividades
 * (actividad_origen_id). Lo único que se precarga es el texto —título y
 * descripción— y es editable; la actividad como tal sigue siendo una sola.
 *
 * El tipo que elige el docente aquí es el tipo de la RUTA, no el de CIELO: es
 * lo que decide CÓMO se corrige, con el mismo motor (ruta_evaluar_respuesta)
 * que ya usan las demás actividades. Por defecto se ofrece respuesta escrita,
 * que es la que un docente elige cuando la actividad de CIELO no trae
 * preguntas con respuesta declarada.
 */

import { useEffect, useMemo, useState } from 'react';
import { Loader2, Search, X, Link2, CircleAlert, Check } from 'lucide-react';

import type { ActividadExistente, TipoActividad } from '../../../types/rutas';
import { ETIQUETA_TIPO_ACTIVIDAD, TIPOS_ACTIVIDAD_V1 } from '../../../types/rutas';
import { rutaApiDocente } from '../../../lib/rutaApi';

interface SelectorActividadExistenteProps {
    rutaId: string;
    etapaTitulo: string;
    onVincular: (actividadOrigenId: number, tipo: TipoActividad) => Promise<void>;
    onCerrar: () => void;
}

export function SelectorActividadExistente({
    rutaId,
    etapaTitulo,
    onVincular,
    onCerrar,
}: SelectorActividadExistenteProps) {
    const [actividades, setActividades] = useState<ActividadExistente[]>([]);
    const [busqueda, setBusqueda] = useState('');
    const [elegida, setElegida] = useState<number | null>(null);
    const [tipo, setTipo] = useState<TipoActividad>('respuesta_escrita');

    const [cargando, setCargando] = useState(true);
    const [vinculando, setVinculando] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let vigente = true;
        (async () => {
            try {
                const lista = await rutaApiDocente.actividadesExistentes(rutaId);
                if (vigente) setActividades(lista);
            } catch (e) {
                if (vigente) {
                    setError(e instanceof Error ? e.message : 'No se pudieron cargar las actividades');
                }
            } finally {
                if (vigente) setCargando(false);
            }
        })();
        return () => {
            vigente = false;
        };
    }, [rutaId]);

    // Filtro en el cliente, no en la RPC: la lista sale una vez y filtrar 200
    // filas es instantáneo, mientras que una consulta por pulsación de tecla
    // solo agrega latencia y riesgo de perder la escribania.
    const visibles = useMemo(() => {
        const q = busqueda.trim().toLowerCase();
        if (!q) return actividades;
        return actividades.filter((a) =>
            [a.nombre, a.asignatura, a.periodo, a.indicador, a.descripcion]
                .filter(Boolean)
                .some((campo) => String(campo).toLowerCase().includes(q)),
        );
    }, [actividades, busqueda]);

    const actividadElegida = actividades.find((a) => a.id === elegida) ?? null;

    const confirmar = async () => {
        if (elegida === null) return;
        setVinculando(true);
        setError(null);
        try {
            await onVincular(elegida, tipo);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'No se pudo calificar la actividad');
            setVinculando(false);
        }
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
            role="dialog"
            aria-modal="true"
            aria-label="Calificar una actividad con esta ruta de aprendizaje"
        >
            <button
                onClick={onCerrar}
                className="absolute inset-0 bg-[#2E3330]/45 backdrop-blur-[2px]"
                aria-label="Cerrar"
            />

            <div className="relative w-full sm:max-w-2xl bg-white rounded-t-2xl sm:rounded-2xl border border-[#2E3330]/10 shadow-xl flex flex-col max-h-[88vh]">
                {/* ── Cabecera ── */}
                <div className="flex items-center gap-2 px-4 py-3 border-b border-[#2E3330]/8">
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[#4a7a46] bg-[#689C63]/15 px-2.5 py-1 rounded-full">
                        <Link2 size={12} /> Calificar
                    </span>
                    <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-bold text-[#2E3330] truncate">
                            Calificar una actividad con esta ruta
                        </p>
                        <p className="text-[11px] text-[#2E3330]/45 truncate">
                            En «{etapaTitulo}»
                        </p>
                    </div>
                    <button
                        onClick={onCerrar}
                        className="p-1.5 rounded-lg text-[#2E3330]/40 hover:bg-[#2E3330]/5 transition-colors"
                        aria-label="Cerrar"
                    >
                        <X size={15} />
                    </button>
                </div>

                {/* ── Buscador ── */}
                <div className="px-4 py-3 border-b border-[#2E3330]/8">
                    <div className="relative">
                        <Search
                            size={14}
                            className="absolute left-3 top-1/2 -translate-y-1/2 text-[#2E3330]/30 pointer-events-none"
                        />
                        <input
                            value={busqueda}
                            onChange={(e) => setBusqueda(e.target.value)}
                            placeholder="Buscar por nombre, asignatura, periodo o indicador…"
                            className="w-full pl-9 pr-3 py-2 text-[13px] rounded-lg border border-[#2E3330]/10 focus:outline-none focus:border-[#689C63]"
                        />
                    </div>
                    <p className="mt-1.5 text-[11px] text-[#2E3330]/45">
                        Solo aparecen las actividades de tus cursos con los que esta ficha está
                        compartida.
                    </p>
                </div>

                {/* ── Lista ── */}
                <div className="flex-1 overflow-y-auto p-3">
                    {error && (
                        <div className="mb-2 flex items-start gap-2 p-2.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-[12px]">
                            <CircleAlert size={14} className="mt-0.5 shrink-0" />
                            <span>{error}</span>
                        </div>
                    )}

                    {cargando ? (
                        <div className="flex items-center justify-center gap-2 py-10 text-[#2E3330]/45 text-[13px]">
                            <Loader2 size={15} className="animate-spin" /> Cargando actividades…
                        </div>
                    ) : visibles.length === 0 ? (
                        <p className="py-10 text-center text-[13px] text-[#2E3330]/45">
                            {actividades.length === 0
                                ? 'No hay actividades en los cursos de esta ficha todavía.'
                                : 'Ninguna actividad coincide con la búsqueda.'}
                        </p>
                    ) : (
                        <ul className="space-y-1.5">
                            {visibles.map((a) => {
                                const activa = elegida === a.id;
                                return (
                                    <li key={a.id}>
                                        <button
                                            type="button"
                                            disabled={a.en_esta_ruta}
                                            onClick={() => setElegida(a.id)}
                                            className={`w-full text-left px-3 py-2.5 rounded-xl border transition-colors ${
                                                activa
                                                    ? 'border-[#689C63] bg-[#689C63]/8'
                                                    : a.en_esta_ruta
                                                      ? 'border-[#2E3330]/8 opacity-55 cursor-not-allowed'
                                                      : 'border-[#2E3330]/10 hover:border-[#689C63]/45 hover:bg-[#689C63]/5'
                                            }`}
                                        >
                                            <div className="flex items-start gap-2">
                                                {activa && (
                                                    <Check
                                                        size={14}
                                                        className="mt-0.5 shrink-0 text-[#4a7a46]"
                                                    />
                                                )}
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-[13px] font-semibold text-[#2E3330]">
                                                        {a.nombre || 'Sin nombre'}
                                                    </p>
                                                    {a.indicador && (
                                                        <p className="text-[11.5px] text-[#2E3330]/55 leading-snug mt-0.5 line-clamp-2">
                                                            {a.indicador}
                                                        </p>
                                                    )}
                                                    <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                                                        {a.periodo && (
                                                            <span className="px-1.5 py-0.5 rounded bg-[#2E3330]/6 text-[10px] font-bold uppercase tracking-wide text-[#2E3330]/55">
                                                                {a.periodo}
                                                            </span>
                                                        )}
                                                        {a.asignatura && (
                                                            <span className="text-[10.5px] text-[#2E3330]/45">
                                                                {a.asignatura.replace(/_/g, ' ')}
                                                            </span>
                                                        )}
                                                        {a.en_esta_ruta && (
                                                            <span className="px-1.5 py-0.5 rounded bg-[#3e6088]/12 text-[10px] font-bold uppercase tracking-wide text-[#3e6088]">
                                                                Ya está en esta ruta
                                                            </span>
                                                        )}
                                                        {!a.en_esta_ruta && a.usada_en && (
                                                            <span className="text-[10.5px] text-[#2E3330]/40">
                                                                Usada en «{a.usada_en.ruta}»
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </button>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </div>

                {/* ── Tipo de la actividad en la ruta ── */}
                {actividadElegida && (
                    <div className="px-4 py-3 border-t border-[#2E3330]/8 bg-[#FAF9F7]">
                        <label className="block text-[10px] font-bold uppercase tracking-wide text-[#2E3330]/50 mb-1">
                            Cómo se califica en la ruta
                        </label>
                        <select
                            value={tipo}
                            onChange={(e) => setTipo(e.target.value as TipoActividad)}
                            className="w-full px-2.5 py-2 text-[12.5px] rounded-lg border border-[#2E3330]/10 bg-white focus:outline-none focus:border-[#689C63]"
                        >
                            {TIPOS_ACTIVIDAD_V1.map((t) => (
                                <option key={t} value={t}>
                                    {ETIQUETA_TIPO_ACTIVIDAD[t]}
                                </option>
                            ))}
                        </select>
                        <p className="mt-1.5 text-[11px] text-[#2E3330]/50 leading-relaxed">
                            La actividad de CIELO no trae preguntas con respuesta, así que hay que
                            escribirlas en la ruta. Al guardar, el estudiante la resuelve con el
                            corrector de CIELO y el puntaje pasa a{' '}
                            <strong className="font-semibold">calificaciones</strong>.
                        </p>
                    </div>
                )}

                {/* ── Pie ── */}
                <div className="flex items-center gap-2 px-4 py-3 border-t border-[#2E3330]/8">
                    <button
                        onClick={onCerrar}
                        className="px-3 py-1.5 text-[12px] font-semibold text-[#2E3330]/55 hover:text-[#2E3330] transition-colors"
                    >
                        Cancelar
                    </button>
                    <div className="flex-1" />
                    <button
                        onClick={confirmar}
                        disabled={elegida === null || vinculando}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-[#689C63] px-4 py-1.5 text-white text-[12.5px] font-bold hover:bg-[#5a8a55] disabled:opacity-40 transition-colors"
                    >
                        {vinculando ? (
                            <Loader2 size={13} className="animate-spin" />
                        ) : (
                            <Link2 size={13} />
                        )}
                        Calificar
                    </button>
                </div>
            </div>
        </div>
    );
}
