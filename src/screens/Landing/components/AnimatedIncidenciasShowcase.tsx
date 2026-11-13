import { useState, useEffect, useRef } from 'react';
import {
  Search,
  Calendar,
  Send,
  RotateCcw,
  X,
  UserCheck,
  Sparkles,
  Printer,
  Pencil,
  Trash2,
} from 'lucide-react';
import fichaImg from '../assets/features/ficha-orientacion.png';

interface AnimatedIncidenciasShowcaseProps {
  isActive?: boolean;
}

export function AnimatedIncidenciasShowcase({ isActive = true }: AnimatedIncidenciasShowcaseProps) {
  // Estados de la simulación paso a paso (de cerca y realista)
  const [step, setStep] = useState<number>(0); // 0: inicio, 1: buscando, 2: seleccionado, 3: categoría, 4: detalles, 5: acciones, 6: guardado, 7: ficha superpuesta
  const [typedSearch, setTypedSearch] = useState('');
  const [isStudentSelected, setIsStudentSelected] = useState(false);
  const [selectedCategoria, setSelectedCategoria] = useState<string | null>(null);
  const [selectedGravedad, setSelectedGravedad] = useState<string | null>(null);
  const [typedDescripcion, setTypedDescripcion] = useState('');
  const [typedAcuerdos, setTypedAcuerdos] = useState('');
  const [selectedAcciones, setSelectedAcciones] = useState<string[]>([]);
  const [isGuardarPressed, setIsGuardarPressed] = useState(false);
  const [isFichaVisible, setIsFichaVisible] = useState(false);
  const [isReportSent, setIsReportSent] = useState(false);

  const isMountedRef = useRef(true);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clearAllTimers = () => {
    timersRef.current.forEach((t) => clearTimeout(t));
    timersRef.current = [];
  };

  const addTimer = (fn: () => void, delay: number) => {
    const t = setTimeout(() => {
      if (isMountedRef.current) fn();
    }, delay);
    timersRef.current.push(t);
    return t;
  };

  const handleToggleFicha = () => {
    clearAllTimers();
    setIsFichaVisible((prev) => !prev);
  };

  const handleCloseFicha = () => {
    clearAllTimers();
    setIsFichaVisible(false);
  };

  const runSimulation = () => {
    clearAllTimers();
    if (!isMountedRef.current) return;

    // Reset de estados
    setStep(0);
    setTypedSearch('');
    setIsStudentSelected(false);
    setSelectedCategoria(null);
    setSelectedGravedad(null);
    setTypedDescripcion('');
    setTypedAcuerdos('');
    setSelectedAcciones([]);
    setIsGuardarPressed(false);
    setIsFichaVisible(false);
    setIsReportSent(false);

    const studentName = 'Héctor Manuel Santana';
    const descText = 'Dificultades en su comportamiento y proceso de aprendizaje observadas en aula.';
    const acuerdosText = 'Entrevista realizada. Se activa derivación inmediata a Orientación y Psicología.';

    // 1. Digitar en el buscador de estudiante
    addTimer(() => {
      setStep(1);
      let curr = '';
      studentName.split('').forEach((char, idx) => {
        addTimer(() => {
          curr += char;
          setTypedSearch(curr);
        }, idx * 55);
      });
    }, 400);

    // 2. Seleccionar estudiante Héctor Manuel Santana
    const selectStudentDelay = 400 + studentName.length * 55 + 200;
    addTimer(() => {
      setStep(2);
      setIsStudentSelected(true);
    }, selectStudentDelay);

    // 3. Seleccionar Categoría y Gravedad (Conducta e Interacción + Primera vez)
    const catDelay = selectStudentDelay + 650;
    addTimer(() => {
      setStep(3);
      setSelectedCategoria('conducta');
    }, catDelay);

    const gravDelay = catDelay + 500;
    addTimer(() => {
      setSelectedGravedad('primera_vez');
    }, gravDelay);

    // 4. Redactar Detalles (Descripción y Acuerdos)
    const detailsDelay = gravDelay + 600;
    addTimer(() => {
      setStep(4);
      let currD = '';
      descText.split('').forEach((char, idx) => {
        addTimer(() => {
          currD += char;
          setTypedDescripcion(currD);
        }, idx * 22);
      });
    }, detailsDelay);

    const acuerdosDelay = detailsDelay + descText.length * 22 + 250;
    addTimer(() => {
      let currA = '';
      acuerdosText.split('').forEach((char, idx) => {
        addTimer(() => {
          currA += char;
          setTypedAcuerdos(currA);
        }, idx * 22);
      });
    }, acuerdosDelay);

    // 5. Seleccionar Acciones (Llamado verbal y ORIENTACIÓN)
    const actionsDelay = acuerdosDelay + acuerdosText.length * 22 + 400;
    addTimer(() => {
      setStep(5);
      setSelectedAcciones(['llamado_verbal']);
    }, actionsDelay);

    const orientacionDelay = actionsDelay + 500;
    addTimer(() => {
      setSelectedAcciones(['llamado_verbal', 'orientacion']);
    }, orientacionDelay);

    // 6. Clic en Guardar Registro
    const saveDelay = orientacionDelay + 600;
    addTimer(() => {
      setStep(6);
      setIsGuardarPressed(true);
    }, saveDelay);

    const saveReleaseDelay = saveDelay + 300;
    addTimer(() => {
      setIsGuardarPressed(false);
    }, saveReleaseDelay);

    // 7. LA SEGUNDA IMAGEN SE SUPERPONE DIRECTAMENTE A LA PRIMERA
    const overlayDelay = saveReleaseDelay + 600;
    addTimer(() => {
      setStep(7);
      setIsFichaVisible(true);
    }, overlayDelay);

    // 8. Simular clic en "ENVIAR REPORTE A ORIENTACIÓN"
    const sendReportDelay = overlayDelay + 1600;
    addTimer(() => {
      setIsReportSent(true);
    }, sendReportDelay);

    // 9. Reiniciar animación en bucle tras mostrar el documento superpuesto
    const loopDelay = sendReportDelay + 4600;
    addTimer(() => {
      runSimulation();
    }, loopDelay);
  };

  useEffect(() => {
    isMountedRef.current = true;

    if (!isActive) {
      clearAllTimers();
      return;
    }

    const startTimer = setTimeout(() => {
      runSimulation();
    }, 250);

    return () => {
      isMountedRef.current = false;
      clearTimeout(startTimer);
      clearAllTimers();
    };
  }, [isActive]);

  return (
    <div className="relative w-full select-none">
      {/* Barra de control superior limpia y minimalista */}
      <div className="mb-2 flex items-center justify-between border-b border-[#2E3330]/10 pb-2">
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 text-xs font-bold text-[#1E3A5F]">
            <Sparkles className="h-3.5 w-3.5 text-[#DEAE4D] animate-spin" />
            {isFichaVisible ? (
              <span className="text-[#689C63] font-black">Ficha de Orientación generada (Superpuesta)</span>
            ) : (
              <span>Simulación en vivo: Registro disciplinario de cerca</span>
            )}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleToggleFicha}
            className="px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider border border-[#2E3330]/20 bg-[#FAF8F5] text-[#2E3330] hover:bg-[#EAE6DE] cursor-pointer"
          >
            {isFichaVisible ? 'Ver Bitácora de fondo' : 'Ver Ficha superpuesta'}
          </button>
          <button
            type="button"
            onClick={runSimulation}
            title="Reiniciar simulación"
            className="p-1 text-[#5F665E] hover:text-[#2E3330] transition-colors cursor-pointer"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* PRIMERA IMAGEN / FORMULARIO INTERACTIVO FIEL A LA CAPTURA DE CERCA        */}
      {/* ========================================================================= */}
      <div className="relative border border-[#2E3330]/20 bg-[#FBF9F4] p-2 sm:p-3 text-[#2E3330] shadow-sm rounded-none overflow-hidden min-h-0 sm:min-h-115">
        {/* Cabecera superior fiel a la captura */}
        <div className="flex items-center justify-between border-b border-[#2E3330]/10 pb-1.5 sm:pb-2.5 mb-2 sm:mb-3">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <span className="rounded-full bg-[#EFECE4] px-2 py-0.5 sm:px-3 sm:py-1 text-[9.5px] sm:text-[11px] font-black tracking-wider text-[#2E3330] uppercase">
              Seguimiento Disciplinario
            </span>
            <span className="hidden sm:inline px-2 text-[11px] font-bold text-[#5F665E]/70 uppercase tracking-wider">
              Bitácora Escolar
            </span>
          </div>
          <div className="flex items-center gap-1 sm:gap-1.5 text-[8.5px] sm:text-[10px] font-mono text-[#5F665E]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#689C63] animate-pulse" />
            <span>SISTEMA ACTIVO</span>
          </div>
        </div>

        {/* 4 SECCIONES DE REGISTRO EN VIVO (DISEÑO FIEL A LA IMAGEN 1: ABIERTO, SIN TARJETAS DENTRO DE TARJETAS) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 mb-4 items-start">
          {/* 1. ESTUDIANTES */}
          <div className="lg:col-span-2">
            <p className="text-[10px] font-black uppercase tracking-wider text-[#2E3330] mb-1.5">
              1. Estudiantes
            </p>
            <div className="relative">
              <Search size={12} className="absolute left-2.5 top-2.5 text-[#5F665E]" />
              <input
                type="text"
                readOnly
                value={typedSearch}
                placeholder="Buscar..."
                className={`w-full rounded-full border py-1.5 pl-7 pr-3 text-xs font-semibold outline-none transition-all ${step === 1 ? 'border-[#537BAC] bg-blue-50/50 ring-1 ring-[#537BAC]' : 'border-[#2E3330]/20 bg-white'
                  }`}
              />
            </div>

            {/* Sugerencia desplegable animada al escribir */}
            {typedSearch.length > 2 && (
              <div
                className={`mt-1.5 border border-[#2E3330]/20 bg-white p-1.5 shadow-sm transition-all rounded-sm ${isStudentSelected ? 'border-[#689C63] bg-emerald-50/60' : 'bg-slate-50'
                  }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[11px] font-bold text-[#2E3330]">Héctor Manuel Santana</p>
                    <p className="text-[8.5px] text-[#5F665E] font-mono">EXPEDIENTE #0873 · 1ro A</p>
                  </div>
                  {isStudentSelected && (
                    <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[#689C63] text-white">
                      <UserCheck size={9} />
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* 2. CATEGORÍA Y GRAVEDAD */}
          <div className="lg:col-span-3">
            <p className="text-[10px] font-black uppercase tracking-wider text-[#2E3330] mb-1.5">
              2. Categoría y Gravedad
            </p>
            {/* Fila 1 categorías */}
            <div className="flex flex-wrap gap-1 mb-1">
              <button
                type="button"
                className={`px-2 py-0.5 text-[9px] font-bold rounded-full transition-all flex items-center gap-1 cursor-pointer ${selectedCategoria === 'conducta'
                    ? 'bg-[#8F9E87] text-white ring-1 ring-[#8F9E87] shadow-xs'
                    : 'bg-white text-[#5F665E] border border-[#2E3330]/20'
                  }`}
              >
                <span className="text-[9px]">ⓘ</span> Conducta e interacción
              </button>
              <button
                type="button"
                className="px-2 py-0.5 text-[9px] font-semibold rounded-full bg-white text-[#5F665E]/70 border border-[#2E3330]/15 flex items-center gap-1"
              >
                <span>📖</span> Rendimiento académico
              </button>
            </div>
            {/* Fila 2 categorías */}
            <div className="flex flex-wrap gap-1 mb-1.5">
              <button
                type="button"
                className="px-2 py-0.5 text-[9px] font-semibold rounded-full bg-white text-[#5F665E]/70 border border-[#2E3330]/15 flex items-center gap-1"
              >
                <span>ⓘ</span> Bienestar y salud
              </button>
              <button
                type="button"
                className="px-2 py-0.5 text-[9px] font-semibold rounded-full bg-white text-[#5F665E]/70 border border-[#2E3330]/15 flex items-center gap-1"
              >
                <span>🗂</span> Otros eventos
              </button>
            </div>
            {/* Fila 3 gravedad */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                className={`px-2 py-0.5 text-[9px] font-bold rounded-full transition-all cursor-pointer ${selectedGravedad === 'primera_vez'
                    ? 'bg-[#DCE1CE] text-[#2E3330] font-black border border-[#2E3330]/20'
                    : 'bg-white text-[#5F665E]/60 border border-[#2E3330]/15'
                  }`}
              >
                Primera vez
              </button>
              <button
                type="button"
                className="px-2 py-0.5 text-[9px] font-semibold rounded-full bg-white text-[#5F665E]/60 border border-[#2E3330]/15"
              >
                Recurrente
              </button>
              <button
                type="button"
                className="px-2 py-0.5 text-[9px] font-semibold rounded-full bg-white text-[#5F665E]/60 border border-[#2E3330]/15"
              >
                Persistente
              </button>
            </div>
          </div>

          {/* 3. DETALLES */}
          <div className="lg:col-span-4">
            <div className="flex items-center justify-between mb-1">
              <p className="text-[10px] font-black uppercase tracking-wider text-[#2E3330]">
                3. Detalles
              </p>
              <span className="flex items-center gap-1 text-[8.5px] font-mono text-[#5F665E] bg-white px-2 py-0.5 border border-[#2E3330]/15 rounded-full">
                <Calendar size={9} /> 12 nov 2026
              </span>
            </div>

            {/* Input 1 Descripción */}
            <div
              className={`border p-1.5 min-h-8.5 text-[9.5px] rounded-lg mb-1.5 transition-colors ${step === 4 && typedDescripcion.length < 30 ? 'border-[#537BAC] bg-blue-50/20' : 'border-[#2E3330]/15 bg-white'
                }`}
            >
              {typedDescripcion ? (
                <span className="text-[#2E3330] leading-tight block">{typedDescripcion}</span>
              ) : (
                <span className="text-[#5F665E]/50">Descripción de los hechos...</span>
              )}
            </div>

            {/* Input 2 Acuerdos */}
            <div className="border border-[#2E3330]/15 p-1.5 min-h-8.5 text-[9.5px] rounded-lg bg-white">
              {typedAcuerdos ? (
                <span className="text-[#2E3330] leading-tight block">{typedAcuerdos}</span>
              ) : (
                <span className="text-[#5F665E]/50">Acuerdos y compromisos...</span>
              )}
            </div>
          </div>

          {/* 4. ACCIONES */}
          <div className="lg:col-span-2">
            <p className="text-[10px] font-black uppercase tracking-wider text-[#2E3330] mb-1.5">
              4. Acciones
            </p>
            {/* Fila 1 */}
            <div className="flex flex-wrap gap-1 mb-1">
              <button
                type="button"
                className={`px-2 py-0.5 text-[8.5px] font-bold rounded-full transition-all cursor-pointer ${selectedAcciones.includes('llamado_verbal')
                    ? 'bg-[#CBE4F9] text-[#1E3A5F] border border-[#537BAC]/40 font-black'
                    : 'bg-white text-[#5F665E]/70 border border-[#2E3330]/15'
                  }`}
              >
                Llamado verbal
              </button>
              <button
                type="button"
                className="px-2 py-0.5 text-[8.5px] font-semibold rounded-full bg-white text-[#5F665E]/70 border border-[#2E3330]/15"
              >
                Nota a padres
              </button>
            </div>
            {/* Fila 2 */}
            <div className="flex flex-wrap gap-1 mb-1">
              <button
                type="button"
                className={`px-2 py-0.5 text-[8.5px] font-bold rounded-full transition-all cursor-pointer ${selectedAcciones.includes('orientacion')
                    ? 'bg-[#537BAC] text-white shadow-sm ring-2 ring-[#537BAC]/40 font-black'
                    : 'bg-white text-[#5F665E]/70 border border-[#2E3330]/15'
                  }`}
              >
                Orientación
              </button>
              <button
                type="button"
                className="px-2 py-0.5 text-[8.5px] font-semibold rounded-full bg-white text-[#5F665E]/70 border border-[#2E3330]/15"
              >
                Compromiso
              </button>
            </div>
            {/* Fila 3 */}
            <div className="flex flex-wrap gap-1">
              <button
                type="button"
                className="px-1.5 py-0.5 text-[8px] font-semibold rounded-full bg-white text-[#5F665E]/60 border border-[#2E3330]/15"
              >
                Reconocimiento
              </button>
              <button
                type="button"
                className="px-1.5 py-0.5 text-[8px] font-semibold rounded-full bg-white text-[#5F665E]/60 border border-[#2E3330]/15"
              >
                Servicio
              </button>
              <button
                type="button"
                className="px-1.5 py-0.5 text-[8px] font-semibold rounded-full bg-white text-[#5F665E]/60 border border-[#2E3330]/15"
              >
                Dirección
              </button>
            </div>
          </div>

          {/* BOTÓN GRANDE GUARDAR REGISTRO (IDÉNTICO A LA CAPTURA) */}
          <div className="lg:col-span-1 flex items-stretch">
            <button
              type="button"
              className={`w-full py-4 px-2 rounded-xl text-center font-black text-xs uppercase tracking-wider flex flex-col items-center justify-center transition-all cursor-pointer shadow-xs ${isGuardarPressed
                  ? 'bg-[#556947] text-white scale-95 ring-2 ring-[#556947]'
                  : 'bg-[#E5E6D8] hover:bg-[#DCE0CE] text-[#2E3330]'
                }`}
            >
              <span>GUARDAR</span>
              <span className="text-[10px] tracking-normal font-bold">REGISTRO</span>
            </button>
          </div>
        </div>

        {/* TABLA INFERIOR DE BITÁCORA ESCOLAR (HISTORIAL EN CURSO FIEL A LA IMAGEN 1) */}
        <div className="border border-[#2E3330]/15 bg-white rounded-none overflow-hidden">
          <div className="bg-[#FAF8F5] px-3 py-2 border-b border-[#2E3330]/10 flex flex-wrap items-center justify-between gap-2">
            <div className="border-l-4 border-[#EB8847] pl-2.5">
              <p className="text-[11px] font-black tracking-tight text-[#2E3330]">
                Bitácora de Acontecimientos
              </p>
              <p className="text-[8.5px] font-bold text-[#EB8847] uppercase tracking-wider">
                HISTORIAL DEL AÑO ESCOLAR EN CURSO
              </p>
            </div>
            <div className="relative">
              <Search size={11} className="absolute left-2.5 top-2 text-[#5F665E]" />
              <input
                type="text"
                readOnly
                placeholder="BUSCAR POR ESTUDIANTE..."
                className="rounded-full border border-[#2E3330]/20 bg-white py-1 pl-7 pr-3 text-[9px] font-bold text-[#2E3330] uppercase tracking-wider outline-none"
              />
            </div>
          </div>

          <div className="overflow-x-auto text-[10px]">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#2E3330]/10 text-[8.5px] font-bold text-[#5F665E] uppercase tracking-wider bg-slate-50/50">
                  <th className="p-1.5">Estudiante</th>
                  <th className="p-1.5">Categoría</th>
                  <th className="p-1.5">Gravedad</th>
                  <th className="p-1.5">Descripción</th>
                  <th className="p-1.5">Acuerdos</th>
                  <th className="p-1.5">Acciones</th>
                  <th className="p-1.5">Fecha</th>
                  <th className="p-1.5 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2E3330]/10 text-[9.5px]">
                {/* Registro 1 */}
                <tr className="hover:bg-slate-50">
                  <td className="p-1.5 whitespace-nowrap">
                    <p className="font-bold text-[#2E3330]">Bruno Alejandro Méndez</p>
                    <p className="text-[8px] text-[#5F665E] font-mono">EXPEDIENTE #0341</p>
                  </td>
                  <td className="p-1.5 whitespace-nowrap">
                    <span className="px-2 py-0.5 rounded-full bg-[#E3EDF8] text-[#3B6694] font-bold text-[8.5px] uppercase">
                      Académico
                    </span>
                  </td>
                  <td className="p-1.5 whitespace-nowrap">
                    <span className="px-2 py-0.5 rounded-full bg-[#EAEBD9] text-[#5E684C] font-bold text-[8.5px] uppercase">
                      Primera vez
                    </span>
                  </td>
                  <td className="p-1.5 max-w-35 truncate text-[#5F665E]">
                    El estudiante presenta dificultades para entender
                  </td>
                  <td className="p-1.5 max-w-30 truncate text-[#5F665E]">
                    Se compromete a leer mas
                  </td>
                  <td className="p-1.5 whitespace-nowrap">
                    <span className="px-1.5 py-0.5 rounded-xs bg-[#D2E7F9] text-[#1E3A5F] text-[8px] font-bold mr-1">
                      LLAMADO VERBAL
                    </span>
                    <span className="px-1.5 py-0.5 rounded-xs bg-[#DDF0D8] text-[#48633D] text-[8px] font-bold">
                      ORIENTACIÓN
                    </span>
                  </td>
                  <td className="p-1.5 font-mono text-[9px] text-[#5F665E] whitespace-nowrap">
                    <span className="inline-flex items-center gap-1 rounded-full border border-[#2E3330]/15 bg-[#FAF8F5] px-2 py-0.5">
                      📅 13 oct 2026
                    </span>
                  </td>
                  <td className="p-1.5 text-right text-[#5F665E]/60 whitespace-nowrap">
                    <Pencil size={11} className="inline mr-1.5 cursor-pointer hover:text-[#2E3330]" />
                    <Printer size={11} className="inline mr-1.5 cursor-pointer hover:text-[#2E3330]" />
                    <Trash2 size={11} className="inline cursor-pointer hover:text-red-600" />
                  </td>
                </tr>

                {/* Registro 2 (Héctor Manuel Santana, resaltado en la simulación) */}
                <tr className={step >= 6 ? 'bg-emerald-50/70 font-semibold transition-colors duration-500' : 'hover:bg-slate-50'}>
                  <td className="p-1.5 whitespace-nowrap">
                    <p className="font-bold text-[#2E3330]">Héctor Manuel Santana</p>
                    <p className="text-[8px] text-[#5F665E] font-mono">EXPEDIENTE #0873</p>
                  </td>
                  <td className="p-1.5 whitespace-nowrap">
                    <span className="px-2 py-0.5 rounded-full bg-[#FCE8DB] text-[#C25B1F] font-bold text-[8.5px] uppercase">
                      Conducta
                    </span>
                  </td>
                  <td className="p-1.5 whitespace-nowrap">
                    <span className="px-2 py-0.5 rounded-full bg-[#EAEBD9] text-[#5E684C] font-bold text-[8.5px] uppercase">
                      Primera vez
                    </span>
                  </td>
                  <td className="p-1.5 max-w-35 truncate text-[#5F665E]">
                    {typedDescripcion || 'Lúcia de Jesús Rosa dos Santos (Ourém, Santarém, 28 de marzo...'}
                  </td>
                  <td className="p-1.5 max-w-30 truncate text-[#5F665E]">
                    {typedAcuerdos || 'Lúcia de Jesús Rosa dos Santos (Ourém,...'}
                  </td>
                  <td className="p-1.5 whitespace-nowrap">
                    <span className="px-1.5 py-0.5 rounded-xs bg-[#D2E7F9] text-[#1E3A5F] text-[8px] font-bold mr-1">
                      LLAMADO VERBAL
                    </span>
                    {selectedAcciones.includes('orientacion') && (
                      <span className="px-1.5 py-0.5 rounded-xs bg-[#537BAC] text-white text-[8px] font-black animate-pulse">
                        ORIENTACIÓN
                      </span>
                    )}
                  </td>
                  <td className="p-1.5 font-mono text-[9px] text-[#5F665E] whitespace-nowrap">
                    <span className="inline-flex items-center gap-1 rounded-full border border-[#2E3330]/15 bg-[#FAF8F5] px-2 py-0.5">
                      📅 11 oct 2026
                    </span>
                  </td>
                  <td className="p-1.5 text-right text-[#5F665E]/60 whitespace-nowrap">
                    <Pencil size={11} className="inline mr-1.5 cursor-pointer hover:text-[#2E3330]" />
                    <Printer size={11} className="inline mr-1.5 cursor-pointer hover:text-[#2E3330]" />
                    <Trash2 size={11} className="inline cursor-pointer hover:text-red-600" />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* LA SEGUNDA IMAGEN SE SUPERPONE A LA PRIMERA (SIN TARJETAS NI CUADROS GRANDES) */}
        {/* ========================================================================= */}
        {isFichaVisible && (
          <div className="absolute inset-0 z-30 flex items-center justify-center p-2 sm:p-4 bg-black/45 backdrop-blur-xs animate-in fade-in zoom-in-95 duration-300">
            {/* Hoja de papel superpuesta directamente sin marcos grandes ni tarjetas anidadas */}
            <div className="relative max-h-[96%] flex flex-col items-center">
              {/* BOTÓN Y ACCIÓN SUPERPUESTA PROMINENTE: ENVIAR REPORTE A ORIENTACIÓN */}
              <div className="mb-1.5 sm:mb-2 flex items-center gap-1.5 sm:gap-2">
                <button
                  type="button"
                  onClick={() => setIsReportSent(true)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 sm:px-5 sm:py-2 text-[10px] sm:text-xs font-black uppercase tracking-wider rounded-none cursor-pointer transition-all shadow-lg ${isReportSent
                      ? 'bg-[#689C63] text-white'
                      : 'bg-[#537BAC] hover:bg-[#43648E] text-white ring-2 sm:ring-4 ring-white/80 animate-pulse'
                    }`}
                >
                  <Send size={12} className={isReportSent ? '' : 'animate-bounce'} />
                  <span>{isReportSent ? 'REPORTE ENVIADO A ORIENTACIÓN ✓' : 'ENVIAR REPORTE A ORIENTACIÓN'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleCloseFicha}
                  title="Cerrar y volver a la bitácora"
                  className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center bg-white/95 text-[#2E3330] hover:bg-[#FAF8F5] transition-colors rounded-none shadow-md cursor-pointer"
                >
                  <X size={14} />
                </button>
              </div>

              {/* Documento oficial visible de un solo vistazo */}
              <div className="relative shadow-2xl bg-white border border-[#2E3330]/20 rounded-none overflow-hidden max-w-lg">
                <img
                  src={fichaImg}
                  alt="Ficha de referencia a la Unidad de Orientación y Psicología superpuesta"
                  className="w-auto h-auto max-h-[34vh] sm:max-h-[44vh] md:max-h-[48vh] object-contain mx-auto block"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
