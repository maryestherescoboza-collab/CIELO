import { useMemo, useState, useRef, useEffect } from 'react';
import type { BCKey, Estudiante } from '../types';
import { useAppStore } from '../store/appStore';
import { useNavigate } from 'react-router-dom';
import { useShallow } from 'zustand/react/shallow';
import { SmoothLineChart, StudentPopulationChart, DonutChart } from './DashboardCharts';
import PodiumExcelencia from '../components/dashboard/PodiumExcelencia';
import { TC_Flux } from '../components/icons/TerraCognitaIcons';
import { CieloPill } from '../components/ui/CieloPill';
import { CieloPopover } from '../components/ui/CieloPopover';
import { computeStudentGrades } from '../utils/boletines';

interface EnhancedStudent extends Estudiante {
  computedAvg: number | null;
  bestBc: BCKey | null;
  cursoLabel: string;
  displayName: string;
}

interface Props {
  docenteNombre: string;
}

export default function Dashboard({ docenteNombre }: Props) {
  const { state, session } = useAppStore(useShallow(s => ({ state: s.state, session: s.session })));
  const navigate = useNavigate();
  const [selectedCursoId, setSelectedCursoId] = useState<string>(
    state.cursos.length > 0 ? String(state.cursos[0].id) : 'all'
  );

  const courseSelectRef = useRef<HTMLDivElement>(null);

  const [isSelectOpen, setIsSelectOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
          if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
              setIsSelectOpen(false);
          }
      };
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredEstudiantes = useMemo(() => {
    if (selectedCursoId === 'all') return state.estudiantes;
    const cid = Number(selectedCursoId);
    return state.estudiantes.filter(e => e.cursoId === cid);
  }, [state.estudiantes, selectedCursoId]);

  const filteredCalificaciones = useMemo(() => {
    const validStudentIds = new Set(filteredEstudiantes.map(e => e.id));
    return state.calificaciones.filter(c => validStudentIds.has(c.estudianteId) && c.userId === session?.user?.id);
  }, [state.calificaciones, filteredEstudiantes, session?.user?.id]);

  // Contexto institucional del docente: garantiza que el cálculo de boletines
  // (computeStudentGrades) no arrastre actividades/calificaciones de otro centro.
  const centroContexto = useMemo(
    () => state.centroRolActual?.centro_id || state.perfiles.find(p => p.userId === session?.user?.id)?.centro_id || null,
    [state.centroRolActual, state.perfiles, session?.user?.id]
  );

  // ── Optimized: Pre-grouped grades by student for O(1) lookup ──
  const gradesByStudent = useMemo(() => {
    const group = new Map<number, any[]>();
    filteredCalificaciones.forEach(c => {
      if (!group.has(c.estudianteId)) group.set(c.estudianteId, []);
      group.get(c.estudianteId)?.push(c);
    });
    return group;
  }, [filteredCalificaciones]);

  // ── Optimized: Pre-grouped grades by student AND period ──
  const gradesByStudentAndPeriod = useMemo(() => {
    const group = new Map<string, any[]>();
    filteredCalificaciones.forEach(c => {
      const key = `${c.estudianteId}-${c.periodo}`;
      if (!group.has(key)) group.set(key, []);
      group.get(key)?.push(c);
    });
    return group;
  }, [filteredCalificaciones]);

  // ── Computed: Enhanced students with real averages ──
  const enhancedStudents = useMemo<EnhancedStudent[]>(() => {
    return filteredEstudiantes.map((est: Estudiante) => {
      const studentCalifs = gradesByStudent.get(est.id) || [];
      const califs = studentCalifs.filter(c => c.puntaje !== null);
      const avg = califs.length > 0
        ? Math.round(califs.reduce((s: number, c: any) => s + (c.puntaje as number), 0) / califs.length)
        : est.puntaje;

      // Best BC
      const bcKeys: BCKey[] = ['BC1', 'BC2', 'BC3', 'BC4'];
      let bestBc: BCKey | null = null;
      let bestVal = 0;
      for (const bc of bcKeys) {
        const val = est[bc.toLowerCase() as 'bc1' | 'bc2' | 'bc3' | 'bc4'];
        if (val && val.puntaje > bestVal) {
          bestVal = val.puntaje;
          bestBc = bc;
        }
      }

      const curso = state.cursos.find(c => c.id === est.cursoId);
      return {
        ...est,
        computedAvg: avg,
        bestBc,
        cursoLabel: curso ? `${curso.grado} ${curso.seccion}` : '',
        displayName: `${est.nombre} ${est.apellido}`,
      };
    });
  }, [filteredEstudiantes, filteredCalificaciones, state.cursos]);

  // ── Smooth Line Data (Rendimiento Acumulado Multi-Serie por BC) ──
  const multiLineData = useMemo(() => {
    // Agrupamos estudiantes por curso para usar computeStudentGrades correctamente
    const studentsByCourse = new Map<number, Estudiante[]>();
    enhancedStudents.forEach(est => {
      if (!studentsByCourse.has(est.cursoId)) studentsByCourse.set(est.cursoId, []);
      studentsByCourse.get(est.cursoId)?.push(est);
    });

    const globalGradesByStudent = new Map<number, Record<string, any>>();

    for (const [cursoId, students] of studentsByCourse.entries()) {
      const curso = state.cursos.find(c => c.id === cursoId);
      // Reutiliza la función del sistema que calcula con exactitud incluyendo recuperaciones
      const grades = computeStudentGrades(students, state, cursoId, curso, centroContexto);

      students.forEach(est => {
        const subjectsGrades = grades[est.id];
        if (!subjectsGrades) return;
        
        // Extraemos los PC1, PC2, PC3, PC4 de todos los períodos para todas las asignaturas
        const bcs: BCKey[] = ['BC1', 'BC2', 'BC3', 'BC4'];
        const bcValues: Record<BCKey, number[]> = { BC1: [], BC2: [], BC3: [], BC4: [] };

        Object.values(subjectsGrades).forEach(asigGrades => {
          ['P1', 'P2', 'P3', 'P4'].forEach(p => {
            const periodData = asigGrades[p as 'P1' | 'P2' | 'P3' | 'P4'];
            if (periodData) {
              bcs.forEach(bc => {
                if (periodData[bc] !== null && periodData[bc] !== undefined) {
                  bcValues[bc].push(periodData[bc] as number);
                }
              });
            }
          });
        });

        const avg = (arr: number[]) => arr.length > 0 ? Math.round(arr.reduce((acc, val) => acc + val, 0) / arr.length) : null;

        globalGradesByStudent.set(est.id, {
          bc1: avg(bcValues.BC1),
          bc2: avg(bcValues.BC2),
          bc3: avg(bcValues.BC3),
          bc4: avg(bcValues.BC4)
        });
      });
    }

    const sortedStudents = [...enhancedStudents].sort((a, b) => a.apellido.localeCompare(b.apellido));

    return sortedStudents.map(est => {
      const g = globalGradesByStudent.get(est.id) || { bc1: null, bc2: null, bc3: null, bc4: null };
      const shortName = est.nombre.split(' ')[0] + ' ' + (est.apellido.charAt(0) + '.');
      return {
        id: est.id,
        label: shortName,
        fullName: est.displayName,
        bc1: g.bc1,
        bc2: g.bc2,
        bc3: g.bc3,
        bc4: g.bc4
      };
    });
  }, [enhancedStudents, state, centroContexto]);

  // ── 4 Podiums by Period ──
  const podiumsByPeriod = useMemo(() => {
    const periodsSet = new Set(filteredCalificaciones.map(c => c.periodo).filter(Boolean));
    let periods = Array.from(periodsSet).sort();
    if (periods.length === 0) {
      periods = ['Período 1', 'Período 2', 'Período 3', 'Período 4'];
    } else if (periods.length > 4) {
      periods = periods.slice(0, 4);
    }
    
    while (periods.length < 4) {
      periods.push(`Período ${periods.length + 1}`);
    }

    return periods.map(periodo => {
      const studentsAvg = filteredEstudiantes.map(est => {
        const studentPeriodCalifs = gradesByStudentAndPeriod.get(`${est.id}-${periodo}`) || [];
        const califs = studentPeriodCalifs.filter(c => c.puntaje !== null);
        const avg = califs.length > 0
          ? Math.round(califs.reduce((s: number, c: any) => s + (c.puntaje as number), 0) / califs.length)
          : null;
        return {
          ...est,
          periodAvg: avg,
          displayName: `${est.nombre} ${est.apellido}`,
        };
      }).filter(est => est.periodAvg !== null);
      
      const top10 = studentsAvg.sort((a, b) => (b.periodAvg as number) - (a.periodAvg as number)).slice(0, 10);
      return {
        periodo,
        top10
      };
    });
  }, [filteredEstudiantes, filteredCalificaciones, gradesByStudentAndPeriod]);

  // ── Population Chart Data ──
  const populationData = useMemo(() => {
    let high = 0, medium = 0, risk = 0, noData = 0;
    let highSum = 0, mediumSum = 0, riskSum = 0;

    enhancedStudents.forEach(est => {
      if (est.computedAvg === null || est.computedAvg === undefined) {
        noData++;
      } else if (est.computedAvg >= 80) {
        high++;
        highSum += est.computedAvg;
      } else if (est.computedAvg >= 60) {
        medium++;
        mediumSum += est.computedAvg;
      } else {
        risk++;
        riskSum += est.computedAvg;
      }
    });

    const total = enhancedStudents.length || 1;
    
    // Largest Remainder Method for exactly 100 percentages
    const raw = [
      { id: 'high', label: 'Alto Rendimiento', color: 'var(--success)', count: high, avg: high > 0 ? Math.round(highSum / high) : null, exact: (high / total) * 100 },
      { id: 'medium', label: 'Rendimiento Medio', color: 'var(--primary)', count: medium, avg: medium > 0 ? Math.round(mediumSum / medium) : null, exact: (medium / total) * 100 },
      { id: 'risk', label: 'En Riesgo', color: 'var(--danger)', count: risk, avg: risk > 0 ? Math.round(riskSum / risk) : null, exact: (risk / total) * 100 },
      { id: 'nodata', label: 'Sin Datos', color: 'var(--sicilian-sky)', count: noData, avg: null, exact: (noData / total) * 100 },
    ];

    const items = raw.map(r => ({ ...r, floored: Math.floor(r.exact), remainder: r.exact - Math.floor(r.exact) }));
    let sumFloored = items.reduce((s, r) => s + r.floored, 0);
    items.sort((a, b) => b.remainder - a.remainder);
    let i = 0;
    while (sumFloored < 100 && i < items.length) {
      if (items[i].count > 0 || (total === 1 && enhancedStudents.length === 0)) { 
         items[i].floored++;
         sumFloored++;
      }
      i++;
    }

    if (enhancedStudents.length === 0) {
      return items.map(r => ({
        id: r.id,
        label: r.label,
        color: r.color,
        count: 0,
        percentage: 0,
        avgScore: null
      }));
    }

    return items.map(r => ({
      id: r.id,
      label: r.label,
      color: r.color,
      count: r.count,
      percentage: r.floored,
      avgScore: r.avg
    })).sort((a, b) => {
      const order: Record<string, number> = { high: 0, medium: 1, risk: 2, nodata: 3 };
      return order[a.id] - order[b.id];
    });

  }, [enhancedStudents]);

  // ── Donut Chart Data (Distribución del rendimiento académico) ──
  const donutData = useMemo(() => {
    let excelente = 0, bueno = 0, enDesarrollo = 0, requiereApoyo = 0;
    
    filteredCalificaciones.forEach(c => {
      if (c.puntaje !== null && c.puntaje !== undefined) {
        if (c.puntaje > 90) excelente++;
        else if (c.puntaje >= 80) bueno++;
        else if (c.puntaje >= 70) enDesarrollo++;
        else requiereApoyo++;
      }
    });

    return [
      { value: excelente, color: 'var(--herb-garden)', label: 'Excelente', range: '>90' },
      { value: bueno, color: 'var(--calendula)', label: 'Bueno', range: '80-90' },
      { value: enDesarrollo, color: 'var(--clementine)', label: 'En desarrollo', range: '70-80' },
      { value: requiereApoyo, color: 'var(--terra-cotta)', label: 'Requiere apoyo', range: '<70' }
    ];
  }, [filteredCalificaciones]);

  const lineChartDescription = useMemo(() => {
    if (multiLineData.length === 0) {
      return 'No hay calificaciones registradas para calcular los promedios por competencia fundamental en este curso.';
    }
    return `La gráfica representa los Promedios de Competencia (PC1, PC2, PC3, PC4) de cada estudiante integrando todos los períodos disponibles. Los valores reflejan el promedio de las asignaturas evaluadas por el docente actual, permitiendo observar el desempeño comparativo global en cada competencia fundamental de manera individual.`;
  }, [multiLineData]);

  const populationChartDescription = useMemo(() => {
    const total = enhancedStudents.length;
    if (total === 0) {
      return 'No hay estudiantes registrados para generar la distribución poblacional.';
    }

    const high = populationData.find(c => c.id === 'high')?.percentage ?? 0;
    const medium = populationData.find(c => c.id === 'medium')?.percentage ?? 0;
    const risk = populationData.find(c => c.id === 'risk')?.percentage ?? 0;
    const sinDatos = populationData.find(c => c.id === 'nodata')?.percentage ?? 0;

    const validCats = populationData.filter(c => c.count > 0);
    let categoriaPredominante = 'Ninguna';
    let categoriaMenor = 'Ninguna';
    if (validCats.length > 0) {
      const sortedByCount = [...validCats].sort((a, b) => b.count - a.count);
      categoriaPredominante = sortedByCount[0].label;
      categoriaMenor = sortedByCount[sortedByCount.length - 1].label;
    }

    return `Se registraron ${total} estudiantes, distribuidos en ${high}% con alto rendimiento, ${medium}% con rendimiento medio, ${risk}% en riesgo y ${sinDatos}% sin datos. La categoría con mayor representación fue "${categoriaPredominante}", mientras que la menor correspondió a "${categoriaMenor}".`;
  }, [enhancedStudents, populationData]);


  return (
    <div className="flex flex-1 h-full overflow-hidden bg-(--background)">
      <div className="flex-1 overflow-y-auto px-6 py-6 md:px-10 scroll-smooth scrollbar-hide">

        {/* ═══ HEADER ═══ */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div>
            <h1 className="text-2xl font-black text-(--ink) tracking-tight mb-1.5 font-notion-title">
                Dashboard Analítico
            </h1>
            <p className="text-xs font-bold text-(--ink-soft) uppercase tracking-widest">
                Bienvenido, <span className="text-(--primary)">{docenteNombre.split(' ')[0]}</span> · {state.instituto || 'Instituto Central'}
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <div className="relative group" ref={dropdownRef}>
                <div className="relative" ref={courseSelectRef}>
                    <CieloPill
                        as="button"
                        variant="neutral"
                        onClick={() => setIsSelectOpen(!isSelectOpen)}
                        className="w-full min-w-55 justify-between px-5 h-10 border-transparent shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-black/50 group"
                        style={{ backgroundColor: 'var(--linen)', color: 'var(--ink)', borderColor: 'var(--border-soft)' }}
                    >
                        <span className="truncate pr-4">
                            {selectedCursoId === 'all' ? 'Todos los Cursos' : (() => {
                                const cid = Number(selectedCursoId);
                                const c = state.cursos.find(c => c.id === cid);
                                return c ? `${c.grado} ${c.seccion} - ${c.nombre}` : 'Todos los Cursos';
                            })()}
                        </span>
                        <TC_Flux size={12} className={`text-(--ink) transition-transform duration-200 ${isSelectOpen ? '-rotate-90 text-(--ink)' : 'rotate-90 group-hover:text-(--ink)'}`} />
                    </CieloPill>
                    
                    <CieloPopover 
                        isOpen={isSelectOpen} 
                        onClose={() => setIsSelectOpen(false)} 
                        triggerRef={courseSelectRef}
                        width="full"
                        position="bottom-left"
                        className="p-0!"
                    >
                        <div className="max-h-62.5 overflow-y-auto py-2 scrollbar-hide bg-white rounded-(--radius-sm)">
                            <button
                                onClick={() => { setSelectedCursoId('all'); setIsSelectOpen(false); }}
                                className={`w-full text-left px-5 py-2.5 text-xs font-black uppercase tracking-widest transition-colors ${selectedCursoId === 'all' ? 'bg-(--primary)/15 text-(--ink)' : 'text-(--ink-soft) hover:bg-(--linen)/45'}`}
                            >
                                Todos los Cursos
                            </button>
                            {state.cursos.map(c => (
                                <button
                                    key={c.id}
                                    onClick={() => { setSelectedCursoId(String(c.id)); setIsSelectOpen(false); }}
                                    className={`w-full text-left px-5 py-2.5 text-xs font-black uppercase tracking-widest transition-colors ${selectedCursoId === String(c.id) ? 'bg-(--primary)/15 text-(--ink)' : 'text-(--ink-soft) hover:bg-(--linen)/45'}`}
                                >
                                    {c.grado} {c.seccion} - {c.nombre}
                                </button>
                            ))}
                        </div>
                    </CieloPopover>
                </div>
            </div>
            
            <CieloPill
                as="button"
                variant="neutral"
                onClick={() => navigate('/')}
                className="h-10 px-6 border-(--border-soft) shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-(--primary)/50 gap-1.5"
            >
                ← Inicio
            </CieloPill>
          </div>
        </div>

        {/* ═══ PODIUM POR PERIODOS (P1, P2, P3, P4) ═══ */}
        <PodiumExcelencia periods={podiumsByPeriod} />

        {/* ═══ CHARTS SECTION ═══ */}
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 mb-6 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-200 fill-mode-both">
          {/* ═══ SMOOTH LINE CHART ═══ */}
          <div className="flex flex-col xl:col-span-2">
            <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-black text-(--ink) uppercase tracking-[0.25em]">Promedio de calificaciones</h3>
            </div>
            <div className="bg-white border border-(--border-soft) rounded-(--radius-md) shadow-sm p-5 min-h-95 flex flex-col justify-between">
              <div className="flex-1 flex items-center justify-center p-2 relative">
                <SmoothLineChart data={multiLineData} height={220} />
              </div>
              <div className="mt-4 p-3 bg-(--linen)/20 border border-(--border-soft) rounded-xl text-xs text-(--ink-soft) font-medium leading-relaxed">
                {lineChartDescription}
              </div>
            </div>
          </div>

          {/* ═══ STUDENT POPULATION (WAFFLE) ═══ */}
          <div className="flex flex-col xl:col-span-1">
            <div className="flex items-center justify-between mb-1.5">
                <h3 className="text-xs font-black text-(--ink) uppercase tracking-[0.25em]">Distribución Poblacional</h3>
            </div>
            <div className="bg-white border border-(--border-soft) rounded-(--radius-md) shadow-sm p-4 min-h-80 flex flex-col justify-between relative overflow-hidden group">
              <div className="flex-1 flex flex-col justify-center">
                <StudentPopulationChart categories={populationData} />
                <div className="flex gap-3 justify-center mt-2.5 flex-wrap">
                  {populationData.map(c => (
                    <div key={c.id} className="flex items-center gap-1.5 text-xs font-black uppercase tracking-widest text-(--ink-soft)">
                      <span className="w-2 h-2 rounded-full shadow-sm" style={{ background: c.color }} />
                      {c.label} <span className="text-(--ink-soft)/60">({c.percentage}%)</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="mt-3 p-3 bg-(--linen)/20 border border-(--border-soft) rounded-xl text-xs text-(--ink-soft) font-medium leading-relaxed">
                {populationChartDescription}
              </div>
            </div>
          </div>

          {/* ═══ DONUT CHART ═══ */}
          <div className="flex flex-col xl:col-span-1">
            <div className="flex items-center justify-between mb-1.5">
                <h3 className="text-xs font-black text-(--ink) uppercase tracking-[0.25em]">Distribución del rendimiento académico</h3>
            </div>
            <div className="bg-white border border-(--border-soft) rounded-(--radius-md) shadow-sm p-4 min-h-80 flex flex-col justify-between relative overflow-hidden group">
              <div className="flex-1 flex flex-col justify-center">
                <DonutChart segments={donutData} />
              </div>
              <div className="mt-3 p-3 bg-(--linen)/20 border border-(--border-soft) rounded-xl text-xs text-(--ink-soft) font-medium leading-relaxed">
                Distribución porcentual de las actividades evaluadas según los niveles de desempeño alcanzados. Permite identificar la concentración de
              </div>
            </div>
          </div>
        </div>
    </div>
  </div>
);
}
