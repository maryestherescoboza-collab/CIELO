import { useMemo, useState, useRef, useEffect } from 'react';
import type { BCKey, Estudiante } from '../types';
import { supabase } from '../lib/supabase';
import { useAppStore } from '../store/appStore';
import { useNavigate } from 'react-router-dom';
import { useShallow } from 'zustand/react/shallow';
import { SmoothLineChart, StudentPopulationChart, DonutChart } from './DashboardCharts';
import PodiumExcelencia from '../components/dashboard/PodiumExcelencia';
import { TC_Flux } from '../components/icons/TerraCognitaIcons';
import { CieloPill } from '../components/ui/CieloPill';
import { CieloPopover } from '../components/ui/CieloPopover';
import { computeStudentGrades } from '../utils/boletines';
import { useGoogleDrive } from '../hooks/useGoogleDrive';
import { buildOriginalUrl } from '../lib/googleDrive';

function ThumbnailImage({
  driveFileId,
  imagenUrl,
  fetchDriveThumbnail,
  onClick,
}: {
  driveFileId?: string;
  imagenUrl: string;
  fetchDriveThumbnail: (fileId: string) => Promise<string | null>;
  onClick: () => void;
}) {
  const [src, setSrc] = useState(imagenUrl);
  const fetchedRef = useRef(false);

  useEffect(() => {
    if (!driveFileId || fetchedRef.current) return;
    fetchedRef.current = true;
    let revoked = false;
    fetchDriveThumbnail(driveFileId).then(blobUrl => {
      if (blobUrl && !revoked) setSrc(blobUrl);
    });
    return () => { revoked = true; };
  }, [driveFileId, fetchDriveThumbnail, imagenUrl]);

  return (
    <img
      src={src}
      alt="Thumbnail"
      loading="lazy"
      className="w-14 h-14 object-cover rounded-lg border border-(--border-soft) hover:scale-105 transition-transform cursor-pointer"
      onClick={onClick}
    />
  );
}

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
  const { state, session, setState } = useAppStore(useShallow(s => ({ state: s.state, session: s.session, setState: s.setAppState })));
  const navigate = useNavigate();
  const drive = useGoogleDrive();
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
  const [driveUploadError, setDriveUploadError] = useState('');
  const courseSelectRef = useRef<HTMLDivElement>(null);

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

    if (selectedFiles.length > 0 && !drive.isConnected) {
      setDriveUploadError('Debes conectar Google Drive para subir fotografías. Haz clic en "Conectar Google Drive" arriba.');
      return;
    }

    setIsSaving(true);
    setDriveUploadError('');
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

      if (selectedFiles.length > 0) {
        setOptimizationProgress('Subiendo a Google Drive...');
        const folderId = await drive.ensureCIELOFolder();

        for (const file of selectedFiles) {
          const { blob, ext } = await compressImage(file);
          const fileName = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${ext}`;
          const { fileId, thumbnailLink } = await drive.uploadImage(blob, fileName, folderId);
          await supabase.from('registro_imagenes').insert({
            registro_id: newRecordId,
            imagen_url: buildOriginalUrl('', fileId),
            drive_file_id: fileId,
            drive_thumbnail_url: thumbnailLink || '',
            storage_provider: 'google_drive'
          });
        }
      }

      setIsNewRecordOpen(false);
      setRecordTitle('');
      setRecordDesc('');
      setSelectedFiles([]);
      setImagePreviews([]);
      setImageWarning('');
    } catch (err: any) {
      console.error('Error saving record flow:', err);
      setDriveUploadError(`Error al subir: ${err.message || 'Error desconocido'}. Puede reintentar.`);
    } finally {
      setIsSaving(false);
      setOptimizationProgress('');
    }
  };

  const handleDeleteRecord = async (recordId: number) => {
    if (!confirm("¿Estás seguro de que deseas archivar este registro anecdótico?")) return;
    try {
      // Logical deactivation instead of physical delete
      const { error } = await supabase.from('registros_anecdoticos').update({ activo: false }).eq('id', recordId);
      if (error) {
        console.error("Error archiving record:", error);
        return;
      }
      // Update local state to remove from view
      setState(s => ({
        ...s,
        registrosAnecdoticos: s.registrosAnecdoticos.filter(r => r.id !== recordId)
      }));
    } catch (err) {
      console.error("Error in archive flow:", err);
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
            <h1 className="text-3xl font-black text-(--ink) tracking-tight mb-1.5 font-notion-title">
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


      {/* ═══ REGISTRO DEL CURSO SIDEBAR ═══ */}
      <div className="w-90 border-l border-(--border-soft) bg-white h-full hidden lg:flex flex-col shrink-0 shadow-sm">
        <div className="p-5 border-b border-(--border-soft)">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black text-(--ink) uppercase tracking-widest">
              Registro Anecdótico
            </h3>
            {selectedCursoId !== 'all' && (
              <div className="flex flex-col items-end gap-1">
                <CieloPill
                  as="button"
                  variant={courseRecords.length >= 5 ? 'disabled' : 'primary'}
                  onClick={() => {
                    setRecordDate(new Date().toISOString().split('T')[0]);
                    setRecordTitle('');
                    setRecordDesc('');
                    setSelectedFiles([]);
                    setImagePreviews([]);
                    setImageWarning('');
                    setDriveUploadError('');
                    setIsNewRecordOpen(true);
                  }}
                  disabled={courseRecords.length >= 5}
                  className="px-3 py-1.5 font-bold tracking-wider"
                >
                  + Nuevo Registro
                </CieloPill>
                {courseRecords.length >= 5 && (
                  <span className="text-xs text-red-500 font-bold uppercase tracking-wider text-right">Límite alcanzado (Máx 5)</span>
                )}
              </div>
            )}
          </div>

          {/* Google Drive Connection */}
          <div className="mt-3 flex items-center gap-2">
            {drive.isConnected ? (
              <div className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Drive conectado
                <span className="text-emerald-600 font-medium normal-case tracking-normal ml-0.5">{drive.email}</span>
                <button
                  onClick={drive.disconnect}
                  className="ml-1 text-emerald-500 hover:text-red-500 transition-colors cursor-pointer font-bold"
                  title="Desconectar Google Drive"
                >
                  ×
                </button>
              </div>
            ) : (
              <button
                onClick={drive.connect}
                disabled={drive.isConnecting}
                className="flex items-center gap-1.5 text-[10px] font-bold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-full border border-slate-200 hover:bg-slate-200 transition-all cursor-pointer disabled:opacity-50"
              >
                <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                {drive.isConnecting ? 'Conectando...' : 'Conectar Google Drive'}
              </button>
            )}
            {drive.error && (
              <span className="text-[9px] text-red-500 font-bold">{drive.error}</span>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5 scrollbar-hide flex flex-col gap-4">
          {courseRecords.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center h-full text-slate-400 py-10">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Sin acontecimientos</p>
              <p className="text-xs text-slate-400/80 mt-1 max-w-50">
                {selectedCursoId === 'all' 
                  ? 'Selecciona un curso específico arriba para poder añadir o ver registros.'
                  : 'Registra hechos relevantes del curso para mantener un historial visual.'
                }
              </p>
            </div>
          ) : (
            <>
              <div className="relative border-l border-(--border-soft) pl-4 flex flex-col gap-5 py-2">
                {courseRecords.slice(0, visibleCount).map(r => {
                  const images = state.registroImagenes?.filter(img => img.registroId === r.id) || [];
                  return (
                    <div key={r.id} className="relative">
                      {/* Timeline dot */}
                      <span className="absolute -left-5.25 top-1 w-2.5 h-2.5 rounded-full bg-(--primary) border-2 border-white ring-4 ring-(--primary)/10" />
                      
                      <div className="flex justify-between items-center gap-2 mb-0.5">
                        <div className="text-xs font-bold text-(--ink-soft) uppercase tracking-wider">{r.fecha}</div>
                        <button
                          onClick={() => handleDeleteRecord(r.id)}
                          className="text-xs font-bold text-(--danger) hover:underline uppercase tracking-wider cursor-pointer"
                        >
                          Eliminar
                        </button>
                      </div>
                      
                      <h4 className="text-xs font-black text-(--ink) uppercase tracking-tight mb-1 leading-snug">{r.titulo}</h4>
                      <p className="text-xs text-(--ink-soft) leading-relaxed mb-2 whitespace-pre-wrap">{r.descripcion}</p>
                      
                      {images.length > 0 && (
                        <div className="flex gap-1.5 overflow-x-auto py-1 scrollbar-hide">
                          {images.map(img => (
                            <ThumbnailImage
                              key={img.id}
                              driveFileId={img.driveFileId}
                              imagenUrl={img.imagenUrl}
                              fetchDriveThumbnail={drive.fetchDriveThumbnail}
                              onClick={() => {
                                window.open(buildOriginalUrl(img.imagenUrl, img.driveFileId), '_blank');
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
                <CieloPill
                  as="button"
                  variant="neutral"
                  onClick={() => setVisibleCount(prev => prev + 5)}
                  className="w-full py-2 mt-2"
                >
                  Cargar más registros
                </CieloPill>
              )}
            </>
          )}
        </div>
      </div>

      {/* ═══ NUEVO REGISTRO MODAL ═══ */}
      {isNewRecordOpen && (
        <div className="fixed inset-0 bg-(--ink)/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white border border-(--border-soft) rounded-(--radius-lg) shadow-md p-6 w-full max-w-md flex flex-col gap-4 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center pb-2 border-b border-(--border-soft)">
              <h3 className="text-xs font-black text-(--ink) uppercase tracking-widest">Nuevo Registro Anecdótico</h3>
              <button onClick={() => setIsNewRecordOpen(false)} className="text-(--ink-soft) hover:text-(--ink) text-sm font-bold cursor-pointer">×</button>
            </div>
            
            {optimizationProgress && (
              <div className="p-3 bg-(--primary)/10 border border-(--primary)/20 rounded-xl text-center">
                <span className="text-xs font-bold text-(--primary) uppercase tracking-widest animate-pulse">
                  {optimizationProgress}
                </span>
              </div>
            )}

            {driveUploadError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl">
                <p className="text-xs font-bold text-red-700 uppercase tracking-wider mb-1">Error de subida</p>
                <p className="text-xs text-red-600">{driveUploadError}</p>
              </div>
            )}

            <div className="flex flex-col gap-3.5">
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-(--ink-soft) mb-1">Fecha</label>
                <input
                  type="date"
                  value={recordDate}
                  onChange={(e) => setRecordDate(e.target.value)}
                  className="w-full h-11 px-4 rounded-xl border border-(--border-soft) bg-(--linen)/20 text-(--ink) text-xs font-medium outline-none focus:border-(--primary) focus:ring-2 focus:ring-(--primary)/20"
                  disabled={isSaving}
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-(--ink-soft) mb-1">Título</label>
                <input
                  type="text"
                  placeholder="Ej. Excursión al museo de ciencias"
                  value={recordTitle}
                  onChange={(e) => setRecordTitle(e.target.value)}
                  className="w-full h-11 px-4 rounded-xl border border-(--border-soft) bg-(--linen)/20 text-(--ink) text-xs font-medium outline-none focus:border-(--primary) focus:ring-2 focus:ring-(--primary)/20"
                  disabled={isSaving}
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-(--ink-soft) mb-1">Descripción</label>
                <textarea
                  rows={3}
                  placeholder="Escribe aquí los acontecimientos o detalles importantes..."
                  value={recordDesc}
                  onChange={(e) => setRecordDesc(e.target.value)}
                  className="w-full p-4 rounded-xl border border-(--border-soft) bg-(--linen)/20 text-(--ink) text-xs font-medium outline-none focus:border-(--primary) focus:ring-2 focus:ring-(--primary)/20 resize-none leading-relaxed"
                  disabled={isSaving}
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-(--ink-soft) mb-1">Imágenes (Máx 2)</label>
                {drive.isConnected ? (
                  <p className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-lg mb-1.5 border border-emerald-200">
                    Las imágenes se guardarán en tu Google Drive (carpeta CIELO/Registro anecdótico)
                  </p>
                ) : (
                  <p className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-1 rounded-lg mb-1.5 border border-amber-200">
                    Conecta Google Drive arriba para poder adjuntar fotografías
                  </p>
                )}
                <div className="flex items-center gap-2">
                  <label className={`h-10 px-4 flex items-center justify-center border rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                    selectedFiles.length >= 2 || isSaving
                      ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'
                      : 'bg-white hover:bg-(--linen)/30 border-(--border-soft) text-(--ink-soft) cursor-pointer shadow-sm'
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
                  <span className="text-xs text-(--ink-soft)">{selectedFiles.length}/2 seleccionadas</span>
                </div>
                
                {imageWarning && (
                  <p className="text-xs text-red-500 font-bold mt-1.5 uppercase tracking-wider">{imageWarning}</p>
                )}
                
                {imagePreviews.length > 0 && (
                  <div className="flex gap-2 overflow-x-auto mt-3 py-1 scrollbar-hide">
                    {imagePreviews.map((url, idx) => (
                      <div key={idx} className="relative shrink-0">
                        <img src={url} alt="Preview" className="w-16 h-16 object-cover rounded-lg border border-(--border-soft)" />
                        {!isSaving && (
                          <button
                            onClick={() => handleRemoveFile(idx)}
                            className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center text-xs font-bold shadow-md cursor-pointer"
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

            <div className="flex justify-end gap-2.5 pt-3 border-t border-(--border-soft)">
              <button
                onClick={() => setIsNewRecordOpen(false)}
                className="px-4 py-2 bg-white border border-(--border-soft) text-(--ink) text-xs font-bold uppercase tracking-wider rounded-full cursor-pointer transition-all hover:bg-(--linen)/20 shadow-sm"
                disabled={isSaving}
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveRecord}
                className="px-4 py-2 bg-(--primary) hover:opacity-90 active:scale-95 text-white text-xs font-bold uppercase tracking-wider rounded-full cursor-pointer transition-all flex items-center gap-1.5 shadow-sm"
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
