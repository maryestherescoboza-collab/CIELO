import { useMemo, useState, useRef, useEffect } from 'react';
import type { BCKey, Estudiante } from '../types';
import { supabase } from '../lib/supabase';
import { useAppStore } from '../store/appStore';
import { useNavigate } from 'react-router-dom';
import { useShallow } from 'zustand/react/shallow';
import { SmoothLineChart, StudentPopulationChart, DonutChart } from './DashboardCharts';
import { TC_Flux } from '../components/icons/TerraCognitaIcons';

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

  const [isNewRecordOpen, setIsNewRecordOpen] = useState(false);
  const [recordDate, setRecordDate] = useState('');
  const [recordTitle, setRecordTitle] = useState('');
  const [recordDesc, setRecordDesc] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [optimizationProgress, setOptimizationProgress] = useState('');
  const [imageWarning, setImageWarning] = useState('');
  const [visibleCount, setVisibleCount] = useState(5);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      if (selectedFiles.length + files.length > 2) {
        setImageWarning('Solo se permiten hasta 2 imágenes por registro.');
        const allowedCount = 2 - selectedFiles.length;
        if (allowedCount <= 0) return;
        const allowedFiles = files.slice(0, allowedCount);
        setSelectedFiles(prev => [...prev, ...allowedFiles]);
        const newPreviews = allowedFiles.map(file => URL.createObjectURL(file));
        setImagePreviews(prev => [...prev, ...newPreviews]);
      } else {
        setImageWarning('');
        setSelectedFiles(prev => [...prev, ...files]);
        const newPreviews = files.map(file => URL.createObjectURL(file));
        setImagePreviews(prev => [...prev, ...newPreviews]);
      }
    }
  };

  const handleRemoveFile = (idx: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== idx));
    setImagePreviews(prev => {
      URL.revokeObjectURL(prev[idx]);
      return prev.filter((_, i) => i !== idx);
    });
    setImageWarning('');
  };

  const compressImage = (file: File): Promise<{ blob: Blob; ext: string }> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          const MAX_SIZE = 1280;
          if (width > height) {
            if (width > MAX_SIZE) {
              height = Math.round((height * MAX_SIZE) / width);
              width = MAX_SIZE;
            }
          } else {
            if (height > MAX_SIZE) {
              width = Math.round((width * MAX_SIZE) / height);
              height = MAX_SIZE;
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          
          canvas.toBlob((blob) => {
            if (blob) {
              if (blob.type === 'image/webp') {
                resolve({ blob, ext: 'webp' });
              } else {
                canvas.toBlob((jpegBlob) => {
                  resolve({ blob: jpegBlob || file, ext: 'jpg' });
                }, 'image/jpeg', 0.78);
              }
            } else {
              resolve({ blob: file, ext: 'jpg' });
            }
          }, 'image/webp', 0.78);
        };
      };
    });
  };

  const handleSaveRecord = async () => {
    if (!session?.user?.id || !selectedCursoId || selectedCursoId === 'all') return;
    
    setIsSaving(true);
    setOptimizationProgress('Optimizando imágenes...');
 
    try {
      const { data: recData, error: recError } = await supabase
        .from('registros_anecdoticos')
        .insert({
          curso_id: Number(selectedCursoId),
          profile_id: session.user.id,
          fecha: recordDate,
          titulo: recordTitle,
          descripcion: recordDesc
        })
        .select();

      if (recError) {
        console.error('Error inserting record:', recError);
        setIsSaving(false);
        setOptimizationProgress('');
        return;
      }

      const newRecordId = recData[0].id;
      setOptimizationProgress('Subiendo imágenes...');

      const uploadPromises = selectedFiles.map(async (file) => {
        const { blob, ext } = await compressImage(file);
        const fileName = `${session.user.id}/${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${ext}`;
        const contentType = ext === 'webp' ? 'image/webp' : 'image/jpeg';
        
        const { error: uploadError } = await supabase.storage
          .from('registros')
          .upload(fileName, blob, { contentType });

        if (uploadError) {
          console.error('Error uploading file:', uploadError);
          return null;
        }

        const { data: urlData } = supabase.storage.from('registros').getPublicUrl(fileName);
        const publicUrl = urlData?.publicUrl;

        if (publicUrl) {
          await supabase.from('registro_imagenes').insert({
            registro_id: newRecordId,
            imagen_url: publicUrl
          });
        }
      });

      await Promise.all(uploadPromises);

      setIsNewRecordOpen(false);
      setRecordTitle('');
      setRecordDesc('');
      setSelectedFiles([]);
      setImagePreviews([]);
      setImageWarning('');
    } catch (err) {
      console.error('Error saving record flow:', err);
    } finally {
      setIsSaving(false);
      setOptimizationProgress('');
    }
  };

  const handleDeleteRecord = async (recordId: number) => {
    if (!confirm("¿Estás seguro de que deseas eliminar este registro anecdótico? Esta acción no se puede deshacer.")) return;
    try {
      const images = state.registroImagenes?.filter(img => img.registroId === recordId) || [];
      const storagePaths = images.map(img => {
        const parts = img.imagenUrl.split('/registros/');
        return parts.length > 1 ? parts[1] : null;
      }).filter(Boolean) as string[];

      const { error } = await supabase.from('registros_anecdoticos').delete().eq('id', recordId);
      if (error) {
        console.error("Error deleting record:", error);
        return;
      }

      if (storagePaths.length > 0) {
        await supabase.storage.from('registros').remove(storagePaths);
      }
    } catch (err) {
      console.error("Error in delete flow:", err);
    }
  };

  const courseRecords = useMemo(() => {
    if (selectedCursoId === 'all') {
      return state.registrosAnecdoticos || [];
    }
    const cid = Number(selectedCursoId);
    return (state.registrosAnecdoticos || []).filter(r => r.cursoId === cid);
  }, [state.registrosAnecdoticos, selectedCursoId]);




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
    return state.calificaciones.filter(c => validStudentIds.has(c.estudianteId));
  }, [state.calificaciones, filteredEstudiantes]);

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

  // ── Smooth Line Data (Rendimiento Acumulado) ──
  const smoothLineData = useMemo(() => {
    const sortedStudents = [...enhancedStudents].sort((a, b) => a.apellido.localeCompare(b.apellido));
    const globalAvg = sortedStudents.length > 0 
      ? Math.round(sortedStudents.reduce((acc, curr) => acc + (curr.computedAvg ?? 0), 0) / sortedStudents.length)
      : 0;

    return sortedStudents.map(est => {
      const score = est.computedAvg ?? 0;
      return {
        id: est.id,
        label: est.displayName,
        score,
        diff: score - globalAvg,
        status: score >= 70 ? 'Alto Rendimiento' : (score >= 60 ? 'Rendimiento Medio' : 'En Riesgo')
      };
    });
  }, [enhancedStudents]);

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
  }, [filteredEstudiantes, filteredCalificaciones]);

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
      { id: 'high', label: 'Alto Rendimiento', color: '#7A8D69', count: high, avg: high > 0 ? Math.round(highSum / high) : null, exact: (high / total) * 100 },
      { id: 'medium', label: 'Rendimiento Medio', color: '#BFC9A6', count: medium, avg: medium > 0 ? Math.round(mediumSum / medium) : null, exact: (medium / total) * 100 },
      { id: 'risk', label: 'En Riesgo', color: '#EB8847', count: risk, avg: risk > 0 ? Math.round(riskSum / risk) : null, exact: (risk / total) * 100 },
      { id: 'nodata', label: 'Sin Datos', color: '#B8CADC', count: noData, avg: null, exact: (noData / total) * 100 },
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
      { value: excelente, color: '#7A8D69', label: 'Excelente', range: '>90' },
      { value: bueno, color: '#BFC9A6', label: 'Bueno', range: '80-90' },
      { value: enDesarrollo, color: '#F5BC5D', label: 'En desarrollo', range: '70-80' },
      { value: requiereApoyo, color: '#EB8847', label: 'Requiere apoyo', range: '<70' }
    ];
  }, [filteredCalificaciones]);

  const lineChartDescription = useMemo(() => {
    const scores = smoothLineData.map(d => d.score);
    const count = scores.length;
    if (count === 0) {
      return 'No hay datos de rendimiento registrados para generar el análisis interpretativo.';
    }
    const promedio = Math.round(scores.reduce((a, b) => a + b, 0) / count);
    const minimo = Math.min(...scores);
    const maximo = Math.max(...scores);
    const meta = 70;
    const cumplimientoMeta = Math.round((scores.filter(s => s >= meta).length / count) * 100);

    let stdDev = 0;
    const mean = scores.reduce((a, b) => a + b, 0) / count;
    const variance = scores.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / count;
    stdDev = Math.sqrt(variance);
    const variabilidad = stdDev < 8 ? 'baja' : (stdDev < 18 ? 'moderada' : 'alta');

    let slope = 0;
    if (count > 1) {
      let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
      for (let i = 0; i < count; i++) {
        sumX += i;
        sumY += scores[i];
        sumXY += i * scores[i];
        sumXX += i * i;
      }
      slope = (count * sumXY - sumX * sumY) / (count * sumXX - sumX * sumX);
    }
    const tendencia = slope > 0.3 ? 'creciente' : (slope < -0.3 ? 'decreciente' : 'estable');

    return `El rendimiento acumulado registró un promedio de ${promedio}%, con valores comprendidos entre ${minimo}% y ${maximo}%. Durante el período analizado, el indicador permaneció por encima de la meta en ${cumplimientoMeta}% de los registros y presentó una variabilidad ${variabilidad}. La tendencia identificada fue ${tendencia}, describiendo el comportamiento del desempeño a lo largo del tiempo.`;
  }, [smoothLineData]);

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
    <div className="flex flex-1 h-full overflow-hidden bg-[#FDFBF7]">
      <div className="flex-1 overflow-y-auto px-6 py-6 md:px-10 scroll-smooth scrollbar-hide">

        {/* ═══ HEADER ═══ */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div>
            <h1 className="text-3xl font-black text-[#2E3330] tracking-tight mb-1.5 font-notion-title">
                Dashboard Analítico
            </h1>
            <p className="text-[10px] font-bold text-[#5F665E] uppercase tracking-widest">
                Bienvenido, <span className="text-[#7A8D69]">{docenteNombre.split(' ')[0]}</span> · {state.instituto || 'Instituto Central'}
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <div className="relative group" ref={dropdownRef}>
                <button
                    onClick={() => setIsSelectOpen(!isSelectOpen)}
                    className="flex items-center justify-between min-w-55 h-10 pl-5 pr-4 rounded-full bg-[#FDFBF7] border border-slate-300 text-[#2E3330] text-[10px] font-black uppercase tracking-widest shadow-sm outline-none focus-visible:border-[#7A8D69] focus-visible:ring-2 focus-visible:ring-[#7A8D69]/50 cursor-pointer transition-all hover:bg-[#FAF6F0] artisan-pill"
                >
                    <span className="truncate pr-4">
                        {selectedCursoId === 'all' ? 'Todos los Cursos' : (() => {
                            const cid = Number(selectedCursoId);
                            const c = state.cursos.find(c => c.id === cid);
                            return c ? `${c.grado} ${c.seccion} - ${c.nombre}` : 'Todos los Cursos';
                        })()}
                    </span>
                    <TC_Flux size={12} className={`text-slate-500 transition-transform duration-200 ${isSelectOpen ? '-rotate-90 text-[#7A8D69]' : 'rotate-90 group-hover:text-[#7A8D69]'}`} />
                </button>
                {isSelectOpen && (
                    <div className="absolute top-[calc(100%+6px)] left-0 w-full bg-[#FDFBF7] border border-slate-300 rounded-[20px] shadow-lg z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150 origin-top">
                        <div className="max-h-62.5 overflow-y-auto py-1.5 scrollbar-hide">
                            <button
                                onClick={() => { setSelectedCursoId('all'); setIsSelectOpen(false); }}
                                className={`w-full text-left px-5 py-2.5 text-[9px] font-black uppercase tracking-widest transition-colors ${selectedCursoId === 'all' ? 'bg-[#BFC9A6]/30 text-[#2E3330]' : 'text-[#5F665E] hover:bg-[#FAF6F0]'}`}
                            >
                                Todos los Cursos
                            </button>
                            {state.cursos.map(c => (
                                <button
                                    key={c.id}
                                    onClick={() => { setSelectedCursoId(String(c.id)); setIsSelectOpen(false); }}
                                    className={`w-full text-left px-5 py-2.5 text-[9px] font-black uppercase tracking-widest transition-colors ${selectedCursoId === String(c.id) ? 'bg-[#BFC9A6]/30 text-[#2E3330]' : 'text-[#5F665E] hover:bg-[#FAF6F0]'}`}
                                >
                                    {c.grado} {c.seccion} - {c.nombre}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>
            
            <button
                onClick={() => navigate('/')}
                className="h-10 px-6 rounded-full bg-[#FDFBF7] border border-slate-300 text-[#2E3330] text-[10px] font-black uppercase tracking-widest shadow-sm hover:bg-[#FAF6F0] hover:border-slate-350 transition-all outline-none focus-visible:ring-2 focus-visible:ring-[#7A8D69]/50 flex items-center justify-center gap-1.5 artisan-pill"
            >
                ← Inicio
            </button>
          </div>
        </div>

        {/* ═══ 4 PODIUMS BY PERIOD (TOP 10 ROWS - MIMETIZED & MINIMALIST) ═══ */}
        {podiumsByPeriod.some(p => p.top10.length > 0) && (
          <div className="mb-4 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-100 fill-mode-both">
            <div className="mb-2">
              <h3 className="text-[10px] font-black text-[#2E3330] uppercase tracking-[0.25em]">
                  Podium de excelencia
              </h3>
              <p className="text-[9px] font-bold text-[#5F665E] uppercase tracking-widest mt-0.5">
                  Top 10 de estudiantes con mejor promedio por período
              </p>
            </div>
            
            <div className="flex flex-col gap-2.5">
              {podiumsByPeriod
                .filter(podium => podium.top10.length > 0)
                .map((podium, pIdx) => {
                  const periodNum = podium.periodo.replace(/^\D+/g, '') || String(pIdx + 1);
                  return (
                    <div key={podium.periodo} className="flex items-center gap-3 py-1.5 border-b border-[rgba(46,51,48,0.08)] last:border-b-0">
                      {/* Period Label */}
                      <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#EAE4DA]/50 border border-[rgba(46,51,48,0.08)] text-[#2E3330] font-black text-[10px] shrink-0 shadow-sm">
                        <span>P{periodNum}</span>
                      </div>

                      {/* Top 10 List */}
                      <div className="flex-1 flex gap-2.5 overflow-x-auto pb-1 scrollbar-hide">
                        {podium.top10.map((est, index) => {
                          const rank = index + 1;
                          
                          // Border color/thickness & size classes based on ranking hierarchy
                          let avatarStyle = "rounded-full flex items-center justify-center text-white font-black shadow-sm shrink-0 ";
                          let avatarBorderColor = {};
                          
                          if (rank === 1) {
                            avatarStyle += "w-8.5 h-8.5 text-[10px] border-[2.5px]";
                            avatarBorderColor = { borderColor: '#F5BC5D' };
                          } else if (rank === 2) {
                            avatarStyle += "w-7.5 h-7.5 text-[9px] border-[2px]";
                            avatarBorderColor = { borderColor: '#B8CADC' };
                          } else if (rank === 3) {
                            avatarStyle += "w-7.5 h-7.5 text-[9px] border-[2px]";
                            avatarBorderColor = { borderColor: '#EB8847' };
                          } else {
                            avatarStyle += "w-7.5 h-7.5 text-[9px] border border-[rgba(46,51,48,0.08)]";
                          }

                          return (
                            <div
                              key={est.id}
                              onClick={() => navigate(`/estudiante/${est.id}`)}
                              className="flex items-center gap-2 hover:bg-[#FAF6F0]/40 active:scale-98 transition-all cursor-pointer rounded-xl py-1 px-2.5 shrink-0"
                            >
                              {/* Position indicator */}
                              <span className="text-[10px] font-black text-[#5F665E] shrink-0 min-w-4 text-center">
                                {rank}
                              </span>

                              {/* Avatar with styled border */}
                              <div
                                  className={avatarStyle}
                                  style={{ backgroundColor: est.avatarColor, ...avatarBorderColor }}
                              >
                                {est.nombre[0]}{est.apellido[0]}
                              </div>

                              {/* Details */}
                              <div className="flex flex-col min-w-0">
                                <span className="text-[10px] font-bold text-[#2E3330] truncate leading-tight">
                                  {est.nombre} {est.apellido}
                                </span>
                                <span className="text-[9px] font-black text-[#7A8D69] mt-0.5">
                                  {est.periodAvg}%
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {/* ═══ CHARTS SECTION ═══ */}
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 mb-6 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-200 fill-mode-both">
          {/* ═══ SMOOTH LINE CHART ═══ */}
          <div className="flex flex-col xl:col-span-2">
            <div className="flex items-center justify-between mb-3">
                <h3 className="text-[10px] font-black text-[#2E3330] uppercase tracking-[0.25em]">Promedio de calificaciones</h3>
            </div>
            <div className="bg-[#FDFBF7] border border-[rgba(46,51,48,0.08)] rounded-[20px] shadow-sm p-5 min-h-95 flex flex-col justify-between">
              <div className="flex-1 flex items-center justify-center">
                <SmoothLineChart data={smoothLineData} height={220} />
              </div>
              <div className="mt-4 p-3 bg-[#EAE4DA]/20 border border-[rgba(46,51,48,0.08)] rounded-xl text-[10px] text-[#5F665E] font-medium leading-relaxed">
                {lineChartDescription}
              </div>
            </div>
          </div>

          {/* ═══ STUDENT POPULATION (WAFFLE) ═══ */}
          <div className="flex flex-col xl:col-span-1">
            <div className="flex items-center justify-between mb-1.5">
                <h3 className="text-[10px] font-black text-[#2E3330] uppercase tracking-[0.25em]">Distribución Poblacional</h3>
            </div>
            <div className="bg-[#FDFBF7] border border-[rgba(46,51,48,0.08)] rounded-[20px] shadow-sm p-4 min-h-80 flex flex-col justify-between relative overflow-hidden group">
              <div className="flex-1 flex flex-col justify-center">
                <StudentPopulationChart categories={populationData} />
                <div className="flex gap-3 justify-center mt-2.5 flex-wrap">
                  {populationData.map(c => (
                    <div key={c.id} className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-[#5F665E]">
                      <span className="w-2 h-2 rounded-full shadow-sm" style={{ background: c.color }} />
                      {c.label} <span className="text-slate-400">({c.percentage}%)</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="mt-3 p-3 bg-[#EAE4DA]/20 border border-[rgba(46,51,48,0.08)] rounded-xl text-[10px] text-[#5F665E] font-medium leading-relaxed">
                {populationChartDescription}
              </div>
            </div>
          </div>

          {/* ═══ DONUT CHART ═══ */}
          <div className="flex flex-col xl:col-span-1">
            <div className="flex items-center justify-between mb-1.5">
                <h3 className="text-[10px] font-black text-[#2E3330] uppercase tracking-[0.25em]">Distribución del rendimiento académico</h3>
            </div>
            <div className="bg-[#FDFBF7] border border-[rgba(46,51,48,0.08)] rounded-[20px] shadow-sm p-4 min-h-80 flex flex-col justify-between relative overflow-hidden group">
              <div className="flex-1 flex flex-col justify-center">
                <DonutChart segments={donutData} />
              </div>
              <div className="mt-3 p-3 bg-[#EAE4DA]/20 border border-[rgba(46,51,48,0.08)] rounded-xl text-[10px] text-[#5F665E] font-medium leading-relaxed">
                Distribución porcentual de las actividades evaluadas según los niveles de desempeño alcanzados. Permite identificar la concentración de
              </div>
            </div>
          </div>
        </div>


      {/* ═══ REGISTRO DEL CURSO SIDEBAR ═══ */}
      <div className="w-90 border-l border-[rgba(46,51,48,0.08)] bg-[#FDFBF7] h-full hidden lg:flex flex-col shrink-0 shadow-sm">
        <div className="p-5 border-b border-[rgba(46,51,48,0.08)] flex items-center justify-between">
          <h3 className="text-xs font-black text-[#2E3330] uppercase tracking-widest">
            Registro Anecdótico
          </h3>
          {selectedCursoId !== 'all' && (
            <div className="flex flex-col items-end gap-1">
              <button
                onClick={() => {
                  setRecordDate(new Date().toISOString().split('T')[0]);
                  setRecordTitle('');
                  setRecordDesc('');
                  setSelectedFiles([]);
                  setImagePreviews([]);
                  setImageWarning('');
                  setIsNewRecordOpen(true);
                }}
                disabled={courseRecords.length >= 5}
                className={`px-3 py-1.5 text-white text-[10px] font-bold uppercase tracking-wider rounded-full transition-all artisan-pill ${
                  courseRecords.length >= 5
                    ? 'bg-slate-350 cursor-not-allowed'
                    : 'bg-[#7A8D69] hover:bg-[#6C7E5C] active:scale-95 cursor-pointer'
                }`}
              >
                + Nuevo Registro
              </button>
              {courseRecords.length >= 5 && (
                <span className="text-[8px] text-red-500 font-bold uppercase tracking-wider text-right">Límite alcanzado (Máx 5)</span>
              )}
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-5 scrollbar-hide flex flex-col gap-4">
          {courseRecords.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center h-full text-slate-400 py-10">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Sin acontecimientos</p>
              <p className="text-[10px] text-slate-400/80 mt-1 max-w-50">
                {selectedCursoId === 'all' 
                  ? 'Selecciona un curso específico arriba para poder añadir o ver registros.'
                  : 'Registra hechos relevantes del curso para mantener un historial visual.'
                }
              </p>
            </div>
          ) : (
            <>
              <div className="relative border-l border-slate-100 pl-4 flex flex-col gap-5 py-2">
                {courseRecords.slice(0, visibleCount).map(r => {
                  const images = state.registroImagenes?.filter(img => img.registroId === r.id) || [];
                  return (
                    <div key={r.id} className="relative">
                      {/* Timeline dot */}
                      <span className="absolute -left-5.25 top-1 w-2.5 h-2.5 rounded-full bg-[#7A8D69] border-2 border-white ring-4 ring-[#7A8D69]/10" />
                      
                      <div className="flex justify-between items-center gap-2 mb-0.5">
                        <div className="text-[9px] font-bold text-[#5F665E] uppercase tracking-wider">{r.fecha}</div>
                        <button
                          onClick={() => handleDeleteRecord(r.id)}
                          className="text-[9px] font-bold text-[#EB8847] hover:text-[#B87449] uppercase tracking-wider cursor-pointer"
                        >
                          Eliminar
                        </button>
                      </div>
                      
                      <h4 className="text-xs font-black text-[#2E3330] uppercase tracking-tight mb-1 leading-snug">{r.titulo}</h4>
                      <p className="text-[10px] text-[#5F665E] leading-relaxed mb-2 whitespace-pre-wrap">{r.descripcion}</p>
                      
                      {images.length > 0 && (
                        <div className="flex gap-1.5 overflow-x-auto py-1 scrollbar-hide">
                          {images.map(img => (
                            <img
                              key={img.id}
                              src={img.imagenUrl}
                              alt="Thumbnail"
                              loading="lazy"
                              className="w-14 h-14 object-cover rounded-lg border border-[rgba(46,51,48,0.08)] hover:scale-105 transition-transform cursor-pointer"
                              onClick={() => {
                                window.open(img.imagenUrl, '_blank');
                              }}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              
              {courseRecords.length > visibleCount && (
                <button
                  onClick={() => setVisibleCount(prev => prev + 5)}
                  className="w-full py-2 bg-[#FDFBF7] border border-slate-350 hover:bg-[#FAF6F0] text-[#2E3330] text-[10px] font-bold uppercase tracking-wider rounded-full transition-all cursor-pointer mt-2 artisan-pill"
                >
                  Cargar más registros
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* ═══ NUEVO REGISTRO MODAL ═══ */}
      {isNewRecordOpen && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-[#FDFBF7] border border-[rgba(46,51,48,0.08)] rounded-[20px] shadow-sm p-6 w-full max-w-md flex flex-col gap-4 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center pb-2 border-b border-[rgba(46,51,48,0.08)]">
              <h3 className="text-xs font-black text-[#2E3330] uppercase tracking-widest">Nuevo Registro Anecdótico</h3>
              <button onClick={() => setIsNewRecordOpen(false)} className="text-slate-400 hover:text-slate-600 text-sm font-bold cursor-pointer">×</button>
            </div>
            
            {optimizationProgress && (
              <div className="p-3 bg-[#7A8D69]/5 border border-[#7A8D69]/10 rounded-xl text-center">
                <span className="text-[10px] font-bold text-[#7A8D69] uppercase tracking-widest animate-pulse">
                  {optimizationProgress}
                </span>
              </div>
            )}

            <div className="flex flex-col gap-3.5">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-[#5F665E] mb-1">Fecha</label>
                <input
                  type="date"
                  value={recordDate}
                  onChange={(e) => setRecordDate(e.target.value)}
                  className="w-full h-11 px-4 rounded-xl border border-slate-300 bg-[#F9F8F6] text-[#2E3330] text-xs font-medium outline-none focus:border-[#7A8D69] focus:ring-2 focus:ring-[#7A8D69]/20"
                  disabled={isSaving}
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-[#5F665E] mb-1">Título</label>
                <input
                  type="text"
                  placeholder="Ej. Excursión al museo de ciencias"
                  value={recordTitle}
                  onChange={(e) => setRecordTitle(e.target.value)}
                  className="w-full h-11 px-4 rounded-xl border border-slate-300 bg-[#F9F8F6] text-[#2E3330] text-xs font-medium outline-none focus:border-[#7A8D69] focus:ring-2 focus:ring-[#7A8D69]/20"
                  disabled={isSaving}
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-[#5F665E] mb-1">Descripción</label>
                <textarea
                  rows={3}
                  placeholder="Escribe aquí los acontecimientos o detalles importantes..."
                  value={recordDesc}
                  onChange={(e) => setRecordDesc(e.target.value)}
                  className="w-full p-4 rounded-xl border border-slate-300 bg-[#F9F8F6] text-[#2E3330] text-xs font-medium outline-none focus:border-[#7A8D69] focus:ring-2 focus:ring-[#7A8D69]/20 resize-none leading-relaxed"
                  disabled={isSaving}
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-[#5F665E] mb-1">Imágenes (Máx 2)</label>
                <div className="flex items-center gap-2">
                  <label className={`h-10 px-4 flex items-center justify-center border rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${
                    selectedFiles.length >= 2 || isSaving
                      ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'
                      : 'bg-[#FDFBF7] hover:bg-[#FAF6F0] border-slate-300 text-slate-500 cursor-pointer'
                  }`}>
                    Seleccionar Fotos
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      className="hidden"
                      onChange={handleFileChange}
                      disabled={selectedFiles.length >= 2 || isSaving}
                    />
                  </label>
                  <span className="text-[10px] text-slate-400">{selectedFiles.length}/2 seleccionadas</span>
                </div>
                
                {imageWarning && (
                  <p className="text-[9px] text-red-500 font-bold mt-1.5 uppercase tracking-wider">{imageWarning}</p>
                )}
                
                {imagePreviews.length > 0 && (
                  <div className="flex gap-2 overflow-x-auto mt-3 py-1 scrollbar-hide">
                    {imagePreviews.map((url, idx) => (
                      <div key={idx} className="relative shrink-0">
                        <img src={url} alt="Preview" className="w-16 h-16 object-cover rounded-lg border border-[rgba(46,51,48,0.08)]" />
                        {!isSaving && (
                          <button
                            onClick={() => handleRemoveFile(idx)}
                            className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center text-[8px] font-bold shadow-md cursor-pointer"
                          >
                            ×
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-2.5 pt-3 border-t border-[rgba(46,51,48,0.08)]">
              <button
                onClick={() => setIsNewRecordOpen(false)}
                className="px-4 py-2 bg-[#FDFBF7] border border-slate-300 text-[#2E3330] text-[10px] font-bold uppercase tracking-wider rounded-full cursor-pointer transition-all hover:bg-[#FAF6F0]"
                disabled={isSaving}
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveRecord}
                className="px-4 py-2 bg-[#7A8D69] hover:bg-[#6C7E5C] active:scale-95 text-white text-[10px] font-bold uppercase tracking-wider rounded-full cursor-pointer transition-all flex items-center gap-1.5"
                disabled={isSaving || !recordTitle.trim() || !recordDate}
              >
                {isSaving ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  </div>
);
}
