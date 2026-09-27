/**
 * Editor de pasos y espacios — Procedimiento matematico (lado docente).
 *
 * Es la pieza que hace posible evaluar el PROCEDIMIENTO y no solo el resultado.
 * Cada espacio es una unidad independiente con su respuesta esperada, y su
 * posicion (paso, espacio) es la que la base de datos usa para resolverla.
 *
 * Que la verdad viva en `config.pasos` y no en el DOM significa que:
 *   - el estudiante no puede descubrir la clave mirando la pagina;
 *   - guardar, recargar y volver a editar no pierde la estructura.
 *
 * DECISION DE DISEÑO: el texto del paso y la lista de espacios se editan por
 * separado, pero se sincronizan. Un parser que reindexara los espacios al
 * cambiar el texto moveria las respuestas ya escritas cuando el docente
 * corrige una falta. Aqui agregar o quitar un espacio ajusta el texto, y una
 * vista previa muestra el paso tal como lo vera el estudiante.
 */

import { useMemo, useState } from 'react';
import { Plus, Trash2, ChevronUp, ChevronDown, Eye, EyeOff, AlertTriangle } from 'lucide-react';

import type { PasoProcedimiento, PreguntaConfig, TipoRespuesta } from '../../../types/rutas';
import { comparar, parsearNumero } from '../../../lib/rutaValidacion';
import { contarHuecos, partirPaso, sincronizarHuecos, totalEspacios } from '../../../lib/rutaPasos';

export interface EditorPasosProps {
    pasos: PasoProcedimiento[];
    onChange: (pasos: PasoProcedimiento[]) => void;
    tipoRespuesta: TipoRespuesta;
    config: PreguntaConfig;
    datos: string[];
    onDatosChange: (datos: string[]) => void;
}

interface Prueba {
    entrada: string;
    resultado?: 'ok' | 'ko';
}

export function EditorPasos({
    pasos,
    onChange,
    tipoRespuesta,
    config,
    datos,
    onDatosChange,
}: EditorPasosProps) {
    const [verRespuestas, setVerRespuestas] = useState(true);
    const [pruebas, setPruebas] = useState<Record<string, Prueba>>({});

    const total = useMemo(() => totalEspacios(pasos), [pasos]);

    const actualizarPaso = (indice: number, cambios: Partial<PasoProcedimiento>) => {
        onChange(pasos.map((p, i) => (i === indice ? { ...p, ...cambios } : p)));
    };

    /**
     * Agregar o quitar un espacio reescribe el texto con el mismo numero de
     * huecos. Es la operacion que mantiene alineados `texto` y `espacios[]`.
     */
    const redimensionarPaso = (indicePaso: number, espacios: PasoProcedimiento['espacios']) => {
        const paso = pasos[indicePaso];
        actualizarPaso(indicePaso, {
            espacios,
            texto: sincronizarHuecos(paso.texto, espacios.length),
        });
    };

    const agregarEspacio = (indicePaso: number) => {
        const paso = pasos[indicePaso];
        redimensionarPaso(indicePaso, [...paso.espacios, { respuesta: '' }]);
    };

    const eliminarEspacio = (indicePaso: number, indiceEspacio: number) => {
        const paso = pasos[indicePaso];
        redimensionarPaso(
            indicePaso,
            paso.espacios.filter((_, j) => j !== indiceEspacio),
        );
    };

    const actualizarRespuesta = (indicePaso: number, indiceEspacio: number, valor: string) => {
        const paso = pasos[indicePaso];
        actualizarPaso(indicePaso, {
            espacios: paso.espacios.map((e, j) => (j === indiceEspacio ? { ...e, respuesta: valor } : e)),
        });
    };

    /**
     * Si el docente escribe mas marcadores que espacios, se absorbsen: el texto
     * manda sobre la lista, y los sobrantes se ignoran al evaluar. Es la
     * alternativa a "el texto es invalido", que bloquearia la escritura.
     */
    const ajustarEspaciosAlTexto = (indicePaso: number, texto: string) => {
        const paso = pasos[indicePaso];
        const marcados = contarHuecos(texto);
        const espacios =
            marcados === paso.espacios.length
                ? paso.espacios
                : Array.from({ length: marcados }, (_, j) => paso.espacios[j] ?? { respuesta: '' });

        onChange(
            pasos.map((p, i) => (i === indicePaso ? { texto, espacios } : p)),
        );
    };

    const agregarPaso = () => {
        onChange([...pasos, { texto: '', espacios: [{ respuesta: '' }] }]);
    };

    const eliminarPaso = (indice: number) => {
        onChange(pasos.filter((_, i) => i !== indice));
    };

    const moverPaso = (indice: number, delta: number) => {
        const destino = indice + delta;
        if (destino < 0 || destino >= pasos.length) return;
        const nuevos = [...pasos];
        [nuevos[indice], nuevos[destino]] = [nuevos[destino], nuevos[indice]];
        onChange(nuevos);
    };

    const probar = (indicePaso: number, indiceEspacio: number) => {
        const clave = `${indicePaso}-${indiceEspacio}`;
        const esperado = pasos[indicePaso]?.espacios[indiceEspacio]?.respuesta;
        const entrada = pruebas[clave]?.entrada ?? '';
        if (!esperado?.trim() || !entrada.trim()) return;
        const ok = comparar(esperado, entrada, tipoRespuesta, config);
        setPruebas((p) => ({ ...p, [clave]: { entrada, resultado: ok ? 'ok' : 'ko' } }));
    };

    return (
        <div className="space-y-4">
            {/* ── Datos del problema ── */}
            <div className="rounded-xl border border-[#2E3330]/10 bg-[#689C63]/5 p-3">
                <div className="flex items-center justify-between mb-2">
                    <p className="text-[11px] font-bold uppercase tracking-wide text-[#2E3330]/60">
                        Datos del problema
                    </p>
                    <span className="text-[10px] text-[#2E3330]/45">uno por linea</span>
                </div>
                {datos.map((dato, i) => (
                    <div key={i} className="flex items-center gap-2 mb-1.5">
                        <input
                            value={dato}
                            onChange={(e) => {
                                const nuevos = [...datos];
                                nuevos[i] = e.target.value;
                                onDatosChange(nuevos);
                            }}
                            placeholder="b = 2"
                            className="flex-1 px-2.5 py-1.5 text-[13px] font-mono rounded-lg border border-[#2E3330]/10 bg-white focus:outline-none focus:border-[#689C63] transition-colors"
                        />
                        <button
                            type="button"
                            onClick={() => onDatosChange(datos.filter((_, j) => j !== i))}
                            className="p-1.5 rounded-lg text-[#2E3330]/40 hover:text-red-600 hover:bg-red-50 transition-colors"
                            aria-label="Eliminar dato"
                        >
                            <Trash2 size={13} />
                        </button>
                    </div>
                ))}
                <button
                    type="button"
                    onClick={() => onDatosChange([...datos, ''])}
                    className="inline-flex items-center gap-1 text-[12px] font-semibold text-[#3e6088] hover:underline"
                >
                    <Plus size={12} /> Agregar dato
                </button>
            </div>

            {/* ── Pasos ── */}
            <div className="flex items-center justify-between">
                <p className="text-[11px] font-bold uppercase tracking-wide text-[#2E3330]/60">
                    Procedimiento por pasos
                </p>
                <button
                    type="button"
                    onClick={() => setVerRespuestas((v) => !v)}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#2E3330]/50 hover:text-[#2E3330] transition-colors"
                >
                    {verRespuestas ? <EyeOff size={12} /> : <Eye size={12} />}
                    {verRespuestas ? 'Ocultar claves' : 'Mostrar claves'}
                </button>
            </div>

            <p className="text-[11px] text-[#2E3330]/50 leading-relaxed">
                Escribe el paso y usa{' '}
                <code className="px-1 py-0.5 bg-[#2E3330]/5 rounded font-mono">[ ]</code> donde el
                estudiante deba completar. CIELO guarda y evalua cada espacio por separado.
            </p>

            {pasos.length === 0 && (
                <div className="rounded-xl border border-dashed border-[#2E3330]/20 py-8 text-center">
                    <p className="text-[12px] text-[#2E3330]/50 mb-3">Todavia no hay pasos.</p>
                    <button
                        type="button"
                        onClick={agregarPaso}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#689C63] text-white text-[12px] font-bold hover:bg-[#5a8a55] transition-colors"
                    >
                        <Plus size={13} /> Agregar el primer paso
                    </button>
                </div>
            )}

            <div className="space-y-3">
                {pasos.map((paso, indicePaso) => {
                    const huecos = contarHuecos(paso.texto);
                    const desalineado = huecos !== paso.espacios.length;

                    return (
                        <div
                            key={indicePaso}
                            className="rounded-xl border border-[#2E3330]/10 bg-white overflow-hidden"
                        >
                            <div className="flex items-center gap-2 px-3 py-2 border-b border-[#2E3330]/8 bg-[#2E3330]/[0.02]">
                                <span className="text-[11px] font-bold text-[#2E3330]/60">
                                    Paso {indicePaso + 1}
                                </span>
                                <div className="flex-1" />
                                <button
                                    type="button"
                                    onClick={() => moverPaso(indicePaso, -1)}
                                    disabled={indicePaso === 0}
                                    className="p-1 rounded text-[#2E3330]/40 hover:text-[#2E3330] disabled:opacity-25 transition-colors"
                                    aria-label="Subir paso"
                                >
                                    <ChevronUp size={13} />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => moverPaso(indicePaso, 1)}
                                    disabled={indicePaso === pasos.length - 1}
                                    className="p-1 rounded text-[#2E3330]/40 hover:text-[#2E3330] disabled:opacity-25 transition-colors"
                                    aria-label="Bajar paso"
                                >
                                    <ChevronDown size={13} />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => eliminarPaso(indicePaso)}
                                    className="p-1 rounded text-[#2E3330]/40 hover:text-red-600 transition-colors"
                                    aria-label="Eliminar paso"
                                >
                                    <Trash2 size={13} />
                                </button>
                            </div>

                            <div className="p-3 space-y-2.5">
                                <textarea
                                    value={paso.texto}
                                    onChange={(e) => ajustarEspaciosAlTexto(indicePaso, e.target.value)}
                                    rows={2}
                                    placeholder="a^2 = [ ]^2 - [ ]^2"
                                    className="w-full px-3 py-2 text-[14px] font-mono rounded-lg border border-[#2E3330]/10 focus:outline-none focus:border-[#689C63] resize-y leading-relaxed"
                                />

                                {desalineado && (
                                    <p className="flex items-start gap-1.5 text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5 leading-relaxed">
                                        <AlertTriangle size={12} className="mt-0.5 shrink-0" />
                                        Se esta ajustando el texto: {huecos} marcador
                                        {huecos === 1 ? '' : 'es'} para {paso.espacios.length} espacio
                                        {paso.espacios.length === 1 ? '' : 's'}.
                                    </p>
                                )}

                                {/* ── Vista previa del paso como lo vera el estudiante ── */}
                                {paso.texto.trim() !== '' && (
                                    <div className="rounded-lg bg-[#2E3330]/[0.03] px-3 py-2">
                                        <p className="text-[10px] font-bold uppercase tracking-wide text-[#2E3330]/40 mb-1">
                                            Como lo vera el estudiante
                                        </p>
                                        <p className="text-[13px] font-mono text-[#2E3330]/75 leading-relaxed">
                                            {partirPaso(paso.texto).map((parte, i) =>
                                                parte.tipo === 'texto' ? (
                                                    <span key={i}>{parte.valor}</span>
                                                ) : (
                                                    <span
                                                        key={i}
                                                        className="inline-block min-w-14 px-1.5 py-0.5 mx-0.5 text-center rounded border border-dashed border-[#2E3330]/30 bg-white text-[#2E3330]/35"
                                                    >
                                                        {i + 1}
                                                    </span>
                                                ),
                                            )}
                                        </p>
                                    </div>
                                )}

                                {paso.espacios.length > 0 && (
                                    <div className="pt-1 space-y-2">
                                        {paso.espacios.map((espacio, indiceEspacio) => {
                                            const clave = `${indicePaso}-${indiceEspacio}`;
                                            const prueba = pruebas[clave];
                                            const noNumerico =
                                                tipoRespuesta === 'numerica' &&
                                                espacio.respuesta.trim() !== '' &&
                                                parsearNumero(espacio.respuesta) === null;

                                            return (
                                                <div key={indiceEspacio} className="space-y-1.5">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <span className="text-[11px] font-semibold text-[#2E3330]/50 w-14 shrink-0">
                                                            Espacio {indiceEspacio + 1}
                                                        </span>

                                                        {verRespuestas && (
                                                            <div className="flex items-center gap-1">
                                                                <input
                                                                    value={espacio.respuesta}
                                                                    onChange={(e) =>
                                                                        actualizarRespuesta(
                                                                            indicePaso,
                                                                            indiceEspacio,
                                                                            e.target.value,
                                                                        )
                                                                    }
                                                                    placeholder="clave"
                                                                    className="w-24 px-2.5 py-1.5 text-[13px] font-mono rounded-lg border border-[#689C63]/40 bg-[#689C63]/5 focus:outline-none focus:border-[#689C63] focus:bg-white transition-colors"
                                                                />
                                                                {noNumerico && (
                                                                    <span
                                                                        className="text-[10px] font-bold text-amber-700"
                                                                        title="No es numerico: se comparara como texto"
                                                                    >
                                                                        texto
                                                                    </span>
                                                                )}
                                                            </div>
                                                        )}

                                                        <div className="flex items-center gap-1">
                                                            <input
                                                                value={prueba?.entrada ?? ''}
                                                                onChange={(e) =>
                                                                    setPruebas((p) => ({
                                                                        ...p,
                                                                        [clave]: {
                                                                            entrada: e.target.value,
                                                                        },
                                                                    }))
                                                                }
                                                                onKeyDown={(e) => {
                                                                    if (e.key === 'Enter') {
                                                                        e.preventDefault();
                                                                        probar(indicePaso, indiceEspacio);
                                                                    }
                                                                }}
                                                                onBlur={() => probar(indicePaso, indiceEspacio)}
                                                                placeholder="probar..."
                                                                className={`w-20 px-2 py-1.5 text-[12px] font-mono rounded-lg border transition-colors focus:outline-none ${
                                                                    prueba?.resultado === 'ok'
                                                                        ? 'border-[#689C63] bg-[#689C63]/10 text-[#4a7a46]'
                                                                        : prueba?.resultado === 'ko'
                                                                          ? 'border-red-300 bg-red-50 text-red-700'
                                                                          : 'border-[#2E3330]/10 focus:border-[#2E3330]/30'
                                                                }`}
                                                            />
                                                            {prueba?.resultado && (
                                                                <span
                                                                    className={`text-[11px] font-bold ${
                                                                        prueba.resultado === 'ok'
                                                                            ? 'text-[#4a7a46]'
                                                                            : 'text-red-600'
                                                                    }`}
                                                                >
                                                                    {prueba.resultado === 'ok' ? 'OK' : 'X'}
                                                                </span>
                                                            )}
                                                        </div>

                                                        <div className="flex-1" />

                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                eliminarEspacio(indicePaso, indiceEspacio)
                                                            }
                                                            className="p-1 rounded text-[#2E3330]/30 hover:text-red-600 transition-colors"
                                                            aria-label={`Eliminar espacio ${indiceEspacio + 1}`}
                                                        >
                                                            <Trash2 size={12} />
                                                        </button>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}

                                <button
                                    type="button"
                                    onClick={() => agregarEspacio(indicePaso)}
                                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#3e6088] hover:underline"
                                >
                                    <Plus size={11} /> Agregar espacio
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>

            {pasos.length > 0 && (
                <button
                    type="button"
                    onClick={agregarPaso}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#2E3330]/10 text-[12px] font-bold text-[#3e6088] hover:bg-[#3e6088]/5 transition-colors"
                >
                    <Plus size={13} /> Agregar paso
                </button>
            )}

            <p className="text-[11px] text-[#2E3330]/50 pt-1">
                {total} espacio{total === 1 ? '' : 's'} en total. CIELO podra indicar cual de
                ellos fallo.
            </p>
        </div>
    );
}
