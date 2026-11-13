import { useState, useEffect } from 'react';
import {
  UserCheck,
  FolderKanban,
  HelpCircle,
  ListChecks,
  Check,
  CheckCircle2,
  Send,
  Sparkles,
  FileText,
  Clock,
  Printer,
} from 'lucide-react';

interface AligeraTrabajoShowcaseProps {
  isActive?: boolean;
}

type PillarKey = 'asistencia' | 'portafolio' | 'quiz' | 'instrumentos';

export function AligeraTrabajoShowcase({ isActive = true }: AligeraTrabajoShowcaseProps) {
  const [activeTab, setActiveTab] = useState<PillarKey>('asistencia');
  const [autoPlay, setAutoPlay] = useState(true);

  // Estados interactivos para Asistencia
  const [attendance, setAttendance] = useState<Record<number, 'P' | 'T' | 'A'>>({
    1: 'P',
    2: 'P',
    3: 'P',
    4: 'A',
  });

  // Estados interactivos para Quiz
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isQuizSubmitted, setIsQuizSubmitted] = useState(false);

  // Auto-ciclo cada 6 segundos si no se ha interactuado
  useEffect(() => {
    if (!isActive || !autoPlay) return;

    const tabs: PillarKey[] = ['asistencia', 'portafolio', 'quiz', 'instrumentos'];
    const timer = setInterval(() => {
      setActiveTab((curr) => {
        const nextIndex = (tabs.indexOf(curr) + 1) % tabs.length;
        return tabs[nextIndex];
      });
    }, 6000);

    return () => clearInterval(timer);
  }, [isActive, autoPlay]);

  const handleTabClick = (tab: PillarKey) => {
    setAutoPlay(false);
    setActiveTab(tab);
  };

  const setStudentAttendance = (id: number, status: 'P' | 'T' | 'A') => {
    setAutoPlay(false);
    setAttendance((prev) => ({ ...prev, [id]: status }));
  };

  const handleQuizSubmit = (optIndex: number) => {
    setAutoPlay(false);
    setSelectedOption(optIndex);
    setIsQuizSubmitted(true);
  };

  // Cálculo dinámico de asistencia en vivo
  const totalStudents = Object.keys(attendance).length;
  const presentCount = Object.values(attendance).filter((s) => s === 'P' || s === 'T').length;
  const attendanceRate = Math.round((presentCount / totalStudents) * 100);

  return (
    <div className="w-full">
      {/* 4 Píldoras de navegación / selección de funciones con bordes rectos */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 mb-3">
        {[
          {
            key: 'asistencia' as PillarKey,
            icon: <UserCheck size={14} />,
            title: 'Realiza el pase de lista',
            color: '#689C63',
          },
          {
            key: 'portafolio' as PillarKey,
            icon: <FolderKanban size={14} />,
            title: 'Crea portafolio de evidencia',
            color: '#EB8847',
          },
          {
            key: 'quiz' as PillarKey,
            icon: <HelpCircle size={14} />,
            title: 'Envía quiz automatizados',
            color: '#537BAC',
          },
          {
            key: 'instrumentos' as PillarKey,
            icon: <ListChecks size={14} />,
            title: 'Crea instrumentos de evaluación',
            color: '#DEAE4D',
          },
        ].map((tab) => {
          const isSelected = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => handleTabClick(tab.key)}
              className={`p-1.5 sm:p-2.5 text-left border rounded-none transition-all cursor-pointer flex items-center gap-1.5 sm:gap-2 ${
                isSelected
                  ? 'border-[#2E3330] bg-[#FAF8F5] shadow-xs'
                  : 'border-[#2E3330]/15 bg-white hover:bg-slate-50 text-[#5F665E]'
              }`}
            >
              <span
                className="flex h-5 w-5 sm:h-6 sm:w-6 items-center justify-center rounded-none text-white shrink-0"
                style={{ backgroundColor: tab.color }}
              >
                {tab.icon}
              </span>
              <span className={`text-[10px] sm:text-xs font-bold leading-tight ${isSelected ? 'text-[#2E3330]' : 'text-[#5F665E]'}`}>
                {tab.title}
              </span>
            </button>
          );
        })}
      </div>

      {/* ========================================================================= */}
      {/* PANEL DE DEMOSTRACIÓN EN VIVO (BORDES RECTOS, SIN TARJETAS ANIDADAS)      */}
      {/* ========================================================================= */}
      <div className="border border-[#2E3330]/20 bg-white p-2.5 sm:p-4 shadow-sm rounded-none min-h-0 sm:min-h-90 flex flex-col justify-between">
        {/* =================================================================== */}
        {/* 1. REALIZA EL PASE DE LISTA                                         */}
        {/* =================================================================== */}
        {activeTab === 'asistencia' && (
          <div className="animate-in fade-in duration-200">
            <div className="flex flex-wrap items-center justify-between gap-1.5 sm:gap-2 border-b border-[#2E3330]/10 pb-1.5 sm:pb-2 mb-2 sm:mb-3">
              <div>
                <p className="font-cagliostro text-sm sm:text-lg font-normal text-[#2E3330]">
                  Pase de Lista Diario y Asistencia
                </p>
                <p className="text-[10px] sm:text-[11px] text-[#5F665E]">
                  Toca [P], [T] o [A] para registrar asistencia y calcular al instante.
                </p>
              </div>

              {/* Indicador de asistencia calculado en vivo */}
              <div className="flex items-center gap-2 bg-[#FAF8F5] border border-[#2E3330]/15 px-3 py-1 rounded-none">
                <span className="text-[11px] text-[#5F665E] font-medium">Asistencia hoy:</span>
                <span className="text-xs font-black text-[#689C63]">{attendanceRate}%</span>
                <span className="text-[10px] text-[#5F665E] font-mono">({presentCount}/{totalStudents})</span>
              </div>
            </div>

            {/* Lista de estudiantes interactiva */}
            <div className="space-y-1.5 mb-3">
              {[
                { id: 1, nombre: 'Ana Valentina Reyes', codigo: '730' },
                { id: 2, nombre: 'Adrián Acosta', codigo: '703' },
                { id: 3, nombre: 'Bianca Bravo', codigo: '690' },
                { id: 4, nombre: 'Héctor Manuel Santana', codigo: '0873' },
              ].map((est) => {
                const status = attendance[est.id];
                return (
                  <div
                    key={est.id}
                    className="flex items-center justify-between border border-[#2E3330]/10 bg-[#FAF8F5]/60 p-2 rounded-none hover:bg-[#FAF8F5] transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-[#5F665E]/60 w-4">{est.id}</span>
                      <div>
                        <p className="text-xs font-bold text-[#2E3330]">{est.nombre}</p>
                        <p className="text-[9px] text-[#5F665E] font-mono">ID: {est.codigo}</p>
                      </div>
                    </div>

                    {/* Botones de asistencia P, T, A */}
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setStudentAttendance(est.id, 'P')}
                        className={`h-7 w-7 text-xs font-black rounded-none cursor-pointer transition-transform ${
                          status === 'P'
                            ? 'bg-[#689C63] text-white shadow-xs scale-105 ring-1 ring-[#689C63]'
                            : 'bg-white border border-[#2E3330]/15 text-[#5F665E] hover:bg-slate-100'
                        }`}
                        title="Presente"
                      >
                        P
                      </button>
                      <button
                        type="button"
                        onClick={() => setStudentAttendance(est.id, 'T')}
                        className={`h-7 w-7 text-xs font-black rounded-none cursor-pointer transition-transform ${
                          status === 'T'
                            ? 'bg-[#DEAE4D] text-[#2E3330] shadow-xs scale-105 ring-1 ring-[#DEAE4D]'
                            : 'bg-white border border-[#2E3330]/15 text-[#5F665E] hover:bg-slate-100'
                        }`}
                        title="Tardanza"
                      >
                        T
                      </button>
                      <button
                        type="button"
                        onClick={() => setStudentAttendance(est.id, 'A')}
                        className={`h-7 w-7 text-xs font-black rounded-none cursor-pointer transition-transform ${
                          status === 'A'
                            ? 'bg-[#DB5B48] text-white shadow-xs scale-105 ring-1 ring-[#DB5B48]'
                            : 'bg-white border border-[#2E3330]/15 text-[#5F665E] hover:bg-slate-100'
                        }`}
                        title="Ausente"
                      >
                        A
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-between text-[11px] text-[#5F665E] border-t border-[#2E3330]/10 pt-2">
              <span className="flex items-center gap-1 font-semibold text-[#689C63]">
                <CheckCircle2 size={12} /> Cómputo mensual acumulado en el boletín sin hojas de papel
              </span>
              <span>1ro A · 4 de 4 registrados</span>
            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* 2. CREA PORTAFOLIO DE EVIDENCIA                                     */}
        {/* =================================================================== */}
        {activeTab === 'portafolio' && (
          <div className="animate-in fade-in duration-200">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#2E3330]/10 pb-2 mb-3">
              <div>
                <p className="font-cagliostro text-base sm:text-lg font-normal text-[#2E3330]">
                  Portafolio Digital de Evidencias
                </p>
                <p className="text-[11px] text-[#5F665E]">
                  Producciones estudiantiles organizadas y vinculadas al currículo oficial.
                </p>
              </div>
              <span className="bg-[#EB8847]/15 text-[#EB8847] font-bold text-[10px] px-2.5 py-0.5 rounded-none">
                Estudiante: Ana Valentina Reyes
              </span>
            </div>

            {/* Tarjetas de producciones digitales sin anidamiento excesivo */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 mb-3">
              <div className="border border-[#2E3330]/15 bg-[#FAF8F5] p-2.5 rounded-none flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-[#537BAC] bg-white px-1.5 py-0.5 border border-[#2E3330]/10">
                      Lengua Española
                    </span>
                    <span className="text-[9px] font-mono text-[#5F665E]">12 Oct</span>
                  </div>
                  <p className="text-xs font-bold text-[#2E3330]">Informe de Lectura: La Noticia</p>
                  <p className="text-[10px] text-[#5F665E] mt-1 line-clamp-2">
                    Estructura de titulares y cuerpo de la noticia analizados en clase.
                  </p>
                </div>
                <div className="mt-2.5 pt-1.5 border-t border-[#2E3330]/10 flex items-center justify-between text-[10px]">
                  <span className="text-[#689C63] font-bold flex items-center gap-1">
                    <Check size={11} /> IL-1 Logrado
                  </span>
                  <span className="font-bold text-[#2E3330]">95 / 100</span>
                </div>
              </div>

              <div className="border border-[#2E3330]/15 bg-[#FAF8F5] p-2.5 rounded-none flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-[#DEAE4D] bg-white px-1.5 py-0.5 border border-[#2E3330]/10">
                      Matemática
                    </span>
                    <span className="text-[9px] font-mono text-[#5F665E]">24 Oct</span>
                  </div>
                  <p className="text-xs font-bold text-[#2E3330]">Resolución de Ecuaciones</p>
                  <p className="text-[10px] text-[#5F665E] mt-1 line-clamp-2">
                    Despeje de variables y comprobación con problemas cotidianos.
                  </p>
                </div>
                <div className="mt-2.5 pt-1.5 border-t border-[#2E3330]/10 flex items-center justify-between text-[10px]">
                  <span className="text-[#689C63] font-bold flex items-center gap-1">
                    <Check size={11} /> IL-2 Logrado
                  </span>
                  <span className="font-bold text-[#2E3330]">88 / 100</span>
                </div>
              </div>

              <div className="border border-[#2E3330]/15 bg-[#FAF8F5] p-2.5 rounded-none flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-[#689C63] bg-white px-1.5 py-0.5 border border-[#2E3330]/10">
                      Ciencias Sociales
                    </span>
                    <span className="text-[9px] font-mono text-[#5F665E]">05 Nov</span>
                  </div>
                  <p className="text-xs font-bold text-[#2E3330]">Mapa Conceptual: Constitución</p>
                  <p className="text-[10px] text-[#5F665E] mt-1 line-clamp-2">
                    Línea de tiempo y artículos sobre deberes y derechos ciudadanos.
                  </p>
                </div>
                <div className="mt-2.5 pt-1.5 border-t border-[#2E3330]/10 flex items-center justify-between text-[10px]">
                  <span className="text-[#EB8847] font-bold flex items-center gap-1">
                    <Clock size={11} /> En revisión
                  </span>
                  <span className="font-bold text-[#2E3330]">Pendiente</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between text-[11px] text-[#5F665E] border-t border-[#2E3330]/10 pt-2">
              <span className="text-[#537BAC] font-semibold flex items-center gap-1">
                <FileText size={12} /> Consulta continua para padres y coordinadores desde el Portal del Estudiante
              </span>
              <span>Total evidencias: 14 producciones</span>
            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* 3. ENVÍA QUIZ A TUS ESTUDIANTES PARA EVALUACIONES AUTOMATIZADAS     */}
        {/* =================================================================== */}
        {activeTab === 'quiz' && (
          <div className="animate-in fade-in duration-200">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#2E3330]/10 pb-2 mb-3">
              <div>
                <p className="font-cagliostro text-base sm:text-lg font-normal text-[#2E3330]">
                  Quiz Automatizado en Vivo
                </p>
                <p className="text-[11px] text-[#5F665E]">
                  El estudiante responde en su dispositivo y CIELO califica y sincroniza automáticamente.
                </p>
              </div>
              <span className="text-[10px] font-mono font-bold bg-[#537BAC] text-white px-2 py-0.5 rounded-none">
                VISTA DEL ESTUDIANTE
              </span>
            </div>

            {/* Simulación de Quiz interactivo */}
            <div className="border border-[#2E3330]/15 bg-[#FAF8F5] p-3 rounded-none mb-3">
              <p className="text-xs font-extrabold text-[#2E3330] mb-2">
                Pregunta 1 de 5: ¿Cuál es el orden cronológico estándar en un texto narrativo?
              </p>

              <div className="space-y-1.5">
                {[
                  'Desarrollo, Conclusión, Introducción y Clímax',
                  'Inicio (planteamiento), Nudo (conflicto) y Desenlace (resolución)',
                  'Desenlace, Clímax e Introducción',
                ].map((opt, oIdx) => {
                  const isCorrect = oIdx === 1;
                  const isChosen = selectedOption === oIdx;

                  return (
                    <button
                      key={oIdx}
                      type="button"
                      onClick={() => handleQuizSubmit(oIdx)}
                      className={`w-full p-2 text-left text-xs rounded-none border transition-all cursor-pointer flex items-center justify-between ${
                        isQuizSubmitted && isCorrect
                          ? 'border-[#689C63] bg-emerald-50 text-[#556947] font-bold'
                          : isChosen && !isCorrect
                          ? 'border-[#DB5B48] bg-rose-50 text-[#DB5B48]'
                          : isChosen
                          ? 'border-[#537BAC] bg-blue-50 font-bold text-[#2E3330]'
                          : 'border-[#2E3330]/15 bg-white text-[#2E3330] hover:bg-slate-50'
                      }`}
                    >
                      <span>{opt}</span>
                      {isQuizSubmitted && isCorrect && (
                        <span className="flex items-center gap-1 text-[10px] text-[#689C63] font-black uppercase">
                          <Check size={12} /> Correcto
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] border-t border-[#2E3330]/10 pt-2">
              <span className="text-[#689C63] font-bold flex items-center gap-1">
                {isQuizSubmitted ? (
                  <>
                    <CheckCircle2 size={13} /> Calificación asignada: 100/100 · Sincronizada a la columna de evaluación
                  </>
                ) : (
                  <>
                    <Send size={12} /> Selecciona una respuesta para ver la calificación automática
                  </>
                )}
              </span>
              <span className="text-[#5F665E] font-mono">Sin revisión manual de exámenes en papel</span>
            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* 4. CREA INSTRUMENTOS DE EVALUACIÓN                                  */}
        {/* =================================================================== */}
        {activeTab === 'instrumentos' && (
          <div className="animate-in fade-in duration-200">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#2E3330]/10 pb-2 mb-3">
              <div>
                <p className="font-cagliostro text-base sm:text-lg font-normal text-[#2E3330]">
                  Diseñador de Rúbricas y Listas de Cotejo
                </p>
                <p className="text-[11px] text-[#5F665E]">
                  Instrumentos curriculares oficiales creados en segundos con indicadores del MINERD.
                </p>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="border border-[#2E3330]/15 bg-[#FAF8F5] px-2 py-0.5 text-[10px] font-bold text-[#2E3330]">
                  Rúbrica Analítica
                </span>
                <span className="border border-[#2E3330]/10 px-2 py-0.5 text-[10px] text-[#5F665E]">
                  Lista de Cotejo
                </span>
              </div>
            </div>

            {/* Matriz de rúbrica fiel a CIELO */}
            <div className="border border-[#2E3330]/15 bg-white overflow-x-auto mb-3">
              <table className="w-full text-left text-[10px] border-collapse min-w-125">
                <thead>
                  <tr className="bg-[#FAF8F5] border-b border-[#2E3330]/10 text-[#2E3330]">
                    <th className="p-2 border-r border-[#2E3330]/10 w-1/3 font-black uppercase">Criterio / Indicador</th>
                    <th className="p-2 border-r border-[#2E3330]/10 bg-emerald-50/40 text-[#556947] font-bold">Excelente (100)</th>
                    <th className="p-2 border-r border-[#2E3330]/10 bg-blue-50/40 text-[#537BAC] font-bold">Bueno (80)</th>
                    <th className="p-2 bg-amber-50/40 text-[#DEAE4D] font-bold">En proceso (60)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#2E3330]/10">
                  <tr>
                    <td className="p-2 border-r border-[#2E3330]/10 font-bold text-[#2E3330]">
                      Estructura textual y claridad
                    </td>
                    <td className="p-2 border-r border-[#2E3330]/10 text-[#5F665E]">
                      Cumple con todas las partes de la noticia con coherencia impecable.
                    </td>
                    <td className="p-2 border-r border-[#2E3330]/10 text-[#5F665E]">
                      Presenta la mayoría de las partes con leves inconsistencias.
                    </td>
                    <td className="p-2 text-[#5F665E]">
                      Estructura incompleta o con ideas desorganizadas.
                    </td>
                  </tr>
                  <tr>
                    <td className="p-2 border-r border-[#2E3330]/10 font-bold text-[#2E3330]">
                      Ortografía y puntuación
                    </td>
                    <td className="p-2 border-r border-[#2E3330]/10 text-[#5F665E]">
                      Sin faltas ortográficas; uso correcto de signos de puntuación.
                    </td>
                    <td className="p-2 border-r border-[#2E3330]/10 text-[#5F665E]">
                      Menos de 3 errores menores que no afectan la comprensión.
                    </td>
                    <td className="p-2 text-[#5F665E]">
                      Múltiples errores que dificultan la lectura.
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between text-[11px] text-[#5F665E] border-t border-[#2E3330]/10 pt-2">
              <span className="text-[#DEAE4D] font-bold flex items-center gap-1">
                <Sparkles size={12} /> Sugerencias automáticas por IA adaptadas al grado y asignatura
              </span>
              <span className="flex items-center gap-1 text-[#2E3330] font-semibold cursor-pointer hover:underline">
                <Printer size={11} /> Exportar a DOCX / PDF oficial
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

