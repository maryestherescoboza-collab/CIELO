import React, { useState, useMemo } from 'react';
import {
  MessageSquare,
  Brain,
  Scale,
  Leaf,
  Eye,
  RotateCcw,
  AlertTriangle,
  Compass,
  Check,
  ArrowUpDown,
  ClipboardPaste,
} from 'lucide-react';

type BCKey = 'BC1' | 'BC2' | 'BC3' | 'BC4';

interface ActividadConfig {
  id: number;
  nombre: string;
  bcs: BCKey[];
  pts: [number, number, number, number]; // puntos por cada BC
}

interface EstudianteData {
  id: number;
  codigo: string;
  nombre: string;
  notas: Record<number, number | null>;
}

// 4 actividades exactas requeridas
const ACTIVIDADES_BASE: ActividadConfig[] = [
  { id: 1, nombre: 'ACTIV. 5', bcs: ['BC1', 'BC2'], pts: [5, 15, 0, 0] },
  { id: 2, nombre: 'ACTIV. 2.1', bcs: ['BC1', 'BC2', 'BC3'], pts: [5, 0, 17, 0] },
  { id: 3, nombre: 'ACTIV. 3', bcs: ['BC2'], pts: [0, 15, 0, 0] },
  { id: 4, nombre: 'PRODUCTO F...', bcs: ['BC1'], pts: [40, 0, 0, 0] },
];

// Estudiantes y notas fieles a la captura
const ESTUDIANTES_BASE: EstudianteData[] = [
  {
    id: 1,
    codigo: '730',
    nombre: 'ANA VALENTINA RE...',
    notas: { 1: 85, 2: 55, 3: 100, 4: 70 },
  },
  {
    id: 2,
    codigo: '703',
    nombre: 'ADRIÁN ACOSTA',
    notas: { 1: 55, 2: 70, 3: 100, 4: 85 },
  },
  {
    id: 3,
    codigo: '690',
    nombre: 'BIANCA BRAVO',
    notas: { 1: 100, 2: 85, 3: 85, 4: 65 },
  },
  {
    id: 4,
    codigo: '691',
    nombre: 'CRISTÓBAL CABRERA',
    notas: { 1: 70, 2: 100, 3: 70, 4: 82.5 },
  },
  {
    id: 5,
    codigo: '692',
    nombre: 'DANIELA DUARTE',
    notas: { 1: 55, 2: 55, 3: 100, 4: 100 },
  },
  {
    id: 6,
    codigo: '693',
    nombre: 'EMILIO ESPINOZA',
    notas: { 1: 70, 2: 70, 3: 55, 4: 85 },
  },
];

// Temas e iconos auténticos de CIELO
const COMPETENCIAS_THEME: Record<
  BCKey,
  {
    label: string;
    fullName: string;
    color: string;
    activeClass: string;
    icon: React.ReactNode;
  }
> = {
  BC1: {
    label: 'COMUNICATIVA',
    fullName: 'COMUNICATIVA',
    color: '#537BAC',
    activeClass: 'bg-[#537BAC] text-white shadow-xs',
    icon: <MessageSquare size={11} />,
  },
  BC2: {
    label: 'PENSAMIENTO LÓGICO',
    fullName: 'PENSAMIENTO LÓGICO, CREATIVO Y CRÍTICO; Y RESOLUCIÓN DE PROBLEMAS',
    color: '#DEAE4D',
    activeClass: 'bg-[#DEAE4D] text-[#2E3330] shadow-xs',
    icon: <Brain size={11} />,
  },
  BC3: {
    label: 'CIENTÍFICA Y TECNOL.',
    fullName: 'CIENTÍFICA Y TECNOLÓGICA; Y AMBIENTAL Y DE LA SALUD',
    color: '#EB8847',
    activeClass: 'bg-[#EB8847] text-white shadow-xs',
    icon: <Scale size={11} />,
  },
  BC4: {
    label: 'ÉTICA Y CIUDADANA',
    fullName: 'ÉTICA Y CIUDADANA; Y DESARROLLO PERSONAL Y ESPIRITUAL',
    color: '#689C63',
    activeClass: 'bg-[#689C63] text-white shadow-xs',
    icon: <Leaf size={11} />,
  },
};

export function InteractiveGradebookDemo() {
  const [actividades, setActividades] = useState<ActividadConfig[]>(ACTIVIDADES_BASE);
  const [estudiantes, setEstudiantes] = useState<EstudianteData[]>(ESTUDIANTES_BASE);
  const [editingCell, setEditingCell] = useState<{ estId: number; actId: number } | null>(null);
  const [tempValue, setTempValue] = useState<string>('');

  // Alternar competencia al hacer clic en un icono de la píldora
  const handleToggleBc = (actId: number, bc: BCKey) => {
    setActividades((prev) =>
      prev.map((act) => {
        if (act.id !== actId) return act;
        const exists = act.bcs.includes(bc);
        const nextBcs = exists ? act.bcs.filter((b) => b !== bc) : [...act.bcs, bc];
        return { ...act, bcs: nextBcs.length > 0 ? nextBcs : [bc] };
      })
    );
  };

  // Abrir edición rápida
  const handleStartEdit = (estId: number, actId: number, currentVal: number | null) => {
    setEditingCell({ estId, actId });
    setTempValue(currentVal !== null ? String(currentVal) : '');
  };

  // Guardar calificación
  const handleSaveScore = (overrideVal?: number | null) => {
    if (!editingCell) return;
    const finalVal =
      overrideVal !== undefined
        ? overrideVal
        : tempValue.trim() === ''
        ? null
        : Math.min(100, Math.max(0, parseFloat(tempValue) || 0));

    setEstudiantes((prev) =>
      prev.map((est) => {
        if (est.id !== editingCell.estId) return est;
        return {
          ...est,
          notas: {
            ...est.notas,
            [editingCell.actId]: finalVal,
          },
        };
      })
    );
    setEditingCell(null);
  };

  // Reiniciar a valores originales
  const handleReset = () => {
    setActividades(ACTIVIDADES_BASE);
    setEstudiantes(ESTUDIANTES_BASE);
    setEditingCell(null);
  };

  // Cálculo ponderado automático por competencia
  const promedios = useMemo(() => {
    const res: Record<number, Record<BCKey, number | null>> = {};

    estudiantes.forEach((est) => {
      res[est.id] = { BC1: null, BC2: null, BC3: null, BC4: null };

      (['BC1', 'BC2', 'BC3', 'BC4'] as BCKey[]).forEach((bcKey, idx) => {
        let suma = 0;
        let pesoTotal = 0;

        actividades.forEach((act) => {
          if (act.bcs.includes(bcKey)) {
            const nota = est.notas[act.id];
            const p = act.pts[idx] > 0 ? act.pts[idx] : 10;
            if (nota !== null && nota !== undefined) {
              suma += nota * p;
              pesoTotal += p;
            }
          }
        });

        if (pesoTotal > 0) {
          res[est.id][bcKey] = Math.round(suma / pesoTotal);
        }
      });
    });

    return res;
  }, [actividades, estudiantes]);

  // Estilos de píldora de notas fieles a CIELO
  const getBadgeClass = (score: number | null) => {
    if (score === null || score === undefined) return 'text-slate-300 bg-transparent';
    if (score >= 85) return 'bg-[#BFC9A6]/30 text-[#556947] font-bold';
    if (score >= 70) return 'bg-[#537BAC]/15 text-[#537BAC] font-bold';
    return 'bg-[#DB5B48]/15 text-[#DB5B48] font-bold';
  };

  return (
    <div className="w-full">
      {/* ========================================================================= */}
      {/* GUÍA MINIMALISTA SIN CONTENEDORES NI TARJETAS                              */}
      {/* ========================================================================= */}
      <div className="mb-2.5 sm:mb-4">
        <div className="flex items-center justify-between mb-2 sm:mb-3 border-b border-[#2E3330]/10 pb-1.5 sm:pb-2">
          <div className="flex items-center gap-2">
            <span className="font-cagliostro text-base sm:text-2xl font-normal text-[#2E3330]">
              Evaluación por Competencias
            </span>
            <span className="hidden sm:inline-block text-[11px] font-bold uppercase tracking-[0.18em] text-[#537BAC]">
              (Pruébalo en vivo)
            </span>
          </div>
          <button
            type="button"
            onClick={handleReset}
            className="inline-flex items-center gap-1 sm:gap-1.5 text-[10px] sm:text-xs font-semibold text-[#5F665E] hover:text-[#2E3330] transition-colors cursor-pointer"
          >
            <RotateCcw className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
            <span>Reiniciar</span>
          </button>
        </div>

        {/* 3 Pasos en tipografía editorial directa sin marcos ni cajas */}
        <div className="grid grid-cols-1 gap-2 sm:gap-4 md:grid-cols-3 text-[#2E3330]">
          <div className="flex items-start gap-2 sm:gap-2.5">
            <span className="font-mono text-xs sm:text-sm font-black text-[#537BAC]">1.</span>
            <div>
              <p className="text-[11px] sm:text-[13px] font-bold leading-tight">Haz clic en cualquier celda</p>
              <p className="text-[9.5px] sm:text-xs text-[#5F665E] leading-normal mt-0.5">
                Toca cualquier número o celda vacía para cambiar la calificación.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-2 sm:gap-2.5">
            <span className="font-mono text-xs sm:text-sm font-black text-[#DEAE4D]">2.</span>
            <div>
              <p className="text-[11px] sm:text-[13px] font-bold leading-tight">Toca las píldoras de competencias</p>
              <p className="text-[9.5px] sm:text-xs text-[#5F665E] leading-normal mt-0.5">
                Haz clic en las píldoras (BC1–BC4) arriba de cada actividad para vincularlas.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-2 sm:gap-2.5">
            <span className="font-mono text-xs sm:text-sm font-black text-[#689C63]">3.</span>
            <div>
              <p className="text-[11px] sm:text-[13px] font-bold leading-tight">Cálculo automático</p>
              <p className="text-[9.5px] sm:text-xs text-[#5F665E] leading-normal mt-0.5">
                A la derecha, las columnas de competencias se recalculan al instante.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TABLA FIEL A LA IMAGEN ORIGINAL (4 ACTIVIDADES, BORDES RECTOS)            */}
      {/* ========================================================================= */}
      <div className="w-full overflow-x-auto border border-[#2E3330]/20 bg-white shadow-xs rounded-none">
        <table className="w-full min-w-215 border-collapse text-center text-[10px]">
          <thead>
            {/* Cabecera idéntica a la imagen */}
            <tr className="bg-[#FAF8F5] border-b border-[#2E3330]/10 text-[#2E3330]">
              {/* Columna Estudiantes */}
              <th className="p-2.5 text-left border-r border-[#2E3330]/10 w-52 sm:w-56 align-top">
                <span className="text-[11px] sm:text-xs font-black uppercase tracking-[0.2em] italic text-[#2E3330] block">
                  Estudiantes
                </span>
                <div className="mt-1.5 flex flex-col gap-0.5 text-[8.5px] font-bold tracking-wider text-[#5F665E]/70 uppercase">
                  <span className="hover:text-[#2E3330] cursor-pointer">+ Agregar estudiante</span>
                  <span className="hover:text-[#2E3330] cursor-pointer">⇅ Agregar en posición</span>
                  <span className="hover:text-[#2E3330] cursor-pointer">📋 Pegar listado</span>
                </div>
              </th>

              {/* 4 Actividades reducidas */}
              {actividades.map((act) => (
                <th
                  key={act.id}
                  className="p-2 border-r border-[#2E3330]/10 min-w-26.25 align-top"
                >
                  <div className="flex flex-col items-center gap-1.5">
                    {/* Botón VER */}
                    <span className="inline-flex items-center gap-1 rounded-full border border-[#2E3330]/15 bg-[#FCFAF6] px-2.5 py-0.5 text-[8.5px] font-bold text-[#5F665E] uppercase tracking-wider">
                      <Eye size={10} /> Ver
                    </span>

                    {/* Nombre de la actividad */}
                    <span className="text-[10.5px] font-black uppercase tracking-wider text-[#2E3330] whitespace-nowrap">
                      {act.nombre}
                    </span>

                    {/* Píldora cápsula ovalada con los 4 iconos de competencias de CIELO */}
                    <div className="flex items-center gap-1 rounded-full border border-[#2E3330]/15 bg-[#FCFAF6] p-0.5">
                      {(['BC1', 'BC2', 'BC3', 'BC4'] as BCKey[]).map((bc) => {
                        const isSel = act.bcs.includes(bc);
                        const meta = COMPETENCIAS_THEME[bc];

                        return (
                          <button
                            key={bc}
                            type="button"
                            onClick={() => handleToggleBc(act.id, bc)}
                            title={`Alternar ${meta.label}`}
                            className={`flex h-4.5 w-4.5 items-center justify-center rounded-full transition-transform hover:scale-115 cursor-pointer ${
                              isSel ? meta.activeClass : 'text-[#5F665E]/30 hover:text-[#5F665E]'
                            }`}
                          >
                            {meta.icon}
                          </button>
                        );
                      })}
                    </div>

                    {/* Puntos por competencia debajo de la cápsula */}
                    <div className="flex items-center justify-center gap-1.5 text-[7.5px] text-[#5F665E] font-mono">
                      <span>{act.pts[0]} pts</span>
                      <span>{act.pts[1]} pts</span>
                      <span>{act.pts[2]} pts</span>
                      <span>{act.pts[3]} pts</span>
                    </div>
                  </div>
                </th>
              ))}

              {/* Destaca */}
              <th className="p-2 border-r border-[#2E3330]/10 w-14 align-middle bg-[#FCFAF6]">
                <div className="flex flex-col items-center justify-center">
                  <Compass size={15} className="text-[#DEAE4D]" />
                  <span className="text-[8.5px] font-black uppercase tracking-widest text-[#DEAE4D] mt-0.5">
                    Destaca
                  </span>
                </div>
              </th>

              {/* 4 Columnas de competencias oficiales */}
              {(['BC1', 'BC2', 'BC3', 'BC4'] as BCKey[]).map((bc) => {
                const meta = COMPETENCIAS_THEME[bc];
                return (
                  <React.Fragment key={bc}>
                    <th className="p-1.5 border-r border-[#2E3330]/10 min-w-27.5 align-middle bg-[#FAF8F5]">
                      <span className="text-[8.5px] font-black uppercase tracking-wider text-[#5F665E] block leading-[1.15]">
                        {meta.fullName}
                      </span>
                    </th>
                    <th className="p-1 border-r border-[#2E3330]/10 w-8 align-middle bg-[#FAF8F5]">
                      <span className="text-[8px] font-black uppercase tracking-widest text-[#689C63]/80">
                        REC.
                      </span>
                    </th>
                  </React.Fragment>
                );
              })}
            </tr>
          </thead>

          <tbody className="divide-y divide-[#2E3330]/10">
            {estudiantes.map((est, eIdx) => {
              const calc = promedios[est.id];

              return (
                <tr key={est.id} className="hover:bg-slate-50/70 transition-colors">
                  {/* Estudiante con número y código ID */}
                  <td className="p-2 text-left border-r border-[#2E3330]/10 whitespace-nowrap bg-white">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[9.5px] text-[#5F665E]/60 w-3 text-right">{eIdx + 1}</span>
                        <div>
                          <p className="text-[11px] font-bold text-[#2E3330] leading-tight">
                            {est.nombre}
                          </p>
                          <p className="text-[8.5px] text-[#5F665E]/70 font-mono">ID: {est.codigo}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 text-[#5F665E]/40 text-[9.5px]">
                        <ArrowUpDown size={11} />
                        <ClipboardPaste size={11} />
                      </div>
                    </div>
                  </td>

                  {/* 4 Celdas de calificación con las notas exactas */}
                  {actividades.map((act) => {
                    const score = est.notas[act.id];
                    const isEditing =
                      editingCell?.estId === est.id && editingCell?.actId === act.id;

                    return (
                      <td
                        key={act.id}
                        className="p-1 border-r border-[#2E3330]/10 relative align-middle"
                      >
                        {isEditing ? (
                          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-white p-1 shadow-md border border-[#537BAC]">
                            <input
                              type="number"
                              min={0}
                              max={100}
                              value={tempValue}
                              onChange={(e) => setTempValue(e.target.value)}
                              onBlur={() => handleSaveScore()}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSaveScore();
                                if (e.key === 'Escape') setEditingCell(null);
                              }}
                              autoFocus
                              className="w-full text-center font-bold text-xs bg-amber-50 border border-slate-300 py-0.5 outline-none"
                            />
                            <div className="mt-0.5 flex gap-0.5">
                              {[70, 85, 100].map((quick) => (
                                <button
                                  key={quick}
                                  type="button"
                                  onMouseDown={(e) => e.preventDefault()}
                                  onClick={() => handleSaveScore(quick)}
                                  className="text-[8px] px-1 bg-slate-100 hover:bg-[#537BAC] hover:text-white rounded-xs font-semibold cursor-pointer"
                                >
                                  {quick}
                                </button>
                              ))}
                              <button
                                type="button"
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() => handleSaveScore()}
                                className="text-[8px] p-0.5 bg-[#689C63] text-white rounded-xs cursor-pointer"
                              >
                                <Check size={8} />
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleStartEdit(est.id, act.id, score)}
                            className={`inline-flex items-center justify-center min-w-8.5 px-1.5 py-0.5 rounded-sm text-[10px] transition-transform hover:scale-110 cursor-pointer ${getBadgeClass(
                              score
                            )}`}
                          >
                            {score !== null && score !== undefined ? score : '—'}
                          </button>
                        )}
                      </td>
                    );
                  })}

                  {/* Icono Destaca circular */}
                  <td className="p-1 border-r border-[#2E3330]/10 align-middle">
                    <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-[#689C63] text-white text-[8px]">
                      <Compass size={10} />
                    </span>
                  </td>

                  {/* 4 Columnas de competencias en vivo */}
                  {(['BC1', 'BC2', 'BC3', 'BC4'] as BCKey[]).map((bc) => {
                    const avg = calc ? calc[bc] : null;
                    const needsRec = avg !== null && avg < 70;

                    return (
                      <React.Fragment key={bc}>
                        <td
                          className={`p-1 border-r border-[#2E3330]/10 font-bold tabular-nums align-middle text-[10px] ${
                            needsRec ? 'text-[#DB5B48]' : 'text-[#2E3330]'
                          }`}
                        >
                          {avg !== null ? (
                            <span
                              className={`inline-block px-1.5 py-0.5 rounded-xs ${
                                needsRec ? 'bg-rose-100/80 font-black' : 'bg-slate-100/70'
                              }`}
                            >
                              {avg}
                            </span>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td className="p-0.5 border-r border-[#2E3330]/10 text-center align-middle bg-[#FCFAF6]">
                          {needsRec && (
                            <span
                              className="inline-flex items-center text-[#DB5B48]"
                              title="Requiere recuperación pedagógica (< 70)"
                            >
                              <AlertTriangle size={11} />
                            </span>
                          )}
                        </td>
                      </React.Fragment>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
