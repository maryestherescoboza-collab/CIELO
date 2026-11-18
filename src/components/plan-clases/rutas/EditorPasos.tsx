import React, { useState, useMemo, useEffect } from 'react';
import {
  Sparkles,
  SlidersHorizontal,
  Eye,
  EyeOff,
  Dices,
  X,
  Trash2,
  Code2,
} from 'lucide-react';
import katex from 'katex';
import 'katex/dist/katex.min.css';

import type { PasoProcedimiento, PreguntaConfig, TipoRespuesta } from '../../../types/rutas';
import {
  CATALOGO_FORMULAS,
  buscarDefinicionFormula,
  generarVariantesAleatorias,
  exportarAPasosCanónicos,
  type DefinicionFormula,
  type PasoMatematicoGenerado,
  type TokenPasoMatematico,
  type TipoEntradaEspacio,
  type NivelAyuda,
} from '../../../lib/motorProcedimientoMatematico';

export interface EditorPasosProps {
  pasos: PasoProcedimiento[];
  onChange: (pasos: PasoProcedimiento[]) => void;
  tipoRespuesta?: TipoRespuesta;
  config?: PreguntaConfig;
  datos?: string[];
  onDatosChange?: (datos: string[]) => void;
  enunciado?: string;
  onEnunciadoChange?: (enunciado: string) => void;
  puntaje?: number;
  onPuntajeChange?: (puntaje: number) => void;
  onGuardar?: () => void;
}

/** Renderiza una cadena matemática en modo KaTeX o tipografía serif limpia (sin errores rojos) */
function RenderKaTeX({ latex, className = '' }: { latex: string; className?: string }) {
  const html = useMemo(() => {
    if (!latex) return null;
    try {
      const res = katex.renderToString(latex, { displayMode: false, throwOnError: false });
      if (res.includes('katex-error') || res.includes('ParseError')) {
        return null;
      }
      return res;
    } catch {
      return null;
    }
  }, [latex]);

  if (!html) {
    return <span className={`${className} font-serif tracking-normal text-[#2E3330]`}>{latex}</span>;
  }

  return <span className={className} dangerouslySetInnerHTML={{ __html: html }} />;
}

export function EditorPasos({
  pasos: _pasosProp,
  onChange,
  config: _config,
  datos: _datosProp,
  onDatosChange,
  enunciado: enunciadoProp,
  onEnunciadoChange,
  puntaje: _puntajeProp = 100,
  onPuntajeChange: _onPuntajeChange,
  onGuardar: _onGuardar,
}: EditorPasosProps) {
  // ── 1. Estado de la Fórmula y Datos ───────────────────────────────────────
  const [formulaId, setFormulaId] = useState<string>('pitagoras');
  const formulaActual: DefinicionFormula = useMemo(
    () => buscarDefinicionFormula(formulaId),
    [formulaId]
  );

  // Valores de los datos numéricos de la fórmula actual
  const [valoresDatos, setValoresDatos] = useState<Record<string, number>>(() => {
    const iniciales: Record<string, number> = {};
    formulaActual.datosDefecto.forEach((d) => {
      iniciales[d.clave] = d.valor;
    });
    return iniciales;
  });

  // Enunciado local o controlado
  const [enunciado, setEnunciado] = useState<string>(() =>
    enunciadoProp || formulaActual.enunciadoPlantilla(valoresDatos)
  );

  // Puntaje
  const [puntaje, setPuntaje] = useState<number>(_puntajeProp);

  // Entrada por defecto global
  const [entradaGlobal, setEntradaGlobal] = useState<TipoEntradaEspacio>('numerico');

  // Nivel de ayuda activo
  const [nivelAyuda, setNivelAyuda] = useState<NivelAyuda>('medio');

  // Mostrar u ocultar claves en la hoja
  const [mostrarClaves, setMostrarClaves] = useState<boolean>(true);

  // Pasos generados con tokens interactivos
  const [pasosGenerados, setPasosGenerados] = useState<PasoMatematicoGenerado[]>(() => {
    const generados = formulaActual.generarPasos(valoresDatos, entradaGlobal);
    // Aplicar preset inicial
    const todosTokens = generados.flatMap((p) => p.tokens);
    formulaActual.presetsAyuda[nivelAyuda](todosTokens);
    return generados;
  });

  // Popover de Espacio seleccionado: { pasoId, tokenId }
  const [espacioActivo, setEspacioActivo] = useState<{
    pasoId: string;
    tokenId: string;
  } | null>(null);

  // Cajón de Ajustes y Modal de Variantes
  const [cajonAjustesAbierto, setCajonAjustesAbierto] = useState<boolean>(false);
  const [modalVariantesAbierto, setModalVariantesAbierto] = useState<boolean>(false);

  // Variantes calculadas
  const [variantesEjemplo, setVariantesEjemplo] = useState<
    { datos: Record<string, number>; resultadoFinal: string }[]
  >([]);

  // Sincronizar enunciado si cambia la propiedad externa
  useEffect(() => {
    if (enunciadoProp !== undefined && enunciadoProp !== enunciado) {
      setEnunciado(enunciadoProp);
    }
  }, [enunciadoProp]);

  // Si no se proporcionó enunciado inicial desde el padre, sincronizar la plantilla de la fórmula de inmediato
  useEffect(() => {
    if (!enunciadoProp && onEnunciadoChange) {
      onEnunciadoChange(enunciado);
    }
  }, []);

  // Sincronizar hacia el exterior cuando cambian los pasos generados
  const sincronizarHaciaExterior = (pasosActuales: PasoMatematicoGenerado[]) => {
    const canonicos = exportarAPasosCanónicos(pasosActuales);
    onChange(canonicos);

    if (onDatosChange) {
      const datosStr = Object.entries(valoresDatos).map(([k, v]) => `${k} = ${v}`);
      onDatosChange(datosStr);
    }
  };

  // ── 2. Cambiar de fórmula ────────────────────────────────────────────────
  const handleCambiarFormula = (nuevaId: string) => {
    setFormulaId(nuevaId);
    const nuevaDef = buscarDefinicionFormula(nuevaId);
    const nuevosDatos: Record<string, number> = {};
    nuevaDef.datosDefecto.forEach((d) => {
      nuevosDatos[d.clave] = d.valor;
    });
    setValoresDatos(nuevosDatos);

    const nuevoEnunciado = nuevaDef.enunciadoPlantilla(nuevosDatos);
    setEnunciado(nuevoEnunciado);
    if (onEnunciadoChange) onEnunciadoChange(nuevoEnunciado);

    const nuevosPasos = nuevaDef.generarPasos(nuevosDatos, entradaGlobal);
    const todosTokens = nuevosPasos.flatMap((p) => p.tokens);
    nuevaDef.presetsAyuda[nivelAyuda](todosTokens);

    setPasosGenerados(nuevosPasos);
    setEspacioActivo(null);
    sincronizarHaciaExterior(nuevosPasos);
  };

  // ── 3. Generar Procedimiento Resuelto ─────────────────────────────────────
  const generarProcedimiento = () => {
    // Mapear qué tokens ya estaban marcados como espacios (por posición id)
    const espaciosPrevios = new Set(
      pasosGenerados.flatMap((p) => p.tokens.filter((t) => t.esEspacio).map((t) => t.id))
    );

    const nuevosPasos = formulaActual.generarPasos(valoresDatos, entradaGlobal);

    if (espaciosPrevios.size > 0) {
      // Conservar los espacios existentes
      nuevosPasos.forEach((p) => {
        p.tokens.forEach((t) => {
          if (!t.esEstatico && espaciosPrevios.has(t.id)) {
            t.esEspacio = true;
          }
        });
      });
    } else {
      // Aplicar el nivel de andamiaje actual
      const todosTokens = nuevosPasos.flatMap((p) => p.tokens);
      formulaActual.presetsAyuda[nivelAyuda](todosTokens);
    }

    setPasosGenerados(nuevosPasos);
    setEspacioActivo(null);
    sincronizarHaciaExterior(nuevosPasos);
  };

  // ── 4. Cambiar nivel de ayuda ─────────────────────────────────────────────
  const aplicarNivel = (nuevoNivel: NivelAyuda) => {
    setNivelAyuda(nuevoNivel);
    const nuevosPasos = formulaActual.generarPasos(valoresDatos, entradaGlobal);
    const todosTokens = nuevosPasos.flatMap((p) => p.tokens);

    // Resetear
    todosTokens.forEach((t) => {
      t.esEspacio = false;
    });

    formulaActual.presetsAyuda[nuevoNivel](todosTokens);
    setPasosGenerados(nuevosPasos);
    setEspacioActivo(null);
    sincronizarHaciaExterior(nuevosPasos);
  };

  // ── 5. Toque sobre un token en la hoja del procedimiento ─────────────────
  const handleTokenClick = (pasoId: string, token: TokenPasoMatematico, e: React.MouseEvent) => {
    e.stopPropagation();
    if (token.esEstatico) return;

    if (!token.esEspacio) {
      // Un toque convierte el término en un espacio
      const actualizados = pasosGenerados.map((p) => {
        if (p.id !== pasoId) return p;
        return {
          ...p,
          tokens: p.tokens.map((t) =>
            t.id === token.id ? { ...t, esEspacio: true, tipoEntrada: entradaGlobal } : t
          ),
        };
      });
      setPasosGenerados(actualizados);
      sincronizarHaciaExterior(actualizados);
    } else {
      // Si ya es un espacio, abrir el popover para editar o quitar
      if (espacioActivo?.pasoId === pasoId && espacioActivo?.tokenId === token.id) {
        setEspacioActivo(null);
      } else {
        setEspacioActivo({ pasoId, tokenId: token.id });
      }
    }
  };

  // ── 6. Modificar o Quitar Espacio desde el Popover ─────────────────────────
  const actualizarTokenActivo = (cambios: Partial<TokenPasoMatematico>) => {
    if (!espacioActivo) return;
    const actualizados = pasosGenerados.map((p) => {
      if (p.id !== espacioActivo.pasoId) return p;
      return {
        ...p,
        tokens: p.tokens.map((t) =>
          t.id === espacioActivo.tokenId ? { ...t, ...cambios } : t
        ),
      };
    });
    setPasosGenerados(actualizados);
    sincronizarHaciaExterior(actualizados);
  };

  const quitarEspacioActivo = () => {
    actualizarTokenActivo({ esEspacio: false });
    setEspacioActivo(null);
  };

  // ── 7. Contador de espacios ───────────────────────────────────────────────
  const totalEspaciosMarcados = useMemo(() => {
    return pasosGenerados.reduce(
      (acc, p) => acc + p.tokens.filter((t) => t.esEspacio).length,
      0
    );
  }, [pasosGenerados]);

  // ── 8. Abrir modal de variantes ───────────────────────────────────────────
  const abrirVariantes = () => {
    const vars = generarVariantesAleatorias(formulaActual, 3);
    setVariantesEjemplo(vars);
    setModalVariantesAbierto(true);
  };

  return (
    <div className="w-full bg-white flex flex-col font-['Inter',sans-serif] select-none space-y-4">
      {/* ══════════════════════════════════════════════════════════════════════
          BANDA 1: BARRA SUPERIOR COMPACTA (ENUNCIADO Y CONFIGURACIÓN)
          ══════════════════════════════════════════════════════════════════════ */}
      <div className="space-y-3 shrink-0">
        {/* Fila 1: Enunciado */}
        <div>
          <input
            type="text"
            value={enunciado}
            onChange={(e) => {
              setEnunciado(e.target.value);
              if (onEnunciadoChange) onEnunciadoChange(e.target.value);
            }}
            placeholder="Enunciado del problema..."
            className="w-full bg-transparent border-b border-transparent hover:border-[#2E3330]/20 focus:border-[#689C63] py-1 text-[13px] text-[#2E3330] font-semibold outline-none transition-colors placeholder:text-[#2E3330]/30"
          />
        </div>

        {/* Fila 2: Fórmula, Datos en línea, Variantes y Generar Procedimiento */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-0.5">
          <div className="flex flex-wrap items-center gap-2">
            {/* Selector de Fórmula organizado por categorías */}
            <select
              value={formulaId}
              onChange={(e) => handleCambiarFormula(e.target.value)}
              className="bg-white border border-[#2E3330]/12 rounded-lg px-2.5 py-1 text-xs font-semibold text-[#2E3330] outline-none hover:border-[#2E3330]/30 focus:border-[#689C63] cursor-pointer 
               sm:max-w-[340px] truncate transition-colors"
            >
              {Array.from(new Set(CATALOGO_FORMULAS.map((f) => f.categoria))).map((cat) => (
                <optgroup key={cat} label={cat}>
                  {CATALOGO_FORMULAS.filter((f) => f.categoria === cat).map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.nombre} — {f.latexReferencia}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>

            {/* Datos en línea */}
            <div className="flex items-center gap-1.5">
              {formulaActual.datosDefecto.map((d) => (
                <div
                  key={d.clave}
                  className="inline-flex items-center gap-1 px-1.5 py-0.5"
                  title={d.nombre}
                >
                  <span className="text-[11px] font-bold text-[#2E3330]/60 font-mono">{d.clave} =</span>
                  <input
                    type="number"
                    value={valoresDatos[d.clave] ?? d.valor}
                    onChange={(e) => {
                      const num = parseFloat(e.target.value) || 0;
                      setValoresDatos((prev) => ({ ...prev, [d.clave]: num }));
                    }}
                    className="w-10 bg-transparent border-b border-transparent hover:border-[#2E3330]/20 focus:border-[#689C63] text-xs font-bold text-[#2E3330] outline-none text-center font-mono transition-colors"
                  />
                </div>
              ))}
            </div>

            {/* Botón Variantes como control secundario */}
            <button
              type="button"
              onClick={abrirVariantes}
              className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-semibold text-[#2E3330]/60 hover:text-[#689C63] transition-colors cursor-pointer"
              title="Generar 3 variantes aleatorias para verificar"
            >
              <Dices size={12} className="text-[#689C63]" />
              Variantes
            </button>
          </div>

          {/* Botón Generar procedimiento */}
          <button
            type="button"
            onClick={generarProcedimiento}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#689C63] hover:bg-[#5a8a55] text-white text-xs font-bold transition-all cursor-pointer active:scale-98"
          >
            <Sparkles size={13} />
            Generar procedimiento
          </button>
        </div>

        {/* Fila 3: Nivel de ayuda y Ajustes */}
        <div className="flex items-center justify-between pt-0.5 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold text-[#2E3330]/50">Andamiaje:</span>
            <div className="inline-flex items-center gap-1 bg-[#2E3330]/5 p-0.5 rounded-lg">
              {(['guiado', 'medio', 'final'] as NivelAyuda[]).map((nivel) => {
                const activo = nivelAyuda === nivel;
                return (
                  <button
                    key={nivel}
                    type="button"
                    onClick={() => aplicarNivel(nivel)}
                    className={`px-2.5 py-0.5 rounded-md text-[11px] font-semibold transition-all cursor-pointer ${activo
                        ? 'bg-white text-[#2E3330] shadow-xs'
                        : 'text-[#2E3330]/55 hover:text-[#2E3330]'
                      }`}
                  >
                    {nivel === 'guiado' && 'Guiado'}
                    {nivel === 'medio' && 'Medio'}
                    {nivel === 'final' && 'Solo respuesta final'}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Botón Ajustes como enlace secundario */}
          <button
            type="button"
            onClick={() => setCajonAjustesAbierto(true)}
            className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#2E3330]/60 hover:text-[#2E3330] transition-colors cursor-pointer"
          >
            <SlidersHorizontal size={12} />
            Ajustes
          </button>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          BANDA 2: CENTRO — LA HOJA DEL PROCEDIMIENTO
          (Tinte suave del 3% de marca, sin bordes ni sombras)
          ══════════════════════════════════════════════════════════════════════ */}
      <div
        className="w-full bg-[#689C63]/[0.03] rounded-2xl py-8 px-6 flex flex-col items-center justify-center min-h-[220px] relative transition-colors"
        onClick={() => setEspacioActivo(null)}
      >
        <div className="w-full max-w-2xl mx-auto flex flex-col items-center gap-2.5">
          {pasosGenerados.map((paso) => (
            <div
              key={paso.id}
              className="w-full min-h-[38px] py-1 flex flex-wrap items-center justify-center gap-1 select-none text-[20px] sm:text-[22px] tracking-wide"
            >
              {paso.tokens.map((token) => {
                if (token.esEstatico) {
                  return (
                    <span key={token.id} className="text-[#2E3330] inline-flex items-center font-serif leading-none">
                      <RenderKaTeX latex={token.texto} />
                    </span>
                  );
                }

                // Término interactivo (convertible o espacio)
                if (!token.esEspacio) {
                  // Término resuelto: hover punteado, un clic lo hace espacio
                  return (
                    <button
                      key={token.id}
                      type="button"
                      onClick={(e) => handleTokenClick(paso.id, token, e)}
                      title="Haz clic para convertir en espacio [ ? ]"
                      className="px-1.5 py-0.5 rounded-md border border-transparent hover:border-[#689C63]/50 hover:bg-[#689C63]/10 text-[#2E3330] transition-all cursor-pointer font-serif text-[20px] sm:text-[22px] leading-none inline-flex items-center"
                    >
                      <RenderKaTeX latex={token.texto} />
                    </button>
                  );
                }

                // Espacio marcado como hueco
                const esActivo =
                  espacioActivo?.pasoId === paso.id && espacioActivo?.tokenId === token.id;

                return (
                  <div key={token.id} className="relative inline-flex items-center">
                    <button
                      type="button"
                      onClick={(e) => handleTokenClick(paso.id, token, e)}
                      title="Espacio marcado. Clic para editar clave o quitar"
                      className={`min-w-[48px] h-[34px] px-2 rounded-lg text-sm font-mono font-bold inline-flex items-center justify-center transition-all cursor-pointer ${mostrarClaves
                          ? 'border-2 border-[#689C63] bg-[#689C63]/12 text-[#2b5926] shadow-xs'
                          : 'border-2 border-dashed border-[#689C63] bg-[#689C63]/5 text-[#689C63]'
                        } ${esActivo ? 'ring-2 ring-[#689C63] ring-offset-1' : ''}`}
                    >
                      {mostrarClaves ? token.clave : '[ ? ]'}
                    </button>

                    {/* ── Popover de Espacio Flotante ── */}
                    {esActivo && (
                      <div
                        className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 bg-white rounded-xl border border-[#2E3330]/15 shadow-xl p-3 z-50 text-left font-sans animate-in fade-in zoom-in-95 duration-150"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#E2E5E0]">
                          <span className="text-[11px] font-bold text-[#2E3330] uppercase tracking-wider">
                            Espacio de respuesta
                          </span>
                          <button
                            type="button"
                            onClick={() => setEspacioActivo(null)}
                            className="p-0.5 text-[#5F665E] hover:text-[#2E3330]"
                          >
                            <X size={14} />
                          </button>
                        </div>

                        <div className="space-y-2 text-xs">
                          <div>
                            <label className="block text-[10px] font-bold uppercase text-[#5F665E] mb-1">
                              Clave correcta
                            </label>
                            <input
                              type="text"
                              value={token.clave}
                              onChange={(e) =>
                                actualizarTokenActivo({
                                  clave: e.target.value,
                                  longitud: e.target.value.length,
                                })
                              }
                              className="w-full bg-[#F7F7F4] border border-[#E2E5E0] rounded-md px-2 py-1 text-xs font-mono font-bold text-[#2E3330] outline-none focus:border-[#689C63]"
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold uppercase text-[#5F665E] mb-1">
                              Tipo de teclado
                            </label>
                            <div className="grid grid-cols-2 gap-1">
                              <button
                                type="button"
                                onClick={() => actualizarTokenActivo({ tipoEntrada: 'numerico' })}
                                className={`px-2 py-1 rounded text-[11px] font-semibold border ${token.tipoEntrada === 'numerico'
                                    ? 'bg-[#689C63] text-white border-[#689C63]'
                                    : 'bg-white text-[#5F665E] border-[#E2E5E0]'
                                  }`}
                              >
                                Numérico
                              </button>
                              <button
                                type="button"
                                onClick={() => actualizarTokenActivo({ tipoEntrada: 'alfanumerico' })}
                                className={`px-2 py-1 rounded text-[11px] font-semibold border ${token.tipoEntrada === 'alfanumerico'
                                    ? 'bg-[#689C63] text-white border-[#689C63]'
                                    : 'bg-white text-[#5F665E] border-[#E2E5E0]'
                                  }`}
                              >
                                Letras
                              </button>
                            </div>
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold uppercase text-[#5F665E] mb-1">
                              Respuestas equivalentes
                            </label>
                            <input
                              type="text"
                              placeholder="Ej: 13.0, 13"
                              value={token.equivalentes.join(', ')}
                              onChange={(e) => {
                                const arr = e.target.value
                                  .split(',')
                                  .map((s) => s.trim())
                                  .filter(Boolean);
                                actualizarTokenActivo({ equivalentes: arr });
                              }}
                              className="w-full bg-[#F7F7F4] border border-[#E2E5E0] rounded-md px-2 py-1 text-[11px] text-[#2E3330] outline-none focus:border-[#689C63]"
                            />
                          </div>

                          <div className="pt-2 flex items-center justify-between border-t border-[#E2E5E0]">
                            <button
                              type="button"
                              onClick={quitarEspacioActivo}
                              className="text-red-600 hover:text-red-700 font-semibold text-[11px] flex items-center gap-1 cursor-pointer"
                            >
                              <Trash2 size={12} /> Quitar espacio
                            </button>

                            <button
                              type="button"
                              onClick={() => setEspacioActivo(null)}
                              className="px-3 py-1 bg-[#2E3330] text-white rounded text-[11px] font-bold"
                            >
                              Listo
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          BANDA 3: BARRA INFERIOR (CONTADOR, ENTRADA Y MOSTRAR CLAVES)
          ══════════════════════════════════════════════════════════════════════ */}
      <div className="border-t border-[#2E3330]/8 pt-3 flex flex-wrap items-center justify-between gap-3 text-xs shrink-0">
        {/* Contador de espacios */}
        <div className="flex items-center gap-2">
          <span className="font-bold text-[#2E3330]">{totalEspaciosMarcados} espacios marcados</span>
          <span className="text-[#2E3330]/30">·</span>
          <span className="text-[#2E3330]/50 text-[11px]">
            {totalEspaciosMarcados === 0
              ? 'Toca un término resuelto para convertirlo en espacio'
              : 'El estudiante completará estos campos'}
          </span>
        </div>

        {/* Tipo de entrada por defecto y switch de claves */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-semibold text-[#2E3330]/50">Entrada global:</span>
            <select
              value={entradaGlobal}
              onChange={(e) => {
                const tipo = e.target.value as TipoEntradaEspacio;
                setEntradaGlobal(tipo);
                // Actualizar tokens
                const actualizados = pasosGenerados.map((p) => ({
                  ...p,
                  tokens: p.tokens.map((t) => ({ ...t, tipoEntrada: tipo })),
                }));
                setPasosGenerados(actualizados);
                sincronizarHaciaExterior(actualizados);
              }}
              className="bg-transparent border-b border-transparent hover:border-[#2E3330]/20 focus:border-[#689C63] py-0.5 text-xs font-semibold text-[#2E3330] outline-none transition-colors cursor-pointer"
            >
              <option value="numerico">Numérico</option>
              <option value="alfanumerico">Alfanumérico</option>
            </select>
          </div>

          {/* Interruptor Mostrar Claves */}
          <button
            type="button"
            onClick={() => setMostrarClaves((v) => !v)}
            className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#2E3330]/60 hover:text-[#2E3330] transition-colors cursor-pointer"
          >
            {mostrarClaves ? <Eye size={13} className="text-[#689C63]" /> : <EyeOff size={13} />}
            {mostrarClaves ? 'Claves visibles' : 'Claves ocultas'}
          </button>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          CAJÓN LATERAL DE "AJUSTES" (PLEGADO POR DEFECTO)
          ══════════════════════════════════════════════════════════════════════ */}
      {cajonAjustesAbierto && (
        <div
          className="fixed inset-0 z-150 flex justify-end bg-black/40 backdrop-blur-xs font-sans"
          onClick={() => setCajonAjustesAbierto(false)}
        >
          <div
            className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col p-5 overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-[#E2E5E0]">
              <div className="flex items-center gap-2">
                <SlidersHorizontal size={16} className="text-[#689C63]" />
                <h3 className="text-sm font-bold text-[#2E3330]">Ajustes de Procedimiento</h3>
              </div>
              <button
                type="button"
                onClick={() => setCajonAjustesAbierto(false)}
                className="p-1 rounded text-[#5F665E] hover:text-[#2E3330]"
              >
                <X size={18} />
              </button>
            </div>

            <div className="py-4 space-y-4 text-xs">
              <div>
                <label className="block text-[11px] font-bold uppercase text-[#5F665E] mb-1">
                  Puntaje asignado
                </label>
                <input
                  type="number"
                  value={puntaje}
                  onChange={(e) => setPuntaje(parseInt(e.target.value, 10) || 0)}
                  className="w-full bg-[#F7F7F4] border border-[#E2E5E0] rounded-lg p-2 text-xs font-bold text-[#2E3330]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-[#5F665E] mb-1">
                  Rangos para generación de variantes
                </label>
                <div className="space-y-2">
                  {formulaActual.datosDefecto.map((d) => (
                    <div key={d.clave} className="flex items-center justify-between bg-[#F7F7F4] p-2.5 rounded-lg border border-[#E2E5E0]">
                      <span className="font-bold text-[#2E3330]">{d.nombre} ({d.clave})</span>
                      <div className="flex items-center gap-1.5 text-[11px]">
                        <span>min:</span>
                        <input
                          type="number"
                          defaultValue={d.rango ? d.rango[0] : 2}
                          className="w-12 bg-white border border-[#E2E5E0] rounded px-1.5 py-0.5 text-center font-bold"
                        />
                        <span>max:</span>
                        <input
                          type="number"
                          defaultValue={d.rango ? d.rango[1] : 9}
                          className="w-12 bg-white border border-[#E2E5E0] rounded px-1.5 py-0.5 text-center font-bold"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-bold uppercase text-[#5F665E] flex items-center gap-1">
                    <Code2 size={13} /> Edición manual de pasos (LaTeX / Avanzado)
                  </label>
                </div>
                <p className="text-[11px] text-[#5F665E] mb-2 leading-relaxed">
                  Para fórmulas fuera del catálogo, puedes editar directamente el procedimiento en LaTeX:
                </p>
                <textarea
                  rows={6}
                  value={pasosGenerados.map((p) => p.latexCompleto).join('\n')}
                  onChange={(e) => {
                    const lineas = e.target.value.split('\n').filter((l) => l.trim().length > 0);
                    const manuales: PasoMatematicoGenerado[] = lineas.map((linea, idx) => ({
                      id: `p_manual_${idx}`,
                      titulo: `Paso ${idx + 1}`,
                      latexCompleto: linea,
                      tokens: [
                        {
                          id: `p_manual_${idx}_t0`,
                          texto: linea,
                          esEstatico: false,
                          esEspacio: false,
                          clave: linea,
                          tipoEntrada: entradaGlobal,
                          equivalentes: [],
                          longitud: linea.length,
                        },
                      ],
                    }));
                    setPasosGenerados(manuales);
                    sincronizarHaciaExterior(manuales);
                  }}
                  className="w-full p-2.5 bg-[#F7F7F4] border border-[#E2E5E0] rounded-lg font-mono text-[11px] text-[#2E3330] focus:border-[#689C63]"
                />
              </div>
            </div>

            <div className="mt-auto pt-4 border-t border-[#E2E5E0]">
              <button
                type="button"
                onClick={() => setCajonAjustesAbierto(false)}
                className="w-full py-2 bg-[#2E3330] hover:bg-black text-white text-xs font-bold rounded-lg shadow-xs"
              >
                Cerrar y aplicar ajustes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          MODAL DE "VARIANTES ALEATORIAS"
          ══════════════════════════════════════════════════════════════════════ */}
      {modalVariantesAbierto && (
        <div
          className="fixed inset-0 z-150 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs font-sans"
          onClick={() => setModalVariantesAbierto(false)}
        >
          <div
            className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-[#2E3330]/15 p-5 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-[#E2E5E0]">
              <div className="flex items-center gap-2">
                <Dices size={16} className="text-[#689C63]" />
                <h3 className="text-sm font-bold text-[#2E3330]">
                  Variantes Aleatorias por Estudiante
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setModalVariantesAbierto(false)}
                className="p-1 rounded text-[#5F665E] hover:text-[#2E3330]"
              >
                <X size={16} />
              </button>
            </div>

            <p className="text-xs text-[#5F665E] leading-relaxed">
              Cada estudiante recibirá datos distintos dentro de los rangos definidos. El sistema
              recalculará automáticamente todas las sustituciones y claves:
            </p>

            <div className="space-y-2">
              {variantesEjemplo.map((v, i) => (
                <div
                  key={i}
                  className="p-3 bg-[#F7F7F4] rounded-xl border border-[#E2E5E0] flex items-center justify-between text-xs"
                >
                  <div>
                    <span className="font-bold text-[#2E3330] block">
                      Variante {i + 1}:
                    </span>
                    <span className="text-[#5F665E] font-mono">
                      {Object.entries(v.datos)
                        .map(([k, val]) => `${k} = ${val}`)
                        .join(', ')}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-[#5F665E] uppercase block font-semibold">
                      Clave final
                    </span>
                    <span className="font-mono font-bold text-[#689C63] text-sm">
                      {v.resultadoFinal}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setModalVariantesAbierto(false)}
                className="px-4 py-1.5 bg-[#2E3330] text-white rounded-lg text-xs font-bold"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default EditorPasos;
